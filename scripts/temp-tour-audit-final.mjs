import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('final-audit-output');
await fs.mkdir(OUT, { recursive: true });

const dates = [
  { iso: '2026-09-04', us: '09/04/2026', day: 4, weekday: 'Friday' },
  { iso: '2026-09-05', us: '09/05/2026', day: 5, weekday: 'Saturday' },
  { iso: '2026-09-06', us: '09/06/2026', day: 6, weekday: 'Sunday' },
  { iso: '2026-09-07', us: '09/07/2026', day: 7, weekday: 'Monday' },
  { iso: '2026-09-08', us: '09/08/2026', day: 8, weekday: 'Tuesday' },
  { iso: '2026-09-09', us: '09/09/2026', day: 9, weekday: 'Wednesday' },
  { iso: '2026-09-10', us: '09/10/2026', day: 10, weekday: 'Thursday' },
];

const timeRe = /\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi;
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clip = (s, n = 500000) => typeof s === 'string' && s.length > n ? `${s.slice(0, n)}\n...[clipped ${s.length - n} chars]` : s;
const uniq = (xs) => [...new Set(xs)];
const timesIn = (s) => uniq([...String(s || '').matchAll(timeRe)].map(m => m[0].toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ')));

async function save(name, data) {
  await fs.writeFile(path.join(OUT, `${slug(name)}.json`), JSON.stringify(data, null, 2));
}

async function text(locator) {
  try { return await locator.innerText({ timeout: 2000 }); } catch { return ''; }
}

async function meta(frame, selector = 'button,a,input,select,option,[role="button"],[role="option"],[aria-label],[data-date],[data-tour]') {
  const out = [];
  const loc = frame.locator(selector);
  const count = Math.min(await loc.count().catch(() => 0), 1000);
  for (let i = 0; i < count; i++) {
    const el = loc.nth(i);
    if (!(await el.isVisible({ timeout: 100 }).catch(() => false))) continue;
    try {
      out.push(await el.evaluate(n => ({
        tag: n.tagName,
        text: (n.innerText || n.textContent || '').trim(),
        aria: n.getAttribute('aria-label') || '',
        role: n.getAttribute('role') || '',
        id: n.id || '',
        name: n.getAttribute('name') || '',
        type: n.getAttribute('type') || '',
        value: n.value || n.getAttribute('value') || '',
        disabled: !!n.disabled || n.getAttribute('aria-disabled') === 'true' || n.classList.contains('disabled'),
        className: typeof n.className === 'string' ? n.className.slice(0, 700) : '',
        dataDate: n.getAttribute('data-date') || n.getAttribute('data-value') || '',
        dataTour: n.getAttribute('data-tour') || '',
        href: n.href || n.getAttribute('href') || '',
      })));
    } catch {}
  }
  return out;
}

function watch(context, result) {
  result.network = [];
  result.console = [];
  result.pageErrors = [];
  context.on('page', page => {
    page.on('console', m => result.console.push({ type: m.type(), text: clip(m.text(), 10000), page: page.url() }));
    page.on('pageerror', e => result.pageErrors.push({ text: String(e), page: page.url() }));
    page.on('request', r => {
      if (['xhr', 'fetch', 'document'].includes(r.resourceType())) {
        result.network.push({ phase: 'request', method: r.method(), type: r.resourceType(), url: r.url(), postData: clip(r.postData() || '', 60000) });
      }
    });
    page.on('response', async r => {
      const req = r.request();
      const u = r.url();
      if (!['xhr', 'fetch', 'document'].includes(req.resourceType())) return;
      if (!/tour|sched|appoint|avail|calendar|nestio|nestiolistings|hy\.ly|rentcafe|yardi|jonah|cache|slot/i.test(u)) return;
      const e = { phase: 'response', method: req.method(), type: req.resourceType(), status: r.status(), url: u };
      try {
        const h = await r.allHeaders();
        e.contentType = h['content-type'] || '';
        e.body = clip(await r.text(), 1000000);
      } catch (err) { e.error = String(err); }
      result.network.push(e);
    });
  });
}

async function newContext(browser) {
  const context = await browser.newContext({
    timezoneId: 'America/Chicago',
    locale: 'en-US',
    viewport: { width: 1440, height: 1000 },
    screen: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  await context.addInitScript(() => {
    try { delete Object.getPrototypeOf(navigator).webdriver; } catch {}
  });
  return context;
}

async function goto(page, url, wait = 6000) {
  let error = null;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 75000 });
    await page.waitForTimeout(wait);
  } catch (e) { error = String(e); }
  return error;
}

async function clickVisibleExact(frame, label) {
  const locators = [
    frame.getByText(label, { exact: true }),
    frame.locator('[role="option"]').filter({ hasText: label }),
    frame.locator('div,button,a,li').filter({ hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }),
  ];
  for (const loc of locators) {
    const n = Math.min(await loc.count().catch(() => 0), 20);
    for (let i = n - 1; i >= 0; i--) {
      const el = loc.nth(i);
      if (!(await el.isVisible({ timeout: 150 }).catch(() => false))) continue;
      try { await el.click({ timeout: 5000 }); return true; } catch {}
    }
  }
  return false;
}

async function funnelAudit(browser, cfg) {
  const result = { name: cfg.name, provider: 'Funnel/Nestio', group: cfg.group, community: cfg.community, tourTypes: cfg.types, calendars: {} };
  const context = await newContext(browser); watch(context, result);
  const page = await context.newPage();
  const url = `https://integrations.nestio.com/contact-widget/v2/?group=${cfg.group}&location=${cfg.community}&key=03f5fe3982bf41a380739512238020a1&domain=${encodeURIComponent(cfg.domain)}&lead_capture_appointment=1`;
  result.url = url;
  result.navigationError = await goto(page, url, 7000);
  result.initialBody = clip(await text(page.locator('body')), 50000);
  result.initialHtml = clip(await page.locator('html').innerHTML().catch(() => ''), 250000);
  result.initialMeta = await meta(page.mainFrame(), 'div,button,input,[role="button"],[role="option"]');

  for (const type of cfg.types) {
    result.calendars[type] = {};
    try {
      const typeControl = page.locator('.pam__SelectValue__value').filter({ hasText: /Select tour type|Agent Guided Tour|Live Video Tour|Self-guided Tour/i }).first();
      await typeControl.click({ timeout: 5000 });
      await page.waitForTimeout(350);
      result[`typeMenu_${slug(type)}`] = await meta(page.mainFrame(), 'div,button,li,[role="option"]');
      const chosen = await clickVisibleExact(page.mainFrame(), type);
      if (!chosen) throw new Error(`Tour type option not found: ${type}`);
      await page.waitForTimeout(700);
    } catch (e) {
      result.calendars[type]._typeError = String(e);
      continue;
    }

    for (const d of dates) {
      const row = { times: [], available: false };
      try {
        const dateInput = page.locator('input').filter({ has: undefined }).filter({ hasText: '' });
        let input = page.locator('input[placeholder*="date" i]').first();
        if (!(await input.count())) input = page.locator('input.pam__InputValue__label').first();
        if (!(await input.count())) throw new Error('Date input not found');
        await input.click({ timeout: 5000 });
        await page.waitForTimeout(300);
        const days = page.locator('.react-datepicker__day');
        const dayCount = await days.count();
        row.datepicker = [];
        let target = null;
        for (let i = 0; i < dayCount; i++) {
          const el = days.nth(i);
          const m = await el.evaluate(n => ({
            text: (n.textContent || '').trim(),
            aria: n.getAttribute('aria-label') || '',
            cls: n.className,
            ariaDisabled: n.getAttribute('aria-disabled') || '',
          }));
          row.datepicker.push(m);
          const aria = m.aria.toLowerCase();
          const exactAria = aria.includes('september') && aria.includes(String(d.day)) && aria.includes('2026');
          const textMatch = m.text === String(d.day) && !/outside-month/i.test(m.cls);
          if (!target && (exactAria || textMatch)) target = { el, ...m };
        }
        if (!target) {
          row.reason = 'date not present';
          await page.keyboard.press('Escape').catch(() => {});
          result.calendars[type][d.iso] = row;
          continue;
        }
        row.dateControl = { text: target.text, aria: target.aria, cls: target.cls, ariaDisabled: target.ariaDisabled };
        if (/disabled|unselectable/i.test(target.cls) || target.ariaDisabled === 'true') {
          row.reason = 'date disabled';
          await page.keyboard.press('Escape').catch(() => {});
          result.calendars[type][d.iso] = row;
          continue;
        }
        await target.el.click({ timeout: 5000 });
        await page.waitForTimeout(700);

        const selects = page.locator('.pam__SelectValue__value');
        const selectCount = await selects.count();
        let timeControl = null;
        for (let i = 0; i < selectCount; i++) {
          const el = selects.nth(i);
          const t = norm(await text(el));
          if (/select time|\b(?:am|pm)\b/i.test(t)) { timeControl = el; break; }
        }
        if (!timeControl) throw new Error('Time selector not found');
        const cls = await timeControl.getAttribute('class') || '';
        if (/disabled/i.test(cls)) {
          row.reason = 'time selector disabled';
          result.calendars[type][d.iso] = row;
          continue;
        }
        await timeControl.click({ timeout: 5000 });
        await page.waitForTimeout(350);
        const opts = await meta(page.mainFrame(), 'div,button,li,[role="option"]');
        const candidates = opts.filter(x => /SelectOption|option/i.test(`${x.className} ${x.role}`) || timesIn(`${x.text} ${x.aria} ${x.value}`).length);
        row.optionMeta = candidates;
        row.times = uniq(candidates.flatMap(x => timesIn(`${x.text} ${x.aria} ${x.value}`)));
        row.available = row.times.length > 0;
        if (!row.available) row.reason = 'no time options';
        await page.keyboard.press('Escape').catch(() => {});
      } catch (e) { row.error = String(e); }
      result.calendars[type][d.iso] = row;
    }
  }
  result.finalBody = clip(await text(page.locator('body')), 50000);
  result.finalHtml = clip(await page.locator('html').innerHTML().catch(() => ''), 300000);
  try { await page.screenshot({ path: path.join(OUT, `${slug(cfg.name)}.png`), fullPage: true, timeout: 30000 }); } catch {}
  await save(cfg.name, result); await context.close(); return result;
}

async function mayHosieryAudit(browser) {
  const name = 'Memoir May Hosiery';
  const result = { name, provider: 'RentCafe/Yardi', url: 'https://www.memoir-mayhosiery.com/scheduletour', tourTypes: ['Guided Tour'], calendar: {} };
  const context = await newContext(browser); watch(context, result); const page = await context.newPage();
  result.navigationError = await goto(page, result.url, 6500);
  try {
    const accept = page.getByRole('button', { name: /Accept All Cookies/i }).first();
    if (await accept.isVisible({ timeout: 500 })) await accept.click({ timeout: 3000 });
  } catch {}
  await page.evaluate(() => {
    document.querySelectorAll('#onetrust-banner-sdk,.onetrust-pc-dark-filter,.ot-sdk-container').forEach(n => n.style.display = 'none');
  }).catch(() => {});
  const token = await page.locator('#scheduletour-request-verification-token').inputValue().catch(() => '');
  result.hasToken = !!token;
  result.body = clip(await text(page.locator('body')), 50000);
  for (const d of dates) {
    const raw = `dtSchedule=${encodeURIComponent(d.us)}&tourType=0&txtBedroom=&units=`;
    try {
      const resp = await context.request.post(`${result.url}?handler=GetAvailableSlots`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'RequestVerificationToken': token,
          'Cache-Control': 'no-cache, no-store, max-age=0',
          'Pragma': 'no-cache',
        },
        data: raw,
        timeout: 30000,
      });
      const body = await resp.text();
      const times = timesIn(body);
      result.calendar[d.iso] = { status: resp.status(), available: times.length > 0, times, body: clip(body, 200000) };
    } catch (e) { result.calendar[d.iso] = { available: false, times: [], error: String(e) }; }
  }
  try { await page.screenshot({ path: path.join(OUT, 'memoir-may-hosiery.png'), fullPage: true, timeout: 30000 }); } catch {}
  await save(name, result); await context.close(); return result;
}

