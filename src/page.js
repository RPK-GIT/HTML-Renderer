/**
 * Page shell: assembles rendered slides into one self-contained HTML file.
 *
 * Responsibilities:
 *  - base stylesheet generated from the theme (16:9 canvas, typography,
 *    shared slide chrome, print rules)
 *  - proportional scaling of the 1280x720 logical canvas to the viewport
 *  - keyboard/mouse navigation, slide counter, overview grid
 *  - runtime overflow scan exposed on window.__validation
 *
 * The output requires no backend and no network access.
 */

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function baseCss(t) {
  return `
:root {
  --navy: ${t.navy};
  --blue: ${t.blue};
  --light-blue: ${t.lightBlue};
  --white: ${t.white};
  --font: ${t.fontFamily};
  --radius: ${t.cornerRadius}px;
  --shadow: ${t.shadow};
  --leading: ${t.leading};
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body {
  background: var(--navy);
  font-family: var(--font);
  overflow: hidden;
}

/* ---- stage: scales the logical 1280x720 canvas to the viewport ---- */
#stage { position: fixed; inset: 0; }
#deck {
  position: absolute;
  left: 50%; top: 50%;
  width: ${t.slideWidth}px; height: ${t.slideHeight}px;
  transform: translate(-50%, -50%) scale(var(--scale, 1));
}
.frame { position: absolute; inset: 0; pointer-events: none; }
.frame.active { pointer-events: auto; }
body.overview .frame { pointer-events: auto; }
.slide {
  position: absolute; inset: 0;
  width: ${t.slideWidth}px; height: ${t.slideHeight}px;
  background: var(--white);
  color: var(--navy);
  opacity: 0;
  pointer-events: none;
  transition: opacity ${t.transitionMs}ms ease;
  overflow: hidden;
}
.frame.active .slide { opacity: 1; pointer-events: auto; }

/* ---- shared slide chrome ---- */
.s-head { position: absolute; left: ${t.marginX}px; right: ${t.marginX}px; top: ${t.marginTop}px; }
.s-label {
  color: var(--blue);
  font-size: ${t.labelSize}px; font-weight: bold;
  letter-spacing: 0.08em; text-transform: uppercase;
  margin-bottom: 8px;
}
.s-title { color: var(--navy); font-size: ${t.titleSize}px; font-weight: bold; line-height: 1.15; }
.s-accent { width: 60px; height: 5px; background: var(--blue); margin-top: 14px; border-radius: 2px; }
.s-subtitle { color: var(--blue); font-size: ${t.subtitleSize}px; margin-top: 14px; }
.s-intro { color: var(--navy); font-size: ${t.bodySize}px; line-height: var(--leading); margin-top: 18px; }
.s-body {
  position: absolute;
  left: ${t.marginX}px; right: ${t.marginX}px;
  bottom: ${t.marginBottom + 34}px;
  overflow: hidden;
}
.s-foot {
  position: absolute;
  left: ${t.marginX}px; right: ${t.marginX}px;
  bottom: ${t.marginBottom - 24}px;
  border-top: 1px solid var(--blue);
  padding-top: 8px;
  display: flex; justify-content: space-between; gap: 24px;
  color: var(--blue);
  font-size: ${t.footerSize}px;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.s-foot .src { text-transform: none; letter-spacing: 0; }

/* ---- generic content styles ---- */
.body-text { font-size: ${t.bodySize}px; line-height: var(--leading); color: var(--navy); }
.bullets { list-style: none; }
.bullets li {
  position: relative;
  padding-left: 22px;
  font-size: ${t.bodySize}px; line-height: var(--leading);
  color: var(--navy);
  margin-bottom: 10px;
}
.bullets li::before {
  content: '';
  position: absolute; left: 2px; top: 0.55em;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--blue);
}
.bullets .sub { list-style: none; margin-top: 8px; }
.bullets .sub li { font-size: ${t.smallSize}px; margin-bottom: 6px; }
.bullets .sub li::before { width: 6px; height: 6px; background: var(--light-blue); border: 1.5px solid var(--blue); top: 0.45em; }
.card {
  background: var(--light-blue);
  border-radius: var(--radius);
  padding: 22px 24px;
  box-shadow: var(--shadow);
}
.card h3 { color: var(--navy); font-size: ${t.headingSize}px; margin-bottom: 12px; }
.card .body-text { margin-bottom: 14px; }
.card .bullets li:last-child { margin-bottom: 0; }
.card-accent { border-top: 5px solid var(--blue); }
.callout {
  background: var(--navy);
  color: var(--white);
  border-radius: var(--radius);
  padding: 18px 24px;
  font-size: ${t.bodySize}px; line-height: var(--leading);
}
svg text { font-family: var(--font); }
.s-body > svg { display: block; margin: 0 auto; }

/* ---- presentation tables ---- */
.p-table { width: 100%; border-collapse: collapse; }
.p-table th {
  background: var(--navy); color: var(--white);
  font-weight: bold;
  padding: 11px 16px;
}
.p-table thead tr th:first-child { border-radius: var(--radius) 0 0 0; }
.p-table thead tr th:last-child { border-radius: 0 var(--radius) 0 0; }
.p-table td {
  color: var(--navy);
  padding: 9px 16px;
  line-height: 1.35;
  vertical-align: top;
}
.p-table tbody tr:nth-child(even) { background: var(--light-blue); }
.p-table tbody tr:nth-child(odd) { background: var(--white); }
.p-table tbody tr { border-bottom: 1px solid var(--light-blue); }

/* ---- diagram hover highlighting (screen only) ---- */
@media screen {
  svg [data-node], svg [data-edge], svg .h-branch { transition: opacity 180ms ease; }
  svg .dim { opacity: 0.22; }
  svg.hier:hover .h-branch:not(:hover) { opacity: 0.35; }
  svg [data-node] { cursor: default; }
  svg.hier .h-branch { cursor: pointer; }
}

/* Sequential reveal: all steps start slightly subdued until one is focused */
@media screen {
  svg.proc-seq [data-step] { transition: opacity 200ms ease; }
  svg.proc-seq.has-focus [data-step] { opacity: 0.35; }
  svg.proc-seq.has-focus [data-step].step-active { opacity: 1; }
  svg.proc-seq.has-focus [data-step].step-visited { opacity: 0.65; }
}

/* ---- HUD: counter + controls (screen only, outside slide canvas) ---- */
#hud {
  position: fixed; right: 16px; bottom: 12px;
  display: flex; align-items: center; gap: 10px;
  color: var(--light-blue);
  font-size: 13px;
  user-select: none;
  z-index: 20;
  opacity: 0;
  transition: opacity 300ms ease;
}
body.hud-visible #hud { opacity: 0.9; }
#hud button {
  background: transparent;
  border: 1px solid var(--light-blue);
  border-radius: 6px;
  color: var(--light-blue);
  font-size: 13px; font-family: var(--font);
  width: 28px; height: 24px;
  cursor: pointer;
}
#hud button:hover { background: rgba(217, 232, 245, 0.15); }

/* ---- overview mode ---- */
body.overview { overflow: auto; }
body.overview #deck {
  position: static; transform: none;
  width: auto; height: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, 240px);
  gap: 18px; justify-content: center;
  padding: 32px;
}
body.overview .frame {
  position: relative;
  width: 240px; height: 135px;
  overflow: hidden;
  border-radius: 4px;
  cursor: pointer;
  outline: 2px solid transparent;
}
body.overview .frame:hover { outline-color: var(--light-blue); }
body.overview .frame.active { outline-color: var(--blue); }
body.overview .slide {
  transform: scale(0.1875);
  transform-origin: 0 0;
  opacity: 1;
  transition: none;
  pointer-events: none;
}
body.overview #hud { display: none; }

/* ---- interactive affordances (screen only) ---- */
@media screen {
  [data-expand] .exp-body { display: none; }
  [data-expand].open .exp-body { display: block; }
  [data-expand] > .exp-head { cursor: pointer; }
  [data-expand] > .exp-head::after {
    content: '+'; float: right; color: var(--blue); font-weight: bold;
  }
  [data-expand].open > .exp-head::after { content: '\\2212'; }
  .hoverable { transition: transform 160ms ease, box-shadow 160ms ease; }
  .hoverable:hover { transform: translateY(-3px); box-shadow: 0 6px 18px rgba(14, 58, 102, 0.18); }
}

/* ---- print / PDF export: one slide per page, no scaling ---- */
@page { size: ${t.slideWidth}px ${t.slideHeight}px; margin: 0; }
@media print {
  html, body { height: auto; overflow: visible; background: var(--white); }
  #stage { position: static; }
  #deck { position: static; transform: none; width: auto; height: auto; }
  .frame { position: relative; width: ${t.slideWidth}px; height: ${t.slideHeight}px; page-break-after: always; break-inside: avoid; }
  .slide { opacity: 1 !important; transition: none; }
  #hud { display: none; }
  [data-expand] .exp-body { display: block; }
  [data-expand] > .exp-head::after { content: ''; }
}
`;
}

