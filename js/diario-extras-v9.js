// ════════════════════════════════════════════════════════════════════
// js/diario-extras.js — V9 — 15 melhorias: foto, fome/saciedade, busca TACO,
// macros estimados, undo, PDF, calendário semanal, Web Share, hashtags,
// sparkline, sugestões smart, horário real, lightbox, resumo nutricional
// ════════════════════════════════════════════════════════════════════

// ── Mini base TACO (50 alimentos comuns, kcal/100g) ─────────────────────────
const _TACO_DB_V9 = [
  {n:'arroz branco cozido',kcal:128,ptn:2.5,cho:28.1,lip:0.2,fib:1.6},
  {n:'arroz integral cozido',kcal:124,ptn:2.6,cho:25.8,lip:1.0,fib:2.7},
  {n:'feijão cozido',kcal:77,ptn:4.8,cho:13.6,lip:0.5,fib:8.4},
  {n:'lentilha cozida',kcal:112,ptn:7.8,cho:19.3,lip:0.4,fib:7.9},
  {n:'frango grelhado',kcal:163,ptn:31.0,cho:0.0,lip:3.5,fib:0.0},
  {n:'frango cozido',kcal:154,ptn:28.4,cho:0.0,lip:4.0,fib:0.0},
  {n:'ovo cozido',kcal:155,ptn:12.6,cho:1.1,lip:10.6,fib:0.0},
  {n:'ovo mexido',kcal:149,ptn:10.0,cho:1.3,lip:11.6,fib:0.0},
  {n:'omelete',kcal:154,ptn:10.6,cho:0.6,lip:12.0,fib:0.0},
  {n:'leite integral',kcal:61,ptn:3.2,cho:4.5,lip:3.3,fib:0.0},
  {n:'leite desnatado',kcal:35,ptn:3.4,cho:4.9,lip:0.1,fib:0.0},
  {n:'iogurte natural',kcal:66,ptn:3.5,cho:7.7,lip:2.3,fib:0.0},
  {n:'iogurte grego',kcal:133,ptn:9.0,cho:6.0,lip:8.0,fib:0.0},
  {n:'queijo minas',kcal:264,ptn:17.4,cho:3.0,lip:20.2,fib:0.0},
  {n:'queijo cottage',kcal:98,ptn:11.1,cho:3.4,lip:4.5,fib:0.0},
  {n:'banana',kcal:92,ptn:1.3,cho:23.8,lip:0.1,fib:1.9},
  {n:'maçã',kcal:56,ptn:0.3,cho:15.2,lip:0.1,fib:2.0},
  {n:'laranja',kcal:47,ptn:0.9,cho:11.5,lip:0.1,fib:2.4},
  {n:'mamão',kcal:45,ptn:0.5,cho:11.8,lip:0.1,fib:1.8},
  {n:'abacate',kcal:96,ptn:1.2,cho:6.0,lip:8.4,fib:6.3},
  {n:'morango',kcal:32,ptn:0.7,cho:7.7,lip:0.3,fib:2.0},
  {n:'uva',kcal:69,ptn:0.6,cho:17.7,lip:0.1,fib:1.0},
  {n:'batata cozida',kcal:86,ptn:1.9,cho:19.6,lip:0.1,fib:1.8},
  {n:'batata doce cozida',kcal:77,ptn:1.4,cho:18.4,lip:0.1,fib:2.2},
  {n:'mandioca cozida',kcal:125,ptn:1.0,cho:30.1,lip:0.3,fib:1.9},
  {n:'macarrão cozido',kcal:110,ptn:3.6,cho:22.9,lip:0.6,fib:1.4},
  {n:'pão francês',kcal:300,ptn:8.0,cho:58.6,lip:3.1,fib:2.3},
  {n:'pão integral',kcal:253,ptn:9.4,cho:48.0,lip:3.0,fib:5.6},
  {n:'aveia',kcal:394,ptn:13.9,cho:66.6,lip:8.5,fib:9.1},
  {n:'granola',kcal:397,ptn:9.1,cho:65.4,lip:10.9,fib:5.7},
  {n:'azeite de oliva',kcal:884,ptn:0.0,cho:0.0,lip:100.0,fib:0.0},
  {n:'carne bovina grelhada',kcal:219,ptn:28.7,cho:0.0,lip:11.1,fib:0.0},
  {n:'peixe grelhado',kcal:111,ptn:23.5,cho:0.0,lip:1.5,fib:0.0},
  {n:'atum em lata',kcal:128,ptn:26.7,cho:0.0,lip:1.9,fib:0.0},
  {n:'salmão grelhado',kcal:208,ptn:20.4,cho:0.0,lip:13.4,fib:0.0},
  {n:'salada verde',kcal:15,ptn:1.4,cho:2.4,lip:0.2,fib:2.0},
  {n:'tomate',kcal:15,ptn:0.9,cho:3.1,lip:0.2,fib:1.2},
  {n:'cenoura cozida',kcal:41,ptn:1.0,cho:9.6,lip:0.1,fib:3.2},
  {n:'brócolis cozido',kcal:35,ptn:2.3,cho:7.2,lip:0.3,fib:3.3},
  {n:'espinafre cozido',kcal:30,ptn:3.5,cho:3.7,lip:0.5,fib:2.2},
  {n:'suco de laranja',kcal:45,ptn:0.7,cho:10.4,lip:0.2,fib:0.4},
  {n:'café com leite',kcal:30,ptn:1.5,cho:3.5,lip:1.2,fib:0.0},
  {n:'whey protein',kcal:370,ptn:75.0,cho:10.0,lip:5.0,fib:2.0},
  {n:'amendoim torrado',kcal:585,ptn:26.0,cho:16.1,lip:49.9,fib:8.0},
  {n:'castanha do pará',kcal:656,ptn:14.5,cho:12.3,lip:66.4,fib:7.9},
  {n:'mel',kcal:309,ptn:0.3,cho:84.0,lip:0.0,fib:0.2},
  {n:'requeijão',kcal:256,ptn:8.7,cho:3.6,lip:23.7,fib:0.0},
  {n:'manteiga',kcal:726,ptn:0.5,cho:0.1,lip:82.0,fib:0.0},
  {n:'biscoito integral',kcal:423,ptn:9.9,cho:70.5,lip:12.1,fib:5.7},
  {n:'chocolate amargo',kcal:507,ptn:5.3,cho:56.5,lip:31.8,fib:7.0},
];