async function fineryAudit(browser) {
  const name = 'Residences at The Finery';
  const result = { name, provider: 'Hyly.AI', url: 'https://my.hy.ly/tours/livethefinery/site?dd=0&popup=1', tourTypes: [], calendar: {} };
  const context = await newContext(browser); watch(context, result); const page = await context.newPage();
  result.navigationError = await goto(page, result.url, 5000);
  for (const re of [/^Accept$/i, /^Dismiss$/i]) {
    try { const b = page.getByRole('button', { name: re }).first(); if (await b.isVisible({ timeout: 300 })) { await b.click(); break; } } catch {}
  }
  result.landingBody = clip(await text(page.locator('body')), 50000);
  result.landingMeta = await meta(page.mainFrame(), 'a,button,[role="button"]');
  result.tourTypes = uniq(result.landingMeta.map(x => norm(x.text)).filter(x => /tour/i.test(x) && !/schedule a tour/i.test(x)));
  try {
    const inPerson = page.getByText(/IN-PERSON TOUR/i, { exact: true }).first();
    await inPerson.click({ timeout: 5000 });
    await page.waitForTimeout(2200);
  } catch (e) { result.typeClickError = String(e); }
  result.schedulerUrl = page.url();
  result.schedulerBody = clip(await text(page.locator('body')), 80000);
  result.schedulerHtml = clip(await page.locator('html').innerHTML().catch(() => ''), 350000);

  for (const d of dates) {
    const row = { available: false, times: [] };
    try {
      const cells = page.locator('td.day, .day, [data-date]');
      const n = Math.min(await cells.count(), 300);
      let target = null;
      row.dateCells = [];
      for (let i = 0; i < n; i++) {
        const el = cells.nth(i);
        if (!(await el.isVisible({ timeout: 100 }).catch(() => false))) continue;
        const m = await el.evaluate(n => ({ text: (n.textContent || '').trim(), cls: n.className, dataDate: n.getAttribute('data-date') || '', aria: n.getAttribute('aria-label') || '' }));
        row.dateCells.push(m);
        const dataMatch = m.dataDate.includes(d.iso) || m.dataDate === d.us;
        const textMatch = m.text === String(d.day) && !/old|new|disabled|off/i.test(m.cls);
        if (!target && (dataMatch || textMatch)) target = { el, ...m };
      }
      if (!target) { row.reason = 'date not found'; result.calendar[d.iso] = row; continue; }
      row.dateControl = { text: target.text, cls: target.cls, dataDate: target.dataDate, aria: target.aria };
      if (/disabled|off/i.test(target.cls)) { row.reason = 'date disabled'; result.calendar[d.iso] = row; continue; }
      await target.el.click({ timeout: 5000 }); await page.waitForTimeout(900);
      const body = await text(page.locator('body'));
      const controls = await meta(page.mainFrame(), 'button,a,input,label,[role="button"],[role="radio"]');
      const likely = controls.filter(x => timesIn(`${x.text} ${x.aria} ${x.value}`).length && norm(`${x.text} ${x.aria} ${x.value}`).length < 100);
      row.times = uniq(likely.flatMap(x => timesIn(`${x.text} ${x.aria} ${x.value}`)));
      if (!row.times.length) {
        const section = await page.locator('text=Select A Time').locator('xpath=..').innerText().catch(() => '');
        row.times = timesIn(section || body.split(/Contact Info/i)[0]);
      }
      row.available = row.times.length > 0;
      row.controlMeta = likely;
      if (!row.available) row.reason = 'no times displayed';
    } catch (e) { row.error = String(e); }
    result.calendar[d.iso] = row;
  }
  result.finalMeta = await meta(page.mainFrame());
  result.submitLabels = result.finalMeta.filter(x => /schedule|confirm|submit/i.test(`${x.text} ${x.value} ${x.aria}`));
  try { await page.screenshot({ path: path.join(OUT, 'residences-at-the-finery.png'), fullPage: true, timeout: 30000 }); } catch {}
  await save(name, result); await context.close(); return result;
}

