// ═══ POLIMENTO V1 ═══
// admin-fases-extras.js — 20 melhorias UX iniciais para admin-fases.html
// Carregado como módulo independente; comunica via window.* já expostos

(function () {
  'use strict';

  const DRAFT_KEY = 'adminFases_draft_v1';

  // ── 1. Modal de confirmação elegante ──────────────────────────────────────
  function confirmarAcao({ titulo, msg, labelOk = 'Confirmar', labelCancel = 'Cancelar' }) {
    return new Promise((resolve) => {
      const bd = document.createElement('div');
      bd.className = 'confirm-backdrop';
      bd.setAttribute('role', 'dialog');
      bd.setAttribute('aria-modal', 'true');
      bd.setAttribute('aria-labelledby', 'cbox-title');
      bd.innerHTML = `
        <div class="confirm-box" role="document">
          <p class="confirm-title" id="cbox-title">${titulo}</p>
          <p class="confirm-msg">${msg}</p>
          <div class="confirm-actions">
            <button class="confirm-cancel" id="cbox-cancel">${labelCancel}</button>
            <button class="confirm-ok"     id="cbox-ok">${labelOk}</button>
          </div>
        </div>`;
      document.body.appendChild(bd);

      const cancelBtn = bd.querySelector('#cbox-cancel');
      const okBtn     = bd.querySelector('#cbox-ok');
      cancelBtn.focus();

      const done = (result) => { bd.remove(); resolve(result); };
      cancelBtn.addEventListener('click', () => done(false));
      okBtn.addEventListener('click',     () => done(true));
      bd.addEventListener('click', (e) => { if (e.target === bd) done(false); });
      bd.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') done(false);
        if (e.key === 'Tab') {
          const focusable = [cancelBtn, okBtn];
          const idx = focusable.indexOf(document.activeElement);
          const next = e.shiftKey ? focusable[idx - 1] || focusable[focusable.length - 1] : focusable[idx + 1] || focusable[0];
          e.preventDefault();
          next.focus();
        }
      });
    });
  }

  // ── 2. Override deletarFase com modal elegante ────────────────────────────
  function patchDeletarFase() {
    window.deletarFase = async function (id) {
      const cache = window._adminFasesExtrasCache || [];
      const fase  = cache.find(f => f.id === id);
      const nome  = fase?.nome || 'esta fase';

      const ok = await confirmarAcao({
        titulo:      'Remover fase',
        msg:         `Remover <strong>"${nome}"</strong>? Esta ação não pode ser desfeita.`,
        labelOk:     'Remover',
        labelCancel: 'Cancelar',
      });
      if (!ok) return;

      const sb = window._supabase;
      if (!sb) return;
      await sb.from('fases').delete().eq('id', id);
      if (window.showToast) window.showToast('Fase removida.');
      if (window.showView)  window.showView('lista');
    };
  }

  // ── 3. Beforeunload guard ─────────────────────────────────────────────────
  let formDirty = false;
  let draftTimer = null;

  function setDirty(val) {
    formDirty = val;
    const el = document.getElementById('form-dirty-indicator');
    if (el) el.classList.toggle('visible', val);
  }

  window.addEventListener('beforeunload', (e) => {
    if (formDirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // ── 4. Auto-save rascunho ─────────────────────────────────────────────────
  const DRAFT_FIELDS = [
    'f-nome','f-ordem','f-status','f-duracao','f-inicio',
    'f-objetivo-clinico','f-meta-peso','f-objetivo','f-descricao',
    'f-dicas','f-calorias','f-proteina','f-carboidrato','f-gordura',
    'f-restricoes','f-permitidos',
  ];

  function scheduleDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      const draft = {};
      DRAFT_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) draft[id] = el.value;
      });
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (_) {}
      flashAutosave();
    }, 1300);
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
  }

  function flashAutosave() {
    const badge = document.getElementById('autosave-badge');
    if (!badge) return;
    badge.classList.add('visible');
    setTimeout(() => badge.classList.remove('visible'), 1900);
  }

  // ── 5. Escape fecha modal do gerador — focus trap ─────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('gerador-plano-modal');
      if (modal && modal.style.display !== 'none') {
        if (typeof window.fecharGeradorPlano === 'function') window.fecharGeradorPlano();
        return;
      }
      const confirmBackdrop = document.querySelector('.confirm-backdrop');
      if (confirmBackdrop) {
        confirmBackdrop.querySelector('#cbox-cancel')?.click();
      }
    }
    // Focus trap no modal do gerador
    const modal = document.getElementById('gerador-plano-modal');
    if (e.key === 'Tab' && modal && modal.style.display !== 'none') {
      const focusable = Array.from(modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  });

  // ── 6. Patch showView: scroll + focus + fade ──────────────────────────────
  function patchShowView() {
    const orig = window.showView;
    if (!orig) return;
    window.showView = function (view) {
      orig(view);
      const main = document.querySelector('.main-content');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
      if (view === 'nova') {
        requestAnimationFrame(() => {
          document.getElementById('f-nome')?.focus();
          updateCompletude();
        });
        setDirty(false);
        document.getElementById('view-nova')?.classList.add('view-extras-fade');
      }
      if (view === 'lista') {
        setDirty(false);
        clearDraft();
        document.getElementById('view-lista')?.classList.add('view-extras-fade');
        setTimeout(loadFasesExtras, 250);
      }
    };
  }

  // ── 7. Form dirty + completion listeners ─────────────────────────────────
  function initFormListeners() {
    const form = document.getElementById('fase-form');
    if (!form) return;

    const onInput = () => { setDirty(true); scheduleDraft(); updateCompletude(); };
    DRAFT_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', onInput);
    });
    ['f-status','f-duracao','f-inicio'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', onInput);
    });

    form.addEventListener('submit', () => {
      setTimeout(() => {
        if (!form.querySelector('.form-message.error.visible')) {
          setDirty(false);
          clearDraft();
        }
      }, 2000);
    });
  }

  // ── 8. Form completion meter ──────────────────────────────────────────────
  const OBRIG  = ['f-nome', 'f-status', 'f-duracao'];
  const RECOM  = ['f-objetivo', 'f-descricao', 'f-calorias', 'f-proteina', 'f-carboidrato', 'f-gordura'];

  function updateCompletude() {
    const all = [...OBRIG, ...RECOM];
    const pct = Math.round(all.filter(id => {
      const el = document.getElementById(id);
      return el && el.value && el.value.trim() !== '';
    }).length / all.length * 100);

    const fill  = document.getElementById('fcm-fill');
    const label = document.getElementById('fcm-label-val');
    if (fill)  fill.style.width  = pct + '%';
    if (label) label.textContent = pct + '% completo';
  }

  // ── 9. Inline validation ──────────────────────────────────────────────────
  function addValidator(fieldId, check, errMsg) {
    const el = document.getElementById(fieldId);
    if (!el) return;
    const errEl = document.createElement('p');
    errEl.className = 'field-error-msg';
    errEl.id = fieldId + '-err';
    errEl.textContent = errMsg;
    el.parentNode?.appendChild(errEl);

    const validate = () => {
      const invalid = el.value.trim() !== '' && !check(el.value);
      el.classList.toggle('field-error', invalid);
      errEl.classList.toggle('visible', invalid);
    };
    el.addEventListener('blur',  validate);
    el.addEventListener('input', () => { if (el.classList.contains('field-error')) validate(); });
  }

  // ── 10. Submit spinner ────────────────────────────────────────────────────
  function patchSubmitButton() {
    const form = document.getElementById('fase-form');
    if (!form) return;
    form.addEventListener('submit', () => {
      const btn = document.getElementById('fase-submit-btn');
      if (btn && !btn.querySelector('.btn-spinner')) {
        const sp = document.createElement('span');
        sp.className = 'btn-spinner';
        sp.setAttribute('aria-hidden', 'true');
        btn.prepend(sp);
        setTimeout(() => sp.remove(), 4000);
      }
    });
  }

  // ── 11. Aria live region + toast patch ───────────────────────────────────
  function injectAriaLive() {
    const el = document.createElement('div');
    el.id = 'extras-aria-live';
    el.className = 'sr-only';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    document.body.appendChild(el);

    const origToast = window.showToast;
    if (origToast) {
      window.showToast = function (msg) {
        origToast(msg);
        el.textContent = '';
        requestAnimationFrame(() => { el.textContent = msg; });
      };
    }
  }

  // ── 12. Skip link ─────────────────────────────────────────────────────────
  function injectSkipLink() {
    if (document.querySelector('.extras-skip-link')) return;
    const link = document.createElement('a');
    link.href = '#main-extras-anchor';
    link.className = 'extras-skip-link';
    link.textContent = 'Ir para o conteúdo principal';
    document.body.insertBefore(link, document.body.firstChild);

    const main = document.querySelector('.main-content');
    if (main && !document.getElementById('main-extras-anchor')) {
      const anchor = document.createElement('span');
      anchor.id = 'main-extras-anchor';
      anchor.setAttribute('tabindex', '-1');
      anchor.setAttribute('aria-hidden', 'true');
      main.insertBefore(anchor, main.firstChild);
    }
  }

  // ── 13. KPI tooltips ─────────────────────────────────────────────────────
  const KPI_TIPS = {
    'Total de fases': 'Número total de fases no plano de periodização',
    'Fase ativa':     'Fase com status "Em andamento" atualmente',
    'Concluídas':     'Fases com status "Concluída"',
    'Semanas totais': 'Soma das durações de todas as fases',
  };

  function enrichKPIs() {
    const kpisEl = document.getElementById('kpis-fases');
    if (!kpisEl) return;
    kpisEl.querySelectorAll('div').forEach(kpi => {
      const labelEl = kpi.querySelector('p:last-child');
      const tip = KPI_TIPS[labelEl?.textContent?.trim()];
      if (tip && !kpi.classList.contains('kpi-tip')) {
        kpi.classList.add('kpi-tip');
        kpi.setAttribute('data-tip', tip);
        kpi.setAttribute('tabindex', '0');
      }
    });
  }

  // ── 14. Carrega dados extras via _supabase ────────────────────────────────
  async function loadFasesExtras() {
    const sb = window._supabase;
    if (!sb) return;
    const params    = new URLSearchParams(window.location.search);
    const patientId = params.get('patient') || params.get('patient_id');
    if (!patientId) return;

    const { data: fases } = await sb
      .from('fases')
      .select('id,nome,status,data_inicio,data_fim,duracao_semanas,ordem')
      .eq('patient_id', patientId)
      .order('ordem', { ascending: true });

    if (!fases) return;
    window._adminFasesExtrasCache = fases;

    enrichKPIs();
    renderPlanProgressBar(fases);
    renderNoActiveAlert(fases);
    enrichFaseAtiva(fases);
    enrichActionButtons();
  }

  // ── 15. Barra de progresso do plano ──────────────────────────────────────
  function renderPlanProgressBar(fases) {
    let wrap = document.getElementById('plano-progress-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'plano-progress-wrap';
      wrap.innerHTML = `
        <p id="plano-progress-label" class="fase-progress-label">Progresso do plano</p>
        <div id="plano-progress-bar" role="presentation"></div>`;
      const kpis = document.getElementById('progresso-geral');
      if (kpis) kpis.after(wrap);
    }

    const bar = document.getElementById('plano-progress-bar');
    if (!bar || !fases.length) return;

    const totalSem = fases.reduce((s, f) => s + (f.duracao_semanas || 1), 0);
    const COLORS = {
      concluida: 'var(--detail)',
      ativa:     'var(--accent)',
      pendente:  'var(--border)',
      planejada: 'var(--border)',
      pausada:   'rgba(139,94,60,0.4)',
    };
    bar.innerHTML = fases.map(f => {
      const pct  = ((f.duracao_semanas || 1) / totalSem * 100).toFixed(1);
      const cor  = COLORS[f.status] || COLORS.pendente;
      return `<div style="width:${pct}%;background:${cor};" title="${f.nome}"></div>`;
    }).join('');
  }

  // ── 16. Alert "nenhuma fase ativa" ────────────────────────────────────────
  function renderNoActiveAlert(fases) {
    const existingAlert = document.getElementById('no-active-alert');
    const hasActive = fases.some(f => f.status === 'ativa');

    if (!hasActive && fases.length > 0) {
      if (existingAlert) return;
      const alert = document.createElement('div');
      alert.id = 'no-active-alert';
      alert.setAttribute('role', 'alert');
      alert.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)"
          stroke-width="1.5" style="flex-shrink:0;margin-top:1px;" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Nenhuma fase está marcada como <strong>Em andamento</strong>.
          Edite uma fase para ativá-la.</span>`;
      const wrapper = document.getElementById('fases-lista-wrapper');
      wrapper?.parentElement?.insertBefore(alert, wrapper);
    } else if (hasActive && existingAlert) {
      existingAlert.remove();
    }
  }

  // ── 17. Progresso e dias restantes da fase ativa ──────────────────────────
  function enrichFaseAtiva(fases) {
    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper) return;

    fases.forEach(f => {
      if (f.status !== 'ativa' || !f.data_inicio || !f.data_fim) return;

      const hoje   = new Date(); hoje.setHours(0,0,0,0);
      const inicio = new Date(f.data_inicio + 'T00:00:00');
      const fim    = new Date(f.data_fim    + 'T00:00:00');
      const total  = Math.max(1, (fim - inicio) / 86400000);
      const elapsed= (hoje - inicio) / 86400000;
      const pct    = Math.min(100, Math.max(0, Math.round(elapsed / total * 100)));
      const dias   = Math.ceil((fim - hoje) / 86400000);
      const diasTxt = dias > 0 ? `${dias} dias restantes` : dias === 0 ? 'Termina hoje' : 'Prazo encerrado';

      // Procura o card da fase ativa no DOM (pelo botão de editar com o ID)
      const editBtn = wrapper.querySelector(`button[onclick="editarFase('${f.id}')"]`);
      const card    = editBtn?.closest('[style*="border:1px solid"]');
      if (!card || card.querySelector('.fase-progress-wrap')) return;

      const pw = document.createElement('div');
      pw.className = 'fase-progress-wrap';
      pw.innerHTML = `
        <div class="fase-progress-header">
          <span class="fase-progress-label">Progresso da fase</span>
          <span class="dias-badge" aria-label="${diasTxt}">${diasTxt}</span>
        </div>
        <div class="fase-progress-track"
          role="progressbar"
          aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
          aria-label="Fase ${pct}% concluída">
          <div class="fase-progress-fill" style="width:${pct}%;"></div>
        </div>
        <span style="font-family:'DM Sans',sans-serif;font-size:0.6rem;color:var(--subtitle);
          margin-top:3px;display:block;">${pct}% concluído</span>`;
      card.appendChild(pw);
    });
  }

  // ── 18. aria-label dinâmico nos botões de ação ────────────────────────────
  function enrichActionButtons() {
    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper) return;
    wrapper.querySelectorAll('button').forEach(btn => {
      const oc = btn.getAttribute('onclick') || '';
      if (oc.includes('editarFase') && !btn.getAttribute('aria-label')) {
        btn.setAttribute('aria-label', 'Editar fase');
      }
      if (oc.includes('deletarFase') && !btn.getAttribute('aria-label')) {
        btn.setAttribute('aria-label', 'Remover fase');
      }
    });
  }

  // ── 19. Template card hover enhancement ──────────────────────────────────
  function enhanceTemplates() {
    const grid = document.querySelector('#view-nova section .section-title + p + div');
    if (!grid) {
      // Fallback: find by grid style
      document.querySelectorAll('#view-nova button[onclick*="aplicarTemplate"]').forEach(btn => {
        btn.classList.add('tpl-enhanced');
      });
      return;
    }
    grid.querySelectorAll('button').forEach(btn => btn.classList.add('tpl-enhanced'));
  }

  // ── 20. DOM injection no formulário ──────────────────────────────────────
  function injectFormExtras() {
    const form = document.getElementById('fase-form');
    if (!form || document.getElementById('form-dirty-indicator')) return;

    // Dirty indicator
    const dirty = document.createElement('div');
    dirty.id = 'form-dirty-indicator';
    dirty.setAttribute('role', 'status');
    dirty.setAttribute('aria-live', 'polite');
    dirty.innerHTML = '<span class="pulse-dot" aria-hidden="true"></span> Alterações não salvas';
    form.insertBefore(dirty, form.firstChild);

    // Completion meter
    const meter = document.createElement('div');
    meter.id = 'form-completion-meter';
    meter.innerHTML = `
      <span class="fcm-label">Completude</span>
      <div class="fcm-track"><div class="fcm-fill" id="fcm-fill" style="width:0%;"></div></div>
      <span class="fcm-label" id="fcm-label-val">0% completo</span>`;
    form.insertBefore(meter, dirty.nextSibling);
  }

  // ── Autosave badge DOM injection ──────────────────────────────────────────
  function injectAutosaveBadge() {
    if (document.getElementById('autosave-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'autosave-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = 'Rascunho salvo';
    document.body.appendChild(badge);
  }

  // ── MutationObserver: enriquece após render do wrapper ────────────────────
  function watchWrapper() {
    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper) return;
    const obs = new MutationObserver(() => {
      enrichKPIs();
      enrichActionButtons();
    });
    obs.observe(wrapper, { childList: true });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectSkipLink();
    injectAriaLive();
    injectFormExtras();
    injectAutosaveBadge();

    patchShowView();
    patchDeletarFase();
    patchSubmitButton();
    initFormListeners();

    addValidator('f-nome',
      v => v.trim().length >= 2,
      'Nome obrigatório (mín. 2 caracteres)');
    addValidator('f-duracao',
      v => { const n = parseInt(v); return n >= 1 && n <= 52; },
      'Duração entre 1 e 52 semanas');

    enhanceTemplates();
    watchWrapper();

    // Se a view lista já está visível (carregamento inicial), enriquece
    const lista = document.getElementById('view-lista');
    if (lista && lista.style.display !== 'none') {
      setTimeout(loadFasesExtras, 500);
    }
  }

  // Expõe API pública
  window._adminFasesExtras = {
    confirmarAcao,
    loadFasesExtras,
    enrichKPIs,
    renderPlanProgressBar,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// ═══ POLIMENTO V3 ═══
// 10 melhorias de acessibilidade avançada
// Não duplica: aria-live polite, skip-link, focus-trap modal confirm/gerador,
//              aria-label botões, role=progressbar, role=alert, role=status, sr-only, validação inline.

(function () {
  'use strict';

  // V3-1. Anunciar mudança de view via MutationObserver ─────────────────────
  function initViewAnnouncer() {
    const VIEWS = { 'view-lista': 'Lista de Fases', 'view-nova': 'Formulário de Fase' };
    Object.entries(VIEWS).forEach(([id, name]) => {
      const el = document.getElementById(id);
      if (!el) return;
      new MutationObserver(() => {
        if (el.style.display === 'none') return;
        const live = document.getElementById('extras-aria-live');
        if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = `Visualizando: ${name}`; }); }
      }).observe(el, { attributes: true, attributeFilter: ['style'] });
    });
  }

  // V3-2. aria-busy durante carregamento dos cards de fase ──────────────────
  function initAriaLoadingStates() {
    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper) return;
    let prevBusy = !!wrapper.querySelector('.admin-table-skeleton');
    if (prevBusy) wrapper.setAttribute('aria-busy', 'true');
    new MutationObserver(() => {
      const busy = !!wrapper.querySelector('.admin-table-skeleton');
      if (busy === prevBusy) return;
      prevBusy = busy;
      wrapper.setAttribute('aria-busy', String(busy));
      if (!busy) {
        const n = wrapper.querySelectorAll('[data-v3-card]').length;
        if (n > 0) {
          const live = document.getElementById('extras-aria-live');
          if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = `${n} fase${n !== 1 ? 's' : ''} carregada${n !== 1 ? 's' : ''}.`; }); }
        }
      }
    }).observe(wrapper, { childList: true, subtree: true });
  }

  // V3-3. Restaurar foco após fechar modal confirm ───────────────────────────
  function initFocusRestoreOnModalClose() {
    let lastFocus = null;
    document.addEventListener('focusin', (e) => {
      if (document.querySelector('.confirm-backdrop')) return;
      if (['BUTTON','A','INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)) lastFocus = e.target;
    }, true);
    new MutationObserver((mutations) => {
      mutations.forEach(m => m.removedNodes.forEach(node => {
        if (node.nodeType === 1 && node.classList?.contains('confirm-backdrop')) {
          if (lastFocus && document.contains(lastFocus)) requestAnimationFrame(() => lastFocus.focus());
        }
      }));
    }).observe(document.body, { childList: true });
  }

  // V3-4. Roving tabindex nos cards de fase ─────────────────────────────────
  function initCardRovingTabindex() {
    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper) return;

    function tagCards() {
      wrapper.querySelectorAll('[style*="border:1px solid"]:not([data-v3-card])').forEach(card => {
        card.setAttribute('data-v3-card', '');
        card.setAttribute('role', 'listitem');
        if (!card.getAttribute('tabindex')) card.setAttribute('tabindex', '-1');
      });
      const all = wrapper.querySelectorAll('[data-v3-card]');
      if (all.length && all[0].getAttribute('tabindex') === '-1') all[0].setAttribute('tabindex', '0');
    }

    wrapper.addEventListener('keydown', (e) => {
      if (!['ArrowUp','ArrowDown','Home','End'].includes(e.key)) return;
      const all = Array.from(wrapper.querySelectorAll('[data-v3-card]'));
      const idx = all.indexOf(document.activeElement);
      if (idx === -1) return;
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? Math.min(idx + 1, all.length - 1)
                 : e.key === 'ArrowUp'   ? Math.max(idx - 1, 0)
                 : e.key === 'End'       ? all.length - 1 : 0;
      all.forEach((c, i) => c.setAttribute('tabindex', i === next ? '0' : '-1'));
      all[next].focus();
    });

    new MutationObserver(tagCards).observe(wrapper, { childList: true });
    tagCards();
  }

  // V3-5. aria-controls + aria-expanded nos nav items ──────────────────────
  function enrichNavAriaControls() {
    const navItems = document.querySelectorAll('.nav-item');
    const MAP = { "showView('lista')": 'view-lista', "showView('nova')": 'view-nova' };
    navItems.forEach(item => {
      const oc = item.getAttribute('onclick') || '';
      const key = Object.keys(MAP).find(k => oc.includes(k));
      if (!key) return;
      const panelId = MAP[key];
      item.setAttribute('aria-controls', panelId);
      const panel = document.getElementById(panelId);
      if (panel) {
        item.setAttribute('aria-expanded', String(panel.style.display !== 'none'));
        new MutationObserver(() => {
          item.setAttribute('aria-expanded', String(panel.style.display !== 'none'));
        }).observe(panel, { attributes: true, attributeFilter: ['style'] });
      }
    });
  }

  // V3-6. aria-describedby nos campos com dica contextual ───────────────────
  function enrichFieldDescriptions() {
    const HINTS = [
      { id: 'f-fim',       text: 'Calculada automaticamente com base na data de início e duração' },
      { id: 'f-dicas',     text: 'Cada linha se torna um item de dica visível para a paciente' },
      { id: 'f-duracao',   text: 'Entre 1 e 52 semanas' },
      { id: 'f-meta-peso', text: 'Use valor negativo para meta de perda. Exemplo: -2.5 para perder 2,5 kg' },
      { id: 'f-restricoes',text: 'Separe os alimentos por vírgula' },
      { id: 'f-permitidos',text: 'Separe os alimentos por vírgula' },
    ];
    HINTS.forEach(({ id, text }) => {
      const field = document.getElementById(id);
      if (!field || document.getElementById(`${id}-v3d`)) return;
      const p = document.createElement('p');
      p.id = `${id}-v3d`;
      p.className = 'sr-only';
      p.textContent = text;
      field.parentNode?.appendChild(p);
      const prev = (field.getAttribute('aria-describedby') || '').trim();
      field.setAttribute('aria-describedby', prev ? `${prev} ${id}-v3d` : `${id}-v3d`);
    });
  }

  // V3-7. Atalhos Alt+N / Alt+L + aria-keyshortcuts ─────────────────────────
  function initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
      if ((e.key === 'n' || e.key === 'N') && typeof window.showView === 'function') {
        e.preventDefault(); window.showView('nova');
      } else if ((e.key === 'l' || e.key === 'L') && typeof window.showView === 'function') {
        e.preventDefault(); window.showView('lista');
      }
    });
    document.querySelectorAll('.nav-item').forEach(item => {
      const oc = item.getAttribute('onclick') || '';
      if (oc.includes("showView('lista')")) item.setAttribute('aria-keyshortcuts', 'Alt+L');
      if (oc.includes("showView('nova')"))  item.setAttribute('aria-keyshortcuts', 'Alt+N');
    });
  }

  // V3-8. Live region assertiva para erros de validação ─────────────────────
  function injectAndPatchFormErrors() {
    if (!document.getElementById('v3-assertive-live')) {
      const el = document.createElement('div');
      el.id = 'v3-assertive-live';
      el.className = 'sr-only';
      el.setAttribute('aria-live', 'assertive');
      el.setAttribute('aria-atomic', 'true');
      el.setAttribute('role', 'alert');
      document.body.appendChild(el);
    }
    const form = document.getElementById('fase-form');
    if (!form) return;
    form.addEventListener('submit', () => {
      setTimeout(() => {
        const errs = Array.from(form.querySelectorAll('.field-error-msg.visible'))
          .map(e => e.textContent.trim()).filter(Boolean);
        if (!errs.length) return;
        const live = document.getElementById('v3-assertive-live');
        if (!live) return;
        live.textContent = '';
        requestAnimationFrame(() => { live.textContent = `${errs.length} erro${errs.length > 1 ? 's' : ''}: ${errs.join('; ')}`; });
      }, 300);
    });
  }

  // V3-9. Semântica de lista no wrapper de fases ────────────────────────────
  function enrichListSemantics() {
    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper || wrapper.getAttribute('role') === 'list') return;
    wrapper.setAttribute('role', 'list');
    wrapper.setAttribute('aria-label', 'Fases do plano de tratamento');
  }

  // V3-10. aria-label nos landmarks principais ──────────────────────────────
  function enrichLandmarks() {
    const main = document.querySelector('.main-content');
    if (main && !main.getAttribute('aria-label')) {
      main.setAttribute('aria-label', 'Gerenciamento de fases');
      if (main.tagName !== 'MAIN' && !main.getAttribute('role')) main.setAttribute('role', 'main');
    }
    const nav = document.querySelector('.sidebar');
    if (nav && !nav.getAttribute('aria-label')) nav.setAttribute('aria-label', 'Navegação de fases');
  }

  // ── Init V3 ───────────────────────────────────────────────────────────────
  function initV3() {
    enrichLandmarks();
    enrichListSemantics();
    enrichNavAriaControls();
    enrichFieldDescriptions();
    initKeyboardShortcuts();
    initViewAnnouncer();
    initAriaLoadingStates();
    initFocusRestoreOnModalClose();
    initCardRovingTabindex();
    injectAndPatchFormErrors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV3);
  } else {
    initV3();
  }
})();

