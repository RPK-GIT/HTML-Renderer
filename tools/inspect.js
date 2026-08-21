/**
 * Visual inspection helper (dev tool, not part of the renderer).
 *
 * Usage: node tools/inspect.js output/demo_presentation.html [slideNos...]
 *
 * Opens the deck in headless Chromium, runs the in-page overflow scan,
 * and writes a screenshot per requested slide (default: all) to tmp/.
 */

import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const htmlPath = process.argv[2] ?? 'output/demo_presentation.html';
const only = process.argv.slice(3).map(Number).filter((n) => !Number.isNaN(n));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(path.resolve(htmlPath)).href);
await page.waitForTimeout(500);

const overflow = await page.evaluate(() => (window.__scanOverflow ? window.__scanOverflow() : null));
console.log('Runtime overflow problems:', JSON.stringify(overflow, null, 2));

const total = await page.evaluate(() => document.querySelectorAll('.frame').length);
const targets = only.length ? only : Array.from({ length: total }, (_, i) => i + 1);

fs.mkdirSync('tmp', { recursive: true });
for (const n of targets) {
  await page.evaluate((i) => {
    document.querySelectorAll('.frame').forEach((f, k) => f.classList.toggle('active', k === i));
  }, n - 1);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `tmp/slide${String(n).padStart(2, '0')}.png` });
}
console.log(`Saved ${targets.length} screenshot(s) to tmp/`);
await browser.close();
