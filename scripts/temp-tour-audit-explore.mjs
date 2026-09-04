import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('audit-output');
await fs.mkdir(OUT, { recursive: true });

const properties = [
  { name: 'Emblem Park', url: 'https://emblemparknashville.com/schedule-a-tour/' },
  { name: 'Westerly House', url: 'https://livewesterlyhouse.com/schedule-a-tour/' },
  { name: '445 Park Commons', url: 'https://445parkcommons.com/schedule-a-tour/' },
  { name: 'Residences at The Finery', url: 'https://livethefinery.com/' },
  { name: 'Memoir Wedgewood Houston', url: 'https://memoirresidential.com/properties/wedgewoodhouston' },
  { name: 'Memoir May Hosiery', url: 'https://memoirresidential.com/properties/may-hosiery' },
  { name: 'Standard Assembly', url: 'https://www.greystar.com/properties/nashville-tn/standard-assembly-apartments' },
  { name: 'Queens Wedgewood Houston', url: 'https://queensweho.com/' },
  { name: 'Luna', url: 'https://lunanashvilleliving.com/' },
  { name: 'Delux WeHo', url: 'https://deluxweho.com/' },
  { name: 'CODA', url: 'https://thecodanashville.com/' },
];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function clip(value, limit = 100000) {
  if (typeof value !== 'string') return value;
  return value.length > limit ? value.slice(0, limit) + `\n...[clipped ${value.length - limit} chars]` : value;
}

async function safeText(locator) {
  try { return ((await locator.innerText({ timeout: 1500 })) || '').trim(); } catch { return ''; }
}

async function getFrameSnapshot(frame) {
  let bodyText = '';
  let html = '';
  try { bodyText = await frame.locator('body').innerText({ timeout: 5000 }); } catch {}
  try { html = await frame.locator('html').innerHTML({ timeout: 5000 }); } catch {}

  const interactives = [];
  try {
    const loc = frame.locator('a,button,[role="button"],input,select,textarea,[tabindex]');
    const count = Math.min(await loc.count(), 500);
    for (let i = 0; i < count; i++) {
      const el = loc.nth(i);
      let visible = false;
      try { visible = await el.isVisible({ timeout: 500 }); } catch {}
      if (!visible) continue;
      let attrs = {};
      try {
        attrs = await el.evaluate((node) => ({
          tag: node.tagName,
          type: node.getAttribute('type'),
          name: node.getAttribute('name'),
          id: node.id || null,
          href: node.href || node.getAttribute('href'),
          value: node.value ?? null,
          placeholder: node.getAttribute('placeholder'),
          ariaLabel: node.getAttribute('aria-label'),
          title: node.getAttribute('title'),
          role: node.getAttribute('role'),
          className: typeof node.className === 'string' ? node.className.slice(0, 500) : null,
        }));
      } catch {}
      interactives.push({ index: i, text: clip(await safeText(el), 1000), ...attrs });
    }
  } catch {}

  return {
    name: frame.name(),
    url: frame.url(),
    bodyText: clip(bodyText, 120000),
    html: clip(html, 250000),
    interactives,
  };
}

async function snapshotPages(context, propertyDir, label) {
  const result = [];
  const pages = context.pages();
  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];
    const pageInfo = {
      pageIndex: pi,
      url: page.url(),
      title: '',
      frames: [],
    };
    try { pageInfo.title = await page.title(); } catch {}
    for (const frame of page.frames()) {
      pageInfo.frames.push(await getFrameSnapshot(frame));
    }
    result.push(pageInfo);
    try {
      await page.screenshot({ path: path.join(propertyDir, `${label}-page-${pi}.png`), fullPage: true, timeout: 30000 });
    } catch (error) {
      await fs.appendFile(path.join(propertyDir, 'errors.log'), `screenshot ${label} page ${pi}: ${error}\n`);
    }
  }
  await fs.writeFile(path.join(propertyDir, `${label}.json`), JSON.stringify(result, null, 2));
  return result;
}

