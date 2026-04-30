// ============================================================
// anamnese.js — Formulário de Anamnese Nutricional Dinâmico
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { safeInsert, safeUpdate, installOnlineHook, mountPendingBanner } from './safe-save.js';
import {
  MODULES,
  detectarModulos,
  renderModuleIntroStep,
  renderModuleStep,
  initModuleConditionals,
  coletarRespostasModulos,
  gerarInsights,
  renderInsightsPanel,
  salvarRespostasModulos,
  carregarRespostasModulos,
  carregarModulosAtivos,
} from './anamnese-engine.js';
import { installFormGuard } from './form-guard.js';

let formGuard = null;

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';
const ADMIN_EMAIL   = 'evelinbeatrizrb@outlook.com';

function isAdminUser(user) {
  return user?.user_metadata?.role === 'admin' || user?.email === ADMIN_EMAIL;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Sequência de steps ────────────────────────────────────
// IDs base: step-0…step-8 (fixos no HTML)
// Módulos dinâmicos: step-modules-intro, step-mod-atleta, etc.
// Inseridos entre step-4 e step-5 após detecção
const BASE_STEPS_A = ['step-0', 'step-1', 'step-2', 'step-3', 'step-4'];
const BASE_STEPS_B = ['step-5', 'step-6', 'step-7', 'step-8'];

let stepSequence = [...BASE_STEPS_A, ...BASE_STEPS_B];
let currentStepIdx = 0;
let patologiasSelecionadas = [];
let modulosAtivos = [];          // slugs dos módulos ativados
let modulosInjetados = false;    // flag: só injeta uma vez

// ── Inicialização ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkAdmin();
  loadPatientFromUrl();
  setDefaultDate();
  initToggleButtons();
  initPatologias();
  initSidebarMobile();
  initForm();
  updateProgress();
  // Backup global de saves + banner de pendências
  window._supabase = supabase;
  installOnlineHook(supabase);
  mountPendingBanner();
});

async function checkAdmin() {
  // Tenta recuperar sessão existente primeiro
  const { data: { session } } = await supabase.auth.getSession();

  if (session && isAdminUser(session.user)) return; // OK

  // Tenta refresh do token antes de redirecionar
  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed?.session && isAdminUser(refreshed.session.user)) return;

  window.location.href = 'index.html';
}

function loadPatientFromUrl() {
  const params = new URLSearchParams(window.location.search);
  // Aceita ambos os nomes — o dashboard admin usa 'patient_id'/'user_id' em
  // alguns lugares e 'patient'/'user' em outros.
  const patientId = params.get('patient')    || params.get('patient_id');
  const userId    = params.get('user')       || params.get('user_id');
  const nome      = params.get('nome');
  // Modo edição: ?edit=<anamnese_id> carrega uma específica pra UPDATE
  const editId    = params.get('edit');

  if (patientId) document.getElementById('patient-id').value = patientId;
  if (userId)    document.getElementById('user-id').value    = userId;
  if (nome) {
    document.getElementById('patient-name-sidebar').textContent = nome.split(' ')[0];
    document.title = `Anamnese — ${nome}`;
  }

  // Sempre cria NOVA anamnese por padrão. Só carrega existente se ?edit=ID.
  if (editId && patientId) loadAnamneseById(patientId, editId);
}

async function loadAnamneseById(patientId, anamneseId) {
  const { data } = await supabase
    .from('anamnese')
    .select('*')
    .eq('id', anamneseId)
    .eq('patient_id', patientId)
    .single();

  if (data) {
    fillForm(data);
    // Guarda ID em hidden field para o save virar UPDATE
    let hiddenId = document.getElementById('anamnese-id');
    if (!hiddenId) {
      hiddenId = document.createElement('input');
      hiddenId.type = 'hidden';
      hiddenId.id = 'anamnese-id';
      document.querySelector('form, body')?.appendChild(hiddenId);
    }
    hiddenId.value = anamneseId;
    // Sinaliza visualmente que está em modo edição
    const titleEl = document.querySelector('.page-title');
    if (titleEl) titleEl.textContent += ' (editando)';

    // Carrega e re-injeta módulos dinâmicos da anamnese anterior
    const slugsAtivos = await carregarModulosAtivos(supabase, patientId);
    if (slugsAtivos.length) {
      modulosAtivos  = slugsAtivos;
      modulosInjetados = true;

      // Injeta HTML dos módulos
      const mount = document.getElementById('dynamic-modules-mount');
      if (mount) {
        let html = renderModuleIntroStep(modulosAtivos);
        for (const slug of modulosAtivos) html += renderModuleStep(slug);
        mount.innerHTML = html;

        // Atualiza sequência
        const insertAt = stepSequence.indexOf('step-5');
        const moduleStepIds = ['step-modules-intro', ...modulosAtivos.map(s => `step-mod-${s}`)];
        if (insertAt !== -1 && !stepSequence.includes('step-modules-intro')) {
          stepSequence.splice(insertAt, 0, ...moduleStepIds);
        }

        // Nav lateral
        const navDynamic = document.getElementById('step-nav-dynamic');
        const navLabel   = document.getElementById('step-nav-dynamic-label');
        if (navDynamic && navLabel) {
          navLabel.classList.add('visible');
          let navHtml = '';
          for (const slug of modulosAtivos) {
            const mod = MODULES[slug];
            if (!mod) continue;
            navHtml += `
              <button class="snav-module" id="snav-step-mod-${slug}"
                onclick="goToModuleStep('step-mod-${slug}')">
                <span class="snav-module-dot" style="background:${mod.cor}"></span>
                ${mod.nome}
              </button>`;
          }
          navDynamic.innerHTML = navHtml;
        }
      }

      // Preenche respostas dos módulos
      const respostas = await carregarRespostasModulos(supabase, patientId);
      preencherRespostasModulos(respostas);
    }
  }
}

