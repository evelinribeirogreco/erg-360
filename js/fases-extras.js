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