async function dismissCookieBanners(context) {
  const patterns = [/accept all/i, /^accept$/i, /allow all/i, /agree/i, /got it/i, /continue without accepting/i, /close/i];
  for (const page of context.pages()) {
    for (const frame of page.frames()) {
      for (const pattern of patterns) {
        const candidates = frame.getByRole('button', { name: pattern });
        try {
          if (await candidates.count()) {
            const first = candidates.first();
            if (await first.isVisible({ timeout: 300 })) {
              await first.click({ timeout: 2000 });
              await page.waitForTimeout(500);
              break;
            }
          }
        } catch {}
      }
    }
  }
}

async function clickBestTourEntry(context, history) {
  const candidates = [];
  const scoreText = (text, href = '') => {
    const s = `${text} ${href}`.toLowerCase();
    if (/apply|resident|login|submit|confirm|reserve|finalize/.test(s)) return -100;
    if (/schedule\s*(a|your)?\s*tour/.test(s)) return 100;
    if (/book\s*(a|your)?\s*tour/.test(s)) return 95;
    if (/tour\s*now/.test(s)) return 90;
    if (/schedule/.test(s) && /tour/.test(s)) return 85;
    if (/book/.test(s) && /tour/.test(s)) return 80;
    if (/guided\s*tour|in[- ]person\s*tour/.test(s)) return 70;
    if (/self[- ]guided\s*tour/.test(s)) return 65;
    if (/virtual\s*tour/.test(s)) return 45;
    if (/get started|start tour/.test(s)) return 35;
    return -1;
  };

  for (const page of context.pages()) {
    for (const frame of page.frames()) {
      const loc = frame.locator('a,button,[role="button"],input[type="button"],input[type="submit"]');
      let count = 0;
      try { count = Math.min(await loc.count(), 500); } catch {}
      for (let i = 0; i < count; i++) {
        const el = loc.nth(i);
        let visible = false;
        try { visible = await el.isVisible({ timeout: 250 }); } catch {}
        if (!visible) continue;
        let text = await safeText(el);
        let href = '';
        try { href = (await el.getAttribute('href')) || ''; } catch {}
        let aria = '';
        try { aria = (await el.getAttribute('aria-label')) || ''; } catch {}
        const label = `${text} ${aria}`.trim();
        const score = scoreText(label, href);
        if (score < 0) continue;
        const key = `${page.url()}|${frame.url()}|${label}|${href}`;
        if (history.has(key)) continue;
        candidates.push({ page, frame, el, label, href, score, key });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const c of candidates) {
    try {
      history.add(c.key);
      await c.el.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
      await c.el.click({ timeout: 5000 });
      await c.page.waitForTimeout(6000);
      return { clicked: true, label: c.label, href: c.href, frameUrl: c.frame.url(), pageUrl: c.page.url(), score: c.score };
    } catch {}
  }
  return { clicked: false };
}

async function fillObviousContactGate(context) {
  const filled = [];
  const values = {
    first: 'Audit', last: 'Visitor', name: 'Audit Visitor',
    email: 'audit.visitor@example.com', phone: '6155550100',
  };
  for (const page of context.pages()) {
    for (const frame of page.frames()) {
      const inputs = frame.locator('input');
      let count = 0;
      try { count = Math.min(await inputs.count(), 100); } catch {}
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        let visible = false;
        try { visible = await input.isVisible({ timeout: 250 }); } catch {}
        if (!visible) continue;
        let type = '', name = '', placeholder = '', aria = '', autocomplete = '';
        try {
          type = ((await input.getAttribute('type')) || 'text').toLowerCase();
          name = ((await input.getAttribute('name')) || '').toLowerCase();
          placeholder = ((await input.getAttribute('placeholder')) || '').toLowerCase();
          aria = ((await input.getAttribute('aria-label')) || '').toLowerCase();
          autocomplete = ((await input.getAttribute('autocomplete')) || '').toLowerCase();
        } catch {}
        if (['hidden', 'submit', 'button', 'checkbox', 'radio', 'date', 'time'].includes(type)) continue;
        const hay = `${name} ${placeholder} ${aria} ${autocomplete}`;
        let value = null;
        if (type === 'email' || /email/.test(hay)) value = values.email;
        else if (type === 'tel' || /phone|mobile|telephone/.test(hay)) value = values.phone;
        else if (/first/.test(hay)) value = values.first;
        else if (/last/.test(hay)) value = values.last;
        else if (/full.?name|your.?name|name/.test(hay)) value = values.name;
        if (!value) continue;
        try {
          if (!(await input.inputValue({ timeout: 500 }))) {
            await input.fill(value, { timeout: 2000 });
            filled.push({ frameUrl: frame.url(), name, placeholder, type, value });
          }
        } catch {}
      }
    }
  }
  return filled;
}

const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
  ],
});

