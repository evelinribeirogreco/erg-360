// ═══ POLIMENTO V1 ═══
// 16 melhorias UX: scroll progress, header blur, section reveals,
// pilar/steps/razoes stagger, quote reveal, CTA ripple, reading time,
// back-btn a11y, skip-link, hero entrance, hero-line, pilar a11y,
// smooth scroll, page-visibility title swap, CTA link underline.

(function () {
  'use strict';

  // 1. Scroll progress bar
  function initScrollProgress() {
    const bar = document.getElementById('sobre-scroll-progress');
    if (!bar) return;
    window.addEventListener('scroll', function () {
      const h = document.documentElement;
      const pct = h.scrollTop / (h.scrollHeight - h.clientHeight);
      bar.style.transform = 'scaleX(' + Math.min(1, pct) + ')';
    }, { passive: true });
  }

  // 2. Header blur + shadow on scroll
  function initHeaderScroll() {
    const header = document.querySelector('.sobre-header');
    const sentinel = document.getElementById('sobre-scroll-sentinel');
    if (!header || !sentinel) return;
    const obs = new IntersectionObserver(function (entries) {
      header.classList.toggle('sobre-header--scrolled', !entries[0].isIntersecting);
    }, { threshold: 0 });
    obs.observe(sentinel);
  }

  // 3. Section reveal (fade + translate)
  function initSectionReveal() {
    const targets = document.querySelectorAll('.sobre-section, .sobre-hero, .sobre-cta');
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('sobre-revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.07 });
    targets.forEach(function (t) {
      t.classList.add('sobre-reveal');
      io.observe(t);
    });
  }

  // 4. Pilar cards staggered reveal
  function initPilarReveal() {
    const cards = document.querySelectorAll('.pilar-card');
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('pilar-card--visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    cards.forEach(function (c, i) {
      c.style.transitionDelay = (i * 55) + 'ms';
      c.classList.add('pilar-card--hidden');
      io.observe(c);
    });
  }

  // 5. Razões grid staggered reveal
  function initRazoesReveal() {
    const items = document.querySelectorAll('.sobre-razao');
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('sobre-razao--visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    items.forEach(function (item, i) {
      item.style.transitionDelay = (i * 80) + 'ms';
      item.classList.add('sobre-razao--hidden');
      io.observe(item);
    });
  }

  // 6. Steps staggered reveal
  function initStepsReveal() {
    const steps = document.querySelectorAll('.sobre-step');
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('sobre-step--visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    steps.forEach(function (s, i) {
      s.style.transitionDelay = (i * 100) + 'ms';
      s.classList.add('sobre-step--hidden');
      io.observe(s);
    });
  }

  // 7. Quote reveal
  function initQuoteReveal() {
    const quote = document.querySelector('.sobre-quote');
    if (!quote) return;
    quote.classList.add('sobre-quote--hidden');
    const io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        quote.classList.add('sobre-quote--visible');
        io.disconnect();
      }
    }, { threshold: 0.45 });
    io.observe(quote);
  }

  // 8. CTA button ripple
  function initRipple() {
    const btn = document.querySelector('.sobre-cta-btn');
    if (!btn) return;
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.addEventListener('pointerdown', function (e) {
      const r = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'sobre-btn-ripple';
      ripple.style.left = (e.clientX - r.left) + 'px';
      ripple.style.top  = (e.clientY - r.top)  + 'px';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', function () { ripple.remove(); });
    });
  }

  // 9. Reading time estimate
  function initReadingTime() {
    const heroInner = document.querySelector('.sobre-hero-inner');
    const main = document.querySelector('.sobre-main');
    if (!heroInner || !main) return;
    const words = (main.innerText || '').trim().split(/\s+/).length;
    const mins = Math.max(1, Math.round(words / 200));
    const el = document.createElement('p');
    el.className = 'sobre-reading-time';
    el.setAttribute('aria-label', 'Tempo estimado de leitura: ' + mins + (mins === 1 ? ' minuto' : ' minutos'));
    el.textContent = mins + ' min de leitura';
    heroInner.appendChild(el);
  }

  // 10. Back button accessibility
  function initBackBtn() {
    const btn = document.querySelector('.checkin-back');
    if (!btn) return;
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'Voltar ao dashboard');
    if (!btn.getAttribute('tabindex')) btn.setAttribute('tabindex', '0');
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
  }

  // 11. Skip link for keyboard navigation
  function initSkipLink() {
    if (document.getElementById('sobre-skip-link')) return;
    const link = document.createElement('a');
    link.id = 'sobre-skip-link';
    link.href = '#sobre-main-content';
    link.textContent = 'Ir para o conteúdo';
    link.className = 'sobre-skip-link';
    document.body.prepend(link);
    const main = document.querySelector('.sobre-main');
    if (main && !main.id) main.id = 'sobre-main-content';
  }

  // 12. Hero elements entrance animation
  function initHeroEntrance() {
    const els = document.querySelectorAll(
      '.sobre-eyebrow, .sobre-hero-title, .sobre-hero-subtitle, .sobre-hero-desc'
    );
    els.forEach(function (el, i) {
      el.classList.add('sobre-hero-enter');
      el.style.animationDelay = (i * 120 + 80) + 'ms';
    });
  }

  // 13. Hero dividing line grow animation
  function initHeroLine() {
    const line = document.querySelector('.sobre-hero-line');
    if (line) line.classList.add('sobre-hero-line--animate');
  }

  // 14. Pilar cards keyboard navigation + ARIA
  function initPilarA11y() {
    const grid = document.querySelector('.pilares-grid');
    if (grid) grid.setAttribute('role', 'list');
    document.querySelectorAll('.pilar-card').forEach(function (card, i) {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'listitem');
      const name = card.querySelector('.pilar-nome');
      if (name) card.setAttribute('aria-label', name.textContent.trim());
    });
  }

  // 15. Smooth scroll for in-page anchor links
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // 16. Page visibility — title swap to re-engage user
  function initPageVisibility() {
    const original = document.title;
    document.addEventListener('visibilitychange', function () {
      document.title = document.hidden ? '👋 Volte logo! — ERG 360' : original;
    });
  }

  function init() {
    initSkipLink();
    initBackBtn();
    initScrollProgress();
    initHeaderScroll();
    initHeroEntrance();
    initHeroLine();
    initSectionReveal();
    initPilarReveal();
    initPilarA11y();
    initRazoesReveal();
    initStepsReveal();
    initQuoteReveal();
    initRipple();
    initReadingTime();
    initSmoothScroll();
    initPageVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window._sobreExtras = { version: 1 };
})();

