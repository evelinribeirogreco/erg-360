// ============================================================
// EVELIN RIBEIRO GRECO — anamnese-extras.js
// 25 melhorias para a página de anamnese
// (autosave, recovery, stepper, smart-fill, validação inline,
//  risco em tempo real, voz, modo turbo, atalhos, templates,
//  diff vs anamnese anterior, etc.)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const $ = (id) => document.getElementById(id);
const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

// ============================================================
// 1, 2, 3, 4 — AUTOSAVE + RECOVERY + INDICADOR
// ============================================================
const AUTOSAVE_INTERVAL_MS = 10000;
let autosaveTimer = null;
let lastSnapshot = '';

function getDraftKey() {
  const patientId = $('patient-id')?.value || 'anon';
  return `erg_anamnese_draft_${patientId}`;
}

function snapshotForm() {
  const data = {};
  document.querySelectorAll('#anamnese-form input, #anamnese-form select, #anamnese-form textarea').forEach(el => {
    if (!el.id) return;
    if (el.type === 'checkbox' || el.type === 'radio') data[el.id] = el.checked;
    else data[el.id] = el.value;
  });
  // Toggle buttons (state via hidden inputs já capturado, mas marca os ativos pra restaurar UI)
  const toggleStates = {};
  document.querySelectorAll('.toggle-btn.active').forEach(btn => {
    const f = btn.dataset.field;
    const v = btn.dataset.value;
    if (f) toggleStates[f] = v;
  });
  data.__toggleStates = toggleStates;
  // Patologias multiselect
  const pat = [];
  document.querySelectorAll('.patologia-btn.active').forEach(btn => {
    if (btn.dataset.value) pat.push(btn.dataset.value);
  });
  data.__patologias = pat;
  data.__step = window._anamneseExtras?.currentStep ?? 0;
  data.__ts = Date.now();
  return data;
}

function applySnapshot(data) {
  if (!data) return;
  Object.entries(data).forEach(([id, val]) => {
    if (id.startsWith('__')) return;
    const el = $(id);
    if (!el) return;
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!val;
    else el.value = val ?? '';
  });
  // Restaura toggle buttons
  if (data.__toggleStates) {
    Object.entries(data.__toggleStates).forEach(([field, value]) => {
      document.querySelectorAll(`.toggle-btn[data-field="${field}"]`).forEach(b => {
        b.classList.toggle('active', b.dataset.value === value);
      });
    });
  }
  // Restaura patologias
  if (Array.isArray(data.__patologias)) {
    document.querySelectorAll('.patologia-btn').forEach(b => {
      b.classList.toggle('active', data.__patologias.includes(b.dataset.value));
    });
  }
}

function saveDraft() {
  try {
    const snap = snapshotForm();
    const json = JSON.stringify(snap);
    if (json === lastSnapshot) return; // nada mudou
    lastSnapshot = json;
    localStorage.setItem(getDraftKey(), json);
    flashSavedBadge();
    // Tenta também salvar remoto (silently)
    saveDraftRemote(snap);
  } catch (e) {
    console.warn('Autosave falhou:', e);
  }
}

