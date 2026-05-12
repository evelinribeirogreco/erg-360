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

// ═══ POLIMENTO V4 ═══
// 10 melhorias de performance:
// V4.1 E.debounce helper reutilizável
// V4.2 requestIdleCallback fallback + init não-crítico em idle
// V4.3 Passive touch/wheel em fase-item (scroll mobile sem jank)
// V4.4 will-change gerenciado por JS (add antes do stagger, remove depois)
// V4.5 Batch reads → rAF writes em updateProgress (sem layout thrashing)
// V4.6 ResizeObserver + debounce na timeline (sincroniza progresso ao resize)
// V4.7 Prefetch de rotas comuns via <link rel="prefetch">
// V4.8 IntersectionObserver otimizado: rootMargin positivo + auto-disconnect
// V4.9 (CSS) contain: layout style no .fase-item
// V4.10 (CSS) @media (prefers-reduced-data) — sem animações em dados limitados

(function initFasesExtrasV4() {
  'use strict';

  const E = window._fasesExtras = window._fasesExtras || {};

  // ── V4.1: debounce helper ─────────────────────────────────────────────────
  if (!E.debounce) {
    E.debounce = function debounce(fn, ms) {
      let t;
      return function () {
        const ctx = this;
        const args = arguments;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(ctx, args); }, ms);
      };
    };
  }

  // ── V4.2: rIC fallback ────────────────────────────────────────────────────
  const rIC = window.requestIdleCallback
    ? window.requestIdleCallback.bind(window)
    : function (cb) { setTimeout(cb, 4); };

  // ── V4.3: Passive touch/wheel em fase-item ────────────────────────────────
  function addPassiveListeners(items) {
    const noop = function () {};
    items.forEach(function (item) {
      if (item._v4passive) return;
      item._v4passive = true;
      item.addEventListener('touchstart', noop, { passive: true });
      item.addEventListener('touchmove',  noop, { passive: true });
      item.addEventListener('wheel',      noop, { passive: true });
    });
  }

  // ── V4.4: will-change gerenciado ─────────────────────────────────────────
  function manageWillChange(items) {
    items.forEach(function (item) {
      item.style.willChange = 'transform, opacity';
    });
    const totalDuration = items.length * 80 + 900;
    setTimeout(function () {
      items.forEach(function (item) { item.style.willChange = 'auto'; });
    }, totalDuration);
  }

  // ── V4.5: updateProgress sem layout thrashing ─────────────────────────────
  // Substitui qualquer chamada futura; reads primeiro, writes em rAF
  E.updateProgress = function updateProgress() {
    const bar = document.querySelector('.fases-progress-bar');
    if (!bar) return;
    const items = Array.from(document.querySelectorAll('.fase-item'));
    const total = items.length;
    const concluidas = items.filter(function (i) {
      return i.classList.contains('concluida');
    }).length;
    const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    requestAnimationFrame(function () {
      const label = bar.querySelector('.fases-progress-label');
      const fill  = bar.querySelector('.fases-progress-fill');
      const track = bar.querySelector('.fases-progress-track');
      if (label) {
        label.innerHTML =
          '<strong>' + concluidas + ' de ' + total + '</strong> fase' +
          (total !== 1 ? 's' : '') + ' concluída' + (concluidas !== 1 ? 's' : '');
      }
      if (fill)  { fill.style.width = pct + '%'; }
      if (track) {
        track.setAttribute('aria-valuenow', String(pct));
        track.setAttribute('aria-label',
          'Progresso: ' + pct + '% — ' + concluidas + ' de ' + total + ' fases concluídas');
      }
    });
  };

  // ── V4.6: ResizeObserver + debounce na timeline ───────────────────────────
  function observeTimelineResize() {
    if (!window.ResizeObserver || E._roTimeline) return;
    const timeline = document.querySelector('.fases-timeline');
    if (!timeline) return;
    const onResize = E.debounce(function () {
      if (E.updateProgress) E.updateProgress();
    }, 200);
    E._roTimeline = new ResizeObserver(onResize);
    E._roTimeline.observe(timeline);
  }

  // ── V4.7: Prefetch rotas comuns ───────────────────────────────────────────
  function prefetchCommonRoutes() {
    var routes = ['checkin.html', 'diario.html', 'dashboard.html'];
    routes.forEach(function (route) {
      if (document.querySelector('link[rel="prefetch"][href="' + route + '"]')) return;
      var link = document.createElement('link');
      link.rel  = 'prefetch';
      link.href = route;
      link.as   = 'document';
      document.head.appendChild(link);
    });
  }

  // ── V4.8: IntersectionObserver otimizado ─────────────────────────────────
  function optimizedFadeIn(items) {
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (i) { i.classList.add('fases-visible'); });
      return;
    }
    var pending = items.filter(function (i) {
      return !i.classList.contains('fases-visible');
    });
    if (pending.length === 0) return;

    manageWillChange(pending);

    var io = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var idx = pending.indexOf(entry.target);
        var delay = Math.max(0, idx) * 70;
        (function (target) {
          setTimeout(function () {
            target.classList.add('fases-visible');
            observer.unobserve(target);
            pending = pending.filter(function (x) { return x !== target; });
            if (pending.length === 0) observer.disconnect();
          }, delay);
        })(entry.target);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 60px 0px' });

    pending.forEach(function (i) { io.observe(i); });
  }

  // ── Init V4 ───────────────────────────────────────────────────────────────
  function initV4() {
    var items = Array.from(document.querySelectorAll('.fase-item'));
    addPassiveListeners(items);
    observeTimelineResize();
    optimizedFadeIn(items);
    rIC(prefetchCommonRoutes);
  }

  function waitForContentV4() {
    var content = document.getElementById('fases-content');
    if (!content) { setTimeout(waitForContentV4, 150); return; }
    if (content.children.length > 0) { initV4(); return; }
    var obs = new MutationObserver(function () {
      if (content.children.length > 0) {
        obs.disconnect();
        setTimeout(initV4, 100);
      }
    });
    obs.observe(content, { childList: true, attributes: true, attributeFilter: ['style'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForContentV4);
  } else {
    waitForContentV4();
  }
})();

