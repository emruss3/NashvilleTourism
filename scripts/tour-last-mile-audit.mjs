import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const OUT = 'tour-last-mile-output';
const dates = [
  { iso: '2026-09-08', slash: '09/08/2026', day: 8 },
  { iso: '2026-09-09', slash: '09/09/2026', day: 9 },
  { iso: '2026-09-10', slash: '09/10/2026', day: 10 },
  { iso: '2026-09-11', slash: '09/11/2026', day: 11 },
  { iso: '2026-09-12', slash: '09/12/2026', day: 12 },
  { iso: '2026-09-13', slash: '09/13/2026', day: 13 },
  { iso: '2026-09-14', slash: '09/14/2026', day: 14 },
];

await fs.mkdir(OUT, { recursive: true });
const result = { capturedAt: new Date().toISOString(), luna: {}, memoirWedgewood: {}, memoirMay: {} };

function uniqueTimes(value) {
  const text = String(value || '');
  const matches = text.match(/\b(?:1[0-2]|0?[1-9]):[0-5]\d\s*(?:a\.?m\.?|p\.?m\.?)\b/gi) || [];
  return [...new Set(matches.map((x) => x.replace(/\./g, '').replace(/\s+/g, ' ').trim().toLowerCase()))];
}

function htmlTimeCandidates(value) {
  const text = String(value || '');
  const candidates = [];
  for (const pattern of [
    /data-(?:start|time|slot|value|hh-mm)=["']([^"']+)["']/gi,
    /value=["']((?:1[0-2]|0?[1-9]):[0-5]\d\s*(?:a\.?m\.?|p\.?m\.?))["']/gi,
  ]) {
    for (const m of text.matchAll(pattern)) candidates.push(m[1]);
  }
  return [...new Set([...uniqueTimes(text), ...candidates])];
}

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  locale: 'en-US',
  timezoneId: 'America/Chicago',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
});

async function dismiss(page) {
  for (const name of [/accept all/i, /accept cookies/i, /^accept$/i, /agree/i, /^close$/i]) {
    const candidate = page.getByRole('button', { name }).or(page.getByRole('link', { name })).first();
    try {
      if (await candidate.isVisible({ timeout: 250 })) {
        await candidate.click({ timeout: 2000 });
        await page.waitForTimeout(300);
        return;
      }
    } catch {}
  }
}

