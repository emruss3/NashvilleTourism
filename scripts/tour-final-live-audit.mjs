import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const OUT = 'tour-final-live-output';
const dates = [
  { iso: '2026-09-08', mmdd: '09/08/2026', day: 8, weekday: 'Tuesday' },
  { iso: '2026-09-09', mmdd: '09/09/2026', day: 9, weekday: 'Wednesday' },
  { iso: '2026-09-10', mmdd: '09/10/2026', day: 10, weekday: 'Thursday' },
  { iso: '2026-09-11', mmdd: '09/11/2026', day: 11, weekday: 'Friday' },
  { iso: '2026-09-12', mmdd: '09/12/2026', day: 12, weekday: 'Saturday' },
  { iso: '2026-09-13', mmdd: '09/13/2026', day: 13, weekday: 'Sunday' },
  { iso: '2026-09-14', mmdd: '09/14/2026', day: 14, weekday: 'Monday' },
];

const PUBLIC_FUNNEL_KEY = '03f5fe3982bf41a380739512238020a1';
const FUNNEL_GROUPS = [
  { name: 'Emblem Park', group: '10676' },
  { name: 'Westerly House', group: '8221' },
  { name: 'Queens Wedgewood Houston', group: '6311' },
  { name: 'Standard Assembly', group: '6708' },
];

const result = {
  capturedAt: new Date().toISOString(),
  timezone: 'America/Chicago',
  dates: dates.map((d) => d.iso),
  funnel: {},
  delux: {},
  luna: {},
  park445: {},
  finery: {},
  memoirWedgewood: {},
  memoirMay: {},
  coda: {},
};

await fs.mkdir(OUT, { recursive: true });

function uniqueTimes(text) {
  if (!text) return [];
  const matches = String(text).match(/\b(?:1[0-2]|0?[1-9]):[0-5]\d\s*(?:a\.?m\.?|p\.?m\.?)\b/gi) || [];
  const normalized = matches.map((value) => value.replace(/\./g, '').replace(/\s+/g, ' ').trim().toLowerCase());
  return [...new Set(normalized)];
}

function groupIsoTimes(values = []) {
  const grouped = Object.fromEntries(dates.map((d) => [d.iso, []]));
  for (const value of values) {
    const date = String(value).slice(0, 10);
    if (!(date in grouped)) continue;
    const parsed = new Date(value);
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed).toLowerCase();
    grouped[date].push({ iso: value, time: formatted });
  }
  return grouped;
}

async function fetchText(url, options = {}) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(options.timeout || 30000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        Accept: '*/*',
        ...(options.headers || {}),
      },
      ...options,
    });
    const text = await response.text();
    let body = text;
    try { body = JSON.parse(text); } catch {}
    return { status: response.status, finalUrl: response.url, body, text };
  } catch (error) {
    return { error: String(error) };
  }
}

const funnelAuth = `Basic ${Buffer.from(`${PUBLIC_FUNNEL_KEY}:undefined`).toString('base64')}`;
for (const property of FUNNEL_GROUPS) {
  const record = { group: property.group, config: null, availability: {} };
  record.config = await fetchText(`https://nestiolistings.com/api/v2/group/${property.group}/`, {
    headers: { Authorization: funnelAuth, Accept: 'application/json' },
  });
  const config = record.config.body && typeof record.config.body === 'object' ? record.config.body : {};
  const enabledTypes = [];
  if (config.guided_tours_enabled || config.appointments_in_person_enabled) enabledTypes.push('guided');
  if (config.video_tours_enabled || config.appointments_video_enabled) enabledTypes.push('video');
  if (config.self_guided_tours_enabled || config.appointments_self_guided_enabled) enabledTypes.push('self-guided');
  if (!enabledTypes.length && record.config.status === 200) enabledTypes.push('guided');

  for (const type of enabledTypes) {
    record.availability[type] = {};
    for (const date of dates) {
      const response = await fetchText(
        `https://nestiolistings.com/api/v2/appointments/group/${property.group}/available-times?from_date=${date.iso}&tour_type=${encodeURIComponent(type)}`,
        { headers: { Authorization: funnelAuth, Accept: 'application/json' } },
      );
      const body = response.body;
      let values = [];
      if (Array.isArray(body)) values = body;
      else if (body && Array.isArray(body.available_times)) values = body.available_times;
      else if (body && body.data && Array.isArray(body.data.available_times)) values = body.data.available_times;
      record.availability[type][date.iso] = { ...response, parsedValues: values };
    }
  }
  result.funnel[property.name] = record;
}

