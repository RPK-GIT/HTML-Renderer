/**
 * Section summary / roadmap: numbered light-blue rows. Items with a `slide`
 * number become clickable internal links (clickable roadmap). More than 6
 * items switches to a two-column grid.
 */

import { slideHeader, bodyTop } from '../components.js';
import { escapeHtml as esc } from '../page.js';

export const required = ['title', 'summary'];

export function render(slide, ctx) {
  const items = slide.summary;
  if (!Array.isArray(items) || !items.length) {
    throw new Error('"summary" must be a non-empty array');
  }
  if (items.length > 10) {
    ctx.validator.error(ctx.slideNo, 'too_many_items', `section_summary supports at most 10 items, got ${items.length}`);
  }

  const twoCol = items.length > 6;
  const t = ctx.theme;

  const rows = items.slice(0, 10).map((item, i) => {
    const obj = typeof item === 'object' && item !== null ? item : { text: item };
    const text = obj.text ?? obj.label ?? '';
    const detail = obj.detail ? `<div style="font-size: ${t.smallSize}px; color: var(--blue); margin-top: 4px;">${esc(obj.detail)}</div>` : '';
    const goto = Number.isInteger(obj.slide) ? ` data-goto="${obj.slide}"` : '';
    const cursor = goto ? ' cursor: pointer;' : '';
    return `
  <div class="card hoverable"${goto} style="display: flex; align-items: center; gap: 20px; padding: ${twoCol ? '14px 20px' : '18px 24px'};${cursor}">
    <span style="color: var(--blue); font-size: ${t.headingSize + 2}px; font-weight: bold; min-width: 34px;">${String(i + 1).padStart(2, '0')}</span>
    <span style="width: 2.5px; align-self: stretch; background: var(--blue); flex: none;"></span>
    <span>
      <span class="body-text">${esc(text)}</span>
      ${detail}
    </span>
  </div>`;
  });

  const grid = twoCol
    ? `display: grid; grid-template-columns: 1fr 1fr; gap: 14px ${t.gutter}px; align-content: start;`
    : 'display: flex; flex-direction: column; gap: 16px;';

  return `
${slideHeader(slide, ctx)}
<div class="s-body ofc" style="top: ${bodyTop(slide, ctx.theme)}px; ${grid}">
  ${rows.join('\n')}
</div>`;
}
