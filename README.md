# HTML Slide Renderer

A reusable, generic presentation engine: a structured JSON slide
specification goes in, a polished, interactive **16:9 HTML presentation**
comes out — with an optional high-quality **PDF export**.

- **The caller (a human or an AI agent) decides WHAT to show** — titles,
  bullets, which concept is a process vs. a hierarchy.
- **The renderer decides HOW to draw it** — layout, typography, colors,
  spacing, diagram geometry, overflow handling.

The renderer contains no subject-specific knowledge and never modifies the
content it is given. HTML/CSS handles layout and typography; **SVG** handles
diagrams (processes, hierarchies, relationship maps, cycles, timelines).

It shares the visual identity of the companion
[Deterministic PDF Renderer](https://github.com/RPK-GIT/Deterministic-Renderer)
but is fully independent of it.

## Quick start

```bash
node src/cli.js examples/demo_deck.json -o output/demo_presentation.html
```

Open `output/demo_presentation.html` directly in a browser. No backend, no
network access, no build step — the file is self-contained.

Navigation: **←/→**, **PageUp/PageDown**, **Home/End**, click to advance,
**O** or the grid button for the slide overview, `#5` in the URL deep-links
to slide 5.

## PDF export (optional)

```bash
npm i --no-save playwright && npx playwright install chromium
node export/export_pdf.js output/demo_presentation.html -o output/demo_presentation.pdf
```

One 16:9 page per slide, vector text preserved.

## JSON format

```json
{
  "deck":   { "title": "Deck title shown in the footer" },
  "theme":  { "bodySize": 18 },
  "slides": [ { "type": "...", ... } ]
}
```

`theme` is optional; any key in `src/theme.js` can be overridden. Common
optional fields on content slides: `section` (small caps label above the
title), `subtitle`, `intro`, `source` (rendered verbatim in the footer).

The JSON describes **semantic structure** — never pixel coordinates, sizes
or colors. See `examples/demo_deck.json` for a complete working reference.

## Theme

The default theme uses exactly four colors:

| Color | Hex |
|---|---|
| Navy | `#0E3A66` |
| Blue | `#2E75B6` |
| Light blue | `#D9E8F5` |
| White | `#FFFFFF` |

Typography: Helvetica (Arial fallback); title 32 px, body 17 px, footer
11 px on a logical 1280×720 canvas. Any hex color found in a spec that is
not part of the palette is reported as a validation error.

## Validation

Every render writes `validation_report.json` and `validation_report.md`
next to the HTML file: missing fields, unknown slide types, off-palette
colors, text/diagram overflow, invalid image paths. Each issue carries the
1-based slide number. The generated page also ships a runtime overflow
scanner (`window.__scanOverflow()`) used by the export and inspection
tools.

## Development

See `PROGRESS.md` for the current state, design decisions and next steps.

```bash
npm test                                             # test suite (node --test)
node tools/inspect.js output/demo_presentation.html  # screenshots + overflow scan
```

## Slide types

| type | required fields | notes |
|---|---|---|
| `title` | `title` | optional `subtitle`, `label`, `author`, `date` |
| `section_summary` | `title`, `summary` | numbered rows; `{ "text", "detail?", "slide?" }` — `slide` makes the row a clickable internal link; >6 items → 2 columns |
| `content` | `title` | optional `body`, `bullets`, `callout` |
| `two_column` | `title`, `columns` (2) | each: `heading`, `body`/`bullets`, optional expandable `more` |
| `three_column` | `title`, `columns` (3) | same as above |
| `definition` | `term`, `definition` | optional `notes`, `label`; definition rendered verbatim |
| `process` | `title`, `steps` (2–8) | `{ "label", "detail?" }`; `variant`: `auto`/`horizontal`/`snake`/`cycle`, cycle takes optional `center` |
| `hierarchy` | `title`, `root`, `children` (≤6) | children: string or `{ "label", "children": [≤4 strings] }`; hover highlights a branch |
| `relationship` | `title`, `nodes` (2–8), `edges` | hub auto-detected or `variant: "radial"`; optional `directed`, per-edge `label`; hover highlights connections |
| `comparison` | `title`, `left`, `right` | each: `heading`, `points`; optional `divider` text |
| `table` | `title`, `columns` (2–6), `rows` | optional `align` per column, `emphasize_first_column` |
| `image_text` | `title`, `image` | `{ "path", "fit?", "caption?", "alt?" }`, `image_side`, `bullets`/`body` |
| `takeaway` | `statement` | optional `points` (≤3), `title` |

Common optional fields on content slides: `section`, `subtitle`, `intro`, `source`.
