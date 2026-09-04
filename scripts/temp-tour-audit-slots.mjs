import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('slot-audit-output');
await fs.mkdir(OUT, { recursive: true });

const targets = [
  ['Emblem Park', 'https://emblemparknashville.com/schedule-a-tour/'],
  ['Westerly House', 'https://livewesterlyhouse.com/schedule-a-tour/'],
  ['445 Park Commons', 'https://445parkcommons.com/schedule-a-tour/'],
  ['Residences at The Finery', 'https://livethefinery.com/'],
  ['Memoir Wedgewood Houston', 'https://memoirresidential.com/properties/wedgewoodhouston'],
  ['Memoir May Hosiery', 'https://memoirresidential.com/properties/may-hosiery'],
  ['Standard Assembly', 'https://thestandardassembly.com/schedule-a-tour/'],
  ['Queens Wedgewood Houston', 'https://queensweho.com/'],
  ['Luna', 'https://lunanashvilleliving.com/'],
  ['Delux WeHo', 'https://deluxweho.com/'],
  ['CODA', 'https://thecodanashville.com/schedule-a-tour/'],
].map(([name, url]) => ({ name, url }));

const dates = [
  { iso: '2026-09-04', day: 4, dow: 'Fri', longDow: 'Friday', mon: 'Sep', longMon: 'September' },
  { iso: '2026-09-05', day: 5, dow: 'Sat', longDow: 'Saturday', mon: 'Sep', longMon: 'September' },
  { iso: '2026-09-06', day: 6, dow: 'Sun', longDow: 'Sunday', mon: 'Sep', longMon: 'September' },
  { iso: '2026-09-07', day: 7, dow: 'Mon', longDow: 'Monday', mon: 'Sep', longMon: 'September' },
  { iso: '2026-09-08', day: 8, dow: 'Tue', longDow: 'Tuesday', mon: 'Sep', longMon: 'September' },
  { iso: '2026-09-09', day: 9, dow: 'Wed', longDow: 'Wednesday', mon: 'Sep', longMon: 'September' },
  { iso: '2026-09-10', day: 10, dow: 'Thu', longDow: 'Thursday', mon: 'Sep', longMon: 'September' },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clip = (s, n = 150000) => typeof s === 'string' && s.length > n ? `${s.slice(0, n)}\n...[clipped]` : s;
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
const timeRe = /\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi;

async function allFrames(context) {
  return context.pages().flatMap((page) => page.frames().map((frame) => ({ page, frame })));
}

async function textAcross(context) {
  const chunks = [];
  for (const { frame } of await allFrames(context)) {
    try { chunks.push(await frame.locator('body').innerText({ timeout: 2500 })); } catch {}
  }
  return chunks.join('\n\n');
}

async function controlsAcross(context, schedulerOnly = false) {
  const out = [];
  for (const { page, frame } of await allFrames(context)) {
    let frameText = '';
    try { frameText = await frame.locator('body').innerText({ timeout: 1500 }); } catch {}
    if (schedulerOnly && !/tour|schedule|appointment|select a date|choose a time|calendar|availability/i.test(frameText)) continue;
    const loc = frame.locator('button,a,[role="button"],input,select,option,[data-date],[datetime]');
    let count = 0;
    try { count = Math.min(await loc.count(), 700); } catch {}
    for (let i = 0; i < count; i++) {
      const el = loc.nth(i);
      let visible = false;
      try { visible = await el.isVisible({ timeout: 150 }); } catch {}
      if (!visible) continue;
      let meta = {};
      try {
        meta = await el.evaluate((n) => ({
          tag: n.tagName,
          text: (n.innerText || n.textContent || '').trim(),
          aria: n.getAttribute('aria-label') || '',
          title: n.getAttribute('title') || '',
          href: n.href || n.getAttribute('href') || '',
          value: n.value || n.getAttribute('value') || '',
          dataDate: n.getAttribute('data-date') || n.getAttribute('data-day') || n.getAttribute('data-value') || '',
          datetime: n.getAttribute('datetime') || '',
          disabled: !!n.disabled || n.getAttribute('aria-disabled') === 'true' || n.classList.contains('disabled'),
          type: n.getAttribute('type') || '',
          name: n.getAttribute('name') || '',
          placeholder: n.getAttribute('placeholder') || '',
        }));
      } catch { continue; }
      const label = norm([meta.text, meta.aria, meta.title, meta.value, meta.dataDate, meta.datetime].filter(Boolean).join(' | '));
      out.push({ page, frame, el, frameText, label, ...meta });
    }
  }
  return out;
}

async function dismiss(context) {
  for (const { page, frame } of await allFrames(context)) {
    for (const re of [/accept all/i, /^accept$/i, /^agree$/i, /allow all/i, /got it/i]) {
      try {
        const b = frame.getByRole('button', { name: re }).first();
        if (await b.isVisible({ timeout: 200 })) { await b.click({ timeout: 1500 }); await page.waitForTimeout(250); break; }
      } catch {}
    }
  }
}

function entryScore(c) {
  const s = `${c.label} ${c.href}`.toLowerCase();
  if (/submit|confirm|reserve|apply|resident login|send message|contact us|finalize/.test(s)) return -100;
  if (/schedule\s*(a|your)?\s*tour/.test(s)) return 100;
  if (/book\s*(a|your)?\s*tour/.test(s)) return 98;
  if (/tour\s*now/.test(s)) return 95;
  if (/schedule/.test(s) && /tour/.test(s)) return 90;
  if (/book/.test(s) && /tour/.test(s)) return 88;
  if (/agent[- ]guided|guided\s*tour|in[- ]person\s*tour/.test(s)) return 78;
  if (/self[- ]guided\s*tour/.test(s)) return 76;
  if (/live\s*video\s*tour|virtual\s*tour/.test(s)) return 72;
  if (/get started|start/.test(s) && /tour|schedule/.test(s)) return 50;
  return -1;
}

async function clickIntoScheduler(context, actionLog) {
  const used = new Set();
  for (let step = 0; step < 7; step++) {
    await dismiss(context);
    const allText = await textAcross(context);
    if (/we don['’]t have any tour times open|no (available )?tour times|no appointments available/i.test(allText)) {
      actionLog.push({ step, stop: 'explicit-no-times' });
      return;
    }
    const controls = await controlsAcross(context);
    const hasDateish = controls.some((c) => matchAnyDate(c).score >= 70);
    const hasTimes = controls.some((c) => timeTokens(c.label).length > 0);
    if (hasDateish || hasTimes || /select a date|choose a time/i.test(allText)) {
      actionLog.push({ step, stop: 'scheduler-visible', hasDateish, hasTimes });
      return;
    }
    const candidates = controls
      .map((c) => ({ ...c, score: entryScore(c) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);
    let clicked = false;
    for (const c of candidates) {
      const key = `${c.frame.url()}|${c.label}|${c.href}`;
      if (used.has(key)) continue;
      used.add(key);
      try {
        await c.el.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {});
        await c.el.click({ timeout: 4000 });
        actionLog.push({ step, click: c.label, href: c.href, score: c.score, frame: c.frame.url() });
        await c.page.waitForTimeout(4500);
        clicked = true;
        break;
      } catch {}
    }
    if (!clicked) {
      actionLog.push({ step, stop: 'no-entry-control' });
      return;
    }
  }
}

function dateScore(label, d) {
  const s = norm(label).toLowerCase();
  let score = 0;
  if (s.includes(d.iso)) score = Math.max(score, 100);
  if (new RegExp(`\\b0?9[\\/.-]0?${d.day}[\\/.-]2026\\b`).test(s)) score = Math.max(score, 100);
  if (new RegExp(`\\b2026[\\/.-]0?9[\\/.-]0?${d.day}\\b`).test(s)) score = Math.max(score, 100);
  if (s.includes(`${d.longMon.toLowerCase()} ${d.day}`)) score = Math.max(score, 95);
  if (s.includes(`${d.mon.toLowerCase()} ${d.day}`)) score = Math.max(score, 90);
  if (s.includes(`${d.longDow.toLowerCase()}, ${d.longMon.toLowerCase()} ${d.day}`)) score = Math.max(score, 100);
  if (s.includes(`${d.longDow.toLowerCase()} ${d.day}`)) score = Math.max(score, 85);
  if (new RegExp(`\\b${d.dow.toLowerCase()}\\s+0?${d.day}\\b`).test(s)) score = Math.max(score, 82);
  if (new RegExp(`\\b${d.longDow.toLowerCase()}\\b`).test(s) && new RegExp(`\\b${d.day}\\b`).test(s)) score = Math.max(score, 78);
  if (/september\s+2026|sep\s+2026/.test(s) && new RegExp(`(^|\\D)${d.day}(\\D|$)`).test(s)) score = Math.max(score, 72);
  return score;
}

function matchAnyDate(control) {
  let best = { score: -1, date: null };
  for (const d of dates) {
    const score = dateScore(control.label, d);
    if (score > best.score) best = { score, date: d };
  }
  return best;
}

function timeTokens(label) {
  const matches = [...norm(label).matchAll(timeRe)].map((m) => m[0].toUpperCase().replace(/\./g, '').replace(/\s+/g, ' '));
  return [...new Set(matches)];
}

async function findDateControls(context, d) {
  const controls = await controlsAcross(context, true);
  return controls
    .map((c) => ({ ...c, score: dateScore(c.label, d) }))
    .filter((c) => c.score >= 70 && !c.disabled)
    .sort((a, b) => b.score - a.score);
}

async function collectTimes(context) {
  const controls = await controlsAcross(context, true);
  const items = [];
  for (const c of controls) {
    if (c.disabled) continue;
    const tokens = timeTokens(c.label);
    if (!tokens.length) continue;
    const pureish = c.label.length < 90 || /time|slot|appointment/i.test(c.label);
    if (!pureish) continue;
    for (const t of tokens) items.push({ time: t, label: c.label, frame: c.frame.url() });
  }
  const seen = new Set();
  return items.filter((x) => !seen.has(x.time) && seen.add(x.time));
}

async function discoverTourTypes(context) {
  const controls = await controlsAcross(context, true);
  const types = new Map();
  for (const c of controls) {
    const s = c.label.toLowerCase();
    let type = null;
    if (/self[- ]guided/.test(s)) type = 'Self-guided';
    else if (/live\s*video/.test(s)) type = 'Live video';
    else if (/virtual\s*tour/.test(s)) type = 'Virtual';
    else if (/in[- ]person/.test(s)) type = 'In-person';
    else if (/guided\s*tour|agent[- ]guided/.test(s)) type = 'Guided';
    if (type && !types.has(type)) types.set(type, c);
  }
  const body = await textAcross(context);
  if (/self[- ]guided/i.test(body) && !types.has('Self-guided')) types.set('Self-guided', null);
  if (/live\s*video\s*tour/i.test(body) && !types.has('Live video')) types.set('Live video', null);
  if (/guided\s*tour/i.test(body) && !types.has('Guided')) types.set('Guided', null);
  return [...types.entries()].map(([type, control]) => ({ type, control }));
}

async function auditCurrentCalendar(context, stateLog) {
  const byDate = {};
  for (const d of dates) {
    let candidates = await findDateControls(context, d);
    if (!candidates.length) {
      // Some schedulers show only part of a horizontal date strip. Advance once and rescan.
      const controls = await controlsAcross(context, true);
      const next = controls.find((c) => !c.disabled && /next( week| dates?| month)?|chevron-right|arrow-right/i.test(c.label));
      if (next) {
        try { await next.el.click({ timeout: 2500 }); await next.page.waitForTimeout(1000); } catch {}
        candidates = await findDateControls(context, d);
      }
    }
    if (!candidates.length) {
      byDate[d.iso] = { available: false, reason: 'no-enabled-date-control', times: [] };
      continue;
    }
    const c = candidates[0];
    try {
      await c.el.click({ timeout: 3500 });
      await c.page.waitForTimeout(1400);
      const times = await collectTimes(context);
      byDate[d.iso] = {
        available: times.length > 0,
        dateControl: c.label,
        times: times.map((x) => x.time),
        rawTimeControls: times,
      };
      stateLog.push({ date: d.iso, dateControl: c.label, times: times.map((x) => x.time) });
    } catch (error) {
      byDate[d.iso] = { available: false, reason: `click-error: ${String(error)}`, times: [] };
    }
  }
  return byDate;
}

async function inspectFinalStep(context, calendar) {
  const firstDate = dates.find((d) => calendar[d.iso]?.times?.length);
  if (!firstDate) return { inspected: false };
  const dateControls = await findDateControls(context, firstDate);
  if (dateControls.length) {
    try { await dateControls[0].el.click({ timeout: 2500 }); await dateControls[0].page.waitForTimeout(700); } catch {}
  }
  const timeControls = await controlsAcross(context, true);
  const targetTime = calendar[firstDate.iso].times[0];
  const timeControl = timeControls.find((c) => !c.disabled && timeTokens(c.label).includes(targetTime));
  if (!timeControl) return { inspected: false, reason: 'time control not found' };
  try { await timeControl.el.click({ timeout: 2500 }); await timeControl.page.waitForTimeout(700); } catch (error) { return { inspected: false, reason: String(error) }; }

  let buttons = (await controlsAcross(context, true)).filter((c) => ['BUTTON', 'A', 'INPUT'].includes(c.tag)).map((c) => c.label).filter(Boolean);
  const next = (await controlsAcross(context, true)).find((c) => !c.disabled && /^(next|continue)$/i.test(norm(c.text || c.aria || c.value)));
  if (next) {
    try { await next.el.click({ timeout: 2500 }); await next.page.waitForTimeout(900); } catch {}
    buttons = (await controlsAcross(context, true)).filter((c) => ['BUTTON', 'A', 'INPUT'].includes(c.tag)).map((c) => c.label).filter(Boolean);
  }
  const body = await textAcross(context);
  return { inspected: true, firstDate: firstDate.iso, firstTime: targetTime, buttons: buttons.slice(0, 100), bodyTail: clip(body.slice(-25000), 25000) };
}

async function auditOne(browser, target) {
  const dir = path.join(OUT, slug(target.name));
  await fs.mkdir(dir, { recursive: true });
  const context = await browser.newContext({
    timezoneId: 'America/Chicago', locale: 'en-US', viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  });
  await context.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => undefined }));

  const network = [];
  const responses = [];
  context.on('page', (p) => {
    p.on('request', (r) => { if (['xhr', 'fetch', 'document'].includes(r.resourceType())) network.push({ method: r.method(), type: r.resourceType(), url: r.url(), postData: clip(r.postData() || '', 30000) }); });
    p.on('response', async (r) => {
      if (!['xhr', 'fetch'].includes(r.request().resourceType())) return;
      const entry = { status: r.status(), url: r.url(), type: r.request().resourceType(), contentType: (await r.allHeaders().catch(() => ({})))['content-type'] || '' };
      if (responses.length < 250) {
        try { entry.body = clip(await r.text(), 300000); } catch {}
      }
      responses.push(entry);
    });
  });

  const page = await context.newPage();
  const actions = [];
  let navigationError = null;
  try { await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 65000 }); await page.waitForTimeout(6500); } catch (e) { navigationError = String(e); }
  await clickIntoScheduler(context, actions);
  await dismiss(context);

  const initialText = await textAcross(context);
  const types = await discoverTourTypes(context);
  const stateLog = [];
  const calendars = {};

  const selectableTypes = types.filter((x) => x.control);
  if (selectableTypes.length) {
    for (const item of selectableTypes) {
      try { await item.control.el.click({ timeout: 3000 }); await item.control.page.waitForTimeout(1400); } catch {}
      calendars[item.type] = await auditCurrentCalendar(context, stateLog);
    }
  } else {
    calendars.Default = await auditCurrentCalendar(context, stateLog);
  }

  const primaryCalendar = Object.values(calendars)[0] || {};
  const finalStep = await inspectFinalStep(context, primaryCalendar);
  const finalText = await textAcross(context);
  const finalControls = (await controlsAcross(context, true)).map((c) => ({ label: c.label, tag: c.tag, href: c.href, disabled: c.disabled, frame: c.frame.url() })).slice(0, 1000);

  try { await context.pages()[0].screenshot({ path: path.join(dir, 'final.png'), fullPage: true, timeout: 25000 }); } catch {}
  await fs.writeFile(path.join(dir, 'network.json'), JSON.stringify(network, null, 2));
  await fs.writeFile(path.join(dir, 'responses.json'), JSON.stringify(responses, null, 2));
  await fs.writeFile(path.join(dir, 'final-controls.json'), JSON.stringify(finalControls, null, 2));
  await fs.writeFile(path.join(dir, 'initial-text.txt'), initialText);
  await fs.writeFile(path.join(dir, 'final-text.txt'), finalText);

  const result = {
    name: target.name,
    requestedUrl: target.url,
    finalUrls: context.pages().map((p) => p.url()),
    frameUrls: [...new Set((await allFrames(context)).map(({ frame }) => frame.url()))],
    navigationError,
    actions,
    explicitNoTimes: /we don['’]t have any tour times open|no (available )?tour times|no appointments available/i.test(initialText + '\n' + finalText),
    contactOnly: /contact|send us a message|get in touch/i.test(finalText) && !/select a date|choose a time/i.test(finalText),
    tourTypes: types.map((x) => x.type),
    calendars,
    finalStep,
    stateLog,
    textExcerpt: clip(finalText, 50000),
  };
  await fs.writeFile(path.join(dir, 'result.json'), JSON.stringify(result, null, 2));
  await context.close();
  return result;
}

const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--no-sandbox'] });
const results = [];
let cursor = 0;
async function worker() {
  while (true) {
    const i = cursor++;
    if (i >= targets.length) return;
    try { results[i] = await auditOne(browser, targets[i]); }
    catch (error) { results[i] = { name: targets[i].name, requestedUrl: targets[i].url, fatalError: String(error) }; }
  }
}
await Promise.all([worker(), worker(), worker()]);
await browser.close();
await fs.writeFile(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