const summary = [];
for (const property of properties) {
  const slug = slugify(property.name);
  const propertyDir = path.join(OUT, slug);
  await fs.mkdir(propertyDir, { recursive: true });
  const context = await browser.newContext({
    timezoneId: 'America/Chicago',
    locale: 'en-US',
    viewport: { width: 1440, height: 1050 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const network = [];
  const responses = [];
  const consoleMessages = [];
  context.on('page', (p) => {
    p.on('console', (msg) => consoleMessages.push({ page: p.url(), type: msg.type(), text: msg.text().slice(0, 5000) }));
    p.on('request', (req) => {
      const rt = req.resourceType();
      if (['xhr', 'fetch', 'document'].includes(rt)) {
        network.push({ method: req.method(), resourceType: rt, url: req.url(), postData: clip(req.postData() || '', 20000) });
      }
    });
    p.on('response', async (resp) => {
      const req = resp.request();
      const rt = req.resourceType();
      if (!['xhr', 'fetch', 'document'].includes(rt)) return;
      const headers = await resp.allHeaders().catch(() => ({}));
      const contentType = headers['content-type'] || '';
      const entry = { status: resp.status(), resourceType: rt, url: resp.url(), contentType };
      const likelyUseful = /json|graphql|javascript|text|html/i.test(contentType) || /tour|sched|appoint|avail|calendar|knock|funnel|hyly|entrata|rentcafe|leasehawk|tour24|elise|meet|booking/i.test(resp.url());
      if (likelyUseful && responses.length < 300) {
        try {
          const text = await resp.text();
          entry.body = clip(text, 180000);
        } catch (error) {
          entry.bodyError = String(error);
        }
      }
      responses.push(entry);
    });
  });

  const page = await context.newPage();
  const history = new Set();
  const actions = [];
  let gotoError = null;
  try {
    await page.goto(property.url, { waitUntil: 'domcontentloaded', timeout: 75000 });
    await page.waitForTimeout(10000);
  } catch (error) {
    gotoError = String(error);
  }

  await dismissCookieBanners(context);
  await snapshotPages(context, propertyDir, '00-initial');

  for (let step = 1; step <= 4; step++) {
    const action = await clickBestTourEntry(context, history);
    actions.push({ step, ...action });
    await dismissCookieBanners(context);
    await snapshotPages(context, propertyDir, `0${step}-after-click`);
    if (!action.clicked) break;
  }

  const filled = await fillObviousContactGate(context);
  if (filled.length) await snapshotPages(context, propertyDir, '09-contact-filled-not-submitted');

  await fs.writeFile(path.join(propertyDir, 'network.json'), JSON.stringify(network, null, 2));
  await fs.writeFile(path.join(propertyDir, 'responses.json'), JSON.stringify(responses, null, 2));
  await fs.writeFile(path.join(propertyDir, 'console.json'), JSON.stringify(consoleMessages, null, 2));
  await fs.writeFile(path.join(propertyDir, 'actions.json'), JSON.stringify(actions, null, 2));
  await fs.writeFile(path.join(propertyDir, 'contact-gate.json'), JSON.stringify(filled, null, 2));

  summary.push({
    property: property.name,
    requestedUrl: property.url,
    finalPages: context.pages().map((p) => p.url()),
    gotoError,
    actions,
    contactFieldsFilled: filled,
    frameUrls: [...new Set(context.pages().flatMap((p) => p.frames().map((f) => f.url())))],
    xhrCount: network.filter((r) => ['xhr', 'fetch'].includes(r.resourceType)).length,
  });
  await context.close();
}

await browser.close();
await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