// ═══ POLIMENTO V5 ═══
// 10 Web APIs modernas:
// V5.1  Page Visibility — pausa pulse ring ao esconder aba
// V5.2  Vibration API — feedback háptico ao expandir/recolher fase
// V5.3  Wake Lock API — mantém tela acesa durante consulta do plano
// V5.4  Network Information — detecta conexão lenta e simplifica UI
// V5.5  Clipboard API — botão copiar resumo de progresso
// V5.6  Web Share do progresso geral (hero) — compartilha %, diferente do share por fase (V1)
// V5.7  sessionStorage open state — persiste quais fases estão abertas entre recargas
// V5.8  Online/Offline events — toast e classe CSS ao mudar conectividade
// V5.9  Battery Status API — desativa animações custosas em bateria baixa
// V5.10 scrollY persistence via sessionStorage — restaura posição de scroll ao voltar

(function initFasesExtrasV5() {
  'use strict';

  var E = window._fasesExtras = window._fasesExtras || {};

  // ── V5.1: Page Visibility — pausa animação de pulse ring ─────────────────
  function setupPageVisibility() {
    var onVisibilityChange = function () {
      var state = document.hidden ? 'paused' : 'running';
      document.querySelectorAll('.fase-item.ativa .fase-dot').forEach(function (dot) {
        dot.style.animationPlayState = state;
      });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (document.hidden) onVisibilityChange();
  }

  // ── V5.2: Vibration API — háptico ao abrir/fechar ────────────────────────
  function setupVibration() {
    if (!navigator.vibrate) return;
    var origToggle = window.toggleFase;
    if (!origToggle || origToggle._v5vibration) return;
    var wrapped = function (id) {
      var detalhe = document.getElementById(id);
      var wasOpen = detalhe && detalhe.classList.contains('open');
      origToggle(id);
      var isNowOpen = detalhe && detalhe.classList.contains('open');
      if (!wasOpen && isNowOpen) {
        navigator.vibrate(15);
      } else if (wasOpen && !isNowOpen) {
        navigator.vibrate([8, 8, 8]);
      }
    };
    wrapped._v5vibration = true;
    window.toggleFase = wrapped;
  }

  // ── V5.3: Wake Lock API — tela acesa ─────────────────────────────────────
  function setupWakeLock() {
    if (!('wakeLock' in navigator)) return;
    var wakeLockRef = null;
    var wakeLockBtn = null;

    function updateBtnState(active) {
      if (!wakeLockBtn) return;
      wakeLockBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
      wakeLockBtn.title = active ? 'Desativar tela sempre acesa' : 'Manter tela acesa';
    }

    function requestWakeLock() {
      navigator.wakeLock.request('screen').then(function (lock) {
        wakeLockRef = lock;
        updateBtnState(true);
        lock.addEventListener('release', function () {
          wakeLockRef = null;
          updateBtnState(false);
        });
        if (E.toast) E.toast('Tela permanecerá acesa durante a consulta');
      }).catch(function () { /* permissão negada */ });
    }

    function releaseWakeLock() {
      if (wakeLockRef) {
        wakeLockRef.release();
        wakeLockRef = null;
      }
      updateBtnState(false);
      if (E.toast) E.toast('Modo tela acesa desativado');
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' &&
          wakeLockBtn && wakeLockBtn.getAttribute('aria-pressed') === 'true' &&
          !wakeLockRef) {
        requestWakeLock();
      }
    });

    E._initWakeLockBtn = function () {
      var hero = document.querySelector('.fases-hero');
      if (!hero || hero.querySelector('.fases-wakelock-btn')) return;
      var btn = document.createElement('button');
      btn.className = 'fases-wakelock-btn';
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'false');
      btn.title = 'Manter tela acesa';
      btn.setAttribute('aria-label', 'Manter tela acesa durante a consulta');
      btn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="4"/>' +
          '<path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>' +
        '</svg>' +
        '<span>Tela acesa</span>';
      wakeLockBtn = btn;
      btn.addEventListener('click', function () {
        if (wakeLockRef) { releaseWakeLock(); } else { requestWakeLock(); }
      });
      hero.appendChild(btn);
    };
  }

  // ── V5.4: Network Information — conexão lenta ─────────────────────────────
  function setupNetworkInfo() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    var slowTypes = ['slow-2g', '2g'];
    var check = function () {
      var isSlow = slowTypes.indexOf(conn.effectiveType) !== -1;
      document.body.classList.toggle('fases-slow-network', isSlow);
      if (isSlow && E.toast) E.toast('Conexão lenta — visuais simplificados');
    };
    conn.addEventListener('change', check);
    check();
  }

  // ── V5.5: Clipboard API — copiar resumo de progresso ─────────────────────
  function injectCopyProgressBtn() {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;
    var hero = document.querySelector('.fases-hero');
    if (!hero || hero.querySelector('.fases-copy-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'fases-copy-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Copiar resumo de progresso para a área de transferência');
    btn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
        '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
        '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
      '</svg>' +
      'Copiar progresso';
    btn.addEventListener('click', function () {
      var items = Array.from(document.querySelectorAll('.fase-item'));
      var total = items.length;
      var concluidas = items.filter(function (i) { return i.classList.contains('concluida'); }).length;
      var pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;
      var nomes = items.map(function (item) {
        var nome = item.querySelector('.fase-nome');
        var icon = item.classList.contains('concluida') ? '✅' : item.classList.contains('ativa') ? '▶️' : '⏳';
        return icon + ' ' + (nome ? nome.textContent.trim() : 'Fase');
      }).join('\n');
      var texto =
        'Meu progresso no plano ERG 360:\n' +
        concluidas + ' de ' + total + ' fases concluídas (' + pct + '%)\n\n' + nomes;
      navigator.clipboard.writeText(texto).then(function () {
        if (E.toast) E.toast('Resumo copiado!');
        if (E.announce) E.announce('Resumo de progresso copiado para a área de transferência');
      }).catch(function () {
        if (E.toast) E.toast('Não foi possível copiar');
      });
    });
    hero.appendChild(btn);
  }

  // ── V5.6: Web Share do progresso geral (hero) — distinto do share por fase ─
  function injectShareProgressBtn() {
    if (!navigator.share) return;
    var hero = document.querySelector('.fases-hero');
    if (!hero || hero.querySelector('.fases-share-progress-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'fases-share-progress-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Compartilhar meu progresso geral no plano');
    btn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
        '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
        '<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>' +
        '<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' +
      '</svg>' +
      'Compartilhar progresso';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var items = Array.from(document.querySelectorAll('.fase-item'));
      var total = items.length;
      var concluidas = items.filter(function (i) { return i.classList.contains('concluida'); }).length;
      var pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;
      navigator.share({
        title: 'Meu progresso — ERG 360',
        text: 'Estou com ' + pct + '% do plano nutricional concluído! ' +
              concluidas + ' de ' + total + ' fases feitas. #ERG360',
      }).catch(function () { /* usuário cancelou */ });
    });
    hero.appendChild(btn);
  }

  // ── V5.7: sessionStorage — persiste quais fases estão abertas ────────────
  var SESSION_KEY = 'fases_open_ids';

  function persistOpenFases() {
    var origToggle = window.toggleFase;
    if (!origToggle || origToggle._v5persist) return;
    var wrapped = function (id) {
      origToggle(id);
      var detalhe = document.getElementById(id);
      var isOpen = detalhe && detalhe.classList.contains('open');
      try {
        var stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]');
        if (isOpen) {
          if (stored.indexOf(id) === -1) stored.push(id);
        } else {
          stored = stored.filter(function (x) { return x !== id; });
        }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored));
      } catch (_) { /* sessionStorage indisponível */ }
    };
    wrapped._v5persist = true;
    window.toggleFase = wrapped;
  }

  function restoreOpenFases() {
    try {
      var stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]');
      stored.forEach(function (id) {
        var detalhe = document.getElementById(id);
        if (detalhe && !detalhe.classList.contains('open') && typeof window.toggleFase === 'function') {
          window.toggleFase(id);
        }
      });
    } catch (_) { /* noop */ }
  }

  // ── V5.8: Online/Offline events ──────────────────────────────────────────
  function setupOnlineOffline() {
    window.addEventListener('online', function () {
      document.body.classList.remove('fases-offline');
      if (E.toast) E.toast('Conexão restaurada');
      if (E.announce) E.announce('Conectado à internet');
    });
    window.addEventListener('offline', function () {
      document.body.classList.add('fases-offline');
      if (E.toast) E.toast('Você está offline — dados salvos localmente');
      if (E.announce) E.announce('Sem conexão com a internet');
    });
    if (!navigator.onLine) document.body.classList.add('fases-offline');
  }

  // ── V5.9: Battery Status API — reduz animações em bateria baixa ──────────
  function setupBatteryStatus() {
    if (!navigator.getBattery) return;
    navigator.getBattery().then(function (battery) {
      var applyBatteryMode = function () {
        var low = battery.level <= 0.2 && !battery.charging;
        document.body.classList.toggle('fases-low-battery', low);
        if (low && E.toast) E.toast('Bateria baixa — animações reduzidas');
      };
      battery.addEventListener('levelchange', applyBatteryMode);
      battery.addEventListener('chargingchange', applyBatteryMode);
      applyBatteryMode();
    }).catch(function () { /* API não disponível */ });
  }

  // ── V5.10: scrollY persistence — restaura posição ao voltar ──────────────
  var SCROLL_KEY = 'fases_scroll_y';

  function setupScrollPersistence() {
    if (document.referrer && document.referrer.indexOf(window.location.hostname) !== -1) {
      var savedY = parseInt(sessionStorage.getItem(SCROLL_KEY) || '0', 10);
      if (savedY > 0) {
        requestAnimationFrame(function () {
          window.scrollTo({ top: savedY, behavior: 'instant' });
        });
      }
    }
    window.addEventListener('pagehide', function () {
      try { sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY))); }
      catch (_) { /* noop */ }
    });
  }

  // ── Init V5 (aguarda conteúdo async) ─────────────────────────────────────
  function initV5() {
    if (E._initWakeLockBtn) E._initWakeLockBtn();
    injectCopyProgressBtn();
    injectShareProgressBtn();
    persistOpenFases();
    restoreOpenFases();
  }

  function waitForContentV5() {
    var content = document.getElementById('fases-content');
    if (!content) { setTimeout(waitForContentV5, 160); return; }
    if (content.children.length > 0) { initV5(); return; }
    var obs = new MutationObserver(function () {
      if (content.children.length > 0) { obs.disconnect(); setTimeout(initV5, 90); }
    });
    obs.observe(content, { childList: true, attributes: true, attributeFilter: ['style'] });
  }

  // Execuções imediatas (não dependem do conteúdo async)
  setupPageVisibility();
  setupVibration();
  setupWakeLock();
  setupNetworkInfo();
  setupOnlineOffline();
  setupBatteryStatus();
  setupScrollPersistence();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForContentV5);
  } else {
    waitForContentV5();
  }
})();

