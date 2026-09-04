import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('resolved-audit-output');
await fs.mkdir(OUT, { recursive: true });

const dates = [
  { iso: '2026-09-04', day: 4, dow: 'Fri' },
  { iso: '2026-09-05', day: 5, dow: 'Sat' },
  { iso: '2026-09-06', day: 6, dow: 'Sun' },
  { iso: '2026-09-07', day: 7, dow: 'Mon' },
  { iso: '2026-09-08', day: 8, dow: 'Tue' },
  { iso: '2026-09-09', day: 9, dow: 'Wed' },
  { iso: '2026-09-10', day: 10, dow: 'Thu' },
];

const timeRe = /\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi;
const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
const uniq = xs => [...new Set(xs)];
const timesIn = s => uniq([...String(s || '').matchAll(timeRe)].map(m => m[0].toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ')));
const clip = (s, n = 400000) => typeof s === 'string' && s.length > n ? `${s.slice(0, n)}\n...[clipped]` : s;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function newContext(browser) {
  const c = await browser.newContext({
    timezoneId: 'America/Chicago', locale: 'en-US', viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  });
  await c.addInitScript(() => { try { delete Object.getPrototypeOf(navigator).webdriver; } catch {} });
  return c;
}
async function goto(page, url, wait = 6500) {
  let error = null;
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 75000 }); await page.waitForTimeout(wait); } catch (e) { error = String(e); }
  return error;
}
async function body(frame) { try { return await frame.locator('body').innerText({ timeout: 3000 }); } catch { return ''; } }
async function save(name, d) { await fs.writeFile(path.join(OUT, `${slug(name)}.json`), JSON.stringify(d, null, 2)); }

async function visibleMeta(frame, selector = 'button,a,input,[role="button"],[role="option"],li,div') {
  const out = []; const loc = frame.locator(selector); const n = Math.min(await loc.count().catch(() => 0), 1200);
  for (let i = 0; i < n; i++) {
    const el = loc.nth(i); if (!(await el.isVisible({ timeout: 80 }).catch(() => false))) continue;
    try { out.push(await el.evaluate(n => ({
      tag: n.tagName, text: (n.innerText || n.textContent || '').trim(), aria: n.getAttribute('aria-label') || '',
      role: n.getAttribute('role') || '', cls: typeof n.className === 'string' ? n.className.slice(0, 500) : '',
      disabled: !!n.disabled || n.getAttribute('aria-disabled') === 'true' || n.classList.contains('disabled'),
      value: n.value || n.getAttribute('value') || '', id: n.id || '', name: n.getAttribute('name') || '',
      placeholder: n.getAttribute('placeholder') || '', href: n.href || n.getAttribute('href') || '',
    }))); } catch {}
  }
  return out;
}

function watch(context, r) {
  r.network = [];
  context.on('page', p => {
    p.on('request', req => {
      if (['xhr', 'fetch'].includes(req.resourceType())) r.network.push({ phase: 'request', method: req.method(), url: req.url(), postData: clip(req.postData() || '', 50000) });
    });
    p.on('response', async resp => {
      const req = resp.request(); if (!['xhr', 'fetch'].includes(req.resourceType())) return;
      const u = resp.url(); if (!/tour|appointment|avail|slot|calendar|nestio|rentcafe|schedule|hy\.ly/i.test(u)) return;
      const e = { phase: 'response', method: req.method(), status: resp.status(), url: u };
      try { e.body = clip(await resp.text(), 600000); } catch (err) { e.error = String(err); }
      r.network.push(e);
    });
  });
}

async function findFunnelFrame(page) {
  for (let i = 0; i < 60; i++) {
    const f = page.frames().find(x => x.url().includes('integrations.nestio.com/contact-widget'));
    if (f) return f;
    await page.waitForTimeout(250);
  }
  return null;
}

