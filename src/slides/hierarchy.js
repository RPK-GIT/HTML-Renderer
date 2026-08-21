/**
 * Hierarchy slide: title + auto-laid-out SVG tree (root / children /
 * grandchildren). Hovering a branch highlights it in the browser.
 */

import { slideHeader, diagramRegion } from '../components.js';
import { hierarchySvg } from '../svg/hierarchy.js';

export const required = ['title', 'root', 'children'];

export function render(slide, ctx) {
  const children = slide.children;
  if (!Array.isArray(children) || children.length < 1 || children.length > 6) {
    throw new Error(`"children" must be an array of 1-6 items (got ${Array.isArray(children) ? children.length : typeof children})`);
  }
  for (const c of children) {
    const gcs = typeof c === 'object' && c !== null ? c.children ?? [] : [];
    if (gcs.length > 4) throw new Error(`at most 4 sub-items per child (got ${gcs.length})`);
  }

  const region = diagramRegion(slide, ctx.theme);
  const { svg, problems } = hierarchySvg(slide, {
    width: region.width,
    height: region.height,
    theme: ctx.theme,
    uid: `arrow-s${ctx.slideNo}`,
  });
  for (const p of problems) ctx.validator.error(ctx.slideNo, 'diagram_overflow', p);

  return `
${slideHeader(slide, ctx)}
<div class="s-body" style="top: ${region.top}px;">${svg}</div>`;
}
