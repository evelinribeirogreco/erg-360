// js/admin-checkins-extras.js
// ═══ POLIMENTO V2 ═══
// 25 melhorias UX — V1 (18) + V2 (7)
// V1: skip-link, aria-live, toast, atalhos (1-4+Esc), ripple, scroll-progress,
//     back-to-top, período persistente, trends, streak, melhor/pior, completude,
//     correlação sono↔energia, export CSV, filtros rápidos, ordenação colunas,
//     row-quality gradient, rich tooltips
// V2: dark mode (D), modo apresentação (P), smart alerts, badge de risco,
//     heatmap de adesão, busca textual no diário, painel de atalhos (?)

const _PERIOD_KEY = 'erg_acheckins_period';
const _DARK_KEY   = 'erg_acheckins_dark';
const _APRES_KEY  = 'erg_acheckins_apres';

window._adminCheckinsExtras = { version: 2, showToast };

document.addEventListener('DOMContentLoaded', () => {
  initSkipLink();            // 1
  initAriaLive();            // 2
  initToastSystem();         // 3
  initKeyboardShortcuts();   // 4 (+ D, P, ?)
  initRippleNavItems();      // 5
  initScrollProgress();      // 6
  initBackToTop();           // 7
  restorePeriodPreference(); // 8
  initDarkMode();            // 19
  initModoApresentacao();    // 20
  initPainelAtalhos();       // 25
  watchContentMutation();
});

// ── 1. Skip link ──────────────────────────────────────────────────────────
function initSkipLink() {
  const a = document.createElement('a');
  a.href = '#ci-main';
  a.className = 'aci-skip-link';
  a.textContent = 'Ir para conteúdo principal';
  document.body.prepend(a);
}

// ── 2. ARIA live regions ──────────────────────────────────────────────────
function initAriaLive() {
  const loading = document.getElementById('ci-loading');
  const content = document.getElementById('ci-content');
  const empty   = document.getElementById('ci-empty');
  const main    = document.getElementById('ci-main');
  loading?.setAttribute('aria-live', 'polite');
  content?.setAttribute('aria-live', 'polite');
  empty?.setAttribute('aria-live', 'polite');
  main?.setAttribute('role', 'main');
}

// ── 3. Toast system ───────────────────────────────────────────────────────
let _toastWrap = null;

function initToastSystem() {
  _toastWrap = document.createElement('div');
  _toastWrap.className = 'aci-toast-wrap';
  _toastWrap.setAttribute('aria-live', 'assertive');
  _toastWrap.setAttribute('aria-atomic', 'true');
  document.body.appendChild(_toastWrap);
}

function showToast(msg, type = 'info', duration = 3500) {
  if (!_toastWrap) initToastSystem();
  const t = document.createElement('div');
  t.className = `aci-toast aci-toast-${type}`;
  t.textContent = msg;
  t.setAttribute('role', 'status');
  _toastWrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, duration);
}
window.showToast = showToast;

// ── 4. Keyboard shortcuts ─────────────────────────────────────────────────
// 1-4=período | Esc=fechar | D=dark | P=apresentação | ?=atalhos
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select, [contenteditable]')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case '1': window.setPeriodo?.(7);  break;
      case '2': window.setPeriodo?.(14); break;
      case '3': window.setPeriodo?.(30); break;
      case '4': window.setPeriodo?.(90); break;
      case 'Escape':
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebar-overlay')?.classList.remove('open');
        closePainelAtalhos();
        break;
      case 'd': case 'D': toggleDarkMode(); break;
      case 'p': case 'P': toggleModoApresentacao(); break;
      case '?': togglePainelAtalhos(); break;
    }
  });
}

// ── 5. Ripple nos nav-items ───────────────────────────────────────────────
function initRippleNavItems() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function (e) {
      const r = document.createElement('span');
      r.className = 'aci-ripple';
      const rect = this.getBoundingClientRect();
      r.style.left = (e.clientX - rect.left) + 'px';
      r.style.top  = (e.clientY - rect.top)  + 'px';
      this.appendChild(r);
      r.addEventListener('animationend', () => r.remove(), { once: true });
    });
  });
}

// ── 6. Scroll progress bar ────────────────────────────────────────────────
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'aci-scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  const update = () => {
    const el = document.getElementById('ci-main') || document.documentElement;
    const scrollTop    = el.scrollTop || window.scrollY;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    bar.style.width = scrollHeight > 0
      ? Math.min((scrollTop / scrollHeight) * 100, 100) + '%'
      : '0%';
  };

  const main = document.getElementById('ci-main');
  main?.addEventListener('scroll', update, { passive: true });
  window.addEventListener('scroll', update, { passive: true });
}

// ── 7. Back-to-top button ─────────────────────────────────────────────────
function initBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'aci-back-top';
  btn.setAttribute('aria-label', 'Voltar ao topo da página');
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
  document.body.appendChild(btn);

  const main = document.getElementById('ci-main');
  const onScroll = () => {
    const scrollY = main ? main.scrollTop : window.scrollY;
    btn.classList.toggle('visible', scrollY > 400);
  };
  main?.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  btn.addEventListener('click', () => {
    const target = main || document.documentElement;
    target.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── 8. Persistência de período preferido ──────────────────────────────────
function restorePeriodPreference() {
  setTimeout(() => {
    const orig = window.setPeriodo;
    if (orig && typeof orig === 'function') {
      window.setPeriodo = function (dias) {
        localStorage.setItem(_PERIOD_KEY, String(dias));
        return orig(dias);
      };
    }
    const saved = parseInt(localStorage.getItem(_PERIOD_KEY) || '', 10);
    if ([14, 30, 90].includes(saved)) {
      window.setPeriodo?.(saved);
    }
  }, 200);
}

// ── MutationObserver: re-executa features quando dados mudam ──────────────
function watchContentMutation() {
  const grid = document.getElementById('resumo-grid');
  if (!grid) return;

  let _lastHTML = '';
  const observer = new MutationObserver(() => {
    if (grid.children.length > 0 && grid.innerHTML !== _lastHTML) {
      _lastHTML = grid.innerHTML;
      clearTimeout(window._aciTimer);
      window._aciTimer = setTimeout(onContentReady, 250);
    }
  });
  observer.observe(grid, { childList: true });
}

// ── Features dependentes de dados ─────────────────────────────────────────
function onContentReady() {
  // Limpa injeções anteriores (idempotência)
  document.querySelectorAll(
    '.aci-trend, .aci-streak-badge, .aci-bestworst, .aci-completude, ' +
    '.aci-insight-card, .aci-export-btn, .aci-filter-pills, ' +
    '.aci-smart-alerts, .aci-risco-badge, .aci-heatmap, .aci-busca-diario'
  ).forEach(el => el.remove());

  const rows = Array.from(document.querySelectorAll('#tabela-checkins tbody tr'));
  if (!rows.length) return;

  const data = parseTableRows(rows);

  // V1
  addTrendIndicators(data);
  addStreakBadge(data);
  addMelhorPiorDia(data);
  addCompletudeBadge(data);
  addCorrelacaoInsight(data);
  initExportCSV(data);
  initFiltrosRapidos(rows);
  initColunasSorting();
  addRowQualityGradient(rows, data);
  initRichTooltips();
  // V2
  addSmartAlerts(data);    // 21
  addBadgeRisco(data);     // 22
  addHeatmapAdesao(data);  // 23
  initBuscaDiario();       // 24
}

// ── Parseia linhas da tabela (V2: + fome, naoEvacou, dateStr) ─────────────
function parseTableRows(rows) {
  const FOME_MAP = { 'sem fome': 1, 'pouca': 2, 'normal': 3, 'muita': 4, 'excessiva': 5 };
  return rows.map(row => {
    const cells = row.querySelectorAll('td');
    const txt   = (i) => cells[i]?.textContent.trim() || '';

    // Índices: 0=Data 1=Sono 2=Qualidade 3=Energia 4=Humor 5=Água
    //          6=Fome 7=Evacuou 8=Bristol 9=Treinou
    const sono      = parseFloat(txt(1)) || null;
    const qualidade = parseFloat(txt(2)) || null;
    const energia   = parseFloat(txt(3)) || null;
    const humor     = parseFloat(txt(4)) || null;
    const agua      = parseFloat(txt(5)) || null;
    const fome      = FOME_MAP[txt(6).toLowerCase()] || null;
    const treinou   = txt(9).toLowerCase().includes('sim');
    const evacuou   = txt(7).toLowerCase().includes('sim');
    const naoEvacou = txt(7).toLowerCase().includes('não');

    // Extrai apenas DD/MM (ignora badge "retro" inline)
    const rawDate  = cells[0]?.textContent || '';
    const dateMatch = rawDate.match(/(\d{2}\/\d{2})/);
    const dataStr  = dateMatch ? dateMatch[1] : txt(0);

    return { data: dataStr, sono, qualidade, energia, humor, agua, fome, treinou, evacuou, naoEvacou, _row: row };
  });
}

// ── 9. Trend indicators nas info-cards ────────────────────────────────────
function addTrendIndicators(data) {
  if (data.length < 4) return;

  const half   = Math.floor(data.length / 2);
  const recent = data.slice(0, half);
  const older  = data.slice(half);

  const avg = (arr, field) => {
    const vals = arr.map(d => d[field]).filter(v => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const metrics = {
    'Energia média': { recent: avg(recent, 'energia'), older: avg(older, 'energia') },
    'Sono médio':    { recent: avg(recent, 'sono'),    older: avg(older, 'sono') },
    'Humor médio':   { recent: avg(recent, 'humor'),   older: avg(older, 'humor') },
    'Água média':    { recent: avg(recent, 'agua'),    older: avg(older, 'agua') },
  };

  document.querySelectorAll('#resumo-grid .info-card').forEach(card => {
    const label = card.querySelector('.info-card-label')?.textContent.trim();
    const m = metrics[label];
    if (!m || m.recent === null || m.older === null) return;

    const diff = m.recent - m.older;
    let icon, cls;
    if (diff > 0.15)       { icon = '↑'; cls = 'trend-up'; }
    else if (diff < -0.15) { icon = '↓'; cls = 'trend-down'; }
    else                   { icon = '→'; cls = 'trend-flat'; }

    const badge = document.createElement('span');
    badge.className = `aci-trend ${cls}`;
    badge.textContent = icon;
    badge.setAttribute('data-tip',
      `${diff > 0 ? '+' : ''}${diff.toFixed(1)} vs primeira metade do período`);
    badge.setAttribute('tabindex', '0');
    card.querySelector('.info-card-value')?.appendChild(badge);
  });
}

// ── 10. Streak de treinos consecutivos ────────────────────────────────────
function addStreakBadge(data) {
  const asc = [...data].reverse();

  let maxStreak = 0, cur = 0;
  for (const d of asc) {
    if (d.treinou) { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 0;
  }

  let currentStreak = 0;
  for (let i = asc.length - 1; i >= 0; i--) {
    if (asc[i].treinou) currentStreak++;
    else break;
  }

  if (currentStreak < 2 && maxStreak < 2) return;

  const section = document.getElementById('resumo-grid')?.closest('.section');
  if (!section) return;

  const div = document.createElement('div');
  div.className = 'aci-streak-badge';
  div.setAttribute('aria-label', `Sequência atual de treinos: ${currentStreak} dias`);
  div.innerHTML = `
    <span class="aci-streak-icon">🔥</span>
    <span class="aci-streak-text">
      <strong>${currentStreak}</strong>&nbsp;dia${currentStreak !== 1 ? 's' : ''} consecutivo${currentStreak !== 1 ? 's' : ''}
      <span class="aci-streak-sub">sequência atual de treinos</span>
    </span>
    ${maxStreak > currentStreak
      ? `<span class="aci-streak-record">Recorde: ${maxStreak}d</span>`
      : ''}
  `;
  section.querySelector('.section-title')?.after(div);
}

// ── 11. Melhor e pior dia ─────────────────────────────────────────────────
function addMelhorPiorDia(data) {
  const scored = data
    .filter(d => d.energia !== null || d.humor !== null)
    .map(d => {
      let s = 0, n = 0;
      if (d.energia !== null) { s += d.energia / 5;           n++; }
      if (d.humor   !== null) { s += d.humor   / 5;           n++; }
      if (d.sono    !== null) { s += Math.min(d.sono / 8, 1); n++; }
      if (d.agua    !== null) { s += Math.min(d.agua / 2, 1); n++; }
      return { ...d, score: n ? s / n : 0 };
    });

  if (scored.length < 3) return;

  const best  = scored.reduce((a, b) => b.score > a.score ? b : a);
  const worst = scored.reduce((a, b) => b.score < a.score ? b : a);
  if (best === worst) return;

  const section = document.getElementById('resumo-grid')?.closest('.section');
  if (!section) return;

  const div = document.createElement('div');
  div.className = 'aci-bestworst';
  div.innerHTML = `
    <div class="aci-bw-item best">
      <span class="aci-bw-icon">⭐</span>
      <div>
        <p class="aci-bw-label">Melhor dia</p>
        <p class="aci-bw-date">${best.data}</p>
      </div>
    </div>
    <div class="aci-bw-item worst">
      <span class="aci-bw-icon">⚠️</span>
      <div>
        <p class="aci-bw-label">Dia para atenção</p>
        <p class="aci-bw-date">${worst.data}</p>
      </div>
    </div>
  `;
  const grid = document.getElementById('resumo-grid');
  grid?.after(div);
}

// ── 12. Barra de completude dos dados ─────────────────────────────────────
function addCompletudeBadge(data) {
  const complete = data.filter(
    d => d.energia !== null && d.humor !== null && d.sono !== null && d.agua !== null
  ).length;
  const pct = data.length ? Math.round((complete / data.length) * 100) : 0;

  const header = document.querySelector('.page-header');
  if (!header) return;

  const div = document.createElement('div');
  div.className = 'aci-completude';
  div.setAttribute('aria-label', `Completude dos registros: ${pct}%`);
  div.innerHTML = `
    <div class="aci-comp-bar-wrap" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="aci-comp-bar-fill" style="width:0%"></div>
    </div>
    <span class="aci-comp-label">${pct}% completo — ${complete}/${data.length} dias com todas as métricas</span>
  `;
  header.appendChild(div);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    div.querySelector('.aci-comp-bar-fill').style.width = pct + '%';
  }));
}

// ── 13. Insight de correlação sono-energia ────────────────────────────────
function addCorrelacaoInsight(data) {
  const pairs = data.filter(d => d.sono !== null && d.energia !== null);
  if (pairs.length < 5) return;

  const n    = pairs.length;
  const sumX  = pairs.reduce((s, d) => s + d.sono,    0);
  const sumY  = pairs.reduce((s, d) => s + d.energia, 0);
  const sumXY = pairs.reduce((s, d) => s + d.sono * d.energia, 0);
  const sumX2 = pairs.reduce((s, d) => s + d.sono ** 2, 0);
  const sumY2 = pairs.reduce((s, d) => s + d.energia ** 2, 0);
  const denom = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  if (!denom) return;
  const r = (n * sumXY - sumX * sumY) / denom;

  if (isNaN(r) || Math.abs(r) < 0.3) return;

  const strength = Math.abs(r) > 0.6 ? 'forte' : 'moderada';
  const msg = r > 0
    ? `Noites com mais sono tendem a resultar em maior energia (correlação ${strength}, r=${r.toFixed(2)}).`
    : `Sono e energia têm correlação negativa ${strength} (r=${r.toFixed(2)}) — a qualidade pode ser mais relevante que a duração.`;

  const resumoSection = document.getElementById('resumo-grid')?.closest('.section');
  if (!resumoSection) return;

  const card = document.createElement('div');
  card.className = 'aci-insight-card';
  card.setAttribute('role', 'note');
  card.innerHTML = `
    <span class="aci-insight-icon" aria-hidden="true">💡</span>
    <div>
      <p class="aci-insight-label">Correlação sono ↔ energia</p>
      <p class="aci-insight-text">${msg}</p>
    </div>
  `;
  resumoSection.after(card);
}

// ── 14. Export CSV ────────────────────────────────────────────────────────
function initExportCSV(data) {
  const section = document.querySelector('#tabela-checkins')?.closest('.section');
  if (!section) return;

  const btn = document.createElement('button');
  btn.className = 'aci-export-btn';
  btn.setAttribute('aria-label', 'Exportar tabela de check-ins em CSV');
  btn.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg> Exportar CSV`;

  section.querySelector('.section-title')?.after(btn);

  btn.addEventListener('click', () => {
    const headers = ['Data', 'Sono (h)', 'Qualidade', 'Energia', 'Humor', 'Água (L)', 'Treinou', 'Evacuou'];
    const csvRows = data.map(d => [
      d.data,
      d.sono      ?? '',
      d.qualidade ?? '',
      d.energia   ?? '',
      d.humor     ?? '',
      d.agua      ?? '',
      d.treinou ? 'Sim' : 'Não',
      d.evacuou ? 'Sim' : 'Não',
    ]);
    const csv  = [headers, ...csvRows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `checkins-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV exportado com sucesso!', 'success');
  });
}

