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
