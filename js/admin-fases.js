// ============================================================
// admin-fases.js — Gestão do plano de fases por paciente
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';
const ADMIN_EMAIL   = 'evelinbeatrizrb@outlook.com';

function isAdminUser(user) {
  return user?.user_metadata?.role === 'admin' || user?.email === ADMIN_EMAIL;
}

const supabase  = createClient(SUPABASE_URL, SUPABASE_ANON);
let patientId   = null;
let patientUserId = null;
let patientNome = null;
let fasesCache  = [];

document.addEventListener('DOMContentLoaded', async () => {
  await checkAdmin();
  loadFromUrl();
  initForm();
  initSidebar();
});

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !isAdminUser(session.user)) window.location.href = 'index.html';
}

function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  // Aceita ambos os nomes (o admin.js usa 'patient_id'/'user_id' em alguns lugares)
  patientId     = params.get('patient') || params.get('patient_id');
  patientUserId = params.get('user')    || params.get('user_id');
  patientNome   = decodeURIComponent(params.get('nome') || '');

  document.getElementById('patient-nome-sidebar').textContent = patientNome.split(' ')[0] || '—';
  document.getElementById('patient-nome-title').textContent   = patientNome;
  document.getElementById('fase-form-title').textContent      = patientNome;

  if (patientId) loadFases();
}

// ── Lista de fases ────────────────────────────────────────
async function loadFases() {
  const { data, error } = await supabase
    .from('fases')
    .select('*')
    .eq('patient_id', patientId)
    .order('ordem', { ascending: true });

  fasesCache = data || [];
  renderFasesLista(fasesCache);
}

