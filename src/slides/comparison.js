/**
 * Comparison slide: two cards with navy header bars and light-blue bullet
 * bodies, separated by a "VS" circle (or custom divider label).
 */

import { slideHeader, bulletList, bodyTop } from '../components.js';
import { escapeHtml as esc } from '../page.js';

export const required = ['title', 'left', 'right'];

function side(spec, ctx) {
  const t = ctx.theme;
  const points = bulletList(spec.points ?? spec.bullets ?? [], ctx);
  const body = spec.body ? `<p class="body-text">${esc(spec.body)}</p>` : '';
  return `
  <div style="min-width: 0; display: flex; flex-direction: column;">
    <div style="background: var(--navy); color: var(--white); border-radius: var(--radius) var(--radius) 0 0; padding: 14px 20px; text-align: center; font-weight: bold; font-size: ${t.headingSize}px;">${esc(spec.heading ?? '')}</div>
    <div class="card" style="border-radius: 0 0 var(--radius) var(--radius); flex: 1;">${body}${points}</div>
  </div>`;
}

export function render(slide, ctx) {
  const t = ctx.theme;
  const divider = slide.divider ?? 'VS';
  return `
${slideHeader(slide, ctx)}
<div class="s-body ofc" style="top: ${bodyTop(slide, t) + 16}px; display: grid; grid-template-columns: 1fr 64px 1fr; align-items: stretch; align-content: start;">
  ${side(slide.left, ctx)}
  <div style="align-self: center; justify-self: center;">
    <div style="width: 58px; height: 58px; border-radius: 50%; border: 2.5px solid var(--blue); background: var(--white); display: flex; align-items: center; justify-content: center; color: var(--blue); font-weight: bold; font-size: ${t.smallSize + 1}px;">${esc(divider)}</div>
  </div>
  ${side(slide.right, ctx)}
</div>`;
}
