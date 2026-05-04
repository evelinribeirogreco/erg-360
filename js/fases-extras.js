// js/fases-extras.js
// ═══ POLIMENTO V1 ═══
// 18 melhorias UX para fases.html:
// skip-link, expand suave, chevron, ARIA accordion, teclado, auto-scroll,
// progresso, fade-in stagger, pulse ativo, share, toast, live-region,
// flash de clique, hover glow, focus-visible, reduced-motion, anúncio SR

(function initFasesExtras() {
  'use strict';

  // Namespace público — extensível por versões futuras
  window._fasesExtras = window._fasesExtras || {};
  const E = window._fasesExtras;
  let _toastTimer = null;
  let _firstOpen = true;

  // ── Utilidades ──────────────────────────────────────────────────────────

  E.toast = function toast(msg, duration) {
    duration = duration || 2400;
    let el = document.querySelector('.fases-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'fases-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('fases-toast-show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('fases-toast-show'), duration);
  };

  E.announce = function announce(msg) {
    let el = document.querySelector('.fases-sr-live');
    if (!el) {
      el = document.createElement('div');
      el.className = 'fases-sr-live';
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      document.body.appendChild(el);
    }
    el.textContent = '';
    requestAnimationFrame(() => { el.textContent = msg; });
  };

  // ── 1. Skip link ────────────────────────────────────────────────────────
  function injectSkipLink() {
    if (document.querySelector('.fases-skip-link')) return;
    const a = document.createElement('a');
    a.href = '#fases-main';
    a.className = 'fases-skip-link';
    a.textContent = 'Ir para o conteúdo principal';
    document.body.prepend(a);
  }

  // ── 2. Região ARIA live ─────────────────────────────────────────────────
  function injectLiveRegion() {
    if (document.querySelector('.fases-sr-live')) return;
    const el = document.createElement('div');
    el.className = 'fases-sr-live';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    document.body.appendChild(el);
  }

  // ── 3. ARIA accordion attrs em cada fase-item ───────────────────────────
  function setupARIA(items) {
    items.forEach((item, idx) => {
      item.setAttribute('role', 'button');
      item.setAttribute('aria-expanded', 'false');
      const detalhe = item.querySelector('.fase-detalhe');
      const nome = item.querySelector('.fase-nome');
      if (detalhe) {
        const detId = detalhe.id || ('fases-detalhe-' + idx);
        detalhe.id = detId;
        item.setAttribute('aria-controls', detId);
      }
      if (nome) item.setAttribute('aria-label', nome.textContent.trim());
    });
  }

  // ── 4. Navegação por teclado ────────────────────────────────────────────
  function setupKeyboard(items) {
    items.forEach((item, idx) => {
      if (!item.getAttribute('tabindex')) item.setAttribute('tabindex', '0');
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.click();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = items[Math.min(idx + 1, items.length - 1)];
          if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = items[Math.max(idx - 1, 0)];
          if (prev) prev.focus();
        } else if (e.key === 'Home') {
          e.preventDefault();
          items[0].focus();
        } else if (e.key === 'End') {
          e.preventDefault();
          items[items.length - 1].focus();
        } else if (e.key === 'Escape') {
          const detalhe = item.querySelector('.fase-detalhe');
          if (detalhe && detalhe.classList.contains('open')) item.click();
        }
      });
    });
  }

  // ── 5. Chevron SVG injetado em cada fase-item ───────────────────────────
  function injectChevron(item) {
    if (item.querySelector('.fase-chevron')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'fase-chevron');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('aria-hidden', 'true');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', '6 9 12 15 18 9');
    svg.appendChild(poly);
    item.appendChild(svg);
  }

  // ── 6. Barra de progresso no hero ───────────────────────────────────────
  function injectProgress(items) {
    const hero = document.querySelector('.fases-hero');
    if (!hero || document.querySelector('.fases-progress-bar')) return;
    const total = items.length;
    if (total === 0) return;
    const concluidas = items.filter(i => i.classList.contains('concluida')).length;
    const pct = Math.round((concluidas / total) * 100);
    const bar = document.createElement('div');
    bar.className = 'fases-progress-bar';
    bar.innerHTML =
      '<p class="fases-progress-label">' +
        '<strong>' + concluidas + ' de ' + total + '</strong> fase' + (total !== 1 ? 's' : '') + ' concluída' + (concluidas !== 1 ? 's' : '') +
      '</p>' +
      '<div class="fases-progress-track" role="progressbar"' +
        ' aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"' +
        ' aria-label="Progresso geral do plano de fases">' +
        '<div class="fases-progress-fill"></div>' +
      '</div>';
    hero.appendChild(bar);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const fill = bar.querySelector('.fases-progress-fill');
        if (fill) fill.style.width = pct + '%';
      });
    });
  }

  // ── 7. Botão compartilhar (Web Share API) ───────────────────────────────
  function injectShareButton(item) {
    if (!navigator.share) return;
    const detalhe = item.querySelector('.fase-detalhe');
    if (!detalhe || detalhe.querySelector('.fase-share-btn')) return;
    const nome = item.querySelector('.fase-nome');
    const obj = item.querySelector('.fase-objetivo');
    const btn = document.createElement('button');
    btn.className = 'fase-share-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'Compartilhar detalhes desta fase');
    btn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
        '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
        '<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>' +
        '<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' +
      '</svg>Compartilhar esta fase';
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.share({
          title: (nome ? nome.textContent.trim() : 'Fase do plano nutricional'),
          text: (obj ? obj.textContent.trim() : 'Detalhes do meu plano nutricional ERG.'),
        });
      } catch (_) { /* usuário cancelou */ }
    });
    detalhe.appendChild(btn);
  }

  // ── 8. Flash visual ao clicar ────────────────────────────────────────────
  function addClickFlash(item) {
    item.addEventListener('click', () => {
      item.classList.add('fase-flash');
      setTimeout(() => item.classList.remove('fase-flash'), 320);
    });
  }

  // ── 9. Stagger fade-in via IntersectionObserver ──────────────────────────
  function setupFadeIn(items) {
    if (!('IntersectionObserver' in window)) {
      items.forEach(i => i.classList.add('fases-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, posIdx) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => {
          entry.target.classList.add('fases-visible');
          io.unobserve(entry.target);
        }, posIdx * 80);
      });
    }, { threshold: 0.08 });
    items.forEach(i => io.observe(i));
  }

  // ── 10. Override de toggleFase com ARIA + scroll + announce ─────────────
  function patchToggleFase() {
    const orig = window.toggleFase;
    if (typeof orig !== 'function') return;
    E._origToggleFase = orig;

    window.toggleFase = function(id) {
      orig(id);
      const detalhe = document.getElementById(id);
      if (!detalhe) return;
      const item = detalhe.closest('.fase-item');
      const isOpen = detalhe.classList.contains('open');

      // Atualiza ARIA
      if (item) item.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

      // Anuncia para leitores de tela
      const nome = item && item.querySelector('.fase-nome');
      E.announce(nome
        ? (isOpen
            ? nome.textContent.trim() + ': detalhes expandidos'
            : nome.textContent.trim() + ': recolhido')
        : (isOpen ? 'Detalhes expandidos' : 'Recolhido'));

      // Toast na primeira abertura
      if (isOpen && _firstOpen) {
        _firstOpen = false;
        E.toast('Toque novamente para recolher');
      }

      // Scroll suave para o detalhe aberto
      if (isOpen) {
        setTimeout(() => {
          detalhe.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 420);
      }
    };
  }

  // ── 11. Auto-scroll para a fase ativa ───────────────────────────────────
  function scrollToActive() {
    const ativa = document.querySelector('.fase-item.ativa');
    if (!ativa) return;
    setTimeout(() => {
      ativa.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
  }

  // ── Init principal (executa quando o conteúdo async está no DOM) ─────────
  function initExtras() {
    document.body.classList.add('fases-extras-loaded');

    const items = Array.from(document.querySelectorAll('.fase-item'));

    injectSkipLink();
    injectLiveRegion();
    setupARIA(items);
    setupKeyboard(items);
    injectProgress(items);

    items.forEach(item => {
      injectChevron(item);
      injectShareButton(item);
      addClickFlash(item);
    });

    patchToggleFase();
    setupFadeIn(items);
    scrollToActive();
  }

  // ── Aguarda renderização async do fases.js ───────────────────────────────
  function waitForContent() {
    const content = document.getElementById('fases-content');
    if (!content) {
      setTimeout(waitForContent, 100);
      return;
    }
    // Conteúdo já renderizado
    if (content.children.length > 0 && content.style.display !== 'none') {
      initExtras();
      return;
    }
    // Observa até que fases.js injete o HTML
    const obs = new MutationObserver(() => {
      if (content.children.length > 0) {
        obs.disconnect();
        setTimeout(initExtras, 60);
      }
    });
    obs.observe(content, { childList: true, attributes: true, attributeFilter: ['style'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForContent);
  } else {
    waitForContent();
  }
})();

// ═══ POLIMENTO V3 ═══
// 10 melhorias de acessibilidade avançada:
// V3.1 role="list"/listitem na timeline
// V3.2 aria-setsize + aria-posinset por item
// V3.3 aria-roledescription="fase do tratamento"
// V3.4 foco inteligente ao abrir/fechar (focus return)
// V3.5 overlay de atalhos de teclado (tecla ?)
// V3.6 tecla / para recolher todas as fases
// V3.7 aria-busy no container de loading
// V3.8 role="region" + aria-label nas seções hero/mapa/voce-aqui
// V3.9 detecção de alto contraste (prefers-contrast: more)
// V3.10 print: todas as fases expandidas automaticamente

(function initFasesExtrasV3() {
  'use strict';

  const E = window._fasesExtras = window._fasesExtras || {};

  // ── V3.1 + V3.2 + V3.3: Semântica de lista e roles por item ─────────────
  function applyListSemantics(items) {
    const timeline = document.querySelector('.fases-timeline');
    if (timeline && !timeline.getAttribute('role')) {
      timeline.setAttribute('role', 'list');
      timeline.setAttribute('aria-label', 'Linha do tempo das fases do tratamento');
    }
    const total = items.length;
    items.forEach((item, idx) => {
      if (!item.getAttribute('role') || item.getAttribute('role') === 'button') {
        item.setAttribute('role', 'listitem');
      }
      item.setAttribute('aria-setsize', String(total));
      item.setAttribute('aria-posinset', String(idx + 1));
      item.setAttribute('aria-roledescription', 'fase do tratamento');
    });
  }

  // ── V3.4: Foco inteligente ao abrir/fechar ───────────────────────────────
  function patchToggleFaseV3() {
    const orig = window.toggleFase;
    if (!orig || orig._v3patched) return;
    const wrapped = function (id) {
      const detalhe = document.getElementById(id);
      const item = detalhe && detalhe.closest('.fase-item');
      const wasOpen = detalhe && detalhe.classList.contains('open');
      orig(id);
      if (!detalhe || !item) return;
      const isNowOpen = detalhe.classList.contains('open');
      if (isNowOpen && !wasOpen) {
        // Ao abrir: foca o primeiro elemento interativo dentro do detalhe
        setTimeout(() => {
          const firstFocusable = detalhe.querySelector(
            'a[href], button:not([disabled]), [tabindex="0"]'
          );
          if (firstFocusable) firstFocusable.focus({ preventScroll: true });
        }, 460);
      } else if (!isNowOpen && wasOpen) {
        // Ao fechar: devolve foco ao item
        item.focus({ preventScroll: true });
      }
    };
    wrapped._v3patched = true;
    window.toggleFase = wrapped;
  }

  // ── V3.5: Overlay de atalhos (tecla ?) ──────────────────────────────────
  function injectHelpOverlay() {
    if (document.getElementById('fases-help-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'fases-help-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Atalhos de teclado');
    overlay.setAttribute('hidden', '');
    overlay.innerHTML =
      '<div class="fases-help-panel" tabindex="-1">' +
        '<button class="fases-help-close" aria-label="Fechar ajuda" type="button">✕</button>' +
        '<h2 class="fases-help-title">Atalhos de teclado</h2>' +
        '<dl class="fases-help-list">' +
          '<dt><kbd>↑</kbd><kbd>↓</kbd></dt><dd>Navegar entre fases</dd>' +
          '<dt><kbd>Enter</kbd>&nbsp;/&nbsp;<kbd>Espaço</kbd></dt><dd>Expandir / recolher</dd>' +
          '<dt><kbd>Home</kbd>&nbsp;/&nbsp;<kbd>End</kbd></dt><dd>Primeira / última fase</dd>' +
          '<dt><kbd>Esc</kbd></dt><dd>Recolher fase aberta</dd>' +
          '<dt><kbd>/</kbd></dt><dd>Recolher todas as fases</dd>' +
          '<dt><kbd>?</kbd></dt><dd>Esta ajuda</dd>' +
        '</dl>' +
      '</div>';
    document.body.appendChild(overlay);

    const panel = overlay.querySelector('.fases-help-panel');
    const closeBtn = overlay.querySelector('.fases-help-close');

    E.openHelp = function () {
      overlay.removeAttribute('hidden');
      panel.focus();
      document.body.style.overflow = 'hidden';
    };

    E.closeHelp = function () {
      overlay.setAttribute('hidden', '');
      document.body.style.overflow = '';
      const focused = document.querySelector('.fase-item:focus') ||
                      document.querySelector('.fase-item.ativa');
      if (focused) focused.focus({ preventScroll: true });
    };

    closeBtn.addEventListener('click', E.closeHelp);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) E.closeHelp(); });

    // Focus trap dentro do overlay
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { E.closeHelp(); return; }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(overlay.querySelectorAll(
        'button, [href], [tabindex]:not([tabindex="-1"])'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  }

  // ── V3.6: Tecla / para recolher todas as fases ──────────────────────────
  function setupGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        if (E.openHelp) E.openHelp();
      } else if (e.key === '/' && !e.shiftKey) {
        e.preventDefault();
        let closed = 0;
        document.querySelectorAll('.fase-detalhe.open').forEach((d) => {
          if (d.id && typeof window.toggleFase === 'function') {
            window.toggleFase(d.id);
            closed++;
          }
        });
        if (closed > 0 && E.announce) {
          E.announce(closed === 1 ? 'Fase recolhida' : 'Todas as fases foram recolhidas');
        }
      }
    });
  }

  // ── V3.7: aria-busy no loading ───────────────────────────────────────────
  function patchLoadingARIA() {
    const loading = document.getElementById('fases-loading');
    if (loading) {
      loading.setAttribute('role', 'status');
      loading.setAttribute('aria-live', 'polite');
      loading.setAttribute('aria-busy', 'true');
      loading.setAttribute('aria-label', 'Carregando seu plano de fases');
    }
    const content = document.getElementById('fases-content');
    if (content && loading) {
      const obs = new MutationObserver(() => {
        loading.setAttribute('aria-busy', 'false');
        obs.disconnect();
      });
      obs.observe(content, { attributes: true, attributeFilter: ['style'] });
    }
  }

  // ── V3.8: role="region" nas seções principais ────────────────────────────
  function applyRegionRoles() {
    const hero = document.querySelector('.fases-hero');
    if (hero && !hero.getAttribute('role')) {
      hero.setAttribute('role', 'region');
      hero.setAttribute('aria-label', 'Resumo do plano de tratamento');
    }
    const mapa = document.querySelector('.fases-mapa');
    if (mapa && !mapa.getAttribute('role')) {
      mapa.setAttribute('role', 'region');
      mapa.setAttribute('aria-label', 'Mapa de progresso das fases');
    }
    const voceAqui = document.querySelector('.voce-aqui');
    if (voceAqui && !voceAqui.getAttribute('role')) {
      voceAqui.setAttribute('role', 'region');
      voceAqui.setAttribute('aria-label', 'Fase atual em andamento');
    }
  }

  // ── V3.9: Alto contraste (prefers-contrast: more) ───────────────────────
  function detectHighContrast() {
    const mq = window.matchMedia('(prefers-contrast: more)');
    const apply = (matches) => document.body.classList.toggle('fases-high-contrast', matches);
    apply(mq.matches);
    mq.addEventListener('change', (e) => apply(e.matches));
  }

  // ── V3.10: Print — expande todas as fases antes de imprimir ─────────────
  function setupPrintExpand() {
    window.addEventListener('beforeprint', () => {
      document.querySelectorAll('.fase-detalhe:not(.open)').forEach((d) => {
        d.classList.add('fases-print-open');
      });
    });
    window.addEventListener('afterprint', () => {
      document.querySelectorAll('.fases-print-open').forEach((d) => {
        d.classList.remove('fases-print-open');
      });
    });
  }

  // ── Init V3 (aguarda conteúdo async) ─────────────────────────────────────
  function initV3() {
    const items = Array.from(document.querySelectorAll('.fase-item'));
    applyListSemantics(items);
    patchToggleFaseV3();
    applyRegionRoles();
    injectHelpOverlay();
  }

  function waitForContentV3() {
    const content = document.getElementById('fases-content');
    if (!content) { setTimeout(waitForContentV3, 120); return; }
    if (content.children.length > 0) { initV3(); return; }
    const obs = new MutationObserver(() => {
      if (content.children.length > 0) { obs.disconnect(); setTimeout(initV3, 80); }
    });
    obs.observe(content, { childList: true, attributes: true, attributeFilter: ['style'] });
  }

  // Execuções imediatas (independem do conteúdo async)
  patchLoadingARIA();
  detectHighContrast();
  setupGlobalKeys();
  setupPrintExpand();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForContentV3);
  } else {
    waitForContentV3();
  }
})();