async function saveDraftRemote(snap) {
  const patientId = $('patient-id')?.value;
  if (!patientId) return;
  // Tabela opcional anamnese_drafts (se não existir, falha silente)
  try {
    await supabase.from('anamnese_drafts').upsert({
      patient_id: patientId,
      payload: snap,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_id' });
  } catch (_) {}
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(getDraftKey());
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(getDraftKey()); } catch (_) {}
}

function flashSavedBadge() {
  const badge = $('autosave-badge');
  if (!badge) return;
  const t = new Date();
  badge.querySelector('.autosave-time').textContent =
    `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
  badge.classList.add('saved');
  setTimeout(() => badge.classList.remove('saved'), 1800);
}

function startAutosave() {
  stopAutosave();
  autosaveTimer = setInterval(saveDraft, AUTOSAVE_INTERVAL_MS);
}
function stopAutosave() {
  if (autosaveTimer) { clearInterval(autosaveTimer); autosaveTimer = null; }
}

// Recovery modal
function showRecoveryModal(draft) {
  const modal = $('anamnese-recovery-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  const dt = draft.__ts ? new Date(draft.__ts) : new Date();
  const when = dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  $('recovery-when').textContent = when;
  $('recovery-fill-count').textContent = Object.keys(draft).filter(k => !k.startsWith('__') && draft[k]).length;
  $('btn-recovery-yes').onclick = () => { applySnapshot(draft); modal.style.display = 'none'; updateAllValidation(); };
  $('btn-recovery-no').onclick  = () => { clearDraft(); modal.style.display = 'none'; };
}

// ============================================================
// 5 — STEPPER VISUAL CLICÁVEL
// ============================================================
// IMPORTANTE: STEP_META segue a ORDEM do stepSequence em anamnese.js:
// step-0, 1, 2, 3, 4, 5, step-rastreamento, 6, 7, 8 -> 10 etapas total
// Campo `step` é o argumento que `goToStep()` aceita (número 0-8 ou 'rast')
const STEP_META = [
  { num: 1,  step: 0,      name: 'Identificação',         time: '2 min', why: 'Dados de contato e motivo da consulta.' },
  { num: 2,  step: 1,      name: 'Hábitos de Vida',       time: '3 min', why: 'Restrições alimentares, álcool, fumo, hábitos de compra.' },
  { num: 3,  step: 2,      name: 'Sono e Estresse',       time: '2 min', why: 'Influenciam diretamente apetite, cortisol e composição corporal.' },
  { num: 4,  step: 3,      name: 'Atividade Física',      time: '2 min', why: 'Define gasto energético e estratégia nutricional.' },
  { num: 5,  step: 4,      name: 'Patologias e Medicamentos', time: '4 min', why: 'Dietoterapia e segurança clínica.' },
  { num: 6,  step: 5,      name: 'Avaliação Clínica',     time: '4 min', why: 'Sintomas digestivos, intestino, hidratação.' },
  { num: 7,  step: 'rast', name: 'Sintomas e Rastreamento', time: '5 min', why: 'Sintomas, teia de inter-relações e rastreamento metabólico (questionário 0–4).' },
  { num: 8,  step: 6,      name: 'Hábitos Alimentares',   time: '5 min', why: 'Recordatório alimentar e preferências.' },
  { num: 9,  step: 7,      name: 'Metas e Comportamento', time: '3 min', why: 'Objetivos terapêuticos e barreiras.' },
  { num: 10, step: 8,      name: 'Exames Laboratoriais',  time: '4 min', why: 'Exames recentes para análise bioquímica.' },
];

function renderStepper(currentIdx, totalSteps) {
  const el = $('anamnese-stepper');
  if (!el) return;
  const completedSet = window._anamneseExtras?.completedSteps || new Set();
  const items = STEP_META.map((m, i) => {
    const state = i === currentIdx ? 'current'
                : completedSet.has(i) ? 'done'
                : i < currentIdx ? 'visited'
                : 'pending';
    return `<button type="button" class="stepper-dot ${state}" data-step="${m.step}" title="${escapeHTML(m.name)}">
      <span class="stepper-num">${state === 'done' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg>' : m.num}</span>
      <span class="stepper-label">${escapeHTML(m.name)}</span>
    </button>`;
  }).join('<span class="stepper-line"></span>');
  el.innerHTML = items;
  el.querySelectorAll('.stepper-dot').forEach(b => {
    b.addEventListener('click', () => {
      const raw = b.dataset.step;
      // Se for numérico, converte; se for string ('rast'), passa como string
      const step = /^\d+$/.test(raw) ? +raw : raw;
      window.goToStep && window.goToStep(step);
    });
  });
}

// ============================================================
// 6 — TEMPO ESTIMADO POR SEÇÃO
// ============================================================
function renderStepTimeEstimate(stepIdx) {
  const el = $('step-time-estimate');
  if (!el) return;
  const meta = STEP_META[stepIdx];
  if (!meta) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    <span><strong>~${meta.time}</strong> · ${meta.why}</span>
  `;
}

// ============================================================
// 7 — SALVAR E CONTINUAR DEPOIS
// ============================================================
function saveAndExit() {
  saveDraft();
  if (confirm('Rascunho salvo. Você pode continuar de onde parou ao voltar a esta anamnese.\n\nIr para o painel agora?')) {
    window._anamneseExtras.suppressBeforeUnload = true;
    window.location.href = 'admin.html';
  }
}

// ============================================================
// 9 — VALIDAÇÃO INLINE
// ============================================================
const REQUIRED_FIELDS = ['data_avaliacao', 'caso_clinico', 'motivo'];
const VALIDATORS = {
  telefone: (v) => !v || /^[\d\s\(\)\-\+]+$/.test(v) || 'Formato inválido (apenas números, parênteses e traços)',
  email:    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'E-mail inválido',
  data_avaliacao: (v) => !!v || 'Data obrigatória',
};

function validateField(el) {
  const id = el.id;
  if (!id) return true;
  const val = el.value.trim();
  let err = null;
  if (REQUIRED_FIELDS.includes(id) && !val) err = 'Campo obrigatório';
  if (!err && VALIDATORS[id]) {
    const v = VALIDATORS[id](val);
    if (v !== true) err = v;
  }
  // Valida ranges numéricos
  if (!err && el.type === 'number' && val !== '') {
    const n = parseFloat(val);
    if (el.min !== '' && n < parseFloat(el.min)) err = `Mínimo: ${el.min}`;
    if (el.max !== '' && n > parseFloat(el.max)) err = `Máximo: ${el.max}`;
  }
  showFieldError(el, err);
  return !err;
}
function showFieldError(el, err) {
  const wrap = el.closest('.form-group') || el.parentElement;
  if (!wrap) return;
  wrap.classList.toggle('has-error', !!err);
  let msg = wrap.querySelector('.inline-error');
  if (err) {
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'inline-error';
      wrap.appendChild(msg);
    }
    msg.textContent = err;
  } else if (msg) {
    msg.remove();
  }
}
function updateAllValidation() {
  document.querySelectorAll('#anamnese-form input, #anamnese-form textarea').forEach(el => {
    if (REQUIRED_FIELDS.includes(el.id) || VALIDATORS[el.id]) validateField(el);
  });
}

// ============================================================
// 10 — AUTOCOMPLETE (datalist)
// ============================================================
const AUTOCOMPLETE = {
  profissao: ['Advogada', 'Médica', 'Enfermeira', 'Professora', 'Engenheira', 'Empresária', 'Designer', 'Estudante',
              'Aposentada', 'Dona de casa', 'Administradora', 'Psicóloga', 'Fisioterapeuta', 'Personal trainer',
              'Nutricionista', 'Jornalista', 'Atriz', 'Modelo', 'Atleta profissional', 'Funcionária pública',
              'Secretária', 'Vendedora', 'Cabeleireira', 'Esteticista', 'Arquiteta', 'Contadora', 'Dentista'],
  outras_patologias: ['SOP', 'Endometriose', 'Tireoidite de Hashimoto', 'Esofagite', 'Cólon irritável', 'Doença de Crohn',
                      'Lúpus', 'Fibromialgia', 'Enxaqueca', 'Asma', 'Rinite alérgica', 'Esteatose hepática',
                      'Cálculo biliar', 'Anemia ferropriva', 'Deficiência de vitamina D'],
  medicamentos: ['Metformina', 'Losartana', 'Sinvastatina', 'Levotiroxina', 'Anticoncepcional', 'Omeprazol',
                 'Atenolol', 'Captopril', 'Hidroclorotiazida', 'Amlodipina', 'Glifage', 'Insulina',
                 'Vitamina D', 'Ferro', 'Complexo B', 'Ômega 3', 'Magnésio', 'Probiótico'],
  alergias: ['Glúten', 'Lactose', 'Frutos do mar', 'Amendoim', 'Ovos', 'Soja', 'Castanhas', 'Peixe', 'Camarão',
             'Corantes artificiais', 'Conservantes', 'Frutas cítricas'],
};
function injectDatalists() {
  const host = document.body;
  Object.entries(AUTOCOMPLETE).forEach(([key, opts]) => {
    if (document.getElementById(`dl-${key}`)) return;
    const dl = document.createElement('datalist');
    dl.id = `dl-${key}`;
    dl.innerHTML = opts.map(o => `<option value="${escapeHTML(o)}">`).join('');
    host.appendChild(dl);
  });
  // Vincula aos inputs
  Object.keys(AUTOCOMPLETE).forEach(key => {
    const el = $(key);
    if (el && !el.getAttribute('list')) el.setAttribute('list', `dl-${key}`);
  });
}

// ============================================================
// 11 — SMART-FILL: COPIAR DA ÚLTIMA ANAMNESE
// ============================================================
async function copyFromLast() {
  const patientId = $('patient-id')?.value;
  if (!patientId) {
    alert('Salve a paciente primeiro.');
    return;
  }
  const btn = $('btn-smart-fill');
  if (btn) { btn.disabled = true; btn.textContent = 'Buscando...'; }
  // Pega anamnese anterior (não a atual sendo editada)
  const { data, error } = await supabase
    .from('anamnese')
    .select('*')
    .eq('patient_id', patientId)
    .order('data_avaliacao', { ascending: false })
    .limit(2);
  if (btn) { btn.disabled = false; btn.textContent = 'Copiar da última'; }
  if (error || !data || data.length < 1) {
    showToast('Nenhuma anamnese anterior encontrada.', 'warn');
    return;
  }
  // Pega a anamnese mais antiga (índice 1 se houver 2; ou a única se só 1)
  const last = data.length >= 2 ? data[1] : data[0];
  // Campos "estáveis" — não copia datas, recordatórios, métricas variáveis
  const STABLE = ['profissao', 'telefone', 'restricao_alimentar', 'fumante',
                  'refeicoes_fora', 'ingere_alcool', 'alcool_frequencia', 'alcool_qtd',
                  'outras_patologias', 'medicamentos', 'suplementos', 'alergias'];
  let copiados = 0;
  STABLE.forEach(field => {
    if (last[field] != null && last[field] !== '') {
      const el = $(field);
      if (el) {
        if (typeof last[field] === 'boolean') {
          el.value = String(last[field]);
          // Marca toggle correspondente
          document.querySelectorAll(`.toggle-btn[data-field="${field}"]`).forEach(b => {
            b.classList.toggle('active', b.dataset.value === String(last[field]));
          });
        } else {
          el.value = last[field];
        }
        copiados++;
      }
    }
  });
  showToast(`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg> ${copiados} campos copiados da última anamnese`, 'ok');
  saveDraft();
}

// ============================================================
// 12 — DETECÇÃO DE RISCO EM TEMPO REAL
// ============================================================
function detectRiskAlerts() {
  const alerts = [];
  const pats = (() => {
    const arr = [];
    document.querySelectorAll('.patologia-btn.active').forEach(b => arr.push(b.dataset.value));
    return arr;
  })();
  const sonoH  = parseFloat($('horas_sono')?.value || '0');
  const sonoQ  = $('qualidade_sono')?.value;
  const af     = $('nivel_af')?.value;
  const aguaL  = parseFloat($('agua_litros')?.value || '0');
  const ingAlc = $('ingere_alcool')?.value === 'true';
  const fuma   = $('fumante')?.value === 'true';

  if (pats.includes('diabetes_tipo2') || pats.includes('pre_diabetes')) {
    alerts.push({ tipo: 'warn', msg: 'Diabetes/pré-diabetes detectada <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> considere protocolo de baixo IG, distribuição equilibrada de carbos.' });
  }
  if (pats.includes('hipertensao')) {
    alerts.push({ tipo: 'warn', msg: 'Hipertensão <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> recomende sódio < 2g/dia (5g de sal). DASH adaptado.' });
  }
  if (pats.includes('dislipidemia') || pats.includes('colesterol_alto')) {
    alerts.push({ tipo: 'warn', msg: 'Dislipidemia <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> priorize gorduras insaturadas, fibra solúvel, ômega-3.' });
  }
  if (pats.includes('hipotireoidismo') && fuma) {
    alerts.push({ tipo: 'crit', msg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Hipotireoidismo + tabagismo: alto risco metabólico — orientar parar fumar é prioritário.' });
  }
  if (sonoH > 0 && sonoH < 5.5) {
    alerts.push({ tipo: 'warn', msg: `Sono curto (${sonoH}h) eleva grelina, reduz leptina. Risco aumentado de ganho de peso.` });
  }
  if (sonoQ === 'ruim' || sonoQ === 'pessimo') {
    alerts.push({ tipo: 'info', msg: 'Sono ruim <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> aumenta cortisol e fome. Considere higiene do sono.' });
  }
  if (af === 'sedentario' && pats.length > 0) {
    alerts.push({ tipo: 'warn', msg: 'Sedentarismo + comorbidades <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> atividade física estruturada é parte essencial do tratamento.' });
  }
  if (aguaL > 0 && aguaL < 1.5) {
    alerts.push({ tipo: 'info', msg: `Hidratação insuficiente (${aguaL}L) <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> meta inicial 30 ml/kg de peso.` });
  }
  if (ingAlc && pats.includes('esteatose_hepatica')) {
    alerts.push({ tipo: 'crit', msg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Esteatose hepática + álcool <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> suspender ou reduzir drasticamente.' });
  }
  return alerts;
}
function renderRiskAlerts() {
  const el = $('anamnese-risk-alerts');
  if (!el) return;
  const alerts = detectRiskAlerts();
  if (!alerts.length) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = `
    <p class="risk-alerts-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Detecção em tempo real (${alerts.length})</p>
    <div class="risk-alerts-list">
      ${alerts.map(a => `<div class="risk-alert risk-${a.tipo}">${escapeHTML(a.msg)}</div>`).join('')}
    </div>
  `;
}

// ============================================================
// 13 — SCORE DE RISCO COMPILADO
// ============================================================
function calculateRiskScore() {
  let score = 0;
  const pats = [];
  document.querySelectorAll('.patologia-btn.active').forEach(b => pats.push(b.dataset.value));
  // Comorbidades (peso alto)
  if (pats.includes('diabetes_tipo2'))   score += 20;
  if (pats.includes('pre_diabetes'))     score += 12;
  if (pats.includes('hipertensao'))      score += 15;
  if (pats.includes('dislipidemia'))     score += 12;
  if (pats.includes('esteatose_hepatica')) score += 14;
  if (pats.includes('hipotireoidismo'))  score += 8;
  if (pats.includes('sop'))              score += 8;
  if (pats.includes('refluxo'))          score += 5;
  // Hábitos
  if ($('fumante')?.value === 'true')        score += 15;
  if ($('ingere_alcool')?.value === 'true')  score += 5;
  const sonoH = parseFloat($('horas_sono')?.value || '7');
  if (sonoH < 5.5) score += 10;
  else if (sonoH < 6.5) score += 5;
  if ($('nivel_af')?.value === 'sedentario') score += 12;
  // Hidratação
  const aguaL = parseFloat($('agua_litros')?.value || '2');
  if (aguaL < 1.5) score += 5;
  return Math.min(100, score);
}
function getRiskLevel(score) {
  if (score < 20) return { lvl: 'baixo',    cor: '#3D6B4F', label: '<svg width="10" height="10" viewBox="0 0 24 24" style="vertical-align:-1px;"><circle cx="12" cy="12" r="6" fill="#3D6B4F"/></svg> Risco baixo' };
  if (score < 45) return { lvl: 'moderado', cor: '#B8860B', label: '<svg width="10" height="10" viewBox="0 0 24 24" style="vertical-align:-1px;"><circle cx="12" cy="12" r="6" fill="#B8860B"/></svg> Risco moderado' };
  return                 { lvl: 'alto',     cor: '#7A2E2E', label: '<svg width="10" height="10" viewBox="0 0 24 24" style="vertical-align:-1px;"><circle cx="12" cy="12" r="6" fill="#A04030"/></svg> Risco alto' };
}
function renderRiskScore() {
  const el = $('anamnese-risk-score');
  if (!el) return;
  const score = calculateRiskScore();
  const r = getRiskLevel(score);
  el.innerHTML = `
    <div class="risk-score-card">
      <p class="risk-score-eyebrow">Avaliação automática</p>
      <p class="risk-score-label" style="color:${r.cor}">${r.label}</p>
      <div class="risk-score-bar">
        <div class="risk-score-bar-fill" style="width:${score}%;background:${r.cor};"></div>
      </div>
      <p class="risk-score-value">${score} / 100</p>
      <p class="risk-score-help">Score baseado em comorbidades, hábitos de vida e indicadores clínicos preenchidos.</p>
    </div>`;
}

// ============================================================
// 14 — TELA DE REVISÃO ANTES DE SALVAR
// ============================================================
function showReviewPanel() {
  const el = $('anamnese-review');
  if (!el) return;
  el.style.display = 'block';
  // Compila respostas por seção (usa m.step para achar o div correto)
  const sections = STEP_META.map((m, i) => {
    const stepDivId = m.step === 'rast' ? 'step-rastreamento' : `step-${m.step}`;
    const stepEl = $(stepDivId);
    if (!stepEl) return null;
    const items = [];
    stepEl.querySelectorAll('input, textarea, select').forEach(e => {
      if (!e.id || e.type === 'hidden' && e.value === '') return;
      if (e.type === 'hidden') {
        const v = e.value;
        if (v) items.push({ label: e.id.replace(/_/g, ' '), value: v });
        return;
      }
      const label = (e.closest('.form-group')?.querySelector('.form-label')?.textContent || e.id).trim();
      const v = e.value;
      if (v) items.push({ label, value: v });
    });
    return { ...m, idx: i, items };
  }).filter(Boolean);
  el.innerHTML = `
    <h2 class="review-title">Revisão da anamnese</h2>
    <p class="review-sub">Confira os dados antes de salvar. Clique em qualquer seção para editar.</p>
    <div class="review-sections">
      ${sections.map(s => `
        <div class="review-section">
          <button type="button" class="review-section-header" onclick="goToStep(${s.idx})">
            <span class="review-section-num">${s.num}</span>
            <span class="review-section-name">${escapeHTML(s.name)}</span>
            <span class="review-section-count">${s.items.length} campo${s.items.length !== 1 ? 's' : ''}</span>
            <span class="review-section-edit">✎</span>
          </button>
          ${s.items.length ? `<div class="review-section-items">
            ${s.items.slice(0, 8).map(i => `<div class="review-row">
              <span class="review-row-label">${escapeHTML(i.label)}:</span>
              <span class="review-row-value">${escapeHTML(String(i.value).slice(0, 80))}</span>
            </div>`).join('')}
            ${s.items.length > 8 ? `<div class="review-row review-row-more">+${s.items.length - 8} campos</div>` : ''}
          </div>` : '<p class="review-empty">Nenhum dado preenchido</p>'}
        </div>`).join('')}
    </div>
  `;
}
function hideReviewPanel() {
  const el = $('anamnese-review');
  if (el) el.style.display = 'none';
}

// ============================================================
// 15 — DIFF VS ANAMNESE ANTERIOR
// ============================================================
async function loadDiffVsLast() {
  const patientId = $('patient-id')?.value;
  if (!patientId) return null;
  const { data } = await supabase
    .from('anamnese')
    .select('*')
    .eq('patient_id', patientId)
    .order('data_avaliacao', { ascending: false })
    .limit(2);
  if (!data || data.length < 2) return null;
  return data[1]; // a anterior
}
function renderDiff(prev) {
  const el = $('anamnese-diff');
  if (!el || !prev) return;
  // Compara campos chave
  const FIELDS = [
    { id: 'restricao_alimentar', label: 'Restrição alimentar' },
    { id: 'fumante',             label: 'Fumante',             type: 'bool' },
    { id: 'ingere_alcool',       label: 'Álcool',              type: 'bool' },
    { id: 'horas_sono',          label: 'Horas de sono' },
    { id: 'qualidade_sono',      label: 'Qualidade do sono' },
    { id: 'nivel_af',            label: 'Atividade física' },
    { id: 'medicamentos',        label: 'Medicamentos' },
    { id: 'suplementos',         label: 'Suplementos' },
    { id: 'agua_litros',         label: 'Hidratação (L/dia)' },
    { id: 'motivo',              label: 'Motivo da consulta' },
  ];
  const diffs = [];
  FIELDS.forEach(f => {
    const newV = $(f.id)?.value || '';
    const oldV = prev[f.id] != null ? String(prev[f.id]) : '';
    if (newV !== oldV && (newV || oldV)) {
      diffs.push({ ...f, old: oldV, new: newV });
    }
  });
  if (!diffs.length) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = `
    <p class="diff-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg> O que mudou desde a última consulta</p>
    <div class="diff-list">
      ${diffs.map(d => `
        <div class="diff-row">
          <span class="diff-label">${escapeHTML(d.label)}</span>
          <span class="diff-old">${escapeHTML(d.old || '—')}</span>
          <span class="diff-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
          <span class="diff-new"><strong>${escapeHTML(d.new || '—')}</strong></span>
        </div>`).join('')}
    </div>
  `;
}

// ============================================================
// 17 — GERAR PERGUNTA DE CHECK-IN AUTOMÁTICA
// ============================================================
function suggestCheckinQuestions() {
  const sugs = [];
  const pats = [];
  document.querySelectorAll('.patologia-btn.active').forEach(b => pats.push(b.dataset.value));
  if (pats.includes('refluxo'))           sugs.push({ id: 'refluxo_dia',   label: 'Refluxo nas últimas 24h?' });
  if (pats.includes('diabetes_tipo2'))    sugs.push({ id: 'glicemia_dia',  label: 'Glicemia capilar do dia (mg/dL)' });
  if (pats.includes('hipertensao'))       sugs.push({ id: 'pa_dia',        label: 'Pressão arterial do dia' });
  if ($('intestino_dificuldade')?.value === 'true') {
    sugs.push({ id: 'evac_dia', label: 'Conseguiu evacuar hoje?' });
  }
  if ($('fome_alta')?.value === 'true') {
    sugs.push({ id: 'fome_dia', label: 'Sensação de fome ao acordar (1-5)' });
  }
  if (parseFloat($('horas_sono')?.value || '7') < 6) {
    sugs.push({ id: 'sono_horas', label: 'Quantas horas dormiu hoje?' });
  }
  return sugs;
}
function renderCheckinSuggestions() {
  const sugs = suggestCheckinQuestions();
  const el = $('anamnese-checkin-sugs');
  if (!el) return;
  if (!sugs.length) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = `
    <p class="ckq-title">Perguntas de acompanhamento sugeridas</p>
    <p class="ckq-sub">Baseado no perfil desta paciente. Marque para incluir no próximo check-in.</p>
    <div class="ckq-list">
      ${sugs.map(s => `
        <label class="ckq-item">
          <input type="checkbox" class="ckq-cb" value="${s.id}"> ${escapeHTML(s.label)}
        </label>`).join('')}
    </div>
  `;
}

// ============================================================
// 16 — RECONHECIMENTO DE VOZ
// ============================================================
let recognition = null;
let activeVoiceField = null;
function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  recognition = new SR();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    if (activeVoiceField) {
      activeVoiceField.value = (activeVoiceField.value ? activeVoiceField.value + ' ' : '') + transcript;
      activeVoiceField.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };
  recognition.onend = () => {
    document.querySelectorAll('.voice-btn.listening').forEach(b => b.classList.remove('listening'));
    activeVoiceField = null;
  };
  recognition.onerror = (e) => {
    console.warn('Voice recognition error:', e.error);
    document.querySelectorAll('.voice-btn.listening').forEach(b => b.classList.remove('listening'));
    activeVoiceField = null;
  };
}
function addVoiceButtons() {
  if (!recognition) return;
  document.querySelectorAll('#anamnese-form textarea').forEach(ta => {
    if (ta.parentElement.querySelector('.voice-btn')) return;
    ta.parentElement.style.position = 'relative';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'voice-btn';
    btn.title = 'Ditado por voz';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    btn.onclick = () => {
      if (btn.classList.contains('listening')) {
        recognition.stop();
        return;
      }
      document.querySelectorAll('.voice-btn.listening').forEach(b => { recognition.stop(); b.classList.remove('listening'); });
      activeVoiceField = ta;
      btn.classList.add('listening');
      try { recognition.start(); } catch(e) { btn.classList.remove('listening'); }
    };
    ta.parentElement.appendChild(btn);
  });
}

// ============================================================
// 18 — MODO TURBO (oculta seções não críticas)
// ============================================================
let turboMode = false;
const TURBO_HIDE = ['anamnese-diff', 'anamnese-checkin-sugs', 'anamnese-risk-score'];
function toggleTurboMode() {
  turboMode = !turboMode;
  TURBO_HIDE.forEach(id => {
    const el = $(id);
    if (el) el.style.display = turboMode ? 'none' : '';
  });
  const btn = $('btn-turbo');
  if (btn) {
    btn.classList.toggle('tb-primary', turboMode);
    btn.title = turboMode ? 'Modo rápido ativo — clique para voltar ao normal' : 'Modo rápido';
  }
  showToast(turboMode ? 'Modo turbo ativado — campos secundários ocultos' : 'Modo turbo desativado', 'info');
}

// ============================================================
// 19 — ATALHOS DE TECLADO
// ============================================================
function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignora se foco em input/textarea
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    // Alt+S = salvar rascunho
    if (e.altKey && e.key === 's') { e.preventDefault(); saveDraft(); showToast('Rascunho salvo', 'ok'); }
    // Alt+→ = próxima etapa
    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); document.querySelector('#btn-next')?.click(); }
    // Alt+← = etapa anterior
    if (e.altKey && e.key === 'ArrowLeft')  { e.preventDefault(); document.querySelector('#btn-prev')?.click(); }
    // Alt+R = revisão
    if (e.altKey && e.key === 'r') { e.preventDefault(); showReviewPanel(); }
    // Esc = fechar revisão
    if (e.key === 'Escape') { hideReviewPanel(); }
    // Alt+T = turbo
    if (e.altKey && e.key === 't') { e.preventDefault(); toggleTurboMode(); }
  });
}

