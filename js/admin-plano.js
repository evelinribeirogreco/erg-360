// ============================================================
// admin-plano.js — Formulário do Plano Alimentar (Admin)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { installFormGuard } from './form-guard.js';
import { exportPlanoPDF } from './plano-pdf-export.js';
import { safeInsert, safeUpdate, installOnlineHook, mountPendingBanner } from './safe-save.js';
import {
  getPreferenciaInfo, getEstiloInfo,
  resumoPreferencia, resumoPerfilPaciente,
  listaAvisos, RESTRICOES,
} from './preferencias-alimentares.js';
import {
  CARDAPIO_TEMPLATES, matchTemplates, listarTemplates, gramasMacrosDoTemplate,
} from './cardapio-templates.js';
import { REFEICOES_PRONTAS, TIPOS_REFEICAO_LABEL } from './refeicoes-prontas.js';

let formGuard = null;

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';
const ADMIN_EMAIL   = 'evelinbeatrizrb@outlook.com';

function isAdminUser(user) {
  return user?.user_metadata?.role === 'admin' || user?.email === ADMIN_EMAIL;
}

const supabase    = createClient(SUPABASE_URL, SUPABASE_ANON);
const TOTAL_STEPS = 12;
let currentStep   = 0;
let patientId     = null;
let patientUserId = null;

// ── Inicialização ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkAdmin();
  loadFromUrl();
  initForm();
  initSidebar();
  initPdfUpload();
  setDefaultDate();
  updateProgress();
  updateNavBtns();
  window._supabase = supabase;
  installOnlineHook(supabase);
  mountPendingBanner();
  // Sidebar de macros (pie chart + meta vs atual) — montagem após plano-refeicoes-pro carregar
  setTimeout(() => {
    if (window._refeicoesPro) {
      window._refeicoesPro.montarSidebarMacros();
    }
  }, 400);
});

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !isAdminUser(session.user)) window.location.href = 'index.html';
}

function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  // Aceita tanto 'patient'/'user' quanto 'patient_id'/'user_id'
  patientId     = params.get('patient_id') || params.get('patient');
  patientUserId = params.get('user_id')    || params.get('user');
  const nome    = decodeURIComponent(params.get('nome') || '');
  // Modo edição: ?edit=<plano_id> carrega plano específico p/ UPDATE
  const editId  = params.get('edit');
  // Modo visualização: ?view=<plano_id> readonly
  const viewId  = params.get('view');

  document.getElementById('f-patient-id').value        = patientId || '';
  document.getElementById('f-user-id').value           = patientUserId || '';
  document.getElementById('sb-paciente-nome').textContent = nome.split(' ')[0] || '—';

  // Sempre cria NOVO plano por padrão.
  if (editId)        loadPlanoById(editId, false);
  if (viewId)        loadPlanoById(viewId, true);
  if (patientId)     loadPatientPreferencia(patientId);
}

// Carrega plano específico
//   readonly=false -> modo edição (UPDATE no save)
//   readonly=true  -> modo visualização (sem botão salvar)
async function loadPlanoById(planoId, readonly = false) {
  console.info('[plano] carregando plano', planoId, 'readonly=', readonly);
  const { data, error } = await supabase
    .from('planos_alimentares')
    .select('*')
    .eq('id', planoId)
    .single();
  if (error) {
    console.error('[plano] erro carregando plano:', error);
    alert('Erro ao carregar plano: ' + error.message);
    return;
  }
  if (!data) {
    console.warn('[plano] nenhum plano encontrado com id', planoId);
    alert('Plano não encontrado (ID: ' + planoId + ').');
    return;
  }
  console.info('[plano] dados carregados — preenchendo form...', data.descricao || '(sem descricao)');

  // Espera plano-refeicoes-pro estar disponível (caso ainda não tenha carregado o módulo)
  if (Array.isArray(data.refeicoes) && data.refeicoes.length > 0 &&
      data.refeicoes.some(r => Array.isArray(r.alimentos) && r.alimentos.length > 0) &&
      !window._refeicoesPro) {
    console.info('[plano] aguardando _refeicoesPro carregar...');
    let tentativas = 0;
    while (!window._refeicoesPro && tentativas < 30) {
      await new Promise(r => setTimeout(r, 100));
      tentativas++;
    }
  }

  try {
    fillForm(data);
  } catch (e) {
    console.error('[plano] erro em fillForm:', e);
    alert('Erro ao preencher formulário: ' + e.message);
    return;
  }
  // No modo view, limpa o plano-id pra não virar UPDATE caso clique em algo
  if (readonly) {
    const planoIdEl = document.getElementById('f-plano-id');
    if (planoIdEl) planoIdEl.value = '';
    _aplicarModoVisualizacaoPlano();
  }
  const titleEl = document.querySelector('.page-title, h1');
  if (titleEl) titleEl.textContent += readonly ? ' (visualização)' : ' (editando)';

  // Re-renderiza sidebar de macros após preencher
  setTimeout(() => window._planoSidebar?.atualizar(), 200);
}

function _aplicarModoVisualizacaoPlano() {
  const aplicar = () => {
    document.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.type === 'hidden') return;
      el.readOnly = true;
      if (el.tagName === 'SELECT' || el.type === 'date' || el.type === 'checkbox') el.disabled = true;
      el.style.background = 'var(--bg-secondary, #f7f3ed)';
      el.style.cursor = 'not-allowed';
    });
    document.querySelectorAll('button[type="submit"]').forEach(btn => btn.style.display = 'none');
    // Trava botões customizados
    document.querySelectorAll('.toggle-btn, .nav-btn-add, .nav-btn-remove').forEach(b => {
      b.style.pointerEvents = 'none';
      b.style.opacity = '0.6';
    });
  };
  aplicar();
  new MutationObserver(aplicar).observe(document.body, { childList: true, subtree: true });
  const banner = document.createElement('div');
  banner.style.cssText =
    'position:sticky;top:0;z-index:99;padding:12px 18px;background:#2D6A56;color:#fff;' +
    'font-family:"DM Sans",sans-serif;font-size:0.78rem;display:flex;align-items:center;' +
    'justify-content:space-between;gap:12px;box-shadow:0 2px 6px rgba(0,0,0,0.1);';
  const editUrl = window.location.href.replace('view=', 'edit=');
  banner.innerHTML = `
    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Modo visualização — campos travados</span>
    <a href="${editUrl}" style="background:#fff;color:#2D6A56;padding:6px 14px;
      text-decoration:none;font-weight:600;border-radius:3px;font-size:0.72rem;">
      Editar este registro
    </a>`;
  document.body.insertBefore(banner, document.body.firstChild);
}

// ── Badge do perfil nutricional (7 camadas) ───────────────
let pacientePerfil = null;  // cache do perfil pra usar no matching de templates

async function loadPatientPreferencia(pid) {
  const { data, error } = await supabase
    .from('patients')
    .select('nome, preferencia_alimentar, restricoes_alimentares, estilo_alimentar, condicoes_clinicas, objetivo, estrategia_nutricional, consistencia, fase_da_vida')
    .eq('id', pid)
    .single();
  if (error || !data) return;
  pacientePerfil = data;
  renderPreferenciaBadge(data);
}

function renderPreferenciaBadge(paciente) {
  const estilo  = paciente?.estilo_alimentar || paciente?.preferencia_alimentar || 'onivoro';
  const restr   = Array.isArray(paciente?.restricoes_alimentares) ? paciente.restricoes_alimentares : [];
  const cond    = Array.isArray(paciente?.condicoes_clinicas) ? paciente.condicoes_clinicas : [];
  const temPerfil = (estilo !== 'onivoro' && estilo !== 'onivora')
                 || restr.length
                 || cond.length
                 || paciente?.objetivo
                 || paciente?.estrategia_nutricional
                 || (paciente?.consistencia && paciente.consistencia !== 'normal')
                 || (paciente?.fase_da_vida && paciente.fase_da_vida !== 'adulto');
  if (!temPerfil) return;

  const info  = getEstiloInfo(estilo);
  const texto = resumoPerfilPaciente(paciente);
  const avisos = listaAvisos(paciente);

  const host = document.getElementById('preferencia-badge-host') || criarHostBadge();
  if (!host) return;
  host.innerHTML = `
    <div style="background:${info.cor}15;border-left:3px solid ${info.cor};padding:14px 18px;margin-bottom:20px;display:flex;gap:14px;align-items:flex-start;">
      <span style="font-size:1.6rem;line-height:1;">${info.icon}</span>
      <div style="flex:1;min-width:0;">
        <p style="font-family:'DM Sans',sans-serif;font-weight:600;font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;color:${info.cor};margin:0 0 2px 0;">
          Perfil nutricional da paciente
        </p>
        <p style="font-family:'Cormorant Garamond',serif;font-weight:500;font-size:1.1rem;color:var(--text-dark);margin:0 0 10px 0;line-height:1.3;">
          ${texto}
        </p>
        <details style="cursor:pointer;">
          <summary style="font-family:'DM Sans',sans-serif;font-size:0.72rem;color:${info.cor};font-weight:500;letter-spacing:0.04em;outline:none;">
            Ver orientações (${avisos.length})
          </summary>
          <ul style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text-light);margin:8px 0 0 0;padding-left:18px;line-height:1.6;">
            ${avisos.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </details>
      </div>
    </div>
  `;
}

function criarHostBadge() {
  const primeiro = document.querySelector('.plano-block.active, .plano-block, .form-content, form#plano-form, main');
  if (!primeiro) return null;
  const div = document.createElement('div');
  div.id = 'preferencia-badge-host';
  primeiro.parentNode.insertBefore(div, primeiro);
  return div;
}