function _tacoSearchV9(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return _TACO_DB_V9.filter(f => {
    const name = f.n.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return name.includes(q);
  }).slice(0, 5);
}

// ── N1 + N13. Foto da refeição: captura, preview, compressão, lightbox ───────
const _FOTO_KEY_PFX_V9 = 'erg_foto_';
const _MEAL_IDS_V9 = ['cafe','lanche-manha','almoco','lanche-tarde','jantar','ceia'];

function _fotoKeyV9(date, meal) {
  return _FOTO_KEY_PFX_V9 + (date || 'x') + '_' + meal;
}

function _compressImageV9(file, cb) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX = 600;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        const r = Math.min(MAX / w, MAX / h);
        w = Math.round(w * r);
        h = Math.round(h * r);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function _initFotoV9() {
  const date = document.getElementById('diario-date-input')?.value;
  _MEAL_IDS_V9.forEach(meal => {
    const ta = document.getElementById('d-' + meal);
    if (!ta) return;
    const card = ta.closest('.diario-refeicao');
    if (!card || card.querySelector('.diario-foto-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'diario-foto-wrap';
    wrap.dataset.meal = meal;
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
    inp.className = 'diario-foto-input';
    inp.setAttribute('aria-label', 'Adicionar foto da refeição');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'diario-foto-btn';
    btn.setAttribute('aria-label', 'Fotografar refeição');
    btn.setAttribute('title', 'Adicionar foto');
    btn.textContent = '📷';
    btn.addEventListener('click', () => inp.click());
    const thumb = document.createElement('img');
    thumb.className = 'diario-foto-thumb';
    thumb.alt = 'Foto da refeição';
    thumb.hidden = true;
    thumb.setAttribute('tabindex', '0');
    thumb.setAttribute('role', 'button');
    thumb.setAttribute('aria-label', 'Ver foto ampliada');
    thumb.addEventListener('click', () => _openLightboxV9(thumb.src));
    thumb.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') _openLightboxV9(thumb.src);
    });
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'diario-foto-remove';
    removeBtn.setAttribute('aria-label', 'Remover foto');
    removeBtn.hidden = true;
    removeBtn.textContent = '×';
    inp.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      _compressImageV9(file, b64 => {
        const key = _fotoKeyV9(document.getElementById('diario-date-input')?.value, meal);
        try { localStorage.setItem(key, b64); } catch (_) {}
        thumb.src = b64; thumb.hidden = false;
        removeBtn.hidden = false; btn.textContent = '🖼️';
      });
    });
    removeBtn.addEventListener('click', () => {
      const key = _fotoKeyV9(document.getElementById('diario-date-input')?.value, meal);
      try { localStorage.removeItem(key); } catch (_) {}
      thumb.src = ''; thumb.hidden = true;
      removeBtn.hidden = true; btn.textContent = '📷';
    });
    try {
      const saved = localStorage.getItem(_fotoKeyV9(date, meal));
      if (saved) { thumb.src = saved; thumb.hidden = false; removeBtn.hidden = false; btn.textContent = '🖼️'; }
    } catch (_) {}
    wrap.append(inp, btn, thumb, removeBtn);
    card.appendChild(wrap);
  });
}

