import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.env.AUDIT_OUT || 'tour-audit-artifacts';
const targets = [
  { id: '01-emblem-park', name: 'Emblem Park', url: 'https://emblemparknashville.com/schedule-a-tour/' },
  { id: '02-westerly-house', name: 'Westerly House', url: 'https://livewesterlyhouse.com/schedule-a-tour/' },
  { id: '03-445-park-commons', name: '445 Park Commons', url: 'https://445parkcommons.com/schedule-a-tour/' },
  { id: '04-fin­ery', name: 'Residences at The Finery', url: 'https://livethefinery.com/' },
  { id: '05-memoir-weho', name: 'Memoir Wedgewood Houston', url: 'https://memoirresidential.com/properties/wedgewoodhouston' },
  { id: '06-memoir-may-hosiery', name: 'Memoir May Hosiery', url: 'https://memoirresidential.com/properties/may-hosiery' },
  { id: '07-standard-assembly', name: 'Standard Assembly', url: 'https://www.greystar.com/properties/nashville-tn/standard-assembly' },
  { id: '08-queens-weho', name: 'Queens Wedgewood Houston', url: 'https://queensweho.com/' },
  { id: '09-luna', name: 'Luna', url: 'https://lunanashvilleliving.com/schedule-a-tour/' },
  { id: '10-delux-weho', name: 'Delux WeHo', url: 'https://deluxweho.com/' },
  { id: '11-coda', name: 'CODA', url: 'https://thecodanashville.com/' }
];

const TOUR_RE = /schedule\s*(?:a\s*)?tour|book\s*(?:a\s*)?tour|tour\s*now|schedule\s*(?:an\s*)?appointment|book\s*(?:an\s*)?appointment|reserve\s*(?:a\s*)?tour/i;
const COOKIE_RE = /accept all|accept cookies|allow all|agree|got it|continue without accepting/i;
const TYPE_RE = /guided tour|self[- ]guided|live video|video tour|virtual tour|in[- ]person tour|agent guided/i;

function clean(value) {
  return String(value ?? '').replace(/\u0000/g, '').trim();
}
function safeName(value) {
  return clean(value).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'item';
}
async function mkdirp(dir) { await fs.mkdir(dir, { recursive: true }); }
async function writeJson(file, obj) { await mkdirp(path.dirname(file)); await fs.writeFile(file, JSON.stringify(obj, null, 2)); }

async function getVisibleControls(frame) {
  return frame.locator('a,button,[role="button"],input[type="button"],input[type="submit"],select,input,textarea').evaluateAll((els) =>
    els.slice(0, 500).map((el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const visible = r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      return {
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type'),
        text: (el.innerText || el.textContent || el.getAttribute('value') || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 500),
        ariaLabel: el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
        href: el.href || el.getAttribute('href'),
        name: el.getAttribute('name'),
        id: el.id || null,
        role: el.getAttribute('role'),
        disabled: Boolean(el.disabled) || el.getAttribute('aria-disabled') === 'true',
        visible
      };
    }).filter(x => x.visible)
  ).catch(() => []);
}

async function snapshotPage(page, dir, label) {
  await mkdirp(dir);
  const frames = [];
  for (const frame of page.frames()) {
    const bodyText = clean(await frame.locator('body').innerText({ timeout: 5000 }).catch(() => ''));
    const controls = await getVisibleControls(frame);
    const links = await frame.locator('a[href]').evaluateAll((els) => els.slice(0, 1000).map(a => ({
      text: (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 300),
      href: a.href
    }))).catch(() => []);
    frames.push({
      name: frame.name(),
      url: frame.url(),
      bodyText: bodyText.slice(0, 120000),
      controls,
      tourLinks: links.filter(x => /tour|schedule|appointment|book/i.test(`${x.text} ${x.href}`)).slice(0, 200)
    });
  }
  const result = {
    label,
    timestamp: new Date().toISOString(),
    title: await page.title().catch(() => ''),
    url: page.url(),
    frames
  };
  await writeJson(path.join(dir, `${label}.json`), result);
  await fs.writeFile(path.join(dir, `${label}.txt`), frames.map((f, i) => `\n===== FRAME ${i}: ${f.url} =====\n${f.bodyText}`).join('\n'));
  await page.screenshot({ path: path.join(dir, `${label}.png`), fullPage: true }).catch(() => {});
  return result;
}