async function loadExistingPlano(pid) {
  const { data } = await supabase
    .from('planos_alimentares')
    .select('*')
    .eq('patient_id', pid)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (data) fillForm(data);
}

function setDefaultDate() {
  const el = document.getElementById('f-data');
  if (el && !el.value) el.value = new Date().toISOString().split('T')[0];
}

// ── Navegação ─────────────────────────────────────────────
// Compatibilidade com nova estrutura de blocos
function goToStep(n) { if (typeof goBlock === 'function') goBlock(n); }
function _orig_goToStep(n) {
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  document.getElementById(`snav-${currentStep}`).classList.remove('active');
  currentStep = n;
  document.getElementById(`step-${currentStep}`).classList.add('active');
  document.getElementById(`snav-${currentStep}`).classList.add('active');
  updateNavBtns();
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() { if (currentStep < TOTAL_STEPS - 1) goToStep(currentStep + 1); }
function prevStep() { if (currentStep > 0) goToStep(currentStep - 1); }

function updateNavBtns() {
  document.getElementById('btn-prev').style.display = currentStep === 0 ? 'none' : '';
  document.getElementById('btn-next').style.display = currentStep === TOTAL_STEPS - 1 ? 'none' : '';
  document.getElementById('btn-save').style.display = currentStep === TOTAL_STEPS - 1 ? '' : 'none';
}

function updateProgress() {
  document.getElementById('progress-fill').style.width = (currentStep / (TOTAL_STEPS - 1)) * 100 + '%';
}

window.goToStep = goToStep;
window.nextStep = nextStep;

// ── Exporta PDF do plano atual ────────────────────────────
// Lê o nome da paciente da URL (param ?nome=) e monta o payload
// a partir do estado atual do formulário, sem precisar salvar.
function exportarPlanoPdf() {
  const params = new URLSearchParams(window.location.search);
  const nome   = decodeURIComponent(params.get('nome') || 'Paciente');
  try {
    const plano = buildPayload();
    exportPlanoPDF(plano, nome);
  } catch (err) {
    console.error('[ERG] erro ao exportar PDF:', err);
    alert('Erro ao gerar PDF: ' + err.message);
  }
}
window.exportarPlanoPdf = exportarPlanoPdf;
window.prevStep = prevStep;

// ══════════════════════════════════════════════════════════
// CALCULADORA GEB/GET AUTOMÁTICA
// ──────────────────────────────────────────────────────────
// Lê TMB e peso do localStorage (setados por antropometria.js),
// aplica fator de atividade e ajuste de objetivo, e sugere
// kcal_alvo + distribuição de macros.
// ══════════════════════════════════════════════════════════

function toggleGebCalc() {
  const body = document.getElementById('gebCalcBody');
  const btn  = document.getElementById('gebCalcToggle');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  btn.textContent   = open ? 'Abrir' : 'Fechar';
  if (!open) prefillGebCalc();
}

function prefillGebCalc() {
  const tmbEl  = document.getElementById('calc-tmb');
  const pesoEl = document.getElementById('calc-peso');
  const hint   = document.getElementById('calc-tmb-hint');
  const tmbLs  = parseInt(localStorage.getItem('pac_tmb')  || '0') || 0;
  const pesoLs = parseFloat(localStorage.getItem('pac_peso') || '0') || 0;

  if (tmbEl && !tmbEl.value && tmbLs) tmbEl.value = tmbLs;
  if (pesoEl && !pesoEl.value && pesoLs) pesoEl.value = pesoLs;

  if (hint) {
    hint.textContent = tmbLs
      ? `Preenchido a partir da última antropometria (${tmbLs} kcal).`
      : 'Preencha antropometria para usar TMB automaticamente.';
  }
  recalcGeb();
}

function recalcGeb() {
  const tmb    = parseFloat(document.getElementById('calc-tmb')?.value) || 0;
  const af     = parseFloat(document.getElementById('calc-af')?.value) || 1.55;
  const obj    = parseFloat(document.getElementById('calc-obj')?.value) || 0;
  const peso   = parseFloat(document.getElementById('calc-peso')?.value) || 0;
  const ptnKg  = parseFloat(document.getElementById('calc-ptn-kg')?.value) || 1.8;
  const lipPct = parseFloat(document.getElementById('calc-lip-pct')?.value) || 25;

  const resBox = document.getElementById('gebCalcResult');
  if (!resBox) return;

  if (!tmb || !peso) {
    resBox.innerHTML = `<p style="margin:0;color:var(--subtitle);">Preencha TMB e peso para calcular GET e macros.</p>`;
    return;
  }

  const get    = Math.round(tmb * af);
  const vet    = Math.round(get + obj);
  const ptn    = Math.round(peso * ptnKg);
  const lipKc  = vet * (lipPct / 100);
  const lip    = Math.round(lipKc / 9);
  const restoK = vet - (ptn * 4) - (lip * 9);
  const cho    = Math.max(0, Math.round(restoK / 4));

  const pctP = ((ptn * 4) / vet * 100).toFixed(0);
  const pctC = ((cho * 4) / vet * 100).toFixed(0);
  const pctL = ((lip * 9) / vet * 100).toFixed(0);

  resBox.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;">
      <div><b style="color:var(--subtitle);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;">TMB</b><br>${tmb} kcal</div>
      <div><b style="color:var(--subtitle);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;">GET</b><br>${get} kcal</div>
      <div><b style="color:var(--accent,#b8860b);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;">VET sugerido</b><br><b>${vet} kcal</b></div>
      <div><b style="color:var(--subtitle);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;">Proteína</b><br>${ptn} g (${pctP}%)</div>
      <div><b style="color:var(--subtitle);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;">Carboidrato</b><br>${cho} g (${pctC}%)</div>
      <div><b style="color:var(--subtitle);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;">Lipídio</b><br>${lip} g (${pctL}%)</div>
    </div>
  `;
  // Guarda no dataset para aplicar depois
  resBox.dataset.vet = vet;
  resBox.dataset.ptn = ptn;
  resBox.dataset.cho = cho;
  resBox.dataset.lip = lip;
  resBox.dataset.tmb = tmb;
  resBox.dataset.af  = af;
  resBox.dataset.obj = obj;
}

function aplicarGebCalc() {
  const box = document.getElementById('gebCalcResult');
  if (!box || !box.dataset.vet) {
    alert('Preencha TMB e peso antes de aplicar.');
    return;
  }
  const setF = (id, v) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  setF('f-kcal', box.dataset.vet);
  setF('f-ptn',  box.dataset.ptn);
  setF('f-cho',  box.dataset.cho);
  setF('f-lip',  box.dataset.lip);

  // Preenche também o "Cálculo energético" textual
  const vetTxt = document.getElementById('f-calculo-vet');
  if (vetTxt && !vetTxt.value.trim()) {
    const tmb = box.dataset.tmb, af = box.dataset.af, obj = parseFloat(box.dataset.obj || 0);
    const get = Math.round(parseFloat(tmb) * parseFloat(af));
    const ajuste = obj === 0 ? '' : ` · ${obj > 0 ? '+' : ''}${obj} kcal`;
    vetTxt.value = `TMB ${tmb} kcal · AF ${af} · GET ${get} kcal${ajuste} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> VET ${box.dataset.vet} kcal/dia`;
    vetTxt.dispatchEvent(new Event('input', { bubbles: true }));
  }

  if (typeof updatePreview === 'function') updatePreview();

  // Feedback visual
  const toast = document.createElement('div');
  toast.textContent = `Aplicado: ${box.dataset.vet} kcal · ${box.dataset.ptn}P / ${box.dataset.cho}C / ${box.dataset.lip}L`;
  toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#3d6b4f;color:#fff;padding:10px 18px;border-radius:4px;font-family:DM Sans,sans-serif;font-size:0.82rem;z-index:9999;box-shadow:0 4px 18px rgba(0,0,0,0.15);';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function resetarGebCalc() {
  ['calc-tmb','calc-peso'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const af = document.getElementById('calc-af');     if (af) af.value = '1.55';
  const ob = document.getElementById('calc-obj');    if (ob) ob.value = '0';
  const pk = document.getElementById('calc-ptn-kg'); if (pk) pk.value = '1.8';
  const lp = document.getElementById('calc-lip-pct');if (lp) lp.value = '25';
  recalcGeb();
}

window.toggleGebCalc   = toggleGebCalc;
window.recalcGeb       = recalcGeb;
window.aplicarGebCalc  = aplicarGebCalc;
window.resetarGebCalc  = resetarGebCalc;

// ══════════════════════════════════════════════════════════
// TEMPLATES DE CARDÁPIO — sugestões + aplicação
// ══════════════════════════════════════════════════════════

let modalTplTabAtiva = 'sugeridos';

function abrirModalTemplates() {
  const modal = document.getElementById('modalTemplates');
  if (!modal) return;
  modal.style.display = 'flex';
  modalTplTabAtiva = 'sugeridos';
  renderModalTemplates();
}

function fecharModalTemplates() {
  const m = document.getElementById('modalTemplates');
  if (m) m.style.display = 'none';
}

function modalTplTab(qual) {
  modalTplTabAtiva = qual;
  const sug  = document.getElementById('tabSugeridos');
  const tod  = document.getElementById('tabTodos');
  if (sug && tod) {
    sug.classList.toggle('tpl-tab-active', qual === 'sugeridos');
    tod.classList.toggle('tpl-tab-active', qual === 'todos');
  }
  renderModalTemplates();
}

function renderModalTemplates() {
  const list = document.getElementById('modalTemplatesList');
  const hint = document.getElementById('modalTemplatesPerfil');
  if (!list) return;

  const perfilTexto = pacientePerfil ? resumoPerfilPaciente(pacientePerfil) : 'Sem perfil cadastrado';
  if (hint) hint.textContent = `Perfil atual: ${perfilTexto}`;

  let itens = [];
  if (modalTplTabAtiva === 'sugeridos') {
    if (!pacientePerfil) {
      list.innerHTML = `
        <p style="padding:24px;text-align:center;color:var(--text-light);font-family:'DM Sans',sans-serif;font-size:0.84rem;">
          Perfil da paciente não cadastrado.<br>
          Preencha o <b>Perfil nutricional</b> no cadastro ou veja todos os templates.
        </p>`;
      return;
    }
    itens = matchTemplates(pacientePerfil);
    if (!itens.length) {
      list.innerHTML = `
        <p style="padding:24px;text-align:center;color:var(--text-light);font-family:'DM Sans',sans-serif;font-size:0.84rem;">
          Nenhum template pré-pronto combina com o perfil atual.<br>
          Clique em <b>Ver todos</b> para escolher manualmente.
        </p>`;
      return;
    }
  } else {
    itens = listarTemplates();
  }

  list.innerHTML = itens.map(item => {
    const t = item.template;
    const macros = gramasMacrosDoTemplate(t);
    const scoreHtml = item.score != null
      ? `<span class="tpl-score">Match ${item.score}</span>`
      : '';
    const motivosHtml = item.motivos?.length
      ? `<div class="tpl-motivos">${item.motivos.map(m => `<span class="tpl-motivo-badge">${m}</span>`).join('')}</div>`
      : '';
    return `
      <div class="tpl-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:4px;">
          <h3 class="tpl-card-title">${t.nome}</h3>
          ${scoreHtml}
        </div>
        <p class="tpl-card-desc">${t.descricao}</p>
        ${motivosHtml}
        <div class="tpl-meta">
          <span><b>Kcal:</b> ${t.plano.kcal}</span>
          <span><b>PTN:</b> ${macros.ptn_g} g (${t.plano.ptn_pct}%)</span>
          <span><b>CHO:</b> ${macros.cho_g} g (${t.plano.cho_pct}%)</span>
          <span><b>LIP:</b> ${macros.lip_g} g (${t.plano.lip_pct}%)</span>
          <span><b>Refeições:</b> ${t.plano.num_refeicoes}</span>
          <span><b>Fibras:</b> ${t.plano.fibras_g} g</span>
        </div>
        <button type="button" class="btn-primary"
                style="padding:9px 16px;font-size:0.72rem;width:auto;"
                onclick="aplicarTemplateCardapio('${t.id}')">
          Aplicar este template
        </button>
      </div>
    `;
  }).join('');
}

function aplicarTemplateCardapio(id) {
  const t = CARDAPIO_TEMPLATES.find(x => x.id === id);
  if (!t) return;
  const macros = gramasMacrosDoTemplate(t);
  const p = t.plano;

  const setF = (id, v) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  setF('f-kcal',      p.kcal);
  setF('f-ptn',       macros.ptn_g);
  setF('f-cho',       macros.cho_g);
  setF('f-lip',       macros.lip_g);
  setF('f-fibras',    p.fibras_g);
  setF('f-refeicoes', p.num_refeicoes);

  // Preenche critério central e cálculo VET — mas só se estiverem vazios
  const crit = document.getElementById('f-criterio');
  if (crit && !crit.value.trim() && p.criterio_central) {
    crit.value = p.criterio_central;
    crit.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const vet = document.getElementById('f-calculo-vet');
  if (vet && !vet.value.trim() && p.calculo_vet) {
    vet.value = p.calculo_vet;
    vet.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Orientações gerais no bloco final, se existir o campo
  const ori = document.getElementById('f-orientacoes');
  if (ori && !ori.value.trim() && p.orientacoes) {
    ori.value = p.orientacoes;
    ori.dispatchEvent(new Event('input', { bubbles: true }));
  }

  if (typeof updatePreview === 'function') updatePreview();
  fecharModalTemplates();

  // Toast
  const toast = document.createElement('div');
  toast.textContent = `Template aplicado: ${t.nome}`;
  toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#3d6b4f;color:#fff;padding:12px 22px;border-radius:4px;font-family:DM Sans,sans-serif;font-size:0.82rem;z-index:9999;box-shadow:0 4px 18px rgba(0,0,0,0.15);';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

// Fecha modal clicando fora
document.addEventListener('click', (ev) => {
  const m = document.getElementById('modalTemplates');
  if (m && ev.target === m) fecharModalTemplates();
});
// Fecha com ESC
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') fecharModalTemplates();
});

window.abrirModalTemplates   = abrirModalTemplates;
window.fecharModalTemplates  = fecharModalTemplates;
window.modalTplTab           = modalTplTab;
window.aplicarTemplateCardapio = aplicarTemplateCardapio;

// ══════════════════════════════════════════════════════════
// BLOCOS DINÂMICOS — adicionar / remover itens
// ══════════════════════════════════════════════════════════

// ── Indicadores clínicos ──────────────────────────────────
function addStat(data = {}) {
  const c = document.getElementById('stats-container');
  const id = Date.now();
  const div = document.createElement('div');
  div.className = 'dynamic-block';
  div.dataset.id = id;
  div.innerHTML = `
    <div class="dynamic-block-header">
      <span class="dynamic-block-title">Indicador</span>
      <button type="button" class="remove-btn" onclick="removeBlock(this)">Remover</button>
    </div>
    <div class="stat-item-row">
      <div><label class="form-label">Label</label><input class="form-input" type="text" name="stat-label" value="${data.label||''}" placeholder="Ex: IMC"></div>
      <div><label class="form-label">Valor</label><input class="form-input" type="text" name="stat-valor" value="${data.valor||''}" placeholder="Ex: 25,8"></div>
      <div><label class="form-label">Descrição</label><input class="form-input" type="text" name="stat-desc" value="${data.desc||''}" placeholder="Ex: Sobrepeso · Meta: 70 kg"></div>
      <div></div>
    </div>
  `;
  c.appendChild(div);
}
window.addStat = addStat;

// ── Condições clínicas ────────────────────────────────────
function addCondicao(data = {}) {
  const c = document.getElementById('condicoes-container');
  const div = document.createElement('div');
  div.className = 'dynamic-block';
  div.innerHTML = `
    <div class="dynamic-block-header">
      <span class="dynamic-block-title">Condição</span>
      <button type="button" class="remove-btn" onclick="removeBlock(this)">Remover</button>
    </div>
    <div class="condicao-item-row">
      <div><label class="form-label">Condição</label><input class="form-input" type="text" name="cond-nome" value="${data.nome||''}" placeholder="Ex: Hipotireoidismo"></div>
      <div><label class="form-label">Status</label><input class="form-input" type="text" name="cond-status" value="${data.status||''}" placeholder="Ex: Em controle"></div>
      <div>
        <label class="form-label">Cor</label>
        <select class="select-sm" name="cond-cor">
          <option value="laranja" ${(data.cor||'laranja')==='laranja'?'selected':''}>Atenção</option>
          <option value="vermelho" ${data.cor==='vermelho'?'selected':''}>Ativo</option>
          <option value="azul" ${data.cor==='azul'?'selected':''}>Diagnóstico</option>
          <option value="verde" ${data.cor==='verde'?'selected':''}>Controlado</option>
        </select>
      </div>
      <div><label class="form-label">Impacto na dieta</label><input class="form-input" type="text" name="cond-impacto" value="${data.impacto||''}" placeholder="Ex: Incluir selênio diariamente"></div>
      <div></div>
    </div>
  `;
  c.appendChild(div);
}
window.addCondicao = addCondicao;

// ── Comparativo diff ──────────────────────────────────────
function addDiff(data = {}) {
  const c = document.getElementById('diff-container');
  const div = document.createElement('div');
  div.className = 'dynamic-block';
  div.innerHTML = `
    <div class="dynamic-block-header">
      <span class="dynamic-block-title">Linha da tabela</span>
      <button type="button" class="remove-btn" onclick="removeBlock(this)">Remover</button>
    </div>
    <div class="diff-item-row">
      <div><label class="form-label">Nutriente</label><input class="form-input" type="text" name="diff-nutriente" value="${data.nutriente||''}" placeholder="Ex: Proteínas"></div>
      <div><label class="form-label">Antes</label><input class="form-input" type="text" name="diff-antes" value="${data.antes||''}" placeholder="Ex: ~155g (39%)"></div>
      <div><label class="form-label">Depois</label><input class="form-input" type="text" name="diff-depois" value="${data.depois||''}" placeholder="Ex: ~155g (30%)"></div>
      <div><label class="form-label">Variação</label><input class="form-input" type="text" name="diff-delta" value="${data.delta||''}" placeholder="Ex: = mantida"></div>
      <div>
        <label class="form-label">Tipo</label>
        <select class="select-sm" name="diff-tipo">
          <option value="up" ${(data.tipo||'up')==='up'?'selected':''}>Subiu</option>
          <option value="eq" ${data.tipo==='eq'?'selected':''}>Igual</option>
          <option value="down" ${data.tipo==='down'?'selected':''}>Caiu</option>
        </select>
      </div>
      <div></div>
    </div>
  `;
  c.appendChild(div);
}
window.addDiff = addDiff;

// ── Dieta atual — refeições ───────────────────────────────
function addDietaRefeicao(data = {}) {
  const c = document.getElementById('dieta-refeicoes-container');
  const div = document.createElement('div');
  div.className = 'dynamic-block';
  div.innerHTML = `
    <div class="dynamic-block-header">
      <span class="dynamic-block-title">Refeição relatada</span>
      <button type="button" class="remove-btn" onclick="removeBlock(this)">Remover</button>
    </div>
    <div class="admin-form-grid">
      <div class="form-group"><label class="form-label">Refeição</label><input class="form-input" type="text" name="dr-nome" value="${data.nome||''}" placeholder="Ex: Almoço · 12h"></div>
      <div class="form-group"><label class="form-label">Consumo relatado</label><textarea class="form-input form-textarea" name="dr-consumo" rows="2" placeholder="Ex: 150g carne + 100g legumes">${data.consumo||''}</textarea></div>
      <div class="form-group"><label class="form-label">O que está bom</label><textarea class="form-input form-textarea" name="dr-bom" rows="2" placeholder="Ex: Proteína adequada.">${data.bom||''}</textarea></div>
      <div class="form-group"><label class="form-label">O que ajustar</label><textarea class="form-input form-textarea" name="dr-ajustar" rows="2" placeholder="Ex: Incluir salada crua antes.">${data.ajustar||''}</textarea></div>
    </div>
  `;
  c.appendChild(div);
}
window.addDietaRefeicao = addDietaRefeicao;

// ── Dieta atual — suplementos ─────────────────────────────
function addDietaSupl(data = {}) {
  const c = document.getElementById('dieta-supl-container');
  const div = document.createElement('div');
  div.className = 'dynamic-block';
  div.innerHTML = `
    <div class="dynamic-block-header">
      <span class="dynamic-block-title">Suplemento em uso</span>
      <button type="button" class="remove-btn" onclick="removeBlock(this)">Remover</button>
    </div>
    <div class="admin-form-grid">
      <div class="form-group"><label class="form-label">Nome</label><input class="form-input" type="text" name="ds-nome" value="${data.nome||''}" placeholder="Ex: Whey Protein"></div>
      <div class="form-group"><label class="form-label">Dose</label><input class="form-input" type="text" name="ds-dose" value="${data.dose||''}" placeholder="Ex: 30g/dia"></div>
      <div class="form-group"><label class="form-label">Avaliação</label><textarea class="form-input form-textarea" name="ds-avaliacao" rows="2" placeholder="Ex: Fundamental para meta proteica.">${data.avaliacao||''}</textarea></div>
      <div class="form-group">
        <label class="form-label">Conduta</label>
        <div style="display:flex;gap:10px;align-items:center;">
          <input class="form-input" type="text" name="ds-conduta" value="${data.conduta||''}" placeholder="Ex: MANTER" style="flex:1;">
          <select class="select-sm" name="ds-cor" style="width:100px;">
            <option value="verde" ${(data.cor||'verde')==='verde'?'selected':''}>Verde</option>
            <option value="laranja" ${data.cor==='laranja'?'selected':''}>Laranja</option>
            <option value="azul" ${data.cor==='azul'?'selected':''}>Azul</option>
            <option value="vermelho" ${data.cor==='vermelho'?'selected':''}>Vermelho</option>
          </select>
        </div>
      </div>
    </div>
  `;
  c.appendChild(div);
}
window.addDietaSupl = addDietaSupl;

// ── Refeições do plano ────────────────────────────────────
// ── MODAL DE REFEIÇÕES PRONTAS ────────────────────────────
function abrirModalRefeicoesPrototas() {
  const modal = document.getElementById('modal-refeicoes-prontas');
  if (!modal) return;
  modal.style.display = 'flex';
  // Reset filtros
  const busca = document.getElementById('prontas-busca');
  const tipo  = document.getElementById('prontas-filtro-tipo');
  if (busca) busca.value = '';
  if (tipo)  tipo.value  = '';
  filtrarRefeicoesProntas();
  setTimeout(() => busca?.focus(), 50);
}
window.abrirModalRefeicoesPrototas = abrirModalRefeicoesPrototas;

function fecharModalRefeicoesPrototas() {
  const modal = document.getElementById('modal-refeicoes-prontas');
  if (modal) modal.style.display = 'none';
}
window.fecharModalRefeicoesPrototas = fecharModalRefeicoesPrototas;

function filtrarRefeicoesProntas() {
  const lista = document.getElementById('prontas-lista');
  if (!lista) return;
  const q    = (document.getElementById('prontas-busca')?.value || '').toLowerCase().trim();
  const tipo = document.getElementById('prontas-filtro-tipo')?.value || '';

  const filtradas = REFEICOES_PRONTAS.filter(r => {
    if (tipo && r.tipo !== tipo) return false;
    if (!q) return true;
    // Busca em nome, descrição, alimentos
    if (r.nome.toLowerCase().includes(q)) return true;
    if (r.descricao && r.descricao.toLowerCase().includes(q)) return true;
    if (r.alimentos.some(a => a.nome.toLowerCase().includes(q))) return true;
    return false;
  });

  if (filtradas.length === 0) {
    lista.innerHTML = `<div style="padding:30px;text-align:center;color:var(--text-light,#6B6659);font-family:'DM Sans',sans-serif;font-size:0.85rem;">Nenhuma refeição encontrada para esses filtros.</div>`;
    return;
  }

  // Agrupa por tipo
  const porTipo = {};
  for (const r of filtradas) {
    if (!porTipo[r.tipo]) porTipo[r.tipo] = [];
    porTipo[r.tipo].push(r);
  }

  const ordemTipos = ['cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia'];
  const html = ordemTipos
    .filter(t => porTipo[t])
    .map(t => {
      const refs = porTipo[t];
      return `
        <div>
          <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.65rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--subtitle,#6B6659);margin:8px 0 6px;">
            ${TIPOS_REFEICAO_LABEL[t] || t} <span style="color:var(--text-light,#6B6659);font-weight:400;">(${refs.length})</span>
          </p>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${refs.map(r => _cardRefeicaoPronta(r)).join('')}
          </div>
        </div>`;
    }).join('');

  lista.innerHTML = html;

  // Bind cliques
  lista.querySelectorAll('[data-pronta-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.prontaId;
      const r  = REFEICOES_PRONTAS.find(x => x.id === id);
      if (r) _importarRefeicaoPronta(r);
    });
  });
}
window.filtrarRefeicoesProntas = filtrarRefeicoesProntas;

function _cardRefeicaoPronta(r) {
  const alimentosResumo = r.alimentos.slice(0, 3).map(a => a.nome).join(', ') +
    (r.alimentos.length > 3 ? `, +${r.alimentos.length - 3}` : '');
  const macros = r.macros
    ? `<span style="color:#2D6A56;font-weight:500;">${r.macros.kcal} kcal</span>
       <span style="color:var(--text-light,#6B6659);font-size:0.7rem;"> · P ${r.macros.ptn}g · C ${r.macros.cho}g · L ${r.macros.lip}g</span>`
    : '';
  return `
    <button type="button" data-pronta-id="${r.id}" style="text-align:left;background:var(--bg-card,#fff);border:1px solid var(--border,#E0DBD0);border-radius:6px;padding:12px 14px;cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif;width:100%;"
      onmouseover="this.style.borderColor='#4CB8A0';this.style.background='rgba(76,184,160,0.05)'"
      onmouseout="this.style.borderColor='var(--border,#E0DBD0)';this.style.background='var(--bg-card,#fff)'">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:4px;">
        <strong style="font-size:0.85rem;color:var(--text,#1A1A16);font-weight:500;">${r.nome}</strong>
        <span style="font-size:0.7rem;white-space:nowrap;">${macros}</span>
      </div>
      ${r.descricao ? `<div style="font-size:0.72rem;color:var(--text-light,#6B6659);font-style:italic;margin-bottom:4px;">${r.descricao}</div>` : ''}
      <div style="font-size:0.72rem;color:var(--text-light,#6B6659);">${alimentosResumo}</div>
    </button>`;
}

function _importarRefeicaoPronta(r) {
  // Adiciona uma nova refeição ao cardápio com os dados pré-preenchidos
  addRefeicao({
    nome:     r.nome,
    horario:  r.horario || '',
    alerta:   '',
    alerta_cor: 'amarelo',
    itens:    r.alimentos.map(a => ({ nome: a.nome, qty: a.qty || '', novo: false })),
    macros:   r.macros || {},
  });
  fecharModalRefeicoesPrototas();
  // Scroll suave até a nova refeição
  setTimeout(() => {
    const refs = document.querySelectorAll('#refeicoes-container .dynamic-block');
    const ultima = refs[refs.length - 1];
    if (ultima) ultima.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

function addRefeicao(data = {}) {
  const c = document.getElementById('refeicoes-container');
  const refId = 'ref-' + Date.now();
  const div = document.createElement('div');
  div.className = 'dynamic-block';
  div.dataset.refid = refId;
  div.innerHTML = `
    <div class="dynamic-block-header">
      <span class="dynamic-block-title">Refeição</span>
      <button type="button" class="remove-btn" onclick="removeBlock(this)">Remover refeição</button>
    </div>
    <div class="admin-form-grid" style="margin-bottom:16px;">
      <div class="form-group"><label class="form-label">Nome da refeição</label><input class="form-input" type="text" name="ref-nome" value="${data.nome||''}" placeholder="Ex: Café da manhã"></div>
      <div class="form-group"><label class="form-label">Horário</label><input class="form-input" type="text" name="ref-horario" value="${data.horario||''}" placeholder="Ex: 07h00"></div>
      <div class="form-group"><label class="form-label">Alerta (opcional)</label><input class="form-input" type="text" name="ref-alerta" value="${data.alerta||''}" placeholder="Ex: Café APÓS comer."></div>
      <div class="form-group">
        <label class="form-label">Cor do alerta</label>
        <select class="select-sm" name="ref-alerta-cor">
          <option value="amarelo" ${(data.alerta_cor||'amarelo')==='amarelo'?'selected':''}>Amarelo</option>
          <option value="azul" ${data.alerta_cor==='azul'?'selected':''}>Azul</option>
          <option value="verde" ${data.alerta_cor==='verde'?'selected':''}>Verde</option>
          <option value="laranja" ${data.alerta_cor==='laranja'?'selected':''}>Laranja</option>
        </select>
      </div>
    </div>

    <!-- Tabela pro de alimentos com cálculo automático -->
    <div class="pro-alim-mount-host" data-refid="${refId}"></div>

    <!-- Fallback: itens em texto livre (apenas se vier de plano antigo) -->
    <div class="refeicao-items-list refeicao-items-legacy" id="items-${refId}" style="display:none;">
      <div style="display:grid;grid-template-columns:1fr 140px 80px auto;gap:8px;padding-bottom:6px;border-bottom:1px solid rgba(201,168,130,0.2);">
        <span class="form-label" style="margin:0">Alimento (modo texto)</span>
        <span class="form-label" style="margin:0">Quantidade</span>
        <span class="form-label" style="margin:0">Novo</span>
        <span></span>
      </div>
    </div>

    <div class="macros-row" style="margin-top:14px;">
      <div><label class="form-label">kcal</label><input class="form-input" type="number" name="ref-kcal" value="${data.macros?.kcal||''}" placeholder="auto" readonly style="background:var(--bg-secondary);cursor:not-allowed;"></div>
      <div><label class="form-label">Proteína (g)</label><input class="form-input" type="text" name="ref-ptn" value="${data.macros?.ptn||''}" placeholder="auto" readonly style="background:var(--bg-secondary);cursor:not-allowed;"></div>
      <div><label class="form-label">CHO (g)</label><input class="form-input" type="text" name="ref-cho" value="${data.macros?.cho||''}" placeholder="auto" readonly style="background:var(--bg-secondary);cursor:not-allowed;"></div>
      <div><label class="form-label">Lip (g)</label><input class="form-input" type="text" name="ref-lip" value="${data.macros?.lip||''}" placeholder="auto" readonly style="background:var(--bg-secondary);cursor:not-allowed;"></div>
      <div><label class="form-label">Fibras (g)</label><input class="form-input" type="text" name="ref-fibras" value="${data.macros?.fibras||''}" placeholder="auto" readonly style="background:var(--bg-secondary);cursor:not-allowed;"></div>
    </div>
  `;
  c.appendChild(div);

  // SEMPRE guarda alimentos no div (mesmo sem _refeicoesPro), pra getRefeicaoData() funcionar no save
  div._proAlimentos = Array.isArray(data.alimentos) ? [...data.alimentos] : [];

  // Renderiza tabela pro com alimentos[] (objetos com macros) ou itens[] (strings legacy)
  const proHost = div.querySelector('.pro-alim-mount-host');
  const renderProUI = () => {
    if (!window._refeicoesPro || !proHost) return;
    if (Array.isArray(data.alimentos) && data.alimentos.length > 0) {
      window._refeicoesPro.renderTabelaAlimentos(div, data.alimentos);
    } else if (Array.isArray(data.itens) && data.itens.length > 0) {
      const legacy = div.querySelector('.refeicao-items-legacy');
      if (legacy) legacy.style.display = '';
      data.itens.forEach(item => addItemRefeicao(refId, item));
      window._refeicoesPro.renderTabelaAlimentos(div, []);
    } else {
      window._refeicoesPro.renderTabelaAlimentos(div, []);
    }
  };
  if (window._refeicoesPro) {
    renderProUI();
  } else {
    // Espera o módulo carregar (até 3s) e só então renderiza a tabela
    let tentativas = 0;
    const checkLoop = setInterval(() => {
      if (window._refeicoesPro || tentativas > 30) {
        clearInterval(checkLoop);
        if (window._refeicoesPro) renderProUI();
        else console.warn('[plano] _refeicoesPro não carregou em 3s — tabela pro indisponível pra refeição:', data.nome);
      }
      tentativas++;
    }, 100);
  }
}
window.addRefeicao = addRefeicao;

function addItemRefeicao(refId, data = {}) {
  const c = document.getElementById(`items-${refId}`);
  if (!c) return;
  const row = document.createElement('div');
  row.className = 'refeicao-item-row';
  row.innerHTML = `
    <input class="form-input" type="text" name="item-nome" value="${data.nome||''}" placeholder="Nome do alimento">
    <input class="form-input qty-input" type="text" name="item-qty" value="${data.qty||''}" placeholder="Ex: 30g">
    <label class="check-novo"><input type="checkbox" name="item-novo" ${data.novo?'checked':''}> Novo</label>
    <button type="button" class="item-remove" onclick="this.closest('.refeicao-item-row').remove()">×</button>
  `;
  c.appendChild(row);
}
window.addItemRefeicao = addItemRefeicao;

// ── Substituições ─────────────────────────────────────────
function addSubstGrupo(data = {}) {
  const c = document.getElementById('subst-container');
  const grpId = 'grp-' + Date.now();
  const div = document.createElement('div');
  div.className = 'dynamic-block';
  div.innerHTML = `
    <div class="dynamic-block-header">
      <input class="form-input" type="text" name="subst-cat" value="${data.categoria||''}" placeholder="Ex: Proteínas" style="max-width:240px;">
      <button type="button" class="remove-btn" onclick="removeBlock(this)">Remover grupo</button>
    </div>
    <div id="${grpId}"></div>
    <button type="button" class="add-item-btn" onclick="addSubstItem('${grpId}')">+ Adicionar linha</button>
  `;
  c.appendChild(div);
  if (data.itens) data.itens.forEach(item => addSubstItem(grpId, item));
  else addSubstItem(grpId);
}
window.addSubstGrupo = addSubstGrupo;

function addSubstItem(grpId, data = {}) {
  const c = document.getElementById(grpId);
  if (!c) return;
  const row = document.createElement('div');
  row.className = 'subst-item-row';
  row.innerHTML = `
    <input class="form-input" type="text" name="subst-base" value="${data.base||''}" placeholder="Base">
    <input class="form-input" type="text" name="subst-sub1" value="${data.sub1||''}" placeholder="Substituição 1">
    <input class="form-input" type="text" name="subst-sub2" value="${data.sub2||''}" placeholder="Substituição 2">
    <button type="button" class="item-remove" onclick="this.closest('.subst-item-row').remove()">×</button>
  `;
  c.appendChild(row);
}
window.addSubstItem = addSubstItem;

// ── Hidratação ────────────────────────────────────────────
function addHidra(data = {}) {
  const c = document.getElementById('hidra-container');
  const row = document.createElement('div');
  row.className = 'hidra-item-row';
  row.innerHTML = `
    <input class="form-input" type="text" name="hidra-hora" value="${data.hora||''}" placeholder="Ex: 07h00">
    <input class="form-input" type="text" name="hidra-desc" value="${data.desc||''}" placeholder="Descrição">
    <input class="form-input" type="text" name="hidra-qty" value="${data.qty||''}" placeholder="Ex: 300 mL">
    <button type="button" class="item-remove" onclick="this.closest('.hidra-item-row').remove()">×</button>
  `;
  c.appendChild(row);
}
window.addHidra = addHidra;

// ── Micronutrientes ───────────────────────────────────────
function addMicro(data = {}) {
  const c = document.getElementById('micro-container');
  const div = document.createElement('div');
  div.className = 'dynamic-block';
  div.innerHTML = `
    <div class="dynamic-block-header">
      <input class="form-input" type="text" name="micro-nome" value="${data.nome||''}" placeholder="Ex: Selênio" style="max-width:200px;">
      <button type="button" class="remove-btn" onclick="removeBlock(this)">Remover</button>
    </div>
    <div class="admin-form-grid">
      <div class="form-group"><label class="form-label">Motivo clínico</label><input class="form-input" type="text" name="micro-motivo" value="${data.motivo||''}" placeholder="Ex: Função tireoidiana"></div>
      <div class="form-group"><label class="form-label">Fontes alimentares</label><textarea class="form-input form-textarea" name="micro-fontes" rows="2" placeholder="Ex: Semente de abóbora, atum...">${data.fontes||''}</textarea></div>
      <div class="form-group"><label class="form-label">Meta</label><input class="form-input" type="text" name="micro-meta" value="${data.meta||''}" placeholder="Ex: 55 mcg/dia"></div>
    </div>
  `;
  c.appendChild(div);
}
window.addMicro = addMicro;

// ── Timing ────────────────────────────────────────────────
function addTiming(data = {}) {
  const c = document.getElementById('timing-container');
  const div = document.createElement('div');
  div.className = 'dynamic-block';
  div.innerHTML = `
    <div class="dynamic-block-header">
      <input class="form-input" type="text" name="timing-cond" value="${data.condicao||''}" placeholder="Ex: Refluxo / Azia" style="max-width:300px;">
      <button type="button" class="remove-btn" onclick="removeBlock(this)">Remover</button>
    </div>
    <div class="admin-form-grid">
      <div class="form-group"><label class="form-label">Detalhe (opcional)</label><input class="form-input" type="text" name="timing-detalhe" value="${data.detalhe||''}" placeholder="Ex: 2,5mg 1×/semana"></div>
      <div class="form-group"><label class="form-label">Conduta clínica</label><textarea class="form-input form-textarea" name="timing-desc" rows="3" placeholder="Descreva a conduta...">${data.descricao||''}</textarea></div>
    </div>
  `;
  c.appendChild(div);
}
window.addTiming = addTiming;

// ── Suplementação ─────────────────────────────────────────
function addSupl(data = {}) {
  const c = document.getElementById('supl-container');
  const div = document.createElement('div');
  div.className = 'dynamic-block';
  div.innerHTML = `
    <div class="dynamic-block-header">
      <span class="dynamic-block-title">Suplemento</span>
      <button type="button" class="remove-btn" onclick="removeBlock(this)">Remover</button>
    </div>
    <div class="supl-block-grid">
      <div class="form-group"><label class="form-label">Nome</label><input class="form-input" type="text" name="supl-nome" value="${data.nome||''}" placeholder="Ex: Vitamina D3"></div>
      <div class="form-group"><label class="form-label">Dose</label><input class="form-input" type="text" name="supl-dose" value="${data.dose||''}" placeholder="Ex: 50.000 UI/semana"></div>
      <div class="form-group"><label class="form-label">Horário</label><input class="form-input" type="text" name="supl-horario" value="${data.horario||''}" placeholder="Ex: Com refeição gordurosa"></div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <div style="display:flex;gap:8px;">
          <input class="form-input" type="text" name="supl-status" value="${data.status||'JÁ USA'}" placeholder="Ex: JÁ USA" style="flex:1;">
          <select class="select-sm" name="supl-tag-cor" style="width:100px;">
            <option value="verde" ${(data.tag_cor||'verde')==='verde'?'selected':''}>Verde</option>
            <option value="laranja" ${data.tag_cor==='laranja'?'selected':''}>Laranja</option>
            <option value="azul" ${data.tag_cor==='azul'?'selected':''}>Azul</option>
          </select>
        </div>
      </div>
    </div>
    <div class="form-group" style="margin-top:8px;"><label class="form-label">Justificativa</label><textarea class="form-input form-textarea" name="supl-just" rows="2" placeholder="Ex: VitD insuficiente. Manter prescrição médica.">${data.justificativa||''}</textarea></div>
  `;
  c.appendChild(div);
}
window.addSupl = addSupl;

// ── Lista de compras ──────────────────────────────────────
// ── GERA LISTA DE COMPRAS AUTOMATICAMENTE A PARTIR DO CARDÁPIO ──
const COMPRAS_CATEGORIAS = [
  { nome: 'Proteínas',             regex: /\b(frango|peito|cox(a|inha)|carn(e|es)|peixe|atum|salm[ãa]o|tilap|sardin|ovo|tofu|tempeh|seit[ãa]n|presunt|peito de peru|alc[aá]tra|patinho|m[uú]sculo|filé|fígado|camar[ãa]o|polvo|lula|bacalhau)\b/i },
  { nome: 'Cereais e tubérculos',  regex: /\b(arroz|p[ãa]o|aveia|quinoa|mandioca|batata( doce| inglesa)?|inhame|macarr[ãa]o|granola|tapioca|farinha|cuscuz|polenta|farelo|cevada|centeio|millet|trigo|panqueca)\b/i },
  { nome: 'Leguminosas',           regex: /\b(feij[ãa]o|lentilha|gr[ãa]o[ -]?de[ -]?bico|grao[ -]?de[ -]?bico|ervilha|soja|edamame|fava)\b/i },
  { nome: 'Frutas',                regex: /\b(banana|ma[çc][ãa]|mam[ãa]o|laranja|melancia|abacaxi|uva|pera|goiaba|manga|abacate|morango|kiwi|mexerica|tangerina|caju|ac[eé]rola|frutas?|berries|coco|mel[ãa]o|figo|amora|framboesa|cereja)\b/i },
  { nome: 'Vegetais e legumes',    regex: /\b(alface|brocolis|br[óo]colis|couve|espinafre|cenoura|tomate|pepino|abobrinha|berinj|cebola|pimenta|aboba|chuchu|beterraba|repolho|acelga|rabanete|nabo|aipo|alho[ -]?por[oó]|salsa|coentro|cebolinha|salsinha|cogumelo|chamipignon|aspargo|alcachofra|quiabo|jil[oó]|vagem)\b/i },
  { nome: 'Laticínios',            regex: /\b(leite|queijo|iogurt|requeij|coalhada|nata|manteiga|cottage|ricota|mussarela|parmes[ãa]o|prato|minas|cremosos)\b/i },
  { nome: 'Gorduras boas',         regex: /\b(azeite|[óo]leo|abacate|amend[ôo]a|amendoim|castanha|noz|chia|lin?ha[çc]a|gergelim|piem[ãa]o|girassol|coco|p[aá]te|pasta de amendoim|tahine|m?ct)\b/i },
  { nome: 'Bebidas',               regex: /\b([áa]gua|ch[aá]|caf[eé]|suco|leite|kefir|kombucha)\b/i },
];

function _comprasCategorizar(nome) {
  for (const cat of COMPRAS_CATEGORIAS) {
    if (cat.regex.test(nome)) return cat.nome;
  }
  return 'Outros';
}

// Normaliza nome (case + acento) pra agrupar duplicatas
function _comprasNormNome(nome) {
  return nome.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
}

// Faz parse da quantidade ("30g", "1 unid", "2 col. de sopa", etc)
function _comprasParseQty(str) {
  if (!str) return { num: null, unit: '' };
  const s = str.trim();
  const m = s.match(/^([\d.,]+)\s*(.*)$/);
  if (!m) return { num: null, unit: '', raw: s };
  const num = parseFloat(m[1].replace(',', '.'));
  if (isNaN(num)) return { num: null, unit: '', raw: s };
  const unit = (m[2] || '').trim().toLowerCase().replace(/\.+$/, '');
  return { num, unit };
}

function gerarListaComprasAuto() {
  // 1. Coleta itens de TODAS as refeições do cardápio
  const refs = [...document.querySelectorAll('#refeicoes-container .dynamic-block')];
  if (!refs.length) {
    alert('Adicione pelo menos uma refeição no cardápio antes de gerar a lista de compras.');
    return;
  }

  // 2. Pergunta o período (default: 14 dias = quinzenal — padrão do site)
  const diasStr = prompt(
    'Pra quantos dias gerar a lista de compras?\n\n' +
    '7  = semanal\n' +
    '14 = quinzenal (padrão)\n' +
    '30 = mensal',
    '14'
  );
  if (!diasStr) return; // cancelado
  const dias = parseInt(diasStr, 10);
  if (isNaN(dias) || dias < 1 || dias > 90) {
    alert('Período inválido. Use entre 1 e 90 dias.');
    return;
  }

  // 3. Acumula quantidades por nome normalizado
  const acc = {}; // { nomeNorm: { displayName, categoria, totalPorUnit: {unit: num}, semQty: bool } }
  let totalItens = 0;
  for (const block of refs) {
    const items = [...block.querySelectorAll('.refeicao-item-row')];
    for (const row of items) {
      const nome = row.querySelector('input[name="item-nome"]')?.value.trim();
      const qty  = row.querySelector('input[name="item-qty"]')?.value.trim();
      if (!nome) continue;
      const norm = _comprasNormNome(nome);
      if (!acc[norm]) {
        acc[norm] = {
          displayName: nome,
          categoria:   _comprasCategorizar(nome),
          totalPorUnit: {},
          semQty:      false,
        };
      }
      const parsed = _comprasParseQty(qty);
      if (parsed.num != null) {
        const unit = parsed.unit || 'unid';
        acc[norm].totalPorUnit[unit] = (acc[norm].totalPorUnit[unit] || 0) + parsed.num;
      } else {
        acc[norm].semQty = true; // havia item sem quantidade — registra
      }
      totalItens++;
    }
  }

  if (totalItens === 0) {
    alert('Nenhum item encontrado nas refeições. Preencha pelo menos um alimento antes de gerar.');
    return;
  }

  // 4. Multiplica por dias
  for (const norm in acc) {
    for (const unit in acc[norm].totalPorUnit) {
      acc[norm].totalPorUnit[unit] *= dias;
    }
  }

  // 5. Agrupa por categoria
  const porCategoria = {};
  // Ordem fixa pra exibir
  const ordemCategorias = ['Proteínas', 'Cereais e tubérculos', 'Leguminosas',
                           'Frutas', 'Vegetais e legumes', 'Laticínios',
                           'Gorduras boas', 'Bebidas', 'Outros'];
  for (const norm in acc) {
    const item = acc[norm];
    if (!porCategoria[item.categoria]) porCategoria[item.categoria] = [];
    // Formata quantidade como "1500g + 6 unid"
    const partes = Object.entries(item.totalPorUnit).map(([unit, num]) => {
      const numFmt = num % 1 === 0 ? String(num) : num.toFixed(1);
      // Pluraliza unidade se cabivel
      const u = unit === 'unid' && num !== 1 ? 'unid' : unit;
      return num > 0 ? `${numFmt}${u ? (u.length <= 3 ? u : ' ' + u) : ''}` : '';
    }).filter(Boolean);
    if (item.semQty && partes.length === 0) partes.push('a gosto');
    porCategoria[item.categoria].push({
      nome: item.displayName,
      qty:  partes.join(' + ') || 'a gosto',
    });
  }

  // 6. Confirma se vai sobrescrever a lista atual
  const container = document.getElementById('compras-container');
  if (container.children.length > 0) {
    if (!confirm('Isso vai SUBSTITUIR a lista de compras atual. Confirmar?')) return;
    container.innerHTML = '';
  }

  // 7. Popula a lista
  let categoriasAdicionadas = 0;
  let itensAdicionados = 0;
  for (const cat of ordemCategorias) {
    if (!porCategoria[cat] || !porCategoria[cat].length) continue;
    addComprasCat({
      categoria: cat,
      sub:       `Para ${dias} dias`,
      itens:     porCategoria[cat].sort((a, b) => a.nome.localeCompare(b.nome)),
    });
    categoriasAdicionadas++;
    itensAdicionados += porCategoria[cat].length;
  }

  // 8. Toast de sucesso
  alert(`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg> Lista de compras gerada!\n\n${itensAdicionados} itens distribuídos em ${categoriasAdicionadas} categorias para ${dias} dias.\n\nRevise os valores e ajuste se necessário.`);
}
window.gerarListaComprasAuto = gerarListaComprasAuto;

function addComprasCat(data = {}) {
  const c = document.getElementById('compras-container');
  const catId = 'cat-' + Date.now();
  const div = document.createElement('div');
  div.className = 'dynamic-block';
  div.innerHTML = `
    <div class="dynamic-block-header">
      <div style="display:flex;gap:10px;flex:1;">
        <input class="form-input" type="text" name="cat-nome" value="${data.categoria||''}" placeholder="Ex: Proteínas" style="max-width:200px;">
        <input class="form-input" type="text" name="cat-sub" value="${data.sub||''}" placeholder="Subtítulo (opcional)" style="max-width:180px;">
      </div>
      <button type="button" class="remove-btn" onclick="removeBlock(this)">Remover categoria</button>
    </div>
    <div id="${catId}"></div>
    <button type="button" class="add-item-btn" onclick="addComprasItem('${catId}')">+ Adicionar item</button>
  `;
  c.appendChild(div);
  if (data.itens) data.itens.forEach(item => addComprasItem(catId, item));
  else addComprasItem(catId);
}
window.addComprasCat = addComprasCat;

function addComprasItem(catId, data = {}) {
  const c = document.getElementById(catId);
  if (!c) return;
  const row = document.createElement('div');
  row.className = 'compras-item-row';
  row.innerHTML = `
    <input class="form-input" type="text" name="comp-nome" value="${data.nome||''}" placeholder="Ex: Frango filé de peito: 2 kg">
    <label class="check-novo"><input type="checkbox" name="comp-novo" ${data.novo?'checked':''}> Novo</label>
    <button type="button" class="item-remove" onclick="this.closest('.compras-item-row').remove()">×</button>
  `;
  c.appendChild(row);
}
window.addComprasItem = addComprasItem;

// ── Orientações ───────────────────────────────────────────
function addOrient(tipo, data = {}) {
  const c = document.getElementById(`orient-${tipo}-container`);
  if (!c) return;
  const row = document.createElement('div');
  row.className = 'orient-item-row';
  row.innerHTML = `
    <input class="form-input" type="text" name="orient-texto" value="${data.texto||''}" placeholder="Ex: Manter albumina + iogurte no café da manhã">
    <label class="check-novo"><input type="checkbox" name="orient-destaque" ${data.destaque?'checked':''}> Destaque</label>
    <button type="button" class="item-remove" onclick="this.closest('.orient-item-row').remove()">×</button>
  `;
  c.appendChild(row);
}
window.addOrient = addOrient;

// Expõe salvar rascunho para o botão no HTML
window._salvarRascunho = async function() {
  await saveForm(true);
};

// ── Remover bloco genérico ────────────────────────────────
function removeBlock(btn) {
  btn.closest('.dynamic-block').remove();
}
window.removeBlock = removeBlock;

// ══════════════════════════════════════════════════════════
// COLETA DE DADOS — monta o payload
// ══════════════════════════════════════════════════════════

function buildPayload() {
  const v = (id) => document.getElementById(id)?.value?.trim() || null;
  const vNum = (id) => { const val = v(id); return val ? parseInt(val) : null; };

  // Stats clínicos
  const stats = [...document.querySelectorAll('#stats-container .dynamic-block')].map(block => ({
    label: block.querySelector('[name=stat-label]')?.value?.trim() || '',
    valor: block.querySelector('[name=stat-valor]')?.value?.trim() || '',
    desc:  block.querySelector('[name=stat-desc]')?.value?.trim() || '',
  })).filter(s => s.label);

  // Condições clínicas
  const condicoes = [...document.querySelectorAll('#condicoes-container .dynamic-block')].map(block => ({
    nome:    block.querySelector('[name=cond-nome]')?.value?.trim() || '',
    status:  block.querySelector('[name=cond-status]')?.value?.trim() || '',
    cor:     block.querySelector('[name=cond-cor]')?.value || 'laranja',
    impacto: block.querySelector('[name=cond-impacto]')?.value?.trim() || '',
  })).filter(c => c.nome);

  // Comparativo
  const diff = [...document.querySelectorAll('#diff-container .dynamic-block')].map(block => ({
    nutriente: block.querySelector('[name=diff-nutriente]')?.value?.trim() || '',
    antes:     block.querySelector('[name=diff-antes]')?.value?.trim() || '',
    depois:    block.querySelector('[name=diff-depois]')?.value?.trim() || '',
    delta:     block.querySelector('[name=diff-delta]')?.value?.trim() || '',
    tipo:      block.querySelector('[name=diff-tipo]')?.value || 'up',
  })).filter(d => d.nutriente);

  // Dieta atual — refeições
  const dietaRef = [...document.querySelectorAll('#dieta-refeicoes-container .dynamic-block')].map(block => ({
    nome:    block.querySelector('[name=dr-nome]')?.value?.trim() || '',
    consumo: block.querySelector('[name=dr-consumo]')?.value?.trim() || '',
    bom:     block.querySelector('[name=dr-bom]')?.value?.trim() || '',
    ajustar: block.querySelector('[name=dr-ajustar]')?.value?.trim() || '',
  })).filter(r => r.nome);

  // Dieta atual — suplementos
  const dietaSupl = [...document.querySelectorAll('#dieta-supl-container .dynamic-block')].map(block => ({
    nome:      block.querySelector('[name=ds-nome]')?.value?.trim() || '',
    dose:      block.querySelector('[name=ds-dose]')?.value?.trim() || '',
    avaliacao: block.querySelector('[name=ds-avaliacao]')?.value?.trim() || '',
    conduta:   block.querySelector('[name=ds-conduta]')?.value?.trim() || '',
    cor:       block.querySelector('[name=ds-cor]')?.value || 'verde',
  })).filter(s => s.nome);

  // Refeições do plano — formato pro (alimentos[] com macros) + legacy (itens[] strings)
  const refeicoes = [...document.querySelectorAll('#refeicoes-container .dynamic-block')].map(block => {
    // Itens em texto livre (legacy, só pra refeições antigas migradas)
    const itens = [...block.querySelectorAll('.refeicao-item-row')].map(row => ({
      nome: row.querySelector('[name=item-nome]')?.value?.trim() || '',
      qty:  row.querySelector('[name=item-qty]')?.value?.trim() || '',
      novo: row.querySelector('[name=item-novo]')?.checked || false,
    })).filter(i => i.nome);

    // Alimentos do formato novo (objetos com macros calculados)
    const alimentos = (window._refeicoesPro?.getRefeicaoData?.(block) || []).filter(a => a.nome);

    return {
      nome:       block.querySelector('[name=ref-nome]')?.value?.trim() || '',
      horario:    block.querySelector('[name=ref-horario]')?.value?.trim() || '',
      alerta:     block.querySelector('[name=ref-alerta]')?.value?.trim() || '',
      alerta_cor: block.querySelector('[name=ref-alerta-cor]')?.value || 'amarelo',
      alimentos,                       // formato novo, prioridade
      itens: itens.length ? itens : undefined,  // só se houver legacy
      macros: {
        kcal:   block.querySelector('[name=ref-kcal]')?.value?.trim() || '',
        ptn:    block.querySelector('[name=ref-ptn]')?.value?.trim() || '',
        cho:    block.querySelector('[name=ref-cho]')?.value?.trim() || '',
        lip:    block.querySelector('[name=ref-lip]')?.value?.trim() || '',
        fibras: block.querySelector('[name=ref-fibras]')?.value?.trim() || '',
      },
    };
  }).filter(r => r.nome);

  // Substituições
  const substituicoes = [...document.querySelectorAll('#subst-container .dynamic-block')].map(block => ({
    categoria: block.querySelector('[name=subst-cat]')?.value?.trim() || '',
    itens: [...block.querySelectorAll('.subst-item-row')].map(row => ({
      base: row.querySelector('[name=subst-base]')?.value?.trim() || '',
      sub1: row.querySelector('[name=subst-sub1]')?.value?.trim() || '',
      sub2: row.querySelector('[name=subst-sub2]')?.value?.trim() || '',
    })).filter(i => i.base),
  })).filter(g => g.categoria);

  // Hidratação
  const hidraTimeline = [...document.querySelectorAll('#hidra-container .hidra-item-row')].map(row => ({
    hora: row.querySelector('[name=hidra-hora]')?.value?.trim() || '',
    desc: row.querySelector('[name=hidra-desc]')?.value?.trim() || '',
    qty:  row.querySelector('[name=hidra-qty]')?.value?.trim() || '',
  })).filter(h => h.hora);

  // Micronutrientes
  const micronutrientes = [...document.querySelectorAll('#micro-container .dynamic-block')].map(block => ({
    nome:    block.querySelector('[name=micro-nome]')?.value?.trim() || '',
    motivo:  block.querySelector('[name=micro-motivo]')?.value?.trim() || '',
    fontes:  block.querySelector('[name=micro-fontes]')?.value?.trim() || '',
    meta:    block.querySelector('[name=micro-meta]')?.value?.trim() || '',
  })).filter(m => m.nome);

  // Timing
  const timing = [...document.querySelectorAll('#timing-container .dynamic-block')].map(block => ({
    condicao:  block.querySelector('[name=timing-cond]')?.value?.trim() || '',
    detalhe:   block.querySelector('[name=timing-detalhe]')?.value?.trim() || '',
    descricao: block.querySelector('[name=timing-desc]')?.value?.trim() || '',
  })).filter(t => t.condicao);

  // Suplementação
  const suplItens = [...document.querySelectorAll('#supl-container .dynamic-block')].map(block => ({
    nome:         block.querySelector('[name=supl-nome]')?.value?.trim() || '',
    dose:         block.querySelector('[name=supl-dose]')?.value?.trim() || '',
    horario:      block.querySelector('[name=supl-horario]')?.value?.trim() || '',
    status:       block.querySelector('[name=supl-status]')?.value?.trim() || '',
    tag_cor:      block.querySelector('[name=supl-tag-cor]')?.value || 'verde',
    justificativa:block.querySelector('[name=supl-just]')?.value?.trim() || '',
  })).filter(s => s.nome);

  // Lista de compras
  const listaCompras = [...document.querySelectorAll('#compras-container .dynamic-block')].map(block => ({
    categoria: block.querySelector('[name=cat-nome]')?.value?.trim() || '',
    sub:       block.querySelector('[name=cat-sub]')?.value?.trim() || '',
    itens: [...block.querySelectorAll('.compras-item-row')].map(row => ({
      nome: row.querySelector('[name=comp-nome]')?.value?.trim() || '',
      novo: row.querySelector('[name=comp-novo]')?.checked || false,
    })).filter(i => i.nome),
  })).filter(c => c.categoria);

  // Orientações
  const buildOrient = (tipo) =>
    [...document.querySelectorAll(`#orient-${tipo}-container .orient-item-row`)].map(row => ({
      texto:    row.querySelector('[name=orient-texto]')?.value?.trim() || '',
      destaque: row.querySelector('[name=orient-destaque]')?.checked || false,
    })).filter(o => o.texto);

  return {
    patient_id:       patientId,
    user_id:          patientUserId,
    descricao:        v('f-descricao'),
    sub_titulo:       v('f-subtitulo'),
    data_elaboracao:  v('f-data'),
    kcal_alvo:        vNum('f-kcal'),
    proteina_g:       vNum('f-ptn'),
    carboidrato_g:    vNum('f-cho'),
    lipidio_g:        vNum('f-lip'),
    fibras_g:         vNum('f-fibras'),
    num_refeicoes:    vNum('f-refeicoes'),
    criterio_central: v('f-criterio'),
    calculo_vet:      v('f-calculo-vet'),
    stats_clinicos:   stats.length ? stats : null,
    condicoes_clinicas: condicoes.length ? condicoes : null,
    comparativo:      diff.length ? { obs: v('f-comp-obs'), diff } : null,
    dieta_atual:      dietaRef.length ? { refeicoes: dietaRef, suplementos: dietaSupl, obs: v('f-dieta-obs') } : null,
    plano_obs:        v('f-plano-obs'),
    refeicoes:        refeicoes.length ? refeicoes : null,
    substituicoes:    substituicoes.length ? substituicoes : null,
    hidratacao:       hidraTimeline.length ? { meta: v('f-hidra-meta'), timeline: hidraTimeline, restricoes: v('f-hidra-restricoes') } : null,
    micronutrientes:  micronutrientes.length ? micronutrientes : null,
    timing:           timing.length ? timing : null,
    suplementacao:    suplItens.length ? { obs: v('f-supl-obs'), itens: suplItens } : null,
    lista_compras:    listaCompras.length ? listaCompras : null,
    compras_evitar:   v('f-compras-evitar'),
    orientacoes: {
      atencao: buildOrient('atencao'),
      exames:  buildOrient('exames'),
      rodape:  v('f-orient-rodape'),
    },
  };
}

