// js/checkin-resumo-extras.js

// ═══ POLIMENTO V1 ═══
// Foundation: fix hidden content, scroll bar, loading dots, skip link, ARIA roles

// ── 1. Fix duplicate #resumo-content IDs ─────────────────────────────────
// The HTML had two elements with id="resumo-content". The first (tendências +
// diagnóstico) shadowed the second (hero + score + métricas + gráficos).
// extras.js renames the first, then syncs visibility via MutationObserver.
function fixExtraContent() {
  const all = document.querySelectorAll('#resumo-content');
  if (all.length < 2) return;
  const extra = all[0];
  extra.id = 'resumo-extra';

  const main = document.getElementById('resumo-content');
  if (!main) return;

  new MutationObserver(() => {
    if (main.style.display !== 'none' && main.getAttribute('style') !== 'display:none;') {
      extra.style.display = '';
    }
  }).observe(main, { attributes: true, attributeFilter: ['style'] });
}

// ── 2. Scroll progress bar ────────────────────────────────────────────────
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'cr-progress-bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);
  window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
  }, { passive: true });
}

// ── 3. Loading dots enhancement ───────────────────────────────────────────
function enhanceLoading() {
  const loading = document.getElementById('resumo-loading');
  if (!loading || loading.querySelector('.cr-dots')) return;
  const p = loading.querySelector('p');
  const dots = document.createElement('div');
  dots.className = 'cr-dots';
  dots.setAttribute('aria-hidden', 'true');
  dots.innerHTML = '<span></span><span></span><span></span>';
  if (p) p.after(dots);
  else loading.appendChild(dots);
}

// ── 4. Skip navigation link ───────────────────────────────────────────────
function addSkipLink() {
  if (document.querySelector('.cr-skip-link')) return;
  const a = document.createElement('a');
  a.href = '#resumo-content';
  a.className = 'cr-skip-link';
  a.textContent = 'Pular para o conteúdo';
  document.body.prepend(a);
}

// ── 5. ARIA roles for metrics grid ────────────────────────────────────────
function addAriaRoles() {
  const grid = document.querySelector('.resumo-metrics-grid');
  if (grid) {
    grid.setAttribute('role', 'list');
    grid.setAttribute('aria-label', 'Métricas da semana');
  }
  const circle = document.querySelector('.resumo-score-circle');
  if (circle) {
    circle.setAttribute('role', 'img');
    circle.setAttribute('aria-label', 'Score da semana');
  }

  // Update per-card ARIA when content is populated
  const mo = new MutationObserver(() => {
    document.querySelectorAll('.resumo-metric-card:not([data-aria])').forEach(card => {
      const label = card.querySelector('.rm-label')?.textContent?.trim();
      const value = card.querySelector('.rm-value')?.textContent?.trim();
      if (label && value && value !== '—') {
        card.setAttribute('role', 'listitem');
        card.setAttribute('aria-label', `${label}: ${value}`);
        card.dataset.aria = '1';
      }
    });
  });
  if (grid) mo.observe(grid, { childList: true, subtree: true, characterData: true });
}

// ═══ POLIMENTO V2 ═══
// Micro-interações: entrance anim, ripple, CTA hover, dica icons

// ── 6. Metric cards staggered entrance ───────────────────────────────────
function initMetricEntrance() {
  const cards = Array.from(document.querySelectorAll('.resumo-metric-card'));
  if (!cards.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const idx = cards.indexOf(entry.target);
      setTimeout(() => entry.target.classList.add('cr-visible'), idx * 55);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.05 });
  cards.forEach(c => io.observe(c));
}

// ── 7. Back button ripple ─────────────────────────────────────────────────
function initRipple() {
  document.querySelector('.checkin-back')?.addEventListener('pointerdown', e => {
    const btn = e.currentTarget;
    const r = document.createElement('span');
    r.className = 'cr-ripple';
    const rect = btn.getBoundingClientRect();
    r.style.left = (e.clientX - rect.left) + 'px';
    r.style.top  = (e.clientY - rect.top)  + 'px';
    btn.appendChild(r);
    r.addEventListener('animationend', () => r.remove(), { once: true });
  });
}