// ── N13. Lightbox ─────────────────────────────────────────────────────────────
function _openLightboxV9(src) {
  let lb = document.getElementById('diario-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'diario-lightbox';
    lb.className = 'diario-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Foto da refeição');
    lb.setAttribute('tabindex', '-1');
    const imgEl = document.createElement('img');
    imgEl.className = 'diario-lightbox-img';
    imgEl.alt = 'Foto da refeição ampliada';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'diario-lightbox-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Fechar foto');
    closeBtn.addEventListener('click', _closeLightboxV9);
    lb.addEventListener('click', e => { if (e.target === lb) _closeLightboxV9(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && lb.classList.contains('diario-lightbox--open')) _closeLightboxV9();
    });
    lb.append(closeBtn, imgEl);
    document.body.appendChild(lb);
  }
  lb.querySelector('img').src = src;
  lb.classList.add('diario-lightbox--open');
  lb.focus();
}

function _closeLightboxV9() {
  const lb = document.getElementById('diario-lightbox');
  if (lb) lb.classList.remove('diario-lightbox--open');
}

// ── N2. Escala de fome / saciedade (1–5 emoji) ────────────────────────────────
const _FOME_EMOJI_V9 = ['😫','😟','😐','🙂','😄'];
const _FOME_LABELS_V9 = ['Muita fome','Fome moderada','Neutro','Levemente saciado','Saciado'];
const _FOME_KEY_PFX_V9 = 'erg_fome_';

function _fomeKeyV9(date, meal, type) {
  return _FOME_KEY_PFX_V9 + (date || 'x') + '_' + meal + '_' + type;
}

