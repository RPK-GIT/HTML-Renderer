/**
 * Process diagram auto-layout.
 *
 * Variants (slide.variant, default "auto"):
 *  - horizontal : classic left-to-right cards with arrows (2-5 steps)
 *  - snake      : two rows with a curved U-turn connector (6-8 steps,
 *                 or forced) — richer than the PDF renderer's layout
 *  - cycle      : steps arranged on a circle with curved arrows, for
 *                 lifecycles; optional `center` label
 *
 * The caller provides steps [{label, detail?}]; all geometry is computed
 * here.
 */

import { fittedText, nodeRect, arrowMarker, connector, svgOpen } from './core.js';

function stepCard({ x, y, w, h, i, step, t, report }) {
  const parts = [];
  parts.push(nodeRect({ x, y, w, h, fill: t.lightBlue, rx: t.cornerRadius }));
  // inset blue top bar, like the PDF renderer's process cards
  parts.push(`<rect x="${(x + 10).toFixed(1)}" y="${y.toFixed(1)}" width="${(w - 20).toFixed(1)}" height="5" rx="2.5" fill="${t.blue}"/>`);

  const cx = x + w / 2;
  const num = fittedText(String(i + 1).padStart(2, '0'), {
    cx, cy: y + 28, width: w - 24, size: 16, bold: true, color: t.blue, maxLines: 1,
  });
  parts.push(num.svg);

  const hasDetail = Boolean(step.detail);
  const labelCy = y + (hasDetail ? 58 : h / 2 + 8);
  const label = fittedText(step.label ?? '', {
    cx, cy: labelCy, width: w - 28, size: 17, minSize: 13, bold: true, color: t.navy, maxLines: 2,
  });
  parts.push(label.svg);
  if (!label.fits) report(`step ${i + 1} label does not fit`);

  if (hasDetail) {
    const detailTop = labelCy + label.height / 2 + 10;
    const room = y + h - 14 - detailTop;
    const maxLines = Math.max(1, Math.floor(room / (13 * 1.3)));
    const detail = fittedText(step.detail, {
      cx, cy: detailTop + room / 2, width: w - 32, size: 13, minSize: 11, color: t.navy, maxLines,
    });
    parts.push(detail.svg);
    if (!detail.fits) report(`step ${i + 1} detail does not fit`);
  }
  return parts.join('');
}

function horizontal(steps, W, H, t, uid, report) {
  const n = steps.length;
  const gap = 46;
  const w = Math.min(232, (W - (n - 1) * gap) / n);
  const h = Math.min(steps.some((s) => s.detail) ? 190 : 120, H - 20);
  const totalW = n * w + (n - 1) * gap;
  const x0 = (W - totalW) / 2;
  const y0 = (H - h) / 2;

  const parts = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (w + gap);
    parts.push(stepCard({ x, y: y0, w, h, i, step: steps[i], t, report }));
    if (i < n - 1) {
      const ax = x + w + 8;
      parts.push(`<line x1="${ax}" y1="${y0 + h / 2}" x2="${ax + gap - 16}" y2="${y0 + h / 2}" stroke="${t.blue}" stroke-width="${t.arrowWidth}" marker-end="url(#${uid})"/>`);
    }
  }
  return parts.join('\n');
}

function snake(steps, W, H, t, uid, report) {
  const n = steps.length;
  const cols = Math.ceil(n / 2);
  const gap = 42;
  const w = Math.min(232, (W - (cols - 1) * gap) / cols);
  const rowGap = 64;
  const h = Math.min(170, (H - rowGap) / 2 - 6);
  const totalW = cols * w + (cols - 1) * gap;
  const x0 = (W - totalW) / 2;
  const y0 = (H - (2 * h + rowGap)) / 2;

  const parts = [];
  for (let i = 0; i < n; i++) {
    const row = i < cols ? 0 : 1;
    const col = row === 0 ? i : cols - 1 - (i - cols); // row 2 runs right-to-left
    const x = x0 + col * (w + gap);
    const y = y0 + row * (h + rowGap);
    parts.push(stepCard({ x, y, w, h, i, step: steps[i], t, report }));

    if (i >= n - 1) continue;
    const midY = y + h / 2;
    if (row === 0 && i < cols - 1) {
      const ax = x + w + 6;
      parts.push(`<line x1="${ax}" y1="${midY}" x2="${ax + gap - 14}" y2="${midY}" stroke="${t.blue}" stroke-width="${t.arrowWidth}" marker-end="url(#${uid})"/>`);
    } else if (i === cols - 1) {
      // curved U-turn from the end of row 1 down into row 2
      const sx = x + w - 14;
      const sy = y + h + 4;
      const ey = y + h + rowGap - 6;
      parts.push(`<path d="M ${sx} ${sy} C ${sx + 46} ${sy + (ey - sy) / 2}, ${sx + 46} ${sy + (ey - sy) / 2}, ${sx} ${ey}" fill="none" stroke="${t.blue}" stroke-width="${t.arrowWidth}" marker-end="url(#${uid})"/>`);
    } else {
      const ax = x - 6;
      parts.push(`<line x1="${ax}" y1="${midY}" x2="${ax - gap + 14}" y2="${midY}" stroke="${t.blue}" stroke-width="${t.arrowWidth}" marker-end="url(#${uid})"/>`);
    }
  }
  return parts.join('\n');
}

