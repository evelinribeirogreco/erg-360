// js/diario-extras.js
// ═══ POLIMENTO V1 ═══
// 15 micro-melhorias: progress, draft, swipe, toast, streak, adesão colorida, acessibilidade

const _DRAFT_PFX = 'erg_diario_draft_';
let _dirty = false;

// ── 1. Toast notification ─────────────────────────────────────────────────────
function _showToast(msg, type = 'success') {
  const t = document.getElementById('diario-toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `diario-toast diario-toast--${type} diario-toast--show`;
  clearTimeout(t._tmr);
  t._tmr = setTimeout(() => t.classList.remove('diario-toast--show'), 3500);
}

// ── 2. Progress bar (refeições preenchidas) ───────────────────────────────────
const _MEAL_IDS = ['d-cafe','d-lanche-manha','d-almoco','d-lanche-tarde','d-jantar','d-ceia'];

function _updateProgress() {
  const filled = _MEAL_IDS.filter(id => {
    const el = document.getElementById(id);
    return el && el.value.trim().length > 0;
  }).length;
  const pct = Math.round((filled / 6) * 100);

  const bar  = document.getElementById('diario-progress-bar');
  const txt  = document.getElementById('diario-progress-text');
  const wrap = document.getElementById('diario-progress-wrap');

  if (bar) {
    bar.style.width = pct + '%';
    bar.className = 'diario-progress-bar' +
      (pct === 100 ? ' diario-progress-bar--full' :
       pct >= 50   ? ' diario-progress-bar--half' :
                     ' diario-progress-bar--low');
  }
  if (txt) txt.textContent = `${filled} / 6 refeições registradas`;
  if (wrap) {
    wrap.setAttribute('aria-valuenow', filled);
    wrap.setAttribute('aria-valuetext', `${filled} de 6 refeições registradas`);
  }
}

// ── 3. Auto-save rascunho no localStorage (debounce 2 s) ──────────────────────
function _draftKey() {
  return _DRAFT_PFX + (document.getElementById('diario-date-input')?.value || 'x');
}

function _saveDraft() {
  const draft = {};
  ['cafe','lanche-manha','almoco','lanche-tarde','jantar','ceia','obs'].forEach(id => {
    const el = document.getElementById('d-' + id);
    if (el) draft[id] = el.value;
  });
  draft._adesao = document.getElementById('d-adesao')?.value || '';
  try { localStorage.setItem(_draftKey(), JSON.stringify(draft)); } catch (_) {}
  _dirty = true;
}

function _clearDraft() {
  try { localStorage.removeItem(_draftKey()); } catch (_) {}
  _dirty = false;
}

const _saveDraftDebounced = (() => {
  let t;
  return () => { clearTimeout(t); t = setTimeout(_saveDraft, 2000); };
})();

// ── 4. Auto-resize textareas ──────────────────────────────────────────────────
function _autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// ── 5. Saudação por horário ───────────────────────────────────────────────────
function _saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ── 6. Streak de dias consecutivos ────────────────────────────────────────────
function _computeStreak() {
  const items = document.querySelectorAll('#diario-historico-list .diario-historico-item');
  if (!items.length) return 0;
  const today = new Date().toISOString().split('T')[0];
  const dates = Array.from(items).map(el => {
    const m = el.getAttribute('onclick')?.match(/setDate\('(\d{4}-\d{2}-\d{2})'\)/);
    return m ? m[1] : null;
  }).filter(Boolean).sort().reverse();

  if (!dates.length) return 0;
  let streak = 0;
  let ref = new Date(today + 'T12:00:00');
  for (const d of dates) {
    const dDate = new Date(d + 'T12:00:00');
    const diff = Math.round((ref - dDate) / 86400000);
    if (diff <= 1) { streak++; ref = dDate; }
    else break;
  }
  return streak;
}

function _updateStreakBadge(streak) {
  const badge = document.getElementById('diario-streak-badge');
  if (!badge) return;
  if (streak >= 2) {
    badge.hidden = false;
    badge.textContent = `${streak} dias seguidos`;
    badge.setAttribute('aria-label', `Sequência de ${streak} dias consecutivos de registro`);
  } else {
    badge.hidden = true;
  }
}

// ── 7. Cor dinâmica nos botões de adesão ──────────────────────────────────────
const _ADESAO_COLORS = {
  1: 'var(--error)',
  2: 'var(--warning)',
  3: 'var(--detail)',
  4: 'var(--accent)',
  5: 'var(--gold)',
};

function _updateAdesaoColor() {
  const val = parseInt(document.getElementById('d-adesao')?.value || '0');
  const scale = document.querySelector('.diario-adesao-scale');
  if (!scale) return;
  scale.style.setProperty('--adesao-clr', _ADESAO_COLORS[val] || 'var(--text)');
}

// ── 8. Badge "Hoje" na navegação de data ──────────────────────────────────────
function _checkTodayBadge() {
  const input = document.getElementById('diario-date-input');
  const today = new Date().toISOString().split('T')[0];
  let badge = document.getElementById('diario-today-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'diario-today-badge';
    badge.className = 'diario-today-badge';
    badge.textContent = 'Hoje';
    badge.setAttribute('aria-label', 'Visualizando registro de hoje');
    document.querySelector('.diario-date-nav')?.appendChild(badge);
  }
  badge.hidden = input?.value !== today;
}

// ── 9. Swipe left/right para navegar datas (mobile) ──────────────────────────
function _initSwipe() {
  const main = document.querySelector('.diario-main');
  if (!main) return;
  let sx = 0, sy = 0;
  main.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  main.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = Math.abs(e.changedTouches[0].clientY - sy);
    if (Math.abs(dx) > 60 && dy < 40 && typeof window.changeDate === 'function') {
      window.changeDate(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
}

// ── 10. Atalho Ctrl+S / ⌘S ───────────────────────────────────────────────────
function _initKeyboardShortcut() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      document.getElementById('diario-form')?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      );
    }
  });
}

