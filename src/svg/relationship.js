/**
 * Relationship / concept map auto-layout.
 *
 * A node connected to every other node (or the highest-degree node when
 * variant is "radial") is placed in the center in navy; the remaining
 * nodes sit on an ellipse in the order given. Edges are gently curved
 * with halo labels. Nodes/edges carry data attributes so the page script
 * can highlight the hovered node's connections.
 */

import { fittedText, nodeRect, arrowMarker, connector, haloLabel, svgOpen } from './core.js';

export function relationshipSvg(slide, { width: W, height: H, theme: t, uid }) {
  const problems = [];
  const report = (msg) => problems.push(msg);

  const nodes = slide.nodes ?? [];
  const edges = (slide.edges ?? []).filter((e) => {
    const ok = nodes.some((n) => n.id === e.from) && nodes.some((n) => n.id === e.to);
    if (!ok) report(`edge ${e.from} -> ${e.to} references an unknown node id`);
    return ok;
  });

  const degree = Object.fromEntries(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    degree[e.from]++;
    degree[e.to]++;
  }

  // hub detection
  let hub = null;
  if (slide.variant === 'radial' && nodes.length >= 3) {
    hub = nodes.reduce((a, b) => (degree[b.id] > degree[a.id] ? b : a), nodes[0]);
  } else if (nodes.length >= 4) {
    hub = nodes.find((n) => degree[n.id] === nodes.length - 1) ?? null;
  }

  const ring = nodes.filter((n) => n !== hub);
  const nodeW = nodes.length > 6 ? 176 : 196;
  const nodeH = 62;
  const cx0 = W / 2;
  const cy0 = H / 2;
  const rx = W / 2 - nodeW / 2 - 6;
  const ry = H / 2 - nodeH / 2 - 6;

  const pos = new Map();
  if (hub) pos.set(hub.id, { x: cx0, y: cy0 });
  ring.forEach((n, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / ring.length;
    pos.set(n.id, { x: cx0 + rx * Math.cos(a), y: cy0 + ry * Math.sin(a) });
  });

  const geom = (id) => {
    const p = pos.get(id);
    return { cx: p.x, cy: p.y, hw: nodeW / 2, hh: nodeH / 2 };
  };

  const parts = [];
  const labelParts = [];
  const globallyDirected = slide.directed === true;

  edges.forEach((e) => {
    const directed = e.directed ?? globallyDirected;
    // Hub spokes stay straight; edges between ring nodes bow outward,
    // away from the center, so they never cross the hub node.
    const isSpoke = hub && (e.from === hub.id || e.to === hub.id);
    let curve = 0;
    if (!isSpoke) {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      // sign of the perpendicular that points away from the diagram center
      const side = -dy * (mx - cx0) + dx * (my - cy0);
      curve = (side >= 0 ? 1 : -1) * (hub ? 0.24 : 0.10);
    }
    const { svg, labelX, labelY } = connector({
      from: geom(e.from),
      to: geom(e.to),
      color: t.blue,
      width: t.strokeWidth + 0.3,
      curve,
      arrow: directed ? uid : null,
    });
    parts.push(`<g data-edge data-from="${e.from}" data-to="${e.to}">${svg}</g>`);
    if (e.label) {
      labelParts.push(
        `<g data-edge data-from="${e.from}" data-to="${e.to}">${haloLabel(e.label, labelX, labelY, { size: 12.5, color: t.blue })}</g>`,
      );
    }
  });

  nodes.forEach((n) => {
    const p = pos.get(n.id);
    const isHub = hub && n.id === hub.id;
    const g = [];
    g.push(
      nodeRect({
        x: p.x - nodeW / 2, y: p.y - nodeH / 2, w: nodeW, h: nodeH,
        fill: isHub ? t.navy : t.lightBlue,
        stroke: isHub ? null : t.blue,
        strokeWidth: t.strokeWidth,
        rx: t.cornerRadius,
      }),
    );
    const label = fittedText(String(n.label ?? n.id), {
      cx: p.x, cy: p.y, width: nodeW - 26, size: 16, minSize: 12, bold: true,
      color: isHub ? t.white : t.navy, maxLines: 2,
    });
    g.push(label.svg);
    if (!label.fits) report(`node "${n.label ?? n.id}" label does not fit`);
    parts.push(`<g data-node="${n.id}" class="r-node">${g.join('')}</g>`);
  });

  const svg = [
    svgOpen(W, H, `class="rel" aria-label="Relationship diagram"`),
    `<defs>${arrowMarker(uid, t.blue)}</defs>`,
    parts.join('\n'),
    labelParts.join('\n'),
    '</svg>',
  ].join('\n');
  return { svg, problems };
}
