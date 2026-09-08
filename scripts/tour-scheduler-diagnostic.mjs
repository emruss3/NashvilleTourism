import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = 'tour-audit-output';
const sites = [
  { name: 'Emblem Park', url: 'https://emblemparknashville.com/schedule-a-tour/' },
  { name: 'Westerly House', url: 'https://livewesterlyhouse.com/schedule-a-tour/' },
  { name: '445 Park Commons', url: 'https://445parkcommons.com/schedule-a-tour/' },
  { name: 'Residences at The Finery', url: 'https://livethefinery.com/' },
  { name: 'Memoir Wedgewood Houston', url: 'https://memoirresidential.com/properties/wedgewoodhouston' },
  { name: 'Memoir May Hosiery', url: 'https://memoirresidential.com/properties/may-hosiery' },
  { name: 'Standard Assembly', url: 'https://www.greystar.com/properties/nashville-tn/standard-assembly-apartments' },
  { name: 'Queens Wedgewood Houston', url: 'https://queensweho.com/' },
  { name: 'Luna', url: 'https://www.apartments.com/luna-nashville-tn/fc8qg7v/' },
  { name: 'Delux WeHo', url: 'https://deluxweho.com/' },
  { name: 'CODA', url: 'https://thecodanashville.com/' },
];

const providerPattern = /tour|schedule|appointment|calendar|availab|leasing|knock|hyly|rentcafe|securecafe|realpage|funnel|elise|tour24|rently|engrain|betterbot|perq|leasehawk|meetelise|greystar|prospectportal|rentdynamics/i;

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function visibleElements(frame) {
  try {
    return await frame.evaluate(() => {
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
      };
      const els = [...document.querySelectorAll('a,button,input,select,textarea,[role="button"],[role="link"],[tabindex]')]
        .filter(visible)
        .slice(0, 500);
      return els.map((el, index) => ({
        index,
        tag: el.tagName,
        text: (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 240),
        ariaLabel: el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
        name: el.getAttribute('name'),
        id: el.id || null,
        type: el.getAttribute('type'),
        href: el.href || el.getAttribute('href'),
        placeholder: el.getAttribute('placeholder'),
        value: el.value || null,
        role: el.getAttribute('role'),
        className: typeof el.className === 'string' ? el.className.slice(0, 300) : null,
      }));
    });
  } catch (error) {
    return [{ error: String(error) }];
  }
}

async function inspectPage(page, label) {
  const result = {
    label,
    capturedAt: new Date().toISOString(),
    url: page.url(),
    title: await page.title().catch(() => ''),
    frames: [],
    iframes: [],
    scripts: [],
  };
  try {
    result.iframes = await page.locator('iframe').evaluateAll((els) => els.map((el) => ({
      src: el.src || el.getAttribute('src'),
      title: el.getAttribute('title'),
      name: el.getAttribute('name'),
      id: el.id || null,
      className: el.className || null,
    })));
    result.scripts = await page.locator('script[src]').evaluateAll((els) => els.map((el) => el.src).filter(Boolean));
  } catch {}

  for (const frame of page.frames()) {
    const frameResult = {
      name: frame.name(),
      url: frame.url(),
      text: '',
      interactive: [],
    };
    try {
      frameResult.text = (await frame.locator('body').innerText({ timeout: 5000 })).replace(/\s+/g, ' ').slice(0, 30000);
    } catch (error) {
      frameResult.text = `[body unavailable: ${String(error)}]`;
    }
    frameResult.interactive = await visibleElements(frame);
    result.frames.push(frameResult);
  }
  return result;
}

async function dismissCookies(page) {
  const patterns = [/accept all/i, /accept cookies/i, /^accept$/i, /allow all/i, /agree/i, /continue without accepting/i, /close/i];
  for (const frame of page.frames()) {
    for (const pattern of patterns) {
      const candidates = [
        frame.getByRole('button', { name: pattern }),
        frame.getByRole('link', { name: pattern }),
      ];
      for (const locator of candidates) {
        try {
          if (await locator.first().isVisible({ timeout: 300 })) {
            await locator.first().click({ timeout: 3000 });
            await page.waitForTimeout(500);
            return true;
          }
        } catch {}
      }
    }
  }
  return false;
}

