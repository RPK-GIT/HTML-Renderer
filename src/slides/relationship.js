/**
 * Relationship / concept-map slide: title + auto-laid-out SVG network.
 * A hub node (fully connected, or forced with variant "radial") is placed
 * in the center. Hovering a node highlights its connections.
 */

import { slideHeader, diagramRegion } from '../components.js';
import { relationshipSvg } from '../svg/relationship.js';

export const required = ['title', 'nodes', 'edges'];

export function render(slide, ctx) {
  const nodes = slide.nodes;
  if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > 8) {
    throw new Error(`"nodes" must be an array of 2-8 items (got ${Array.isArray(nodes) ? nodes.length : typeof nodes})`);
  }
  const ids = new Set();
  for (const n of nodes) {
    if (!n || typeof n !== 'object' || !n.id) throw new Error('every node needs an "id"');
    if (ids.has(n.id)) throw new Error(`duplicate node id "${n.id}"`);
    ids.add(n.id);
  }
  if (!Array.isArray(slide.edges)) throw new Error('"edges" must be an array');

  const region = diagramRegion(slide, ctx.theme);
  const { svg, problems } = relationshipSvg(slide, {
    width: region.width,
    height: region.height,
    theme: ctx.theme,
    uid: `arrow-s${ctx.slideNo}`,
  });
  for (const p of problems) ctx.validator.error(ctx.slideNo, 'diagram_overflow', p);

  return `
${slideHeader(slide, ctx)}
<div class="s-body" style="top: ${region.top}px;">${svg}</div>`;
}