// ═══ POLIMENTO V3 ═══
// 10 melhorias acessibilidade avançada: reduced-motion, ARIA live,
// landmark roles, steps/razões list roles, quote a11y, focus ring,
// pilar aria-describedby, multi skip-links, header landmark.

(function () {
  'use strict';

  function srOnly(el) {
    Object.assign(el.style, {
      position: 'absolute', width: '1px', height: '1px',
      padding: '0', margin: '-1px', overflow: 'hidden',
      clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: '0'
    });
  }

  // 1. Reduced motion — toggle body class; CSS disables animations
  function initReducedMotion() {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    function apply(e) { document.body.classList.toggle('sobre-no-motion', e.matches); }
    apply(mq);
    if (mq.addEventListener) mq.addEventListener('change', apply);
  }

  // 2. ARIA live announcer — politely announces section heading on first intersect
  function initAriaLiveAnnouncer() {
    if (document.getElementById('sobre-live')) return;
    var live = document.createElement('div');
    live.id = 'sobre-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    srOnly(live);
    document.body.appendChild(live);

    var sections = document.querySelectorAll('.sobre-section, .sobre-hero, .sobre-cta');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var heading = e.target.querySelector('h1, h2');
        if (heading) {
          live.textContent = '';
          setTimeout(function () { live.textContent = heading.textContent.trim(); }, 60);
        }
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });

    sections.forEach(function (s) { io.observe(s); });
  }

  // 3. Landmark roles — role="region" + aria-labelledby for each section
  function initLandmarkRoles() {
    document.querySelectorAll('.sobre-section, .sobre-hero, .sobre-cta').forEach(function (sec) {
      if (sec.getAttribute('role')) return;
      sec.setAttribute('role', 'region');
      var heading = sec.querySelector('h1, h2');
      if (heading) {
        if (!heading.id) heading.id = 'sobre-hd-' + Math.random().toString(36).slice(2, 7);
        sec.setAttribute('aria-labelledby', heading.id);
      }
    });
  }

  // 4. Steps — ordered list ARIA roles + labelled items
  function initStepsA11y() {
    var container = document.querySelector('.sobre-steps');
    if (!container) return;
    container.setAttribute('role', 'list');
    container.setAttribute('aria-label', 'Etapas do sistema ERG 360');
    container.querySelectorAll('.sobre-step').forEach(function (step) {
      step.setAttribute('role', 'listitem');
      var num = step.querySelector('.sobre-step-num');
      var title = step.querySelector('.sobre-step-title');
      if (num && title) {
        step.setAttribute('aria-label', 'Etapa ' + num.textContent.trim() + ': ' + title.textContent.trim());
      }
    });
  }

  // 5. Razões — list ARIA roles + aria-labelledby each título
  function initRazoesA11y() {
    var container = document.querySelector('.sobre-razoes');
    if (!container) return;
    container.setAttribute('role', 'list');
    container.setAttribute('aria-label', 'Razões para registrar diariamente');
    container.querySelectorAll('.sobre-razao').forEach(function (razao, i) {
      razao.setAttribute('role', 'listitem');
      var titulo = razao.querySelector('.sobre-razao-titulo');
      if (titulo) {
        if (!titulo.id) titulo.id = 'razao-t-' + i;
        razao.setAttribute('aria-labelledby', titulo.id);
      }
    });
  }

  // 6. Blockquote accessibility — aria-label + figure wrapper
  function initQuoteA11y() {
    var quote = document.querySelector('.sobre-quote');
    if (!quote) return;
    if (!quote.getAttribute('aria-label')) {
      var text = (quote.textContent || '').trim().replace(/\s+/g, ' ');
      quote.setAttribute('aria-label', 'Citação: ' + text);
    }
    if (quote.parentElement && quote.parentElement.tagName !== 'FIGURE') {
      var fig = document.createElement('figure');
      fig.setAttribute('aria-label', 'Filosofia do ERG 360');
      quote.parentNode.insertBefore(fig, quote);
      fig.appendChild(quote);
    }
  }

  // 7. Enhanced focus ring — add class to all interactive elements
  function initFocusEnhancement() {
    document.querySelectorAll('a, button, [tabindex]').forEach(function (el) {
      el.classList.add('sobre-focusable');
    });
    document.addEventListener('focusin', function (e) {
      if (e.target && e.target.matches && e.target.matches('a, button, [tabindex]')) {
        e.target.classList.add('sobre-focusable');
      }
    }, true);
  }

  // 8. Pilar cards — aria-describedby pointing to each pilar description
  function initPilarDescribedBy() {
    document.querySelectorAll('.pilar-card').forEach(function (card, i) {
      var desc = card.querySelector('.pilar-desc');
      if (!desc) return;
      if (!desc.id) desc.id = 'pilar-desc-' + i;
      card.setAttribute('aria-describedby', desc.id);
    });
  }

  // 9. Multi skip-links — additional landmark shortcuts (right-aligned, complement V1's link)
  function initMultiSkipLinks() {
    if (document.getElementById('sobre-skipnav')) return;

    var altSection = document.querySelector('.sobre-section--alt');
    if (altSection && !altSection.id) altSection.id = 'sobre-como-funciona';

    var pilaresGrid = document.querySelector('.pilares-grid');
    if (pilaresGrid) {
      var pilaresSection = pilaresGrid.closest('.sobre-section');
      if (pilaresSection && !pilaresSection.id) pilaresSection.id = 'sobre-pilares-section';
    }

    var ctaSection = document.querySelector('.sobre-cta');
    if (ctaSection && !ctaSection.id) ctaSection.id = 'sobre-cta-section';

    var nav = document.createElement('nav');
    nav.id = 'sobre-skipnav';
    nav.className = 'sobre-skipnav';
    nav.setAttribute('aria-label', 'Atalhos de navegação da página');

    [
      { href: '#sobre-como-funciona', text: 'Ir para: Como funciona' },
      { href: '#sobre-pilares-section', text: 'Ir para: Os 7 pilares' },
      { href: '#sobre-cta-section',    text: 'Ir para: Começar check-in' }
    ].forEach(function (l) {
      var a = document.createElement('a');
      a.href = l.href;
      a.textContent = l.text;
      a.className = 'sobre-skip-link sobre-skipnav-link';
      nav.appendChild(a);
    });

    document.body.prepend(nav);
  }

  // 10. Header landmark + logo alt text refinement
  function initHeaderA11y() {
    var header = document.querySelector('.sobre-header');
    if (!header) return;
    if (!header.getAttribute('role')) header.setAttribute('role', 'banner');

    var logo = header.querySelector('.checkin-logo');
    if (logo && logo.getAttribute('alt') === 'ERG 360') {
      logo.setAttribute('alt', 'ERG 360 — logotipo');
    }

    var logoWrap = header.querySelector('.sobre-header-logo');
    if (logoWrap && !logoWrap.getAttribute('role')) logoWrap.setAttribute('aria-hidden', 'true');
  }

  function initV3() {
    initReducedMotion();
    initAriaLiveAnnouncer();
    initLandmarkRoles();
    initStepsA11y();
    initRazoesA11y();
    initQuoteA11y();
    initFocusEnhancement();
    initPilarDescribedBy();
    initMultiSkipLinks();
    initHeaderA11y();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV3);
  } else {
    initV3();
  }

  var _prev = window._sobreExtras || {};
  window._sobreExtras = Object.assign({}, _prev, { version: 3, v3: true });
})();

