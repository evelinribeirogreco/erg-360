// js/checkin-extras.js
// ═══ POLIMENTO V1 ═══
// 18 micro-melhorias: orientação, polimento, segurança, acessibilidade, mobile, deleite

const DRAFT_KEY  = 'erg_checkin_draft';
const STREAK_KEY = 'erg_checkin_streak';

const BRISTOL_DESC = {
  1: 'Grumos duros separados — prisão de ventre severa',
  2: 'Formato sólido em bloco — prisão de ventre leve',
  3: 'Com fissuras na superfície — normal',
  4: 'Macio e liso — ideal',
  5: 'Bordas bem definidas — normal',
  6: 'Esponjoso, bordas irregulares — leve diarreia',
  7: 'Líquido sem partes sólidas — diarreia'
};

const CONTEXT_HINTS = {
  energia_1: 'Energia muito baixa — dormiu pouco ou está em déficit calórico?',
  energia_2: 'Energia baixa — verifique hidratação e refeições de hoje.',
  humor_1:   'Humor péssimo. Use o campo final para anotar o motivo.',
  fome_nivel_4: 'Fome alta — garanta proteína em cada refeição do plano.',
  fome_nivel_5: 'Fome incontrolável pode indicar restrição excessiva.',
  sono_qualidade_1: 'Sono péssimo eleva cortisol e aumenta fome ao longo do dia.',
  sono_qualidade_2: 'Sono ruim — tente dormir antes das 23h hoje.',
};

let _bypassValidation = false;

document.addEventListener('DOMContentLoaded', () => {
  initStepDots();
  patchNavigation();
  initContextualHints();
  initDraftRecovery();
  initBristolTooltips();
  initSwipeGesture();
  initKeyboardNav();
  initStreakBadge();
  initLoadingSkeleton();
  initRippleEffect();
  observeScoreScreen();
});

// ── 1. Step dots ─────────────────────────────────────────────────────────────
function initStepDots() {
  const wrap = document.createElement('div');
  wrap.className = 'ci-step-dots';
  wrap.setAttribute('aria-hidden', 'true');
  for (let i = 1; i <= 7; i++) {
    const dot = document.createElement('span');
    dot.className = 'ci-dot';
    dot.dataset.step = i;
    wrap.appendChild(dot);
  }
  document.querySelector('.ci-progress-bar')?.after(wrap);
}

function updateDots(step) {
  document.querySelectorAll('.ci-dot').forEach(dot => {
    const s = parseInt(dot.dataset.step);
    dot.classList.toggle('done', s < step);
    dot.classList.toggle('active', s === step);
  });
}

// ── 2–3. Patch navigation: stagger + dots + draft save + shake validation ────
function patchNavigation() {
  const origAvancar = window.avancarStep;
  const origVoltar  = window.voltarStep;

  if (origAvancar) {
    window.avancarStep = function () {
      const active = document.querySelector('.ci-screen.active');
      if (!_bypassValidation && active && active.id !== 'screen-0') {
        const unanswered = getFirstUnansweredScale(active);
        if (unanswered) {
          const btn = active.querySelector('.ci-next:not(.skip)');
          if (btn) shakeElement(btn);
          showInlineHint(unanswered, 'Selecione uma opção antes de continuar');
          return; // bloqueia avanço
        }
      }
      saveDraft();
      origAvancar.apply(this, arguments);
      afterScreenChange();
    };
  }

  if (origVoltar) {
    window.voltarStep = function () {
      origVoltar.apply(this, arguments);
      afterScreenChange();
    };
  }
}

// Valida só .ci-scale-wrap — escalas 1-5 obrigatórias. Ignora seções condicionais ocultas.
function getFirstUnansweredScale(screen) {
  const wraps = screen.querySelectorAll('.ci-scale-wrap');
  for (const wrap of wraps) {
    if (wrap.closest('.ci-sub-section:not(.visible)')) continue;
    if (!wrap.querySelector('.ci-scale-btn.active')) return wrap;
  }
  return null;
}

// ── 2. Stagger + dots após troca de tela ─────────────────────────────────────
function afterScreenChange() {
  requestAnimationFrame(() => {
    const active = document.querySelector('.ci-screen.active');
    if (!active) return;
    const step = parseInt(active.id.replace('screen-', '')) || 0;
    updateDots(step);
    active.querySelectorAll('.ci-opt, .ci-scale-btn, .ci-chip, .bristol-btn').forEach((el, i) => {
      el.style.setProperty('--stagger-i', i);
      el.classList.add('ci-stagger-in');
      el.addEventListener('animationend', () => el.classList.remove('ci-stagger-in'), { once: true });
    });
  });
}

// ── 4. Shake ──────────────────────────────────────────────────────────────────
function shakeElement(el) {
  el.classList.remove('ci-shake');
  void el.offsetWidth; // reflow forçado
  el.classList.add('ci-shake');
  el.addEventListener('animationend', () => el.classList.remove('ci-shake'), { once: true });
  navigator.vibrate?.([20, 50, 20]);
}

