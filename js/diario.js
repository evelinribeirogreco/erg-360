// ============================================================
// diario.js — Diário Alimentar da Paciente
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
let userId    = null;
let patientId = null;
let currentDate = new Date().toISOString().split('T')[0];

// ── Inicialização ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  setDate(currentDate);
  initForm();
  loadHistorico();
  loadHorariosDoPLano();
});

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  userId = session.user.id;

  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (patient) patientId = patient.id;
}

// ── Data ──────────────────────────────────────────────────
function setDate(dateStr) {
  currentDate = dateStr;
  document.getElementById('diario-date-input').value = dateStr;

  const d = new Date(dateStr + 'T12:00:00');
  const hoje = new Date().toISOString().split('T')[0];

  document.getElementById('diario-date').textContent =
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  document.getElementById('diario-date-full').textContent =
    dateStr === hoje ? 'Hoje, ' + d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) :
    d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  loadDiario();
}

function changeDate(delta) {
  const d = new Date(currentDate + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  const novaData = d.toISOString().split('T')[0];
  setDate(novaData);
}
window.changeDate = changeDate;
window.loadDiario = () => setDate(document.getElementById('diario-date-input').value);

// ── Carrega diário do dia ─────────────────────────────────
async function loadDiario() {
  resetForm();

  const { data } = await supabase
    .from('diario_alimentar')
    .select('*')
    .eq('user_id', userId)
    .eq('data', currentDate)
    .single();

  if (data) fillForm(data);
}

function resetForm() {
  ['cafe','lanche-manha','almoco','lanche-tarde','jantar','ceia','obs'].forEach(id => {
    const el = document.getElementById('d-' + id);
    if (el) el.value = '';
  });
  document.getElementById('diario-id').value = '';
  document.getElementById('d-adesao').value = '';
  document.querySelectorAll('.diario-adesao-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.diario-refeicao').forEach(r => r.classList.remove('preenchida'));
  document.getElementById('diario-saved-msg').style.display = 'none';
}

function fillForm(data) {
  document.getElementById('diario-id').value = data.id;

  const campos = {
    'cafe': data.cafe,
    'lanche-manha': data.lanche_manha,
    'almoco': data.almoco,
    'lanche-tarde': data.lanche_tarde,
    'jantar': data.jantar,
    'ceia': data.ceia,
    'obs': data.obs,
  };

  Object.entries(campos).forEach(([key, val]) => {
    const el = document.getElementById('d-' + key);
    if (el && val) {
      el.value = val;
      // Marca como preenchida
      el.closest('.diario-refeicao')?.classList.add('preenchida');
    }
  });

  if (data.adesao) setAdesao(data.adesao);
}

// ── Adesão ────────────────────────────────────────────────
function setAdesao(val, btn) {
  document.querySelectorAll('.diario-adesao-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    const btns = document.querySelectorAll('.diario-adesao-btn');
    if (btns[val - 1]) btns[val - 1].classList.add('active');
  }
  document.getElementById('d-adesao').value = val;
}
window.setAdesao = setAdesao;

// ── Auto-marca refeição como preenchida ───────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.querySelectorAll('.diario-textarea').forEach(el => {
      el.addEventListener('input', () => {
        const ref = el.closest('.diario-refeicao');
        if (ref) ref.classList.toggle('preenchida', el.value.trim().length > 0);
      });
    });
  }, 500);
});

// ── Submit ────────────────────────────────────────────────
function initForm() {
  document.getElementById('diario-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('diario-save-btn');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const v = (id) => document.getElementById(id)?.value?.trim() || null;
    const vInt = (id) => { const val = v(id); return val ? parseInt(val) : null; };

    const payload = {
      patient_id:   patientId,
      user_id:      userId,
      data:         currentDate,
      cafe:         v('d-cafe'),
      lanche_manha: v('d-lanche-manha'),
      almoco:       v('d-almoco'),
      lanche_tarde: v('d-lanche-tarde'),
      jantar:       v('d-jantar'),
      ceia:         v('d-ceia'),
      obs:          v('d-obs'),
      adesao:       vInt('d-adesao'),
    };

    const diarioId = v('diario-id');
    let error;

    if (diarioId) {
      ({ error } = await supabase.from('diario_alimentar').update(payload).eq('id', diarioId));
    } else {
      const { data, error: insertError } = await supabase.from('diario_alimentar').insert(payload).select().single();
      error = insertError;
      if (data) document.getElementById('diario-id').value = data.id;
    }

    btn.disabled = false;
    btn.textContent = 'Salvar diário';

    if (!error) {
      const msg = document.getElementById('diario-saved-msg');
      msg.style.display = 'block';
      setTimeout(() => msg.style.display = 'none', 3000);
      loadHistorico();
    }
  });
}

// ── Histórico ─────────────────────────────────────────────
async function loadHistorico() {
  const { data } = await supabase
    .from('diario_alimentar')
    .select('data, cafe, almoco, jantar, adesao')
    .eq('user_id', userId)
    .order('data', { ascending: false })
    .limit(7);

  const list = document.getElementById('diario-historico-list');
  if (!data || data.length === 0) {
    list.innerHTML = '<p style="font-family:\'DM Sans\',sans-serif;font-weight:300;font-size:0.82rem;color:var(--text-light);font-style:italic;">Nenhum registro ainda.</p>';
    return;
  }

  list.innerHTML = data.map(d => {
    const dataFmt = new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'short'
    });
    const preview = d.cafe || d.almoco || d.jantar || 'Registro incompleto';
    return `
      <div class="diario-historico-item" onclick="setDate('${d.data}')">
        <span class="diario-hist-data">${dataFmt}</span>
        <span class="diario-hist-preview">${preview}</span>
        <span class="diario-hist-adesao">${d.adesao ? d.adesao + '/5' : '—'}</span>
      </div>
    `;
  }).join('');
}

// ── Carrega horários do plano para exibir ao lado das refeições ──
async function loadHorariosDoPLano() {
  if (!patientId) return;

  const { data: plano } = await supabase
    .from('planos_alimentares')
    .select('refeicoes')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!plano?.refeicoes) return;

  const mapeamento = {
    'café': 'd-cafe',
    'cafe': 'd-cafe',
    'lanche da manhã': 'd-lanche-manha',
    'lanche manha': 'd-lanche-manha',
    'almoço': 'd-almoco',
    'almoco': 'd-almoco',
    'lanche da tarde': 'd-lanche-tarde',
    'lanche tarde': 'd-lanche-tarde',
    'jantar': 'd-jantar',
    'ceia': 'd-ceia',
  };

  plano.refeicoes.forEach(ref => {
    const chave = ref.nome?.toLowerCase().trim();
    const inputId = Object.entries(mapeamento).find(([k]) => chave?.includes(k))?.[1];
    if (!inputId || !ref.horario) return;

    const input = document.getElementById(inputId);
    const header = input?.closest('.diario-refeicao')?.querySelector('.diario-ref-hora');
    if (header) header.textContent = ref.horario;
  });
}