// ═══ POLIMENTO V4 ═══
// 10 melhorias de performance: hover-prefetch, sessionStorage reading-time,
// img.decode async, document.fonts.ready, ResizeObserver pilares,
// preconnect Google Fonts, rIC section index, fetchpriority hero/cta,
// will-change lifecycle, pagehide cleanup.

(function () {
  'use strict';

  var _ioList = [];
  var _timers = [];

  function ric(fn, timeout) {
    if (typeof requestIdleCallback === 'function') {
      return requestIdleCallback(fn, { timeout: timeout || 2000 });
    }
    return setTimeout(fn, 60);
  }

  // 1. Hover-intent prefetch — inject <link rel="prefetch"> após 220ms de hover
  function initHoverPrefetch() {
    var prefetched = new Set();
    var hoverTimer = null;

    function prefetch(href) {
      if (!href || prefetched.has(href)) return;
      try {
        var url = new URL(href, location.href);
        if (url.origin !== location.origin) return;
        prefetched.add(href);
        var link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        link.as = 'document';
        document.head.appendChild(link);
      } catch (e) {}
    }

    document.querySelectorAll('a[href]').forEach(function (a) {
      a.addEventListener('mouseenter', function () {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { prefetch(a.getAttribute('href')); }, 220);
      });
      a.addEventListener('mouseleave', function () { clearTimeout(hoverTimer); });
      a.addEventListener('touchstart', function () { prefetch(a.getAttribute('href')); }, { passive: true });
    });
  }

  // 2. sessionStorage reading-time cache — evita retraversão do DOM em visitas repetidas
  function initReadingTimeCache() {
    var heroInner = document.querySelector('.sobre-hero-inner');
    if (!heroInner) return;
    var KEY = 'erg360_sobre_rt';
    var el = heroInner.querySelector('.sobre-reading-time');
    if (!el) return;

    var cached = sessionStorage.getItem(KEY);
    if (cached) {
      el.textContent = cached + ' min de leitura';
      el.setAttribute('aria-label', 'Tempo estimado de leitura: ' + cached +
        (cached === '1' ? ' minuto' : ' minutos'));
      return;
    }
    ric(function () {
      var main = document.querySelector('.sobre-main');
      if (!main) return;
      var mins = String(Math.max(1, Math.round(
        (main.innerText || '').trim().split(/\s+/).length / 200
      )));
      try { sessionStorage.setItem(KEY, mins); } catch (e) {}
    });
  }

  // 3. img.decode() assíncrono — libera thread principal durante decode
  function initImgDecode() {
    document.querySelectorAll('img').forEach(function (img) {
      if (typeof img.decode === 'function') {
        img.decode().then(function () {
          img.dataset.decoded = '1';
        }).catch(function () {});
      }
    });
  }

  // 4. document.fonts.ready — aplica classe quando web fonts carregam
  function initFontReady() {
    if (!document.fonts || typeof document.fonts.ready !== 'object') return;
    document.fonts.ready.then(function () {
      document.body.classList.add('sobre-fonts-loaded');
    });
  }

  // 5. ResizeObserver pilares grid — expõe largura e contagem de colunas via data/CSS prop
  function initPilaresResizeObserver() {
    var grid = document.querySelector('.pilares-grid');
    if (!grid || typeof ResizeObserver === 'undefined') return;

    var ro = new ResizeObserver(function (entries) {
      var w = entries[0].contentRect ? entries[0].contentRect.width : grid.offsetWidth;
      grid.style.setProperty('--grid-width', Math.round(w) + 'px');
      grid.dataset.cols = w >= 900 ? '3' : w >= 580 ? '2' : '1';
    });
    ro.observe(grid);
    _ioList.push({ disconnect: function () { ro.disconnect(); } });
  }

  // 6. Preconnect Google Fonts — reduz latência de DNS+TLS se não declarado no HTML
  function initFontPreconnect() {
    [
      { href: 'https://fonts.googleapis.com', crossOrigin: false },
      { href: 'https://fonts.gstatic.com',    crossOrigin: true  }
    ].forEach(function (cfg) {
      var sel = 'link[rel="preconnect"][href="' + cfg.href + '"]';
      if (document.querySelector(sel)) return;
      var link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = cfg.href;
      if (cfg.crossOrigin) link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  // 7. rIC section index — constrói mapa de seções no localStorage durante idle
  function initSectionIndex() {
    ric(function () {
      try {
        var sections = [];
        document.querySelectorAll('.sobre-section, .sobre-hero, .sobre-cta').forEach(function (sec) {
          var h = sec.querySelector('h1, h2');
          if (h && sec.id) sections.push({ id: sec.id, label: h.textContent.trim() });
        });
        if (sections.length) localStorage.setItem('erg360_sobre_nav_v1', JSON.stringify(sections));
      } catch (e) {}
    }, 3000);
  }

  // 8. fetchpriority — alta prioridade no logo do header, baixa + lazy no CTA
  function initFetchPriority() {
    var heroImg = document.querySelector('.sobre-header .checkin-logo');
    if (heroImg && 'fetchPriority' in heroImg) heroImg.fetchPriority = 'high';

    var ctaLogo = document.querySelector('.sobre-cta-logo');
    if (ctaLogo) {
      if ('fetchPriority' in ctaLogo) ctaLogo.fetchPriority = 'low';
      if (!ctaLogo.hasAttribute('loading')) ctaLogo.setAttribute('loading', 'lazy');
    }
  }

  // 9. will-change lifecycle — ativa antes da animação, remove após para liberar layer
  function initWillChange() {
    var animTargets = document.querySelectorAll(
      '.pilar-card--hidden, .sobre-razao--hidden, .sobre-step--hidden, .sobre-reveal'
    );
    animTargets.forEach(function (el) { el.style.willChange = 'opacity, transform'; });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        var tid = setTimeout(function () { t.style.willChange = 'auto'; }, 750);
        _timers.push(tid);
        io.unobserve(t);
      });
    }, { threshold: 0.05 });

    animTargets.forEach(function (el) { io.observe(el); });
    _ioList.push(io);
  }

  // 10. pagehide cleanup — desconecta observers e limpa timers ao sair da página
  function initPagehideCleanup() {
    window.addEventListener('pagehide', function () {
      _ioList.forEach(function (io) { try { io.disconnect(); } catch (e) {} });
      _timers.forEach(function (t) { clearTimeout(t); });
      _ioList.length = 0;
      _timers.length = 0;
    });
  }

  function initV4() {
    initHoverPrefetch();
    initReadingTimeCache();
    initImgDecode();
    initFontReady();
    initPilaresResizeObserver();
    initFontPreconnect();
    initSectionIndex();
    initFetchPriority();
    initWillChange();
    initPagehideCleanup();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV4);
  } else {
    initV4();
  }

  var _prev = window._sobreExtras || {};
  window._sobreExtras = Object.assign({}, _prev, { version: 4, v4: true });
})();

