import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('memoir-calendar-final-output');
await fs.mkdir(OUT, { recursive: true });

const targets = [
  { key: 'memoir-may-hosiery', name: 'Memoir May Hosiery', url: 'https://www.memoir-mayhosiery.com/scheduletour' },
  { key: 'memoir-wedgewood-houston', name: 'Memoir Wedgewood Houston', warmup: 'https://www.memoirresidential.com/properties/wedgewoodhouston', url: 'https://www.memoir-wedgewoodhouston.com/scheduletour' },
];

const dates = Array.from({ length: 8 }, (_, i) => {
  const day = 11 + i;
  const iso = `2026-09-${String(day).padStart(2, '0')}`;
  const d = new Date(`${iso}T12:00:00-05:00`);
  const full = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago',
  }).format(d);
  return { iso, day, full, mmddyyyy: `09/${String(day).padStart(2, '0')}/2026` };
});

const timeRe = /\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi;
const uniq = (xs) => [...new Set(xs)];
const extractTimes = (s) => uniq([...String(s || '').matchAll(timeRe)].map((m) => m[0].toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ')));
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

async function loadScheduler(page, target) {
  const attempts = [];
  if (target.warmup) {
    try {
      const r = await page.goto(target.warmup, { waitUntil: 'domcontentloaded', timeout: 75000 });
      await page.waitForTimeout(5000);
      attempts.push({ url: target.warmup, status: r?.status(), title: await page.title() });
    } catch (error) {
      attempts.push({ url: target.warmup, error: String(error) });
    }
  }
  for (let i = 0; i < 6; i++) {
    const u = i ? `${target.url}?audit=${Date.now()}-${i}` : target.url;
    try {
      const r = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 75000 });
      await page.waitForTimeout(7500 + i * 900);
      const hasCalendar = await page.locator('#scheduledate').count();
      attempts.push({ url: u, status: r?.status(), finalUrl: page.url(), title: await page.title(), hasCalendar });
      if (hasCalendar) return { ok: true, attempts };
    } catch (error) {
      attempts.push({ url: u, finalUrl: page.url(), title: await page.title().catch(() => ''), error: String(error) });
    }
    await page.waitForTimeout(1200);
  }
  return { ok: false, attempts };
}

async function dismissCookies(page) {
  for (const re of [/Accept All Cookies/i, /^Accept$/i, /Accept All/i]) {
    try {
      const btn = page.getByRole('button', { name: re }).first();
      if (await btn.isVisible({ timeout: 600 })) {
        await btn.click({ timeout: 3000 });
        break;
      }
    } catch {}
  }
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelectorAll('#onetrust-banner-sdk,.onetrust-pc-dark-filter,#onetrust-consent-sdk').forEach((n) => n.remove())).catch(() => {});
}

async function chooseCalendarDate(page, d) {
  await page.locator('#scheduledate').click({ force: true, timeout: 6000 });
  await page.waitForTimeout(500);
  const selected = await page.evaluate(({ full }) => {
    const calendars = [...document.querySelectorAll('.flatpickr-calendar')].filter((el) => {
      const style = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    });
    const all = calendars.flatMap((c) => [...c.querySelectorAll('.flatpickr-day')]);
    const target = all.find((el) => (el.getAttribute('aria-label') || '') === full || (el.getAttribute('aria-label') || '').includes(full));
    if (!target) return { ok: false, visibleCalendars: calendars.length, labels: all.map((el) => el.getAttribute('aria-label')).filter(Boolean) };
    const meta = { aria: target.getAttribute('aria-label') || '', className: target.className, text: (target.textContent || '').trim() };
    if (target.classList.contains('flatpickr-disabled') || /Unavailable/i.test(meta.aria)) return { ok: false, disabled: true, meta };
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    target.click();
    return { ok: true, meta };
  }, { full: d.full });
  await page.waitForTimeout(1200);
  return selected;
}

async function dateCards(page) {
  return page.locator('input[name="radiodate"]').evaluateAll((radios) => radios.map((radio) => {
    const cell = radio.closest('.calendar-btn') || radio.parentElement;
    const selected = cell?.querySelector('.selecteddate');
    const formatted = cell?.querySelector('.datewithformat');
    return {
      id: radio.id,
      value: radio.value,
      disabled: Boolean(radio.disabled),
      text: (cell?.textContent || '').replace(/\s+/g, ' ').trim(),
      selectedDate: selected?.value || selected?.getAttribute('value') || '',
      dateWithFormat: formatted?.value || formatted?.getAttribute('value') || '',
      html: (cell?.innerHTML || '').slice(0, 5000),
    };
  }));
}