// ── 8. CTA button keyboard / focus hint ──────────────────────────────────
function initCtaHover() {
  const container = document.getElementById('cta-container');
  if (!container) return;
  new MutationObserver(() => {
    container.querySelectorAll('.cta-btn:not([data-cr])').forEach(btn => {
      btn.dataset.cr = '1';
      btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') btn.click();
      });
    });
  }).observe(container, { childList: true });
}

// ── 9. Dica topic emoji icons ─────────────────────────────────────────────
const DICA_ICONS = {
  'sono':       '🌙',
  'hidrat':     '💧',
  'trânsito':   '🌿',
  'intestin':   '🌿',
  'energia':    '⚡',
  'fome':       '🍃',
  'atividade':  '🏃',
  'física':     '🏃',
};

function injectDicaIcons() {
  const container = document.getElementById('resumo-dicas');
  if (!container) return;
  const attach = () => {
    container.querySelectorAll('.resumo-dica-titulo:not([data-icon])').forEach(el => {
      const key = el.textContent.toLowerCase();
      const icon = Object.entries(DICA_ICONS).find(([k]) => key.includes(k))?.[1];
      if (icon) {
        el.dataset.icon = '1';
        el.insertAdjacentHTML('afterbegin', `<span class="cr-dica-icon" aria-hidden="true">${icon}</span>`);
      }
    });
  };
  new MutationObserver(attach).observe(container, { childList: true, subtree: true });
  attach();
}

// ═══ POLIMENTO V3 ═══
// Animações visuais: score ring SVG, counter animado, chart fade-in

// Shared: observes #score-num until a positive integer is set, fires once
function observeScoreNum(cb) {
  const el = document.getElementById('score-num');
  if (!el) return;
  let fired = false;
  const obs = new MutationObserver(() => {
    if (fired) return;
    const v = parseInt(el.textContent, 10);
    if (!isNaN(v) && v > 0) {
      fired = true;
      obs.disconnect();
      cb(v, el);
    }
  });
  obs.observe(el, { childList: true, characterData: true, subtree: true });
}

// ── 10. SVG animated score ring ───────────────────────────────────────────
const CR_R = 34;
const CR_CIRC = 2 * Math.PI * CR_R;

function initScoreRing() {
  const circle = document.querySelector('.resumo-score-circle');
  if (!circle) return;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 90 90');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('cr-score-svg');

  const track = document.createElementNS(ns, 'circle');
  track.setAttribute('cx', '45'); track.setAttribute('cy', '45');
  track.setAttribute('r', String(CR_R));
  track.setAttribute('fill', 'none');
  track.setAttribute('stroke', 'rgba(76,184,160,0.15)');
  track.setAttribute('stroke-width', '3.5');

  const ring = document.createElementNS(ns, 'circle');
  ring.setAttribute('cx', '45'); ring.setAttribute('cy', '45');
  ring.setAttribute('r', String(CR_R));
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', 'var(--detail)');
  ring.setAttribute('stroke-width', '3.5');
  ring.setAttribute('stroke-linecap', 'round');
  ring.setAttribute('stroke-dasharray', String(CR_CIRC));
  ring.setAttribute('stroke-dashoffset', String(CR_CIRC));
  ring.setAttribute('transform', 'rotate(-90 45 45)');
  ring.classList.add('cr-score-ring');

  svg.appendChild(track);
  svg.appendChild(ring);
  circle.appendChild(svg);

  observeScoreNum((val) => {
    ring.style.strokeDashoffset = String(CR_CIRC - (val / 100) * CR_CIRC);
    const tier = val >= 70 ? 'high' : val >= 45 ? 'mid' : 'low';
    circle.dataset.tier = tier;
  });
}

// ── 11. Score counter animation ───────────────────────────────────────────
function initScoreCounter() {
  observeScoreNum((target, el) => {
    let startTs = null;
    const duration = 900;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const frame = (ts) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      el.textContent = String(Math.round(ease(p) * target));
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = String(target);
    };
    requestAnimationFrame(frame);
  });
}