// ── 15. Filtros rápidos ───────────────────────────────────────────────────
function initFiltrosRapidos(rows) {
  const section = document.querySelector('#tabela-checkins')?.closest('.section');
  if (!section) return;

  const filters = [
    { id: 'all',     label: 'Todos',           fn: () => true },
    {
      id: 'treinou', label: '🏋️ Treinou',
      fn: (r) => r.querySelectorAll('td')[9]?.textContent.trim().toLowerCase().includes('sim'),
    },
    {
      id: 'low-e',   label: '⚡ Baixa energia',
      fn: (r) => {
        const e = parseFloat(r.querySelectorAll('td')[3]?.textContent);
        return !isNaN(e) && e <= 2;
      },
    },
    {
      id: 'retro',   label: '📅 Retroativos',
      fn: (r) => !!r.querySelector('[data-tip*="retroativo"], [title*="retroativo"]') ||
                 (r.style.background || '').includes('201,168,76'),
    },
  ];

  const pills = document.createElement('div');
  pills.className = 'aci-filter-pills';
  pills.setAttribute('role', 'group');
  pills.setAttribute('aria-label', 'Filtros rápidos da tabela');

  filters.forEach(f => {
    const btn = document.createElement('button');
    btn.className = `aci-pill${f.id === 'all' ? ' active' : ''}`;
    btn.textContent = f.label;
    btn.dataset.filter = f.id;
    btn.setAttribute('aria-pressed', f.id === 'all' ? 'true' : 'false');
    btn.type = 'button';

    btn.addEventListener('click', () => {
      pills.querySelectorAll('.aci-pill').forEach(p => {
        const active = p.dataset.filter === f.id;
        p.classList.toggle('active', active);
        p.setAttribute('aria-pressed', String(active));
      });
      rows.forEach(r => { r.style.display = f.fn(r) ? '' : 'none'; });
      const visible = rows.filter(r => r.style.display !== 'none').length;
      showToast(
        `${visible} registro${visible !== 1 ? 's' : ''} exibido${visible !== 1 ? 's' : ''}`,
        'info', 2000
      );
    });
    pills.appendChild(btn);
  });

  section.querySelector('.section-title')?.after(pills);
}

// ── 16. Ordenação de colunas ──────────────────────────────────────────────
function initColunasSorting() {
  const table = document.querySelector('#tabela-checkins table');
  if (!table) return;

  const headers = table.querySelectorAll('thead th');
  let sortCol = -1, sortDir = 1;

  headers.forEach((th, i) => {
    th.style.cursor = 'pointer';
    th.setAttribute('tabindex', '0');
    th.setAttribute('role', 'columnheader');
    th.setAttribute('aria-sort', 'none');

    const doSort = () => {
      sortDir = sortCol === i ? sortDir * -1 : 1;
      sortCol = i;
      headers.forEach((h, j) =>
        h.setAttribute('aria-sort', j === i ? (sortDir === 1 ? 'ascending' : 'descending') : 'none')
      );
      const tbody = table.querySelector('tbody');
      if (!tbody) return;
      const tableRows = Array.from(tbody.querySelectorAll('tr'));
      tableRows.sort((a, b) => {
        const aT = a.querySelectorAll('td')[i]?.textContent.trim() || '';
        const bT = b.querySelectorAll('td')[i]?.textContent.trim() || '';
        const aN = parseFloat(aT), bN = parseFloat(bT);
        const cmp = (!isNaN(aN) && !isNaN(bN)) ? aN - bN : aT.localeCompare(bT, 'pt-BR');
        return cmp * sortDir;
      });
      tableRows.forEach(r => tbody.appendChild(r));
    };

    th.addEventListener('click', doSort);
    th.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doSort(); }
    });
  });
}

// ── 17. Row quality gradient ──────────────────────────────────────────────
function addRowQualityGradient(rows, data) {
  rows.forEach((row, i) => {
    const d = data[i];
    if (!d) return;
    row.classList.remove('aci-row-excellent', 'aci-row-poor');
    const vals = [d.energia, d.humor].filter(v => v !== null);
    if (!vals.length) return;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (avg >= 4.5)      row.classList.add('aci-row-excellent');
    else if (avg <= 1.5) row.classList.add('aci-row-poor');
  });
}

// ── 18. Rich tooltips ─────────────────────────────────────────────────────
let _tipEl = null;

function initRichTooltips() {
  document.querySelectorAll('#ci-content [data-tip], #ci-content [title]').forEach(el => {
    const tip = el.dataset.tip || el.getAttribute('title');
    if (!tip) return;
    el.removeAttribute('title');
    el.dataset.tip = tip;
    el.addEventListener('mouseenter', _showTip);
    el.addEventListener('mouseleave', _hideTip);
    el.addEventListener('focus',      _showTip);
    el.addEventListener('blur',       _hideTip);
  });
}

function _showTip(e) {
  const tip = e.currentTarget.dataset.tip;
  if (!tip) return;
  if (!_tipEl) {
    _tipEl = document.createElement('div');
    _tipEl.className = 'aci-rich-tooltip';
    _tipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(_tipEl);
  }
  _tipEl.textContent = tip;
  _tipEl.style.display = 'block';
  const r = e.currentTarget.getBoundingClientRect();
  _tipEl.style.left = (r.left + r.width / 2 + window.scrollX) + 'px';
  _tipEl.style.top  = (r.top + window.scrollY) + 'px';
  requestAnimationFrame(() => _tipEl.classList.add('show'));
}