function _buildFomeWidgetV9(meal, type, date) {
  const widget = document.createElement('div');
  widget.className = 'diario-fome-widget';
  widget.setAttribute('role', 'group');
  widget.setAttribute('aria-label', type === 'pre' ? 'Fome antes desta refeição' : 'Saciedade após esta refeição');
  const label = document.createElement('span');
  label.className = 'diario-fome-label';
  label.textContent = type === 'pre' ? 'Fome antes:' : 'Saciedade:';
  widget.appendChild(label);
  const key = _fomeKeyV9(date, meal, type);
  let saved = null;
  try { saved = localStorage.getItem(key); } catch (_) {}
  for (let i = 0; i < 5; i++) {
    const isActive = saved && parseInt(saved) === i + 1;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'diario-fome-btn' + (isActive ? ' diario-fome-btn--active' : '');
    btn.textContent = _FOME_EMOJI_V9[i];
    btn.setAttribute('title', _FOME_LABELS_V9[i]);
    btn.setAttribute('aria-label', _FOME_LABELS_V9[i] + ' (' + (i + 1) + ')');
    btn.setAttribute('aria-pressed', String(!!isActive));
    btn.dataset.val = i + 1;
    btn.addEventListener('click', () => {
      const cur = document.getElementById('diario-date-input')?.value;
      try { localStorage.setItem(_fomeKeyV9(cur, meal, type), btn.dataset.val); } catch (_) {}
      widget.querySelectorAll('.diario-fome-btn').forEach(b => {
        b.classList.toggle('diario-fome-btn--active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
    });
    widget.appendChild(btn);
  }
  return widget;
}

function _initFomeScaleV9() {
  const date = document.getElementById('diario-date-input')?.value;
  _MEAL_IDS_V9.forEach(meal => {
    const ta = document.getElementById('d-' + meal);
    if (!ta) return;
    const card = ta.closest('.diario-refeicao');
    if (!card || card.querySelector('.diario-fome-row')) return;
    const row = document.createElement('div');
    row.className = 'diario-fome-row';
    row.append(_buildFomeWidgetV9(meal, 'pre', date), _buildFomeWidgetV9(meal, 'pos', date));
    card.appendChild(row);
  });
}

// ── N3. Busca fuzzy TACO (autocomplete flutuante) ─────────────────────────────
let _tacoDropdownV9 = null;
let _tacoTargetV9 = null;

function _createTacoDropdownV9() {
  if (_tacoDropdownV9) return;
  _tacoDropdownV9 = document.createElement('div');
  _tacoDropdownV9.id = 'diario-taco-dropdown';
  _tacoDropdownV9.className = 'diario-taco-dropdown';
  _tacoDropdownV9.setAttribute('role', 'listbox');
  _tacoDropdownV9.setAttribute('aria-label', 'Sugestões de alimentos TACO');
  _tacoDropdownV9.hidden = true;
  document.body.appendChild(_tacoDropdownV9);
  document.addEventListener('click', e => {
    if (!_tacoDropdownV9.contains(e.target) && e.target !== _tacoTargetV9) {
      _tacoDropdownV9.hidden = true;
    }
  });
}

function _showTacoDropdownV9(textarea, query) {
  if (!_tacoDropdownV9) _createTacoDropdownV9();
  const results = _tacoSearchV9(query);
  if (!results.length) { _tacoDropdownV9.hidden = true; return; }
  const rect = textarea.getBoundingClientRect();
  _tacoDropdownV9.style.top = (window.scrollY + rect.bottom + 2) + 'px';
  _tacoDropdownV9.style.left = rect.left + 'px';
  _tacoDropdownV9.style.width = Math.min(rect.width, 320) + 'px';
  _tacoDropdownV9.hidden = false;
  _tacoDropdownV9.innerHTML = '';
  _tacoTargetV9 = textarea;
  results.forEach(food => {
    const opt = document.createElement('div');
    opt.className = 'diario-taco-option';
    opt.setAttribute('role', 'option');
    opt.setAttribute('tabindex', '0');
    opt.innerHTML = '<span class="taco-name">' + food.n + '</span><span class="taco-kcal">' + food.kcal + ' kcal/100g</span>';
    opt.addEventListener('click', () => {
      const val = textarea.value;
      const cursor = textarea.selectionStart;
      const before = val.slice(0, cursor);
      const lastBreak = Math.max(before.lastIndexOf('\n'), before.lastIndexOf(','));
      const start = lastBreak + 1;
      const trimBefore = val.slice(0, start).trimEnd();
      textarea.value = (trimBefore ? trimBefore + '\n' : '') + food.n + val.slice(cursor);
      textarea.dispatchEvent(new Event('input'));
      _tacoDropdownV9.hidden = true;
      textarea.focus();
    });
    opt.addEventListener('keydown', e => { if (e.key === 'Enter') opt.click(); });
    _tacoDropdownV9.appendChild(opt);
  });
}

function _getLastWordV9(text, cursor) {
  const before = text.slice(0, cursor);
  const match = before.match(/[\wÀ-ɏ]+$/i);
  return match ? match[0] : '';
}

function _initTacoSearchV9() {
  _MEAL_IDS_V9.forEach(meal => {
    const ta = document.getElementById('d-' + meal);
    if (!ta) return;
    let debT;
    ta.addEventListener('input', () => {
      clearTimeout(debT);
      debT = setTimeout(() => {
        const word = _getLastWordV9(ta.value, ta.selectionStart);
        if (word.length >= 3) _showTacoDropdownV9(ta, word);
        else if (_tacoDropdownV9) _tacoDropdownV9.hidden = true;
        _updateMacrosV9(ta.closest('.diario-refeicao'));
      }, 300);
    });
    ta.addEventListener('keydown', e => {
      if (!_tacoDropdownV9 || _tacoDropdownV9.hidden) return;
      if (e.key === 'Escape') { _tacoDropdownV9.hidden = true; e.stopPropagation(); }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const first = _tacoDropdownV9.querySelector('.diario-taco-option');
        if (first) first.focus();
      }
    });
  });
}

// ── N4. Macros estimados por refeição ─────────────────────────────────────────
function _estimateMacrosV9(text) {
  const norm = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let total = {kcal:0, ptn:0, cho:0, lip:0};
  let matched = 0;
  _TACO_DB_V9.forEach(food => {
    const name = food.n.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const mainWord = name.split(' ')[0];
    if (norm.includes(name) || (mainWord.length > 4 && norm.includes(mainWord))) {
      total.kcal += food.kcal; total.ptn += food.ptn;
      total.cho  += food.cho;  total.lip += food.lip;
      matched++;
    }
  });
  return matched > 0 ? total : null;
}

function _updateMacrosV9(card) {
  if (!card) return;
  let pills = card.querySelector('.diario-macro-pills');
  const ta = card.querySelector('textarea');
  if (!ta || !ta.value.trim()) { if (pills) pills.hidden = true; return; }
  const macros = _estimateMacrosV9(ta.value);
  if (!macros) { if (pills) pills.hidden = true; return; }
  if (!pills) {
    pills = document.createElement('div');
    pills.className = 'diario-macro-pills';
    pills.setAttribute('aria-label', 'Macros estimados desta refeição');
    card.appendChild(pills);
  }
  pills.hidden = false;
  pills.innerHTML = '<span class="macro-pill macro-kcal" title="Calorias estimadas">' + Math.round(macros.kcal) + ' kcal</span>' +
    '<span class="macro-pill macro-ptn" title="Proteína estimada">' + macros.ptn.toFixed(1) + 'g PTN</span>' +
    '<span class="macro-pill macro-cho" title="Carboidrato estimado">' + macros.cho.toFixed(1) + 'g CHO</span>' +
    '<span class="macro-pill macro-lip" title="Gordura estimada">' + macros.lip.toFixed(1) + 'g LIP</span>';
}

// ── N5. Undo da última ação (Ctrl+Z em textareas) ────────────────────────────
const _undoStackV9 = {};

function _pushUndoV9(id, oldVal) {
  if (!_undoStackV9[id]) _undoStackV9[id] = [];
  if (_undoStackV9[id].length >= 10) _undoStackV9[id].shift();
  _undoStackV9[id].push(oldVal);
}

function _initUndoV9() {
  const ids = [..._MEAL_IDS_V9.map(m => 'd-' + m), 'd-obs'];
  ids.forEach(id => {
    const ta = document.getElementById(id);
    if (!ta) return;
    let lastVal = ta.value;
    ta.addEventListener('focus', () => { lastVal = ta.value; });
    ta.addEventListener('input', () => {
      if (Math.abs(ta.value.length - lastVal.length) > 5) _pushUndoV9(id, lastVal);
      lastVal = ta.value;
    });
  });
}

function _undoLastV9() {
  const focused = document.activeElement;
  if (!focused || !focused.id || !_undoStackV9[focused.id]) return false;
  const stack = _undoStackV9[focused.id];
  if (!stack.length) return false;
  focused.value = stack.pop();
  focused.dispatchEvent(new Event('input'));
  return true;
}

function _initUndoShortcutV9() {
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.key !== 'z') return;
    if (!document.activeElement?.matches('textarea')) return;
    if (_undoLastV9()) {
      e.preventDefault();
      const showFn = window._diarioExtras?._showToast || (typeof _showToast === 'function' ? _showToast : null);
      if (showFn) showFn('Ção desfeita ↩', 'info');
    }
  });
}

