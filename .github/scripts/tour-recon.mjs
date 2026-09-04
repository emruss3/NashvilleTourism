import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const sites = [
  { key: 'emblem-park', name: 'Emblem Park', url: 'https://emblemparknashville.com/schedule-a-tour/' },
  { key: 'westerly-house', name: 'Westerly House', url: 'https://livewesterlyhouse.com/schedule-a-tour/' },
  { key: '445-park-commons', name: '445 Park Commons', url: 'https://445parkcommons.com/schedule-a-tour/' },
  { key: 'the-finery', name: 'Residences at The Finery', url: 'https://livethefinery.com/' },
  { key: 'memoir-weho', name: 'Memoir Wedgewood Houston', url: 'https://memoirresidential.com/properties/wedgewoodhouston' },
  { key: 'memoir-may-hosiery', name: 'Memoir May Hosiery', url: 'https://memoirresidential.com/properties/may-hosiery' },
  { key: 'standard-assembly', name: 'Standard Assembly', url: 'https://www.greystar.com/properties/nashville-tn/standard-assembly-apartments-nashville-tn/p_19399' },
  { key: 'queens-weho', name: 'Queens Wedgewood Houston', url: 'https://queensweho.com/' },
  { key: 'luna', name: 'Luna', url: 'https://lunanashvilleliving.com/schedule-a-tour/' },
  { key: 'delux-weho', name: 'Delux WeHo', url: 'https://deluxweho.com/' },
  { key: 'coda', name: 'CODA', url: 'https://thecodanashville.com/' },
];

const outDir = path.resolve('tour-audit-output');
await fs.mkdir(outDir, { recursive: true });

function safeFile(s) {
  return s.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 150);
}

async function dumpFrame(frame) {
  const result = { url: frame.url(), name: frame.name() };
  try {
    result.title = await frame.title();
  } catch {}
  try {
    result.bodyText = (await frame.locator('body').innerText({ timeout: 5000 })).slice(0, 50000);
  } catch (e) {
    result.bodyTextError = String(e);
  }
  try {
    result.interactives = await frame.locator('a,button,input,select,textarea,[role="button"],[role="option"],[role="tab"],[role="gridcell"]').evaluateAll((els) => els.slice(0, 1500).map((e, i) => ({
      i,
      tag: e.tagName,
      type: e.getAttribute('type'),
      text: (e.innerText || e.value || e.getAttribute('aria-label') || e.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 500),
      ariaLabel: e.getAttribute('aria-label'),
      role: e.getAttribute('role'),
      href: e.href || null,
      id: e.id || null,
      name: e.getAttribute('name'),
      disabled: Boolean(e.disabled) || e.getAttribute('aria-disabled') === 'true',
      checked: Boolean(e.checked),
      selected: Boolean(e.selected),
      className: typeof e.className === 'string' ? e.className.slice(0, 500) : null,
      data: Object.fromEntries([...e.attributes].filter(a => a.name.startsWith('data-')).slice(0, 30).map(a => [a.name, a.value.slice(0, 500)])),
    })));
  } catch (e) {
    result.interactivesError = String(e);
  }
  try {
    result.html = (await frame.locator('html').evaluate(el => el.outerHTML)).slice(0, 500000);
  } catch (e) {
    result.htmlError = String(e);
  }
  return result;
}

async function clickLikelyTour(page) {
  const patterns = [/schedule\s*(a\s*)?tour/i, /book\s*(a\s*)?tour/i, /tour\s*now/i, /visit\s*us/i];
  for (const frame of page.frames()) {
    for (const pattern of patterns) {
      const candidates = [
        frame.getByRole('link', { name: pattern }),
        frame.getByRole('button', { name: pattern }),
        frame.locator('a,button,[role="button"]').filter({ hasText: pattern }),
      ];
      for (const loc of candidates) {
        try {
          const count = await loc.count();
          if (!count) continue;
          const el = loc.first();
          if (!(await el.isVisible({ timeout: 1500 }))) continue;
          const before = page.url();
          const popupPromise = page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null);
          await el.click({ timeout: 8000 });
          const popup = await popupPromise;
          const target = popup || page;
          await target.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
          await target.waitForTimeout(7000);
          return { clicked: true, pattern: String(pattern), before, after: target.url(), popup: Boolean(popup), target };
        } catch {}
      }
    }
  }
  return { clicked: false, target: page };
}

