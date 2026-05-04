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
