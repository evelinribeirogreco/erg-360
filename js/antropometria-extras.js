// ============================================================
// antropometria-extras.js — Polimento V1
// 20 melhorias UX iniciais para a página de Antropometria
// ============================================================

// ═══ POLIMENTO V1 ═══

const $ = (id) => document.getElementById(id);

// ── 1 & 2 — AUTO-SAVE RASCUNHO + RECOVERY ───────────────────
const DRAFT_KEY_PREFIX = 'erg_antro_draft_';
const AUTOSAVE_MS = 12000;
let _autosaveTimer = null;
let _lastSnapshot  = '';
let _draftBanner   = null;

function _getDraftKey() {
  const pid = $('patient-id')?.value || 'anon';
  return DRAFT_KEY_PREFIX + pid;
}

function _snapshotForm() {
  const data = { __ts: Date.now() };
  document.querySelectorAll('#antro-form input, #antro-form select, #antro-form textarea').forEach(el => {
    if (!el.id || el.type === 'hidden') return;
    data[el.id] = el.value;
  });
  return data;
}

function _saveDraft() {
  const snap = _snapshotForm();
  const str  = JSON.stringify(snap);
  if (str === _lastSnapshot) return;
  _lastSnapshot = str;
  try {
    localStorage.setItem(_getDraftKey(), str);
    _showSaveIndicator();
  } catch (_) {}
}

function _restoreDraft(data) {
  Object.entries(data).forEach(([id, val]) => {
    if (id.startsWith('__')) return;
    const el = $(id);
    if (el && el.type !== 'hidden') el.value = val ?? '';
  });
  // Dispara cálculos automáticos do JS principal
  ['calcularIMC', 'calcularComposicao', 'calcularIndices', 'calcularPregas', 'atualizarResultado'].forEach(fn => {
    if (typeof window[fn] === 'function') { try { window[fn](); } catch (_) {} }
  });
}

function _initAutosave() {
  document.querySelectorAll('#antro-form input, #antro-form select, #antro-form textarea').forEach(el => {
    el.addEventListener('input', () => {
      clearTimeout(_autosaveTimer);
      _autosaveTimer = setTimeout(_saveDraft, AUTOSAVE_MS);
      _updateCompletion();
      _updateSidebarMarks();
      _updatePesoDelta();
    });
  });

  // Verifica rascunho ao carregar
  setTimeout(() => {
    const raw = localStorage.getItem(_getDraftKey());
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (!data.__ts) return;
      const ageMin = (Date.now() - data.__ts) / 60000;
      if (ageMin > 1440) { localStorage.removeItem(_getDraftKey()); return; } // > 24h
      // Se formulário já tem dados (modo edit/view), não mostra banner
      const peso = $('peso')?.value;
      if (peso) return;
      _showDraftBanner(data);
    } catch (_) {}
  }, 800);
}

function _showDraftBanner(data) {
  const age = Math.round((Date.now() - data.__ts) / 60000);
  const ageStr = age < 60 ? `${age}min atrás` : `${Math.round(age / 60)}h atrás`;
  _draftBanner = document.createElement('div');
  _draftBanner.id = 'erg-draft-banner';
  _draftBanner.setAttribute('role', 'alert');
  _draftBanner.innerHTML = `
    <span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="vertical-align:-2px;margin-right:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      Rascunho salvo ${ageStr} — deseja restaurar?
    </span>
    <div class="erg-draft-actions">
      <button class="erg-draft-restore" id="erg-draft-yes">Restaurar</button>
      <button id="erg-draft-no">Descartar</button>
    </div>`;
  document.querySelector('.main-content')?.prepend(_draftBanner);

  $('erg-draft-yes').onclick = () => {
    _restoreDraft(data);
    _draftBanner.remove();
    _draftBanner = null;
  };
  $('erg-draft-no').onclick = () => {
    localStorage.removeItem(_getDraftKey());
    _draftBanner.remove();
    _draftBanner = null;
  };
}

// ── 3 — PREVENT SCROLL EM NUMBER INPUTS ─────────────────────
function _initNoScroll() {
  document.querySelectorAll('input[type="number"]').forEach(el => {
    el.addEventListener('wheel', e => { e.preventDefault(); }, { passive: false });
  });
}

