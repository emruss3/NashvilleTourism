import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const properties = [
  { name: 'Emblem Park', url: 'https://emblemparknashville.com/schedule-a-tour/' },
  { name: 'Westerly House', url: 'https://livewesterlyhouse.com/schedule-a-tour/' },
  { name: '445 Park Commons', url: 'https://445parkcommons.com/schedule-a-tour/' },
  { name: 'Residences at The Finery', url: 'https://livethefinery.com/' },
  { name: 'Memoir Wedgewood Houston', url: 'https://memoirresidential.com/properties/wedgewoodhouston' },
  { name: 'Memoir May Hosiery', url: 'https://memoirresidential.com/properties/may-hosiery' },
  { name: 'Standard Assembly', url: 'https://www.greystar.com/standard-assembly-apartments-nashville-tn/p_19399' },
  { name: 'Queens Wedgewood Houston', url: 'https://queensweho.com/' },
  { name: 'Luna', url: 'https://lunanashvilleliving.com/' },
  { name: 'Delux WeHo', url: 'https://deluxweho.com/' },
  { name: 'CODA', url: 'https://thecodanashville.com/' }
];

const OUT_DIR = 'tour-audit-output';
await fs.mkdir(OUT_DIR, { recursive: true });

const providerPattern = /(tour|schedul|availab|calendar|appointment|knock|funnel|rentcafe|realpage|engrain|hyly|leasehawk|tour24|showing|prospect|crm|meet|booking)/i;
const tourPatterns = [
  /^schedule (a )?tour$/i,
  /^book (a )?tour$/i,
  /^book tour$/i,
  /^tour now$/i,
  /^schedule tour$/i,
  /^visit us$/i,
  /schedule.*tour/i,
  /book.*tour/i
];

const safeName = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const compact = (s, n = 80000) => String(s ?? '').replace(/\u0000/g, '').slice(0, n);

async function acceptCookies(page) {
  const patterns = [/^accept$/i, /^accept all$/i, /^allow all$/i, /^agree$/i, /accept cookies/i];
  for (const frame of page.frames()) {
    for (const rx of patterns) {
      try {
        const loc = frame.getByRole('button', { name: rx }).first();
        if (await loc.isVisible({ timeout: 500 })) {
          await loc.click({ timeout: 2000 });
          await page.waitForTimeout(800);
          return true;
        }
      } catch {}
    }
  }
  return false;
}

async function clickTourEntry(context, page) {
  const attempted = [];
  for (const frame of page.frames()) {
    for (const rx of tourPatterns) {
      const candidates = [
        frame.getByRole('link', { name: rx }),
        frame.getByRole('button', { name: rx }),
        frame.locator('a,button,[role="button"]').filter({ hasText: rx })
      ];
      for (const group of candidates) {
        let count = 0;
        try { count = Math.min(await group.count(), 5); } catch {}
        for (let i = 0; i < count; i++) {
          const el = group.nth(i);
          try {
            if (!(await el.isVisible({ timeout: 400 }))) continue;
            const text = compact(await el.innerText().catch(() => ''), 300);
            const href = await el.getAttribute('href').catch(() => null);
            attempted.push({ frame: frame.url(), text, href });
            const oldPages = context.pages().length;
            await el.click({ timeout: 5000 });
            await page.waitForTimeout(5000);
            const pages = context.pages();
            const active = pages.length > oldPages ? pages.at(-1) : page;
            await active.bringToFront().catch(() => {});
            return { clicked: true, attempted, page: active, matched: String(rx) };
          } catch (error) {
            attempted.push({ frame: frame.url(), error: String(error).slice(0, 300) });
          }
        }
      }
    }
  }
  return { clicked: false, attempted, page };
}

async function frameSnapshot(frame) {
  try {
    return await frame.evaluate(() => {
      const clean = (v, n = 1000) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
      const seen = new Set();
      const controls = [];
      const iframes = [];
      const scripts = [];
      const forms = [];
      const visitRoot = (root, depth = 0) => {
        if (!root || depth > 8) return;
        const nodes = root.querySelectorAll ? root.querySelectorAll('a,button,input,select,textarea,[role="button"],[role="radio"],[role="option"],[role="tab"],[aria-label],iframe,script,form') : [];
        for (const el of nodes) {
          if (seen.has(el)) continue;
          seen.add(el);
          const tag = el.tagName?.toLowerCase() || '';
          if (tag === 'iframe') {
            iframes.push({ src: el.src || el.getAttribute('src'), title: el.title, name: el.name, id: el.id });
          } else if (tag === 'script') {
            if (el.src) scripts.push(el.src);
          } else if (tag === 'form') {
            forms.push({ action: el.action, method: el.method, text: clean(el.innerText, 1000) });
          } else if (controls.length < 600) {
            const attrs = {};
            for (const a of el.attributes || []) {
              if (/^(data-|aria-|href$|src$|name$|value$|type$|title$|id$|class$|placeholder$)/i.test(a.name)) attrs[a.name] = clean(a.value, 500);
            }
            controls.push({
              tag,
              text: clean(el.innerText || el.textContent || el.value, 800),
              aria: clean(el.getAttribute?.('aria-label'), 500),
              title: clean(el.getAttribute?.('title'), 500),
              disabled: Boolean(el.disabled || el.getAttribute?.('aria-disabled') === 'true'),
              visible: Boolean(el.getClientRects?.().length),
              attrs
            });
          }
          if (el.shadowRoot) visitRoot(el.shadowRoot, depth + 1);
        }
      };
      visitRoot(document);
      const storage = {};
      try { storage.localStorage = Object.fromEntries(Object.entries(localStorage).slice(0, 100)); } catch {}
      try { storage.sessionStorage = Object.fromEntries(Object.entries(sessionStorage).slice(0, 100)); } catch {}
      return {
        url: location.href,
        title: document.title,
        text: (document.body?.innerText || '').slice(0, 120000),
        html: (document.documentElement?.outerHTML || '').slice(0, 180000),
        controls,
        iframes,
        scripts: [...new Set(scripts)].slice(0, 300),
        forms,
        storage
      };
    });
  } catch (error) {
    return { url: frame.url(), error: String(error) };
  }
}

