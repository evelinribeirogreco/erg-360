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