// ── 4 — KEYBOARD NAVIGATION (Alt+← / Alt+→) ─────────────────
function _initKeyboardNav() {
  document.addEventListener('keydown', e => {
    if (!e.altKey) return;
    if (e.key === 'ArrowRight' && typeof window.nextStep === 'function') {
      e.preventDefault(); window.nextStep();
    } else if (e.key === 'ArrowLeft' && typeof window.prevStep === 'function') {
      e.preventDefault(); window.prevStep();
    }
  });
  // Hint abaixo dos botões de navegação
  const nav = document.querySelector('.step-navigation');
  if (nav) {
    const hint = document.createElement('p');
    hint.className = 'erg-shortcut-hint';
    hint.textContent = 'Alt + ← / → para navegar entre seções';
    nav.after(hint);
  }
}

// ── 5 — INLINE FIELD VALIDATION ─────────────────────────────
const FIELD_RULES = {
  peso:    { min: 20,   max: 300,  unit: 'kg',  label: 'Peso' },
  altura:  { min: 0.5,  max: 2.5,  unit: 'm',   label: 'Altura' },
  imc:     { min: 10,   max: 70,   unit: '',    label: 'IMC' },
  pct_gordura: { min: 1, max: 80,  unit: '%',   label: '% Gordura' },
  circ_cintura: { min: 30, max: 200, unit: 'cm', label: 'Cintura' },
  circ_quadril: { min: 30, max: 200, unit: 'cm', label: 'Quadril' },
};

function _addFieldValidation(el) {
  const rule = FIELD_RULES[el.id];
  if (!rule) return;
  let msgEl = el.nextElementSibling;
  if (!msgEl || !msgEl.classList.contains('erg-field-msg')) {
    msgEl = document.createElement('p');
    msgEl.className = 'erg-field-msg';
    el.after(msgEl);
  }
  el.addEventListener('input', () => {
    const val = parseFloat(el.value);
    el.classList.remove('erg-valid', 'erg-warn', 'erg-error');
    msgEl.className = 'erg-field-msg';
    if (!el.value) { msgEl.textContent = ''; return; }
    if (isNaN(val)) {
      el.classList.add('erg-error');
      msgEl.classList.add('error');
      msgEl.textContent = 'Valor inválido';
    } else if (val < rule.min || val > rule.max) {
      el.classList.add('erg-warn');
      msgEl.classList.add('warn');
      msgEl.textContent = `Esperado entre ${rule.min}–${rule.max} ${rule.unit}`;
    } else {
      el.classList.add('erg-valid');
      msgEl.classList.add('valid');
      msgEl.textContent = '';
    }
  });
}

function _initInlineValidation() {
  Object.keys(FIELD_RULES).forEach(id => {
    const el = $(id);
    if (el) _addFieldValidation(el);
  });
}

