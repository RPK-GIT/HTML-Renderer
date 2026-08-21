import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measureText, wrapText, fitText } from '../src/textmetrics.js';

test('measureText scales linearly with font size', () => {
  const w1 = measureText('Hello world', 10);
  const w2 = measureText('Hello world', 20);
  assert.ok(Math.abs(w2 - 2 * w1) < 1e-9);
});

test('bold text is wider than regular', () => {
  assert.ok(measureText('Sample text', 16, true) > measureText('Sample text', 16, false));
});

test('wrapText respects max width', () => {
  const lines = wrapText('the quick brown fox jumps over the lazy dog', 16, 120);
  assert.ok(lines.length > 1);
  for (const line of lines) {
    assert.ok(measureText(line, 16) <= 120, `"${line}" exceeds 120px`);
  }
});

test('wrapText hard-breaks overlong words', () => {
  const lines = wrapText('Supercalifragilisticexpialidocious', 20, 80);
  assert.ok(lines.length > 1);
  for (const line of lines) assert.ok(measureText(line, 20) <= 80 + 20);
});

test('fitText shrinks to fit and reports failure at floor', () => {
  const ok = fitText('short', { size: 16, minSize: 10, maxWidth: 200, maxLines: 1 });
  assert.equal(ok.fits, true);
  assert.equal(ok.size, 16);

  const long = 'a very long piece of text that cannot possibly fit on one narrow line';
  const fail = fitText(long, { size: 16, minSize: 14, maxWidth: 100, maxLines: 1 });
  assert.equal(fail.fits, false);
  assert.equal(fail.size, 14);
});