// ── 11. Scroll para primeira refeição vazia ───────────────────────────────────
function _scrollToFirstEmpty() {
  const emptyId = _MEAL_IDS.find(id => {
    const el = document.getElementById(id);
    return el && el.value.trim().length === 0;
  });
  if (!emptyId) return;
  const ref = document.getElementById(emptyId)?.closest('.diario-refeicao');
  if (ref) ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── 12. Animação staggered de entrada nos cards ───────────────────────────────
function _staggerCards() {
  document.querySelectorAll('.diario-refeicao').forEach((el, i) => {
    el.style.animationDelay = `${i * 55}ms`;
    el.classList.add('diario-ref--enter');
  });
}

// ── 13. Vibração háptica ao salvar ────────────────────────────────────────────
function _haptic() {
  if ('vibrate' in navigator) navigator.vibrate([12, 30, 12]);
}

// ── 14. Warning ao sair com alterações não salvas ─────────────────────────────
function _initBeforeUnload() {
  window.addEventListener('beforeunload', e => {
    if (!_dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
}

// ── 15. Observa mensagem de salvo para disparar toast + háptico ───────────────
function _observeSavedMsg() {
  const msg = document.getElementById('diario-saved-msg');
  if (!msg) return;
  new MutationObserver(() => {
    if (msg.style.display === 'none' || msg.style.display === '') return;
    const isError = msg.textContent.trimStart().startsWith('Erro');
    _showToast(msg.textContent.trim(), isError ? 'error' : 'success');
    if (!isError) { _haptic(); _clearDraft(); }
  }).observe(msg, { attributes: true, attributeFilter: ['style'] });
}

// ── Observa mudança de data (text do date-full) para atualizar badge ──────────
function _observeDateChange() {
  const dateFull = document.getElementById('diario-date-full');
  if (!dateFull) return;
  new MutationObserver(() => {
    _checkTodayBadge();
    requestAnimationFrame(() => {
      _updateProgress();
      document.querySelectorAll('.diario-textarea').forEach(_autoResize);
    });
  }).observe(dateFull, { childList: true, subtree: true, characterData: true });
}

// ── Observa histórico carregado para calcular streak ─────────────────────────
function _observeHistorico() {
  const list = document.getElementById('diario-historico-list');
  if (!list) return;
  new MutationObserver(() => _updateStreakBadge(_computeStreak()))
    .observe(list, { childList: true, subtree: true });
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Saudação
  const eyebrow = document.querySelector('.diario-hero .diario-eyebrow');
  if (eyebrow) eyebrow.textContent = _saudacao() + ' · Registro do dia';

  // Textareas: auto-resize + progress + draft
  document.querySelectorAll('.diario-textarea').forEach(el => {
    _autoResize(el);
    el.addEventListener('input', () => {
      _autoResize(el);
      _updateProgress();
      _saveDraftDebounced();
      _dirty = true;
    });
  });

  // Adesão: cor + draft
  document.querySelectorAll('.diario-adesao-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      requestAnimationFrame(_updateAdesaoColor);
      _dirty = true;
    });
  });

  // Form submit: marca não-dirty (o toast/háptico vem pelo observer)
  document.getElementById('diario-form')?.addEventListener('submit', () => {
    _dirty = false;
  });

  _initKeyboardShortcut();
  _initSwipe();
  _initBeforeUnload();
  _observeSavedMsg();
  _observeDateChange();
  _observeHistorico();
  _checkTodayBadge();
  _updateProgress();
  _staggerCards();

  // Scroll para primeira refeição vazia (após main JS preencher formulário)
  setTimeout(_scrollToFirstEmpty, 1400);
});

window._diarioExtras = {
  showToast:      _showToast,
  updateProgress: _updateProgress,
  saveDraft:      _saveDraft,
  clearDraft:     _clearDraft,
};

// ═══ POLIMENTO V3 ═══
// 12 melhorias de acessibilidade: skip-links, ARIA live, radiogroup, reduced-motion, high-contrast

// ── A1. Skip links (usuários de teclado/leitor de tela) ───────────────────────
function _initSkipLinks() {
  if (document.querySelector('.diario-skip-link')) return;
  const targets = [
    { href: '#diario-form',     label: 'Pular para o formulário' },
    { href: '#diario-save-btn', label: 'Pular para salvar'        },
  ];
  const frag = document.createDocumentFragment();
  targets.forEach(({ href, label }) => {
    const a = document.createElement('a');
    a.href = href;
    a.className = 'diario-skip-link';
    a.textContent = label;
    frag.appendChild(a);
  });
  document.body.insertBefore(frag, document.body.firstChild);
}

// ── A2. ARIA live region para anunciar mudanças de data ───────────────────────
let _srDateEl = null;

function _initSrAnnouncer() {
  if (document.getElementById('diario-sr-date')) return;
  _srDateEl = document.createElement('div');
  _srDateEl.id = 'diario-sr-date';
  _srDateEl.setAttribute('aria-live', 'polite');
  _srDateEl.setAttribute('aria-atomic', 'true');
  _srDateEl.className = 'diario-sr-only';
  document.body.appendChild(_srDateEl);
}

function _announceDateChange() {
  if (!_srDateEl) return;
  const val = document.getElementById('diario-date-input')?.value;
  if (!val) return;
  try {
    const d = new Date(val + 'T12:00:00');
    const txt = d.toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    _srDateEl.textContent = '';
    requestAnimationFrame(() => { _srDateEl.textContent = txt; });
  } catch (_) {}
}

// ── A3. Observa mudança na data exibida para anunciar via SR ──────────────────
function _initDateObserverV3() {
  const dateFull = document.getElementById('diario-date-full');
  if (!dateFull) return;
  new MutationObserver(() => {
    _announceDateChange();
    setTimeout(_syncAdesaoAria, 350);
  }).observe(dateFull, { childList: true, subtree: true, characterData: true });
}

// ── A4. aria-labelledby nas textareas + role="group" nos cards ────────────────
function _labelMeals() {
  document.querySelectorAll('.diario-refeicao').forEach((card, i) => {
    const nome = card.querySelector('.diario-ref-nome');
    const ta   = card.querySelector('.diario-textarea');
    if (!nome || !ta) return;
    if (!nome.id) nome.id = `diario-ref-nome-${i}`;
    ta.setAttribute('aria-labelledby', nome.id);
    card.setAttribute('role', 'group');
    card.setAttribute('aria-labelledby', nome.id);
  });
}

// ── A5. Adesão: radiogroup + aria-checked + navegação por setas ───────────────
function _syncAdesaoAria() {
  const val = parseInt(document.getElementById('d-adesao')?.value || '0');
  document.querySelectorAll('.diario-adesao-btn[role="radio"]').forEach((b, i) => {
    b.setAttribute('aria-checked', String(i + 1 === val));
  });
}

