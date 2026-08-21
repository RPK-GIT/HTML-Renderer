/**
 * Table slide: presentation-quality table with navy header row, zebra
 * striping (white / light-blue), wrapped cells, per-column alignment and
 * optional emphasized first column. Row count is bounded and font size
 * steps down for dense tables so the table never leaves the slide.
 */

import { slideHeader, diagramRegion } from '../components.js';
import { escapeHtml as esc } from '../page.js';

export const required = ['title', 'columns', 'rows'];

export function render(slide, ctx) {
  const t = ctx.theme;
  const cols = slide.columns;
  const rows = slide.rows;
  if (!Array.isArray(cols) || cols.length < 2 || cols.length > 6) {
    throw new Error(`"columns" must be an array of 2-6 items (got ${Array.isArray(cols) ? cols.length : typeof cols})`);
  }
  if (!Array.isArray(rows) || !rows.length) throw new Error('"rows" must be a non-empty array');
  rows.forEach((r, i) => {
    if (!Array.isArray(r) || r.length !== cols.length) {
      throw new Error(`row ${i + 1} must have exactly ${cols.length} cells`);
    }
  });

  const region = diagramRegion(slide, t);
  // Budget vertical space; shrink font for dense tables, then bound rows.
  const fontSize = rows.length > 8 ? t.smallSize - 1 : rows.length > 5 ? t.smallSize : t.smallSize + 1;
  const rowH = Math.ceil(fontSize * t.leading) + 18;
  const maxRows = Math.floor((region.height - rowH - 10) / rowH);
  if (rows.length > maxRows) {
    ctx.validator.error(
      ctx.slideNo,
      'table_overflow',
      `Table has ${rows.length} rows but only ${maxRows} fit; split the slide`,
    );
  }
  const shown = rows.slice(0, maxRows);

  const align = Array.isArray(slide.align) ? slide.align : cols.map(() => 'left');
  const alignCss = (i) => (align[i] === 'right' ? 'right' : align[i] === 'center' ? 'center' : 'left');
  const emphasizeFirst = slide.emphasize_first_column !== false;

  const thead = `<tr>${cols
    .map((c, i) => `<th style="text-align: ${alignCss(i)};">${esc(c)}</th>`)
    .join('')}</tr>`;

  const tbody = shown
    .map(
      (r) =>
        `<tr>${r
          .map((cell, i) => {
            const bold = emphasizeFirst && i === 0 ? ' font-weight: bold;' : '';
            return `<td style="text-align: ${alignCss(i)};${bold}">${esc(cell)}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('\n');

  return `
${slideHeader(slide, ctx)}
<div class="s-body ofc" style="top: ${region.top}px;">
  <table class="p-table" style="font-size: ${fontSize}px;">
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
</div>`;
}
