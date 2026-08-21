/**
 * Deterministic text measurement for layout and overflow prediction.
 *
 * Uses the standard Helvetica AFM advance widths (per 1000 font units).
 * Browsers render Arial/Helvetica, whose metrics match closely enough for
 * wrapping decisions and conservative overflow detection.
 */

// Advance widths for Helvetica (regular), ASCII 32..126, units per 1000.
const REGULAR = {
  ' ': 278, '!': 278, '"': 355, '#': 556, $: 556, '%': 889, '&': 667, "'": 191,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  0: 556, 1: 556, 2: 556, 3: 556, 4: 556, 5: 556, 6: 556, 7: 556, 8: 556, 9: 556,
  ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
  K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  '[': 278, '\\': 278, ']': 278, '^': 469, _: 556, '`': 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  '{': 334, '|': 260, '}': 334, '~': 584,
};

// Advance widths for Helvetica-Bold.
const BOLD = {
  ' ': 278, '!': 333, '"': 474, '#': 556, $: 556, '%': 889, '&': 722, "'": 238,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  0: 556, 1: 556, 2: 556, 3: 556, 4: 556, 5: 556, 6: 556, 7: 556, 8: 556, 9: 556,
  ':': 333, ';': 333, '<': 584, '=': 584, '>': 584, '?': 611, '@': 975,
  A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 556,
  K: 722, L: 611, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  '[': 333, '\\': 278, ']': 333, '^': 584, _: 556, '`': 333,
  a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278, j: 278,
  k: 556, l: 278, m: 889, n: 611, o: 611, p: 611, q: 611, r: 389, s: 556, t: 333,
  u: 611, v: 556, w: 778, x: 556, y: 556, z: 500,
  '{': 389, '|': 280, '}': 389, '~': 584,
};

const FALLBACK_REGULAR = 600;
const FALLBACK_BOLD = 640;

/** Width in px of `text` set at `size` px. */
export function measureText(text, size, bold = false) {
  const table = bold ? BOLD : REGULAR;
  const fallback = bold ? FALLBACK_BOLD : FALLBACK_REGULAR;
  let units = 0;
  for (const ch of String(text)) {
    units += table[ch] ?? fallback;
  }
  return (units / 1000) * size;
}

/**
 * Greedy word wrap: returns the lines `text` occupies at `size` px within
 * `maxWidth` px. Words longer than a full line are hard-broken so the
 * result never exceeds maxWidth by more than one character.
 */
export function wrapText(text, size, maxWidth, bold = false) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measureText(candidate, size, bold) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    // Hard-break a single word that is wider than the line.
    if (measureText(word, size, bold) > maxWidth) {
      let chunk = '';
      for (const ch of word) {
        if (measureText(chunk + ch, size, bold) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
    } else {
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Find the largest font size (from `size` down to `minSize`) at which
 * `text` fits `maxLines` lines of `maxWidth`. Returns { size, lines, fits }.
 * When even minSize overflows, returns minSize lines with fits=false.
 */
export function fitText(text, { size, minSize, maxWidth, maxLines, bold = false }) {
  let s = size;
  while (s >= minSize) {
    const lines = wrapText(text, s, maxWidth, bold);
    if (lines.length <= maxLines) return { size: s, lines, fits: true };
    s -= 1;
  }
  const lines = wrapText(text, minSize, maxWidth, bold);
  return { size: minSize, lines, fits: false };
}