function preencherRespostasModulos(respostas) {
  for (const [slug, campos] of Object.entries(respostas)) {
    for (const [qSlug, valor] of Object.entries(campos)) {
      if (!valor) continue;
      const id = `mod__${slug}__${qSlug}`;
      const el = document.getElementById(id);
      if (!el) continue;

      if (el.tagName === 'INPUT' && el.type === 'hidden') {
        // toggle ou multiselect
        el.value = valor;
        // Marca botões toggle
        document.querySelectorAll(`.toggle-btn[data-field="${id}"]`).forEach(b => {
          b.classList.toggle('active', b.dataset.value === valor);
        });
        // Marca botões multiselect
        const vals = valor.split('|');
        document.querySelectorAll(`.patologia-btn[data-field="${id}"]`).forEach(b => {
          b.classList.toggle('active', vals.includes(b.dataset.value));
        });
      } else {
        el.value = valor;
      }
    }
  }
  // Re-checa condicionais
  for (const slug of modulosAtivos) initModuleConditionals(slug);
}

function setDefaultDate() {
  const el = document.getElementById('data_avaliacao');
  if (el && !el.value) {
    el.value = new Date().toISOString().split('T')[0];
  }
}

// ── Toggle buttons ────────────────────────────────────────
function initToggleButtons() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const value = btn.dataset.value;
      if (!field) return;

      // Desmarca irmãos do mesmo campo
      document.querySelectorAll(`.toggle-btn[data-field="${field}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Atualiza hidden input
      const hidden = document.getElementById(field);
      if (hidden) hidden.value = value;
    });
  });
}

// ── Patologias multiselect ────────────────────────────────
function initPatologias() {
  document.querySelectorAll('.patologia-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const val = btn.dataset.value;
      if (btn.classList.contains('active')) {
        if (!patologiasSelecionadas.includes(val)) patologiasSelecionadas.push(val);
      } else {
        patologiasSelecionadas = patologiasSelecionadas.filter(p => p !== val);
      }
    });
  });
}

// ── Escala numérica ───────────────────────────────────────
function setScale(field, value) {
  document.querySelectorAll(`#${field}-btns .scale-btn`).forEach((btn, i) => {
    btn.classList.toggle('active', i === value);
  });
  const hidden = document.getElementById(field);
  if (hidden) hidden.value = value;
}
window.setScale = setScale;

// ── Toggle álcool ─────────────────────────────────────────
function toggleAlcool(show) {
  document.getElementById('alcool-detalhes').style.display = show ? '' : 'none';
}
window.toggleAlcool = toggleAlcool;

// ── NAVEGAÇÃO DINÂMICA ────────────────────────────────────

// navegar para um step pelo ID da div (string) ou índice base (número)
function navigateToStepId(targetId) {
  const fromId = stepSequence[currentStepIdx];
  const toIdx  = stepSequence.indexOf(targetId);
  if (toIdx === -1) return;

  // Injeta módulos ao avançar de step-4 pela primeira vez
  if (fromId === 'step-4' && toIdx > currentStepIdx && !modulosInjetados) {
    injetarModulos();
    // Após injeção, revalidar índice do destino
    const newToIdx = stepSequence.indexOf(targetId);
    if (newToIdx !== -1) {
      navigateToStepId(targetId);
      return;
    }
  }

  // Oculta step atual
  document.getElementById(fromId)?.classList.remove('active');
  setNavActive(fromId, 'done');

  // Mostra step destino
  currentStepIdx = toIdx;
  document.getElementById(targetId)?.classList.add('active');
  setNavActive(targetId, 'active');

  // Insights: aparece ao chegar no último step
  const isLast = currentStepIdx === stepSequence.length - 1;
  if (isLast) exibirInsights();

  updateNavBtns();
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Hook anamnese-extras: stepper + tempo + risco em tempo real
  if (window._anamneseExtras) {
    window._anamneseExtras.onStepChange(currentStepIdx, stepSequence.length);
  }
}

// Compatibilidade com sidebar existente: goToStep(n) usa números 0-8
function goToStep(n) {
  // step-0…step-4: direto
  if (n <= 4) {
    navigateToStepId(`step-${n}`);
    return;
  }
  // step-5…step-8: mapeados APÓS módulos dinâmicos
  navigateToStepId(`step-${n}`);
}

// Chamada pelo nav dinâmico dos módulos
function goToModuleStep(stepId) {
  navigateToStepId(stepId);
}
window.goToModuleStep = goToModuleStep;

function nextStep() {
  if (currentStepIdx < stepSequence.length - 1) {
    navigateToStepId(stepSequence[currentStepIdx + 1]);
  }
}

function prevStep() {
  if (currentStepIdx > 0) {
    navigateToStepId(stepSequence[currentStepIdx - 1]);
  }
}

