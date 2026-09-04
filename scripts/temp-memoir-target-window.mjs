import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('memoir-target-window-output');
await fs.mkdir(OUT, { recursive: true });

const dates = [
  ['2026-09-11', 'Friday, September 11, 2026'],
  ['2026-09-12', 'Saturday, September 12, 2026'],
  ['2026-09-13', 'Sunday, September 13, 2026'],
  ['2026-09-14', 'Monday, September 14, 2026'],
  ['2026-09-15', 'Tuesday, September 15, 2026'],
  ['2026-09-16', 'Wednesday, September 16, 2026'],
  ['2026-09-17', 'Thursday, September 17, 2026'],
  ['2026-09-18', 'Friday, September 18, 2026'],
];

const targets = [
  {
    key: 'memoir-may-hosiery',
    name: 'Memoir May Hosiery',
    url: 'https://www.memoir-mayhosiery.com/scheduletour',
  },
  {
    key: 'memoir-wedgewood-houston',
    name: 'Memoir Wedgewood Houston',
    warmup: 'https://www.memoirresidential.com/properties/wedgewoodhouston',
    url: 'https://www.memoir-wedgewoodhouston.com/scheduletour',
  },
];

const timeRe = /\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi;
const unique = (xs) => [...new Set(xs)];
const extractTimes = (s) => unique([...String(s || '').matchAll(timeRe)].map((m) => m[0].toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ')));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function acceptCookies(page) {
  const names = [/Accept All Cookies/i, /^Accept$/i, /Accept All/i];
  for (const name of names) {
    try {
      const btn = page.getByRole('button', { name }).first();
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click({ timeout: 3000 });
        await page.waitForTimeout(500);
        break;
      }
    } catch {}
  }
  await page.evaluate(() => {
    document.querySelectorAll('#onetrust-banner-sdk,.onetrust-pc-dark-filter,#onetrust-consent-sdk').forEach((n) => n.remove());
  }).catch(() => {});
}

async function loadScheduler(page, target) {
  const attempts = [];
  if (target.warmup) {
    try {
      const response = await page.goto(target.warmup, { waitUntil: 'domcontentloaded', timeout: 75000 });
      attempts.push({ url: target.warmup, status: response?.status(), title: await page.title() });
      await page.waitForTimeout(5000);
    } catch (error) {
      attempts.push({ url: target.warmup, error: String(error) });
    }
  }

  for (let i = 0; i < 5; i++) {
    const url = i ? `${target.url}?audit=${Date.now()}-${i}` : target.url;
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 75000 });
      await page.waitForTimeout(7000 + i * 1500);
      const title = await page.title();
      const hasCalendar = await page.locator('#radiodate1').count();
      attempts.push({ url, status: response?.status(), finalUrl: page.url(), title, hasCalendar });
      if (hasCalendar) return { ok: true, attempts };
    } catch (error) {
      attempts.push({ url, error: String(error), finalUrl: page.url(), title: await page.title().catch(() => '') });
    }
    await sleep(1500);
  }
  return { ok: false, attempts };
}

