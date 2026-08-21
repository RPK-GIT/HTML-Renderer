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

/* ---- principles explorer layout ---- */
.prin-explorer { display: flex; gap: 2%; height: 100%; }
.prin-left { width: 57%; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
.prin-right { width: 40%; display: flex; flex-direction: column; border-top: 4px solid var(--blue); padding-top: 14px; overflow: hidden; }
.prin-group-card { background: var(--light-blue); border-left: 5px solid var(--blue); border-radius: var(--radius); padding: 14px 16px; cursor: pointer; flex-shrink: 0; transition: border-left-width 160ms ease, opacity 160ms ease; }
.prin-group-card.selected { border-left-width: 8px; background: #e4f0fa; }
.prin-group-card:not(.selected).dim { opacity: 0.45; }
.prin-group-label { color: var(--navy); font-weight: bold; font-size: ${t.headingSize}px; margin-bottom: 8px; }
.prin-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.prin-chip { background: var(--white); color: var(--navy); border: 1.5px solid var(--blue); border-radius: 20px; padding: 3px 10px; font-size: ${t.smallSize - 1}px; cursor: pointer; transition: background 140ms ease; }
.prin-chip:hover { background: var(--blue); color: var(--white); }
.prin-chip.selected { background: var(--navy); color: var(--white); border-color: var(--navy); }
.prin-right-inner { flex: 1; overflow-y: auto; padding-right: 4px; }
.prin-default-msg { color: var(--blue); font-size: ${t.smallSize}px; line-height: 1.5; margin-top: 8px; }
.prin-detail-group { color: var(--navy); font-weight: bold; font-size: ${t.headingSize + 2}px; margin-bottom: 12px; }
.prin-detail-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.prin-detail-list li { display: flex; align-items: flex-start; gap: 8px; }
.prin-detail-num { color: var(--blue); font-weight: bold; font-size: ${t.smallSize}px; min-width: 20px; padding-top: 2px; }
.prin-detail-chip { background: var(--white); color: var(--navy); border: 1.5px solid var(--blue); border-radius: 20px; padding: 4px 12px; font-size: ${t.smallSize}px; cursor: pointer; transition: background 140ms ease; flex: 1; text-align: left; }
.prin-detail-chip:hover { background: var(--blue); color: var(--white); }
.prin-detail-chip.selected { background: var(--navy); color: var(--white); border-color: var(--navy); }
.prin-source-box { margin-top: 14px; background: var(--navy); border-radius: var(--radius); padding: 14px 16px; }
.prin-source-label { color: var(--light-blue); font-size: ${t.smallSize - 1}px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; }
.prin-source-text { color: var(--white); font-size: ${t.smallSize}px; line-height: 1.5; margin-bottom: 10px; font-style: italic; }
.prin-source-ref { color: var(--light-blue); font-size: ${t.smallSize - 2}px; }
.prin-reset { background: transparent; border: none; color: var(--blue); font-size: ${t.smallSize}px; cursor: pointer; padding: 0; margin-bottom: 10px; font-family: var(--font); text-decoration: underline; }
.prin-reset:hover { color: var(--navy); }

/* ---- annotated hierarchy: node click affordance ---- */
@media screen {
  svg[data-annotated] g.ann-node { cursor: pointer; }
  svg[data-annotated] g.ann-node rect,
  svg[data-annotated] g.ann-node path { transition: filter 140ms ease; }
  svg[data-annotated] g.ann-node:hover rect,
  svg[data-annotated] g.ann-node:hover path { filter: brightness(1.18); }
}

/* ---- annotation popover ---- */
#ann-popover {
  display: none;
  position: fixed;
  z-index: 100;
  width: 340px;
  max-width: 90vw;
  background: var(--navy);
  color: var(--white);
  border-radius: var(--radius);
  box-shadow: 0 8px 32px rgba(14, 58, 102, 0.45);
  padding: 18px 20px 16px;
  pointer-events: auto;
}
#ann-popover.visible { display: block; }
.ann-pop-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.ann-pop-label { color: var(--light-blue); font-weight: bold; font-size: ${t.smallSize}px; letter-spacing: 0.06em; text-transform: uppercase; flex: 1; }
.ann-pop-close { background: transparent; border: 1px solid rgba(217,232,245,0.4); border-radius: 50%; color: var(--light-blue); width: 22px; height: 22px; font-size: 14px; line-height: 1; cursor: pointer; flex: none; display: flex; align-items: center; justify-content: center; font-family: var(--font); }
.ann-pop-close:hover { background: rgba(217,232,245,0.15); }
.ann-pop-text { font-style: italic; font-size: ${t.smallSize - 1}px; line-height: 1.55; color: var(--white); margin-bottom: 12px; }
.ann-pop-ref { font-size: ${t.smallSize - 2}px; color: var(--light-blue); }
@media print { #ann-popover { display: none !important; } }
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

  // Hierarchy click-to-focus (skipped for annotated_hierarchy slides — ann-node handles their clicks)
  document.querySelectorAll('svg.hier').forEach(function (svg) {
    if (svg.hasAttribute('data-annotated')) return;
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

  // Annotated hierarchy: floating source-text popover
  (function () {
    var popover = document.createElement('div');
    popover.id = 'ann-popover';
    popover.innerHTML =
      '<div class="ann-pop-header">' +
      '<span class="ann-pop-label" id="ann-pop-label"></span>' +
      '<button class="ann-pop-close" id="ann-pop-close" aria-label="Close">&#215;</button>' +
      '</div>' +
      '<div class="ann-pop-text" id="ann-pop-text"></div>' +
      '<div class="ann-pop-ref" id="ann-pop-ref"></div>';
    document.body.appendChild(popover);

    var popLabel = document.getElementById('ann-pop-label');
    var popText = document.getElementById('ann-pop-text');
    var popRef = document.getElementById('ann-pop-ref');
    var popClose = document.getElementById('ann-pop-close');

    var annotationsCache = {};

    function getAnnotations(slideNo) {
      if (annotationsCache[slideNo]) return annotationsCache[slideNo];
      var el = document.getElementById('ann' + '-data-' + slideNo);
      if (!el) return {};
      try { annotationsCache[slideNo] = JSON.parse(el.textContent); }
      catch (e) { annotationsCache[slideNo] = {}; }
      return annotationsCache[slideNo];
    }

    function showPopover(label, annotation, anchorRect) {
      popLabel.textContent = label;
      popText.innerHTML = '\u201c' + String(annotation.text || '').replace(/</g, '&lt;') + '\u201d';
      var pageStr = annotation.page ? 'DAMA-DMBOK 2nd Edition, p.\u00a0' + annotation.page : 'DAMA-DMBOK 2nd Edition';
      popRef.textContent = pageStr;
      popover.classList.add('visible');
      var pw = 340;
      var ph = popover.offsetHeight || 160;
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var left = anchorRect.right + 8;
      var top = anchorRect.top;
      if (left + pw > vw - 8) left = anchorRect.left - pw - 8;
      if (left < 8) left = 8;
      if (top + ph > vh - 8) top = vh - ph - 8;
      if (top < 8) top = 8;
      popover.style.left = Math.round(left) + 'px';
      popover.style.top = Math.round(top) + 'px';
    }

    function hidePopover() {
      popover.classList.remove('visible');
    }

    document.addEventListener('click', function (e) {
      if (popover.classList.contains('visible') && !popover.contains(e.target)) {
        var node = e.target.closest('g.ann-node');
        if (!node) { hidePopover(); return; }
      }
      var node = e.target.closest('g.ann-node');
      if (!node) return;
      e.stopPropagation();
      var label = node.getAttribute('data-label') || '';
      var svg = node.closest('svg[data-annotated]');
      var slideNo = svg ? svg.getAttribute('data-slide-no') : '0';
      var anns = getAnnotations(slideNo);
      var ann = anns[label] || { text: 'No source excerpt available for this item.', page: '' };
      var rect = node.getBoundingClientRect();
      showPopover(label, ann, rect);
    });

    if (popClose) popClose.addEventListener('click', function (e) { e.stopPropagation(); hidePopover(); });

    document.addEventListener('keydown', function (e) {
      if (['ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].indexOf(e.key) !== -1) {
        hidePopover();
      }
    });
  })();

  // Principles explorer interaction
  document.querySelectorAll('.prin-explorer').forEach(function (explorer) {
    var slideNo = explorer.getAttribute('data-slide-no');
    var leftCards = explorer.querySelectorAll('.prin-group-card');
    var rightInner = document.getElementById('prin-panel-inner-' + slideNo);
    var annotations = {};
    try { annotations = JSON.parse(document.getElementById('prin-annotations-' + slideNo).textContent); } catch(e) {}

    var selectedGroup = null;
    var selectedPrinciple = null;

    function defaultMsg() {
      if (!rightInner) return;
      rightInner.innerHTML = '<p class="prin-default-msg">Click a principle group on the left to explore its principles.<br>Click a principle to see the source text from DAMA-DMBOK.</p>';
      selectedGroup = null; selectedPrinciple = null;
    }

    function showGroup(groupIdx) {
      selectedGroup = groupIdx;
      selectedPrinciple = null;
      leftCards.forEach(function(c, i) {
        c.classList.toggle('selected', i === groupIdx);
        c.classList.toggle('dim', i !== groupIdx);
      });
      var card = leftCards[groupIdx];
      var groupLabel = card.getAttribute('data-group-label');
      var principles = JSON.parse(card.getAttribute('data-principles') || '[]');

      var listItems = principles.map(function(p, i) {
        return '<li><span class="prin-detail-num">' + (i + 1) + '</span><button class="prin-detail-chip" data-label="' + p.replace(/"/g, '&quot;') + '">' + p.replace(/</g, '&lt;') + '</button></li>';
      }).join('');

      var noPrinciples = principles.length === 0
        ? '<p class="prin-default-msg" style="margin-top:0;">(No sub-principles — this group is a foundational commitment.)</p>'
        : '<ul class="prin-detail-list">' + listItems + '</ul>';

      if (!rightInner) return;
      rightInner.innerHTML =
        '<button class="prin-reset" id="prin-reset-' + slideNo + '">← All groups</button>' +
        '<div class="prin-detail-group">' + groupLabel.replace(/</g, '&lt;') + '</div>' +
        noPrinciples;

      // Attach click to principle chips
      rightInner.querySelectorAll('.prin-detail-chip').forEach(function(chip) {
        chip.addEventListener('click', function(e) { e.stopPropagation(); showPrinciple(chip.getAttribute('data-label'), chip); });
      });
      var resetBtn = document.getElementById('prin-reset-' + slideNo);
      if (resetBtn) resetBtn.addEventListener('click', function(e) { e.stopPropagation(); clearSelection(); defaultMsg(); });
    }

    function showPrinciple(label, chipEl) {
      selectedPrinciple = label;
      rightInner.querySelectorAll('.prin-detail-chip').forEach(function(c) { c.classList.toggle('selected', c === chipEl); });
      var annotation = annotations[label] || { text: 'No source excerpt available for this item.', page: '' };
      var existingBox = rightInner.querySelector('.prin-source-box');
      if (existingBox) existingBox.remove();
      var pageRef = annotation.page ? 'DAMA-DMBOK 2nd Edition, p. ' + annotation.page : 'DAMA-DMBOK 2nd Edition';
      var box = document.createElement('div');
      box.className = 'prin-source-box';
      box.innerHTML =
        '<div class="prin-source-label">Source: DAMA-DMBOK PDF</div>' +
        '<div class="prin-source-text">“' + String(annotation.text).replace(/</g, '&lt;') + '”</div>' +
        '<div class="prin-source-ref">' + pageRef.replace(/</g, '&lt;') + '</div>';
      rightInner.appendChild(box);
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function clearSelection() {
      selectedGroup = null; selectedPrinciple = null;
      leftCards.forEach(function(c) { c.classList.remove('selected', 'dim'); });
    }

    // Attach click handlers to group cards
    leftCards.forEach(function(card, i) {
      card.addEventListener('click', function(e) {
        e.stopPropagation();
        if (selectedGroup === i) { clearSelection(); defaultMsg(); }
        else { showGroup(i); }
      });
    });

    defaultMsg();
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