// ═══ POLIMENTO V6 ═══
// 10 melhorias de gamification:
// V6.1  Streak diário via localStorage + badges de 3 e 7 dias
// V6.2  Badge "Primeira fase" — desbloqueado ao abrir 1ª fase
// V6.3  Badge "Metade do caminho" — 50% de fases concluídas
// V6.4  Badge "Plano completo" — 100% das fases concluídas
// V6.5  Confetti micro via Canvas ao detectar nova .concluida (MutationObserver)
// V6.6  AudioContext: 'pop' sutil ao expandir fase (user-gesture-safe)
// V6.7  AudioContext: chime de 3 notas ao desbloquear badge
// V6.8  Toast de marco de progresso: 25%, 50%, 75%, 100% (não repete)
// V6.9  XP counter (+10 fase única aberta, +20 fase concluída, +50 badge)
// V6.10 Badge container no hero com entrada animada (scale+rotate)

(function initFasesExtrasV6() {
  'use strict';

  var E = window._fasesExtras = window._fasesExtras || {};
  var LS_BADGES     = 'fases_badges_v6';
  var LS_STREAK     = 'fases_streak_v6';
  var LS_LAST_DAY   = 'fases_last_day_v6';
  var LS_XP         = 'fases_xp_v6';
  var LS_MILESTONES = 'fases_milestones_v6';
  var SS_OPENED     = 'fases_opened_v6';

  var _audioCtx   = null;
  var _audioReady = false;

  // ── V6.6 + V6.7: AudioContext helpers ────────────────────────────────────
  function ensureAudioCtx() {
    if (_audioCtx) return;
    try {
      _audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
      _audioReady = true;
    } catch (_) { _audioReady = false; }
  }

  function playTone(freq, type, duration, gainVal) {
    if (!_audioReady || !_audioCtx) return;
    try {
      var osc  = _audioCtx.createOscillator();
      var gain = _audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, _audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal || 0.06, _audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.start(_audioCtx.currentTime);
      osc.stop(_audioCtx.currentTime + duration);
    } catch (_) {}
  }

  E.playPop = function () {
    ensureAudioCtx();
    playTone(320, 'sine', 0.11, 0.05);
  };

  E.playChime = function () {
    ensureAudioCtx();
    [523, 659, 784].forEach(function (freq, i) {
      setTimeout(function () { playTone(freq, 'sine', 0.22, 0.07); }, i * 100);
    });
  };

  // Activa AudioCtx no primeiro gesto do usuário
  document.addEventListener('click', function onFirstClick() {
    ensureAudioCtx();
    document.removeEventListener('click', onFirstClick);
  }, { once: true });

  // ── V6.1: Streak diário ───────────────────────────────────────────────────
  function updateStreak() {
    var today     = new Date().toISOString().slice(0, 10);
    var lastDay   = localStorage.getItem(LS_LAST_DAY) || '';
    var streak    = parseInt(localStorage.getItem(LS_STREAK) || '0', 10);
    if (lastDay === today) return streak;
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streak = (lastDay === yesterday) ? streak + 1 : 1;
    try {
      localStorage.setItem(LS_STREAK,   String(streak));
      localStorage.setItem(LS_LAST_DAY, today);
    } catch (_) {}
    return streak;
  }

  // ── V6.9: XP system ──────────────────────────────────────────────────────
  E.addXP = function (pts) {
    var current  = parseInt(localStorage.getItem(LS_XP) || '0', 10);
    var newTotal = current + pts;
    try { localStorage.setItem(LS_XP, String(newTotal)); } catch (_) {}
    _renderXP(newTotal);
    return newTotal;
  };

  function _getXP() {
    return parseInt(localStorage.getItem(LS_XP) || '0', 10);
  }

  function _renderXP(xp) {
    var el = document.querySelector('.fases-xp-display');
    if (!el) return;
    el.textContent = xp + ' XP';
    el.classList.add('fases-xp-pulse');
    setTimeout(function () { el.classList.remove('fases-xp-pulse'); }, 500);
  }

  // ── V6.10: Definições de badges + container no hero ──────────────────────
  var BADGE_DEFS = [
    { id: 'primeira-fase',  emoji: '🌱', label: 'Primeira fase',    desc: 'Abriu a primeira fase do plano' },
    { id: 'metade-caminho', emoji: '🏃', label: 'Metade do caminho', desc: '50% das fases concluídas' },
    { id: 'plano-completo', emoji: '🏆', label: 'Plano completo',    desc: 'Todas as fases concluídas!' },
    { id: 'streak-3',       emoji: '🔥', label: '3 dias seguidos',   desc: 'Visitou 3 dias consecutivos' },
    { id: 'streak-7',       emoji: '⚡', label: '7 dias seguidos',   desc: 'Visitou 7 dias consecutivos' },
  ];

  function _getUnlockedBadges() {
    try { return JSON.parse(localStorage.getItem(LS_BADGES) || '[]'); } catch (_) { return []; }
  }

  function _unlockBadge(id) {
    var unlocked = _getUnlockedBadges();
    if (unlocked.indexOf(id) !== -1) return false;
    unlocked.push(id);
    try { localStorage.setItem(LS_BADGES, JSON.stringify(unlocked)); } catch (_) {}
    return true;
  }

  E.checkAndUnlockBadge = function (id) {
    if (!_unlockBadge(id)) return;
    var def = BADGE_DEFS.filter(function (b) { return b.id === id; })[0];
    if (!def) return;
    _renderBadge(def, true);
    E.addXP(50);
    if (E.toast)     E.toast(def.emoji + ' Badge desbloqueado: ' + def.label + '!');
    if (E.announce)  E.announce('Badge desbloqueado: ' + def.label + '. ' + def.desc);
    E.launchConfetti();
    setTimeout(function () { E.playChime(); }, 80);
  };

  function _injectBadgeContainer() {
    var hero = document.querySelector('.fases-hero');
    if (!hero || hero.querySelector('.fases-badges-container')) return;

    var container = document.createElement('div');
    container.className = 'fases-badges-container';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Conquistas desbloqueadas');

    var heading = document.createElement('p');
    heading.className = 'fases-badges-heading';
    heading.textContent = 'Conquistas';
    container.appendChild(heading);

    var grid = document.createElement('div');
    grid.className = 'fases-badges-grid';
    container.appendChild(grid);

    var xpEl = document.createElement('span');
    xpEl.className = 'fases-xp-display';
    xpEl.setAttribute('aria-label', 'Pontos de experiência acumulados');
    xpEl.textContent = _getXP() + ' XP';
    container.appendChild(xpEl);

    hero.appendChild(container);

    _getUnlockedBadges().forEach(function (id) {
      var def = BADGE_DEFS.filter(function (b) { return b.id === id; })[0];
      if (def) _renderBadge(def, false);
    });
  }

  function _renderBadge(def, isNew) {
    var grid = document.querySelector('.fases-badges-grid');
    if (!grid) return;
    if (grid.querySelector('[data-badge-id="' + def.id + '"]')) return;
    var badge = document.createElement('span');
    badge.className = 'fases-badge' + (isNew ? ' fases-badge-new' : '');
    badge.setAttribute('data-badge-id', def.id);
    badge.setAttribute('title', def.desc);
    badge.setAttribute('role', 'img');
    badge.setAttribute('aria-label', def.label + ': ' + def.desc);
    badge.innerHTML =
      '<span class="fases-badge-emoji" aria-hidden="true">' + def.emoji + '</span>' +
      '<span class="fases-badge-label">' + def.label + '</span>';
    grid.appendChild(badge);
  }

  // ── V6.5: Confetti via Canvas ─────────────────────────────────────────────
  E.launchConfetti = function (originEl) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var canvas = document.getElementById('fases-confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'fases-confetti-canvas';
      canvas.className = 'fases-confetti-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
    }
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    var ctx    = canvas.getContext('2d');
    var COLORS = ['#4CB8A0', '#2D6A56', '#C9A84C', '#a8eddb', '#F7F6F2'];
    var originX = window.innerWidth  / 2;
    var originY = window.innerHeight * 0.35;
    if (originEl) {
      var rect = originEl.getBoundingClientRect();
      originX  = rect.left + rect.width  / 2;
      originY  = rect.top  + rect.height / 2;
    }
    var particles = [];
    for (var i = 0; i < 52; i++) {
      particles.push({
        x:    originX,
        y:    originY,
        vx:   (Math.random() - 0.5) * 8,
        vy:   (Math.random() - 0.82) * 10,
        r:    Math.random() * 5 + 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 1,
        rot:  Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.2,
      });
    }
    var startTime = null;
    var DURATION  = 1500;
    function step(ts) {
      if (!startTime) startTime = ts;
      var elapsed = ts - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function (p) {
        p.x   += p.vx;
        p.y   += p.vy;
        p.vy  += 0.24;
        p.rot += p.rotV;
        p.alpha = Math.max(0, 1 - elapsed / DURATION);
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
        ctx.restore();
      });
      if (elapsed < DURATION) {
        requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(step);
  };

  // ── V6.5: MutationObserver para nova .concluida ───────────────────────────
  function _observeConcluidaChanges() {
    var timeline = document.querySelector('.fases-timeline');
    if (!timeline) return;
    var previous = new Set(
      Array.from(document.querySelectorAll('.fase-item.concluida'))
        .map(function (el) { return el.id || el.getAttribute('data-fase-id') || el.textContent.slice(0, 24); })
    );
    var obs = new MutationObserver(function () {
      Array.from(document.querySelectorAll('.fase-item.concluida')).forEach(function (el) {
        var key = el.id || el.getAttribute('data-fase-id') || el.textContent.slice(0, 24);
        if (previous.has(key)) return;
        previous.add(key);
        E.launchConfetti(el);
        E.addXP(20);
        var nome = el.querySelector('.fase-nome');
        if (E.toast) E.toast('Fase concluída! ' + (nome ? nome.textContent.trim() : '') + ' ✓');
        _checkProgressMilestones();
      });
    });
    obs.observe(timeline, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }

  // ── V6.8: Toasts de marco de progresso ───────────────────────────────────
  function _checkProgressMilestones() {
    var items     = Array.from(document.querySelectorAll('.fase-item'));
    var total     = items.length;
    if (total === 0) return;
    var concluidas = items.filter(function (i) { return i.classList.contains('concluida'); }).length;
    var pct        = Math.round((concluidas / total) * 100);
    var reached;
    try { reached = JSON.parse(localStorage.getItem(LS_MILESTONES) || '[]'); } catch (_) { reached = []; }
    [25, 50, 75, 100].forEach(function (m) {
      if (pct < m || reached.indexOf(m) !== -1) return;
      reached.push(m);
      try { localStorage.setItem(LS_MILESTONES, JSON.stringify(reached)); } catch (_) {}
      if (m === 100) {
        E.checkAndUnlockBadge('plano-completo');
      } else if (m === 50) {
        E.checkAndUnlockBadge('metade-caminho');
      } else {
        if (E.toast) E.toast(m + '% do plano concluído! Continue assim 💪');
      }
    });
  }

  // ── V6.6: Som ao expandir + XP por fase única + badge 1ª abertura ─────────
  function _setupFaseOpenSound() {
    var orig = window.toggleFase;
    if (!orig || orig._v6sound) return;
    var wrapped = function (id) {
      var detalhe = document.getElementById(id);
      var wasOpen = detalhe && detalhe.classList.contains('open');
      orig(id);
      if (wasOpen) return;
      E.playPop();
      E.checkAndUnlockBadge('primeira-fase');
      try {
        var opened = JSON.parse(sessionStorage.getItem(SS_OPENED) || '[]');
        if (id && opened.indexOf(id) === -1) {
          opened.push(id);
          sessionStorage.setItem(SS_OPENED, JSON.stringify(opened));
          E.addXP(10);
        }
      } catch (_) {}
    };
    wrapped._v6sound = true;
    window.toggleFase = wrapped;
  }

  // ── Init V6 ───────────────────────────────────────────────────────────────
  function initV6() {
    var streak = updateStreak();
    if      (streak >= 7) E.checkAndUnlockBadge('streak-7');
    else if (streak >= 3) E.checkAndUnlockBadge('streak-3');

    _injectBadgeContainer();
    _renderXP(_getXP());
    _setupFaseOpenSound();
    _observeConcluidaChanges();
    _checkProgressMilestones();
  }

  function waitForContentV6() {
    var content = document.getElementById('fases-content');
    if (!content) { setTimeout(waitForContentV6, 180); return; }
    if (content.children.length > 0) { initV6(); return; }
    var obs = new MutationObserver(function () {
      if (content.children.length > 0) { obs.disconnect(); setTimeout(initV6, 110); }
    });
    obs.observe(content, { childList: true, attributes: true, attributeFilter: ['style'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForContentV6);
  } else {
    waitForContentV6();
  }
})();

// ═══ POLIMENTO V7 ═══
// 10 melhorias de telemetria local:
// V7.1  Contador de aberturas por fase em localStorage + persistência entre sessões
// V7.2  Duração de sessão via sessionStorage (início/fim)
// V7.3  Heatmap visual: glow no dot proporcional ao nº de aberturas (níveis 1-5)
// V7.4  Badge "Explorador" — ao abrir todas as fases pelo menos 1x
// V7.5  Feature-discovery hint: detecta se teclado nunca foi usado, sugere atalhos após 35s
// V7.6  Log de eventos rolling 50 em localStorage para análise pessoal
// V7.7  Painel de insights pessoais (fase mais visitada, XP, streak, sessão, eventos)
// V7.8  Detecção de retorno: toast personalizado na 1ª vs. N-ésima visita
// V7.9  "Última vez vista" badge inline por fase-id (localStorage)
// V7.10 Exportar todos os dados de uso como download JSON

(function initFasesExtrasV7() {
  'use strict';

  var E = window._fasesExtras = window._fasesExtras || {};

  var LS_OPENS      = 'fases_opens_v7';
  var LS_LAST_SEEN  = 'fases_last_seen_v7';
  var LS_ALL_OPENED = 'fases_all_opened_v7';
  var LS_VISITS     = 'fases_visit_count_v7';
  var LS_KB_USED    = 'fases_kb_used_v7';
  var LS_EVENT_LOG  = 'fases_event_log_v7';
  var LS_EXPLORADOR = 'fases_explorador_v7';
  var SS_SESSION    = 'fases_session_start_v7';

  // ── Storage helpers ───────────────────────────────────────────────────────
  function lsGet(key, def) {
    try { var v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : def; }
    catch (_) { return def; }
  }
  function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {} }
  function ssGet(key, def) {
    try { var v = sessionStorage.getItem(key); return v !== null ? JSON.parse(v) : def; }
    catch (_) { return def; }
  }
  function ssSet(key, val) { try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (_) {} }

  // ── V7.2: Duração de sessão ───────────────────────────────────────────────
  function setupSessionDuration() {
    if (!ssGet(SS_SESSION, null)) ssSet(SS_SESSION, Date.now());
    E.getSessionDuration = function () {
      return Math.round((Date.now() - ssGet(SS_SESSION, Date.now())) / 1000);
    };
  }

  // ── V7.6: Log de eventos rolling 50 ──────────────────────────────────────
  E.logEvent = function (eventName) {
    var log = lsGet(LS_EVENT_LOG, []);
    log.push({ event: eventName, ts: new Date().toISOString() });
    if (log.length > 50) log = log.slice(log.length - 50);
    lsSet(LS_EVENT_LOG, log);
  };

  // ── V7.1: Contador de aberturas + V7.9: última vez vista ─────────────────
  function patchToggleFaseV7() {
    var orig = window.toggleFase;
    if (!orig || orig._v7telemetry) return;
    var wrapped = function (id) {
      var detalhe = document.getElementById(id);
      var wasOpen = detalhe && detalhe.classList.contains('open');
      orig(id);
      var isOpen = detalhe && detalhe.classList.contains('open');
      if (!wasOpen && isOpen) {
        var opens = lsGet(LS_OPENS, {});
        opens[id] = (opens[id] || 0) + 1;
        lsSet(LS_OPENS, opens);

        var lastSeen = lsGet(LS_LAST_SEEN, {});
        lastSeen[id] = new Date().toISOString();
        lsSet(LS_LAST_SEEN, lastSeen);

        var allOpened = lsGet(LS_ALL_OPENED, []);
        if (allOpened.indexOf(id) === -1) {
          allOpened.push(id);
          lsSet(LS_ALL_OPENED, allOpened);
        }

        var item = detalhe && detalhe.closest('.fase-item');
        _applyHeat(item, opens[id]);
        _updateLastSeenBadge(id);
        E.logEvent('fase_open:' + id);
        _checkExploradorBadge();
      }
    };
    wrapped._v7telemetry = true;
    window.toggleFase = wrapped;
  }

  // ── V7.3: Heatmap visual ──────────────────────────────────────────────────
  function _applyHeat(item, count) {
    if (!item) return;
    item.classList.remove('fases-heat-1', 'fases-heat-2', 'fases-heat-3', 'fases-heat-4', 'fases-heat-5');
    var lvl = count >= 10 ? 5 : count >= 6 ? 4 : count >= 3 ? 3 : count >= 2 ? 2 : 1;
    item.classList.add('fases-heat-' + lvl);
    item.setAttribute('data-opens', String(count));
  }

  function applyAllHeatmaps() {
    var opens = lsGet(LS_OPENS, {});
    document.querySelectorAll('.fase-item').forEach(function (item) {
      var det = item.querySelector('.fase-detalhe');
      if (det && det.id && opens[det.id]) _applyHeat(item, opens[det.id]);
    });
  }

  // ── V7.9: Badge "última vez vista" inline ─────────────────────────────────
  function _timeAgo(isoStr) {
    var diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60)   return 'há menos de 1 min';
    if (diff < 3600) return 'há ' + Math.floor(diff / 60) + ' min';
    var days = Math.floor(diff / 86400);
    if (days === 0)  return 'hoje';
    if (days === 1)  return 'ontem';
    return 'há ' + days + ' dias';
  }

  function _updateLastSeenBadge(id) {
    var lastSeen = lsGet(LS_LAST_SEEN, {});
    var when = lastSeen[id];
    if (!when) return;
    var detalhe = document.getElementById(id);
    if (!detalhe) return;
    var parent = detalhe.closest('.fase-item');
    if (!parent) return;
    var nome = parent.querySelector('.fase-nome');
    if (!nome) return;
    var badge = nome.querySelector('.fases-last-seen');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'fases-last-seen';
      nome.appendChild(badge);
    }
    var text = _timeAgo(when);
    badge.textContent = text;
    badge.setAttribute('aria-label', 'Visto ' + text);
  }

  function applyAllLastSeen() {
    var lastSeen = lsGet(LS_LAST_SEEN, {});
    Object.keys(lastSeen).forEach(_updateLastSeenBadge);
  }

  // ── V7.4: Badge "Explorador" ──────────────────────────────────────────────
  function _checkExploradorBadge() {
    if (lsGet(LS_EXPLORADOR, false)) return;
    var allOpened = lsGet(LS_ALL_OPENED, []);
    var allIds = Array.from(document.querySelectorAll('.fase-item .fase-detalhe'))
      .map(function (d) { return d.id; }).filter(Boolean);
    if (allIds.length === 0) return;
    if (!allIds.every(function (id) { return allOpened.indexOf(id) !== -1; })) return;
    lsSet(LS_EXPLORADOR, true);
    var grid = document.querySelector('.fases-badges-grid');
    if (grid && !grid.querySelector('[data-badge-id="explorador"]')) {
      var b = document.createElement('span');
      b.className = 'fases-badge fases-badge-new';
      b.setAttribute('data-badge-id', 'explorador');
      b.setAttribute('title', 'Abriu todas as fases do plano pelo menos uma vez');
      b.setAttribute('role', 'img');
      b.setAttribute('aria-label', 'Explorador: abriu todas as fases do plano');
      b.innerHTML =
        '<span class="fases-badge-emoji" aria-hidden="true">🗺️</span>' +
        '<span class="fases-badge-label">Explorador</span>';
      grid.appendChild(b);
    }
    if (E.addXP)          E.addXP(50);
    if (E.toast)          E.toast('🗺️ Badge desbloqueado: Explorador!');
    if (E.announce)       E.announce('Badge Explorador desbloqueado! Você abriu todas as fases.');
    if (E.launchConfetti) E.launchConfetti();
    if (E.playChime)      setTimeout(E.playChime, 80);
    E.logEvent('badge_unlock:explorador');
  }

  // ── V7.5: Feature-discovery hint ─────────────────────────────────────────
  function setupKeyboardDiscovery() {
    if (lsGet(LS_KB_USED, false)) return;
    var hintTimer = setTimeout(function () {
      if (lsGet(LS_KB_USED, false) || document.hidden) return;
      if (E.toast) E.toast('Dica: pressione ? para ver atalhos de teclado');
      E.logEvent('kb_hint_shown');
    }, 35000);
    document.addEventListener('keydown', function onKbUse() {
      var tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      lsSet(LS_KB_USED, true);
      clearTimeout(hintTimer);
      document.removeEventListener('keydown', onKbUse);
    });
  }

  // ── V7.8: Detecção de retorno ─────────────────────────────────────────────
  function setupReturnVisitor() {
    var count = lsGet(LS_VISITS, 0) + 1;
    lsSet(LS_VISITS, count);
    var msg = null;
    if (count === 1)       msg = 'Bem-vinda ao seu plano de fases! ✨';
    else if (count <= 3)   msg = 'Bem-vinda de volta! Visita #' + count + ' 👋';
    else if (count === 10) msg = '10 visitas ao plano! Você é dedicada 🌟';
    if (msg) {
      setTimeout(function () {
        if (E.toast) E.toast(msg);
        E.logEvent(count === 1 ? 'first_visit' : 'return_visit:' + count);
      }, 1200);
    }
  }

  // ── V7.7: Painel de insights pessoais ─────────────────────────────────────
  function injectInsightsButton() {
    var hero = document.querySelector('.fases-hero');
    if (!hero || hero.querySelector('.fases-insights-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'fases-insights-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Ver meus dados de uso');
    btn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
        '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>' +
        '<line x1="6" y1="20" x2="6" y2="14"/>' +
      '</svg>Meus dados';
    btn.addEventListener('click', function () {
      E.openInsightsPanel();
      E.logEvent('insights_panel_open');
    });
    hero.appendChild(btn);
  }

  E.openInsightsPanel = function () {
    var overlay = document.getElementById('fases-insights-overlay');
    if (!overlay) { overlay = _buildInsightsOverlay(); document.body.appendChild(overlay); }
    _refreshInsightsBody(overlay);
    overlay.removeAttribute('hidden');
    var panel = overlay.querySelector('.fases-insights-panel');
    if (panel) panel.focus();
    document.body.style.overflow = 'hidden';
  };

  E.closeInsightsPanel = function () {
    var overlay = document.getElementById('fases-insights-overlay');
    if (overlay) overlay.setAttribute('hidden', '');
    document.body.style.overflow = '';
  };

  function _buildInsightsOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'fases-insights-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Meus dados de uso');
    overlay.setAttribute('hidden', '');
    overlay.innerHTML =
      '<div class="fases-insights-panel" tabindex="-1">' +
        '<button class="fases-insights-close" type="button" aria-label="Fechar painel">✕</button>' +
        '<h2 class="fases-insights-title">Meus dados</h2>' +
        '<div class="fases-insights-body"></div>' +
        '<button class="fases-insights-export" type="button">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
            '<polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' +
          '</svg>Exportar JSON' +
        '</button>' +
      '</div>';
    overlay.querySelector('.fases-insights-close').addEventListener('click', E.closeInsightsPanel);
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) E.closeInsightsPanel(); });
    overlay.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { E.closeInsightsPanel(); return; }
      if (ev.key !== 'Tab') return;
      var focusable = Array.from(overlay.querySelectorAll('button, [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (ev.shiftKey && document.activeElement === first)  { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    });
    overlay.querySelector('.fases-insights-export').addEventListener('click', function () {
      E.exportUsageData();
      E.logEvent('data_export');
    });
    return overlay;
  }

  function _refreshInsightsBody(overlay) {
    var body = overlay.querySelector('.fases-insights-body');
    if (!body) return;
    var opens     = lsGet(LS_OPENS, {});
    var visits    = lsGet(LS_VISITS, 0);
    var allOpened = lsGet(LS_ALL_OPENED, []);
    var xp        = parseInt(localStorage.getItem('fases_xp_v6') || '0', 10);
    var streak    = parseInt(localStorage.getItem('fases_streak_v6') || '0', 10);
    var eventLog  = lsGet(LS_EVENT_LOG, []);
    var s         = E.getSessionDuration ? E.getSessionDuration() : 0;
    var sessionStr = s < 60 ? s + 's' : Math.floor(s / 60) + 'min ' + (s % 60) + 's';
    var maxId = null, maxCount = 0;
    Object.keys(opens).forEach(function (id) {
      if (opens[id] > maxCount) { maxCount = opens[id]; maxId = id; }
    });
    var mostName = maxId;
    if (maxId) {
      var det = document.getElementById(maxId);
      var n   = det && det.closest('.fase-item') && det.closest('.fase-item').querySelector('.fase-nome');
      if (n) mostName = n.textContent.trim();
    }
    var rows = [
      ['Visitas totais à página',    visits],
      ['Fases distintas abertas',    allOpened.length],
      ['Fase mais visitada',         mostName ? mostName + ' (' + maxCount + 'x)' : '—'],
      ['Streak atual',               streak + ' dias'],
      ['XP acumulado',               xp + ' XP'],
      ['Duração desta sessão',       sessionStr],
      ['Eventos registrados',        eventLog.length],
    ];
    body.innerHTML = '<dl class="fases-insights-list">' +
      rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') +
    '</dl>';
  }

  // ── V7.10: Exportar dados como JSON ──────────────────────────────────────
  E.exportUsageData = function () {
    var keys = [
      LS_OPENS, LS_LAST_SEEN, LS_ALL_OPENED, LS_VISITS, LS_EVENT_LOG, LS_KB_USED, LS_EXPLORADOR,
      'fases_xp_v6', 'fases_streak_v6', 'fases_last_day_v6', 'fases_badges_v6', 'fases_milestones_v6'
    ];
    var payload = { exported: new Date().toISOString(), source: 'ERG 360 — fases.html', data: {} };
    keys.forEach(function (k) {
      try { payload.data[k] = JSON.parse(localStorage.getItem(k)); } catch (_) {}
    });
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'erg360-meus-dados.json'; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    if (E.toast)    E.toast('Dados exportados!');
    if (E.announce) E.announce('Arquivo de dados exportado com sucesso');
  };

  // ── Init V7 ───────────────────────────────────────────────────────────────
  function initV7() {
    applyAllHeatmaps();
    applyAllLastSeen();
    _checkExploradorBadge();
    injectInsightsButton();
    patchToggleFaseV7();
  }

  function waitForContentV7() {
    var content = document.getElementById('fases-content');
    if (!content) { setTimeout(waitForContentV7, 200); return; }
    if (content.children.length > 0) { initV7(); return; }
    var obs = new MutationObserver(function () {
      if (content.children.length > 0) { obs.disconnect(); setTimeout(initV7, 120); }
    });
    obs.observe(content, { childList: true, attributes: true, attributeFilter: ['style'] });
  }

  setupSessionDuration();
  setupReturnVisitor();
  setupKeyboardDiscovery();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForContentV7);
  } else {
    waitForContentV7();
  }
})();