// ── PDF upload ────────────────────────────────────────────
function initPdfUpload() {
  const input = document.getElementById('f-pdf');
  const label = document.getElementById('pdf-label');
  input?.addEventListener('change', () => {
    if (input.files[0]) label.textContent = input.files[0].name;
  });
}

async function uploadPdf() {
  const arquivo = document.getElementById('f-pdf')?.files[0];
  if (!arquivo || !patientUserId) return null;
  const path = `${patientUserId}/plano-${Date.now()}.pdf`;
  const { data, error } = await supabase.storage.from('planos').upload(path, arquivo, { upsert: true, contentType: 'application/pdf' });
  return error ? null : data.path;
}

// ── Submit ────────────────────────────────────────────────
function initForm() {
  const form = document.getElementById('plano-form');

  // Guarda universal: dirty + required + beforeunload
  formGuard = installFormGuard({ form, label: 'Plano alimentar' });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    const msg = document.getElementById('form-message');
    btn.disabled = true; btn.textContent = 'Salvando...';

    if (!patientId || !patientUserId) {
      // Tenta recuperar dos campos ocultos como fallback
      patientId     = document.getElementById('f-patient-id')?.value  || patientId;
      patientUserId = document.getElementById('f-user-id')?.value     || patientUserId;
    }

    if (!patientId || !patientUserId) {
      msg.textContent = 'Erro: paciente não identificada. Feche esta página e abra o plano novamente a partir do painel da paciente.';
      msg.className = 'form-message error visible';
      btn.disabled = false; btn.textContent = 'Salvar Plano';
      console.error('[ERG] patientId:', patientId, 'patientUserId:', patientUserId);
      return;
    }

    const payload = buildPayload();

    // Upload PDF se houver
    const pdfUrl = await uploadPdf();
    if (pdfUrl) payload.plano_pdf_url = pdfUrl;

    const planoId = document.getElementById('f-plano-id').value;
    const result = planoId
      ? await safeUpdate(supabase, 'planos_alimentares', payload, { id: planoId },
                          { label: 'Plano alimentar' })
      : await safeInsert(supabase, 'planos_alimentares', payload,
                          { label: 'Plano alimentar' });

    if (!result.ok) {
      msg.textContent = `Erro ao salvar: ${result.error?.message}. Dados guardados localmente — clique no banner pra retentar.`;
      msg.className = 'form-message error visible';
      btn.disabled = false; btn.textContent = 'Salvar Plano';
      return;
    }

    formGuard?.markSaved();
    showToast('Plano alimentar salvo com sucesso.');
    setTimeout(() => window.location.href = 'admin.html', 1500);
  });
}