// ── 12. Chart cards fade-in on scroll ─────────────────────────────────────
function initChartFadeIn() {
  const cards = document.querySelectorAll('.resumo-chart-card');
  if (!cards.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('cr-visible');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  cards.forEach(c => io.observe(c));
}

// ═══ POLIMENTO V4 ═══
// Navegação e scroll: scroll-to-top, header shadow, dicas section nav

// ── 13. Scroll-to-top floating button ─────────────────────────────────────
function initScrollTop() {
  const btn = document.createElement('button');
  btn.className = 'cr-scroll-top';
  btn.setAttribute('aria-label', 'Voltar ao topo da página');
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>';
  document.body.appendChild(btn);
  window.addEventListener('scroll', () => {
    btn.classList.toggle('cr-visible', window.scrollY > 320);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── 14. Header shadow on scroll ───────────────────────────────────────────
function initHeaderShadow() {
  const header = document.querySelector('.checkin-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('cr-scrolled', window.scrollY > 8);
  }, { passive: true });
}

// ── 15. Section navigation: metric card tap → smooth scroll to charts ─────
function initSectionNav() {
  const grid = document.querySelector('.resumo-metrics-grid');
  const charts = document.querySelector('.resumo-chart-card');
  if (!grid || !charts) return;
  grid.setAttribute('title', 'Toque em uma métrica para ver o gráfico');
  grid.querySelectorAll('.resumo-metric-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      charts.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ═══ POLIMENTO V5 ═══
// Performance e mobile: Page Visibility pause, CTA prefetch, resize debounce

// ── 16. Page Visibility: pause dot animation when tab is hidden ───────────
function initPageVisibility() {
  const dots = document.querySelector('.cr-dots');
  if (!dots) return;
  document.addEventListener('visibilitychange', () => {
    dots.style.animationPlayState = document.hidden ? 'paused' : 'running';
    dots.querySelectorAll('span').forEach(s => {
      s.style.animationPlayState = document.hidden ? 'paused' : 'running';
    });
  });
}

// ── 17. Prefetch checkin.html on CTA hover ────────────────────────────────
function initCtaPrefetch() {
  const container = document.getElementById('cta-container');
  if (!container) return;
  let prefetched = false;
  const tryPrefetch = () => {
    if (prefetched) return;
    prefetched = true;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = 'checkin.html';
    document.head.appendChild(link);
  };
  new MutationObserver(() => {
    const btn = container.querySelector('.cta-btn');
    if (btn && !btn.dataset.prefetch) {
      btn.dataset.prefetch = '1';
      btn.addEventListener('mouseenter', tryPrefetch, { once: true });
      btn.addEventListener('focus', tryPrefetch, { once: true });
    }
  }).observe(container, { childList: true });
}

// ── 18. Resize debounce: prevent chart reflow jank ────────────────────────
function initResizeDebounce() {
  let timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      document.querySelectorAll('.resumo-chart-card canvas').forEach(c => {
        c.dispatchEvent(new Event('resize'));
      });
    }, 150);
  }, { passive: true });
}

// ── 19. Score live region for screen readers ──────────────────────────────
function initScoreLiveRegion() {
  const scoreEl = document.getElementById('score-num');
  if (!scoreEl) return;
  const live = document.createElement('div');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  live.className = 'cr-sr-only';
  live.id = 'cr-score-live';
  document.body.appendChild(live);

  new MutationObserver(() => {
    const v = scoreEl.textContent;
    if (v && v !== '—') live.textContent = `Score da semana: ${v} de 100`;
  }).observe(scoreEl, { childList: true, characterData: true, subtree: true });
}

// ── 20. Metric card keyboard navigation ───────────────────────────────────
function initMetricKeyboard() {
  const cards = document.querySelectorAll('.resumo-metric-card');
  cards.forEach((card, i) => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') cards[(i + 1) % cards.length]?.focus();
      if (e.key === 'ArrowLeft')  cards[(i - 1 + cards.length) % cards.length]?.focus();
    });
  });
}

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // V1
  fixExtraContent();
  initScrollProgress();
  enhanceLoading();
  addSkipLink();
  addAriaRoles();
  // V2
  initMetricEntrance();
  initRipple();
  initCtaHover();
  injectDicaIcons();
  // V3
  initScoreRing();
  initScoreCounter();
  initChartFadeIn();
  // V4
  initScrollTop();
  initHeaderShadow();
  initSectionNav();
  // V5
  initPageVisibility();
  initCtaPrefetch();
  initResizeDebounce();
  initScoreLiveRegion();
  initMetricKeyboard();
});

window._checkinResumoExtras = {
  version: 'V1',
};

export {};
