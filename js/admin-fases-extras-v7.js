// ═══════════════════════════════════════════════════════════════════
// admin-fases-extras-v7.js — 20 melhorias UX clínicas (V7)
// Duplicar fase, export CSV/JSON, drag-drop, overlap, preview paciente,
// busca+filtros, modo dark, calc Mifflin, comparação, histórico, atalhos,
// validação clínica, templates+, sugestões, macros por estratégia,
// countdown ativo, print, copy URL, FAB ações rápidas.
// Padrão: IIFE sem módulos. Usa window._supabase / window._adminFasesExtrasCache.
// ═══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  /* ─── helpers ──────────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);
  const qs = (sel, ctx) => (ctx || document).querySelector(sel);
  const qsa = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const toast = (msg) => { if (window.showToast) window.showToast(msg); };
  const getPatientId = () => new URLSearchParams(location.search).get('patient') || new URLSearchParams(location.search).get('patient_id');
  const getPatientUserId = () => new URLSearchParams(location.search).get('user') || new URLSearchParams(location.search).get('user_id');
  const getPatientNome = () => decodeURIComponent(new URLSearchParams(location.search).get('nome') || '');
  const getCache = () => window._adminFasesExtrasCache || [];
  const HIST_KEY = 'adminFases_history_v7';

  /* ─────────────────────────────────────────────────────────────
     V7-1. Templates expandidos — Déficit Leve, Déficit Moderado,
           Ganho de Massa  (injetados na seção de templates existente)
  ────────────────────────────────────────────────────────────── */
  const EXTRA_TEMPLATES = {
    deficit_leve: {
      tipo: 'deficit_leve', foco: 'gordura', duracao: 6,
      nome: 'Fase — Déficit Leve',
      objetivo_clinico: 'Déficit calórico suave de 250 kcal para perda gradual e sustentável',
      descricao: 'Perda de peso conservadora (~0,25 kg/semana) com mínimo impacto no metabolismo e na massa muscular. Ideal para quem está próximo ao peso meta ou tem histórico de dietas restritivas.',
      dicas: 'Prefira alimentos volumosos e ricos em fibras\nFaça refeições menores e mais frequentes\nMantenha proteína alta para saciedade\nEvite comer na frente de telas',
      permitidos: 'Todos os grupos alimentares com moderação, cereais integrais, frutas, proteínas magras',
      restricoes: 'Bebidas açucaradas, ultraprocessados, frituras frequentes',
    },
    deficit_moderado: {
      tipo: 'deficit_moderado', foco: 'gordura', duracao: 8,
      nome: 'Fase — Déficit Moderado',
      objetivo_clinico: 'Déficit calórico de 500 kcal para perda eficiente preservando massa muscular',
      descricao: 'Ritmo de perda de ~0,5 kg/semana — considerado o padrão clínico ideal. Combina eficiência com preservação de massa magra quando aliado a alto teor proteico.',
      dicas: 'Proteína em todas as refeições (meta: 2g/kg)\nPrioritize alimentos de baixa densidade energética\nHidratação de 35ml/kg/dia\nTreino de força 3x/semana para preservar músculo',
      permitidos: 'Proteínas magras, vegetais, leguminosas, cereais integrais, frutas in natura',
      restricoes: 'Açúcar refinado, ultraprocessados, álcool, sucos industrializados',
    },
    ganho_massa: {
      tipo: 'ganho_massa', foco: 'massa_magra', duracao: 16,
      nome: 'Fase — Ganho de Massa',
      objetivo_clinico: 'Superávit calórico controlado de +300 kcal para ganho de massa muscular magra',
      descricao: 'Fase de hipertrofia com superávit calórico moderado para maximizar ganho muscular minimizando acúmulo de gordura. Requer treino de força consistente.',
      dicas: 'Priorize proteína em cada refeição (meta: 2g/kg)\nCafé da manhã rico em proteínas e carboidratos\nRefeição pré-treino: carboidratos + proteínas\nRefeição pós-treino: proteína de absorção rápida',
      permitidos: 'Todos os grupos com atenção especial a proteínas, carboidratos complexos, gorduras boas',
      restricoes: 'Excesso de gorduras saturadas, álcool (prejudica síntese proteica)',
    },
  };

  function injetarTemplatesExtras() {
    const grade = qs('#view-nova .section div[style*="grid-template-columns"]');
    if (!grade || grade.dataset.v7templates) return;
    grade.dataset.v7templates = '1';

    Object.entries(EXTRA_TEMPLATES).forEach(([key, t]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'v7-template-btn';
      btn.setAttribute('aria-label', `Aplicar template ${t.nome}`);
      btn.innerHTML = `
        <p class="v7-tpl-nome">${t.nome.replace('Fase — ', '')}</p>
        <p class="v7-tpl-desc">${t.duracao} semanas · ${
          key === 'deficit_leve' ? 'déficit de 250 kcal' :
          key === 'deficit_moderado' ? 'déficit de 500 kcal' :
          'superávit de +300 kcal'}</p>`;
      btn.addEventListener('click', () => aplicarTemplateV7(key, t));
      grade.appendChild(btn);
    });
  }

  function aplicarTemplateV7(key, t) {
    const set = (id, val) => { const el = $(id); if (el && val != null) el.value = val; };
    set('f-tipo',            t.tipo);
    set('f-foco',            t.foco);
    set('f-duracao',         t.duracao);
    set('f-nome',            t.nome);
    set('f-objetivo-clinico',t.objetivo_clinico);
    set('f-descricao',       t.descricao);
    set('f-dicas',           t.dicas);
    set('f-permitidos',      t.permitidos || '');
    set('f-restricoes',      t.restricoes || '');
    if (window.sugerirMacros) window.sugerirMacros();
    if (window.contarDicas)   window.contarDicas();
    toast('Template aplicado. Ajuste conforme necessário.');
  }

  /* ─────────────────────────────────────────────────────────────
     V7-2. Duplicar fase em 1 clique
  ────────────────────────────────────────────────────────────── */
  function patchDuplicarFase() {
    window.duplicarFase = async function (id) {
      const cache = getCache();
      const f = cache.find(x => x.id === id);
      if (!f) { toast('Fase não encontrada.'); return; }

      const sb = window._supabase;
      if (!sb) { toast('Sem conexão com banco.'); return; }

      const { id: _id, created_at, updated_at, ...dados } = f;
      const copia = {
        ...dados,
        nome: `${dados.nome} (cópia)`,
        status: 'pendente',
        ordem: (cache.length + 1),
        data_inicio: null,
        data_fim: null,
      };

      const { error } = await sb.from('fases').insert(copia);
      if (error) { toast('Erro ao duplicar fase.'); return; }

      _registrarHistorico(id, 'duplicada', { copia: copia.nome });
      toast(`Fase "${copia.nome}" criada.`);
      if (window.showView) window.showView('lista');
    };
  }

  /* ─────────────────────────────────────────────────────────────
     V7-3. Export CSV de todas as fases
  ────────────────────────────────────────────────────────────── */
  function exportCSV() {
    const cache = getCache();
    if (!cache.length) { toast('Nenhuma fase para exportar.'); return; }

    const COLS = ['nome','status','tipo','ordem','duracao_semanas','data_inicio','data_fim',
                  'calorias_alvo','proteina_alvo','carboidrato_alvo','gordura_alvo',
                  'objetivo','objetivo_clinico','meta_peso_diff'];
    const esc = (v) => {
      if (v == null) return '';
      const s = String(Array.isArray(v) ? v.join('; ') : v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g,'""')}"` : s;
    };

    const rows = [COLS.join(',')];
    cache.forEach(f => rows.push(COLS.map(c => esc(f[c])).join(',')));

    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `fases-${getPatientNome().replace(/\s+/g,'-').toLowerCase() || 'plano'}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exportado.');
  }

  /* ─────────────────────────────────────────────────────────────
     V7-4. Export / Import JSON de fase
  ────────────────────────────────────────────────────────────── */
  function exportFaseJSON(id) {
    const cache = getCache();
    const f = cache.find(x => x.id === id);
    if (!f) { toast('Fase não encontrada.'); return; }

    const { id: _id, patient_id, user_id, created_at, updated_at, ...exportable } = f;
    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fase-${(f.nome || 'fase').replace(/\s+/g,'-').toLowerCase()}.json`;
    a.click();
    toast('JSON da fase exportado.');
  }

  function abrirImportJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const dados = JSON.parse(text);
        _preencherFormComJSON(dados);
        if (window.showView) window.showView('nova');
        toast('Fase importada — revise e salve.');
      } catch {
        toast('Arquivo JSON inválido.');
      }
    });
    input.click();
  }

  function _preencherFormComJSON(f) {
    const set = (id, val) => { const el = $(id); if (el && val != null) el.value = Array.isArray(val) ? val.join(f.dicas === val ? '\n' : ', ') : val; };
    set('f-nome',            f.nome);
    set('f-status',          f.status);
    set('f-tipo',            f.tipo);
    set('f-ordem',           f.ordem);
    set('f-duracao',         f.duracao_semanas);
    set('f-inicio',          f.data_inicio);
    set('f-fim',             f.data_fim);
    set('f-objetivo',        f.objetivo);
    set('f-objetivo-clinico',f.objetivo_clinico);
    set('f-descricao',       f.descricao);
    set('f-calorias',        f.calorias_alvo);
    set('f-proteina',        f.proteina_alvo);
    set('f-carboidrato',     f.carboidrato_alvo);
    set('f-gordura',         f.gordura_alvo);
    if (Array.isArray(f.dicas))      { const el = $('f-dicas');      if (el) el.value = f.dicas.join('\n'); }
    if (Array.isArray(f.restricoes)) { const el = $('f-restricoes'); if (el) el.value = f.restricoes.join(', '); }
    if (Array.isArray(f.permitidos)) { const el = $('f-permitidos'); if (el) el.value = f.permitidos.join(', '); }
    if (window.calcularProporcaoMacros) window.calcularProporcaoMacros();
    if (window.contarDicas) window.contarDicas();
  }

  /* ─────────────────────────────────────────────────────────────
     V7-5. Drag-drop para reordenar fases
  ────────────────────────────────────────────────────────────── */
  let _dragId = null;

  function initDragDrop() {
    const wrapper = $('fases-lista-wrapper');
    if (!wrapper) return;

    wrapper.addEventListener('dragstart', (e) => {
      const card = e.target.closest('[data-fase-id]');
      if (!card) return;
      _dragId = card.dataset.faseId;
      card.classList.add('v7-dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    wrapper.addEventListener('dragend', (e) => {
      const card = e.target.closest('[data-fase-id]');
      if (card) card.classList.remove('v7-dragging');
      qsa('.v7-drag-over', wrapper).forEach(el => el.classList.remove('v7-drag-over'));
    });

    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      const card = e.target.closest('[data-fase-id]');
      if (!card || card.dataset.faseId === _dragId) return;
      qsa('.v7-drag-over', wrapper).forEach(el => el.classList.remove('v7-drag-over'));
      card.classList.add('v7-drag-over');
    });

    wrapper.addEventListener('drop', async (e) => {
      e.preventDefault();
      const target = e.target.closest('[data-fase-id]');
      if (!target || !_dragId || target.dataset.faseId === _dragId) return;

      const cache = getCache();
      const dragIdx  = cache.findIndex(f => f.id === _dragId);
      const dropIdx  = cache.findIndex(f => f.id === target.dataset.faseId);
      if (dragIdx < 0 || dropIdx < 0) return;

      // Reordena array
      const [moved] = cache.splice(dragIdx, 1);
      cache.splice(dropIdx, 0, moved);
      cache.forEach((f, i) => f.ordem = i + 1);
      window._adminFasesExtrasCache = cache;

      // Persiste ordem no Supabase
      const sb = window._supabase;
      if (sb) {
        await Promise.all(cache.map(f =>
          sb.from('fases').update({ ordem: f.ordem }).eq('id', f.id)
        ));
      }
      toast('Ordem das fases atualizada.');
      if (window.showView) window.showView('lista');
    });
  }

  function habilitarDragNosCards() {
    qsa('[data-fase-id]').forEach(card => {
      card.setAttribute('draggable', 'true');
      card.setAttribute('aria-grabbed', 'false');
    });
  }

  /* ─────────────────────────────────────────────────────────────
     V7-6. Validação de overlap de datas
  ────────────────────────────────────────────────────────────── */
  function validarOverlapDatas() {
    const inicioVal = $('f-inicio')?.value;
    const fimVal    = $('f-fim')?.value;
    if (!inicioVal || !fimVal) { _limparOverlapAlert(); return; }

    const inicio = new Date(inicioVal);
    const fim    = new Date(fimVal);
    const faseId = $('fase-id')?.value;
    const cache  = getCache();

    const overlap = cache.find(f => {
      if (f.id === faseId) return false;
      if (!f.data_inicio || !f.data_fim) return false;
      const fi = new Date(f.data_inicio);
      const ff = new Date(f.data_fim);
      return inicio <= ff && fim >= fi;
    });

    let alerta = $('v7-overlap-alert');
    if (!alerta) {
      alerta = document.createElement('p');
      alerta.id = 'v7-overlap-alert';
      alerta.className = 'v7-overlap-alert';
      alerta.setAttribute('role', 'alert');
      const fimGroup = $('f-fim')?.closest('.form-group');
      if (fimGroup) fimGroup.after(alerta);
    }

    if (overlap) {
      alerta.innerHTML = `<span aria-hidden="true">⚠</span> Período sobrepõe a fase <strong>"${overlap.nome}"</strong> (${overlap.data_inicio} → ${overlap.data_fim}). Revise as datas.`;
      alerta.style.display = '';
    } else {
      alerta.style.display = 'none';
    }
  }

  function _limparOverlapAlert() {
    const el = $('v7-overlap-alert');
    if (el) el.style.display = 'none';
  }

  /* ─────────────────────────────────────────────────────────────
     V7-7. Preview da perspectiva da paciente
  ────────────────────────────────────────────────────────────── */
  function abrirPreviewPaciente(id) {
    const cache = getCache();
    const f = id ? cache.find(x => x.id === id) : _faseDoFormulario();
    if (!f) { toast('Nenhuma fase selecionada.'); return; }

    let modal = $('v7-preview-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'v7-preview-modal';
      modal.className = 'v7-modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'v7-preview-title');
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
      modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.style.display = 'none'; });
    }

    const dicas = Array.isArray(f.dicas) ? f.dicas : (f.dicas || '').split('\n').filter(Boolean);
    const ptn = f.proteina_alvo ? `${f.proteina_alvo}g Prot` : '';
    const cho = f.carboidrato_alvo ? `${f.carboidrato_alvo}g Carb` : '';
    const lip = f.gordura_alvo ? `${f.gordura_alvo}g Gord` : '';
    const macros = [ptn, cho, lip].filter(Boolean).join(' · ');

    modal.innerHTML = `
      <div class="v7-modal-box" style="max-width:460px;">
        <div class="v7-modal-header">
          <div>
            <p class="v7-modal-eyebrow">Visualização da paciente</p>
            <p class="v7-modal-title" id="v7-preview-title">${f.nome || 'Fase'}</p>
          </div>
          <button class="v7-modal-close" aria-label="Fechar" onclick="$('v7-preview-modal').style.display='none'">×</button>
        </div>
        <div class="v7-modal-body">
          <div class="v7-preview-phase-card">
            <div class="v7-preview-badge">${_statusLabel(f.status)}</div>
            <h3 class="v7-preview-phase-name">${f.nome || '—'}</h3>
            ${f.objetivo ? `<p class="v7-preview-objetivo">${f.objetivo}</p>` : ''}
            ${f.descricao ? `<p class="v7-preview-desc">${f.descricao}</p>` : ''}
            ${f.duracao_semanas ? `<p class="v7-preview-meta"><strong>Duração:</strong> ${f.duracao_semanas} semanas</p>` : ''}
            ${f.calorias_alvo ? `<p class="v7-preview-meta"><strong>Meta calórica:</strong> ${f.calorias_alvo} kcal${macros ? ' · ' + macros : ''}</p>` : ''}
            ${dicas.length ? `
              <div class="v7-preview-dicas">
                <p class="v7-preview-dicas-titulo">Dicas desta fase</p>
                <ul class="v7-preview-dicas-list">
                  ${dicas.slice(0,5).map(d => `<li>${d}</li>`).join('')}
                </ul>
              </div>` : ''}
          </div>
          <p class="v7-preview-note">Esta é uma representação aproximada de como a fase aparece para a paciente no app.</p>
        </div>
      </div>`;

    modal.style.display = 'flex';
    modal.querySelector('.v7-modal-close')?.focus();
  }

  function _statusLabel(st) {
    const map = { ativa:'Em andamento', concluida:'Concluída', pendente:'Em breve', pausada:'Pausada', planejada:'Planejada' };
    return map[st] || 'Planejada';
  }

  function _faseDoFormulario() {
    const v = (id) => $(id)?.value?.trim() || null;
    return {
      nome: v('f-nome'), status: v('f-status'), objetivo: v('f-objetivo'),
      descricao: v('f-descricao'), dicas: v('f-dicas'),
      duracao_semanas: v('f-duracao'), calorias_alvo: v('f-calorias'),
      proteina_alvo: v('f-proteina'), carboidrato_alvo: v('f-carboidrato'),
      gordura_alvo: v('f-gordura'),
    };
  }

  /* ─────────────────────────────────────────────────────────────
     V7-8. Busca e filtros na lista de fases
  ────────────────────────────────────────────────────────────── */
  function injetarBarraBusca() {
    const secTitle = qs('#view-lista .section-title');
    if (!secTitle || $('v7-busca-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'v7-busca-bar';
    bar.className = 'v7-busca-bar';
    bar.setAttribute('role', 'search');
    bar.innerHTML = `
      <div class="v7-busca-input-wrap">
        <svg class="v7-busca-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="v7-busca-input" class="v7-busca-input" type="search" placeholder="Buscar fase..." aria-label="Buscar fase por nome ou objetivo">
      </div>
      <select id="v7-filtro-status" class="v7-filtro-select" aria-label="Filtrar por status">
        <option value="">Todos os status</option>
        <option value="ativa">Ativa</option>
        <option value="pendente">Em breve</option>
        <option value="concluida">Concluída</option>
        <option value="pausada">Pausada</option>
      </select>`;

    const secHeader = secTitle.closest('.section')?.querySelector('[style*="justify-content:space-between"]');
    if (secHeader) {
      secHeader.parentNode.insertBefore(bar, secHeader.nextSibling);
    } else {
      secTitle.after(bar);
    }

    bar.addEventListener('input', _filtrarFases);
    bar.addEventListener('change', _filtrarFases);
  }

  function _filtrarFases() {
    const q      = ($('v7-busca-input')?.value || '').toLowerCase();
    const status = $('v7-filtro-status')?.value || '';
    const cards  = qsa('[data-fase-id]');

    let visiveis = 0;
    cards.forEach(card => {
      const nome = (card.dataset.faseNome || '').toLowerCase();
      const st   = card.dataset.faseStatus || '';
      const show = (!q || nome.includes(q)) && (!status || st === status);
      card.style.display = show ? '' : 'none';
      if (show) visiveis++;
    });

    let empty = $('v7-busca-empty');
    if (!empty) {
      empty = document.createElement('p');
      empty.id = 'v7-busca-empty';
      empty.className = 'v7-busca-empty';
      empty.setAttribute('role', 'status');
      empty.setAttribute('aria-live', 'polite');
      $('fases-lista-wrapper')?.appendChild(empty);
    }
    empty.textContent = visiveis === 0 && (q || status) ? 'Nenhuma fase encontrada.' : '';
  }

  /* ─────────────────────────────────────────────────────────────
     V7-9. Toggle modo dark
  ────────────────────────────────────────────────────────────── */
  const DARK_KEY = 'adminFases_darkMode_v7';

  function initDarkMode() {
    const saved = localStorage.getItem(DARK_KEY);
    if (saved === '1') document.body.classList.add('v7-dark');

    const btn = document.createElement('button');
    btn.id = 'v7-dark-toggle';
    btn.className = 'v7-dark-toggle';
    btn.setAttribute('aria-label', 'Alternar modo escuro');
    btn.setAttribute('aria-pressed', saved === '1' ? 'true' : 'false');
    btn.title = 'Modo escuro';
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

    btn.addEventListener('click', () => {
      const on = document.body.classList.toggle('v7-dark');
      localStorage.setItem(DARK_KEY, on ? '1' : '0');
      btn.setAttribute('aria-pressed', String(on));
    });

    const header = qs('.mobile-header') || qs('.sidebar-brand');
    if (header) header.appendChild(btn);
  }

  /* ─────────────────────────────────────────────────────────────
     V7-10. Calculadora TMB Mifflin-St Jeor inline
  ────────────────────────────────────────────────────────────── */
  function injetarCalcTMB() {
    if ($('v7-tmb-widget')) return;

    const nutSection = qs('#view-nova .section:has(#f-calorias)') ||
                       qs('#view-nova [id*="nutricion"]') ||
                       $('f-calorias')?.closest('.section');
    if (!nutSection) return;

    const widget = document.createElement('div');
    widget.id = 'v7-tmb-widget';
    widget.className = 'v7-tmb-widget';
    widget.setAttribute('role', 'region');
    widget.setAttribute('aria-label', 'Calculadora de TMB Mifflin-St Jeor');
    widget.innerHTML = `
      <div class="v7-tmb-header" id="v7-tmb-toggle-btn" role="button" tabindex="0"
           aria-expanded="false" aria-controls="v7-tmb-body">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>
        <span>Calculadora TMB — Mifflin-St Jeor</span>
        <svg class="v7-tmb-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div id="v7-tmb-body" class="v7-tmb-body" hidden>
        <div class="v7-tmb-grid">
          <div class="v7-tmb-field">
            <label for="v7-tmb-peso" class="v7-tmb-label">Peso (kg)</label>
            <input id="v7-tmb-peso" class="v7-tmb-input" type="number" step="0.1" placeholder="ex: 72.5" aria-label="Peso em quilogramas">
          </div>
          <div class="v7-tmb-field">
            <label for="v7-tmb-altura" class="v7-tmb-label">Altura (cm)</label>
            <input id="v7-tmb-altura" class="v7-tmb-input" type="number" placeholder="ex: 165" aria-label="Altura em centímetros">
          </div>
          <div class="v7-tmb-field">
            <label for="v7-tmb-idade" class="v7-tmb-label">Idade (anos)</label>
            <input id="v7-tmb-idade" class="v7-tmb-input" type="number" placeholder="ex: 32" aria-label="Idade em anos">
          </div>
          <div class="v7-tmb-field">
            <label for="v7-tmb-sexo" class="v7-tmb-label">Sexo</label>
            <select id="v7-tmb-sexo" class="v7-tmb-input" aria-label="Sexo biológico">
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </div>
          <div class="v7-tmb-field" style="grid-column:1/-1;">
            <label for="v7-tmb-atividade" class="v7-tmb-label">Fator de atividade</label>
            <select id="v7-tmb-atividade" class="v7-tmb-input" aria-label="Nível de atividade física">
              <option value="1.2">Sedentário (sem exercício)</option>
              <option value="1.375">Leve (1–2x/sem)</option>
              <option value="1.55" selected>Moderado (3–4x/sem)</option>
              <option value="1.725">Intenso (5–6x/sem)</option>
              <option value="1.9">Muito intenso (2x/dia)</option>
            </select>
          </div>
        </div>
        <div class="v7-tmb-actions">
          <button type="button" id="v7-tmb-calc-btn" class="v7-tmb-calc-btn">Calcular TMB/GET</button>
          <p id="v7-tmb-resultado" class="v7-tmb-resultado" aria-live="polite"></p>
        </div>
        <div id="v7-tmb-apply-bar" class="v7-tmb-apply-bar" hidden>
          <button type="button" id="v7-tmb-apply-btn" class="v7-tmb-apply-btn">
            Usar GET no campo de calorias
          </button>
        </div>
      </div>`;

    nutSection.prepend(widget);

    // Toggle accordion
    const toggleBtn = $('v7-tmb-toggle-btn');
    const body = $('v7-tmb-body');
    toggleBtn.addEventListener('click', () => {
      const open = body.hidden;
      body.hidden = !open;
      toggleBtn.setAttribute('aria-expanded', String(open));
    });
    toggleBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleBtn.click(); }
    });

    // Calcular
    $('v7-tmb-calc-btn').addEventListener('click', () => {
      const peso    = parseFloat($('v7-tmb-peso')?.value);
      const altura  = parseFloat($('v7-tmb-altura')?.value);
      const idade   = parseFloat($('v7-tmb-idade')?.value);
      const sexo    = $('v7-tmb-sexo')?.value;
      const fator   = parseFloat($('v7-tmb-atividade')?.value);

      if (!peso || !altura || !idade) {
        $('v7-tmb-resultado').textContent = 'Preencha peso, altura e idade.';
        return;
      }

      // Mifflin-St Jeor: ♀ (10×P + 6.25×H - 5×I - 161) / ♂ (10×P + 6.25×H - 5×I + 5)
      const tmb = Math.round(10 * peso + 6.25 * altura - 5 * idade + (sexo === 'M' ? 5 : -161));
      const get = Math.round(tmb * fator);
      _v7_tmbCalc = { tmb, get };

      $('v7-tmb-resultado').innerHTML =
        `<strong>TMB:</strong> ${tmb} kcal &nbsp;|&nbsp; <strong>GET:</strong> ${get} kcal`;
      $('v7-tmb-apply-bar').hidden = false;

      localStorage.setItem('pac_tmb', String(tmb));
    });

    // Aplicar GET no campo
    $('v7-tmb-apply-btn').addEventListener('click', () => {
      if (!_v7_tmbCalc) return;
      const el = $('f-calorias');
      if (el) { el.value = _v7_tmbCalc.get; if (window.calcularProporcaoMacros) window.calcularProporcaoMacros(); }
      toast(`GET ${_v7_tmbCalc.get} kcal aplicado.`);
    });
  }

  let _v7_tmbCalc = null;

  /* ─────────────────────────────────────────────────────────────
     V7-11. Comparação entre fases (lado a lado)
  ────────────────────────────────────────────────────────────── */
  function abrirComparacaoFases() {
    const cache = getCache();
    if (cache.length < 2) { toast('Precisa de pelo menos 2 fases para comparar.'); return; }

    let modal = $('v7-comp-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'v7-comp-modal';
      modal.className = 'v7-modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'v7-comp-title');
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
      modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.style.display = 'none'; });
    }

    const opcoes = cache.map(f =>
      `<option value="${f.id}">${f.nome || 'Fase ' + f.ordem}</option>`
    ).join('');

    modal.innerHTML = `
      <div class="v7-modal-box v7-comp-box">
        <div class="v7-modal-header">
          <p class="v7-modal-title" id="v7-comp-title">Comparar Fases</p>
          <button class="v7-modal-close" aria-label="Fechar" onclick="document.getElementById('v7-comp-modal').style.display='none'">×</button>
        </div>
        <div class="v7-modal-body">
          <div class="v7-comp-selects">
            <select id="v7-comp-a" class="v7-filtro-select" aria-label="Fase A">${opcoes}</select>
            <select id="v7-comp-b" class="v7-filtro-select" aria-label="Fase B">${opcoes.replace('value="' + cache[0].id + '"', 'value="' + cache[0].id + '" ').replace(
              cache.length > 1 ? `value="${cache[1].id}"` : '', `value="${cache[1] ? cache[1].id : cache[0].id}"`
            )}</select>
            <button type="button" class="v7-tmb-calc-btn" onclick="_v7CompararFases()">Comparar</button>
          </div>
          <div id="v7-comp-table" class="v7-comp-table" aria-live="polite"></div>
        </div>
      </div>`;

    // Fix: set second select to second option
    modal.style.display = 'flex';
    const selB = $('v7-comp-b');
    if (selB && cache.length > 1) selB.value = cache[1].id;
    window._v7CompararFases = _v7CompararFases;
    _v7CompararFases();
  }

  function _v7CompararFases() {
    const cache = getCache();
    const idA = $('v7-comp-a')?.value;
    const idB = $('v7-comp-b')?.value;
    const fA = cache.find(f => f.id === idA);
    const fB = cache.find(f => f.id === idB);
    const table = $('v7-comp-table');
    if (!fA || !fB || !table) return;

    const rows = [
      ['Campo', fA.nome || 'Fase A', fB.nome || 'Fase B'],
      ['Status', _statusLabel(fA.status), _statusLabel(fB.status)],
      ['Duração', `${fA.duracao_semanas || '—'} sem`, `${fB.duracao_semanas || '—'} sem`],
      ['Calorias', `${fA.calorias_alvo || '—'} kcal`, `${fB.calorias_alvo || '—'} kcal`],
      ['Proteína', `${fA.proteina_alvo || '—'} g`, `${fB.proteina_alvo || '—'} g`],
      ['Carboidrato', `${fA.carboidrato_alvo || '—'} g`, `${fB.carboidrato_alvo || '—'} g`],
      ['Gordura', `${fA.gordura_alvo || '—'} g`, `${fB.gordura_alvo || '—'} g`],
      ['Meta peso', `${fA.meta_peso_diff ? fA.meta_peso_diff + ' kg' : '—'}`, `${fB.meta_peso_diff ? fB.meta_peso_diff + ' kg' : '—'}`],
    ];

    const _hl = (a, b, idx) => {
      const na = parseFloat(a); const nb = parseFloat(b);
      if (isNaN(na) || isNaN(nb) || na === nb) return ['', ''];
      const higher = na > nb;
      const colors = {3:['v7-hi','v7-lo'], 4:['v7-hi','v7-lo'], 5:['v7-hi','v7-lo'], 6:['v7-lo','v7-hi']};
      return colors[idx] ? (higher ? colors[idx] : [colors[idx][1], colors[idx][0]]) : ['',''];
    };

    table.innerHTML = `<table class="v7-comp-tbl" role="table">
      <thead><tr>${rows[0].map((c,i) => `<th scope="${i===0?'col':'col'}" class="${i===0?'v7-comp-label':''}">${c}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.slice(1).map((r,ri) => {
          const [clA, clB] = _hl(r[1], r[2], ri + 1);
          return `<tr>
            <td class="v7-comp-label">${r[0]}</td>
            <td class="${clA}">${r[1]}</td>
            <td class="${clB}">${r[2]}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }

  /* ─────────────────────────────────────────────────────────────
     V7-12. Histórico de mudanças (localStorage)
  ────────────────────────────────────────────────────────────── */
  function _registrarHistorico(faseId, acao, extras) {
    try {
      const hist = JSON.parse(localStorage.getItem(HIST_KEY) || '{}');
      if (!hist[faseId]) hist[faseId] = [];
      hist[faseId].unshift({ acao, ts: new Date().toISOString(), ...extras });
      hist[faseId] = hist[faseId].slice(0, 20);
      localStorage.setItem(HIST_KEY, JSON.stringify(hist));
    } catch (_) {}
  }

  function abrirHistoricoFase(id) {
    try {
      const hist = JSON.parse(localStorage.getItem(HIST_KEY) || '{}');
      const registros = hist[id] || [];

      let modal = $('v7-hist-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'v7-hist-modal';
        modal.className = 'v7-modal-backdrop';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'v7-hist-title');
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
        modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.style.display = 'none'; });
      }

      const cache = getCache();
      const f = cache.find(x => x.id === id);
      const nome = f?.nome || 'Fase';

      modal.innerHTML = `
        <div class="v7-modal-box">
          <div class="v7-modal-header">
            <div>
              <p class="v7-modal-eyebrow">Histórico</p>
              <p class="v7-modal-title" id="v7-hist-title">${nome}</p>
            </div>
            <button class="v7-modal-close" aria-label="Fechar" onclick="document.getElementById('v7-hist-modal').style.display='none'">×</button>
          </div>
          <div class="v7-modal-body">
            ${registros.length === 0
              ? '<p class="v7-hist-empty">Nenhum registro de alteração ainda.</p>'
              : `<ul class="v7-hist-list" role="list">
                  ${registros.map(r => `
                    <li class="v7-hist-item" role="listitem">
                      <span class="v7-hist-acao">${r.acao}</span>
                      <span class="v7-hist-ts">${new Date(r.ts).toLocaleString('pt-BR')}</span>
                    </li>`).join('')}
                </ul>`}
          </div>
        </div>`;
      modal.style.display = 'flex';
    } catch (_) { toast('Erro ao carregar histórico.'); }
  }

  // Hook no form submit para registrar histórico
  function patchSubmitHistorico() {
    const form = $('fase-form');
    if (!form || form.dataset.v7hist) return;
    form.dataset.v7hist = '1';
    form.addEventListener('submit', () => {
      const id = $('fase-id')?.value;
      const nome = $('f-nome')?.value;
      if (id) _registrarHistorico(id, 'editada', { nome });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     V7-13. Atalhos de teclado N=nova, D=duplicar, Esc=lista
  ────────────────────────────────────────────────────────────── */
  function initAtalhosTeclado() {
    if (window._v7atalhos) return;
    window._v7atalhos = true;

    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName?.toUpperCase();
      if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (window.showView) window.showView('nova');
        toast('Nova fase (atalho N)');
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        if (window.showView) window.showView('lista');
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        exportCSV();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        imprimirPlano();
      }
    });

    // Mostra dica de atalhos na primeira visita
    if (!localStorage.getItem('v7_atalhos_shown')) {
      setTimeout(() => {
        toast('Atalhos: N=nova fase · L=lista · E=exportar CSV · P=imprimir');
        localStorage.setItem('v7_atalhos_shown', '1');
      }, 2500);
    }
  }

  /* ─────────────────────────────────────────────────────────────
     V7-14. Validação clínica de calorias muito baixas
  ────────────────────────────────────────────────────────────── */
  const KCAL_MINIMO_MULHER = 1200;
  const KCAL_MINIMO_HOMEM  = 1500;

  function validarCaloriasClinicamente() {
    const kcal = parseFloat($('f-calorias')?.value);
    let aviso = $('v7-kcal-clinico-alert');

    if (!aviso) {
      aviso = document.createElement('p');
      aviso.id = 'v7-kcal-clinico-alert';
      aviso.className = 'v7-kcal-alert';
      aviso.setAttribute('role', 'alert');
      $('f-calorias')?.closest('.form-group')?.after(aviso);
    }

    if (kcal > 0 && kcal < KCAL_MINIMO_MULHER) {
      aviso.innerHTML = `<span aria-hidden="true">⚠</span> ${kcal} kcal está abaixo do mínimo seguro para mulheres (${KCAL_MINIMO_MULHER} kcal). Isso pode causar deficiências nutricionais. Revise com a paciente.`;
      aviso.style.display = '';
    } else if (kcal > 5000) {
      aviso.innerHTML = `<span aria-hidden="true">⚠</span> ${kcal} kcal é muito elevado. Verifique se o valor está correto.`;
      aviso.style.display = '';
    } else {
      aviso.style.display = 'none';
    }
  }

  /* ─────────────────────────────────────────────────────────────
     V7-15. Sugestões contextuais nos campos do formulário
  ────────────────────────────────────────────────────────────── */
  const SUGESTOES = {
    'f-objetivo-clinico': [
      'Déficit de 500 kcal preservando massa muscular',
      'Manutenção calórica com alto teor proteico',
      'Superávit de 300 kcal para ganho de massa magra',
      'Redução de inflamação e melhora da composição corporal',
    ],
    'f-objetivo': [
      'Perder gordura sem perder energia no dia a dia',
      'Criar hábitos alimentares saudáveis e duradouros',
      'Ganhar músculo com alimentação estratégica',
      'Manter o peso conquistado com equilíbrio',
    ],
  };

  function initSugestoesContextuais() {
    Object.entries(SUGESTOES).forEach(([fieldId, sugestoes]) => {
      const el = $(fieldId);
      if (!el || el.dataset.v7sug) return;
      el.dataset.v7sug = '1';

      const list = document.createElement('div');
      list.className = 'v7-sugestoes';
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', `Sugestões para ${fieldId}`);
      list.innerHTML = sugestoes.map(s =>
        `<div class="v7-sugestao-item" role="option" tabindex="0" aria-selected="false">${s}</div>`
      ).join('');
      el.after(list);

      list.querySelectorAll('.v7-sugestao-item').forEach(item => {
        const aplicar = () => {
          el.value = item.textContent;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          list.classList.remove('v7-sugestoes-visible');
        };
        item.addEventListener('click', aplicar);
        item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aplicar(); } });
      });

      el.addEventListener('focus', () => {
        if (!el.value) list.classList.add('v7-sugestoes-visible');
      });
      el.addEventListener('blur', () => {
        setTimeout(() => list.classList.remove('v7-sugestoes-visible'), 200);
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     V7-16. Distribuição automática de macros por estratégia
  ────────────────────────────────────────────────────────────── */
  const ESTRATEGIAS_MACROS = {
    'Alto Proteico': { ptn: 0.35, cho: 0.40, lip: 0.25 },
    'Balanceado':    { ptn: 0.28, cho: 0.45, lip: 0.27 },
    'Low Carb':      { ptn: 0.30, cho: 0.25, lip: 0.45 },
    'Cetogênico':    { ptn: 0.25, cho: 0.05, lip: 0.70 },
    'Zone (40/30/30)': { ptn: 0.30, cho: 0.40, lip: 0.30 },
  };

  function injetarEstrategiasMacros() {
    if ($('v7-estrategias-macros')) return;
    const propSection = $('proporcao-macros') || $('f-calorias')?.closest('.form-group');
    if (!propSection) return;

    const container = document.createElement('div');
    container.id = 'v7-estrategias-macros';
    container.className = 'v7-estrategias';
    container.innerHTML = `
      <p class="v7-estrategias-label">Distribuir por estratégia:</p>
      <div class="v7-estrategias-btns" role="group" aria-label="Estratégias de distribuição de macros">
        ${Object.keys(ESTRATEGIAS_MACROS).map(k =>
          `<button type="button" class="v7-estrategia-btn" data-estrategia="${k}" aria-label="Aplicar estratégia ${k}">${k}</button>`
        ).join('')}
      </div>`;

    propSection.parentNode?.insertBefore(container, propSection.nextSibling);

    container.querySelectorAll('.v7-estrategia-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.estrategia;
        const est = ESTRATEGIAS_MACROS[key];
        const kcal = parseFloat($('f-calorias')?.value);
        if (!kcal) { toast('Preencha as calorias primeiro.'); return; }

        const ptn = Math.round(kcal * est.ptn / 4);
        const cho = Math.round(kcal * est.cho / 4);
        const lip = Math.round(kcal * est.lip / 9);

        if ($('f-proteina')) $('f-proteina').value = ptn;
        if ($('f-carboidrato')) $('f-carboidrato').value = cho;
        if ($('f-gordura')) $('f-gordura').value = lip;

        if (window.calcularProporcaoMacros) window.calcularProporcaoMacros();
        toast(`Estratégia "${key}" aplicada.`);

        container.querySelectorAll('.v7-estrategia-btn').forEach(b => b.classList.remove('v7-estrategia-ativa'));
        btn.classList.add('v7-estrategia-ativa');
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     V7-17. Countdown dinâmico da fase ativa
  ────────────────────────────────────────────────────────────── */
  function iniciarCountdownAtivo() {
    if (window._v7countdownTimer) return;
    window._v7countdownTimer = setInterval(_atualizarCountdown, 60000);
    _atualizarCountdown();
  }

  function _atualizarCountdown() {
    const el = $('v7-countdown');
    if (!el) return;

    const cache = getCache();
    const ativa = cache.find(f => f.status === 'ativa' && f.data_fim);
    if (!ativa) {
      el.textContent = 'Nenhuma fase ativa.';
      return;
    }

    const hoje = new Date();
    const fim  = new Date(ativa.data_fim);
    const diff = Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      el.textContent = `"${ativa.nome}" — encerrada há ${Math.abs(diff)} dias`;
      el.className = 'v7-countdown v7-countdown-vencida';
    } else if (diff === 0) {
      el.textContent = `"${ativa.nome}" — termina hoje!`;
      el.className = 'v7-countdown v7-countdown-urgente';
    } else if (diff <= 7) {
      el.textContent = `"${ativa.nome}" — ${diff} dia${diff > 1 ? 's' : ''} restante${diff > 1 ? 's' : ''}`;
      el.className = 'v7-countdown v7-countdown-urgente';
    } else {
      el.textContent = `"${ativa.nome}" — ${diff} dias restantes`;
      el.className = 'v7-countdown v7-countdown-ok';
    }
  }

  function injetarCountdownWidget() {
    if ($('v7-countdown')) return;
    const kpisEl = $('kpis-fases');
    if (!kpisEl) return;

    const wrap = document.createElement('div');
    wrap.className = 'v7-countdown-wrap';
    wrap.innerHTML = `<p id="v7-countdown" class="v7-countdown" aria-live="polite" aria-label="Tempo restante da fase ativa">—</p>`;
    kpisEl.after(wrap);

    _atualizarCountdown();
  }

  /* ─────────────────────────────────────────────────────────────
     V7-18. Imprimir plano de fases
  ────────────────────────────────────────────────────────────── */
  function imprimirPlano() {
    window.print();
  }

  /* ─────────────────────────────────────────────────────────────
     V7-19. Copiar URL com paciente
  ────────────────────────────────────────────────────────────── */
  function copiarURL() {
    const url = location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => toast('URL copiada para a área de transferência.'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      ta.remove(); toast('URL copiada.');
    }
  }

  /* ─────────────────────────────────────────────────────────────
     V7-20. FAB — Floating Action Button de ações rápidas
  ────────────────────────────────────────────────────────────── */
  function injetarFAB() {
    if ($('v7-fab')) return;

    const fab = document.createElement('div');
    fab.id = 'v7-fab';
    fab.className = 'v7-fab';
    fab.setAttribute('role', 'group');
    fab.setAttribute('aria-label', 'Ações rápidas');
    fab.innerHTML = `
      <div id="v7-fab-menu" class="v7-fab-menu" hidden role="menu">
        <button class="v7-fab-item" role="menuitem" aria-label="Nova fase" data-action="nova">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova fase
        </button>
        <button class="v7-fab-item" role="menuitem" aria-label="Exportar CSV" data-action="csv">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar CSV
        </button>
        <button class="v7-fab-item" role="menuitem" aria-label="Comparar fases" data-action="comparar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          Comparar fases
        </button>
        <button class="v7-fab-item" role="menuitem" aria-label="Imprimir plano" data-action="print">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimir
        </button>
        <button class="v7-fab-item" role="menuitem" aria-label="Copiar URL" data-action="url">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Copiar URL
        </button>
        <button class="v7-fab-item" role="menuitem" aria-label="Importar JSON" data-action="import">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Importar JSON
        </button>
      </div>
      <button id="v7-fab-trigger" class="v7-fab-trigger" aria-expanded="false" aria-haspopup="true" aria-label="Abrir ações rápidas">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" id="v7-fab-icon-plus"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" id="v7-fab-icon-x" style="display:none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;

    document.body.appendChild(fab);

    const trigger = $('v7-fab-trigger');
    const menu    = $('v7-fab-menu');

    trigger.addEventListener('click', () => {
      const open = menu.hidden;
      menu.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      $('v7-fab-icon-plus').style.display = open ? 'none' : '';
      $('v7-fab-icon-x').style.display    = open ? ''     : 'none';
      fab.classList.toggle('v7-fab-open', open);
    });

    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('.v7-fab-item');
      if (!btn) return;
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      $('v7-fab-icon-plus').style.display = '';
      $('v7-fab-icon-x').style.display = 'none';
      fab.classList.remove('v7-fab-open');

      const action = btn.dataset.action;
      if (action === 'nova')     { if (window.showView) window.showView('nova'); }
      if (action === 'csv')      exportCSV();
      if (action === 'comparar') abrirComparacaoFases();
      if (action === 'print')    imprimirPlano();
      if (action === 'url')      copiarURL();
      if (action === 'import')   abrirImportJSON();
    });

    document.addEventListener('click', (e) => {
      if (!fab.contains(e.target) && !menu.hidden) {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        $('v7-fab-icon-plus').style.display = '';
        $('v7-fab-icon-x').style.display = 'none';
        fab.classList.remove('v7-fab-open');
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     Botões de ação extra nos cards de fase (injeta no DOM renderizado)
  ────────────────────────────────────────────────────────────── */
  function enriquecerCardsLista() {
    const wrapper = $('fases-lista-wrapper');
    if (!wrapper || wrapper.dataset.v7enriched) return;
    wrapper.dataset.v7enriched = '1';

    // Observa re-renders
    const obs = new MutationObserver(() => {
      _injetarBotoesCards();
      habilitarDragNosCards();
      injetarCountdownWidget();
      _atualizarCountdown();
    });
    obs.observe(wrapper, { childList: true, subtree: false });
    _injetarBotoesCards();
  }

  function _injetarBotoesCards() {
    // Os cards no admin-fases.js não têm data-fase-id por padrão.
    // Nós os adicionamos via MutationObserver após render.
    const wrapper = $('fases-lista-wrapper');
    if (!wrapper) return;

    const cache = getCache();
    if (!cache.length) return;

    // Encontrar botões "Editar" e adicionar botões extras ao lado
    const editBtns = qsa('button', wrapper).filter(b =>
      b.textContent.trim() === 'Editar' && !b.dataset.v7paired
    );

    editBtns.forEach(editBtn => {
      editBtn.dataset.v7paired = '1';

      // Tentar pegar o ID da fase pelo onclick do botão de deletar ao lado
      const btnGroup = editBtn.closest('div[style*="gap:8px"]') ||
                       editBtn.parentElement;
      if (!btnGroup) return;

      const allBtns = qsa('button', btnGroup);
      const delBtn  = allBtns.find(b => b.textContent.trim() === 'Remover');
      if (!delBtn) return;

      // Extrai o ID do onclick do botão de remover
      const m = delBtn.getAttribute('onclick')?.match(/deletarFase\(['"]([^'"]+)['"]\)/);
      if (!m) return;
      const faseId = m[1];

      // Marca o card pai com data-fase-id para drag-drop e filtros
      const cardEl = editBtn.closest('[style*="border:1px solid"]') ||
                     editBtn.closest('[style*="flex:1"]')?.parentElement;
      if (cardEl && !cardEl.dataset.faseId) {
        const f = cache.find(x => x.id === faseId);
        cardEl.dataset.faseId     = faseId;
        cardEl.dataset.faseNome   = f?.nome || '';
        cardEl.dataset.faseStatus = f?.status || '';
        cardEl.setAttribute('draggable', 'true');
      }

      // Injeta botões extras
      const btnDupl = document.createElement('button');
      btnDupl.textContent = 'Duplicar';
      btnDupl.title = 'Duplicar fase (cria cópia)';
      btnDupl.setAttribute('aria-label', `Duplicar fase`);
      btnDupl.className = 'v7-card-btn';
      btnDupl.addEventListener('click', () => window.duplicarFase(faseId));

      const btnPreview = document.createElement('button');
      btnPreview.textContent = 'Preview';
      btnPreview.title = 'Ver como a paciente vê esta fase';
      btnPreview.setAttribute('aria-label', 'Preview da fase para a paciente');
      btnPreview.className = 'v7-card-btn';
      btnPreview.addEventListener('click', () => abrirPreviewPaciente(faseId));

      const btnExp = document.createElement('button');
      btnExp.textContent = 'JSON';
      btnExp.title = 'Exportar esta fase como JSON';
      btnExp.setAttribute('aria-label', 'Exportar fase como JSON');
      btnExp.className = 'v7-card-btn';
      btnExp.addEventListener('click', () => exportFaseJSON(faseId));

      const btnHist = document.createElement('button');
      btnHist.textContent = 'Histórico';
      btnHist.title = 'Ver histórico de alterações';
      btnHist.setAttribute('aria-label', 'Histórico de alterações desta fase');
      btnHist.className = 'v7-card-btn';
      btnHist.addEventListener('click', () => abrirHistoricoFase(faseId));

      // Insere antes do botão Remover
      delBtn.before(btnDupl, btnPreview, btnExp, btnHist);
    });
  }

  /* ─────────────────────────────────────────────────────────────
     Injetar barra de ferramentas na view-lista
  ────────────────────────────────────────────────────────────── */
  function injetarToolbarLista() {
    if ($('v7-toolbar')) return;
    const secFooter = $('fases-lista-wrapper');
    if (!secFooter) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'v7-toolbar';
    toolbar.className = 'v7-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Ferramentas do plano');
    toolbar.innerHTML = `
      <button class="v7-toolbar-btn" aria-label="Exportar CSV" title="Exportar todas as fases em CSV" onclick="void 0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Exportar CSV
      </button>
      <button class="v7-toolbar-btn" aria-label="Comparar fases" title="Comparar duas fases lado a lado" onclick="void 0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Comparar
      </button>
      <button class="v7-toolbar-btn" aria-label="Imprimir plano" title="Imprimir plano de fases" onclick="void 0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Imprimir
      </button>
      <button class="v7-toolbar-btn" aria-label="Importar JSON" title="Importar fase de arquivo JSON" onclick="void 0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Importar JSON
      </button>`;

    const btns = toolbar.querySelectorAll('.v7-toolbar-btn');
    btns[0].addEventListener('click', exportCSV);
    btns[1].addEventListener('click', abrirComparacaoFases);
    btns[2].addEventListener('click', imprimirPlano);
    btns[3].addEventListener('click', abrirImportJSON);

    secFooter.after(toolbar);
  }

  /* ─────────────────────────────────────────────────────────────
     Wiring do formulário — overlap + validação clínica
  ────────────────────────────────────────────────────────────── */
  function wiredFormExtras() {
    const inicio   = $('f-inicio');
    const fim      = $('f-fim');
    const calorias = $('f-calorias');

    if (inicio && !inicio.dataset.v7overlap) {
      inicio.dataset.v7overlap = '1';
      inicio.addEventListener('change', validarOverlapDatas);
    }
    if (fim && !fim.dataset.v7overlap) {
      fim.dataset.v7overlap = '1';
      fim.addEventListener('change', validarOverlapDatas);
    }
    if (calorias && !calorias.dataset.v7kcal) {
      calorias.dataset.v7kcal = '1';
      calorias.addEventListener('input', validarCaloriasClinicamente);
    }
  }

  /* ─────────────────────────────────────────────────────────────
     Botão Preview no formulário
  ────────────────────────────────────────────────────────────── */
  function injetarPreviewBtnForm() {
    if ($('v7-preview-form-btn')) return;
    const actions = qs('#fase-form .form-actions');
    if (!actions) return;

    const btn = document.createElement('button');
    btn.id = 'v7-preview-form-btn';
    btn.type = 'button';
    btn.className = 'v7-toolbar-btn';
    btn.setAttribute('aria-label', 'Pré-visualizar como a paciente vê');
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Preview paciente`;
    btn.addEventListener('click', () => abrirPreviewPaciente(null));
    actions.prepend(btn);
  }

  /* ─────────────────────────────────────────────────────────────
     Init principal
  ────────────────────────────────────────────────────────────── */
  function init() {
    patchDuplicarFase();
    initDarkMode();
    initDragDrop();
    initAtalhosTeclado();

    // Exposição pública
    window._adminFasesExtrasV7 = {
      exportCSV, exportFaseJSON, abrirImportJSON,
      abrirPreviewPaciente, abrirComparacaoFases,
      abrirHistoricoFase, imprimirPlano, copiarURL,
    };

    // Injeta elementos na view-lista
    const viewLista = $('view-lista');
    if (viewLista) {
      injetarBarraBusca();
      injetarToolbarLista();
      enriquecerCardsLista();
      injetarCountdownWidget();
      iniciarCountdownAtivo();
    }

    // Injeta elementos na view-nova (formulário)
    const viewNova = $('view-nova');
    if (viewNova) {
      injetarTemplatesExtras();
      injetarCalcTMB();
      injetarEstrategiasMacros();
      initSugestoesContextuais();
      injetarPreviewBtnForm();
      wiredFormExtras();
      patchSubmitHistorico();
    }

    injetarFAB();

    // Re-checar quando view muda (o showView principal pode re-renderizar)
    const _origShowView = window.showView;
    if (_origShowView && !window._v7showViewPatched) {
      window._v7showViewPatched = true;
      window.showView = function (view) {
        _origShowView(view);
        setTimeout(() => {
          if (view === 'lista') {
            injetarBarraBusca();
            injetarToolbarLista();
            enriquecerCardsLista();
            injetarCountdownWidget();
            _atualizarCountdown();
          }
          if (view === 'nova') {
            injetarTemplatesExtras();
            injetarCalcTMB();
            injetarEstrategiasMacros();
            initSugestoesContextuais();
            injetarPreviewBtnForm();
            wiredFormExtras();
            patchSubmitHistorico();
          }
        }, 120);
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
