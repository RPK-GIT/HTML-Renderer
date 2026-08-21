/**
 * Hierarchy diagram auto-layout (up to three levels).
 *
 * Level styling follows the design system: navy root (white text), blue
 * children (white text), light-blue grandchildren (navy text). Elbow
 * connectors, everything centered. Branch groups carry class "h-branch"
 * so CSS can highlight the hovered subtree in the browser.
 */

import { fittedText, nodeRect, svgOpen, estWidth } from './core.js';

export function hierarchySvg(slide, { width: W, height: H, theme: t, uid }) {
  const problems = [];
  const report = (msg) => problems.push(msg);

  const children = (slide.children ?? []).map((c) =>
    typeof c === 'object' && c !== null ? c : { label: String(c) },
  );
  const n = children.length;

  const gap = 24;
  const colW = (W - (n - 1) * gap) / n;
  const rootW = Math.min(430, Math.max(260, estWidth(String(slide.root), 18, true) + 56));
  const rootH = 54;
  const childH = 50;
  const linkZone = 38;
  const gcH = 40;
  const gcGap = 12;
  const gcTopGap = 16;

  const maxGc = Math.max(0, ...children.map((c) => (c.children ?? []).length));
  const totalH = rootH + linkZone + childH + (maxGc ? gcTopGap + maxGc * (gcH + gcGap) - gcGap : 0);
  const y0 = Math.max(0, (H - totalH) / 2);

  if (totalH > H) report(`hierarchy needs ${Math.round(totalH)}px but only ${Math.round(H)}px available`);

  const parts = [];
  const rootX = W / 2 - rootW / 2;
  parts.push(nodeRect({ x: rootX, y: y0, w: rootW, h: rootH, fill: t.navy, rx: t.cornerRadius }));
  const rootText = fittedText(String(slide.root), {
    cx: W / 2, cy: y0 + rootH / 2, width: rootW - 32, size: 18, minSize: 14, bold: true, color: t.white, maxLines: 2,
  });
  parts.push(rootText.svg);
  if (!rootText.fits) report('root label does not fit');

  const childY = y0 + rootH + linkZone;
  const busY = y0 + rootH + linkZone / 2;

  // elbow connectors: root -> bus -> each child
  if (n > 0) {
    const firstCx = colW / 2;
    const lastCx = W - colW / 2;
    parts.push(`<line x1="${W / 2}" y1="${y0 + rootH}" x2="${W / 2}" y2="${busY}" stroke="${t.blue}" stroke-width="${t.strokeWidth}"/>`);
    if (n > 1) parts.push(`<line x1="${firstCx.toFixed(1)}" y1="${busY}" x2="${lastCx.toFixed(1)}" y2="${busY}" stroke="${t.blue}" stroke-width="${t.strokeWidth}"/>`);
  }

  children.forEach((child, i) => {
    const x = i * (colW + gap);
    const cx = x + colW / 2;
    const branch = [];
    branch.push(`<line x1="${cx.toFixed(1)}" y1="${busY}" x2="${cx.toFixed(1)}" y2="${childY}" stroke="${t.blue}" stroke-width="${t.strokeWidth}"/>`);
    branch.push(nodeRect({ x, y: childY, w: colW, h: childH, fill: t.blue, rx: t.cornerRadius }));
    const label = fittedText(String(child.label ?? ''), {
      cx, cy: childY + childH / 2, width: colW - 26, size: 16, minSize: 12, bold: true, color: t.white, maxLines: 2,
    });
    branch.push(label.svg);
    if (!label.fits) report(`child ${i + 1} label does not fit`);

    const gcs = (child.children ?? []).map(String);
    gcs.forEach((gc, j) => {
      const gy = childY + childH + gcTopGap + j * (gcH + gcGap);
      const gx = x + 12;
      const gw = colW - 24;
      const lineTop = j === 0 ? childY + childH : gy - gcGap;
      branch.push(`<line x1="${cx.toFixed(1)}" y1="${lineTop.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${gy.toFixed(1)}" stroke="${t.blue}" stroke-width="${t.strokeWidth}"/>`);
      branch.push(nodeRect({ x: gx, y: gy, w: gw, h: gcH, fill: t.lightBlue, rx: 6 }));
      const gcText = fittedText(gc, {
        cx, cy: gy + gcH / 2, width: gw - 20, size: 13.5, minSize: 11, color: t.navy, maxLines: 2,
      });
      branch.push(gcText.svg);
      if (!gcText.fits) report(`item "${gc}" under child ${i + 1} does not fit`);
    });

    parts.push(`<g class="h-branch">${branch.join('')}</g>`);
  });

  const svg = [
    svgOpen(W, H, `class="hier" aria-label="Hierarchy diagram"`),
    parts.join('\n'),
    '</svg>',
  ].join('\n');
  return { svg, problems };
}