function updateNavBtns() {
  const isFirst = currentStepIdx === 0;
  const isLast  = currentStepIdx === stepSequence.length - 1;
  document.getElementById('btn-prev').style.display = isFirst ? 'none' : '';
  document.getElementById('btn-next').style.display = isLast  ? 'none' : '';
  document.getElementById('btn-save').style.display = isLast  ? ''     : 'none';
}

function updateProgress() {
  const pct = stepSequence.length > 1
    ? (currentStepIdx / (stepSequence.length - 1)) * 100
    : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
}

// Atualiza destaque no nav lateral
function setNavActive(stepId, state) {
  // Nav base (snav-0…snav-8)
  const match = stepId.match(/^step-(\d+)$/);
  if (match) {
    const n = match[1];
    const el = document.getElementById(`snav-${n}`);
    if (el) {
      el.classList.remove('active', 'done');
      if (state !== 'none') el.classList.add(state);
    }
    return;
  }
  // Nav dinâmico
  const dynEl = document.getElementById(`snav-${stepId}`);
  if (dynEl) {
    dynEl.classList.remove('active', 'done');
    if (state !== 'none') dynEl.classList.add(state);
  }
}

window.goToStep  = goToStep;
window.nextStep  = nextStep;
window.prevStep  = prevStep;

// ── INJEÇÃO DOS MÓDULOS DINÂMICOS ────────────────────────
function injetarModulos() {
  if (modulosInjetados) return;

  // Detecta módulos com base nos dados preenchidos até agora
  const dadosDeteccao = {
    motivo:          document.getElementById('motivo')?.value || '',
    caso_clinico:    document.getElementById('caso_clinico')?.value || '',
    outras_patologias: document.getElementById('outras_patologias')?.value || '',
    patologias:      patologiasSelecionadas,
    nivel_af:        document.getElementById('nivel_af')?.value || '',
    intensidade_af:  document.getElementById('intensidade_af')?.value || '',
    idade:           0, // não temos idade na base diretamente
  };

  modulosAtivos = detectarModulos(dadosDeteccao);
  modulosInjetados = true;

  if (!modulosAtivos.length) return; // nenhum módulo ativado

  // Monta HTML dos steps de módulos
  const mount = document.getElementById('dynamic-modules-mount');
  if (!mount) return;

  let html = renderModuleIntroStep(modulosAtivos);
  for (const slug of modulosAtivos) {
    html += renderModuleStep(slug);
  }
  mount.innerHTML = html;

  // Atualiza sequência de steps: insere módulos entre step-4 e step-5
  const insertAt = stepSequence.indexOf('step-5');
  const moduleStepIds = ['step-modules-intro', ...modulosAtivos.map(s => `step-mod-${s}`)];
  stepSequence.splice(insertAt, 0, ...moduleStepIds);

  // Adiciona itens no nav lateral
  const navDynamic = document.getElementById('step-nav-dynamic');
  const navLabel   = document.getElementById('step-nav-dynamic-label');
  if (navDynamic && navLabel) {
    navLabel.classList.add('visible');
    let navHtml = '';
    for (const slug of modulosAtivos) {
      const mod = MODULES[slug];
      if (!mod) continue;
      navHtml += `
        <button class="snav-module" id="snav-step-mod-${slug}"
          onclick="goToModuleStep('step-mod-${slug}')">
          <span class="snav-module-dot" style="background:${mod.cor}"></span>
          ${mod.nome}
        </button>`;
    }
    navDynamic.innerHTML = navHtml;
  }

  // Inicializa toggle buttons dos módulos
  document.querySelectorAll('#dynamic-modules-mount .toggle-btn').forEach(btn => {
    // Os toggle buttons dos módulos usam onclick="engineToggle()" inline
    // Não precisam de listener adicional
  });

  // Inicializa condicionais para qualquer valor pré-preenchido
  for (const slug of modulosAtivos) {
    initModuleConditionals(slug);
  }

  showToast(`✓ ${modulosAtivos.length} módulo${modulosAtivos.length > 1 ? 's' : ''} personalizado${modulosAtivos.length > 1 ? 's' : ''} adicionado${modulosAtivos.length > 1 ? 's' : ''}.`);
}