// ── 5. Inline hint ────────────────────────────────────────────────────────────
function showInlineHint(target, msg) {
  document.querySelectorAll('.ci-inline-hint').forEach(h => h.remove());
  const hint = document.createElement('p');
  hint.className = 'ci-inline-hint';
  hint.setAttribute('role', 'alert');
  hint.textContent = msg;
  target.after(hint);
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => hint.remove(), 3500);
}

// ── 6. Draft auto-save ────────────────────────────────────────────────────────
function saveDraft() {
  try {
    const active = document.querySelector('.ci-screen.active');
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      screen: active?.id,
      ts: Date.now(),
    }));
  } catch (_) {}
}

// ── 7. Draft recovery ─────────────────────────────────────────────────────────
function initDraftRecovery() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    const hoje = new Date().toISOString().split('T')[0];
    if (new Date(draft.ts).toISOString().split('T')[0] !== hoje) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    const targetNum = parseInt((draft.screen || '').replace('screen-', '')) || 0;
    if (targetNum < 1) return;

    const banner = document.createElement('div');
    banner.className = 'ci-draft-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span>Você iniciou o check-in de hoje</span>
      <button type="button" class="ci-draft-restore">Retomar</button>
      <button type="button" class="ci-draft-dismiss" aria-label="Descartar rascunho">✕</button>`;

    const intro = document.querySelector('.ci-intro');
    const nextBtn = intro?.querySelector('.ci-next');
    if (intro && nextBtn) intro.insertBefore(banner, nextBtn);

    banner.querySelector('.ci-draft-restore').addEventListener('click', () => {
      banner.remove();
      _bypassValidation = true;
      let n = 0;
      const advance = () => {
        if (n >= targetNum) { _bypassValidation = false; return; }
        n++;
        // Manipula DOM diretamente para evitar loop via window.avancarStep patchado
        const from = document.querySelector('.ci-screen.active');
        if (!from) { _bypassValidation = false; return; }
        from.classList.remove('active');
        const to = document.getElementById(`screen-${n}`);
        if (!to) { _bypassValidation = false; return; }
        to.classList.add('active');
        if (n >= 1) document.getElementById('ci-header').style.display = 'flex';
        const pct = Math.round((n / 7) * 100);
        const bar = document.getElementById('ci-progress');
        if (bar) bar.style.width = pct + '%';
        const cnt = document.getElementById('ci-step-count');
        if (cnt) cnt.textContent = `${n} / 7`;
        updateDots(n);
        window.scrollTo(0, 0);
        setTimeout(advance, 60);
      };
      advance();
    });

    banner.querySelector('.ci-draft-dismiss').addEventListener('click', () => {
      localStorage.removeItem(DRAFT_KEY);
      banner.remove();
    });
  } catch (_) {}
}

// ── 8. Bristol tooltips ───────────────────────────────────────────────────────
function initBristolTooltips() {
  document.querySelectorAll('.bristol-btn').forEach(btn => {
    const num = parseInt(btn.textContent.trim());
    const desc = BRISTOL_DESC[num];
    if (!desc) return;
    btn.setAttribute('aria-label', `Tipo ${num}: ${desc}`);

    let tooltip = null;

    const showTip = () => {
      if (tooltip) return;
      tooltip = document.createElement('div');
      tooltip.className = 'ci-bristol-tooltip';
      tooltip.setAttribute('role', 'tooltip');
      tooltip.textContent = desc;
      document.body.appendChild(tooltip);
      positionTooltip(tooltip, btn);
    };
    const hideTip = () => { tooltip?.remove(); tooltip = null; };

    btn.addEventListener('mouseenter', showTip);
    btn.addEventListener('mouseleave', hideTip);
    btn.addEventListener('focus', showTip);
    btn.addEventListener('blur', hideTip);
  });
}

function positionTooltip(tip, anchor) {
  const r = anchor.getBoundingClientRect();
  tip.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top - 6}px;transform:translate(-50%,-100%)`;
}

// ── 9. Swipe-right para voltar ────────────────────────────────────────────────
function initSwipeGesture() {
  const shell = document.querySelector('.ci-shell');
  if (!shell) return;
  let sx = 0, sy = 0;
  shell.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  shell.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx > 0) window.voltarStep?.(); // swipe right → voltar
  }, { passive: true });
}

// ── 10. Teclado: setas nos botões de escala e opção ──────────────────────────
function initKeyboardNav() {
  document.addEventListener('keydown', e => {
    const el = document.activeElement;
    if (!el) return;
    const isNav = el.classList.contains('ci-scale-btn') ||
                  el.classList.contains('ci-opt') ||
                  el.classList.contains('bristol-btn');
    if (!isNav) return;
    const cls = [...el.classList].find(c => ['ci-scale-btn','ci-opt','bristol-btn'].includes(c));
    const siblings = [...el.parentElement.querySelectorAll(`.${cls}`)];
    const idx = siblings.indexOf(el);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      siblings[Math.min(idx + 1, siblings.length - 1)]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      siblings[Math.max(idx - 1, 0)]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  });
}

