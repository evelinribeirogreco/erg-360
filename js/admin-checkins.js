// ============================================================
// admin-checkins.js — Visualização de check-ins (Admin)
// ============================================================

import { createClient }        from 'https://esm.sh/@supabase/supabase-js@2';
import { renderScoreMetabolico } from './score-metabolico.js';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';
const ADMIN_EMAIL   = 'evelinbeatrizrb@outlook.com';

function isAdminUser(user) {
  return user?.user_metadata?.role === 'admin' || user?.email === ADMIN_EMAIL;
}

const supabase  = createClient(SUPABASE_URL, SUPABASE_ANON);
let patientId   = null;
let patientNome = '';
let diasPeriodo = 7;
let charts      = {};

// ── Inicialização ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkAdmin();
  loadFromUrl();
  initSidebar();
});

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !isAdminUser(session.user)) window.location.href = 'index.html';
}

function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  patientId   = params.get('patient') || params.get('patient_id');
  patientNome = decodeURIComponent(params.get('nome') || 'Paciente');

  document.getElementById('patient-nome-sidebar').textContent = patientNome.split(' ')[0];
  document.getElementById('ci-patient-title').textContent     = patientNome;
  document.getElementById('ci-empty-title').textContent       = patientNome;

  loadCheckins();
}

// ── Carrega check-ins ─────────────────────────────────────
async function loadCheckins() {
  document.getElementById('ci-loading').style.display = '';
  document.getElementById('ci-content').style.display = 'none';
  document.getElementById('ci-empty').style.display   = 'none';

  const dataInicio = new Date();
  dataInicio.setDate(dataInicio.getDate() - diasPeriodo);
  const inicio = dataInicio.toISOString().split('T')[0];

  const { data: checkins, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('patient_id', patientId)
    .gte('data', inicio)
    .order('data', { ascending: true });

  document.getElementById('ci-loading').style.display = 'none';

  if (error || !checkins || checkins.length === 0) {
    document.getElementById('ci-empty').style.display = '';
    return;
  }

  document.getElementById('ci-content').style.display = '';
  document.getElementById('ci-total-label').textContent =
    `${checkins.length} check-in${checkins.length > 1 ? 's' : ''} registrado${checkins.length > 1 ? 's' : ''}`;

  // ── Score Metabólico Inteligente (renderiza primeiro) ──
  renderScoreMetabolico(checkins, 'smet-mount');

  renderResumo(checkins);
  renderGraficos(checkins);
  renderIntestino(checkins);
  renderTabela(checkins);
  loadDiarioAdmin();
}

// ── Resumo ────────────────────────────────────────────────
function renderResumo(checkins) {
  const n = checkins.length;
  const avg = (field) => {
    const vals = checkins.map(c => c[field]).filter(v => v !== null && v !== undefined);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };

  const sonoMedio    = avg('sono_horas');
  const sonoQual     = avg('sono_qualidade');
  const energiaMedia = avg('energia');
  const humorMedio   = avg('humor');
  const aguaMedia    = avg('agua_litros');
  const fomeMedia    = avg('fome_nivel');
  const treinosDias  = checkins.filter(c => c.treinou).length;
  const evacDias     = checkins.filter(c => c.evacuou).length;

  // Score
  let score = 0, pesos = 0;
  if (sonoMedio !== null)    { score += Math.min((sonoMedio / 8) * 2, 2);    pesos += 2; }
  if (sonoQual !== null)     { score += (sonoQual / 5) * 1.5;                pesos += 1.5; }
  if (energiaMedia !== null) { score += (energiaMedia / 5) * 2;              pesos += 2; }
  if (humorMedio !== null)   { score += (humorMedio / 5) * 1.5;              pesos += 1.5; }
  if (aguaMedia !== null)    { score += Math.min((aguaMedia / 2) * 1.5, 1.5); pesos += 1.5; }
  if (n >= 5)                { score += 1.5; pesos += 1.5; }
  if (pesos > 0) score = Math.min((score / pesos) * 10, 10);

  const grid = document.getElementById('resumo-grid');
  grid.innerHTML = [
    { label: 'Score', val: pesos >= 3 ? score.toFixed(1) + '/10' : '—', sub: 'Bem-estar geral' },
    { label: 'Sono médio', val: sonoMedio ? sonoMedio.toFixed(1) + 'h' : '—', sub: sonoMedio >= 7 ? 'Adequado' : sonoMedio ? 'Insuficiente' : '—' },
    { label: 'Energia média', val: energiaMedia ? energiaMedia.toFixed(1) + '/5' : '—', sub: energiaMedia >= 4 ? 'Alta' : energiaMedia ? 'Normal' : '—' },
    { label: 'Humor médio', val: humorMedio ? humorMedio.toFixed(1) + '/5' : '—', sub: humorMedio >= 4 ? 'Estável' : humorMedio ? 'Irregular' : '—' },
    { label: 'Água média', val: aguaMedia ? aguaMedia.toFixed(1) + 'L' : '—', sub: aguaMedia >= 2 ? 'Ótima' : aguaMedia ? 'Baixa' : '—' },
    { label: 'Treinos', val: treinosDias + 'x', sub: `de ${n} dias` },
    { label: 'Evacuações', val: evacDias + '/' + n, sub: evacDias >= n * 0.8 ? 'Regular' : 'Atenção' },
    { label: 'Fome média', val: fomeMedia !== null ? fomeMedia.toFixed(1) + '/4' : '—', sub: fomeMedia >= 3 ? 'Elevada' : fomeMedia !== null ? 'Normal' : '—' },
  ].map(m => `
    <div class="info-card">
      <p class="info-card-label">${m.label}</p>
      <p class="info-card-value">${m.val}</p>
      <p class="info-card-sub">${m.sub}</p>
    </div>
  `).join('');
}

// ── Gráficos ──────────────────────────────────────────────
function renderGraficos(checkins) {
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.font.weight = '300';
  Chart.defaults.color       = '#9A7D5E';

  const labels = checkins.map(c => {
    const d = new Date(c.data + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  });

  // Destrói gráficos anteriores
  Object.values(charts).forEach(ch => ch.destroy());
  charts = {};

  // ── Energia e Humor ──────────────────────────────────
  charts.eh = new Chart(document.getElementById('chart-energia-humor'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Energia',
          data: checkins.map(c => c.energia),
          borderColor: '#C9A882',
          backgroundColor: 'rgba(201,168,130,0.08)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#C9A882',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Humor',
          data: checkins.map(c => c.humor),
          borderColor: '#9A7D5E',
          backgroundColor: 'rgba(154,125,94,0.06)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#9A7D5E',
          tension: 0.3,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: 'rgba(201,168,130,0.15)' } },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 8 } }
      }
    }
  });

  // ── Sono ─────────────────────────────────────────────
  charts.sono = new Chart(document.getElementById('chart-sono'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Horas de sono',
        data: checkins.map(c => c.sono_horas),
        backgroundColor: checkins.map(c =>
          !c.sono_horas ? 'rgba(201,168,130,0.2)' :
          c.sono_horas >= 7 ? 'rgba(74,124,95,0.5)' :
          c.sono_horas >= 6 ? 'rgba(201,168,130,0.5)' :
          'rgba(139,58,58,0.4)'
        ),
        borderColor: checkins.map(c =>
          !c.sono_horas ? 'rgba(201,168,130,0.3)' :
          c.sono_horas >= 7 ? '#4a7c5f' :
          c.sono_horas >= 6 ? '#C9A882' : '#8B3A3A'
        ),
        borderWidth: 1,
        borderRadius: 2,
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { min: 0, max: 10, ticks: { callback: v => v + 'h' }, grid: { color: 'rgba(201,168,130,0.15)' } },
        x: { grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });

  // ── Hidratação e treino ───────────────────────────────
  charts.hidra = new Chart(document.getElementById('chart-hidra-treino'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Água (L)',
          data: checkins.map(c => c.agua_litros),
          backgroundColor: 'rgba(58,94,139,0.4)',
          borderColor: '#3A5E8B',
          borderWidth: 1,
          borderRadius: 2,
          yAxisID: 'y',
        },
        {
          label: 'Treinou',
          data: checkins.map(c => c.treinou ? 1 : 0),
          backgroundColor: checkins.map(c => c.treinou ? 'rgba(74,124,95,0.6)' : 'rgba(201,168,130,0.15)'),
          borderColor: checkins.map(c => c.treinou ? '#4a7c5f' : 'rgba(201,168,130,0.3)'),
          borderWidth: 1,
          borderRadius: 2,
          yAxisID: 'y1',
          type: 'bar',
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y:  { position: 'left',  title: { display: true, text: 'Água (L)' }, grid: { color: 'rgba(201,168,130,0.15)' } },
        y1: { position: 'right', min: 0, max: 1, display: false, grid: { display: false } },
        x:  { grid: { display: false } }
      },
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 8 } }
      }
    }
  });
}