function renderFasesLista(fases) {
  const wrapper = document.getElementById('fases-lista-wrapper');

  if (fases.length === 0) {
    wrapper.innerHTML = `
      <div style="text-align:center;padding:48px 24px;border:1px dashed var(--detail);">
        <p style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:300;color:var(--text);margin-bottom:8px;">Nenhuma fase cadastrada</p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.8rem;color:var(--text-light);margin-bottom:20px;">Crie a primeira fase do plano de periodização nutricional</p>
        <button class="btn-primary" onclick="showView('nova')" style="width:auto;padding:14px 28px;">Criar primeira fase</button>
      </div>`;
    return;
  }

  // KPIs gerais
  const progresso = document.getElementById('progresso-geral');
  const kpisEl    = document.getElementById('kpis-fases');
  if (progresso && kpisEl) {
    const ativas    = fases.filter(f => f.status === 'ativa').length;
    const concluidas= fases.filter(f => f.status === 'concluida').length;
    const semTotal  = fases.reduce((s, f) => s + (f.duracao_semanas || 0), 0);
    const semConc   = fases.filter(f => f.status === 'concluida').reduce((s,f) => s + (f.duracao_semanas||0), 0);
    kpisEl.innerHTML = [
      { label: 'Total de fases', valor: fases.length },
      { label: 'Fase ativa',     valor: ativas || '—' },
      { label: 'Concluídas',     valor: concluidas },
      { label: 'Semanas totais', valor: semTotal || '—' },
    ].map(k => `
      <div style="text-align:center;padding:12px;border:1px solid rgba(184,147,106,0.2);background:var(--bg-primary);">
        <p style="font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:300;color:var(--text);">${k.valor}</p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--subtitle);margin-top:4px;">${k.label}</p>
      </div>`).join('');
    progresso.style.display = '';
  }

  const STATUS = {
    planejada: { label: 'Planejada', cor: 'var(--detail)',   bg: 'rgba(184,147,106,0.12)' },
    ativa:     { label: 'Ativa',     cor: '#3D6B4F',         bg: 'rgba(61,107,79,0.12)'   },
    concluida: { label: 'Concluída', cor: 'var(--subtitle)', bg: 'rgba(122,94,66,0.1)'    },
    pausada:   { label: 'Pausada',   cor: '#8B5E3C',         bg: 'rgba(139,94,60,0.1)'    },
    pendente:  { label: 'Planejada', cor: 'var(--detail)',   bg: 'rgba(184,147,106,0.12)' },
  };

  const TIPO = {
    adaptacao:       'Adaptação',
    deficit_leve:    'Déficit leve',
    deficit_moderado:'Déficit moderado',
    deficit_intenso: 'Déficit intenso',
    recomposicao:    'Recomposição',
    manutencao:      'Manutenção',
    ganho_massa:     'Ganho de massa',
    ajuste_metabolico:'Ajuste metabólico',
  };

  // Timeline visual
  wrapper.innerHTML = `
    <div style="position:relative;">
      <!-- Linha vertical da timeline -->
      <div style="position:absolute;left:28px;top:24px;bottom:24px;width:1px;background:rgba(184,147,106,0.3);z-index:0;"></div>

      <div style="display:flex;flex-direction:column;gap:0;">
        ${fases.map((f, i) => {
          const st = STATUS[f.status] || STATUS.planejada;
          const tipo = TIPO[f.tipo] || '';
          const cal  = f.calorias_alvo ? f.calorias_alvo + ' kcal' : '';
          const dur  = f.duracao_semanas ? f.duracao_semanas + ' sem' : '';
          const metaPeso = f.meta_peso_diff ? (f.meta_peso_diff > 0 ? '+' : '') + f.meta_peso_diff + ' kg' : '';
          return `
          <div style="display:flex;gap:16px;padding:16px 0;position:relative;z-index:1;">

            <!-- Círculo da timeline -->
            <div style="width:56px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;">
              <div style="width:40px;height:40px;border-radius:50%;border:2px solid ${st.cor};background:var(--bg-primary);
                          display:flex;align-items:center;justify-content:center;">
                ${f.status === 'concluida'
                  ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${st.cor}" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
                  : f.status === 'ativa'
                    ? `<div style="width:10px;height:10px;border-radius:50%;background:${st.cor};"></div>`
                    : `<span style="font-family:'DM Sans',sans-serif;font-size:0.7rem;color:${st.cor};font-weight:500;">${i+1}</span>`
                }
              </div>
            </div>

            <!-- Card da fase -->
            <div style="flex:1;border:1px solid ${f.status === 'ativa' ? st.cor : 'var(--detail)'};
                        background:var(--bg-primary);padding:20px;
                        ${f.status === 'ativa' ? 'border-left:3px solid ' + st.cor + ';' : ''}">

              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                    <span style="font-family:'Cormorant Garamond',serif;font-size:1.05rem;color:var(--text);font-weight:300;">${f.nome}</span>
                    <span style="font-family:'DM Sans',sans-serif;font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;
                                 padding:3px 8px;background:${st.bg};color:${st.cor};">${st.label}</span>
                    ${tipo ? `<span style="font-family:'DM Sans',sans-serif;font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;
                               padding:3px 8px;background:rgba(184,147,106,0.08);color:var(--subtitle);">${tipo}</span>` : ''}
                  </div>
                  ${f.objetivo_clinico || f.objetivo ? `<p style="font-family:'DM Sans',sans-serif;font-size:0.75rem;color:var(--text-light);margin-bottom:8px;">${f.objetivo_clinico || f.objetivo}</p>` : ''}
                  <div style="display:flex;gap:16px;flex-wrap:wrap;">
                    ${dur ? `<span style="font-family:'DM Sans',sans-serif;font-size:0.72rem;color:var(--text-light);">${dur}</span>` : ''}
                    ${cal ? `<span style="font-family:'DM Sans',sans-serif;font-size:0.72rem;color:var(--text-light);">${cal}</span>` : ''}
                    ${metaPeso ? `<span style="font-family:'DM Sans',sans-serif;font-size:0.72rem;color:var(--text-light);">Meta: ${metaPeso}</span>` : ''}
                  </div>
                </div>
                <div style="display:flex;gap:8px;flex-shrink:0;">
                  <button onclick="editarFase('${f.id}')"
                    style="font-family:'DM Sans',sans-serif;font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;
                           color:var(--text-light);background:none;border:1px solid var(--detail);padding:6px 14px;cursor:pointer;transition:all 0.15s;"
                    onmouseover="this.style.color='var(--text)';this.style.borderColor='var(--subtitle)'"
                    onmouseout="this.style.color='var(--text-light)';this.style.borderColor='var(--detail)'">
                    Editar
                  </button>
                  <button onclick="deletarFase('${f.id}')"
                    style="font-family:'DM Sans',sans-serif;font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;
                           color:var(--error);background:none;border:1px solid rgba(122,46,46,0.2);padding:6px 14px;cursor:pointer;">
                    Remover
                  </button>
                </div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ── Navegação views ───────────────────────────────────────
function showView(view) {
  document.getElementById('view-lista').style.display = view === 'lista' ? '' : 'none';
  document.getElementById('view-nova').style.display  = view === 'nova'  ? '' : 'none';
  if (view === 'lista') loadFases();
  if (view === 'nova') resetForm();
}
window.showView = showView;

// ── Formulário ────────────────────────────────────────────
function resetForm() {
  document.getElementById('fase-form').reset();
  document.getElementById('fase-id').value = '';
  document.getElementById('fase-form-label').textContent = 'Nova fase para';
  document.getElementById('fase-submit-btn').textContent = 'Salvar Fase';
  document.getElementById('fase-form-message').className = 'form-message';

  // Sugere a próxima ordem
  const proximaOrdem = fasesCache.length + 1;
  document.getElementById('f-ordem').value = proximaOrdem;
}

function editarFase(id) {
  const f = fasesCache.find(x => x.id === id);
  if (!f) return;
  showView('nova');

  document.getElementById('fase-form-label').textContent = 'Editar fase de';
  document.getElementById('fase-submit-btn').textContent = 'Salvar Alterações';
  document.getElementById('fase-id').value     = f.id;
  document.getElementById('f-ordem').value     = f.ordem;
  document.getElementById('f-nome').value      = f.nome || '';
  document.getElementById('f-status').value    = f.status || 'pendente';
  document.getElementById('f-duracao').value   = f.duracao_semanas || '';
  document.getElementById('f-inicio').value    = f.data_inicio || '';
  document.getElementById('f-fim').value       = f.data_fim || '';
  document.getElementById('f-objetivo').value  = f.objetivo || '';
  document.getElementById('f-descricao').value = f.descricao || '';
  document.getElementById('f-calorias').value  = f.calorias_alvo || '';
  document.getElementById('f-proteina').value  = f.proteina_alvo || '';
  document.getElementById('f-carboidrato').value = f.carboidrato_alvo || '';
  document.getElementById('f-gordura').value   = f.gordura_alvo || '';

  // Arrays → texto
  document.getElementById('f-dicas').value      = Array.isArray(f.dicas) ? f.dicas.join('\n') : (f.dicas || '');
  document.getElementById('f-restricoes').value = Array.isArray(f.restricoes) ? f.restricoes.join(', ') : (f.restricoes || '');
  document.getElementById('f-permitidos').value = Array.isArray(f.permitidos) ? f.permitidos.join(', ') : (f.permitidos || '');
}

window.editarFase = editarFase;

async function deletarFase(id) {
  if (!confirm('Remover esta fase do plano?')) return;
  await supabase.from('fases').delete().eq('id', id);
  showToast('Fase removida.');
  loadFases();
}
window.deletarFase = deletarFase;

function initForm() {
  document.getElementById('fase-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('fase-submit-btn');
    const msg = document.getElementById('fase-form-message');
    btn.disabled = true; btn.textContent = 'Salvando...';

    const v    = (id) => { const el = document.getElementById(id); return el?.value?.trim() || null; };
    const vInt = (id) => { const val = v(id); return val ? parseInt(val) : null; };

    const dicasRaw      = v('f-dicas');
    const restricoesRaw = v('f-restricoes');
    const permitidosRaw = v('f-permitidos');

    const payload = {
      patient_id:       patientId,
      user_id:          patientUserId,
      ordem:            vInt('f-ordem') || 1,
      nome:             v('f-nome'),
      status:           v('f-status') || 'pendente',
      duracao_semanas:  vInt('f-duracao'),
      data_inicio:      v('f-inicio'),
      data_fim:         v('f-fim'),
      objetivo:         v('f-objetivo'),
      descricao:        v('f-descricao'),
      calorias_alvo:    vInt('f-calorias'),
      proteina_alvo:    vInt('f-proteina'),
      carboidrato_alvo: vInt('f-carboidrato'),
      gordura_alvo:     vInt('f-gordura'),
      dicas:            dicasRaw ? dicasRaw.split('\n').map(s => s.trim()).filter(Boolean) : null,
      restricoes:       restricoesRaw ? restricoesRaw.split(',').map(s => s.trim()).filter(Boolean) : null,
      permitidos:       permitidosRaw ? permitidosRaw.split(',').map(s => s.trim()).filter(Boolean) : null,
    };

    const faseId = v('fase-id');
    let error;

    if (faseId) {
      ({ error } = await supabase.from('fases').update(payload).eq('id', faseId));
    } else {
      ({ error } = await supabase.from('fases').insert(payload));
    }

    if (error) {
      msg.textContent = 'Erro: ' + error.message;
      msg.className   = 'form-message error visible';
      btn.disabled = false; btn.textContent = faseId ? 'Salvar Alterações' : 'Salvar Fase';
      return;
    }

    showToast(faseId ? 'Fase atualizada.' : 'Fase criada.');
    showView('lista');
    btn.disabled = false;
  });
}

