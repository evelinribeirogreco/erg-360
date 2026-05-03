// ============================================================
// EVELIN RIBEIRO GRECO — admin-extras.js
// Todas as 24 melhorias do painel admin
// (saudação, agenda, recentes, command palette, atalhos,
//  avatares, tags, ordenação, ações inline, sparklines,
//  KPIs estratégicos, feed, alertas, empty states, dark mode,
//  export CSV, filtros avançados, favoritos, aniversariantes,
//  card view mobile, FAB)
// ============================================================

const STORAGE_RECENTS    = 'erg_admin_recents';
const STORAGE_FAVS       = 'erg_admin_favs';
const STORAGE_SORT       = 'erg_admin_sort';
const STORAGE_ACTIVITY   = 'erg_admin_activity';
const MAX_RECENTS        = 5;

// ─── Helpers globais ─────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

function getPatients() { return window._allPatients || []; }
function getJSON(k, fallback) {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
  catch (_) { return fallback; }
}
function setJSON(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
}

// ─── 1. SAUDAÇÃO PERSONALIZADA + CONTEXTO ────────────────────
function updateGreeting() {
  const h = new Date().getHours();
  const sauda = h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite';
  const eyebrow = $('admin-greeting-eyebrow');
  const name    = $('admin-greeting');
  const date    = $('admin-date');
  if (eyebrow) eyebrow.textContent = sauda;
  if (name)    name.textContent    = 'Dra. Evelin';

  const hojeStr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  // Contexto rico do dia (só funciona se patients já carregou)
  const patients = getPatients();
  if (patients.length === 0) {
    if (date) date.textContent = hojeStr;
    return;
  }
  const hoje = new Date().toISOString().split('T')[0];
  const consultasHoje = patients.filter(p => p.data_proxima_consulta === hoje).length;
  const checkinsHoje  = patients.filter(p => p.ultimo_checkin === hoje).length;
  const partes = [];
  if (consultasHoje) partes.push(`${consultasHoje} consulta${consultasHoje > 1 ? 's' : ''}`);
  if (checkinsHoje)  partes.push(`${checkinsHoje} check-in${checkinsHoje > 1 ? 's' : ''}`);
  const ctx = partes.length ? ` · ${partes.join(' · ')}` : '';
  if (date) date.textContent = hojeStr + ctx;
}

// ─── 2. WIDGET AGENDA DA SEMANA ──────────────────────────────
function renderAgenda() {
  const el = $('admin-agenda');
  if (!el) return;
  const patients = getPatients();
  const dias = [];
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoje); d.setDate(hoje.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const consultas = patients.filter(p => p.data_proxima_consulta === iso);
    dias.push({
      iso, date: d, count: consultas.length,
      isToday: i === 0,
      label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      day:   d.getDate(),
      nomes: consultas.map(p => p.nome),
    });
  }
  el.innerHTML = dias.map(d => `
    <button type="button" class="agenda-day ${d.isToday ? 'today' : ''} ${d.count ? 'has-events' : ''}"
      data-iso="${d.iso}" title="${d.nomes.join(', ') || 'Sem consultas'}">
      <span class="agenda-day-label">${d.label}</span>
      <span class="agenda-day-num">${d.day}</span>
      <span class="agenda-day-count">${d.count ? d.count + (d.count > 1 ? ' consultas' : ' consulta') : '—'}</span>
    </button>`).join('');
  // click -> filtra a tabela por aquele dia
  el.querySelectorAll('.agenda-day').forEach(btn => {
    btn.addEventListener('click', () => {
      const iso = btn.dataset.iso;
      window._extrasDateFilter = iso;
      window.filterPatients && window.filterPatients();
      el.querySelectorAll('.agenda-day').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

// ─── 3. PACIENTES RECENTES ───────────────────────────────────
function pushRecent(p) {
  if (!p || !p.id) return;
  let arr = getJSON(STORAGE_RECENTS, []);
  arr = arr.filter(r => r.id !== p.id);
  arr.unshift({ id: p.id, nome: p.nome, user_id: p.user_id, ts: Date.now() });
  arr = arr.slice(0, MAX_RECENTS);
  setJSON(STORAGE_RECENTS, arr);
  renderRecents();
}
function renderRecents() {
  const sec = $('admin-recents-section');
  const el  = $('admin-recents');
  if (!el || !sec) return;
  const recents = getJSON(STORAGE_RECENTS, []);
  if (!recents.length) { sec.style.display = 'none'; return; }
  sec.style.display = '';
  el.innerHTML = recents.map(r => `
    <button type="button" class="recent-chip" data-id="${escapeHTML(r.id)}" data-uid="${escapeHTML(r.user_id||'')}" data-nome="${encodeURIComponent(r.nome||'')}">
      ${avatarHTML(r.nome)}
      <span class="recent-chip-name">${escapeHTML(firstName(r.nome))}</span>
    </button>
  `).join('');
  el.querySelectorAll('.recent-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.id;
      const uid  = btn.dataset.uid;
      const nome = decodeURIComponent(btn.dataset.nome || '');
      window.verPaciente && window.verPaciente(id, uid, nome);
    });
  });
}

// ─── 4. COMMAND PALETTE (Ctrl+K) ─────────────────────────────
let cmdSelectedIdx = 0;
function openCmd() {
  const overlay = $('cmd-overlay');
  const input   = $('cmd-input');
  if (!overlay || !input) return;
  overlay.style.display = 'flex';
  cmdSelectedIdx = 0;
  input.value = '';
  renderCmdResults('');
  setTimeout(() => input.focus(), 30);
}
function closeCmd() {
  const overlay = $('cmd-overlay');
  if (overlay) overlay.style.display = 'none';
}
function renderCmdResults(query) {
  const list = $('cmd-results');
  if (!list) return;
  const q = (query || '').toLowerCase().trim();
  const actions = [
    { type: 'action', label: 'Nova paciente',          icon: '+',  fn: () => { closeCmd(); window.showView && window.showView('novo'); } },
    { type: 'action', label: 'Voltar para lista',      icon: '⌂',  fn: () => { closeCmd(); window.showView && window.showView('pacientes'); } },
    { type: 'action', label: 'Exportar lista CSV',     icon: '↓',  fn: () => { closeCmd(); exportCSV(); } },
    { type: 'action', label: 'Abrir feed de atividades', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', fn: () => { closeCmd(); openActivity(); } },
    { type: 'action', label: 'Ver atalhos de teclado', icon: '⌨',  fn: () => { closeCmd(); openHelp(); } },
    { type: 'action', label: 'Alternar tema (claro/escuro)', icon: '◐', fn: () => { closeCmd(); toggleDark(); } },
    { type: 'action', label: 'Sair (logout)',          icon: '⎋',  fn: () => { closeCmd(); window.adminLogout && window.adminLogout(); } },
  ];
  const patients = getPatients();
  const patientItems = patients.filter(p => !q || p.nome.toLowerCase().includes(q) || (p.email||'').toLowerCase().includes(q))
    .slice(0, 30)
    .map(p => ({
      type: 'patient',
      id: p.id, user_id: p.user_id, nome: p.nome, email: p.email,
      fn: () => { closeCmd(); window.verPaciente && window.verPaciente(p.id, p.user_id, p.nome); }
    }));
  const actionItems = actions.filter(a => !q || a.label.toLowerCase().includes(q));

  const items = [];
  if (patientItems.length) {
    items.push({ type: 'header', label: 'Pacientes' });
    items.push(...patientItems);
  }
  if (actionItems.length) {
    items.push({ type: 'header', label: 'Ações' });
    items.push(...actionItems);
  }
  if (!patientItems.length && !actionItems.length) {
    list.innerHTML = `<div class="cmd-empty">Nenhum resultado para "${escapeHTML(query)}".</div>`;
    window._cmdItems = [];
    return;
  }
  // Filtra só os "selecionáveis" (sem headers) para navegação
  const selectable = items.filter(i => i.type !== 'header');
  if (cmdSelectedIdx >= selectable.length) cmdSelectedIdx = 0;
  let selectableIdx = 0;
  list.innerHTML = items.map(it => {
    if (it.type === 'header') return `<div class="cmd-header">${escapeHTML(it.label)}</div>`;
    const isSel = selectableIdx === cmdSelectedIdx;
    const idx = selectableIdx++;
    if (it.type === 'patient') {
      return `<button type="button" class="cmd-item ${isSel ? 'selected' : ''}" data-idx="${idx}">
        ${avatarHTML(it.nome)}
        <div class="cmd-item-text">
          <span class="cmd-item-title">${escapeHTML(it.nome)}</span>
          <span class="cmd-item-sub">${escapeHTML(it.email || '')}</span>
        </div>
      </button>`;
    }
    return `<button type="button" class="cmd-item cmd-item-action ${isSel ? 'selected' : ''}" data-idx="${idx}">
      <span class="cmd-icon-mono">${it.icon}</span>
      <div class="cmd-item-text"><span class="cmd-item-title">${escapeHTML(it.label)}</span></div>
    </button>`;
  }).join('');
  window._cmdItems = selectable;

  list.querySelectorAll('.cmd-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      const item = (window._cmdItems || [])[i];
      if (item && typeof item.fn === 'function') item.fn();
    });
  });
}
function moveCmd(delta) {
  const items = window._cmdItems || [];
  if (!items.length) return;
  cmdSelectedIdx = (cmdSelectedIdx + delta + items.length) % items.length;
  renderCmdResults($('cmd-input')?.value || '');
  // scroll into view
  const sel = document.querySelector('#cmd-results .cmd-item.selected');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}