function _initAdesaoA11y() {
  const scale = document.querySelector('.diario-adesao-scale');
  if (!scale || scale.dataset.a11yV3) return;
  scale.dataset.a11yV3 = '1';
  scale.setAttribute('role', 'radiogroup');
  scale.setAttribute('aria-label', 'Nível de adesão ao plano de 1 (péssima) a 5 (ótima)');

  const btns = Array.from(scale.querySelectorAll('.diario-adesao-btn'));
  btns.forEach((btn, idx) => {
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', 'false');
    const lbl = btn.querySelector('small')?.textContent?.trim() ?? `Nível ${idx + 1}`;
    btn.setAttribute('aria-label', `${idx + 1} — ${lbl}`);

    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault(); btns[(idx + 1) % btns.length].focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault(); btns[(idx - 1 + btns.length) % btns.length].focus();
      } else if (e.key === ' ') {
        e.preventDefault(); btn.click();
      }
    });

    btn.addEventListener('click', () =>
      btns.forEach((b, j) => b.setAttribute('aria-checked', String(j === idx)))
    );
  });
}

// ── A6. aria-label nos botões de navegação de data ────────────────────────────
function _labelNavBtns() {
  const navBtns = document.querySelectorAll('.diario-nav-btn');
  if (navBtns[0] && !navBtns[0].getAttribute('aria-label'))
    navBtns[0].setAttribute('aria-label', 'Dia anterior');
  if (navBtns[1] && !navBtns[1].getAttribute('aria-label'))
    navBtns[1].setAttribute('aria-label', 'Próximo dia');
}

// ── A7. Atalho de teclado declarado no botão salvar ───────────────────────────
function _addSaveShortcutHint() {
  const btn = document.getElementById('diario-save-btn');
  if (btn) btn.setAttribute('aria-keyshortcuts', 'Control+s Meta+s');
}

// ── A8. Anunciar rascunho salvo automaticamente (throttle 30 s) ───────────────
let _lastDraftSrAt = 0;

function _announceDraftSr() {
  if (!_srDateEl) return;
  const now = Date.now();
  if (now - _lastDraftSrAt < 30000) return;
  _lastDraftSrAt = now;
  const prev = _srDateEl.textContent;
  _srDateEl.textContent = 'Rascunho salvo automaticamente';
  setTimeout(() => { _srDateEl.textContent = prev; }, 2500);
}

// ── V3 INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _initSrAnnouncer();
  _initSkipLinks();
  _labelMeals();
  _initAdesaoA11y();
  _initDateObserverV3();
  _labelNavBtns();
  _addSaveShortcutHint();
  _announceDateChange();

  document.querySelectorAll('.diario-textarea').forEach(ta => {
    ta.addEventListener('input', () => {
      clearTimeout(ta._srDraftTmr);
      ta._srDraftTmr = setTimeout(_announceDraftSr, 3500);
    });
  });
});

Object.assign(window._diarioExtras, {
  announceDateChange: _announceDateChange,
  syncAdesaoAria:     _syncAdesaoAria,
});

// ═══ POLIMENTO V4 ═══
// 10 melhorias de performance: rIC, Page Visibility, IntersectionObserver,
// prefetch Supabase, ResizeObserver, cache de streak, limpeza de drafts,
// CSS contain, scroll-snap mobile, performance marks

// ── P1. requestIdleCallback com fallback + guard de rede ─────────────────────
const _rIC = typeof requestIdleCallback !== 'undefined'
  ? (cb, opts) => requestIdleCallback(cb, opts)
  : cb => setTimeout(cb, 80);

function _canPrefetch() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return true;
  if (conn.saveData) return false;
  return !['slow-2g', '2g'].includes(conn.effectiveType ?? '');
}

// ── P2. Page Visibility: flush imediato de rascunho ao ocultar aba ───────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden && _dirty) _saveDraft();
});

// ── P3. Limpeza automática de rascunhos com +30 dias via rIC ─────────────────
_rIC(() => {
  const TTL = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('erg_diario_draft_'))
      .forEach(k => {
        const dateStr = k.replace('erg_diario_draft_', '');
        const t = new Date(dateStr + 'T12:00:00').getTime();
        if (!isNaN(t) && now - t > TTL) localStorage.removeItem(k);
      });
  } catch (_) {}
}, { timeout: 10000 });

// ── P4. Prefetch Supabase de datas adjacentes (armazena em Map) ───────────────
const _diarioPrefetchCache = new Map();

async function _prefetchDiarioDate(dateISO) {
  if (!_canPrefetch()) return;
  if (_diarioPrefetchCache.has(dateISO)) return;
  const sb = window._supabase;
  if (!sb) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;
    _diarioPrefetchCache.set(dateISO, '__pending__');
    const { data } = await sb
      .from('diario_alimentar')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('data', dateISO)
      .maybeSingle();
    _diarioPrefetchCache.set(dateISO, data ?? null);
  } catch (_) {
    _diarioPrefetchCache.delete(dateISO);
  }
}