// ── Utilitários ───────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 3000);
}

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btn     = document.getElementById('hamburger-btn');
  if (!btn) return;
  btn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
  overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
}


// ── Widget de documentos ───────────────────────────────────
import { initDocExtractor, preencherFormulario } from './doc-extractor.js';

document.addEventListener('DOMContentLoaded', () => {
  // 'antropometria' é o tipo padrão mais útil para fases (peso/IMC/composição)
  initDocExtractor('doc-extractor-fases', 'antropometria', (dados, tipo, n) => {
    const msg = n > 0
      ? `${n} campo(s) preenchido(s). Revise e salve.`
      : 'Preencha os campos acima e clique em "Preencher formulário".';
    if (typeof showToast === 'function') showToast(msg);
  });
});

// ══════════════════════════════════════════════════════════════
// INTELIGÊNCIA CLÍNICA — Fases
// ══════════════════════════════════════════════════════════════

// Templates de fase
const TEMPLATES = {
  emagrecimento: {
    tipo: 'deficit_moderado', foco: 'gordura', duracao: 8, ritmo: '0.5',
    nome: 'Fase de Emagrecimento',
    objetivo_clinico: 'Déficit calórico de 500 kcal preservando massa muscular',
    descricao: 'Foco em criar hábitos alimentares sustentáveis com déficit energético controlado. Você vai aprender a comer bem e perder gordura sem passar fome.',
    dicas: 'Inicie cada refeição pelos vegetais\nPrefira proteínas magras\nBeba água antes das refeições\nNão pule refeições',
    permitidos: 'Proteínas magras, vegetais, legumes, frutas, leguminosas, cereais integrais',
    restricoes: 'Açúcar refinado, ultraprocessados, frituras, bebidas alcoólicas, sucos industrializados',
    meta_adesao: 80,
  },
  recomposicao: {
    tipo: 'recomposicao', foco: 'massa_magra', duracao: 12, ritmo: '0.5',
    nome: 'Fase de Recomposição Corporal',
    objetivo_clinico: 'Manutenção calórica com alto teor proteico para preservar e ganhar massa magra enquanto perde gordura',
    descricao: 'Fase de transformação — o objetivo é remodelar a composição corporal, perdendo gordura e ganhando músculo simultaneamente.',
    dicas: 'Proteína em todas as refeições\nTreino de força 3–4x/semana\nHidratação adequada\nSono de qualidade (reconstrução muscular)',
    permitidos: 'Proteínas magras (frango, peixe, ovos, leguminosas), vegetais, frutas, gorduras boas',
    restricoes: 'Açúcar, ultraprocessados, álcool, carboidratos simples em excesso',
    meta_adesao: 85, meta_treinos: 4,
  },
  manutencao: {
    tipo: 'manutencao', foco: 'comportamento', duracao: 12,
    nome: 'Fase de Manutenção',
    objetivo_clinico: 'Estabilização do peso e manutenção dos resultados com flexibilidade alimentar',
    descricao: 'Você chegou ao seu objetivo — agora é hora de manter. Esta fase foca em sustentar os hábitos conquistados com equilíbrio.',
    dicas: 'Continue com a estrutura de refeições\nAllow-se celebrações sem culpa\nMonitore o peso semanalmente\nMantenha o movimento',
    permitidos: 'Alimentação equilibrada e variada — flexibilidade com moderação',
    restricoes: 'Evitar retorno a padrões anteriores de excesso',
    meta_adesao: 75,
  },
  adaptacao: {
    tipo: 'adaptacao', foco: 'comportamento', duracao: 4,
    nome: 'Fase de Adaptação Inicial',
    objetivo_clinico: 'Ajuste do padrão alimentar atual, identificação de gatilhos e estabelecimento de rotina',
    descricao: 'Fase inicial de adaptação — sem restrições drásticas. Foco em criar estrutura, regularidade e entender seus hábitos.',
    dicas: 'Faça as refeições em horários regulares\nRegistre o que come no diário\nBeba água ao longo do dia\nDurma pelo menos 7 horas',
    permitidos: 'Alimentação habitual com pequenas melhorias graduais',
    restricoes: 'Nenhuma restrição severa nesta fase — foco em regularidade',
    meta_adesao: 70,
  },
};

function aplicarTemplate(tipo) {
  const t = TEMPLATES[tipo];
  if (!t) return;

  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };

  set('f-tipo',           t.tipo);
  set('f-foco',           t.foco);
  set('f-duracao',        t.duracao);
  set('f-nome',           t.nome);
  set('f-objetivo-clinico', t.objetivo_clinico);
  set('f-descricao',      t.descricao);
  set('f-dicas',          t.dicas);
  set('f-permitidos',     t.permitidos);
  set('f-restricoes',     t.restricoes);
  if (t.ritmo)       set('f-ritmo',       t.ritmo);
  if (t.meta_adesao) set('f-meta-adesao', t.meta_adesao);
  if (t.meta_treinos)set('f-meta-treinos',t.meta_treinos);

  sugerirMacros();
  contarDicas();
  showToast('Template aplicado. Ajuste os campos conforme necessário.');
}
window.aplicarTemplate = aplicarTemplate;

// Sugestão automática de macros por tipo
function sugerirMacros() {
  const tipo = document.getElementById('f-tipo')?.value;
  if (!tipo) return;

  // Busca TMB do paciente (se disponível)
  const tmb = parseInt(localStorage.getItem('pac_tmb') || '0') || 0;
  const get  = parseFloat(tmb > 0 ? tmb * 1.4 : 1800); // estimativa

  const sugestoes = {
    deficit_leve:     { kcal: Math.round(get - 250), ptn: 140, cho: 180, lip: 60 },
    deficit_moderado: { kcal: Math.round(get - 500), ptn: 145, cho: 160, lip: 55 },
    deficit_intenso:  { kcal: Math.round(get - 750), ptn: 150, cho: 130, lip: 50 },
    recomposicao:     { kcal: Math.round(get),       ptn: 165, cho: 175, lip: 65 },
    manutencao:       { kcal: Math.round(get),       ptn: 120, cho: 200, lip: 70 },
    ganho_massa:      { kcal: Math.round(get + 300), ptn: 160, cho: 240, lip: 75 },
    adaptacao:        { kcal: Math.round(get - 200), ptn: 120, cho: 190, lip: 65 },
    ajuste_metabolico:{ kcal: Math.round(get - 300), ptn: 130, cho: 160, lip: 60 },
  };

  const s = sugestoes[tipo];
  if (!s) return;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('f-calorias',    s.kcal);
  set('f-proteina',    s.ptn);
  set('f-carboidrato', s.cho);
  set('f-gordura',     s.lip);

  calcularProporcaoMacros();
  showToast('Macros sugeridos automaticamente. Ajuste conforme necessário.');
}
window.sugerirMacros = sugerirMacros;