// ── GERAÇÃO E EXIBIÇÃO DE INSIGHTS ───────────────────────
function exibirInsights() {
  if (!modulosAtivos.length) return;

  const dadosBase = buildPayloadForInsights();
  const respostasModulos = coletarRespostasModulos(modulosAtivos);
  const insights = gerarInsights(dadosBase, respostasModulos, modulosAtivos);

  const container = document.getElementById('insights-panel-container');
  if (!container) return;

  const html = renderInsightsPanel(insights);
  if (html) {
    container.innerHTML = html;
    container.style.display = '';
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function buildPayloadForInsights() {
  return {
    qualidade_sono:  document.getElementById('qualidade_sono')?.value || '',
    escala_estresse: document.getElementById('escala_estresse')?.value || '',
    nivel_af:        document.getElementById('nivel_af')?.value || '',
    ingere_alcool:   document.getElementById('ingere_alcool')?.value || '',
    fumante:         document.getElementById('fumante')?.value || '',
    patologias:      patologiasSelecionadas,
  };
}

// ── Submit ────────────────────────────────────────────────
function initForm() {
  const form = document.getElementById('anamnese-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveAnamnese();
  });

  // Guarda universal: rastreia alterações, conta obrigatórios
  // vazios e avisa antes de sair. markSaved() é chamado no save OK.
  formGuard = installFormGuard({ form, label: 'Anamnese' });
}

async function saveAnamnese() {
  const btn = document.getElementById('btn-save');
  const msg = document.getElementById('form-message');
  btn.disabled    = true;
  btn.textContent = 'Salvando...';

  const patientId = document.getElementById('patient-id').value;
  const userId    = document.getElementById('user-id').value;

  if (!patientId || !userId) {
    showMsg(msg, 'Paciente não identificada. Volte e selecione a paciente.', 'error');
    btn.disabled = false; btn.textContent = 'Salvar Anamnese';
    return;
  }

  // ── 1. Salva anamnese base (com proteção total contra perda) ──
  const payload = buildPayload(patientId, userId);
  // Modo edição: ?edit=ID setou anamnese-id → UPDATE; senão, nova entrada (INSERT)
  const editandoId = document.getElementById('anamnese-id')?.value;
  const result = editandoId
    ? await safeUpdate(supabase, 'anamnese', payload, { id: editandoId },
                        { label: 'Anamnese (edição)', select: 'id', single: true })
    : await safeInsert(supabase, 'anamnese', payload,
                        { label: 'Anamnese', select: 'id', single: true });

  if (!result.ok) {
    showMsg(msg,
      `Erro ao salvar: ${result.error?.message || 'desconhecido'}. ` +
      `Os dados ficam guardados localmente — clique no banner inferior pra tentar novamente.`,
      'error');
    btn.disabled = false; btn.textContent = 'Salvar Anamnese';
    return;
  }
  if (result.columnsRemoved?.length) {
    console.warn('Anamnese: campos ignorados (rodar migration):', result.columnsRemoved);
  }

  const anamneseId = result.data?.id || null;

  // ── 2. Salva respostas dos módulos dinâmicos ──
  if (modulosAtivos.length) {
    btn.textContent = 'Salvando módulos...';
    const respostasModulos = coletarRespostasModulos(modulosAtivos);
    const { ok, error: errMod } = await salvarRespostasModulos(
      supabase, patientId, anamneseId, modulosAtivos, respostasModulos
    );
    if (!ok) console.warn('Módulos: erro parcial —', errMod);

    // ── 3. Salva insights no Supabase ──
    const dadosBase = buildPayloadForInsights();
    const insights  = gerarInsights(dadosBase, respostasModulos, modulosAtivos);
    const insightRows = [];
    let ordem = 0;
    for (const p of insights.prioridades) {
      insightRows.push({ patient_id: patientId, anamnese_id: anamneseId, tipo: 'prioridade', mensagem: p, ordem: ordem++ });
    }
    for (const a of insights.alertas) {
      insightRows.push({ patient_id: patientId, anamnese_id: anamneseId, tipo: a.tipo, mensagem: a.msg, ordem: ordem++ });
    }
    for (const c of insights.condutas) {
      insightRows.push({ patient_id: patientId, anamnese_id: anamneseId, tipo: 'conduta', mensagem: c, ordem: ordem++ });
    }
    if (insightRows.length) {
      await supabase.from('patient_anamnese_insights').insert(insightRows);
    }
  }

  // Marca salvo ANTES do redirect para suprimir beforeunload
  formGuard?.markSaved();
  // Hook: limpa rascunho do localStorage + remoto
  if (window._anamneseExtras) window._anamneseExtras.onSaved();
  showToast('Anamnese salva com sucesso.');
  setTimeout(() => window.location.href = `admin.html`, 1500);
}

function buildPayload(patientId, userId) {
  const v = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const val = el.value.trim();
    return val === '' ? null : val;
  };
  const vNum = (id) => {
    const val = v(id);
    return val !== null ? parseFloat(val) : null;
  };
  const vBool = (id) => {
    const val = v(id);
    return val === 'true' ? true : val === 'false' ? false : null;
  };
  const vInt = (id) => {
    const val = v(id);
    return val !== null ? parseInt(val) : null;
  };

  return {
    patient_id: patientId,
    user_id:    userId,
    data_avaliacao: v('data_avaliacao') || new Date().toISOString().split('T')[0],
    profissao:        v('profissao'),
    telefone:         v('telefone'),
    motivo:           v('motivo'),
    caso_clinico:     v('caso_clinico'),
    restricao_alimentar: v('restricao_alimentar'),
    fumante:          vBool('fumante'),
    refeicoes_fora:   vBool('refeicoes_fora'),
    ingere_alcool:    vBool('ingere_alcool'),
    alcool_frequencia: v('alcool_frequencia'),
    alcool_qual:      v('alcool_qual'),
    mora_pessoas:     vInt('mora_pessoas'),
    quem_compra:      v('quem_compra'),
    onde_compra:      v('onde_compra'),
    freq_compras:     vInt('freq_compras'),
    qualidade_sono:   v('qualidade_sono'),
    horas_sono:       vNum('horas_sono'),
    obs_sono:         v('obs_sono'),
    escala_estresse:  vInt('escala_estresse'),
    fontes_estresse:  v('fontes_estresse'),
    horas_sentado:    vNum('horas_sentado'),
    tipo_af:          v('tipo_af'),
    freq_af:          v('freq_af'),
    duracao_af:       v('duracao_af'),
    intensidade_af:   v('intensidade_af'),
    nivel_af:         v('nivel_af'),
    obs_af:           v('obs_af'),
    patologias:       patologiasSelecionadas.length ? patologiasSelecionadas : null,
    outras_patologias: v('outras_patologias'),
    medicamentos:     v('medicamentos'),
    suplementos:      v('suplementos'),
    historico_familiar: v('historico_familiar'),
    exames_obs:       v('exames_obs'),
    glicemia:         vNum('glicemia'),
    hba1c:            vNum('hba1c'),
    tsh:              vNum('tsh'),
    col_total:        vNum('col_total'),
    hdl:              vNum('hdl'),
    ldl:              vNum('ldl'),
    tg:               vNum('tg'),
    vitamina_d:       vNum('vitamina_d'),
    vitamina_b12:     vNum('vitamina_b12'),
    insulina:         vNum('insulina'),
    calcio:           vNum('calcio'),
    apetite:          v('apetite'),
    mastigacao:       v('mastigacao'),
    habito_intestinal: v('habito_intestinal'),
    freq_evacuacao:   vInt('freq_evacuacao'),
    freq_evacuacao_periodo: v('freq_evacuacao_periodo'),
    formato_fezes:    v('formato_fezes'),
    cor_fezes:        v('cor_fezes'),
    usa_laxante:      vBool('usa_laxante'),
    habito_urinario:  v('habito_urinario'),
    ingestao_hidrica: vNum('ingestao_hidrica'),
    hidratacao_urinaria: v('hidratacao_urinaria'),
    obs_habito:       v('obs_habito'),
    preferencias:     v('preferencias'),
    aversoes:         v('aversoes'),
    alergias:         v('alergias'),
    intolerancias:    v('intolerancias'),
    onde_come:        v('onde_come'),
    quem_prepara:     v('quem_prepara'),
    h_cafe:           v('h_cafe'),
    h_lanche_manha:   v('h_lanche_manha'),
    h_almoco:         v('h_almoco'),
    h_lanche_tarde:   v('h_lanche_tarde'),
    h_jantar:         v('h_jantar'),
    h_ceia:           v('h_ceia'),
    ref_cafe:         v('ref_cafe'),
    ref_lanche_manha: v('ref_lanche_manha'),
    ref_almoco:       v('ref_almoco'),
    ref_lanche_tarde: v('ref_lanche_tarde'),
    ref_jantar:       v('ref_jantar'),
    ref_ceia:         v('ref_ceia'),
    peso_meta:        vNum('peso_meta'),
    prazo_meta:       v('prazo_meta'),
    meta_semana:      v('meta_semana'),
    tentativas_anteriores: v('tentativas_anteriores'),
    compulsao:        v('compulsao'),
    fome_emocional:   v('fome_emocional'),
    fome_noturna:     v('fome_noturna'),
    obs_gerais:       v('obs_gerais'),
  };
}