async function chooseFunnelType(frame, type) {
  const control = frame.locator('.pam__SelectValue__value').filter({ hasText: /Select tour type|Guided|Video/i }).first();
  await control.click({ timeout: 6000 }); await frame.page().waitForTimeout(350);
  const all = frame.locator('[role="option"], .pam__SelectOption, [class*="SelectOption"]');
  const n = await all.count().catch(() => 0);
  const labels = [];
  let target = null;
  const re = type === 'guided' ? /agent.?guided|guided tour/i : /live.?video|video tour/i;
  for (let i = 0; i < n; i++) {
    const el = all.nth(i); if (!(await el.isVisible().catch(() => false))) continue;
    const t = norm(await el.innerText().catch(() => '')); labels.push(t);
    if (!target && re.test(t)) target = el;
  }
  if (!target) {
    const candidates = frame.locator('div,li,button').filter({ hasText: re });
    const count = Math.min(await candidates.count().catch(() => 0), 30);
    for (let i = count - 1; i >= 0; i--) {
      const el = candidates.nth(i); if (await el.isVisible().catch(() => false)) { target = el; break; }
    }
  }
  if (!target) throw new Error(`No ${type} option; visible options=${labels.join('|')}`);
  await target.click({ timeout: 6000 }); await frame.page().waitForTimeout(800);
  return labels;
}

async function selectFunnelDate(frame, d) {
  const input = frame.locator('input[placeholder="Select date"], input[placeholder*="date" i]').first();
  await input.click({ timeout: 6000 }); await frame.page().waitForTimeout(300);
  const days = frame.locator('.react-datepicker__day');
  const n = await days.count().catch(() => 0);
  const seen = []; let target = null;
  for (let i = 0; i < n; i++) {
    const el = days.nth(i);
    const m = await el.evaluate(n => ({ text: (n.textContent || '').trim(), aria: n.getAttribute('aria-label') || '', cls: n.className, ariaDisabled: n.getAttribute('aria-disabled') || '' }));
    seen.push(m);
    const aria = m.aria.toLowerCase();
    if (!target && ((aria.includes('september') && aria.includes(String(d.day)) && aria.includes('2026')) || (m.text === String(d.day) && !/outside-month/i.test(m.cls)))) target = { el, ...m };
  }
  if (!target) { await frame.page().keyboard.press('Escape').catch(() => {}); return { found: false, seen }; }
  const disabled = /disabled|unselectable/i.test(target.cls) || target.ariaDisabled === 'true';
  if (disabled) { await frame.page().keyboard.press('Escape').catch(() => {}); return { found: true, disabled: true, meta: target, seen }; }
  await target.el.click({ timeout: 6000 }); await frame.page().waitForTimeout(700);
  return { found: true, disabled: false, meta: { text: target.text, aria: target.aria, cls: target.cls } };
}

async function getFunnelTimes(frame) {
  const controls = frame.locator('.pam__SelectValue__value');
  const n = await controls.count().catch(() => 0); let timeControl = null;
  for (let i = 0; i < n; i++) {
    const el = controls.nth(i); const t = norm(await el.innerText().catch(() => '')); const cls = await el.getAttribute('class') || '';
    if (/Select time|\b(?:AM|PM)\b/i.test(t)) { if (/disabled/i.test(cls)) return { times: [], reason: 'time selector disabled', controlText: t, cls }; timeControl = el; break; }
  }
  if (!timeControl) return { times: [], reason: 'time selector missing' };
  await timeControl.click({ timeout: 6000 }); await frame.page().waitForTimeout(350);
  const opts = await visibleMeta(frame, '[role="option"], .pam__SelectOption, [class*="SelectOption"], li');
  const times = uniq(opts.flatMap(x => timesIn(`${x.text} ${x.aria} ${x.value}`)));
  await frame.page().keyboard.press('Escape').catch(() => {});
  return { times, optionMeta: opts };
}