// Proporção de macros em tempo real
function calcularProporcaoMacros() {
  const ptn = parseFloat(document.getElementById('f-proteina')?.value)    || 0;
  const cho = parseFloat(document.getElementById('f-carboidrato')?.value)  || 0;
  const lip = parseFloat(document.getElementById('f-gordura')?.value)      || 0;
  const kcal= parseFloat(document.getElementById('f-calorias')?.value)     || 0;

  const proporcao = document.getElementById('proporcao-macros');
  if (!proporcao) return;

  const total = (ptn*4) + (cho*4) + (lip*9);
  if (total < 100) { proporcao.style.display = 'none'; return; }

  proporcao.style.display = '';
  const pp = Math.round((ptn*4/total)*100);
  const pc = Math.round((cho*4/total)*100);
  const pl = Math.round((lip*9/total)*100);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val + '%'; };
  set('pct-ptn', pp); set('pct-cho', pc); set('pct-lip', pl);

  const barras = document.getElementById('barras-macro');
  if (barras) {
    barras.innerHTML = `
      <div style="width:${pp}%;background:#3A5E8B;height:100%;transition:width 0.5s;"></div>
      <div style="width:${pc}%;background:#8B5E3C;height:100%;transition:width 0.5s;"></div>
      <div style="width:${pl}%;background:#4a7c5f;height:100%;transition:width 0.5s;"></div>`;
  }

  // Alerta de proteína baixa
  const alertaMacros = document.getElementById('alerta-macros');
  if (alertaMacros) {
    if (ptn > 0 && pp < 20) {
      alertaMacros.textContent = '⚠ Proteína abaixo de 20% — risco de perda de massa muscular. Recomendado: 25–35%.';
      alertaMacros.style.display = '';
    } else if (kcal > 0 && total > 0 && Math.abs(kcal - total) > 100) {
      alertaMacros.textContent = `⚠ Calorias declaradas (${kcal} kcal) divergem do total calculado pelos macros (${Math.round(total)} kcal).`;
      alertaMacros.style.display = '';
    } else {
      alertaMacros.style.display = 'none';
    }
  }
}
window.calcularProporcaoMacros = calcularProporcaoMacros;

// Calcula data de fim a partir de início + duração
function calcularFimFase() {
  const inicio  = document.getElementById('f-inicio')?.value;
  const duracao = parseInt(document.getElementById('f-duracao')?.value);
  const fimEl   = document.getElementById('f-fim');
  if (!inicio || !duracao || !fimEl) return;

  const dt = new Date(inicio);
  dt.setDate(dt.getDate() + duracao * 7);
  fimEl.value = dt.toISOString().split('T')[0];
}
window.calcularFimFase = calcularFimFase;

// Validação de meta da fase
function validarMetaFase() {
  const metaPeso = parseFloat(document.getElementById('f-meta-peso')?.value);
  const duracao  = parseInt(document.getElementById('f-duracao')?.value);
  const alertaEl = document.getElementById('alerta-meta-fase');
  const previewEl= document.getElementById('preview-ritmo');
  const previewTxt=document.getElementById('preview-ritmo-texto');
  if (!alertaEl || !previewEl) return;

  if (!isNaN(metaPeso) && !isNaN(duracao) && duracao > 0) {
    const diff = Math.abs(metaPeso);
    const ritmo = diff / duracao;
    previewEl.style.display = '';

    if (ritmo > 1) {
      alertaEl.textContent = `⚠ Meta de ${diff} kg em ${duracao} semanas = ${ritmo.toFixed(2)} kg/semana — acima do limite seguro (1 kg/sem). Risco de perda de massa muscular.`;
      alertaEl.style.display = '';
    } else {
      alertaEl.style.display = 'none';
    }

    if (previewTxt) {
      previewTxt.innerHTML = `
        ${diff} kg em ${duracao} semanas = <strong>${ritmo.toFixed(2)} kg/semana</strong>
        <br>Déficit necessário: ~${Math.round(ritmo * 7000 / 7)} kcal/dia
        <br>Classificação: ${ritmo <= 0.25 ? 'Lento (conservador)' : ritmo <= 0.5 ? 'Moderado (ideal)' : ritmo <= 0.75 ? 'Ativo (viável)' : ritmo <= 1 ? 'Intenso (monitorar)' : '⚠ Acima do seguro'}`;
    }
  } else {
    previewEl.style.display = 'none';
    alertaEl.style.display = 'none';
  }
}
window.validarMetaFase = validarMetaFase;

// Contador de dicas
function contarDicas() {
  const el = document.getElementById('f-dicas');
  const contador = document.getElementById('dicas-contador');
  if (!el || !contador) return;
  const n = el.value.split('\n').filter(l => l.trim()).length;
  contador.textContent = `${n} / 5 dicas`;
  contador.style.color = n > 5 ? 'var(--error)' : 'var(--text-light)';
}
window.contarDicas = contarDicas;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('f-dicas')?.addEventListener('input', contarDicas);
});


// ══════════════════════════════════════════════════════════════
// GERADOR AUTOMÁTICO DE PLANO DE PERIODIZAÇÃO
// Cria todas as fases de uma vez a partir do objetivo + dados básicos
// ══════════════════════════════════════════════════════════════

