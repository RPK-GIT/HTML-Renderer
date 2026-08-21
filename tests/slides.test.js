import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDeck } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.join(here, '..', 'examples');

function one(slide, opts = {}) {
  return renderDeck({ deck: { title: 'T' }, slides: [slide] }, opts);
}

// ---- process ----

test('process: 2-8 steps enforced', () => {
  const bad = one({ type: 'process', title: 'P', steps: [{ label: 'only' }] });
  assert.ok(bad.report.issues.some((i) => i.code === 'render_error' && /2-8/.test(i.message)));
  const good = one({ type: 'process', title: 'P', steps: ['A', 'B', 'C'] });
  assert.equal(good.report.status, 'ok');
});

test('process: horizontal for <=5 steps, snake for 6+, cycle on request', () => {
  const h = one({ type: 'process', title: 'P', steps: ['A', 'B', 'C'] }).html;
  assert.match(h, /<svg[^>]*Process diagram/);
  assert.match(h, /marker-end/);

  const s = one({ type: 'process', title: 'P', steps: ['A', 'B', 'C', 'D', 'E', 'F'] }).html;
  assert.match(s, /<path d="M [\d. ]+C /); // curved U-turn connector

  const c = one({ type: 'process', title: 'P', variant: 'cycle', steps: ['A', 'B', 'C', 'D'], center: 'Loop' }).html;
  assert.match(c, /A [\d.]+ [\d.]+ 0 0 1/); // elliptical arc arrows
  assert.match(c, />Loop</);
});

test('process: steps render number, label and detail', () => {
  const { html } = one({ type: 'process', title: 'P', steps: [{ label: 'Plan', detail: 'Define scope' }, { label: 'Do' }] });
  assert.match(html, />01</);
  assert.match(html, />Plan</);
  assert.match(html, />Define scope</);
});

// ---- hierarchy ----

test('hierarchy: renders three styled levels with branch groups', () => {
  const { html, report } = one({
    type: 'hierarchy', title: 'H', root: 'Root',
    children: [{ label: 'A', children: ['A1', 'A2'] }, 'B'],
  });
  assert.equal(report.status, 'ok');
  assert.match(html, /fill="#0E3A66"/); // navy root
  assert.match(html, /fill="#2E75B6"/); // blue child
  assert.match(html, /fill="#D9E8F5"/); // light-blue grandchild
  assert.equal((html.match(/class="h-branch"/g) || []).length, 2);
});

test('hierarchy: limits on children and grandchildren', () => {
  const many = one({ type: 'hierarchy', title: 'H', root: 'R', children: ['1', '2', '3', '4', '5', '6', '7'] });
  assert.ok(many.report.issues.some((i) => i.code === 'render_error' && /1-6/.test(i.message)));
  const deep = one({ type: 'hierarchy', title: 'H', root: 'R', children: [{ label: 'A', children: ['1', '2', '3', '4', '5'] }] });
  assert.ok(deep.report.issues.some((i) => i.code === 'render_error' && /at most 4/.test(i.message)));
});

// ---- relationship ----

test('relationship: hub is auto-detected and drawn in navy', () => {
  const { html, report } = one({
    type: 'relationship', title: 'R',
    nodes: [{ id: 'hub', label: 'Hub' }, { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
    edges: [{ from: 'hub', to: 'a' }, { from: 'hub', to: 'b' }, { from: 'hub', to: 'c' }],
  });
  assert.equal(report.status, 'ok');
  const hubGroup = html.match(/<g data-node="hub"[^>]*>(.*?)<\/g>/s);
  assert.match(hubGroup[1], /fill="#0E3A66"/);
});

test('relationship: unknown edge endpoints and duplicate ids are reported', () => {
  const bad = one({
    type: 'relationship', title: 'R',
    nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    edges: [{ from: 'a', to: 'zz' }],
  });
  assert.ok(bad.report.issues.some((i) => i.code === 'diagram_overflow' && /unknown node id/.test(i.message)));

  const dup = one({
    type: 'relationship', title: 'R',
    nodes: [{ id: 'a', label: 'A' }, { id: 'a', label: 'A2' }],
    edges: [],
  });
  assert.ok(dup.report.issues.some((i) => /duplicate node id/.test(i.message)));
});

test('relationship: edge labels rendered with halo', () => {
  const { html } = one({
    type: 'relationship', title: 'R',
    nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    edges: [{ from: 'a', to: 'b', label: 'supports' }],
  });
  assert.match(html, />supports</);
  assert.match(html, /paint-order="stroke"/);
});

// ---- table ----

test('table: renders headers, zebra body, alignment; shape errors caught', () => {
  const { html, report } = one({
    type: 'table', title: 'T',
    columns: ['X', 'Y'], align: ['left', 'right'],
    rows: [['1', '2'], ['3', '4']],
  });
  assert.equal(report.status, 'ok');
  assert.match(html, /<th style="text-align: left;">X<\/th>/);
  assert.match(html, /text-align: right;/);

  const bad = one({ type: 'table', title: 'T', columns: ['X', 'Y'], rows: [['only one']] });
  assert.ok(bad.report.issues.some((i) => /row 1 must have exactly 2 cells/.test(i.message)));
});

test('table: too many rows is a table_overflow error', () => {
  const rows = Array.from({ length: 40 }, (_, i) => [`R${i}`, 'value']);
  const { report } = one({ type: 'table', title: 'T', columns: ['A', 'B'], rows });
  assert.ok(report.issues.some((i) => i.code === 'table_overflow'));
});

// ---- images ----

test('image_text: SVG image is embedded as a data URI with preserved aspect', () => {
  const { html, report } = one(
    { type: 'image_text', title: 'I', image: { path: 'workshop_canvas.svg', fit: 'contain' }, bullets: ['a'] },
    { baseDir: examplesDir },
  );
  assert.equal(report.status, 'ok');
  assert.match(html, /src="data:image\/svg\+xml;base64,/);
  assert.match(html, /object-fit: contain/);
});

test('image_text: missing file and unsupported format are reported', () => {
  const missing = one({ type: 'image_text', title: 'I', image: 'nope.png' }, { baseDir: examplesDir });
  assert.ok(missing.report.issues.some((i) => i.code === 'invalid_image_path' && i.slide === 1));

  const badFmt = one({ type: 'image_text', title: 'I', image: 'x.gif' }, { baseDir: examplesDir });
  assert.ok(badFmt.report.issues.some((i) => /Unsupported image format/.test(i.message)));
});

// ---- columns / comparison / summary ----

test('two_column and three_column enforce exact column counts', () => {
  const bad = one({ type: 'two_column', title: 'C', columns: [{ heading: 'only' }] });
  assert.ok(bad.report.issues.some((i) => /exactly 2/.test(i.message)));
  const bad3 = one({ type: 'three_column', title: 'C', columns: [{}, {}] });
  assert.ok(bad3.report.issues.some((i) => /exactly 3/.test(i.message)));
});

test('comparison renders both headings and the divider', () => {
  const { html } = one({
    type: 'comparison', title: 'C',
    left: { heading: 'Alpha', points: ['1'] },
    right: { heading: 'Beta', points: ['2'] },
  });
  assert.match(html, />Alpha</);
  assert.match(html, />Beta</);
  assert.match(html, />VS</);
});

test('section_summary items with slide numbers become internal links', () => {
  const { html } = one({ type: 'section_summary', title: 'S', summary: [{ text: 'Go', slide: 4 }, 'Plain'] });
  assert.match(html, /data-goto="4"/);
});