async function primeChallenge(page, url) {
  const attempts = [];
  for (let i = 0; i < 3; i++) {
    let error = null;
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { error = String(e); }
    await page.waitForTimeout(7500);
    const title = await page.title().catch(() => '');
    const body = await text(page.locator('body'));
    const content = await page.locator('body').innerText().catch(() => '');
    attempts.push({ i, url: page.url(), title, error, body: clip(body, 30000) });
    if (!/One moment|request is being verified|Please wait while/i.test(`${title} ${body}`)) return { ok: true, attempts, content };
  }
  return { ok: false, attempts, content: '' };
}

async function jonahAudit(browser, cfg) {
  const result = { name: cfg.name, provider: 'Jonah tour scheduler', url: cfg.url, primers: {}, calendars: {}, tourTypes: [] };
  const context = await newContext(browser); watch(context, result); const primer = await context.newPage();
  for (const endpoint of [
    '/tour-scheduler-cache/tour-scheduler-cache-settings.json',
    '/tour-scheduler-cache/tour-scheduler-cache.json',
    '/get-tour-slots/',
  ]) {
    const full = new URL(endpoint, cfg.url).href;
    result.primers[endpoint] = await primeChallenge(primer, full);
    if (result.primers[endpoint].ok) {
      const body = await primer.locator('body').innerText().catch(() => '');
      const html = await primer.locator('body').textContent().catch(() => '');
      result.primers[endpoint].body = clip(body || html, 1000000);
    }
  }
  const page = await context.newPage();
  result.navigationError = await goto(page, cfg.url, 12000);
  result.body = clip(await text(page.locator('body')), 100000);
  result.html = clip(await page.locator('#tourScheduler').innerHTML().catch(() => ''), 500000);
  result.meta = await meta(page.mainFrame(), '#tourScheduler button,#tourScheduler a,#tourScheduler input,#tourScheduler [role="button"],#tourScheduler [data-tour],#tourScheduler [data-date]');
  result.loadingStuck = /Getting all available tours/i.test(result.body) || /is-loading/.test(result.html);
  const cards = page.locator('#tourTypesCards [data-tour]:not([aria-hidden="true"])');
  const cardCount = await cards.count().catch(() => 0);
  result.visibleCardCount = cardCount;
  for (let i = 0; i < cardCount; i++) {
    const card = cards.nth(i);
    const label = norm(await text(card));
    const type = (await card.getAttribute('data-tour').catch(() => '')) || label || `type-${i}`;
    result.tourTypes.push(label || type);
    try {
      const clicker = card.locator('button,a,.tour-card__link').first();
      if (await clicker.count()) await clicker.click({ timeout: 5000 }); else await card.click({ timeout: 5000 });
      await page.waitForTimeout(1200);
      const state = { body: clip(await text(page.locator('#tourScheduler')), 100000), html: clip(await page.locator('#tourScheduler').innerHTML().catch(() => ''), 500000), meta: await meta(page.mainFrame(), '#tourScheduler button,#tourScheduler a,#tourScheduler input,#tourScheduler [role="button"],#tourScheduler [data-date]') };
      result.calendars[label || type] = state;
      const back = page.locator('[data-view-section-button="tour-types"]').first();
      if (await back.count()) { await back.click({ timeout: 3000 }); await page.waitForTimeout(500); }
    } catch (e) { result.calendars[label || type] = { error: String(e) }; }
  }
  try { await page.screenshot({ path: path.join(OUT, `${slug(cfg.name)}.png`), fullPage: true, timeout: 30000 }); } catch {}
  await save(cfg.name, result); await context.close(); return result;
}

