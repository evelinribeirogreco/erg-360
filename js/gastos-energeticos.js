// ============================================================
// gastos-energeticos.js — Cálculo de TMB/GET (RDEE) por paciente
// ============================================================
// Protocolos: Mifflin, Harris-Benedict, Katch-McArdle, Cunningham, Tinsley
// Atividades físicas individualizadas + cenários (perda/manutenção/ganho)
// Persiste em supabase.gastos_energeticos com safe-save (backup local)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { safeInsert, safeUpdate, installOnlineHook, mountPendingBanner } from './safe-save.js';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';
const ADMIN_EMAIL   = 'evelinbeatrizrb@outlook.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
window._supabase = supabase;

function isAdminUser(user) {
  return user?.user_metadata?.role === 'admin' || user?.email === ADMIN_EMAIL;
}

// ── Estado ───────────────────────────────────────────────────
let patientId = null;
let userId    = null;
let patientNome = '';
let atividades = []; // [{tipo, kcal}]
let isReadonly = false;

// ── Fatores de atividade ─────────────────────────────────────
const FATORES = {
  sedentario:   1.20,
  leve:         1.375,
  moderado:     1.55,
  ativo:        1.725,
  muito_ativo:  1.90,
};

const PROTOCOLOS_HINT = {
  mifflin:         'Padrão para adultos saudáveis. Usa peso, altura, idade e sexo.',
  harris_benedict: 'Equação clássica revisada. Tende a superestimar em sedentários.',
  katch_mcardle:   'Baseada em massa magra. Ideal para atletas e quem tem %G baixo. Requer massa magra.',
  cunningham:      'Para atletas com %G muito baixo (<15% homens, <22% mulheres). Requer massa magra.',
  tinsley:         'Atletas de força/resistidos. Requer massa magra.',
};

// ════════════════════════════════════════════════════════════
// FÓRMULAS DE TMB
// ════════════════════════════════════════════════════════════
function calcMifflin(peso, alturaCm, idade, sexo) {
  if (sexo === 'masculino') return (10 * peso) + (6.25 * alturaCm) - (5 * idade) + 5;
  return (10 * peso) + (6.25 * alturaCm) - (5 * idade) - 161;
}
function calcHarrisBenedict(peso, alturaCm, idade, sexo) {
  if (sexo === 'masculino') return 88.362 + (13.397 * peso) + (4.799 * alturaCm) - (5.677 * idade);
  return 447.593 + (9.247 * peso) + (3.098 * alturaCm) - (4.330 * idade);
}
function calcKatchMcArdle(massaMagra) { return 370 + (21.6 * massaMagra); }
function calcCunningham(massaMagra)   { return 500 + (22 * massaMagra); }
function calcTinsley(massaMagra)      { return 24.8 * massaMagra + 10; }

function calcularTMB(protocolo, p) {
  switch (protocolo) {
    case 'mifflin':         return calcMifflin(p.peso, p.alturaCm, p.idade, p.sexo);
    case 'harris_benedict': return calcHarrisBenedict(p.peso, p.alturaCm, p.idade, p.sexo);
    case 'katch_mcardle':   return p.massaMagra ? calcKatchMcArdle(p.massaMagra) : null;
    case 'cunningham':      return p.massaMagra ? calcCunningham(p.massaMagra)   : null;
    case 'tinsley':         return p.massaMagra ? calcTinsley(p.massaMagra)      : null;
    default:                return null;
  }
}

// ════════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await checkAdmin();
  loadPatientFromUrl();
  setDefaultDate();
  initToggleButtons();
  initForm();
  initAtividades();
  initSidebarMobile();
  await carregarAntropometriaUltima();
  onProtocoloChange();
  recalcular();
  installOnlineHook(supabase);
  mountPendingBanner();
});

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && isAdminUser(session.user)) return;
  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed?.session && isAdminUser(refreshed.session.user)) return;
  window.location.href = 'index.html';
}

