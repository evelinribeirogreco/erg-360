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
    <p class="ckq-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg> Sugestões de pergunta personalizada para o check-in diário</p>
    <p class="ckq-sub">Adicione no próximo check-in dela perguntas relevantes ao perfil clínico.</p>
    <div class="ckq-list">
      ${sugs.map(s => `<label class="ckq-item">
        <input type="checkbox" class="ckq-cb" value="${escapeHTML(s.id)}" data-label="${escapeHTML(s.label)}">
        <span>${escapeHTML(s.label)}</span>
      </label>`).join('')}
    </div>
  `;
}

// ============================================================
// 20 — VOZ PARA TEXTO (Web Speech API)
// ============================================================
function attachVoiceButtons() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
  const TARGETS = ['caso_clinico', 'motivo', 'observacoes', 'exames_obs', 'estresse_obs', 'sono_obs'];
  TARGETS.forEach(id => {
    const ta = $(id);
    if (!ta) return;
    const wrap = ta.closest('.form-group');
    if (!wrap || wrap.querySelector('.voice-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'voice-btn';
    btn.title = 'Ditar por voz';
    btn.setAttribute('aria-label', 'Ditar por voz');
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/></svg>`;
    btn.addEventListener('click', () => startVoiceInput(ta, btn));
    wrap.style.position = 'relative';
    wrap.appendChild(btn);
  });
}
function startVoiceInput(target, btn) {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) return;
  const rec = new Speech();
  rec.lang = 'pt-BR';
  rec.continuous = true;
  rec.interimResults = false;
  btn.classList.add('listening');
  let baseValue = target.value;
  rec.onresult = (e) => {
    let txt = '';
    for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
    target.value = (baseValue + ' ' + txt).trim();
    target.dispatchEvent(new Event('input', { bubbles: true }));
  };
  rec.onend = () => btn.classList.remove('listening');
  rec.onerror = () => { btn.classList.remove('listening'); showToast('Erro no reconhecimento de voz', 'warn'); };
  rec.start();
  // segundo clique para parar
  const stop = () => { try { rec.stop(); } catch (_) {} btn.removeEventListener('click', stop); };
  setTimeout(() => btn.addEventListener('click', stop, { once: true }), 50);
}