function _hideTip() {
  _tipEl?.classList.remove('show');
}

// ════════════════════════════════════════════════════════════════════════════
// V2 — 7 novas melhorias
// ════════════════════════════════════════════════════════════════════════════

// ── 19. Dark mode ─────────────────────────────────────────────────────────
function initDarkMode() {
  if (localStorage.getItem(_DARK_KEY) === '1') {
    document.body.classList.add('aci-dark');
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('aci-dark');
  localStorage.setItem(_DARK_KEY, isDark ? '1' : '0');
  showToast(isDark ? 'Modo escuro ativado' : 'Modo claro restaurado', 'info', 2000);
}

// ── 20. Modo apresentação (fonte ampliada para revisão com a paciente) ─────
function initModoApresentacao() {
  if (localStorage.getItem(_APRES_KEY) === '1') {
    document.body.classList.add('aci-apresentacao');
  }
}

function toggleModoApresentacao() {
  const isOn = document.body.classList.toggle('aci-apresentacao');
  localStorage.setItem(_APRES_KEY, isOn ? '1' : '0');
  showToast(isOn ? 'Modo apresentação ativado — fonte ampliada' : 'Modo apresentação desativado', 'info', 2500);
}

// ── 21. Smart alerts — detecção automática de padrões clínicos ────────────
function addSmartAlerts(data) {
  if (data.length < 3) return;
  const asc = [...data].reverse(); // mais antigo → mais recente
  const alerts = [];

  // Sono deficiente: 3+ noites consecutivas com sono < 6h ou qualidade ≤ 2
  let poorRun = 0, maxPoor = 0;
  for (const d of asc) {
    const bad  = (d.sono !== null && d.sono < 6) || (d.qualidade !== null && d.qualidade <= 2);
    const good = d.sono !== null && d.sono >= 6 && (d.qualidade === null || d.qualidade > 2);
    if (bad)       { poorRun++; maxPoor = Math.max(maxPoor, poorRun); }
    else if (good) { poorRun = 0; }
  }
  if (maxPoor >= 3) {
    alerts.push({
      icon: '😴',
      label: 'Sono Deficiente',
      text: `${maxPoor} noites consecutivas com sono inadequado (< 6h ou qualidade ≤ 2). Avaliar higiene do sono.`,
      severity: maxPoor >= 5 ? 'high' : 'medium',
    });
  }

  // Fome elevada: 3+ dias com fome ≥ 4 (Muita/Excessiva)
  const highHunger = data.filter(d => d.fome !== null && d.fome >= 4).length;
  if (highHunger >= 3) {
    alerts.push({
      icon: '🍽️',
      label: 'Fome Elevada Frequente',
      text: `${highHunger} dias com fome elevada no período. Revisar distribuição calórica e saciedade.`,
      severity: highHunger >= 7 ? 'high' : 'medium',
    });
  }

  // Sedentarismo: 7+ dias consecutivos sem atividade registrada
  let noExRun = 0, maxNoEx = 0;
  for (const d of asc) {
    if (!d.treinou) { noExRun++; maxNoEx = Math.max(maxNoEx, noExRun); }
    else            { noExRun = 0; }
  }
  if (maxNoEx >= 7) {
    alerts.push({
      icon: '🏃',
      label: 'Sedentarismo Prolongado',
      text: `${maxNoEx} dias consecutivos sem atividade física. Incluir estratégias de ativação.`,
      severity: maxNoEx >= 14 ? 'high' : 'medium',
    });
  }

  // Constipação: 3+ dias consecutivos sem evacuação
  let noEvRun = 0, maxNoEv = 0;
  for (const d of asc) {
    if (d.naoEvacou)    { noEvRun++; maxNoEv = Math.max(maxNoEv, noEvRun); }
    else if (d.evacuou) { noEvRun = 0; }
  }
  if (maxNoEv >= 3) {
    alerts.push({
      icon: '⚠️',
      label: 'Constipação',
      text: `${maxNoEv} dias consecutivos sem evacuação registrada. Verificar fibras e hidratação.`,
      severity: maxNoEv >= 5 ? 'high' : 'medium',
    });
  }

  if (!alerts.length) return;

  const box = document.createElement('div');
  box.className = 'aci-smart-alerts';
  box.setAttribute('role', 'alert');
  box.setAttribute('aria-label', `${alerts.length} alerta${alerts.length > 1 ? 's' : ''} automático${alerts.length > 1 ? 's' : ''}`);
  box.innerHTML = `
    <div class="aci-sa-header">
      <span class="aci-sa-icon" aria-hidden="true">🔔</span>
      <span class="aci-sa-title">Alertas Automáticos</span>
      <span class="aci-sa-count">${alerts.length}</span>
    </div>
    ${alerts.map(a => `
      <div class="aci-sa-item aci-sa-${a.severity}">
        <span class="aci-sa-item-icon" aria-hidden="true">${a.icon}</span>
        <div class="aci-sa-item-body">
          <p class="aci-sa-item-label">${a.label}</p>
          <p class="aci-sa-item-text">${a.text}</p>
        </div>
      </div>
    `).join('')}
  `;

  const resumoSection = document.getElementById('resumo-grid')?.closest('.section');
  resumoSection?.before(box);
}

// ── 22. Badge de risco no cabeçalho da página ──────────────────────────────
function addBadgeRisco(data) {
  if (data.length < 3) return;

  const avgField = (field) => {
    const vals = data.filter(d => d[field] !== null).map(d => d[field]);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  let risk = 0;
  const avgEnergia = avgField('energia');
  const avgSono    = avgField('sono');
  const highHunger = data.filter(d => d.fome !== null && d.fome >= 4).length;

  if (avgEnergia !== null) {
    if (avgEnergia < 2) risk += 3;
    else if (avgEnergia < 3) risk += 1;
  }
  if (avgSono !== null) {
    if (avgSono < 5.5) risk += 3;
    else if (avgSono < 6.5) risk += 1;
  }
  if (highHunger >= 7) risk += 2;
  else if (highHunger >= 3) risk += 1;

  if (risk < 2) return;

  let riskLabel, riskClass;
  if (risk >= 6)      { riskLabel = 'Risco Alto';     riskClass = 'high'; }
  else if (risk >= 3) { riskLabel = 'Risco Moderado'; riskClass = 'medium'; }
  else                { riskLabel = 'Atenção Leve';   riskClass = 'low'; }

  const header = document.querySelector('#ci-content .page-header');
  if (!header) return;

  const badge = document.createElement('span');
  badge.className = `aci-risco-badge aci-risco-${riskClass}`;
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-label', `Nível de risco clínico: ${riskLabel}`);
  badge.textContent = riskLabel;
  header.appendChild(badge);
}

// ── 23. Heatmap de adesão (calendário visual dos últimos N dias) ───────────
function addHeatmapAdesao(data) {
  if (data.length < 2) return;
  const period = getPeriodDays();

  // Reconstrói datas ISO a partir de DD/MM (recua para ano anterior se futuro)
  const today = new Date();
  const dateMap = new Map();
  data.forEach(d => {
    const m = d.data.match(/(\d{2})\/(\d{2})/);
    if (!m) return;
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10) - 1;
    const candidate = new Date(today.getFullYear(), mm, dd);
    if (candidate > today) candidate.setFullYear(today.getFullYear() - 1);
    dateMap.set(candidate.toISOString().split('T')[0], d);
  });

  // Grade completa de N dias (do mais antigo ao mais recente)
  const cells = [];
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    cells.push({ iso, entry: dateMap.get(iso) || null });
  }

  const present = cells.filter(c => c.entry).length;
  const section = document.getElementById('resumo-grid')?.closest('.section');
  if (!section) return;

  const hm = document.createElement('div');
  hm.className = 'aci-heatmap';
  hm.innerHTML = `
    <div class="aci-heatmap-header">
      <span class="aci-heatmap-label">Adesão: ${present}/${period} dias com check-in</span>
      <div class="aci-heatmap-legend">
        <span class="aci-hm-dot hm-excellent" aria-hidden="true"></span><span>Ótimo</span>
        <span class="aci-hm-dot hm-good" aria-hidden="true"></span><span>Bom</span>
        <span class="aci-hm-dot hm-poor" aria-hidden="true"></span><span>Regular</span>
        <span class="aci-hm-dot hm-empty" aria-hidden="true"></span><span>Sem registro</span>
      </div>
    </div>
    <div class="aci-heatmap-grid" role="img" aria-label="Grade de ${period} dias — ${present} com check-in">
      ${cells.map(c => {
        if (!c.entry) {
          return `<div class="aci-hm-cell hm-empty" title="${c.iso}: sem check-in" aria-hidden="true"></div>`;
        }
        const vals  = [c.entry.energia, c.entry.humor].filter(v => v !== null);
        const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        const cls   = score >= 4 ? 'hm-excellent' : score >= 2.5 ? 'hm-good' : score > 0 ? 'hm-poor' : 'hm-neutral';
        const qual  = score >= 4 ? 'Ótimo' : score >= 2.5 ? 'Bom' : score > 0 ? 'Regular' : 'Sem métricas';
        return `<div class="aci-hm-cell ${cls}" title="${c.iso}: ${qual}" aria-hidden="true"></div>`;
      }).join('')}
    </div>
  `;

  section.querySelector('.section-title')?.after(hm);
}

function getPeriodDays() {
  const activeNav = document.querySelector('[id^="per-"].active');
  return activeNav ? parseInt(activeNav.id.replace('per-', ''), 10) : 7;
}

// ── 24. Busca textual no diário alimentar ─────────────────────────────────
function initBuscaDiario() {
  const wrapper = document.getElementById('tabela-diario');
  const section = wrapper?.closest('.section');
  if (!section || section.querySelector('.aci-busca-diario')) return;

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'aci-busca-diario';
  input.placeholder = 'Buscar no diário alimentar...';
  input.setAttribute('aria-label', 'Filtrar entradas do diário alimentar');

  let _searchTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => {
      const q = input.value.toLowerCase().trim();
      const entries = wrapper ? Array.from(wrapper.querySelectorAll(':scope > div > div')) : [];
      let visible = 0;
      entries.forEach(entry => {
        const show = !q || entry.textContent.toLowerCase().includes(q);
        entry.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      if (q && entries.length > 0) {
        showToast(`${visible} entrada${visible !== 1 ? 's' : ''} encontrada${visible !== 1 ? 's' : ''}`, 'info', 2000);
      }
    }, 250);
  });

  section.querySelector('.section-title')?.after(input);
}

