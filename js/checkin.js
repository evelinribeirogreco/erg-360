// ============================================================
// checkin.js — Check-in diário v2.0
// Score diário + flags clínicas + motor de decisão
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Estado ────────────────────────────────────────────────
let currentScreen = 0;
let userId        = null;
let patientId     = null;
let sintomasGI    = [];
let flags         = [];

const TOTAL_SCREENS = 7; // 1–7 (sem intro e done)

const state = {
  energia:            null,
  humor:              null,
  sono_horas:         null,
  sono_qualidade:     null,
  despertares:        null,
  fome_nivel:         null,
  descontrole:        null,
  evacuou:            null,
  evacuacao_vezes:    null,
  evacuacao_bristol:  null,
  treinou:            null,
  treino_tipo:        null,
  treino_duracao:     null,
  treino_intensidade: null,
  treino_fadiga:      null,
  agua_litros:        null,
  obs:                null,
};

// ── Estado de check-in retroativo ────────────────────────
let dataAlvo  = null;       // null = hoje. Se setado, usa essa data no save
let modoRetroativo = false; // true = data != hoje
let modoAdmin = false;      // true = admin preenchendo pra outra paciente

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  userId = session.user.id;

  // ── Modo retroativo (admin) ──
  // URL: checkin.html?retro=1&patient=<patient_id>&user=<user_id>&data=YYYY-MM-DD
  const params = new URLSearchParams(window.location.search);
  const retroPatient = params.get('patient');
  const retroUser    = params.get('user');
  const retroData    = params.get('data');

  // Verifica se é admin
  const ADMIN_EMAIL = 'evelinbeatrizrb@outlook.com';
  const isAdmin = session.user.email === ADMIN_EMAIL;

  if (isAdmin && retroPatient && retroUser) {
    // Modo retroativo: admin preenchendo pra outra paciente (sem limite de data)
    modoRetroativo = true;
    modoAdmin      = true;
    patientId = retroPatient;
    userId    = retroUser;
    dataAlvo  = retroData || null;
    mostrarBannerRetroativo();
  } else {
    // Modo normal: paciente preenche pra ela mesma
    const { data: p } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();
    patientId = p?.id || null;

    // Paciente pode optar por preencher retroativo (até 2 dias atrás)
    // Botão é injetado na tela inicial (screen-0) — se param ?data= veio na URL, ativa direto
    if (retroData && _validarDataRetroativaPaciente(retroData)) {
      modoRetroativo = true;
      modoAdmin      = false;
      dataAlvo       = retroData;
      mostrarBannerRetroativo();
    } else {
      // Adiciona botão "Preencher de outro dia" na intro (sem ativar nada ainda)
      setTimeout(_injetarBotaoRetroativoPaciente, 100);
    }
  }

  // Renderiza data na intro
  const dataExibida = dataAlvo ? new Date(dataAlvo + 'T12:00:00') : new Date();
  const el = document.getElementById('ci-data-hoje');
  if (el) el.textContent = dataExibida.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
});