async function pageSnapshot(page, label) {
  const frames = [];
  for (const frame of page.frames()) frames.push(await frameSnapshot(frame));
  return {
    label,
    capturedAt: new Date().toISOString(),
    pageUrl: page.url(),
    title: await page.title().catch(() => ''),
    frames
  };
}

async function inspectProperty(browser, property) {
  const context = await browser.newContext({
    timezoneId: 'America/Chicago',
    locale: 'en-US',
    viewport: { width: 1440, height: 1200 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
  });
  context.setDefaultTimeout(8000);
  let page = await context.newPage();
  const network = [];
  const jsonResponses = [];
  const consoleMessages = [];
  const pageErrors = [];

  const attachListeners = (p) => {
    p.on('console', msg => {
      if (consoleMessages.length < 250) consoleMessages.push({ type: msg.type(), text: compact(msg.text(), 2000) });
    });
    p.on('pageerror', err => {
      if (pageErrors.length < 100) pageErrors.push(compact(err, 3000));
    });
    p.on('request', req => {
      if (providerPattern.test(req.url()) && network.length < 600) {
        network.push({ kind: 'request', method: req.method(), url: req.url(), resourceType: req.resourceType(), postData: compact(req.postData(), 20000) });
      }
    });
    p.on('response', async res => {
      const url = res.url();
      if (providerPattern.test(url) && network.length < 600) {
        network.push({ kind: 'response', status: res.status(), url, contentType: res.headers()['content-type'] || '' });
      }
      const ct = res.headers()['content-type'] || '';
      if (/json/i.test(ct) && providerPattern.test(url) && jsonResponses.length < 100) {
        try {
          const body = compact(await res.text(), 150000);
          jsonResponses.push({ status: res.status(), url, body });
        } catch {}
      }
    });
  };
  attachListeners(page);
  context.on('page', p => attachListeners(p));

  const result = { property, startedAt: new Date().toISOString(), navigation: null, click: null, snapshots: [], network, jsonResponses, consoleMessages, pageErrors };
  try {
    const response = await page.goto(property.url, { waitUntil: 'domcontentloaded', timeout: 70000 });
    result.navigation = { status: response?.status() ?? null, finalUrl: page.url() };
    await page.waitForTimeout(9000);
    await acceptCookies(page);
    result.snapshots.push(await pageSnapshot(page, 'initial'));

    const click = await clickTourEntry(context, page);
    page = click.page;
    result.click = { clicked: click.clicked, matched: click.matched, attempted: click.attempted, finalUrl: page.url() };
    await page.waitForTimeout(10000);
    await acceptCookies(page);
    result.snapshots.push(await pageSnapshot(page, 'after-tour-entry'));

    await page.screenshot({ path: path.join(OUT_DIR, `${safeName(property.name)}.png`), fullPage: true, timeout: 30000 }).catch(() => {});
  } catch (error) {
    result.error = String(error);
    try { result.snapshots.push(await pageSnapshot(page, 'error-state')); } catch {}
  } finally {
    result.finishedAt = new Date().toISOString();
    await context.close();
  }
  return result;
}

const browser = await chromium.launch({ headless: true });
const results = [];
for (const property of properties) {
  console.log(`AUDIT_START ${property.name}`);
  const result = await inspectProperty(browser, property);
  results.push(result);
  console.log(`AUDIT_DONE ${property.name} ${result.navigation?.status ?? 'ERR'} ${result.click?.clicked ?? false} ${result.click?.finalUrl ?? result.navigation?.finalUrl ?? ''}`);
}
await browser.close();

const payload = {
  auditWindow: { start: '2026-09-04', end: '2026-09-10', timezone: 'America/Chicago' },
  generatedAt: new Date().toISOString(),
  results
};
await fs.writeFile(path.join(OUT_DIR, 'inspection.json'), JSON.stringify(payload, null, 2));
await fs.writeFile(path.join(OUT_DIR, 'README.txt'), `Temporary live browser inspection generated ${payload.generatedAt}\nWindow: 2026-09-04 through 2026-09-10 America/Chicago\nProperties: ${results.length}\n`);
console.log('AUDIT_COMPLETE');