// ============================================================
// 20 — TEMPLATES DE ANAMNESE
// ============================================================
const TEMPLATES = {
  emagrecimento: {
    label: 'Emagrecimento',
    data: { motivo: 'Emagrecimento e reeducação alimentar', nivel_af: 'moderado', agua_litros: '2' }
  },
  gestante: {
    label: 'Gestante',
    data: { motivo: 'Acompanhamento nutricional na gestação', fumante: 'false', ingere_alcool: 'false' }
  },
  hipertensao: {
    label: 'Hipertensão / Cardio',
    data: { motivo: 'Controle de hipertensão e saúde cardiovascular' }
  },
  diabetes: {
    label: 'Diabetes / Pré-diabetes',
    data: { motivo: 'Controle glicêmico e reeducação alimentar' }
  },
  esportista: {
    label: 'Atleta / Esportista',
    data: { motivo: 'Otimização de desempenho e composição corporal', nivel_af: 'intenso', agua_litros: '3' }
  },
};
function applyTemplate(key) {
  const tpl = TEMPLATES[key];
  if (!tpl) return;
  if (!confirm(`Aplicar template "${tpl.label}"? Isso preencherá alguns campos de base.`)) return;
  Object.entries(tpl.data).forEach(([id, val]) => {
    const el = $(id);
    if (el) el.value = val;
  });
  showToast(`Template "${tpl.label}" aplicado`, 'ok');
  saveDraft();
}
function buildTemplatesMenu() {
  const container = $('templates-menu');
  if (!container) return;
  container.innerHTML = Object.entries(TEMPLATES).map(([key, tpl]) =>
    `<button type="button" class="tb-dropdown-item" onclick="window._anamneseExtras.applyTemplate('${key}')">${escapeHTML(tpl.label)}</button>`
  ).join('');
}