async function clickFirstMatching(page, regex, { exclude = /submit|send|confirm|apply/i } = {}) {
  const pagesBefore = new Set(page.context().pages());
  for (const frame of page.frames()) {
    const candidates = frame.locator('a,button,[role="button"],input[type="button"],input[type="submit"]');
    const count = Math.min(await candidates.count().catch(() => 0), 500);
    for (let i = 0; i < count; i++) {
      const el = candidates.nth(i);
      if (!await el.isVisible().catch(() => false) || await el.isDisabled().catch(() => true)) continue;
      const text = clean((await el.innerText().catch(() => '')) || (await el.getAttribute('aria-label').catch(() => '')) || (await el.getAttribute('value').catch(() => '')));
      const href = clean(await el.getAttribute('href').catch(() => ''));
      const combined = `${text} ${href}`;
      if (!regex.test(combined) || exclude.test(text)) continue;
      try {
        await el.scrollIntoViewIfNeeded();
        await el.click({ timeout: 10000 });
        await page.waitForTimeout(5000);
        const newPages = page.context().pages().filter(p => !pagesBefore.has(p));
        if (newPages.length) {
          const p = newPages.at(-1);
          await p.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
          await p.waitForTimeout(4000);
          return { clicked: true, text, href, page: p };
        }
        return { clicked: true, text, href, page };
      } catch (error) {
        return { clicked: false, text, href, error: String(error), page };
      }
    }
  }
  return { clicked: false, page };
}

async function dismissCookies(page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await clickFirstMatching(page, COOKIE_RE, { exclude: /preferences|settings|manage/i });
    if (!res.clicked) break;
    page = res.page;
  }
  return page;
}

async function auditTarget(browser, target) {
  const dir = path.join(OUT, target.id);
  await mkdirp(path.join(dir, 'responses'));
  const context = await browser.newContext({
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    viewport: { width: 1440, height: 1100 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  const network = [];
  const responseSaves = [];
  let responseIndex = 0;

  context.on('page', p => {
    p.on('dialog', d => d.dismiss().catch(() => {}));
  });
  page.on('dialog', d => d.dismiss().catch(() => {}));

  context.on('response', response => {
    const request = response.request();
    const type = request.resourceType();
    if (!['xhr', 'fetch', 'document'].includes(type)) return;
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      method: request.method(),
      url: response.url(),
      status: response.status(),
      contentType: response.headers()['content-type'] || ''
    };
    network.push(entry);
    if (['xhr', 'fetch'].includes(type) && /json|javascript|text\/plain/i.test(entry.contentType)) {
      const n = ++responseIndex;
      responseSaves.push((async () => {
        try {
          const body = await response.body();
          if (body.length > 2_000_000) return;
          const ext = /json/i.test(entry.contentType) ? 'json' : 'txt';
          const file = `${String(n).padStart(4, '0')}-${safeName(new URL(response.url()).hostname + new URL(response.url()).pathname)}.${ext}`;
          await fs.writeFile(path.join(dir, 'responses', file), body);
          entry.savedAs = file;
        } catch {}
      })());
    }
  });

  const summary = { target, startedAt: new Date().toISOString(), steps: [], errors: [] };
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(7000);
    let active = await dismissCookies(page);
    summary.initial = await snapshotPage(active, dir, '01-initial');

    const cta = await clickFirstMatching(active, TOUR_RE);
    summary.steps.push({ action: 'click tour CTA', ...cta, page: undefined });
    active = cta.page;
    await active.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await active.waitForTimeout(7000);
    active = await dismissCookies(active);
    summary.afterCta = await snapshotPage(active, dir, '02-after-tour-cta');

    // Some schedulers first ask for a tour type. Click at most one type to reveal the calendar.
    const typeClick = await clickFirstMatching(active, TYPE_RE, { exclude: /submit|send|confirm|apply|learn more/i });
    summary.steps.push({ action: 'click first tour type', ...typeClick, page: undefined });
    if (typeClick.clicked) {
      active = typeClick.page;
      await active.waitForTimeout(7000);
      summary.afterType = await snapshotPage(active, dir, '03-after-tour-type');
    }

    // Capture every open page, including scheduler popups.
    let idx = 0;
    for (const p of context.pages()) {
      idx++;
      await snapshotPage(p, dir, `90-open-page-${String(idx).padStart(2, '0')}`);
    }
  } catch (error) {
    summary.errors.push(String(error?.stack || error));
    await page.screenshot({ path: path.join(dir, 'error.png'), fullPage: true }).catch(() => {});
  }
  await Promise.allSettled(responseSaves);
  summary.network = network;
  summary.finishedAt = new Date().toISOString();
  await writeJson(path.join(dir, 'summary.json'), summary);
  await context.close();
  return summary;
}

await mkdirp(OUT);
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const all = [];
for (const target of targets) {
  console.log(`AUDIT_START ${target.name} ${target.url}`);
  const result = await auditTarget(browser, target);
  all.push({
    name: target.name,
    url: target.url,
    errors: result.errors,
    finalUrls: [...new Set([result.initial?.url, result.afterCta?.url, result.afterType?.url].filter(Boolean))],
    frameUrls: [...new Set([
      ...(result.initial?.frames || []),
      ...(result.afterCta?.frames || []),
      ...(result.afterType?.frames || [])
    ].map(f => f.url).filter(Boolean))]
  });
  console.log(`AUDIT_DONE ${target.name} errors=${result.errors.length}`);
}
await browser.close();
await writeJson(path.join(OUT, 'index.json'), all);
console.log(JSON.stringify(all, null, 2));
