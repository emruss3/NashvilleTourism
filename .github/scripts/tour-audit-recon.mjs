import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.env.AUDIT_OUT || 'tour-audit-artifacts';
const TARGET_DATES = [
  { iso: '2026-09-08', label: 'Tue 9/8' },
  { iso: '2026-09-09', label: 'Wed 9/9' },
  { iso: '2026-09-10', label: 'Thu 9/10' },
  { iso: '2026-09-11', label: 'Fri 9/11' },
  { iso: '2026-09-12', label: 'Sat 9/12' },
  { iso: '2026-09-13', label: 'Sun 9/13' },
  { iso: '2026-09-14', label: 'Mon 9/14' }
];
const TARGETS = [
  { id: '01-emblem-park', name: 'Emblem Park', url: 'https://emblemparknashville.com/schedule-a-tour/' },
  { id: '02-westerly-house', name: 'Westerly House', url: 'https://livewesterlyhouse.com/schedule-a-tour/' },
  { id: '03-445-park-commons', name: '445 Park Commons', url: 'https://445parkcommons.com/schedule-a-tour/' },
  { id: '04-finery', name: 'Residences at The Finery', url: 'https://livethefinery.com/' },
  { id: '05-memoir-weho', name: 'Memoir Wedgewood Houston', url: 'https://memoirresidential.com/properties/wedgewoodhouston' },
  { id: '06-memoir-may-hosiery', name: 'Memoir May Hosiery', url: 'https://memoirresidential.com/properties/may-hosiery' },
  { id: '07-standard-assembly', name: 'Standard Assembly', url: 'https://www.greystar.com/standard-assembly-apartments-nashville-tn/p_19399' },
  { id: '08-queens-weho', name: 'Queens Wedgewood Houston', url: 'https://queensweho.com/' },
  { id: '09-luna', name: 'Luna', url: 'https://lunanashvilleliving.com/schedule-a-tour/' },
  { id: '10-delux-weho', name: 'Delux WeHo', url: 'https://deluxweho.com/schedule-a-tour/' },
  { id: '11-coda', name: 'CODA', url: 'https://thecodanashville.com/' }
];

const TOUR_CTA_RE = /schedule\s*(?:a\s*)?tour|book\s*(?:a\s*)?tour|tour\s*now|schedule\s*(?:an\s*)?appointment|book\s*(?:an\s*)?appointment|reserve\s*(?:a\s*)?tour/i;
const TYPE_RE = /guided|self[- ]guided|virtual|live video|video tour|in[- ]person|agent[- ]guided/i;
const COOKIE_RE = /accept all|accept cookies|allow all|agree|got it/i;
const FINAL_RE = /schedule your tour|confirm|submit|send|request a tour|book now|finish|complete/i;
const TIME_RE = /\b(?:0?[1-9]|1[0-2])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/ig;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = v => String(v ?? '').replace(/\u0000/g, '').replace(/\s+/g, ' ').trim();
const uniq = values => [...new Set(values.filter(Boolean))];
const safe = v => clean(v).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'item';
async function mkdirp(dir) { await fs.mkdir(dir, { recursive: true }); }
async function writeJson(file, value) { await mkdirp(path.dirname(file)); await fs.writeFile(file, JSON.stringify(value, null, 2)); }

function datePatterns(iso) {
  const d = new Date(`${iso}T12:00:00-05:00`);
  const month = d.toLocaleDateString('en-US', { month: 'long', timeZone: 'America/Chicago' });
  const mon = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'America/Chicago' });
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Chicago' });
  const day = d.getDate();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return [iso, `${mm}/${dd}/2026`, `${Number(mm)}/${day}/2026`, `${mm}/${dd}`, `${Number(mm)}/${day}`, `${month} ${day}`, `${mon} ${day}`, `${weekday}, ${month} ${day}`].map(x => x.toLowerCase());
}

async function allFrameText(page) {
  const blocks = [];
  for (const frame of page.frames()) {
    const text = clean(await frame.locator('body').innerText({ timeout: 3500 }).catch(() => ''));
    blocks.push({ url: frame.url(), text: text.slice(0, 80000) });
  }
  return blocks;
}

