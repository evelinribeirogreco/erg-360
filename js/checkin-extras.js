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