async function auditLunaType(typeName, key) {
  const record = { startUrl: 'https://lunanashvilleliving.com/schedule-a-tour/', typeName, dates: {}, entry: null, bookingProbe: null, error: null };
  const page = await context.newPage();
  try {
    const response = await page.goto(record.startUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    record.pageStatus = response?.status() ?? null;
    await page.waitForTimeout(9000);
    await dismiss(page);

    const exact = page.getByText(typeName, { exact: true }).first();
    const textCount = await exact.count();
    record.entry = { textCount };
    if (!textCount) throw new Error(`Tour type text not found: ${typeName}`);

    const attrs = await exact.evaluate((el) => {
      const clickable = el.closest('a,button,[role="button"],.tour-select__card,.tour-type-card,.card') || el.parentElement;
      return {
        tag: clickable?.tagName,
        href: clickable?.getAttribute('href'),
        onclick: clickable?.getAttribute('onclick'),
        className: clickable?.className,
        outerHTML: clickable?.outerHTML?.slice(0, 4000),
      };
    });
    record.entry.attrs = attrs;

    let clicked = false;
    for (const locator of [
      exact.locator('xpath=ancestor-or-self::a[1]'),
      exact.locator('xpath=ancestor-or-self::button[1]'),
      exact.locator('xpath=ancestor-or-self::*[contains(@class,"tour") or contains(@class,"card")][1]'),
      exact,
    ]) {
      try {
        if (await locator.count() && await locator.first().isVisible({ timeout: 300 })) {
          await locator.first().click({ timeout: 5000 });
          clicked = true;
          break;
        }
      } catch {}
    }
    record.entry.clicked = clicked;
    await page.waitForTimeout(8000);
    await page.screenshot({ path: `${OUT}/luna-${key}-after-entry.png`, fullPage: true }).catch(() => {});
    record.afterEntryUrl = page.url();
    record.afterEntryText = (await page.locator('body').innerText().catch(() => '')).slice(0, 12000);
    record.afterEntryFrames = page.frames().map((f) => f.url());

    let frame = page.frames().find(async () => false);
    const frames = page.frames();
    let schedulerFrame = page;
    for (const candidate of frames) {
      if (await candidate.locator('.mcal__card').count().catch(() => 0)) {
        schedulerFrame = candidate;
        break;
      }
    }
    await schedulerFrame.locator('.mcal__card').first().waitFor({ state: 'visible', timeout: 30000 });

    for (const date of dates) {
      const dayRecord = { available: false, times: [], error: null };
      try {
        let card = schedulerFrame.locator(`.mcal__card[data-date-key="2026-9-${date.day}"]`).first();
        if (!(await card.count())) {
          card = schedulerFrame.locator('.mcal__card').filter({ hasText: new RegExp(`\\b${date.day}\\b`) }).first();
        }
        if (!(await card.count()) || !(await card.isVisible({ timeout: 700 }))) {
          dayRecord.error = 'No visible date card';
        } else {
          const cls = await card.getAttribute('class');
          dayRecord.className = cls;
          await card.click({ timeout: 5000 });
          await page.waitForTimeout(1800);
          dayRecord.times = await schedulerFrame.locator('#timeList .tour-select__time-btn:visible, .tour-select__time-btn:visible, [data-start]:visible')
            .evaluateAll((els) => els.map((el) => ({
              text: (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' '),
              start: el.getAttribute('data-start'),
              end: el.getAttribute('data-end'),
              disabled: el.hasAttribute('disabled') || el.classList.contains('disabled'),
            })).filter((x) => !x.disabled && (x.text || x.start)));
          dayRecord.available = dayRecord.times.length > 0;
          await page.screenshot({ path: `${OUT}/luna-${key}-${date.iso}.png`, fullPage: true }).catch(() => {});
        }
      } catch (error) {
        dayRecord.error = String(error);
      }
      record.dates[date.iso] = dayRecord;
    }

    const first = dates.find((d) => record.dates[d.iso]?.times?.length);
    if (first) {
      let card = schedulerFrame.locator(`.mcal__card[data-date-key="2026-9-${first.day}"]`).first();
      if (!(await card.count())) card = schedulerFrame.locator('.mcal__card').filter({ hasText: new RegExp(`\\b${first.day}\\b`) }).first();
      await card.click().catch(() => {});
      await page.waitForTimeout(1000);
      const time = schedulerFrame.locator('#timeList .tour-select__time-btn:visible, .tour-select__time-btn:visible, [data-start]:visible').first();
      if (await time.count()) {
        await time.click().catch(() => {});
        await schedulerFrame.locator('#timeListNextBtn, button:has-text("Next")').first().click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(800);
        record.bookingProbe = {
          text: (await schedulerFrame.locator('body').innerText().catch(() => '')).slice(0, 12000),
          buttons: await schedulerFrame.locator('button:visible, input[type="submit"]:visible').evaluateAll((els) => els.map((e) => (e.innerText || e.value || '').trim()).filter(Boolean)),
        };
      }
    }
  } catch (error) {
    record.error = String(error);
    record.finalUrl = page.url();
    record.bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 12000);
    await page.screenshot({ path: `${OUT}/luna-${key}-error.png`, fullPage: true }).catch(() => {});
  }
  await page.close().catch(() => {});
  result.luna[key] = record;
}

await auditLunaType('Guided Tours', 'guided');
await auditLunaType('Live Video Tours', 'liveVideo');

async function auditWedgewood() {
  const page = await context.newPage();
  const record = { startUrl: 'https://www.memoir-wedgewoodhouston.com/scheduletour', dates: {}, error: null };
  try {
    const response = await page.goto(record.startUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    record.pageStatus = response?.status() ?? null;
    await page.waitForTimeout(9000);
    record.title = await page.title();
    record.finalUrl = page.url();
    record.dateInputs = await page.locator('input.selecteddate').evaluateAll((els) => els.map((e) => e.value));
    record.tokenPresent = Boolean(await page.locator('#scheduletour-request-verification-token').count());

    for (const date of dates) {
      const dayRecord = { available: false, times: [], responseStatus: null, responseText: null, domText: null, error: null };
      try {
        const hidden = page.locator(`input.selecteddate[value="${date.slash}"]`).first();
        if (!(await hidden.count())) {
          dayRecord.error = 'Date disabled/not represented as selectable input';
        } else {
          const parent = hidden.locator('xpath=..');
          const label = parent.locator('label').first();
          const radio = parent.locator('input[type="radio"]').first();
          const responsePromise = page.waitForResponse((r) => r.url().includes('GetAvailableSlots'), { timeout: 12000 }).catch(() => null);
          if (await label.count()) await label.click({ timeout: 5000 });
          else if (await radio.count()) await radio.check({ timeout: 5000 });
          const slotResponse = await responsePromise;
          if (slotResponse) {
            dayRecord.responseStatus = slotResponse.status();
            dayRecord.responseText = (await slotResponse.text().catch(() => '')).slice(0, 200000);
          } else {
            const fallback = await page.evaluate(async ({ slash }) => {
              const token = document.getElementById('scheduletour-request-verification-token')?.value || '';
              const response = await fetch('/scheduletour?handler=GetAvailableSlots', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'RequestVerificationToken': token,
                  'Cache-Control': 'no-cache, no-store, max-age=0',
                },
                body: `dtSchedule=${encodeURIComponent(slash)}&tourType=0&isFromQRCode=false`,
              });
              return { status: response.status, text: await response.text() };
            }, { slash: date.slash });
            dayRecord.responseStatus = fallback.status;
            dayRecord.responseText = fallback.text.slice(0, 200000);
          }
          await page.waitForTimeout(1600);
          dayRecord.domText = await page.locator('#availableslots').innerText().catch(() => '');
          dayRecord.domHtml = (await page.locator('#availableslots').innerHTML().catch(() => '')).slice(0, 200000);
          dayRecord.times = htmlTimeCandidates(`${dayRecord.domText}\n${dayRecord.domHtml}\n${dayRecord.responseText}`);
          dayRecord.available = dayRecord.times.length > 0;
          await page.screenshot({ path: `${OUT}/memoir-wedgewood-${date.iso}.png`, fullPage: true }).catch(() => {});
        }
      } catch (error) {
        dayRecord.error = String(error);
      }
      record.dates[date.iso] = dayRecord;
      await page.waitForTimeout(500);
    }
  } catch (error) {
    record.error = String(error);
    record.title = await page.title().catch(() => '');
    record.bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 12000);
  }
  await page.close().catch(() => {});
  return record;
}

