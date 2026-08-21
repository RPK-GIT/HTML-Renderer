# PROGRESS

Project: **Generic HTML/SVG presentation renderer** (JSON spec → 16:9 HTML deck, optional PDF export).
Design reference: https://github.com/RPK-GIT/Deterministic-Renderer (visual identity only — no code dependency).

## Current phase

**All 5 phases complete.** The renderer is feature-complete, tested (39/39 passing) and
visually inspected. Remaining work is optional polish only (see "Possible future work").

**Canonical shared JSON specification documented (2026-08-21).** This renderer
now has a formally specified input contract shared with the Deterministic PDF
Renderer. See `CANONICAL_SLIDE_SPEC.md` and `canonical_slide_schema.json` in
the consuming project. One JSON spec → both renderers.

## Design decisions (read this first when resuming)

- **Stack:** plain Node.js (>=18, ESM), zero runtime dependencies. Playwright is a dev/export
  dependency only (`npm i --no-save playwright`, `npx playwright install chromium`).
- **Output:** one self-contained HTML file (inline CSS + JS + data-URI images; no network).
- **Canvas:** logical 1280×720 px (16:9). JS sets `--scale` on `#deck` to fit the viewport.
  Slides are stacked `.frame > section.slide`, crossfade via opacity (all slides stay laid
  out, so runtime measurement works at opacity 0).
- **Theme (`src/theme.js`):** exactly 4 colors — Navy `#0E3A66`, Blue `#2E75B6`,
  Light blue `#D9E8F5`, White `#FFFFFF`. Helvetica/Arial. Title 32, body 17, footer 11 px.
  Deck JSON may override any theme key via `"theme": {...}`; unknown keys rejected.
- **Slide registry:** `src/slides/<type>.js` exports `{ required, render(slide, ctx), noFooter? }`,
  registered in `src/index.js`. Failed slides become placeholder cards (numbering survives).
- **Validation:** build-time (Validator → validation_report.json/.md; off-palette colors,
  missing fields, diagram/table overflow via Helvetica AFM text metrics in
  `src/textmetrics.js`) + runtime in-page overflow scanner (`window.__scanOverflow()`),
  merged into the report by `export/export_pdf.js` (issues tagged `source: "runtime"`).
- **Diagrams (`src/svg/`):** core.js (fitted text, boundary-trimmed connectors, markers),
  process.js (horizontal / snake with curved U-turn / cycle on ellipse with center label),
  hierarchy.js (navy/blue/light-blue levels, elbow connectors, CSS branch hover),
  relationship.js (hub auto-detect or `variant: "radial"`, outward-bowed curves, halo edge
  labels, JS hover highlighting of connections).
- **Print/PDF:** `@page { size: 1280px 720px }`, `@media print` unstacks frames one per
  page; Playwright `page.pdf()` → exact 960×540 pt pages (16:9), vector text.

## Completed

- [x] Phase 1: theme, 16:9 scaling shell, nav (arrows/PageUp/Down/Home/End/click/hash),
  HUD counter (auto-hide), overview grid (O/Esc), title slide, CLI, validator, inspect tool.
- [x] Phase 2: content, section_summary (clickable roadmap rows), two_column, three_column
  (optional expandable "more"), definition (verbatim text), takeaway.
- [x] Phase 3: SVG engine — process (3 variants), hierarchy, relationship + hover interactivity.
- [x] Phase 4: comparison (VS divider), table (navy header, zebra, align, density-aware
  sizing, row-budget errors), image_text (PNG/JPG/SVG as data URI, contain/cover/center,
  aspect always preserved, missing-path validation).
- [x] Phase 5: PDF export with runtime-overflow merge; 12-slide fictional demo deck
  (examples/demo_deck.json — remote-workshops theme, invented content); full test suite;
  visual inspection of every slide; HTML↔PDF comparison.

## Tests

`npm test` (node --test): **39 passing, 0 failing** — theme palette/dimensions/overrides,
text metrics (measure/wrap/fit), JSON parsing, registry completeness, placeholder isolation,
color policing, verbatim definitions, page shell, all three diagram types, tables, images,
columns/comparison/summary, and (via Playwright) keyboard navigation, 16:9 scaling,
runtime overflow detection, PDF export (page count + 960×540 MediaBox). Browser tests
auto-skip if Playwright is missing.

## Visual inspection (2026-08-21, headless Chromium 1280×720)

All 12 slides screenshotted (tools/inspect.js → tmp/) and reviewed; PDF pages compared
against HTML for title, cycle-process and takeaway slides — visually identical.

- ✅ all slides render; zero validation and zero runtime-overflow issues
- ✅ navigation, counter, overview verified by automated browser tests
- ✅ palette/typography/spacing match the reference PDF renderer's look
- ✅ richer-than-PDF slides: cycle process with curved arrows (6), hover-highlighting
  hierarchy (7), radial concept map with curved edges (8), clickable roadmap (2),
  hover-lift cards throughout

## Known issues

- Edge labels on relationship maps can sit close together on dense graphs (readable in
  demo; a label-collision pass would be the proper fix).
- `fit: "center"` (object-fit: none) crops images larger than the box by design; caller
  should prefer contain/cover for large images.

## Possible future work (not required)

- Timeline/layered-architecture diagram variants; label collision avoidance.
- Speaker notes + presenter view; URL-hash fragment steps for progressive highlighting.

## How to run

```bash
node src/cli.js examples/demo_deck.json -o output/demo_presentation.html
node export/export_pdf.js output/demo_presentation.html -o output/demo_presentation.pdf
npm test
node tools/inspect.js output/demo_presentation.html   # screenshots to tmp/
```