// ============================================================
// 21 — MODO APRESENTAÇÃO
// ============================================================
function togglePresentationMode() {
  document.body.classList.toggle('presentation-mode');
  const on = document.body.classList.contains('presentation-mode');
  showToast(on ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Modo apresentação ativado' : 'Modo apresentação desativado');
  try { localStorage.setItem('erg_anamnese_presentation', on ? '1' : '0'); } catch (_) {}
}

// ============================================================
// 22 — TEMPLATES PRÉ-CONFIGURADOS
// ============================================================
const TEMPLATES = {
  atleta:        { hide: [], focus: 'performance', motivo: 'Performance esportiva', objetivo: 'performance' },
  gestante:      { hide: [], focus: 'gestacao',     motivo: 'Acompanhamento gestacional' },
  pos_bariatrica:{ hide: [], focus: 'pos_bariatrica', motivo: 'Acompanhamento pós-cirurgia bariátrica' },
  idoso:         { hide: [], focus: 'idoso',        motivo: 'Acompanhamento da terceira idade' },
  express:       { hide: ['step-7', 'step-8'], focus: 'express', motivo: 'Avaliação rápida' },
};
function applyTemplate(slug) {
  const tpl = TEMPLATES[slug];
  if (!tpl) return;
  // Pré-preenche motivo
  if (tpl.motivo) {
    const motivoEl = $('motivo');
    if (motivoEl && !motivoEl.value) motivoEl.value = tpl.motivo;
  }
  // Esconde steps se template express
  tpl.hide.forEach(stepId => {
    const el = $(stepId);
    if (el) el.dataset.tplHide = '1';
  });
  showToast(`Template aplicado: ${slug.replace('_', ' ')}`, 'ok');
}

// ============================================================
// 23 — MODO TURBO (TypeForm-style)
// ============================================================
function toggleTurboMode() {
  document.body.classList.toggle('turbo-mode');
  const on = document.body.classList.contains('turbo-mode');
  showToast(on ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Modo turbo ativado — Enter avança' : 'Modo turbo desativado');
}

// ============================================================
// 24 — TOOLTIPS "POR QUE PERGUNTAMOS?"
// ============================================================
const WHY_TOOLTIPS = {
  fumante:         'Tabagismo afeta vitamina C, antioxidantes e metabolismo da gordura — direciona suplementação.',
  ingere_alcool:   'Álcool tem 7 kcal/g, afeta sono, fígado e absorção de B-vitaminas.',
  refeicoes_fora:  'Refeições fora de casa têm mais sódio, gordura trans e densidade calórica.',
  horas_sono:      'Sono < 6h eleva grelina (fome) e reduz leptina (saciedade) em até 28%.',
  intestino_dificuldade: 'Constipação afeta absorção, microbiota e sensação de inchaço.',
  agua_litros:     'Hidratação influencia saciedade, função renal e metabolismo basal.',
};
function injectWhyTooltips() {
  Object.entries(WHY_TOOLTIPS).forEach(([id, txt]) => {
    const el = $(id);
    if (!el) return;
    const label = el.closest('.form-group')?.querySelector('.form-label');
    if (!label || label.querySelector('.why-tip')) return;
    const t = document.createElement('span');
    t.className = 'why-tip';
    t.title = txt;
    t.setAttribute('aria-label', txt);
    t.innerHTML = 'ⓘ';
    label.appendChild(t);
  });
}

// ============================================================
// 25 — BANNER PDF DE EXTRAÇÃO MAIS VISÍVEL
// ============================================================
function promoteExtractorBanner() {
  const ext = $('doc-extractor-anamnese');
  if (!ext) return;
  const wrap = ext.closest('.section');
  if (!wrap) return;
  wrap.classList.add('extractor-promoted');
  // Adiciona ícone e texto reforçado se ainda não tiver
  const titleEl = wrap.querySelector('.section-title');
  if (titleEl && !titleEl.querySelector('.extractor-pulse')) {
    titleEl.insertAdjacentHTML('afterbegin', '<span class="extractor-pulse"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span> ');
  }
}

// ============================================================
// SHORTCUTS — ATALHOS DE TECLADO
// ============================================================
function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    const target = e.target;
    const inField = target.matches('input:not([type="hidden"]), textarea, select, [contenteditable="true"]');
    const helpOpen = $('anamnese-help')?.style.display === 'flex';
    if (e.key === 'Escape') {
      if (helpOpen) { closeHelp(); return; }
      if (document.body.classList.contains('presentation-mode')) togglePresentationMode();
    }
    if (inField && !(e.ctrlKey || e.metaKey)) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault(); saveDraft(); showToast('Rascunho salvo', 'ok');
    }
    if (!inField) {
      if (e.key === 'ArrowRight') { e.preventDefault(); window.nextStep && window.nextStep(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); window.prevStep && window.prevStep(); }
      else if (e.key === '?') { openHelp(); }
    }
  });
}
function openHelp() { const el = $('anamnese-help'); if (el) el.style.display = 'flex'; }
function closeHelp() { const el = $('anamnese-help'); if (el) el.style.display = 'none'; }

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'ok') {
  let t = $('anamnese-extras-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'anamnese-extras-toast';
    t.className = 'anamnese-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `anamnese-toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ============================================================
// HOOKS — chamados pela própria anamnese.js / DOM events
// ============================================================
function onStepChange(idx, totalSteps, stepId) {
  window._anamneseExtras.currentStep = idx;
  // Mapeia stepId atual para o índice de STEP_META (10 itens, com 'rast')
  let baseIdx = -1;
  if (stepId) {
    baseIdx = STEP_META.findIndex(m => {
      const id = m.step === 'rast' ? 'step-rastreamento' : `step-${m.step}`;
      return id === stepId;
    });
  }
  // Fallback: se não achou (módulo dinâmico ou stepId desconhecido), mantém Patologias (idx 4)
  if (baseIdx === -1) baseIdx = (idx < 5) ? idx : 4;

  renderStepper(baseIdx, totalSteps);
  renderStepTimeEstimate(baseIdx);
  // Marca step anterior como completo
  if (baseIdx > 0) (window._anamneseExtras.completedSteps ||= new Set()).add(baseIdx - 1);
  // Atualiza alertas e score
  setTimeout(() => {
    renderRiskAlerts();
    renderRiskScore();
    renderCheckinSuggestions();
  }, 30);
  // Se chegou ao último step -> mostra revisão
  if (idx === totalSteps - 1) {
    setTimeout(() => { showReviewPanel(); }, 100);
    loadDiffVsLast().then(prev => prev && renderDiff(prev));
  } else {
    hideReviewPanel();
  }
}
function onFormChange() {
  // Validation + autosave next tick
  if (window._anamneseExtras._changeTimer) clearTimeout(window._anamneseExtras._changeTimer);
  window._anamneseExtras._changeTimer = setTimeout(() => {
    saveDraft();
    renderRiskAlerts();
  }, 600);
}
function onSaved() {
  clearDraft();
  // Apaga rascunho remoto também
  const patientId = $('patient-id')?.value;
  if (patientId) {
    try { supabase.from('anamnese_drafts').delete().eq('patient_id', patientId); } catch (_) {}
  }
}

// ============================================================
// INIT
// ============================================================
function init() {
  // Auto recovery
  setTimeout(() => {
    const draft = loadDraft();
    if (draft) showRecoveryModal(draft);
  }, 800);

  // Bind change handlers para validation + autosave
  document.addEventListener('input', (e) => {
    if (!e.target.matches('#anamnese-form input, #anamnese-form textarea, #anamnese-form select')) return;
    onFormChange();
  });
  document.addEventListener('blur', (e) => {
    if (e.target.matches('#anamnese-form input:not([type="hidden"]), #anamnese-form textarea')) {
      validateField(e.target);
    }
  }, true);
  document.addEventListener('click', (e) => {
    if (e.target.matches('.toggle-btn, .patologia-btn')) {
      onFormChange();
    }
  });

  // Stepper inicial
  renderStepper(0, STEP_META.length);
  renderStepTimeEstimate(0);

  // Datalists de autocomplete
  injectDatalists();

  // Voice buttons
  attachVoiceButtons();

  // Tooltips "por que"
  injectWhyTooltips();

  // Banner PDF promovido
  promoteExtractorBanner();

  // Modo apresentação restaurado
  try {
    if (localStorage.getItem('erg_anamnese_presentation') === '1') {
      document.body.classList.add('presentation-mode');
    }
  } catch (_) {}

  // Atalhos
  initShortcuts();

  // Botões internos
  $('btn-smart-fill')?.addEventListener('click', copyFromLast);
  $('btn-save-exit')?.addEventListener('click', saveAndExit);
  $('btn-presentation')?.addEventListener('click', togglePresentationMode);
  $('btn-turbo')?.addEventListener('click', toggleTurboMode);
  $('btn-help-anamnese')?.addEventListener('click', openHelp);
  $('btn-help-close')?.addEventListener('click', closeHelp);
  document.querySelectorAll('[data-template]').forEach(btn => {
    btn.addEventListener('click', () => applyTemplate(btn.dataset.template));
  });

  // Inicia autosave
  startAutosave();

  // Atalho Ctrl+S manual
  window.addEventListener('beforeunload', (e) => {
    if (window._anamneseExtras.suppressBeforeUnload) return;
    saveDraft();
  });
}

// Expõe API global
window._anamneseExtras = {
  // Hooks
  onStepChange, onFormChange, onSaved,
  // State
  currentStep: 0,
  completedSteps: new Set(),
  suppressBeforeUnload: false,
  // Actions
  saveDraft, loadDraft, clearDraft,
  copyFromLast, saveAndExit,
  togglePresentationMode, toggleTurboMode,
  applyTemplate, openHelp, closeHelp,
  showToast,
  // Renderers
  renderStepper, renderRiskAlerts, renderRiskScore,
  showReviewPanel, hideReviewPanel,
  // Validation
  validateField, updateAllValidation,
};

document.addEventListener('DOMContentLoaded', init);

// ═══ POLIMENTO V2 ═══
// 10 micro-interações: ripple, step-slide, textarea-resize, char-counter,
// field-success, stepper-progress, smart-fill-spinner, typing-indicator,
// section-entrance, dom-watch

// V2-1 — Ripple effect nos botões interativos
function _v2Ripple(e) {
  const btn = e.currentTarget;
  const r = btn.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;
  const span = document.createElement('span');
  span.className = 'v2-ripple';
  span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  btn.appendChild(span);
  span.addEventListener('animationend', () => span.remove(), { once: true });
}
function _v2AttachRipples() {
  document.querySelectorAll('.tb-btn, .toggle-btn, .patologia-btn, .stepper-dot').forEach(el => {
    if (el.dataset.v2r) return;
    el.dataset.v2r = '1';
    el.style.overflow = 'hidden';
    el.addEventListener('click', _v2Ripple);
  });
}

// V2-2 — Slide animado ao mudar de step
let _v2PrevStepIdx = 0;
function _v2AnimateStepIn(stepId, dir) {
  const el = document.getElementById(stepId);
  if (!el) return;
  const cls = (dir >= 0) ? 'step-enter-right' : 'step-enter-left';
  el.classList.remove('step-enter-right', 'step-enter-left');
  void el.offsetWidth;
  el.classList.add(cls);
  const cleanup = () => el.classList.remove(cls);
  setTimeout(cleanup, 400);
  el.addEventListener('animationend', cleanup, { once: true });
}

// V2-3 — Textarea auto-resize suave
function _v2Resize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}
function _v2InitAutoResize() {
  document.querySelectorAll('#anamnese-form textarea').forEach(ta => {
    if (ta.dataset.ar) return;
    ta.dataset.ar = '1';
    ta.style.overflow = 'hidden';
    ta.style.resize = 'none';
    ta.style.transition = 'height 0.13s ease';
    _v2Resize(ta);
    ta.addEventListener('input', () => _v2Resize(ta));
  });
}

// V2-4 — Contador de caracteres com aria-live
const V2_CHAR_LIMITS = { motivo: 500, caso_clinico: 1200, observacoes: 800, exames_obs: 600 };
function _v2Counter(ta) {
  const limit = V2_CHAR_LIMITS[ta.id];
  if (!limit) return;
  let el = document.getElementById(`v2cc-${ta.id}`);
  if (!el) {
    el = document.createElement('span');
    el.id = `v2cc-${ta.id}`;
    el.className = 'v2-char-counter';
    el.setAttribute('aria-live', 'polite');
    ta.closest('.form-group')?.appendChild(el);
  }
  const len = ta.value.length;
  el.textContent = `${len} / ${limit}`;
  el.className = 'v2-char-counter' + (len > limit ? ' over-limit' : len / limit >= 0.88 ? ' near-limit' : '');
}
function _v2InitCounters() {
  document.querySelectorAll('#anamnese-form textarea').forEach(ta => {
    if (!V2_CHAR_LIMITS[ta.id]) return;
    _v2Counter(ta);
    ta.addEventListener('input', () => _v2Counter(ta));
  });
}

// V2-5 — Campo válido: borda verde + glow animado no blur
function _v2FieldOk(el) {
  const wrap = el.closest('.form-group') || el.parentElement;
  if (!wrap || wrap.classList.contains('has-error') || !el.value.trim()) return;
  wrap.classList.remove('v2-field-ok');
  void wrap.offsetWidth;
  wrap.classList.add('v2-field-ok');
  setTimeout(() => wrap.classList.remove('v2-field-ok'), 2200);
}
document.addEventListener('blur', (e) => {
  const el = e.target;
  if (el.matches?.('#anamnese-form input:not([type="hidden"]), #anamnese-form textarea')) {
    setTimeout(() => _v2FieldOk(el), 25);
  }
}, true);

// V2-6 — Linhas do stepper coloridas por progresso
function _v2StepperLines(currentIdx) {
  const stepper = document.getElementById('anamnese-stepper');
  if (!stepper) return;
  stepper.querySelectorAll('.stepper-line').forEach((line, i) => {
    line.classList.toggle('v2-line-done',    i < currentIdx);
    line.classList.toggle('v2-line-current', i === currentIdx - 1);
  });
}

// V2-7 — Spinner animado no botão smart-fill
function _v2SmartFillSpinner() {
  const btn = document.getElementById('btn-smart-fill');
  if (!btn || btn.dataset.v2sf || !window._anamneseExtras?.copyFromLast) return;
  btn.dataset.v2sf = '1';
  const orig = window._anamneseExtras.copyFromLast;
  window._anamneseExtras.copyFromLast = async function(...args) {
    const prev = btn.innerHTML;
    btn.innerHTML = '<span class="v2-spinner" aria-hidden="true"></span> Buscando…';
    btn.disabled = true;
    try { await orig.apply(this, args); }
    finally { btn.disabled = false; btn.innerHTML = prev; }
  };
}

// V2-8 — Typing indicator no badge de autosave
let _v2TypingT = null;
function _v2Typing() {
  const badge = document.getElementById('autosave-badge');
  if (!badge) return;
  badge.classList.add('v2-typing');
  clearTimeout(_v2TypingT);
  _v2TypingT = setTimeout(() => badge.classList.remove('v2-typing'), 900);
}

// V2-9 — Seções entram com fade+slide staggered
function _v2EnterSections(root) {
  (root || document).querySelectorAll?.('.section:not([data-v2in])').forEach((s, i) => {
    s.dataset.v2in = '1';
    s.style.animationDelay = `${Math.min(i * 40, 120)}ms`;
    s.classList.add('v2-section-enter');
    s.addEventListener('animationend', () => { s.style.animationDelay = ''; }, { once: true });
  });
}

// V2-10 — MutationObserver: re-aplica ripples em elementos dinâmicos
function _v2WatchDOM() {
  let _dbt = null;
  new MutationObserver(() => {
    clearTimeout(_dbt);
    _dbt = setTimeout(_v2AttachRipples, 120);
  }).observe(document.getElementById('anamnese-form') || document.body, { childList: true, subtree: true });
}

// ── Estende onStepChange para V2 ──
const _v2OrigStep = window._anamneseExtras?.onStepChange;
if (window._anamneseExtras) {
  window._anamneseExtras.onStepChange = function(idx, total, stepId) {
    const dir = idx - _v2PrevStepIdx;
    _v2PrevStepIdx = idx;
    _v2AnimateStepIn(stepId || `step-${idx}`, dir);
    _v2StepperLines(idx);
    _v2OrigStep?.call(this, idx, total, stepId);
    setTimeout(() => _v2EnterSections(document.getElementById(stepId || `step-${idx}`)), 30);
  };
}

function _initV2() {
  _v2AttachRipples();
  _v2InitAutoResize();
  _v2InitCounters();
  _v2SmartFillSpinner();
  _v2EnterSections();
  _v2WatchDOM();
  document.addEventListener('input', (e) => {
    if (e.target.matches('#anamnese-form input, #anamnese-form textarea, #anamnese-form select')) {
      _v2Typing();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initV2);
} else {
  _initV2();
}

// ═══ POLIMENTO V3 ═══
// 10 micro-melhorias de acessibilidade avançada:
// skip-links, focus-trap, aria-live announcer, aria-current,
// aria-invalid+errormessage, progressbar role, toast alert role,
// prefers-reduced-motion, step announcer, toggle keyboard support

// V3-1 — Skip-links: atalhos de teclado para regiões principais
function _v3InjectSkipLinks() {
  if (document.getElementById('v3-skip-links')) return;
  const nav = document.createElement('nav');
  nav.id = 'v3-skip-links';
  nav.setAttribute('aria-label', 'Atalhos de navegação');
  nav.innerHTML =
    '<a href="#conteudo-principal" class="v3-skip-link">Pular para o conteúdo</a>' +
    '<a href="#anamnese-stepper" class="v3-skip-link">Pular para o progresso</a>' +
    '<a href="#btn-next" class="v3-skip-link">Pular para próxima etapa</a>';
  document.body.insertBefore(nav, document.body.firstChild);
  const main = document.querySelector('main, .main-content, [role="main"]');
  if (main && !main.id) main.id = 'conteudo-principal';
}

// V3-2 — Focus trap em modais (recovery + help)
function _v3FocusTrap(modal) {
  const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function handleKey(e) {
    if (e.key !== 'Tab') return;
    const els = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  return {
    onOpen() {
      modal.addEventListener('keydown', handleKey);
      const firstEl = modal.querySelector(FOCUSABLE);
      if (firstEl) setTimeout(() => firstEl.focus(), 60);
    },
    onClose() { modal.removeEventListener('keydown', handleKey); },
  };
}

// V3-3 — ARIA live region central para anúncios de screen reader
function _v3EnsureAnnouncer() {
  let el = document.getElementById('v3-sr-announcer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'v3-sr-announcer';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'v3-sr-only';
    document.body.appendChild(el);
  }
  return el;
}
function _v3Announce(msg, priority) {
  const el = _v3EnsureAnnouncer();
  el.setAttribute('aria-live', priority || 'polite');
  el.textContent = '';
  // Double rAF garante que ATs processem a mudança
  requestAnimationFrame(() => requestAnimationFrame(() => { el.textContent = msg; }));
}

// V3-4 — aria-current="step" + aria-label descritivo no stepper ativo
function _v3StepperAria() {
  const stepper = document.getElementById('anamnese-stepper');
  if (!stepper) return;
  if (!stepper.getAttribute('role')) {
    stepper.setAttribute('role', 'navigation');
    stepper.setAttribute('aria-label', 'Progresso da anamnese');
  }
  stepper.querySelectorAll('.stepper-dot').forEach(btn => {
    const isCurrent = btn.classList.contains('current');
    if (isCurrent) btn.setAttribute('aria-current', 'step');
    else btn.removeAttribute('aria-current');
    const state = btn.classList.contains('done') ? ' (concluída)'
      : btn.classList.contains('visited') ? ' (visitada)' : ' (pendente)';
    const base = btn.querySelector('.stepper-label')?.textContent || '';
    if (base) btn.setAttribute('aria-label', base + state);
  });
}

// V3-5 — aria-invalid + aria-errormessage na validação inline via MutationObserver
function _v3PatchValidationAria() {
  new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType !== 1 || !n.classList?.contains('inline-error')) return;
        const field = n.closest?.('.form-group')?.querySelector('input,textarea,select');
        if (!field) return;
        if (!n.id) n.id = `v3err-${field.id || Math.random().toString(36).slice(2)}`;
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-errormessage', n.id);
        field.setAttribute('aria-describedby', n.id);
      });
      m.removedNodes.forEach(n => {
        if (n.nodeType !== 1 || !n.classList?.contains('inline-error')) return;
        const wrap = n.closest?.('.form-group') || m.target.closest?.('.form-group');
        if (!wrap) return;
        const field = wrap.querySelector('input,textarea,select');
        if (field) {
          field.removeAttribute('aria-invalid');
          field.removeAttribute('aria-errormessage');
          field.removeAttribute('aria-describedby');
        }
      });
    });
  }).observe(document.getElementById('anamnese-form') || document.body, { childList: true, subtree: true });
}

