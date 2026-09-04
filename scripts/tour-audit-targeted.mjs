import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const targets = [
  { name: 'Emblem Park', url: 'https://emblemparknashville.com/schedule-a-tour/', mode: 'nestio' },
  { name: 'Westerly House', url: 'https://livewesterlyhouse.com/schedule-a-tour/', mode: 'nestio' },
  { name: 'Queens Wedgewood Houston', url: 'https://queensweho.com/schedule-a-tour/', mode: 'nestio' },
  { name: 'Standard Assembly', url: 'https://thestandardassembly.com/schedule-a-tour/', mode: 'nestio' },
  { name: 'Residences at The Finery', url: 'https://my.hy.ly/tours/livethefinery/site?dd=0&popup=1', mode: 'generic' },
  { name: 'Memoir Wedgewood Houston', url: 'https://www.memoir-wedgewoodhouston.com/scheduletour', mode: 'generic' },
  { name: 'Memoir May Hosiery', url: 'https://www.memoir-mayhosiery.com/scheduletour', mode: 'generic' },
  { name: 'Memoir Wedgewood RentCafe', url: 'https://www.rentcafe.com/apartments/tn/nashville/memoir-wedgewood-houston/default.aspx', mode: 'generic' }
];

const OUT = 'tour-audit-targeted-output';
await fs.mkdir(OUT, { recursive: true });
const auditRe = /(tour|schedul|appointment|availab|calendar|time|slot|nestio|hy\.ly|hyly|rentcafe|yardi|securecafe|knock|doorway|prospectportal|guestcard)/i;
const clean = (v, n = 100000) => String(v ?? '').replace(/\u0000/g, '').slice(0, n);
const safeName = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function closeObstructions(page) {
  const labels = [
    /^accept$/i, /^accept all$/i, /^dismiss$/i, /^allow all$/i,
    /^close$/i, /^no thanks$/i, /^not now$/i, /close popup/i,
    /close modal/i, /close dialog/i, /continue without accepting/i
  ];
  for (let pass = 0; pass < 4; pass++) {
    let clicked = false;
    for (const frame of page.frames()) {
      for (const rx of labels) {
        const locs = [
          frame.getByRole('button', { name: rx }),
          frame.getByRole('link', { name: rx }),
          frame.locator('[aria-label]').filter({ hasText: rx })
        ];
        for (const loc of locs) {
          const count = Math.min(await loc.count().catch(() => 0), 3);
          for (let i = 0; i < count; i++) {
            try {
              const el = loc.nth(i);
              if (await el.isVisible({ timeout: 200 })) {
                await el.click({ timeout: 1500 });
                await page.waitForTimeout(350);
                clicked = true;
              }
            } catch {}
          }
        }
      }
      const css = ['.pum-close', '.modal-close', '.popup-close', '[data-dismiss="modal"]', '#onetrust-accept-btn-handler', '#hy-toursite-close'];
      for (const sel of css) {
        try {
          const el = frame.locator(sel).first();
          if (await el.isVisible({ timeout: 150 })) {
            await el.click({ timeout: 1200 });
            await page.waitForTimeout(300);
            clicked = true;
          }
        } catch {}
      }
    }
    if (!clicked) break;
  }
}

async function snapshotPage(page, label) {
  const frames = [];
  for (const frame of page.frames()) {
    try {
      frames.push(await frame.evaluate((label) => {
        const c = (v, n = 1000) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
        const controls = [];
        for (const el of document.querySelectorAll('a,button,input,select,textarea,[role="button"],[role="option"],[role="radio"],[role="tab"],[aria-label]')) {
          if (controls.length >= 700) break;
          const attrs = {};
          for (const a of el.attributes || []) {
            if (/^(data-|aria-|href$|src$|name$|value$|type$|title$|id$|class$|placeholder$)/i.test(a.name)) attrs[a.name] = c(a.value, 700);
          }
          controls.push({
            tag: el.tagName.toLowerCase(),
            text: c(el.innerText || el.textContent || el.value, 1200),
            visible: Boolean(el.getClientRects().length),
            disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
            attrs
          });
        }
        return {
          label,
          url: location.href,
          title: document.title,
          text: (document.body?.innerText || '').slice(0, 140000),
          html: (document.documentElement?.outerHTML || '').slice(0, 220000),
          controls
        };
      }, label));
    } catch (error) {
      frames.push({ label, url: frame.url(), error: String(error) });
    }
  }
  return { label, at: new Date().toISOString(), pageUrl: page.url(), title: await page.title().catch(() => ''), frames };
}