// ── Preenche formulário com dados existentes ──────────────
function fillForm(data) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val !== null && val !== undefined) el.value = val; };

  set('f-plano-id',  data.id);
  set('f-descricao', data.descricao);
  set('f-subtitulo', data.sub_titulo);
  set('f-data',      data.data_elaboracao);
  set('f-kcal',      data.kcal_alvo);
  set('f-ptn',       data.proteina_g);
  set('f-cho',       data.carboidrato_g);
  set('f-lip',       data.lipidio_g);
  set('f-fibras',    data.fibras_g);
  set('f-refeicoes', data.num_refeicoes);
  set('f-criterio',  data.criterio_central);
  set('f-calculo-vet', data.calculo_vet);

  if (data.stats_clinicos) data.stats_clinicos.forEach(s => addStat(s));
  if (data.condicoes_clinicas) data.condicoes_clinicas.forEach(c => addCondicao(c));
  if (data.comparativo) {
    set('f-comp-obs', data.comparativo.obs);
    if (data.comparativo.diff) data.comparativo.diff.forEach(d => addDiff(d));
  }
  if (data.dieta_atual) {
    set('f-dieta-obs', data.dieta_atual.obs);
    if (data.dieta_atual.refeicoes) data.dieta_atual.refeicoes.forEach(r => addDietaRefeicao(r));
    if (data.dieta_atual.suplementos) data.dieta_atual.suplementos.forEach(s => addDietaSupl(s));
  }
  set('f-plano-obs', data.plano_obs);
  if (data.refeicoes) data.refeicoes.forEach(r => addRefeicao(r));
  if (data.substituicoes) data.substituicoes.forEach(g => addSubstGrupo(g));
  if (data.hidratacao) {
    set('f-hidra-meta', data.hidratacao.meta);
    set('f-hidra-restricoes', data.hidratacao.restricoes);
    if (data.hidratacao.timeline) data.hidratacao.timeline.forEach(h => addHidra(h));
  }
  if (data.micronutrientes) data.micronutrientes.forEach(m => addMicro(m));
  if (data.timing) data.timing.forEach(t => addTiming(t));
  if (data.suplementacao) {
    set('f-supl-obs', data.suplementacao.obs);
    if (data.suplementacao.itens) data.suplementacao.itens.forEach(s => addSupl(s));
  }
  if (data.lista_compras) data.lista_compras.forEach(c => addComprasCat(c));
  set('f-compras-evitar', data.compras_evitar);
  if (data.orientacoes) {
    ['atencao','exames'].forEach(tipo => {
      if (data.orientacoes[tipo]) data.orientacoes[tipo].forEach(o => addOrient(tipo, o));
    });
    // Compatibilidade: planos antigos podem ter manter/mudar — acumula em "atencao"
    if (data.orientacoes.manter) data.orientacoes.manter.forEach(o => addOrient('atencao', o));
    if (data.orientacoes.mudar)  data.orientacoes.mudar.forEach(o  => addOrient('atencao', o));
    set('f-orient-rodape', data.orientacoes.rodape);
  }
}

// ── Sidebar mobile ────────────────────────────────────────
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btn     = document.getElementById('hamburger-btn');
  if (!btn) return;
  btn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
  overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 3000);
}



// ── Widget de documentos ───────────────────────────────────
import { initDocExtractor, preencherFormulario } from './doc-extractor.js';

document.addEventListener('DOMContentLoaded', () => {
  initDocExtractor('doc-extractor-plano', 'plano', (dados, tipo, n) => {
    const msg = n > 0
      ? `${n} campo(s) preenchido(s). Revise e salve.`
      : 'Preencha os campos acima e clique em "Preencher formulário".';
    if (typeof showToast === 'function') showToast(msg);
  });
});