// ── 11. Streak badge na intro ─────────────────────────────────────────────────
function initStreakBadge() {
  try {
    const streak = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"count":0,"lastDate":null}');
    if (streak.count < 2) return;
    const badge = document.createElement('div');
    badge.className = 'ci-streak-badge';
    badge.setAttribute('aria-label', `${streak.count} dias consecutivos de check-in`);
    badge.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      <strong>${streak.count}</strong>
      <span>dias seguidos</span>`;
    document.querySelector('.ci-intro')?.insertAdjacentElement('afterbegin', badge);
  } catch (_) {}
}

// ── 12. Skeleton de loading ───────────────────────────────────────────────────
function initLoadingSkeleton() {
  const intro = document.querySelector('.ci-intro');
  if (!intro) return;
  const skel = document.createElement('div');
  skel.className = 'ci-auth-skeleton';
  skel.setAttribute('aria-hidden', 'true');
  skel.innerHTML = '<div class="ci-skel-line ci-skel-w55"></div><div class="ci-skel-line ci-skel-w38"></div>';
  const dateEl = document.getElementById('ci-data-hoje');
  if (dateEl) {
    dateEl.after(skel);
    const obs = new MutationObserver(() => {
      if (dateEl.textContent.trim()) { skel.remove(); obs.disconnect(); }
    });
    obs.observe(dateEl, { childList: true, characterData: true, subtree: true });
  }
}

// ── 13. Ripple nos botões ─────────────────────────────────────────────────────
function initRippleEffect() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.ci-opt, .ci-chip, .ci-next, .bristol-btn');
    if (!btn || btn.classList.contains('ci-ripple')) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const rip = document.createElement('span');
    rip.className = 'ci-ripple';
    rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    btn.appendChild(rip);
    setTimeout(() => rip.remove(), 600);
  });
}

// ── 14. Dicas contextuais ao selecionar na escala ────────────────────────────
function initContextualHints() {
  const orig = window.onScale;
  if (!orig) return;
  window.onScale = function (field, val, btnEl) {
    orig.apply(this, arguments);
    const key = `${field}_${val}`;
    const msg = CONTEXT_HINTS[key];
    if (!msg) return;
    const wrap = document.getElementById(`scale-${field}`);
    if (!wrap) return;
    wrap.querySelectorAll('.ci-context-hint').forEach(h => h.remove());
    const hint = document.createElement('p');
    hint.className = 'ci-context-hint';
    hint.textContent = msg;
    wrap.after(hint);
    setTimeout(() => hint.remove(), 4500);
  };
}

// ── 15–16. Animação de score + atualização de streak ─────────────────────────
function observeScoreScreen() {
  const target = document.getElementById('screen-done');
  if (!target) return;
  const obs = new MutationObserver(() => {
    if (target.classList.contains('active')) {
      updateStreak();
      animateScoreCounter();
      setTimeout(animateScoreCircle, 200);
      localStorage.removeItem(DRAFT_KEY); // limpa rascunho ao concluir
    }
  });
  obs.observe(target, { attributes: true, attributeFilter: ['class'] });
}

// ── 16. Streak update ─────────────────────────────────────────────────────────
function updateStreak() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const streak = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"count":0,"lastDate":null}');
    if (streak.lastDate === today) return; // já contou hoje
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    streak.count = (streak.lastDate === yest.toISOString().split('T')[0]) ? streak.count + 1 : 1;
    streak.lastDate = today;
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  } catch (_) {}
}

// ── 17. Animação contadora do score ──────────────────────────────────────────
function animateScoreCounter() {
  const el = document.getElementById('score-num');
  if (!el) return;
  const final = parseInt(el.textContent) || 0;
  let cur = 0;
  el.textContent = '0';
  const step = Math.max(1, Math.ceil(final / 28));
  const iv = setInterval(() => {
    cur = Math.min(cur + step, final);
    el.textContent = cur;
    if (cur >= final) clearInterval(iv);
  }, 40);
}

// ── 18. Pop no círculo + confetti em 80+ ─────────────────────────────────────
function animateScoreCircle() {
  const circ = document.getElementById('score-circle');
  if (!circ) return;
  circ.classList.add('ci-score-pop');
  circ.addEventListener('animationend', () => circ.classList.remove('ci-score-pop'), { once: true });
  const score = parseInt(document.getElementById('score-num')?.textContent) || 0;
  if (score >= 80) setTimeout(launchMiniConfetti, 400);
}

function launchMiniConfetti() {
  const colors = ['#4CB8A0', '#C9A84C', '#2D6A56', '#7BC4B0', '#E8D5A0'];
  const wrap = document.createElement('div');
  wrap.className = 'ci-confetti-wrap';
  wrap.setAttribute('aria-hidden', 'true');
  document.body.appendChild(wrap);
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'ci-confetti-piece';
    const s = 4 + Math.random() * 6;
    p.style.cssText = `
      left:${Math.random() * 100}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay:${(Math.random() * 0.7).toFixed(2)}s;
      animation-duration:${(0.9 + Math.random() * 0.7).toFixed(2)}s;
      width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};`;
    wrap.appendChild(p);
  }
  setTimeout(() => wrap.remove(), 3000);
}

window._checkinExtras = {
  version: 'V1',
  launchConfetti: launchMiniConfetti,
  saveDraft,
};

export {};

// ═══ POLIMENTO V2 ═══
// 10 micro-melhorias: ring burst, next pulse, char counter, slide direcional, chip bounce,
//                     sub-section reveal, progress glow, Bristol ring, opt checkmark, back arrow

let _lastDirection = 'forward';

document.addEventListener('DOMContentLoaded', () => {
  initScaleBtnRing();
  initNextReadyPulse();
  initTextareaCounter();
  initScreenSlideDirection();
  initChipBounce();
  initSubSectionReveal();
  initProgressGlow();
});

// ── V2-1. Ring burst no scale-btn ao clicar ───────────────────────────────
function initScaleBtnRing() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.ci-scale-btn');
    if (!btn) return;
    btn.classList.remove('ci-scale-ring');
    void btn.offsetWidth;
    btn.classList.add('ci-scale-ring');
    btn.addEventListener('animationend', () => btn.classList.remove('ci-scale-ring'), { once: true });
  });
}

// ── V2-2. Botão Continuar pulsa quando tela é completamente respondida ────
function initNextReadyPulse() {
  document.addEventListener('click', e => {
    if (!e.target.closest('.ci-scale-btn, .ci-opt')) return;
    requestAnimationFrame(checkScreenComplete);
  });
}

function checkScreenComplete() {
  const active = document.querySelector('.ci-screen.active');
  if (!active || active.id === 'screen-0' || active.id === 'screen-done') return;
  const nextBtn = active.querySelector('.ci-next:not(.skip)');
  if (!nextBtn || !active.querySelector('.ci-scale-wrap')) return;
  if (!getFirstUnansweredScale(active)) {
    nextBtn.classList.remove('ci-next-ready');
    void nextBtn.offsetWidth;
    nextBtn.classList.add('ci-next-ready');
    nextBtn.addEventListener('animationend', () => nextBtn.classList.remove('ci-next-ready'), { once: true });
  }
}

// ── V2-3. Contador de caracteres no textarea de observação ────────────────
function initTextareaCounter() {
  const ta = document.getElementById('obs');
  if (!ta) return;
  const MAX = 500;
  ta.setAttribute('maxlength', MAX);
  const counter = document.createElement('p');
  counter.className = 'ci-char-counter';
  counter.setAttribute('aria-live', 'polite');
  counter.setAttribute('aria-atomic', 'true');
  counter.textContent = `0 / ${MAX}`;
  ta.after(counter);
  ta.addEventListener('input', () => {
    const len = ta.value.length;
    counter.textContent = `${len} / ${MAX}`;
    counter.classList.toggle('ci-char-warn', len > MAX * 0.85);
    counter.classList.toggle('ci-char-limit', len >= MAX);
  });
}

// ── V2-4. Slide direcional ao navegar entre telas ────────────────────────
function initScreenSlideDirection() {
  const prevAvancar = window.avancarStep;
  const prevVoltar  = window.voltarStep;
  if (prevAvancar) {
    window.avancarStep = function () {
      _lastDirection = 'forward';
      prevAvancar.apply(this, arguments);
      applySlideClass();
    };
  }
  if (prevVoltar) {
    window.voltarStep = function () {
      _lastDirection = 'back';
      prevVoltar.apply(this, arguments);
      applySlideClass();
    };
  }
}

function applySlideClass() {
  requestAnimationFrame(() => {
    const active = document.querySelector('.ci-screen.active');
    if (!active) return;
    active.classList.remove('ci-slide-forward', 'ci-slide-back');
    void active.offsetWidth;
    active.classList.add(_lastDirection === 'back' ? 'ci-slide-back' : 'ci-slide-forward');
    active.addEventListener('animationend', () => {
      active.classList.remove('ci-slide-forward', 'ci-slide-back');
    }, { once: true });
  });
}

// ── V2-5. Chip: micro-bounce ao ativar ────────────────────────────────────
function initChipBounce() {
  document.addEventListener('click', e => {
    const chip = e.target.closest('.ci-chip');
    if (!chip) return;
    chip.classList.remove('ci-chip-bounce');
    void chip.offsetWidth;
    chip.classList.add('ci-chip-bounce');
    chip.addEventListener('animationend', () => chip.classList.remove('ci-chip-bounce'), { once: true });
  });
}

// ── V2-6. Sub-seção condicional: scroll suave ao revelar ──────────────────
function initSubSectionReveal() {
  document.querySelectorAll('.ci-sub-section').forEach(section => {
    let wasVisible = section.classList.contains('visible');
    new MutationObserver(() => {
      const isNowVisible = section.classList.contains('visible');
      if (isNowVisible && !wasVisible) {
        setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
      }
      wasVisible = isNowVisible;
    }).observe(section, { attributes: true, attributeFilter: ['class'] });
  });
}

// ── V2-7. Ponto de brilho na ponta da barra de progresso ─────────────────
function initProgressGlow() {
  const fill = document.getElementById('ci-progress');
  if (!fill) return;
  new MutationObserver(() => {
    fill.classList.toggle('ci-progress-has-value', parseFloat(fill.style.width) > 0);
  }).observe(fill, { attributes: true, attributeFilter: ['style'] });
}

// Estende o objeto de exports do V1
if (window._checkinExtras) {
  window._checkinExtras.version = 'V2';
  window._checkinExtras.checkScreenComplete = checkScreenComplete;
}

// ═══ POLIMENTO V4 ═══
// 10 melhorias de performance: rIC, debounce, prefetch, will-change dinâmico,
//   CSS contain, hint cleanup, resize throttle, IO flags, reduced-motion

// ── Utilitários V4 ───────────────────────────────────────────────────────
const _rIC = window.requestIdleCallback
  || (cb => setTimeout(() => cb({ timeRemaining: () => 16 }), 1));

function _debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function _throttle(fn, ms) {
  let last = 0;
  return (...a) => { const n = Date.now(); if (n - last < ms) return; last = n; return fn(...a); };
}

document.addEventListener('DOMContentLoaded', () => {
  v4DebouncedSave();
  v4PrefetchScreens();
  v4WillChange();
  v4CSSContain();
  v4ReducedMotion();
});

// ── V4-1. Debounce: salva rascunho 600ms após última tecla no textarea ────
function v4DebouncedSave() {
  const ta = document.getElementById('obs');
  if (!ta) return;
  ta.addEventListener('input', _debounce(saveDraft, 600));
}

// ── V4-2. Auto-save periódico a cada 30s via rIC ─────────────────────────
(function v4PeriodicSave() {
  setTimeout(() => _rIC(() => {
    if (!document.querySelector('#screen-done.active')) saveDraft();
    v4PeriodicSave();
  }), 30_000);
})();

// ── V4-3 + V4-4 + V4-9. Prefetch e IO flags via observers de tela ─────────
function v4PrefetchScreens() {
  function addPrefetch(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = href; l.as = 'document';
    document.head.appendChild(l);
  }

  // V4-3: prefetch checkin-resumo quando tela de observação (screen-7) ativa
  const s7 = document.getElementById('screen-7');
  if (s7) {
    let done7 = false;
    new MutationObserver(() => {
      if (!s7.classList.contains('active') || done7) return;
      done7 = true;
      _rIC(() => addPrefetch('checkin-resumo.html'));
    }).observe(s7, { attributes: true, attributeFilter: ['class'] });
  }

  // V4-4: prefetch dashboard + V4-9: IO para flags na tela final
  const sd = document.getElementById('screen-done');
  if (!sd) return;

  const io = window.IntersectionObserver
    ? new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove('ci-flag-pending');
          entry.target.classList.add('ci-flag-visible');
          io.unobserve(entry.target);
        });
      }, { threshold: 0.15 })
    : null;

  let doneFinal = false;
  new MutationObserver(() => {
    if (!sd.classList.contains('active')) return;
    if (!doneFinal) {
      doneFinal = true;
      _rIC(() => addPrefetch('dashboard.html'));
    }
    if (io) {
      setTimeout(() => {
        document.querySelectorAll('.ci-flag-item').forEach((f, i) => {
          f.classList.add('ci-flag-pending');
          f.style.setProperty('--flag-i', i);
          io.observe(f);
        });
      }, 280);
    }
  }).observe(sd, { attributes: true, attributeFilter: ['class'] });
}

// ── V4-5. will-change dinâmico em botões de navegação ────────────────────
function v4WillChange() {
  const NAV = '.ci-next, .ci-back-btn';
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest(NAV);
    if (b) b.style.willChange = 'transform, opacity';
  }, { passive: true });
  document.addEventListener('pointerup', e => {
    const b = e.target.closest(NAV);
    if (b) setTimeout(() => { b.style.willChange = 'auto'; }, 500);
  }, { passive: true });
  document.addEventListener('pointercancel', e => {
    const b = e.target.closest(NAV);
    if (b) b.style.willChange = 'auto';
  }, { passive: true });
}

// ── V4-6. CSS contain:style em todas as telas (isolamento de estilos) ─────
function v4CSSContain() {
  document.querySelectorAll('.ci-screen').forEach(s => {
    s.style.contain = 'style';
  });
}

// ── V4-7. Cleanup de hints em telas inativas via rIC ─────────────────────
(function v4HintCleanup() {
  setTimeout(() => _rIC(() => {
    document.querySelectorAll('.ci-context-hint, .ci-inline-hint').forEach(h => {
      if (!h.closest('.ci-screen.active')) h.remove();
    });
    v4HintCleanup();
  }), 4_000);
})();

// ── V4-8. Reposicionar tooltip Bristol ao redimensionar (throttle 150ms) ──
(function() {
  window.addEventListener('resize', _throttle(() => {
    const tip = document.querySelector('.ci-bristol-tooltip');
    const focused = document.activeElement;
    if (tip && focused?.classList.contains('bristol-btn')) {
      positionTooltip(tip, focused);
    }
  }, 150), { passive: true });
})();

// ── V4-10. prefers-reduced-motion: classe no <html> para CSS opt-out ──────
function v4ReducedMotion() {
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (!mq) return;
  const toggle = () => document.documentElement.classList.toggle('ci-reduced-motion', mq.matches);
  toggle();
  mq.addEventListener('change', toggle);
}

// Estende exports
if (window._checkinExtras) {
  window._checkinExtras.version = 'V4';
  window._checkinExtras.rIC = _rIC;
}

// ═══ POLIMENTO V5 ═══
// 15 melhorias: haptic conclusão, timer sessão, comparativo ontem, dark-mode auto,
//   idle nudge, atalhos 1-5, echo toast, voz, sons opcionais, share, resumo inline,
//   swipe esquerda avança, persistir ontem, timer por tela, badge elapsed

const YESTERDAY_KEY = 'erg_checkin_yesterday';
const SOUND_KEY     = 'erg_checkin_sound';

let _sessionStart  = null;
let _lastInteract  = Date.now();
let _audioCtx      = null;
let _soundEnabled  = false;
let _timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  v5HapticOnDone();
  v5SessionTimer();
  v5YesterdayComparison();
  v5AutoDarkMode();
  v5IdleNudge();
  v5DigitShortcuts();
  v5AnswerEchoToast();
  v5VoiceInput();
  v5SoundToggle();
  v5ShareButton();
  v5InlineSummary();
  v5SwipeLeftAdvance();
  v5PersistYesterday();
  v5ElapsedBadge();
});

// ── V5-1. Haptic pattern na tela de conclusão ─────────────────────────────
function v5HapticOnDone() {
  const sd = document.getElementById('screen-done');
  if (!sd) return;
  new MutationObserver(() => {
    if (sd.classList.contains('active')) {
      navigator.vibrate?.([200, 60, 200, 60, 300]);
    }
  }).observe(sd, { attributes: true, attributeFilter: ['class'] });
}

// ── V5-2 + V5-14. Timer de sessão: inicia ao sair de screen-0, exibe por tela ─
function v5SessionTimer() {
  const s0        = document.getElementById('screen-0');
  const stepCount = document.getElementById('ci-step-count');
  if (!s0 || !stepCount) return;

  const timerEl = document.createElement('span');
  timerEl.id = 'ci-session-timer';
  timerEl.className = 'ci-session-timer';
  timerEl.setAttribute('aria-live', 'polite');
  timerEl.setAttribute('aria-atomic', 'true');
  stepCount.after(timerEl);

  new MutationObserver(() => {
    if (!s0.classList.contains('active') && !_sessionStart) {
      _sessionStart = Date.now();
      _timerInterval = setInterval(() => {
        const active = document.querySelector('.ci-screen.active');
        if (!active || active.id === 'screen-done') {
          clearInterval(_timerInterval);
          _timerInterval = null;
          return;
        }
        const elapsed = Math.floor((Date.now() - _sessionStart) / 1000);
        timerEl.textContent = elapsed + 's';
        timerEl.classList.toggle('ci-timer-warn', elapsed >= 50);
        timerEl.classList.toggle('ci-timer-crit', elapsed >= 70);
      }, 1000);
    }
  }).observe(s0, { attributes: true, attributeFilter: ['class'] });
}

// ── V5-3. Comparativo com ontem em cada escala ────────────────────────────
function v5YesterdayComparison() {
  try {
    const raw = localStorage.getItem(YESTERDAY_KEY);
    if (!raw) return;
    const yData    = JSON.parse(raw);
    const yest     = new Date();
    yest.setDate(yest.getDate() - 1);
    const yStr = yest.toISOString().split('T')[0];
    if (yData.date !== yStr) return;

    ['energia', 'humor', 'sono_qualidade', 'fome_nivel'].forEach(field => {
      const val  = yData[field];
      if (!val) return;
      const wrap = document.getElementById('scale-' + field);
      if (!wrap) return;
      const chip = document.createElement('span');
      chip.className = 'ci-yesterday-chip';
      chip.textContent = 'Ontem: ' + val;
      chip.setAttribute('aria-label', 'Valor de ontem: ' + val);
      const yBtn = wrap.querySelector('[data-val="' + val + '"]');
      if (yBtn) yBtn.classList.add('ci-yesterday-mark');
      wrap.before(chip);
    });
  } catch (_) {}
}

// ── V5-4. Dark mode automático por hora do dia (20h–6h) ───────────────────
function v5AutoDarkMode() {
  const h = new Date().getHours();
  if (h >= 20 || h < 6) {
    document.documentElement.classList.add('ci-dark-auto');
  }
}

// ── V5-5. Idle nudge: pulsa botão Continuar após 35s de inatividade ───────
function v5IdleNudge() {
  const resetIdle = () => { _lastInteract = Date.now(); };
  document.addEventListener('pointerdown', resetIdle, { passive: true });
  document.addEventListener('keydown',     resetIdle, { passive: true });

  setInterval(() => {
    const idle   = Date.now() - _lastInteract;
    const active = document.querySelector('.ci-screen.active');
    if (!active || active.id === 'screen-0' || active.id === 'screen-done') return;
    const nextBtn = active.querySelector('.ci-next:not(.skip)');
    if (!nextBtn) return;
    nextBtn.classList.toggle('ci-idle-pulse', idle >= 35_000);
  }, 5_000);
}

// ── V5-6. Atalhos 1-5: seleciona o n-ésimo botão de escala na tela ativa ──
function v5DigitShortcuts() {
  document.addEventListener('keydown', e => {
    const n = parseInt(e.key);
    if (!Number.isInteger(n) || n < 1 || n > 5) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const focused = document.activeElement;
    if (focused && (focused.tagName === 'TEXTAREA' || focused.tagName === 'INPUT')) return;
    const active = document.querySelector('.ci-screen.active');
    if (!active) return;
    const wraps = [...active.querySelectorAll('.ci-scale-wrap')].filter(w => {
      const sub = w.closest('.ci-sub-section');
      return !sub || sub.classList.contains('visible');
    });
    const target = wraps.find(w => !w.querySelector('.ci-scale-btn.active')) || wraps[0];
    if (!target) return;
    const btn = target.querySelectorAll('.ci-scale-btn')[n - 1];
    if (btn) { btn.click(); btn.focus(); }
  });
}

// ── V5-7. Echo toast: exibe label da resposta selecionada ─────────────────
function v5AnswerEchoToast() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.ci-scale-btn');
    if (!btn) return;
    const num   = btn.querySelector('.ci-scale-num')?.textContent?.trim() || btn.dataset.val;
    const label = btn.querySelector('.ci-scale-label')?.textContent?.trim();
    if (!num) return;
    _showEchoToast(label ? num + ' — ' + label : 'Selecionado: ' + num);
  });
}

function _showEchoToast(msg) {
  document.querySelectorAll('.ci-echo-toast').forEach(t => t.remove());
  const toast = document.createElement('div');
  toast.className = 'ci-echo-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('ci-echo-visible')));
  setTimeout(() => {
    toast.classList.remove('ci-echo-visible');
    setTimeout(() => toast.remove(), 350);
  }, 1600);
}

// ── V5-8. Ditado por voz: botão mic no textarea de observação ────────────
function v5VoiceInput() {
  const ta = document.getElementById('obs');
  if (!ta) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ci-voice-btn';
  btn.setAttribute('aria-label', 'Ditado por voz');
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('title', 'Clique para ditar');
  btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
  ta.after(btn);

  let rec = null;
  let listening = false;

  btn.addEventListener('click', () => {
    if (listening) { rec?.stop(); return; }
    try {
      rec = new SR();
      rec.lang = 'pt-BR';
      rec.continuous = false;
      rec.interimResults = true;
      rec.onstart = () => {
        listening = true;
        btn.classList.add('ci-voice-active');
        btn.setAttribute('aria-label', 'Gravando… (clique para parar)');
        btn.setAttribute('aria-pressed', 'true');
      };
      rec.onresult = ev => {
        ta.value = Array.from(ev.results).map(r => r[0].transcript).join('');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const stopFn = () => {
        listening = false;
        btn.classList.remove('ci-voice-active');
        btn.setAttribute('aria-label', 'Ditado por voz');
        btn.setAttribute('aria-pressed', 'false');
      };
      rec.onerror = stopFn;
      rec.onend   = stopFn;
      rec.start();
    } catch (_) {}
  });
}

// ── V5-9. Sons sutis opcionais via AudioContext ───────────────────────────
function v5SoundToggle() {
  _soundEnabled = localStorage.getItem(SOUND_KEY) === '1';

  const header = document.getElementById('ci-header');
  if (!header) return;

  const ICON_ON  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
  const ICON_OFF = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ci-sound-btn';
  btn.setAttribute('aria-pressed', _soundEnabled ? 'true' : 'false');
  btn.setAttribute('aria-label', _soundEnabled ? 'Som ligado' : 'Som desligado');
  btn.title = 'Sons sutis';
  btn.innerHTML = _soundEnabled ? ICON_ON : ICON_OFF;

  btn.addEventListener('click', () => {
    _soundEnabled = !_soundEnabled;
    localStorage.setItem(SOUND_KEY, _soundEnabled ? '1' : '0');
    btn.setAttribute('aria-pressed', _soundEnabled ? 'true' : 'false');
    btn.setAttribute('aria-label', _soundEnabled ? 'Som ligado' : 'Som desligado');
    btn.innerHTML = _soundEnabled ? ICON_ON : ICON_OFF;
    if (_soundEnabled) _playTone(660, 0.07, 0.1);
  });

  header.insertBefore(btn, header.firstChild);

  document.addEventListener('click', e => {
    if (!_soundEnabled) return;
    if (e.target.closest('.ci-scale-btn'))     _playTone(523.25, 0.04, 0.09);
    else if (e.target.closest('.ci-opt'))      _playTone(587.33, 0.04, 0.09);
    else if (e.target.closest('.ci-next:not(.skip)')) _playTone(783.99, 0.05, 0.12);
  }, { passive: true });
}

function _getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (_) { return null; }
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume().catch(() => {});
  return _audioCtx;
}

function _playTone(freq, gain, dur) {
  const ctx = _getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.01);
  } catch (_) {}
}

// ── V5-10. Botão de compartilhar na tela de conclusão ─────────────────────
function v5ShareButton() {
  const sd = document.getElementById('screen-done');
  if (!sd) return;

  new MutationObserver(() => {
    if (!sd.classList.contains('active') || sd.querySelector('.ci-share-btn')) return;
    setTimeout(() => {
      const score = document.getElementById('score-num')?.textContent?.trim() || '—';
      const cls   = document.getElementById('score-class')?.textContent?.trim() || '';
      const text  = 'Meu check-in com Dra. Evelin — Score ' + score + (cls ? ' · ' + cls : '') + ' 🌿';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ci-share-btn';
      btn.setAttribute('aria-label', 'Compartilhar resultado do check-in');
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Compartilhar';

      btn.addEventListener('click', async () => {
        if (navigator.share) {
          try { await navigator.share({ text }); return; } catch (_) {}
        }
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = '✓ Copiado!';
          setTimeout(() => {
            btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Compartilhar';
          }, 2500);
        } catch (_) {}
      });

      sd.querySelector('.ci-done-actions')?.insertAdjacentElement('afterbegin', btn);
    }, 400);
  }).observe(sd, { attributes: true, attributeFilter: ['class'] });
}

// ── V5-11. Resumo inline das respostas na tela final ──────────────────────
function v5InlineSummary() {
  const sd = document.getElementById('screen-done');
  if (!sd) return;

  new MutationObserver(() => {
    if (!sd.classList.contains('active') || sd.querySelector('.ci-summary')) return;
    setTimeout(_renderSummary, 350);
  }).observe(sd, { attributes: true, attributeFilter: ['class'] });
}

function _renderSummary() {
  const sd = document.getElementById('screen-done');
  if (!sd || sd.querySelector('.ci-summary')) return;

  const SCALE_IDS = {
    'scale-energia':        'Energia',
    'scale-humor':          'Humor',
    'scale-sono_qualidade': 'Sono',
    'scale-fome_nivel':     'Fome',
  };
  const WATER = { '0.5': '<1L', '1.5': '1–2L', '2.5': '2–3L', '3.5': '>3L' };
  const rows  = [];

  Object.entries(SCALE_IDS).forEach(([id, label]) => {
    const active = document.getElementById(id)?.querySelector('.ci-scale-btn.active');
    if (!active) return;
    rows.push({
      label,
      val: active.dataset.val,
      sub: active.querySelector('.ci-scale-label')?.textContent?.trim() || '',
    });
  });

  const waterActive = document.querySelector('#opts-agua .ci-opt.active');
  if (waterActive) {
    rows.push({ label: 'Água', val: WATER[waterActive.dataset.val] || waterActive.dataset.val + 'L', sub: '' });
  }

  if (rows.length < 2) return;

  const summary = document.createElement('div');
  summary.className = 'ci-summary';
  summary.setAttribute('aria-label', 'Resumo das respostas do check-in');

  const title = document.createElement('p');
  title.className = 'ci-summary-title';
  title.textContent = 'Resumo de hoje';
  summary.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'ci-summary-grid';
  rows.forEach(r => {
    const item = document.createElement('div');
    item.className = 'ci-summary-item';
    item.innerHTML = '<span class="ci-s-label">' + r.label + '</span>'
      + '<span class="ci-s-val">' + r.val + (r.sub ? '<small> ' + r.sub + '</small>' : '') + '</span>';
    grid.appendChild(item);
  });
  summary.appendChild(grid);

  sd.querySelector('.ci-done-score')?.after(summary);
}

// ── V5-12. Swipe para esquerda avança (complemento ao swipe direita voltar) ─
function v5SwipeLeftAdvance() {
  const shell = document.querySelector('.ci-shell');
  if (!shell) return;
  let sx = 0, sy = 0;
  shell.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  shell.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.85) return;
    if (dx < 0) window.avancarStep?.();
  }, { passive: true });
}

// ── V5-13. Persiste valores de hoje para o comparativo de amanhã ──────────
function v5PersistYesterday() {
  const sd = document.getElementById('screen-done');
  if (!sd) return;

  new MutationObserver(() => {
    if (!sd.classList.contains('active')) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const data  = { date: today };
      ['energia', 'humor', 'sono_qualidade', 'fome_nivel'].forEach(field => {
        const active = document.getElementById('scale-' + field)?.querySelector('.ci-scale-btn.active');
        if (active) data[field] = parseInt(active.dataset.val);
      });
      localStorage.setItem(YESTERDAY_KEY, JSON.stringify(data));
    } catch (_) {}
  }).observe(sd, { attributes: true, attributeFilter: ['class'] });
}

// ── V5-15. Badge "Concluído em Xs" na tela de conclusão ───────────────────
function v5ElapsedBadge() {
  const sd = document.getElementById('screen-done');
  if (!sd) return;

  new MutationObserver(() => {
    if (!sd.classList.contains('active') || sd.querySelector('.ci-elapsed-badge')) return;
    if (!_sessionStart) return;
    const elapsed = Math.round((Date.now() - _sessionStart) / 1000);
    const badge   = document.createElement('p');
    badge.className = 'ci-elapsed-badge';
    badge.setAttribute('aria-label', 'Check-in concluído em ' + elapsed + ' segundos');
    badge.textContent = '✓ ' + elapsed + 's';
    sd.querySelector('.ci-done-score')?.appendChild(badge);
  }).observe(sd, { attributes: true, attributeFilter: ['class'] });
}

if (window._checkinExtras) {
  window._checkinExtras.version    = 'V5';
  window._checkinExtras.playTone   = _playTone;
  window._checkinExtras.echoToast  = _showEchoToast;
}
