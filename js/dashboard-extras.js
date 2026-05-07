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

// ═══ POLIMENTO V3 ═══
// 10 melhorias de acessibilidade avançada: prefers-reduced-motion,
// landmark-labels, score-description, alert-region, scroll-milestone-announce,
// forced-colors, card-accessible-names, nav-transition-announce,
// extra-skip-target, fab-accessible.

(function () {
  'use strict';

  // ── 21. prefers-reduced-motion detection ────────────────────────────────
  function initReducedMotion() {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    function apply(active) {
      document.documentElement.classList.toggle('db-reduced-motion', active);
    }
    apply(mq.matches);
    mq.addEventListener('change', function (e) { apply(e.matches); });
  }

  // ── 22. Landmark ARIA labels ──────────────────────────────────────────
  function initLandmarkLabels() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar && !sidebar.getAttribute('aria-label')) {
      sidebar.setAttribute('aria-label', 'Menu principal de navegação');
    }

    var main = document.querySelector('.main-content');
    if (main) {
      if (!main.getAttribute('role')) main.setAttribute('role', 'main');
      if (!main.getAttribute('aria-label')) {
        main.setAttribute('aria-label', 'Dashboard principal');
      }
    }

    var quickGrid = document.querySelector('.db-quick-grid');
    if (quickGrid && !quickGrid.getAttribute('role')) {
      quickGrid.setAttribute('role', 'list');
      quickGrid.setAttribute('aria-label', 'Ações rápidas');
      document.querySelectorAll('.db-quick-card').forEach(function (card) {
        if (!card.getAttribute('role')) card.setAttribute('role', 'listitem');
      });
    }

    var bottomNav = document.getElementById('bottom-nav');
    if (bottomNav && !bottomNav.getAttribute('aria-label')) {
      bottomNav.setAttribute('aria-label', 'Navegação inferior');
    }
  }

  // ── 23. Score accessible description via aria-describedby ────────────
  function initScoreDescription() {
    var scoreCard = document.getElementById('score-hoje-card');
    if (!scoreCard || document.getElementById('db-score-desc')) return;
    var desc = document.createElement('p');
    desc.id = 'db-score-desc';
    desc.className = 'sr-only';
    desc.textContent = 'Score calculado com base nos check-ins do dia. '
      + 'Acima de 70 pontos indica boa adesão ao plano nutricional.';
    scoreCard.appendChild(desc);
    scoreCard.setAttribute('aria-describedby', 'db-score-desc');
  }

  // ── 24. Dedicated role="alert" region for error toasts ───────────────
  function initAlertRegion() {
    if (document.getElementById('db-alert-region')) return;
    var region = document.createElement('div');
    region.id = 'db-alert-region';
    region.setAttribute('role', 'alert');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    document.body.appendChild(region);

    var toast = document.getElementById('toast');
    if (!toast) return;
    var obs = new MutationObserver(function () {
      if (!toast.classList.contains('visible')) return;
      if (toast.classList.contains('toast--error') ||
          toast.classList.contains('error')) {
        var msg = toast.querySelector('[class*="message"], [class*="text"]');
        region.textContent = '';
        setTimeout(function () {
          region.textContent = msg
            ? msg.textContent.trim()
            : toast.textContent.trim();
        }, 50);
      }
    });
    obs.observe(toast, { attributes: true, attributeFilter: ['class'] });
  }

  // ── 25. Scroll milestone announcements at 25% intervals ──────────────
  function initScrollMilestoneAnnounce() {
    if (document.getElementById('db-scroll-announce')) return;
    var live = document.createElement('div');
    live.id = 'db-scroll-announce';
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    document.body.appendChild(live);

    var lastMilestone = 0;
    var timer;
    window.addEventListener('scroll', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var h = document.documentElement;
        if (h.scrollHeight <= h.clientHeight) return;
        var pct = h.scrollTop / (h.scrollHeight - h.clientHeight);
        var milestone = Math.floor(pct * 4) * 25;
        if (milestone > 0 && milestone !== lastMilestone) {
          lastMilestone = milestone;
          live.textContent = '';
          live.textContent = 'Página ' + milestone + '% lida';
        }
      }, 450);
    }, { passive: true });
  }

  // ── 26. Forced-colors (high-contrast OS mode) detection ──────────────
  function initForcedColors() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia('(forced-colors: active)');
    function apply(active) {
      document.documentElement.classList.toggle('db-forced-colors', active);
    }
    apply(mq.matches);
    mq.addEventListener('change', function (e) { apply(e.matches); });
  }

  // ── 27. Quick-card accessible names from visible label text ──────────
  function initCardAccessibleNames() {
    document.querySelectorAll('.db-quick-card').forEach(function (card) {
      if (card.getAttribute('aria-label')) return;
      var label = card.querySelector('.db-quick-label');
      var sub   = card.querySelector('.db-quick-sub');
      if (!label) return;
      var name = label.textContent.trim();
      if (sub && sub.textContent.trim()) {
        name += ' — ' + sub.textContent.trim();
      }
      card.setAttribute('aria-label', name);
    });
  }

  // ── 28. Navigation transition announcements for screen readers ────────
  function initNavTransitionAnnounce() {
    var live = document.getElementById('db-scroll-announce');
    if (!live) {
      live = document.createElement('div');
      live.className = 'sr-only';
      live.setAttribute('aria-live', 'polite');
      document.body.appendChild(live);
    }

    var links = document.querySelectorAll('.db-quick-card[href], .bottom-nav-item[href]');
    links.forEach(function (link) {
      link.addEventListener('click', function () {
        var labelEl = link.querySelector('.db-quick-label');
        var label = link.getAttribute('aria-label')
          || (labelEl && labelEl.textContent.trim())
          || '';
        if (!label) return;
        live.textContent = '';
        live.textContent = 'Abrindo ' + label.split('—')[0].trim();
      });
    });
  }

  // ── 29. Extra skip target — ações rápidas section ─────────────────────
  function initQuickActionsSkip() {
    if (document.getElementById('db-skip-quick')) return;
    var grid = document.querySelector('.db-quick-grid');
    if (!grid) return;
    if (!grid.id) grid.id = 'db-quick-actions';
    if (!grid.getAttribute('tabindex')) grid.setAttribute('tabindex', '-1');

    var skipLink = document.createElement('a');
    skipLink.id = 'db-skip-quick';
    skipLink.href = '#' + grid.id;
    skipLink.className = 'db-skip-link';
    skipLink.textContent = 'Ir para ações rápidas';

    var existing = document.getElementById('db-skip-link');
    if (existing && existing.parentNode) {
      existing.parentNode.insertBefore(skipLink, existing.nextSibling);
    } else {
      document.body.insertBefore(skipLink, document.body.firstChild);
    }
  }

  // ── 30. FAB accessible enhancement ───────────────────────────────────
  function initFabEnhancement() {
    var fab = document.getElementById('fab-checkin');
    if (!fab) return;
    var currentLabel = fab.getAttribute('aria-label') || '';
    if (!currentLabel || currentLabel === 'Check-in') {
      fab.setAttribute('aria-label', 'Realizar check-in alimentar de hoje');
    }
    if (!fab.getAttribute('title')) {
      fab.setAttribute('title', 'Registre seus alimentos e hábitos do dia');
    }
    if (fab.tagName === 'A' && !fab.getAttribute('role')) {
      fab.setAttribute('role', 'button');
    }
  }

  // ── Bootstrap V3 ─────────────────────────────────────────────────────
  function initV3() {
    initReducedMotion();
    initForcedColors();
    initLandmarkLabels();
    initScoreDescription();
    initAlertRegion();
    initScrollMilestoneAnnounce();
    initCardAccessibleNames();
    initQuickActionsSkip();
    initFabEnhancement();
    initNavTransitionAnnounce();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV3);
  } else {
    initV3();
  }

  if (window._dashboardExtras) {
    window._dashboardExtras.version = 3;
    window._dashboardExtras.v3 = true;
  }
})();

