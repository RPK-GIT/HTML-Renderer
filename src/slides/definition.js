/**
 * Definition slide: light-blue card with a thick blue left bar, caps
 * "DEFINITION" label, the term, and the definition text in italics.
 *
 * The definition text is IMMUTABLE: it is escaped for HTML safety but
 * never paraphrased, truncated, shortened or otherwise rewritten.
 */

import { slideHeader, bulletList, bodyTop } from '../components.js';
import { escapeHtml as esc } from '../page.js';

export const required = ['term', 'definition'];

export function render(slide, ctx) {
  const t = ctx.theme;
  const header = { ...slide, title: slide.title ?? `Defining ${slide.term}` };
  const label = slide.label ?? 'Definition';

  const notes = slide.notes
    ? `<div style="margin-top: 40px; padding: 0 32px;">${bulletList(slide.notes, ctx)}</div>`
    : '';

  return `
${slideHeader(header, ctx)}
<div class="s-body ofc" style="top: ${bodyTop(header, t) + 20}px;">
  <div style="display: flex; max-width: 1010px; margin: 0 auto;">
    <div style="width: 7px; background: var(--blue); border-radius: 3px 0 0 3px; flex: none;"></div>
    <div class="card" style="border-radius: 0 var(--radius) var(--radius) 0; padding: 30px 38px; flex: 1;">
      <div style="color: var(--blue); font-size: ${t.labelSize}px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px;">${esc(label)}</div>
      <div style="color: var(--navy); font-size: ${t.headingSize + 6}px; font-weight: bold; margin-bottom: 16px;">${esc(slide.term)}</div>
      <div style="color: var(--navy); font-size: ${t.bodySize + 2}px; line-height: var(--leading); font-style: italic;">&ldquo;${esc(slide.definition)}&rdquo;</div>
    </div>
  </div>
  ${notes}
</div>`;
}