// ═══ POLIMENTO V4 ═══
// 10 melhorias de performance — IntersectionObserver, rIC, sessionStorage cache,
// Page Visibility, throttle/debounce, passive listeners, draft restore, rAF ARIA sync.
// Não duplica: aria-live, skip-link, focus-trap, roving tabindex, keyboard shortcuts,
//              field descriptions, loading states, view announcer (V1/V3 cobrem tudo acima).

(function () {
  'use strict';

  // V4-1. Utilitários debounce + throttle ───────────────────────────────────
  function debounce(fn, ms) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }

  function throttle(fn, ms) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= ms) { last = now; fn.apply(this, args); }
    };
  }

  // V4-2. IntersectionObserver — KPI cards animate-in escalonado ───────────
  function initKpiReveal() {
    const kpis = document.getElementById('kpis-fases');
    if (!kpis || !('IntersectionObserver' in window)) return;

    const obs = new IntersectionObserver((entries, o) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 65);
        o.unobserve(entry.target);
      });
    }, { threshold: 0.1 });

    const tagAndObserve = () => {
      kpis.querySelectorAll('div:not([data-v4-kpi])').forEach(card => {
        card.setAttribute('data-v4-kpi', '');
        card.style.opacity = '0';
        card.style.transform = 'translateY(8px)';
        card.style.transition = 'opacity 0.32s ease, transform 0.32s ease';
        obs.observe(card);
      });
    };

    new MutationObserver(tagAndObserve).observe(kpis, { childList: true });
    tagAndObserve();
  }

  // V4-3. IntersectionObserver — fase cards staggered reveal ────────────────
  function initCardReveal() {
    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper || !('IntersectionObserver' in window)) return;

    const cardObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('v4-card-visible');
        cardObs.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -10px 0px' });

    let idx = 0;
    const tagCards = () => {
      wrapper.querySelectorAll('[style*="border"]:not([data-v4-card])').forEach(card => {
        if (!card.querySelector('button')) return;
        card.setAttribute('data-v4-card', '');
        card.classList.add('v4-card-hidden');
        card.style.setProperty('--v4-stagger', `${Math.min(idx++, 5) * 55}ms`);
        cardObs.observe(card);
      });
    };

    new MutationObserver(() => { idx = 0; tagCards(); }).observe(wrapper, { childList: true });
    tagCards();
  }

  // V4-4. requestIdleCallback — tarefas de baixa prioridade ─────────────────
  function scheduleIdleTasks() {
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));

    ric(() => {
      try {
        const draft = JSON.parse(localStorage.getItem('adminFases_draft_v1') || 'null');
        if (!draft || !Object.values(draft).some(v => v && String(v).trim())) return;
        injectDraftRestoreBanner(draft);
      } catch (_) {}
    });

    ric(() => {
      document.querySelectorAll('.kpi-tip[data-tip]:not([title])').forEach(el => {
        el.setAttribute('title', el.getAttribute('data-tip'));
      });
    });
  }

  // V4-5. Banner de restauração de rascunho ─────────────────────────────────
  function injectDraftRestoreBanner(draft) {
    if (document.getElementById('v4-draft-banner')) return;
    const container = document.getElementById('view-nova');
    if (!container) return;

    const banner = document.createElement('div');
    banner.id = 'v4-draft-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = `
      <span>Há um rascunho não salvo da última sessão.</span>
      <button id="v4-restore-btn" type="button">Restaurar</button>
      <button id="v4-discard-btn" type="button" aria-label="Descartar rascunho">&#215;</button>`;
    container.insertBefore(banner, container.firstChild);

    banner.querySelector('#v4-restore-btn').addEventListener('click', () => {
      Object.entries(draft).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }
      });
      banner.remove();
      const live = document.getElementById('extras-aria-live');
      if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = 'Rascunho restaurado com sucesso.'; }); }
    });

    banner.querySelector('#v4-discard-btn').addEventListener('click', () => {
      try { localStorage.removeItem('adminFases_draft_v1'); } catch (_) {}
      banner.remove();
    });
  }

  // V4-6. sessionStorage cache — pré-popula e persiste após carregamento ────
  function initFasesSessionCache() {
    const CACHE_KEY = 'v4_fases_cache';
    const CACHE_TTL = 45000;
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('patient') || params.get('patient_id');
    if (!pid) return;

    try {
      const raw = sessionStorage.getItem(`${CACHE_KEY}_${pid}`);
      if (raw) {
        const c = JSON.parse(raw);
        if (Date.now() - c.ts < CACHE_TTL && Array.isArray(c.data) && c.data.length) {
          window._adminFasesExtrasCache = c.data;
          requestAnimationFrame(() => {
            const ext = window._adminFasesExtras;
            if (ext) {
              ext.enrichKPIs?.();
              ext.renderPlanProgressBar?.(c.data);
            }
          });
        }
      }
    } catch (_) {}

    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper) return;
    const saveObs = new MutationObserver(debounce(() => {
      const cache = window._adminFasesExtrasCache;
      if (!Array.isArray(cache) || !cache.length) return;
      try { sessionStorage.setItem(`${CACHE_KEY}_${pid}`, JSON.stringify({ ts: Date.now(), data: cache })); } catch (_) {}
    }, 400));
    saveObs.observe(wrapper, { childList: true, subtree: true });
    setTimeout(() => saveObs.disconnect(), 25000);
  }

  // V4-7. Page Visibility API — sinaliza pausa quando tab está oculta ───────
  function initPageVisibilityGuard() {
    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper) return;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        wrapper.setAttribute('data-v4-paused', '1');
      } else {
        wrapper.removeAttribute('data-v4-paused');
      }
    }, { passive: true });
  }

  // V4-8. Resize throttle — re-renderiza barra de progresso do plano ─────────
  function initResizeThrottle() {
    const onResize = throttle(() => {
      const cache = window._adminFasesExtrasCache;
      if (!Array.isArray(cache) || !cache.length) return;
      window._adminFasesExtras?.renderPlanProgressBar?.(cache);
    }, 250);
    window.addEventListener('resize', onResize, { passive: true });
  }

  // V4-9. Passive listeners — scroll e touch no main-content ────────────────
  function addPassiveScrollListeners() {
    const main = document.querySelector('.main-content');
    if (!main) return;
    main.addEventListener('touchstart', () => {}, { passive: true });
    main.addEventListener('touchmove',  () => {}, { passive: true });
    main.addEventListener('wheel',      () => {}, { passive: true, capture: false });
  }

  // V4-10. rAF ARIA sync — adiciona atributos ARIA progressbar na completion meter
  function patchCompletudeMeterAria() {
    const fill = document.getElementById('fcm-fill');
    if (!fill) return;
    fill.setAttribute('role', 'progressbar');
    fill.setAttribute('aria-valuemin', '0');
    fill.setAttribute('aria-valuemax', '100');
    fill.setAttribute('aria-valuenow', '0');
    fill.setAttribute('aria-label', 'Completude do formulário de fase');

    new MutationObserver(() => {
      requestAnimationFrame(() => {
        const pct = parseInt(fill.style.width) || 0;
        fill.setAttribute('aria-valuenow', String(pct));
      });
    }).observe(fill, { attributes: true, attributeFilter: ['style'] });
  }

  // ── Init V4 ───────────────────────────────────────────────────────────────
  function initV4() {
    initKpiReveal();
    initCardReveal();
    scheduleIdleTasks();
    initFasesSessionCache();
    initPageVisibilityGuard();
    initResizeThrottle();
    addPassiveScrollListeners();
    patchCompletudeMeterAria();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV4);
  } else {
    initV4();
  }
})();

