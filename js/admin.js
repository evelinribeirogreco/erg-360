// ============================================================
// EVELIN RIBEIRO GRECO — admin.js
// Painel da nutricionista: CRUD de pacientes + upload de PDF
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getEstiloInfo, getPreferenciaInfo,
  resumoPerfilPaciente, resumoPreferencia,
  CONDICOES_GRUPOS,
} from './preferencias-alimentares.js';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';

const ADMIN_EMAIL = 'evelinbeatrizrb@outlook.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Verifica se o usuário é admin por metadata (preferencial) ou email (fallback)
function isAdminUser(user) {
  return user?.user_metadata?.role === 'admin' || user?.email === ADMIN_EMAIL;
}

// Estado local
let allPatients          = [];
let deleteTargetId       = null;
let currentPatientId     = null;
let currentPatientUserId = null;

// Cache de completude de prontuário (por patient_id)
// { anamnese:bool, antropometria:bool, plano:bool, checkins:number, fases:bool }
const completenessCache  = {};

// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminSession();
  initSidebarMobile();
  initFileUpload();
  initForm();
  initPerfilNutricional();
  initAdminDarkMode();
  const dateEl = document.getElementById('admin-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
});

// ── Verifica sessão e se é administradora ─────────────────
async function checkAdminSession() {
  let { data: { session } } = await supabase.auth.getSession();

  // Tenta refresh se não tiver sessão
  if (!session) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed?.session;
  }

  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  if (!isAdminUser(session.user)) {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
    return;
  }

  loadPatients();
}

// ============================================================
// NAVEGAÇÃO ENTRE VIEWS
// ============================================================

function showView(view) {
  console.log('[ERG] showView chamado:', view);
  const dbg = document.getElementById('debug-view');
  if (dbg) dbg.textContent = 'view: ' + view;

  // Esconde todas as views conhecidas
  ['pacientes', 'novo', 'paciente'].forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.style.display = 'none';
  });

  // Mostra a view solicitada
  const target = document.getElementById('view-' + view);
  if (target) {
    target.style.display = '';
    console.log('[ERG] view-' + view + ' exibida');
  } else {
    console.error('[ERG] ERRO: view-' + view + ' não encontrada no HTML');
  }

  // Atualiza nav ativa
  const navPac = document.getElementById('nav-pacientes');
  const navNov = document.getElementById('nav-novo');
  if (navPac) navPac.className = 'nav-item' + (view === 'pacientes' ? ' active' : '');
  if (navNov) navNov.className = 'nav-item' + (view === 'novo' ? ' active' : '');

  // Ações por view
  if (view === 'pacientes') loadPatients();
  if (view === 'novo') resetForm();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Expõe para onclick no HTML
window.showView = showView;

// ============================================================
// LISTA DE PACIENTES
// ============================================================

async function loadPatients() {
  const wrapper = document.getElementById('patients-table-wrapper');

  // Busca pacientes completos + resumo clínico da view em paralelo (1 round-trip)
  const [patientsRes, summaryRes] = await Promise.all([
    supabase.from('patients').select('*').order('nome', { ascending: true }),
    supabase.from('patient_summary').select(
      'id, ultimo_checkin, score_medio_7d, checkins_semana, flags_recentes, peso_atual, gordura_atual'
    )
  ]);

  if (patientsRes.error) {
    wrapper.innerHTML = '<p class="table-empty">Erro ao carregar pacientes.</p>';
    return;
  }

  // Indexa resumo por patient_id
  const summaryMap = {};
  (summaryRes.data || []).forEach(s => { summaryMap[s.id] = s; });

  // Mescla dados do resumo direto no objeto do paciente
  allPatients = (patientsRes.data || []).map(p => ({
    ...p,
    ultimo_checkin:  summaryMap[p.id]?.ultimo_checkin  ?? null,
    score_medio_7d:  summaryMap[p.id]?.score_medio_7d  ?? null,
    checkins_semana: summaryMap[p.id]?.checkins_semana ?? 0,
    flags_recentes:  summaryMap[p.id]?.flags_recentes  ?? null,
    peso_atual:      summaryMap[p.id]?.peso_atual      ?? null,
    gordura_atual:   summaryMap[p.id]?.gordura_atual   ?? null,
  }));

  // Hook: avisa o admin-extras que pacientes carregaram
  if (window._adminExtras) {
    window._adminExtras.onPatientsLoaded(allPatients);
  }

  renderTable(allPatients);
  loadNotificacoes(); // carrega notificações após allPatients estar pronto
}

// ── Destaque de texto na busca ────────────────────────────
function hl(text, q) {
  if (!q || !text) return text || '';
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="search-hl">$1</mark>');
}