// ── 6 — COPIAR MEDIDAS D→E (bilateral) ──────────────────────
function _initCopyBilateral() {
  const tables = document.querySelectorAll('.circ-form-table');
  tables.forEach(table => {
    const tfoot = document.createElement('tfoot');
    tfoot.innerHTML = `<tr><td colspan="3" style="padding:6px 4px;">
      <button type="button" class="erg-copy-btn" data-table-copy>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 17 21 12 16 7"/><path d="M3 12h18"/></svg>
        Copiar D → E
      </button>
    </td></tr>`;
    table.appendChild(tfoot);
    tfoot.querySelector('[data-table-copy]').addEventListener('click', () => {
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td input');
        if (cells.length === 2 && cells[0].value) {
          cells[1].value = cells[0].value;
          cells[1].dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
  });
}

// ── 7 — CHIP FLUTUANTE DE IMC ────────────────────────────────
let _imcChip = null;

function _initIMCChip() {
  _imcChip = document.createElement('div');
  _imcChip.id = 'erg-imc-chip';
  _imcChip.title = 'IMC atual';
  _imcChip.setAttribute('aria-hidden', 'true');
  _imcChip.innerHTML = `
    <span class="chip-val" id="erg-chip-val">—</span>
    <span class="chip-lbl">IMC</span>`;
  document.body.appendChild(_imcChip);

  const imcEl = $('imc');
  if (imcEl) {
    imcEl.addEventListener('input', _updateIMCChip);
  }

  // Mostra chip quando scrollar além do step-0
  const sentinel = $('step-0');
  if (sentinel && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      _imcChip.classList.toggle('visible', !entry.isIntersecting && !!$('imc')?.value);
    }, { threshold: 0 });
    io.observe(sentinel);
  }
}

function _updateIMCChip() {
  const val = parseFloat($('imc')?.value);
  if (!_imcChip) return;
  const chipVal = $('erg-chip-val');
  if (!chipVal) return;
  if (isNaN(val)) { chipVal.textContent = '—'; return; }
  chipVal.textContent = val.toFixed(1);
  _imcChip.classList.remove('chip-ok', 'chip-atenc', 'chip-ruim');
  if (val < 18.5 || val >= 30) _imcChip.classList.add('chip-ruim');
  else if (val >= 25) _imcChip.classList.add('chip-atenc');
  else _imcChip.classList.add('chip-ok');
}

// ── 8 — INDICADOR DE AUTOSAVE ────────────────────────────────
let _saveIndTimer = null;

function _showSaveIndicator() {
  let ind = $('erg-save-indicator');
  if (!ind) {
    ind = document.createElement('div');
    ind.id = 'erg-save-indicator';
    ind.setAttribute('aria-live', 'polite');
    ind.textContent = 'Rascunho salvo';
    document.body.appendChild(ind);
  }
  ind.classList.add('visible');
  clearTimeout(_saveIndTimer);
  _saveIndTimer = setTimeout(() => ind.classList.remove('visible'), 2500);
}

// ── 9 — SIDEBAR: MARCAS DE SEÇÃO COMPLETA ───────────────────
const STEP_KEY_FIELDS = [
  ['peso', 'altura'],
  ['pct_gordura'],
  ['circ_cintura', 'circ_quadril'],
  [],
];

function _updateSidebarMarks() {
  STEP_KEY_FIELDS.forEach((fields, idx) => {
    const navEl = $(`snav-${idx}`);
    if (!navEl) return;
    let check = navEl.querySelector('.erg-step-check');
    if (!check) {
      check = document.createElement('span');
      check.className = 'erg-step-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';
      navEl.appendChild(check);
    }
    if (fields.length === 0) {
      const prevFields = STEP_KEY_FIELDS[idx - 1] || [];
      const prevDone = prevFields.every(f => $(f)?.value);
      navEl.classList.toggle('erg-step-done', prevDone);
    } else {
      const done = fields.some(f => $(f)?.value);
      navEl.classList.toggle('erg-step-done', done);
    }
  });
}

// ── 10 — SCROLL SUAVE AO TOPO NO STEP CHANGE ────────────────
function _initStepScrollPatch() {
  document.querySelectorAll('.form-step').forEach(step => {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if (m.attributeName === 'class' && step.classList.contains('active')) {
          const main = document.querySelector('.main-content');
          if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
    observer.observe(step, { attributes: true });
  });
}

// ── 11 — TOOLTIPS EM MÉTRICAS-CHAVE ─────────────────────────
const TOOLTIPS = {
  'imc':            'Índice de Massa Corporal: peso ÷ altura². Normal: 18,5–24,9 kg/m²',
  'pct_gordura':    '% de gordura em relação ao peso total. Mulheres: ideal 21–33%',
  'circ_cintura':   'Risco cardiovascular: ≥80cm (mulheres) ou ≥94cm (homens) = atenção',
  'circ_quadril':   'Usado no cálculo de RCQ (relação cintura-quadril)',
  'agua_corporal':  'Hidratação corporal. Ideal: 50–60% do peso corporal',
  'gordura_visceral': 'Gordura em torno dos órgãos. Nível ≥10 indica risco metabólico elevado',
  'metabolismo_basal': 'Calorias consumidas em repouso absoluto (TMB). Base para o plano alimentar',
};

function _addTooltip(fieldId, text) {
  const el = $(fieldId);
  if (!el) return;
  const label = el.closest('.form-group')?.querySelector('.form-label, label');
  if (!label) return;
  const wrap = document.createElement('span');
  wrap.className = 'erg-tooltip-wrap';
  wrap.innerHTML = `<span class="erg-tooltip-icon" tabindex="0" aria-label="Informação sobre ${fieldId}">?</span>
    <span class="erg-tooltip-box" role="tooltip">${text}</span>`;
  label.appendChild(wrap);
}

function _initTooltips() {
  Object.entries(TOOLTIPS).forEach(([id, text]) => _addTooltip(id, text));
}

// ── 12 — BARRA DE CONCLUSÃO GLOBAL ──────────────────────────
const ALL_FIELDS = [
  'peso', 'altura', 'data_avaliacao',
  'circ_cintura', 'circ_quadril', 'circ_braco_rel_d', 'circ_panturrilha_d',
  'pct_gordura', 'obs',
];

function _updateCompletion() {
  let filled = 0;
  ALL_FIELDS.forEach(id => { if ($(id)?.value) filled++; });
  const pct = Math.round((filled / ALL_FIELDS.length) * 100);

  const bar = $('erg-completion-bar');
  if (!bar) return;
  bar.querySelector('.erg-completion-fill').style.width = pct + '%';
  bar.setAttribute('aria-valuenow', pct);

  const pctEl = $('erg-completion-pct');
  if (pctEl) pctEl.textContent = `${pct}% preenchido`;
}

function _initCompletionBar() {
  const progressFill = $('progress-fill');
  if (!progressFill) return;
  const container = progressFill.parentElement;

  const pctEl = document.createElement('p');
  pctEl.id = 'erg-completion-pct';
  pctEl.textContent = '0% preenchido';

  const bar = document.createElement('div');
  bar.id = 'erg-completion-bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuenow', '0');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.innerHTML = '<div class="erg-completion-fill" style="width:0%"></div>';

  container.after(pctEl);
  pctEl.after(bar);
  _updateCompletion();
}

// ── 13 — BADGE DELTA DE PESO ─────────────────────────────────
function _updatePesoDelta() {
  const peso      = parseFloat($('peso')?.value);
  const pesoUsual = parseFloat($('peso_usual')?.value);
  let badge = $('erg-peso-delta');

  const pesoGroup = $('peso')?.closest('.form-group');
  if (!pesoGroup) return;

  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'erg-peso-delta';
    pesoGroup.appendChild(badge);
  }

  if (isNaN(peso) || isNaN(pesoUsual) || pesoUsual === 0) {
    badge.style.display = 'none';
    return;
  }
  const diff = peso - pesoUsual;
  const sign  = diff > 0 ? '+' : '';
  badge.style.display = 'inline-flex';
  badge.classList.remove('delta-pos', 'delta-neg', 'delta-ok');
  if (Math.abs(diff) < 0.5) {
    badge.classList.add('delta-ok');
    badge.textContent = '≈ peso usual';
  } else if (diff > 0) {
    badge.classList.add('delta-pos');
    badge.textContent = `${sign}${diff.toFixed(1)} kg vs. peso usual`;
  } else {
    badge.classList.add('delta-neg');
    badge.textContent = `${diff.toFixed(1)} kg vs. peso usual`;
  }
}

