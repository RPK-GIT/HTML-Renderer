/**
 * Browser-level tests: navigation, scaling, runtime overflow detection and
 * PDF export, using headless Chromium. Skipped automatically when
 * Playwright is not installed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderDeck } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const examplesDir = path.join(root, 'examples');

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch {
  // Playwright not installed — browser tests are skipped.
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-test-'));

function writeDeck(spec, name) {
  const { html } = renderDeck(spec, { baseDir: examplesDir });
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, html);
  return file;
}

const demoSpec = JSON.parse(fs.readFileSync(path.join(examplesDir, 'demo_deck.json'), 'utf8'));

test('keyboard navigation, counter, home/end and overview', { skip: !chromium }, async () => {
  const file = writeDeck(demoSpec, 'nav.html');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(pathToFileURL(file).href);

  const counter = () => page.textContent('#hud-counter');
  assert.equal(await counter(), `1 / ${demoSpec.slides.length}`);

  await page.keyboard.press('ArrowRight');
  assert.equal(await counter(), `2 / ${demoSpec.slides.length}`);
  await page.keyboard.press('PageDown');
  assert.equal(await counter(), `3 / ${demoSpec.slides.length}`);
  await page.keyboard.press('ArrowLeft');
  assert.equal(await counter(), `2 / ${demoSpec.slides.length}`);
  await page.keyboard.press('End');
  assert.equal(await counter(), `${demoSpec.slides.length} / ${demoSpec.slides.length}`);
  await page.keyboard.press('Home');
  assert.equal(await counter(), `1 / ${demoSpec.slides.length}`);

  await page.keyboard.press('o');
  assert.ok(await page.evaluate(() => document.body.classList.contains('overview')));
  await page.keyboard.press('Escape');
  assert.ok(await page.evaluate(() => !document.body.classList.contains('overview')));

  await browser.close();
});

test('slide preserves 16:9 and scales to viewport without distortion', { skip: !chromium }, async () => {
  const file = writeDeck(demoSpec, 'scale.html');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.goto(pathToFileURL(file).href);
  const box = await page.evaluate(() => {
    const r = document.querySelector('.frame.active .slide').getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  assert.ok(Math.abs(box.w / box.h - 16 / 9) < 0.01, `ratio was ${box.w / box.h}`);
  assert.ok(box.w <= 900 && box.h <= 900);
  await browser.close();
});

test('demo deck has no runtime overflow; overflowing content is detected', { skip: !chromium }, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const cleanFile = writeDeck(demoSpec, 'clean.html');
  await page.goto(pathToFileURL(cleanFile).href);
  await page.waitForTimeout(400);
  const clean = await page.evaluate(() => window.__scanOverflow());
  assert.deepEqual(clean, []);

  const hugeText = 'Many words that keep going. '.repeat(220);
  const badFile = writeDeck(
    { deck: { title: 'T' }, slides: [{ type: 'content', title: 'Too much', body: hugeText }] },
    'overflow.html',
  );
  await page.goto(pathToFileURL(badFile).href);
  await page.waitForTimeout(400);
  const bad = await page.evaluate(() => window.__scanOverflow());
  assert.ok(bad.length > 0, 'expected overflow to be detected');
  assert.equal(bad[0].slide, 1);

  await browser.close();
});

test('PDF export produces one 16:9 page per slide', { skip: !chromium }, async () => {
  const file = writeDeck(demoSpec, 'pdf.html');
  const out = path.join(tmpDir, 'deck.pdf');
  execFileSync(process.execPath, [path.join(root, 'export', 'export_pdf.js'), file, '-o', out], {
    cwd: root,
    stdio: 'pipe',
  });
  const buf = fs.readFileSync(out);
  assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
  const text = buf.toString('latin1');
  const counts = [...text.matchAll(/\/Count (\d+)/g)].map((m) => Number(m[1]));
  assert.ok(counts.length, 'PDF page count not found');
  assert.equal(Math.max(...counts), demoSpec.slides.length);
  assert.match(text, /MediaBox \[0 0 960 540\]/);
});