// ── Valida se a data é elegível pra paciente (até 2 dias atrás) ─
function _validarDataRetroativaPaciente(dataStr) {
  if (!dataStr || !/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return false;
  const escolhida = new Date(dataStr + 'T12:00:00');
  const hoje = new Date(); hoje.setHours(12,0,0,0);
  const diffDias = Math.round((hoje - escolhida) / 86400000);
  return diffDias >= 0 && diffDias <= 2;  // hoje, ontem ou anteontem
}

// ── Injeta botão "Preencher de outro dia" na intro (paciente) ───
function _injetarBotaoRetroativoPaciente() {
  const intro = document.querySelector('.ci-intro');
  if (!intro || intro.querySelector('.ci-retro-btn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ci-retro-btn';
  btn.style.cssText = `
    margin-top:14px;padding:10px 18px;background:transparent;
    border:1px dashed rgba(201,168,76,0.6);border-radius:6px;
    color:#6B5A20;font-family:'DM Sans','Outfit',sans-serif;
    font-size:0.74rem;font-weight:500;letter-spacing:0.04em;
    cursor:pointer;display:inline-flex;align-items:center;gap:6px;
  `;
  btn.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9c-2.39 0-4.68.94-6.36 2.64L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
    Esqueci ontem — preencher de outro dia
  `;
  btn.addEventListener('click', _abrirModalRetroPaciente);
  intro.appendChild(btn);
}

// ── Modal do paciente: só permite hoje, ontem ou anteontem ──────
function _abrirModalRetroPaciente() {
  const hoje = new Date();
  const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
  const anteontem = new Date(hoje); anteontem.setDate(anteontem.getDate() - 2);
  const fmt = (d) => d.toISOString().split('T')[0];
  const lbl = (d) => d.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'2-digit' });

  let modal = document.getElementById('modal-retro-paciente');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-retro-paciente';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:3000;
      display:flex;align-items:center;justify-content:center;padding:20px;
      font-family:'DM Sans','Outfit',sans-serif;
    `;
    modal.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:28px;max-width:380px;width:100%;box-shadow:0 6px 28px rgba(0,0,0,0.18);">
        <h3 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:1.3rem;margin:0 0 8px;">
          Qual dia você quer preencher?
        </h3>
        <p style="font-size:0.78rem;color:#6B6659;margin:0 0 16px;line-height:1.5;">
          Por questão de precisão clínica, você pode preencher até <strong>2 dias atrás</strong>. Para datas mais antigas, fale com a Dra. Evelin.
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
          <button type="button" data-dia="${fmt(hoje)}" class="ci-retro-opt" style="padding:12px 16px;text-align:left;background:rgba(76,184,160,0.08);border:1px solid rgba(76,184,160,0.4);border-radius:6px;cursor:pointer;font-family:inherit;">
            <strong>Hoje</strong> — ${lbl(hoje)}
          </button>
          <button type="button" data-dia="${fmt(ontem)}" class="ci-retro-opt" style="padding:12px 16px;text-align:left;background:#fff;border:1px solid #D4D0C5;border-radius:6px;cursor:pointer;font-family:inherit;">
            <strong>Ontem</strong> — ${lbl(ontem)}
          </button>
          <button type="button" data-dia="${fmt(anteontem)}" class="ci-retro-opt" style="padding:12px 16px;text-align:left;background:#fff;border:1px solid #D4D0C5;border-radius:6px;cursor:pointer;font-family:inherit;">
            <strong>Anteontem</strong> — ${lbl(anteontem)}
          </button>
        </div>
        <button type="button" id="btn-retro-cancelar" style="width:100%;padding:10px;background:transparent;border:1px solid #D4D0C5;border-radius:6px;font-family:inherit;cursor:pointer;font-size:0.82rem;color:#6B6659;">
          Cancelar
        </button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('.ci-retro-opt').forEach(b => {
      b.addEventListener('click', () => {
        const dia = b.dataset.dia;
        const hojeStr = fmt(new Date());
        if (dia === hojeStr) {
          // Escolheu hoje — apenas fecha, segue fluxo normal
          modal.style.display = 'none';
          return;
        }
        // Escolheu ontem ou anteontem — ativa modo retroativo
        modoRetroativo = true;
        modoAdmin      = false;
        dataAlvo       = dia;
        modal.style.display = 'none';
        mostrarBannerRetroativo();
        // Atualiza data exibida na intro
        const el = document.getElementById('ci-data-hoje');
        if (el) {
          el.textContent = new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long', day: '2-digit', month: 'long'
          });
        }
      });
    });
    modal.querySelector('#btn-retro-cancelar').onclick = () => modal.style.display = 'none';
  }
  modal.style.display = 'flex';
}