// ── N6. Export PDF (nova janela formatada) ────────────────────────────────────
function _exportPdfV9() {
  const dateFull = document.getElementById('diario-date-full')?.textContent || '';
  const date = document.getElementById('diario-date-input')?.value || '';
  const meals = [
    {id:'cafe', label:'Café da manhã'},
    {id:'lanche-manha', label:'Lanche da manhã'},
    {id:'almoco', label:'Almoço'},
    {id:'lanche-tarde', label:'Lanche da tarde'},
    {id:'jantar', label:'Jantar'},
    {id:'ceia', label:'Ceia'},
  ];
  let rows = meals.map(m => {
    const val = (document.getElementById('d-' + m.id)?.value || '').trim() || '—';
    const macros = val !== '—' ? _estimateMacrosV9(val) : null;
    const macroStr = macros
      ? '<br><small style="color:#777">' + Math.round(macros.kcal) + ' kcal · ' + macros.ptn.toFixed(1) + 'g PTN · ' + macros.cho.toFixed(1) + 'g CHO · ' + macros.lip.toFixed(1) + 'g LIP</small>'
      : '';
    return '<tr><td style="font-weight:600;padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top;width:32%;color:#2D6A56">' + m.label + '</td><td style="padding:8px 12px;border-bottom:1px solid #eee">' + val.replace(/\n/g,'<br>') + macroStr + '</td></tr>';
  }).join('');
  const adesao = document.getElementById('d-adesao')?.value || '';
  const obs = (document.getElementById('d-obs')?.value || '').trim();
  const printWin = window.open('', '_blank', 'width=800,height=700');
  if (!printWin) { window.print(); return; }
  printWin.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Diário ' + date + '</title><style>body{font-family:Arial,sans-serif;color:#333;padding:24px;max-width:760px;margin:0 auto}h1{color:#2D6A56;border-bottom:2px solid #4CB8A0;padding-bottom:8px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:16px}@media print{.no-print{display:none}}</style></head><body><h1>Diário Alimentar</h1><p style="color:#888;margin-top:0">' + dateFull + '</p><table>' + rows + '</table>' + (adesao ? '<p style="margin-top:14px"><strong>Adesão ao plano:</strong> ' + adesao + '/5</p>' : '') + (obs ? '<p><strong>Observações:</strong><br>' + obs.replace(/\n/g,'<br>') + '</p>' : '') + '<p style="margin-top:20px;font-size:11px;color:#bbb">Gerado por ERG 360 em ' + new Date().toLocaleDateString('pt-BR') + '</p><scr' + 'ipt>window.onload=function(){window.print();}<\/scr' + 'ipt></body></html>');
  printWin.document.close();
}

function _initPdfBtnV9() {
  if (document.getElementById('diario-pdf-btn')) return;
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'diario-pdf-btn';
  btn.className = 'diario-pdf-btn';
  btn.setAttribute('aria-label', 'Exportar diário como PDF');
  btn.setAttribute('title', 'Exportar PDF');
  btn.innerHTML = '📄 PDF';
  btn.addEventListener('click', _exportPdfV9);
  document.querySelector('.diario-actions')?.appendChild(btn);
}

// ── N7 + N14. Calendário semanal com pontos de registro ──────────────────────
function _buildWeekCalV9() {
  if (document.getElementById('diario-week-cal')) return;
  const wrap = document.createElement('div');
  wrap.id = 'diario-week-cal';
  wrap.className = 'diario-week-cal';
  wrap.setAttribute('role', 'navigation');
  wrap.setAttribute('aria-label', 'Navegação semanal');
  const dateNav = document.querySelector('.diario-date-nav');
  if (dateNav) dateNav.insertAdjacentElement('beforebegin', wrap);
  else document.querySelector('.diario-main')?.prepend(wrap);
  _renderWeekCalV9(wrap);
}

function _renderWeekCalV9(wrap) {
  wrap.innerHTML = '';
  const dateInput = document.getElementById('diario-date-input');
  const ref = dateInput?.value ? new Date(dateInput.value + 'T12:00:00') : new Date();
  const today = new Date(); today.setHours(12,0,0,0);
  const dow = ref.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(ref); monday.setDate(ref.getDate() + diffToMon);
  const DAY_LABELS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const isToday = d.getTime() === today.getTime();
    const isSel = dateInput?.value === iso;
    let hasDraft = false;
    try {
      const raw = localStorage.getItem('erg_diario_draft_' + iso);
      if (raw) { const p = JSON.parse(raw); hasDraft = Object.values(p).some(v => typeof v === 'string' && v.trim().length > 0); }
    } catch (_) {}
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'diario-week-pill' + (isToday ? ' diario-week-pill--today' : '') + (isSel ? ' diario-week-pill--selected' : '');
    pill.setAttribute('aria-label', DAY_LABELS[i] + ' ' + d.toLocaleDateString('pt-BR'));
    pill.setAttribute('aria-pressed', String(isSel));
    pill.setAttribute('tabindex', isSel ? '0' : '-1');
    pill.innerHTML = '<span class="week-pill-day">' + DAY_LABELS[i] + '</span><span class="week-pill-num">' + d.getDate() + '</span>' + (hasDraft ? '<span class="week-pill-dot" aria-hidden="true"></span>' : '');
    pill.addEventListener('click', () => {
      if (dateInput) { dateInput.value = iso; dateInput.dispatchEvent(new Event('change')); }
      _renderWeekCalV9(wrap);
    });
    wrap.appendChild(pill);
  }
}