function renderTable(patients) {
  const wrapper = document.getElementById('patients-table-wrapper');

  if (patients.length === 0) {
    if (window._adminExtras) {
      const kind = (allPatients.length === 0) ? 'no-patients' : 'no-results';
      window._adminExtras.renderEmptyState(wrapper, kind);
    } else {
      wrapper.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p class="empty-state-title">Nenhuma paciente encontrada</p>
          <p class="empty-state-sub">Tente ajustar os filtros ou a busca.</p>
        </div>`;
    }
    return;
  }

  // Aplica ordenação (favoritos primeiro)
  if (window._adminExtras) {
    patients = window._adminExtras.sortPatients(patients);
    window._adminExtras.onTableRender(patients);
  }

  const hoje = new Date().toISOString().split('T')[0];
  const semana = new Date(); semana.setDate(semana.getDate() + 7);
  const semanaStr = semana.toISOString().split('T')[0];

  // KPIs — inclui pacientes sem check-in recente
  const semPlano      = allPatients.filter(p => !p.plano_url).length;
  const consultasHoje = allPatients.filter(p => p.data_proxima_consulta === hoje).length;
  const atrasadas     = allPatients.filter(p => p.data_proxima_consulta && p.data_proxima_consulta < hoje).length;
  const inativos      = allPatients.filter(p => {
    if (!p.ultimo_checkin) return !!p.plano_url;
    return Math.ceil((Date.now() - new Date(p.ultimo_checkin + 'T12:00:00')) / 86400000) > 3;
  }).length;
  setKPI('kpi-total',     allPatients.length);
  setKPI('kpi-sem-plano', semPlano);
  setKPI('kpi-hoje',      consultasHoje);
  setKPI('kpi-atrasadas', atrasadas);

  const q = (document.getElementById('search-input')?.value || '').toLowerCase();

  // ── Contagem de resultados ──
  let countEl = document.getElementById('filter-results-count');
  if (!countEl) {
    countEl = document.createElement('p');
    countEl.id = 'filter-results-count';
    countEl.style.cssText = 'font-family:"DM Sans",sans-serif;font-size:0.65rem;color:var(--subtitle);margin-bottom:8px;letter-spacing:0.06em;';
    wrapper.parentElement?.insertBefore(countEl, wrapper);
  }
  if (patients.length === allPatients.length) {
    countEl.textContent = '';
  } else {
    countEl.textContent = `Exibindo ${patients.length} de ${allPatients.length} paciente${allPatients.length !== 1 ? 's' : ''}`;
  }

  const rows = patients.map(p => {
    // ── Status inteligente (usa dados mesclados do patient_summary) ──
    let statusHtml;
    if (!p.plano_url) {
      statusHtml = '<span class="status-badge status-sem-plano">Sem plano</span>';
    } else if (!p.ultimo_checkin) {
      statusHtml = `<span class="status-badge" style="background:rgba(122,46,46,0.09);
        color:#7A2E2E;border:1px solid rgba(122,46,46,0.18);font-size:0.6rem;">
        Nunca fez check-in</span>`;
    } else {
      const dias = Math.ceil((Date.now() - new Date(p.ultimo_checkin + 'T12:00:00')) / 86400000);
      const temAlerta = p.flags_recentes?.some(f => ['energia_baixa', 'overreaching', 'descontrole'].includes(f));
      if (dias > 3) {
        statusHtml = `<span class="status-badge" style="background:rgba(184,134,11,0.09);
          color:#7A5E00;border:1px solid rgba(184,134,11,0.2);">Inativo ${dias}d</span>`;
      } else if (temAlerta) {
        statusHtml = `<span class="status-badge" style="background:rgba(122,46,46,0.07);
          color:#7A2E2E;border:1px solid rgba(122,46,46,0.15);">⚠ Alerta</span>`;
      } else {
        statusHtml = '<span class="status-badge status-ativo">Ativo</span>';
      }
    }

    // ── Último check-in ──
    let checkinHtml;
    if (!p.ultimo_checkin) {
      checkinHtml = '<span style="color:var(--text-light);font-size:0.72rem;">—</span>';
    } else {
      const dias  = Math.ceil((Date.now() - new Date(p.ultimo_checkin + 'T12:00:00')) / 86400000);
      const cor   = dias === 0 ? '#3D6B4F' : dias <= 2 ? 'var(--text-light)' : '#B8860B';
      const label = dias === 0 ? 'hoje' : dias === 1 ? 'ontem' : `${dias}d atrás`;
      const score = p.score_medio_7d != null
        ? `<span style="color:var(--detail);"> · ${p.score_medio_7d}pts</span>` : '';
      checkinHtml = `<span style="font-size:0.75rem;color:${cor};">${label}</span>${score}`;
    }

    // ── Próxima consulta ──
    let consultaHtml = '<span class="consulta-vazia">—</span>';
    if (p.data_proxima_consulta) {
      if (p.data_proxima_consulta < hoje) {
        consultaHtml = `<span class="consulta-atrasada">⚠ ${formatDate(p.data_proxima_consulta)}</span>`;
      } else if (p.data_proxima_consulta === hoje) {
        consultaHtml = `<span class="consulta-hoje">● Hoje</span>`;
      } else {
        consultaHtml = `<span style="font-size:0.78rem;color:var(--text-light);">${formatDate(p.data_proxima_consulta)}</span>`;
      }
    }

    // Enriquecimento via admin-extras (avatar, tags, ações inline, sparkline, fase pill)
    const ext = window._adminExtras ? window._adminExtras.enrichRow(p) : null;
    const avatar = ext ? ext.avatar : '';
    const tags   = ext ? ext.tags : statusHtml;
    const fasePill = ext ? ext.fasePill : '';
    const spark  = ext ? ext.spark : '';
    const actions = ext ? ext.actions : '';

    return `<tr class="patient-row" data-id="${p.id}">
      <td>
        <div class="patient-cell">
          ${avatar}
          <div class="patient-cell-text">
            <span class="table-name">${hl(p.nome, q)}</span>
            <span class="patient-cell-email">${hl(p.email, q)}</span>
          </div>
        </div>
      </td>
      <td><div class="row-tags">${tags}${fasePill}</div></td>
      <td>${checkinHtml}${spark ? '<div class="row-spark">' + spark + '</div>' : ''}</td>
      <td>${consultaHtml}</td>
      <td>
        <div class="row-end">
          ${actions}
          <button class="btn-ver-paciente" data-id="${p.id}" data-uid="${p.user_id}" data-nome="${encodeURIComponent(p.nome)}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 8 16 12 12 16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Ver
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Cabeçalho com colunas ordenáveis
  const sort = window._adminExtras ? window._adminExtras.getSort() : { col: 'nome', dir: 'asc' };
  const arrow = (col) => sort.col === col ? `<span class="sort-arrow">${sort.dir === 'asc' ? '▲' : '▼'}</span>` : '';
  wrapper.innerHTML = `
    <table class="patients-table">
      <thead><tr>
        <th class="sortable" data-sort="nome">Nome ${arrow('nome')}</th>
        <th>Status / Fase</th>
        <th class="sortable" data-sort="checkin">Último check-in ${arrow('checkin')}</th>
        <th class="sortable" data-sort="consulta">Próxima consulta ${arrow('consulta')}</th>
        <th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  // bind sort
  wrapper.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      if (!window._adminExtras) return;
      window._adminExtras.setSort(th.dataset.sort);
      filterPatients();
    });
  });

  wrapper.querySelectorAll('.btn-ver-paciente').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.id;
      const uid  = btn.dataset.uid;
      const nome = decodeURIComponent(btn.dataset.nome || '');
      verPaciente(id, uid, nome);
    });
  });

  // ── Tooltip de hover nas linhas ───────────────────────────
  const tooltip = document.getElementById('patient-hover-tooltip') || (() => {
    const t = document.createElement('div');
    t.id = 'patient-hover-tooltip';
    t.className = 'patient-tooltip';
    document.body.appendChild(t);
    return t;
  })();

  wrapper.querySelectorAll('tr.patient-row').forEach(row => {
    row.addEventListener('mouseenter', (e) => {
      const p = allPatients.find(x => x.id === row.dataset.id);
      if (!p) return;
      const score  = p.score_medio_7d != null ? `Score 7d: <strong>${p.score_medio_7d}</strong>` : 'Sem score';
      const peso   = p.peso_atual      != null ? `Peso: <strong>${p.peso_atual} kg</strong>`      : '';
      const checkins = `Check-ins/sem: <strong>${p.checkins_semana || 0}</strong>`;
      const flags  = (p.flags_recentes || []).filter(f => f !== 'ok');
      const flagHtml = flags.length ? `<span style="color:#B8860B;">⚠ ${flags.join(', ')}</span>` : '';
      tooltip.innerHTML = [score, checkins, peso, flagHtml].filter(Boolean).join('<br>');
      tooltip.style.display = 'block';
    });
    row.addEventListener('mousemove', (e) => {
      tooltip.style.top  = (e.clientY + 14) + 'px';
      tooltip.style.left = Math.min(e.clientX + 16, window.innerWidth - 220) + 'px';
    });
    row.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  });

  renderAlertasAdmin(patients);
}

