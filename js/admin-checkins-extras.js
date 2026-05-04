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