// ═══ POLIMENTO V5 ═══
// 10 melhorias com Web APIs modernas — Wake Lock, Web Share, Clipboard,
// Vibration, Offline, Battery, Notification, Page Visibility stale-reload,
// Performance marks, Network Information.
// Não duplica: Page Visibility básico (V4-7), sessionStorage cache (V4-6),
//              passive listeners (V4-9), aria-live/assertive (V1/V3).

(function () {
  'use strict';

  // V5-1. Wake Lock API — tela ligada durante edição longa ──────────────────
  let wakeLock = null;

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      document.body.setAttribute('data-wake-lock', 'active');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
        document.body.removeAttribute('data-wake-lock');
      });
    } catch (_) {}
  }

  function releaseWakeLock() {
    wakeLock?.release().catch(() => {});
    wakeLock = null;
    document.body.removeAttribute('data-wake-lock');
  }

  function initWakeLock() {
    const viewNova = document.getElementById('view-nova');
    if (!viewNova) return;
    new MutationObserver(() => {
      if (viewNova.style.display !== 'none') {
        requestWakeLock();
      } else {
        releaseWakeLock();
      }
    }).observe(viewNova, { attributes: true, attributeFilter: ['style'] });
    // Reacquire após tab retornar ao foco (Wake Lock é liberado quando tab fica oculta)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && viewNova.style.display !== 'none') requestWakeLock();
    }, { passive: true });
  }

  // V5-2. Web Share API — compartilhar resumo do plano ─────────────────────
  function injectShareButton() {
    if (!navigator.share || document.getElementById('v5-share-btn')) return;
    const btn = document.createElement('button');
    btn.id   = 'v5-share-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Compartilhar resumo do plano de fases');
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>Compartilhar plano`;
    btn.addEventListener('click', async () => {
      const fases  = window._adminFasesExtrasCache || [];
      const resumo = fases.map((f, i) =>
        `${i + 1}. ${f.nome} — ${f.duracao_semanas || '?'} sem. (${f.status})`
      ).join('\n');
      try {
        await navigator.share({
          title: 'Plano de Fases — ERG 360',
          text:  `Plano de fases:\n${resumo || 'Nenhuma fase carregada.'}`,
        });
      } catch (e) {
        if (e.name !== 'AbortError' && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(resumo);
            if (window.showToast) window.showToast('Resumo copiado.');
          } catch (_) {}
        }
      }
    });
    const kpis = document.getElementById('kpis-fases');
    if (kpis) kpis.parentElement?.insertBefore(btn, kpis);
  }

  // V5-3. Clipboard API — copiar detalhes de uma fase por card ──────────────
  function enrichCardsWithCopyBtn() {
    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper || !navigator.clipboard) return;

    function addCopyBtns() {
      wrapper.querySelectorAll('[data-v3-card]:not([data-v5-copy])').forEach(card => {
        card.setAttribute('data-v5-copy', '');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'v5-copy-btn';
        btn.setAttribute('aria-label', 'Copiar detalhes desta fase');
        btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>`;
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const m     = (card.querySelector('button[onclick*="editarFase"]')?.getAttribute('onclick') || '').match(/'([^']+)'/);
          const fases = window._adminFasesExtrasCache || [];
          const f     = fases.find(x => x.id === m?.[1]);
          const texto = f
            ? `Fase: ${f.nome}\nStatus: ${f.status}\nDuração: ${f.duracao_semanas} semanas\nInício: ${f.data_inicio || 'não definido'}`
            : card.querySelector('p,h3,h4,strong')?.textContent.trim() || '';
          try {
            await navigator.clipboard.writeText(texto);
            btn.classList.add('v5-copy-ok');
            setTimeout(() => btn.classList.remove('v5-copy-ok'), 1600);
            if (window.showToast) window.showToast('Fase copiada.');
          } catch (_) {}
        });
        const row = card.querySelector('.fase-action-row') || card;
        row.appendChild(btn);
      });
    }

    new MutationObserver(addCopyBtns).observe(wrapper, { childList: true });
    addCopyBtns();
  }

  // V5-4. Vibration API — feedback tátil em mobile ──────────────────────────
  function initVibration() {
    if (!navigator.vibrate) return;
    document.addEventListener('click', (e) => {
      if (e.target?.id === 'cbox-ok') navigator.vibrate([40, 30, 70]);
    }, { capture: true, passive: true });
    const form = document.getElementById('fase-form');
    if (form) {
      form.addEventListener('submit', () => {
        setTimeout(() => {
          if (!form.querySelector('.form-message.error.visible')) navigator.vibrate([55]);
        }, 2200);
      });
    }
  }

  // V5-5. navigator.onLine — banner de conexão perdida ─────────────────────
  function initOfflineBanner() {
    let banner = null;
    const show = () => {
      if (banner) return;
      banner = document.createElement('div');
      banner.id = 'v5-offline-banner';
      banner.setAttribute('role', 'alert');
      banner.setAttribute('aria-live', 'assertive');
      banner.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
        Sem conexão — alterações não serão salvas.`;
      document.body.appendChild(banner);
    };
    const hide = () => { banner?.remove(); banner = null; };
    if (!navigator.onLine) show();
    window.addEventListener('offline', show,  { passive: true });
    window.addEventListener('online',  hide,  { passive: true });
  }

  // V5-6. Battery Status API — aviso bateria baixa ──────────────────────────
  async function initBatteryWarning() {
    if (!('getBattery' in navigator)) return;
    try {
      const bat = await navigator.getBattery();
      const check = () => {
        const low = !bat.charging && bat.level < 0.15;
        const el  = document.getElementById('v5-battery-warn');
        if (low && !el) {
          const div = document.createElement('div');
          div.id = 'v5-battery-warn';
          div.setAttribute('role', 'status');
          div.setAttribute('aria-live', 'polite');
          div.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="var(--gold)" stroke-width="1.8" aria-hidden="true">
              <rect x="2" y="7" width="18" height="11" rx="2" ry="2"/>
              <line x1="22" y1="11" x2="22" y2="13"/>
            </svg>
            Bateria ${Math.round(bat.level * 100)}% — salve o rascunho.
            <button type="button" id="v5-battery-dismiss" aria-label="Dispensar aviso">×</button>`;
          document.body.appendChild(div);
          document.getElementById('v5-battery-dismiss')?.addEventListener('click', () => div.remove());
        } else if (!low && el) {
          el.remove();
        }
      };
      bat.addEventListener('levelchange',    check, { passive: true });
      bat.addEventListener('chargingchange', check, { passive: true });
      check();
    } catch (_) {}
  }

  // V5-7. Notification API — notificar ao salvar fase ───────────────────────
  function initSaveNotification() {
    if (!('Notification' in window)) return;
    let granted = Notification.permission === 'granted';
    const form  = document.getElementById('fase-form');
    if (!form) return;
    form.addEventListener('focusin', async () => {
      if (Notification.permission === 'default') {
        try { granted = (await Notification.requestPermission()) === 'granted'; } catch (_) {}
      }
    }, { once: true, passive: true });
    form.addEventListener('submit', () => {
      setTimeout(() => {
        if (!form.querySelector('.form-message.error.visible') && granted) {
          try {
            new Notification('ERG 360 — Fase salva', {
              body: 'A fase foi salva com sucesso.',
              icon: '/favicon.png',
              tag:  'fase-salva',
              silent: true,
            });
          } catch (_) {}
        }
      }, 2000);
    });
  }

  // V5-8. Page Visibility stale-reload — recarrega lista após 3 min oculta ──
  // Complemento ao V4-7 (que apenas sinaliza pausa); este efetivamente recarrega.
  function initVisibilityReload() {
    let hiddenAt = null;
    const STALE  = 3 * 60 * 1000;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > STALE) {
        const lista = document.getElementById('view-lista');
        if (lista && lista.style.display !== 'none') {
          window._adminFasesExtras?.loadFasesExtras?.();
        }
        hiddenAt = null;
      }
    }, { passive: true });
  }

  // V5-9. Performance API — marca tempos de operações críticas ──────────────
  function initPerformanceMarks() {
    if (!window.performance?.mark) return;
    const ext = window._adminFasesExtras;
    if (ext?.loadFasesExtras) {
      const orig = ext.loadFasesExtras;
      ext.loadFasesExtras = async function () {
        performance.mark('adminFases:loadStart');
        const r = await orig.apply(this, arguments);
        performance.mark('adminFases:loadEnd');
        try { performance.measure('adminFases:load', 'adminFases:loadStart', 'adminFases:loadEnd'); } catch (_) {}
        return r;
      };
    }
    const form = document.getElementById('fase-form');
    if (form) form.addEventListener('submit', () => performance.mark('adminFases:submitStart'));
  }

  // V5-10. Network Information API — reduz animações em conexão lenta ────────
  function initNetworkAdaptation() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    const SLOW = new Set(['slow-2g', '2g']);
    const apply = () => {
      const slow = SLOW.has(conn.effectiveType);
      document.body.classList.toggle('v5-slow-connection', slow);
      if (slow && !document.getElementById('v5-slow-banner')) {
        const el = document.createElement('div');
        el.id = 'v5-slow-banner';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.textContent = 'Conexão lenta — animações reduzidas.';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
      }
    };
    conn.addEventListener('change', apply, { passive: true });
    apply();
  }

  // ── Init V5 ───────────────────────────────────────────────────────────────
  function initV5() {
    initWakeLock();
    injectShareButton();
    enrichCardsWithCopyBtn();
    initVibration();
    initOfflineBanner();
    initBatteryWarning();
    initSaveNotification();
    initVisibilityReload();
    initPerformanceMarks();
    initNetworkAdaptation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV5);
  } else {
    initV5();
  }
})();