// V3-6 — role="progressbar" com aria-valuenow no score de risco
function _v3PatchRiskProgressbar() {
  if (!window._anamneseExtras) return;
  const orig = window._anamneseExtras.renderRiskScore;
  if (!orig) return;
  window._anamneseExtras.renderRiskScore = function() {
    orig.apply(this, arguments);
    const fill = document.querySelector('.risk-score-bar-fill');
    const bar  = fill?.closest('.risk-score-bar');
    if (!bar) return;
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    const w = parseInt(fill.style.width) || 0;
    bar.setAttribute('aria-valuenow', String(w));
    const lvl = w < 20 ? 'Risco baixo' : w < 45 ? 'Risco moderado' : 'Risco alto';
    bar.setAttribute('aria-label', `Score de risco: ${w} de 100 — ${lvl}`);
  };
}

// V3-7 — Toast com role="alert" e aria-atomic para leitores de tela
function _v3PatchToast() {
  function stamp(t) {
    if (!t) return;
    if (!t.getAttribute('role')) t.setAttribute('role', 'alert');
    t.setAttribute('aria-atomic', 'true');
    t.setAttribute('aria-live', 'assertive');
  }
  stamp(document.getElementById('anamnese-extras-toast'));
  if (!window._anamneseExtras) return;
  const orig = window._anamneseExtras.showToast;
  if (!orig) return;
  window._anamneseExtras.showToast = function(msg, type) {
    orig.call(this, msg, type);
    stamp(document.getElementById('anamnese-extras-toast'));
  };
}