async function clickTourEntry(page) {
  const rolePatterns = [
    /schedule a tour/i,
    /book a tour/i,
    /schedule tour/i,
    /book tour/i,
    /tour now/i,
    /request a tour/i,
    /visit us/i,
  ];
  for (const frame of page.frames()) {
    for (const pattern of rolePatterns) {
      for (const role of ['button', 'link']) {
        const locator = frame.getByRole(role, { name: pattern });
        const count = await locator.count().catch(() => 0);
        for (let i = 0; i < Math.min(count, 5); i++) {
          try {
            const item = locator.nth(i);
            if (await item.isVisible({ timeout: 300 })) {
              const text = await item.innerText().catch(() => '');
              const href = await item.getAttribute('href').catch(() => null);
              await item.click({ timeout: 8000 });
              return { clicked: true, role, pattern: String(pattern), text, href, frameUrl: frame.url() };
            }
          } catch {}
        }
      }
    }
  }

  for (const frame of page.frames()) {
    const locator = frame.locator('a[href*="tour" i], a[href*="schedule" i], button[class*="tour" i], [aria-label*="tour" i]');
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < Math.min(count, 10); i++) {
      try {
        const item = locator.nth(i);
        if (await item.isVisible({ timeout: 300 })) {
          const text = await item.innerText().catch(() => '');
          const href = await item.getAttribute('href').catch(() => null);
          await item.click({ timeout: 8000 });
          return { clicked: true, selector: 'tour/schedule attributes', text, href, frameUrl: frame.url() };
        }
      } catch {}
    }
  }
  return { clicked: false };
}

async function saveState(page, dir, label, network) {
  const state = await inspectPage(page, label);
  state.network = network.slice(-300);
  await fs.writeFile(path.join(dir, `${label}.json`), JSON.stringify(state, null, 2));
  await page.screenshot({ path: path.join(dir, `${label}.png`), fullPage: true }).catch(() => {});
  await fs.writeFile(path.join(dir, `${label}.html`), await page.content().catch(() => '')).catch(() => {});
  return state;
}

await ensureDir(OUT);
const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  locale: 'en-US',
  timezoneId: 'America/Chicago',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
});

const summary = [];
for (const site of sites) {
  const slug = slugify(site.name);
  const dir = path.join(OUT, slug);
  await ensureDir(dir);
  const page = await context.newPage();
  const network = [];
  const consoleMessages = [];
  page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text().slice(0, 1000) }));
  page.on('pageerror', (error) => consoleMessages.push({ type: 'pageerror', text: String(error).slice(0, 1000) }));
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    if (!providerPattern.test(url) && !contentType.includes('json')) return;
    const record = { url, status: response.status(), method: response.request().method(), contentType };
    try {
      const body = await response.text();
      record.bodyPreview = body.slice(0, 100000);
    } catch (error) {
      record.bodyError = String(error);
    }
    network.push(record);
    if (network.length > 500) network.shift();
  });

  const item = { name: site.name, startUrl: site.url, status: 'unknown', states: [], errors: [] };
  try {
    const response = await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    item.httpStatus = response?.status() ?? null;
    await page.waitForTimeout(10000);
    await dismissCookies(page);
    await page.waitForTimeout(2000);
    const initial = await saveState(page, dir, 'initial', network);
    item.states.push({ label: 'initial', url: initial.url, title: initial.title, frames: initial.frames.map((f) => f.url), iframes: initial.iframes });

    const beforePages = context.pages().length;
    const click = await clickTourEntry(page);
    item.click = click;
    await page.waitForTimeout(12000);
    const pages = context.pages();
    let activePage = page;
    if (pages.length > beforePages) {
      activePage = pages[pages.length - 1];
      await activePage.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
      await activePage.waitForTimeout(5000);
    }
    const after = await saveState(activePage, dir, 'after-tour-click', network);
    item.states.push({ label: 'after-tour-click', url: after.url, title: after.title, frames: after.frames.map((f) => f.url), iframes: after.iframes });
    item.status = 'ok';
  } catch (error) {
    item.status = 'error';
    item.errors.push(String(error));
    await page.screenshot({ path: path.join(dir, 'error.png'), fullPage: true }).catch(() => {});
  }
  await fs.writeFile(path.join(dir, 'console.json'), JSON.stringify(consoleMessages, null, 2));
  await fs.writeFile(path.join(dir, 'network.json'), JSON.stringify(network, null, 2));
  summary.push(item);
  console.log(`\n===== ${site.name} =====`);
  console.log(JSON.stringify(item, null, 2));
  for (const p of context.pages()) {
    if (p !== page) await p.close().catch(() => {});
  }
  await page.close().catch(() => {});
}

await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
await browser.close();
console.log('\n===== FINAL SUMMARY =====');
console.log(JSON.stringify(summary, null, 2));
