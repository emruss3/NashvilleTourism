import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const targets = [
  { name: 'Emblem Park', url: 'https://emblemparknashville.com/schedule-a-tour/' },
  { name: 'Westerly House', url: 'https://livewesterlyhouse.com/schedule-a-tour/' },
  { name: 'Queens Wedgewood Houston', url: 'https://queensweho.com/schedule-a-tour/' },
  { name: 'Standard Assembly', url: 'https://thestandardassembly.com/schedule-a-tour/' }
];
const output = 'tour-audit-nestio-output';
await fs.mkdir(output, { recursive: true });
const clean = (v, n = 250000) => String(v ?? '').replace(/\u0000/g, '').slice(0, n);

async function waitForNestio(page) {
  for (let i = 0; i < 50; i++) {
    const frame = page.frames().find(f => /integrations\.nestio\.com\/contact-widget/i.test(f.url()));
    if (frame) return frame;
    await page.waitForTimeout(300);
  }
  return null;
}

async function discoverOptions(browser, target) {
  const context = await browser.newContext({ timezoneId: 'America/Chicago', locale: 'en-US', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 70000 });
    await page.waitForTimeout(8000);
    const frame = await waitForNestio(page);
    if (!frame) return { error: 'Nestio frame not found', options: [] };
    await frame.locator('[role="button"][aria-labelledby="aria-label-select-menu-1"]').click({ timeout: 8000 });
    await page.waitForTimeout(700);
    const options = await frame.evaluate(() => Array.from(document.querySelectorAll('[role="option"]')).filter(el => el.getClientRects().length).map(el => ({ id: el.id, text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() })));
    return { options, frameUrl: frame.url() };
  } catch (error) {
    return { error: String(error), options: [] };
  } finally {
    await context.close();
  }
}

async function selectOption(browser, target, option) {
  const context = await browser.newContext({ timezoneId: 'America/Chicago', locale: 'en-US', viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const record = { option, responses: [], requests: [], snapshots: [] };
  page.on('request', req => {
    if (/appointments\/group\/\d+\/available-times/i.test(req.url())) record.requests.push({ method: req.method(), url: req.url(), headers: req.headers() });
  });
  page.on('response', async res => {
    if (/appointments\/group\/\d+\/available-times/i.test(res.url())) {
      let body = '';
      try { body = clean(await res.text()); } catch (error) { body = String(error); }
      record.responses.push({ status: res.status(), url: res.url(), contentType: res.headers()['content-type'] || '', body });
    }
  });
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 70000 });
    await page.waitForTimeout(8000);
    const frame = await waitForNestio(page);
    if (!frame) throw new Error('Nestio frame not found');
    await frame.locator('[role="button"][aria-labelledby="aria-label-select-menu-1"]').click({ timeout: 8000 });
    await page.waitForTimeout(500);
    const clicked = await frame.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      }
      return true;
    }, option.id);
    record.clicked = clicked;
    await page.waitForTimeout(7000);
    record.frameTextAfterSelection = clean(await frame.locator('body').innerText(), 50000);
    record.controlsAfterSelection = await frame.evaluate(() => Array.from(document.querySelectorAll('button,input,[role="button"],[role="option"],[aria-label]')).filter(el => el.getClientRects().length).map(el => ({ tag: el.tagName.toLowerCase(), text: (el.innerText || el.textContent || el.value || '').replace(/\s+/g,' ').trim(), id: el.id, aria: el.getAttribute('aria-label'), placeholder: el.getAttribute('placeholder'), disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true') })).slice(0, 400));
    const dateInput = frame.locator('input[placeholder="Select date"]').first();
    if (await dateInput.isEnabled().catch(() => false)) {
      await dateInput.click({ timeout: 5000 });
      await page.waitForTimeout(800);
      record.calendarText = clean(await frame.locator('body').innerText(), 50000);
      record.calendarControls = await frame.evaluate(() => Array.from(document.querySelectorAll('button,[role="button"],[aria-label],td')).filter(el => el.getClientRects().length).map(el => ({ tag: el.tagName.toLowerCase(), text: (el.innerText || el.textContent || '').replace(/\s+/g,' ').trim(), aria: el.getAttribute('aria-label'), title: el.getAttribute('title'), disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'), className: String(el.className || '') })).slice(0, 700));
    }
  } catch (error) {
    record.error = String(error);
  } finally {
    await context.close();
  }
  return record;
}

const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
const results = [];
for (const target of targets) {
  console.log('NESTIO_DISCOVER', target.name);
  const discovery = await discoverOptions(browser, target);
  const row = { target, discovery, selections: [] };
  for (const option of discovery.options || []) {
    console.log('NESTIO_SELECT', target.name, option.id, option.text);
    row.selections.push(await selectOption(browser, target, option));
  }
  results.push(row);
}
await browser.close();
await fs.writeFile(`${output}/nestio.json`, JSON.stringify({ generatedAt: new Date().toISOString(), auditWindow: { start: '2026-09-04', end: '2026-09-10', timezone: 'America/Chicago' }, results }, null, 2));
console.log('NESTIO_COMPLETE');
