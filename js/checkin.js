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

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  userId = session.user.id;

  const { data: p } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', userId)
    .single();
  patientId = p?.id || null;

  // Data de hoje
  const hoje = new Date();
  const el = document.getElementById('ci-data-hoje');
  if (el) el.textContent = hoje.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long'
  });
});

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

  const hoje = new Date().toISOString().split('T')[0];

  const payload = {
    patient_id:          patientId,
    user_id:             userId,
    data:                hoje,
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

  // Salva no Supabase (não bloqueia a UI se falhar)
  supabase.from('checkins').insert(payload).then(({ error }) => {
    if (error) console.error('Erro ao salvar checkin:', error);
  });

  // Vai para tela final
  const current = document.querySelector('.ci-screen.active');
  if (current) current.classList.remove('active');
  document.getElementById('screen-done').classList.add('active');

  const bar = document.getElementById('ci-progress');
  if (bar) bar.style.width = '100%';
  document.getElementById('ci-header').style.display = 'none';

  renderScore(score);
  renderFlags(flags);
}

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
