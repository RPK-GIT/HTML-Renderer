# PROGRESS

Project: **Generic HTML/SVG presentation renderer** (JSON spec → 16:9 HTML deck, optional PDF export).
Design reference: https://github.com/RPK-GIT/Deterministic-Renderer (visual identity only — no code dependency).

## Current phase

Phase 1 complete → starting Phase 2 (JSON parser hardening, basic components, more slide types).

## Design decisions (read this first when resuming)

- **Stack:** plain Node.js (>=18, ESM), zero runtime dependencies. Playwright is a dev/export
  dependency only (`npm i --no-save playwright`, `npx playwright install chromium`).
- **Output:** one self-contained HTML file (inline CSS + JS, no network, no backend).
- **Canvas:** logical 1280×720 px (16:9). JS sets `--scale` on `#deck` to fit the viewport,
  preserving ratio. Slides are stacked `.frame > section.slide`, crossfade via opacity
  (all slides stay laid out, so runtime measurement works at opacity 0).
- **Theme (`src/theme.js`):** exactly 4 colors — Navy `#0E3A66`, Blue `#2E75B6`,
  Light blue `#D9E8F5`, White `#FFFFFF`. Helvetica/Arial. Title 32, body 17, footer 11 px
  (PDF renderer values × 4/3). Deck JSON may override any theme key via `"theme": {...}`;
  unknown keys rejected.
- **Slide chrome:** `.s-head` (blue caps section label, navy title, 60×5 blue accent bar,
  optional subtitle/intro), `.s-foot` (thin blue rule; deck title left; source + `n / N` right).
  Matches the PDF renderer's look (inspected rasterized pages of its demo PDF).
- **Slide registry:** `src/slides/<type>.js` exports `{ required: [...], render(slide, ctx), noFooter? }`,
  registered in `src/index.js` REGISTRY. Failed slides become placeholder cards (numbering survives).
- **Validation:** build-time (`src/validation.js`, Validator → validation_report.json/.md next to
  output; off-palette hex colors in specs are errors) + runtime in-page overflow scanner
  (`window.__scanOverflow()` → `window.__validation`), used by tools/inspect.js and the PDF exporter.
- **Text metrics:** `src/textmetrics.js` — embedded Helvetica AFM widths; measure/wrap/fitText
  for SVG diagram label layout and overflow prediction.
- **Print/PDF:** `@page { size: 1280px 720px }`, `@media print` unstacks frames one per page.
  Export via Playwright `page.pdf()` (Phase 5).

## Completed

- [x] Inspected Deterministic-Renderer (README, theme.py, rasterized demo PDF pages).
- [x] Project structure, package.json (scripts: render / export / test), .gitignore.
- [x] `src/theme.js` — palette, typography, geometry, overrides with unknown-key rejection.
- [x] `src/textmetrics.js` — Helvetica metrics, wrapText, fitText.
- [x] `src/page.js` — page shell: scaling stage, keyboard nav (arrows/PageUp/Down/Home/End),
  slide counter HUD, click-to-advance, overview grid (O/Esc), hash deep links,
  expandable sections + `data-goto` internal links, print CSS, runtime overflow scan.
- [x] `src/components.js` — slideHeader, slideFooter, bulletList, card, callout.
- [x] `src/validation.js` — Validator, palette check, report writers.
- [x] `src/index.js` — orchestration, registry, placeholder slides, footer injection.
- [x] `src/cli.js` — CLI, exit code 1 on validation errors.
- [x] `src/slides/title.js` — first working slide type.
- [x] `examples/demo_deck.json` — title slide only (grows with each phase).
- [x] `tools/inspect.js` — headless Chromium screenshots + overflow scan.
- [x] Visual check in Chromium: title slide matches PDF renderer identity, no overflow.

## In progress

- Phase 2: content, two_column, three_column, definition, section_summary, takeaway slide types.

## Tests

- None yet (planned Phase 5 with `node --test`; earlier if convenient).

## Visual inspection

- Slide 1 (title): ✅ navy background, caps label, white headline, blue accent bar,
  light-blue subtitle, footer — matches reference PDF page 1.

## Known issues

- None currently.

## Next steps

1. Phase 2: text slide types + section_summary numbered rows; extend demo deck.
2. Phase 3: SVG diagram engine (process incl. curved/cycle variants, hierarchy, relationship/radial).
3. Phase 4: comparison, table, image_text; static overflow prediction wired into validation.
4. Phase 5: PDF export script (`export/export_pdf.js`), full demo deck (10–12 slides),
   tests, full visual inspection, HTML↔PDF comparison.

## How to run

```bash
node src/cli.js examples/demo_deck.json -o output/demo_presentation.html
node tools/inspect.js output/demo_presentation.html   # screenshots to tmp/
```