// ── 25. Painel de atalhos de teclado ──────────────────────────────────────
function initPainelAtalhos() {
  if (document.getElementById('aci-atalhos-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'aci-atalhos-overlay';
  overlay.className = 'aci-atalhos-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Atalhos de teclado');
  overlay.setAttribute('hidden', '');

  overlay.innerHTML = `
    <div class="aci-atalhos-panel" tabindex="-1">
      <div class="aci-atalhos-hdr">
        <h3 class="aci-atalhos-title">Atalhos de Teclado</h3>
        <button class="aci-atalhos-close" aria-label="Fechar painel de atalhos">&#x2715;</button>
      </div>
      <div class="aci-atalhos-body">
        <div class="aci-atalho"><kbd>1</kbd><span>Últimos 7 dias</span></div>
        <div class="aci-atalho"><kbd>2</kbd><span>Últimos 14 dias</span></div>
        <div class="aci-atalho"><kbd>3</kbd><span>Últimos 30 dias</span></div>
        <div class="aci-atalho"><kbd>4</kbd><span>Últimos 90 dias</span></div>
        <div class="aci-atalho aci-atalho-sep"><kbd>D</kbd><span>Alternar modo escuro</span></div>
        <div class="aci-atalho"><kbd>P</kbd><span>Modo apresentação</span></div>
        <div class="aci-atalho"><kbd>?</kbd><span>Exibir / ocultar atalhos</span></div>
        <div class="aci-atalho"><kbd>Esc</kbd><span>Fechar sidebar ou painel</span></div>
      </div>
      <p class="aci-atalhos-hint">Atalhos inativos quando um campo de texto está focado.</p>
    </div>
  `;

  overlay.querySelector('.aci-atalhos-close').addEventListener('click', closePainelAtalhos);
  overlay.addEventListener('click', e => { if (e.target === overlay) closePainelAtalhos(); });

  document.body.appendChild(overlay);
}

function togglePainelAtalhos() {
  const overlay = document.getElementById('aci-atalhos-overlay');
  if (!overlay) return;
  if (overlay.hasAttribute('hidden')) {
    overlay.removeAttribute('hidden');
    overlay.querySelector('.aci-atalhos-panel')?.focus();
  } else {
    closePainelAtalhos();
  }
}

function closePainelAtalhos() {
  document.getElementById('aci-atalhos-overlay')?.setAttribute('hidden', '');
}

// ═══ POLIMENTO V3 ═══
// 10 melhorias de acessibilidade avançada
// V3: focus-trap real, foco restaurado, reduced-motion, high-contrast,
//     landmark labels, sort-announcer, skip-to-table, roving tabindex,
//     data-load announcer, table caption + role=grid

window._adminCheckinsExtras.version = 3;

document.addEventListener('DOMContentLoaded', () => {
  v3FocusTrap();        // 1
  v3FocusRestore();     // 2
  v3ReducedMotion();    // 3
  v3HighContrast();     // 4
  v3LandmarkLabels();   // 5
  v3SortAnnouncer();    // 6
  v3SkipToTable();      // 7
  v3RovingPills();      // 8
  v3DataAnnouncer();    // 9
  v3TableCaption();     // 10
});

// ── V3-1. Focus trap real no diálogo de atalhos ───────────────────────────
function v3FocusTrap() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const overlay = document.getElementById('aci-atalhos-overlay');
    if (!overlay || overlay.hasAttribute('hidden')) return;
    const panel = overlay.querySelector('.aci-atalhos-panel');
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll(
      'button:not([disabled]),[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])'
    ));
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus(); e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus(); e.preventDefault();
    }
  });
}

// ── V3-2. Restaura foco ao fechar o diálogo (MutationObserver em hidden) ──
function v3FocusRestore() {
  let _stored = null;
  const observe = el => {
    new MutationObserver(muts => {
      for (const m of muts) {
        if (m.attributeName !== 'hidden') continue;
        if (!el.hasAttribute('hidden')) {
          _stored = document.activeElement;
        } else if (_stored) {
          const target = _stored;
          _stored = null;
          setTimeout(() => target?.focus(), 60);
        }
      }
    }).observe(el, { attributes: true });
  };
  const retry = () => {
    const el = document.getElementById('aci-atalhos-overlay');
    if (el) { observe(el); return; }
    setTimeout(retry, 300);
  };
  retry();
}

// ── V3-3. prefers-reduced-motion → classe .aci-reduced-motion ─────────────
function v3ReducedMotion() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = v => document.body.classList.toggle('aci-reduced-motion', v);
  apply(mq.matches);
  mq.addEventListener('change', e => apply(e.matches));
}

// ── V3-4. prefers-contrast: more → classe .aci-high-contrast ──────────────
function v3HighContrast() {
  const mq = window.matchMedia('(prefers-contrast: more)');
  const apply = v => document.body.classList.toggle('aci-high-contrast', v);
  apply(mq.matches);
  mq.addEventListener('change', e => apply(e.matches));
}

// ── V3-5. aria-label em landmarks sem rótulo ──────────────────────────────
function v3LandmarkLabels() {
  const sidebar = document.querySelector('.sidebar:not([aria-label])');
  if (sidebar) {
    sidebar.setAttribute('aria-label', 'Menu lateral');
    if (!sidebar.getAttribute('role')) sidebar.setAttribute('role', 'navigation');
  }
  const mobileHdr = document.querySelector('.mobile-header:not([role])');
  if (mobileHdr) mobileHdr.setAttribute('role', 'banner');
  const main = document.getElementById('ci-main');
  if (main && !main.getAttribute('aria-label')) {
    main.setAttribute('aria-label', 'Painel de check-ins');
  }
  const periodParent = document.querySelector('[id^="per-"]')?.parentElement;
  if (periodParent && !periodParent.getAttribute('role')) {
    periodParent.setAttribute('role', 'group');
    periodParent.setAttribute('aria-label', 'Selecionar período');
  }
}

// ── V3-6. Anuncia ordenação de colunas para leitores de tela ──────────────
function v3SortAnnouncer() {
  const live = document.createElement('div');
  live.className = 'aci-sr-only';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  document.body.appendChild(live);

  const attach = () => {
    const thead = document.querySelector('#tabela-checkins table thead');
    if (!thead) { setTimeout(attach, 600); return; }
    new MutationObserver(() => {
      const sorted = thead.querySelector('[aria-sort="ascending"],[aria-sort="descending"]');
      if (!sorted) return;
      const dir   = sorted.getAttribute('aria-sort') === 'ascending' ? 'crescente' : 'decrescente';
      const label = sorted.textContent.replace(/[↑↓]/g, '').trim();
      live.textContent = '';
      setTimeout(() => { live.textContent = `Ordenado por "${label}" — ${dir}`; }, 80);
    }).observe(thead, { subtree: true, attributeFilter: ['aria-sort'] });
  };
  attach();
}

// ── V3-7. Segundo skip-link direto à tabela de dados ──────────────────────
function v3SkipToTable() {
  const first = document.querySelector('.aci-skip-link');
  const a = document.createElement('a');
  a.href = '#tabela-checkins';
  a.className = 'aci-skip-link aci-skip-secondary';
  a.textContent = 'Ir para a tabela de check-ins';
  if (first) first.after(a); else document.body.prepend(a);
  const target = document.getElementById('tabela-checkins');
  if (target && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
}

// ── V3-8. Roving tabindex nos filtros rápidos (← → navega) ───────────────
function v3RovingPills() {
  document.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const wrap = document.querySelector('.aci-filter-pills');
    if (!wrap) return;
    const pills = Array.from(wrap.querySelectorAll('.aci-pill'));
    if (!pills.length) return;
    const idx = pills.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    const next = e.key === 'ArrowRight'
      ? pills[(idx + 1) % pills.length]
      : pills[(idx - 1 + pills.length) % pills.length];
    pills.forEach(p => p.setAttribute('tabindex', '-1'));
    next.setAttribute('tabindex', '0');
    next.focus();
  });

  const area = document.getElementById('ci-content') || document.body;
  new MutationObserver(() => {
    const pills = document.querySelectorAll('.aci-filter-pills .aci-pill');
    if (!pills.length) return;
    const hasZero = Array.from(pills).some(p => p.getAttribute('tabindex') === '0');
    if (!hasZero) pills.forEach((p, i) => p.setAttribute('tabindex', i === 0 ? '0' : '-1'));
  }).observe(area, { childList: true, subtree: true });
}

// ── V3-9. Anuncia carregamento de dados ao leitor de tela ─────────────────
function v3DataAnnouncer() {
  const live = document.createElement('div');
  live.className = 'aci-sr-only';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  document.body.appendChild(live);

  const grid = document.getElementById('resumo-grid');
  if (!grid) return;
  let _prev = -1;

  new MutationObserver(() => {
    if (!grid.children.length) return;
    const rows   = document.querySelectorAll('#tabela-checkins tbody tr');
    const active = document.querySelector('[id^="per-"].active');
    const period = active ? active.id.replace('per-', '') : '';
    if (rows.length === _prev) return;
    _prev = rows.length;
    setTimeout(() => {
      live.textContent = '';
      setTimeout(() => {
        live.textContent =
          `${rows.length} registro${rows.length !== 1 ? 's' : ''} carregado${rows.length !== 1 ? 's' : ''}` +
          (period ? ` — últimos ${period} dias` : '');
      }, 100);
    }, 500);
  }).observe(grid, { childList: true });
}

// ── V3-10. Caption acessível e role=grid na tabela de check-ins ───────────
function v3TableCaption() {
  const grid = document.getElementById('resumo-grid');
  if (!grid) return;

  const inject = () => {
    const table = document.querySelector('#tabela-checkins table');
    if (!table) return;
    const old = table.querySelector('caption');
    if (old) old.remove();
    const rows   = table.querySelectorAll('tbody tr');
    const active = document.querySelector('[id^="per-"].active');
    const period = active ? active.id.replace('per-', '') : '7';
    const cap    = document.createElement('caption');
    cap.className = 'aci-sr-only';
    cap.textContent =
      `Histórico de check-ins — ${rows.length} registro${rows.length !== 1 ? 's' : ''} ` +
      `nos últimos ${period} dias. Clique nos cabeçalhos para ordenar.`;
    table.prepend(cap);
    if (!table.getAttribute('role')) table.setAttribute('role', 'grid');
  };

  new MutationObserver(() => {
    if (grid.children.length) setTimeout(inject, 300);
  }).observe(grid, { childList: true });
}

// ═══ POLIMENTO V4 ═══
// 10 melhorias de performance
// V4: ric() polyfill, prefetch de rotas, IntersectionObserver (fade-in seções),
//     ResizeObserver heatmap, memoização análises, flash de cards,
//     histograma de energia, performance.mark, Page Visibility pause,
//     idle watcher que orquestra tudo

window._adminCheckinsExtras.version = 4;

// ── V4-1. ric() — requestIdleCallback com fallback para setTimeout ─────────
function ric(cb, opts) {
  if (typeof requestIdleCallback === 'function') {
    return requestIdleCallback(cb, opts);
  }
  const start = Date.now();
  return setTimeout(() => cb({
    didTimeout: false,
    timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
  }), 1);
}
window._ric = ric;

