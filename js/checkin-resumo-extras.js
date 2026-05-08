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

// ═══ POLIMENTO V6 ═══
// Gamification: confetti, AudioContext chime, personal best, achievement toast, rank label

// ── V6-1. Confetti burst via canvas (sem lib externa) ─────────────────────
function launchConfetti(duration = 2800) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'cr-confetti-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#4CB8A0', '#2D6A56', '#C9A84C', '#FF6B6B', '#4ECDC4', '#45B7D1'];
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 100,
    w: 8 + Math.random() * 8,
    h: 4 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.3,
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 3,
  }));
  let start = null;
  function draw(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (elapsed < duration) requestAnimationFrame(draw);
    else canvas.remove();
  }
  requestAnimationFrame(draw);
}

// ── V6-2. Som sutil via AudioContext (arpejo C5-E5-G5) ────────────────────
function crPlayTone(freq = 523, dur = 0.18, vol = 0.07) {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.start();
    osc.stop(ac.currentTime + dur);
    osc.addEventListener('ended', () => ac.close());
  } catch {}
}

function crPlaySuccessChime() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => crPlayTone(f, 0.2, 0.06), i * 120));
}

// ── V6-3. Record pessoal (melhor score já registrado) ─────────────────────
const CR_GAME_KEY = 'cr_game_v1';
function crGameLoad() {
  try { return JSON.parse(localStorage.getItem(CR_GAME_KEY) || '{}'); } catch { return {}; }
}
function crGameSave(d) {
  try { localStorage.setItem(CR_GAME_KEY, JSON.stringify(d)); } catch {}
}
function crCheckPersonalBest(score) {
  const num = parseFloat(score);
  if (isNaN(num) || num <= 0) return false;
  const data = crGameLoad();
  const prev = data.bestScore || 0;
  if (num > prev) {
    crGameSave({ ...data, bestScore: num, bestDate: new Date().toISOString().slice(0, 10) });
    return num >= 5;
  }
  return false;
}