// ── Banner visual no modo retroativo ─────────────────────
function mostrarBannerRetroativo() {
  document.body.classList.add('modo-retroativo');
  const banner = document.createElement('div');
  banner.id = 'banner-retroativo';
  banner.style.cssText = `
    position: sticky;
    top: 0;
    z-index: 200;
    background: rgba(201,168,76,0.18);
    border-bottom: 2px solid #C9A84C;
    padding: 10px 16px 10px 60px;
    font-family: 'DM Sans', 'Outfit', sans-serif;
    font-size: 0.78rem;
    font-weight: 500;
    color: #6B5A20;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  `;
  banner.innerHTML = `
    <span style="font-size:1.1rem;">📋</span>
    <span><strong>Modo retroativo</strong> · preenchendo check-in da data
      <strong id="retro-data-label">${dataAlvo || 'a definir'}</strong>
    </span>
    <button type="button" onclick="window._abrirSeletorData && window._abrirSeletorData()"
      style="margin-left:auto;padding:5px 10px;background:#C9A84C;color:#fff;border:none;border-radius:4px;font-family:inherit;font-size:0.72rem;cursor:pointer;font-weight:500;">
      Mudar data
    </button>
  `;
  document.body.insertBefore(banner, document.body.firstChild);

  // Se data ainda não foi escolhida, abre seletor automaticamente
  if (!dataAlvo) setTimeout(() => window._abrirSeletorData?.(), 200);
}

// ── Seletor de data (modal simples) ──────────────────────
window._abrirSeletorData = function() {
  const hojeStr = new Date().toISOString().split('T')[0];
  const ontem   = new Date(); ontem.setDate(ontem.getDate() - 1);
  const ontemStr = ontem.toISOString().split('T')[0];

  // Cria modal se não existir
  let modal = document.getElementById('modal-data-retro');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-data-retro';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:3000;
      display:flex;align-items:center;justify-content:center;padding:20px;
      font-family:'DM Sans',sans-serif;
    `;
    modal.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:28px;max-width:380px;width:100%;box-shadow:0 6px 28px rgba(0,0,0,0.18);">
        <h3 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:1.3rem;margin:0 0 8px;">
          Data do check-in
        </h3>
        <p style="font-size:0.82rem;color:#6B6659;margin:0 0 18px;line-height:1.5;">
          Escolha a data que a paciente fez (ou deveria ter feito) o check-in:
        </p>
        <input type="date" id="input-data-retro" value="${dataAlvo || ontemStr}" max="${hojeStr}"
          style="width:100%;padding:12px;border:1px solid #D4D0C5;border-radius:6px;font-family:inherit;font-size:1rem;margin-bottom:18px;">
        <div style="display:flex;gap:8px;">
          <button type="button" id="btn-data-cancelar"
            style="flex:1;padding:11px;background:transparent;border:1px solid #D4D0C5;border-radius:6px;font-family:inherit;cursor:pointer;font-size:0.82rem;color:#6B6659;">
            Cancelar
          </button>
          <button type="button" id="btn-data-confirmar"
            style="flex:1;padding:11px;background:#2D6A56;color:#fff;border:none;border-radius:6px;font-family:inherit;cursor:pointer;font-size:0.82rem;font-weight:500;">
            Confirmar
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#btn-data-cancelar').onclick = () => modal.style.display = 'none';
    modal.querySelector('#btn-data-confirmar').onclick = () => {
      const novaData = modal.querySelector('#input-data-retro').value;
      if (novaData) {
        dataAlvo = novaData;
        const lbl = document.getElementById('retro-data-label');
        if (lbl) lbl.textContent = new Date(novaData + 'T12:00:00').toLocaleDateString('pt-BR');
      }
      modal.style.display = 'none';
    };
  }
  modal.style.display = 'flex';
};

// ══════════════════════════════════════════════════════════
// NAVEGAÇÃO
// ══════════════════════════════════════════════════════════

function avancarStep() {
  const from = currentScreen;
  const to   = from + 1;

  document.getElementById(`screen-${from}`).classList.remove('active');
  document.getElementById(`screen-${to}`)?.classList.add('active');

  currentScreen = to;
  updateProgress();

  if (to >= 1) {
    document.getElementById('ci-header').style.display = 'flex';
  }

  window.scrollTo(0, 0);
}

function voltarStep() {
  if (currentScreen <= 1) return;
  const from = currentScreen;
  const to   = from - 1;

  document.getElementById(`screen-${from}`).classList.remove('active');
  document.getElementById(`screen-${to}`).classList.add('active');

  currentScreen = to;
  updateProgress();
  window.scrollTo(0, 0);
}

function updateProgress() {
  const pct = currentScreen === 0 ? 0
    : Math.round((currentScreen / TOTAL_SCREENS) * 100);
  const bar = document.getElementById('ci-progress');
  if (bar) bar.style.width = pct + '%';

  const count = document.getElementById('ci-step-count');
  if (count && currentScreen >= 1 && currentScreen <= TOTAL_SCREENS) {
    count.textContent = `${currentScreen} / ${TOTAL_SCREENS}`;
  }
}

// Tela 7 (obs) só aparece se houver flags de atenção
function irParaObservacao() {
  calcularFlags();
  const temFlags = flags.some(f => f.tipo !== 'ok');

  if (temFlags) {
    const obsCtx = document.getElementById('ci-obs-contexto');
    if (obsCtx) {
      const flagsWarn = flags.filter(f => f.tipo !== 'ok').map(f => f.label).join(', ');
      obsCtx.textContent = `Identificamos: ${flagsWarn}. Quer registrar algo?`;
    }
    avancarStep();
  } else {
    // Pula tela de obs e vai direto para salvar
    currentScreen = 6; // ajusta para voltarStep funcionar
    salvarCheckin();
  }
}

window.avancarStep  = avancarStep;
window.voltarStep   = voltarStep;
window.irParaObservacao = irParaObservacao;

// ══════════════════════════════════════════════════════════
// INTERAÇÕES
// ══════════════════════════════════════════════════════════

function selectScale(campo, val) {
  state[campo] = val;
  document.querySelectorAll(`#scale-${campo} .ci-scale-btn`).forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.val) === val);
  });
}