// ── Preenche formulário com dados existentes ──────────────
function fillForm(data) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== null && val !== undefined) el.value = val;
  };

  Object.keys(data).forEach(key => {
    if (data[key] !== null && data[key] !== undefined) {
      set(key, data[key]);
    }
  });

  // Restaura toggle buttons
  ['restricao_alimentar','fumante','refeicoes_fora','ingere_alcool',
   'alcool_frequencia','qualidade_sono','intensidade_af','apetite',
   'mastigacao','habito_intestinal','freq_evacuacao_periodo','cor_fezes',
   'usa_laxante','hidratacao_urinaria','compulsao','fome_emocional','fome_noturna'
  ].forEach(field => {
    const val = data[field];
    if (val !== null && val !== undefined) {
      const btn = document.querySelector(`.toggle-btn[data-field="${field}"][data-value="${val}"]`);
      if (btn) {
        document.querySelectorAll(`.toggle-btn[data-field="${field}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    }
  });

  // Restaura patologias
  if (data.patologias && Array.isArray(data.patologias)) {
    patologiasSelecionadas = [...data.patologias];
    data.patologias.forEach(p => {
      const btn = document.querySelector(`.patologia-btn[data-value="${p}"]`);
      if (btn) btn.classList.add('active');
    });
  }

  // Restaura escala de estresse
  if (data.escala_estresse !== null) {
    setScale('escala_estresse', data.escala_estresse);
  }

  // Mostra álcool se necessário
  if (data.ingere_alcool) toggleAlcool(true);
}

// ── Sidebar mobile ────────────────────────────────────────
function initSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btn     = document.getElementById('hamburger-btn');
  if (!btn) return;
  btn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
  overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
}

// ── Utilitários ───────────────────────────────────────────
function showMsg(el, text, type) {
  el.textContent = text;
  el.className   = `form-message ${type} visible`;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 3000);
}

// ── Escala Bristol ────────────────────────────────────────
function selectBristol(value, btn) {
  document.querySelectorAll('.bristol-card').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('formato_fezes').value = value;
}
window.selectBristol = selectBristol;

// ── Cor da urina ──────────────────────────────────────────
function selectUrina(value, btn) {
  document.querySelectorAll('.urina-card').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('hidratacao_urinaria').value = value;
}
window.selectUrina = selectUrina;

// ── Classificação de exames laboratoriais ─────────────────
const EXAMES_REF = {
  glicemia:    { normal: [70, 99],   atencao: [100, 125], label: ['Baixo','Normal','Pré-diabético','Alterado'] },
  hba1c:       { normal: [0, 5.6],   atencao: [5.7, 6.4], label: ['Normal','Pré-diabetes','Diabetes'] },
  insulina:    { normal: [2, 25],    label: ['Baixo','Normal','Elevado'] },
  tsh:         { normal: [0.4, 4.0], label: ['Hipotireoidismo','Normal','Hipotireoidismo'] },
  col_total:   { normal: [0, 189],   atencao: [190, 239],  label: ['Ótimo','Limítrofe','Elevado'] },
  hdl:         { normal: [50, 999],  label: ['Baixo','Normal'] },
  ldl:         { normal: [0, 129],   atencao: [130, 159],  label: ['Ótimo','Limítrofe','Elevado'] },
  tg:          { normal: [0, 149],   atencao: [150, 199],  label: ['Normal','Limítrofe','Elevado'] },
  vitamina_d:  { normal: [30, 100],  label: ['Deficiente','Suficiente','Toxicidade'] },
  vitamina_b12:{ normal: [200, 900], label: ['Deficiente','Normal','Elevado'] },
  calcio:      { normal: [8.5, 10.5],label: ['Baixo','Normal','Elevado'] },
};

function classificarExame(id) {
  const val  = parseFloat(document.getElementById(id)?.value);
  const el   = document.getElementById('class-' + id);
  const ref  = EXAMES_REF[id];
  if (!el || !ref || isNaN(val)) { if (el) { el.textContent = '—'; el.className = 'exame-badge'; } return; }

  let texto = '', classe = '';

  const [min, max] = ref.normal;

  if (id === 'hdl') {
    if (val < min) { texto = 'Baixo'; classe = 'badge-baixo'; }
    else           { texto = 'Normal'; classe = 'badge-normal'; }
  } else if (id === 'tsh') {
    if (val < 0.4)      { texto = 'Hipertireoidismo'; classe = 'badge-elevado'; }
    else if (val <= 4.0){ texto = 'Normal';            classe = 'badge-normal'; }
    else                { texto = 'Hipotireoidismo';   classe = 'badge-atencao'; }
  } else if (id === 'glicemia') {
    if (val < 70)       { texto = 'Hipoglicemia';  classe = 'badge-baixo'; }
    else if (val <= 99) { texto = 'Normal';         classe = 'badge-normal'; }
    else if (val <= 125){ texto = 'Pré-diabetes';   classe = 'badge-atencao'; }
    else                { texto = 'Diabetes';       classe = 'badge-elevado'; }
  } else if (id === 'hba1c') {
    if (val < 5.7)      { texto = 'Normal';        classe = 'badge-normal'; }
    else if (val <= 6.4){ texto = 'Pré-diabetes';  classe = 'badge-atencao'; }
    else                { texto = 'Diabetes';      classe = 'badge-elevado'; }
  } else if (id === 'col_total') {
    if (val < 190)      { texto = 'Ótimo';         classe = 'badge-otimo'; }
    else if (val < 240) { texto = 'Limítrofe';     classe = 'badge-atencao'; }
    else                { texto = 'Elevado';       classe = 'badge-elevado'; }
  } else {
    if (val < min)      { texto = 'Abaixo';  classe = 'badge-baixo'; }
    else if (val <= max){ texto = 'Normal';  classe = 'badge-normal'; }
    else                { texto = 'Elevado'; classe = 'badge-elevado'; }
  }

  el.textContent = texto;
  el.className   = `exame-badge ${classe}`;
}
window.classificarExame = classificarExame;



// ── Widget de documentos ───────────────────────────────────
import { initDocExtractor, preencherFormulario } from './doc-extractor.js';

document.addEventListener('DOMContentLoaded', () => {
  initDocExtractor('doc-extractor-anamnese', 'anamnese', (dados, tipo, n) => {
    const msg = n > 0
      ? `${n} campo(s) preenchido(s). Revise e salve.`
      : 'Preencha os campos acima e clique em "Preencher formulário".';
    if (typeof showToast === 'function') showToast(msg);
  });
});

// ══════════════════════════════════════════════════════════════
// INTELIGÊNCIA CLÍNICA — Alertas e cruzamento de dados
// ══════════════════════════════════════════════════════════════

// ── Mapa de alertas por patologia ─────────────────────────
const ALERTAS_PATOLOGIA = {
  'Diabetes': [
    { tipo: 'obrigatorio', msg: 'Diabetes marcado — HbA1c e Glicemia em jejum são obrigatórios nos exames.' },
    { tipo: 'obrigatorio', msg: 'Insulina de jejum recomendada para avaliar resistência insulínica.' },
    { tipo: 'conduta',     msg: 'Conduta: fracionar em 5–6 refeições · iniciar refeição pela salada · evitar CHO isolado.' },
  ],
  'Resistência insulínica': [
    { tipo: 'obrigatorio', msg: 'Resistência insulínica — HOMA-IR, Insulina e Glicemia são essenciais nos exames.' },
    { tipo: 'conduta',     msg: 'Conduta: fracionar refeições · lanche da manhã obrigatório para evitar hipoglicemia reativa.' },
  ],
  'Hipotireoidismo': [
    { tipo: 'obrigatorio', msg: 'Hipotireoidismo — TSH e T4 Livre são obrigatórios.' },
    { tipo: 'conduta',     msg: 'Conduta: selênio diário (semente de abóbora) · ferro e zinco adequados · monitorar constipação.' },
  ],
  'Hipertireoidismo': [
    { tipo: 'obrigatorio', msg: 'Hipertireoidismo — TSH e T4 Livre obrigatórios.' },
    { tipo: 'conduta',     msg: 'Conduta: aumentar aporte calórico · cuidado com termogênicos e cafeína.' },
  ],
  'Hipertensão': [
    { tipo: 'atencao',     msg: 'Hipertensão — avaliar sódio, potássio e magnésio nos exames.' },
    { tipo: 'conduta',     msg: 'Conduta: sódio < 2.000 mg/dia · hidratação adequada · aumentar potássio (feijão, frutas).' },
  ],
  'Dislipidemia': [
    { tipo: 'obrigatorio', msg: 'Dislipidemia — perfil lipídico completo obrigatório (CT, HDL, LDL, TG).' },
    { tipo: 'conduta',     msg: 'Conduta: ômega-3 via alimento (sardinha) · gordura mono/poli-insaturada · atividade física.' },
  ],
  'SOP': [
    { tipo: 'obrigatorio', msg: 'SOP — solicitar: insulina, testosterona, LH/FSH, prolactina.' },
    { tipo: 'conduta',     msg: 'Conduta: foco em controle glicêmico · redução de CHO refinado · inositol pode ser benéfico.' },
  ],
  'Osteoporose': [
    { tipo: 'obrigatorio', msg: 'Osteoporose — vitamina D e cálcio obrigatórios.' },
    { tipo: 'conduta',     msg: 'Conduta: 1.200mg cálcio/dia · vitamina D 2.000 UI mínimo · exercício de impacto.' },
  ],
  'Anemia': [
    { tipo: 'obrigatorio', msg: 'Anemia — hemograma, ferro sérico e ferritina obrigatórios.' },
    { tipo: 'conduta',     msg: 'Conduta: ferro heme (carnes) com vitamina C · evitar chá e café na refeição.' },
  ],
};

// ── Alertas por resultado de exame ────────────────────────
const ALERTAS_EXAMES = {
  glicemia:    { alto: { limiar: 100, msg: 'Glicemia alterada → considerar curva glicêmica e insulina de jejum.', tipo: 'atencao' },
                 muito_alto: { limiar: 126, msg: '⚠ Glicemia ≥126 mg/dL — critério diagnóstico para DM2. Encaminhar para avaliação médica.', tipo: 'critico' } },
  hba1c:       { alto: { limiar: 5.7, msg: 'HbA1c elevada → pré-diabetes. Conduta nutricional imediata.', tipo: 'atencao' },
                 muito_alto: { limiar: 6.5, msg: '⚠ HbA1c ≥6,5% — diagnóstico de DM2 confirmado. Plano com controle glicêmico rigoroso.', tipo: 'critico' } },
  vitamina_d:  { baixo: { limiar: 30, msg: 'Vitamina D insuficiente → suplementação e exposição solar.', tipo: 'atencao' },
                 muito_baixo: { limiar: 20, msg: '⚠ Vitamina D deficiente (<20) — dose terapêutica necessária (prescrição médica).', tipo: 'critico' } },
  hdl:         { baixo: { limiar: 50, msg: 'HDL baixo → ômega-3, exercício físico e gorduras boas (azeite, abacate, nozes).', tipo: 'atencao' } },
  tg:          { alto: { limiar: 150, msg: 'Triglicerídeos elevados → reduzir CHO simples, álcool e açúcar.', tipo: 'atencao' },
                 muito_alto: { limiar: 500, msg: '⚠ Triglicerídeos ≥500 mg/dL — risco de pancreatite. Avaliar com médico.', tipo: 'critico' } },
  tsh:         { alto: { limiar: 4.0, msg: 'TSH elevado → hipotireoidismo. Solicitar T4 Livre e acompanhar.', tipo: 'atencao' } },
  vitamina_b12:{ baixo: { limiar: 200, msg: 'Vitamina B12 baixa → suplementação e investigar deficiência (veganismo, metformina, etc).', tipo: 'atencao' } },
};

// ── Função principal — dispara alertas ────────────────────
function triggerAlertasClinicos() {
  const container = document.getElementById('alertas-clinicos');
  if (!container) return;

  const alertas = [];

  // Alertas por patologia selecionada
  document.querySelectorAll('.patologia-btn.selected').forEach(btn => {
    const pato = btn.dataset.value;
    if (ALERTAS_PATOLOGIA[pato]) {
      ALERTAS_PATOLOGIA[pato].forEach(a => alertas.push(a));
    }
  });

  if (alertas.length === 0) {
    container.style.display = 'none';
    return;
  }

  const criticos = alertas.filter(a => a.tipo === 'critico');
  const obrigat  = alertas.filter(a => a.tipo === 'obrigatorio');
  const condutas = alertas.filter(a => a.tipo === 'conduta');

  let html = '<div style="border:1px solid var(--detail);overflow:hidden;">';

  if (criticos.length) {
    html += `<div style="background:#f7edee;border-left:3px solid #7A2E2E;padding:14px 16px;">
      <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.62rem;letter-spacing:0.16em;text-transform:uppercase;color:#7A2E2E;margin-bottom:8px;">Atenção clínica</p>
      ${criticos.map(a => `<p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:#6B2020;margin-bottom:4px;line-height:1.5;">⚠ ${a.msg}</p>`).join('')}
    </div>`;
  }

  if (obrigat.length) {
    html += `<div style="background:#f7f0e0;border-left:3px solid #B8860B;padding:14px 16px;${criticos.length ? 'border-top:1px solid rgba(184,147,106,0.2);' : ''}">
      <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.62rem;letter-spacing:0.16em;text-transform:uppercase;color:#7A5E00;margin-bottom:8px;">Exames recomendados</p>
      ${obrigat.map(a => `<p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:#5C4A00;margin-bottom:4px;line-height:1.5;">→ ${a.msg}</p>`).join('')}
    </div>`;
  }

  if (condutas.length) {
    html += `<div style="background:#edf4f0;border-left:3px solid #3D6B4F;padding:14px 16px;border-top:1px solid rgba(184,147,106,0.2);">
      <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.62rem;letter-spacing:0.16em;text-transform:uppercase;color:#2E5E3A;margin-bottom:8px;">Condutas sugeridas</p>
      ${condutas.map(a => `<p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:#2E5E3A;margin-bottom:4px;line-height:1.5;">✓ ${a.msg}</p>`).join('')}
    </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
  container.style.display = '';
}

window.triggerAlertasClinicos = triggerAlertasClinicos;

// ── Alertas por resultado de exame ─────────────────────────
function gerarAlertasExames() {
  const container = document.getElementById('alertas-exames');
  if (!container) return;

  const alertas = [];

  Object.entries(ALERTAS_EXAMES).forEach(([id, regras]) => {
    const val = parseFloat(document.getElementById(id)?.value);
    if (isNaN(val)) return;

    if (regras.muito_alto && val >= regras.muito_alto.limiar)
      alertas.push({ ...regras.muito_alto, exame: id });
    else if (regras.alto && val >= regras.alto.limiar)
      alertas.push({ ...regras.alto, exame: id });

    if (regras.muito_baixo && val < regras.muito_baixo.limiar)
      alertas.push({ ...regras.muito_baixo, exame: id });
    else if (regras.baixo && val < regras.baixo.limiar)
      alertas.push({ ...regras.baixo, exame: id });
  });

  if (!alertas.length) { container.style.display = 'none'; return; }

  const criticos = alertas.filter(a => a.tipo === 'critico');
  const atencao  = alertas.filter(a => a.tipo === 'atencao');

  container.innerHTML = `
    <div style="border:1px solid var(--detail);overflow:hidden;margin-bottom:20px;">
      ${criticos.length ? `<div style="background:#f7edee;border-left:3px solid #7A2E2E;padding:14px 16px;">
        <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.62rem;letter-spacing:0.16em;text-transform:uppercase;color:#7A2E2E;margin-bottom:8px;">Resultados críticos</p>
        ${criticos.map(a => `<p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:#6B2020;margin-bottom:4px;line-height:1.5;">⚠ ${a.msg}</p>`).join('')}
      </div>` : ''}
      ${atencao.length ? `<div style="background:#f7f0e0;border-left:3px solid #B8860B;padding:14px 16px;${criticos.length ? 'border-top:1px solid rgba(184,147,106,0.2);' : ''}">
        <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.62rem;letter-spacing:0.16em;text-transform:uppercase;color:#7A5E00;margin-bottom:8px;">Resultados a observar</p>
        ${atencao.map(a => `<p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:#5C4A00;margin-bottom:4px;line-height:1.5;">→ ${a.msg}</p>`).join('')}
      </div>` : ''}
    </div>`;
  container.style.display = '';
}

window.gerarAlertasExames = gerarAlertasExames;

// ── Validação de meta de peso ──────────────────────────────
function validarMeta() {
  const pesoAtual = parseFloat(document.getElementById('peso_atual')?.value);
  const pesoMeta  = parseFloat(document.getElementById('peso_meta')?.value);
  const prazo     = document.getElementById('prazo_meta')?.value || '';
  const alertEl   = document.getElementById('alerta-meta');
  if (!alertEl) return;

  if (pesoAtual && pesoMeta) {
    const diff = pesoAtual - pesoMeta;
    if (diff > 0 && prazo) {
      // Tenta estimar semanas
      const meses = parseFloat(prazo.match(/(\d+)/)?.[1] || 0);
      const semanas = meses * 4.3;
      if (semanas > 0) {
        const kgSemana = diff / semanas;
        if (kgSemana > 1) {
          alertEl.textContent = `⚠ Meta de ${diff.toFixed(1)} kg em ${meses} meses = ${kgSemana.toFixed(1)} kg/semana. Acima de 1 kg/semana é contraindicado — risco de perda de massa muscular. Recomendado: 0,5 kg/semana.`;
          alertEl.style.display = '';
          return;
        }
      }
    }
  }
  alertEl.style.display = 'none';
}

window.validarMeta = validarMeta;

// Conecta validação de meta nos campos relevantes
document.addEventListener('DOMContentLoaded', () => {
  ['peso_atual','peso_meta','prazo_meta'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', validarMeta);
  });

  // Conecta alertas de exames
  Object.keys(ALERTAS_EXAMES).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', gerarAlertasExames);
  });
});