async function auditTarget(browser, target) {
  const context = await browser.newContext({
    timezoneId: 'America/Chicago',
    locale: 'en-US',
    viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  });
  await context.addInitScript(() => {
    try { delete Object.getPrototypeOf(navigator).webdriver; } catch {}
  });

  const page = await context.newPage();
  const result = {
    name: target.name,
    url: target.url,
    auditedAt: new Date().toISOString(),
    provider: 'RentCafe/Yardi',
    tourTypes: ['Guided Tour'],
    days: {},
    responses: [],
  };

  page.on('response', async (response) => {
    if (!response.url().includes('handler=GetAvailableSlots')) return;
    const request = response.request();
    let body = '';
    try { body = await response.text(); } catch {}
    result.responses.push({
      status: response.status(),
      url: response.url(),
      postData: request.postData() || '',
      body: body.slice(0, 150000),
    });
  });

  result.load = await loadScheduler(page, target);
  if (!result.load.ok) {
    result.error = 'Could not load live RentCafe calendar after retries';
    await fs.writeFile(path.join(OUT, `${target.key}.json`), JSON.stringify(result, null, 2));
    await context.close();
    return result;
  }

  await acceptCookies(page);
  result.initialText = (await page.locator('body').innerText().catch(() => '')).slice(0, 60000);
  result.bookingDisclaimer = result.initialText.match(/Scheduled tours[^\n]*/i)?.[0] || null;

  for (const [iso, display] of dates) {
    const row = { display, times: [], available: false };
    const before = result.responses.length;
    try {
      // Use the site's normal delegated click handler, but set the date carried by
      // the visible calendar cell to the requested target date first.
      await page.evaluate(({ display }) => {
        const radio = document.querySelector('#radiodate1');
        if (!radio) throw new Error('radiodate1 not found');
        const cell = radio.closest('.calendar-btn') || radio.parentElement;
        const selected = cell?.querySelector('.selecteddate');
        const formatted = cell?.querySelector('.datewithformat');
        if (selected) selected.value = display.replace(/^\w+,\s*/, '').replace(/([A-Za-z]+) (\d+), (\d+)/, (_, month, day, year) => {
          const months = { January:'01', February:'02', March:'03', April:'04', May:'05', June:'06', July:'07', August:'08', September:'09', October:'10', November:'11', December:'12' };
          return `${months[month]}/${String(day).padStart(2,'0')}/${year}`;
        });
        if (formatted) formatted.value = display;
        document.querySelectorAll('input[name="radiodate"]').forEach((el) => { el.checked = false; });
        radio.checked = true;
        radio.dispatchEvent(new Event('input', { bubbles: true }));
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        radio.click();
      }, { display });

      await page.waitForTimeout(2600);
      const matching = result.responses.slice(before).filter((r) => r.postData.includes(display));
      row.network = matching.map((r) => ({ status: r.status, postData: r.postData, times: extractTimes(r.body), bodyPreview: r.body.slice(0, 500) }));

      let text = await page.locator('#availableslots').innerText().catch(() => '');
      let html = await page.locator('#availableslots').innerHTML().catch(() => '');
      row.slotText = text.replace(/\s+/g, ' ').trim();
      row.times = extractTimes(`${text}\n${html}\n${matching.map((r) => r.body).join('\n')}`);

      // Fallback: initiate the same same-origin fetch inside the real page context.
      if (!matching.length || matching.every((r) => r.status !== 200)) {
        const fallback = await page.evaluate(async ({ display }) => {
          const token = document.querySelector('#scheduletour-request-verification-token')?.value ||
            document.querySelector('#calendar-request-verification-token')?.value ||
            document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';
          const body = new URLSearchParams({ dtSchedule: display, tourType: '0', txtBedroom: '', units: '' });
          const response = await fetch('/scheduletour?handler=GetAvailableSlots', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'RequestVerificationToken': token,
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: body.toString(),
          });
          return { status: response.status, text: await response.text() };
        }, { display });
        row.fallback = { status: fallback.status, times: extractTimes(fallback.text), bodyPreview: fallback.text.slice(0, 800) };
        row.times = unique([...row.times, ...extractTimes(fallback.text)]);
      }

      row.available = row.times.length > 0;
    } catch (error) {
      row.error = String(error);
    }
    result.days[iso] = row;
  }

  try { await page.screenshot({ path: path.join(OUT, `${target.key}.png`), fullPage: true, timeout: 30000 }); } catch {}
  await fs.writeFile(path.join(OUT, `${target.key}.json`), JSON.stringify(result, null, 2));
  await context.close();
  return result;
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
});
const results = [];
for (const target of targets) {
  try { results.push(await auditTarget(browser, target)); }
  catch (error) { results.push({ name: target.name, fatal: String(error) }); }
}
await browser.close();
await fs.writeFile(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.map((r) => ({ name: r.name, error: r.error || r.fatal || null, days: r.days && Object.fromEntries(Object.entries(r.days).map(([d, v]) => [d, v.times?.length || 0])) })), null, 2));