// ── Painel de atenção clínica — aparece acima da lista ────
function renderAlertasAdmin(patients) {
  const hoje = new Date().toISOString().split('T')[0];

  // Classifica cada paciente pelo tipo de atenção necessária
  const semPlano   = patients.filter(p => !p.plano_url);
  const inativos   = patients.filter(p => {
    if (!p.ultimo_checkin) return !!p.plano_url; // tem plano mas nunca fez check-in
    return Math.ceil((Date.now() - new Date(p.ultimo_checkin + 'T12:00:00')) / 86400000) > 3;
  });
  const emAlerta   = patients.filter(p =>
    p.flags_recentes?.some(f => ['energia_baixa', 'overreaching', 'descontrole'].includes(f))
  );
  const consultaHoje = patients.filter(p => p.data_proxima_consulta === hoje);
  const consultaAtrasada = patients.filter(p =>
    p.data_proxima_consulta && p.data_proxima_consulta < hoje
  );

  // Só mostra o painel se houver algo a reportar
  const temAlgo = inativos.length || emAlerta.length || semPlano.length ||
                  consultaHoje.length || consultaAtrasada.length;

  let container = document.getElementById('alertas-admin-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'alertas-admin-container';
    const tableWrapper = document.getElementById('patients-table-wrapper');
    tableWrapper?.parentElement?.insertBefore(container, tableWrapper);
  }

  if (!temAlgo) { container.innerHTML = ''; return; }

  const itens = [];

  if (consultaHoje.length) {
    itens.push({
      cor: '#3A5E8B', bg: 'rgba(58,94,139,0.07)',
      titulo: `${consultaHoje.length} consulta${consultaHoje.length > 1 ? 's' : ''} hoje`,
      msg: consultaHoje.map(p => p.nome.split(' ')[0]).join(', '),
    });
  }
  if (emAlerta.length) {
    itens.push({
      cor: '#7A2E2E', bg: 'rgba(122,46,46,0.06)',
      titulo: `${emAlerta.length} paciente${emAlerta.length > 1 ? 's' : ''} com alerta clínico`,
      msg: emAlerta.map(p => p.nome.split(' ')[0]).join(', ') + ' — verificar check-in recente',
    });
  }
  if (inativos.length) {
    itens.push({
      cor: '#B8860B', bg: 'rgba(184,134,11,0.06)',
      titulo: `${inativos.length} paciente${inativos.length > 1 ? 's' : ''} sem check-in há 3+ dias`,
      msg: inativos.slice(0, 3).map(p => p.nome.split(' ')[0]).join(', ')
           + (inativos.length > 3 ? ` e mais ${inativos.length - 3}` : ''),
    });
  }
  if (consultaAtrasada.length) {
    itens.push({
      cor: '#8B5E3C', bg: 'rgba(139,94,60,0.06)',
      titulo: `${consultaAtrasada.length} consulta${consultaAtrasada.length > 1 ? 's' : ''} em atraso`,
      msg: consultaAtrasada.map(p => p.nome.split(' ')[0]).join(', '),
    });
  }
  if (semPlano.length) {
    itens.push({
      cor: 'var(--detail)', bg: 'rgba(184,147,106,0.06)',
      titulo: `${semPlano.length} paciente${semPlano.length > 1 ? 's' : ''} sem plano alimentar`,
      msg: semPlano.slice(0, 3).map(p => p.nome.split(' ')[0]).join(', ')
           + (semPlano.length > 3 ? ` e mais ${semPlano.length - 3}` : ''),
    });
  }

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <p style="font-family:'DM Sans',sans-serif;font-size:0.58rem;letter-spacing:0.18em;
        text-transform:uppercase;color:var(--subtitle);margin-bottom:10px;font-weight:500;">
        Atenção clínica
      </p>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${itens.map(a => `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;
            border-left:3px solid ${a.cor};background:${a.bg};">
            <div style="flex:1;min-width:0;">
              <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.78rem;
                color:${a.cor};margin-bottom:2px;">${a.titulo}</p>
              <p style="font-family:'DM Sans',sans-serif;font-size:0.72rem;
                color:var(--text-light);line-height:1.4;">${a.msg}</p>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

function setKPI(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// Filtros combinados
function filterPatients() {
  const q       = (document.getElementById('search-input')?.value || '').toLowerCase();
  const plano   = document.getElementById('filter-plano')?.value || '';
  const consulta= document.getElementById('filter-consulta')?.value || '';
  const hoje    = new Date().toISOString().split('T')[0];
  const semana  = new Date(); semana.setDate(semana.getDate() + 7);
  const semStr  = semana.toISOString().split('T')[0];

  let filtered = allPatients;

  if (q) filtered = filtered.filter(p =>
    p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  );

  if (plano === 'com') filtered = filtered.filter(p => p.plano_url);
  if (plano === 'sem') filtered = filtered.filter(p => !p.plano_url);

  if (consulta === 'hoje')    filtered = filtered.filter(p => p.data_proxima_consulta === hoje);
  if (consulta === 'semana')  filtered = filtered.filter(p => p.data_proxima_consulta && p.data_proxima_consulta >= hoje && p.data_proxima_consulta <= semStr);
  if (consulta === 'atrasada')filtered = filtered.filter(p => p.data_proxima_consulta && p.data_proxima_consulta < hoje);

  // Aplica filtros avançados (status, objetivo, favoritos, agenda-day)
  if (window._adminExtras) {
    filtered = window._adminExtras.applyAdvancedFilter(filtered);
  }

  renderTable(filtered);
}

// Nota: renderTable usa os dados mesclados de patient_summary diretamente
// nos objetos de allPatients. Filtros locais não precisam refetchá-los.

window.filterPatients = filterPatients;

// ── Completude do prontuário ───────────────────────────────
// Busca, em paralelo, se a paciente já tem cada seção preenchida.
// Só faz HEAD count para ser barato. Resultado fica no cache e é
// usado tanto pelo checklist do topo quanto pelos badges dos cards.
async function loadPatientCompleteness(patientId) {
  if (!patientId) return null;

  const head = (table) =>
    supabase.from(table).select('id', { count: 'exact', head: true })
      .eq('patient_id', patientId);

  const [anam, antro, plano, ckin, fases] = await Promise.all([
    head('anamnese'),
    head('antropometria'),
    head('planos_alimentares'),
    head('checkins'),
    head('fases'),
  ]);

  const result = {
    anamnese:      (anam.count  || 0) > 0,
    antropometria: (antro.count || 0) > 0,
    plano:         (plano.count || 0) > 0,
    checkins:      (ckin.count  || 0),
    fases:         (fases.count || 0) > 0,
  };

  completenessCache[patientId] = result;
  return result;
}

// Renderiza a tira de checklist logo abaixo do nome da paciente.
// "Prontuário 3 de 5 preenchido" + ícones coloridos por seção.
function renderChecklistStrip(c) {
  const host = document.getElementById('pac-checklist-strip');
  if (!host) return;

  if (!c) {
    host.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;color:var(--text-light);
        font-family:'DM Sans',sans-serif;font-size:0.72rem;">
        <span class="erg-spinner"></span> Verificando prontuário…
      </div>`;
    return;
  }

  const items = [
    { k:'anamnese',       label:'Anamnese',       ok:c.anamnese      },
    { k:'antropometria',  label:'Antropometria',  ok:c.antropometria },
    { k:'plano',          label:'Plano',          ok:c.plano         },
    { k:'checkins',       label:'Check-ins',      ok:c.checkins > 0, badge: c.checkins ? `${c.checkins}` : null },
    { k:'fases',          label:'Fases',          ok:c.fases         },
  ];

  const okCount = items.filter(i => i.ok).length;
  const total   = items.length;
  const pct     = Math.round((okCount / total) * 100);
  const pend    = items.filter(i => !i.ok).map(i => i.label);

  const pendLine = pend.length
    ? `<p class="pac-check-missing">Pendente: <strong>${pend.join(' · ')}</strong></p>`
    : `<p class="pac-check-missing" style="color:#3D6B4F;">✓ Prontuário completo</p>`;

  host.innerHTML = `
    <div class="pac-checklist-card">
      <div class="pac-checklist-head">
        <div>
          <p class="pac-checklist-eyebrow">Completude do prontuário</p>
          <p class="pac-checklist-title">${okCount} de ${total} seções preenchidas</p>
        </div>
        <div class="pac-checklist-pct">${pct}%</div>
      </div>

      <div class="pac-checklist-bar">
        <div class="pac-checklist-bar-fill" style="width:${pct}%;"></div>
      </div>

      <div class="pac-checklist-items">
        ${items.map(i => `
          <span class="pac-check-chip ${i.ok ? 'ok' : 'pend'}" title="${i.ok ? 'Preenchido' : 'Pendente'}">
            <span class="pac-check-icon">${i.ok ? '✓' : '○'}</span>
            ${i.label}${i.badge ? `<span class="pac-check-badge">${i.badge}</span>` : ''}
          </span>`).join('')}
      </div>

      ${pendLine}
    </div>`;
}

// ── Página individual da paciente ─────────────────────────
function verPaciente(id, userId, nome) {
  console.log('[ERG] verPaciente chamado:', id, userId, nome);
  currentPatientId     = id;
  currentPatientUserId = userId;

  document.getElementById('pac-nome-titulo').textContent = nome;
  document.getElementById('pac-greeting').textContent    = 'Prontuário de';

  // Busca dados rápidos da paciente
  const p = allPatients.find(x => x.id === id);
  if (p) {
    const partes = [];
    if (p.email)                  partes.push(p.email);
    if (p.data_proxima_consulta)  partes.push('Próxima: ' + formatDate(p.data_proxima_consulta));
    document.getElementById('pac-info-rapida').textContent = partes.join('  ·  ');

    // Badge de preferência alimentar
    renderPrefBadgePaciente(p);

    // Hook: registra paciente em "recentes"
    if (window._adminExtras) window._adminExtras.onPatientView(p);
  }

  // Botão editar
  const btnEditar = document.getElementById('pac-btn-editar');
  if (btnEditar) btnEditar.onclick = () => editPatient(id);

  // Botão de dossiê clínico (central de inteligência)
  const btnDossie = document.getElementById('pac-btn-dossie');
  if (btnDossie) {
    btnDossie.href = `admin-dossie.html?patient=${id}&nome=${encodeURIComponent(nome)}`;
  }

  // Botão de relatório de consulta
  const btnRelatorio = document.getElementById('pac-btn-relatorio');
  if (btnRelatorio) {
    btnRelatorio.href = `admin-relatorio.html?patient=${id}&nome=${encodeURIComponent(nome)}`;
  }

  showView('paciente');

  // Mostra checklist vazio enquanto carrega
  renderChecklistStrip(null);
  showPacTab('plano', document.querySelector('.pac-tab'));

  // Carrega completude (anamnese, antropometria, plano, check-ins, fases)
  // em uma única leva de 5 counts paralelos e reaproveita no cache.
  loadPatientCompleteness(id).then(c => {
    // Só atualiza se a paciente atual ainda é a mesma
    if (currentPatientId !== id) return;
    renderChecklistStrip(c);
    // Re-renderiza a aba atual para aplicar os badges nos cards
    const activeTab = document.querySelector('.pac-tab.active');
    const tabName   = activeTab?.textContent?.trim().toLowerCase() || 'plano';
    const mapped    = tabName.includes('anamnese')  ? 'anamnese'
                    : tabName.includes('antro')     ? 'antro'
                    : tabName.includes('check')     ? 'checkins'
                    : tabName.includes('fase')      ? 'fases'
                    : 'plano';
    showPacTab(mapped, activeTab);
  }).catch(err => {
    console.warn('[ERG] Falha ao carregar completude:', err);
    const host = document.getElementById('pac-checklist-strip');
    if (host) host.innerHTML = '';
  });
}

// Badge do perfil nutricional no painel da paciente
function renderPrefBadgePaciente(p) {
  const estilo = p?.estilo_alimentar || p?.preferencia_alimentar || 'onivoro';
  const restr  = Array.isArray(p?.restricoes_alimentares) ? p.restricoes_alimentares : [];
  const cond   = Array.isArray(p?.condicoes_clinicas) ? p.condicoes_clinicas : [];
  const temPerfil = (estilo !== 'onivoro' && estilo !== 'onivora')
                 || restr.length || cond.length
                 || p?.objetivo || p?.estrategia_nutricional
                 || (p?.consistencia && p.consistencia !== 'normal')
                 || (p?.fase_da_vida && p.fase_da_vida !== 'adulto');

  let host = document.getElementById('pac-pref-badge');
  if (!temPerfil) { if (host) host.innerHTML = ''; return; }

  if (!host) {
    const parent = document.getElementById('pac-info-rapida')?.parentNode;
    if (!parent) return;
    host = document.createElement('div');
    host.id = 'pac-pref-badge';
    host.style.cssText = 'margin-top:8px;';
    parent.appendChild(host);
  }
  const info = getEstiloInfo(estilo);
  host.innerHTML = `
    <span style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;
                 background:${info.cor}18;border:1px solid ${info.cor}40;border-radius:14px;
                 font-family:'DM Sans',sans-serif;font-size:0.72rem;font-weight:500;
                 color:${info.cor};letter-spacing:0.04em;max-width:100%;">
      ${info.icon} ${resumoPerfilPaciente(p)}
    </span>
  `;
}

function showPacTab(tab, btn) {
  // Atualiza aba ativa
  document.querySelectorAll('.pac-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const content  = document.getElementById('pac-tab-content');
  const id       = currentPatientId;
  const userId   = currentPatientUserId;
  const nome     = document.getElementById('pac-nome-titulo').textContent;
  const pac      = allPatients.find(x => x.id === id) || {};
  const nascEnc  = encodeURIComponent(pac.data_nascimento || '');
  const sexoEnc  = encodeURIComponent(pac.sexo || '');

  // Completude (se já carregada no cache) — determina ✓ / ○ de cada card
  const c = completenessCache[id] || null;
  const statusOf = (key) => {
    if (!c) return null;
    if (key === 'plano')    return c.plano;
    if (key === 'anamnese') return c.anamnese;
    if (key === 'antro')    return c.antropometria;
    if (key === 'checkins') return c.checkins > 0;
    if (key === 'fases')    return c.fases;
    return null;
  };

  const actions = {
    plano:     { label: 'Plano Alimentar',  sub: 'Editar cardápio e macros',        href: `admin-plano.html?patient_id=${id}&user_id=${userId}&nome=${encodeURIComponent(nome)}` },
    anamnese:  { label: 'Anamnese',         sub: 'Histórico clínico completo',       href: `anamnese.html?patient_id=${id}&user_id=${userId}&nome=${encodeURIComponent(nome)}` },
    antro:     { label: 'Antropometria',    sub: 'Medidas e composição corporal',    href: `antropometria.html?patient_id=${id}&user_id=${userId}&nome=${encodeURIComponent(nome)}&nascimento=${nascEnc}&sexo=${sexoEnc}` },
    checkins:  { label: 'Check-ins',        sub: 'Acompanhamento semanal',           href: `admin-checkins.html?patient_id=${id}&nome=${encodeURIComponent(nome)}` },
    fases:     { label: 'Fases',            sub: 'Plano de tratamento por etapas',   href: `admin-fases.html?patient_id=${id}&user_id=${userId}&nome=${encodeURIComponent(nome)}` },
  };

  const a = actions[tab];
  if (!a) return;

  const statusChip = (ok) => {
    if (ok === null) return ''; // ainda carregando
    return ok
      ? `<span class="pac-action-status ok"    title="Preenchido">✓</span>`
      : `<span class="pac-action-status pend"  title="Pendente">○</span>`;
  };

  // Sub-texto enriquecido (ex: "3 check-ins registrados" quando aplicável)
  const subOf = (k, v) => {
    if (!c) return v.sub;
    if (k === 'checkins' && c.checkins > 0) return `${c.checkins} check-in${c.checkins>1?'s':''} registrado${c.checkins>1?'s':''}`;
    if (statusOf(k) === false) return `${v.sub} · pendente`;
    return v.sub;
  };

  content.innerHTML = `
    <div style="padding:32px 0 0;">
      <div class="pac-action-grid" style="margin-bottom:24px;">
        ${Object.entries(actions).map(([k,v]) => {
          const ok = statusOf(k);
          const pendClass = ok === false ? 'pac-action-pendente' : '';
          return `
          <a class="pac-action-card ${k===tab?'pac-action-active':''} ${pendClass}" href="${v.href}">
            <div style="flex:1;min-width:0;">
              <div class="pac-action-label">${statusChip(ok)}${v.label}</div>
              <div class="pac-action-sub">${subOf(k,v)}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="flex-shrink:0;color:var(--detail)"><polyline points="9 18 15 12 9 6"/></svg>
          </a>`;
        }).join('')}
      </div>

      <div style="border:1px solid var(--detail);padding:28px;background:var(--bg-secondary);text-align:center;">
        <p style="font-family:'Cormorant Garamond',serif;font-weight:300;font-size:1.3rem;color:var(--text);margin-bottom:8px;">${a.label}</p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.8rem;color:var(--text-light);margin-bottom:20px;">${a.sub}</p>
        <a href="${a.href}" class="btn-primary" style="width:auto;display:inline-flex;padding:14px 32px;">
          Abrir ${a.label}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>
    </div>
  `;
}

window.verPaciente  = verPaciente;
window.showPacTab   = showPacTab;

// ============================================================
// FORMULÁRIO — NOVO / EDIÇÃO
// ============================================================

function initForm() {
  const form = document.getElementById('patient-form');
  form.addEventListener('submit', handleFormSubmit);
}

function resetForm() {
  document.getElementById('patient-form').reset();
  document.getElementById('edit-patient-id').value  = '';
  document.getElementById('edit-user-id').value     = '';
  document.getElementById('edit-plano-atual').value = '';
  document.getElementById('form-mode-label').textContent = 'Cadastro de';
  document.getElementById('form-mode-title').textContent = 'Nova Paciente';
  document.getElementById('submit-btn').textContent = 'Salvar Paciente';
  document.getElementById('form-message').className = 'form-message';
  const flEl = document.getElementById('file-label');     if (flEl) flEl.textContent = 'Clique para selecionar o PDF';
  const fdEl = document.getElementById('file-drop-area'); if (fdEl) fdEl.className = 'file-drop-area';
  const paiEl = document.getElementById('plano-atual-info'); if(paiEl) paiEl.style.display = 'none';
  const sgEl = document.getElementById('senha-group'); if(sgEl) sgEl.style.display = '';
  const ehEl = document.getElementById('email-hint'); if (ehEl) ehEl.textContent = 'Será usado para o login da paciente';

  // Limpa o input de arquivo
  document.getElementById('f-plano').value = '';
}

// Preenche formulário com dados da paciente para edição
function editPatient(id) {
  const p = allPatients.find(x => x.id === id);
  if (!p) return;

  showView('novo');

  document.getElementById('form-mode-label').textContent = 'Editar dados de';
  document.getElementById('form-mode-title').textContent = p.nome;
  document.getElementById('submit-btn').textContent      = 'Salvar Alterações';

  // Preenche campos
  document.getElementById('edit-patient-id').value  = p.id;
  document.getElementById('edit-user-id').value     = p.user_id;
  document.getElementById('edit-plano-atual').value = p.plano_url || '';
  document.getElementById('f-nome').value           = p.nome || '';
  document.getElementById('f-email').value          = p.email || '';
  document.getElementById('f-ultima').value         = p.data_ultima_consulta || '';
  document.getElementById('f-proxima').value        = p.data_proxima_consulta || '';
  document.getElementById('f-obs').value            = p.observacoes || '';
  document.getElementById('f-metas').value          = p.metas || '';
  // Perfil nutricional completo (7 camadas)
  if (typeof aplicarPerfilNutr === 'function') aplicarPerfilNutr(p);
  // Telefone, sexo, nascimento
  const telEl = document.getElementById('f-telefone'); if (telEl) telEl.value = p.telefone || '';
  const sexEl = document.getElementById('f-sexo');     if (sexEl) sexEl.value = p.sexo || '';
  const nasEl = document.getElementById('f-nascimento'); if (nasEl) nasEl.value = p.data_nascimento || '';

  // Em modo edição, senha e e-mail são informativos
  const sgEl = document.getElementById('senha-group'); if(sgEl) sgEl.style.display = 'none';
  document.getElementById('email-hint').textContent     = 'E-mail não pode ser alterado aqui';

  // Mostra plano atual se houver
  if (p.plano_url) {
    const nome = p.plano_url.split('/').pop();
    const panEl = document.getElementById('plano-atual-nome'); if (panEl) panEl.textContent = nome;
    const paiEl = document.getElementById('plano-atual-info'); if (paiEl) paiEl.style.display = '';
    const flEl  = document.getElementById('file-label');       if (flEl)  flEl.textContent = 'Novo PDF (substitui o atual)';
  }
}

window.editPatient = editPatient;

// ══════════════════════════════════════════════════════════
// PERFIL NUTRICIONAL — 7 camadas do cardápio
// ══════════════════════════════════════════════════════════
function initPerfilNutricional() {
  // 1) Popula as condições clínicas agrupadas
  const host = document.getElementById('f-condicoes-host');
  if (host && !host.dataset.populated) {
    host.innerHTML = CONDICOES_GRUPOS.map(g => `
      <div style="grid-column:1/-1;margin-top:6px;">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.66rem;letter-spacing:0.14em;
                  text-transform:uppercase;color:var(--subtitle);margin:8px 0 4px 0;">
          ${g.grupo}
        </p>
      </div>
      ${g.condicoes.map(c => `
        <label style="display:inline-flex;align-items:center;gap:6px;
                      font-family:'DM Sans',sans-serif;font-size:0.8rem;color:var(--text);cursor:pointer;">
          <input type="checkbox" class="f-condicao" value="${c.key}"> ${c.label}
        </label>
      `).join('')}
    `).join('');
    host.dataset.populated = '1';
  }

  // 2) Preview ao vivo
  const campos = ['f-estilo','f-objetivo','f-estrategia','f-consistencia','f-fase-vida'];
  campos.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', atualizarPerfilPreview);
  });
  document.querySelectorAll('.f-condicao, .f-restr').forEach(cb => {
    cb.addEventListener('change', atualizarPerfilPreview);
  });
  atualizarPerfilPreview();
}