// ── V4-2. Prefetch de rotas ao passar o mouse em links de navegação ────────
(function v4Prefetch() {
  const _seen = new Set();
  document.addEventListener('mouseenter', e => {
    const a = e.target.closest('a[href]');
    const href = a?.getAttribute('href');
    if (!href || _seen.has(href) || !/\.html($|\?|#)/.test(href)) return;
    _seen.add(href);
    ric(() => {
      if (document.head.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
      const link = Object.assign(document.createElement('link'), { rel: 'prefetch', href });
      document.head.appendChild(link);
    }, { timeout: 2000 });
  }, true);
})();

// ── V4-3. IntersectionObserver: fade-in de seções abaixo do fold ──────────
(function v4SectionFadeIn() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('aci-section-pre');
      entry.target.classList.add('aci-section-visible');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.05 });

  const attach = () => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.section').forEach(s => {
        if (s.classList.contains('aci-section-visible') ||
            s.classList.contains('aci-section-pre')) return;
        const rect = s.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        if (rect.top >= window.innerHeight * 0.85) {
          s.classList.add('aci-section-pre');
        }
        io.observe(s);
      });
    });
  };

  const resumoGrid = document.getElementById('resumo-grid');
  if (resumoGrid) {
    let _attachTimer = null;
    new MutationObserver(() => {
      if (!resumoGrid.children.length) return;
      clearTimeout(_attachTimer);
      _attachTimer = setTimeout(attach, 120);
    }).observe(resumoGrid, { childList: true });
  }
})();

// ── V4-4. ResizeObserver: células do heatmap responsivas ──────────────────
(function v4ResizeHeatmap() {
  if (!('ResizeObserver' in window)) return;
  const ro = new ResizeObserver(entries => {
    for (const entry of entries) {
      const hGrid = entry.target.querySelector('.aci-heatmap-grid');
      if (!hGrid) continue;
      const w    = entry.contentRect.width;
      const size = w < 300 ? '9px' : w < 440 ? '12px' : '16px';
      hGrid.querySelectorAll('.aci-hm-cell').forEach(c => {
        c.style.width  = size;
        c.style.height = size;
      });
    }
  });
  const attach = () => {
    document.querySelectorAll('.section').forEach(s => {
      if (s.querySelector('.aci-heatmap-grid') && !s._v4roWatched) {
        s._v4roWatched = true;
        ro.observe(s);
      }
    });
  };
  setTimeout(attach, 900);
  new MutationObserver(attach).observe(document.body, { childList: true, subtree: true });
})();

// ── V4-5. Memoização de análises por chave de período + dados ─────────────
const _v4Memo = new Map();

function v4MemoKey() {
  const active = document.querySelector('[id^="per-"].active');
  const period = active ? active.id.replace('per-', '') : '?';
  const rows   = document.querySelectorAll('#tabela-checkins tbody tr');
  const first  = rows[0]?.querySelectorAll('td')[0]?.textContent.trim() || '';
  return `${period}:${rows.length}:${first}`;
}

// ── V4-6. Flash nos cards de resumo ao atualizar dados ────────────────────
function v4FlashCards() {
  document.querySelectorAll('#resumo-grid .info-card').forEach((card, i) => {
    card.classList.remove('aci-card-flash');
    setTimeout(() => card.classList.add('aci-card-flash'), i * 45);
    setTimeout(() => card.classList.remove('aci-card-flash'), i * 45 + 620);
  });
}

// ── V4-7. Histograma de distribuição de energia (feature nova) ─────────────
function v4EnergyHistogram() {
  if (document.querySelector('.aci-energy-histogram')) return;
  const rows = Array.from(document.querySelectorAll('#tabela-checkins tbody tr'));
  const energies = rows
    .map(r => parseFloat(r.querySelectorAll('td')[3]?.textContent.trim()))
    .filter(v => !isNaN(v) && v >= 1 && v <= 5);
  if (energies.length < 5) return;

  const buckets = [0, 0, 0, 0, 0];
  energies.forEach(v => {
    const i = Math.min(Math.round(v) - 1, 4);
    if (i >= 0) buckets[i]++;
  });
  const maxB = Math.max(...buckets, 1);
  const avg  = (energies.reduce((a, b) => a + b, 0) / energies.length).toFixed(1);
  const COLORS = ['#e05252', '#e08852', '#C9A84C', '#4CB8A0', '#2D6A56'];
  const LABELS = ['1', '2', '3', '4', '5'];

  const div = document.createElement('div');
  div.className = 'aci-energy-histogram';
  div.setAttribute('role', 'img');
  div.setAttribute('aria-label',
    `Distribuição de energia: ${energies.length} registros, média ${avg}`);
  div.innerHTML = `
    <p class="aci-hist-title">Distribuição de Energia</p>
    <div class="aci-hist-bars" aria-hidden="true">
      ${buckets.map((count, i) => `
        <div class="aci-hist-col">
          <span class="aci-hist-count">${count || ''}</span>
          <div class="aci-hist-bar"
               style="background:${COLORS[i]}"
               data-pct="${(count / maxB * 100).toFixed(1)}"></div>
          <span class="aci-hist-label">${LABELS[i]}</span>
        </div>`).join('')}
    </div>
    <p class="aci-hist-caption">${energies.length} registros · média <strong>${avg}</strong>/5</p>
  `;

  const grid = document.getElementById('resumo-grid');
  if (!grid) return;
  grid.after(div);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    div.querySelectorAll('.aci-hist-bar').forEach(bar => {
      bar.style.height = bar.dataset.pct + '%';
    });
  }));
}

// ── V4-8. performance.mark para métricas de render em DevTools ────────────
function v4Mark(name) {
  try { performance.mark(`aci:${name}`); } catch (_) {}
}
function v4Measure(label, start, end) {
  try { performance.measure(`aci:${label}`, `aci:${start}`, `aci:${end}`); } catch (_) {}
}

// ── V4-9. Page Visibility: pausa timers de análise quando tab fica oculta ─
(function v4PageVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    clearTimeout(window._aciTimer);
    clearTimeout(window._v4IdleTimer);
  });
})();

// ── V4-10. Idle watcher: orquestra features V4 após análise V1/V2/V3 ──────
(function v4IdleWatch() {
  const attach = grid => {
    new MutationObserver(() => {
      if (!grid.children.length) return;
      const key = v4MemoKey();
      if (_v4Memo.has(key)) return;
      clearTimeout(window._v4IdleTimer);
      window._v4IdleTimer = setTimeout(() => {
        ric(deadline => {
          if (_v4Memo.has(key)) return;
          _v4Memo.set(key, true);
          v4Mark('idle-start');
          if (deadline.timeRemaining() > 5 || deadline.didTimeout) v4FlashCards();
          if (deadline.timeRemaining() > 8 || deadline.didTimeout) v4EnergyHistogram();
          v4Mark('idle-end');
          v4Measure('idle-analysis', 'idle-start', 'idle-end');
        }, { timeout: 2500 });
      }, 450);
    }).observe(grid, { childList: true });
  };

  const grid = document.getElementById('resumo-grid');
  if (grid) { attach(grid); return; }
  document.addEventListener('DOMContentLoaded', () => {
    const g = document.getElementById('resumo-grid');
    if (g) attach(g);
  });
})();

// ═══ POLIMENTO V5 ═══
// 10 Web APIs modernas
// V5: Wake Lock (tela acesa em apresentação), Web Share, Clipboard API,
//     Notification API (alertas críticos), Page Visibility (tempo ativo),
//     Battery API (modo econômico), Vibration API (haptics mobile),
//     Online/Offline detection, Storage Estimate API, Intl API (locale format)

window._adminCheckinsExtras.version = 5;

document.addEventListener('DOMContentLoaded', () => {
  v5WakeLock();       // 1
  v5WebShare();       // 2
  v5Clipboard();      // 3
  v5Notifications();  // 4
  v5Vibration();      // 7
  v5IntlFormat();     // 10
});

// ── V5-1. Wake Lock — mantém tela acesa durante modo apresentação ──────────
function v5WakeLock() {
  if (!('wakeLock' in navigator)) return;
  let _wl = null;

  const acquire = async () => {
    if (_wl) return;
    try {
      _wl = await navigator.wakeLock.request('screen');
      _wl.addEventListener('release', () => { _wl = null; }, { once: true });
    } catch (_) {}
  };

  const release = () => { _wl?.release().catch(() => {}); _wl = null; };

  new MutationObserver(() => {
    document.body.classList.contains('aci-apresentacao') ? acquire() : release();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' &&
        document.body.classList.contains('aci-apresentacao')) acquire();
  });

  if (document.body.classList.contains('aci-apresentacao')) acquire();
}

// ── V5-2. Web Share API — share nativo do resumo do período ───────────────
function v5WebShare() {
  if (!navigator.share) return;

  const btn = document.createElement('button');
  btn.className = 'aci-share-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Compartilhar resumo do período');
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Compartilhar`;

  const attach = () => {
    if (document.querySelector('.aci-share-btn')) return;
    const ref = document.querySelector('.aci-export-btn');
    if (ref) ref.after(btn);
  };

  const grid = document.getElementById('resumo-grid');
  if (grid) {
    new MutationObserver(() => {
      if (grid.children.length) setTimeout(attach, 600);
    }).observe(grid, { childList: true });
  }

  btn.addEventListener('click', async () => {
    const cards = Array.from(document.querySelectorAll('#resumo-grid .info-card'));
    const lines = cards.map(c => {
      const l = c.querySelector('.info-card-label')?.textContent.trim() || '';
      const v = c.querySelector('.info-card-value')?.textContent.trim() || '';
      return l && v ? `• ${l}: ${v}` : '';
    }).filter(Boolean);
    const period = document.querySelector('[id^="per-"].active')?.id.replace('per-', '') || '7';
    const text = [`📊 ERG 360 — Resumo (últimos ${period} dias)`, '', ...lines].join('\n');
    try {
      await navigator.share({ title: 'ERG 360', text });
      showToast('Resumo compartilhado!', 'success', 2500);
    } catch (e) {
      if (e.name !== 'AbortError') showToast('Compartilhamento não disponível.', 'warning');
    }
  });
}

// ── V5-3. Clipboard API — copia resumo estruturado para área de transferência
function v5Clipboard() {
  if (!navigator.clipboard?.writeText) return;

  const btn = document.createElement('button');
  btn.className = 'aci-copy-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Copiar resumo para área de transferência');
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar`;

  const attach = () => {
    if (document.querySelector('.aci-copy-btn')) return;
    const ref = document.querySelector('.aci-share-btn') || document.querySelector('.aci-export-btn');
    if (ref) ref.after(btn);
  };

  const grid = document.getElementById('resumo-grid');
  if (grid) {
    new MutationObserver(() => {
      if (grid.children.length) setTimeout(attach, 700);
    }).observe(grid, { childList: true });
  }

  btn.addEventListener('click', async () => {
    const cards = Array.from(document.querySelectorAll('#resumo-grid .info-card'));
    const lines = cards.map(c => {
      const l = c.querySelector('.info-card-label')?.textContent.trim() || '';
      const v = c.querySelector('.info-card-value')?.textContent.trim() || '';
      return l && v ? `• ${l}: ${v}` : '';
    }).filter(Boolean);
    const period = document.querySelector('[id^="per-"].active')?.id.replace('per-', '') || '7';
    const alertEls = document.querySelectorAll('.aci-sa-item .aci-sa-item-label');
    const alertLines = alertEls.length
      ? ['\n🔔 Alertas:', ...Array.from(alertEls).map(el => `  - ${el.textContent.trim()}`)]
      : [];
    const text = [
      `ERG 360 — Resumo (últimos ${period} dias)`,
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      '',
      ...lines,
      ...alertLines,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      btn.classList.add('aci-copy-success');
      btn.setAttribute('aria-label', 'Copiado!');
      showToast('Resumo copiado!', 'success', 2500);
      setTimeout(() => {
        btn.classList.remove('aci-copy-success');
        btn.setAttribute('aria-label', 'Copiar resumo para área de transferência');
      }, 2200);
    } catch (_) {
      showToast('Não foi possível copiar.', 'warning');
    }
  });
}

