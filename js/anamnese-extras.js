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
// step-0, 1, 2, 3, 4, 5, step-rastreamento, 6, 7, 8 → 10 etapas total
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
      <span class="stepper-num">${state === 'done' ? '✓' : m.num}</span>
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
  showToast(`✓ ${copiados} campos copiados da última anamnese`, 'ok');
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
    alerts.push({ tipo: 'warn', msg: 'Diabetes/pré-diabetes detectada → considere protocolo de baixo IG, distribuição equilibrada de carbos.' });
  }
  if (pats.includes('hipertensao')) {
    alerts.push({ tipo: 'warn', msg: 'Hipertensão → recomende sódio < 2g/dia (5g de sal). DASH adaptado.' });
  }
  if (pats.includes('dislipidemia') || pats.includes('colesterol_alto')) {
    alerts.push({ tipo: 'warn', msg: 'Dislipidemia → priorize gorduras insaturadas, fibra solúvel, ômega-3.' });
  }
  if (pats.includes('hipotireoidismo') && fuma) {
    alerts.push({ tipo: 'crit', msg: '⚠ Hipotireoidismo + tabagismo: alto risco metabólico — orientar parar fumar é prioritário.' });
  }
  if (sonoH > 0 && sonoH < 5.5) {
    alerts.push({ tipo: 'warn', msg: `Sono curto (${sonoH}h) eleva grelina, reduz leptina. Risco aumentado de ganho de peso.` });
  }
  if (sonoQ === 'ruim' || sonoQ === 'pessimo') {
    alerts.push({ tipo: 'info', msg: 'Sono ruim → aumenta cortisol e fome. Considere higiene do sono.' });
  }
  if (af === 'sedentario' && pats.length > 0) {
    alerts.push({ tipo: 'warn', msg: 'Sedentarismo + comorbidades → atividade física estruturada é parte essencial do tratamento.' });
  }
  if (aguaL > 0 && aguaL < 1.5) {
    alerts.push({ tipo: 'info', msg: `Hidratação insuficiente (${aguaL}L) → meta inicial 30 ml/kg de peso.` });
  }
  if (ingAlc && pats.includes('esteatose_hepatica')) {
    alerts.push({ tipo: 'crit', msg: '⚠ Esteatose hepática + álcool → suspender ou reduzir drasticamente.' });
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
    <p class="risk-alerts-title">⚡ Detecção em tempo real (${alerts.length})</p>
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
  if (score < 20) return { lvl: 'baixo',    cor: '#3D6B4F', label: '🟢 Risco baixo' };
  if (score < 45) return { lvl: 'moderado', cor: '#B8860B', label: '🟡 Risco moderado' };
  return                 { lvl: 'alto',     cor: '#7A2E2E', label: '🔴 Risco alto' };
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
    <p class="diff-title">📊 O que mudou desde a última consulta</p>
    <div class="diff-list">
      ${diffs.map(d => `
        <div class="diff-row">
          <span class="diff-label">${escapeHTML(d.label)}</span>
          <span class="diff-old">${escapeHTML(d.old || '—')}</span>
          <span class="diff-arrow">→</span>
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
    <p class="ckq-title">💡 Sugestões de pergunta personalizada para o check-in diário</p>
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
  showToast(on ? '👁 Modo apresentação ativado' : 'Modo apresentação desativado');
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
  showToast(on ? '⚡ Modo turbo ativado — Enter avança' : 'Modo turbo desativado');
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
    titleEl.insertAdjacentHTML('afterbegin', '<span class="extractor-pulse">💡</span> ');
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
  // Se chegou ao último step → mostra revisão
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