// ═══ POLIMENTO V5 ═══
// 10 Web APIs modernas: Web Share + Clipboard fallback, Wake Lock, Battery API,
// Vibration API, Navigator.onLine toast, Network Information, acumulador de
// tempo de leitura (Page Visibility estendida), storage.persist,
// dark-mode matchMedia, Web Notifications lembrete opt-in.

(function () {
  'use strict';

  // ── Toast helper (reutilizado por vários módulos) ──
  function _showToast(msg, type) {
    var t = document.createElement('div');
    t.className = 'sobre-toast sobre-toast--' + (type || 'info');
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('sobre-toast--visible'); }, 10);
    setTimeout(function () {
      t.classList.remove('sobre-toast--visible');
      setTimeout(function () { t.remove(); }, 350);
    }, 2800);
  }

  // 1. Web Share / Clipboard fallback — botão "Compartilhar" na seção CTA
  function initWebShare() {
    var cta = document.querySelector('.sobre-cta-inner');
    if (!cta || document.getElementById('sobre-share-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'sobre-share-btn';
    btn.className = 'sobre-share-btn';
    btn.setAttribute('aria-label', 'Compartilhar esta página');
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
        '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
        '<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>' +
        '<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' +
      '</svg><span>Compartilhar</span>';

    var ctaLink = cta.querySelector('.sobre-cta-link');
    if (ctaLink) cta.insertBefore(btn, ctaLink);
    else cta.appendChild(btn);

    btn.addEventListener('click', function () {
      var shareData = {
        title: 'ERG 360 — Nutrição, Performance & Estilo de Vida',
        text: 'Conheça o ERG 360, plataforma de acompanhamento nutricional de alto padrão.',
        url: location.href
      };
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        navigator.share(shareData).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(location.href)
          .then(function () { _showToast('Link copiado!', 'success'); })
          .catch(function () { _showToast('Copie o link da barra do navegador', 'info'); });
      } else {
        _showToast('Copie o link da barra do navegador', 'info');
      }
    });
  }

  // 2. Wake Lock API — mantém tela ativa após 45 s de leitura contínua
  function initWakeLock() {
    if (!('wakeLock' in navigator)) return;
    var lock = null;
    var timer = null;

    function acquire() {
      if (lock || document.hidden) return;
      navigator.wakeLock.request('screen').then(function (l) {
        lock = l;
        lock.addEventListener('release', function () { lock = null; });
      }).catch(function () {});
    }

    function release() {
      clearTimeout(timer);
      if (lock) { lock.release().catch(function () {}); lock = null; }
    }

    timer = setTimeout(acquire, 45000);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        release();
      } else {
        timer = setTimeout(acquire, 5000);
      }
    });

    window.addEventListener('pagehide', release);
  }

  // 3. Battery API — modo eco se nível < 20% e não carregando
  function initBattery() {
    if (!navigator.getBattery) return;
    navigator.getBattery().then(function (battery) {
      function check() {
        var low = !battery.charging && battery.level < 0.20;
        document.body.classList.toggle('sobre-eco-mode', low);
      }
      check();
      battery.addEventListener('levelchange', check);
      battery.addEventListener('chargingchange', check);
    }).catch(function () {});
  }

  // 4. Vibration API — feedback háptico de 12 ms no botão CTA principal
  function initHapticCTA() {
    if (!navigator.vibrate) return;
    var btn = document.querySelector('.sobre-cta-btn');
    if (!btn) return;
    btn.addEventListener('pointerdown', function () { navigator.vibrate(12); });
  }

  // 5. Navigator.onLine — barra de aviso ao perder conexão
  function initOnlineStatus() {
    var bar = null;

    function showOffline() {
      if (bar) return;
      bar = document.createElement('div');
      bar.id = 'sobre-offline-bar';
      bar.className = 'sobre-offline-bar';
      bar.setAttribute('role', 'alert');
      bar.setAttribute('aria-live', 'assertive');
      bar.textContent = 'Sem conexão — algumas funcionalidades podem ser limitadas';
      document.body.appendChild(bar);
      setTimeout(function () { bar.classList.add('sobre-offline-bar--visible'); }, 10);
    }

    function hideOffline() {
      if (bar) {
        bar.classList.remove('sobre-offline-bar--visible');
        setTimeout(function () { if (bar) { bar.remove(); bar = null; } }, 350);
      }
      _showToast('Conexão restaurada', 'success');
    }

    if (!navigator.onLine) showOffline();
    window.addEventListener('offline', showOffline);
    window.addEventListener('online', hideOffline);
  }

  // 6. Network Information API — simplifica UI em rede lenta ou save-data
  function initNetworkInfo() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    function check() {
      var slow = conn.effectiveType === 'slow-2g' ||
                 conn.effectiveType === '2g'      ||
                 !!conn.saveData;
      document.body.classList.toggle('sobre-slow-net', slow);
    }
    check();
    if (conn.addEventListener) conn.addEventListener('change', check);
  }

  // 7. Acumulador de tempo de leitura (Page Visibility estendida)
  //    Pausa quando tab está oculta; exibe badge após 2 min acumulados
  function initReadingTimer() {
    var KEY = 'erg360_sobre_read_total_ms';
    var startTime = Date.now();
    var accumulated = 0;
    var active = !document.hidden;

    try { accumulated = parseInt(localStorage.getItem(KEY) || '0', 10) || 0; } catch (e) {}

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        accumulated += Date.now() - startTime;
        active = false;
      } else {
        startTime = Date.now();
        active = true;
      }
    });

    function save() {
      var total = accumulated + (active ? Date.now() - startTime : 0);
      try { localStorage.setItem(KEY, String(total)); } catch (e) {}
      return total;
    }

    window.addEventListener('pagehide', function () {
      _updateReadBadge(save());
    });

    // Verifica a cada 15 s se já atingiu 2 min
    setInterval(function () {
      if (active) _updateReadBadge(save());
    }, 15000);

    // Badge imediato se sessão anterior já tinha >2 min
    if (accumulated >= 120000) _updateReadBadge(accumulated);
  }

  function _updateReadBadge(ms) {
    var mins = Math.floor(ms / 60000);
    if (mins < 2) return;
    var badge = document.getElementById('sobre-read-badge');
    if (!badge) {
      badge = document.createElement('p');
      badge.id = 'sobre-read-badge';
      badge.className = 'sobre-read-badge';
      badge.setAttribute('aria-label', 'Tempo total de leitura desta página: ' + mins + ' minutos');
      var rt = document.querySelector('.sobre-reading-time');
      if (rt) rt.insertAdjacentElement('afterend', badge);
      else {
        var hero = document.querySelector('.sobre-hero-inner');
        if (hero) hero.appendChild(badge);
      }
    }
    badge.textContent = mins + ' min lidos no total';
    badge.setAttribute('aria-label', 'Tempo total de leitura desta página: ' + mins + ' minutos');
  }

  // 8. Storage persistence — solicita persistência silenciosa
  function initStoragePersist() {
    if (!navigator.storage || !navigator.storage.persist) return;
    navigator.storage.persisted().then(function (persisted) {
      if (!persisted) {
        navigator.storage.persist().then(function (granted) {
          if (granted) {
            try { localStorage.setItem('erg360_storage_persisted', '1'); } catch (e) {}
          }
        }).catch(function () {});
      }
    }).catch(function () {});
  }

  // 9. matchMedia prefers-color-scheme dark
  function initDarkMode() {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    function apply(e) { document.body.classList.toggle('sobre-dark-mode', e.matches); }
    apply(mq);
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  }

  // 10. Web Notifications — botão de lembrete diário (opt-in, pede permissão ao clicar)
  function initNotificationReminder() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') return;
    var cta = document.querySelector('.sobre-cta-inner');
    if (!cta || document.getElementById('sobre-notif-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'sobre-notif-btn';
    btn.className = 'sobre-notif-btn';
    var isGranted = Notification.permission === 'granted';
    btn.setAttribute('aria-label', isGranted ? 'Lembrete de check-in já ativado' : 'Ativar lembrete diário de check-in');
    btn.textContent = isGranted ? '🔔 Lembrete ativo' : '🔔 Ativar lembrete';
    btn.disabled = isGranted;

    var ctaLink = cta.querySelector('.sobre-cta-link');
    if (ctaLink) cta.insertBefore(btn, ctaLink);
    else cta.appendChild(btn);

    if (isGranted) return;

    btn.addEventListener('click', function () {
      Notification.requestPermission().then(function (perm) {
        if (perm === 'granted') {
          btn.textContent = '🔔 Lembrete ativo';
          btn.setAttribute('aria-label', 'Lembrete de check-in já ativado');
          btn.disabled = true;
          new Notification('ERG 360 — Lembrete ativado!', {
            body: 'Você receberá lembretes para fazer seu check-in diário.',
            icon: 'icons/icon-152x152.png'
          });
        } else {
          btn.textContent = '🕕 Não permitido';
          btn.disabled = true;
        }
      }).catch(function () {});
    });
  }

  function initV5() {
    initDarkMode();
    initBattery();
    initNetworkInfo();
    initOnlineStatus();
    initWakeLock();
    initHapticCTA();
    initWebShare();
    initNotificationReminder();
    initReadingTimer();
    initStoragePersist();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV5);
  } else {
    initV5();
  }

  var _prev = window._sobreExtras || {};
  window._sobreExtras = Object.assign({}, _prev, { version: 5, v5: true });
})();

