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