// ── V5-4. Notification API — alerta proativo de riscos críticos ───────────
function v5Notifications() {
  if (!('Notification' in window)) return;
  const grid = document.getElementById('resumo-grid');
  if (!grid) return;
  let _sent = false;

  new MutationObserver(() => {
    if (_sent || !grid.children.length) return;
    setTimeout(() => {
      const highRisk = document.querySelectorAll('.aci-sa-high').length;
      if (!highRisk) return;
      _sent = true;
      if (Notification.permission === 'granted') {
        _v5SendNotif(highRisk);
      } else if (Notification.permission === 'default') {
        _v5ShowNotifPrompt(highRisk);
      }
    }, 1500);
  }).observe(grid, { childList: true });
}

function _v5ShowNotifPrompt(count) {
  if (document.querySelector('.aci-notif-prompt')) return;
  const el = document.createElement('div');
  el.className = 'aci-notif-prompt';
  el.setAttribute('role', 'alertdialog');
  el.setAttribute('aria-label', 'Permitir notificações de alertas clínicos');
  el.innerHTML = `
    <span>🔔 ${count} alerta${count > 1 ? 's' : ''} crítico${count > 1 ? 's' : ''}. Ativar notificações?</span>
    <button class="aci-notif-allow" type="button">Sim</button>
    <button class="aci-notif-deny"  type="button">Não</button>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  el.querySelector('.aci-notif-allow').addEventListener('click', async () => {
    el.remove();
    const perm = await Notification.requestPermission();
    if (perm === 'granted') _v5SendNotif(count);
  });
  el.querySelector('.aci-notif-deny').addEventListener('click', () => el.remove());
  setTimeout(() => { if (el.isConnected) el.remove(); }, 12000);
}

function _v5SendNotif(count) {
  try {
    new Notification('ERG 360 — Alerta Clínico', {
      body: `${count} alerta${count > 1 ? 's' : ''} de alto risco detectado${count > 1 ? 's' : ''} no período.`,
      icon: '/favicon.ico',
      tag:  'erg-alerta',
      renotify: false,
    });
  } catch (_) {}
}

// ── V5-5. Page Visibility — acumula tempo ativo e exibe no rodapé ─────────
(function v5PageVisibility() {
  const KEY = 'erg_acheckins_active_ms';
  let _ts = document.visibilityState === 'visible' ? Date.now() : null;

  const flush = () => {
    if (!_ts) return;
    const saved = parseInt(localStorage.getItem(KEY) || '0', 10);
    localStorage.setItem(KEY, String(saved + Date.now() - _ts));
    _ts = null;
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { flush(); }
    else { _ts = Date.now(); }
  });
  window.addEventListener('pagehide', flush, { once: true });

  const injectTime = () => {
    const footer = document.querySelector('.sidebar-footer');
    if (!footer || footer.querySelector('.aci-active-time')) return;
    const total   = parseInt(localStorage.getItem(KEY) || '0', 10);
    const minutes = Math.round(total / 60000);
    if (minutes < 1) return;
    const span = document.createElement('span');
    span.className = 'aci-active-time';
    span.setAttribute('aria-label', `Tempo ativo nesta página: ${minutes} minuto${minutes !== 1 ? 's' : ''}`);
    span.textContent = `⏱ ${minutes}min ativos`;
    footer.appendChild(span);
  };
  setTimeout(injectTime, 2500);
})();

// ── V5-6. Battery API — reduz animações em bateria crítica (< 15%) ─────────
(function v5Battery() {
  if (!('getBattery' in navigator)) return;
  const applyEco = on => {
    document.body.classList.toggle('aci-battery-saver', on);
    if (on) showToast('Modo econômico ativo (bateria < 15%)', 'warning', 4000);
  };
  navigator.getBattery().then(b => {
    const check = () => applyEco(!b.charging && b.level < 0.15);
    check();
    b.addEventListener('levelchange',    check);
    b.addEventListener('chargingchange', check);
  }).catch(() => {});
})();

// ── V5-7. Vibration API — feedback háptico mobile em ações ────────────────
function v5Vibration() {
  if (!('vibrate' in navigator)) return;
  document.addEventListener('click', e => {
    if      (e.target.closest('.aci-export-btn'))  navigator.vibrate(40);
    else if (e.target.closest('.aci-copy-btn'))    navigator.vibrate([20, 10, 20]);
    else if (e.target.closest('.aci-share-btn'))   navigator.vibrate(30);
    else if (e.target.closest('.aci-pill'))        navigator.vibrate(15);
    else if (e.target.closest('.aci-notif-allow, .aci-notif-deny')) navigator.vibrate(25);
  });
}

// ── V5-8. Online/Offline API — detecta e sinaliza ausência de conexão ──────
(function v5OnlineStatus() {
  let _banner = null;

  const setBanner = offline => {
    if (offline) {
      if (_banner) return;
      _banner = document.createElement('div');
      _banner.className = 'aci-offline-banner';
      _banner.setAttribute('role', 'status');
      _banner.setAttribute('aria-live', 'assertive');
      _banner.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg> Sem conexão — dados exibidos do cache`;
      document.body.appendChild(_banner);
      requestAnimationFrame(() => _banner.classList.add('show'));
    } else {
      if (!_banner) return;
      _banner.classList.remove('show');
      setTimeout(() => { _banner?.remove(); _banner = null; }, 320);
      if (typeof showToast === 'function') showToast('Conexão restaurada', 'success', 2500);
    }
  };

  setBanner(!navigator.onLine);
  window.addEventListener('online',  () => setBanner(false));
  window.addEventListener('offline', () => setBanner(true));
})();

// ── V5-9. Storage Estimate — avisa se localStorage próximo do limite ───────
(function v5StorageQuota() {
  if (!navigator.storage?.estimate) return;
  navigator.storage.estimate().then(({ usage, quota }) => {
    const pct = usage / quota;
    if (pct < 0.8) return;
    const label = pct >= 0.95 ? 'Armazenamento quase cheio' : 'Armazenamento em 80%+';
    showToast(`⚠️ ${label} (${Math.round(pct * 100)}% usado)`, 'warning', 6000);
  }).catch(() => {});
})();

// ── V5-10. Intl API — normaliza formato de números para locale do browser ──
function v5IntlFormat() {
  const locale = navigator.language || 'pt-BR';
  if (locale.startsWith('pt')) return;
  const numFmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const reformat = () => {
    document.querySelectorAll('#tabela-checkins tbody tr:not([data-v5-fmt])').forEach(row => {
      row.dataset.v5Fmt = '1';
      const cells = row.querySelectorAll('td');
      [1, 3, 4, 5].forEach(i => {
        const cell = cells[i];
        if (!cell) return;
        const n = parseFloat(cell.textContent.replace(',', '.'));
        if (!isNaN(n)) cell.textContent = numFmt.format(n);
      });
    });
  };

  const grid = document.getElementById('resumo-grid');
  if (grid) {
    new MutationObserver(() => {
      if (grid.children.length) setTimeout(reformat, 500);
    }).observe(grid, { childList: true });
  }
}

// ═══ POLIMENTO V6 ═══
// 16 melhorias UX clínicas
// V6: sparklines mini (1), anotações inline (2), timeline visual (3),
//     comparação de períodos (4), botão print/PDF (5), padrão por dia da semana (6),
//     lacunas no período (7), indicador de última entrada (8),
//     busca nas observações (9), resumo prontuário (10),
//     modo compacto (11), regressão linear (12), highlight células extremas (13),
//     navegação rápida (14), score por semana (15), atalhos E/C/R (16)

window._adminCheckinsExtras.version = 6;

const _NOTES_KEY   = 'erg_acheckins_notes';
const _COMPACT_KEY = 'erg_acheckins_compact';

document.addEventListener('DOMContentLoaded', () => {
  v6ModoCompacto();     // 11
  v6AtalhosPatch();     // 16
  v6NavigacaoRapida();  // 14
  v6PrintButton();      //  5
});

// Observa o grid para disparar features V6 após carga de dados
(function v6Watch() {
  const attach = () => {
    const grid = document.getElementById('resumo-grid');
    if (!grid) { setTimeout(attach, 300); return; }
    let _last6 = '';
    new MutationObserver(() => {
      if (grid.children.length > 0 && grid.innerHTML !== _last6) {
        _last6 = grid.innerHTML;
        clearTimeout(window._aciV6Timer);
        window._aciV6Timer = setTimeout(onV6ContentReady, 450);
      }
    }).observe(grid, { childList: true });
  };
  attach();
})();

function onV6ContentReady() {
  document.querySelectorAll(
    '.aci-sparkline-cell, .aci-nota-th, .aci-nota-cell, .aci-timeline-v6, ' +
    '.aci-comp-periodo, .aci-dayofweek, .aci-lacunas-badge, ' +
    '.aci-ultima-entrada, .aci-busca-obs, .aci-prontuario-btn, ' +
    '.aci-regressao-insight, .aci-score-semana'
  ).forEach(el => el.remove());

  const rows = Array.from(document.querySelectorAll('#tabela-checkins tbody tr'));
  if (!rows.length) return;
  const data = parseTableRows(rows);

  v6SparklinesMini(data);            //  1
  v6AnotacoesInline(rows, data);     //  2
  v6TimelineVisual(data);            //  3
  v6ComparacaoPeriodo(data);         //  4
  v6PadraoDiaSemana(data);           //  6
  v6LacunasPeriodo(data);            //  7
  v6UltimaEntrada(data);             //  8
  v6BuscaObservacoes(rows);          //  9
  v6ResumoProntuario(data);          // 10
  v6RegressaoLinear(data);           // 12
  v6HighlightCelulasExtremas(rows);  // 13
  v6ScorePorSemana(data);            // 15
}