// ── V6-4. Toast de conquista com slide-up ─────────────────────────────────
function crShowAchievementToast(msg, icon = '🏆') {
  const t = document.createElement('div');
  t.className = 'cr-achievement-toast';
  t.setAttribute('role', 'status');
  t.setAttribute('aria-live', 'polite');
  t.innerHTML = `<span class="cr-ach-icon" aria-hidden="true">${icon}</span><span class="cr-ach-msg">${msg}</span>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => { requestAnimationFrame(() => t.classList.add('cr-ach-show')); });
  setTimeout(() => {
    t.classList.remove('cr-ach-show');
    t.addEventListener('transitionend', () => t.remove(), { once: true });
  }, 3500);
}

// ── V6-5. Rótulo de classificação baseado no score ────────────────────────
function crInjectRankLabel(score) {
  const num = parseFloat(score);
  if (isNaN(num)) return;
  document.querySelector('.cr-rank-label')?.remove();
  const ranks = [
    [9,         'Excelente',          'cr-rank-excellent'],
    [7.5,       'Muito Bom',          'cr-rank-great'],
    [6,         'Bom',                'cr-rank-good'],
    [4,         'Regular',            'cr-rank-fair'],
    [-Infinity, 'Em desenvolvimento', 'cr-rank-dev'],
  ];
  const [, label, cls] = ranks.find(([min]) => num >= min);
  const el = document.createElement('div');
  el.className = `cr-rank-label ${cls}`;
  el.setAttribute('aria-label', `Classificação: ${label}`);
  el.textContent = label;
  document.querySelector('.resumo-score-card')?.appendChild(el);
}

// ── V6-6. Troféu no título da aba quando score ≥ 9 ───────────────────────
function crUpdateTitle(score) {
  const num = parseFloat(score);
  if (!isNaN(num) && num >= 9 && !document.title.startsWith('🏆')) {
    document.title = '🏆 ' + document.title;
  }
}

// ── V6-7. Haptic feedback em conquistas (mobile) ──────────────────────────
function crHapticAchieve() {
  try { navigator.vibrate?.([50, 30, 100]); } catch {}
}

// ── V6-8. Party mode: drop-shadow pulsante quando score ≥ 9.5 ────────────
function crInitPartyMode(score) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const num = parseFloat(score);
  if (isNaN(num) || num < 9.5) return;
  const circle = document.querySelector('.resumo-score-circle');
  if (!circle) return;
  circle.classList.add('cr-party-ring');
  setTimeout(() => circle.classList.remove('cr-party-ring'), 5000);
}

// ── V6-9. Tom suave para scores moderados (7 ≤ score < 8) ────────────────
function crPlayModerateSound(score) {
  const num = parseFloat(score);
  if (!isNaN(num) && num >= 7 && num < 8) crPlayTone(659, 0.25, 0.05);
}

// ── V6-10. Orquestrador via MutationObserver no score-num ─────────────────
function initGamification() {
  const scoreEl = document.getElementById('score-num');
  if (!scoreEl) return;
  let done = false;
  const run = () => {
    const raw = scoreEl.textContent?.trim();
    if (!raw || raw === '—' || done) return;
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    done = true;
    crInjectRankLabel(raw);
    crUpdateTitle(raw);
    crInitPartyMode(raw);
    const isNewBest = crCheckPersonalBest(raw);
    if (isNewBest) {
      crHapticAchieve();
      crPlaySuccessChime();
      if (num >= 8) launchConfetti();
      crShowAchievementToast('Novo recorde pessoal!', '🏆');
    } else if (num >= 9) {
      crPlayTone(784, 0.3, 0.06);
      crShowAchievementToast('Desempenho excelente!', '⭐');
    } else {
      crPlayModerateSound(raw);
    }
  };
  new MutationObserver(run).observe(scoreEl, { childList: true, characterData: true, subtree: true });
  run();
}

// ═══ POLIMENTO V7 ═══
// Telemetria local: uso de features, streak, heatmap, histórico no localStorage

// ── 21. Namespace de telemetria ───────────────────────────────────────────
const CR_TEL_KEY = 'cr_tel_v1';
function crTelLoad() {
  try { return JSON.parse(localStorage.getItem(CR_TEL_KEY) || '{}'); } catch { return {}; }
}
function crTelSave(d) {
  try { localStorage.setItem(CR_TEL_KEY, JSON.stringify(d)); } catch {}
}
function crTelUpdate(fn) {
  const d = crTelLoad(); fn(d); crTelSave(d);
}

// ── 22. Contador de visitas e timestamps ─────────────────────────────────
function initVisitTracking() {
  crTelUpdate(d => {
    d.visits = (d.visits || 0) + 1;
    d.lastVisit = Date.now();
    if (!d.firstVisit) d.firstVisit = Date.now();
  });
}

// ── 23. Profundidade de scroll máxima por sessão ─────────────────────────
function initScrollDepthTracking() {
  let maxDepth = 0;
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (total > 0) maxDepth = Math.max(maxDepth, Math.round((window.scrollY / total) * 100));
  }, { passive: true });
  window.addEventListener('beforeunload', () => {
    crTelUpdate(d => { d.maxScrollDepth = Math.max(d.maxScrollDepth || 0, maxDepth); });
  });
}

// ── 24. Tempo de sessão ativo ─────────────────────────────────────────────
function initSessionTimeTracking() {
  const t0 = Date.now();
  window.addEventListener('beforeunload', () => {
    if (!document.hidden) {
      const secs = Math.round((Date.now() - t0) / 1000);
      crTelUpdate(d => {
        d.totalTimeSeconds = (d.totalTimeSeconds || 0) + secs;
        d.sessionCount = (d.sessionCount || 0) + 1;
      });
    }
  });
}

// ── 25. Cliques por seção ─────────────────────────────────────────────────
function initSectionClickTracking() {
  const targets = [
    ['.resumo-metric-card', 'clicksMetric'],
    ['.resumo-dica-item',   'clicksDica'],
    ['.cta-btn',            'clicksCta'],
    ['.checkin-back',       'clicksBack'],
    ['.cr-scroll-top',      'clicksScrollTop'],
  ];
  const attach = (sel, key) => {
    document.querySelectorAll(`${sel}:not([data-tel])`).forEach(el => {
      el.dataset.tel = '1';
      el.addEventListener('click', () => crTelUpdate(d => { d[key] = (d[key] || 0) + 1; }));
    });
  };
  targets.forEach(([sel, key]) => attach(sel, key));
  const cta = document.getElementById('cta-container');
  if (cta) new MutationObserver(() => attach('.cta-btn', 'clicksCta')).observe(cta, { childList: true });
}

// ── 26. Histórico de scores (até 52 semanas) ─────────────────────────────
function initScoreHistory() {
  observeScoreNum(val => {
    const today = new Date().toISOString().slice(0, 10);
    crTelUpdate(d => {
      if (!d.scoreHistory) d.scoreHistory = [];
      if (!d.scoreHistory.find(e => e.date === today)) {
        d.scoreHistory.push({ date: today, score: val });
        if (d.scoreHistory.length > 52) d.scoreHistory.shift();
      }
    });
  });
}

// ── 27. Métricas mais visualizadas (IntersectionObserver) ─────────────────
function initMetricViewTracking() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const label = entry.target.querySelector('.rm-label')?.textContent?.trim();
      if (label) crTelUpdate(d => {
        if (!d.metricViews) d.metricViews = {};
        d.metricViews[label] = (d.metricViews[label] || 0) + 1;
      });
      io.unobserve(entry.target);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.resumo-metric-card').forEach(c => io.observe(c));
}

// ── 28. Streak de visitas diárias e badge visual ──────────────────────────
function initStreakTracking() {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  crTelUpdate(d => {
    if (d.lastStreakDate === yesterday) d.streak = (d.streak || 1) + 1;
    else if (d.lastStreakDate !== today) d.streak = 1;
    d.lastStreakDate = today;
    d.bestStreak = Math.max(d.bestStreak || 0, d.streak || 1);
  });
  const data = crTelLoad();
  if ((data.streak || 0) >= 3) {
    const circle = document.querySelector('.resumo-score-circle');
    if (circle && !circle.querySelector('.cr-streak-badge')) {
      const badge = document.createElement('div');
      badge.className = 'cr-streak-badge';
      badge.setAttribute('aria-label', `Streak: ${data.streak} dias seguidos`);
      badge.title = `${data.streak} dias seguidos!`;
      badge.innerHTML = `<span class="cr-streak-icon" aria-hidden="true">🔥</span><span class="cr-streak-count">${data.streak}</span>`;
      circle.appendChild(badge);
    }
  }
}

// ── 29. Painel de telemetria oculto (Shift+Alt+T) ────────────────────────
function initTelPanel() {
  document.addEventListener('keydown', e => {
    if (!e.shiftKey || !e.altKey || e.key !== 'T') return;
    const existing = document.getElementById('cr-tel-panel');
    if (existing) { existing.remove(); return; }
    const d = crTelLoad();
    const avgTime = d.sessionCount ? Math.round((d.totalTimeSeconds || 0) / d.sessionCount) : 0;
    const panel = document.createElement('div');
    panel.id = 'cr-tel-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Telemetria local');
    panel.innerHTML =
      `<div class="cr-tel-header"><span>Telemetria Local</span><button class="cr-tel-close" aria-label="Fechar">✕</button></div>` +
      `<div class="cr-tel-body">` +
      `<p><strong>Visitas:</strong> ${d.visits || 0}</p>` +
      `<p><strong>Streak:</strong> ${d.streak || 0} dias 🔥 (melhor: ${d.bestStreak || 0})</p>` +
      `<p><strong>Scroll máx:</strong> ${d.maxScrollDepth || 0}%</p>` +
      `<p><strong>Tempo médio/sessão:</strong> ${avgTime}s</p>` +
      `<p><strong>Cliques CTA:</strong> ${d.clicksCta || 0}</p>` +
      `<p><strong>Scores recentes:</strong> ${(d.scoreHistory || []).slice(-5).map(e => e.score).join(', ') || '—'}</p>` +
      `</div>` +
      `<button class="cr-tel-clear">Limpar dados locais</button>`;
    document.body.appendChild(panel);
    panel.querySelector('.cr-tel-close').addEventListener('click', () => panel.remove());
    panel.querySelector('.cr-tel-clear').addEventListener('click', () => {
      localStorage.removeItem(CR_TEL_KEY);
      panel.remove();
    });
    panel.querySelector('.cr-tel-close').focus();
  });
}

// ═══ POLIMENTO V8 ═══
// Modos especiais: foco profundo, leitura, alto contraste, sleep mode

const CR_MODE_KEY = 'cr_mode_v1';
const CR_MODES = ['focus', 'reading', 'contrast', 'sleep'];

function crModeLoad() {
  try { return localStorage.getItem(CR_MODE_KEY) || null; } catch { return null; }
}
function crModeSave(mode) {
  try { if (mode) localStorage.setItem(CR_MODE_KEY, mode); else localStorage.removeItem(CR_MODE_KEY); } catch {}
}

// ── 30. Aplicador de modo (DOM + persist + announce) ─────────────────────
function applyMode(mode, announce = true) {
  CR_MODES.forEach(m => document.body.classList.remove(`cr-mode-${m}`));
  if (mode) { document.body.classList.add(`cr-mode-${mode}`); crModeSave(mode); }
  else crModeSave(null);
  if (announce) crModeAnnounce(mode);
  updateModePanelState(mode);
}

// ── 31. Aria live para anúncio de troca de modo ───────────────────────────
function crModeAnnounce(mode) {
  const live = document.getElementById('cr-mode-live');
  if (!live) return;
  const labels = { focus: 'Modo Foco ativado', reading: 'Modo Leitura ativado', contrast: 'Modo Alto Contraste ativado', sleep: 'Modo Noturno ativado' };
  live.textContent = labels[mode] || 'Modo padrão restaurado';
  setTimeout(() => { live.textContent = ''; }, 2500);
}

// ── 32. Atalhos de teclado (Shift+Alt+F/R/C/N) + live region ─────────────
function initModeShortcuts() {
  const live = document.createElement('div');
  live.id = 'cr-mode-live';
  live.setAttribute('aria-live', 'assertive');
  live.setAttribute('aria-atomic', 'true');
  live.className = 'cr-sr-only';
  document.body.appendChild(live);

  const keyMap = { F: 'focus', R: 'reading', C: 'contrast', N: 'sleep' };
  document.addEventListener('keydown', e => {
    if (e.shiftKey && e.altKey) {
      const target = keyMap[e.key];
      if (!target) return;
      e.preventDefault();
      const active = CR_MODES.find(m => document.body.classList.contains(`cr-mode-${m}`));
      applyMode(active === target ? null : target);
    } else if (e.key === 'Escape' && CR_MODES.some(m => document.body.classList.contains(`cr-mode-${m}`))) {
      applyMode(null);
    }
  });
}

// ── 33. Restaurar modo salvo ao carregar ─────────────────────────────────
function restoreSavedMode() {
  const saved = crModeLoad();
  if (saved && CR_MODES.includes(saved)) applyMode(saved, false);
}

// ── 34. Sleep mode automático por horário (22h–6h BRT) ───────────────────
function initAutoSleepMode() {
  if (crModeLoad()) return;
  const h = new Date().getHours();
  if (h >= 22 || h < 6) document.body.classList.add('cr-auto-sleep');
}

// ── 35. Focus trap genérico (reutilizado no painel de modos e telemetria) ─
function trapFocusIn(el) {
  if (el._focusTrap) return;
  el._focusTrap = true;
  el.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const nodes = Array.from(el.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'));
    const first = nodes[0]; const last = nodes[nodes.length - 1];
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  });
}

// ── 36. FAB + painel de modos especiais ──────────────────────────────────
function initModePanel() {
  const fab = document.createElement('button');
  fab.id = 'cr-mode-fab';
  fab.className = 'cr-mode-fab';
  fab.setAttribute('aria-label', 'Modos especiais de visualização');
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>';
  document.body.appendChild(fab);

  const panel = document.createElement('div');
  panel.id = 'cr-mode-panel';
  panel.className = 'cr-mode-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Modos especiais');
  panel.hidden = true;

  const defs = [
    { mode: 'focus',    icon: '⊙', label: 'Foco',      kbd: 'Shift+Alt+F' },
    { mode: 'reading',  icon: '≡',  label: 'Leitura',   kbd: 'Shift+Alt+R' },
    { mode: 'contrast', icon: '◑',  label: 'Contraste', kbd: 'Shift+Alt+C' },
    { mode: 'sleep',    icon: '◗',  label: 'Noturno',   kbd: 'Shift+Alt+N' },
  ];
  panel.innerHTML =
    '<div class="cr-mp-header"><span>Modos Especiais</span><button class="cr-mp-close" aria-label="Fechar">✕</button></div>' +
    '<div class="cr-mp-grid">' +
    defs.map(d => `<button class="cr-mp-btn" data-mode="${d.mode}" aria-pressed="false"><span class="cr-mp-icon" aria-hidden="true">${d.icon}</span><span class="cr-mp-label">${d.label}</span><kbd class="cr-mp-kbd">${d.kbd}</kbd></button>`).join('') +
    '</div>' +
    '<button class="cr-mp-reset">Restaurar padrão</button>';
  document.body.appendChild(panel);

  const toggle = open => {
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    if (open) { trapFocusIn(panel); panel.querySelector('.cr-mp-close').focus(); }
    else fab.focus();
  };

  fab.addEventListener('click', () => toggle(panel.hidden));
  panel.querySelector('.cr-mp-close').addEventListener('click', () => toggle(false));
  panel.querySelector('.cr-mp-reset').addEventListener('click', () => { applyMode(null); toggle(false); });
  panel.querySelectorAll('.cr-mp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyMode(btn.getAttribute('aria-pressed') === 'true' ? null : btn.dataset.mode);
      toggle(false);
    });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
  document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target) && e.target !== fab) toggle(false); });
}

// ── 37. Sincronizar estado dos botões do painel com modo ativo ───────────
function updateModePanelState(activeMode) {
  document.querySelectorAll('#cr-mode-panel .cr-mp-btn').forEach(btn => {
    const on = btn.dataset.mode === activeMode;
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('cr-mp-btn--active', on);
  });
}

// ── 38. Print mode: body class para @media print ──────────────────────────
function initPrintMode() {
  window.addEventListener('beforeprint', () => document.body.classList.add('cr-printing'));
  window.addEventListener('afterprint',  () => document.body.classList.remove('cr-printing'));
}

// ── 39. Focus trap no painel de telemetria (V7 retroativo) ───────────────
function enhanceTelPanelFocusTrap() {
  new MutationObserver(() => {
    const panel = document.getElementById('cr-tel-panel');
    if (panel) trapFocusIn(panel);
  }).observe(document.body, { childList: true });
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
  // V6
  initGamification();
  // V7
  initVisitTracking();
  initScrollDepthTracking();
  initSessionTimeTracking();
  initSectionClickTracking();
  initScoreHistory();
  initMetricViewTracking();
  initStreakTracking();
  initTelPanel();
  // V8
  initModeShortcuts();
  restoreSavedMode();
  initAutoSleepMode();
  initModePanel();
  initPrintMode();
  enhanceTelPanelFocusTrap();
});

window._checkinResumoExtras = {
  version: 'V8',
};

export {};