function selectOpt(campo, val, el) {
  state[campo] = val;
  // Remove active dos irmãos
  el.parentElement.querySelectorAll('.ci-opt').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function selectEvacuou(val, el) {
  state.evacuou = val;
  el.parentElement.querySelectorAll('.ci-opt').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('section-intestino').classList.toggle('visible', val === true);
}

function selectTreinou(val, el) {
  state.treinou = val;
  el.parentElement.querySelectorAll('.ci-opt').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('section-treino').classList.toggle('visible', val === true);
}

function selectBristol(val, el) {
  state.evacuacao_bristol = val;
  document.querySelectorAll('.bristol-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function toggleChip(el) {
  const val = el.dataset.val;
  // Remove "nenhum" se selecionou outro
  if (val !== 'nenhum') {
    const nenhum = document.querySelector('.ci-chip[data-val="nenhum"]');
    if (nenhum) { nenhum.classList.remove('active'); sintomasGI = sintomasGI.filter(v => v !== 'nenhum'); }
  }
  el.classList.toggle('active');
  if (el.classList.contains('active')) {
    if (!sintomasGI.includes(val)) sintomasGI.push(val);
  } else {
    sintomasGI = sintomasGI.filter(v => v !== val);
  }
}

function toggleChipExclusivo(el) {
  // "Nenhum" desmarca todos os outros
  sintomasGI = ['nenhum'];
  document.querySelectorAll('.ci-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

window.selectScale       = selectScale;
window.selectOpt         = selectOpt;
window.selectEvacuou     = selectEvacuou;
window.selectTreinou     = selectTreinou;
window.selectBristol     = selectBristol;
window.toggleChip        = toggleChip;
window.toggleChipExclusivo = toggleChipExclusivo;

// ── Sliders ───────────────────────────────────────────────
const SLIDER_LABELS = {
  energia:        ['Sem energia', 'Baixa', 'Ok', 'Boa', 'Ótima'],
  humor:          ['Péssimo', 'Ruim', 'Ok', 'Bom', 'Ótimo'],
  sono_qualidade: ['Péssimo', 'Ruim', 'Ok', 'Bom', 'Ótimo'],
  fome_nivel:     ['Sem fome', 'Leve', 'Normal', 'Alta', 'Incontrolável'],
};

function onSlider(field, val) {
  const v    = parseInt(val);
  state[field] = v;

  const num  = document.getElementById('val-'  + field);
  const lbl  = document.getElementById('lbl-'  + field);
  const fill = document.getElementById('fill-' + field);

  if (num)  num.textContent  = v;
  if (lbl)  lbl.textContent  = SLIDER_LABELS[field]?.[v - 1] ?? '';
  if (fill) fill.style.width = ((v - 1) / 4 * 100) + '%';
}

window.onSlider = onSlider;

// ══════════════════════════════════════════════════════════
// MOTOR DE FLAGS CLÍNICAS
// ══════════════════════════════════════════════════════════

function calcularFlags() {
  flags = [];

  // Energia crítica
  if (state.energia !== null && state.energia <= 2) {
    flags.push({ tipo: 'crit', label: 'Energia baixa', msg: 'Verifique se não está pulando refeições ou em déficit excessivo.', key: 'energia_baixa' });
  }

  // Recuperação ruim
  if ((state.sono_qualidade !== null && state.sono_qualidade <= 2) || (state.sono_horas !== null && state.sono_horas < 5.5)) {
    flags.push({ tipo: 'warn', label: 'Sono insuficiente', msg: 'Sono ruim eleva cortisol e aumenta fome. Tente dormir mais cedo hoje.', key: 'sono_ruim' });
  }

  // Fome elevada
  if (state.fome_nivel !== null && state.fome_nivel >= 4) {
    flags.push({ tipo: 'warn', label: 'Fome elevada', msg: 'Fome alta pode indicar plano muito restritivo. Garanta proteínas em cada refeição.', key: 'fome_alta' });
  }

  // Descontrole alimentar
  if (state.descontrole && state.descontrole !== 'nao') {
    const nivel = state.descontrole === 'forte' ? 'crit' : 'warn';
    flags.push({ tipo: nivel, label: `Descontrole ${state.descontrole}`, msg: 'Descontrole alimentar pode indicar restrição excessiva ou gatilho emocional.', key: 'descontrole' });
  }

  // Risco intestinal
  const b = state.evacuacao_bristol;
  if (b !== null && (b <= 2 || b >= 6)) {
    flags.push({ tipo: 'warn', label: 'Intestino alterado', msg: b <= 2 ? 'Fezes ressecadas. Aumente água e fibras.' : 'Fezes muito moles. Reduza alimentos irritativos.', key: 'intestino' });
  }
  if (sintomasGI.length > 0 && !sintomasGI.includes('nenhum')) {
    flags.push({ tipo: 'warn', label: `GI: ${sintomasGI.join(', ')}`, msg: 'Sintomas GI presentes. Observe padrão alimentar de ontem.', key: 'gi_sintomas' });
  }

  // Sobrecarga (overreaching)
  if (state.treinou && state.treino_fadiga !== null && state.treino_fadiga >= 4 && state.energia !== null && state.energia <= 2) {
    flags.push({ tipo: 'crit', label: 'Possível sobrecarga', msg: 'Fadiga alta com energia baixa. Considere reduzir intensidade do treino nos próximos dias.', key: 'overreaching' });
  }

  // Hidratação baixa
  if (state.agua_litros !== null && state.agua_litros < 1.5) {
    flags.push({ tipo: 'warn', label: 'Hidratação insuficiente', msg: 'Beba pelo menos 2L de água amanhã.', key: 'hidratacao' });
  }

  // Dia positivo
  if (flags.length === 0) {
    flags.push({ tipo: 'ok', label: 'Tudo dentro do esperado', msg: 'Continue com o plano. Ótimo dia!', key: 'ok' });
  }

  return flags;
}

// ══════════════════════════════════════════════════════════
// SCORE DIÁRIO (0–100)
// ══════════════════════════════════════════════════════════

function calcularScore() {
  let score = 0;
  let max   = 0;

  // Sono (0–20)
  if (state.sono_qualidade !== null) {
    score += Math.round((state.sono_qualidade / 5) * 12);
    max   += 12;
  }
  if (state.sono_horas !== null) {
    const sh = state.sono_horas;
    const pts = sh >= 7 ? 8 : sh >= 6.5 ? 6 : sh >= 5.5 ? 4 : 2;
    score += pts; max += 8;
  }

  // Fome (0–20) — fome 3 = ideal
  if (state.fome_nivel !== null) {
    const f = state.fome_nivel;
    const pts = f === 3 ? 20 : f === 2 || f === 4 ? 14 : f === 1 ? 10 : 6;
    score += pts; max += 20;
  }

  // Energia (0–20)
  if (state.energia !== null) {
    score += Math.round((state.energia / 5) * 20);
    max   += 20;
  }

  // Intestino (0–20)
  const b = state.evacuacao_bristol;
  if (b !== null) {
    const pts = (b >= 3 && b <= 5) ? 20 : (b === 2 || b === 6) ? 12 : 6;
    score += pts; max += 20;
  } else {
    score += 14; max += 20; // sem dado = neutro
  }

  // Hidratação (0–10)
  if (state.agua_litros !== null) {
    const a = state.agua_litros;
    const pts = a >= 2.5 ? 10 : a >= 1.5 ? 6 : 3;
    score += pts; max += 10;
  }

  // Treino (0–10)
  if (state.treinou) {
    const fadiga = state.treino_fadiga || 3;
    const intens = state.treino_intensidade || 3;
    // Bom se intensidade moderada sem fadiga excessiva
    const pts = fadiga <= 3 ? 10 : fadiga === 4 ? 7 : 4;
    score += pts; max += 10;
  }

  // Penalidade por descontrole
  if (state.descontrole === 'forte')    score -= 15;
  else if (state.descontrole === 'moderado') score -= 8;
  else if (state.descontrole === 'leve')     score -= 3;

  if (max === 0) return 50;
  const raw = Math.round((score / max) * 100);
  return Math.max(0, Math.min(100, raw));
}

// ══════════════════════════════════════════════════════════
// SALVAR E RENDERIZAR
// ══════════════════════════════════════════════════════════

async function salvarCheckin() {
  state.obs = document.getElementById('obs')?.value?.trim() || null;

  calcularFlags();
  const score = calcularScore();

  // Modo normal usa hoje; modo retroativo usa dataAlvo (escolhida pelo admin)
  const dataCheckin = (modoRetroativo && dataAlvo)
    ? dataAlvo
    : new Date().toISOString().split('T')[0];

  // Validação do modo retroativo: precisa ter data escolhida
  if (modoRetroativo && !dataAlvo) {
    alert('Escolha a data do check-in retroativo antes de salvar.');
    window._abrirSeletorData?.();
    return;
  }

  const hojeStr = new Date().toISOString().split('T')[0];
  const payload = {
    patient_id:          patientId,
    user_id:             userId,
    data:                dataCheckin,
    is_retroativo:       dataCheckin !== hojeStr,   // true se data != hoje
    feito_em:            new Date().toISOString(),  // timestamp REAL do save
    energia:             state.energia,
    humor:               state.humor,
    sono_horas:          state.sono_horas,
    sono_qualidade:      state.sono_qualidade,
    despertares:         state.despertares,
    fome_nivel:          state.fome_nivel,
    descontrole:         state.descontrole,
    evacuou:             state.evacuou,
    evacuacao_vezes:     state.evacuacao_vezes,
    evacuacao_bristol:   state.evacuacao_bristol,
    sintomas_gi:         sintomasGI.length && !sintomasGI.includes('nenhum') ? sintomasGI : null,
    treinou:             state.treinou,
    treino_tipo:         state.treino_tipo,
    treino_duracao:      state.treino_duracao,
    treino_intensidade:  state.treino_intensidade,
    treino_fadiga:       state.treino_fadiga,
    agua_litros:         state.agua_litros,
    obs:                 state.obs,
    score_diario:        score,
    flags:               flags.map(f => f.key),
  };

  // ── 1. BACKUP LOCAL IMEDIATO (failsafe contra perda de dados) ──
  // Mesmo se a rede falhar/o app fechar, fica salvo até o próximo sync
  try {
    const queueKey = 'erg_checkin_queue';
    const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
    queue.push({ payload, timestamp: Date.now(), tentativas: 0 });
    localStorage.setItem(queueKey, JSON.stringify(queue));
  } catch (_) {}

  // ── 2. INDICADOR VISUAL (mostra que está salvando) ──
  const finalBtn = document.querySelector('.ci-final-btn, [onclick*="salvarCheckin"]');
  if (finalBtn) {
    finalBtn.disabled = true;
    finalBtn.dataset.originalText = finalBtn.textContent;
    finalBtn.textContent = 'Salvando...';
  }

  // ── 3. SALVA NO SUPABASE COM AWAIT + RETRY ──
  let salvouOk = false;
  let ultimoErro = null;
  const MAX_TENTATIVAS = 3;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const { error } = await supabase.from('checkins').upsert(payload, {
        onConflict: 'patient_id,data',  // se já existe checkin do dia, atualiza
      });
      if (!error) {
        salvouOk = true;
        break;
      }
      ultimoErro = error;
      console.warn(`[checkin] tentativa ${tentativa} falhou:`, error.message);
      // Espera incremental: 0.5s, 1.5s, 3s
      await new Promise(r => setTimeout(r, 500 * tentativa * tentativa));
    } catch (err) {
      ultimoErro = err;
      console.warn(`[checkin] erro na tentativa ${tentativa}:`, err);
      await new Promise(r => setTimeout(r, 500 * tentativa * tentativa));
    }
  }

  // ── 4. SE SALVOU: limpa queue e mostra sucesso ──
  if (salvouOk) {
    try {
      const queueKey = 'erg_checkin_queue';
      const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
      // Remove o que acabou de salvar (tem o mesmo timestamp aproximado)
      const filtered = queue.filter(item =>
        !(item.payload.patient_id === payload.patient_id && item.payload.data === payload.data)
      );
      localStorage.setItem(queueKey, JSON.stringify(filtered));
    } catch (_) {}
  } else {
    // Falhou nas 3 tentativas — alerta a paciente
    console.error('[checkin] FALHA AO SALVAR após 3 tentativas:', ultimoErro);
    showSaveErrorBanner(ultimoErro);
  }

  // ── 5. RESTAURA BOTÃO ──
  if (finalBtn) {
    finalBtn.disabled = false;
    if (finalBtn.dataset.originalText) finalBtn.textContent = finalBtn.dataset.originalText;
  }

  // ── 6. VAI PRA TELA FINAL (só se salvou OU se quiser permitir mesmo com erro) ──
  // Comportamento: vai pra final em qualquer caso, mas mostra banner se falhou
  // (assim a paciente não fica travada — dados estão na queue local)
  const current = document.querySelector('.ci-screen.active');
  if (current) current.classList.remove('active');
  document.getElementById('screen-done').classList.add('active');

  const bar = document.getElementById('ci-progress');
  if (bar) bar.style.width = '100%';
  const ciHeader = document.getElementById('ci-header');
  if (ciHeader) ciHeader.style.display = 'none';

  renderScore(score);
  renderFlags(flags);
}

// ── Helper: mostra banner de erro persistente ──
function showSaveErrorBanner(err) {
  const tela = document.getElementById('screen-done');
  if (!tela) return;
  // Remove banner antigo se houver
  tela.querySelector('.ci-save-error-banner')?.remove();
  const banner = document.createElement('div');
  banner.className = 'ci-save-error-banner';
  banner.style.cssText = `
    background: rgba(224,82,82,0.10);
    border: 1px solid rgba(224,82,82,0.4);
    border-left: 4px solid #E05252;
    border-radius: 8px;
    padding: 14px 18px;
    margin: 16px auto;
    max-width: 480px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    color: #7A2E2E;
    line-height: 1.5;
  `;
  banner.innerHTML = `
    <strong style="display:block;font-weight:600;margin-bottom:4px;">⚠ Atenção: check-in não enviado ao servidor</strong>
    Suas respostas foram salvas localmente no aparelho e serão enviadas automaticamente quando a conexão melhorar. Você pode fechar este check-in.
    <button type="button" onclick="window._tentarReenviarCheckin && window._tentarReenviarCheckin()" style="display:block;margin-top:10px;padding:8px 16px;background:#7A2E2E;color:#fff;border:none;border-radius:4px;font-family:inherit;font-size:0.78rem;cursor:pointer;">
      Tentar enviar agora
    </button>
  `;
  tela.insertBefore(banner, tela.firstChild?.nextSibling || null);
}

// ── Sincroniza queue local quando estiver online ──
async function sincronizarFilaCheckins() {
  const queueKey = 'erg_checkin_queue';
  let queue;
  try { queue = JSON.parse(localStorage.getItem(queueKey) || '[]'); }
  catch (_) { return; }
  if (!queue.length) return;
  console.log(`[checkin] tentando sincronizar ${queue.length} checkin(s) pendente(s)...`);
  const novos = [];
  for (const item of queue) {
    try {
      const { error } = await supabase.from('checkins').upsert(item.payload, {
        onConflict: 'patient_id,data',
      });
      if (error) {
        item.tentativas = (item.tentativas || 0) + 1;
        if (item.tentativas < 10) novos.push(item); // mantém pra retry futuro
        console.warn('[checkin] sync falhou:', error.message);
      } else {
        console.log('[checkin] ✓ checkin sincronizado:', item.payload.data);
      }
    } catch (err) {
      item.tentativas = (item.tentativas || 0) + 1;
      if (item.tentativas < 10) novos.push(item);
      console.warn('[checkin] sync erro:', err);
    }
  }
  localStorage.setItem(queueKey, JSON.stringify(novos));
  if (novos.length === 0) {
    // Esconde banner se houver
    document.querySelector('.ci-save-error-banner')?.remove();
  }
}
window._tentarReenviarCheckin = sincronizarFilaCheckins;

// Sincroniza ao voltar online + ao carregar a página
window.addEventListener('online', sincronizarFilaCheckins);
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(sincronizarFilaCheckins, 2000); // tenta 2s após carregar (rede já estabelecida)
});

