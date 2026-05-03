// ═══ POLIMENTO V1 ═══
// 20 melhorias UX iniciais: hamburger mobile, skip-link, scroll-progress,
// section-reveal, card-stagger, ripple, focus-trap, kbd-nav, score-pulse,
// greeting-refresh, page-visibility, consulta-relativa, aria-live,
// prefetch-hover, toast-progress, dark-transition, a11y-score-announce,
// bottom-nav-autohide, tip-stagger, nav-indicator.

(function () {
  'use strict';

  // ── 1. Hamburger button injection (fixes mobile sidebar) ──────────────────
  function initHamburger() {
    const mobileHeader = document.querySelector('.mobile-header');
    if (!mobileHeader || document.getElementById('hamburger-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'hamburger-btn';
    btn.className = 'hamburger';
    btn.setAttribute('aria-label', 'Abrir menu de navegação');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'sidebar');
    btn.innerHTML = '<span></span><span></span><span></span>';
    mobileHeader.insertBefore(btn, mobileHeader.querySelector('.dark-mode-toggle'));

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    btn.addEventListener('click', function () {
      const isOpen = sidebar.classList.toggle('open');
      overlay.classList.toggle('open', isOpen);
      btn.setAttribute('aria-expanded', String(isOpen));
      btn.classList.toggle('hamburger--active', isOpen);
      if (isOpen) trapFocus(sidebar);
    });

    overlay.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
    });

    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('hamburger--active');
      btn.focus();
    }
  }

  // ── 2. Skip link ──────────────────────────────────────────────────────────
  function initSkipLink() {
    if (document.getElementById('db-skip-link')) return;
    const link = document.createElement('a');
    link.id = 'db-skip-link';
    link.href = '#main-content-anchor';
    link.className = 'db-skip-link';
    link.textContent = 'Ir para o conteúdo principal';
    document.body.insertBefore(link, document.body.firstChild);

    const main = document.querySelector('.main-content');
    if (main) {
      main.id = 'main-content-anchor';
      main.setAttribute('tabindex', '-1');
    }
  }

  // ── 3. Scroll progress bar ────────────────────────────────────────────────
  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.id = 'db-scroll-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Progresso de leitura');
    document.body.appendChild(bar);

    window.addEventListener('scroll', function () {
      const h = document.documentElement;
      const pct = h.scrollHeight === h.clientHeight ? 1
        : h.scrollTop / (h.scrollHeight - h.clientHeight);
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, pct)) + ')';
    }, { passive: true });
  }

  // ── 4. Section fade-in reveal ─────────────────────────────────────────────
  function initSectionReveal() {
    var targets = document.querySelectorAll(
      '.nh-section, .page-header, .nh-disclaimer'
    );
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('db-revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.06 });
    targets.forEach(function (t) {
      t.classList.add('db-reveal');
      io.observe(t);
    });
  }

  // ── 5. Quick cards staggered entrance ────────────────────────────────────
  function initCardStagger() {
    var cards = document.querySelectorAll('.db-quick-card');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('db-card-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    cards.forEach(function (c, i) {
      c.style.transitionDelay = (i * 60) + 'ms';
      c.classList.add('db-card-hidden');
      io.observe(c);
    });
  }

  // ── 6. Ripple effect ─────────────────────────────────────────────────────
  function addRipple(el) {
    el.addEventListener('pointerdown', function (e) {
      var rect = el.getBoundingClientRect();
      var r = document.createElement('span');
      r.className = 'db-ripple';
      var size = Math.max(rect.width, rect.height) * 2;
      r.style.cssText = 'width:' + size + 'px;height:' + size + 'px;'
        + 'left:' + (e.clientX - rect.left - size / 2) + 'px;'
        + 'top:' + (e.clientY - rect.top - size / 2) + 'px;';
      el.style.position = el.style.position || 'relative';
      el.appendChild(r);
      setTimeout(function () { r.remove(); }, 600);
    });
  }

  function initRipples() {
    document.querySelectorAll('.db-quick-card, .fab-checkin, .bottom-nav-item').forEach(addRipple);
  }

  // ── 7. Focus trap for mobile sidebar ─────────────────────────────────────
  function trapFocus(container) {
    var focusable = container.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    focusable[0].focus();
    container.addEventListener('keydown', handleTrap);
    function handleTrap(e) {
      if (e.key !== 'Tab') return;
      var first = focusable[0];
      var last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      if (!container.classList.contains('open')) {
        container.removeEventListener('keydown', handleTrap);
      }
    }
  }

  // ── 8. Keyboard navigation on quick cards grid ───────────────────────────
  function initGridKeyNav() {
    var grid = document.querySelector('.db-quick-grid');
    if (!grid) return;
    grid.addEventListener('keydown', function (e) {
      var cards = Array.from(grid.querySelectorAll('.db-quick-card'));
      var idx   = cards.indexOf(document.activeElement);
      if (idx === -1) return;
      var cols  = window.innerWidth > 600 ? 3 : 1;
      var next  = -1;
      if (e.key === 'ArrowRight') next = idx + 1;
      else if (e.key === 'ArrowLeft') next = idx - 1;
      else if (e.key === 'ArrowDown') next = idx + cols;
      else if (e.key === 'ArrowUp') next = idx - cols;
      if (next >= 0 && next < cards.length) {
        e.preventDefault();
        cards[next].focus();
      }
    });
    document.querySelectorAll('.db-quick-card').forEach(function (c) {
      if (!c.getAttribute('tabindex')) c.setAttribute('tabindex', '0');
    });
  }

  // ── 9. Score circle pulse on reveal ───────────────────────────────────────
  function initScorePulse() {
    var scoreSection = document.getElementById('score-hoje-card');
    if (!scoreSection) return;
    var observed = false;
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !observed) {
        observed = true;
        var circle = document.getElementById('score-circulo-dash');
        if (circle) circle.classList.add('db-score-pulse');
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(scoreSection);
  }

  // ── 10. Live greeting refresh (changes on hour boundary) ─────────────────
  function initGreetingRefresh() {
    var lastHour = new Date().getHours();
    setInterval(function () {
      var nowHour = new Date().getHours();
      if (nowHour !== lastHour) {
        lastHour = nowHour;
        var greetEl = document.getElementById('patient-greeting');
        if (greetEl && greetEl.textContent) {
          var parts = greetEl.textContent.split(',');
          if (parts.length > 1) {
            var greeting = _getGreeting();
            greetEl.textContent = greeting + ',' + parts.slice(1).join(',');
          }
        }
      }
    }, 60000);
  }

  function _getGreeting() {
    var h = new Date().getHours();
    if (h >= 5  && h < 12) return 'Bom dia';
    if (h >= 12 && h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  // ── 11. Page Visibility — title swap ─────────────────────────────────────
  function initPageVisibility() {
    var origTitle = document.title;
    document.addEventListener('visibilitychange', function () {
      document.title = document.hidden ? '⏸ ERG 360° — volte logo!' : origTitle;
    });
  }

  // ── 12. Relative consultation dates ──────────────────────────────────────
  function initConsultaRelativa() {
    ['ultima-consulta', 'proxima-consulta'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !el.textContent || el.textContent.trim() === '—') return;
      var text = el.textContent.trim();
      if (text.length < 6 || el.querySelector('.skeleton')) return;
      var rel = _relativeDate(text);
      if (!rel) return;
      var tag = document.createElement('span');
      tag.className = 'db-date-rel';
      tag.textContent = rel;
      tag.setAttribute('aria-label', rel);
      el.appendChild(tag);
    });
  }

  function _relativeDate(ptDateStr) {
    var months = {
      'janeiro':1,'fevereiro':2,'março':3,'abril':4,'maio':5,'junho':6,
      'julho':7,'agosto':8,'setembro':9,'outubro':10,'novembro':11,'dezembro':12
    };
    var m = ptDateStr.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);
    if (!m) return null;
    var d = new Date(+m[3], (months[m[2].toLowerCase()] || 1) - 1, +m[1]);
    var diff = Math.round((d - new Date()) / 86400000);
    if (diff === 0) return 'hoje';
    if (diff === 1) return 'amanhã';
    if (diff === -1) return 'ontem';
    if (diff > 1 && diff <= 30) return 'em ' + diff + ' dias';
    if (diff < -1 && diff >= -30) return 'há ' + Math.abs(diff) + ' dias';
    return null;
  }

  // ── 13. ARIA live region for greeting ─────────────────────────────────────
  function initAriaLive() {
    var pageHeader = document.querySelector('.page-header');
    if (!pageHeader) return;
    pageHeader.setAttribute('aria-live', 'polite');
    pageHeader.setAttribute('aria-atomic', 'false');

    var scoreSection = document.getElementById('score-hoje-card');
    if (scoreSection) scoreSection.setAttribute('aria-live', 'polite');
  }

  // ── 14. Link prefetch on quick card hover ─────────────────────────────────
  function initPrefetch() {
    var prefetched = new Set();
    document.querySelectorAll('.db-quick-card[href]').forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        var href = card.getAttribute('href');
        if (!href || prefetched.has(href)) return;
        prefetched.add(href);
        var link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
      }, { once: true });
    });
  }

  // ── 15. Toast progress bar injection ─────────────────────────────────────
  function initToastProgress() {
    var toast = document.getElementById('toast');
    if (!toast) return;
    var bar = document.createElement('span');
    bar.className = 'db-toast-bar';
    toast.appendChild(bar);

    var obs = new MutationObserver(function () {
      if (toast.classList.contains('visible')) {
        bar.style.animation = 'none';
        bar.offsetHeight; // reflow
        bar.style.animation = 'db-toast-progress 3.2s linear forwards';
      }
    });
    obs.observe(toast, { attributes: true, attributeFilter: ['class'] });
  }

  // ── 16. Dark mode smooth transition ───────────────────────────────────────
  function initDarkTransition() {
    var toggle = document.getElementById('dark-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      document.documentElement.classList.add('db-theme-transition');
      setTimeout(function () {
        document.documentElement.classList.remove('db-theme-transition');
      }, 300);
    }, true);
  }

  // ── 17. Accessible score announcement ─────────────────────────────────────
  function initScoreAnnounce() {
    var scoreLabel = document.getElementById('score-label-dash');
    var scoreNum   = document.getElementById('score-num-dash');
    if (!scoreLabel || !scoreNum) return;

    var liveEl = document.createElement('div');
    liveEl.className = 'sr-only';
    liveEl.setAttribute('aria-live', 'assertive');
    liveEl.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveEl);

    var io = new MutationObserver(function () {
      var num   = scoreNum.textContent.trim();
      var label = scoreLabel.textContent.trim();
      if (num && num !== '—' && label && label !== '—') {
        liveEl.textContent = 'Score do dia: ' + num + ' — ' + label;
      }
    });
    io.observe(scoreNum, { childList: true, characterData: true, subtree: true });
  }

  // ── 18. Bottom nav auto-hide on scroll down (mobile) ─────────────────────
  function initBottomNavHide() {
    var nav = document.getElementById('bottom-nav');
    if (!nav || window.innerWidth > 900) return;
    var lastY = window.scrollY;
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y   = window.scrollY;
        var dir = y > lastY ? 'down' : 'up';
        if (dir === 'down' && y > 80) {
          nav.classList.add('bottom-nav--hidden');
        } else {
          nav.classList.remove('bottom-nav--hidden');
        }
        lastY = y;
        ticking = false;
      });
    }, { passive: true });
  }

  // ── 19. Tip cards staggered reveal ────────────────────────────────────────
  function initTipStagger() {
    var tips = document.querySelectorAll('.nh-topic');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('db-tip-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    tips.forEach(function (t, i) {
      t.style.transitionDelay = (i * 80) + 'ms';
      t.classList.add('db-tip-hidden');
      io.observe(t);
    });
  }

  // ── 20. Sidebar nav active indicator sliding line ─────────────────────────
  function initNavIndicator() {
    var activeItem = document.querySelector('.sidebar .nav-item.active');
    if (!activeItem) return;
    activeItem.setAttribute('aria-current', 'page');

    var indicator = document.createElement('span');
    indicator.className = 'db-nav-indicator';
    activeItem.appendChild(indicator);
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  function init() {
    initSkipLink();
    initHamburger();
    initScrollProgress();
    initSectionReveal();
    initCardStagger();
    initRipples();
    initGridKeyNav();
    initScorePulse();
    initGreetingRefresh();
    initPageVisibility();
    initAriaLive();
    initPrefetch();
    initToastProgress();
    initDarkTransition();
    initScoreAnnounce();
    initBottomNavHide();
    initTipStagger();
    initNavIndicator();

    // Consulta relativa — aguarda dados carregarem
    setTimeout(initConsultaRelativa, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window._dashboardExtras = { version: 1 };
})();