// V3-8 — prefers-reduced-motion: desativa animações para usuários sensíveis
function _v3ReducedMotion() {
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (!mq) return;
  const apply = (reduce) => document.documentElement.classList.toggle('v3-reduced-motion', !!reduce);
  apply(mq.matches);
  mq.addEventListener('change', e => apply(e.matches));
}

// V3-9 — Anúncio de step change para screen readers
function _v3StepAnnouncer() {
  if (!window._anamneseExtras) return;
  const orig = window._anamneseExtras.onStepChange;
  if (!orig) return;
  window._anamneseExtras.onStepChange = function(idx, total, stepId) {
    orig.apply(this, arguments);
    // STEP_META está no escopo do módulo
    const meta = (typeof STEP_META !== 'undefined' ? STEP_META : [])[idx];
    const name = meta?.name || `Etapa ${idx + 1}`;
    _v3Announce(`${name} — etapa ${idx + 1} de ${total || 10}`);
    _v3StepperAria();
  };
}

// V3-10 — Keyboard support para toggle-btn e patologia-btn (Enter/Space ativam)
function _v3ToggleKeyboard() {
  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (!el.matches?.('.toggle-btn,.patologia-btn')) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
  });
  function ensureA11y(root) {
    (root || document).querySelectorAll?.('.patologia-btn').forEach(btn => {
      if (!btn.getAttribute('role')) btn.setAttribute('role', 'checkbox');
      btn.setAttribute('aria-checked', btn.classList.contains('active') ? 'true' : 'false');
    });
    (root || document).querySelectorAll?.('.toggle-btn[type!="button"]:not(button)').forEach(btn => {
      if (!btn.getAttribute('tabindex')) btn.setAttribute('tabindex', '0');
    });
  }
  ensureA11y();
  // Sync aria-checked em cliques
  document.addEventListener('click', e => {
    const btn = e.target.closest?.('.patologia-btn');
    if (btn) btn.setAttribute('aria-checked', btn.classList.contains('active') ? 'true' : 'false');
  });
  // Re-aplica em elementos dinâmicos
  new MutationObserver(() => ensureA11y()).observe(
    document.getElementById('anamnese-form') || document.body, { childList: true, subtree: true }
  );
}

// ── Init V3 ──
function _initV3() {
  _v3InjectSkipLinks();
  _v3EnsureAnnouncer();
  _v3ReducedMotion();
  _v3ToggleKeyboard();
  _v3PatchValidationAria();

  // Focus trap nos modais (observa abertura via style)
  ['anamnese-recovery-modal', 'anamnese-help'].forEach(id => {
    const modal = document.getElementById(id);
    if (!modal) return;
    const trap = _v3FocusTrap(modal);
    new MutationObserver(() => {
      const open = modal.style.display === 'flex' || modal.style.display === 'block';
      open ? trap.onOpen() : trap.onClose();
    }).observe(modal, { attributes: true, attributeFilter: ['style'] });
  });

  // Patches que dependem do _anamneseExtras já inicializado
  setTimeout(() => {
    _v3PatchRiskProgressbar();
    _v3PatchToast();
    _v3StepAnnouncer();
    _v3StepperAria();
  }, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initV3);
} else {
  _initV3();
}

// ═══ POLIMENTO V4 ═══
// 10 melhorias de performance: requestIdleCallback, IntersectionObserver,
// Page Visibility API, prefetch especulativo, preconnect, memoização risk score,
// performance.mark, throttle renderRiskAlerts, dirty-field tracking, IO review rows

// V4-1 — requestIdleCallback polyfill + wrapper helper
const _v4RIC = typeof requestIdleCallback !== 'undefined'
  ? (cb, opts) => requestIdleCallback(cb, opts)
  : (cb) => { const s = Date.now(); return setTimeout(() => cb({ timeRemaining: () => Math.max(0, 50 - (Date.now() - s)), didTimeout: false }), 1); };
const _v4CIC = typeof cancelIdleCallback !== 'undefined' ? cancelIdleCallback : clearTimeout;

// V4-2 — IntersectionObserver: lazy first-render do #anamnese-risk-score (começa vazio)
function _v4LazyRiskScore() {
  const el = document.getElementById('anamnese-risk-score');
  if (!el || el.dataset.v4io) return;
  el.dataset.v4io = '1';
  let rendered = false;
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting || rendered) return;
    rendered = true;
    window._anamneseExtras?.renderRiskScore?.();
    obs.disconnect();
  }, { threshold: 0.1, rootMargin: '80px' }).observe(el);
}

// V4-3 — Page Visibility API: salva rascunho e pausa animações quando aba oculta
function _v4PageVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window._anamneseExtras?.saveDraft?.();
      document.documentElement.classList.add('v4-tab-hidden');
    } else {
      document.documentElement.classList.remove('v4-tab-hidden');
    }
  });
}

// V4-4 — Prefetch especulativo de admin.html/dashboard.html na penúltima step
let _v4PrefetchDone = false;
function _v4Prefetch(idx, total) {
  if (_v4PrefetchDone || idx < total - 2) return;
  _v4PrefetchDone = true;
  _v4RIC(() => {
    ['admin.html', 'dashboard.html'].forEach(href => {
      if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      link.as = 'document';
      document.head.appendChild(link);
    });
  }, { timeout: 3000 });
}

// V4-5 — Preconnect ao Supabase + esm.sh (reduz latência de DNS/TLS nos primeiros fetch)
function _v4Preconnect() {
  _v4RIC(() => {
    ['https://gqnlrhmriufepzpustna.supabase.co', 'https://esm.sh'].forEach(href => {
      if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  });
}

// V4-6 — Memoização do renderRiskScore: skip se inputs relevantes não mudaram
function _v4MemoizeRiskScore() {
  const api = window._anamneseExtras;
  if (!api?.renderRiskScore || api.renderRiskScore._v4m) return;
  let _cache = '';
  const orig = api.renderRiskScore;
  api.renderRiskScore = function _v4Memoized() {
    const vals = ['fumante', 'ingere_alcool', 'horas_sono', 'nivel_af', 'agua_litros']
      .map(id => document.getElementById(id)?.value ?? '').join('|');
    const pats = Array.from(document.querySelectorAll('.patologia-btn.active'))
      .map(b => b.dataset.value || '').sort().join(',');
    const key = vals + '|' + pats;
    if (key === _cache) return;
    _cache = key;
    orig.apply(this, arguments);
  };
  api.renderRiskScore._v4m = true;
}

// V4-7 — performance.mark + measure nas transições de step (visível no DevTools > Performance)
function _v4PatchStepPerf() {
  const api = window._anamneseExtras;
  if (!api?.onStepChange || api.onStepChange._v4p) return;
  const orig = api.onStepChange;
  api.onStepChange = function _v4PerfStep(idx, total, stepId) {
    const markStart = `erg:anamnese:step-${idx}:start`;
    try { performance.mark(markStart); } catch (_) {}
    orig.apply(this, arguments);
    requestAnimationFrame(() => {
      try {
        const markPaint = `erg:anamnese:step-${idx}:painted`;
        performance.mark(markPaint);
        performance.measure(`erg:anamnese:step-${idx}`, markStart, markPaint);
      } catch (_) {}
      _v4Prefetch(idx, total);
    });
  };
  api.onStepChange._v4p = true;
}

// V4-8 — Throttle temporal do renderRiskAlerts (máx 1 re-render/500ms durante digitação rápida)
function _v4ThrottleRiskAlerts() {
  const api = window._anamneseExtras;
  if (!api?.renderRiskAlerts || api.renderRiskAlerts._v4t) return;
  let _last = 0;
  const THROTTLE = 500;
  const orig = api.renderRiskAlerts;
  api.renderRiskAlerts = function _v4Throttled() {
    const now = Date.now();
    if (now - _last < THROTTLE) return;
    _last = now;
    orig.apply(this, arguments);
  };
  api.renderRiskAlerts._v4t = true;
}

// V4-9 — Dirty field tracking: rastreia campos modificados + badge visual de unsaved changes
function _v4DirtyTracking() {
  const dirty = new Set();

  function ensureBadge() {
    if (document.getElementById('v4-dirty-badge')) return;
    const ref = document.getElementById('autosave-badge');
    if (!ref) return;
    const badge = document.createElement('span');
    badge.id = 'v4-dirty-badge';
    badge.className = 'v4-dirty-badge';
    badge.setAttribute('aria-live', 'polite');
    badge.style.display = 'none';
    ref.parentElement?.insertBefore(badge, ref.nextSibling);
  }

  function updateBadge() {
    ensureBadge();
    const badge = document.getElementById('v4-dirty-badge');
    if (!badge) return;
    const n = dirty.size;
    if (n > 0) {
      badge.textContent = `${n} campo${n > 1 ? 's' : ''} alterado${n > 1 ? 's' : ''}`;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  document.addEventListener('input', e => {
    const el = e.target;
    if (el.id && el.matches('#anamnese-form input, #anamnese-form textarea, #anamnese-form select')) {
      dirty.add(el.id);
      updateBadge();
    }
  });
  document.addEventListener('click', e => {
    const el = e.target.closest?.('.toggle-btn, .patologia-btn');
    if (el?.dataset.field) { dirty.add(el.dataset.field); updateBadge(); }
  });

  const api = window._anamneseExtras;
  if (api) {
    api.getDirtyFields = () => Array.from(dirty);
    if (api.onSaved && !api.onSaved._v4d) {
      const origSaved = api.onSaved;
      api.onSaved = function() {
        origSaved.apply(this, arguments);
        dirty.clear();
        updateBadge();
      };
      api.onSaved._v4d = true;
    }
  }

  ensureBadge();
}

// V4-10 — IntersectionObserver nos review-rows: animação staggered ao entrar no viewport
function _v4AnimateReviewRows(root) {
  const rows = (root || document).querySelectorAll?.('.review-row:not([data-v4r])');
  if (!rows?.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('v4-row-in');
      obs.unobserve(e.target);
    });
  }, { threshold: 0.1, rootMargin: '30px' });
  rows.forEach((r, i) => {
    r.dataset.v4r = '1';
    r.style.animationDelay = `${Math.min(i * 25, 200)}ms`;
    obs.observe(r);
  });
}

function _v4PatchReviewPanel() {
  const api = window._anamneseExtras;
  if (!api?.showReviewPanel || api.showReviewPanel._v4rv) return;
  const orig = api.showReviewPanel;
  api.showReviewPanel = function() {
    orig.apply(this, arguments);
    requestAnimationFrame(() => _v4AnimateReviewRows(document.getElementById('anamnese-review')));
  };
  api.showReviewPanel._v4rv = true;
}

// ── Init V4 ──
function _initV4() {
  _v4Preconnect();
  _v4PageVisibility();
  _v4LazyRiskScore();

  // Patches ordenados: throttle → memoize → step perf → review → dirty
  setTimeout(() => {
    _v4ThrottleRiskAlerts();
    _v4MemoizeRiskScore();
    _v4PatchStepPerf();
    _v4PatchReviewPanel();
    _v4DirtyTracking();
    _v4AnimateReviewRows();
  }, 200);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initV4);
} else {
  _initV4();
}

