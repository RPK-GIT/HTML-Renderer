/**
 * Tests for the HTML rich visual interaction layer:
 *  - _html_visual parsing (loadVisualSpec)
 *  - slide IDs and duplicate-id validation
 *  - interactive_hierarchy rendering
 *  - sequential_reveal process rendering
 *  - navigation target resolution and validation
 *  - backward compatibility
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDeck } from '../src/index.js';
import { loadVisualSpec, validateNavigation, KNOWN_MODES } from '../src/html_visual.js';
import { Validator } from '../src/validation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.join(here, '..', 'examples');

function deck(slides, extra = {}) {
  return { deck: { title: 'Test' }, slides, ...extra };
}

function makeValidator() {
  return new Validator();
}

// ---- _html_visual parsing ----

test('_html_visual absent → resolveVisual returns empty object', () => {
  const spec = deck([{ type: 'title', title: 'T' }]);
  const v = makeValidator();
  const resolve = loadVisualSpec(spec, new Map(), v);
  assert.deepEqual(resolve('title', 1, undefined), {});
  assert.equal(v.issues.length, 0);
});

test('_html_visual present: by_type sets mode for matching type', () => {
  const spec = deck([], {
    _html_visual: {
      by_type: { hierarchy: { mode: 'interactive_hierarchy' } },
    },
  });
  const v = makeValidator();
  const resolve = loadVisualSpec(spec, new Map(), v);
  const result = resolve('hierarchy', 1, undefined);
  assert.equal(result.mode, 'interactive_hierarchy');
  assert.equal(v.issues.length, 0);
});

test('_html_visual: by_slide (by index) overrides by_type', () => {
  const spec = deck([], {
    _html_visual: {
      by_type: { process: { mode: 'sequential_reveal' } },
      by_slide: { '2': { mode: 'custom_override' } },
    },
  });
  const v = makeValidator();
  const resolve = loadVisualSpec(spec, new Map(), v);
  // slide 2, type process — by_slide wins
  const result = resolve('process', 2, undefined);
  assert.equal(result.mode, 'custom_override');
  // slide 1, type process — by_type applies
  const result1 = resolve('process', 1, undefined);
  assert.equal(result1.mode, 'sequential_reveal');
});

test('_html_visual: by_slide (by id) overrides by_type', () => {
  const idToIndex = new Map([['my-slide', 3]]);
  const spec = deck([], {
    _html_visual: {
      by_type: { process: { mode: 'sequential_reveal' } },
      by_slide: { 'my-slide': { mode: 'id_override' } },
    },
  });
  const v = makeValidator();
  const resolve = loadVisualSpec(spec, idToIndex, v);
  const result = resolve('process', 3, 'my-slide');
  assert.equal(result.mode, 'id_override');
});

test('_html_visual: precedence by_slide > by_type > defaults', () => {
  const idToIndex = new Map([['s1', 1]]);
  const spec = deck([], {
    _html_visual: {
      defaults: { card_hover: true, foo: 'default' },
      by_type: { title: { foo: 'type', bar: 'type' } },
      by_slide: { 's1': { bar: 'slide' } },
    },
  });
  const v = makeValidator();
  const resolve = loadVisualSpec(spec, idToIndex, v);
  const result = resolve('title', 1, 's1');
  assert.equal(result.card_hover, true);   // from defaults
  assert.equal(result.foo, 'type');        // by_type overrides defaults
  assert.equal(result.bar, 'slide');       // by_slide overrides by_type
});

test('_html_visual: unknown mode in by_type → warning, not error', () => {
  const spec = deck([], {
    _html_visual: {
      by_type: { hierarchy: { mode: 'nonexistent_mode' } },
    },
  });
  const v = makeValidator();
  loadVisualSpec(spec, new Map(), v);
  const warnings = v.issues.filter((i) => i.severity === 'warning' && i.code === 'visual_unknown_mode');
  assert.equal(warnings.length, 1);
  assert.equal(v.errors.length, 0);
});

test('_html_visual: unknown by_slide key → warning, not error', () => {
  const spec = deck([], {
    _html_visual: {
      by_slide: { 'nonexistent-id': { mode: 'something' } },
    },
  });
  const v = makeValidator();
  loadVisualSpec(spec, new Map(), v);
  const warnings = v.issues.filter((i) => i.severity === 'warning' && i.code === 'visual_unknown_slide');
  assert.equal(warnings.length, 1);
  assert.equal(v.errors.length, 0);
});

test('_html_visual: deck renders successfully with visual spec', () => {
  const { report } = renderDeck(deck(
    [{ type: 'title', title: 'Hello' }],
    {
      _html_visual: {
        defaults: { card_hover: true },
        by_type: { hierarchy: { mode: 'interactive_hierarchy' } },
      },
    },
  ));
  assert.equal(report.error_count, 0);
});

// ---- slide IDs ----

test('slide id: unique id is accepted', () => {
  const { report } = renderDeck(deck([
    { id: 'intro', type: 'title', title: 'T' },
    { id: 'main', type: 'content', title: 'M', bullets: ['a'] },
  ]));
  assert.equal(report.error_count, 0);
});

test('slide id: duplicate id produces an error', () => {
  const { report } = renderDeck(deck([
    { id: 'dup', type: 'title', title: 'T' },
    { id: 'dup', type: 'content', title: 'M', bullets: ['a'] },
  ]));
  const err = report.issues.find((i) => i.code === 'duplicate_slide_id');
  assert.ok(err, 'expected duplicate_slide_id error');
  assert.equal(err.severity, 'error');
});

test('slide id: missing id still works (backward compatible)', () => {
  const { report } = renderDeck(deck([
    { type: 'title', title: 'T' },
    { type: 'content', title: 'M', bullets: ['b'] },
  ]));
  assert.equal(report.error_count, 0);
});

// ---- sequential_reveal ----

test('sequential_reveal: process SVG has proc-seq class when mode active', () => {
  const { html, report } = renderDeck(deck(
    [{ type: 'process', title: 'P', steps: ['A', 'B', 'C'] }],
    { _html_visual: { by_type: { process: { mode: 'sequential_reveal' } } } },
  ));
  assert.equal(report.error_count, 0);
  assert.match(html, /class="proc-seq"/);
});

test('sequential_reveal: process SVG has data-step attributes', () => {
  const { html } = renderDeck(deck(
    [{ type: 'process', title: 'P', steps: ['A', 'B', 'C'] }],
    { _html_visual: { by_type: { process: { mode: 'sequential_reveal' } } } },
  ));
  const matches = html.match(/data-step="\d+"/g) || [];
  assert.equal(matches.length, 3, 'expected 3 data-step attributes for 3 steps');
});

// ---- interactive_hierarchy ----

test('interactive_hierarchy: hierarchy slide renders without error', () => {
  const { html, report } = renderDeck(deck(
    [{
      type: 'hierarchy', title: 'H', root: 'Root',
      children: [{ label: 'A', children: ['A1'] }, 'B'],
    }],
    { _html_visual: { by_type: { hierarchy: { mode: 'interactive_hierarchy' } } } },
  ));
  assert.equal(report.error_count, 0);
  assert.match(html, /class="hier"/);
  assert.match(html, /class="h-branch"/);
});

// ---- navigation ----

test('navigation: valid target by index works', () => {
  const { html, report } = renderDeck(deck(
    [
      {
        type: 'hierarchy', title: 'H', root: 'Root',
        children: [{ label: 'Go to 2', children: [] }, 'B'],
      },
      { type: 'content', title: 'Second', bullets: ['x'] },
    ],
    {
      _html_visual: {
        by_slide: {
          '1': { navigation: { 'Go to 2': 2 } },
        },
      },
    },
  ));
  assert.equal(report.error_count, 0);
  assert.match(html, /data-goto="2"/);
});

test('navigation: invalid target index produces warning', () => {
  const { report } = renderDeck(deck(
    [{ type: 'hierarchy', title: 'H', root: 'R', children: ['A', 'B'] }],
    {
      _html_visual: {
        by_slide: {
          '1': { navigation: { 'A': 99 } }, // out of range
        },
      },
    },
  ));
  const warn = report.issues.find((i) => i.code === 'visual_invalid_nav');
  assert.ok(warn, 'expected visual_invalid_nav warning');
  assert.equal(warn.severity, 'warning');
});

test('navigation: valid target by id resolves correctly', () => {
  const { html, report } = renderDeck(deck(
    [
      {
        id: 'first',
        type: 'hierarchy', title: 'H', root: 'Root',
        children: [{ label: 'Go to second', children: [] }, 'B'],
      },
      { id: 'second', type: 'content', title: 'Second slide', bullets: ['y'] },
    ],
    {
      _html_visual: {
        by_slide: {
          'first': { navigation: { 'Go to second': 'second' } },
        },
      },
    },
  ));
  assert.equal(report.error_count, 0);
  assert.match(html, /data-goto="2"/);
});

test('navigation: unknown id produces warning', () => {
  const { report } = renderDeck(deck(
    [{ type: 'hierarchy', title: 'H', root: 'R', children: ['A', 'B'] }],
    {
      _html_visual: {
        by_slide: {
          '1': { navigation: { 'A': 'nonexistent-id' } },
        },
      },
    },
  ));
  const warn = report.issues.find((i) => i.code === 'visual_invalid_nav');
  assert.ok(warn, 'expected visual_invalid_nav warning');
  assert.equal(warn.severity, 'warning');
});

// ---- backward compat ----

test('backward compat: existing demo deck renders identically (no _html_visual)', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(examplesDir, 'demo_deck.json'), 'utf8'));
  const { html, report } = renderDeck(spec, { baseDir: examplesDir });
  assert.equal(report.status, 'ok', JSON.stringify(report.issues));
  assert.equal(report.slide_count, spec.slides.length);
  assert.equal((html.match(/class="frame/g) || []).length, spec.slides.length);
});

// ---- principles_explorer ----

test('principles_explorer mode renders without error', () => {
  const { html, report } = renderDeck({
    deck: { title: 'Test' },
    slides: [{
      id: 'p-test',
      type: 'hierarchy',
      title: 'Test Principles',
      root: 'Root',
      children: [
        { label: 'Group A', children: ['Principle 1', 'Principle 2'] },
        { label: 'Group B', children: ['Principle 3'] },
        'Standalone',
      ],
    }],
    _html_visual: {
      by_slide: {
        'p-test': {
          mode: 'principles_explorer',
          source_annotations: {
            'Principle 1': { text: 'Source text for P1.', page: '42' },
          },
        },
      },
    },
  });
  assert.equal(report.status, 'ok', JSON.stringify(report.issues));
  assert.match(html, /prin-explorer/);
  assert.match(html, /Group A/);
  assert.match(html, /Principle 1/);
  assert.match(html, /prin-annotations/);
});

test('principles_explorer: source annotations embedded in page', () => {
  const { html } = renderDeck({
    deck: { title: 'Test' },
    slides: [{
      id: 'p-test2',
      type: 'hierarchy',
      title: 'Test',
      root: 'Root',
      children: [{ label: 'Group', children: ['P1'] }],
    }],
    _html_visual: {
      by_slide: {
        'p-test2': {
          mode: 'principles_explorer',
          source_annotations: { 'P1': { text: 'Source excerpt.', page: '50' } },
        },
      },
    },
  });
  assert.match(html, /Source excerpt/);
  assert.match(html, /prin-annotations/);
});

test('principles_explorer: standalone group (no children) renders', () => {
  const { html, report } = renderDeck({
    deck: { title: 'Test' },
    slides: [{
      id: 'p-test3',
      type: 'hierarchy',
      title: 'Test',
      root: 'Root',
      children: ['Leadership Commitment'],
    }],
    _html_visual: {
      by_slide: { 'p-test3': { mode: 'principles_explorer' } },
    },
  });
  assert.equal(report.status, 'ok');
  assert.match(html, /Leadership Commitment/);
});