function navScript() {
  // Kept dependency-free and inline so the HTML file works standalone.
  return `
(function () {
  var frames = Array.prototype.slice.call(document.querySelectorAll('.frame'));
  var counter = document.getElementById('hud-counter');
  var current = 0;

  function clamp(n) { return Math.max(0, Math.min(frames.length - 1, n)); }

  // Step controllers: per slide-index, manages sequential-reveal process diagrams
  var stepControllers = {};

  function initStepController(frameIndex) {
    var svg = frames[frameIndex].querySelector('svg.proc-seq');
    if (!svg) return null;
    var steps = Array.prototype.slice.call(svg.querySelectorAll('[data-step]'));
    if (!steps.length) return null;
    var pos = 0; // 0 = none revealed yet
    function applyState() {
      steps.forEach(function (s, i) {
        s.classList.remove('step-active', 'step-visited');
        if (pos === 0) {
          // not started: all at normal opacity
          svg.classList.remove('has-focus');
        } else {
          svg.classList.add('has-focus');
          if (i < pos - 1) s.classList.add('step-visited');
          else if (i === pos - 1) s.classList.add('step-active');
        }
      });
    }
    return {
      advance: function () {
        if (pos >= steps.length) return false;
        pos++;
        applyState();
        return true;
      },
      reset: function () { pos = 0; applyState(); },
      done: function () { return pos >= steps.length; }
    };
  }

  // Initialise after frames are known
  frames.forEach(function (_, i) { stepControllers[i] = initStepController(i) || null; });

  function show(n, pushHash) {
    n = clamp(n);
    // Forward advance: let step controller consume it first
    if (n > current) {
      var ctrl = stepControllers[current];
      if (ctrl && !ctrl.done()) {
        ctrl.advance();
        return;
      }
    }
    // Going backward: reset step controller on destination
    if (n < current) {
      var ctrl2 = stepControllers[n];
      if (ctrl2) ctrl2.reset();
    }
    current = n;
    frames.forEach(function (f, i) { f.classList.toggle('active', i === current); });
    if (counter) counter.textContent = (current + 1) + ' / ' + frames.length;
    if (pushHash !== false) {
      try { history.replaceState(null, '', '#' + (current + 1)); } catch (e) {}
    }
  }

  function fit() {
    var s = Math.min(window.innerWidth / ${'${W}'}, window.innerHeight / ${'${H}'});
    document.getElementById('deck').style.setProperty('--scale', s);
  }

  function toggleOverview(force) {
    var on = document.body.classList.toggle('overview', force);
    if (on) {
      var f = frames[current];
      if (f && f.scrollIntoView) f.scrollIntoView({ block: 'center' });
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': case ' ':
        show(current + 1); e.preventDefault(); break;
      case 'ArrowLeft': case 'PageUp':
        show(current - 1); e.preventDefault(); break;
      case 'Home': show(0); e.preventDefault(); break;
      case 'End': show(frames.length - 1); e.preventDefault(); break;
      case 'o': case 'O': case 'Escape':
        if (e.key !== 'Escape' || document.body.classList.contains('overview')) {
          toggleOverview(); e.preventDefault();
        }
        break;
    }
  });

  frames.forEach(function (f, i) {
    f.addEventListener('click', function (e) {
      if (document.body.classList.contains('overview')) {
        document.body.classList.remove('overview');
        show(i);
        e.preventDefault();
        return;
      }
      // Plain click on non-interactive area advances the deck.
      var t = e.target;
      while (t && t !== f) {
        if (t.hasAttribute && (t.hasAttribute('data-expand') || t.hasAttribute('data-goto') || t.tagName === 'A')) return;
        t = t.parentNode;
      }
      show(current + 1);
    });
  });

  document.querySelectorAll('[data-expand] > .exp-head').forEach(function (h) {
    h.addEventListener('click', function () {
      h.parentNode.classList.toggle('open');
    });
  });

  document.querySelectorAll('[data-goto]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      show(parseInt(el.getAttribute('data-goto'), 10) - 1);
    });
  });

  var prev = document.getElementById('hud-prev');
  var next = document.getElementById('hud-next');
  var grid = document.getElementById('hud-grid');
  if (prev) prev.addEventListener('click', function () { show(current - 1); });
  if (next) next.addEventListener('click', function () { show(current + 1); });
  if (grid) grid.addEventListener('click', function () { toggleOverview(); });

  // Relationship diagrams: hovering a node highlights its connections.
  document.querySelectorAll('svg.rel').forEach(function (svg) {
    var nodes = svg.querySelectorAll('[data-node]');
    var edges = svg.querySelectorAll('[data-edge]');
    nodes.forEach(function (g) {
      g.addEventListener('mouseenter', function () {
        var id = g.getAttribute('data-node');
        var keep = {};
        keep[id] = true;
        edges.forEach(function (e) {
          var hit = e.getAttribute('data-from') === id || e.getAttribute('data-to') === id;
          e.classList.toggle('dim', !hit);
          if (hit) { keep[e.getAttribute('data-from')] = true; keep[e.getAttribute('data-to')] = true; }
        });
        nodes.forEach(function (n) { n.classList.toggle('dim', !keep[n.getAttribute('data-node')]); });
      });
      g.addEventListener('mouseleave', function () {
        svg.querySelectorAll('.dim').forEach(function (el) { el.classList.remove('dim'); });
      });
    });
  });

  // Hierarchy click-to-focus
  document.querySelectorAll('svg.hier').forEach(function (svg) {
    var focused = null;
    svg.querySelectorAll('.h-branch').forEach(function (br) {
      br.addEventListener('click', function (e) {
        e.stopPropagation();
        if (focused === br) {
          focused = null;
          svg.querySelectorAll('.h-branch').forEach(function (b) {
            b.style.opacity = '';
          });
        } else {
          focused = br;
          svg.querySelectorAll('.h-branch').forEach(function (b) {
            b.style.opacity = b === focused ? '1' : '0.25';
          });
        }
      });
    });
    // Click on svg background clears focus
    svg.addEventListener('click', function (e) {
      if (e.target === svg || e.target.tagName === 'svg') {
        focused = null;
        svg.querySelectorAll('.h-branch').forEach(function (b) {
          b.style.opacity = '';
        });
      }
    });
  });

  // HUD appears on mouse activity and fades out when idle.
  var hudTimer = null;
  function pokeHud() {
    document.body.classList.add('hud-visible');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(function () { document.body.classList.remove('hud-visible'); }, 2200);
  }
  document.addEventListener('mousemove', pokeHud);
  var hud = document.getElementById('hud');
  if (hud) {
    hud.addEventListener('mouseenter', function () { clearTimeout(hudTimer); document.body.classList.add('hud-visible'); });
    hud.addEventListener('mouseleave', pokeHud);
  }

  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', function () {
    var n = parseInt(location.hash.slice(1), 10);
    if (!isNaN(n)) show(n - 1, false);
  });

  fit();
  var start = parseInt(location.hash.slice(1), 10);
  show(isNaN(start) ? 0 : start - 1, false);

  // ---- runtime overflow scan (all slides are laid out even at opacity 0) ----
  function scanOverflow() {
    var problems = [];
    frames.forEach(function (f, i) {
      var slide = f.querySelector('.slide');
      var sr = slide.getBoundingClientRect();
      var scale = sr.width / ${'${W}'} || 1;
      var tol = 2 * scale;
      slide.querySelectorAll('*').forEach(function (el) {
        if (!el.offsetParent && el.offsetWidth === 0) return;
        var r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        if (r.right > sr.right + tol || r.bottom > sr.bottom + tol || r.left < sr.left - tol || r.top < sr.top - tol) {
          problems.push({ slide: i + 1, code: 'element_outside_slide', tag: el.tagName.toLowerCase(), cls: el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className, text: (el.textContent || '').trim().slice(0, 60) });
        }
        var cs = window.getComputedStyle(el);
        if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') {
          if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) {
            if (!el.classList.contains('slide')) {
              problems.push({ slide: i + 1, code: 'text_overflow', tag: el.tagName.toLowerCase(), cls: String(el.className), text: (el.textContent || '').trim().slice(0, 60) });
            }
          }
        }
      });
      if (slide.scrollHeight > slide.clientHeight + 2 || slide.scrollWidth > slide.clientWidth + 2) {
        problems.push({ slide: i + 1, code: 'slide_overflow', tag: 'section', cls: 'slide', text: '' });
      }
    });
    window.__validation = { overflows: problems };
    if (problems.length) console.warn('Overflow problems:', problems);
    return problems;
  }
  window.__scanOverflow = scanOverflow;
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { setTimeout(scanOverflow, 60); });
  } else {
    setTimeout(scanOverflow, 300);
  }
})();
`;
}

/**
 * Assemble the final standalone HTML page.
 * `slides` is an array of inner-HTML strings, one per slide.
 */
export function buildPage({ theme, deckTitle, slides }) {
  const frames = slides
    .map(
      (inner, i) =>
        `<div class="frame${i === 0 ? ' active' : ''}" data-slide="${i + 1}">\n<section class="slide" aria-label="Slide ${i + 1}">\n${inner}\n</section>\n</div>`,
    )
    .join('\n');

  const script = navScript()
    .replaceAll('${W}', String(theme.slideWidth))
    .replaceAll('${H}', String(theme.slideHeight));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(deckTitle)}</title>
<style>${baseCss(theme)}</style>
</head>
<body>
<div id="stage">
<div id="deck">
${frames}
</div>
</div>
<div id="hud">
<button id="hud-prev" title="Previous (Left arrow)">&#8249;</button>
<span id="hud-counter">1 / ${slides.length}</span>
<button id="hud-next" title="Next (Right arrow)">&#8250;</button>
<button id="hud-grid" title="Overview (O)">&#9638;</button>
</div>
<script>${script}</script>
</body>
</html>
`;
}
