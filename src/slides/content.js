/**
 * Content slide: title + optional body paragraph, bullet list and callout.
 */

import { slideHeader, bulletList, callout, bodyTop } from '../components.js';
import { escapeHtml as esc } from '../page.js';

export const required = ['title'];

export function render(slide, ctx) {
  const parts = [];
  if (slide.body) parts.push(`<p class="body-text" style="max-width: 920px; margin-bottom: 22px;">${esc(slide.body)}</p>`);
  if (slide.bullets) parts.push(bulletList(slide.bullets, ctx));
  if (slide.callout) parts.push(`<div style="margin-top: 26px; max-width: 920px;">${callout(slide.callout)}</div>`);

  return `
${slideHeader(slide, ctx)}
<div class="s-body ofc" style="top: ${bodyTop(slide, ctx.theme)}px;">
  ${parts.join('\n  ')}
</div>`;
}