async function auditMay() {
  const page = await context.newPage();
  const record = { startUrl: 'https://www.memoir-mayhosiery.com/scheduletour', dates: {}, error: null };
  try {
    const response = await page.goto(record.startUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    record.pageStatus = response?.status() ?? null;
    await page.waitForTimeout(9000);
    record.title = await page.title();
    record.finalUrl = page.url();
    record.propertyId = await page.locator('#txtmyPropertyId').inputValue().catch(() => null);
    record.initialSelectedDate = await page.locator('#altField').inputValue().catch(() => null);

    for (const date of dates) {
      const dayRecord = { available: false, times: [], responseStatus: null, responseText: null, domText: null, error: null };
      try {
        const disabled = await page.locator('#calendar td.ui-datepicker-unselectable').filter({ hasText: String(date.day) }).count();
        dayRecord.disabledCalendarCellCount = disabled;
        if (disabled && date.day === 13) {
          dayRecord.error = 'Date disabled in visible calendar';
        } else {
          const responsePromise = page.waitForResponse((r) => r.url().includes('DoTimeSlots'), { timeout: 12000 }).catch(() => null);
          const ran = await page.evaluate((slash) => {
            if (typeof window.selectdate === 'function') {
              window.selectdate(slash);
              return true;
            }
            return false;
          }, date.slash);
          dayRecord.selectdateRan = ran;
          let slotResponse = await responsePromise;
          if (slotResponse) {
            dayRecord.responseStatus = slotResponse.status();
            dayRecord.responseText = (await slotResponse.text().catch(() => '')).slice(0, 200000);
          } else {
            const fallback = await page.evaluate(async ({ slash }) => {
              const propertyId = document.getElementById('txtmyPropertyId')?.value || '2240943';
              const url = `/rcLoadContent.ashx?contentclass=ScheduleTour&method=DoTimeSlots&myPropertyId=${encodeURIComponent(propertyId)}&txtApptDate=${encodeURIComponent(slash)}`;
              const response = await fetch(url, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
              return { status: response.status, text: await response.text() };
            }, { slash: date.slash });
            dayRecord.responseStatus = fallback.status;
            dayRecord.responseText = fallback.text.slice(0, 200000);
          }
          await page.waitForTimeout(1600);
          dayRecord.domText = await page.locator('#accordion-tourTimes').innerText().catch(() => '');
          dayRecord.domHtml = (await page.locator('#accordion-tourTimes').innerHTML().catch(() => '')).slice(0, 200000);
          dayRecord.times = htmlTimeCandidates(`${dayRecord.domText}\n${dayRecord.domHtml}\n${dayRecord.responseText}`);
          dayRecord.available = dayRecord.times.length > 0;
          await page.screenshot({ path: `${OUT}/memoir-may-${date.iso}.png`, fullPage: true }).catch(() => {});
        }
      } catch (error) {
        dayRecord.error = String(error);
      }
      record.dates[date.iso] = dayRecord;
      await page.waitForTimeout(500);
    }
  } catch (error) {
    record.error = String(error);
    record.title = await page.title().catch(() => '');
    record.bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 12000);
  }
  await page.close().catch(() => {});
  return record;
}

result.memoirWedgewood = await auditWedgewood();
result.memoirMay = await auditMay();

await browser.close();
await fs.writeFile(`${OUT}/results.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