async function acceptCookies(page) {
  for (const frame of page.frames()) {
    const patterns = [/accept all/i, /^accept$/i, /allow all/i, /agree/i, /got it/i];
    for (const p of patterns) {
      try {
        const btn = frame.getByRole('button', { name: p }).first();
        if (await btn.isVisible({ timeout: 700 })) {
          await btn.click({ timeout: 3000 });
          await page.waitForTimeout(1000);
          return true;
        }
      } catch {}
    }
  }
  return false;
}

const browser = await chromium.launch({ headless: true });
const summary = [];

for (const site of sites) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  const record = {
    ...site,
    startedAt: new Date().toISOString(),
    requests: [],
    responses: [],
    console: [],
    pageErrors: [],
  };

  page.on('console', msg => {
    record.console.push({ type: msg.type(), text: msg.text().slice(0, 2000) });
  });
  page.on('pageerror', err => record.pageErrors.push(String(err).slice(0, 5000)));
  page.on('request', req => {
    const u = req.url();
    if (/tour|sched|appoint|calendar|avail|slot|knock|hyly|funnel|rentcafe|realpage|entrata|tour24|meetelise|leasehawk|perq|betterbot|greystar/i.test(u)) {
      record.requests.push({ method: req.method(), url: u, resourceType: req.resourceType(), postData: (req.postData() || '').slice(0, 10000) });
    }
  });
  page.on('response', async res => {
    const u = res.url();
    const ct = (res.headers()['content-type'] || '').toLowerCase();
    if (/tour|sched|appoint|calendar|avail|slot|knock|hyly|funnel|rentcafe|realpage|entrata|tour24|meetelise|leasehawk|perq|betterbot|greystar/i.test(u) || ct.includes('application/json')) {
      const item = { status: res.status(), url: u, contentType: ct };
      try {
        const body = await res.text();
        item.body = body.slice(0, 150000);
      } catch (e) {
        item.bodyError = String(e);
      }
      record.responses.push(item);
    }
  });

  try {
    const response = await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    record.initialStatus = response?.status() ?? null;
    await page.waitForTimeout(10000);
    await acceptCookies(page);
    record.initialUrl = page.url();
    record.initialTitle = await page.title();
    record.initialFrames = await Promise.all(page.frames().map(dumpFrame));
    await page.screenshot({ path: path.join(outDir, `${site.key}-initial.png`), fullPage: true });

    const clicked = await clickLikelyTour(page);
    const target = clicked.target;
    record.click = { ...clicked, target: undefined };
    await target.waitForTimeout(8000);
    await acceptCookies(target);
    record.finalUrl = target.url();
    record.finalTitle = await target.title();
    record.finalFrames = await Promise.all(target.frames().map(dumpFrame));
    await target.screenshot({ path: path.join(outDir, `${site.key}-final.png`), fullPage: true });

    // Capture all pages in case a scheduler opened a new tab.
    record.pages = [];
    for (const p of context.pages()) {
      record.pages.push({
        url: p.url(),
        title: await p.title().catch(() => ''),
        frames: await Promise.all(p.frames().map(dumpFrame)),
      });
    }
  } catch (e) {
    record.error = String(e);
    try {
      await page.screenshot({ path: path.join(outDir, `${site.key}-error.png`), fullPage: true });
    } catch {}
  }

  record.completedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, `${site.key}.json`), JSON.stringify(record, null, 2));
  summary.push({
    key: site.key,
    name: site.name,
    initialUrl: record.initialUrl,
    finalUrl: record.finalUrl,
    click: record.click,
    error: record.error,
    frameUrls: (record.finalFrames || record.initialFrames || []).map(f => f.url),
    relevantRequests: record.requests.length,
    relevantResponses: record.responses.length,
  });
  await context.close();
  console.log(`AUDITED ${site.name}: ${JSON.stringify(summary.at(-1))}`);
}

await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
await browser.close();