function atualizarPerfilPreview() {
  const el = document.getElementById('f-perfil-preview-text');
  if (!el) return;
  const p = coletarPerfilNutr();
  el.textContent = resumoPerfilPaciente(p);
}

function coletarPerfilNutr() {
  const condicoes = Array.from(document.querySelectorAll('.f-condicao:checked')).map(cb => cb.value);
  const restricoes = Array.from(document.querySelectorAll('.f-restr:checked')).map(cb => cb.value);
  return {
    estilo_alimentar:       document.getElementById('f-estilo')?.value || 'onivoro',
    condicoes_clinicas:     condicoes,
    objetivo:               document.getElementById('f-objetivo')?.value || null,
    estrategia_nutricional: document.getElementById('f-estrategia')?.value || null,
    consistencia:           document.getElementById('f-consistencia')?.value || 'normal',
    fase_da_vida:           document.getElementById('f-fase-vida')?.value || 'adulto',
    restricoes_alimentares: restricoes,
  };
}

function aplicarPerfilNutr(p) {
  const setV = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || ''; };
  setV('f-estilo',       p?.estilo_alimentar || p?.preferencia_alimentar || 'onivoro');
  setV('f-objetivo',     p?.objetivo || '');
  setV('f-estrategia',   p?.estrategia_nutricional || '');
  setV('f-consistencia', p?.consistencia || 'normal');
  setV('f-fase-vida',    p?.fase_da_vida || 'adulto');

  const condicoes  = Array.isArray(p?.condicoes_clinicas) ? p.condicoes_clinicas : [];
  document.querySelectorAll('.f-condicao').forEach(cb => { cb.checked = condicoes.includes(cb.value); });

  const restricoes = Array.isArray(p?.restricoes_alimentares) ? p.restricoes_alimentares : [];
  document.querySelectorAll('.f-restr').forEach(cb => { cb.checked = restricoes.includes(cb.value); });

  atualizarPerfilPreview();
}