// ═══ POLIMENTO V6 ═══
// 10 micro-melhorias de gamificação: confetti engine reutilizável, streak badge,
// achievements por tempo de leitura, AudioContext micro-chime, scroll milestone
// (barra vira gold), visit counter badge, pilar "first-discover" glow dourado,
// CTA magnetic hover, section progress dots, confetti de boas-vindas (1ª visita).

(function () {
  'use strict';

  // ── Confetti engine (canvas, zero deps) ────────────────────────────────────
  function _launchConfetti(opts) {
    var canvas = document.getElementById('sobre-confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'sobre-confetti-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      Object.assign(canvas.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: '9990'
      });
      document.body.appendChild(canvas);
    }
    var ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    var count     = (opts && opts.count)     ? opts.count     : 60;
    var intensity = (opts && opts.intensity) ? opts.intensity : 1;
    var duration  = (opts && opts.duration)  ? opts.duration  : 1400;
    var originX   = (opts && opts.x != null) ? opts.x         : canvas.width / 2;
    var originY   = (opts && opts.y != null) ? opts.y         : canvas.height * 0.45;
    var colors    = ['#4CB8A0', '#2D6A56', '#C9A84C', '#F7F6F2', '#8DD3C7', '#E8C95A'];

    var particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: originX, y: originY,
        vx: (Math.random() - 0.5) * 8 * intensity,
        vy: (Math.random() - 0.75) * 10 * intensity,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 5,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8,
        alpha: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }

    var startTime = performance.now();
    function draw(now) {
      var elapsed = now - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var alive = false;
      particles.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.26;
        p.rotation += p.rotSpeed;
        p.alpha = Math.max(0, 1 - elapsed / duration);
        if (p.alpha <= 0) return;
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      if (alive && elapsed < duration + 400) {
        requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(draw);
  }

  // ── Achievement toast helper ────────────────────────────────────────────────
  function _showAchievement(def) {
    var el = document.createElement('div');
    el.className = 'sobre-achievement';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', 'Conquista desbloqueada: ' + def.label + ' — ' + def.desc);
    el.innerHTML =
      '<span class="sobre-achievement-icon" aria-hidden="true">' + def.icon + '</span>' +
      '<div class="sobre-achievement-body">' +
        '<span class="sobre-achievement-title">Conquista desbloqueada</span>' +
        '<span class="sobre-achievement-name">' + def.label + '</span>' +
        '<span class="sobre-achievement-desc">' + def.desc + '</span>' +
      '</div>';
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('sobre-achievement--visible'); }, 30);
    setTimeout(function () {
      el.classList.remove('sobre-achievement--visible');
      setTimeout(function () { el.remove(); }, 450);
    }, 3800);
  }

  // ── Game toast helper (reuses V5 sobre-toast, adds --gold variant) ─────────
  function _showGameToast(msg, type) {
    var t = document.createElement('div');
    t.className = 'sobre-toast sobre-toast--' + (type || 'gold');
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('sobre-toast--visible'); }, 10);
    setTimeout(function () {
      t.classList.remove('sobre-toast--visible');
      setTimeout(function () { t.remove(); }, 350);
    }, 3200);
  }

  // 1. Streak badge — lê erg360_checkin_streak do localStorage
  function initStreakBadge() {
    var streak = 0;
    try { streak = parseInt(localStorage.getItem('erg360_checkin_streak') || '0', 10) || 0; } catch (e) {}
    if (streak < 2) return;
    var heroInner = document.querySelector('.sobre-hero-inner');
    if (!heroInner || document.getElementById('sobre-streak-badge')) return;
    var badge = document.createElement('div');
    badge.id = 'sobre-streak-badge';
    badge.className = 'sobre-streak-badge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', 'Sequência de ' + streak + ' dias de check-in');
    badge.innerHTML =
      '<span class="sobre-streak-flame" aria-hidden="true">🔥</span>' +
      '<span class="sobre-streak-count">' + streak + '</span>' +
      '<span class="sobre-streak-label">dias seguidos</span>';
    heroInner.appendChild(badge);
  }

  // 2. Confetti burst on CTA click
  function initCTAConfetti() {
    var btn = document.querySelector('.sobre-cta-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var rect = btn.getBoundingClientRect();
      _launchConfetti({ count: 55, intensity: 1.1,
        x: rect.left + rect.width / 2, y: rect.top, duration: 1200 });
    });
  }

  // 3. Achievement unlocks — based on accumulated reading time (V5 key)
  function initAchievements() {
    var KEY_MS  = 'erg360_sobre_read_total_ms';
    var KEY_ACH = 'erg360_sobre_achievements';
    var defs = [
      { id: 'explorador', ms:  120000, icon: '📖', label: 'Explorador',  desc: '2 min lidos'  },
      { id: 'dedicado',   ms:  480000, icon: '🎯', label: 'Dedicado',    desc: '8 min lidos'  },
      { id: 'mestre',     ms: 1200000, icon: '🏆', label: 'Mestre ERG',  desc: '20 min lidos' }
    ];
    setTimeout(function () {
      var totalMs = 0;
      var unlocked = {};
      try {
        totalMs  = parseInt(localStorage.getItem(KEY_MS) || '0', 10) || 0;
        unlocked = JSON.parse(localStorage.getItem(KEY_ACH) || '{}');
      } catch (e) {}
      defs.forEach(function (def, i) {
        if (totalMs >= def.ms && !unlocked[def.id]) {
          unlocked[def.id] = Date.now();
          try { localStorage.setItem(KEY_ACH, JSON.stringify(unlocked)); } catch (e) {}
          setTimeout(function () { _showAchievement(def); }, i * 900);
        }
      });
    }, 2500);
  }

  // 4. AudioContext micro-chime on CTA click (one-shot, graceful degradation)
  function initAudioFeedback() {
    var btn = document.querySelector('.sobre-cta-btn');
    if (!btn) return;
    var played = false;
    btn.addEventListener('pointerdown', function () {
      if (played) return;
      played = true;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        var ac  = new AC();
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ac.currentTime + 0.07);
        gain.gain.setValueAtTime(0.07, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.25);
        osc.onended = function () { ac.close(); };
      } catch (e) {}
    });
  }

  // 5. Scroll completion milestone — progress bar vira gold a 88%+, toast único
  function initScrollMilestone() {
    var bar     = document.getElementById('sobre-scroll-progress');
    var toasted = false;
    window.addEventListener('scroll', function () {
      if (toasted) return;
      var h   = document.documentElement;
      var pct = h.scrollTop / (h.scrollHeight - h.clientHeight);
      if (pct >= 0.88) {
        toasted = true;
        if (bar) bar.classList.add('sobre-progress--complete');
        var shownKey = 'erg360_sobre_completed';
        var shown = false;
        try { shown = !!sessionStorage.getItem(shownKey); } catch (e) {}
        if (!shown) {
          try { sessionStorage.setItem(shownKey, '1'); } catch (e) {}
          setTimeout(function () {
            _showGameToast('Você explorou a página completa! ✨', 'gold');
          }, 300);
        }
      }
    }, { passive: true });
  }

  // 6. Visit counter + "Visitante assíduo" badge
  function initVisitBadge() {
    var KEY    = 'erg360_sobre_visits';
    var visits = 1;
    try {
      visits = (parseInt(localStorage.getItem(KEY) || '0', 10) || 0) + 1;
      localStorage.setItem(KEY, String(visits));
    } catch (e) {}
    if (visits < 3) return;
    var heroInner = document.querySelector('.sobre-hero-inner');
    if (!heroInner || document.getElementById('sobre-visit-badge')) return;
    var badge = document.createElement('div');
    badge.id = 'sobre-visit-badge';
    badge.className = 'sobre-visit-badge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', 'Visitante assíduo — visita número ' + visits);
    badge.innerHTML = '<span aria-hidden="true">⭐</span> Visitante assíduo';
    heroInner.appendChild(badge);
  }

  // 7. Pilar card "first-discover" glow dourado
  function initPilarDiscoverGlow() {
    var KEY  = 'erg360_pilares_seen';
    var seen = {};
    try { seen = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    var cards = document.querySelectorAll('.pilar-card');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var idx = Array.prototype.indexOf.call(cards, e.target);
        if (idx < 0 || seen[idx]) { io.unobserve(e.target); return; }
        seen[idx] = 1;
        try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (ex) {}
        e.target.classList.add('pilar-card--first-discover');
        setTimeout(function () { e.target.classList.remove('pilar-card--first-discover'); }, 1400);
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    cards.forEach(function (c) { io.observe(c); });
  }

  // 8. CTA magnetic hover (desktop only)
  function initCTAMagnetic() {
    var btn = document.querySelector('.sobre-cta-btn');
    if (!btn || !window.matchMedia('(hover:hover)').matches) return;
    var active = false;
    btn.addEventListener('mouseenter', function () { active = true; });
    btn.addEventListener('mouseleave', function () {
      active = false;
      btn.style.transform = '';
    });
    btn.addEventListener('mousemove', function (e) {
      if (!active) return;
      var r  = btn.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width  / 2)) * 0.22;
      var dy = (e.clientY - (r.top  + r.height / 2)) * 0.22;
      btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px) translateY(-1px)';
    });
  }

  // 9. Section progress dots — navegação lateral rápida
  function initProgressDots() {
    if (document.getElementById('sobre-progress-dots')) return;
    var sections = Array.from(document.querySelectorAll('.sobre-hero, .sobre-section, .sobre-cta'));
    if (sections.length < 2) return;

    var nav = document.createElement('nav');
    nav.id = 'sobre-progress-dots';
    nav.className = 'sobre-progress-dots';
    nav.setAttribute('aria-label', 'Navegação rápida por seção');

    var dots = sections.map(function (sec, i) {
      var btn    = document.createElement('button');
      btn.type   = 'button';
      btn.className = 'sobre-dot';
      var heading = sec.querySelector('h1, h2');
      btn.setAttribute('aria-label', heading ? heading.textContent.trim() : 'Seção ' + (i + 1));
      btn.setAttribute('aria-current', 'false');
      btn.addEventListener('click', function () {
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      nav.appendChild(btn);
      return btn;
    });
    document.body.appendChild(nav);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var idx = sections.indexOf(e.target);
        if (idx < 0) return;
        dots[idx].classList.toggle('sobre-dot--active', e.isIntersecting);
        dots[idx].setAttribute('aria-current', e.isIntersecting ? 'true' : 'false');
      });
    }, { threshold: 0.45 });
    sections.forEach(function (sec) { io.observe(sec); });
  }

  // 10. Welcome confetti — dispara uma vez por dispositivo
  function initWelcomeConfetti() {
    var KEY  = 'erg360_sobre_welcomed';
    var done = false;
    try { done = !!localStorage.getItem(KEY); } catch (e) {}
    if (done) return;
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    setTimeout(function () {
      _launchConfetti({ count: 35, intensity: 0.7, duration: 1600 });
    }, 1200);
  }

  function initV6() {
    initStreakBadge();
    initVisitBadge();
    initCTAConfetti();
    initAudioFeedback();
    initAchievements();
    initScrollMilestone();
    initPilarDiscoverGlow();
    initCTAMagnetic();
    initProgressDots();
    initWelcomeConfetti();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV6);
  } else {
    initV6();
  }

  var _prev = window._sobreExtras || {};
  window._sobreExtras = Object.assign({}, _prev, { version: 6, v6: true });
})();
