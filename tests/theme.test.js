import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_THEME, loadTheme, palette } from '../src/theme.js';

test('default palette is exactly the four design-system colors', () => {
  assert.deepEqual(
    [...palette(DEFAULT_THEME)].sort(),
    ['#0E3A66', '#2E75B6', '#D9E8F5', '#FFFFFF'].sort(),
  );
});

test('slide canvas is 1280x720 (16:9)', () => {
  assert.equal(DEFAULT_THEME.slideWidth, 1280);
  assert.equal(DEFAULT_THEME.slideHeight, 720);
  assert.equal(DEFAULT_THEME.slideWidth / DEFAULT_THEME.slideHeight, 16 / 9);
});

test('theme overrides are applied', () => {
  const t = loadTheme({ bodySize: 20 });
  assert.equal(t.bodySize, 20);
  assert.equal(t.titleSize, DEFAULT_THEME.titleSize);
});

test('unknown theme keys are rejected', () => {
  assert.throws(() => loadTheme({ bodySize: 20, nope: 1 }), /Unknown theme keys: nope/);
});

test('typography uses Helvetica with sans-serif fallback', () => {
  assert.match(DEFAULT_THEME.fontFamily, /Helvetica/);
  assert.match(DEFAULT_THEME.fontFamily, /Arial|sans-serif/);
});