function execCmd() {
  const items = window._cmdItems || [];
  const item = items[cmdSelectedIdx];
  if (item && typeof item.fn === 'function') item.fn();
}

// ─── 5. ATALHOS DE TECLADO ───────────────────────────────────
function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignora se foco em input/textarea (exceto Ctrl+K / Esc)
    const target = e.target;
    const inField = target.matches('input, textarea, select, [contenteditable="true"]');
    const cmdOpen = $('cmd-overlay')?.style.display === 'flex';

    // Ctrl/Cmd + K — abre command palette (sempre disponível)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      cmdOpen ? closeCmd() : openCmd();
      return;
    }

    // Esc — fecha modais
    if (e.key === 'Escape') {
      if (cmdOpen)                    return closeCmd();
      if ($('kbd-help-overlay')?.style.display === 'flex') return closeHelp();
      if ($('activity-overlay')?.style.display === 'flex') return closeActivity();
      if ($('view-paciente')?.style.display !== 'none' && $('view-paciente')?.style.display !== '') {
        return window.showView && window.showView('pacientes');
      }
    }

    // Setas / Enter — navega no command palette
    if (cmdOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveCmd(+1); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); moveCmd(-1); return; }
      if (e.key === 'Enter')     { e.preventDefault(); execCmd();   return; }
    }

    if (inField) return;

    // / -> foca busca da lista
    if (e.key === '/') {
      const search = $('search-input');
      if (search) { e.preventDefault(); search.focus(); search.select(); }
    }
    // N -> nova paciente
    else if (e.key === 'n' || e.key === 'N') {
      if (e.shiftKey) {
        // Shift+N -> notificações
        const btn = document.getElementById('notif-btn');
        btn && btn.click();
      } else {
        window.showView && window.showView('novo');
      }
    }
    // ? -> atalhos
    else if (e.key === '?') { openHelp(); }
    // A -> feed atividades
    else if (e.key === 'a' || e.key === 'A') { openActivity(); }
    // D -> dark mode
    else if (e.key === 'd' || e.key === 'D') { toggleDark(); }
  });

  const input = $('cmd-input');
  if (input) input.addEventListener('input', (e) => {
    cmdSelectedIdx = 0;
    renderCmdResults(e.target.value);
  });
}