// ── Lógica pura: gera array de fases baseado nos inputs ───
function gerarFasesPeriodizacao({ objetivo, pesoAtual, pesoMeta, nivelAtividade, dataInicio }) {
  const tmb = parseInt(localStorage.getItem('pac_tmb') || '0') || 1700;
  const FATOR = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725 };
  const get   = Math.round(tmb * (FATOR[nivelAtividade] || 1.4));

  // Helper: avança data por N semanas
  let cursor = new Date(dataInicio || new Date());
  const avancaSemanas = (n) => cursor.setDate(cursor.getDate() + n * 7);
  const dataStr = () => new Date(cursor).toISOString().split('T')[0];

  const fases = [];
  let ordem = fasesCache.length + 1; // continua após fases existentes

  if (objetivo === 'emagrecimento') {
    const diff   = Math.max(0.5, pesoAtual - pesoMeta);
    const ritmo  = diff <= 4 ? 0.5 : 0.75;
    const semsAtivo = Math.min(Math.ceil(diff / ritmo), 12);

    // Fase 1 — Adaptação (2 semanas, sempre)
    const f1Ini = dataStr(); avancaSemanas(2);
    fases.push({
      ordem: ordem++, nome: 'Fase 1 — Adaptação', tipo: 'adaptacao', status: 'planejada',
      duracao_semanas: 2, data_inicio: f1Ini, data_fim: dataStr(),
      calorias_alvo: get - 200,
      proteina_alvo:    Math.round((get - 200) * 0.28 / 4),
      carboidrato_alvo: Math.round((get - 200) * 0.45 / 4),
      gordura_alvo:     Math.round((get - 200) * 0.27 / 9),
      objetivo: 'Adaptação alimentar sem restrições severas — regularidade e autoconhecimento',
      descricao: 'Fase inicial sem déficit agressivo. Foco em horários de refeição, diário alimentar e hidratação.',
      dicas: ['Faça refeições em horários fixos', 'Registre no diário alimentar', 'Beba 2L de água/dia', 'Durma pelo menos 7h'],
    });

    // Fase 2 — Déficit calórico principal
    const tipoDeficit = ritmo >= 0.75 ? 'deficit_moderado' : 'deficit_leve';
    const kcalDef = ritmo >= 0.75 ? get - 500 : get - 350;
    const f2Ini = dataStr(); avancaSemanas(semsAtivo);
    fases.push({
      ordem: ordem++, nome: 'Fase 2 — Déficit Calórico', tipo: tipoDeficit, status: 'planejada',
      duracao_semanas: semsAtivo, data_inicio: f2Ini, data_fim: dataStr(),
      calorias_alvo: kcalDef,
      proteina_alvo:    Math.round(kcalDef * 0.32 / 4),
      carboidrato_alvo: Math.round(kcalDef * 0.40 / 4),
      gordura_alvo:     Math.round(kcalDef * 0.28 / 9),
      meta_peso_diff: -parseFloat((ritmo * semsAtivo).toFixed(1)),
      objetivo: `Déficit de ~${get - kcalDef} kcal/dia — meta de ${ritmo} kg/semana`,
      descricao: 'Fase principal de perda de gordura com alto teor proteico para preservação de massa muscular.',
      dicas: ['Proteína em todas as refeições', 'Não pule o café da manhã', 'Pese-se toda segunda-feira', 'Priorize sono para reduzir cortisol'],
      restricoes: ['Açúcar refinado', 'Ultraprocessados', 'Frituras', 'Álcool'],
      permitidos: ['Proteínas magras', 'Vegetais', 'Leguminosas', 'Cereais integrais', 'Frutas in natura'],
    });

    // Fase 3 — Ajuste metabólico (só se a perda total > 5kg — planos longos)
    if (diff > 5) {
      const f3Ini = dataStr(); avancaSemanas(3);
      fases.push({
        ordem: ordem++, nome: 'Fase 3 — Ajuste Metabólico', tipo: 'ajuste_metabolico', status: 'planejada',
        duracao_semanas: 3, data_inicio: f3Ini, data_fim: dataStr(),
        calorias_alvo: get - 150,
        proteina_alvo:    Math.round((get - 150) * 0.30 / 4),
        carboidrato_alvo: Math.round((get - 150) * 0.43 / 4),
        gordura_alvo:     Math.round((get - 150) * 0.27 / 9),
        objetivo: 'Pausa estratégica para recuperar metabolismo e prevenir adaptação excessiva',
        descricao: 'Redução temporária do déficit para reinicializar o metabolismo. Fundamental em planos acima de 8 semanas.',
        dicas: ['Mantenha estrutura das refeições', 'Foco na qualidade do sono', 'Continue os treinos normalmente'],
      });
    }

    // Fase final — Manutenção (sempre)
    const fMIni = dataStr(); avancaSemanas(8);
    fases.push({
      ordem: ordem++, nome: `Fase ${fases.length + 1} — Manutenção`, tipo: 'manutencao', status: 'planejada',
      duracao_semanas: 8, data_inicio: fMIni, data_fim: dataStr(),
      calorias_alvo: get,
      proteina_alvo:    Math.round(get * 0.25 / 4),
      carboidrato_alvo: Math.round(get * 0.45 / 4),
      gordura_alvo:     Math.round(get * 0.30 / 9),
      objetivo: 'Estabilização do peso e consolidação dos hábitos alimentares saudáveis',
      descricao: 'Transição para manutenção com flexibilidade alimentar. Foco em sustentabilidade a longo prazo.',
      dicas: ['Mantenha estrutura de refeições', 'Pese-se semanalmente', 'Celebrações com equilíbrio — sem culpa'],
    });

  } else if (objetivo === 'recomposicao') {
    const f1Ini = dataStr(); avancaSemanas(4);
    fases.push({
      ordem: ordem++, nome: 'Fase 1 — Adaptação Proteica', tipo: 'adaptacao', status: 'planejada',
      duracao_semanas: 4, data_inicio: f1Ini, data_fim: dataStr(),
      calorias_alvo: get - 100,
      proteina_alvo: Math.round(pesoAtual * 1.8), carboidrato_alvo: Math.round(get * 0.40 / 4),
      gordura_alvo: Math.round(get * 0.28 / 9),
      objetivo: 'Aumentar gradualmente aporte proteico e estabelecer rotina de treino',
    });
    const f2Ini = dataStr(); avancaSemanas(12);
    fases.push({
      ordem: ordem++, nome: 'Fase 2 — Recomposição Corporal', tipo: 'recomposicao', status: 'planejada',
      duracao_semanas: 12, data_inicio: f2Ini, data_fim: dataStr(),
      calorias_alvo: get,
      proteina_alvo: Math.round(pesoAtual * 2.0), carboidrato_alvo: Math.round(get * 0.40 / 4),
      gordura_alvo: Math.round(get * 0.27 / 9),
      objetivo: 'Manutenção calórica com alto proteico — perder gordura e ganhar músculo simultaneamente',
      dicas: ['Proteína a cada 3–4h', 'Treino de força 3–4x/semana', 'Sono de qualidade para recuperação muscular'],
    });
    const f3Ini = dataStr(); avancaSemanas(8);
    fases.push({
      ordem: ordem++, nome: 'Fase 3 — Consolidação', tipo: 'manutencao', status: 'planejada',
      duracao_semanas: 8, data_inicio: f3Ini, data_fim: dataStr(),
      calorias_alvo: get + 100, proteina_alvo: Math.round(pesoAtual * 1.8),
      objetivo: 'Consolidar composição corporal alcançada com leve superávit para manutenção de massa',
    });

  } else if (objetivo === 'ganho_massa') {
    const f1Ini = dataStr(); avancaSemanas(3);
    fases.push({
      ordem: ordem++, nome: 'Fase 1 — Preparação', tipo: 'adaptacao', status: 'planejada',
      duracao_semanas: 3, data_inicio: f1Ini, data_fim: dataStr(),
      calorias_alvo: get + 100, proteina_alvo: Math.round(pesoAtual * 1.8),
      objetivo: 'Estruturar alimentação para suporte ao treino de força',
    });
    const f2Ini = dataStr(); avancaSemanas(12);
    fases.push({
      ordem: ordem++, nome: 'Fase 2 — Superávit Calórico', tipo: 'ganho_massa', status: 'planejada',
      duracao_semanas: 12, data_inicio: f2Ini, data_fim: dataStr(),
      calorias_alvo: get + 350,
      proteina_alvo: Math.round(pesoAtual * 2.2), carboidrato_alvo: Math.round((get + 350) * 0.48 / 4),
      gordura_alvo: Math.round((get + 350) * 0.25 / 9),
      objetivo: 'Superávit de ~350 kcal/dia com alto proteico para hipertrofia muscular',
      dicas: ['Pré-treino rico em carboidrato', 'Proteína até 2h pós-treino', 'Meta: +0,5–1 kg/mês'],
    });
    const f3Ini = dataStr(); avancaSemanas(6);
    fases.push({
      ordem: ordem++, nome: 'Fase 3 — Manutenção e Definição', tipo: 'recomposicao', status: 'planejada',
      duracao_semanas: 6, data_inicio: f3Ini, data_fim: dataStr(),
      calorias_alvo: get, proteina_alvo: Math.round(pesoAtual * 2.0),
      objetivo: 'Manutenção calórica para consolidar ganho e reduzir gordura acumulada no bulking',
    });

  } else { // manutencao
    const f1Ini = dataStr(); avancaSemanas(12);
    fases.push({
      ordem: ordem++, nome: 'Fase 1 — Manutenção Ativa', tipo: 'manutencao', status: 'planejada',
      duracao_semanas: 12, data_inicio: f1Ini, data_fim: dataStr(),
      calorias_alvo: get, proteina_alvo: Math.round(pesoAtual * 1.6),
      objetivo: 'Estabilização do peso com alimentação equilibrada e sustentável',
    });
  }

  return fases;
}