result.delux.settings = await fetchText('https://deluxweho.com/tour-scheduler-cache/tour-scheduler-cache-settings.json');
result.delux.slots = await fetchText('https://deluxweho.com/tour-scheduler-cache/tour-scheduler-cache.json');

for (const type of ['default', 'live_video', 'self_guided']) {
  const suffix = type === 'default' ? '' : `?tour_type=${encodeURIComponent(type)}`;
  const response = await fetchText(`https://doorway-api.knockrentals.com/v1/property/2032046/available-times${suffix}`,
    { headers: { Accept: 'application/json' } });
  const available = response.body?.available_times || {};
  result.park445[type] = {
    ...response,
    groupedAcceptableTimes: groupIsoTimes(available.acceptable_times || []),
    allowNonPreferredTimes: available.allow_non_preferred_times ?? null,
    preferredTimesInstantBook: available.preferred_times_instant_book ?? null,
  };
}
result.park445.property = await fetchText('https://doorway-api.knockrentals.com/v1/property/2032046', {
  headers: { Accept: 'application/json' },
});

for (const date of dates) {
  const slash = date.iso.replaceAll('-', '/');
  const params = new URLSearchParams({
    tpl_id: '1587156259900772678',
    date: slash,
    appointment_type: 'in_person',
  });
  const response = await fetchText(`https://schedule.tours/schedules/1769511060134303458/time_select?${params}`, {
    headers: {
      Accept: '*/*',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: 'https://schedule.tours/hines-development/livethefinery/schedule',
    },
  });
  result.finery[date.iso] = {
    ...response,
    dataTimes: [...String(response.text || '').matchAll(/data-hh-mm=["']([^"']+)["']/gi)].map((m) => m[1]),
    textTimes: uniqueTimes(response.text),
  };
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  locale: 'en-US',
  timezoneId: 'America/Chicago',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
});

async function dismissCommon(page) {
  for (const name of [/accept all/i, /accept cookies/i, /^accept$/i, /agree/i, /continue/i, /close/i]) {
    for (const role of ['button', 'link']) {
      const locator = page.getByRole(role, { name }).first();
      try {
        if (await locator.isVisible({ timeout: 250 })) {
          await locator.click({ timeout: 2000 });
          await page.waitForTimeout(300);
          return true;
        }
      } catch {}
    }
  }
  return false;
}

