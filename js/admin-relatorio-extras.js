// ═══ POLIMENTO V1 ═══
// js/admin-relatorio-extras.js — ERG 360
// 15 melhorias UX, acessibilidade e feedback visual

window._adminRelatorioExtras = (() => {

  // ── 1. Skip-link acessibilidade ──────────────────────────
  function injectSkipLink() {
    if (document.getElementById('erg-skip-link')) return;
    const a = document.createElement('a');
    a.id = 'erg-skip-link';
    a.href = '#rel-mount';
    a.textContent = 'Pular para o conteúdo';
    a.className = 'erg-skip-link';
    document.body.prepend(a);
  }

  // ── 2. ARIA live region ──────────────────────────────────
  function injectAriaLive() {
    if (document.getElementById('erg-aria-live')) return;
    const el = document.createElement('div');
    el.id = 'erg-aria-live';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'erg-sr-only';
    document.body.appendChild(el);
  }

  function announce(msg) {
    const el = document.getElementById('erg-aria-live');
    if (!el) return;
    el.textContent = '';
    requestAnimationFrame(() => { el.textContent = msg; });
  }

  // ── 3. Toast de progresso com 4 etapas ──────────────────
  let _toastTimers = [];

  function showProgressToast() {
    let toast = document.getElementById('erg-rel-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'erg-rel-toast';
      toast.className = 'erg-rel-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }

    const steps = [
      { label: 'Buscando dados do paciente...', delay: 0 },
      { label: 'Calculando score metabólico...', delay: 1200 },
      { label: 'Detectando padrões clínicos...', delay: 2500 },
      { label: 'Montando relatório...', delay: 3600 },
    ];

    steps.forEach(({ label, delay }) => {
      const t = setTimeout(() => {
        toast.innerHTML = `<span class="erg-toast-dot" aria-hidden="true"></span> ${label}`;
        toast.classList.add('erg-toast-visible');
        announce(label);
      }, delay);
      _toastTimers.push(t);
    });
  }

  function hideProgressToast() {
    _toastTimers.forEach(clearTimeout);
    _toastTimers = [];
    const toast = document.getElementById('erg-rel-toast');
    if (!toast) return;
    toast.innerHTML = '<span class="erg-toast-ok" aria-hidden="true">✓</span> Relatório gerado com sucesso';
    toast.classList.add('erg-toast-visible');
    announce('Relatório gerado com sucesso');
    setTimeout(() => {
      toast.classList.remove('erg-toast-visible');
      setTimeout(() => toast.remove(), 400);
    }, 2200);
  }

  // ── 4. Botão "Copiar link" na sidebar ───────────────────
  function injectCopyLinkBtn() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav || document.getElementById('btn-copiar-link')) return;

    const btn = document.createElement('a');
    btn.id = 'btn-copiar-link';
    btn.href = 'javascript:void(0)';
    btn.className = 'nav-item';
    btn.setAttribute('aria-label', 'Copiar link deste relatório para a área de transferência');
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      Copiar link`;

    btn.addEventListener('click', () => {
      if (!navigator.clipboard) return;
      const orig = btn.innerHTML;
      navigator.clipboard.writeText(window.location.href).then(() => {
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E8B6A" stroke-width="1.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Link copiado!`;
        btn.style.color = '#2E8B6A';
        announce('Link copiado para a área de transferência');
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.style.color = '';
        }, 2200);
      });
    });

    nav.appendChild(btn);
  }

  // ── 5. Atalho de teclado R = reload ─────────────────────
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target !== document.body && e.target !== document.documentElement) return;
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        window.location.reload();
      }
    });
  }

  // ── 6. Animações escalonadas via IntersectionObserver ───
  function setupCardAnimations(container) {
    const cards = container.querySelectorAll('.rel-card, .rel-sug-card, .rel-agenda-item');

    if (!('IntersectionObserver' in window)) {
      cards.forEach(c => { c.classList.add('erg-card-anim', 'erg-card-visible'); });
      return;
    }

    cards.forEach((card, i) => {
      card.style.animationDelay = `${i * 55}ms`;
      card.classList.add('erg-card-anim');
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('erg-card-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    cards.forEach(c => io.observe(c));
  }

  // ── 7. Pulso visual no semáforo crítico ─────────────────
  function highlightCriticalSemaforo(container) {
    const sem = container.querySelector('.rel-semaforo span');
    if (!sem) return;
    const txt = sem.textContent.toUpperCase();
    if (txt.includes('INTERVEN') || txt.includes('CRÍT') || txt.includes('CRITIC')) {
      sem.closest('.rel-semaforo')?.classList.add('erg-semaforo-critico');
    }
  }

  // ── 8. Back-to-top button ────────────────────────────────
  function injectBackToTop() {
    if (document.getElementById('erg-back-top')) return;
    const btn = document.createElement('button');
    btn.id = 'erg-back-top';
    btn.className = 'erg-back-top';
    btn.setAttribute('aria-label', 'Voltar ao topo da página');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>`;
    document.body.appendChild(btn);

    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    window.addEventListener('scroll', () => {
      btn.classList.toggle('erg-back-top-visible', window.scrollY > 400);
    }, { passive: true });
  }

  // ── 9 + 10 + 11 + 12. Observer central no #rel-mount ────
  function watchMountChanges() {
    const mount = document.getElementById('rel-mount');
    if (!mount) return;

    let reportRendered = false;
    window._relatorioGeradoEm = Date.now();

    const observer = new MutationObserver(() => {
      const container = mount.querySelector('.rel-container');

      // Relatório carregado com sucesso
      if (container && !reportRendered) {
        reportRendered = true;

        // 10. Focus management
        const h1 = mount.querySelector('.rel-nome, h1');
        if (h1) {
          h1.setAttribute('tabindex', '-1');
          h1.focus({ preventScroll: true });
        }

        hideProgressToast();
        setupCardAnimations(mount);
        highlightCriticalSemaforo(mount);

        // 11. Barras de progresso animadas
        animateBars(mount);

        // 12. Badge "gerado há X min"
        injectTimestampBadge(container);

        observer.disconnect();
        return;
      }

      // 9. Estado de erro com retry
      const errEl = mount.querySelector('p[style*="B33030"]');
      if (errEl && !errEl.nextElementSibling?.classList.contains('erg-retry-btn')) {
        hideProgressToast();
        const retryBtn = document.createElement('button');
        retryBtn.className = 'erg-retry-btn';
        retryBtn.textContent = 'Tentar novamente';
        retryBtn.setAttribute('aria-label', 'Recarregar o relatório');
        retryBtn.addEventListener('click', () => window.location.reload());
        errEl.after(retryBtn);
        announce('Erro ao gerar relatório. Botão de nova tentativa disponível.');
      }
    });

    observer.observe(mount, { childList: true, subtree: true });
  }

  // ── 11. Animação das barras de comportamento ─────────────
  function animateBars(container) {
    container.querySelectorAll('.rel-comp-bar-fill').forEach((bar, i) => {
      const target = bar.style.width;
      bar.style.width = '0%';
      bar.style.transition = 'none';
      setTimeout(() => {
        bar.style.transition = `width 0.75s cubic-bezier(0.4, 0, 0.2, 1) ${i * 70}ms`;
        bar.style.width = target;
      }, 80);
    });
  }

  // ── 12. Badge dinâmico "gerado há X min" ─────────────────
  function injectTimestampBadge(container) {
    const sub = container.querySelector('.rel-capa-sub');
    if (!sub || sub.querySelector('.erg-timestamp')) return;

    const badge = document.createElement('span');
    badge.className = 'erg-timestamp';
    badge.setAttribute('aria-label', 'Tempo desde a geração do relatório');

    const update = () => {
      const elapsed = Math.floor((Date.now() - window._relatorioGeradoEm) / 60000);
      badge.textContent = elapsed < 1 ? 'Agora mesmo' : `Há ${elapsed} min`;
    };

    update();
    const iv = setInterval(update, 60000);
    window._relTimestampInterval = iv;
    sub.appendChild(badge);
  }

  // ── 13. ARIA no main-content ─────────────────────────────
  function improveMainAria() {
    const main = document.querySelector('.main-content');
    if (main) {
      if (!main.id) main.id = 'main-content';
      main.setAttribute('role', 'main');
      main.setAttribute('aria-label', 'Relatório de consulta');
    }
    document.getElementById('rel-mount')?.setAttribute('aria-live', 'polite');
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    injectSkipLink();
    injectAriaLive();
    improveMainAria();
    showProgressToast();
    injectCopyLinkBtn();
    setupKeyboardShortcuts();
    injectBackToTop();
    watchMountChanges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init, announce, hideProgressToast };
})();