// ── Preview em tempo real ─────────────────────────────────
function atualizarPreviewGerador() {
  const objetivo   = document.getElementById('gen-objetivo')?.value;
  const pesoAtual  = parseFloat(document.getElementById('gen-peso-atual')?.value);
  const pesoMeta   = parseFloat(document.getElementById('gen-peso-meta')?.value);
  const atividade  = document.getElementById('gen-atividade')?.value;
  const dataInicio = document.getElementById('gen-data-inicio')?.value;
  const preview    = document.getElementById('gen-preview');
  const previewFases = document.getElementById('gen-preview-fases');
  if (!preview || !previewFases) return;

  if (!pesoAtual || !pesoMeta || isNaN(pesoAtual) || isNaN(pesoMeta)) {
    preview.style.display = 'none'; return;
  }

  const fases = gerarFasesPeriodizacao({ objetivo, pesoAtual, pesoMeta, nivelAtividade: atividade, dataInicio });

  const TIPO_LABEL = {
    adaptacao: 'Adaptação', deficit_leve: 'Déficit leve', deficit_moderado: 'Déficit moderado',
    recomposicao: 'Recomposição', manutencao: 'Manutenção', ganho_massa: 'Ganho de massa',
    ajuste_metabolico: 'Ajuste metabólico',
  };

  const semanasTotais = fases.reduce((s, f) => s + (f.duracao_semanas || 0), 0);
  const diff = pesoAtual - pesoMeta;

  previewFases.innerHTML = `
    <p style="font-family:'DM Sans',sans-serif;font-size:0.72rem;color:var(--text-light);margin-bottom:12px;">
      ${fases.length} fases · ${semanasTotais} semanas totais
      ${diff > 0 ? ` · Meta: −${diff.toFixed(1)} kg` : diff < 0 ? ` · Meta: +${Math.abs(diff).toFixed(1)} kg` : ''}
    </p>
    ${fases.map((f, i) => `
      <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(184,147,106,0.1);">
        <div style="width:22px;height:22px;border-radius:50%;border:1px solid var(--detail);
          display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
          <span style="font-family:'DM Sans',sans-serif;font-size:0.58rem;color:var(--subtitle);">${i+1}</span>
        </div>
        <div>
          <p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text);font-weight:500;">${f.nome}</p>
          <p style="font-family:'DM Sans',sans-serif;font-size:0.68rem;color:var(--text-light);margin-top:1px;">
            ${f.duracao_semanas} semanas · ${TIPO_LABEL[f.tipo] || f.tipo}
            ${f.calorias_alvo ? ` · ${f.calorias_alvo} kcal` : ''}
          </p>
        </div>
      </div>`).join('')}`;

  preview.style.display = '';
}
window.atualizarPreviewGerador = atualizarPreviewGerador;

// ── Auto-fill do gerador (busca dados do paciente) ────────
const _MAP_NIVEL_AF = {
  'sedentario':           'sedentario',
  'levemente-ativo':      'leve',
  'leve':                 'leve',
  'moderadamente-ativo':  'moderado',
  'moderado':             'moderado',
  'muito-ativo':          'intenso',
  'extremamente-ativo':   'intenso',
  'intenso':              'intenso',
};
const _MAP_OBJETIVO = {
  'emagrecimento':    'emagrecimento',
  'emagrecer':        'emagrecimento',
  'perder_peso':      'emagrecimento',
  'recomposicao':     'recomposicao',
  'recomposicao_corporal': 'recomposicao',
  'ganho_massa':      'ganho_massa',
  'ganho_de_massa':   'ganho_massa',
  'hipertrofia':      'ganho_massa',
  'manutencao':       'manutencao',
  'performance':      'manutencao',
};