// ─── 6. AVATARES COLORIDOS COM INICIAIS ──────────────────────
const AVATAR_COLORS = [
  ['#2D6A56', '#fff'], ['#4CB8A0', '#fff'], ['#C9A84C', '#fff'],
  ['#7A2E2E', '#fff'], ['#3A5E8B', '#fff'], ['#8B5E3C', '#fff'],
  ['#5E4FB8', '#fff'], ['#B8506E', '#fff'], ['#3D6B4F', '#fff'],
  ['#B8860B', '#fff'], ['#506E8B', '#fff'], ['#6B4F2E', '#fff'],
];
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
function getInitials(nome) {
  if (!nome) return '?';
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function avatarHTML(nome, size = 'md') {
  const ini = getInitials(nome);
  const idx = hashCode(nome || '') % AVATAR_COLORS.length;
  const [bg, fg] = AVATAR_COLORS[idx];
  return `<span class="avatar avatar-${size}" style="background:${bg};color:${fg};" aria-hidden="true">${escapeHTML(ini)}</span>`;
}
function firstName(nome) { return (nome || '').trim().split(/\s+/)[0] || ''; }

// ─── 7. TAGS / PILLS DE STATUS POR LINHA (intelligence) ──────
function getStatusTags(p) {
  const tags = [];
  const hoje = new Date().toISOString().split('T')[0];
  // Aniversariante da semana
  if (isBirthdayThisWeek(p.data_nascimento)) {
    tags.push({ cls: 'tag-bday', text: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> Aniversário', title: 'Aniversário esta semana' });
  }
  // Sem plano
  if (!p.plano_url) {
    tags.push({ cls: 'tag-warn', text: 'Sem plano' });
  }
  // Consulta hoje
  if (p.data_proxima_consulta === hoje) {
    tags.push({ cls: 'tag-info', text: 'Consulta hoje' });
  }
  // Consulta atrasada
  else if (p.data_proxima_consulta && p.data_proxima_consulta < hoje) {
    tags.push({ cls: 'tag-err', text: 'Consulta atrasada' });
  }
  // Inatividade
  if (!p.ultimo_checkin && p.plano_url) {
    tags.push({ cls: 'tag-warn', text: 'Sem check-in' });
  } else if (p.ultimo_checkin) {
    const dias = Math.ceil((Date.now() - new Date(p.ultimo_checkin + 'T12:00:00')) / 86400000);
    if (dias > 7)      tags.push({ cls: 'tag-err',  text: `${dias}d sem check-in` });
    else if (dias > 3) tags.push({ cls: 'tag-warn', text: `${dias}d sem check-in` });
  }
  // Alerta clínico
  if ((p.flags_recentes || []).some(f => ['energia_baixa', 'overreaching', 'descontrole'].includes(f))) {
    tags.push({ cls: 'tag-err', text: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Alerta clínico' });
  }
  if (!tags.length) tags.push({ cls: 'tag-ok', text: 'Em acompanhamento' });
  return tags;
}
function tagsHTML(p) {
  const tags = getStatusTags(p);
  return tags.map(t => `<span class="status-tag ${t.cls}" title="${escapeHTML(t.title || t.text)}">${escapeHTML(t.text)}</span>`).join('');
}

// ─── 8. ORDENAÇÃO ────────────────────────────────────────────
function getSort() { return getJSON(STORAGE_SORT, { col: 'nome', dir: 'asc' }); }
function setSort(col) {
  const cur = getSort();
  const dir = cur.col === col ? (cur.dir === 'asc' ? 'desc' : 'asc') : 'asc';
  setJSON(STORAGE_SORT, { col, dir });
  return { col, dir };
}
function sortPatients(arr) {
  const { col, dir } = getSort();
  const mult = dir === 'asc' ? 1 : -1;
  const favs = getFavs();
  return [...arr].sort((a, b) => {
    // Favoritos sempre no topo
    const fa = favs[a.id] ? 1 : 0;
    const fb = favs[b.id] ? 1 : 0;
    if (fa !== fb) return fb - fa;
    let va, vb;
    switch (col) {
      case 'consulta':
        va = a.data_proxima_consulta || '9999';
        vb = b.data_proxima_consulta || '9999';
        break;
      case 'checkin':
        va = a.ultimo_checkin || '0000';
        vb = b.ultimo_checkin || '0000';
        return (va > vb ? 1 : va < vb ? -1 : 0) * (dir === 'asc' ? -1 : 1); // mais recente primeiro por padrão
      case 'score':
        va = a.score_medio_7d ?? -1;
        vb = b.score_medio_7d ?? -1;
        break;
      case 'nome':
      default:
        va = (a.nome || '').toLowerCase();
        vb = (b.nome || '').toLowerCase();
    }
    if (va < vb) return -1 * mult;
    if (va > vb) return  1 * mult;
    return 0;
  });
}

// ─── 9. AÇÕES INLINE NA LINHA ────────────────────────────────
function inlineActionsHTML(p) {
  const wa = (p.telefone || '').replace(/\D/g, '');
  const waLink = wa ? `https://wa.me/55${wa}?text=${encodeURIComponent('Olá ' + firstName(p.nome) + ',')}` : '';
  return `
    <span class="row-actions">
      ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" class="row-action" title="Abrir WhatsApp" onclick="event.stopPropagation()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      </a>` : ''}
      <a href="admin-dossie.html?id=${p.id}" class="row-action" title="Abrir dossiê" onclick="event.stopPropagation()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </a>
      <a href="admin-relatorio.html?id=${p.id}" class="row-action" title="Relatório de consulta" onclick="event.stopPropagation()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
      </a>
      <button class="row-action row-fav ${getFavs()[p.id] ? 'is-fav' : ''}" data-id="${p.id}" title="Favoritar" onclick="event.stopPropagation();window._adminExtras&&window._adminExtras.toggleFav('${p.id}');">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${getFavs()[p.id] ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
    </span>`;
}

// ─── 10. PILL DA FASE ATUAL ──────────────────────────────────
const FASE_LABEL = {
  adaptacao: 'Adaptação', deficit_leve: 'Déficit leve',
  deficit_moderado: 'Déficit moderado', recomposicao: 'Recomposição',
  manutencao: 'Manutenção', ganho_massa: 'Ganho de massa',
};
function fasePillHTML(p) {
  const fase = p.fase_atual_nome || p.fase_ativa || null;
  if (!fase) return '';
  const tipo = (p.fase_atual_tipo || '').toLowerCase();
  const label = FASE_LABEL[tipo] || fase;
  return `<span class="fase-pill fase-${tipo || 'default'}">${escapeHTML(label)}</span>`;
}

// ─── 11. SPARKLINE MICRO DE SCORE 7D ─────────────────────────
function sparklineSVG(values, w = 60, h = 18) {
  if (!values || values.length < 2) return '';
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  const last = values[values.length - 1];
  const trend = values.length > 1 ? Math.sign(last - values[0]) : 0;
  const color = trend > 0 ? '#3D6B4F' : trend < 0 ? '#7A2E2E' : 'var(--text-light)';
  return `<svg class="sparkline" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polyline fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" points="${points}"/>
    <circle cx="${(values.length - 1) * step}" cy="${h - ((last - min) / range) * h}" r="2" fill="${color}"/>
  </svg>`;
}
function getSparklineValues(p) {
  // Se não tiver série, usa o score médio único como ponto único
  if (Array.isArray(p.scores_7d) && p.scores_7d.length) return p.scores_7d;
  return null;
}

// ─── 12. KPIs ESTRATÉGICOS ───────────────────────────────────
function updateExtendedKPIs() {
  const patients = getPatients();
  if (!patients.length) return;
  const hoje = new Date().toISOString().split('T')[0];
  // Adesão média = média de checkins_semana / 7
  const adesao = patients.length ? Math.round(
    patients.reduce((s, p) => s + (p.checkins_semana || 0), 0) / patients.length / 7 * 100
  ) : 0;
  const scoresValid = patients.map(p => p.score_medio_7d).filter(s => s != null);
  const scoreMedio = scoresValid.length ? Math.round(scoresValid.reduce((a, b) => a + b, 0) / scoresValid.length) : 0;
  const checkinsHoje = patients.filter(p => p.ultimo_checkin === hoje).length;
  const aniversarios = patients.filter(p => isBirthdayThisWeek(p.data_nascimento)).length;
  const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  set('kpi-adesao',        adesao + '%');
  set('kpi-score-medio',   scoreMedio || '—');
  set('kpi-checkins-hoje', checkinsHoje);
  set('kpi-aniversarios',  aniversarios || '—');
}

// ─── 13. FEED DE ATIVIDADES ──────────────────────────────────
function pushActivity(activity) {
  const arr = getJSON(STORAGE_ACTIVITY, []);
  arr.unshift({ ...activity, ts: Date.now() });
  setJSON(STORAGE_ACTIVITY, arr.slice(0, 50));
}
function generateActivityFromPatients() {
  const patients = getPatients();
  if (!patients.length) return [];
  const items = [];
  const hoje = new Date().toISOString().split('T')[0];
  // Pacientes que fizeram check-in hoje
  patients.filter(p => p.ultimo_checkin === hoje).forEach(p => {
    items.push({
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg>',
      iconClass: 'act-ok',
      title: `${firstName(p.nome)} fez check-in hoje`,
      sub: p.score_medio_7d ? `Score 7d: ${p.score_medio_7d}` : '',
      ts: Date.now(),
      patient: p,
    });
  });
  // Consultas hoje
  patients.filter(p => p.data_proxima_consulta === hoje).forEach(p => {
    items.push({
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      iconClass: 'act-info',
      title: `Consulta com ${firstName(p.nome)} hoje`,
      sub: 'Confirmar horário',
      ts: Date.now(),
      patient: p,
    });
  });
  // Aniversariantes
  patients.filter(p => isBirthdayThisWeek(p.data_nascimento)).forEach(p => {
    items.push({
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
      iconClass: 'act-bday',
      title: `${firstName(p.nome)} faz aniversário esta semana`,
      sub: '',
      ts: Date.now(),
      patient: p,
    });
  });
  // Alertas
  patients.filter(p => (p.flags_recentes || []).some(f => ['energia_baixa', 'overreaching', 'descontrole'].includes(f))).slice(0, 5).forEach(p => {
    items.push({
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      iconClass: 'act-warn',
      title: `Alerta clínico: ${firstName(p.nome)}`,
      sub: 'Verificar último check-in',
      ts: Date.now(),
      patient: p,
    });
  });
  return items;
}
function renderActivity() {
  const el = $('activity-feed');
  if (!el) return;
  const items = generateActivityFromPatients();
  if (!items.length) {
    el.innerHTML = `<div class="activity-empty"><p>Nenhuma atividade hoje</p><span>Conforme as pacientes interagirem, eventos aparecerão aqui em tempo real.</span></div>`;
    return;
  }
  el.innerHTML = items.map(a => `
    <button type="button" class="activity-item" data-id="${escapeHTML(a.patient?.id || '')}" data-uid="${escapeHTML(a.patient?.user_id||'')}" data-nome="${encodeURIComponent(a.patient?.nome||'')}">
      <span class="activity-icon ${a.iconClass}">${a.icon}</span>
      <span class="activity-text">
        <span class="activity-title">${escapeHTML(a.title)}</span>
        ${a.sub ? `<span class="activity-sub">${escapeHTML(a.sub)}</span>` : ''}
      </span>
    </button>
  `).join('');
  el.querySelectorAll('.activity-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.id;
      const uid  = btn.dataset.uid;
      const nome = decodeURIComponent(btn.dataset.nome || '');
      if (!id) return;
      closeActivity();
      window.verPaciente && window.verPaciente(id, uid, nome);
    });
  });
}
function openActivity() {
  const ov = $('activity-overlay');
  const dr = $('activity-drawer');
  if (!ov || !dr) return;
  renderActivity();
  ov.style.display = 'block';
  dr.classList.add('open');
  dr.setAttribute('aria-hidden', 'false');
}
function closeActivity() {
  const ov = $('activity-overlay');
  const dr = $('activity-drawer');
  if (!ov || !dr) return;
  ov.style.display = 'none';
  dr.classList.remove('open');
  dr.setAttribute('aria-hidden', 'true');
}

// ─── 14. ALERTAS INTELIGENTES NO TOPO (com ação) ─────────────
function renderSmartAlerts() {
  const sec = $('admin-smart-alerts');
  if (!sec) return;
  const patients = getPatients();
  if (!patients.length) { sec.style.display = 'none'; return; }
  const hoje = new Date().toISOString().split('T')[0];
  const alerts = [];
  const inativos = patients.filter(p => p.ultimo_checkin && Math.ceil((Date.now() - new Date(p.ultimo_checkin + 'T12:00:00')) / 86400000) > 7);
  if (inativos.length) {
    alerts.push({
      cls: 'alert-warn',
      icon: '⏱',
      title: `${inativos.length} paciente${inativos.length > 1 ? 's' : ''} sem check-in há mais de 7 dias`,
      sub: inativos.slice(0, 3).map(p => firstName(p.nome)).join(', ') + (inativos.length > 3 ? ` e mais ${inativos.length - 3}` : ''),
      action: 'Filtrar inativos',
      onclick: () => { $('filter-status').value = 'inativo'; window.filterPatients && window.filterPatients(); }
    });
  }
  const consultaHoje = patients.filter(p => p.data_proxima_consulta === hoje);
  if (consultaHoje.length) {
    alerts.push({
      cls: 'alert-info',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      title: `${consultaHoje.length} consulta${consultaHoje.length > 1 ? 's' : ''} agendada${consultaHoje.length > 1 ? 's' : ''} hoje`,
      sub: consultaHoje.map(p => firstName(p.nome)).join(', '),
      action: 'Ver agenda',
      onclick: () => { $('filter-consulta').value = 'hoje'; window.filterPatients && window.filterPatients(); }
    });
  }
  const semPlano = patients.filter(p => !p.plano_url);
  if (semPlano.length >= 3) {
    alerts.push({
      cls: 'alert-soft',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
      title: `${semPlano.length} pacientes ainda sem plano alimentar`,
      sub: 'Considere priorizar elaboração desses planos.',
      action: 'Ver lista',
      onclick: () => { $('filter-plano').value = 'sem'; window.filterPatients && window.filterPatients(); }
    });
  }
  const aniversarios = patients.filter(p => isBirthdayThisWeek(p.data_nascimento));
  if (aniversarios.length) {
    alerts.push({
      cls: 'alert-bday',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
      title: `${aniversarios.length} aniversário${aniversarios.length > 1 ? 's' : ''} esta semana`,
      sub: aniversarios.map(p => firstName(p.nome)).join(', '),
    });
  }
  if (!alerts.length) { sec.style.display = 'none'; return; }
  sec.style.display = '';
  sec.innerHTML = `
    <p class="nh-eyebrow">Alertas inteligentes</p>
    <h2 class="nh-title sm">Atenção do dia</h2>
    <div class="smart-alerts-list">
      ${alerts.map((a, i) => `
        <div class="smart-alert ${a.cls}">
          <span class="smart-alert-icon">${a.icon}</span>
          <div class="smart-alert-text">
            <p class="smart-alert-title">${escapeHTML(a.title)}</p>
            <p class="smart-alert-sub">${escapeHTML(a.sub)}</p>
          </div>
          ${a.action ? `<button type="button" class="smart-alert-btn" data-i="${i}">${escapeHTML(a.action)}</button>` : ''}
        </div>
      `).join('')}
    </div>
  `;
  sec.querySelectorAll('.smart-alert-btn').forEach((btn) => {
    const i = +btn.dataset.i;
    btn.addEventListener('click', () => {
      try { alerts[i].onclick && alerts[i].onclick(); } catch (e) {}
    });
  });
}

// ─── 15. NOTIFICAÇÕES CATEGORIZADAS ──────────────────────────
// Hook: o painel de notificações já existe — apenas adiciona CSS .notif-cat-*
// (mantemos como está, já é categorizado pelo type que vem do backend)

// ─── 16. EMPTY STATES MELHORES ───────────────────────────────
function renderEmptyState(wrapper, kind) {
  if (!wrapper) return;
  if (kind === 'no-patients') {
    wrapper.innerHTML = `
      <div class="empty-state empty-state-rich">
        <div class="empty-illustration">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <h3>Nenhuma paciente cadastrada ainda</h3>
        <p>Comece criando o primeiro perfil. Você poderá adicionar plano alimentar, anamnese e fases depois.</p>
        <button class="btn-primary" onclick="showView('novo')" style="display:inline-flex;align-items:center;gap:8px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Cadastrar primeira paciente
        </button>
      </div>`;
  } else if (kind === 'no-results') {
    wrapper.innerHTML = `
      <div class="empty-state empty-state-rich">
        <div class="empty-illustration">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <h3>Nenhum resultado encontrado</h3>
        <p>Tente outra palavra-chave ou ajuste os filtros aplicados.</p>
        <button class="btn-secondary" onclick="window._adminExtras&&window._adminExtras.clearFilters()">
          Limpar todos os filtros
        </button>
      </div>`;
  }
}

// ─── 17. DARK MODE FUNCIONAL ─────────────────────────────────
// Compartilha chave 'erg-theme' com admin.js (sem hífen seria duplicar estado)
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
function toggleDark() {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('erg-theme', next); } catch(_) {}
}
function initDarkMode() { /* admin.js já cuida da inicialização e do botão */ }

// ─── 18. EXPORT CSV ──────────────────────────────────────────
function exportCSV() {
  const patients = getPatients();
  if (!patients.length) return;
  const filtered = (window._extrasFilteredPatients || patients);
  const cols = ['nome', 'email', 'telefone', 'data_nascimento', 'sexo', 'data_proxima_consulta', 'data_ultima_consulta', 'ultimo_checkin', 'score_medio_7d', 'checkins_semana', 'plano_url', 'observacoes'];
  const head = cols.join(',');
  const rows = filtered.map(p => cols.map(c => {
    const v = p[c] ?? '';
    return `"${String(v).replace(/"/g, '""')}"`;
  }).join(','));
  const csv = [head, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pacientes-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

// ─── 19. FILTROS AVANÇADOS ───────────────────────────────────
function applyAdvancedFilter(arr) {
  const status   = $('filter-status')?.value || '';
  const objetivo = $('filter-objetivo')?.value || '';
  const fav      = $('filter-favoritos')?.value || '';
  const dateIso  = window._extrasDateFilter || '';
  let r = arr;
  if (status) {
    if (status === 'ativo') {
      r = r.filter(p => p.ultimo_checkin && Math.ceil((Date.now() - new Date(p.ultimo_checkin + 'T12:00:00')) / 86400000) <= 3);
    }
    if (status === 'inativo') {
      r = r.filter(p => !p.ultimo_checkin || Math.ceil((Date.now() - new Date(p.ultimo_checkin + 'T12:00:00')) / 86400000) > 3);
    }
    if (status === 'alerta') {
      r = r.filter(p => (p.flags_recentes || []).some(f => ['energia_baixa', 'overreaching', 'descontrole'].includes(f)));
    }
    if (status === 'sem-checkin') {
      r = r.filter(p => !p.ultimo_checkin);
    }
  }
  if (objetivo) {
    r = r.filter(p => p.objetivo === objetivo);
  }
  if (fav === 'fav') {
    const favs = getFavs();
    r = r.filter(p => favs[p.id]);
  }
  if (dateIso) {
    r = r.filter(p => p.data_proxima_consulta === dateIso);
  }
  return r;
}
function clearFilters() {
  ['search-input', 'filter-plano', 'filter-consulta', 'filter-status', 'filter-objetivo', 'filter-favoritos'].forEach(id => {
    const el = $(id);
    if (el) el.value = '';
  });
  window._extrasDateFilter = null;
  document.querySelectorAll('.agenda-day.selected').forEach(b => b.classList.remove('selected'));
  window.filterPatients && window.filterPatients();
}

// ─── 20. PIN DE FAVORITOS ────────────────────────────────────
function getFavs() { return getJSON(STORAGE_FAVS, {}); }
function toggleFav(id) {
  const favs = getFavs();
  if (favs[id]) delete favs[id];
  else favs[id] = Date.now();
  setJSON(STORAGE_FAVS, favs);
  // Re-renderiza
  window.filterPatients && window.filterPatients();
}

// ─── 21. ANIVERSARIANTES DA SEMANA ───────────────────────────
function isBirthdayThisWeek(dataNasc) {
  if (!dataNasc) return false;
  const today = new Date();
  const next7 = new Date(); next7.setDate(today.getDate() + 7);
  const m = parseInt(dataNasc.slice(5, 7), 10);
  const d = parseInt(dataNasc.slice(8, 10), 10);
  if (!m || !d) return false;
  // Constrói aniversário deste ano
  const bday = new Date(today.getFullYear(), m - 1, d);
  if (bday < today.setHours(0, 0, 0, 0)) {
    bday.setFullYear(bday.getFullYear() + 1);
  }
  return bday >= new Date().setHours(0, 0, 0, 0) && bday <= next7;
}

// ─── 22. CARD VIEW NO MOBILE ─────────────────────────────────
// (handled via CSS — abaixo de 768px a tabela vira lista de cards
//  e renderTable já gera linhas que viram cards via @media query)

// ─── 23. SWIPE NAS TABS (mobile) ─────────────────────────────
function initTabSwipe() {
  const tabs = document.getElementById('pac-tabs');
  if (!tabs) return;
  let startX = 0, startY = 0;
  const SWIPE_MIN = 60;
  document.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 900) return;
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (window.innerWidth > 900) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dy) > Math.abs(dx)) return;
    const list = Array.from(tabs.querySelectorAll('.pac-tab:not(.pac-tab-next)'));
    const active = list.findIndex(t => t.classList.contains('active'));
    if (active < 0) return;
    let next = dx < 0 ? active + 1 : active - 1;
    next = Math.max(0, Math.min(list.length - 1, next));
    list[next].click();
  }, { passive: true });
}

