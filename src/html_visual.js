/**
 * HTML-specific visual enhancement spec parser.
 *
 * Reads the optional `_html_visual` block from the deck spec and returns a
 * resolver function that, for each slide, merges defaults / by_type / by_slide
 * overrides (by_slide wins).
 *
 * This module never throws; all validation issues are warnings so a bad visual
 * spec never breaks deck rendering.
 */

/** Known slide types and the modes they support. */
export const KNOWN_MODES = {
  hierarchy: ['interactive_hierarchy', 'principles_explorer', 'annotated_hierarchy'],
  process: ['sequential_reveal'],
  // all other types have no special modes yet
};

const KNOWN_TYPES = new Set(Object.keys(KNOWN_MODES));

/**
 * Parse `spec._html_visual` and return a `resolveVisual(type, index1, id)` fn.
 *
 * @param {object} spec          - The full deck spec object
 * @param {Map}    idToIndex     - Map of slide id → 1-based slide index
 * @param {object} validator     - Validator instance with .warning()
 */
export function loadVisualSpec(spec, idToIndex, validator) {
  const raw = spec._html_visual;

  // Absent or non-object → always return {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return function resolveVisual() { return {}; };
  }

  const defaults = (raw.defaults && typeof raw.defaults === 'object' && !Array.isArray(raw.defaults))
    ? raw.defaults
    : {};

  const byType = (raw.by_type && typeof raw.by_type === 'object' && !Array.isArray(raw.by_type))
    ? raw.by_type
    : {};

  const bySlide = (raw.by_slide && typeof raw.by_slide === 'object' && !Array.isArray(raw.by_slide))
    ? raw.by_slide
    : {};

  // Validate by_type keys and mode values
  for (const [type, entry] of Object.entries(byType)) {
    if (!KNOWN_TYPES.has(type)) {
      validator.warning(null, 'visual_unknown_type', `_html_visual.by_type key "${type}" is not a known slide type`);
      continue;
    }
    if (entry && typeof entry === 'object' && entry.mode !== undefined) {
      const allowedModes = KNOWN_MODES[type] ?? [];
      if (!allowedModes.includes(entry.mode)) {
        validator.warning(null, 'visual_unknown_mode', `_html_visual.by_type["${type}"].mode "${entry.mode}" is not a known mode for type "${type}"`);
      }
    }
  }

  // Validate by_slide keys
  for (const key of Object.keys(bySlide)) {
    const asInt = parseInt(key, 10);
    const isPositiveInt = !isNaN(asInt) && asInt > 0 && String(asInt) === key;
    if (!isPositiveInt && !idToIndex.has(key)) {
      validator.warning(null, 'visual_unknown_slide', `_html_visual.by_slide key "${key}" is neither a known slide id nor a positive integer`);
    }
    // Also validate mode inside by_slide entries
    const entry = bySlide[key];
    if (entry && typeof entry === 'object' && entry.mode !== undefined) {
      // We'd need to know the type for the slide to validate the mode here.
      // We skip per-slide mode validation at parse time since we don't have
      // the type. The mode value is passed through as-is.
    }
  }

  /**
   * Resolve the visual spec for a single slide.
   * Precedence: by_slide > by_type > defaults
   */
  function resolveVisual(slideType, slideIndex1based, slideId) {
    // Build merged object: defaults → by_type → by_slide
    const fromDefaults = { ...defaults };

    const typeEntry = byType[slideType];
    const fromType = (typeEntry && typeof typeEntry === 'object') ? { ...typeEntry } : {};

    // by_slide can be keyed by id or by string integer
    const bySlideEntryById = slideId ? bySlide[slideId] : undefined;
    const bySlideEntryByIdx = bySlide[String(slideIndex1based)];
    // id-keyed takes priority over index-keyed
    const rawBySlide = bySlideEntryById ?? bySlideEntryByIdx;
    const fromBySlide = (rawBySlide && typeof rawBySlide === 'object') ? { ...rawBySlide } : {};

    return { ...fromDefaults, ...fromType, ...fromBySlide };
  }

  return resolveVisual;
}

/**
 * Validate navigation targets inside `_html_visual.by_slide[*].navigation`.
 * Emits warnings (never errors) for out-of-range indices or unknown ids.
 */
export function validateNavigation(spec, idToIndex, slideCount, validator) {
  const raw = spec._html_visual;
  if (!raw || typeof raw !== 'object') return;
  const bySlide = raw.by_slide ?? {};
  for (const [key, entry] of Object.entries(bySlide)) {
    if (!entry || typeof entry !== 'object') continue;
    const nav = entry.navigation;
    if (!nav || typeof nav !== 'object') continue;
    for (const [label, target] of Object.entries(nav)) {
      if (typeof target === 'number') {
        if (target < 1 || target > slideCount) {
          validator.warning(null, 'visual_invalid_nav', `navigation target ${target} for "${label}" is out of range`);
        }
      } else if (typeof target === 'string') {
        if (!idToIndex.has(target)) {
          validator.warning(null, 'visual_invalid_nav', `navigation target id "${target}" for "${label}" does not exist`);
        }
      }
    }
  }
}
