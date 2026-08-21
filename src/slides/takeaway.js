/**
 * Key takeaway: large navy statement banner with a small blue top tab,
 * plus up to three supporting light-blue cards.
 */

import { slideHeader, bodyTop } from '../components.js';
import { escapeHtml as esc } from '../page.js';

export const required = ['statement'];

export function render(slide, ctx) {
  const t = ctx.theme;
  const header = { ...slide, title: slide.title ?? 'Key takeaway' };

  const points = Array.isArray(slide.points) ? slide.points.slice(0, 3) : [];
  if (Array.isArray(slide.points) && slide.points.length > 3) {
    ctx.validator.error(ctx.slideNo, 'too_many_items', `takeaway supports at most 3 points, got ${slide.points.length}`);
  }
  const cards = points.length
    ? `<div style="display: grid; grid-template-columns: repeat(${points.length}, 1fr); gap: ${t.gutter}px; margin-top: 36px;">
      ${points
        .map(
          (p) =>
            `<div class="card card-accent hoverable" style="text-align: center; padding: 20px 22px; font-size: ${t.smallSize + 1}px; line-height: var(--leading); color: var(--navy);">${esc(p)}</div>`,
        )
        .join('\n      ')}
    </div>`
    : '';

  return `
${slideHeader(header, ctx)}
<div class="s-body ofc" style="top: ${bodyTop(header, t) + 24}px;">
  <div style="position: relative;">
    <div style="position: absolute; top: -3px; left: 50%; transform: translateX(-50%); width: 76px; height: 6px; background: var(--blue); border-radius: 3px;"></div>
    <div style="background: var(--navy); border-radius: var(--radius); padding: 46px 60px; box-shadow: var(--shadow);">
      <p style="color: var(--white); font-size: ${t.titleSize - 6}px; font-weight: bold; line-height: 1.45; text-align: center;">${esc(slide.statement)}</p>
    </div>
  </div>
  ${cards}
</div>`;
}