// ─── 24. FAB FLUTUANTE (mobile) ──────────────────────────────
// já está no HTML — apenas aparece via @media query no CSS

// ─── HELP MODAL ───────────────────────────────────────────────
function openHelp() { const ov = $('kbd-help-overlay'); if (ov) ov.style.display = 'flex'; }
function closeHelp() { const ov = $('kbd-help-overlay'); if (ov) ov.style.display = 'none'; }

// ─── HOOKS para admin.js (chamados pela própria admin.js) ────
function onPatientsLoaded(patients) {
  window._allPatients = patients;
  updateGreeting();
  renderAgenda();
  renderRecents();
  renderSmartAlerts();
  updateExtendedKPIs();
}
function onPatientView(p) {
  pushRecent(p);
}
function onTableRender(filteredPatients) {
  window._extrasFilteredPatients = filteredPatients;
}

// Função para enriquecer cada linha da tabela com avatar + tags + ações + sparkline + favorito
function enrichRow(p) {
  return {
    avatar:   avatarHTML(p.nome),
    initials: getInitials(p.nome),
    tags:     tagsHTML(p),
    fasePill: fasePillHTML(p),
    spark:    sparklineSVG(getSparklineValues(p) || []),
    actions:  inlineActionsHTML(p),
    isFav:    !!getFavs()[p.id],
  };
}