function togglePerfilNutr() {
  const body  = document.getElementById('perfil-nutr-body');
  const arrow = document.getElementById('perfil-nutr-arrow');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display   = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
}

window.togglePerfilNutr = togglePerfilNutr;

// ── Submit: cria ou atualiza paciente ─────────────────────
async function handleFormSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById('submit-btn');
  const msg = document.getElementById('form-message');
  btn.disabled    = true;
  btn.textContent = 'Salvando...';
  msg.className   = 'form-message';

  const isEdit    = !!document.getElementById('edit-patient-id').value;
  const patientId = document.getElementById('edit-patient-id').value;
  const userId    = document.getElementById('edit-user-id').value;

  const nome    = document.getElementById('f-nome').value.trim();
  const email        = document.getElementById('f-email').value.trim();
  const nascimento   = document.getElementById('f-nascimento')?.value || '';
  const telefone     = document.getElementById('f-telefone')?.value.trim() || null;
  const sexo         = document.getElementById('f-sexo')?.value || null;
  // Senha automática = data de nascimento no formato DDMMAAAA
  const senhaAuto    = nascimento
    ? nascimento.replace(/-/g, '').split('').reverse().join('').replace(/(\d{4})(\d{2})(\d{2})/, '$3$2$1')
    : '';
  // Converte YYYY-MM-DD → DDMMAAAA
  const senhaData    = nascimento
    ? (() => { const [y,m,d] = nascimento.split('-'); return d+m+y; })()
    : '';
  const senha        = document.getElementById('f-senha').value || senhaData;
  const ultima  = document.getElementById('f-ultima').value || null;
  const proxima = document.getElementById('f-proxima').value || null;
  const obs     = document.getElementById('f-obs').value.trim() || null;
  const metas   = document.getElementById('f-metas').value.trim() || null;
  const arquivo = document.getElementById('f-plano').files[0];
  // Perfil nutricional completo (7 camadas)
  const perfilNutr = (typeof coletarPerfilNutr === 'function')
    ? coletarPerfilNutr()
    : { estilo_alimentar:'onivoro', condicoes_clinicas:[], objetivo:null,
        estrategia_nutricional:null, consistencia:'normal', fase_da_vida:'adulto',
        restricoes_alimentares:[] };
  // Compat: também grava preferencia_alimentar (coluna legada)
  const estiloToPreferencia = {
    onivoro:'onivora', vegetariano_ovolacto:'vegetariana', vegetariano_lacto:'vegetariana',
    vegano:'vegana', pescetariano:'pescetariana', flexitariano:'flexitariana'
  };
  const preferencia_alimentar = estiloToPreferencia[perfilNutr.estilo_alimentar] || 'onivora';
  const restricoes_alimentares = perfilNutr.restricoes_alimentares;

  // Validação básica
  if (!nome || !email) {
    showFormMsg(msg, 'Nome e e-mail são obrigatórios.', 'error');
    btn.disabled = false; btn.textContent = isEdit ? 'Salvar Alterações' : 'Salvar Paciente';
    return;
  }

  if (!isEdit && !senha) {
    showFormMsg(msg, 'Informe uma senha inicial para a paciente.', 'error');
    btn.disabled = false; btn.textContent = 'Salvar Paciente';
    return;
  }

  try {
    let finalUserId = userId;
    let planoUrl    = document.getElementById('edit-plano-atual').value || null;

    // ── NOVO CADASTRO: usa Edge Function para criar usuário ──
    if (!isEdit) {
      const response = await fetch(
        'https://gqnlrhmriufepzpustna.supabase.co/functions/v1/criar-paciente',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email, senha, nome,
            plano_url:             null,
            data_ultima_consulta:  ultima,
            data_proxima_consulta: proxima,
            observacoes:           obs,
            metas,
            telefone,
            sexo,
            data_nascimento:       nascimento || null,
            preferencia_alimentar,
            restricoes_alimentares,
            // Perfil nutricional completo
            estilo_alimentar:       perfilNutr.estilo_alimentar,
            condicoes_clinicas:     perfilNutr.condicoes_clinicas,
            objetivo:               perfilNutr.objetivo,
            estrategia_nutricional: perfilNutr.estrategia_nutricional,
            consistencia:           perfilNutr.consistencia,
            fase_da_vida:           perfilNutr.fase_da_vida,
          })
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        showFormMsg(msg, 'Erro ao criar acesso: ' + (result.error || 'Tente novamente.'), 'error');
        btn.disabled = false; btn.textContent = 'Salvar Paciente';
        return;
      }

      finalUserId = result.user_id;

      // Upload do PDF após ter o user_id
      if (arquivo) {
        planoUrl = await uploadPlano(arquivo, finalUserId);
        if (planoUrl) {
          await supabase.from('patients').update({ plano_url: planoUrl }).eq('user_id', finalUserId);
        }
      }

      const iniciarAvaliacao = document.getElementById('f-iniciar-avaliacao')?.value === '1';
      showToast('Paciente cadastrada com sucesso.');

      // Reseta flag
      if (document.getElementById('f-iniciar-avaliacao'))
        document.getElementById('f-iniciar-avaliacao').value = '0';

      if (iniciarAvaliacao) {
        // Abre página da paciente direto com checklist
        verPacienteComChecklist(finalUserId, result.patient_id || finalUserId, nome);
      } else {
        // Abre página da paciente normalmente
        await loadPatients();
        const paciente = allPatients.find(p => p.user_id === finalUserId);
        if (paciente) {
          verPaciente(paciente.id, paciente.user_id, paciente.nome);
        } else {
          showView('pacientes');
        }
      }

      btn.disabled = false;
      return;
    }

    // ── EDIÇÃO: fluxo normal ─────────────────────────────
    // Upload do PDF se houver arquivo selecionado
    if (arquivo) {
      planoUrl = await uploadPlano(arquivo, finalUserId);
      if (!planoUrl) {
        showFormMsg(msg, 'Erro ao enviar o PDF. Verifique o arquivo e tente novamente.', 'error');
        btn.disabled = false; btn.textContent = 'Salvar Alterações';
        return;
      }
    }

    // Monta payload para edição
    const payload = {
      user_id:                finalUserId,
      data_nascimento:        nascimento || null,
      telefone:               telefone,
      sexo:                   sexo,
      nome,
      email,
      plano_url:              planoUrl,
      data_ultima_consulta:   ultima,
      data_proxima_consulta:  proxima,
      observacoes:            obs,
      metas,
      preferencia_alimentar,
      restricoes_alimentares,
      // Perfil nutricional completo (7 camadas)
      estilo_alimentar:       perfilNutr.estilo_alimentar,
      condicoes_clinicas:     perfilNutr.condicoes_clinicas,
      objetivo:               perfilNutr.objetivo,
      estrategia_nutricional: perfilNutr.estrategia_nutricional,
      consistencia:           perfilNutr.consistencia,
      fase_da_vida:           perfilNutr.fase_da_vida,
    };

    let dbError;

    if (isEdit) {
      const { error } = await supabase
        .from('patients')
        .update(payload)
        .eq('id', patientId);
      dbError = error;
    } else {
      const { error } = await supabase
        .from('patients')
        .insert(payload);
      dbError = error;
    }

    if (dbError) {
      showFormMsg(msg, 'Erro ao salvar dados: ' + dbError.message, 'error');
      btn.disabled = false; btn.textContent = isEdit ? 'Salvar Alterações' : 'Salvar Paciente';
      return;
    }

    // Sucesso
    showToast(isEdit ? 'Dados atualizados com sucesso.' : 'Paciente cadastrada com sucesso.');
    showView('pacientes');

  } catch (err) {
    showFormMsg(msg, 'Erro inesperado. Tente novamente.', 'error');
    btn.disabled = false; btn.textContent = isEdit ? 'Salvar Alterações' : 'Salvar Paciente';
  }
}