// ═══ POLIMENTO V4 ═══
// 10 melhorias de performance: requestIdleCallback, ResizeObserver,
// Navigator.connection, pagehide-cleanup, ripple-delegation,
// fonts.ready gate, prefetch-rootMargin, debounced-resize,
// CSS will-change hints, scroll-progress rAF upgrade.

(function () {
  'use strict';

  // ── Shared cleanup registry ───────────────────────────────────────────────
  var _observers = [];
  var _intervals = [];

  function _trackObserver(io) { _observers.push(io); return io; }
  function _trackInterval(id) { _intervals.push(id); return id; }

  window.addEventListener('pagehide', function () {
    _observers.forEach(function (io) { try { io.disconnect(); } catch (_) {} });
    _intervals.forEach(function (id) { clearInterval(id); clearTimeout(id); });
    _observers = [];
    _intervals = [];
  });

  // ── 31. requestIdleCallback wrapper ──────────────────────────────────────
  var _idle = window.requestIdleCallback
    ? window.requestIdleCallback.bind(window)
    : function (cb) { return setTimeout(cb, 1); };

  // ── 32. ResizeObserver — dynamic grid column count for kbd nav ────────────
  function initResizeObserver() {
    var grid = document.querySelector('.db-quick-grid');
    if (!grid || !window.ResizeObserver) return;

    grid.__cols = 1;

    var ro = new ResizeObserver(function (entries) {
      var entry = entries[0];
      var w = entry.contentRect.width;
      var cols = w > 600 ? 3 : w > 380 ? 2 : 1;
      if (grid.__cols !== cols) {
        grid.__cols = cols;
        grid.dataset.cols = cols;
      }
    });
    ro.observe(grid);
    _trackObserver(ro);

    // Patch the existing keyboard nav to use ResizeObserver value
    var existing = grid._dbKbdNav;
    if (!existing) {
      grid.addEventListener('keydown', function (e) {
        var cards = Array.from(grid.querySelectorAll('.db-quick-card'));
        var idx   = cards.indexOf(document.activeElement);
        if (idx === -1) return;
        var cols  = grid.__cols || 1;
        var next  = -1;
        if      (e.key === 'ArrowRight') next = idx + 1;
        else if (e.key === 'ArrowLeft')  next = idx - 1;
        else if (e.key === 'ArrowDown')  next = idx + cols;
        else if (e.key === 'ArrowUp')    next = idx - cols;
        if (next >= 0 && next < cards.length) {
          e.preventDefault();
          cards[next].focus();
        }
      });
      grid._dbKbdNav = true;
    }
  }

  // ── 33. Navigator.connection — reduce animation on slow networks ──────────
  function initConnectionAware() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    function applyNetworkClass() {
      var slow = conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g';
      document.documentElement.classList.toggle('db-slow-network', slow);
    }
    applyNetworkClass();
    conn.addEventListener('change', applyNetworkClass);
  }

  // ── 34. Ripple event delegation on grid container ─────────────────────────
  function initRippleDelegation() {
    var grid = document.querySelector('.db-quick-grid');
    if (!grid || grid._dbRippleDelegated) return;
    grid._dbRippleDelegated = true;

    grid.addEventListener('pointerdown', function (e) {
      var card = e.target.closest('.db-quick-card');
      if (!card) return;
      var rect = card.getBoundingClientRect();
      var r    = document.createElement('span');
      r.className = 'db-ripple';
      var size = Math.max(rect.width, rect.height) * 2;
      r.style.cssText = 'width:' + size + 'px;height:' + size + 'px;'
        + 'left:' + (e.clientX - rect.left - size / 2) + 'px;'
        + 'top:'  + (e.clientY - rect.top  - size / 2) + 'px;';
      card.appendChild(r);
      setTimeout(function () { r.remove(); }, 600);
    });
  }

  // ── 35. document.fonts.ready gate for nav indicator ──────────────────────
  function initFontsGate() {
    if (!document.fonts || !document.fonts.ready) return;
    document.fonts.ready.then(function () {
      var indicator = document.querySelector('.db-nav-indicator');
      if (indicator) {
        indicator.style.transition = 'none';
        indicator.offsetHeight; // reflow
        indicator.style.transition = '';
      }
    });
  }

  // ── 36. Prefetch with IntersectionObserver rootMargin (eager prefetch) ────
  function initEagerPrefetch() {
    var prefetched = new Set();
    var io = _trackObserver(new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var href = e.target.getAttribute('href');
        if (!href || prefetched.has(href)) return;
        prefetched.add(href);
        var link = document.createElement('link');
        link.rel  = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px 200px 0px', threshold: 0 }));

    document.querySelectorAll('.db-quick-card[href]').forEach(function (card) {
      io.observe(card);
    });
  }

  // ── 37. Debounced resize handler for bottom-nav visibility ───────────────
  function initDebouncedResize() {
    var nav = document.getElementById('bottom-nav');
    if (!nav) return;
    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var isMobile = window.innerWidth <= 900;
        if (!isMobile) nav.classList.remove('bottom-nav--hidden');
      }, 150);
    }, { passive: true });
  }

  // ── 38. Scroll progress bar upgrade to rAF ───────────────────────────────
  function initScrollProgressRaf() {
    var bar = document.getElementById('db-scroll-progress');
    if (!bar) return;

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var h   = document.documentElement;
        var max = h.scrollHeight - h.clientHeight;
        var pct = max > 0 ? h.scrollTop / max : 0;
        bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, pct)) + ')';
        ticking = false;
      });
    }, { passive: true });
  }

  // ── 39. will-change hints managed by IntersectionObserver ─────────────────
  function initWillChangeHints() {
    var targets = document.querySelectorAll('.db-card-hidden, .db-tip-hidden, .db-reveal');
    if (!targets.length) return;
    var io = _trackObserver(new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.style.willChange = 'transform, opacity';
          setTimeout(function () {
            e.target.style.willChange = 'auto';
            io.unobserve(e.target);
          }, 600);
        }
      });
    }, { rootMargin: '50px 0px' }));
    targets.forEach(function (t) { io.observe(t); });
  }

  // ── 40. Idle init — defer non-critical startup via requestIdleCallback ─────
  function initIdle() {
    _idle(function () {
      initConnectionAware();
      initEagerPrefetch();
      initWillChangeHints();
      initFontsGate();
    });
  }

  // ── Bootstrap V4 ─────────────────────────────────────────────────────────
  function initV4() {
    initResizeObserver();
    initRippleDelegation();
    initScrollProgressRaf();
    initDebouncedResize();
    initIdle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV4);
  } else {
    initV4();
  }

  if (window._dashboardExtras) {
    window._dashboardExtras.version = 4;
    window._dashboardExtras.v4 = true;
  }
})();
