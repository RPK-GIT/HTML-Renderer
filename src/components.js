/**
 * Reusable slide components: header chrome, footer, bullet lists, cards,
 * callouts. Every content slide type composes these instead of emitting
 * bespoke markup, so the visual identity stays consistent.
 */

import { escapeHtml as esc } from './page.js';

/**
 * Standard content-slide header: optional small caps section label,
 * title, blue accent bar, optional subtitle / intro sentence.
 */
export function slideHeader(slide, ctx) {
  const parts = [];
  if (slide.section) parts.push(`<div class="s-label">${esc(slide.section)}</div>`);
  parts.push(`<h2 class="s-title">${esc(slide.title ?? '')}</h2>`);
  parts.push('<div class="s-accent"></div>');
  if (slide.subtitle) parts.push(`<p class="s-subtitle">${esc(slide.subtitle)}</p>`);
  if (slide.intro) parts.push(`<p class="s-intro">${esc(slide.intro)}</p>`);
  return `<header class="s-head">${parts.join('')}</header>`;
}

/**
 * Standard footer: deck title left, verbatim source + page counter right.
 */
export function slideFooter(slide, ctx) {
  const right = [];
  if (slide.source) right.push(`<span class="src">Source: ${esc(slide.source)}</span>`);
  right.push(`<span>${ctx.index + 1} / ${ctx.total}</span>`);
  return `<footer class="s-foot"><span>${esc(ctx.deckTitle)}</span><span class="src">${right.join(
    '&nbsp;&nbsp;&middot;&nbsp;&nbsp;',
  )}</span></footer>`;
}

/**
 * Bullet list. Items are strings or { text, sub: [...] } objects.
 */
export function bulletList(items, ctx, { small = false } = {}) {
  if (!Array.isArray(items) || !items.length) return '';
  const lis = items
    .map((item) => {
      if (item && typeof item === 'object') {
        const sub = Array.isArray(item.sub) && item.sub.length
          ? `<ul class="sub">${item.sub.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
          : '';
        return `<li>${esc(item.text ?? '')}${sub}</li>`;
      }
      return `<li>${esc(item)}</li>`;
    })
    .join('');
  return `<ul class="bullets${small ? ' small' : ''}">${lis}</ul>`;
}

/** Light-blue rounded card with optional heading and blue top accent. */
export function card({ heading, bodyHtml, accent = true, hoverable = false, extraClass = '' }) {
  const cls = ['card', accent ? 'card-accent' : '', hoverable ? 'hoverable' : '', extraClass]
    .filter(Boolean)
    .join(' ');
  const h = heading ? `<h3>${esc(heading)}</h3>` : '';
  return `<div class="${cls}">${h}${bodyHtml ?? ''}</div>`;
}

/** Navy callout strip for emphasized statements. */
export function callout(text) {
  return `<div class="callout">${esc(text)}</div>`;
}

/**
 * Vertical position (px) where the body region starts, given which header
 * elements the slide uses. Keeps all slide types aligned consistently.
 */
export function bodyTop(slide, theme) {
  let top = theme.marginTop + 24 + theme.titleSize * 1.15 + 14 + 5 + 26; // label+title+accent+gap
  if (slide.subtitle) top += theme.subtitleSize * 1.3 + 14;
  if (slide.intro) top += theme.bodySize * theme.leading + 18;
  return Math.round(top);
}