// ═══ POLIMENTO V6 ═══
// 10 melhorias de gamificação — streak diário, confetti canvas, AudioContext feedback,
// badge "Primeira Fase", XP system, level badge, milestone toasts,
// visual de fase concluída, badge "plano 100%", combo de saves por sessão.
// Não duplica: vibration (V5-4), aria-live/assertive (V1/V3), toast patch (V1),
//              performance marks (V5-9), offline/battery banners (V5-5/6).

(function () {
  'use strict';

  const NS  = 'v6';
  const LSK = {
    streak:    `${NS}_streak`,
    streakDay: `${NS}_streak_day`,
    xp:        `${NS}_xp`,
    badges:    `${NS}_badges`,
  };

  function lsGet(key, def) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : def; } catch(_) { return def; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(_) {}
  }
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // ── V6-1. Streak de uso diário ─────────────────────────────────────────────
  function initStreak() {
    const last    = lsGet(LSK.streakDay, null);
    const current = lsGet(LSK.streak, 0);
    const today   = todayStr();
    let streak    = current;

    if (!last) {
      streak = 1;
    } else {
      const diff = Math.round((new Date(today) - new Date(last)) / 86400000);
      if (diff === 0) {
        streak = current;
      } else if (diff === 1) {
        streak = current + 1;
      } else {
        streak = 1;
      }
    }

    lsSet(LSK.streakDay, today);
    lsSet(LSK.streak, streak);

    if (streak >= 2) renderStreakBadge(streak);
  }

  function renderStreakBadge(count) {
    if (document.getElementById('v6-streak-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'v6-streak-badge';
    badge.setAttribute('title', `${count} dias consecutivos de acesso`);
    badge.setAttribute('aria-label', `Sequência: ${count} dias`);
    badge.setAttribute('role', 'status');
    badge.innerHTML = `
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M12 2c0 0-4 5.5-4 10a4 4 0 0 0 8 0C16 7.5 12 2 12 2z"/>
        <path d="M12 14c0 0 1.5-1.2 1.5-2.5"/>
      </svg>
      <span>${count}</span>`;
    document.body.appendChild(badge);
    requestAnimationFrame(() => badge.classList.add('v6-streak-in'));
  }

  // ── V6-2. Confetti canvas ao salvar ───────────────────────────────────────
  function launchConfetti({ cx = window.innerWidth / 2, cy = window.innerHeight * 0.4, n = 42 } = {}) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'v6-confetti-canvas';
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const COLS = ['#4CB8A0','#2D6A56','#C9A84C','#7DD4C0','#E8C874'];

    const parts = Array.from({ length: n }, () => ({
      x: cx, y: cy,
      vx: (Math.random() - 0.5) * 9,
      vy: -(Math.random() * 7 + 2.5),
      rot: Math.random() * 360,
      rv: (Math.random() - 0.5) * 14,
      w: Math.random() * 5 + 3,
      h: Math.random() * 3 + 2,
      color: COLS[Math.floor(Math.random() * COLS.length)],
      life: 1,
    }));

    let frames = 0;
    (function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      parts.forEach(p => {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.28;
        p.rot += p.rv;
        p.life = Math.max(0, p.life - 0.019);
        if (p.life <= 0) return;
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (alive && ++frames < 220) requestAnimationFrame(draw);
      else canvas.remove();
    })();
  }

  // ── V6-3. AudioContext feedback sutil ─────────────────────────────────────
  let audioCtx = null;

  function getACtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(_) { return null; }
    }
    return audioCtx;
  }

  function playTone({ f1 = 440, f2, dur = 0.18, vol = 0.055, type = 'sine' } = {}) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = getACtx();
    if (!ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(f1, ctx.currentTime);
      if (f2) osc.frequency.linearRampToValueAtTime(f2, ctx.currentTime + dur * 0.65);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur + 0.05);
    } catch(_) {}
  }

  function initAudioFeedback() {
    const form = document.getElementById('fase-form');
    if (form) {
      form.addEventListener('submit', () => {
        setTimeout(() => {
          if (!form.querySelector('.form-message.error.visible')) {
            playTone({ f1: 440, f2: 660, dur: 0.22, vol: 0.05 });
          } else {
            playTone({ f1: 220, dur: 0.14, vol: 0.04, type: 'triangle' });
          }
        }, 2300);
      });
    }
    document.addEventListener('click', (e) => {
      if (e.target?.id === 'cbox-ok')     playTone({ f1: 520, f2: 440, dur: 0.13, vol: 0.04 });
      if (e.target?.id === 'cbox-cancel') playTone({ f1: 300, dur: 0.09, vol: 0.03, type: 'triangle' });
    }, { capture: true, passive: true });
  }

  // ── V6-4. Badge "Primeira Fase" (conquista single-use) ─────────────────────
  function checkFirstFaseBadge() {
    const badges = lsGet(LSK.badges, []);
    if (badges.includes('primeira_fase')) return;
    const fases = window._adminFasesExtrasCache || [];
    if (!fases.length) return;
    lsSet(LSK.badges, [...badges, 'primeira_fase']);
    showAchievement({ title: 'Primeira Fase', desc: 'Plano de tratamento iniciado com sucesso.' });
  }

  function showAchievement({ title, desc }) {
    const el = document.createElement('div');
    el.className = 'v6-achievement';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <svg class="v6-ach-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="var(--gold)" stroke-width="1.5" aria-hidden="true">
        <circle cx="12" cy="8" r="6"/>
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
      </svg>
      <div>
        <p class="v6-ach-title">Conquista: ${title}</p>
        <p class="v6-ach-desc">${desc}</p>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('v6-ach-in'));
    setTimeout(() => {
      el.classList.remove('v6-ach-in');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, 4600);
  }

  // ── V6-5 + V6-6. XP system + level badge ──────────────────────────────────
  const LEVELS = [
    { min: 0,   label: 'Nutri I',   color: 'var(--subtitle)' },
    { min: 50,  label: 'Nutri II',  color: 'var(--detail)' },
    { min: 150, label: 'Nutri III', color: 'var(--accent)' },
    { min: 300, label: 'Expert',    color: 'var(--gold)' },
  ];

  function getLevel(xp) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].min) return LEVELS[i];
    }
    return LEVELS[0];
  }

  function addXP(amount) {
    if (!amount) return;
    const prev = lsGet(LSK.xp, 0);
    const xp   = prev + amount;
    lsSet(LSK.xp, xp);
    showXPGain(xp, amount);
    if (getLevel(prev).label !== getLevel(xp).label) {
      showAchievement({ title: `Nível ${getLevel(xp).label}`, desc: 'Novo nível alcançado — continue!' });
    }
    updateLevelBadge(xp);
  }

  function showXPGain(total, gained) {
    let disp = document.getElementById('v6-xp-display');
    if (!disp) {
      disp = document.createElement('div');
      disp.id = 'v6-xp-display';
      document.body.appendChild(disp);
    }
    disp.setAttribute('aria-label', `XP total: ${total}`);
    disp.innerHTML = `<span class="v6-xp-total">${total} XP</span>
      <span class="v6-xp-gain" aria-hidden="true">+${gained}</span>`;
    disp.classList.remove('v6-xp-pop');
    void disp.offsetWidth;
    disp.classList.add('v6-xp-pop');
  }

  function updateLevelBadge(xp) {
    const lvl = getLevel(xp);
    let badge = document.getElementById('v6-level-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'v6-level-badge';
      badge.setAttribute('role', 'status');
      document.body.appendChild(badge);
    }
    badge.textContent = lvl.label;
    badge.style.setProperty('--v6-lc', lvl.color);
    badge.setAttribute('aria-label', `Nível: ${lvl.label}`);
  }

  function initXPSystem() {
    updateLevelBadge(lsGet(LSK.xp, 0));

    const form = document.getElementById('fase-form');
    if (form) {
      form.addEventListener('submit', () => {
        setTimeout(() => {
          if (!form.querySelector('.form-message.error.visible')) {
            addXP(15);
            updateSessionSaves();
          }
        }, 2450);
      });
    }

    const origEdit = window.editarFase;
    if (typeof origEdit === 'function') {
      window.editarFase = function (...args) {
        addXP(5);
        return origEdit.apply(this, args);
      };
    }
  }

  // ── V6-7. Milestone toasts ao atingir marcos de fases ─────────────────────
  const MILESTONE_MSGS = {
    3:  'Plano com 3 fases — excelente estrutura!',
    5:  'Marco: 5 fases criadas!',
    10: 'Marco: 10 fases — plano avançado!',
    15: 'Plano robusto: 15 fases!',
    20: 'Especialista: 20 fases no plano!',
  };

  function checkMilestones(fases) {
    const n   = fases.length;
    const key = `v6_ms_${n}`;
    if (!MILESTONE_MSGS[n] || lsGet(key, false)) return;
    lsSet(key, true);
    if (window.showToast) window.showToast(MILESTONE_MSGS[n]);
    launchConfetti({ n: 28, cy: window.innerHeight * 0.25 });
  }

  // ── V6-8. Visual de fase concluída nos cards ───────────────────────────────
  function initFaseConcluidaVisual() {
    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper) return;

    function tagCards() {
      wrapper.querySelectorAll('[data-v3-card]:not([data-v6-tagged])').forEach(card => {
        card.setAttribute('data-v6-tagged', '');
        const rawText = (card.textContent || '').toLowerCase();
        if (rawText.includes('conclu')) card.setAttribute('data-v6-done', '');
      });
    }

    new MutationObserver(tagCards).observe(wrapper, { childList: true, subtree: false });
    tagCards();
  }

  // ── V6-9. Badge "plano 100% concluído" ────────────────────────────────────
  function checkPlanoConcluido(fases) {
    const el = document.getElementById('v6-plan-done');
    if (!fases.length) return;
    const allDone = fases.every(f =>
      f.status === 'concluida' || f.status === 'concluída' || f.status === 'concluido'
    );

    if (allDone && !el) {
      const badge = document.createElement('div');
      badge.id = 'v6-plan-done';
      badge.setAttribute('role', 'status');
      badge.setAttribute('aria-live', 'polite');
      badge.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="var(--gold)" stroke-width="1.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Plano 100% concluído`;
      const kpis = document.getElementById('kpis-fases');
      if (kpis) kpis.after(badge);

      const msKey = `v6_plan_done_${fases.length}`;
      if (!lsGet(msKey, false)) {
        lsSet(msKey, true);
        setTimeout(() => launchConfetti({ n: 65 }), 450);
      }
    } else if (!allDone && el) {
      el.remove();
    }
  }

  // ── V6-10. Combo de saves por sessão ──────────────────────────────────────
  function updateSessionSaves() {
    const prev = parseInt(sessionStorage.getItem('v6_ssaves') || '0');
    const next = prev + 1;
    sessionStorage.setItem('v6_ssaves', String(next));
    if (next === 2) {
      if (window.showToast) window.showToast('Bom ritmo — 2 fases salvas nesta sessão!');
    } else if (next >= 3 && next % 3 === 0) {
      if (window.showToast) window.showToast(`${next} fases salvas — sequência incrível!`);
      launchConfetti({ n: 22, cy: window.innerHeight * 0.5 });
    }
  }

  // ── Patch loadFasesExtras: pós-carga executa checks de gamificação ─────────
  function patchLoadForGamification() {
    const ext = window._adminFasesExtras;
    if (!ext?.loadFasesExtras) return;
    const orig = ext.loadFasesExtras;
    ext.loadFasesExtras = async function () {
      const r = await orig.apply(this, arguments);
      const fases = window._adminFasesExtrasCache || [];
      checkMilestones(fases);
      checkPlanoConcluido(fases);
      checkFirstFaseBadge();
      initFaseConcluidaVisual();
      return r;
    };
  }

  // ── Init V6 ────────────────────────────────────────────────────────────────
  function initV6() {
    initStreak();
    initAudioFeedback();
    initXPSystem();
    initFaseConcluidaVisual();
    patchLoadForGamification();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV6);
  } else {
    initV6();
  }
})();