const browser = await chromium.launch({
  headless: false,
  args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--no-sandbox', '--window-size=1920,1080'],
});

const results = [];
for (const cfg of [
  { name: 'Emblem Park', group: 10676, community: 10054, domain: 'emblemparknashville.com', types: ['Agent Guided Tour'] },
  { name: 'Westerly House', group: 8221, community: 7699, domain: 'livewesterlyhouse.com', types: ['Agent Guided Tour', 'Live Video Tour'] },
  { name: 'Queens Wedgewood Houston', group: 6311, community: 5865, domain: 'queensweho.com', types: ['Agent Guided Tour', 'Live Video Tour'] },
  { name: 'Standard Assembly', group: 6708, community: 6249, domain: 'thestandardassembly.com', types: ['Agent Guided Tour', 'Live Video Tour'] },
]) {
  try { results.push(await funnelAudit(browser, cfg)); } catch (e) { results.push({ name: cfg.name, fatal: String(e) }); }
}
try { results.push(await mayHosieryAudit(browser)); } catch (e) { results.push({ name: 'Memoir May Hosiery', fatal: String(e) }); }
try { results.push(await fineryAudit(browser)); } catch (e) { results.push({ name: 'Residences at The Finery', fatal: String(e) }); }
try { results.push(await jonahAudit(browser, { name: 'Delux WeHo', url: 'https://deluxweho.com/schedule-a-tour/' })); } catch (e) { results.push({ name: 'Delux WeHo', fatal: String(e) }); }
try { results.push(await jonahAudit(browser, { name: 'Luna', url: 'https://lunanashvilleliving.com/schedule-a-tour/' })); } catch (e) { results.push({ name: 'Luna', fatal: String(e) }); }

await browser.close();
await fs.writeFile(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.map(r => ({ name: r.name, fatal: r.fatal || null, loadingStuck: r.loadingStuck ?? null })), null, 2));
