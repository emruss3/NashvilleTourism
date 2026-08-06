const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const base = process.argv[2] || 'http://localhost:3456/';
const outDir = path.join(__dirname, '..', 'docs', 'media', 'qa');
fs.mkdirSync(outDir, { recursive: true });

const expected = [
  '/media/hero/nashroam-skyline-hero',
  '/media/hubs/hotels-premium.jpg',
  '/media/hubs/restaurants-premium.jpg',
  '/media/hubs/live-music-premium.jpg',
  '/media/hubs/things-to-do-premium.jpg',
  '/media/hubs/events-premium.jpg',
  '/media/hubs/trip-planner-premium.jpg',
  '/media/guides/first-time-visitors.jpg',
  '/media/guides/where-to-stay.jpg',
  '/media/guides/weekend-itinerary.jpg',
  '/media/trending/live-tonight.jpg',
  '/media/trending/weekender.jpg',
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const badCss = [];
  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('.css') && res.status() >= 400) badCss.push(`${res.status()} ${u}`);
  });

  await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
  // Force lazy images to load
  for (let y = 0; y < 5000; y += 700) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const report = await page.evaluate((expectedPaths) => {
    const stylesheets = document.styleSheets.length;
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const h1 = document.querySelector('h1');
    const h1Style = h1 ? getComputedStyle(h1) : null;
    const imgs = [...document.images].map((img) => ({
      src: img.currentSrc || img.src,
      attr: img.getAttribute('src') || '',
      w: img.naturalWidth,
      h: img.naturalHeight,
      complete: img.complete,
      alt: img.alt,
    }));
    const sources = [...document.querySelectorAll('picture source')].map(
      (s) => s.getAttribute('srcset') || '',
    );
    const allRefs = [
      ...imgs.map((i) => i.src),
      ...imgs.map((i) => i.attr),
      ...sources,
    ];
    const mediaImgs = imgs.filter((i) => i.src.includes('/media/') || i.attr.includes('/media/'));
    const found = expectedPaths.map((p) => ({
      path: p,
      hit: allRefs.some((s) => s.includes(p)),
      loaded: mediaImgs.some((i) => (i.src.includes(p) || i.attr.includes(p)) && i.w > 0),
    }));
    const uniqueSrc = new Set(
      allRefs.filter(Boolean).map((s) => s.split('?')[0]),
    );
    return {
      stylesheets,
      bodyBg,
      h1Text: h1?.textContent?.trim() || null,
      h1Font: h1Style?.fontFamily || null,
      h1Color: h1Style?.color || null,
      mediaCount: mediaImgs.length,
      brokenMedia: mediaImgs.filter((i) => i.complete && !i.w).map((i) => i.src || i.attr),
      found,
      uniqueHomepageMedia: [...uniqueSrc].filter((s) =>
        /\/media\/(hero\/nashroam|hubs\/.*-premium|guides\/|trending\/)/.test(s),
      ),
    };
  }, expected);

  await page.screenshot({ path: path.join(outDir, 'verify-home-1440.png'), fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 750));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, 'verify-home-hubs.png'), fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 1450));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, 'verify-home-guides.png'), fullPage: false });

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await mobile.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
  await mobile.waitForTimeout(500);
  const mobileHero = await mobile.evaluate(() => {
    const pic = document.querySelector('picture source');
    const img = document.querySelector('picture img, .relative.isolate img');
    return {
      source: pic?.getAttribute('srcset') || null,
      img: img?.currentSrc || img?.src || null,
      h1: document.querySelector('h1')?.textContent?.trim() || null,
    };
  });
  await mobile.screenshot({ path: path.join(outDir, 'verify-home-375.png'), fullPage: false });

  console.log(JSON.stringify({ badCss, report, mobileHero }, null, 2));

  const fails = [];
  if (badCss.length) fails.push('css errors');
  if (report.stylesheets < 1) fails.push('no stylesheets');
  if (!report.h1Text?.includes('Make the most of Nashville')) fails.push('missing h1');
  if (report.brokenMedia.length) fails.push('broken media');
  for (const f of report.found) if (!f.hit) fails.push(`missing ${f.path}`);
  if (fails.length) {
    console.error('FAIL:', fails.join('; '));
    process.exit(1);
  }
  console.log('RENDER_OK');
  await browser.close();
})();
