/**
 * PDF export: renders the generated HTML deck in headless Chromium and
 * prints it to a 16:9 PDF, one slide per page, preserving vector text.
 *
 * Usage: node export/export_pdf.js output/demo_presentation.html -o output/demo_presentation.pdf
 *
 * Also runs the in-page overflow scan and merges any findings into
 * validation_report.json / .md next to the HTML file (source: "runtime").
 *
 * Requires the optional dev dependency:
 *   npm i --no-save playwright && npx playwright install chromium
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm i --no-save playwright && npx playwright install chromium');
  process.exit(2);
}

const args = process.argv.slice(2);
let htmlPath = null;
let outPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-o' || args[i] === '--output') outPath = args[++i];
  else if (!htmlPath) htmlPath = args[i];
}
if (!htmlPath) {
  console.error('Usage: node export/export_pdf.js <deck.html> [-o deck.pdf]');
  process.exit(2);
}
outPath = outPath ?? htmlPath.replace(/\.html?$/i, '.pdf');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(path.resolve(htmlPath)).href, { waitUntil: 'load' });
await page.waitForTimeout(600);

// Merge runtime overflow findings into the build-time validation report.
const overflows = await page.evaluate(() => (window.__scanOverflow ? window.__scanOverflow() : []));
const reportPath = path.join(path.dirname(path.resolve(htmlPath)), 'validation_report.json');
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  report.issues = report.issues.filter((i) => i.source !== 'runtime');
  for (const o of overflows) {
    report.issues.push({
      slide: o.slide,
      severity: 'error',
      code: o.code,
      message: `Runtime overflow in <${o.tag} class="${o.cls}">: "${o.text}"`,
      source: 'runtime',
    });
  }
  report.error_count = report.issues.filter((i) => i.severity === 'error').length;
  report.warning_count = report.issues.length - report.error_count;
  report.status = report.error_count ? 'errors' : report.issues.length ? 'warnings' : 'ok';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const { writeReports } = await import('../src/validation.js');
  writeReports(report, path.resolve(htmlPath));
}
if (overflows.length) {
  console.warn(`Runtime overflow problems detected on slide(s): ${[...new Set(overflows.map((o) => o.slide))].join(', ')}`);
}

fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
await page.emulateMedia({ media: 'print' });
await page.pdf({
  path: outPath,
  width: '1280px',
  height: '720px',
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();

const pages = fs.statSync(outPath).size;
console.log(`Exported ${outPath} (${(pages / 1024).toFixed(0)} kB)`);
process.exit(overflows.length ? 1 : 0);