// ─── SETUP UI ────────────────────────────────────────────────
function initUI() {
  // Filtros avançados toggle
  const advBtn = $('btn-toggle-advanced');
  const adv    = $('admin-advanced-filters');
  if (advBtn && adv) {
    advBtn.addEventListener('click', () => {
      const open = adv.style.display !== 'none';
      adv.style.display = open ? 'none' : 'block';
      advBtn.classList.toggle('active', !open);
    });
  }
  const clearBtn = $('btn-clear-filters');
  if (clearBtn) clearBtn.addEventListener('click', clearFilters);
  const exportBtn = $('btn-export-csv');
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);
}

// ─── EXPÕE A API GLOBAL ──────────────────────────────────────
window._adminExtras = {
  // hooks
  onPatientsLoaded, onPatientView, onTableRender,
  enrichRow,
  // command palette
  openCmd, closeCmd, openHelp, closeHelp,
  // activity feed
  openActivity, closeActivity,
  // utilities
  avatarHTML, tagsHTML, sortPatients, applyAdvancedFilter,
  getSort, setSort, getFavs, toggleFav, exportCSV, clearFilters,
  fasePillHTML, sparklineSVG, getSparklineValues,
  inlineActionsHTML, getInitials, firstName,
  isBirthdayThisWeek, renderEmptyState, applyTheme, toggleDark,
};

// ─── INICIALIZAÇÃO ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initShortcuts();
  initUI();
  initDarkMode();
  initTabSwipe();
  updateGreeting(); // antes do load: só mostra a data
});

// ═══ POLIMENTO V2 ═══
// 10 micro-melhorias: ripple, toast, KPI contador animado,
// row fade-in, skeleton, palette animation, hover preview,
// fav heartbeat, alert slide-in, CSV feedback

// ── V2.1 Ripple effect ───────────────────────────────────────
function _v2CreateRipple(e, el) {
  const circle = document.createElement('span');
  const rect   = el.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height);
  const x = (e.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2;
  const y = (e.clientY ?? rect.top  + rect.height / 2) - rect.top  - size / 2;
  circle.className  = 'ripple-wave';
  circle.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  el.querySelector('.ripple-wave')?.remove();
  el.appendChild(circle);
  circle.addEventListener('animationend', () => circle.remove(), { once: true });
}
function _v2InitRipple() {
  const SEL = '.recent-chip,.agenda-day,.cmd-item,.row-action,.smart-alert-btn,.admin-link-btn';
  document.addEventListener('click', (e) => {
    const el = e.target.closest(SEL);
    if (el) _v2CreateRipple(e, el);
  });
}