async function funnelAudit(browser, cfg) {
  const result = { name: cfg.name, provider: 'Funnel/Nestio', url: cfg.url, tourTypes: cfg.types.map(x => x === 'guided' ? 'Agent Guided Tour' : 'Live Video Tour'), calendars: {} };
  const context = await newContext(browser); watch(context, result); const page = await context.newPage();
  result.navigationError = await goto(page, cfg.url, 8000);
  let frame = await findFunnelFrame(page);
  if (!frame) { result.error = 'Funnel iframe not found'; await save(cfg.name, result); await context.close(); return result; }
  result.frameUrl = frame.url(); result.initialBody = clip(await body(frame), 40000); result.initialMeta = await visibleMeta(frame);
  for (const type of cfg.types) {
    const label = type === 'guided' ? 'Agent Guided Tour' : 'Live Video Tour'; result.calendars[label] = {};
    try { result.calendars[label]._menuLabels = await chooseFunnelType(frame, type); }
    catch (e) { result.calendars[label]._error = String(e); continue; }
    for (const d of dates) {
      try {
        const dateState = await selectFunnelDate(frame, d);
        if (!dateState.found || dateState.disabled) { result.calendars[label][d.iso] = { available: false, times: [], dateState }; continue; }
        const tr = await getFunnelTimes(frame);
        result.calendars[label][d.iso] = { available: tr.times.length > 0, ...tr, dateState };
      } catch (e) { result.calendars[label][d.iso] = { available: false, times: [], error: String(e) }; }
    }
    // Reset widget for a second tour type.
    if (type !== cfg.types.at(-1)) {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 75000 }).catch(() => {}); await page.waitForTimeout(7000); frame = await findFunnelFrame(page);
    }
  }
  // Inspect the next step without submitting.
  try {
    const firstType = Object.keys(result.calendars)[0]; const firstDate = dates.find(d => result.calendars[firstType][d.iso]?.times?.length);
    if (firstDate) {
      if (cfg.types.length > 1) { await page.reload({ waitUntil: 'domcontentloaded', timeout: 75000 }); await page.waitForTimeout(6500); frame = await findFunnelFrame(page); }
      await chooseFunnelType(frame, 'guided'); await selectFunnelDate(frame, firstDate); const tr = await getFunnelTimes(frame);
      const timeControl = frame.locator('.pam__SelectValue__value').filter({ hasText: /Select time|AM|PM/i }).last(); await timeControl.click(); await page.waitForTimeout(250);
      const option = frame.locator('[role="option"], .pam__SelectOption, [class*="SelectOption"]').filter({ hasText: tr.times[0] }).first();
      if (await option.count()) await option.click(); await page.waitForTimeout(300);
      const continueBtn = frame.getByRole('button', { name: /^Continue$/i }).first(); if (await continueBtn.count()) await continueBtn.click(); await page.waitForTimeout(700);
      result.nextStepBody = clip(await body(frame), 30000); result.nextStepMeta = await visibleMeta(frame, 'button,a,input,select,textarea,[role="button"]');
    }
  } catch (e) { result.nextStepError = String(e); }
  try { await page.screenshot({ path: path.join(OUT, `${slug(cfg.name)}.png`), fullPage: true, timeout: 30000 }); } catch {}
  await save(cfg.name, result); await context.close(); return result;
}

async function mayAudit(browser) {
  const name = 'Memoir May Hosiery'; const result = { name, provider: 'RentCafe/Yardi', url: 'https://www.memoir-mayhosiery.com/scheduletour', tourTypes: ['Guided Tour'], calendar: {} };
  const context = await newContext(browser); watch(context, result); const page = await context.newPage(); result.navigationError = await goto(page, result.url, 7000);
  try { const b = page.getByRole('button', { name: /Accept All Cookies|Accept/i }).first(); if (await b.isVisible({ timeout: 500 })) await b.click({ timeout: 3000 }); } catch {}
  await page.evaluate(() => document.querySelectorAll('#onetrust-banner-sdk,.onetrust-pc-dark-filter').forEach(n => n.remove())).catch(() => {});
  result.initialBody = clip(await body(page.mainFrame()), 50000);
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i]; const row = { available: false, times: [] };
    try {
      const radio = page.locator(`#radiodate${i + 1}`); row.disabled = await radio.isDisabled().catch(() => false);
      if (row.disabled) { row.reason = 'date disabled'; result.calendar[d.iso] = row; continue; }
      const startNetwork = result.network.length;
      await radio.check({ force: true, timeout: 5000 }).catch(async () => {
        await page.evaluate(id => { const el = document.getElementById(id); if (el) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); el.click(); } }, `radiodate${i + 1}`);
      });
      await page.waitForTimeout(1800);
      const slot = page.locator('#availableslots');
      row.slotText = norm(await slot.innerText().catch(() => ''));
      row.slotHtml = clip(await slot.innerHTML().catch(() => ''), 120000);
      row.times = timesIn(`${row.slotText}\n${row.slotHtml}`);
      row.available = row.times.length > 0;
      row.newNetwork = result.network.slice(startNetwork).filter(x => /GetAvailableSlots|available/i.test(x.url));
      if (!row.available && row.newNetwork.length) row.times = uniq(row.newNetwork.flatMap(x => timesIn(x.body || ''))), row.available = row.times.length > 0;
      if (!row.available) row.reason = 'no slots returned';
    } catch (e) { row.error = String(e); }
    result.calendar[d.iso] = row;
  }
  result.finalBody = clip(await body(page.mainFrame()), 50000); result.finalMeta = await visibleMeta(page.mainFrame(), 'button,a,input,select,textarea,[role="button"]');
  try { await page.screenshot({ path: path.join(OUT, 'memoir-may-hosiery.png'), fullPage: true, timeout: 30000 }); } catch {}
  await save(name, result); await context.close(); return result;
}

