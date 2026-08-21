/**
 * Shared SVG primitives for the diagram engine: fitted multi-line text,
 * rounded nodes, arrow markers, straight/curved connectors with
 * rectangle-boundary trimming.
 *
 * All geometry is computed here in logical pixels; callers pass semantic
 * structure only.
 */

import { wrapText, measureText } from '../textmetrics.js';
import { escapeHtml as esc } from '../page.js';

/**
 * Multi-line text centered on (cx, cy), wrapped to `width`, shrinking from
 * `size` to `minSize` until it fits `maxLines`.
 * Returns { svg, fits, size, lines, height }.
 */
export function fittedText(text, { cx, cy, width, size, minSize = 10, maxLines = 3, bold = false, color, leading = 1.3, anchor = 'middle' }) {
  let s = size;
  let lines = wrapText(text, s, width, bold);
  while (lines.length > maxLines && s > minSize) {
    s -= 1;
    lines = wrapText(text, s, width, bold);
  }
  const fits = lines.length <= maxLines;
  if (!fits) lines = lines.slice(0, maxLines);
  const lh = s * leading;
  const startY = cy - ((lines.length - 1) * lh) / 2;
  const weight = bold ? ' font-weight="bold"' : '';
  const tspans = lines
    .map((ln, i) => `<tspan x="${cx}" y="${(startY + i * lh).toFixed(1)}">${esc(ln)}</tspan>`)
    .join('');
  const svg = `<text text-anchor="${anchor}" dominant-baseline="middle" font-size="${s}" fill="${color}"${weight}>${tspans}</text>`;
  return { svg, fits, size: s, lines, height: lines.length * lh };
}

/** Rounded rectangle node. */
export function nodeRect({ x, y, w, h, fill, stroke, strokeWidth = 1.5, rx = 10, extra = '' }) {
  const s = stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : '';
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${rx}" fill="${fill}"${s}${extra}/>`;
}

/** Arrowhead marker definition; id must be unique within the page. */
export function arrowMarker(id, color) {
  return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 z" fill="${color}"/></marker>`;
}

/**
 * Point where the segment from rect center (cx,cy) toward (tx,ty) crosses
 * the rect boundary (with `pad` px of extra clearance).
 */
export function rectEdgePoint(cx, cy, hw, hh, tx, ty, pad = 4) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? (hw + pad) / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? (hh + pad) / Math.abs(dy) : Infinity;
  const t = Math.min(sx, sy);
  return { x: cx + dx * t, y: cy + dy * t };
}

/**
 * Connector between two node centers, trimmed to node boundaries.
 * `curve` (0..1) bows the line perpendicular to its direction; 0 = straight.
 * Returns { svg, labelX, labelY }.
 */
export function connector({ from, to, color, width = 2, curve = 0, arrow = null, dashed = false }) {
  const a = rectEdgePoint(from.cx, from.cy, from.hw, from.hh, to.cx, to.cy);
  const b = rectEdgePoint(to.cx, to.cy, to.hw, to.hh, from.cx, from.cy, arrow ? 7 : 4);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (-dy / len) * len * curve;
  const oy = (dx / len) * len * curve;
  const qx = mx + ox;
  const qy = my + oy;
  const d = curve
    ? `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
    : `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  const marker = arrow ? ` marker-end="url(#${arrow})"` : '';
  const dash = dashed ? ' stroke-dasharray="6 5"' : '';
  const svg = `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"${dash}${marker}/>`;
  // Label anchor: midpoint of the (possibly curved) path.
  const labelX = curve ? 0.25 * a.x + 0.5 * qx + 0.25 * b.x : mx;
  const labelY = curve ? 0.25 * a.y + 0.5 * qy + 0.25 * b.y : my;
  return { svg, labelX, labelY };
}

/** Small text label with a white halo so it stays readable over lines. */
export function haloLabel(text, x, y, { size, color, bold = false }) {
  const weight = bold ? ' font-weight="bold"' : '';
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${size}" fill="${color}"${weight} paint-order="stroke" stroke="#FFFFFF" stroke-width="4" stroke-linejoin="round">${esc(text)}</text>`;
}

/** Open/close an SVG sized to a region; viewBox equals CSS pixels. */
export function svgOpen(w, h, extraAttrs = '') {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" ${extraAttrs}>`;
}

export function estWidth(text, size, bold = false) {
  return measureText(text, size, bold);
}