function renderScore(score) {
  const num   = document.getElementById('score-num');
  const cls   = document.getElementById('score-class');
  const desc  = document.getElementById('score-desc');
  const circ  = document.getElementById('score-circle');

  if (!num) return;

  num.textContent = score;

  let label, descText, cor;
  if (score >= 80) {
    label = 'Dia ótimo'; descText = 'Continue com o plano. Você está no caminho certo.';
    cor = '#3D6B4F';
  } else if (score >= 60) {
    label = 'Dia bom'; descText = 'Bom desempenho geral. Pequenos ajustes podem ajudar.';
    cor = '#3A5E8B';
  } else if (score >= 40) {
    label = 'Dia regular'; descText = 'Alguns pontos merecem atenção. Veja os alertas abaixo.';
    cor = '#B8860B';
  } else {
    label = 'Dia crítico'; descText = 'Hoje foi difícil. Tudo bem — amanhã recomeça. Veja as dicas abaixo.';
    cor = '#7A2E2E';
  }

  if (cls)  cls.textContent  = label;
  if (desc) desc.textContent = descText;
  if (circ) { circ.style.borderColor = cor; num.style.color = cor; }
}

function renderFlags(flags) {
  const container = document.getElementById('ci-flags-list');
  if (!container) return;

  container.innerHTML = flags.map(f => {
    const cls = f.tipo === 'ok' ? 'ci-flag-ok' : f.tipo === 'crit' ? 'ci-flag-crit' : 'ci-flag-warn';
    const icon = f.tipo === 'ok' ? '✓' : f.tipo === 'crit' ? '⚠' : '→';
    return `
      <div class="ci-flag-item ${cls}">
        <span style="font-weight:500;">${icon} ${f.label}</span>
        <span style="font-size:0.72rem;display:block;margin-top:2px;opacity:0.85;">${f.msg}</span>
      </div>`;
  }).join('');
}

window.salvarCheckin = salvarCheckin;