// ── Upload do PDF para o Supabase Storage ─────────────────
async function uploadPlano(file, userId) {
  const ext      = file.name.split('.').pop();
  const path     = `${userId}/plano-${Date.now()}.${ext}`;
  const progress = document.getElementById('upload-progress');
  const fill     = document.getElementById('progress-fill');
  const label    = document.getElementById('progress-label');

  if (progress) progress.style.display = '';
  if (fill)     fill.style.width       = '10%';
  if (label)    label.textContent      = 'Enviando arquivo...';

  const { data, error } = await supabase.storage
    .from('planos')
    .upload(path, file, { upsert: true, contentType: 'application/pdf' });

  if (error) {
    if (progress) progress.style.display = 'none';
    return null;
  }

  if (fill)  fill.style.width  = '100%';
  if (label) label.textContent = 'Arquivo enviado.';

  setTimeout(() => { if (progress) progress.style.display = 'none'; }, 1200);

  // Retorna o path (não a URL pública — usamos signed URL no dashboard)
  return data.path;
}

// ============================================================
// EXCLUSÃO DE PACIENTE
// ============================================================

function openDeleteModal(id) {
  deleteTargetId = id;
  document.getElementById('delete-modal').style.display = 'flex';
  document.getElementById('confirm-delete-btn').onclick = confirmDelete;
}

function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('delete-modal').style.display = 'none';
}

async function confirmDelete() {
  if (!deleteTargetId) return;

  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', deleteTargetId);

  closeDeleteModal();

  if (error) {
    showToast('Erro ao remover paciente.');
    return;
  }

  showToast('Paciente removida.');
  loadPatients();
}

window.openDeleteModal  = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;

// ============================================================
// UPLOAD — drag and drop
// ============================================================

function initFileUpload() {
  const area  = document.getElementById('file-drop-area');
  const input = document.getElementById('f-plano');
  const label = document.getElementById('file-label');

  // Guard: se algum elemento não existir (ex: form sem upload de PDF), não quebra
  if (!area || !input || !label) return;

  input.addEventListener('change', () => {
    if (input.files[0]) {
      label.textContent = input.files[0].name;
      area.classList.add('has-file');
    }
  });

  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('drag-over');
  });

  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));

  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      // Transfere para o input
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      label.textContent = file.name;
      area.classList.add('has-file');
    } else {
      showToast('Por favor, selecione apenas arquivos PDF.');
    }
  });
}

// ============================================================
// LOGOUT
// ============================================================

async function adminLogout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

window.adminLogout = adminLogout;

// ============================================================
// UTILITÁRIOS
// ============================================================

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showFormMsg(el, text, type) {
  el.textContent = text;
  el.className   = `form-message ${type} visible`;
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = 'toast visible' + (type ? ` toast-${type}` : '');
  setTimeout(() => { t.classList.remove('visible'); }, 3200);
}

function initSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btn     = document.getElementById('hamburger-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}

// ── Abre formulários de anamnese e antropometria ──────────
function openFases(patientId, userId, nome) {
  window.location.href = `admin-fases.html?patient=${patientId}&user=${userId}&nome=${encodeURIComponent(nome)}`;
}
window.openFases = openFases;

function openAnamnese(patientId, userId, nome) {
  const url = `anamnese.html?patient=${patientId}&user=${userId}&nome=${encodeURIComponent(nome)}`;
  window.location.href = url;
}

function openAntropometria(patientId, userId, nome) {
  const pac     = allPatients.find(x => x.id === patientId) || {};
  const nascEnc = encodeURIComponent(pac.data_nascimento || '');
  const sexoEnc = encodeURIComponent(pac.sexo || '');
  const url = `antropometria.html?patient=${patientId}&user=${userId}&nome=${encodeURIComponent(nome)}&nascimento=${nascEnc}&sexo=${sexoEnc}`;
  window.location.href = url;
}

window.openAnamnese      = openAnamnese;
window.openAntropometria = openAntropometria;

function openPlano(patientId, userId, nome) {
  window.location.href = `admin-plano.html?patient_id=${patientId}&user_id=${userId}&nome=${encodeURIComponent(nome)}`;
}

function openCheckins(patientId, nome) {
  window.location.href = `admin-checkins.html?patient=${patientId}&nome=${encodeURIComponent(nome)}`;
}

window.openPlano    = openPlano;
window.openCheckins = openCheckins;

// ── Calculadora de prazo de metas ─────────────────────────
function calcularPrazoMeta() {
  const atual  = parseFloat(document.getElementById('meta-peso-atual')?.value);
  const alvo   = parseFloat(document.getElementById('meta-peso-alvo')?.value);
  const ritmo  = parseFloat(document.getElementById('meta-ritmo')?.value || 0.5);
  const res    = document.getElementById('meta-resultado');
  const texto  = document.getElementById('meta-resultado-texto');

  if (!atual || !alvo || isNaN(atual) || isNaN(alvo)) { if (res) res.style.display = 'none'; return; }

  const diff = atual - alvo;
  if (diff <= 0) {
    texto.innerHTML = 'A meta já foi atingida ou o peso alvo é maior que o atual.';
    res.style.display = '';
    return;
  }

  const semanas    = Math.ceil(diff / ritmo);
  const meses      = (semanas / 4.33).toFixed(1);
  const dataAlvo   = new Date();
  dataAlvo.setDate(dataAlvo.getDate() + semanas * 7);
  const dataStr    = dataAlvo.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const kcalDef    = ritmo === 0.5 ? 500 : ritmo === 0.25 ? 250 : ritmo === 0.75 ? 750 : 1000;

  texto.innerHTML = `
    <strong>Perda necessária:</strong> ${diff.toFixed(1)} kg &nbsp;|&nbsp;
    <strong>Ritmo:</strong> ${ritmo} kg/semana<br>
    <strong>Estimativa:</strong> ${semanas} semanas (~${meses} meses)<br>
    <strong>Previsão de conclusão:</strong> ${dataStr}<br>
    <strong>Déficit calórico sugerido:</strong> ~${kcalDef} kcal/dia
  `;
  res.style.display = '';
}

function inserirMetaCalculada() {
  const atual    = parseFloat(document.getElementById('meta-peso-atual')?.value);
  const alvo     = parseFloat(document.getElementById('meta-peso-alvo')?.value);
  const ritmo    = parseFloat(document.getElementById('meta-ritmo')?.value || 0.5);
  if (!atual || !alvo) return;

  const semanas  = Math.ceil((atual - alvo) / ritmo);
  const dataAlvo = new Date();
  dataAlvo.setDate(dataAlvo.getDate() + semanas * 7);
  const mes      = dataAlvo.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const campo = document.getElementById('f-metas');
  const linha = `Atingir ${alvo} kg até ${mes} (ritmo ${ritmo} kg/semana, ~${semanas} semanas)`;
  campo.value = campo.value ? campo.value.trim() + '\n' + linha : linha;
}

// Expõe globalmente
window.calcularPrazoMeta   = calcularPrazoMeta;
window.inserirMetaCalculada = inserirMetaCalculada;


// ── Verificação de email duplicado ────────────────────────
let emailCheckTimer = null;
async function verificarEmailDuplicado(email) {
  const msg = document.getElementById('email-dup-msg');
  const hint = document.getElementById('email-hint');
  if (!msg) return;

  clearTimeout(emailCheckTimer);
  if (!email || email.length < 5) {
    msg.style.display = 'none';
    return;
  }

  emailCheckTimer = setTimeout(async () => {
    const { data } = await supabase
      .from('patients')
      .select('id')
      .eq('email', email.trim())
      .maybeSingle();

    // Ignora se estiver editando a própria paciente
    const editId = document.getElementById('edit-patient-id')?.value;
    if (data && data.id !== editId) {
      msg.textContent = 'Este e-mail já está cadastrado no sistema.';
      msg.style.display = '';
      if (hint) hint.style.display = 'none';
    } else {
      msg.style.display = 'none';
      if (hint) hint.style.display = '';
    }
  }, 600);
}
window.verificarEmailDuplicado = verificarEmailDuplicado;


// ── Abre paciente recém-criada com checklist ──────────────
async function verPacienteComChecklist(userId, patientDbId, nome) {
  // Recarrega lista para ter o ID correto
  const { data } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (data) {
    allPatients = allPatients.filter(p => p.user_id !== userId);
    allPatients.push(data);
    verPaciente(data.id, data.user_id, data.nome);
    // Carrega completude (paciente nova = tudo vazio) e mostra checklist
    loadPatientCompleteness(data.id).finally(() => {
      setTimeout(() => showChecklist(data.id, data.user_id, data.nome), 300);
    });
  } else {
    showView('pacientes');
  }
}

function showChecklist(patientId, userId, nome) {
  const content = document.getElementById('pac-tab-content');
  if (!content) return;

  const nomeEnc = encodeURIComponent(nome);
  const c = completenessCache[patientId] || null;

  // Helpers para renderizar cada passo com estado real
  const stepState = (filled) => ({
    ok:    !!filled,
    // Primeiro item PENDENTE ganha destaque "Comece aqui"
  });

  const steps = [
    { n:1, filled: c?.anamnese,      label:'Preencher anamnese',            sub:'Histórico clínico, hábitos e objetivos',           href:`anamnese.html?patient_id=${patientId}&user_id=${userId}&nome=${nomeEnc}` },
    { n:2, filled: c?.antropometria, label:'Inserir dados antropométricos', sub:'Peso, altura, circunferências e composição corporal', href:`antropometria.html?patient_id=${patientId}&user_id=${userId}&nome=${nomeEnc}` },
    { n:3, filled: c?.plano,         label:'Criar plano alimentar',         sub:'Cardápio, macros e orientações nutricionais',      href:`admin-plano.html?patient_id=${patientId}&user_id=${userId}&nome=${nomeEnc}` },
    { n:4, filled: c?.fases,         label:'Definir fases do tratamento',   sub:'Etapas e objetivos por período',                   href:`admin-fases.html?patient_id=${patientId}&user_id=${userId}&nome=${nomeEnc}` },
  ];

  // Primeiro passo ainda não feito = próximo a atacar
  const firstPendingIdx = steps.findIndex(s => !s.filled);
  const allDone = firstPendingIdx === -1;

  const stepRowHtml = (s, idx) => {
    const isNext = idx === firstPendingIdx;
    const circleStyle = s.filled
      ? 'background:#3D6B4F;border-color:#3D6B4F;color:#fff;'
      : isNext
        ? 'border-color:#C9A882;color:#C9A882;background:rgba(201,168,130,0.12);'
        : 'border-color:var(--detail);color:var(--subtitle);';
    const circleContent = s.filled ? '✓' : s.n;
    const nextBadge = isNext
      ? `<span style="display:inline-block;margin-left:8px;padding:2px 8px;background:#C9A882;color:#fff;font-family:'DM Sans',sans-serif;font-size:0.55rem;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;">Comece aqui</span>`
      : '';
    const rowBg = s.filled ? 'rgba(61,107,79,0.04)' : 'var(--bg-primary)';
    const borderBottom = idx < steps.length - 1 ? 'border-bottom:1px solid rgba(184,147,106,0.2);' : '';

    return `
      <a href="${s.href}"
        style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:${rowBg};${borderBottom}text-decoration:none;transition:background 0.15s;"
        onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='${rowBg}'">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:22px;height:22px;border:1.5px solid;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;font-size:0.65rem;font-weight:600;${circleStyle}">
            ${circleContent}
          </div>
          <div>
            <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.82rem;color:${s.filled?'var(--text-light)':'var(--text)'};${s.filled?'text-decoration:line-through;text-decoration-color:rgba(44,34,24,0.25);':''}">
              ${s.label}${nextBadge}
            </p>
            <p style="font-family:'DM Sans',sans-serif;font-weight:300;font-size:0.72rem;color:var(--text-light);">${s.sub}</p>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--detail);flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
      </a>`;
  };

  const eyebrow  = allDone ? 'Prontuário completo' : 'Complete o cadastro';
  const titulo   = allDone
    ? `Tudo pronto para ${nome.split(' ')[0]}`
    : `Próximos passos para ${nome.split(' ')[0]}`;
  const subtitle = allDone
    ? 'Todas as seções estão preenchidas. Siga para check-ins e acompanhamento.'
    : 'Siga os passos abaixo na ordem sugerida. As seções marcadas com ✓ já foram preenchidas.';

  // Dica de atalho com PDFs (economiza tempo de digitação)
  const dicaPdf = allDone ? '' : `
    <div style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;margin-bottom:16px;
      background:rgba(201,168,130,0.08);border-left:3px solid #C9A882;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A882" stroke-width="2" style="flex-shrink:0;margin-top:1px;">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <div>
        <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.72rem;color:var(--text);margin-bottom:3px;">
          Tem os PDFs da paciente?
        </p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.7rem;color:var(--text-light);line-height:1.5;">
          Dentro de cada seção (Anamnese, Antropometria, Plano Alimentar) há o botão
          <strong>Extrair de PDF</strong> que preenche os campos automaticamente.
        </p>
      </div>
    </div>`;

  content.innerHTML = `
    <div style="padding:32px 0 0;">

      <div style="border:1px solid var(--detail);padding:28px;margin-bottom:24px;background:var(--bg-secondary);">
        <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--subtitle);margin-bottom:12px;">${eyebrow}</p>
        <p style="font-family:'Cormorant Garamond',serif;font-weight:300;font-size:1.4rem;color:var(--text);margin-bottom:6px;">${titulo}</p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text-light);margin-bottom:20px;line-height:1.55;">${subtitle}</p>

        ${dicaPdf}

        <div style="display:flex;flex-direction:column;gap:0;border:1px solid var(--detail);">
          ${steps.map((s, idx) => stepRowHtml(s, idx)).join('')}
        </div>
      </div>

      <div style="display:flex;gap:12px;align-items:center;">
        <button onclick="showPacTab('plano', document.querySelector('.pac-tab'))"
          style="font-family:'DM Sans',sans-serif;font-weight:400;font-size:0.7rem;color:var(--text);background:transparent;border:1px solid var(--detail);cursor:pointer;padding:10px 16px;letter-spacing:0.1em;text-transform:uppercase;">
          Ver abas da paciente
        </button>
        <button onclick="showView('pacientes')"
          style="font-family:'DM Sans',sans-serif;font-weight:300;font-size:0.72rem;color:var(--text-light);background:none;border:none;cursor:pointer;padding:8px 0;letter-spacing:0.06em;">
          ${allDone ? 'Voltar à lista' : 'Fazer depois — ir para lista'}
        </button>
      </div>

    </div>
  `;

  // Reseta abas
  document.querySelectorAll('.pac-tab').forEach(t => t.classList.remove('active'));
}

window.showChecklist = showChecklist;
window.verPacienteComChecklist = verPacienteComChecklist;

// Atalho: abre o wizard "Próximos passos" na paciente atual,
// reaproveitando a completude já em cache (ou buscando se faltar).
async function openNextSteps() {
  if (!currentPatientId) return;
  // Limpa aba ativa (o wizard ocupa o lugar da aba)
  document.querySelectorAll('.pac-tab').forEach(t => t.classList.remove('active'));

  const pac = allPatients.find(x => x.id === currentPatientId);
  const nome = pac?.nome || document.getElementById('pac-nome-titulo').textContent;

  // Garante completude atualizada
  if (!completenessCache[currentPatientId]) {
    await loadPatientCompleteness(currentPatientId);
    renderChecklistStrip(completenessCache[currentPatientId]);
  }
  showChecklist(currentPatientId, currentPatientUserId, nome);
}
window.openNextSteps = openNextSteps;

// ============================================================
// SISTEMA DE NOTIFICAÇÕES
// ============================================================

let notifCache = []; // notificações DB + locais mescladas

// ── Carrega notificações do banco e gera as locais ────────
async function loadNotificacoes() {
  const { data: dbNotifs } = await supabase
    .from('notificacoes')
    .select('*')
    .eq('lida', false)
    .order('criada_em', { ascending: false })
    .limit(50);

  const locais = gerarNotificacoesLocais();

  // Evita duplicar: remove notif local se já existe uma idêntica no banco
  const tiposDB = new Set((dbNotifs || []).map(n => `${n.patient_id}_${n.tipo}`));
  const locaisFiltradas = locais.filter(n => !tiposDB.has(`${n.patient_id}_${n.tipo}`));

  notifCache = [...(dbNotifs || []), ...locaisFiltradas];
  atualizarBadge();
}

// ── Gera notificações em tempo real a partir de allPatients ─
function gerarNotificacoesLocais() {
  const hoje    = new Date().toISOString().split('T')[0];
  const amanha  = new Date(); amanha.setDate(amanha.getDate() + 1);
  const amanhaStr = amanha.toISOString().split('T')[0];
  const notifs  = [];

  allPatients.forEach(p => {
    const primeiroNome = p.nome.split(' ')[0];

    // Sem check-in há 3+ dias (paciente com plano)
    if (p.plano_url) {
      if (!p.ultimo_checkin) {
        notifs.push({ id: `l_nunca_${p.id}`, patient_id: p.id, tipo: 'sem_checkin',
          mensagem: `${primeiroNome} nunca realizou check-in`, _local: true });
      } else {
        const dias = Math.ceil((Date.now() - new Date(p.ultimo_checkin + 'T12:00:00')) / 86400000);
        if (dias >= 3) {
          notifs.push({ id: `l_inativo_${p.id}`, patient_id: p.id, tipo: 'sem_checkin',
            mensagem: `${primeiroNome} sem check-in há ${dias} dia${dias > 1 ? 's' : ''}`, _local: true });
        }
      }
    }

    const flags = p.flags_recentes || [];

    if (flags.includes('overreaching'))
      notifs.push({ id: `l_over_${p.id}`, patient_id: p.id, tipo: 'sobrecarga',
        mensagem: `${primeiroNome} com sinais de sobrecarga de treino`, _local: true });

    if (flags.includes('fome_alta'))
      notifs.push({ id: `l_fome_${p.id}`, patient_id: p.id, tipo: 'fome_alta',
        mensagem: `${primeiroNome} reportou fome elevada`, _local: true });

    if (flags.includes('sono_ruim'))
      notifs.push({ id: `l_sono_${p.id}`, patient_id: p.id, tipo: 'sono_baixo',
        mensagem: `${primeiroNome} com qualidade de sono ruim`, _local: true });

    if (flags.includes('intestino'))
      notifs.push({ id: `l_int_${p.id}`, patient_id: p.id, tipo: 'intestino',
        mensagem: `${primeiroNome} reportou alteração intestinal`, _local: true });

    // Consulta amanhã
    if (p.data_proxima_consulta === amanhaStr)
      notifs.push({ id: `l_amanha_${p.id}`, patient_id: p.id, tipo: 'consulta_proxima',
        mensagem: `Consulta de ${primeiroNome} é amanhã`, _local: true });

    // Consulta hoje
    if (p.data_proxima_consulta === hoje)
      notifs.push({ id: `l_hoje_${p.id}`, patient_id: p.id, tipo: 'consulta_proxima',
        mensagem: `Consulta de ${primeiroNome} é hoje`, _local: true });
  });

  return notifs;
}

// ── Badge no sino ─────────────────────────────────────────
function atualizarBadge() {
  const badge = document.getElementById('notif-badge');
  const count = notifCache.length;
  if (!badge) return;
  badge.textContent = count > 9 ? '9+' : count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

// ── Abre / fecha painel ───────────────────────────────────
function abrirNotificacoes() {
  const panel   = document.getElementById('notif-panel');
  const overlay = document.getElementById('notif-overlay');
  if (panel)   panel.style.right = '0';
  if (overlay) overlay.style.display = 'block';
  renderNotificacoesPainel();
}

function fecharNotificacoes() {
  const panel   = document.getElementById('notif-panel');
  const overlay = document.getElementById('notif-overlay');
  if (panel)   panel.style.right = '-400px';
  if (overlay) overlay.style.display = 'none';
}

// ── Renderiza lista no painel ─────────────────────────────
function renderNotificacoesPainel() {
  const lista = document.getElementById('notif-lista');
  if (!lista) return;

  const markAllBtn = document.getElementById('notif-mark-all');
  if (markAllBtn) markAllBtn.style.display = notifCache.length ? 'inline' : 'none';

  if (notifCache.length === 0) {
    lista.innerHTML = `
      <div style="padding:48px 20px;text-align:center;">
        <div style="font-size:2rem;margin-bottom:12px;">✓</div>
        <p style="font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:300;color:var(--text);margin-bottom:6px;">Tudo em dia</p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text-light);">Nenhuma notificação pendente.</p>
      </div>`;
    return;
  }

  const ICONE = {
    sem_checkin:      '⏱',
    sono_baixo:       '😴',
    fome_alta:        '🍽',
    consulta_proxima: '📅',
    sobrecarga:       '⚠️',
    intestino:        '🌿',
    positivo:         '✨',
  };
  const COR = {
    sem_checkin:      '#B8860B',
    sono_baixo:       '#3A5E8B',
    fome_alta:        '#8B5E3C',
    consulta_proxima: '#3D6B4F',
    sobrecarga:       '#7A2E2E',
    intestino:        '#3D6B4F',
    positivo:         '#3D6B4F',
  };

  lista.innerHTML = notifCache.map(n => {
    const icone = ICONE[n.tipo] || '●';
    const cor   = COR[n.tipo]   || 'var(--detail)';
    const tempo = n._local ? 'agora' : formatarTempoNotif(n.criada_em);
    const btnLer = n._local ? '' :
      `<button onclick="marcarLida('${n.id}')" style="font-family:'DM Sans',sans-serif;
        font-size:0.65rem;color:var(--subtitle);background:none;border:none;
        cursor:pointer;padding:0;text-decoration:underline;margin-top:4px;">
        Marcar como lida
      </button>`;
    return `
      <div style="padding:14px 20px;border-bottom:1px solid rgba(184,147,106,0.12);
        border-left:3px solid ${cor};transition:background 0.15s;"
        onmouseover="this.style.background='var(--bg-secondary)'"
        onmouseout="this.style.background=''">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="font-size:1.1rem;flex-shrink:0;margin-top:1px;">${icone}</span>
          <div style="flex:1;min-width:0;">
            <p style="font-family:'DM Sans',sans-serif;font-size:0.8rem;color:var(--text);
              font-weight:500;margin-bottom:2px;">${n.mensagem}</p>
            <p style="font-family:'DM Sans',sans-serif;font-size:0.68rem;color:var(--text-light);">${tempo}</p>
            ${btnLer}
          </div>
        </div>
      </div>`;
  }).join('');
}

function formatarTempoNotif(criada_em) {
  const diff = Math.floor((Date.now() - new Date(criada_em)) / 60000);
  if (diff < 1)   return 'agora';
  if (diff < 60)  return `${diff}min atrás`;
  const h = Math.floor(diff / 60);
  if (h < 24)     return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

// ── Marcar lida / todas lidas ─────────────────────────────
async function marcarLida(id) {
  await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
  notifCache = notifCache.filter(n => n.id !== id);
  atualizarBadge();
  renderNotificacoesPainel();
}

async function marcarTodasLidas() {
  const dbIds = notifCache.filter(n => !n._local).map(n => n.id);
  if (dbIds.length > 0) {
    await supabase.from('notificacoes').update({ lida: true }).in('id', dbIds);
  }
  notifCache = [];
  atualizarBadge();
  renderNotificacoesPainel();
}

window.abrirNotificacoes  = abrirNotificacoes;
window.fecharNotificacoes = fecharNotificacoes;
window.marcarLida         = marcarLida;
window.marcarTodasLidas   = marcarTodasLidas;

// ============================================================
// DARK MODE (admin)
// ============================================================

function initAdminDarkMode() {
  const saved = localStorage.getItem('erg-theme') || 'light';
  applyAdminTheme(saved);

  const btn = document.getElementById('dark-toggle-admin');
  if (btn) btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyAdminTheme(next);
    localStorage.setItem('erg-theme', next);
  });
}

function applyAdminTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('dark-icon-admin');
  if (!icon) return;
  if (theme === 'dark') {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  } else {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  }
}

// ============================================================
// ATALHOS DE TECLADO
// ============================================================

document.addEventListener('keydown', (e) => {
  // Ignora quando o foco está em input / textarea / select
  const tag = document.activeElement?.tagName?.toLowerCase();
  const editando = ['input', 'textarea', 'select'].includes(tag);

  // Esc — fecha modal de exclusão ou painel de notificações
  if (e.key === 'Escape') {
    const modal = document.getElementById('delete-modal');
    const notifPanel = document.getElementById('notif-panel');
    if (modal?.style.display === 'flex')       { closeDeleteModal(); return; }
    if (notifPanel?.style.right === '0px')     { fecharNotificacoes(); return; }
  }

  if (editando) return; // demais atalhos só fora de campos

  // N — nova paciente
  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    showView('novo');
  }

  // F — foca na busca
  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    const search = document.getElementById('search-input');
    if (search) { search.focus(); search.select(); }
  }

  // P — vai para lista de pacientes
  if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    showView('pacientes');
  }

  // D — alterna dark mode
  if (e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyAdminTheme(next);
    localStorage.setItem('erg-theme', next);
  }
});