// ── V6-1. Sparklines mini de energia e humor ─────────────────────────────
function v6SparklinesMini(data) {
  if (data.length < 4) return;
  const section = document.getElementById('resumo-grid')?.closest('.section');
  if (!section) return;

  const POINTS = Math.min(data.length, 14);
  const asc    = data.slice(0, POINTS).reverse();

  const drawSparkline = (values, color, label) => {
    const canvas = document.createElement('canvas');
    canvas.width  = 110;
    canvas.height = 30;
    canvas.setAttribute('aria-hidden', 'true');
    const ctx   = canvas.getContext('2d');
    const valid = values.filter(v => v !== null);
    if (valid.length < 2) return null;

    const min   = Math.min(...valid);
    const max   = Math.max(...valid);
    const range = max - min || 1;
    const pad   = 3;
    const w = canvas.width - pad * 2;
    const h = canvas.height - pad * 2;

    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';

    const pts = values
      .map((v, i) => v !== null ? {
        x: pad + (i / Math.max(values.length - 1, 1)) * w,
        y: pad + (1 - (v - min) / range) * h,
      } : null)
      .filter(Boolean);

    if (pts.length < 2) return null;
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    const div = document.createElement('div');
    div.className = 'aci-spark-item';
    const lbl = document.createElement('span');
    lbl.className = 'aci-spark-label';
    lbl.textContent = label;
    div.appendChild(lbl);
    div.appendChild(canvas);
    return div;
  };

  const eItem = drawSparkline(asc.map(d => d.energia), '#4CB8A0', 'Energia');
  const hItem = drawSparkline(asc.map(d => d.humor),   '#C9A84C', 'Humor');
  const sItem = drawSparkline(asc.map(d => d.sono),    '#2D6A56', 'Sono');
  if (!eItem && !hItem && !sItem) return;

  const wrap  = document.createElement('div');
  wrap.className = 'aci-sparkline-cell';
  wrap.setAttribute('aria-label', 'Mini sparklines de tendência do período');
  const inner = document.createElement('div');
  inner.className = 'aci-spark-inner';
  [eItem, hItem, sItem].forEach(it => { if (it) inner.appendChild(it); });
  wrap.appendChild(inner);
  section.querySelector('.section-title')?.after(wrap);
}

// ── V6-2. Anotações inline da nutricionista ──────────────────────────────
function v6AnotacoesInline(rows, data) {
  const notes = JSON.parse(localStorage.getItem(_NOTES_KEY) || '{}');
  const year  = new Date().getFullYear();

  // Cabeçalho da coluna (uma vez)
  const table = document.querySelector('#tabela-checkins table');
  const thead = table?.querySelector('thead tr');
  if (thead && !thead.querySelector('.aci-nota-th')) {
    const th = document.createElement('th');
    th.className = 'aci-nota-th';
    th.textContent = 'Nota';
    th.setAttribute('scope', 'col');
    thead.appendChild(th);
  }

  rows.forEach((row, i) => {
    const d = data[i];
    if (!d) return;
    const key = `${year}:${d.data}`;
    const td  = document.createElement('td');
    td.className = 'aci-nota-cell';

    const existing = notes[key];
    const btn = document.createElement('button');
    btn.className = 'aci-nota-btn' + (existing ? ' has-note' : '');
    btn.type = 'button';
    btn.setAttribute('aria-label', existing ? `Nota: ${existing}` : 'Adicionar anotação');
    btn.setAttribute('data-key', key);
    btn.textContent = existing ? '📝' : '＋';

    btn.addEventListener('click', () => {
      const cur     = JSON.parse(localStorage.getItem(_NOTES_KEY) || '{}');
      const current = cur[key] || '';
      const nova    = prompt(`Anotação clínica — ${d.data}:\n(vazio para remover)`, current);
      if (nova === null) return;
      if (nova.trim()) {
        cur[key] = nova.trim();
        btn.textContent = '📝';
        btn.classList.add('has-note');
        btn.setAttribute('aria-label', `Nota: ${nova.trim()}`);
        showToast('Anotação salva', 'success', 2000);
      } else {
        delete cur[key];
        btn.textContent = '＋';
        btn.classList.remove('has-note');
        btn.setAttribute('aria-label', 'Adicionar anotação');
        showToast('Anotação removida', 'info', 2000);
      }
      localStorage.setItem(_NOTES_KEY, JSON.stringify(cur));
    });

    td.appendChild(btn);
    row.appendChild(td);
  });
}

// ── V6-3. Timeline visual horizontal de check-ins ────────────────────────
function v6TimelineVisual(data) {
  if (data.length < 3) return;
  const section = document.querySelector('#tabela-checkins')?.closest('.section');
  if (!section) return;

  const asc = [...data].reverse();
  const wrap = document.createElement('div');
  wrap.className = 'aci-timeline-v6';
  wrap.setAttribute('aria-label', 'Timeline visual dos check-ins do período');

  const track = document.createElement('div');
  track.className = 'aci-tl-track';
  track.setAttribute('aria-hidden', 'true');

  asc.forEach((d, i) => {
    const vals  = [d.energia, d.humor].filter(v => v !== null);
    const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const cls   = score >= 4 ? 'tl-ex' : score >= 2.5 ? 'tl-ok' : score > 0 ? 'tl-poor' : 'tl-empty';
    const dot   = document.createElement('div');
    dot.className = `aci-tl-dot ${cls}`;
    dot.title = `${d.data}${score ? ' — ' + score.toFixed(1) + '/5' : ' — sem métricas'}`;
    if (i === asc.length - 1) dot.classList.add('tl-today');
    track.appendChild(dot);
  });

  const lbl = document.createElement('div');
  lbl.className = 'aci-tl-labels';
  lbl.innerHTML = `<span>${asc[0]?.data || ''}</span><span class="aci-tl-title">Timeline</span><span>${asc[asc.length - 1]?.data || ''}</span>`;

  wrap.appendChild(track);
  wrap.appendChild(lbl);
  section.querySelector('.section-title')?.after(wrap);
}