// ═══ POLIMENTO V7 ═══
// 10 melhorias de telemetria local — feature tracking, heatmap de cliques,
// session duration, focus frequency map, view switch counter, form abandonment,
// completion timing, error heatmap, painel de telemetria com export + clear, idle tracker.
// NÃO duplica: streak/XP/badges (V6), performance marks (V5-9),
//              sessionStorage cache (V4-6), page visibility guards (V4-7/V5-8).

(function () {
  'use strict';

  const NS   = 'v7_tel';
  const KEYS = {
    features:    `${NS}_features`,
    heatmap:     `${NS}_heatmap`,
    sessionTime: `${NS}_sestime`,
    focusMap:    `${NS}_focusmap`,
    viewSwitches:`${NS}_vsw`,
    abandonments:`${NS}_aband`,
    timing:      `${NS}_timing`,
    errorHeat:   `${NS}_errheat`,
    idleTotal:   `${NS}_idle_total`,
    idleCount:   `${NS}_idle_count`,
  };

  function telGet(key, def) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : def; } catch(_) { return def; }
  }
  function telSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(_) {}
  }

  // ── V7-1. Feature usage tracker ───────────────────────────────────────────
  function trackFeature(id) {
    const map = telGet(KEYS.features, {});
    map[id] = (map[id] || 0) + 1;
    telSet(KEYS.features, map);
  }

  function initFeatureTracker() {
    document.addEventListener('click', (e) => {
      const t = e.target?.closest('button,a') || e.target;
      if (!t) return;
      if (t.id === 'v5-share-btn'  || t.closest('#v5-share-btn'))  trackFeature('share');
      if (t.classList.contains('v5-copy-btn') || t.closest('.v5-copy-btn')) trackFeature('copy_fase');
      if (t.id === 'v4-restore-btn') trackFeature('draft_restore');
      if (t.id === 'v4-discard-btn') trackFeature('draft_discard');
      if (t.id === 'cbox-ok')        trackFeature('confirm_ok');
      if (t.id === 'cbox-cancel')    trackFeature('confirm_cancel');
    }, { capture: true, passive: true });

    window.addEventListener('keydown', (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'n' || e.key === 'N') trackFeature('shortcut_nova');
      if (e.key === 'l' || e.key === 'L') trackFeature('shortcut_lista');
    }, { passive: true });
  }

  // ── V7-2. Heatmap de cliques (grid 20×20) ─────────────────────────────────
  function initHeatmap() {
    const main = document.querySelector('.main-content');
    if (!main) return;
    main.addEventListener('click', (e) => {
      const rect  = main.getBoundingClientRect();
      const scrollH = main.scrollHeight || 1;
      const xCell = Math.min(19, Math.floor(((e.clientX - rect.left) / rect.width) * 20));
      const yCell = Math.min(19, Math.floor(((e.clientY - rect.top + main.scrollTop) / scrollH) * 20));
      const map = telGet(KEYS.heatmap, {});
      const k   = `${xCell}_${yCell}`;
      map[k] = (map[k] || 0) + 1;
      telSet(KEYS.heatmap, map);
    }, { passive: true });
  }

  // ── V7-3. Session duration accumulator ────────────────────────────────────
  let _sessionStart = Date.now();

  function _flushSession() {
    const elapsed = Date.now() - _sessionStart;
    if (elapsed < 2000) return;
    const d = telGet(KEYS.sessionTime, { total: 0, sessions: 0 });
    d.total    += elapsed;
    d.sessions += 1;
    telSet(KEYS.sessionTime, d);
    _sessionStart = Date.now();
  }

  function initSessionTimer() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) _flushSession();
      else _sessionStart = Date.now();
    }, { passive: true });
    window.addEventListener('pagehide', _flushSession, { passive: true });
  }

  // ── V7-4. Focus frequency map + hot-dot visual ────────────────────────────
  const TRACK_FIELDS = [
    'f-nome','f-ordem','f-status','f-duracao','f-inicio',
    'f-objetivo-clinico','f-meta-peso','f-objetivo','f-descricao',
    'f-dicas','f-calorias','f-proteina','f-carboidrato','f-gordura',
    'f-restricoes','f-permitidos',
  ];

  function initFocusFrequency() {
    TRACK_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('focus', () => {
        const map = telGet(KEYS.focusMap, {});
        map[id] = (map[id] || 0) + 1;
        telSet(KEYS.focusMap, map);
      }, { passive: true });
    });
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 1800));
    ric(markHotFields);
  }

  function markHotFields() {
    const map     = telGet(KEYS.focusMap, {});
    const entries = Object.entries(map);
    if (entries.length < 4) return;
    const avg = entries.reduce((s, [, v]) => s + v, 0) / entries.length;
    entries.filter(([, v]) => v > avg * 2.5).forEach(([id]) => {
      const el = document.getElementById(id);
      if (!el || el.getAttribute('data-v7-hot')) return;
      el.setAttribute('data-v7-hot', '');
      const label = document.querySelector(`label[for="${id}"]`);
      if (label && !label.querySelector('.v7-hot-dot')) {
        const dot = document.createElement('span');
        dot.className = 'v7-hot-dot';
        dot.setAttribute('title', 'Campo frequentemente revisitado');
        dot.setAttribute('aria-hidden', 'true');
        label.appendChild(dot);
      }
    });
  }

  // ── V7-5 + V7-6. View switch counter + form abandonment (patch único) ─────
  let _formDirtyV7  = false;
  let _formSubmitV7 = false;
  let _lastSwitch   = null;
  let _switchSession = 0;

  function patchShowViewForTelemetry() {
    const orig = window.showView;
    if (!orig || orig._v7patched) return;

    document.addEventListener('input', (e) => {
      if (e.target?.closest('#fase-form')) _formDirtyV7 = true;
    }, { passive: true });

    const form = document.getElementById('fase-form');
    if (form) form.addEventListener('submit', () => { _formSubmitV7 = true; }, { passive: true });

    window.showView = function (view) {
      // V7-5: contagem de trocas de view
      const now = Date.now();
      const d   = telGet(KEYS.viewSwitches, { count: 0, hesitations: 0 });
      d.count += 1;
      _switchSession += 1;
      if (_lastSwitch && (now - _lastSwitch) < 3000) d.hesitations += 1;
      _lastSwitch = now;
      telSet(KEYS.viewSwitches, d);

      if (_switchSession >= 5 && _switchSession % 5 === 0) {
        const live = document.getElementById('extras-aria-live');
        if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = 'Dica: Alt+N e Alt+L para navegar rapidamente.'; }); }
      }

      // V7-6: detecção de abandono de formulário
      if (view === 'lista' && _formDirtyV7 && !_formSubmitV7) {
        telSet(KEYS.abandonments, telGet(KEYS.abandonments, 0) + 1);
      }
      if (view === 'nova') { _formDirtyV7 = false; _formSubmitV7 = false; }

      return orig.apply(this, arguments);
    };
    window.showView._v7patched = true;
  }

  // ── V7-7. Completion timing ────────────────────────────────────────────────
  let _formStart = null;

  function initCompletionTiming() {
    const form = document.getElementById('fase-form');
    if (!form) return;
    form.addEventListener('input', () => { if (!_formStart) _formStart = Date.now(); }, { passive: true });
    form.addEventListener('submit', () => {
      if (!_formStart) return;
      setTimeout(() => {
        if (form.querySelector('.form-message.error.visible')) { _formStart = null; return; }
        const elapsed = Date.now() - _formStart;
        const d = telGet(KEYS.timing, { samples: [], avg: 0 });
        d.samples.push(elapsed);
        if (d.samples.length > 20) d.samples.shift();
        d.avg = Math.round(d.samples.reduce((s, v) => s + v, 0) / d.samples.length);
        telSet(KEYS.timing, d);
        _formStart = null;
      }, 2600);
    });
  }

  // ── V7-8. Error heatmap por campo ─────────────────────────────────────────
  function initErrorHeatmap() {
    const form = document.getElementById('fase-form');
    if (!form) return;
    form.addEventListener('focusout', (e) => {
      const field = e.target;
      if (!field?.classList.contains('field-error')) return;
      const map = telGet(KEYS.errorHeat, {});
      map[field.id] = (map[field.id] || 0) + 1;
      telSet(KEYS.errorHeat, map);
    }, { passive: true });
  }

  // ── V7-9. Painel de telemetria ────────────────────────────────────────────
  function buildTelPanel() {
    if (document.getElementById('v7-tel-panel')) return;

    const features    = telGet(KEYS.features,    {});
    const sesTime     = telGet(KEYS.sessionTime, { total: 0, sessions: 0 });
    const viewSw      = telGet(KEYS.viewSwitches,{ count: 0, hesitations: 0 });
    const aband       = telGet(KEYS.abandonments, 0);
    const timing      = telGet(KEYS.timing,      { avg: 0, samples: [] });
    const errorHeat   = telGet(KEYS.errorHeat,   {});
    const focusMap    = telGet(KEYS.focusMap,     {});
    const idleCt      = telGet(KEYS.idleCount,    0);

    const totalMins = Math.round(sesTime.total / 60000);
    const topFeat   = Object.entries(features).sort(([,a],[,b]) => b-a).slice(0,3);
    const topErrors = Object.entries(errorHeat).sort(([,a],[,b]) => b-a).slice(0,3);
    const topFocus  = Object.entries(focusMap).sort(([,a],[,b]) => b-a).slice(0,3);

    const featHtml = topFeat.length
      ? `<p class="v7-section-lbl">Features mais usadas</p><ul class="v7-stat-list">${topFeat.map(([k,v])=>`<li><span>${k.replace(/_/g,' ')}</span><strong>${v}×</strong></li>`).join('')}</ul>`
      : '';
    const errHtml = topErrors.length
      ? `<p class="v7-section-lbl">Campos com mais erros</p><ul class="v7-stat-list">${topErrors.map(([k,v])=>`<li><span>${k}</span><strong>${v}×</strong></li>`).join('')}</ul>`
      : '';
    const focHtml = topFocus.length
      ? `<p class="v7-section-lbl">Campos mais focados</p><ul class="v7-stat-list">${topFocus.map(([k,v])=>`<li><span>${k}</span><strong>${v}×</strong></li>`).join('')}</ul>`
      : '';

    const panel = document.createElement('div');
    panel.id = 'v7-tel-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'v7-tel-title');
    panel.innerHTML = `
      <div id="v7-tel-inner" role="document">
        <div id="v7-tel-hdr">
          <h2 id="v7-tel-title">Telemetria Local</h2>
          <button id="v7-tel-close" type="button" aria-label="Fechar painel">&#215;</button>
        </div>
        <p id="v7-tel-caption">Dados armazenados apenas neste dispositivo. Nenhum envio a servidores.</p>
        <div id="v7-tel-grid">
          <div class="v7-stat"><strong>${totalMins}</strong><span>min de uso</span></div>
          <div class="v7-stat"><strong>${sesTime.sessions}</strong><span>sessões</span></div>
          <div class="v7-stat"><strong>${viewSw.count}</strong><span>trocas de view</span></div>
          <div class="v7-stat"><strong>${aband}</strong><span>formu. abandonados</span></div>
          <div class="v7-stat"><strong>${timing.avg > 0 ? Math.round(timing.avg/1000)+'s' : '—'}</strong><span>tempo médio form</span></div>
          <div class="v7-stat"><strong>${idleCt}</strong><span>inatividd. detectadas</span></div>
        </div>
        ${featHtml}${errHtml}${focHtml}
        <div id="v7-tel-btns">
          <button id="v7-tel-export" type="button">Exportar JSON</button>
          <button id="v7-tel-clear"  type="button">Limpar dados</button>
        </div>
      </div>`;

    document.body.appendChild(panel);
    requestAnimationFrame(() => panel.classList.add('v7-tel-visible'));

    const close = () => {
      panel.classList.remove('v7-tel-visible');
      panel.addEventListener('transitionend', () => panel.remove(), { once: true });
      document.getElementById('v7-tel-trigger')?.focus();
    };
    panel.querySelector('#v7-tel-close').addEventListener('click', close);
    panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const focusable = Array.from(panel.querySelectorAll('button'));
        const idx = focusable.indexOf(document.activeElement);
        if (idx === -1) return;
        const next = e.shiftKey ? focusable[idx-1] || focusable[focusable.length-1] : focusable[idx+1] || focusable[0];
        e.preventDefault(); next.focus();
      }
    });
    panel.querySelector('#v7-tel-export').addEventListener('click', exportTelemetria);
    panel.querySelector('#v7-tel-clear').addEventListener('click', () => { clearTelemetria(); close(); });
    panel.querySelector('#v7-tel-close').focus();
  }

  function injectTelTrigger() {
    if (document.getElementById('v7-tel-trigger')) return;
    const btn = document.createElement('button');
    btn.id   = 'v7-tel-trigger';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Abrir painel de telemetria de uso');
    btn.setAttribute('title', 'Telemetria de uso (local)');
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>`;
    btn.addEventListener('click', buildTelPanel);

    const anchor = document.querySelector('.admin-back-top') || document.querySelector('.main-content');
    if (anchor) anchor.appendChild(btn);
    else document.body.appendChild(btn);
  }

  // ── V7-10. Export JSON ────────────────────────────────────────────────────
  function exportTelemetria() {
    const payload = {
      exportedAt:   new Date().toISOString(),
      features:     telGet(KEYS.features,    {}),
      sessionTime:  telGet(KEYS.sessionTime, {}),
      viewSwitches: telGet(KEYS.viewSwitches,{}),
      abandonments: telGet(KEYS.abandonments, 0),
      timing:       telGet(KEYS.timing,      {}),
      errorHeat:    telGet(KEYS.errorHeat,   {}),
      focusMap:     telGet(KEYS.focusMap,    {}),
      heatmapCells: Object.keys(telGet(KEYS.heatmap, {})).length,
      idleCount:    telGet(KEYS.idleCount,    0),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `erg360-telemetria-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // ── V7-11. Idle tracker ────────────────────────────────────────────────────
  const IDLE_THRESHOLD = 2 * 60 * 1000;
  let _idleTimer = null;

  function _onActive() {
    clearTimeout(_idleTimer);
    _idleTimer = setTimeout(() => {
      telSet(KEYS.idleTotal, telGet(KEYS.idleTotal, 0) + IDLE_THRESHOLD);
      telSet(KEYS.idleCount, telGet(KEYS.idleCount, 0) + 1);
    }, IDLE_THRESHOLD);
  }

  function initIdleTracker() {
    ['mousemove','keydown','click','scroll','touchstart'].forEach(ev => {
      document.addEventListener(ev, _onActive, { passive: true });
    });
    _onActive();
  }

  // ── V7-12. Clear telemetria ────────────────────────────────────────────────
  function clearTelemetria() {
    Object.values(KEYS).forEach(k => { try { localStorage.removeItem(k); } catch(_) {} });
    if (window.showToast) window.showToast('Dados de telemetria apagados.');
    const live = document.getElementById('extras-aria-live');
    if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = 'Dados de telemetria apagados.'; }); }
  }

  // ── Init V7 ────────────────────────────────────────────────────────────────
  function initV7() {
    initFeatureTracker();
    initHeatmap();
    initSessionTimer();
    initFocusFrequency();
    patchShowViewForTelemetry();
    initCompletionTiming();
    initErrorHeatmap();
    injectTelTrigger();
    initIdleTracker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV7);
  } else {
    initV7();
  }
})();

