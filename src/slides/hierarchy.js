/**
 * Hierarchy slide: title + auto-laid-out SVG tree (root / children /
 * grandchildren). Hovering a branch highlights it in the browser.
 *
 * Also supports the "principles_explorer" visual mode: a split-panel
 * interactive layout with group cards on the left and a detail / source
 * annotation panel on the right.
 *
 * Also supports the "annotated_hierarchy" visual mode: the same SVG tree
 * as default but with clickable nodes that show a floating source popover.
 */

import { slideHeader, diagramRegion, bodyTop } from '../components.js';
import { escapeHtml as esc } from '../page.js';
import { hierarchySvg } from '../svg/hierarchy.js';

export const required = ['title', 'root', 'children'];

export function render(slide, ctx) {
  if (ctx.visual?.mode === 'principles_explorer') {
    return renderPrinciplesExplorer(slide, ctx);
  }

  const children = slide.children;
  if (!Array.isArray(children) || children.length < 1 || children.length > 6) {
    throw new Error(`"children" must be an array of 1-6 items (got ${Array.isArray(children) ? children.length : typeof children})`);
  }
  for (const c of children) {
    const gcs = typeof c === 'object' && c !== null ? c.children ?? [] : [];
    if (gcs.length > 4) throw new Error(`at most 4 sub-items per child (got ${gcs.length})`);
  }

  // Build nav targets: resolve ids to 1-based indices
  const rawNav = ctx.visual?.navigation ?? {};
  const navTargets = {};
  for (const [label, target] of Object.entries(rawNav)) {
    if (typeof target === 'number') {
      navTargets[label] = target;
    } else if (typeof target === 'string' && ctx.idToIndex?.has(target)) {
      navTargets[label] = ctx.idToIndex.get(target);
    }
    // unknown targets: silently skip (validated elsewhere)
  }

  // Build annotatedLabels set from source_annotations keys
  const annotations = ctx.visual?.source_annotations ?? {};
  const annotatedLabels = new Set(Object.keys(annotations));

  const region = diagramRegion(slide, ctx.theme);
  const { svg, problems } = hierarchySvg(slide, {
    width: region.width,
    height: region.height,
    theme: ctx.theme,
    uid: `arrow-s${ctx.slideNo}`,
    navTargets,
    annotatedLabels,
  });
  for (const p of problems) ctx.validator.error(ctx.slideNo, 'diagram_overflow', p);

  // When annotations exist, inject data attributes into SVG and add a data island
  if (annotatedLabels.size > 0) {
    const svgWithAttr = svg.replace('<svg ', `<svg data-slide-no="${ctx.slideNo}" data-annotated="true" `);
    const annotationsJson = JSON.stringify(annotations).replace(/<\//g, '<\/');
    return `
${slideHeader(slide, ctx)}
<script type="application/json" id="ann-data-${ctx.slideNo}">${annotationsJson}</script>
<div class="s-body" style="top: ${region.top}px;">${svgWithAttr}</div>`;
  }

  return `
${slideHeader(slide, ctx)}
<div class="s-body" style="top: ${region.top}px;">${svg}</div>`;
}

/**
 * Renders a hierarchy slide as a split-panel "principles explorer":
 * - Left panel: group cards (one per child) with principle chips
 * - Right panel: detail + source annotation text (populated by JS)
 */
function renderPrinciplesExplorer(slide, ctx) {
  const annotations = ctx.visual?.source_annotations ?? {};
  const slideNo = ctx.slideNo;

  const rawChildren = slide.children ?? [];
  const groups = rawChildren.map((c) => {
    if (typeof c === 'string') return { label: c, principles: [] };
    return { label: String(c.label ?? ''), principles: (c.children ?? []).map(String) };
  });

  // Left panel: group cards
  const leftCards = groups.map((g, i) => {
    const chips = g.principles.map((p) =>
      `<span class="prin-chip">${esc(p)}</span>`
    ).join('');
    const chipsHtml = chips ? `<div class="prin-chips">${chips}</div>` : '';
    return `<div class="prin-group-card hoverable" data-group-label="${esc(g.label)}" data-group-idx="${i}" data-principles="${esc(JSON.stringify(g.principles))}">
  <div class="prin-group-label">${esc(g.label)}</div>
  ${chipsHtml}
</div>`;
  }).join('\n');

  // Safely embed annotations as a JSON data island (not executed by browser).
  // Replace </ to prevent accidental </script> from closing the tag.
  const annotationsJson = JSON.stringify(annotations).replace(/<\//g, '<\/');

  const top = bodyTop(slide, ctx.theme);

  return `
${slideHeader(slide, ctx)}
<div class="s-body" style="top: ${top}px;">
  <script type="application/json" id="prin-annotations-${slideNo}">${annotationsJson}</script>
  <div class="prin-explorer" data-slide-no="${slideNo}">
    <div class="prin-left">${leftCards}</div>
    <div class="prin-right">
      <div class="prin-right-inner" id="prin-panel-inner-${slideNo}"></div>
    </div>
  </div>
</div>`;
}
