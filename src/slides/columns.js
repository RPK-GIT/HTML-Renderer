/**
 * Two- and three-column slides: equal-width light-blue cards with a blue
 * top accent, heading and body text or bullets. Columns may optionally be
 * expandable (`expand: true` on the slide) — collapsed detail opens on
 * click in the browser and is always visible in print.
 */

import { slideHeader, bulletList, bodyTop } from '../components.js';
import { escapeHtml as esc } from '../page.js';

function renderColumns(slide, ctx, expected) {
  const cols = slide.columns;
  if (!Array.isArray(cols) || cols.length !== expected) {
    throw new Error(`"columns" must be an array of exactly ${expected} items`);
  }
  const t = ctx.theme;

  const cards = cols.map((col) => {
    const heading = col.heading ? `<h3>${esc(col.heading)}</h3>` : '';
    const body = [];
    if (col.body) body.push(`<p class="body-text" style="font-size: ${expected === 3 ? t.smallSize + 1 : t.bodySize}px;">${esc(col.body)}</p>`);
    if (col.bullets) body.push(bulletList(col.bullets, ctx, { small: expected === 3 }));
    let more = '';
    if (col.more) {
      more = `<div data-expand class="exp-wrap" style="margin-top: 12px; border-top: 1px solid var(--blue); padding-top: 8px;">
        <div class="exp-head" style="color: var(--blue); font-size: ${t.smallSize}px; font-weight: bold;">More detail</div>
        <div class="exp-body" style="font-size: ${t.smallSize}px; line-height: var(--leading); margin-top: 8px;">${esc(col.more)}</div>
      </div>`;
    }
    return `<div class="card card-accent hoverable" style="min-width: 0;">${heading}${body.join('')}${more}</div>`;
  });

  return `
${slideHeader(slide, ctx)}
<div class="s-body ofc" style="top: ${bodyTop(slide, ctx.theme)}px; display: grid; grid-template-columns: repeat(${expected}, 1fr); gap: ${t.gutter}px; align-content: start;">
  ${cards.join('\n  ')}
</div>`;
}

export const twoColumn = {
  required: ['title', 'columns'],
  render: (slide, ctx) => renderColumns(slide, ctx, 2),
};

export const threeColumn = {
  required: ['title', 'columns'],
  render: (slide, ctx) => renderColumns(slide, ctx, 3),
};
