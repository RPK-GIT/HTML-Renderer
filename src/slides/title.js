/**
 * Title slide: full navy background, centered label / headline /
 * accent bar / subtitle, author & date footer.
 */

import { escapeHtml as esc } from '../page.js';

export const required = ['title'];
export const noFooter = true;

export function render(slide, ctx) {
  const t = ctx.theme;
  const parts = [];
  if (slide.label) {
    parts.push(
      `<div style="color: var(--light-blue); font-size: ${t.smallSize}px; font-weight: bold; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 26px;">${esc(slide.label)}</div>`,
    );
  }
  parts.push(
    `<h1 style="color: var(--white); font-size: ${t.deckTitleSize}px; font-weight: bold; line-height: 1.15; max-width: 940px;">${esc(slide.title)}</h1>`,
  );
  parts.push(
    '<div style="width: 84px; height: 5px; background: var(--blue); border-radius: 2px; margin: 26px auto 0;"></div>',
  );
  if (slide.subtitle) {
    parts.push(
      `<p style="color: var(--light-blue); font-size: ${t.subtitleSize + 2}px; margin-top: 24px; max-width: 860px;">${esc(slide.subtitle)}</p>`,
    );
  }

  const footBits = [slide.author, slide.date].filter(Boolean).map(esc);
  const foot = footBits.length
    ? `<div style="position: absolute; left: 0; right: 0; bottom: 64px; text-align: center; color: var(--light-blue); font-size: ${t.smallSize}px; opacity: 0.9;">${footBits.join(' &middot; ')}</div>`
    : '';

  return `
<div style="position: absolute; inset: 0; background: var(--navy);">
  <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 ${ctx.theme.marginX}px;">
    ${parts.join('\n    ')}
  </div>
  ${foot}
</div>`;
}
