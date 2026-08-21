/**
 * Validation: collects issues during spec parsing and rendering, and writes
 * validation_report.json / validation_report.md next to the output file.
 *
 * Every issue carries a 1-based slide number (or null for deck-level
 * issues), a machine-readable code, a severity and a human message.
 */

import fs from 'node:fs';
import path from 'node:path';
import { palette } from './theme.js';

export class Validator {
  constructor() {
    this.issues = [];
  }

  error(slide, code, message) {
    this.issues.push({ slide, severity: 'error', code, message });
  }

  warning(slide, code, message) {
    this.issues.push({ slide, severity: 'warning', code, message });
  }

  get errors() {
    return this.issues.filter((i) => i.severity === 'error');
  }

  get status() {
    return this.errors.length ? 'errors' : this.issues.length ? 'warnings' : 'ok';
  }

  report(meta = {}) {
    return {
      status: this.status,
      ...meta,
      error_count: this.errors.length,
      warning_count: this.issues.length - this.errors.length,
      issues: this.issues,
    };
  }
}

/** Flag any hex color in a slide spec that is outside the theme palette. */
export function checkColors(slideSpec, slideNo, theme, validator) {
  const allowed = palette(theme);
  const hexes = JSON.stringify(slideSpec).match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [];
  for (const hex of hexes) {
    if (!allowed.has(hex.toUpperCase())) {
      validator.error(slideNo, 'invalid_color', `Color ${hex} is not in the theme palette`);
    }
  }
}

export function writeReports(report, outHtmlPath) {
  const dir = path.dirname(outHtmlPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'validation_report.json'), JSON.stringify(report, null, 2));

  const lines = [
    '# Validation report',
    '',
    `- Status: **${report.status}**`,
    `- Slides: ${report.slide_count}`,
    `- Errors: ${report.error_count}`,
    `- Warnings: ${report.warning_count}`,
    '',
  ];
  if (report.issues.length) {
    lines.push('| Slide | Severity | Code | Message |', '|---|---|---|---|');
    for (const i of report.issues) {
      lines.push(`| ${i.slide ?? '-'} | ${i.severity} | \`${i.code}\` | ${i.message} |`);
    }
  } else {
    lines.push('No issues detected.');
  }
  lines.push('');
  fs.writeFileSync(path.join(dir, 'validation_report.md'), lines.join('\n'));
}