// ── P5. Hover/focus nos botões de nav dispara prefetch ───────────────────────
function _initNavPrefetch() {
  const navBtns = document.querySelectorAll('.diario-nav-btn');
  const getAdjacentDate = (delta) => {
    const val = document.getElementById('diario-date-input')?.value;
    if (!val) return null;
    const d = new Date(val + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    return d.toISOString().split('T')[0];
  };
  navBtns[0]?.addEventListener('mouseenter', () => {
    const dt = getAdjacentDate(-1); if (dt) _prefetchDiarioDate(dt);
  }, { passive: true });
  navBtns[0]?.addEventListener('focusin', () => {
    const dt = getAdjacentDate(-1); if (dt) _prefetchDiarioDate(dt);
  }, { passive: true });
  navBtns[1]?.addEventListener('mouseenter', () => {
    const dt = getAdjacentDate(+1); if (dt) _prefetchDiarioDate(dt);
  }, { passive: true });
  navBtns[1]?.addEventListener('focusin', () => {
    const dt = getAdjacentDate(+1); if (dt) _prefetchDiarioDate(dt);
  }, { passive: true });
}

// ── P6. IntersectionObserver: adia animação de cards abaixo da fold ──────────
function _initCardScrollAnim() {
  if (!window.IntersectionObserver) return;
  const cards = document.querySelectorAll('.diario-refeicao');
  const vH = window.innerHeight || document.documentElement.clientHeight;

  const belowFold = Array.from(cards).filter(c => c.getBoundingClientRect().top >= vH - 20);
  if (!belowFold.length) return;

  belowFold.forEach(c => {
    c.classList.remove('diario-ref--enter');
    c.style.opacity = '0';
    c.style.transform = 'translateY(10px)';
    c.style.willChange = 'opacity, transform';
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting) return;
      target.style.opacity = '';
      target.style.transform = '';
      target.classList.add('diario-ref--enter');
      io.unobserve(target);
      target.addEventListener('animationend', () => {
        target.style.willChange = '';
      }, { once: true });
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  belowFold.forEach(c => io.observe(c));
}

// ── P7. sessionStorage cache para streak (TTL 90 s) ──────────────────────────
const _STREAK_CACHE_K = 'erg_streak_v4';

function _getCachedStreak() {
  try {
    const raw = sessionStorage.getItem(_STREAK_CACHE_K);
    if (!raw) return null;
    const { v, t } = JSON.parse(raw);
    return Date.now() - t < 90000 ? v : null;
  } catch (_) { return null; }
}

function _setCachedStreak(v) {
  try {
    sessionStorage.setItem(_STREAK_CACHE_K, JSON.stringify({ v, t: Date.now() }));
  } catch (_) {}
}

// Invalida cache quando historico muda (V1 já recomputa; só invalida o cache)
(function () {
  const list = document.getElementById('diario-historico-list');
  if (!list) return;
  new MutationObserver(() => sessionStorage.removeItem(_STREAK_CACHE_K))
    .observe(list, { childList: true, subtree: true });
})();

// ── P8. ResizeObserver: auto-resize textareas ao mudar layout externo ─────────
function _initResizeObserver() {
  if (!window.ResizeObserver) return;
  let _roThrottle = false;
  const ro = new ResizeObserver(entries => {
    if (_roThrottle) return;
    _roThrottle = true;
    requestAnimationFrame(() => {
      entries.forEach(({ target }) => {
        Array.from(target.querySelectorAll('.diario-textarea')).forEach(ta => {
          ta.style.height = 'auto';
          ta.style.height = ta.scrollHeight + 'px';
        });
      });
      _roThrottle = false;
    });
  });
  document.querySelectorAll('.diario-refeicao').forEach(c => ro.observe(c));
}

// ── P9. Performance marks para diagnóstico de init ───────────────────────────
if (typeof performance?.mark === 'function') {
  performance.mark('diario-v4:start');
  window.addEventListener('load', () => {
    try {
      performance.mark('diario-v4:loaded');
      performance.measure('diario-v4:init-to-load', 'diario-v4:start', 'diario-v4:loaded');
    } catch (_) {}
  }, { once: true });
}

// ── P10. content-visibility: auto no historico para pular render fora da view ─
_rIC(() => {
  const hist = document.getElementById('diario-historico')
             ?? document.querySelector('.diario-historico');
  if (!hist) return;
  if (CSS?.supports?.('content-visibility', 'auto')) {
    hist.style.contentVisibility = 'auto';
    hist.style.containIntrinsicSize = '0 380px';
  }
}, { timeout: 4000 });

// ── V4 INIT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _initNavPrefetch();
  _initResizeObserver();
  setTimeout(_initCardScrollAnim, 0); // após _staggerCards do V1
});

Object.assign(window._diarioExtras, {
  prefetchDiarioDate: _prefetchDiarioDate,
  prefetchCache:      _diarioPrefetchCache,
  getCachedStreak:    _getCachedStreak,
  canPrefetch:        _canPrefetch,
  rIC:                _rIC,
});

// ═══ POLIMENTO V5 ═══
// 10 melhorias de funcionalidade: água, copiar dia anterior, undo, voz,
// dark mode, smart-placeholder, notificações, export texto, filtro, badge 100%

// ── V5-1. Contador de água ────────────────────────────────────────────────────
const _AGUA_KEY = () => `erg_agua_${document.getElementById('diario-date-input')?.value || 'x'}`;
const _AGUA_META = 8;

function _getWater() {
  try { return parseInt(localStorage.getItem(_AGUA_KEY()) || '0'); } catch (_) { return 0; }
}

function _setWater(n) {
  try { localStorage.setItem(_AGUA_KEY(), String(n)); } catch (_) {}
  _renderWater(n);
}

function _renderWater(n) {
  const dots = document.getElementById('diario-water-dots');
  const count = document.getElementById('diario-water-count');
  if (!dots || !count) return;
  let html = '';
  for (let i = 0; i < _AGUA_META; i++) {
    html += `<span class="diario-water-dot${i < n ? ' diario-water-dot--filled' : ''}" aria-hidden="true"></span>`;
  }
  dots.innerHTML = html;
  dots.setAttribute('aria-label', `${n} de ${_AGUA_META} copos`);
  count.textContent = `${n}/${_AGUA_META}`;
  count.classList.toggle('diario-water-count--full', n >= _AGUA_META);
}

function _initWaterTracker() {
  if (document.getElementById('diario-water-tracker')) return;
  const section = document.createElement('div');
  section.id = 'diario-water-tracker';
  section.className = 'diario-water-tracker';
  section.setAttribute('role', 'group');
  section.setAttribute('aria-label', 'Contador de água');
  section.innerHTML = `
    <div class="diario-water-header">
      <span class="diario-water-title">Água</span>
      <span class="diario-water-unit">copos de 200 ml</span>
    </div>
    <div class="diario-water-controls">
      <button type="button" class="diario-water-btn" id="diario-water-minus" aria-label="Remover um copo">−</button>
      <div class="diario-water-dots" id="diario-water-dots" role="img" aria-label="0 de 8 copos"></div>
      <button type="button" class="diario-water-btn" id="diario-water-plus" aria-label="Adicionar um copo">+</button>
      <span class="diario-water-count" id="diario-water-count" aria-live="polite">0/${_AGUA_META}</span>
    </div>`;
  const actions = document.querySelector('.diario-actions');
  if (actions) actions.parentNode.insertBefore(section, actions);
  _renderWater(_getWater());
  document.getElementById('diario-water-plus')?.addEventListener('click', () => {
    const cur = _getWater();
    if (cur < _AGUA_META) { _setWater(cur + 1); if ('vibrate' in navigator) navigator.vibrate(8); }
  });
  document.getElementById('diario-water-minus')?.addEventListener('click', () => {
    const cur = _getWater();
    if (cur > 0) _setWater(cur - 1);
  });
}

function _reloadWater() { _renderWater(_getWater()); }

// ── V5-2. Copiar do dia anterior ──────────────────────────────────────────────
let _undoState = null;

function _storeUndoState() {
  const state = {};
  ['cafe', 'lanche-manha', 'almoco', 'lanche-tarde', 'jantar', 'ceia', 'obs'].forEach(id => {
    const el = document.getElementById('d-' + id);
    if (el) state[id] = el.value;
  });
  state._adesao = document.getElementById('d-adesao')?.value || '';
  _undoState = state;
}