// ── N8. Web Share API ──────────────────────────────────────────────────────────
function _initShareBtnV9() {
  if (!navigator.share || document.getElementById('diario-share-btn')) return;
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'diario-share-btn';
  btn.className = 'diario-share-btn';
  btn.setAttribute('aria-label', 'Compartilhar diário do dia');
  btn.setAttribute('title', 'Compartilhar');
  btn.innerHTML = '🔗 Compartilhar';
  btn.addEventListener('click', async () => {
    const dateFull = document.getElementById('diario-date-full')?.textContent || '';
    const meals = [{id:'cafe',label:'Café'},{id:'lanche-manha',label:'Lanche manhã'},{id:'almoco',label:'Almoço'},{id:'lanche-tarde',label:'Lanche tarde'},{id:'jantar',label:'Jantar'},{id:'ceia',label:'Ceia'}];
    let text = 'Diário Alimentar — ' + dateFull + '\n\n';
    meals.forEach(m => { const v = document.getElementById('d-' + m.id)?.value?.trim(); if (v) text += m.label + ': ' + v + '\n'; });
    const adesao = document.getElementById('d-adesao')?.value;
    if (adesao) text += '\nAdesão ao plano: ' + adesao + '/5';
    try { await navigator.share({ title: 'Meu Diário Alimentar', text }); } catch (_) {}
  });
  document.querySelector('.diario-actions')?.appendChild(btn);
}

// ── N9. Hashtags rápidas ───────────────────────────────────────────────────────
const _HASHTAGS_V9 = ['#saudavel','#comeu-fora','#beliscou','#exercitei','#bebeu-agua','#exagerou','#sem-acucar','#equilibrado'];

function _initHashtagsV9() {
  if (document.getElementById('diario-hashtags')) return;
  const obsWrap = document.querySelector('.diario-obs');
  if (!obsWrap) return;
  const bar = document.createElement('div');
  bar.id = 'diario-hashtags';
  bar.className = 'diario-hashtags';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Marcadores rápidos');
  _HASHTAGS_V9.forEach(tag => {
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'diario-hashtag-chip';
    chip.textContent = tag;
    chip.setAttribute('aria-label', 'Adicionar ' + tag + ' às observações');
    chip.addEventListener('click', () => {
      const obs = document.getElementById('d-obs');
      if (!obs) return;
      const sp = obs.value && !obs.value.endsWith(' ') && !obs.value.endsWith('\n') ? ' ' : '';
      obs.value += sp + tag + ' ';
      obs.dispatchEvent(new Event('input'));
      chip.classList.add('diario-hashtag-chip--used');
      setTimeout(() => chip.classList.remove('diario-hashtag-chip--used'), 1200);
    });
    bar.appendChild(chip);
  });
  const lbl = obsWrap.querySelector('.diario-obs-label');
  if (lbl) lbl.insertAdjacentElement('afterend', bar);
  else obsWrap.prepend(bar);
}

