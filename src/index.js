/**
 * Deck orchestration: JSON spec in, standalone HTML + validation report out.
 *
 * The renderer is content-agnostic. The caller decides WHAT to show
 * (semantic structure); the renderer decides HOW to draw it (layout,
 * geometry, colors, typography, spacing).
 */

import { loadTheme } from './theme.js';
import { buildPage, escapeHtml } from './page.js';
import { Validator, checkColors } from './validation.js';
import { slideFooter } from './components.js';
import { loadVisualSpec, validateNavigation } from './html_visual.js';

import * as title from './slides/title.js';
import * as content from './slides/content.js';
import * as sectionSummary from './slides/section_summary.js';
import { twoColumn, threeColumn } from './slides/columns.js';
import * as definition from './slides/definition.js';
import * as takeaway from './slides/takeaway.js';
import * as process_ from './slides/process.js';
import * as hierarchy from './slides/hierarchy.js';
import * as relationship from './slides/relationship.js';
import * as comparison from './slides/comparison.js';
import * as table from './slides/table.js';
import * as imageText from './slides/image_text.js';

/** Slide type registry. Each module exports { required, render }. */
const REGISTRY = {
  title,
  content,
  section_summary: sectionSummary,
  two_column: twoColumn,
  three_column: threeColumn,
  definition,
  takeaway,
  process: process_,
  hierarchy,
  relationship,
  comparison,
  table,
  image_text: imageText,
};

export function registeredTypes() {
  return Object.keys(REGISTRY);
}

function placeholderSlide(slideNo, message, ctx) {
  return `
<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
  <div class="card" style="max-width: 720px; text-align: center;">
    <h3>Slide ${slideNo} could not be rendered</h3>
    <p class="body-text">${escapeHtml(message)}</p>
  </div>
</div>`;
}

/**
 * Render a deck spec to { html, report }.
 * opts: { baseDir } — directory for resolving relative image paths.
 */
export function renderDeck(spec, opts = {}) {
  const validator = new Validator();

  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new Error('Spec must be a JSON object with "deck" and "slides"');
  }

  let theme;
  try {
    theme = loadTheme(spec.theme);
  } catch (err) {
    validator.error(null, 'invalid_theme', err.message);
    theme = loadTheme(null);
  }

  const deckTitle = spec.deck?.title ?? 'Untitled presentation';
  const slides = Array.isArray(spec.slides) ? spec.slides : [];
  if (!slides.length) validator.error(null, 'empty_deck', 'Deck contains no slides');

  // Build slide id → 1-based index map; validate uniqueness
  const idToIndex = new Map();
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (slide && typeof slide === 'object' && slide.id !== undefined && slide.id !== null) {
      const id = String(slide.id);
      if (idToIndex.has(id)) {
        validator.error(null, 'duplicate_slide_id', `Duplicate slide id "${id}" (slides ${idToIndex.get(id)} and ${i + 1})`);
      } else {
        idToIndex.set(id, i + 1);
      }
    }
  }

  // Parse _html_visual spec
  const resolveVisual = loadVisualSpec(spec, idToIndex, validator);

  // Validate navigation targets
  validateNavigation(spec, idToIndex, slides.length, validator);

  const rendered = slides.map((slide, i) => {
    const slideNo = i + 1;
    const ctx = {
      theme,
      deckTitle,
      index: i,
      total: slides.length,
      baseDir: opts.baseDir ?? '.',
      validator,
      slideNo,
      idToIndex,
      visual: resolveVisual(slide?.type, slideNo, slide?.id),
    };

    if (!slide || typeof slide !== 'object') {
      validator.error(slideNo, 'invalid_slide', 'Slide entry is not an object');
      return placeholderSlide(slideNo, 'Slide entry is not an object', ctx);
    }

    const mod = REGISTRY[slide.type];
    if (!mod) {
      validator.error(slideNo, 'unknown_type', `Unsupported slide type: ${JSON.stringify(slide.type)}`);
      return placeholderSlide(slideNo, `Unsupported slide type: ${slide.type}`, ctx);
    }

    const missing = (mod.required ?? []).filter(
      (f) => slide[f] === undefined || slide[f] === null || slide[f] === '',
    );
    if (missing.length) {
      validator.error(slideNo, 'missing_field', `Missing required field(s): ${missing.join(', ')}`);
      return placeholderSlide(slideNo, `Missing required field(s): ${missing.join(', ')}`, ctx);
    }

    checkColors(slide, slideNo, theme, validator);

    try {
      let html = mod.render(slide, ctx);
      // Content slide types get the standard footer unless they opt out.
      if (!mod.noFooter) html += slideFooter(slide, ctx);
      return html;
    } catch (err) {
      validator.error(slideNo, 'render_error', `Slide failed to render: ${err.message}`);
      return placeholderSlide(slideNo, err.message, ctx);
    }
  });

  const html = buildPage({ theme, deckTitle, slides: rendered });
  const report = validator.report({ deck: deckTitle, slide_count: slides.length });
  return { html, report, theme };
}