function _applyUndo() {
  if (!_undoState) return;
  Object.entries(_undoState).forEach(([id, val]) => {
    if (id === '_adesao') {
      const v = parseInt(val);
      if (v && typeof window.setAdesao === 'function') window.setAdesao(v);
      return;
    }
    const el = document.getElementById('d-' + id);
    if (el) {
      el.value = val;
      _autoResize(el);
      el.closest('.diario-refeicao')?.classList.toggle('preenchida', val.trim().length > 0);
    }
  });
  _updateProgress();
  _undoState = null;
  _dirty = true;
  _showToast('Ação desfeita', 'success');
}

function _showUndoToast(msg) {
  const t = document.getElementById('diario-toast');
  if (!t) return;
  t.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = msg;
  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.className = 'diario-toast-undo-btn';
  undoBtn.textContent = 'Desfazer';
  undoBtn.setAttribute('aria-label', 'Desfazer cópia do dia anterior');
  undoBtn.addEventListener('click', () => {
    t.classList.remove('diario-toast--show');
    _applyUndo();
  });
  t.appendChild(span);
  t.appendChild(undoBtn);
  t.className = 'diario-toast diario-toast--success diario-toast--show';
  clearTimeout(t._tmr);
  t._tmr = setTimeout(() => {
    t.classList.remove('diario-toast--show');
    setTimeout(() => { t.textContent = ''; }, 300);
  }, 6000);
}

function _initCopyPrevDay() {
  if (document.getElementById('diario-copy-prev')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'diario-copy-prev';
  btn.className = 'diario-copy-prev-btn';
  btn.setAttribute('aria-label', 'Copiar refeições do dia anterior para hoje');
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar dia anterior`;
  document.querySelector('.diario-actions')?.appendChild(btn);
  btn.addEventListener('click', async () => {
    const curVal = document.getElementById('diario-date-input')?.value;
    if (!curVal) return;
    const d = new Date(curVal + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const prev = d.toISOString().split('T')[0];
    btn.disabled = true;
    btn.textContent = 'Carregando...';
    const sb = window._supabase;
    if (!sb) { btn.disabled = false; btn.textContent = 'Copiar dia anterior'; return; }
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      const { data } = await sb.from('diario_alimentar')
        .select('cafe, lanche_manha, almoco, lanche_tarde, jantar, ceia')
        .eq('user_id', session.user.id)
        .eq('data', prev)
        .maybeSingle();
      if (!data) {
        _showToast('Nenhum registro encontrado para ontem', 'error');
      } else {
        _storeUndoState();
        const map = {
          'cafe': data.cafe, 'lanche-manha': data.lanche_manha, 'almoco': data.almoco,
          'lanche-tarde': data.lanche_tarde, 'jantar': data.jantar, 'ceia': data.ceia,
        };
        Object.entries(map).forEach(([id, val]) => {
          const el = document.getElementById('d-' + id);
          if (el && val) { el.value = val; el.closest('.diario-refeicao')?.classList.add('preenchida'); _autoResize(el); }
        });
        _updateProgress();
        _dirty = true;
        _showUndoToast('Refeições de ontem copiadas');
      }
    } catch (_) {
      _showToast('Erro ao carregar dia anterior', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar dia anterior`;
    }
  });
}

// ── V5-3. Voz para registro rápido ───────────────────────────────────────────
function _initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  document.querySelectorAll('.diario-refeicao').forEach(card => {
    if (card.querySelector('.diario-voice-btn')) return;
    const ta = card.querySelector('.diario-textarea');
    if (!ta) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'diario-voice-btn';
    btn.setAttribute('aria-label', 'Registrar por voz');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
    card.querySelector('.diario-ref-header')?.appendChild(btn);
    let rec = null;
    btn.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = 'pt-BR';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onstart = () => { btn.classList.add('diario-voice-btn--active'); btn.setAttribute('aria-pressed', 'true'); if ('vibrate' in navigator) navigator.vibrate(10); };
      rec.onresult = e => {
        const text = e.results[0][0].transcript;
        ta.value = (ta.value ? ta.value + ', ' : '') + text;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      };
      rec.onerror = rec.onend = () => { btn.classList.remove('diario-voice-btn--active'); btn.setAttribute('aria-pressed', 'false'); rec = null; };
      rec.start();
    });
  });
}

// ── V5-4. Dark mode automático ────────────────────────────────────────────────
function _initDarkMode() {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!mq) return;
  const apply = dark => document.documentElement.setAttribute('data-color-scheme', dark ? 'dark' : 'light');
  apply(mq.matches);
  mq.addEventListener('change', e => apply(e.matches));
}

// ── V5-5. Smart placeholder por horário ───────────────────────────────────────
function _initSmartPlaceholders() {
  const h = new Date().getHours();
  const hints = {
    'cafe':         h < 9  ? 'Acabou de acordar? Anote seu café...' : 'O que você comeu no café da manhã?',
    'lanche-manha': h >= 9 && h < 12 ? 'Hora do lanche! O que está comendo?' : 'Lanche da manhã...',
    'almoco':       h >= 11 && h < 14 ? 'Na hora do almoço? Anote agora!' : 'O que você comeu no almoço?',
    'lanche-tarde': h >= 14 && h < 17 ? 'Hora do lanche da tarde!' : 'Lanche da tarde...',
    'jantar':       h >= 18 ? 'Boa noite! Anotando o jantar?' : 'O que você comeu no jantar?',
    'ceia':         h >= 20 ? 'Alguma ceia esta noite?' : 'Ceia (se houver)...',
  };
  Object.entries(hints).forEach(([id, hint]) => {
    const el = document.getElementById('d-' + id);
    if (el && !el.value) el.placeholder = hint;
  });
}

// ── V5-6. Lembretes por horário (Notification API) ────────────────────────────
function _scheduleReminders() {
  const meals = [
    { name: 'Café da manhã', hour: 7,  min: 30 },
    { name: 'Lanche da manhã', hour: 10, min: 0  },
    { name: 'Almoço',        hour: 12, min: 30 },
    { name: 'Lanche da tarde', hour: 15, min: 30 },
    { name: 'Jantar',        hour: 19, min: 0  },
    { name: 'Ceia',          hour: 21, min: 30 },
  ];
  const now = Date.now();
  meals.forEach(({ name, hour, min }) => {
    const t = new Date();
    t.setHours(hour, min, 0, 0);
    const diff = t.getTime() - now;
    if (diff <= 0 || diff > 8 * 3600000) return;
    setTimeout(() => {
      if (Notification.permission !== 'granted') return;
      try { new Notification('ERG 360 — Hora de registrar', { body: `Hora do ${name}. Registre no diário!`, icon: '/icons/icon-152x152.png', tag: `erg-meal-${name}` }); } catch (_) {}
    }, diff);
  });
}