// ── Intestino ─────────────────────────────────────────────
function renderIntestino(checkins) {
  const n = checkins.length;
  const evac = checkins.filter(c => c.evacuou).length;
  const semEvac = checkins.filter(c => c.evacuou === false).length;

  // Sintomas GI mais frequentes
  const sintomaCount = {};
  checkins.forEach(c => {
    if (c.sintomas_gi && Array.isArray(c.sintomas_gi)) {
      c.sintomas_gi.forEach(s => {
        sintomaCount[s] = (sintomaCount[s] || 0) + 1;
      });
    }
  });

  const grid = document.getElementById('intestino-grid');
  grid.innerHTML = [
    { label: 'Dias com evacuação', val: evac + '/' + n, sub: evac >= n * 0.8 ? 'Regular' : 'Atenção' },
    { label: 'Dias sem evacuação', val: semEvac, sub: semEvac > 2 ? 'Requer atenção' : 'Adequado' },
  ].map(m => `
    <div class="info-card">
      <p class="info-card-label">${m.label}</p>
      <p class="info-card-value">${m.val}</p>
      <p class="info-card-sub">${m.sub}</p>
    </div>
  `).join('');

  // Sintomas mais frequentes
  const sintomaEl = document.getElementById('sintomas-gi-resumo');
  const sintomasSorted = Object.entries(sintomaCount)
    .filter(([k]) => k !== 'nenhum')
    .sort((a, b) => b[1] - a[1]);

  if (sintomasSorted.length) {
    sintomaEl.innerHTML = `
      <p class="section-title" style="margin-bottom:12px;">Sintomas mais frequentes</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${sintomasSorted.map(([s, c]) => `
          <div style="border:1px solid var(--detail);padding:8px 16px;font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text);">
            ${s} <span style="color:var(--subtitle);margin-left:6px;">${c}×</span>
          </div>
        `).join('')}
      </div>
    `;
  }
}

