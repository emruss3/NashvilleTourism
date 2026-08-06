const { chromium } = require('playwright');
const path = require('path');

const base = process.argv[2] || 'http://localhost:3001/';

(async () => {
  const browser = await chromium.launch();
  const outDir = path.join(__dirname, '..', 'docs', 'media', 'qa');
  const sizes = [
    [1440, 900, 'home-1440.png'],
    [768, 900, 'home-768.png'],
    [375, 812, 'home-375.png'],
  ];
  for (const [width, height, file] of sizes) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1000);
    const cssCount = await page.evaluate(() => document.styleSheets.length);
    console.log(file, 'stylesheets', cssCount);
    await page.screenshot({ path: path.join(outDir, file), fullPage: false });
    await page.close();
    console.log('wrote', file);
  }
  await browser.close();
})();