function _initMealReminders() {
  if (!('Notification' in window) || document.getElementById('diario-reminder-btn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'diario-reminder-btn';
  btn.className = 'diario-reminder-btn';
  btn.setAttribute('aria-label', 'Ativar lembretes de refeição');
  btn.setAttribute('aria-pressed', 'false');
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Lembretes`;
  const tryAutoSchedule = () => {
    if (Notification.permission === 'granted') {
      try { if (localStorage.getItem('erg_meal_reminders') === '1') { btn.classList.add('diario-reminder-btn--active'); btn.setAttribute('aria-pressed', 'true'); _scheduleReminders(); } } catch (_) {}
    }
  };
  document.querySelector('.diario-actions')?.appendChild(btn);
  tryAutoSchedule();
  btn.addEventListener('click', async () => {
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { _showToast('Permissão de notificação negada', 'error'); return; }
    }
    const active = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('diario-reminder-btn--active', active);
    try { localStorage.setItem('erg_meal_reminders', active ? '1' : '0'); } catch (_) {}
    _showToast(active ? 'Lembretes ativados' : 'Lembretes desativados', 'success');
    if (active) _scheduleReminders();
  });
}

// ── V5-7. Export como texto ───────────────────────────────────────────────────
function _initExportBtn() {
  if (document.getElementById('diario-export-btn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'diario-export-btn';
  btn.className = 'diario-export-btn';
  btn.setAttribute('aria-label', 'Exportar diário como arquivo de texto');
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar`;
  document.querySelector('.diario-actions')?.appendChild(btn);
  btn.addEventListener('click', () => {
    const date = document.getElementById('diario-date-input')?.value || 'data';
    const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const meals = [
      ['Café da manhã', 'd-cafe'], ['Lanche da manhã', 'd-lanche-manha'],
      ['Almoço', 'd-almoco'], ['Lanche da tarde', 'd-lanche-tarde'],
      ['Jantar', 'd-jantar'], ['Ceia', 'd-ceia'],
    ];
    let text = `DIÁRIO ALIMENTAR — ERG 360\n${dateLabel}\n${'─'.repeat(40)}\n\n`;
    meals.forEach(([label, id]) => {
      const val = document.getElementById(id)?.value?.trim();
      if (val) text += `${label}:\n${val}\n\n`;
    });
    const obs = document.getElementById('d-obs')?.value?.trim();
    if (obs) text += `Observações:\n${obs}\n\n`;
    const adesao = document.getElementById('d-adesao')?.value;
    if (adesao) text += `Adesão ao plano: ${adesao}/5\n`;
    const agua = _getWater();
    if (agua > 0) text += `Água: ${agua} copos\n`;
    text += `\nGerado por ERG 360 — ${new Date().toLocaleDateString('pt-BR')}`;
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = `diario-${date}.txt`; a.click();
      URL.revokeObjectURL(url);
      _showToast('Diário exportado', 'success');
    } catch (_) { _showToast('Erro ao exportar', 'error'); }
  });
}

// ── V5-8. Filtro: mostrar só refeições preenchidas ────────────────────────────
function _initMealFilter() {
  if (document.getElementById('diario-filter-btn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'diario-filter-btn';
  btn.className = 'diario-filter-btn';
  btn.setAttribute('aria-label', 'Mostrar apenas refeições preenchidas');
  btn.setAttribute('aria-pressed', 'false');
  btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Só preenchidas`;
  const progressWrap = document.getElementById('diario-progress-wrap');
  if (progressWrap) progressWrap.after(btn);
  btn.addEventListener('click', () => {
    const active = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('diario-filter-btn--active', active);
    document.querySelectorAll('.diario-refeicao').forEach(card => {
      const filled = card.querySelector('.diario-textarea')?.value.trim().length > 0;
      card.classList.toggle('diario-ref--hidden', active && !filled);
      active && !filled ? card.setAttribute('aria-hidden', 'true') : card.removeAttribute('aria-hidden');
    });
  });
}

// ── V5-9. Badge conquista ao completar todas as refeições ─────────────────────
let _achievementShown = false;

function _checkAchievement() {
  const filled = _MEAL_IDS.filter(id => document.getElementById(id)?.value.trim().length > 0).length;
  if (filled < 6 || _achievementShown) return;
  _achievementShown = true;
  const badge = document.getElementById('diario-streak-badge');
  if (badge) {
    const [prevText, prevHidden] = [badge.textContent, badge.hidden];
    badge.hidden = false;
    badge.textContent = 'Todas as refeicoes registradas!';
    badge.classList.add('diario-streak-badge--achievement');
    setTimeout(() => { badge.textContent = prevText; badge.hidden = prevHidden; badge.classList.remove('diario-streak-badge--achievement'); }, 4500);
  }
  _showToast('Parabens! Todas as refeicoes registradas hoje!', 'success');
  if ('vibrate' in navigator) navigator.vibrate([20, 50, 20, 50, 20]);
}

// ── V5-10. Modo offline: banner visual ao perder/recuperar rede ───────────────
function _initOfflineBanner() {
  if (document.getElementById('diario-offline-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'diario-offline-banner';
  banner.className = 'diario-offline-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.textContent = 'Sem conexao — alteracoes serao salvas ao reconectar';
  banner.hidden = true;
  document.body.insertBefore(banner, document.body.firstChild);
  const update = () => {
    banner.hidden = navigator.onLine;
    if (navigator.onLine) _showToast('Conexao restaurada', 'success');
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', () => { banner.hidden = false; });
  update();
}

// ── V5 INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _initDarkMode();
  _initOfflineBanner();
  _initSmartPlaceholders();
  _initWaterTracker();
  _initCopyPrevDay();
  _initVoice();
  _initMealReminders();
  _initExportBtn();
  _initMealFilter();

  document.querySelectorAll('.diario-textarea').forEach(el => {
    el.addEventListener('input', _checkAchievement);
  });

  const dateFull = document.getElementById('diario-date-full');
  if (dateFull) {
    new MutationObserver(() => {
      _achievementShown = false;
      _reloadWater();
      _initSmartPlaceholders();
    }).observe(dateFull, { childList: true, subtree: true, characterData: true });
  }
});

Object.assign(window._diarioExtras, {
  getWater:          _getWater,
  setWater:          _setWater,
  storeUndoState:    _storeUndoState,
  applyUndo:         _applyUndo,
  scheduleReminders: _scheduleReminders,
  checkAchievement:  _checkAchievement,
});

// ═══ POLIMENTO V6 ═══
// 11 features de gamificação: confetti canvas, AudioContext (tick/chime/splash),
// sistema de badges, streak milestones, ripple, progress shimmer, quote do dia,
// celebração água, ícone fogo no streak, tick sonoro refeição, badge disciplinado

// ── G1. Confetti canvas ───────────────────────────────────────────────────────
const _CONFETTI_COLORS_V6 = ['#4CB8A0', '#2D6A56', '#C9A84C', '#F7F6F2', '#8ECAB8', '#E8D5B0'];
let _confettiRaf;

function _launchConfetti({ count = 70, duration = 2800 } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  let canvas = document.getElementById('diario-confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'diario-confetti-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998;';
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  const particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 40,
    r: 3 + Math.random() * 5,
    color: _CONFETTI_COLORS_V6[Math.floor(Math.random() * _CONFETTI_COLORS_V6.length)],
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 3,
    vr: (Math.random() - 0.5) * 0.2,
    angle: Math.random() * Math.PI * 2,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }));
  const endTime = Date.now() + duration;
  function _drawConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pct = Math.max(0, (endTime - Date.now()) / duration);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.angle += p.vr;
      ctx.save();
      ctx.globalAlpha = pct;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') { ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); }
      else { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
    if (Date.now() < endTime) {
      _confettiRaf = requestAnimationFrame(_drawConfetti);
    } else {
      canvas.style.display = 'none';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  cancelAnimationFrame(_confettiRaf);
  _confettiRaf = requestAnimationFrame(_drawConfetti);
}

// ── G2. AudioContext: sons sutis (tick, chime, splash) ────────────────────────
let _audioCtxV6 = null;

function _getAudioCtxV6() {
  if (!_audioCtxV6) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) _audioCtxV6 = new AC();
  }
  return _audioCtxV6;
}

function _playTick() {
  const ac = _getAudioCtxV6(); if (!ac) return;
  try {
    const osc = ac.createOscillator(); const g = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, ac.currentTime);
    g.gain.setValueAtTime(0.04, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.08);
  } catch (_) {}
}

function _playChime() {
  const ac = _getAudioCtxV6(); if (!ac) return;
  try {
    [[523.25, 0], [659.25, 0.13], [783.99, 0.26]].forEach(([freq, delay]) => {
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
      g.gain.setValueAtTime(0.06, ac.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.28);
      osc.start(ac.currentTime + delay); osc.stop(ac.currentTime + delay + 0.28);
    });
  } catch (_) {}
}

function _playSplash() {
  const ac = _getAudioCtxV6(); if (!ac) return;
  try {
    const osc = ac.createOscillator(); const g = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ac.currentTime + 0.14);
    g.gain.setValueAtTime(0.05, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.18);
  } catch (_) {}
}

// ── G3. Sistema de badges ─────────────────────────────────────────────────────
const _BADGES_V6_KEY = 'erg_badges_v6';
const _BADGE_DEFS_V6 = [
  { id: 'first-complete', name: 'Primeiro Passo', icon: '✦', desc: 'Diario 100% preenchido' },
  { id: 'trio',           name: 'Trio Perfeito',  icon: '◆', desc: 'Streak de 3 dias'       },
  { id: 'semana-ouro',    name: 'Semana de Ouro', icon: '★', desc: 'Streak de 7 dias'       },
  { id: 'hidratado',      name: 'Hidratado',       icon: '◉', desc: '8 copos em um dia'      },
  { id: 'disciplinado',   name: 'Disciplinado',    icon: '▲', desc: 'Adesao 5/5 + 100%'     },
];

function _getUnlockedBadges() {
  try { return JSON.parse(localStorage.getItem(_BADGES_V6_KEY) || '[]'); } catch (_) { return []; }
}

function _unlockBadge(id) {
  const unlocked = _getUnlockedBadges();
  if (unlocked.includes(id)) return;
  unlocked.push(id);
  try { localStorage.setItem(_BADGES_V6_KEY, JSON.stringify(unlocked)); } catch (_) {}
  const def = _BADGE_DEFS_V6.find(b => b.id === id);
  if (def) _showBadgeUnlock(def);
}

function _showBadgeUnlock(def) {
  const toast = document.getElementById('diario-toast');
  if (!toast) return;
  const prevHTML = toast.innerHTML;
  const prevClass = toast.className;
  toast.innerHTML = `<span class="diario-badge-icon" aria-hidden="true">${def.icon}</span><strong>${def.name}</strong> desbloqueado!`;
  toast.className = 'diario-toast diario-toast--badge diario-toast--show';
  toast.setAttribute('aria-live', 'assertive');
  clearTimeout(toast._tmr);
  toast._tmr = setTimeout(() => {
    toast.classList.remove('diario-toast--show');
    setTimeout(() => {
      toast.innerHTML = prevHTML;
      toast.className = prevClass;
      toast.removeAttribute('aria-live');
    }, 350);
  }, 4500);
}

// ── G4. Streak milestones (3, 7, 14, 30 dias) ─────────────────────────────────
const _STREAK_MILESTONES_V6 = [3, 7, 14, 30];
const _STREAK_MSGS_V6 = {
  3:  'Trio Perfeito! 3 dias de disciplina em sequencia!',
  7:  'Semana de Ouro! Uma semana inteira de registros!',
  14: 'Duas semanas incriveis! Voce e imparavel!',
  30: 'Um mes completo! Lenda do diario alimentar!',
};
let _lastCelebratedStreak = 0;

function _checkStreakMilestone(streak) {
  if (!streak || streak <= _lastCelebratedStreak) return;
  if (_STREAK_MILESTONES_V6.includes(streak)) {
    _lastCelebratedStreak = streak;
    const msg = _STREAK_MSGS_V6[streak] || `${streak} dias seguidos!`;
    setTimeout(() => {
      _showToast(msg, 'success');
      _launchConfetti({ count: 55, duration: 2400 });
      if ('vibrate' in navigator) navigator.vibrate([20, 40, 20, 40, 80]);
    }, 600);
    if (streak === 3) _unlockBadge('trio');
    if (streak >= 7)  _unlockBadge('semana-ouro');
  }
}

// ── G5. Ripple effect nos botões de adesão e salvar ───────────────────────────
function _createRipple(e, btn) {
  const rect = btn.getBoundingClientRect();
  const src  = e.touches ? e.touches[0] : e;
  const ripple = document.createElement('span');
  ripple.className = 'diario-ripple';
  ripple.style.left = (src.clientX - rect.left) + 'px';
  ripple.style.top  = (src.clientY - rect.top) + 'px';
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

function _initRipple() {
  document.querySelectorAll('.diario-adesao-btn, #diario-save-btn').forEach(btn => {
    if (btn.dataset.rippleV6) return;
    btn.dataset.rippleV6 = '1';
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.addEventListener('click', e => _createRipple(e, btn));
  });
}

// ── G6. Shimmer dourado na barra de progresso ao chegar em 100% ───────────────
let _wasFullProgress = false;

function _checkProgressShimmer() {
  const bar = document.getElementById('diario-progress-bar');
  if (!bar) return;
  const isFull = bar.classList.contains('diario-progress-bar--full');
  if (isFull && !_wasFullProgress) {
    bar.classList.add('diario-progress-bar--shimmer');
    _wasFullProgress = true;
    _unlockBadge('first-complete');
    const adesao = parseInt(document.getElementById('d-adesao')?.value || '0');
    if (adesao >= 4) {
      setTimeout(() => { _launchConfetti({ count: 80, duration: 3200 }); _playChime(); }, 400);
    }
  } else if (!isFull) {
    bar.classList.remove('diario-progress-bar--shimmer');
    _wasFullProgress = false;
  }
}

// ── G7. Quote motivacional baseada na data do dia ─────────────────────────────
const _QUOTES_V6 = [
  'Cada refeicao registrada e um passo em direcao ao seu melhor eu.',
  'A consciencia alimentar comeca com um simples registro.',
  'O diario de hoje e o habito de amanha.',
  'Voce nao precisa ser perfeito, so precisa ser consistente.',
  'Pequenos registros constroem grandes transformacoes.',
  'Registrar e o primeiro ato de cuidar de si mesmo.',
  'Cada copo de agua e um presente que voce da ao seu corpo.',
  'A disciplina de hoje e a liberdade de amanha.',
  'Seu futuro eu agradece cada registro que voce faz agora.',
  'Nutricao com consciencia e o caminho para o equilibrio.',
  'Faca o que puder, com o que tem, onde esta.',
  'Consistencia bate perfeicao todos os dias.',
];

function _insertDailyQuote() {
  const existing = document.getElementById('diario-quote');
  if (existing) existing.remove();
  const dateVal = document.getElementById('diario-date-input')?.value
               || new Date().toISOString().split('T')[0];
  const seed = dateVal.replace(/-/g, '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const quote = _QUOTES_V6[seed % _QUOTES_V6.length];
  const el = document.createElement('p');
  el.id = 'diario-quote';
  el.className = 'diario-quote';
  el.setAttribute('aria-label', 'Frase motivacional do dia: ' + quote);
  el.textContent = quote;
  document.getElementById('diario-form')?.after(el);
}

// ── G8. Celebração ao completar meta de água ──────────────────────────────────
function _onWaterComplete() {
  const key = 'erg_wcelebrate_' + (document.getElementById('diario-date-input')?.value || 'x');
  try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (_) {}
  _playSplash();
  _unlockBadge('hidratado');
  setTimeout(() => _launchConfetti({ count: 32, duration: 2000 }), 200);
  _showToast('Meta de hidratacao atingida! 💧', 'success');
}

function _initWaterCompleteListener() {
  document.getElementById('diario-water-plus')?.addEventListener('click', () => {
    if (_getWater() >= _AGUA_META) _onWaterComplete();
  }, { passive: true });
}

// ── G9. Ícone de fogo no badge de streak ao atingir 7+ dias ──────────────────
function _updateFireIcon(streak) {
  const badge = document.getElementById('diario-streak-badge');
  if (!badge) return;
  let icon = badge.querySelector('.diario-flame-icon');
  if (streak >= 7 && !icon) {
    icon = document.createElement('span');
    icon.className = 'diario-flame-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🔥';
    badge.prepend(icon);
  } else if (streak < 7 && icon) {
    icon.remove();
  }
}

// ── G10. Tick sonoro ao preencher nova refeição ───────────────────────────────
function _initMealTickSound() {
  _MEAL_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el || el.dataset.tickV6) return;
    el.dataset.tickV6 = '1';
    let _wasFilled = el.value.trim().length > 0;
    el.addEventListener('input', () => {
      const filled = el.value.trim().length > 0;
      if (filled && !_wasFilled) _playTick();
      _wasFilled = filled;
    }, { passive: true });
  });
}

// ── G11. Badge "Disciplinado" + chime ao salvar com adesão 5 + 100% ──────────
function _checkDisciplinadoBadge() {
  const adesao = parseInt(document.getElementById('d-adesao')?.value || '0');
  const allFilled = _MEAL_IDS.every(id => document.getElementById(id)?.value.trim().length > 0);
  if (adesao === 5 && allFilled) _unlockBadge('disciplinado');
}

// ── V6 INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _initRipple();
  _insertDailyQuote();
  _initMealTickSound();
  _initWaterCompleteListener();

  document.querySelectorAll('.diario-textarea').forEach(el => {
    el.addEventListener('input', _checkProgressShimmer, { passive: true });
  });

  document.querySelectorAll('.diario-adesao-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(() => { _checkDisciplinadoBadge(); _checkProgressShimmer(); }, 150);
    });
  });

  document.getElementById('diario-form')?.addEventListener('submit', () => {
    setTimeout(() => { _checkDisciplinadoBadge(); _playChime(); }, 300);
  });

  const list = document.getElementById('diario-historico-list');
  if (list) {
    new MutationObserver(() => {
      const streak = typeof _computeStreak === 'function' ? _computeStreak() : 0;
      if (streak) { _checkStreakMilestone(streak); _updateFireIcon(streak); }
    }).observe(list, { childList: true, subtree: true });
  }

  const dateFull = document.getElementById('diario-date-full');
  if (dateFull) {
    new MutationObserver(() => {
      _insertDailyQuote();
      _wasFullProgress = false;
      setTimeout(_checkProgressShimmer, 200);
    }).observe(dateFull, { childList: true, subtree: true, characterData: true });
  }
});

Object.assign(window._diarioExtras, {
  launchConfetti:       _launchConfetti,
  playTick:             _playTick,
  playChime:            _playChime,
  playSplash:           _playSplash,
  unlockBadge:          _unlockBadge,
  getUnlockedBadges:    _getUnlockedBadges,
  checkStreakMilestone: _checkStreakMilestone,
  insertDailyQuote:     _insertDailyQuote,
  checkProgressShimmer: _checkProgressShimmer,
});
