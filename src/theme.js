/**
 * Centralized design theme.
 *
 * Every visual constant lives here: palette, typography, slide geometry,
 * shape defaults and motion settings. Components never hard-code visual
 * values; they read them from a theme object so a deck-level `theme`
 * override block can restyle everything consistently.
 *
 * The default palette is intentionally restricted to exactly four colors,
 * matching the companion deterministic PDF renderer.
 */

export const DEFAULT_THEME = Object.freeze({
  // ---- palette (the only colors the default theme may use) ----
  navy: '#0E3A66',
  blue: '#2E75B6',
  lightBlue: '#D9E8F5',
  white: '#FFFFFF',

  // ---- typography ----
  fontFamily: 'Helvetica, Arial, "Helvetica Neue", sans-serif',
  deckTitleSize: 44, // title slide headline
  titleSize: 32, // content slide title
  subtitleSize: 19,
  headingSize: 18,
  bodySize: 17,
  smallSize: 14,
  labelSize: 13, // small caps section label above titles
  footerSize: 11,
  minBodySize: 12, // shrink-to-fit floor
  leading: 1.35, // line-height as multiple of font size

  // ---- slide geometry (logical pixels, 16:9) ----
  slideWidth: 1280,
  slideHeight: 720,
  marginX: 72,
  marginTop: 52,
  marginBottom: 46,
  gutter: 32,

  // ---- shape defaults ----
  cornerRadius: 10,
  strokeWidth: 1.5,
  arrowWidth: 2,
  shadow: '0 2px 10px rgba(14, 58, 102, 0.10)',

  // ---- motion (kept subtle; 0 disables) ----
  transitionMs: 250,
});

/** Every solid color the default theme is allowed to place on a slide. */
export function palette(theme = DEFAULT_THEME) {
  return new Set(
    [theme.navy, theme.blue, theme.lightBlue, theme.white].map((c) => c.toUpperCase()),
  );
}

/**
 * Build a theme from optional JSON overrides. Unknown keys are rejected so
 * a typo cannot silently fall back to defaults.
 */
export function loadTheme(overrides) {
  if (!overrides || Object.keys(overrides).length === 0) return DEFAULT_THEME;
  const unknown = Object.keys(overrides).filter((k) => !(k in DEFAULT_THEME));
  if (unknown.length) {
    throw new Error(`Unknown theme keys: ${unknown.sort().join(', ')}`);
  }
  return Object.freeze({ ...DEFAULT_THEME, ...overrides });
}