// ── 14 — BOTÕES DE AÇÃO NO RESULTADO ────────────────────────
function _initResultActions() {
  const section = $('resultado-tabela-wrap');
  if (!section) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'erg-result-actions';
  wrapper.innerHTML = `
    <button type="button" class="erg-action-btn" id="erg-copy-result">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      Copiar resultado
    </button>
    <button type="button" class="erg-action-btn" id="erg-print-result">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Imprimir resultado
    </button>`;
  section.after(wrapper);

  $('erg-copy-result').addEventListener('click', () => {
    const rows = document.querySelectorAll('#resultado-tabela tbody tr');
    const lines = [];
    const nome = $('patient-name-sidebar')?.textContent?.trim() || 'Paciente';
    const data = $('data_avaliacao')?.value || new Date().toISOString().slice(0, 10);
    lines.push(`Avaliação Antropométrica — ${nome} — ${data}`);
    lines.push('─'.repeat(46));
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const metrica = cells[0].textContent.trim();
        const atual   = cells[1].textContent.trim();
        const rec     = cells[2].textContent.trim();
        const sit     = cells[3].textContent.trim().replace(/\s+/g, ' ');
        lines.push(`${metrica}: ${atual}  (rec: ${rec})  [${sit}]`);
      }
    });
    navigator.clipboard?.writeText(lines.join('\n')).then(() => {
      const btn = $('erg-copy-result');
      const orig = btn.innerHTML;
      btn.innerHTML = btn.innerHTML.replace('Copiar resultado', 'Copiado ✓');
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }).catch(() => {});
  });

  $('erg-print-result').addEventListener('click', () => { window.print(); });
}

// ── 15 — TAB ORDER: PULA CAMPOS READONLY ─────────────────────
function _fixTabOrder() {
  document.querySelectorAll('input[readonly], input[disabled]').forEach(el => {
    if (el.type !== 'hidden') el.tabIndex = -1;
  });
}