// ── N10. Sparkline de adesão semanal (SVG inline) ─────────────────────────────
function _buildSparklineV9() {
  if (document.getElementById('diario-sparkline')) return;
  const today = new Date();
  const scores = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    let score = 0;
    try { const raw = localStorage.getItem('erg_diario_draft_' + iso); if (raw) { const p = JSON.parse(raw); score = parseInt(p._adesao) || 0; } } catch (_) {}
    scores.push(score);
  }
  if (!scores.some(s => s > 0)) return;
  const W = 140, H = 36, PAD = 4;
  const iw = W - PAD * 2, ih = H - PAD * 2;
  const pts = scores.map((s, i) => [PAD + (i / (scores.length - 1)) * iw, PAD + ih - (s / 5) * ih]);
  const polyStr = pts.map(p => p.join(',')).join(' ');
  const areaStr = [...pts, [pts[pts.length-1][0], H-PAD], [pts[0][0], H-PAD]].map(p => p.join(',')).join(' ');
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.id = 'diario-sparkline';
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.setAttribute('aria-label', 'Adesão dos últimos 7 dias'); svg.setAttribute('role', 'img');
  svg.className = 'diario-sparkline';
  const defs = document.createElementNS(NS, 'defs');
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.id = 'spark-grad-v9'; grad.setAttribute('x1','0'); grad.setAttribute('y1','0'); grad.setAttribute('x2','0'); grad.setAttribute('y2','1');
  const s1 = document.createElementNS(NS, 'stop'); s1.setAttribute('offset','0%'); s1.setAttribute('stop-color','#4CB8A0'); s1.setAttribute('stop-opacity','0.4');
  const s2 = document.createElementNS(NS, 'stop'); s2.setAttribute('offset','100%'); s2.setAttribute('stop-color','#4CB8A0'); s2.setAttribute('stop-opacity','0.05');
  grad.append(s1, s2); defs.appendChild(grad); svg.appendChild(defs);
  const area = document.createElementNS(NS, 'polygon'); area.setAttribute('points', areaStr); area.setAttribute('fill','url(#spark-grad-v9)'); svg.appendChild(area);
  const line = document.createElementNS(NS, 'polyline'); line.setAttribute('points', polyStr); line.setAttribute('fill','none'); line.setAttribute('stroke','#4CB8A0'); line.setAttribute('stroke-width','2'); line.setAttribute('stroke-linecap','round'); line.setAttribute('stroke-linejoin','round'); svg.appendChild(line);
  const last = pts[pts.length-1];
  const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('cx', last[0]); dot.setAttribute('cy', last[1]); dot.setAttribute('r','3'); dot.setAttribute('fill','#2D6A56'); svg.appendChild(dot);
  const wrap = document.createElement('div'); wrap.className = 'diario-sparkline-wrap';
  const lbl = document.createElement('span'); lbl.className = 'diario-sparkline-label'; lbl.textContent = 'Adesão (7 dias)'; lbl.setAttribute('aria-hidden','true');
  wrap.append(lbl, svg);
  document.querySelector('.diario-hero')?.appendChild(wrap);
}

// ── N11. Sugestões inteligentes por refeição (chips) ──────────────────────────
const _SMART_SUGG_V9 = {
  'cafe':         ['Iogurte + granola','Pão integral + ovo','Aveia com banana','Vitamina de frutas'],
  'lanche-manha': ['Fruta da época','Castanhas (30g)','Iogurte natural','Biscoito integral'],
  'almoco':       ['Arroz + feijão + salada','Frango grelhado + legumes','Prato colorido','Sopa nutritiva'],
  'lanche-tarde': ['Fruta + proteína','Queijo + fruta','Iogurte grego','Mix de castanhas'],
  'jantar':       ['Peixe + vegetais','Omelete + salada','Sopa leve','Frango + legumes'],
  'ceia':         ['Iogurte','Fruta leve','Chá + biscoito integral','Leite morno'],
};