// ═══ POLIMENTO V5 ═══
// 10 Web APIs modernas: Wake Lock, Web Share, Notifications API,
// Battery Status, Vibration, Clipboard, Network Information,
// visibility relay, BeforeInstallPrompt PWA, haptic MutationObserver

// V5-1 — Screen Wake Lock: mantém tela acesa durante preenchimento ativo
let _v5WakeLock = null;
let _v5WakeLockEnabled = false;

async function _v5AcquireWakeLock() {
  if (!('wakeLock' in navigator) || !_v5WakeLockEnabled) return;
  try {
    if (_v5WakeLock?.active) return;
    _v5WakeLock = await navigator.wakeLock.request('screen');
    _v5WakeLock.addEventListener('release', () => {
      _v5WakeLock = null;
      _v5UpdateWakeLockUI(false);
    }, { once: true });
    _v5UpdateWakeLockUI(true);
  } catch (_) {}
}

async function _v5ReleaseWakeLock() {
  try { if (_v5WakeLock) await _v5WakeLock.release(); } catch (_) {}
  _v5WakeLock = null;
}

function _v5UpdateWakeLockUI(active) {
  const btn = document.getElementById('v5-wakelock-btn');
  if (!btn) return;
  btn.classList.toggle('v5-wakelock-on', active);
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  btn.title = active ? 'Tela sempre ativa — clique para desligar' : 'Manter tela ativa';
}

function _v5ToggleWakeLock() {
  _v5WakeLockEnabled = !_v5WakeLockEnabled;
  try { localStorage.setItem('erg_anamnese_wakelock', _v5WakeLockEnabled ? '1' : '0'); } catch (_) {}
  if (_v5WakeLockEnabled) _v5AcquireWakeLock();
  else _v5ReleaseWakeLock();
  window._anamneseExtras?.showToast(
    _v5WakeLockEnabled ? 'Tela sempre ativa ativada' : 'Wake Lock desativado'
  );
}

function _v5InjectWakeLockBtn() {
  if (document.getElementById('v5-wakelock-btn')) return;
  const right = document.querySelector('.anamnese-toolbar-right');
  if (!right) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'v5-wakelock-btn';
  btn.className = 'tb-btn';
  btn.setAttribute('aria-pressed', 'false');
  btn.title = 'Manter tela ativa';
  btn.setAttribute('aria-label', 'Manter tela sempre ativa durante o preenchimento');
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  btn.addEventListener('click', _v5ToggleWakeLock);
  right.appendChild(btn);
  try {
    if (localStorage.getItem('erg_anamnese_wakelock') === '1') {
      _v5WakeLockEnabled = true;
      _v5AcquireWakeLock();
    }
  } catch (_) {}
}

// V5-2 — Wake Lock visibility relay: libera ao esconder aba, readquire ao voltar
function _v5WakeLockVisibilityRelay() {
  document.addEventListener('visibilitychange', async () => {
    if (!_v5WakeLockEnabled) return;
    if (document.visibilityState === 'visible') await _v5AcquireWakeLock();
    else await _v5ReleaseWakeLock();
  });
  window.addEventListener('pagehide', _v5ReleaseWakeLock);
}

// V5-3 — Web Share API: compartilha resumo clínico via OS share sheet
function _v5BuildShareText() {
  const scoreEl = document.querySelector('.risk-score-value');
  const levelEl = document.querySelector('.risk-score-label');
  const score = scoreEl?.textContent?.trim() || '—';
  const level = levelEl ? levelEl.textContent.replace(/\s+/g, ' ').trim() : '—';
  const pats = Array.from(document.querySelectorAll('.patologia-btn.active'))
    .map(b => b.textContent.trim()).slice(0, 5).join(', ');
  const alertList = Array.from(document.querySelectorAll('.risk-alert'))
    .map(a => '• ' + (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90))
    .slice(0, 4).join('\n');
  const date = new Date().toLocaleDateString('pt-BR');
  return [
    `=== Anamnese ERG 360 — ${date} ===`,
    `Score de risco: ${score} (${level})`,
    pats ? `Condições: ${pats}` : '',
    alertList ? `\nAlertas clínicos:\n${alertList}` : '',
    '\n— Gerado via ERG 360',
  ].filter(Boolean).join('\n');
}

async function _v5ShareSummary() {
  const text = _v5BuildShareText();
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Resumo Anamnese — ERG 360', text });
      window._anamneseExtras?.showToast('Compartilhado!', 'ok');
    } catch (e) {
      if (e?.name !== 'AbortError') await _v5CopySummary(text);
    }
  } else {
    await _v5CopySummary(text);
  }
}

function _v5InjectShareBtn() {
  if (document.getElementById('v5-share-btn')) return;
  const right = document.querySelector('.anamnese-toolbar-right');
  if (!right) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'v5-share-btn';
  btn.className = 'tb-btn';
  btn.title = 'Compartilhar resumo clínico';
  btn.setAttribute('aria-label', 'Compartilhar resumo clínico via share nativo');
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Compartilhar`;
  btn.addEventListener('click', _v5ShareSummary);
  right.insertBefore(btn, right.firstChild);
}

// V5-4 — Notifications API: barra de permissão contextual (exibida após step 3)
let _v5NotifRequested = false;

function _v5InjectNotifBar() {
  if (document.getElementById('v5-notif-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'v5-notif-bar';
  bar.className = 'v5-notif-bar';
  bar.style.display = 'none';
  bar.setAttribute('role', 'complementary');
  bar.setAttribute('aria-label', 'Solicitar permissão de notificações');
  bar.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    <span>Ativar lembretes para ser notificada se sair com rascunho não salvo?</span>
    <button type="button" id="v5-notif-yes" class="tb-btn tb-primary">Ativar</button>
    <button type="button" id="v5-notif-no"  class="tb-btn">Agora não</button>`;
  const form = document.getElementById('anamnese-form');
  if (form) form.insertBefore(bar, form.firstChild);
  else document.querySelector('.main-content')?.insertAdjacentElement('afterbegin', bar);
  document.getElementById('v5-notif-yes')?.addEventListener('click', _v5EnableNotifications);
  document.getElementById('v5-notif-no')?.addEventListener('click', () => {
    bar.style.display = 'none';
    try { localStorage.setItem('erg_anamnese_notif_denied', '1'); } catch (_) {}
  });
}