function _calcularIdadeFases(dataNasc) {
  if (!dataNasc) return null;
  const hoje = new Date();
  const nasc = new Date(dataNasc + 'T00:00:00');
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

// Busca todos os dados do paciente em paralelo (patient + última antropometria + anamnese)
async function _carregarDadosPacienteFases() {
  if (!patientId) return null;
  try {
    const [pacRes, antroRes, anamRes] = await Promise.all([
      supabase.from('patients')
        .select('nome, sexo, data_nascimento, peso_atual, altura, objetivo')
        .eq('id', patientId).maybeSingle(),
      supabase.from('antropometria')
        .select('peso, altura, peso_meta, peso_ideal, metabolismo_basal, data_avaliacao')
        .eq('patient_id', patientId)
        .order('data_avaliacao', { ascending: false })
        .limit(1).maybeSingle(),
      supabase.from('anamnese')
        .select('nivel_af, intensidade_af, freq_af')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle(),
    ]);
    const pac   = pacRes.data   || {};
    const antro = antroRes.data || {};
    const anam  = anamRes.data  || {};

    // peso atual: prioriza última antropometria, fallback patient.peso_atual
    const pesoAtual = antro.peso || pac.peso_atual || null;
    // peso meta: peso_meta > peso_ideal (ambos da antropometria)
    const pesoMeta  = antro.peso_meta || antro.peso_ideal || null;
    // altura: antropometria > patient (em metros, converte p/ cm)
    const alturaM   = antro.altura || pac.altura || null;
    const alturaCm  = alturaM ? (alturaM > 3 ? alturaM : alturaM * 100) : null;
    // idade
    const idade     = _calcularIdadeFases(pac.data_nascimento);
    // sexo
    const sexo      = (pac.sexo || 'feminino').toLowerCase();
    // TMB: prioriza valor salvo na antropometria, senão calcula Mifflin-St Jeor
    let tmb = antro.metabolismo_basal || null;
    let tmbOrigem = tmb ? 'antropometria' : null;
    if (!tmb && pesoAtual && alturaCm && idade) {
      tmb = sexo.startsWith('m')
        ? Math.round((10 * pesoAtual) + (6.25 * alturaCm) - (5 * idade) + 5)
        : Math.round((10 * pesoAtual) + (6.25 * alturaCm) - (5 * idade) - 161);
      tmbOrigem = 'calculado';
    }
    // objetivo: anamnese ou patient
    const objetivoRaw = (pac.objetivo || '').toString().toLowerCase().trim();
    const objetivo    = _MAP_OBJETIVO[objetivoRaw] || null;
    // nível atividade: anamnese.nivel_af
    const nivelRaw    = (anam.nivel_af || '').toString().toLowerCase().trim();
    const nivelAtiv   = _MAP_NIVEL_AF[nivelRaw] || null;

    return {
      pesoAtual, pesoMeta, alturaCm, idade, sexo,
      tmb, tmbOrigem,
      objetivo, nivelAtiv,
      temAntropometria: !!antroRes.data,
      temAnamnese:      !!anamRes.data,
    };
  } catch (e) {
    console.warn('[fases] erro carregando dados do paciente:', e);
    return null;
  }
}

// Preenche os campos do modal com os dados do paciente (não sobrescreve o que o usuário já digitou)
async function _autoPreencherCamposGerador() {
  const dados = await _carregarDadosPacienteFases();
  if (!dados) return;

  const setIfEmpty = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return false;
    if (val == null || val === '') return false;
    if (el.value && el.value.trim() !== '') return false; // já preenchido pelo usuário
    el.value = val;
    return true;
  };

  if (dados.objetivo)    setIfEmpty('gen-objetivo',   dados.objetivo);
  if (dados.pesoAtual)   setIfEmpty('gen-peso-atual', dados.pesoAtual);
  if (dados.pesoMeta)    setIfEmpty('gen-peso-meta',  dados.pesoMeta);
  if (dados.nivelAtiv)   setIfEmpty('gen-atividade',  dados.nivelAtiv);

  // Salva TMB no localStorage (gerarFasesPeriodizacao usa de lá)
  if (dados.tmb && dados.tmb > 0) {
    localStorage.setItem('pac_tmb', String(dados.tmb));
  }

  // Atualiza o aviso de TMB com mensagem útil
  const avisoEl = document.getElementById('gen-aviso-tmb');
  if (avisoEl) {
    if (dados.tmb && dados.tmbOrigem === 'antropometria') {
      avisoEl.style.borderLeftColor = '#2D6A56';
      avisoEl.style.background = 'rgba(45,106,86,0.06)';
      avisoEl.style.color = '#1F4D3E';
      avisoEl.textContent = `TMB ${dados.tmb} kcal (da última avaliação antropométrica) — cálculo preciso.`;
      avisoEl.style.display = '';
    } else if (dados.tmb && dados.tmbOrigem === 'calculado') {
      avisoEl.style.borderLeftColor = '#2D6A56';
      avisoEl.style.background = 'rgba(45,106,86,0.06)';
      avisoEl.style.color = '#1F4D3E';
      avisoEl.textContent = `TMB ${dados.tmb} kcal (calculada via Mifflin-St Jeor a partir de peso/altura/idade).`;
      avisoEl.style.display = '';
    } else {
      avisoEl.style.borderLeftColor = '#B8860B';
      avisoEl.style.background = 'rgba(184,134,11,0.06)';
      avisoEl.style.color = '#7A5E00';
      avisoEl.textContent = 'TMB não encontrada — usando estimativa de 1700 kcal. Para cálculo preciso, registre uma avaliação antropométrica primeiro.';
      avisoEl.style.display = '';
    }
  }
}