async function getNestioFrame(page) {
  for (let i = 0; i < 30; i++) {
    const f = page.frames().find(fr => /integrations\.nestio\.com\/contact-widget/i.test(fr.url()));
    if (f) return f;
    await page.waitForTimeout(500);
  }
  return null;
}

async function probeNestio(page, result) {
  const frame = await getNestioFrame(page);
  if (!frame) {
    result.nestio = { error: 'Nestio frame not found', frameUrls: page.frames().map(f => f.url()) };
    return;
  }
  const nestio = { frameUrl: frame.url(), dropdownTextAfterOpen: '', optionCandidates: [], tours: [] };
  result.nestio = nestio;
  const selector = '[role="button"][aria-labelledby="aria-label-select-menu-1"]';
  try {
    await frame.locator(selector).click({ timeout: 8000 });
    await page.waitForTimeout(700);
    nestio.dropdownTextAfterOpen = clean(await frame.locator('body').innerText(), 25000);
    nestio.optionCandidates = await frame.evaluate(() => Array.from(document.querySelectorAll('[role="option"], [id^="select-menu-1"], [class*="SelectOption"], [class*="Option__option"]')).filter(el => el.getClientRects().length).map(el => ({ text: (el.innerText || el.textContent || '').trim(), role: el.getAttribute('role'), id: el.id, className: el.className })).filter(x => x.text));
  } catch (error) {
    nestio.openError = String(error);
  }

  let optionTexts = [...new Set(nestio.optionCandidates.map(x => x.text).filter(Boolean))];
  if (!optionTexts.length) {
    optionTexts = nestio.dropdownTextAfterOpen.split(/\n+/).map(s => s.trim()).filter(s => /tour|video|guided|person/i.test(s) && !/preferred|select/i.test(s)).slice(0, 8);
  }

  for (const optionText of optionTexts) {
    const tour = { optionText, snapshots: [] };
    nestio.tours.push(tour);
    try {
      if (!(await frame.locator('[role="option"]', { hasText: optionText }).first().isVisible().catch(() => false))) {
        await frame.locator(selector).click({ timeout: 5000 });
        await page.waitForTimeout(350);
      }
      let option = frame.getByRole('option', { name: optionText, exact: true }).first();
      if (!(await option.count())) option = frame.locator('[role="option"], [class*="SelectOption"], [id^="select-menu-1"]').filter({ hasText: optionText }).first();
      await option.click({ timeout: 6000 });
      await page.waitForTimeout(3000);
      tour.selectedBodyText = clean(await frame.locator('body').innerText(), 40000);
      tour.hiddenValues = await frame.evaluate(() => Array.from(document.querySelectorAll('input[type="hidden"]')).map(x => ({ name: x.name, value: x.value })));
      tour.snapshots.push(await snapshotPage(page, `nestio-selected-${optionText}`));

      const dateInput = frame.locator('input[placeholder="Select date"]').first();
      if (await dateInput.isEnabled().catch(() => false)) {
        await dateInput.click({ timeout: 5000 });
        await page.waitForTimeout(800);
        tour.calendarText = clean(await frame.locator('body').innerText(), 45000);
        tour.calendarControls = await frame.evaluate(() => Array.from(document.querySelectorAll('button,[role="button"],[aria-label],td')).filter(el => el.getClientRects().length).map(el => ({ tag: el.tagName.toLowerCase(), text: (el.innerText || el.textContent || '').replace(/\s+/g,' ').trim(), aria: el.getAttribute('aria-label'), title: el.getAttribute('title'), disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'), className: String(el.className || '') })).filter(x => x.text || x.aria || x.title).slice(0, 500));
        await page.keyboard.press('Escape').catch(() => {});
      }
    } catch (error) {
      tour.error = String(error);
    }
  }
}

async function probeGeneric(page, result) {
  result.generic = { actions: [] };
  const actionRegexes = [
    /^guided tour$/i, /^in[- ]person tour$/i, /^self[- ]guided tour$/i,
    /^live video tour$/i, /^video tour$/i, /^virtual tour$/i,
    /select.*tour/i, /schedule.*tour/i, /book.*tour/i, /^next$/i, /^continue$/i
  ];
  for (const frame of page.frames()) {
    for (const rx of actionRegexes) {
      const choices = [frame.getByRole('button', { name: rx }), frame.getByRole('link', { name: rx }), frame.locator('[role="button"],[role="radio"],label,div').filter({ hasText: rx })];
      for (const loc of choices) {
        const count = Math.min(await loc.count().catch(() => 0), 4);
        for (let i = 0; i < count; i++) {
          const el = loc.nth(i);
          try {
            if (!(await el.isVisible({ timeout: 150 }))) continue;
            const text = clean(await el.innerText().catch(() => ''), 400);
            const action = { frame: frame.url(), text, regex: String(rx) };
            result.generic.actions.push(action);
            await el.click({ timeout: 2500 });
            await page.waitForTimeout(2500);
            action.afterText = clean(await frame.locator('body').innerText().catch(() => ''), 30000);
            action.snapshot = await snapshotPage(page, `generic-after-${text || String(rx)}`);
            if (result.generic.actions.length >= 12) return;
          } catch (error) {
            result.generic.actions.push({ frame: frame.url(), regex: String(rx), error: String(error).slice(0, 1000) });
          }
        }
      }
    }
  }
}

async function inspect(browser, target) {
  const context = await browser.newContext({
    timezoneId: 'America/Chicago',
    locale: 'en-US',
    viewport: { width: 1440, height: 1200 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    ignoreHTTPSErrors: true
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
    window.chrome = window.chrome || { runtime: {} };
  });
  context.setDefaultTimeout(8000);
  const page = await context.newPage();
  const result = { target, startedAt: new Date().toISOString(), network: [], jsonResponses: [], snapshots: [], errors: [] };
  page.on('pageerror', e => result.errors.push(clean(e, 4000)));
  page.on('request', req => {
    if (auditRe.test(req.url()) && result.network.length < 1200) result.network.push({ kind: 'request', method: req.method(), url: req.url(), resourceType: req.resourceType(), postData: clean(req.postData(), 30000) });
  });
  page.on('response', async res => {
    const url = res.url();
    const ct = res.headers()['content-type'] || '';
    if (auditRe.test(url) && result.network.length < 1200) result.network.push({ kind: 'response', status: res.status(), url, contentType: ct });
    if ((/json/i.test(ct) || auditRe.test(url)) && result.jsonResponses.length < 250) {
      try {
        const body = clean(await res.text(), 350000);
        if (/json/i.test(ct) || /available|appointment|schedule|tour|slot|calendar/i.test(body)) result.jsonResponses.push({ status: res.status(), url, contentType: ct, body });
      } catch {}
    }
  });
  try {
    const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 80000 });
    result.navigation = { status: response?.status() ?? null, finalUrl: page.url() };
    await page.waitForTimeout(13000);
    await closeObstructions(page);
    await page.waitForTimeout(2000);
    result.snapshots.push(await snapshotPage(page, 'initial'));
    if (target.mode === 'nestio') await probeNestio(page, result);
    else await probeGeneric(page, result);
    result.snapshots.push(await snapshotPage(page, 'final'));
    await page.screenshot({ path: path.join(OUT, `${safeName(target.name)}.png`), fullPage: true, timeout: 30000 }).catch(() => {});
  } catch (error) {
    result.error = String(error);
    result.snapshots.push(await snapshotPage(page, 'error').catch(() => ({ label: 'error', pageUrl: page.url() })));
  }
  result.finishedAt = new Date().toISOString();
  await context.close();
  return result;
}

const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
const results = [];
for (const target of targets) {
  console.log(`TARGET_START ${target.name}`);
  const result = await inspect(browser, target);
  results.push(result);
  console.log(`TARGET_DONE ${target.name} ${result.navigation?.status ?? 'ERR'} ${result.navigation?.finalUrl ?? ''}`);
}
await browser.close();
const payload = { generatedAt: new Date().toISOString(), auditWindow: { start: '2026-09-04', end: '2026-09-10', timezone: 'America/Chicago' }, results };
await fs.writeFile(path.join(OUT, 'targeted.json'), JSON.stringify(payload, null, 2));
console.log('TARGETED_COMPLETE');
