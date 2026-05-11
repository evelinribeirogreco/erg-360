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


// ═══ POLIMENTO V2 ═══
// 10 micro-interações: ripple, hover cards fase, pulse dot, count-up KPI,
//   macro flash, toast slide, shimmer (CSS), button press, focus glow (CSS), nav indicator
// Não duplica: template-hover (V1), view fade (V1), spinner (V1), dirty indicator (V1).

(function () {
  'use strict';

  // ── V2-1. Ripple em botões via pointerdown ────────────────────────────────
  function installRipples() {
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('button, [role="button"]');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'af-ripple';
      ripple.style.left = (e.clientX - rect.left) + 'px';
      ripple.style.top  = (e.clientY - rect.top)  + 'px';
      if (!btn.style.position || btn.style.position === 'static')
        btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  }

  // ── V2-2. Hover nos cards de fase (left-border + bg) ──────────────────────
  function installPhaseCardHover() {
    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper) return;
    const mo = new MutationObserver(() => {
      // Cards: divs com flex:1 dentro de cada item da timeline
      wrapper.querySelectorAll('[style*="flex:1"][style*="border:1px solid"]:not([data-af-hover])').forEach(card => {
        card.dataset.afHover = '1';
        card.classList.add('af-fase-card-hover');
      });
    });
    mo.observe(wrapper, { childList: true, subtree: true });
  }

  // ── V2-3. Pulso no dot da fase ativa (círculo verde na timeline) ──────────
  function installPhasePulse() {
    const wrapper = document.getElementById('fases-lista-wrapper');
    if (!wrapper) return;
    const mo = new MutationObserver(() => {
      // Dot da fase ativa: div 10×10 dentro de um círculo 40×40
      wrapper.querySelectorAll('[style*="width:10px"][style*="height:10px"][style*="border-radius:50%"]:not([data-af-pulse])').forEach(dot => {
        dot.dataset.afPulse = '1';
        dot.classList.add('af-timeline-pulse');
      });
    });
    mo.observe(wrapper, { childList: true, subtree: true });
  }

  // ── V2-4. Count-up animado nos KPIs ao renderizar ─────────────────────────
  function installKpiCountUp() {
    const kpisEl = document.getElementById('kpis-fases');
    if (!kpisEl) return;
    const mo = new MutationObserver(() => {
      kpisEl.querySelectorAll('[style*="1.6rem"]:not([data-af-counted])').forEach(el => {
        const target = parseInt(el.textContent, 10);
        if (isNaN(target) || target <= 1) return;
        el.dataset.afCounted = '1';
        el.classList.add('af-kpi-flash');
        let started = null;
        const dur = 520;
        (function step(ts) {
          if (!started) started = ts;
          const prog = Math.min((ts - started) / dur, 1);
          const eased = 1 - Math.pow(1 - prog, 3);
          el.textContent = Math.round(eased * target);
          if (prog < 1) requestAnimationFrame(step);
          else { el.textContent = target; el.classList.remove('af-kpi-flash'); }
        })(performance.now());
      });
    });
    mo.observe(kpisEl, { childList: true, subtree: true, characterData: true });
  }

  // ── V2-5. Flash nas % de macro quando input muda ──────────────────────────
  function installMacroFlash() {
    const ids = ['f-calorias', 'f-proteina', 'f-carboidrato', 'f-gordura'];
    const pctIds = ['pct-ptn', 'pct-cho', 'pct-lip'];
    ids.forEach(id => {
      const inp = document.getElementById(id);
      if (!inp) return;
      inp.addEventListener('input', () => {
        pctIds.forEach(pid => {
          const el = document.getElementById(pid);
          if (!el) return;
          el.style.transition = 'color 0.3s ease';
          el.style.color = 'var(--detail)';
          clearTimeout(el._afFlash);
          el._afFlash = setTimeout(() => { el.style.color = ''; }, 650);
        });
      });
    });
  }

  // ── V2-6. Toast — garante classe visible; slide tratado no CSS ────────────
  function installToastSlide() {
    const toast = document.getElementById('toast');
    if (!toast) return;
    // O CSS já gerencia transform/opacity via .visible
    // Aqui garantimos que o estado inicial sem .visible fique correto
    if (!toast.classList.contains('visible')) {
      toast.style.transform = 'translateY(20px)';
      toast.style.opacity   = '0';
    }
    // MutationObserver para limpeza acessível
    const mo = new MutationObserver(() => {
      const live = document.getElementById('extras-aria-live');
      if (live && toast.classList.contains('visible') && toast.textContent) {
        live.textContent = '';
        requestAnimationFrame(() => { live.textContent = toast.textContent; });
      }
    });
    mo.observe(toast, { attributes: true, attributeFilter: ['class'], characterData: true, subtree: true });
  }

  // ── V2-7. Garantir transition nos botões principais (press scale) ─────────
  function installButtonTransitions() {
    document.querySelectorAll('button:not([data-af-trans])').forEach(btn => {
      btn.dataset.afTrans = '1';
      if (!btn.style.transition) {
        btn.style.transitionProperty = 'opacity, transform, color, background, border-color, box-shadow';
        btn.style.transitionDuration  = '0.12s';
        btn.style.transitionTimingFunction = 'ease';
      }
    });
  }

  // ── V2-8. Nav indicator: garante position:relative no .nav-item ───────────
  function installNavIndicator() {
    document.querySelectorAll('.nav-item').forEach(item => {
      if (getComputedStyle(item).position === 'static')
        item.style.position = 'relative';
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    installRipples();            // V2-1
    installPhaseCardHover();     // V2-2
    installPhasePulse();         // V2-3
    installKpiCountUp();         // V2-4
    installMacroFlash();         // V2-5
    installToastSlide();         // V2-6
    // V2-7: skeleton shimmer é CSS puro
    installButtonTransitions();  // V2-8
    // V2-9: focus glow é CSS puro (:focus)
    installNavIndicator();       // V2-10
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 380));
  else
    setTimeout(init, 380);
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

// ═══ POLIMENTO V6 ═══
// 10 melhorias de gamification — XP, streaks, levels, achievements, confetti, sons AudioContext,
//   fase-done visual, plano 100% badge, floating XP gain, hook form submit.
// Não duplica: ripple (V2), toast slide (V2), count-up KPI (V2), aria-live (V1),
//              sessionStorage cache (V4), page visibility (V4).

(function () {
  'use strict';

  const XP_KEY     = 'v6_xp';
  const STREAK_KEY = 'v6_streak';
  const ACH_KEY    = 'v6_ach';
  const TODAY      = new Date().toISOString().slice(0, 10);

  // ── Helpers de persistência ───────────────────────────────────────────────
  function getXP()       { return parseInt(localStorage.getItem(XP_KEY) || '0', 10); }
  function setXP(n)      { try { localStorage.setItem(XP_KEY, String(n)); } catch(_){} }
  function getAchSet()   { try { return new Set(JSON.parse(localStorage.getItem(ACH_KEY) || '[]')); } catch(_){ return new Set(); } }
  function saveAchSet(s) { try { localStorage.setItem(ACH_KEY, JSON.stringify([...s])); } catch(_){} }

  function getStreak() {
    try { return JSON.parse(localStorage.getItem(STREAK_KEY) || 'null') || { count: 0, last: '' }; }
    catch(_) { return { count: 0, last: '' }; }
  }

  function bumpStreak() {
    const s = getStreak();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (s.last === TODAY) return s.count;
    const count = s.last === yesterday ? s.count + 1 : 1;
    try { localStorage.setItem(STREAK_KEY, JSON.stringify({ count, last: TODAY })); } catch(_){}
    return count;
  }

  function xpLevel(xp) {
    if (xp < 30)  return { label: 'Bronze',   color: '#8B5E3C' };
    if (xp < 80)  return { label: 'Prata',    color: '#7D8A9A' };
    if (xp < 180) return { label: 'Ouro',     color: '#C9A84C' };
    if (xp < 350) return { label: 'Platina',  color: '#4CB8A0' };
    return              { label: 'Diamante',  color: '#2D6A56' };
  }

  // ── V6-1. Injetar elementos DOM de gamification ───────────────────────────
  function injectGamificationDOM() {
    if (!document.getElementById('v6-streak-badge')) {
      const badge = document.createElement('div');
      badge.id = 'v6-streak-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.5" aria-hidden="true">
          <path d="M12 2c0 0-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12z"/>
        </svg>
        <span id="v6-streak-val">0</span>
        <span style="font-size:0.52rem;font-weight:400;opacity:0.8"> dias</span>`;
      document.body.appendChild(badge);
    }

    if (!document.getElementById('v6-xp-display')) {
      const xpEl = document.createElement('div');
      xpEl.id = 'v6-xp-display';
      xpEl.setAttribute('aria-hidden', 'true');
      xpEl.innerHTML = `<span class="v6-xp-total" id="v6-xp-val">0 XP</span>`;
      document.body.appendChild(xpEl);
    }

    if (!document.getElementById('v6-level-badge')) {
      const lvl = document.createElement('div');
      lvl.id = 'v6-level-badge';
      lvl.setAttribute('aria-hidden', 'true');
      lvl.textContent = 'Bronze';
      document.body.appendChild(lvl);
    }
  }

  // ── V6-2. Atualizar UI de XP + level ─────────────────────────────────────
  function refreshGamificationUI(xp) {
    const lvl = xpLevel(xp);
    const valEl = document.getElementById('v6-xp-val');
    if (valEl) valEl.textContent = `${xp} XP`;
    const badge = document.getElementById('v6-level-badge');
    if (badge) {
      badge.textContent = lvl.label;
      badge.style.setProperty('--v6-lc', lvl.color);
    }
  }

  // ── V6-3. Streak badge ────────────────────────────────────────────────────
  function showStreakBadge(count) {
    if (count < 2) return;
    const badge  = document.getElementById('v6-streak-badge');
    const valEl  = document.getElementById('v6-streak-val');
    if (!badge || !valEl) return;
    valEl.textContent = count;
    badge.classList.add('v6-streak-in');
    setTimeout(() => badge.classList.remove('v6-streak-in'), 4500);
  }

  // ── V6-4. Ganho de XP com float animado ──────────────────────────────────
  function gainXP(amount, label) {
    const xp = getXP() + amount;
    setXP(xp);
    refreshGamificationUI(xp);
    checkAchievements(xp);

    const display = document.getElementById('v6-xp-display');
    if (!display) return;
    const gain = document.createElement('div');
    gain.className = 'v6-xp-gain';
    gain.setAttribute('aria-hidden', 'true');
    gain.textContent = `+${amount} XP${label ? ' · ' + label : ''}`;
    display.appendChild(gain);
    display.classList.add('v6-xp-pop');
    gain.addEventListener('animationend', () => {
      gain.remove();
      display.classList.remove('v6-xp-pop');
    }, { once: true });
  }

  // ── V6-5. Achievements ────────────────────────────────────────────────────
  const ACHIEVEMENTS = [
    { id: 'first_save', label: 'Primeira fase!',     desc: 'Criou ou editou uma fase pela primeira vez', cond: (xp) => xp >= 10  },
    { id: 'xp_30',      label: 'Prata desbloqueada', desc: 'Atingiu 30 XP — nível Prata',                cond: (xp) => xp >= 30  },
    { id: 'xp_80',      label: 'Ouro desbloqueado',  desc: 'Atingiu 80 XP — nível Ouro',                 cond: (xp) => xp >= 80  },
    { id: 'xp_180',     label: 'Platina!',            desc: 'Atingiu 180 XP — parabéns!',                 cond: (xp) => xp >= 180 },
  ];

  function checkAchievements(xp) {
    const unlocked = getAchSet();
    ACHIEVEMENTS.forEach(ach => {
      if (!unlocked.has(ach.id) && ach.cond(xp)) {
        unlocked.add(ach.id);
        saveAchSet(unlocked);
        showAchievement(ach);
      }
    });
  }

  function showAchievement({ label, desc }) {
    const el = document.createElement('div');
    el.className = 'v6-achievement';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <div class="v6-ach-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)"
          stroke-width="1.5" aria-hidden="true">
          <circle cx="12" cy="8" r="5"/>
          <path d="M9 21l3-8 3 8M7.5 17h9"/>
        </svg>
      </div>
      <div>
        <p class="v6-ach-title">${label}</p>
        <p class="v6-ach-desc">${desc}</p>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('v6-ach-in'));
    setTimeout(() => {
      el.classList.remove('v6-ach-in');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, 4200);
    playTone(880, 0.06, 0.18);
  }

  // ── V6-6. Som sutil via AudioContext ─────────────────────────────────────
  function playTone(freq, gain, dur) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.connect(env); env.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      env.gain.setValueAtTime(0, ctx.currentTime);
      env.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur + 0.05);
      osc.addEventListener('ended', () => ctx.close());
    } catch(_) {}
  }

  // ── V6-7. Confetti ao completar plano ────────────────────────────────────
  function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.className = 'v6-confetti-canvas';
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const COLORS = ['#4CB8A0', '#2D6A56', '#C9A84C', '#F7F6F2', '#FFFFFF'];
    const pieces = Array.from({ length: 55 }, () => ({
      x:    Math.random() * canvas.width,
      y:   -Math.random() * canvas.height * 0.5,
      w:    4 + Math.random() * 5,
      h:    7 + Math.random() * 7,
      vy:   2.5 + Math.random() * 3,
      vx:   (Math.random() - 0.5) * 2,
      rot:  Math.random() * Math.PI * 2,
      drot: (Math.random() - 0.5) * 0.12,
      col:  COLORS[Math.floor(Math.random() * COLORS.length)],
      op:   1,
    }));

    let af;
    (function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      pieces.forEach(p => {
        p.y += p.vy; p.x += p.vx; p.rot += p.drot;
        if (p.y > canvas.height * 0.85) p.op -= 0.04;
        if (p.op <= 0) return;
        alive++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.op);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (alive > 0) { af = requestAnimationFrame(draw); }
      else { cancelAnimationFrame(af); canvas.remove(); }
    })();

    playTone(523, 0.09, 0.14);
    setTimeout(() => playTone(659, 0.09, 0.14), 120);
    setTimeout(() => playTone(784, 0.09, 0.20), 240);
  }

  // ── V6-8. Detectar conclusão do plano + marcar fases concluídas ──────────
  function checkPlanCompletion(fases) {
    if (!Array.isArray(fases) || !fases.length) return;

    const wrapper = document.getElementById('fases-lista-wrapper');
    if (wrapper) {
      fases.forEach(f => {
        if (f.status !== 'concluida') return;
        const btn  = wrapper.querySelector(`button[onclick*="${f.id}"]`);
        const card = btn?.closest('[style*="border:1px solid"]') || btn?.closest('[data-v3-card]');
        if (card && !card.hasAttribute('data-v6-done')) card.setAttribute('data-v6-done', '');
      });
    }

    const allDone = fases.every(f => f.status === 'concluida');
    if (allDone && fases.length >= 2) {
      if (!document.getElementById('v6-plan-done')) {
        const el = document.createElement('div');
        el.id = 'v6-plan-done';
        el.setAttribute('role', 'status');
        el.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.5" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Plano concluído com sucesso!`;
        const kpis = document.getElementById('kpis-fases');
        kpis?.parentElement?.insertBefore(el, kpis.nextSibling);
        gainXP(20, 'Plano concluído!');
        launchConfetti();
      }
    } else {
      document.getElementById('v6-plan-done')?.remove();
    }
  }

  // ── V6-9. Patch loadFasesExtras para integrar gamification ───────────────
  function patchLoadFasesExtras() {
    const ext = window._adminFasesExtras;
    if (!ext) return;
    const orig = ext.loadFasesExtras;
    if (!orig || orig._v6patched) return;

    const patched = async function (...args) {
      await orig.apply(this, args);
      const cache = window._adminFasesExtrasCache;
      if (Array.isArray(cache)) checkPlanCompletion(cache);
    };
    patched._v6patched = true;
    ext.loadFasesExtras = patched;
    window._adminFasesExtras.loadFasesExtras = patched;
  }

  // ── V6-10. Hook no form submit para XP + streak ───────────────────────────
  function hookFormSubmitForXP() {
    const form = document.getElementById('fase-form');
    if (!form || form._v6xpHooked) return;
    form._v6xpHooked = true;
    form.addEventListener('submit', () => {
      setTimeout(() => {
        const hasError = !!form.querySelector('.field-error-msg.visible');
        if (hasError) return;
        const streak = bumpStreak();
        gainXP(10, 'Fase salva');
        if (streak >= 2) showStreakBadge(streak);
        playTone(440, 0.06, 0.12);
      }, 800);
    });
  }

  // ── Init V6 ───────────────────────────────────────────────────────────────
  function initV6() {
    injectGamificationDOM();
    refreshGamificationUI(getXP());
    checkAchievements(getXP());
    hookFormSubmitForXP();
    patchLoadFasesExtras();

    const streak = bumpStreak();
    if (streak >= 3) setTimeout(() => showStreakBadge(streak), 2500);

    const cache = window._adminFasesExtrasCache;
    if (Array.isArray(cache) && cache.length) checkPlanCompletion(cache);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initV6, 650));
  } else {
    setTimeout(initV6, 650);
  }
})();