async function _v5EnableNotifications() {
  const perm = await Notification.requestPermission();
  const bar = document.getElementById('v5-notif-bar');
  if (bar) bar.style.display = 'none';
  if (perm === 'granted') {
    window._anamneseExtras?.showToast('Lembretes ativados', 'ok');
    _v5HapticSuccess();
  }
}

function _v5MaybeRequestNotifPermission(stepIdx) {
  if (_v5NotifRequested || stepIdx < 3) return;
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  try { if (localStorage.getItem('erg_anamnese_notif_denied')) return; } catch (_) {}
  _v5NotifRequested = true;
  const bar = document.getElementById('v5-notif-bar');
  if (bar) setTimeout(() => { bar.style.display = 'flex'; }, 800);
}

// V5-5 — Notification API: lembrete de rascunho não salvo ao ficar em background
let _v5DraftReminderTimer = null;
const V5_REMINDER_DELAY_MS = 9 * 60 * 1000;

function _v5ScheduleDraftReminder() {
  clearTimeout(_v5DraftReminderTimer);
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  _v5DraftReminderTimer = setTimeout(() => {
    const dirty = window._anamneseExtras?.getDirtyFields?.() || [];
    if (!dirty.length) return;
    try {
      new Notification('ERG 360 — Anamnese', {
        body: `Você tem ${dirty.length} campo${dirty.length > 1 ? 's' : ''} não salvo${dirty.length > 1 ? 's' : ''}. Clique para continuar.`,
        tag: 'erg-anamnese-draft',
      });
    } catch (_) {}
  }, V5_REMINDER_DELAY_MS);
}

function _v5AttachDraftReminder() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) _v5ScheduleDraftReminder();
    else clearTimeout(_v5DraftReminderTimer);
  });
}

// V5-6 — Battery Status API: modo economia em bateria baixa (≤20%)
function _v5EnsureBatteryBadge() {
  if (document.getElementById('v5-battery-badge')) return document.getElementById('v5-battery-badge');
  const ref = document.getElementById('autosave-badge');
  if (!ref) return null;
  const span = document.createElement('span');
  span.id = 'v5-battery-badge';
  span.className = 'v5-battery-badge';
  span.style.display = 'none';
  span.setAttribute('aria-live', 'polite');
  ref.parentElement?.insertBefore(span, ref.nextSibling);
  return span;
}

async function _v5MonitorBattery() {
  if (!('getBattery' in navigator)) return;
  const badge = _v5EnsureBatteryBadge();
  try {
    const battery = await navigator.getBattery();
    const update = () => {
      const pct = Math.round(battery.level * 100);
      const low = pct <= 20 && !battery.charging;
      document.documentElement.classList.toggle('v5-low-battery', low);
      if (!badge) return;
      if (low) { badge.textContent = `Bateria ${pct}% — modo economia`; badge.style.display = ''; }
      else badge.style.display = 'none';
    };
    update();
    ['levelchange', 'chargingchange'].forEach(ev => battery.addEventListener(ev, update));
  } catch (_) {}
}

// V5-7 — Vibration API: padrões hápticos para erro, sucesso e mudança de step
function _v5HapticError()   { try { navigator.vibrate?.([70, 40, 70]); } catch (_) {} }
function _v5HapticSuccess() { try { navigator.vibrate?.(60); } catch (_) {} }
function _v5HapticStep()    { try { navigator.vibrate?.(25); } catch (_) {} }

function _v5AttachHapticsViaObservers() {
  // Erro: MutationObserver detecta inline-error adicionado ao form
  new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1 && n.classList?.contains('inline-error')) _v5HapticError();
      });
    });
  }).observe(document.getElementById('anamnese-form') || document.body, { childList: true, subtree: true });

  // Sucesso: MutationObserver detecta classe .saved no autosave-badge
  const badge = document.getElementById('autosave-badge');
  if (badge) {
    new MutationObserver(() => {
      if (badge.classList.contains('saved')) _v5HapticSuccess();
    }).observe(badge, { attributes: true, attributeFilter: ['class'] });
  }
}

function _v5PatchHapticsOnStep() {
  const api = window._anamneseExtras;
  if (!api?.onStepChange || api.onStepChange._v5h) return;
  const orig = api.onStepChange;
  api.onStepChange = function _v5StepHaptic(idx, total, stepId) {
    _v5HapticStep();
    _v5MaybeRequestNotifPermission(idx);
    return orig.apply(this, arguments);
  };
  api.onStepChange._v5h = true;
}

// V5-8 — Clipboard API: copia resumo clínico estruturado para área de transferência
async function _v5CopySummary(text) {
  const t = text || _v5BuildShareText();
  try {
    await navigator.clipboard.writeText(t);
    window._anamneseExtras?.showToast('Resumo copiado para a área de transferência', 'ok');
    _v5HapticSuccess();
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); window._anamneseExtras?.showToast('Copiado', 'ok'); } catch (_2) {}
    ta.remove();
  }
}

function _v5InjectCopyBtn() {
  if (document.getElementById('v5-copy-btn')) return;
  const left = document.querySelector('.anamnese-toolbar-left');
  if (!left) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'v5-copy-btn';
  btn.className = 'tb-btn';
  btn.title = 'Copiar resumo clínico';
  btn.setAttribute('aria-label', 'Copiar resumo clínico para área de transferência');
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar resumo`;
  btn.addEventListener('click', () => _v5CopySummary());
  left.appendChild(btn);
}

// V5-9 — Network Information API: detecção offline e conexão lenta com badge contextual
function _v5EnsureNetworkBadge() {
  if (document.getElementById('v5-network-badge')) return document.getElementById('v5-network-badge');
  const toolbar = document.querySelector('.anamnese-toolbar');
  if (!toolbar) return null;
  const span = document.createElement('span');
  span.id = 'v5-network-badge';
  span.className = 'v5-network-badge';
  span.style.display = 'none';
  span.setAttribute('aria-live', 'polite');
  span.setAttribute('role', 'status');
  toolbar.appendChild(span);
  return span;
}

function _v5NetworkMonitor() {
  const badge = _v5EnsureNetworkBadge();
  function update() {
    const offline = !navigator.onLine;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const slow = !offline && !!conn && (
      conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' ||
      (conn.downlink !== undefined && conn.downlink < 0.5)
    );
    document.documentElement.classList.toggle('v5-offline', offline);
    document.documentElement.classList.toggle('v5-slow-net', slow);
    if (!badge) return;
    if (offline) {
      badge.textContent = 'Offline — salvando localmente';
      badge.className = 'v5-network-badge v5-net-offline';
      badge.style.display = '';
    } else if (slow) {
      const type = conn?.effectiveType?.toUpperCase() || 'lenta';
      badge.textContent = `Conexão ${type} — modo local`;
      badge.className = 'v5-network-badge v5-net-slow';
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }
  update();
  window.addEventListener('online', update);
  window.addEventListener('offline', () => { update(); window._anamneseExtras?.saveDraft?.(); });
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  conn?.addEventListener('change', update);
}

// V5-10 — BeforeInstallPrompt: botão de instalação PWA capturado antes do prompt
let _v5DeferredInstallPrompt = null;

function _v5InjectInstallBtn() {
  if (document.getElementById('v5-install-btn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'v5-install-btn';
  btn.className = 'tb-btn v5-install-btn';
  btn.style.display = 'none';
  btn.title = 'Instalar ERG 360 como aplicativo';
  btn.setAttribute('aria-label', 'Instalar ERG 360 como aplicativo no dispositivo');
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Instalar app`;
  btn.addEventListener('click', async () => {
    if (!_v5DeferredInstallPrompt) return;
    _v5DeferredInstallPrompt.prompt();
    const { outcome } = await _v5DeferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      window._anamneseExtras?.showToast('App instalado com sucesso!', 'ok');
      _v5HapticSuccess();
    }
    _v5DeferredInstallPrompt = null;
    btn.style.display = 'none';
  });
  document.querySelector('.anamnese-toolbar-right')?.appendChild(btn);
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _v5DeferredInstallPrompt = e;
  const btn = document.getElementById('v5-install-btn');
  if (btn) { btn.style.display = ''; btn.classList.add('v5-install-pulse'); }
});
window.addEventListener('appinstalled', () => {
  _v5DeferredInstallPrompt = null;
  const btn = document.getElementById('v5-install-btn');
  if (btn) btn.style.display = 'none';
  window._anamneseExtras?.showToast('ERG 360 instalado!', 'ok');
});