async function visibleControls(frame) {
  return frame.locator('a,button,[role="button"],input,select,option,label,[data-date],[data-time],[datetime],[aria-label]').evaluateAll((els) => els.slice(0, 1500).map(el => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const visible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    const attrs = {};
    for (const key of ['aria-label','title','href','value','name','id','data-date','data-time','datetime','role','type']) {
      const value = el.getAttribute(key);
      if (value) attrs[key] = value;
    }
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('value') || '').replace(/\s+/g, ' ').trim().slice(0, 400),
      attrs,
      visible,
      disabled: Boolean(el.disabled) || el.getAttribute('aria-disabled') === 'true',
      checked: Boolean(el.checked) || el.getAttribute('aria-selected') === 'true'
    };
  }).filter(x => x.visible)).catch(() => []);
}

async function collectState(page, label) {
  const frames = [];
  for (const frame of page.frames()) {
    frames.push({ url: frame.url(), text: clean(await frame.locator('body').innerText({ timeout: 3500 }).catch(() => '')).slice(0, 80000), controls: await visibleControls(frame) });
  }
  return { label, at: new Date().toISOString(), url: page.url(), title: await page.title().catch(() => ''), frames };
}

async function findAndClick(page, regex, { exclude = FINAL_RE, waitMs = 2500 } = {}) {
  const before = new Set(page.context().pages());
  for (const frame of page.frames()) {
    const loc = frame.locator('a,button,[role="button"],input[type="button"],input[type="submit"],label');
    const count = Math.min(await loc.count().catch(() => 0), 600);
    for (let i = 0; i < count; i++) {
      const el = loc.nth(i);
      if (!await el.isVisible().catch(() => false) || await el.isDisabled().catch(() => true)) continue;
      const text = clean((await el.innerText().catch(() => '')) || (await el.getAttribute('aria-label').catch(() => '')) || (await el.getAttribute('value').catch(() => '')));
      const href = clean(await el.getAttribute('href').catch(() => ''));
      if (!regex.test(`${text} ${href}`) || exclude.test(text)) continue;
      try {
        await el.click({ timeout: 6000 });
        await sleep(waitMs);
        const popup = page.context().pages().filter(p => !before.has(p)).at(-1);
        if (popup) {
          await popup.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
          await sleep(2000);
          return { clicked: true, text, href, page: popup };
        }
        return { clicked: true, text, href, page };
      } catch (e) {
        return { clicked: false, text, href, error: String(e), page };
      }
    }
  }
  return { clicked: false, page };
}

async function dismissCookies(page) {
  const r = await findAndClick(page, COOKIE_RE, { exclude: /manage|settings|preferences/i, waitMs: 600 });
  return r.page;
}

async function fillPlaceholderIfGated(page) {
  let filled = false;
  const values = {
    first: 'Tour', last: 'Audit', email: 'tour.audit@example.com', phone: '6155550100', name: 'Tour Audit'
  };
  for (const frame of page.frames()) {
    const inputs = frame.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
    const count = Math.min(await inputs.count().catch(() => 0), 80);
    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      if (!await el.isVisible().catch(() => false)) continue;
      const meta = clean([
        await el.getAttribute('name').catch(() => ''),
        await el.getAttribute('id').catch(() => ''),
        await el.getAttribute('placeholder').catch(() => ''),
        await el.getAttribute('aria-label').catch(() => ''),
        await el.getAttribute('autocomplete').catch(() => '')
      ].join(' ')).toLowerCase();
      let value = null;
      if (/first/.test(meta)) value = values.first;
      else if (/last/.test(meta)) value = values.last;
      else if (/e-?mail/.test(meta)) value = values.email;
      else if (/phone|mobile|tel/.test(meta)) value = values.phone;
      else if (/full.?name|your.?name|^name$/.test(meta)) value = values.name;
      if (value) {
        await el.fill(value).catch(() => {});
        filled = true;
      }
    }
  }
  if (!filled) return { filled: false, advanced: false };
  const advance = await findAndClick(page, /^(next|continue|show times|view times|see availability)$/i, { exclude: FINAL_RE, waitMs: 3000 });
  return { filled: true, advanced: advance.clicked, button: advance.text, page: advance.page };
}