// ── V2.2 Toast notifications ─────────────────────────────────
function _v2EnsureToastContainer() {
  let c = document.getElementById('erg-toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'erg-toast-container'; document.body.appendChild(c); }
  return c;
}
function _v2Toast(msg, type = 'ok', durationMs = 3000) {
  const icons = {
    ok:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    warn: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>',
    info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>',
  };
  const t = document.createElement('div');
  t.className = `erg-toast erg-toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${escapeHTML(msg)}</span>`;
  _v2EnsureToastContainer().appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast-show'));
  const dismiss = () => {
    t.classList.remove('toast-show');
    t.addEventListener('transitionend', () => t.remove(), { once: true });
  };
  const timer = setTimeout(dismiss, durationMs);
  t.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
}

// ── V2.3 KPI contador animado ────────────────────────────────
function _v2AnimateCount(el, target, suffix = '') {
  if (!el || isNaN(target) || target <= 0) return;
  const dur = 600;
  const t0  = performance.now();
  const tick = (now) => {
    const p    = Math.min((now - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * ease) + suffix;
    if (p < 1) requestAnimationFrame(tick);
    else el.classList.add('kpi-pop');
  };
  requestAnimationFrame(tick);
}
function _v2AnimateKPIsFromDOM() {
  [
    { id: 'kpi-adesao',        suffix: '%' },
    { id: 'kpi-score-medio',   suffix: '' },
    { id: 'kpi-checkins-hoje', suffix: '' },
    { id: 'kpi-aniversarios',  suffix: '' },
  ].forEach(({ id, suffix }) => {
    const el  = document.getElementById(id);
    if (!el) return;
    const txt = el.textContent.trim();
    const num = parseFloat(txt.replace('%', ''));
    if (!isNaN(num) && num > 0) _v2AnimateCount(el, num, suffix);
  });
}

// ── V2.4 Row stagger fade-in via MutationObserver ────────────
let _v2RowObserver = null;
function _v2InitRowAnimation() {
  const tbody = document.querySelector('.patients-table tbody');
  if (!tbody) return;
  _v2RowObserver?.disconnect();
  _v2RowObserver = new MutationObserver(() => {
    tbody.querySelectorAll('tr.patient-row:not([data-v2-animated])').forEach((row, i) => {
      row.dataset.v2Animated = '1';
      row.classList.add('patient-row-entering');
      row.style.animationDelay = `${i * 22}ms`;
      row.addEventListener('animationend', () => {
        row.classList.remove('patient-row-entering');
        row.style.animationDelay = '';
      }, { once: true });
    });
  });
  _v2RowObserver.observe(tbody, { childList: true });
}

// ── V2.5 Command palette open animation ──────────────────────
function _v2InitCmdAnimation() {
  const overlay = document.getElementById('cmd-overlay');
  const modal   = document.querySelector('.cmd-modal');
  if (!overlay || !modal) return;
  new MutationObserver(() => {
    if (overlay.style.display === 'flex') {
      modal.classList.remove('cmd-modal-entering');
      void modal.offsetWidth;
      modal.classList.add('cmd-modal-entering');
      modal.addEventListener('animationend', () => modal.classList.remove('cmd-modal-entering'), { once: true });
    }
  }).observe(overlay, { attributes: true, attributeFilter: ['style'] });
}

// ── V2.6 Skeleton loading state ──────────────────────────────
function _v2ShowSkeleton() {
  const tbody = document.querySelector('.patients-table tbody');
  if (!tbody || tbody.querySelector('tr.patient-row')) return;
  tbody.innerHTML = Array.from({ length: 5 }, () => `
    <tr class="skeleton-row">
      <td><div class="skel skel-w-200"></div></td>
      <td><div class="skel skel-w-120"></div></td>
      <td><div class="skel skel-w-80"></div></td>
      <td><div class="skel skel-w-80"></div></td>
    </tr>`).join('');
}
function _v2HideSkeleton() {
  document.querySelectorAll('.skeleton-row').forEach(r => r.remove());
}

// ── V2.7 Patient row hover preview card ──────────────────────
let _v2HoverTimer = null;
let _v2HoverRow   = null;
function _v2InitHoverPreview() {
  document.addEventListener('mouseover', (e) => {
    const row = e.target.closest('tr.patient-row');
    if (!row) return;
    if (row === _v2HoverRow) return;
    clearTimeout(_v2HoverTimer);
    _v2HoverRow = row;
    _v2HoverTimer = setTimeout(() => _v2ShowHoverCard(row, e), 400);
  });
  document.addEventListener('mouseout', (e) => {
    const leaving = e.target.closest('tr.patient-row');
    const entering = e.relatedTarget?.closest('tr.patient-row') || e.relatedTarget?.closest('#row-hover-card');
    if (leaving && !entering) { clearTimeout(_v2HoverTimer); _v2HoverRow = null; _v2HideHoverCard(); }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('#row-hover-card') && !e.relatedTarget?.closest('#row-hover-card') && !e.relatedTarget?.closest('tr.patient-row')) {
      _v2HideHoverCard();
    }
  });
}
function _v2ShowHoverCard(row, e) {
  const id = row.dataset.id;
  if (!id) return;
  const p = getPatients().find(x => x.id === id);
  if (!p) return;
  let card = document.getElementById('row-hover-card');
  if (!card) { card = document.createElement('div'); card.id = 'row-hover-card'; document.body.appendChild(card); }
  const diasCi = p.ultimo_checkin
    ? Math.ceil((Date.now() - new Date(p.ultimo_checkin + 'T12:00:00')) / 86400000)
    : null;
  card.innerHTML = `
    <div class="hover-card-inner">
      <div class="hover-card-top">
        ${avatarHTML(p.nome, 'lg')}
        <div>
          <div class="hover-card-name">${escapeHTML(p.nome)}</div>
          <div class="hover-card-email">${escapeHTML(p.email || '—')}</div>
        </div>
      </div>
      <div class="hover-card-grid">
        <div class="hover-card-item"><span class="hover-card-label">Último check-in</span><span>${diasCi != null ? diasCi + 'd atrás' : '—'}</span></div>
        <div class="hover-card-item"><span class="hover-card-label">Próx. consulta</span><span>${escapeHTML(p.data_proxima_consulta || '—')}</span></div>
        <div class="hover-card-item"><span class="hover-card-label">Score 7d</span><span>${p.score_medio_7d ?? '—'}</span></div>
        <div class="hover-card-item"><span class="hover-card-label">Fase</span><span>${escapeHTML(p.fase_atual_nome || '—')}</span></div>
      </div>
      ${p.observacoes ? `<div class="hover-card-obs">${escapeHTML(p.observacoes.slice(0, 120))}${p.observacoes.length > 120 ? '…' : ''}</div>` : ''}
    </div>`;
  const rect = row.getBoundingClientRect();
  const cardH = 180;
  let top = rect.top - 10;
  if (top + cardH > window.innerHeight) top = window.innerHeight - cardH - 10;
  card.style.top       = Math.max(10, top) + 'px';
  card.style.left      = Math.min(e.clientX + 16, window.innerWidth - 278) + 'px';
  card.style.opacity   = '0';
  card.style.transform = 'translateY(4px)';
  requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
}
function _v2HideHoverCard() {
  const card = document.getElementById('row-hover-card');
  if (!card) return;
  card.style.opacity = '0';
  card.addEventListener('transitionend', () => card.remove(), { once: true });
}

// ── V2.8 Filter results flash ────────────────────────────────
let _v2LastCount = -1;
function _v2FlashFilterResults(count) {
  if (_v2LastCount === count) return;
  _v2LastCount = count;
  const el = document.getElementById('patients-count');
  if (!el) return;
  el.classList.remove('count-flash');
  void el.offsetWidth;
  el.classList.add('count-flash');
  el.addEventListener('animationend', () => el.classList.remove('count-flash'), { once: true });
}

// ── V2.9–10 Patch window._adminExtras ────────────────────────
function _v2PatchExtras() {
  const ex = window._adminExtras;
  if (!ex) return;

  // onPatientsLoaded → anima KPIs depois do render
  const origLoad = ex.onPatientsLoaded.bind(ex);
  ex.onPatientsLoaded = (patients) => {
    origLoad(patients);
    requestAnimationFrame(_v2AnimateKPIsFromDOM);
  };

  // onTableRender → esconde skeleton + flash count
  const origRender = ex.onTableRender.bind(ex);
  ex.onTableRender = (patients) => {
    origRender(patients);
    _v2HideSkeleton();
    _v2FlashFilterResults(patients.length);
  };

  // toggleFav → heartbeat + toast
  const origFav = ex.toggleFav.bind(ex);
  ex.toggleFav = (id) => {
    origFav(id);
    const isFav = !!getFavs()[id];
    _v2Toast(isFav ? 'Adicionada aos favoritos ★' : 'Removida dos favoritos', 'ok', 2000);
    requestAnimationFrame(() => {
      const btn = document.querySelector(`.row-fav[data-id="${id}"]`);
      if (!btn) return;
      btn.classList.remove('fav-beat');
      void btn.offsetWidth;
      btn.classList.add('fav-beat');
      btn.addEventListener('animationend', () => btn.classList.remove('fav-beat'), { once: true });
    });
  };

  // exportCSV → toast de feedback
  const origExport = ex.exportCSV.bind(ex);
  ex.exportCSV = () => {
    const count = (window._extrasFilteredPatients || getPatients()).length;
    origExport();
    _v2Toast(`${count} paciente${count !== 1 ? 's' : ''} exportado${count !== 1 ? 's' : ''} para CSV`, 'ok');
  };

  // Expõe novas APIs
  ex.toast             = _v2Toast;
  ex.showSkeleton      = _v2ShowSkeleton;
  ex.hideSkeleton      = _v2HideSkeleton;
  ex.flashFilterCount  = _v2FlashFilterResults;
}

// ── V2 DOMContentLoaded ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _v2InitRipple();
  _v2InitRowAnimation();
  _v2InitHoverPreview();
  setTimeout(_v2InitCmdAnimation, 80);
  _v2PatchExtras();
  _v2ShowSkeleton(); // skeleton imediato enquanto pacientes carregam
});