// ── Init V5 ──
function _initV5() {
  _v5InjectWakeLockBtn();
  _v5WakeLockVisibilityRelay();
  _v5InjectShareBtn();
  _v5InjectCopyBtn();
  _v5InjectNotifBar();
  _v5InjectInstallBtn();
  _v5EnsureBatteryBadge();
  _v5EnsureNetworkBadge();
  _v5MonitorBattery();
  _v5NetworkMonitor();
  _v5AttachDraftReminder();
  _v5AttachHapticsViaObservers();
  setTimeout(() => { _v5PatchHapticsOnStep(); }, 300);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initV5);
} else {
  _initV5();
}

// ═══ POLIMENTO V6 ═══
// 10 gamification features: completude score, streak diário, mini-heatmap
// 7 dias, AudioContext (sons sutis), mensagens encorajadoras, badge
// velocidade "Especialista", confetti ao salvar, qualidade clínica
// (Bronze→Diamante), toast troféu de conclusão, ring de 100% preenchido.

// V6-1 — Completude Score: % de campos preenchidos exibida na toolbar
function _v6ComputeCompleteness() {
  const inputs = Array.from(document.querySelectorAll(
    '#anamnese-form input:not([type=hidden]):not([type=submit]),' +
    '#anamnese-form select,#anamnese-form textarea'
  ));
  if (!inputs.length) return 0;
  const filled = inputs.filter(el => {
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked;
    return (el.value || '').trim().length > 0;
  }).length;
  const toggleGroups = new Set(
    Array.from(document.querySelectorAll('.toggle-btn')).map(b => b.dataset.field).filter(Boolean)
  );
  const activatedGroups = new Set(
    Array.from(document.querySelectorAll('.toggle-btn.active')).map(b => b.dataset.field).filter(Boolean)
  );
  const activePat = document.querySelectorAll('.patologia-btn.active').length;
  const totalExtra = toggleGroups.size + (activePat > 0 ? 1 : 0);
  const filledExtra = activatedGroups.size + (activePat > 0 ? 1 : 0);
  const total = inputs.length + totalExtra;
  return total > 0 ? Math.round(((filled + filledExtra) / total) * 100) : 0;
}

function _v6UpdateCompletenessUI(pct) {
  const el = document.getElementById('v6-completeness-badge');
  if (!el) return;
  const prev = parseInt(el.dataset.pct || '0');
  el.dataset.pct = pct;
  el.textContent = `${pct}% preenchido`;
  el.className = 'v6-completeness-badge' + (
    pct >= 90 ? ' v6-comp-gold' :
    pct >= 60 ? ' v6-comp-good' :
    pct >= 30 ? ' v6-comp-mid' : ''
  );
  if (pct >= 100 && prev < 100) _v6OnFullCompletion();
}

function _v6InjectCompletenessBadge() {
  if (document.getElementById('v6-completeness-badge')) return;
  const left = document.querySelector('.anamnese-toolbar-left');
  if (!left) return;
  const span = document.createElement('span');
  span.id = 'v6-completeness-badge';
  span.className = 'v6-completeness-badge';
  span.dataset.pct = '0';
  span.setAttribute('aria-live', 'polite');
  span.setAttribute('role', 'status');
  span.textContent = '0% preenchido';
  left.appendChild(span);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const update = debounce(() => _v6UpdateCompletenessUI(_v6ComputeCompleteness()), 500);
  document.getElementById('anamnese-form')?.addEventListener('change', update);
  document.getElementById('anamnese-form')?.addEventListener('input', update);
  document.querySelectorAll('.toggle-btn, .patologia-btn').forEach(b =>
    b.addEventListener('click', () => setTimeout(() => _v6UpdateCompletenessUI(_v6ComputeCompleteness()), 60))
  );
  _v6UpdateCompletenessUI(_v6ComputeCompleteness());
}

// V6-2 — Streak diário: dias consecutivos de acesso registrados em localStorage
function _v6UpdateStreak() {
  const KEY = 'erg_anamnese_streak';
  const today = new Date().toISOString().slice(0, 10);
  let data;
  try { data = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { data = {}; }
  const lastDate = data.last || '';
  const streak = data.streak || 0;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = lastDate === today ? streak :
                    lastDate === yesterday ? streak + 1 : 1;
  const history = Object.assign({}, data.history || {});
  history[today] = true;
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  Object.keys(history).forEach(d => { if (d < cutoff) delete history[d]; });
  try { localStorage.setItem(KEY, JSON.stringify({ last: today, streak: newStreak, history })); } catch (_) {}
  return { streak: newStreak, history };
}

function _v6InjectStreakBadge() {
  if (document.getElementById('v6-streak-badge')) return;
  const { streak, history } = _v6UpdateStreak();
  if (streak < 1) return;
  const right = document.querySelector('.anamnese-toolbar-right');
  if (!right) return;
  const span = document.createElement('span');
  span.id = 'v6-streak-badge';
  span.className = 'v6-streak-badge';
  const label = `${streak} dia${streak > 1 ? 's' : ''} consecutivo${streak > 1 ? 's' : ''} de atividade`;
  span.title = label;
  span.setAttribute('aria-label', label);
  span.innerHTML = `<span class="v6-streak-icon" aria-hidden="true">${streak >= 7 ? '🔥' : '⚡'}</span><span>${streak}d</span>`;
  right.insertBefore(span, right.firstChild);
  _v6InjectMiniHeatmap(history, span);
}

// V6-3 — Mini-heatmap 7 dias de atividade
function _v6InjectMiniHeatmap(history, anchor) {
  if (document.getElementById('v6-heatmap')) return;
  const wrap = document.createElement('span');
  wrap.id = 'v6-heatmap';
  wrap.className = 'v6-heatmap';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.title = 'Últimos 7 dias de atividade';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const dot = document.createElement('span');
    dot.className = 'v6-heat-dot' + (history[d] ? ' v6-heat-active' : '');
    wrap.appendChild(dot);
  }
  if (anchor?.parentElement) anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
}

// V6-4 — AudioContext: tons sutis de feedback (passo, sucesso, erro)
let _v6AudioCtx = null;
function _v6GetAudioCtx() {
  if (!_v6AudioCtx) {
    try { _v6AudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
  }
  return _v6AudioCtx;
}
function _v6PlayTone(freq, dur, type = 'sine', gain = 0.10) {
  const ctx = _v6GetAudioCtx();
  if (!ctx) return;
  try {
    ctx.resume();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur + 0.05);
  } catch (_) {}
}
function _v6SoundStep()    { _v6PlayTone(523.25, 0.10); }
function _v6SoundSuccess() { _v6PlayTone(659.25, 0.09); setTimeout(() => _v6PlayTone(783.99, 0.16), 110); }
function _v6SoundError()   { _v6PlayTone(220, 0.18, 'sawtooth', 0.07); }
function _v6AudioEnabled() {
  try { return localStorage.getItem('erg_anamnese_sound') !== '0'; } catch (_) { return true; }
}

