import puppeteer from 'puppeteer';

const BASE = process.env.SHOT_BASE ?? 'http://localhost:5173';
const OUT = '/tmp/work-shots';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const sizes = [
  { name: 'mobile', w: 375, h: 720 },
  { name: 'tablet', w: 768, h: 900 },
  { name: 'desktop', w: 1440, h: 900 },
  { name: '4k', w: 3840, h: 2160 },
];

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const errors = [];
for (const s of sizes) {
  const page = await browser.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${s.name}] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[${s.name}] PAGEERR ${e.message}`));
  await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/work`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${OUT}/work-${s.name}.png` });

  // Capture the dispatch dialog at this size.
  const btn = await page.$('button');
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const t = await page.evaluate((el) => el.textContent, b);
    if (t && t.trim() === 'Dispatch') {
      await b.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: `${OUT}/dispatch-${s.name}.png` });
  void btn;
  await page.close();
}

await browser.close();
console.log('errors:', errors.length ? errors : 'none');
console.log('shots written to', OUT);