// ── 16 — SMOOTH SCROLL AO MUDAR MÉTODO (bio/pregas) ─────────
function _patchMethodToggle() {
  document.querySelectorAll('.toggle-btn[data-field="metodo"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const secao = btn.dataset.value === 'bioimpedancia' ? $('secao-bio') : $('secao-pregas');
      if (secao) setTimeout(() => secao.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    });
  });
}

// ── 17 — ARIA: PROGRESSO E LIVE REGIONS ──────────────────────
function _initARIA() {
  const progFill = $('progress-fill');
  if (progFill?.parentElement) {
    progFill.parentElement.setAttribute('role', 'progressbar');
    progFill.parentElement.setAttribute('aria-label', 'Progresso do formulário');
  }
  const scoreEl = $('score-circulo');
  if (scoreEl) {
    scoreEl.setAttribute('role', 'img');
    scoreEl.setAttribute('aria-label', 'Score corporal');
  }
  const imcClass = $('imc-class');
  if (imcClass) {
    imcClass.setAttribute('aria-live', 'polite');
    imcClass.setAttribute('aria-atomic', 'true');
  }
}

// ── 18 — POLLING LEVE PARA IMC CHIP ──────────────────────────
function _watchIMCChanges() {
  const imcEl = $('imc');
  if (!imcEl) return;
  imcEl.addEventListener('change', _updateIMCChip);
  // Captura mudanças programáticas via oninput do JS principal
  setInterval(() => {
    const cur = $('imc')?.value;
    const displayed = $('erg-chip-val')?.textContent;
    const curStr = cur ? parseFloat(cur).toFixed(1) : '—';
    if (displayed !== curStr) _updateIMCChip();
  }, 2000);
}

// ── 19 — GUARD DE NAVEGAÇÃO (unsaved changes) ────────────────
function _initNavGuard() {
  let _dirty = false;
  document.querySelectorAll('#antro-form input, #antro-form select, #antro-form textarea').forEach(el => {
    el.addEventListener('input', () => { _dirty = true; });
  });
  document.getElementById('antro-form')?.addEventListener('submit', () => { _dirty = false; });
  window.addEventListener('beforeunload', e => {
    if (!_dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
}

// ── 20 — CONTADORES DE CAMPO POR SEÇÃO ───────────────────────
function _initSectionCounters() {
  document.querySelectorAll('.section').forEach(section => {
    const titleEl = section.querySelector('.section-title');
    const inputs  = section.querySelectorAll('input[type="number"], input[type="text"], input[type="date"], select, textarea');
    if (!titleEl || inputs.length === 0) return;
    const counter = document.createElement('span');
    counter.className = 'erg-section-counter';
    counter.setAttribute('aria-live', 'polite');

    const row = document.createElement('div');
    row.className = 'section-title-row';
    titleEl.parentNode.insertBefore(row, titleEl);
    row.appendChild(titleEl);
    row.appendChild(counter);

    function update() {
      const editable = Array.from(inputs).filter(i => !i.readOnly && !i.disabled);
      const filled   = editable.filter(i => i.value).length;
      counter.textContent = editable.length > 0 ? `${filled}/${editable.length}` : '';
    }
    inputs.forEach(i => i.addEventListener('input', update));
    update();
  });
}

// ── INICIALIZAÇÃO PRINCIPAL ───────────────────────────────────
function _init() {
  _initNoScroll();
  _initInlineValidation();
  _initCopyBilateral();
  _initIMCChip();
  _watchIMCChanges();
  _initTooltips();
  _initCompletionBar();
  _initResultActions();
  _initKeyboardNav();
  _initARIA();
  _initStepScrollPatch();
  _initSectionCounters();
  _patchMethodToggle();
  _fixTabOrder();
  _initNavGuard();
  _initAutosave();
  _updateSidebarMarks();
  _updatePesoDelta();

  $('peso_usual')?.addEventListener('input', _updatePesoDelta);
  $('peso')?.addEventListener('input', _updatePesoDelta);
}

// API pública
window._antropometriaExtras = {
  saveDraft:          _saveDraft,
  updateCompletion:   _updateCompletion,
  updateSidebarMarks: _updateSidebarMarks,
  updateIMCChip:      _updateIMCChip,
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _init);
} else {
  _init();
}