function _v6InjectSoundToggle() {
  if (document.getElementById('v6-sound-btn')) return;
  const right = document.querySelector('.anamnese-toolbar-right');
  if (!right) return;
  const mk = (on) => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>${on ? '<path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>' : '<line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'}</svg>`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'v6-sound-btn';
  const on0 = _v6AudioEnabled();
  btn.className = 'tb-btn' + (on0 ? '' : ' v6-sound-off');
  btn.setAttribute('aria-pressed', on0 ? 'true' : 'false');
  btn.title = on0 ? 'Desativar sons' : 'Ativar sons';
  btn.setAttribute('aria-label', btn.title);
  btn.innerHTML = mk(on0);
  btn.addEventListener('click', () => {
    const wasOn = _v6AudioEnabled();
    try { localStorage.setItem('erg_anamnese_sound', wasOn ? '0' : '1'); } catch (_) {}
    const nowOn = !wasOn;
    btn.classList.toggle('v6-sound-off', !nowOn);
    btn.setAttribute('aria-pressed', nowOn ? 'true' : 'false');
    btn.title = nowOn ? 'Desativar sons' : 'Ativar sons';
    btn.setAttribute('aria-label', btn.title);
    btn.innerHTML = mk(nowOn);
    if (nowOn) _v6SoundSuccess();
  });
  right.appendChild(btn);
}

// V6-5 — Mensagens encorajadoras ao avançar de step
const _v6MSGS = [
  'Ótimo progresso! Continue assim.',
  'Cada detalhe importa para o cuidado da paciente.',
  'Você está indo muito bem!',
  'Quase lá! O próximo passo revela ainda mais.',
  'Informação completa = cuidado mais preciso.',
  'Excelente atenção aos detalhes!',
];
function _v6ShowEncouragement(stepIdx) {
  if (stepIdx === 0) return;
  const msg = _v6MSGS[stepIdx % _v6MSGS.length];
  const toast = document.createElement('div');
  toast.className = 'v6-encourage-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('v6-encourage-show'));
  setTimeout(() => {
    toast.classList.remove('v6-encourage-show');
    setTimeout(() => toast.remove(), 350);
  }, 2600);
}

// V6-6 — Badge velocidade: "Especialista" se preencher ≥80% em menos de 5min
const _v6StartTime = Date.now();
function _v6CheckSpeedBadge() {
  const elapsed = Date.now() - _v6StartTime;
  if (elapsed > 5 * 60 * 1000) return;
  if (_v6ComputeCompleteness() < 80) return;
  const KEY = 'erg_anamnese_speed_badges';
  const today = new Date().toISOString().slice(0, 10);
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (data[today]) return;
    data[today] = { elapsed, at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (_) {}
  const min = Math.floor(elapsed / 60000);
  const sec = Math.floor((elapsed % 60000) / 1000);
  const time = min > 0 ? `${min}m${sec}s` : `${sec}s`;
  const el = document.createElement('div');
  el.className = 'v6-speed-badge';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'assertive');
  el.innerHTML = `<span class="v6-speed-icon" aria-hidden="true">⚡</span><div><strong>Especialista!</strong><br>Concluído em ${time}</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('v6-speed-show'));
  setTimeout(() => { el.classList.remove('v6-speed-show'); setTimeout(() => el.remove(), 400); }, 4000);
}

// V6-7 — Confetti ao salvar (DOM particles, zero dependências)
function _v6Confetti() {
  const colors = ['#4CB8A0', '#2D6A56', '#C9A84C', '#7EC8B8', '#E8D5A0', '#A8D8CF'];
  const N = 40;
  const container = document.createElement('div');
  container.className = 'v6-confetti-container';
  container.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < N; i++) {
    const p = document.createElement('span');
    p.className = 'v6-confetti-piece';
    const left  = 28 + Math.random() * 44;
    const size  = 5 + Math.random() * 5;
    const delay = (Math.random() * 400).toFixed(0);
    const dur   = (800 + Math.random() * 500).toFixed(0);
    const rot   = (Math.random() * 720 - 360).toFixed(0);
    p.style.cssText =
      `left:${left}%;width:${size}px;height:${size}px;background:${colors[i % colors.length]};` +
      `animation-delay:${delay}ms;animation-duration:${dur}ms;--v6rot:${rot}deg`;
    container.appendChild(p);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 2200);
}

// V6-8 — Qualidade clínica: nível baseado em volume de texto nas textareas
function _v6ComputeTextQuality() {
  let chars = 0;
  document.querySelectorAll('#anamnese-form textarea').forEach(ta => {
    chars += (ta.value || '').trim().length;
  });
  if (chars >= 800) return { level: 'Diamante', cls: 'v6-q-diamond', icon: '💎' };
  if (chars >= 400) return { level: 'Ouro',     cls: 'v6-q-gold',    icon: '🥇' };
  if (chars >= 150) return { level: 'Prata',    cls: 'v6-q-silver',  icon: '🥈' };
  if (chars >= 50)  return { level: 'Bronze',   cls: 'v6-q-bronze',  icon: '🥉' };
  return null;
}

function _v6UpdateQualityBadge() {
  let badge = document.getElementById('v6-quality-badge');
  const q = _v6ComputeTextQuality();
  if (!q) { if (badge) badge.style.display = 'none'; return; }
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'v6-quality-badge';
    badge.className = 'v6-quality-badge';
    badge.setAttribute('aria-live', 'polite');
    badge.title = 'Nível de detalhe clínico — baseado no volume de notas preenchidas';
    document.querySelector('.anamnese-toolbar-left')?.appendChild(badge);
  }
  badge.className = 'v6-quality-badge ' + q.cls;
  badge.innerHTML = `<span aria-hidden="true">${q.icon}</span> ${q.level}`;
  badge.style.display = '';
}

// V6-9 — Toast troféu especial ao concluir a anamnese
function _v6TrophyToast() {
  const el = document.createElement('div');
  el.className = 'v6-trophy-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'assertive');
  el.innerHTML =
    `<span class="v6-trophy-icon" aria-hidden="true">🏆</span>` +
    `<div><strong>Anamnese concluída!</strong><small>Parabéns pela dedicação ao cuidado da paciente.</small></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('v6-trophy-show'));
  setTimeout(() => { el.classList.remove('v6-trophy-show'); setTimeout(() => el.remove(), 500); }, 4500);
}

// V6-10 — Ring de conclusão: animação no botão Salvar ao atingir 100%
function _v6OnFullCompletion() {
  const btn = document.getElementById('btn-save') || document.getElementById('btn-next');
  if (!btn) return;
  btn.classList.add('v6-completion-ring');
  setTimeout(() => btn.classList.remove('v6-completion-ring'), 1200);
}

// V6 — Patch nos callbacks existentes
function _v6PatchCallbacks() {
  const api = window._anamneseExtras;
  if (!api) return;
  if (api.onStepChange && !api.onStepChange._v6p) {
    const orig = api.onStepChange;
    api.onStepChange = function _v6StepCb(idx, total, stepId) {
      if (_v6AudioEnabled()) _v6SoundStep();
      _v6ShowEncouragement(idx);
      _v6UpdateCompletenessUI(_v6ComputeCompleteness());
      _v6UpdateQualityBadge();
      return orig.apply(this, arguments);
    };
    api.onStepChange._v6p = true;
  }
  const saveBtn = document.getElementById('btn-save');
  if (saveBtn && !saveBtn._v6p) {
    saveBtn._v6p = true;
    saveBtn.addEventListener('click', () => {
      const pct = _v6ComputeCompleteness();
      if (pct >= 80) {
        _v6Confetti();
        setTimeout(_v6TrophyToast, 220);
        if (_v6AudioEnabled()) _v6SoundSuccess();
        _v6CheckSpeedBadge();
      }
    }, { capture: true });
  }
}

// V6 — Listeners de formulário para qualidade e erros sonoros
function _v6AttachFormListeners() {
  const form = document.getElementById('anamnese-form');
  if (!form) return;
  let qualTimer;
  form.addEventListener('input', () => { clearTimeout(qualTimer); qualTimer = setTimeout(_v6UpdateQualityBadge, 800); });
  form.addEventListener('change', _v6UpdateQualityBadge);
  new MutationObserver(mutations => {
    mutations.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1 && n.classList?.contains('inline-error') && _v6AudioEnabled()) _v6SoundError();
    }));
  }).observe(form, { childList: true, subtree: true });
}

// ── Init V6 ──
function _initV6() {
  _v6InjectCompletenessBadge();
  _v6InjectStreakBadge();
  _v6InjectSoundToggle();
  _v6AttachFormListeners();
  _v6UpdateQualityBadge();
  setTimeout(_v6PatchCallbacks, 400);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initV6);
} else {
  _initV6();
}