async function auditKairoi(name, urls) {
  const record = { attempts: [], dates: {}, tourTypes: [], bookingProbe: null };
  for (const url of urls) {
    const page = await context.newPage();
    const attempt = { startUrl: url, finalUrl: null, status: null, title: null, bodyPreview: null, error: null };
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      attempt.status = response?.status() ?? null;
      await page.waitForTimeout(12000);
      await dismissCommon(page);
      attempt.finalUrl = page.url();
      attempt.title = await page.title();
      attempt.bodyPreview = (await page.locator('body').innerText().catch(() => '')).slice(0, 3000);
      record.attempts.push(attempt);

      if (!(await page.locator('.mcal__card').count())) {
        for (const pattern of [/schedule a tour/i, /book a tour/i, /schedule tour/i]) {
          const cta = page.getByRole('link', { name: pattern }).or(page.getByRole('button', { name: pattern })).first();
          try {
            if (await cta.isVisible({ timeout: 500 })) {
              await cta.click({ timeout: 5000 });
              await page.waitForTimeout(10000);
              break;
            }
          } catch {}
        }
      }
      await page.locator('.mcal__card').first().waitFor({ state: 'visible', timeout: 30000 });

      record.tourTypes = await page.locator('.tour-select__card:visible, [data-tour-type]:visible, .tour-type-card:visible')
        .evaluateAll((els) => [...new Set(els.map((e) => (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ')).filter(Boolean))]);

      for (const date of dates) {
        const card = page.locator(`.mcal__card[data-date-key="2026-9-${date.day}"]`).first();
        const dayRecord = { available: false, times: [], error: null };
        try {
          if (!(await card.isVisible({ timeout: 1500 }))) {
            dayRecord.error = 'Date card not visible';
          } else {
            await card.click({ timeout: 5000 });
            await page.waitForTimeout(2200);
            dayRecord.times = await page.locator('#timeList .tour-select__time-btn:visible').evaluateAll((els) => els.map((el) => ({
              text: (el.innerText || '').trim().replace(/\s+/g, ' '),
              start: el.getAttribute('data-start'),
              end: el.getAttribute('data-end'),
              disabled: el.hasAttribute('disabled') || el.classList.contains('disabled'),
            })).filter((item) => !item.disabled));
            dayRecord.available = dayRecord.times.length > 0;
            dayRecord.chosenDate = await page.locator('#chosenDateLabel').innerText().catch(() => null);
            await page.screenshot({ path: `${OUT}/${name}-${date.iso}.png`, fullPage: true }).catch(() => {});
          }
        } catch (error) {
          dayRecord.error = String(error);
        }
        record.dates[date.iso] = dayRecord;
      }

      const firstDate = dates.find((d) => record.dates[d.iso]?.times?.length);
      if (firstDate) {
        const card = page.locator(`.mcal__card[data-date-key="2026-9-${firstDate.day}"]`).first();
        await card.click().catch(() => {});
        await page.waitForTimeout(1200);
        const firstTime = page.locator('#timeList .tour-select__time-btn:visible').first();
        if (await firstTime.count()) {
          await firstTime.click().catch(() => {});
          await page.locator('#timeListNextBtn').click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(1000);
          for (let i = 0; i < 2; i++) {
            const next = page.getByRole('button', { name: /^next$/i }).first();
            try {
              if (await next.isVisible({ timeout: 500 })) {
                await next.click({ timeout: 3000 });
                await page.waitForTimeout(800);
              }
            } catch {}
          }
          record.bookingProbe = {
            bodyPreview: (await page.locator('body').innerText().catch(() => '')).slice(0, 6000),
            buttons: await page.locator('button:visible, input[type="submit"]:visible').evaluateAll((els) => els.map((e) => ({
              text: (e.innerText || e.value || '').trim().replace(/\s+/g, ' '),
              type: e.getAttribute('type'),
              disabled: e.disabled,
            })).filter((x) => x.text)),
          };
        }
      }
      await page.close();
      return record;
    } catch (error) {
      attempt.error = String(error);
      attempt.finalUrl = page.url();
      attempt.title = await page.title().catch(() => '');
      attempt.bodyPreview = (await page.locator('body').innerText().catch(() => '')).slice(0, 3000);
      record.attempts.push(attempt);
      await page.screenshot({ path: `${OUT}/${name}-error-${record.attempts.length}.png`, fullPage: true }).catch(() => {});
      await page.close();
    }
  }
  return record;
}

result.delux.rendered = await auditKairoi('delux', ['https://deluxweho.com/schedule-a-tour/']);
result.luna.rendered = await auditKairoi('luna', [
  'https://lunanashvilleliving.com/schedule-a-tour/',
  'https://www.lunanashvilleliving.com/schedule-a-tour/',
]);

async function auditMemoirWedgewood() {
  const record = { startUrl: 'https://www.memoir-wedgewoodhouston.com/scheduletour', dates: {}, tourTypes: [], bookingText: null, errors: [] };
  for (const date of dates) {
    const page = await context.newPage();
    const dayRecord = { available: false, disabled: false, times: [], responseStatus: null, responseText: null, error: null };
    try {
      const response = await page.goto(record.startUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
      dayRecord.pageStatus = response?.status() ?? null;
      await page.waitForTimeout(9000);
      await dismissCommon(page);
      if (!record.tourTypes.length) {
        const body = await page.locator('body').innerText().catch(() => '');
        record.bookingText = body.match(/Scheduled tours are tentative[^\n.]*(?:[.\n]|$)/i)?.[0] || null;
        record.tourTypes = [...new Set((body.match(/Guided Tour|Live Video Tour|Self-Guided Tour/gi) || []).map((x) => x.trim()))];
      }

      const hidden = page.locator(`input.selecteddate[value="${date.mmdd}"]`).first();
      if (!(await hidden.count())) {
        dayRecord.disabled = true;
        dayRecord.error = 'Date shown but disabled/no selectable card';
      } else {
        const wrapper = hidden.locator('xpath=..');
        const label = wrapper.locator('label').first();
        const responsePromise = page.waitForResponse((r) => r.url().includes('GetAvailableSlots'), { timeout: 20000 }).catch(() => null);
        await label.click({ timeout: 5000 });
        const slotResponse = await responsePromise;
        if (slotResponse) {
          dayRecord.responseStatus = slotResponse.status();
          dayRecord.responseText = (await slotResponse.text().catch(() => '')).slice(0, 100000);
        }
        await page.waitForTimeout(2500);
        const containerText = await page.locator('#availableslots').innerText().catch(() => '');
        dayRecord.containerText = containerText;
        dayRecord.times = uniqueTimes(containerText || dayRecord.responseText);
        dayRecord.available = dayRecord.times.length > 0;
        await page.screenshot({ path: `${OUT}/memoir-wedgewood-${date.iso}.png`, fullPage: true }).catch(() => {});
      }
    } catch (error) {
      dayRecord.error = String(error);
      record.errors.push(`${date.iso}: ${String(error)}`);
    }
    record.dates[date.iso] = dayRecord;
    await page.close().catch(() => {});
  }
  return record;
}

async function auditMemoirMay() {
  const record = { startUrl: 'https://www.memoir-mayhosiery.com/scheduletour', dates: {}, tourTypes: ['Guided Tour'], bookingText: 'Scheduled tours are tentative until confirmed with LIVE Agent.', errors: [] };
  for (const date of dates) {
    const page = await context.newPage();
    const dayRecord = { available: false, disabled: false, times: [], responseStatus: null, responseText: null, error: null };
    try {
      const response = await page.goto(record.startUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
      dayRecord.pageStatus = response?.status() ?? null;
      await page.waitForTimeout(9000);
      await dismissCommon(page);
      const title = await page.title();
      const bodyPreview = (await page.locator('body').innerText().catch(() => '')).slice(0, 2000);
      dayRecord.finalUrl = page.url();
      dayRecord.title = title;
      dayRecord.bodyPreview = bodyPreview;
      if (/just a moment|security verification|access denied/i.test(`${title} ${bodyPreview}`)) {
        dayRecord.error = 'Security challenge blocked the scheduler';
      } else {
        const links = page.locator('#calendar td:not(.ui-datepicker-other-month):not(.ui-datepicker-unselectable) a');
        let target = null;
        const count = await links.count();
        for (let i = 0; i < count; i++) {
          const link = links.nth(i);
          const text = (await link.innerText().catch(() => '')).trim();
          if (text === String(date.day)) { target = link; break; }
        }
        if (!target) {
          dayRecord.disabled = true;
          dayRecord.error = 'Date shown but disabled/no selectable date link';
        } else {
          const responsePromise = page.waitForResponse((r) => r.url().includes('DoTimeSlots'), { timeout: 20000 }).catch(() => null);
          await target.click({ timeout: 5000 });
          const slotResponse = await responsePromise;
          if (slotResponse) {
            dayRecord.responseStatus = slotResponse.status();
            dayRecord.responseText = (await slotResponse.text().catch(() => '')).slice(0, 100000);
          }
          await page.waitForTimeout(2500);
          const containerText = await page.locator('#accordion-tourTimes').innerText().catch(() => '');
          dayRecord.containerText = containerText;
          dayRecord.times = uniqueTimes(containerText || dayRecord.responseText);
          dayRecord.available = dayRecord.times.length > 0;
          await page.screenshot({ path: `${OUT}/memoir-may-${date.iso}.png`, fullPage: true }).catch(() => {});
        }
      }
    } catch (error) {
      dayRecord.error = String(error);
      record.errors.push(`${date.iso}: ${String(error)}`);
    }
    record.dates[date.iso] = dayRecord;
    await page.close().catch(() => {});
  }
  return record;
}

result.memoirWedgewood = await auditMemoirWedgewood();
result.memoirMay = await auditMemoirMay();

{
  const page = await context.newPage();
  try {
    await page.goto('https://thecodanashville.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(7000);
    const cta = page.getByRole('link', { name: /schedule a tour/i }).or(page.getByRole('button', { name: /schedule a tour/i })).first();
    result.coda.homeCtaHref = await cta.getAttribute('href').catch(() => null);
    if (await cta.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cta.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(5000);
    }
    result.coda.finalUrl = page.url();
    result.coda.bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 8000);
    result.coda.calendarSignals = await page.locator('input[type="date"], [class*="calendar" i], [class*="timeslot" i], [class*="time-slot" i]').count();
    await page.screenshot({ path: `${OUT}/coda-final.png`, fullPage: true }).catch(() => {});
  } catch (error) {
    result.coda.error = String(error);
  }
  await page.close().catch(() => {});
}

await browser.close();
await fs.writeFile(`${OUT}/results.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  capturedAt: result.capturedAt,
  funnel: Object.fromEntries(Object.entries(result.funnel).map(([name, value]) => [name, { status: value.config.status, types: Object.keys(value.availability) }])),
  deluxRendered: result.delux.rendered,
  lunaRendered: result.luna.rendered,
  memoirWedgewood: result.memoirWedgewood,
  memoirMay: result.memoirMay,
  coda: result.coda,
}, null, 2));
