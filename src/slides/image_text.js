/**
 * Image + explanation slide. The image sits on one side (image_side:
 * "left" | "right", default left) with bullets/body on the other.
 *
 * Supported formats: PNG, JPG/JPEG, SVG. Images are embedded as data URIs
 * so the output HTML stays self-contained, and are always rendered with
 * preserved aspect ratio (fit: "contain" | "cover" | "center").
 */

import fs from 'node:fs';
import path from 'node:path';
import { slideHeader, bulletList, bodyTop } from '../components.js';
import { escapeHtml as esc } from '../page.js';

export const required = ['title', 'image'];

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function loadImage(spec, ctx) {
  const rel = typeof spec === 'string' ? spec : spec.path;
  if (!rel) throw new Error('"image" needs a "path"');
  const ext = path.extname(rel).toLowerCase();
  const mime = MIME[ext];
  if (!mime) throw new Error(`Unsupported image format "${ext}" (PNG, JPG, SVG allowed)`);
  const abs = path.resolve(ctx.baseDir, rel);
  if (!fs.existsSync(abs)) {
    ctx.validator.error(ctx.slideNo, 'invalid_image_path', `Image not found: ${rel}`);
    return null;
  }
  const data = fs.readFileSync(abs);
  if (data.length > 3 * 1024 * 1024) {
    ctx.validator.warning(ctx.slideNo, 'large_image', `Image ${rel} is ${(data.length / 1048576).toFixed(1)} MB; the HTML file will be heavy`);
  }
  return `data:${mime};base64,${data.toString('base64')}`;
}

export function render(slide, ctx) {
  const t = ctx.theme;
  const spec = typeof slide.image === 'string' ? { path: slide.image } : slide.image;
  const fit = ['contain', 'cover', 'center'].includes(spec.fit) ? spec.fit : 'contain';
  const objectFit = fit === 'center' ? 'none' : fit;
  const uri = loadImage(spec, ctx);

  const imgBox = uri
    ? `<div style="background: var(--light-blue); border-radius: var(--radius); overflow: hidden; height: 100%; display: flex; flex-direction: column;">
        <img src="${uri}" alt="${esc(spec.alt ?? spec.caption ?? 'Slide image')}" style="flex: 1; min-height: 0; width: 100%; object-fit: ${objectFit}; object-position: center;">
        ${spec.caption ? `<div style="padding: 10px 16px; font-size: ${t.smallSize - 1}px; color: var(--blue); text-align: center;">${esc(spec.caption)}</div>` : ''}
      </div>`
    : `<div class="card" style="height: 100%; display: flex; align-items: center; justify-content: center; text-align: center;">
        <span class="body-text">Image not found:<br>${esc(spec.path ?? '')}</span>
      </div>`;

  const textBits = [];
  if (slide.body) textBits.push(`<p class="body-text" style="margin-bottom: 18px;">${esc(slide.body)}</p>`);
  if (slide.bullets) textBits.push(bulletList(slide.bullets, ctx));
  const textBox = `<div style="align-self: start;">${textBits.join('')}</div>`;

  const imageLeft = (slide.image_side ?? 'left') !== 'right';
  const colTemplate = imageLeft ? '1.1fr 1fr' : '1fr 1.1fr';

  return `
${slideHeader(slide, ctx)}
<div class="s-body ofc" style="top: ${bodyTop(slide, t)}px; display: grid; grid-template-columns: ${colTemplate}; gap: ${t.gutter + 8}px;">
  ${imageLeft ? imgBox + textBox : textBox + imgBox}
</div>`;
}