// ═══ POLIMENTO V3 ═══
// 10 melhorias de acessibilidade: skip-link, focus trap, ARIA live,
// focus save/restore, aria-dialog, aria-expanded, aria-sort,
// roving tabindex na agenda, sr-only labels, toast announcer

// ── V3.1 Skip-link ───────────────────────────────────────────
function _v3InitSkipLink() {
  if (document.getElementById('erg-skip-link')) return;
  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'main-content';
  const link = document.createElement('a');
  link.id        = 'erg-skip-link';
  link.href      = '#main-content';
  link.className = 'sr-skip-link';
  link.textContent = 'Ir para o conteúdo principal';
  link.addEventListener('click', (e) => {
    const target = document.getElementById('main-content');
    if (target) {
      e.preventDefault();
      target.setAttribute('tabindex', '-1');
      target.focus();
    }
  });
  document.body.insertAdjacentElement('afterbegin', link);
}

// ── V3.2 Focus trap helper ───────────────────────────────────
const _V3_FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
function _v3GetFocusable(container) {
  return Array.from(container.querySelectorAll(_V3_FOCUSABLE)).filter(el => {
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && !el.closest('[aria-hidden="true"]');
  });
}
function _v3TrapFocus(container, e) {
  const focusable = _v3GetFocusable(container);
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
  }
}
function _v3InitFocusTrap() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const cmdOpen  = document.getElementById('cmd-overlay')?.style.display === 'flex';
    const actOpen  = document.getElementById('activity-drawer')?.classList.contains('open');
    const helpOpen = document.getElementById('kbd-help-overlay')?.style.display === 'flex';
    if (cmdOpen) {
      const modal = document.getElementById('cmd-overlay')?.querySelector('.cmd-modal');
      if (modal) _v3TrapFocus(modal, e);
    } else if (helpOpen) {
      const modal = document.querySelector('.kbd-help-modal');
      if (modal) _v3TrapFocus(modal, e);
    } else if (actOpen) {
      const drawer = document.getElementById('activity-drawer');
      if (drawer) _v3TrapFocus(drawer, e);
    }
  });
}

// ── V3.3 Focus save/restore + aria-dialog via MutationObserver
function _v3InitFocusSaveRestore() {
  let focusBeforeCmd      = null;
  let focusBeforeActivity = null;
  let focusBeforeHelp     = null;

  // Command palette
  const cmdOverlay = document.getElementById('cmd-overlay');
  const cmdModal   = cmdOverlay?.querySelector('.cmd-modal');
  if (cmdOverlay && cmdModal) {
    cmdModal.setAttribute('role', 'dialog');
    cmdModal.setAttribute('aria-modal', 'true');
    cmdModal.setAttribute('aria-label', 'Busca e comandos (Command Palette)');
    new MutationObserver(() => {
      const isOpen = cmdOverlay.style.display === 'flex';
      if (isOpen && !focusBeforeCmd) {
        focusBeforeCmd = document.activeElement;
      } else if (!isOpen && focusBeforeCmd) {
        focusBeforeCmd.focus?.();
        focusBeforeCmd = null;
      }
    }).observe(cmdOverlay, { attributes: true, attributeFilter: ['style'] });
  }

  // Help modal
  const helpOverlay = document.getElementById('kbd-help-overlay');
  const helpModal   = document.querySelector('.kbd-help-modal');
  if (helpOverlay && helpModal) {
    helpModal.setAttribute('role', 'dialog');
    helpModal.setAttribute('aria-modal', 'true');
    helpModal.setAttribute('aria-label', 'Atalhos de teclado');
    helpModal.setAttribute('aria-labelledby', 'kbd-help-title');
    const h = helpModal.querySelector('h3');
    if (h && !h.id) h.id = 'kbd-help-title';
    new MutationObserver(() => {
      const isOpen = helpOverlay.style.display === 'flex';
      if (isOpen && !focusBeforeHelp) {
        focusBeforeHelp = document.activeElement;
        const firstFocusable = _v3GetFocusable(helpModal)[0];
        firstFocusable?.focus();
      } else if (!isOpen && focusBeforeHelp) {
        focusBeforeHelp.focus?.();
        focusBeforeHelp = null;
      }
    }).observe(helpOverlay, { attributes: true, attributeFilter: ['style'] });
  }

  // Activity drawer
  const actDrawer = document.getElementById('activity-drawer');
  if (actDrawer) {
    actDrawer.setAttribute('role', 'dialog');
    actDrawer.setAttribute('aria-modal', 'true');
    actDrawer.setAttribute('aria-label', 'Feed de atividades recentes');
    new MutationObserver(() => {
      const isOpen = actDrawer.classList.contains('open');
      if (isOpen && !focusBeforeActivity) {
        focusBeforeActivity = document.activeElement;
        const firstFocusable = _v3GetFocusable(actDrawer)[0];
        firstFocusable?.focus();
      } else if (!isOpen && focusBeforeActivity) {
        focusBeforeActivity.focus?.();
        focusBeforeActivity = null;
      }
    }).observe(actDrawer, { attributes: true, attributeFilter: ['class'] });
  }
}