// ── V6-4. Comparação 1ª vs 2ª metade do período ──────────────────────────
function v6ComparacaoPeriodo(data) {
  if (data.length < 6) return;
  const half   = Math.floor(data.length / 2);
  const recent = data.slice(0, half);
  const older  = data.slice(half);

  const avg = (arr, field) => {
    const vals = arr.map(d => d[field]).filter(v => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const items = [
    { field: 'energia', label: 'Energia', unit: '' },
    { field: 'humor',   label: 'Humor',   unit: '' },
    { field: 'sono',    label: 'Sono',    unit: 'h' },
    { field: 'agua',    label: 'Água',    unit: 'L' },
  ].map(m => {
    const r = avg(recent, m.field);
    const o = avg(older,  m.field);
    if (r === null || o === null) return null;
    return { label: m.label, unit: m.unit, diff: r - o };
  }).filter(Boolean);

  if (!items.length) return;

  const box = document.createElement('div');
  box.className = 'aci-comp-periodo';
  box.setAttribute('role', 'note');
  box.innerHTML = `
    <p class="aci-cp-title">Comparação — 1ª vs 2ª metade do período</p>
    <div class="aci-cp-grid">
      ${items.map(it => {
        const up   = it.diff > 0.05;
        const down = it.diff < -0.05;
        const sign = up ? '+' : '';
        const cls  = up ? 'cp-up' : down ? 'cp-down' : 'cp-flat';
        const val  = Math.abs(it.diff) < 0.05 ? '≈0' : sign + it.diff.toFixed(1) + it.unit;
        return `<div class="aci-cp-item ${cls}"><span class="aci-cp-label">${it.label}</span><span class="aci-cp-val">${val}</span></div>`;
      }).join('')}
    </div>`;

  document.getElementById('resumo-grid')?.closest('.section')?.after(box);
}

// ── V6-5. Botão Print / PDF ───────────────────────────────────────────────
function v6PrintButton() {
  const section = document.querySelector('#tabela-checkins')?.closest('.section');
  if (!section || document.querySelector('.aci-print-btn-v6')) return;

  const btn = document.createElement('button');
  btn.className = 'aci-export-btn aci-print-btn-v6';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Imprimir / Exportar PDF');
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Imprimir`;

  const attach = () => {
    const ref = section.querySelector('.aci-export-btn:not(.aci-print-btn-v6)');
    if (ref) ref.after(btn);
    else section.querySelector('.section-title')?.after(btn);
  };

  if (document.querySelector('.aci-export-btn')) attach();
  else setTimeout(attach, 700);

  btn.addEventListener('click', () => {
    showToast('Abrindo impressão…', 'info', 2000);
    setTimeout(() => window.print(), 350);
  });
}

// ── V6-6. Padrão por dia da semana ───────────────────────────────────────
function v6PadraoDiaSemana(data) {
  if (data.length < 7) return;
  const DAYS   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today  = new Date();
  const bkts   = Array.from({ length: 7 }, () => ({ sum: 0, cnt: 0 }));

  data.forEach(d => {
    const m = d.data.match(/(\d{2})\/(\d{2})/);
    if (!m) return;
    const c = new Date(today.getFullYear(), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    if (c > today) c.setFullYear(today.getFullYear() - 1);
    const vals = [d.energia, d.humor].filter(v => v !== null);
    if (!vals.length) return;
    const wd = c.getDay();
    bkts[wd].sum += vals.reduce((a, b) => a + b, 0) / vals.length;
    bkts[wd].cnt += 1;
  });

  const avgs = bkts.map((b, i) => ({ day: DAYS[i], avg: b.cnt ? b.sum / b.cnt : null }))
    .filter(b => b.avg !== null);
  if (avgs.length < 3) return;

  const best  = avgs.reduce((a, b) => b.avg > a.avg ? b : a);
  const worst = avgs.reduce((a, b) => b.avg < a.avg ? b : a);

  const section = document.getElementById('resumo-grid')?.closest('.section');
  if (!section) return;

  const div = document.createElement('div');
  div.className = 'aci-dayofweek';
  div.setAttribute('role', 'note');
  div.innerHTML = `
    <p class="aci-dow-title">Padrão por dia da semana</p>
    <div class="aci-dow-grid">
      ${avgs.map(a => {
        const pct = Math.round((a.avg / 5) * 100);
        const isBest  = a.day === best.day;
        const isWorst = a.day === worst.day;
        return `<div class="aci-dow-col${isBest ? ' dow-best' : isWorst ? ' dow-worst' : ''}" title="${a.day}: ${a.avg.toFixed(1)}/5">
          <div class="aci-dow-bar-wrap"><div class="aci-dow-bar" style="height:${pct}%"></div></div>
          <span class="aci-dow-label">${a.day}</span>
        </div>`;
      }).join('')}
    </div>
    <p class="aci-dow-caption">Melhor: <strong>${best.day}</strong> (${best.avg.toFixed(1)}) &nbsp;·&nbsp; Atenção: <strong>${worst.day}</strong> (${worst.avg.toFixed(1)})</p>`;

  const hm = document.querySelector('.aci-heatmap');
  if (hm) hm.after(div);
  else section.querySelector('.section-title')?.after(div);
}

// ── V6-7. Lacunas no período ──────────────────────────────────────────────
function v6LacunasPeriodo(data) {
  const period  = getPeriodDays();
  const today   = new Date();
  const present = new Set();

  data.forEach(d => {
    const m = d.data.match(/(\d{2})\/(\d{2})/);
    if (!m) return;
    const c = new Date(today.getFullYear(), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    if (c > today) c.setFullYear(today.getFullYear() - 1);
    present.add(c.toISOString().split('T')[0]);
  });

  let gaps = 0;
  for (let i = 0; i < period; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (!present.has(d.toISOString().split('T')[0])) gaps++;
  }
  if (!gaps) return;

  const header = document.querySelector('#ci-content .page-header');
  if (!header || header.querySelector('.aci-lacunas-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'aci-lacunas-badge';
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-label', `${gaps} dias sem check-in no período`);
  badge.innerHTML = `<span class="aci-lac-icon" aria-hidden="true">📅</span><span class="aci-lac-text">${gaps} dia${gaps !== 1 ? 's' : ''} sem check-in no período</span>`;
  header.appendChild(badge);
}

// ── V6-8. Indicador de última entrada ────────────────────────────────────
function v6UltimaEntrada(data) {
  if (!data.length) return;
  const m = data[0].data.match(/(\d{2})\/(\d{2})/);
  if (!m) return;
  const today = new Date();
  const c = new Date(today.getFullYear(), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  if (c > today) c.setFullYear(today.getFullYear() - 1);
  const diff = Math.round((today - c) / 86400000);

  const header = document.querySelector('#ci-content .page-header');
  if (!header || header.querySelector('.aci-ultima-entrada')) return;

  const span = document.createElement('span');
  span.className = 'aci-ultima-entrada'
    + (diff > 7 ? ' aci-ue-late' : diff > 3 ? ' aci-ue-warn' : '');
  span.setAttribute('role', 'status');
  span.textContent = `Último check-in: ${diff === 0 ? 'hoje' : diff === 1 ? 'ontem' : `há ${diff} dias`}`;
  header.appendChild(span);
}

// ── V6-9. Busca nas observações da tabela de check-ins ────────────────────
function v6BuscaObservacoes(rows) {
  const section = document.querySelector('#tabela-checkins')?.closest('.section');
  if (!section || section.querySelector('.aci-busca-obs')) return;

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'aci-busca-obs';
  input.placeholder = 'Buscar na tabela de check-ins…';
  input.setAttribute('aria-label', 'Filtrar linhas da tabela de check-ins por texto');

  let _t = null;
  input.addEventListener('input', () => {
    clearTimeout(_t);
    _t = setTimeout(() => {
      const q = input.value.toLowerCase().trim();
      let vis = 0;
      rows.forEach(row => {
        const show = !q || row.textContent.toLowerCase().includes(q);
        row.style.display = show ? '' : 'none';
        if (show) vis++;
      });
      if (q) showToast(`${vis} linha${vis !== 1 ? 's' : ''} encontrada${vis !== 1 ? 's' : ''}`, 'info', 1800);
      else rows.forEach(r => { r.style.display = ''; });
    }, 220);
  });

  const pills = section.querySelector('.aci-filter-pills');
  if (pills) pills.after(input);
  else section.querySelector('.section-title')?.after(input);
}

// ── V6-10. Resumo de prontuário formatado ─────────────────────────────────
function v6ResumoProntuario(data) {
  const section = document.querySelector('#tabela-checkins')?.closest('.section');
  if (!section || section.querySelector('.aci-prontuario-btn')) return;

  const btn = document.createElement('button');
  btn.className = 'aci-export-btn aci-prontuario-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Gerar e copiar resumo para prontuário');
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Prontuário`;

  const attachPront = () => {
    const ref = section.querySelector('.aci-print-btn-v6') || section.querySelector('.aci-export-btn');
    if (ref && ref !== btn) ref.after(btn);
    else if (!section.contains(btn)) section.querySelector('.section-title')?.after(btn);
  };
  setTimeout(attachPront, 800);

  btn.addEventListener('click', async () => {
    if (!data.length) { showToast('Sem dados', 'warning'); return; }
    const avg = f => {
      const vals = data.map(d => d[f]).filter(v => v !== null);
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'N/D';
    };
    const treinos = data.filter(d => d.treinou).length;
    const nome    = document.getElementById('ci-patient-title')?.textContent.trim() || 'Paciente';
    const alerts  = Array.from(document.querySelectorAll('.aci-sa-item .aci-sa-item-label')).map(e => e.textContent.trim());
    const hoje    = new Date().toLocaleDateString('pt-BR');
    const period  = getPeriodDays();

    const texto = [
      `ACOMPANHAMENTO NUTRICIONAL — ${nome}`,
      `Período: últimos ${period} dias  |  Data: ${hoje}`,
      '─────────────────────────────────────',
      `• Energia média: ${avg('energia')}/5`,
      `• Humor médio: ${avg('humor')}/5`,
      `• Sono médio: ${avg('sono')}h`,
      `• Hidratação média: ${avg('agua')}L`,
      `• Treinos registrados: ${treinos}/${data.length} dias`,
      alerts.length ? `\nALERTAS:\n${alerts.map(a => `  ⚠ ${a}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(texto);
      showToast('Resumo copiado para área de transferência!', 'success', 3000);
    } catch (_) {
      const ta = Object.assign(document.createElement('textarea'), {
        value: texto, style: 'position:fixed;left:-9999px;top:0;',
      });
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast('Resumo copiado!', 'success', 3000); } catch (_e) {}
      document.body.removeChild(ta);
    }
  });
}

// ── V6-11. Modo compacto da tabela ────────────────────────────────────────
function v6ModoCompacto() {
  if (localStorage.getItem(_COMPACT_KEY) === '1') document.body.classList.add('aci-compact');
}
function toggleModoCompacto() {
  const on = document.body.classList.toggle('aci-compact');
  localStorage.setItem(_COMPACT_KEY, on ? '1' : '0');
  showToast(on ? 'Modo compacto ativado' : 'Modo normal restaurado', 'info', 2000);
}

// ── V6-12. Regressão linear — tendência do período ───────────────────────
function v6RegressaoLinear(data) {
  const defs = [
    { field: 'energia', label: 'Energia' },
    { field: 'humor',   label: 'Humor' },
    { field: 'sono',    label: 'Sono' },
  ];

  const trends = [];
  defs.forEach(({ field, label }) => {
    const pts = data
      .map((d, i) => d[field] !== null ? { x: i, y: d[field] } : null)
      .filter(Boolean);
    if (pts.length < 5) return;

    const n   = pts.length;
    const sx  = pts.reduce((s, p) => s + p.x, 0);
    const sy  = pts.reduce((s, p) => s + p.y, 0);
    const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
    const sx2 = pts.reduce((s, p) => s + p.x ** 2, 0);
    const den = n * sx2 - sx ** 2;
    if (!den) return;

    const slope = (n * sxy - sx * sy) / den;
    if (Math.abs(slope) < 0.02) return;
    // data[0] = mais recente → slope negativo = dados menores no passado = crescendo
    trends.push({ label, dir: slope < 0 ? 'crescendo' : 'caindo', rate: Math.abs(slope * 7).toFixed(1) });
  });

  if (!trends.length) return;

  const box = document.createElement('div');
  box.className = 'aci-regressao-insight';
  box.setAttribute('role', 'note');
  box.innerHTML = `
    <span class="aci-insight-icon" aria-hidden="true">📈</span>
    <div>
      <p class="aci-insight-label">Tendência linear do período</p>
      <p class="aci-insight-text">${trends.map(t =>
        `<strong>${t.label}</strong>: ${t.dir} ~${t.rate} pt/semana`
      ).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</p>
    </div>`;

  const ref = document.querySelector('.aci-insight-card');
  if (ref) ref.after(box);
  else document.getElementById('resumo-grid')?.closest('.section')?.after(box);
}

// ── V6-13. Highlight de células com valores extremos ─────────────────────
function v6HighlightCelulasExtremas(rows) {
  rows.forEach(row => {
    row.querySelectorAll('td').forEach((cell, i) => {
      if (![1, 2, 3, 4].includes(i)) return;
      const v = parseFloat(cell.textContent.trim());
      if (isNaN(v)) return;
      cell.classList.remove('aci-cell-top', 'aci-cell-low');
      if (v >= 4.5)      cell.classList.add('aci-cell-top');
      else if (v <= 1.5) cell.classList.add('aci-cell-low');
    });
  });
}

// ── V6-14. Navegação rápida por seções ───────────────────────────────────
function v6NavigacaoRapida() {
  if (document.querySelector('.aci-nav-rapida')) return;
  const nav = document.createElement('nav');
  nav.className = 'aci-nav-rapida';
  nav.setAttribute('aria-label', 'Navegação rápida por seções da página');

  [
    { href: '#smet-section',    label: 'Score' },
    { href: '#resumo-grid',     label: 'Resumo' },
    { href: '#intestino-grid',  label: 'Intestinal' },
    { href: '#tabela-checkins', label: 'Check-ins' },
    { href: '#tabela-diario',   label: 'Diário' },
  ].forEach(it => {
    const a = document.createElement('a');
    a.href = it.href;
    a.className = 'aci-nav-r-item';
    a.textContent = it.label;
    a.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector(it.href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    nav.appendChild(a);
  });

  document.getElementById('ci-main')?.prepend(nav);
}

// ── V6-15. Score por semana ───────────────────────────────────────────────
function v6ScorePorSemana(data) {
  if (data.length < 8) return;

  const weeks = [];
  for (let i = 0; i < data.length; i += 7) weeks.push(data.slice(i, i + 7));
  if (weeks.length < 2) return;

  const weekScore = wk => {
    const vals = wk.flatMap(d => [d.energia, d.humor].filter(v => v !== null));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const box = document.createElement('div');
  box.className = 'aci-score-semana';
  box.setAttribute('role', 'note');
  box.innerHTML = `
    <p class="aci-ss-title">Score por semana</p>
    <div class="aci-ss-grid">
      ${weeks.map((wk, i) => {
        const s = weekScore(wk);
        if (s === null) return '';
        const cls   = s >= 4 ? 'ss-ex' : s >= 2.5 ? 'ss-ok' : 'ss-poor';
        const wlbl  = i === 0 ? 'Atual' : `Sem. -${i}`;
        return `<div class="aci-ss-item ${cls}" title="${wlbl}: ${s.toFixed(1)}/5">
          <span class="aci-ss-val">${s.toFixed(1)}</span>
          <span class="aci-ss-week">${wlbl}</span>
        </div>`;
      }).join('')}
    </div>`;

  const ref = document.querySelector('.aci-comp-periodo');
  if (ref) ref.after(box);
  else document.getElementById('resumo-grid')?.closest('.section')?.after(box);
}

// ── V6-16. Novos atalhos de teclado (E, C, R) e patch no painel ──────────
function v6AtalhosPatch() {
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select, [contenteditable]')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case 'e': case 'E':
        document.querySelector('.aci-export-btn:not(.aci-print-btn-v6):not(.aci-prontuario-btn)')?.click();
        break;
      case 'c': case 'C':
        toggleModoCompacto();
        break;
      case 'r': case 'R':
        document.querySelector('.aci-prontuario-btn')?.click();
        break;
    }
  });

  // Adiciona novos atalhos no painel de atalhos existente
  const inject = () => {
    const body = document.querySelector('.aci-atalhos-body');
    if (!body) { setTimeout(inject, 600); return; }
    if (body.querySelector('[data-v6]')) return;
    [
      { key: 'E', desc: 'Exportar CSV' },
      { key: 'C', desc: 'Modo compacto' },
      { key: 'R', desc: 'Copiar resumo' },
    ].forEach(s => {
      const div = document.createElement('div');
      div.className = 'aci-atalho';
      div.dataset.v6 = '1';
      div.innerHTML = `<kbd>${s.key}</kbd><span>${s.desc}</span>`;
      body.appendChild(div);
    });
  };
  setTimeout(inject, 900);
}