function loadPatientFromUrl() {
  const params = new URLSearchParams(window.location.search);
  patientId   = params.get('patient_id') || params.get('patient');
  userId      = params.get('user_id')    || params.get('user');
  patientNome = decodeURIComponent(params.get('nome') || '');
  const editId = params.get('edit');
  const viewId = params.get('view');

  if (patientId) document.getElementById('patient-id').value = patientId;
  if (userId)    document.getElementById('user-id').value    = userId;
  if (patientNome) {
    document.getElementById('patient-name-sidebar').textContent = patientNome.split(' ')[0];
    document.title = `Gastos Energéticos — ${patientNome}`;
  }

  // Modo edit/view: carrega registro específico
  if (editId && patientId) loadGastoById(patientId, editId, false);
  if (viewId && patientId) loadGastoById(patientId, viewId, true);
}

function setDefaultDate() {
  const el = document.getElementById('data_calculo');
  if (el && !el.value) el.value = new Date().toISOString().split('T')[0];
}

function initToggleButtons() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      if (!field) return;
      document.querySelectorAll(`.toggle-btn[data-field="${field}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const hidden = document.getElementById(field);
      if (hidden) hidden.value = btn.dataset.value;
      // Se mudou tipo → sugere protocolo
      if (field === 'tipo') sugerirProtocoloPorTipo(btn.dataset.value);
    });
  });
}

function sugerirProtocoloPorTipo(tipo) {
  const protoEl = document.getElementById('protocolo');
  if (!protoEl) return;
  if (tipo === 'atleta')  protoEl.value = 'katch_mcardle';
  if (tipo === 'idoso')   protoEl.value = 'mifflin';
  if (tipo === 'gestante') protoEl.value = 'harris_benedict';
  if (tipo === 'adulto')  protoEl.value = 'mifflin';
  onProtocoloChange();
}

function initSidebarMobile() {
  const ham = document.getElementById('hamburger-btn');
  const sb  = document.getElementById('sidebar');
  const ov  = document.getElementById('sidebar-overlay');
  if (!ham || !sb || !ov) return;
  ham.addEventListener('click', () => { sb.classList.toggle('open'); ov.classList.toggle('visible'); });
  ov.addEventListener('click',  () => { sb.classList.remove('open'); ov.classList.remove('visible'); });
}

// ════════════════════════════════════════════════════════════
// CARREGA DADOS DO PACIENTE (idade, sexo) e antropometria
// ════════════════════════════════════════════════════════════
async function carregarAntropometriaUltima() {
  if (!patientId) return;

  // 1. Dados básicos do paciente (sexo, data_nascimento)
  try {
    const { data: pac } = await supabase.from('patients')
      .select('sexo, data_nascimento')
      .eq('id', patientId).maybeSingle();
    if (pac?.sexo) {
      const sexo = pac.sexo.toLowerCase().startsWith('m') ? 'masculino' : 'feminino';
      _setToggle('sexo', sexo);
    }
    if (pac?.data_nascimento) {
      const hoje = new Date();
      const nasc = new Date(pac.data_nascimento + 'T00:00:00');
      let idade = hoje.getFullYear() - nasc.getFullYear();
      const m = hoje.getMonth() - nasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
      if (idade > 0 && idade < 120) {
        const idadeEl = document.getElementById('idade');
        if (idadeEl && !idadeEl.value) idadeEl.value = idade;
      }
    }
  } catch (e) { console.warn('[ge] erro buscando paciente:', e); }

  // 2. Última antropometria (peso, altura, massa magra)
  try {
    const { data: antro } = await supabase.from('antropometria')
      .select('peso, altura, massa_magra')
      .eq('patient_id', patientId)
      .order('data_avaliacao', { ascending: false })
      .limit(1).maybeSingle();
    if (antro) {
      const setIfEmpty = (id, v) => {
        const el = document.getElementById(id);
        if (el && !el.value && v != null) el.value = v;
      };
      setIfEmpty('peso',         antro.peso);
      setIfEmpty('altura',       antro.altura);
      setIfEmpty('massa_magra',  antro.massa_magra);
    }
  } catch (e) { console.warn('[ge] erro buscando antropometria:', e); }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-recarregar-antro');
  if (btn) btn.addEventListener('click', async () => {
    await carregarAntropometriaUltima();
    recalcular();
  });
});

function _setToggle(field, value) {
  document.querySelectorAll(`.toggle-btn[data-field="${field}"]`).forEach(b => {
    b.classList.toggle('active', b.dataset.value === value);
  });
  const hidden = document.getElementById(field);
  if (hidden) hidden.value = value;
}

// ════════════════════════════════════════════════════════════
// PROTOCOLO + NÍVEL
// ════════════════════════════════════════════════════════════
window.onProtocoloChange = function() {
  const p = document.getElementById('protocolo').value;
  const hint = document.getElementById('protocolo-hint');
  if (hint) hint.textContent = PROTOCOLOS_HINT[p] || '';
  // Avisa se faltou massa magra pra protocolos que precisam
  const precisaMM = ['katch_mcardle','cunningham','tinsley'].includes(p);
  const mmEl = document.getElementById('massa_magra');
  if (precisaMM && (!mmEl.value || parseFloat(mmEl.value) <= 0)) {
    hint.textContent += ' ⚠️ Este protocolo requer massa magra.';
    hint.style.color = '#7A5E00';
  } else if (hint) {
    hint.style.color = 'var(--text-light)';
  }
  recalcular();
};

window.onNivelChange = function() {
  const sel = document.getElementById('nivel_atividade').value;
  const fatorEl = document.getElementById('fator_atividade');
  if (sel !== 'custom' && FATORES[sel] != null) {
    fatorEl.value = FATORES[sel];
  }
  recalcular();
};

// ════════════════════════════════════════════════════════════
// ATIVIDADES FÍSICAS (lista dinâmica)
// ════════════════════════════════════════════════════════════
function initAtividades() {
  const btn = document.getElementById('btn-add-atividade');
  if (btn) btn.addEventListener('click', () => addAtividade());
  renderAtividades();
}

function addAtividade(tipo = '', kcal = '') {
  if (isReadonly) return;
  atividades.push({ tipo, kcal });
  renderAtividades();
}

function removerAtividade(idx) {
  atividades.splice(idx, 1);
  renderAtividades();
}

function renderAtividades() {
  const wrap = document.getElementById('atividades-lista');
  if (!wrap) return;
  if (atividades.length === 0) {
    wrap.innerHTML = `<p style="font-family:'DM Sans',sans-serif;font-size:0.72rem;color:var(--text-light);font-style:italic;text-align:center;padding:8px;">Nenhuma atividade adicionada.</p>`;
    document.getElementById('atividades-total').textContent = '0 kcal';
    recalcular();
    return;
  }
  wrap.innerHTML = atividades.map((a, idx) => `
    <div style="display:flex;gap:8px;align-items:center;">
      <input class="form-input" type="text" placeholder="Atividade (ex: Tênis)"
        value="${a.tipo || ''}" oninput="window._atvUpdate(${idx},'tipo',this.value)" style="flex:2;">
      <input class="form-input" type="number" placeholder="kcal/dia" step="1"
        value="${a.kcal || ''}" oninput="window._atvUpdate(${idx},'kcal',this.value);recalcular()" style="flex:1;max-width:120px;">
      <button type="button" onclick="window._atvRemove(${idx})" style="background:none;border:1px solid var(--error,#a04030);color:var(--error,#a04030);padding:8px 12px;cursor:pointer;font-size:0.7rem;">✕</button>
    </div>
  `).join('');
  recalcular();
}
window._atvUpdate = (idx, field, val) => {
  if (atividades[idx]) atividades[idx][field] = field === 'kcal' ? (parseFloat(val) || 0) : val;
};
window._atvRemove = (idx) => removerAtividade(idx);

function totalAtividades() {
  return atividades.reduce((s, a) => s + (parseFloat(a.kcal) || 0), 0);
}

// ════════════════════════════════════════════════════════════
// RECÁLCULO PRINCIPAL
// ════════════════════════════════════════════════════════════
window.recalcular = function() {
  const v = (id) => parseFloat(document.getElementById(id)?.value) || 0;
  const peso       = v('peso');
  let alturaM      = v('altura');
  if (alturaM > 3) alturaM = alturaM / 100; // se digitou em cm
  const alturaCm   = alturaM * 100;
  const idade      = v('idade');
  const sexo       = document.getElementById('sexo')?.value || 'feminino';
  const massaMagra = v('massa_magra');
  const fatorAtv   = v('fator_atividade') || 1.0;
  const fatorInj   = v('fator_injuria');
  const protocolo  = document.getElementById('protocolo')?.value || 'mifflin';

  const totalAtv = totalAtividades();
  document.getElementById('atividades-total').textContent = `${Math.round(totalAtv)} kcal`;

  // TMB / RDEE
  const inputs = { peso, alturaCm, idade, sexo, massaMagra };
  let tmb = calcularTMB(protocolo, inputs);
  if (!tmb || isNaN(tmb)) {
    document.getElementById('r-rdee').textContent = '—';
    document.getElementById('r-rdee-sub').textContent = 'preencha os campos necessários';
    document.getElementById('r-get').textContent = '—';
    document.getElementById('r-manutencao').textContent = '—';
    document.getElementById('r-perda').textContent = '—';
    document.getElementById('r-ganho').textContent = '—';
    return;
  }
  // Aplica fator de injúria se tiver
  if (fatorInj > 1) tmb = tmb * fatorInj;

  // GET = TMB × fator + atividades extras
  const get = (tmb * fatorAtv) + totalAtv;

  // Cenários (kcal/kg de peso atual)
  const perdaMin = Math.round(20 * peso);
  const perdaMax = Math.round(25 * peso);
  const manutMin = Math.round(25 * peso);
  const manutMax = Math.round(30 * peso);
  const ganhoMin = Math.round(30 * peso);
  const ganhoMax = Math.round(35 * peso);

  // Atualiza UI
  document.getElementById('r-rdee').textContent = Math.round(tmb).toLocaleString('pt-BR') + ' kcal';
  document.getElementById('r-rdee-sub').textContent = `kcal/dia · ${nomeProtocolo(protocolo)}`;
  document.getElementById('r-get').textContent = Math.round(get).toLocaleString('pt-BR') + ' kcal';
  document.getElementById('r-manutencao').textContent = `${manutMin.toLocaleString('pt-BR')}–${manutMax.toLocaleString('pt-BR')}`;
  document.getElementById('r-perda').textContent = `${perdaMin.toLocaleString('pt-BR')}–${perdaMax.toLocaleString('pt-BR')}`;
  document.getElementById('r-ganho').textContent = `${ganhoMin.toLocaleString('pt-BR')}–${ganhoMax.toLocaleString('pt-BR')}`;
};

function nomeProtocolo(p) {
  return ({
    mifflin:'Mifflin-St Jeor', harris_benedict:'Harris-Benedict',
    katch_mcardle:'Katch-McArdle', cunningham:'Cunningham', tinsley:'Tinsley',
  })[p] || p;
}

// ════════════════════════════════════════════════════════════
// SAVE
// ════════════════════════════════════════════════════════════
function initForm() {
  const form = document.getElementById('ge-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isReadonly) return;
    const btn = document.getElementById('btn-salvar');
    const msg = document.getElementById('form-message');
    btn.disabled = true; btn.textContent = 'Salvando...';

    if (!patientId || !userId) {
      _msg(msg, 'Erro: paciente não identificado.', 'error');
      btn.disabled = false; btn.textContent = 'Salvar Cálculo';
      return;
    }

    const v   = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const vN  = (id) => { const x = parseFloat(v(id)); return isNaN(x) ? null : x; };

    // Recalcula só para garantir os números mais recentes
    recalcular();

    let altura = vN('altura');
    if (altura && altura > 3) altura = altura / 100;

    const peso       = vN('peso');
    const idade      = parseInt(v('idade')) || null;
    const sexo       = v('sexo');
    const massaMagra = vN('massa_magra');
    const fatorAtv   = vN('fator_atividade') || 1.0;
    const protocolo  = v('protocolo');

    const inputs = { peso, alturaCm: altura ? altura * 100 : null, idade, sexo, massaMagra };
    let tmb = calcularTMB(protocolo, inputs);
    const fatorInj = vN('fator_injuria');
    if (tmb && fatorInj && fatorInj > 1) tmb = tmb * fatorInj;
    const totalAtv = totalAtividades();
    const get = tmb ? (tmb * fatorAtv) + totalAtv : null;

    const payload = {
      patient_id:     patientId,
      user_id:        userId,
      data_calculo:   v('data_calculo') || new Date().toISOString().split('T')[0],
      descricao:      v('descricao') || null,
      tipo:           v('tipo'),
      protocolo:      protocolo,
      nivel_atividade:v('nivel_atividade'),
      fator_atividade:fatorAtv,
      peso:           peso,
      altura:         altura,
      idade:          idade,
      sexo:           sexo,
      massa_magra:    massaMagra,
      fator_injuria:  fatorInj,
      atividades:     atividades.filter(a => a.tipo || a.kcal),
      rdee:           tmb ? Math.round(tmb) : null,
      rdee_total:     get ? Math.round(get) : null,
      kcal_perda_peso_min: peso ? Math.round(20 * peso) : null,
      kcal_perda_peso_max: peso ? Math.round(25 * peso) : null,
      kcal_manutencao:     peso ? Math.round(27.5 * peso) : null,
      kcal_ganho_peso_min: peso ? Math.round(30 * peso) : null,
      kcal_ganho_peso_max: peso ? Math.round(35 * peso) : null,
      obs:            v('obs') || null,
    };

    const editandoId = document.getElementById('ge-id')?.value;
    const result = editandoId
      ? await safeUpdate(supabase, 'gastos_energeticos', payload, { id: editandoId },
                         { label: 'Gasto energético (edição)' })
      : await safeInsert(supabase, 'gastos_energeticos', payload,
                         { label: 'Gasto energético' });

    if (!result.ok) {
      _msg(msg, `Erro: ${result.error?.message}. Dados guardados localmente — clique no banner pra retentar.`, 'error');
      btn.disabled = false; btn.textContent = 'Salvar Cálculo';
      return;
    }

    if (result.columnsRemoved?.length) {
      console.warn('Gastos: campos ignorados (rodar migration):', result.columnsRemoved);
    }
    _toast('Cálculo salvo com sucesso.');
    setTimeout(() => window.location.href = 'admin.html', 1200);
  });
}

function _msg(el, txt, type) {
  if (!el) return;
  el.textContent = txt;
  el.className = `form-message ${type || ''} visible`;
}
function _toast(txt) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = txt;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ════════════════════════════════════════════════════════════
// LOAD por ID (edit / view)
// ════════════════════════════════════════════════════════════
async function loadGastoById(patientId, geId, readonly) {
  const { data, error } = await supabase.from('gastos_energeticos')
    .select('*').eq('id', geId).eq('patient_id', patientId).single();
  if (error || !data) {
    console.warn('[ge] erro carregando registro:', error);
    return;
  }
  // Preenche campos
  const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
  set('ge-id',       readonly ? '' : data.id); // só guarda id em modo edit
  set('descricao',   data.descricao);
  set('data_calculo', data.data_calculo);
  set('peso',        data.peso);
  set('altura',      data.altura);
  set('idade',       data.idade);
  set('massa_magra', data.massa_magra);
  set('fator_injuria', data.fator_injuria);
  set('protocolo',   data.protocolo);
  set('nivel_atividade', data.nivel_atividade);
  set('fator_atividade', data.fator_atividade);
  set('obs',         data.obs);
  if (data.tipo) _setToggle('tipo', data.tipo);
  if (data.sexo) _setToggle('sexo', data.sexo);

  // Atividades
  atividades = Array.isArray(data.atividades) ? [...data.atividades] : [];
  renderAtividades();

  // Atualiza hint do protocolo + recálculo
  onProtocoloChange();
  recalcular();

  // Visual
  const titleEl = document.querySelector('.page-title');
  if (titleEl) titleEl.textContent += readonly ? ' (visualização)' : ' (editando)';
  if (readonly) _aplicarReadonly();
}

function _aplicarReadonly() {
  isReadonly = true;
  const aplicar = () => {
    document.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.type === 'hidden') return;
      el.readOnly = true;
      if (el.tagName === 'SELECT' || el.type === 'date' || el.type === 'checkbox') el.disabled = true;
      el.style.background = 'var(--bg-secondary, #f7f3ed)';
      el.style.cursor = 'not-allowed';
    });
    document.querySelectorAll('button[type="submit"]').forEach(b => b.style.display = 'none');
    document.querySelectorAll('.toggle-btn, #btn-add-atividade, #btn-recarregar-antro').forEach(b => {
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
    <span>👁 Modo visualização — campos travados</span>
    <a href="${editUrl}" style="background:#fff;color:#2D6A56;padding:6px 14px;
      text-decoration:none;font-weight:600;border-radius:3px;font-size:0.72rem;">
      Editar este registro
    </a>`;
  document.body.insertBefore(banner, document.body.firstChild);
}
