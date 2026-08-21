/**
 * Process slide: title + auto-laid-out SVG process diagram
 * (horizontal / snake / cycle — see src/svg/process.js).
 */

import { slideHeader, diagramRegion } from '../components.js';
import { processSvg } from '../svg/process.js';

export const required = ['title', 'steps'];

export function render(slide, ctx) {
  const steps = slide.steps;
  if (!Array.isArray(steps) || steps.length < 2 || steps.length > 8) {
    throw new Error(`"steps" must be an array of 2-8 items (got ${Array.isArray(steps) ? steps.length : typeof steps})`);
  }
  const norm = steps.map((s) => (typeof s === 'object' && s !== null ? s : { label: String(s) }));

  const region = diagramRegion(slide, ctx.theme);
  const { svg, problems } = processSvg({ ...slide, steps: norm }, {
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