async function selectDateCard(page, d) {
  const cards = await dateCards(page);
  const match = cards.find((c) => c.selectedDate === d.mmddyyyy || c.dateWithFormat.includes(d.full) || c.dateWithFormat.includes(d.mmddyyyy));
  if (!match) return { ok: false, cards };
  const radio = page.locator(`#${match.id}`);
  if (match.disabled || await radio.isDisabled().catch(() => false)) return { ok: false, disabled: true, match, cards };
  await radio.check({ force: true, timeout: 5000 }).catch(async () => {
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Missing ${id}`);
      el.checked = true;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.click();
    }, match.id);
  });
  return { ok: true, match, cards };
}

async function auditTarget(browser, target) {
  const context = await browser.newContext({
    timezoneId: 'America/Chicago', locale: 'en-US', viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  });
  await context.addInitScript(() => { try { delete Object.getPrototypeOf(navigator).webdriver; } catch {} });
  const page = await context.newPage();
  const result = { name: target.name, url: target.url, provider: 'RentCafe/Yardi', auditedAt: new Date().toISOString(), tourTypes: ['Guided Tour'], days: {}, responses: [] };

  page.on('response', async (response) => {
    if (!response.url().includes('handler=GetAvailableSlots')) return;
    let body = '';
    try { body = await response.text(); } catch {}
    result.responses.push({
      status: response.status(), url: response.url(), postData: response.request().postData() || '', body: body.slice(0, 180000),
    });
  });

  result.load = await loadScheduler(page, target);
  if (!result.load.ok) {
    result.error = 'Calendar page did not load';
    await fs.writeFile(path.join(OUT, `${target.key}.json`), JSON.stringify(result, null, 2));
    await context.close();
    return result;
  }
  await dismissCookies(page);
  const initialText = await page.locator('body').innerText().catch(() => '');
  result.initialText = initialText.slice(0, 60000);
  result.bookingDisclaimer = initialText.match(/Scheduled tours[^\n]*/i)?.[0] || null;

  for (const d of dates) {
    const row = { full: d.full, available: false, times: [] };
    const before = result.responses.length;
    try {
      row.calendar = await chooseCalendarDate(page, d);
      if (!row.calendar.ok) {
        row.reason = row.calendar.disabled ? 'Date disabled in calendar' : 'Date not selectable in calendar';
        result.days[d.iso] = row;
        continue;
      }
      row.card = await selectDateCard(page, d);
      if (!row.card.ok) {
        row.reason = row.card.disabled ? 'Date card disabled after calendar selection' : 'Selected date not present in seven-day strip';
        result.days[d.iso] = row;
        continue;
      }
      await page.waitForTimeout(2700);
      const newResponses = result.responses.slice(before);
      const relevant = newResponses.filter((r) => r.postData.includes(d.full) || r.postData.includes(encodeURIComponent(d.full)) || r.body);
      const slotText = await page.locator('#availableslots').innerText().catch(() => '');
      const slotHtml = await page.locator('#availableslots').innerHTML().catch(() => '');
      row.slotText = norm(slotText);
      row.network = newResponses.map((r) => ({ status: r.status, postData: r.postData, times: extractTimes(r.body), bodyPreview: r.body.slice(0, 1200) }));
      row.times = extractTimes(`${slotText}\n${slotHtml}\n${relevant.map((r) => r.body).join('\n')}`);
      row.available = row.times.length > 0;
      if (!row.available) row.reason = 'No slots returned after selecting date';
    } catch (error) {
      row.error = String(error);
      await page.keyboard.press('Escape').catch(() => {});
    }
    result.days[d.iso] = row;
  }

  try { await page.screenshot({ path: path.join(OUT, `${target.key}.png`), fullPage: true, timeout: 30000 }); } catch {}
  await fs.writeFile(path.join(OUT, `${target.key}.json`), JSON.stringify(result, null, 2));
  await context.close();
  return result;
}

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'] });
const results = [];
for (const target of targets) {
  try { results.push(await auditTarget(browser, target)); }
  catch (error) { results.push({ name: target.name, fatal: String(error) }); }
}
await browser.close();
await fs.writeFile(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.map((r) => ({ name: r.name, error: r.error || r.fatal || null, days: r.days && Object.fromEntries(Object.entries(r.days).map(([date, v]) => [date, { times: v.times, reason: v.reason, error: v.error }])) })), null, 2));
