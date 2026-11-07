// phone-sized screenshots of a running app, light and dark.
// usage: pnpm phone [url] [name]   (defaults: http://localhost:5173, home)
// uses the locally installed chrome or edge, so no browser download is needed.
// output: .shots/<name>-<theme>-<viewport>.png (ignored by git)

import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5173';
const name = process.argv[3] ?? 'home';

const viewports = [
  { id: 'phone', width: 390, height: 844, scale: 2, mobile: true },
  { id: 'desktop', width: 1280, height: 860, scale: 1, mobile: false },
];

async function launch() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel });
    } catch {
      // try the next one
    }
  }
  return chromium.launch();
}

await mkdir('.shots', { recursive: true });
const browser = await launch();

for (const vp of viewports) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.scale,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
    });
    await context.addInitScript((t) => localStorage.setItem('lull:theme', t), theme);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate('document.fonts.ready');
    // what you see on load, then the whole page (fixed things like the dock
    // show up at their first-screen position in the full shot)
    const file = `.shots/${name}-${theme}-${vp.id}.png`;
    await page.screenshot({ path: file });
    await page.screenshot({ path: file.replace('.png', '-full.png'), fullPage: true });
    console.log(`${file}${errors.length ? `  errors: ${errors.join(' | ')}` : ''}`);
    await context.close();
  }
}

await browser.close();