// ── Modal do gerador ──────────────────────────────────────
async function mostrarGeradorPlano() {
  let modal = document.getElementById('gerador-plano-modal');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'gerador-plano-modal';

    const labelStyle = `font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.14em;
      text-transform:uppercase;color:var(--subtitle);display:block;margin-bottom:6px;font-weight:500;`;
    const inputStyle = `width:100%;padding:10px 14px;border:1px solid var(--detail);
      background:var(--bg-primary);font-family:'DM Sans',sans-serif;font-size:0.8rem;
      color:var(--text);box-sizing:border-box;`;

    modal.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(44,34,24,0.65);z-index:1000;
        display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:var(--bg-primary);border:1px solid var(--detail);
          max-width:500px;width:100%;max-height:90vh;overflow-y:auto;">

          <div style="padding:22px 24px;border-bottom:1px solid rgba(184,147,106,0.2);
            display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
            <div>
              <p style="font-family:'DM Sans',sans-serif;font-size:0.55rem;letter-spacing:0.22em;
                text-transform:uppercase;color:var(--subtitle);margin-bottom:4px;">Automação clínica</p>
              <p style="font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:300;color:var(--text);">
                Gerar Plano de Periodização
              </p>
            </div>
            <button onclick="fecharGeradorPlano()"
              style="background:none;border:none;cursor:pointer;font-size:1.3rem;
                color:var(--text-light);padding:0 4px;line-height:1;flex-shrink:0;">×</button>
          </div>

          <div style="padding:24px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">

              <div style="grid-column:1/-1;">
                <label style="${labelStyle}">Objetivo principal</label>
                <select id="gen-objetivo" onchange="atualizarPreviewGerador()" style="${inputStyle}">
                  <option value="emagrecimento">Emagrecimento</option>
                  <option value="recomposicao">Recomposição corporal</option>
                  <option value="ganho_massa">Ganho de massa muscular</option>
                  <option value="manutencao">Manutenção de peso</option>
                </select>
              </div>

              <div>
                <label style="${labelStyle}">Peso atual (kg)</label>
                <input type="number" id="gen-peso-atual" step="0.1" placeholder="ex: 72.5"
                  oninput="atualizarPreviewGerador()" style="${inputStyle}">
              </div>

              <div>
                <label style="${labelStyle}">Peso meta (kg)</label>
                <input type="number" id="gen-peso-meta" step="0.1" placeholder="ex: 65"
                  oninput="atualizarPreviewGerador()" style="${inputStyle}">
              </div>

              <div>
                <label style="${labelStyle}">Nível de atividade</label>
                <select id="gen-atividade" onchange="atualizarPreviewGerador()" style="${inputStyle}">
                  <option value="sedentario">Sedentário</option>
                  <option value="leve" selected>Leve (1–2x/sem)</option>
                  <option value="moderado">Moderado (3–4x/sem)</option>
                  <option value="intenso">Intenso (5–6x/sem)</option>
                </select>
              </div>

              <div>
                <label style="${labelStyle}">Início do plano</label>
                <input type="date" id="gen-data-inicio" oninput="atualizarPreviewGerador()"
                  style="${inputStyle}">
              </div>

            </div>

            <div id="gen-preview" style="display:none;margin-bottom:18px;padding:16px;
              border:1px solid rgba(184,147,106,0.2);background:var(--bg-secondary);">
              <p style="font-family:'DM Sans',sans-serif;font-size:0.58rem;letter-spacing:0.16em;
                text-transform:uppercase;color:var(--subtitle);margin-bottom:10px;font-weight:500;">Preview do plano</p>
              <div id="gen-preview-fases"></div>
            </div>

            <div id="gen-aviso-tmb" style="display:none;padding:10px 14px;margin-bottom:14px;
              border-left:3px solid #B8860B;background:rgba(184,134,11,0.06);
              font-family:'DM Sans',sans-serif;font-size:0.72rem;color:#7A5E00;line-height:1.5;">
              TMB não encontrada — usando estimativa de 1700 kcal.
              Para cálculo preciso, registre uma avaliação antropométrica primeiro.
            </div>

            <div style="display:flex;gap:10px;">
              <button onclick="fecharGeradorPlano()"
                style="flex:1;padding:13px;border:1px solid var(--detail);background:none;cursor:pointer;
                  font-family:'DM Sans',sans-serif;font-size:0.68rem;letter-spacing:0.12em;
                  text-transform:uppercase;color:var(--text-light);">
                Cancelar
              </button>
              <button id="gen-btn-confirmar" onclick="confirmarGerarPlano()"
                style="flex:2;padding:13px;background:var(--text);border:none;cursor:pointer;
                  font-family:'DM Sans',sans-serif;font-size:0.68rem;letter-spacing:0.12em;
                  text-transform:uppercase;color:var(--bg-primary);">
                Criar fases automaticamente
              </button>
            </div>

            <p id="gen-msg" style="display:none;margin-top:10px;font-family:'DM Sans',sans-serif;
              font-size:0.73rem;text-align:center;"></p>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);
  }

  modal.style.display = '';
  // Seta data de hoje como padrão
  const dataEl = document.getElementById('gen-data-inicio');
  if (dataEl && !dataEl.value) dataEl.value = new Date().toISOString().split('T')[0];

  // Auto-preenche campos com dados do paciente (não sobrescreve se já tem valor)
  await _autoPreencherCamposGerador();

  atualizarPreviewGerador();
}
window.mostrarGeradorPlano = mostrarGeradorPlano;

function fecharGeradorPlano() {
  const m = document.getElementById('gerador-plano-modal');
  if (m) m.style.display = 'none';
}
window.fecharGeradorPlano = fecharGeradorPlano;

// ── Salva as fases geradas no Supabase ────────────────────
async function confirmarGerarPlano() {
  const objetivo  = document.getElementById('gen-objetivo')?.value;
  const pesoAtual = parseFloat(document.getElementById('gen-peso-atual')?.value);
  const pesoMeta  = parseFloat(document.getElementById('gen-peso-meta')?.value);
  const atividade = document.getElementById('gen-atividade')?.value;
  const dataIni   = document.getElementById('gen-data-inicio')?.value;
  const btn       = document.getElementById('gen-btn-confirmar');
  const msg       = document.getElementById('gen-msg');

  if (!pesoAtual || !pesoMeta || isNaN(pesoAtual) || isNaN(pesoMeta)) {
    msg.textContent = 'Preencha peso atual e peso meta para continuar.';
    msg.style.color = 'var(--error)'; msg.style.display = '';
    return;
  }

  btn.disabled = true; btn.textContent = 'Criando fases...';
  msg.style.display = 'none';

  const fases = gerarFasesPeriodizacao({ objetivo, pesoAtual, pesoMeta, nivelAtividade: atividade, dataInicio: dataIni });

  // Remove campos que não existem na tabela `fases` do Supabase
  // (meta_peso_diff é usado apenas no preview/renderização, não é persistido)
  const payload = fases.map(({ meta_peso_diff, ...f }) => ({
    ...f,
    patient_id: patientId,
    user_id:    patientUserId,
  }));

  const { error } = await supabase.from('fases').insert(payload);

  if (error) {
    msg.textContent = 'Erro ao criar fases: ' + error.message;
    msg.style.color = 'var(--error)'; msg.style.display = '';
    btn.disabled = false; btn.textContent = 'Criar fases automaticamente';
    return;
  }

  fecharGeradorPlano();
  showToast(`${fases.length} fases criadas com sucesso.`);
  loadFases();
}
window.confirmarGerarPlano = confirmarGerarPlano;
