import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDeck, registeredTypes } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.join(here, '..', 'examples');

function deck(slides, extra = {}) {
  return { deck: { title: 'Test Deck' }, slides, ...extra };
}

test('all 13 required slide types are registered', () => {
  const expected = [
    'title', 'section_summary', 'content', 'two_column', 'three_column',
    'definition', 'process', 'hierarchy', 'relationship', 'comparison',
    'table', 'image_text', 'takeaway',
  ];
  for (const t of expected) assert.ok(registeredTypes().includes(t), `missing type: ${t}`);
});

test('demo deck renders without validation errors', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(examplesDir, 'demo_deck.json'), 'utf8'));
  const { html, report } = renderDeck(spec, { baseDir: examplesDir });
  assert.equal(report.status, 'ok', JSON.stringify(report.issues, null, 2));
  assert.equal(report.slide_count, spec.slides.length);
  assert.equal((html.match(/class="frame/g) || []).length, spec.slides.length);
});

test('unknown slide type produces an error and a placeholder, numbering survives', () => {
  const { html, report } = renderDeck(deck([
    { type: 'title', title: 'A' },
    { type: 'bogus', title: 'B' },
    { type: 'content', title: 'C' },
  ]));
  assert.equal(report.status, 'errors');
  const issue = report.issues.find((i) => i.code === 'unknown_type');
  assert.equal(issue.slide, 2);
  assert.equal((html.match(/class="frame/g) || []).length, 3);
  assert.match(html, /could not be rendered/);
});

test('missing required fields are reported with the slide number', () => {
  const { report } = renderDeck(deck([{ type: 'definition', term: 'X' }]));
  const issue = report.issues.find((i) => i.code === 'missing_field');
  assert.ok(issue);
  assert.equal(issue.slide, 1);
  assert.match(issue.message, /definition/);
});

test('off-palette colors in a spec are flagged', () => {
  const { report } = renderDeck(deck([{ type: 'content', title: 'Hi', body: 'Use #FF0000 here' }]));
  const issue = report.issues.find((i) => i.code === 'invalid_color');
  assert.ok(issue);
  assert.equal(issue.slide, 1);
});

test('palette colors are not flagged', () => {
  const { report } = renderDeck(deck([{ type: 'content', title: 'Hi', body: 'Navy is #0E3A66' }]));
  assert.equal(report.issues.filter((i) => i.code === 'invalid_color').length, 0);
});

test('empty deck is an error', () => {
  const { report } = renderDeck(deck([]));
  assert.ok(report.issues.some((i) => i.code === 'empty_deck'));
});

test('theme overrides flow into the page CSS; invalid ones are reported', () => {
  const { html } = renderDeck(deck([{ type: 'title', title: 'T' }], { theme: { titleSize: 40 } }));
  assert.match(html, /font-size: 40px/);
  const bad = renderDeck(deck([{ type: 'title', title: 'T' }], { theme: { wat: 1 } }));
  assert.ok(bad.report.issues.some((i) => i.code === 'invalid_theme'));
});

test('definition text is rendered verbatim (HTML-escaped only)', () => {
  const text = 'The <exact> "definition" & nothing else.';
  const { html } = renderDeck(deck([{ type: 'definition', term: 'T', definition: text }]));
  assert.ok(html.includes('The &lt;exact&gt; &quot;definition&quot; &amp; nothing else.'));
});

test('page shell: 16:9 canvas, print page size, navigation script, counter', () => {
  const { html } = renderDeck(deck([{ type: 'title', title: 'T' }]));
  assert.match(html, /width: 1280px; height: 720px/);
  assert.match(html, /@page \{ size: 1280px 720px/);
  assert.match(html, /ArrowRight/);
  assert.match(html, /hud-counter/);
  assert.match(html, /__scanOverflow/);
});