async function fineryAudit(browser) {
  const name = 'Residences at The Finery'; const result = { name, provider: 'Hyly.AI', url: 'https://my.hy.ly/tours/livethefinery/site?dd=0&popup=1', tourTypes: ['In-person Tour'], calendar: {} };
  const context = await newContext(browser); watch(context, result); const page = await context.newPage(); result.navigationError = await goto(page, result.url, 5000);
  try { const b = page.getByRole('button', { name: /^Dismiss$/i }).first(); if (await b.isVisible({ timeout: 300 })) await b.click(); } catch {}
  try { await page.locator('a,button').filter({ hasText: /^IN-PERSON TOUR$/i }).last().click({ timeout: 6000 }); await page.waitForTimeout(2000); } catch (e) { result.typeClickError = String(e); }
  let frame = null;
  for (let i = 0; i < 40; i++) { frame = page.frames().find(f => /\/tours\/schedules\//.test(f.url())); if (frame) break; await page.waitForTimeout(250); }
  if (!frame) { result.error = 'Hyly schedule frame not found'; await save(name, result); await context.close(); return result; }
  result.frameUrl = frame.url(); result.initialBody = clip(await body(frame), 50000); result.initialMeta = await visibleMeta(frame, 'td,a,button,input,[role="button"]');
  for (const d of dates) {
    const row = { available: false, times: [] };
    try {
      const cells = frame.locator('td.day'); const n = await cells.count(); let target = null; row.cells = [];
      for (let i = 0; i < n; i++) {
        const el = cells.nth(i); const m = await el.evaluate(n => ({ text: (n.textContent || '').trim(), cls: n.className, title: n.getAttribute('title') || '', dataDate: n.getAttribute('data-date') || '' })); row.cells.push(m);
        if (!target && m.text === String(d.day) && !/old|new|disabled/i.test(m.cls)) target = { el, ...m };
      }
      if (!target) { row.reason = 'date unavailable/disabled'; result.calendar[d.iso] = row; continue; }
      row.dateControl = { text: target.text, cls: target.cls, title: target.title, dataDate: target.dataDate };
      await target.el.click({ timeout: 5000 }); await page.waitForTimeout(800);
      const links = frame.locator('a'); const ln = Math.min(await links.count(), 300); const labels = [];
      for (let i = 0; i < ln; i++) { const el = links.nth(i); if (!(await el.isVisible().catch(() => false))) continue; const t = norm(await el.innerText().catch(() => '')); if (timesIn(t).length && t.length < 30) labels.push(t); }
      row.times = uniq(labels.flatMap(timesIn)); row.available = row.times.length > 0; row.rawLabels = labels;
      if (!row.available) row.reason = 'no time links';
    } catch (e) { row.error = String(e); }
    result.calendar[d.iso] = row;
  }
  result.finalBody = clip(await body(frame), 50000); result.finalMeta = await visibleMeta(frame, 'button,a,input,select,textarea,[role="button"]');
  try { await page.screenshot({ path: path.join(OUT, 'residences-at-the-finery.png'), fullPage: true, timeout: 30000 }); } catch {}
  await save(name, result); await context.close(); return result;
}

const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--no-sandbox'] });
const results = [];
for (const cfg of [
  { name: 'Emblem Park', url: 'https://emblemparknashville.com/schedule-a-tour/', types: ['guided'] },
  { name: 'Westerly House', url: 'https://livewesterlyhouse.com/schedule-a-tour/', types: ['guided', 'video'] },
  { name: 'Queens Wedgewood Houston', url: 'https://queensweho.com/schedule-a-tour/', types: ['guided', 'video'] },
  { name: 'Standard Assembly', url: 'https://thestandardassembly.com/schedule-a-tour/', types: ['guided', 'video'] },
]) { try { results.push(await funnelAudit(browser, cfg)); } catch (e) { results.push({ name: cfg.name, fatal: String(e) }); } }
try { results.push(await mayAudit(browser)); } catch (e) { results.push({ name: 'Memoir May Hosiery', fatal: String(e) }); }
try { results.push(await fineryAudit(browser)); } catch (e) { results.push({ name: 'Residences at The Finery', fatal: String(e) }); }
await browser.close();
await fs.writeFile(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.map(r => ({ name: r.name, error: r.error || r.fatal || r.navigationError || null })), null, 2));
