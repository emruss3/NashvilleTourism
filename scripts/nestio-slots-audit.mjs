import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const targets = [
  { name: 'Emblem Park', url: 'https://emblemparknashville.com/schedule-a-tour/' },
  { name: 'Westerly House', url: 'https://livewesterlyhouse.com/schedule-a-tour/' },
  { name: 'Queens Wedgewood Houston', url: 'https://queensweho.com/schedule-a-tour/' },
  { name: 'Standard Assembly', url: 'https://thestandardassembly.com/schedule-a-tour/' }
];
const dates = [4,5,6,7,8,9,10];
const output = 'tour-audit-nestio-slots-output';
await fs.mkdir(output, { recursive: true });
const clean = (v, n = 400000) => String(v ?? '').replace(/\u0000/g, '').slice(0, n);

async function waitForNestio(page) {
  for (let i = 0; i < 60; i++) {
    const frame = page.frames().find(f => /integrations\.nestio\.com\/contact-widget/i.test(f.url()));
    if (frame) return frame;
    await page.waitForTimeout(250);
  }
  return null;
}

async function discoverOptions(browser, target) {
  const context = await browser.newContext({ timezoneId: 'America/Chicago', locale: 'en-US', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 70000 });
    await page.waitForTimeout(7500);
    const frame = await waitForNestio(page);
    if (!frame) throw new Error('Nestio frame not found');
    await frame.locator('[role="button"][aria-labelledby="aria-label-select-menu-1"]').click({ timeout: 8000 });
    await page.waitForTimeout(500);
    return await frame.evaluate(() => Array.from(document.querySelectorAll('[role="option"]')).filter(el => el.getClientRects().length).map(el => ({ id: el.id, text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() })));
  } finally {
    await context.close();
  }
}

async function inspectOption(browser, target, option) {
  const context = await browser.newContext({ timezoneId: 'America/Chicago', locale: 'en-US', viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const record = { option, dates: [], requests: [], responses: [], errors: [] };
  page.on('request', req => {
    if (/available-times|appointment|availability/i.test(req.url())) record.requests.push({ method: req.method(), url: req.url(), postData: clean(req.postData(), 10000) });
  });
  page.on('response', async res => {
    if (/available-times|appointment|availability/i.test(res.url())) {
      let body = '';
      try { body = clean(await res.text()); } catch (error) { body = String(error); }
      record.responses.push({ status: res.status(), url: res.url(), contentType: res.headers()['content-type'] || '', body });
    }
  });
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 70000 });
    await page.waitForTimeout(7500);
    const frame = await waitForNestio(page);
    if (!frame) throw new Error('Nestio frame not found');
    await frame.locator('[role="button"][aria-labelledby="aria-label-select-menu-1"]').click({ timeout: 8000 });
    await page.waitForTimeout(350);
    const selected = await frame.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      for (const type of ['pointerdown','mousedown','mouseup','click']) el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      return true;
    }, option.id);
    record.selected = selected;
    await page.waitForTimeout(2000);

    for (const day of dates) {
      const dayRecord = { date: `2026-09-${String(day).padStart(2,'0')}` };
      record.dates.push(dayRecord);
      try {
        const dateInput = frame.locator('input[placeholder="Select date"]').first();
        await dateInput.click({ timeout: 5000 });
        await page.waitForTimeout(350);
        const dayEl = frame.locator(`.react-datepicker__day[aria-label="day-${day}"]`).filter({ hasNot: frame.locator('.react-datepicker__day--outside-month') }).first();
        dayRecord.className = await dayEl.getAttribute('class');
        if (/disabled/.test(dayRecord.className || '')) {
          dayRecord.disabled = true;
          await page.keyboard.press('Escape').catch(() => {});
          continue;
        }
        const responseCountBefore = record.responses.length;
        await dayEl.click({ timeout: 5000 });
        await page.waitForTimeout(2200);
        dayRecord.responses = record.responses.slice(responseCountBefore);
        dayRecord.bodyText = clean(await frame.locator('body').innerText(), 50000);
        dayRecord.dateValue = await dateInput.inputValue().catch(() => '');

        const timeButtons = frame.locator('[role="button"][aria-labelledby*="select-menu"]');
        const count = await timeButtons.count();
        dayRecord.selectButtons = [];
        for (let i=0;i<count;i++) dayRecord.selectButtons.push({ index:i, text:clean(await timeButtons.nth(i).innerText().catch(() => ''),500), ariaLabelledBy:await timeButtons.nth(i).getAttribute('aria-labelledby'), disabled:await timeButtons.nth(i).isDisabled().catch(() => false) });
        const timeButton = count >= 2 ? timeButtons.nth(count-1) : frame.locator('input[placeholder="Select time"]').first();
        const enabled = await timeButton.isEnabled().catch(() => false);
        dayRecord.timeControlEnabled = enabled;
        if (enabled) {
          await timeButton.click({ timeout: 5000 });
          await page.waitForTimeout(450);
          dayRecord.timeOptions = await frame.evaluate(() => Array.from(document.querySelectorAll('[role="option"]')).filter(el => el.getClientRects().length).map(el => ({ id: el.id, text: (el.innerText || el.textContent || '').replace(/\s+/g,' ').trim(), disabled: el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled') })));
          await page.keyboard.press('Escape').catch(() => {});
        } else {
          dayRecord.timeOptions = [];
        }
      } catch (error) {
        dayRecord.error = String(error);
        record.errors.push({ date: dayRecord.date, error: String(error) });
        await page.keyboard.press('Escape').catch(() => {});
      }
    }
  } catch (error) {
    record.error = String(error);
  } finally {
    await context.close();
  }
  return record;
}

const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled','--no-sandbox'] });
const results = [];
for (const target of targets) {
  console.log('DISCOVER', target.name);
  const options = await discoverOptions(browser, target);
  const row = { target, options, modes: [] };
  for (const option of options) {
    console.log('INSPECT', target.name, option.text);
    row.modes.push(await inspectOption(browser, target, option));
  }
  results.push(row);
}
await browser.close();
await fs.writeFile(`${output}/nestio-slots.json`, JSON.stringify({ generatedAt:new Date().toISOString(), auditWindow:{start:'2026-09-04',end:'2026-09-10',timezone:'America/Chicago'}, results }, null, 2));
console.log('COMPLETE');
