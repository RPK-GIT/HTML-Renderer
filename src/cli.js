#!/usr/bin/env node
/**
 * CLI: node src/cli.js <spec.json> [-o output.html]
 *
 * Writes the HTML deck plus validation_report.json / validation_report.md
 * next to it. Exit code 1 if validation errors were detected.
 */

import fs from 'node:fs';
import path from 'node:path';
import { renderDeck } from './index.js';
import { writeReports } from './validation.js';

function main(argv) {
  const args = argv.slice(2);
  let specPath = null;
  let outPath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-o' || args[i] === '--output') outPath = args[++i];
    else if (!specPath) specPath = args[i];
  }
  if (!specPath) {
    console.error('Usage: node src/cli.js <spec.json> [-o output.html]');
    return 2;
  }
  outPath = outPath ?? 'output/presentation.html';

  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  } catch (err) {
    console.error(`Failed to read spec: ${err.message}`);
    return 2;
  }

  const { html, report } = renderDeck(spec, { baseDir: path.dirname(path.resolve(specPath)) });

  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(outPath, html);
  writeReports(report, outPath);

  console.log(`Rendered ${report.slide_count} slide(s) -> ${outPath}`);
  console.log(`Validation: ${report.status} (${report.error_count} error(s), ${report.warning_count} warning(s))`);
  for (const i of report.issues) {
    console.log(`  [${i.severity}] slide ${i.slide ?? '-'}: ${i.code} — ${i.message}`);
  }
  return report.error_count ? 1 : 0;
}

process.exit(main(process.argv));