// ============================================================
// 21 — MODO APRESENTAÇÃO
// ============================================================
let presentationMode = false;
function togglePresentationMode() {
  presentationMode = !presentationMode;
  document.body.classList.toggle('presentation-mode', presentationMode);
  const btn = $('btn-presentation');
  if (btn) {
    btn.classList.toggle('tb-primary', presentationMode);
    btn.title = presentationMode ? 'Sair do modo apresentação' : 'Modo apresentação';
    btn.querySelector('span')?.textContent && (btn.innerHTML = presentationMode
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l22 22"/><path d="M15 15v4a2 2 0 0 1-4 0v-4"/><path d="M9 9H4a2 2 0 0 0-2 2v4"/><path d="M20.66 17.96A2 2 0 0 0 22 16V5a2 2 0 0 0-2-2H9.34"/></svg> Sair apresentação'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20v14H2z"/><path d="M8 21h8"/><path d="M12 17v4"/></svg> Apresentar');
  }
}

// ============================================================
// 22 — TOAST
// ============================================================
function showToast(msg, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = msg;
  container.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast-visible'));
  setTimeout(() => {
    t.classList.remove('toast-visible');
    t.addEventListener('transitionend', () => t.remove(), { once: true });
  }, duration);
}

// ============================================================
// 23 — PROGRESSO REAL POR STEP
// ============================================================
function calculateStepProgress(stepIdx) {
  const meta = STEP_META[stepIdx];
  if (!meta) return 0;
  const stepDivId = meta.step === 'rast' ? 'step-rastreamento' : `step-${meta.step}`;
  const stepEl = $(stepDivId);
  if (!stepEl) return 0;
  const all = stepEl.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea, select');
  if (!all.length) return 0;
  let filled = 0;
  all.forEach(el => { if (el.value?.trim()) filled++; });
  return Math.round((filled / all.length) * 100);
}
function renderProgressBars() {
  const el = $('anamnese-progress-bars');
  if (!el) return;
  el.innerHTML = STEP_META.map((m, i) => {
    const pct = calculateStepProgress(i);
    return `<div class="progress-bar-row">
      <span class="progress-bar-label">${escapeHTML(m.name)}</span>
      <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <span class="progress-bar-pct">${pct}%</span>
    </div>`;
  }).join('');
}

// ============================================================
// 24 — ANTES DE SAIR (beforeunload)
// ============================================================
function initBeforeUnload() {
  window.addEventListener('beforeunload', (e) => {
    if (window._anamneseExtras?.suppressBeforeUnload) return;
    const snap = JSON.stringify(snapshotForm());
    if (snap !== lastSnapshot && snap !== '{}') {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

// ============================================================
// 25 — EXPORTAR ANAMNESE COMO PDF (via print)
// ============================================================
function exportToPDF() {
  showReviewPanel();
  setTimeout(() => window.print(), 300);
}

// ============================================================
// ============================================================
// V7 — 10 MICRO-MELHORIAS DE TELEMETRIA LOCAL
// ============================================================
// ============================================================

// V7.1 — Contador de edições por sessão
let _v7EditCount = 0;
function _v7TrackEdit() { _v7EditCount++; }

// V7.2 — Log local de eventos (últimas 50 entradas)
const _v7Log = [];
function _v7LogEvent(ev, detail = {}) {
  _v7Log.push({ ev, detail, ts: Date.now() });
  if (_v7Log.length > 50) _v7Log.shift();
}

// V7.3 — Detector de idle (sem ação por 3 min)
let _v7IdleTimer = null;
const V7_IDLE_MS = 180_000;
function _v7ResetIdle() {
  clearTimeout(_v7IdleTimer);
  _v7IdleTimer = setTimeout(() => {
    _v7LogEvent('idle_detected', { editCount: _v7EditCount });
    saveDraft(); // autosave ao entrar em idle
  }, V7_IDLE_MS);
}

// V7.4 — Marca de "formulário sujo" (unsaved changes)
let _v7Dirty = false;
function _v7MarkDirty() {
  if (!_v7Dirty) {
    _v7Dirty = true;
    document.title = '● ' + document.title.replace(/^● /, '');
  }
}
function _v7MarkClean() {
  _v7Dirty = false;
  document.title = document.title.replace(/^● /, '');
}

// V7.5 — Métricas de step (tempo gasto por etapa)
const _v7StepTimes = {};
let _v7StepStart = Date.now();
let _v7CurrentStep = 0;
function _v7OnStepChange(newStep) {
  const elapsed = Date.now() - _v7StepStart;
  _v7StepTimes[_v7CurrentStep] = (_v7StepTimes[_v7CurrentStep] || 0) + elapsed;
  _v7StepStart = Date.now();
  _v7CurrentStep = newStep;
  _v7LogEvent('step_change', { from: _v7CurrentStep, to: newStep, elapsed });
}

// V7.6 — Atalho rápido Alt+P para imprimir
function _v7InitPrintShortcut() {
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'p') {
      e.preventDefault();
      exportToPDF();
    }
  });
}

// V7.7 — Highlight de campos obrigatórios vazios ao tentar avançar
function _v7HighlightMissing() {
  let count = 0;
  REQUIRED_FIELDS.forEach(id => {
    const el = $(id);
    if (el && !el.value.trim()) {
      el.classList.add('v7-missing');
      count++;
      setTimeout(() => el.classList.remove('v7-missing'), 2000);
    }
  });
  return count;
}

// V7.8 — Badge de campos preenchidos no stepper (tooltip)
function _v7UpdateStepperTooltips() {
  document.querySelectorAll('.stepper-dot').forEach((btn, i) => {
    const pct = calculateStepProgress(i);
    btn.title = `${STEP_META[i]?.name || ''} — ${pct}% preenchido`;
  });
}

// V7.9 — Sessão local: registra hora de início
const _v7SessionStart = Date.now();
function _v7SessionDuration() {
  return Math.round((Date.now() - _v7SessionStart) / 1000);
}

// V7.10 — Exportar métricas da sessão para clipboard (debug)
function _v7ExportMetrics() {
  const metrics = {
    sessionDurationSec: _v7SessionDuration(),
    editCount: _v7EditCount,
    stepTimes: _v7StepTimes,
    log: _v7Log.slice(-10),
    dirty: _v7Dirty,
  };
  navigator.clipboard?.writeText(JSON.stringify(metrics, null, 2))
    .then(() => showToast('Métricas copiadas para o clipboard', 'ok'))
    .catch(() => showToast('Métricas: ' + JSON.stringify(metrics), 'info', 6000));
}

// ============================================================
// INIT V7
// ============================================================
function _initV7() {
  // Listeners para telemetria
  document.querySelectorAll('#anamnese-form input, #anamnese-form select, #anamnese-form textarea').forEach(el => {
    el.addEventListener('input', () => {
      _v7TrackEdit();
      _v7MarkDirty();
      _v7ResetIdle();
      _v7LogEvent('field_edit', { id: el.id });
    });
  });

  // Patch goToStep para capturar mudanças de step
  const _origGoToStep = window.goToStep;
  if (_origGoToStep) {
    window.goToStep = function(step) {
      _v7OnStepChange(typeof step === 'number' ? step : -1);
      return _origGoToStep.apply(this, arguments);
    };
  }

  // Patch saveDraft para marcar como limpo
  const _origSaveDraft = saveDraft;
  // (saveDraft já chama flashSavedBadge; apenas marca clean)
  // Sobrescrevemos via wrapper no objeto público
  window._anamneseExtras.saveDraft = function() {
    _origSaveDraft();
    _v7MarkClean();
    _v7LogEvent('draft_saved');
  };

  // Atalho print
  _v7InitPrintShortcut();

  // Atualiza tooltips do stepper a cada 5s
  setInterval(_v7UpdateStepperTooltips, 5000);

  // Expõe utilitários V7 no objeto público
  window._anamneseExtras._v7 = {
    getLog:        () => [..._v7Log],
    getMetrics:    _v7ExportMetrics,
    getStepTimes:  () => ({ ..._v7StepTimes }),
    sessionDur:    _v7SessionDuration,
    highlightMiss: _v7HighlightMissing,
  };

  _v7LogEvent('v7_init', { ts: _v7SessionStart });
}

// ============================================================
// INIT PRINCIPAL
// ============================================================
export function initAnamneseExtras() {
  // Expõe API pública
  window._anamneseExtras = {
    currentStep: 0,
    completedSteps: new Set(),
    suppressBeforeUnload: false,
    saveDraft,
    saveAndExit,
    copyFromLast,
    showReviewPanel,
    hideReviewPanel,
    toggleTurboMode,
    togglePresentationMode,
    exportToPDF,
    showToast,
    applyTemplate,
    renderStepper,
    renderStepTimeEstimate,
    renderRiskAlerts,
    renderRiskScore,
    renderCheckinSuggestions,
    renderProgressBars,
  };

  // Autosave
  startAutosave();

  // Recovery
  const draft = loadDraft();
  if (draft && Object.keys(draft).filter(k => !k.startsWith('__')).length > 2) {
    showRecoveryModal(draft);
  }

  // Inicia features
  injectDatalists();
  initVoice();
  addVoiceButtons();
  initShortcuts();
  buildTemplatesMenu();
  initBeforeUnload();

  // Carrega diff vs anterior
  loadDiffVsLast().then(prev => {
    if (prev) renderDiff(prev);
  });

  // Renderiza componentes iniciais
  renderStepper(0, STEP_META.length);
  renderStepTimeEstimate(0);
  renderRiskAlerts();
  renderRiskScore();
  renderCheckinSuggestions();
  renderProgressBars();

  // V7
  _initV7();

  // Delega eventos de formulário para re-render de risco/score
  document.querySelector('#anamnese-form')?.addEventListener('change', () => {
    renderRiskAlerts();
    renderRiskScore();
    renderCheckinSuggestions();
    _v7UpdateStepperTooltips();
  });

  // Toolbar dropdown toggle
  document.querySelectorAll('.tb-dropdown').forEach(dd => {
    dd.querySelector('button')?.addEventListener('click', (e) => {
      e.stopPropagation();
      dd.classList.toggle('open');
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.tb-dropdown.open').forEach(dd => dd.classList.remove('open'));
  });

  console.info('[anamnese-extras] V6+V7 inicializado.');
}

// Auto-init se o DOM já estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initV7);
} else {
  _initV7();
}