// ═══ POLIMENTO V8 ═══
// 10 modos especiais: persistência (V8-1), foco profundo Alt+F (V8-2),
// alto contraste Alt+C (V8-3), leitura Alt+R (V8-4), HUD flutuante (V8-5),
// mode switcher Alt+M (V8-6), font scale +/- (V8-7), sleep mode 20min (V8-8),
// print trigger (V8-9), ARIA announcements por modo (V8-10).
// NÃO duplica: Wake Lock/Share/Vibration (V5), idle/telemetria (V7),
//              streaks/confetti (V6), sessionStorage/debounce (V4),
//              ARIA live region (V3), ripples/hover (V2).

(function () {
  'use strict';

  const V8_KEY   = 'v8_modes';
  const SLEEP_MS = 20 * 60 * 1000; // 20 min de inatividade

  // ── V8-1. Estado dos modos + persistência local ───────────────────────────
  const modes = { focus: false, contrast: false, reading: false, font: 16 };

  function loadModes() {
    try {
      const s = JSON.parse(localStorage.getItem(V8_KEY) || '{}');
      if (typeof s.focus    === 'boolean') modes.focus    = s.focus;
      if (typeof s.contrast === 'boolean') modes.contrast = s.contrast;
      if (typeof s.reading  === 'boolean') modes.reading  = s.reading;
      if (typeof s.font     === 'number')  modes.font     = Math.min(22, Math.max(14, s.font));
    } catch (_) {}
  }

  function saveModes() {
    try { localStorage.setItem(V8_KEY, JSON.stringify(modes)); } catch (_) {}
  }

  function applyModes() {
    document.body.classList.toggle('v8-focus',    modes.focus);
    document.body.classList.toggle('v8-contrast', modes.contrast);
    document.body.classList.toggle('v8-reading',  modes.reading);
    document.documentElement.style.setProperty('--v8-font', modes.font + 'px');
    updateHUD();
    syncSwitcherButtons();
  }

  // ── V8-2. Toggle de modo + anúncio ARIA (region já existe de V3) ─────────
  const MODE_LABELS = { focus: 'Foco Profundo', contrast: 'Alto Contraste', reading: 'Leitura' };

  function toggleMode(m) {
    modes[m] = !modes[m];
    saveModes();
    applyModes();
    const live = document.getElementById('extras-aria-live');
    if (live) {
      live.textContent = '';
      requestAnimationFrame(() => {
        live.textContent = `Modo ${MODE_LABELS[m]} ${modes[m] ? 'ativado' : 'desativado'}.`;
      });
    }
  }

  // ── V8-3. Atalhos de teclado para modos (Alt+F/C/R/M) ────────────────────
  // Alt+N e Alt+L já usados por V3 para showView — sem conflito.
  function initModeShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === 'f') { e.preventDefault(); toggleMode('focus');    return; }
      if (k === 'c') { e.preventDefault(); toggleMode('contrast'); return; }
      if (k === 'r') { e.preventDefault(); toggleMode('reading');  return; }
      if (k === 'm') { e.preventDefault(); toggleModeSwitcher();   return; }
    });
  }

  // ── V8-4. Font scale ──────────────────────────────────────────────────────
  function adjustFont(delta) {
    modes.font = Math.min(22, Math.max(14, modes.font + delta));
    saveModes();
    applyModes();
    const el = document.getElementById('v8-font-val');
    if (el) el.textContent = modes.font + 'px';
  }

  // ── V8-5. HUD flutuante (pill bottom-right) ───────────────────────────────
  function buildHUD() {
    if (document.getElementById('v8-hud')) return;
    const hud = document.createElement('div');
    hud.id = 'v8-hud';
    hud.innerHTML = `
      <button id="v8-hud-btn" type="button"
        aria-label="Modos especiais (Alt+M)" title="Modos especiais (Alt+M)"
        aria-haspopup="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        </svg>
        <span id="v8-hud-dots" aria-hidden="true"></span>
      </button>`;
    document.body.appendChild(hud);
    document.getElementById('v8-hud-btn').addEventListener('click', toggleModeSwitcher);
    updateHUD();
  }

  function updateHUD() {
    const dots = document.getElementById('v8-hud-dots');
    if (!dots) return;
    const active = [
      modes.focus    && '◉',
      modes.contrast && '◑',
      modes.reading  && '◎',
    ].filter(Boolean);
    dots.textContent = active.join('');
    const hud = document.getElementById('v8-hud');
    if (hud) hud.classList.toggle('v8-hud-on', active.length > 0);
  }

  // ── V8-6. Mode Switcher (popover acima do HUD) ────────────────────────────
  let _swOpen = false;

  function toggleModeSwitcher() { _swOpen ? closeModeSwitcher() : openModeSwitcher(); }

  function openModeSwitcher() {
    if (document.getElementById('v8-sw')) return;
    _swOpen = true;
    const sw = document.createElement('div');
    sw.id = 'v8-sw';
    sw.setAttribute('role', 'dialog');
    sw.setAttribute('aria-label', 'Modos especiais');
    sw.innerHTML = `
      <div id="v8-sw-hdr">
        <span id="v8-sw-ttl">Modos especiais</span>
        <button id="v8-sw-x" type="button" aria-label="Fechar">&#215;</button>
      </div>
      <div id="v8-sw-list" role="group" aria-label="Ativar ou desativar modos">
        <button class="v8-mbtn${modes.focus    ? ' v8-mon' : ''}" data-m="focus"    type="button" aria-pressed="${modes.focus}"   >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 5v2M12 17v2M5 12H3M21 12h-2M7.05 7.05l-1.41-1.41M18.36 18.36l-1.41-1.41M7.05 16.95l-1.41 1.41M18.36 5.64l-1.41 1.41"/></svg>
          <span>Foco Profundo</span><kbd>Alt+F</kbd>
        </button>
        <button class="v8-mbtn${modes.contrast ? ' v8-mon' : ''}" data-m="contrast" type="button" aria-pressed="${modes.contrast}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20V2z" fill="currentColor"/></svg>
          <span>Alto Contraste</span><kbd>Alt+C</kbd>
        </button>
        <button class="v8-mbtn${modes.reading  ? ' v8-mon' : ''}" data-m="reading"  type="button" aria-pressed="${modes.reading}" >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <span>Modo Leitura</span><kbd>Alt+R</kbd>
        </button>
      </div>
      <div id="v8-sw-font" role="group" aria-labelledby="v8-font-lbl">
        <span id="v8-font-lbl" class="v8-sw-lbl">Tamanho do texto</span>
        <div id="v8-font-ctrl">
          <button class="v8-font-btn" id="v8-font-d" type="button" aria-label="Reduzir fonte">A−</button>
          <output id="v8-font-val" aria-live="polite">${modes.font}px</output>
          <button class="v8-font-btn" id="v8-font-i" type="button" aria-label="Aumentar fonte">A+</button>
        </div>
      </div>
      <button id="v8-print" type="button">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Imprimir
      </button>`;
    const hud = document.getElementById('v8-hud') || document.body;
    hud.appendChild(sw);
    requestAnimationFrame(() => sw.classList.add('v8-sw-on'));
    sw.querySelector('#v8-sw-x').addEventListener('click', closeModeSwitcher);
    sw.querySelectorAll('.v8-mbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleMode(btn.dataset.m);
        btn.classList.toggle('v8-mon', modes[btn.dataset.m]);
        btn.setAttribute('aria-pressed', String(modes[btn.dataset.m]));
      });
    });
    sw.querySelector('#v8-font-d').addEventListener('click', () => adjustFont(-2));
    sw.querySelector('#v8-font-i').addEventListener('click', () => adjustFont(+2));
    sw.querySelector('#v8-print').addEventListener('click', () => { closeModeSwitcher(); triggerPrint(); });
    sw.querySelector('#v8-sw-x').focus();
    document.addEventListener('keydown', _onSwKey);
    setTimeout(() => document.addEventListener('click', _onSwOutside, { capture: true }), 0);
  }

  function syncSwitcherButtons() {
    ['focus', 'contrast', 'reading'].forEach(m => {
      const btn = document.querySelector(`.v8-mbtn[data-m="${m}"]`);
      if (!btn) return;
      btn.classList.toggle('v8-mon', modes[m]);
      btn.setAttribute('aria-pressed', String(modes[m]));
    });
  }

  function closeModeSwitcher() {
    _swOpen = false;
    const sw = document.getElementById('v8-sw');
    if (!sw) return;
    sw.classList.remove('v8-sw-on');
    sw.addEventListener('transitionend', () => sw.remove(), { once: true });
    document.removeEventListener('keydown', _onSwKey);
    document.removeEventListener('click', _onSwOutside, { capture: true });
    document.getElementById('v8-hud-btn')?.focus();
  }

  function _onSwKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeModeSwitcher(); }
  }

  function _onSwOutside(e) {
    const sw  = document.getElementById('v8-sw');
    const hud = document.getElementById('v8-hud');
    if (sw && !sw.contains(e.target) && !(hud && hud.contains(e.target))) closeModeSwitcher();
  }

  // ── V8-7. Font scale via CSS custom property ──────────────────────────────
  // Aplicado via --v8-font em applyModes(); CSS usa em .main-content.v8-reading.

  // ── V8-8. Sleep mode (overlay após 20min idle) ────────────────────────────
  let _sleepTimer = null;
  let _sleeping   = false;

  function _resetSleep() {
    if (_sleeping) return;
    clearTimeout(_sleepTimer);
    _sleepTimer = setTimeout(_activateSleep, SLEEP_MS);
  }

  function _activateSleep() {
    if (_sleeping || document.hidden) return;
    _sleeping = true;
    const ov = document.createElement('div');
    ov.id = 'v8-sleep';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Modo repouso ativo. Clique ou pressione uma tecla para retomar.');
    ov.innerHTML = `
      <div id="v8-sleep-body">
        <div id="v8-sleep-clock"></div>
        <p id="v8-sleep-hint">Toque ou pressione qualquer tecla para retomar</p>
      </div>`;
    document.body.appendChild(ov);
    _tickClock();
    requestAnimationFrame(() => ov.classList.add('v8-sleep-on'));
    const tick = setInterval(() => { if (!_sleeping) { clearInterval(tick); return; } _tickClock(); }, 10000);
    const _wake = () => _deactivateSleep(tick);
    ov.addEventListener('click', _wake, { once: true });
    document.addEventListener('keydown', _wake, { once: true });
    document.addEventListener('touchstart', _wake, { once: true, passive: true });
  }

  function _tickClock() {
    const el = document.getElementById('v8-sleep-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function _deactivateSleep(interval) {
    _sleeping = false;
    clearInterval(interval);
    const ov = document.getElementById('v8-sleep');
    if (!ov) return;
    ov.classList.remove('v8-sleep-on');
    ov.addEventListener('transitionend', () => ov.remove(), { once: true });
    _resetSleep();
  }

  function initSleepMode() {
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(ev => {
      document.addEventListener(ev, _resetSleep, { passive: true });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearTimeout(_sleepTimer);
      else if (!_sleeping) _resetSleep();
    });
    _resetSleep();
  }

  // ── V8-9. Print trigger ────────────────────────────────────────────────────
  function triggerPrint() {
    document.body.classList.add('v8-printing');
    window.print();
    window.addEventListener('afterprint', () => document.body.classList.remove('v8-printing'), { once: true });
  }

  // ── Init V8 ────────────────────────────────────────────────────────────────
  function initV8() {
    loadModes();
    applyModes();
    buildHUD();
    initModeShortcuts();
    initSleepMode();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV8);
  } else {
    initV8();
  }
})();