// ── Tabela de check-ins ───────────────────────────────────
function renderTabela(checkins) {
  const wrapper = document.getElementById('tabela-checkins');

  const fomeLbl = ['—', 'Sem fome', 'Pouca', 'Normal', 'Muita', 'Excessiva'];
  const bristolLbl = {
    tipo1: 'T1', tipo2: 'T2', tipo3: 'T3', tipo4: 'T4',
    tipo5: 'T5', tipo6: 'T6', tipo7: 'T7'
  };

  wrapper.innerHTML = `
    <div class="tbl-wrap" style="overflow-x:auto;">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Sono</th>
            <th>Qualidade</th>
            <th>Energia</th>
            <th>Humor</th>
            <th>Água</th>
            <th>Fome</th>
            <th>Evacuou</th>
            <th>Bristol</th>
            <th>Treinou</th>
          </tr>
        </thead>
        <tbody>
          ${[...checkins].reverse().map(c => {
            const data = new Date(c.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            // Etiqueta amarela se foi preenchido retroativamente
            let retroBadge = '';
            if (c.is_retroativo) {
              const feitoEm = c.feito_em
                ? new Date(c.feito_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
                : null;
              const tooltip = feitoEm
                ? `Preenchido retroativamente em ${feitoEm}`
                : 'Preenchido retroativamente';
              retroBadge = `<span title="${tooltip}" style="display:inline-block;margin-left:4px;padding:1px 6px;background:rgba(201,168,76,0.18);color:#6B5A20;border:1px solid #C9A84C;border-radius:8px;font-size:0.55rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;vertical-align:middle;">retro</span>`;
            }
            return `
              <tr${c.is_retroativo ? ' style="background:rgba(201,168,76,0.04);"' : ''}>
                <td style="font-weight:400;white-space:nowrap;">${data}${retroBadge}</td>
                <td>${c.sono_horas ? c.sono_horas + 'h' : '—'}</td>
                <td>${c.sono_qualidade ? c.sono_qualidade + '/5' : '—'}</td>
                <td>${c.energia ? badge(c.energia, 5) : '—'}</td>
                <td>${c.humor ? badge(c.humor, 5) : '—'}</td>
                <td>${c.agua_litros ? c.agua_litros + 'L' : '—'}</td>
                <td style="font-size:0.72rem;">${c.fome_nivel !== null && c.fome_nivel !== undefined ? fomeLbl[c.fome_nivel] || '—' : '—'}</td>
                <td>${c.evacuou === true ? '<span style="color:var(--verde)">Sim</span>' : c.evacuou === false ? '<span style="color:var(--vermelho)">Não</span>' : '—'}</td>
                <td style="font-size:0.72rem;">${c.evacuacao_bristol ? bristolLbl[c.evacuacao_bristol] || c.evacuacao_bristol : '—'}</td>
                <td>${c.treinou === true ? '<span style="color:var(--verde)">Sim</span>' : c.treinou === false ? '<span style="color:var(--text-l)">Não</span>' : '—'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function badge(val, max) {
  const pct = val / max;
  const color = pct >= 0.8 ? 'var(--verde)' : pct >= 0.5 ? 'var(--text)' : 'var(--vermelho)';
  return `<span style="font-weight:400;color:${color}">${val}/${max}</span>`;
}

// ── Período ───────────────────────────────────────────────
function setPeriodo(dias) {
  diasPeriodo = dias;
  document.querySelectorAll('[id^=per-]').forEach(el => el.classList.remove('active'));
  document.getElementById(`per-${dias}`)?.classList.add('active');

  const labels = { 7: 'Últimos 7 dias', 14: 'Últimos 14 dias', 30: 'Últimos 30 dias', 90: 'Últimos 90 dias' };
  document.getElementById('ci-periodo-label').textContent = labels[dias];

  loadCheckins();
}
window.setPeriodo = setPeriodo;

// ── Sidebar mobile ────────────────────────────────────────
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btn     = document.getElementById('hamburger-btn');
  if (!btn) return;
  btn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
  overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
}

// ── Diário Alimentar no Admin ─────────────────────────────
async function loadDiarioAdmin() {
  const dataInicio = new Date();
  dataInicio.setDate(dataInicio.getDate() - diasPeriodo);
  const inicio = dataInicio.toISOString().split('T')[0];

  const { data: diarios } = await supabase
    .from('diario_alimentar')
    .select('*')
    .eq('patient_id', patientId)
    .gte('data', inicio)
    .order('data', { ascending: false });

  const wrapper = document.getElementById('tabela-diario');
  if (!wrapper) return;

  if (!diarios || diarios.length === 0) {
    wrapper.innerHTML = '<p style="font-family:\'DM Sans\',sans-serif;font-weight:300;font-size:0.85rem;color:var(--text-light);font-style:italic;padding:16px 0;">Nenhum diário registrado neste período.</p>';
    return;
  }

  const adesaoLbl = ['—','Péssima','Ruim','Regular','Boa','Ótima'];

  wrapper.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1px;background:var(--detail);border:1px solid var(--detail);">
    ${diarios.map(d => {
      const dataFmt = new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'short', day: '2-digit', month: '2-digit'
      });
      return `
        <div style="background:var(--bg-primary);padding:20px 24px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <span style="font-family:'Cormorant Garamond',serif;font-weight:300;font-size:1rem;color:var(--text);">${dataFmt}</span>
            ${d.adesao ? `<span style="font-family:'DM Sans',sans-serif;font-size:0.62rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--subtitle);">Adesão: ${adesaoLbl[d.adesao]} (${d.adesao}/5)</span>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            ${[
              ['Café da manhã', d.cafe],
              ['Lanche manhã', d.lanche_manha],
              ['Almoço', d.almoco],
              ['Lanche tarde', d.lanche_tarde],
              ['Jantar', d.jantar],
              ['Ceia', d.ceia],
            ].filter(([,val]) => val).map(([label, val]) => `
              <div>
                <p style="font-family:'DM Sans',sans-serif;font-weight:400;font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--subtitle);margin-bottom:4px;">${label}</p>
                <p style="font-family:'DM Sans',sans-serif;font-weight:300;font-size:0.8rem;color:var(--text);line-height:1.6;">${val}</p>
              </div>
            `).join('')}
          </div>
          ${d.obs ? `<p style="font-family:'DM Sans',sans-serif;font-weight:300;font-size:0.78rem;color:var(--text-light);margin-top:12px;padding-top:12px;border-top:1px solid rgba(201,168,130,0.2);font-style:italic;">${d.obs}</p>` : ''}
        </div>
      `;
    }).join('')}
    </div>
  `;
}

// Chama loadDiarioAdmin junto com loadCheckins
const _origLoad = loadCheckins;



// ── Widget de documentos ───────────────────────────────────
import { initDocExtractor, preencherFormulario } from './doc-extractor.js';

document.addEventListener('DOMContentLoaded', () => {
  initDocExtractor('doc-extractor-exames', 'exames', (dados, tipo, n) => {
    const msg = n > 0
      ? `${n} campo(s) preenchido(s). Revise e salve.`
      : 'Preencha os campos acima e clique em "Preencher formulário".';
    if (typeof showToast === 'function') showToast(msg);
  });
});