function cycle(steps, W, H, t, uid, report, centerLabel) {
  const n = steps.length;
  const w = n > 5 ? 176 : 196;
  const h = steps.some((s) => s.detail) ? 84 : 64;
  const ry = (H - h) / 2 - 8;
  const rx = Math.min((W - w) / 2 - 8, ry * 1.5);
  const cx0 = W / 2;
  const cy0 = H / 2;

  const pt = (a) => ({ x: cx0 + rx * Math.cos(a), y: cy0 + ry * Math.sin(a) });
  const centers = steps.map((_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { a, ...pt(a) };
  });

  const parts = [];
  // fixed-length curved arrows centered between consecutive nodes
  const halfArc = Math.min(0.24, Math.PI / n / 2.2);
  for (let i = 0; i < n; i++) {
    const a1 = centers[i].a;
    const a2 = i + 1 < n ? centers[i + 1].a : centers[0].a + 2 * Math.PI;
    const amid = (a1 + a2) / 2;
    const p1 = pt(amid - halfArc);
    const p2 = pt(amid + halfArc);
    parts.push(`<path d="M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}" fill="none" stroke="${t.blue}" stroke-width="${t.arrowWidth}" marker-end="url(#${uid})"/>`);
  }

  if (centerLabel) {
    const c = fittedText(centerLabel, {
      cx: cx0, cy: cy0, width: 2 * (Math.min(rx, ry) - Math.hypot(w, h) / 2) - 20, size: 19, minSize: 14, bold: true, color: t.blue, maxLines: 2,
    });
    parts.push(c.svg);
  }

  steps.forEach((step, i) => {
    const { x, y } = centers[i];
    parts.push(nodeRect({ x: x - w / 2, y: y - h / 2, w, h, fill: t.lightBlue, stroke: t.blue, strokeWidth: t.strokeWidth, rx: t.cornerRadius }));
    const hasDetail = Boolean(step.detail);
    const label = fittedText(`${i + 1}. ${step.label ?? ''}`, {
      cx: x, cy: hasDetail ? y - h / 2 + 24 : y, width: w - 22, size: 16, minSize: 12, bold: true, color: t.navy, maxLines: hasDetail ? 1 : 2,
    });
    parts.push(label.svg);
    if (!label.fits) report(`step ${i + 1} label does not fit`);
    if (hasDetail) {
      const detail = fittedText(step.detail, {
        cx: x, cy: y + 12, width: w - 22, size: 12.5, minSize: 11, color: t.navy, maxLines: 2,
      });
      parts.push(detail.svg);
      if (!detail.fits) report(`step ${i + 1} detail does not fit`);
    }
  });
  return parts.join('\n');
}

/**
 * Build the process SVG. Returns { svg, problems: string[] }.
 */
export function processSvg(slide, { width: W, height: H, theme: t, uid }) {
  const steps = slide.steps;
  const problems = [];
  const report = (msg) => problems.push(msg);

  let variant = slide.variant ?? 'auto';
  if (variant === 'auto') variant = steps.length <= 5 ? 'horizontal' : 'snake';
  if (variant === 'horizontal' && steps.length > 5) variant = 'snake';

  let body;
  if (variant === 'cycle') body = cycle(steps, W, H, t, uid, report, slide.center);
  else if (variant === 'snake') body = snake(steps, W, H, t, uid, report);
  else body = horizontal(steps, W, H, t, uid, report);

  const svg = [
    svgOpen(W, H, 'aria-label="Process diagram"'),
    `<defs>${arrowMarker(uid, t.blue)}</defs>`,
    body,
    '</svg>',
  ].join('\n');
  return { svg, problems };
}