// ── V3.4 ARIA live region para contagem de resultados ────────
function _v3InitLiveCount() {
  let live = document.getElementById('erg-live-count');
  if (!live) {
    live = document.createElement('div');
    live.id = 'erg-live-count';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.className = 'sr-only';
    document.body.appendChild(live);
  }
  const ex = window._adminExtras;
  if (!ex) return;
  const origRender = ex.onTableRender.bind(ex);
  ex.onTableRender = (patients) => {
    origRender(patients);
    const n = patients.length;
    live.textContent = n
      ? `${n} paciente${n !== 1 ? 's' : ''} ${n !== 1 ? 'encontrados' : 'encontrado'}`
      : 'Nenhum resultado encontrado';
  };
}

// ── V3.5 Toast container como live region ────────────────────
function _v3PatchToastAria() {
  const ensureAndPatch = () => {
    const c = document.getElementById('erg-toast-container');
    if (!c) return;
    if (!c.hasAttribute('aria-live')) {
      c.setAttribute('role', 'status');
      c.setAttribute('aria-live', 'polite');
      c.setAttribute('aria-atomic', 'false');
    }
  };
  ensureAndPatch();
  // Re-verifica após 150ms (o container pode ser criado na 1ª chamada de toast)
  setTimeout(ensureAndPatch, 150);
}

// ── V3.6 aria-expanded no botão de filtros avançados ─────────
function _v3InitAriaExpanded() {
  const btn = document.getElementById('btn-toggle-advanced');
  const adv = document.getElementById('admin-advanced-filters');
  if (!btn || !adv) return;
  adv.setAttribute('role', 'group');
  adv.setAttribute('aria-label', 'Filtros avançados');
  btn.setAttribute('aria-controls', 'admin-advanced-filters');
  const sync = () => btn.setAttribute('aria-expanded', adv.style.display !== 'none' ? 'true' : 'false');
  sync();
  btn.addEventListener('click', () => requestAnimationFrame(sync));
}

// ── V3.7 aria-sort nos cabeçalhos de tabela ordenáveis ───────
function _v3UpdateAriaSortHeaders() {
  const sort = window._adminExtras?.getSort?.() || { col: 'nome', dir: 'asc' };
  document.querySelectorAll('.patients-table th.sortable[data-sort]').forEach(th => {
    const col = th.dataset.sort;
    if (col === sort.col) {
      th.setAttribute('aria-sort', sort.dir === 'asc' ? 'ascending' : 'descending');
    } else {
      th.setAttribute('aria-sort', 'none');
    }
  });
}
function _v3InitSortAria() {
  // Aplica agora e re-aplica depois de qualquer render da tabela
  const wrapper = document.getElementById('patients-table-wrapper');
  if (wrapper) {
    new MutationObserver(_v3UpdateAriaSortHeaders).observe(wrapper, { childList: true, subtree: true });
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('.patients-table th.sortable')) {
      requestAnimationFrame(_v3UpdateAriaSortHeaders);
    }
  });
}

// ── V3.8 Roving tabindex na widget de agenda (setas ←/→) ─────
function _v3InitAgendaRoving() {
  const grid = document.getElementById('admin-agenda');
  if (!grid) return;
  const getButtons = () => Array.from(grid.querySelectorAll('.agenda-day'));
  const resetTabindex = () => {
    const btns = getButtons();
    if (!btns.length) return;
    btns.forEach(b => b.setAttribute('tabindex', '-1'));
    const today = btns.find(b => b.classList.contains('today')) || btns[0];
    today.setAttribute('tabindex', '0');
  };
  resetTabindex();
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', 'Agenda da semana');
  grid.addEventListener('keydown', (e) => {
    const btns = getButtons();
    const idx  = btns.indexOf(document.activeElement);
    if (idx < 0) return;
    let next = -1;
    if (e.key === 'ArrowRight') next = Math.min(idx + 1, btns.length - 1);
    else if (e.key === 'ArrowLeft')  next = Math.max(idx - 1, 0);
    else if (e.key === 'Home')       next = 0;
    else if (e.key === 'End')        next = btns.length - 1;
    if (next >= 0) {
      e.preventDefault();
      btns.forEach(b => b.setAttribute('tabindex', '-1'));
      btns[next].setAttribute('tabindex', '0');
      btns[next].focus();
    }
  });
  // Re-aplica depois de re-render
  new MutationObserver(resetTabindex).observe(grid, { childList: true });
}

// ── V3.9 Labels sr-only para ícones de ação (MutationObserver)
function _v3InitSrActionLabels() {
  const LABEL_MAP = {
    'Abrir WhatsApp':        'Abrir WhatsApp',
    'Abrir dossiê':          'Abrir dossiê da paciente',
    'Relatório de consulta': 'Ver relatório de consulta',
    'Favoritar':             'Marcar como favorita',
  };
  const patchEl = (el) => {
    if (el.dataset.v3Sr) return;
    el.dataset.v3Sr = '1';
    const title = el.getAttribute('title') || '';
    const label = LABEL_MAP[title] || title;
    if (label) el.setAttribute('aria-label', label);
    // Marca SVGs internos como decorativos
    el.querySelectorAll('svg').forEach(svg => {
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
    });
  };
  const patch = () => {
    document.querySelectorAll('.row-action:not([data-v3-sr])').forEach(patchEl);
    document.querySelectorAll('.sparkline:not([aria-hidden])').forEach(el => {
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('focusable', 'false');
    });
    document.querySelectorAll('.avatar:not([data-v3-sr])').forEach(el => {
      el.setAttribute('data-v3-sr', '1');
      // Já tem aria-hidden="true" do avatarHTML()
    });
  };
  patch();
  const tbody = document.querySelector('.patients-table tbody');
  if (tbody) new MutationObserver(patch).observe(tbody, { childList: true, subtree: true });
  const wrapper = document.getElementById('patients-table-wrapper');
  if (wrapper) new MutationObserver(patch).observe(wrapper, { childList: true, subtree: true });
}

// ── V3.10 Região ARIA para alertas inteligentes ───────────────
function _v3PatchAlertsAria() {
  const sec = document.getElementById('admin-smart-alerts');
  if (!sec) return;
  sec.setAttribute('role', 'region');
  sec.setAttribute('aria-label', 'Alertas inteligentes do dia');
  // Re-anuncia quando alerts mudam
  new MutationObserver(() => {
    const list = sec.querySelector('.smart-alerts-list');
    if (list && !list.hasAttribute('aria-live')) {
      list.setAttribute('aria-live', 'polite');
      list.setAttribute('aria-atomic', 'false');
    }
  }).observe(sec, { childList: true, subtree: false });
}

// ── V3 DOMContentLoaded ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _v3InitSkipLink();
  _v3InitFocusTrap();
  _v3InitFocusSaveRestore();
  _v3InitLiveCount();
  _v3InitSortAria();
  _v3InitAgendaRoving();
  _v3InitSrActionLabels();
  _v3PatchAlertsAria();
  _v3InitAriaExpanded();
  _v3PatchToastAria();
});