function extractTimeStrings(text) {
  const found = clean(text).match(TIME_RE) || [];
  return uniq(found.map(t => t.toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ').replace(/^([1-9])\s/, '$1:00 ')));
}

async function clickableTimes(page) {
  const out = [];
  for (const frame of page.frames()) {
    const controls = await visibleControls(frame);
    for (const c of controls) {
      const combined = `${c.text} ${Object.values(c.attrs).join(' ')}`;
      const times = extractTimeStrings(combined);
      if (times.length && !c.disabled) out.push(...times);
    }
  }
  return uniq(out);
}

async function findDateControl(page, iso) {
  const patterns = datePatterns(iso);
  for (const frame of page.frames()) {
    const loc = frame.locator('button,a,[role="button"],[role="gridcell"],input,label,[data-date],[datetime]');
    const count = Math.min(await loc.count().catch(() => 0), 1000);
    for (let i = 0; i < count; i++) {
      const el = loc.nth(i);
      if (!await el.isVisible().catch(() => false) || await el.isDisabled().catch(() => true)) continue;
      const haystack = clean([
        await el.innerText().catch(() => ''),
        await el.getAttribute('aria-label').catch(() => ''),
        await el.getAttribute('title').catch(() => ''),
        await el.getAttribute('value').catch(() => ''),
        await el.getAttribute('data-date').catch(() => ''),
        await el.getAttribute('datetime').catch(() => '')
      ].join(' ')).toLowerCase();
      if (patterns.some(p => haystack.includes(p))) return { frame, el, haystack };
    }
  }
  return null;
}

async function enumerateDates(page, typeLabel) {
  const days = {};
  for (const d of TARGET_DATES) {
    const match = await findDateControl(page, d.iso);
    if (!match) {
      days[d.iso] = { label: d.label, dateControlFound: false, slots: [] };
      continue;
    }
    try {
      await match.el.click({ timeout: 5000 });
      await sleep(1300);
      const slots = await clickableTimes(page);
      days[d.iso] = { label: d.label, dateControlFound: true, slots, first: slots[0] || null, last: slots.at(-1) || null, count: slots.length };
    } catch (e) {
      days[d.iso] = { label: d.label, dateControlFound: true, slots: [], error: String(e) };
    }
  }
  return { type: typeLabel, days };
}

function scanNetworkSlots(networkBodies) {
  const byDate = Object.fromEntries(TARGET_DATES.map(d => [d.iso, []]));
  const hits = [];
  for (const item of networkBodies) {
    const text = item.body;
    for (const d of TARGET_DATES) {
      if (!text.includes(d.iso)) continue;
      const escaped = d.iso.replace(/-/g, '\\-');
      const isoRe = new RegExp(`${escaped}[T\\s](\\d{2}):(\\d{2})(?::\\d{2})?(?:\\.\\d+)?(?:Z|[+-]\\d{2}:?\\d{2})?`, 'g');
      let m;
      while ((m = isoRe.exec(text))) byDate[d.iso].push(`${m[1]}:${m[2]}`);
      hits.push({ date: d.iso, url: item.url, excerpt: text.slice(Math.max(0, text.indexOf(d.iso) - 180), text.indexOf(d.iso) + 500) });
    }
  }
  for (const d of TARGET_DATES) byDate[d.iso] = uniq(byDate[d.iso]);
  return { byDate, hits: hits.slice(0, 100) };
}

async function auditOne(browser, target) {
  const dir = path.join(OUT, target.id);
  await mkdirp(dir);
  const context = await browser.newContext({
    locale: 'en-US', timezoneId: 'America/Chicago', viewport: { width: 1365, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
  });
  context.setDefaultTimeout(7000);
  context.setDefaultNavigationTimeout(45000);
  let page = await context.newPage();
  const network = [];
  const networkBodies = [];
  context.on('response', response => {
    const req = response.request();
    if (!['xhr','fetch'].includes(req.resourceType())) return;
    const rec = { url: response.url(), status: response.status(), method: req.method(), contentType: response.headers()['content-type'] || '' };
    network.push(rec);
    if (/json|text|javascript/i.test(rec.contentType)) {
      Promise.race([response.text(), sleep(2500).then(() => '')]).then(body => {
        if (body && body.length < 1_500_000) networkBodies.push({ url: rec.url, body });
      }).catch(() => {});
    }
  });

  const result = { property: target.name, requestedUrl: target.url, auditedAt: new Date().toISOString(), targetDates: TARGET_DATES, states: [], interactions: [], errors: [] };
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded' });
    await sleep(4000);
    page = await dismissCookies(page);
    result.states.push(await collectState(page, 'initial'));

    const initialText = (await allFrameText(page)).map(x => x.text).join(' ');
    if (!/choose a tour type|select a date|choose a time|available tour|tour times open|about our tours/i.test(initialText)) {
      const cta = await findAndClick(page, TOUR_CTA_RE, { exclude: /contact|submit|send|apply/i, waitMs: 4000 });
      result.interactions.push({ action: 'tour CTA', clicked: cta.clicked, text: cta.text, href: cta.href, error: cta.error });
      page = cta.page;
    }
    await sleep(2500);
    page = await dismissCookies(page);
    result.states.push(await collectState(page, 'scheduler-open'));

    // If contact details are required before the calendar, fill placeholders and advance only via a non-final Next/Continue button.
    const currentText = (await allFrameText(page)).map(x => x.text).join(' ');
    const hasDateSignals = TARGET_DATES.some(d => datePatterns(d.iso).some(p => currentText.toLowerCase().includes(p))) || /select a date|choose a time|tour times open/i.test(currentText);
    if (!hasDateSignals && /first name|last name|email|phone/i.test(currentText)) {
      const gated = await fillPlaceholderIfGated(page);
      result.contactGate = { filled: gated.filled, advanced: gated.advanced, button: gated.button };
      if (gated.page) page = gated.page;
      await sleep(2000);
      result.states.push(await collectState(page, 'after-placeholder-gate'));
    }

    // Discover tour types from visible controls and text.
    const typeLabels = [];
    for (const frame of page.frames()) {
      for (const c of await visibleControls(frame)) {
        const m = clean(`${c.text} ${c.attrs['aria-label'] || ''}`).match(/(?:self[- ]guided(?: tour)?|guided(?: tour)?|virtual(?: tour)?|live video(?: tour)?|video(?: tour)?|in[- ]person(?: tour)?|agent[- ]guided(?: tour)?)/i);
        if (m) typeLabels.push(clean(m[0]));
      }
    }
    result.tourTypes = uniq(typeLabels);

    const perType = [];
    if (result.tourTypes.length) {
      for (const type of result.tourTypes.slice(0, 5)) {
        const clicked = await findAndClick(page, new RegExp(type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), { exclude: FINAL_RE, waitMs: 1800 });
        result.interactions.push({ action: 'tour type', type, clicked: clicked.clicked, text: clicked.text, error: clicked.error });
        page = clicked.page;
        perType.push(await enumerateDates(page, type));
      }
    } else {
      perType.push(await enumerateDates(page, 'default'));
    }
    result.availabilityByTourType = perType;
    result.states.push(await collectState(page, 'after-date-enumeration'));

    await sleep(2500);
    result.network = network;
    result.networkSlotCandidates = scanNetworkSlots(networkBodies);
    const finalText = (await allFrameText(page)).map(x => x.text).join(' ');
    result.signals = {
      noTimes: /don.?t have any tour times open|no (?:available )?(?:tour )?times|no appointments available|currently no availability/i.test(finalText),
      requestOnly: /request a tour|send us a message|we.?ll (?:call|contact|get back)|contact us to schedule|submit your request/i.test(finalText),
      instantLanguage: /schedule your tour|confirm your tour|add to your calendar|tour confirmation/i.test(finalText),
      contactGate: Boolean(result.contactGate?.filled),
      finalActionLabels: uniq((result.states.at(-1)?.frames || []).flatMap(f => f.controls.map(c => c.text)).filter(t => FINAL_RE.test(t))).slice(0, 30)
    };

    await page.screenshot({ path: path.join(dir, 'final.png') }).catch(() => {});
  } catch (e) {
    result.errors.push(String(e?.stack || e));
    await page.screenshot({ path: path.join(dir, 'error.png') }).catch(() => {});
  } finally {
    result.finalUrls = uniq(context.pages().map(p => p.url()));
    await writeJson(path.join(dir, 'result.json'), result);
    await fs.writeFile(path.join(dir, 'visible-text.txt'), result.states.map(s => `\n===== ${s.label} ${s.url} =====\n${s.frames.map(f => `\n--- FRAME ${f.url} ---\n${f.text}`).join('\n')}`).join('\n'));
    await context.close().catch(() => {});
  }
  console.log(`AUDIT_RESULT ${target.name} ${JSON.stringify({ errors: result.errors.length, tourTypes: result.tourTypes, signals: result.signals, finalUrls: result.finalUrls })}`);
  return result;
}

async function runPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      console.log(`AUDIT_START ${items[i].name}`);
      results[i] = await fn(items[i]);
      console.log(`AUDIT_DONE ${items[i].name}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

await mkdirp(OUT);
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const results = await runPool(TARGETS, 4, target => auditOne(browser, target));
await browser.close();
await writeJson(path.join(OUT, 'fast-results.json'), results);
console.log('FAST_AUDIT_COMPLETE');