function _initSmartSuggestionsV9() {
  _MEAL_IDS_V9.forEach(meal => {
    const ta = document.getElementById('d-' + meal);
    if (!ta) return;
    const card = ta.closest('.diario-refeicao');
    if (!card || card.querySelector('.diario-suggest-chips')) return;
    const suggs = _SMART_SUGG_V9[meal] || [];
    if (!suggs.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'diario-suggest-chips';
    wrap.setAttribute('aria-label', 'Sugestões para esta refeição');
    suggs.forEach(sug => {
      const chip = document.createElement('button');
      chip.type = 'button'; chip.className = 'diario-suggest-chip';
      chip.textContent = '+ ' + sug;
      chip.setAttribute('aria-label', 'Sugerir: ' + sug);
      chip.addEventListener('click', () => {
        const sp = ta.value && !ta.value.endsWith('\n') ? '\n' : '';
        ta.value += sp + sug;
        ta.dispatchEvent(new Event('input'));
        chip.disabled = true;
        chip.classList.add('diario-suggest-chip--used');
      });
      wrap.appendChild(chip);
    });
    ta.insertAdjacentElement('afterend', wrap);
  });
}

// ── N12. Registro do horário real da refeição ──────────────────────────────────
const _HORA_KEY_PFX_V9 = 'erg_hora_';

function _initMealHoraV9() {
  const date = document.getElementById('diario-date-input')?.value;
  _MEAL_IDS_V9.forEach(meal => {
    const ta = document.getElementById('d-' + meal);
    if (!ta) return;
    const card = ta.closest('.diario-refeicao');
    const horaSpan = card?.querySelector('.diario-ref-hora');
    if (!horaSpan) return;
    const key = _HORA_KEY_PFX_V9 + (date || 'x') + '_' + meal;
    try { const saved = localStorage.getItem(key); if (saved) horaSpan.textContent = saved; } catch (_) {}
    let recorded = horaSpan.textContent.trim() !== '' && horaSpan.textContent !== '—';
    ta.addEventListener('input', () => {
      if (recorded || !ta.value.trim()) return;
      const now = new Date();
      const t = now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
      horaSpan.textContent = t; recorded = true;
      try { localStorage.setItem(key, t); } catch (_) {}
    });
  });
}

// ── N15. Resumo nutricional diário ────────────────────────────────────────────
function _updateDailyMacroSummaryV9() {
  let summary = document.getElementById('diario-macro-summary');
  let totalKcal = 0, totalPtn = 0, totalCho = 0, totalLip = 0, hasData = false;
  _MEAL_IDS_V9.forEach(meal => {
    const ta = document.getElementById('d-' + meal);
    if (!ta || !ta.value.trim()) return;
    const m = _estimateMacrosV9(ta.value);
    if (m) { totalKcal += m.kcal; totalPtn += m.ptn; totalCho += m.cho; totalLip += m.lip; hasData = true; }
  });
  if (!hasData) { if (summary) summary.hidden = true; return; }
  if (!summary) {
    summary = document.createElement('div');
    summary.id = 'diario-macro-summary';
    summary.className = 'diario-macro-summary';
    summary.setAttribute('aria-label', 'Resumo nutricional estimado do dia');
    const obs = document.querySelector('.diario-obs');
    if (obs) obs.insertAdjacentElement('beforebegin', summary);
    else document.querySelector('.diario-actions')?.insertAdjacentElement('beforebegin', summary);
  }
  summary.hidden = false;
  summary.innerHTML =
    '<div class="macro-summary-title">Estimativa nutricional do dia</div>' +
    '<div class="macro-summary-pills">' +
      '<div class="macro-summary-item macro-s-kcal"><span class="macro-s-val">' + Math.round(totalKcal) + '</span><span class="macro-s-label">kcal</span></div>' +
      '<div class="macro-summary-item macro-s-ptn"><span class="macro-s-val">' + totalPtn.toFixed(0) + 'g</span><span class="macro-s-label">PTN</span></div>' +
      '<div class="macro-summary-item macro-s-cho"><span class="macro-s-val">' + totalCho.toFixed(0) + 'g</span><span class="macro-s-label">CHO</span></div>' +
      '<div class="macro-summary-item macro-s-lip"><span class="macro-s-val">' + totalLip.toFixed(0) + 'g</span><span class="macro-s-label">LIP</span></div>' +
    '</div>' +
    '<p class="macro-summary-disclaimer">* estimativa baseada nos alimentos identificados</p>';
}

function _bindMacroSummaryV9() {
  _MEAL_IDS_V9.forEach(meal => {
    const ta = document.getElementById('d-' + meal);
    if (ta) ta.addEventListener('input', _updateDailyMacroSummaryV9);
  });
}

// ── V9 INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _initFotoV9();
  _initFomeScaleV9();
  _initTacoSearchV9();
  _initUndoV9();
  _initUndoShortcutV9();
  _buildWeekCalV9();
  _initShareBtnV9();
  _initHashtagsV9();
  _buildSparklineV9();
  _initSmartSuggestionsV9();
  _initMealHoraV9();
  _initPdfBtnV9();
  _bindMacroSummaryV9();
  _updateDailyMacroSummaryV9();

  const dateInput = document.getElementById('diario-date-input');
  if (dateInput) {
    dateInput.addEventListener('change', () => {
      const cal = document.getElementById('diario-week-cal');
      if (cal) _renderWeekCalV9(cal);
      _initFotoV9();
    });
  }
});

Object.assign(window._diarioExtras || (window._diarioExtras = {}), {
  exportPdfV9:         _exportPdfV9,
  buildWeekCalV9:      _buildWeekCalV9,
  buildSparklineV9:    _buildSparklineV9,
  updateMacroSummary:  _updateDailyMacroSummaryV9,
  tacoSearchV9:        _tacoSearchV9,
  openLightboxV9:      _openLightboxV9,
  estimateMacrosV9:    _estimateMacrosV9,
});
