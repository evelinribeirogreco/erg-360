// ============================================================
// ERG 360 — plano-editor-extras.js
// V1 — 20 melhorias UX: ARIA, teclado, draft, ripple, pulse,
//      contadores animados, % macro, busca, print, toast
// ============================================================

// ═══ POLIMENTO V1 ═══

(function () {
  'use strict';

  window._planoEditorExtras = { version: 1 };

  const DRAFT_KEY = 'plano_editor_draft';
  let draftDirty = false;
  let draftTimer = null;
  let searchFocusIdx = -1;

  // ── 1. TOAST ──────────────────────────────────────────────────
  function showToast(msg, type, duration) {
    type = type || 'info';
    duration = duration !== undefined ? duration : 3000;
    let container = document.getElementById('pe-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pe-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'pe-toast pe-toast--' + type;
    toast.textContent = msg;
    toast.setAttribute('role', 'status');
    container.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('pe-toast--show')));
    setTimeout(() => {
      toast.classList.remove('pe-toast--show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  window._planoEditorExtras.showToast = showToast;

  // ── 2. DRAFT AUTO-SAVE ────────────────────────────────────────
  function saveDraft() {
    if (!window.planoItens) return;
    try {
      const g = id => (document.getElementById(id) || {}).value;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        itens: window.planoItens,
        titulo: g('plano-titulo'),
        data: g('plano-data'),
        validade: g('plano-validade'),
        metaKcal: g('meta-kcal'),
        metaPtn: g('meta-ptn'),
        metaCho: g('meta-cho'),
        metaLip: g('meta-lip'),
        ts: Date.now()
      }));
      draftDirty = false;
    } catch (e) {}
  }

  function scheduleDraft() {
    draftDirty = true;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 30000);
  }

  function restoreDraft(draft) {
    if (draft.itens && window.planoItens) {
      Object.keys(draft.itens).forEach(k => {
        if (k in window.planoItens) window.planoItens[k] = draft.itens[k];
      });
    }
    const map = { titulo: 'plano-titulo', data: 'plano-data', validade: 'plano-validade',
      metaKcal: 'meta-kcal', metaPtn: 'meta-ptn', metaCho: 'meta-cho', metaLip: 'meta-lip' };
    Object.keys(map).forEach(k => {
      const el = document.getElementById(map[k]);
      if (el && draft[k] != null) el.value = draft[k];
    });
    if (window.renderRefeicoes) window.renderRefeicoes();
    showToast('Rascunho restaurado', 'ok', 3000);
  }

  // ── 3. WRAPPER DE FUNÇÕES PRINCIPAIS ─────────────────────────
  function wrapFunctions() {
    const origConfirmar = window.confirmarAdicao;
    if (origConfirmar) {
      window.confirmarAdicao = function () {
        const refKey = (document.getElementById('popup-refeicao') || {}).value;
        origConfirmar.call(this);
        scheduleDraft();
        if (refKey) pulseBlock(refKey);
      };
    }

    const origRemover = window.removerItem;
    if (origRemover) {
      window.removerItem = function (k, i) {
        origRemover.call(this, k, i);
        scheduleDraft();
      };
    }

    const origSalvar = window.salvarPlano;
    if (origSalvar) {
      window.salvarPlano = async function () {
        await origSalvar.call(this);
        localStorage.removeItem(DRAFT_KEY);
        draftDirty = false;
      };
    }

    const origModelo = window.aplicarModelo;
    if (origModelo) {
      window.aplicarModelo = async function (id, key) {
        await origModelo.call(this, id, key);
        scheduleDraft();
        showToast('Modelo aplicado', 'ok', 2000);
      };
    }

    // Wrapping atualizarTotais: animação de contadores + labels de %
    const origTotais = window.atualizarTotais;
    if (origTotais) {
      window.atualizarTotais = function () {
        const prev = {};
        ['kcal', 'ptn', 'cho', 'lip', 'fib'].forEach(id => {
          const el = document.getElementById('total-' + id);
          prev[id] = el ? parseFloat(el.textContent) || 0 : 0;
        });
        origTotais.call(this);
        ['kcal', 'ptn', 'cho', 'lip', 'fib'].forEach(id => {
          const el = document.getElementById('total-' + id);
          if (!el) return;
          const next = parseFloat(el.textContent) || 0;
          if (prev[id] !== next) animateCounter(el, prev[id], next);
        });
        updatePctLabels();
      };
    }
  }

  // ── 4. CONTADOR ANIMADO ───────────────────────────────────────
  function animateCounter(el, from, to) {
    const duration = 400;
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      el.textContent = (from + (to - from) * ease).toFixed(1);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = to;
    }
    requestAnimationFrame(tick);
  }

  // ── 5. LABELS DE % DA META ────────────────────────────────────
  function initMacroPercentageLabels() {
    ['kcal', 'ptn', 'cho', 'lip'].forEach(macro => {
      const bar = document.getElementById('bar-' + macro);
      if (!bar) return;
      const pct = document.createElement('div');
      pct.id = 'pe-pct-' + macro;
      pct.className = 'pe-bar-pct';
      bar.parentElement.insertAdjacentElement('afterend', pct);
    });
  }

  function updatePctLabels() {
    ['kcal', 'ptn', 'cho', 'lip'].forEach(macro => {
      const bar = document.getElementById('bar-' + macro);
      const label = document.getElementById('pe-pct-' + macro);
      if (!bar || !label) return;
      const pct = parseFloat(bar.style.width) || 0;
      label.textContent = pct > 0 ? Math.round(pct) + '% da meta' : '';
      label.className = 'pe-bar-pct' +
        (pct > 100 ? ' pe-pct--over' : pct >= 80 ? ' pe-pct--good' : '');
    });
  }

  // ── 6. PULSE AO ADICIONAR ALIMENTO ───────────────────────────
  function pulseBlock(refKey) {
    const block = document.getElementById('block-' + refKey);
    if (!block) return;
    block.classList.remove('pe-pulse');
    void block.offsetWidth;
    block.classList.add('pe-pulse');
    setTimeout(() => block.classList.remove('pe-pulse'), 700);
  }

  // ── 7. RIPPLE NOS BOTÕES ──────────────────────────────────────
  function initRipples() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.save-btn, .btn-add, .btn-cancel, .modelo-item, .back-btn');
      if (!btn) return;
      const ripple = document.createElement('span');
      ripple.className = 'pe-ripple';
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.cssText = `width:${size}px;height:${size}px;` +
        `left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  // ── 8. NAVEGAÇÃO POR TECLADO NA BUSCA ────────────────────────
  function initSearchKeyNav() {
    const input = document.getElementById('search-input');
    if (!input) return;
    input.addEventListener('keydown', e => {
      const results = document.getElementById('search-results');
      if (!results || !results.classList.contains('open')) return;
      const items = [...results.querySelectorAll('.search-item')];
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        searchFocusIdx = Math.min(searchFocusIdx + 1, items.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        searchFocusIdx = Math.max(searchFocusIdx - 1, 0);
      } else if (e.key === 'Enter' && searchFocusIdx >= 0) {
        e.preventDefault();
        items[searchFocusIdx].click();
        searchFocusIdx = -1;
        return;
      } else {
        return;
      }
      items.forEach((it, i) => it.classList.toggle('pe-search-focused', i === searchFocusIdx));
      if (items[searchFocusIdx]) items[searchFocusIdx].scrollIntoView({ block: 'nearest' });
    });
    input.addEventListener('input', () => { searchFocusIdx = -1; });
  }

  // ── 9. BOTÃO LIMPAR BUSCA ─────────────────────────────────────
  function initSearchClear() {
    const input = document.getElementById('search-input');
    const wrap = input && input.closest('.search-wrap');
    if (!input || !wrap) return;
    const btn = document.createElement('button');
    btn.className = 'pe-search-clear';
    btn.type = 'button';
    btn.textContent = '×';
    btn.setAttribute('aria-label', 'Limpar busca');
    btn.style.display = 'none';
    wrap.appendChild(btn);
    input.addEventListener('input', () => { btn.style.display = input.value ? 'flex' : 'none'; });
    btn.addEventListener('click', () => {
      input.value = '';
      btn.style.display = 'none';
      if (window.fecharBusca) window.fecharBusca();
      input.focus();
    });
  }

  // ── 10. ARIA ──────────────────────────────────────────────────
  function initAria() {
    const attrs = {
      'save-btn':       { 'aria-label': 'Salvar plano alimentar (Ctrl+S)' },
      'search-input':   { 'aria-label': 'Buscar alimento por nome', 'aria-autocomplete': 'list', 'aria-controls': 'search-results' },
      'search-results': { 'role': 'listbox', 'aria-label': 'Resultados da busca' },
      'qty-popup':      { 'role': 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'popup-food-name' },
      'status-msg':     { 'aria-live': 'polite', 'aria-atomic': 'true' },
      'meta-kcal':      { 'aria-label': 'Meta de calorias diárias' },
      'meta-ptn':       { 'aria-label': 'Meta de proteínas em gramas' },
      'meta-cho':       { 'aria-label': 'Meta de carboidratos em gramas' },
      'meta-lip':       { 'aria-label': 'Meta de lipídios em gramas' },
    };
    Object.keys(attrs).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      Object.keys(attrs[id]).forEach(attr => el.setAttribute(attr, attrs[id][attr]));
    });
  }

  // ── 11. SKIP LINK ─────────────────────────────────────────────
  function initSkipLink() {
    const skip = document.createElement('a');
    skip.href = '#refeicoes-container';
    skip.className = 'pe-skip-link';
    skip.textContent = 'Ir para o plano alimentar';
    document.body.insertBefore(skip, document.body.firstChild);
  }

  // ── 12. BANNER RESTAURAR RASCUNHO ────────────────────────────
  function showDraftBanner(draft) {
    if (document.getElementById('pe-draft-banner')) return;
    const age = Math.round((Date.now() - draft.ts) / 60000);
    const banner = document.createElement('div');
    banner.id = 'pe-draft-banner';
    banner.className = 'pe-draft-banner';
    banner.setAttribute('role', 'alert');
    banner.innerHTML =
      `<span class="pe-draft-msg">Rascunho encontrado (há ${age} min). Restaurar?</span>` +
      `<div class="pe-draft-btns">` +
      `<button class="pe-draft-yes" type="button">Restaurar</button>` +
      `<button class="pe-draft-no" type="button">Descartar</button>` +
      `</div>`;
    const center = document.querySelector('.panel-center');
    if (center) center.insertBefore(banner, center.firstChild);
    banner.querySelector('.pe-draft-yes').addEventListener('click', () => {
      restoreDraft(draft);
      banner.remove();
    });
    banner.querySelector('.pe-draft-no').addEventListener('click', () => {
      localStorage.removeItem(DRAFT_KEY);
      banner.remove();
    });
  }

  // ── 13. BOTÃO IMPRIMIR ────────────────────────────────────────
  function initPrintButton() {
    const saveBtn = document.getElementById('save-btn');
    if (!saveBtn) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'pe-header-actions';
    saveBtn.parentNode.insertBefore(wrapper, saveBtn);
    wrapper.appendChild(saveBtn);
    const btn = document.createElement('button');
    btn.className = 'pe-print-btn';
    btn.type = 'button';
    btn.textContent = 'Imprimir';
    btn.setAttribute('aria-label', 'Imprimir plano alimentar');
    btn.addEventListener('click', () => window.print());
    wrapper.insertBefore(btn, saveBtn);
  }

  // ── 14. ATALHOS DE TECLADO ────────────────────────────────────
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (window.salvarPlano) window.salvarPlano();
      }
      if (e.key === 'Escape') {
        if (window.fecharPopup) window.fecharPopup();
        if (window.fecharBusca) window.fecharBusca();
        document.getElementById('pe-draft-banner')?.remove();
      }
    });
  }

  // ── 15. AVISO DE ALTERAÇÕES NÃO SALVAS ───────────────────────
  window.addEventListener('beforeunload', e => {
    if (draftDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ── INIT ──────────────────────────────────────────────────────
  function init() {
    initSkipLink();
    initAria();
    initSearchClear();
    initSearchKeyNav();
    initPrintButton();
    initRipples();
    initMacroPercentageLabels();
    wrapFunctions();
    initKeyboardShortcuts();

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.ts && (Date.now() - draft.ts) < 86400000) {
          showDraftBanner(draft);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch (e) {}

    ['plano-titulo', 'plano-data', 'plano-validade', 'plano-elaborador',
      'meta-kcal', 'meta-ptn', 'meta-cho', 'meta-lip'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', scheduleDraft);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
