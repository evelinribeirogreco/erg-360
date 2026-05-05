// ═══ POLIMENTO V2 ═══
// js/admin-relatorio-extras.js — ERG 360
// 22 melhorias UX: produtividade clínica, acessibilidade, exportação, dark mode

window._adminRelatorioExtras = (() => {

  const params      = new URLSearchParams(window.location.search);
  const patientId   = params.get('patient') || 'unknown';
  const patientNome = decodeURIComponent(params.get('nome') || 'Paciente');

  // ── 1. Skip-link acessibilidade ──────────────────────────
  function injectSkipLink() {
    if (document.getElementById('erg-skip-link')) return;
    const a = document.createElement('a');
    a.id        = 'erg-skip-link';
    a.href      = '#rel-mount';
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

  // ── 3. Toast de progresso com 4 etapas clínicas ─────────
  var _toastTimers = [];

  function showProgressToast() {
    var toast = document.getElementById('erg-rel-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id        = 'erg-rel-toast';
      toast.className = 'erg-rel-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }

    var steps = [
      { label: 'Buscando dados do paciente...', delay: 0 },
      { label: 'Calculando score metabólico...', delay: 1200 },
      { label: 'Detectando padrões clínicos...', delay: 2500 },
      { label: 'Montando relatório...', delay: 3600 },
    ];

    steps.forEach(function(step) {
      var t = setTimeout(function() {
        toast.innerHTML = '<span class="erg-toast-dot" aria-hidden="true"></span> ' + step.label;
        toast.classList.add('erg-toast-visible');
        announce(step.label);
      }, step.delay);
      _toastTimers.push(t);
    });
  }

  function hideProgressToast() {
    _toastTimers.forEach(clearTimeout);
    _toastTimers = [];
    var toast = document.getElementById('erg-rel-toast');
    if (!toast) return;
    toast.innerHTML = '<span class="erg-toast-ok" aria-hidden="true">✓</span> Relatório gerado com sucesso';
    toast.classList.add('erg-toast-visible');
    announce('Relatório gerado com sucesso');
    setTimeout(function() {
      toast.classList.remove('erg-toast-visible');
      setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
    }, 2200);
  }

  // ── 4. Botão "Copiar link" na sidebar ───────────────────
  function injectCopyLinkBtn() {
    var nav = document.querySelector('.sidebar-nav');
    if (!nav || document.getElementById('btn-copiar-link')) return;

    var btn = document.createElement('a');
    btn.id        = 'btn-copiar-link';
    btn.href      = 'javascript:void(0)';
    btn.className = 'nav-item';
    btn.setAttribute('aria-label', 'Copiar link deste relatório para a área de transferência');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar link';

    btn.addEventListener('click', function() {
      if (!navigator.clipboard) return;
      var orig = btn.innerHTML;
      navigator.clipboard.writeText(window.location.href).then(function() {
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E8B6A" stroke-width="1.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Link copiado!';
        btn.style.color = '#2E8B6A';
        announce('Link copiado para a área de transferência');
        setTimeout(function() { btn.innerHTML = orig; btn.style.color = ''; }, 2200);
      });
    });

    nav.appendChild(btn);
  }

  // ── 5. Atalhos de teclado expandidos ────────────────────
  // R = reload | Ctrl+P = print | Ctrl+S = salvar notas | Esc = sair modos
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      var onBody = (e.target === document.body || e.target === document.documentElement);

      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey && onBody) {
        e.preventDefault();
        window.location.reload();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
        announce('Abrindo diálogo de impressão');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        var ta = document.getElementById('erg-notes-ta');
        if (ta) {
          saveNotes(ta.value);
          showNotesStatus('Notas salvas');
          announce('Notas clínicas salvas');
        }
        return;
      }

      if (e.key === 'Escape') {
        if (document.body.classList.contains('erg-presentation-mode')) {
          exitPresentationMode();
        }
        var panel = document.getElementById('erg-notes-panel');
        if (panel && panel.classList.contains('open')) {
          toggleNotesPanel(false);
        }
      }
    });
  }

  // ── 6. Animações escalonadas via IntersectionObserver ───
  function setupCardAnimations(container) {
    var cards = container.querySelectorAll('.rel-card, .rel-sug-card, .rel-agenda-item');

    if (!('IntersectionObserver' in window)) {
      cards.forEach(function(c) { c.classList.add('erg-card-anim', 'erg-card-visible'); });
      return;
    }

    cards.forEach(function(card, i) {
      card.style.animationDelay = (i * 55) + 'ms';
      card.classList.add('erg-card-anim');
    });

    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('erg-card-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    cards.forEach(function(c) { io.observe(c); });
  }

  // ── 7. Pulso visual no semáforo crítico ─────────────────
  function highlightCriticalSemaforo(container) {
    var sem = container.querySelector('.rel-semaforo span');
    if (!sem) return;
    var txt = sem.textContent.toUpperCase();
    if (txt.indexOf('INTERVEN') >= 0 || txt.indexOf('CRÍT') >= 0 || txt.indexOf('CRITIC') >= 0) {
      var parent = sem.closest ? sem.closest('.rel-semaforo') : sem.parentElement;
      if (parent) parent.classList.add('erg-semaforo-critico');
    }
  }

  // ── 8. Back-to-top animado ───────────────────────────────
  function injectBackToTop() {
    if (document.getElementById('erg-back-top')) return;
    var btn = document.createElement('button');
    btn.id        = 'erg-back-top';
    btn.className = 'erg-back-top';
    btn.setAttribute('aria-label', 'Voltar ao topo da página');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>';
    document.body.appendChild(btn);

    btn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    window.addEventListener('scroll', function() {
      btn.classList.toggle('erg-back-top-visible', window.scrollY > 400);
    }, { passive: true });
  }

  // ── 9 + 10 + 11 + 12. Observer central no #rel-mount ────
  function watchMountChanges() {
    var mount = document.getElementById('rel-mount');
    if (!mount) return;

    var reportRendered = false;
    window._relatorioGeradoEm = Date.now();

    var observer = new MutationObserver(function() {
      var container = mount.querySelector('.rel-container');

      if (container && !reportRendered) {
        reportRendered = true;

        // 10. Focus management
        var h1 = mount.querySelector('.rel-nome, h1');
        if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }

        hideProgressToast();
        setupCardAnimations(mount);
        highlightCriticalSemaforo(mount);

        // 11. Barras de progresso animadas
        animateBars(mount);

        // 12. Badge dinâmico
        injectTimestampBadge(container);

        // 18. Contagem de palavras
        updateWordCount(container);

        // 19. Print header
        injectPrintHeader();

        // 20. Assinatura digital
        injectDigitalSignature(container);

        // 21. Painel de notas
        injectNotesPanel();

        observer.disconnect();
        return;
      }

      // 9. Estado de erro com retry
      var errEl = mount.querySelector('p[style*="B33030"]');
      if (errEl && !(errEl.nextElementSibling && errEl.nextElementSibling.classList.contains('erg-retry-btn'))) {
        hideProgressToast();
        var retryBtn = document.createElement('button');
        retryBtn.className = 'erg-retry-btn';
        retryBtn.textContent = 'Tentar novamente';
        retryBtn.setAttribute('aria-label', 'Recarregar o relatório');
        retryBtn.addEventListener('click', function() { window.location.reload(); });
        errEl.parentNode.insertBefore(retryBtn, errEl.nextSibling);
        announce('Erro ao gerar relatório. Botão de nova tentativa disponível.');
      }
    });

    observer.observe(mount, { childList: true, subtree: true });
  }

  // ── 11. Animação das barras de comportamento ─────────────
  function animateBars(container) {
    container.querySelectorAll('.rel-comp-bar-fill').forEach(function(bar, i) {
      var target = bar.style.width;
      bar.style.width = '0%';
      bar.style.transition = 'none';
      setTimeout(function() {
        bar.style.transition = 'width 0.75s cubic-bezier(0.4, 0, 0.2, 1) ' + (i * 70) + 'ms';
        bar.style.width = target;
      }, 80);
    });
  }

  // ── 12. Badge dinâmico "gerado há X min" ─────────────────
  function injectTimestampBadge(container) {
    var sub = container.querySelector('.rel-capa-sub');
    if (!sub || sub.querySelector('.erg-timestamp')) return;

    var badge = document.createElement('span');
    badge.className = 'erg-timestamp';
    badge.setAttribute('aria-label', 'Tempo desde a geração do relatório');

    function update() {
      var elapsed = Math.floor((Date.now() - window._relatorioGeradoEm) / 60000);
      badge.textContent = elapsed < 1 ? 'Agora mesmo' : ('Há ' + elapsed + ' min');
    }

    update();
    setInterval(update, 60000);
    sub.appendChild(badge);
  }

  // ── 13. ARIA no main-content ─────────────────────────────
  function improveMainAria() {
    var main = document.querySelector('.main-content');
    if (main) {
      if (!main.id) main.id = 'main-content';
      main.setAttribute('role', 'main');
      main.setAttribute('aria-label', 'Relatório de consulta');
    }
    var mount = document.getElementById('rel-mount');
    if (mount) mount.setAttribute('aria-live', 'polite');
  }

  // ── 14. Botão WhatsApp share ─────────────────────────────
  function injectWhatsAppBtn() {
    var nav = document.querySelector('.sidebar-nav');
    if (!nav || document.getElementById('btn-whatsapp')) return;

    var btn = document.createElement('a');
    btn.id        = 'btn-whatsapp';
    btn.href      = 'javascript:void(0)';
    btn.className = 'nav-item';
    btn.setAttribute('aria-label', 'Enviar relatório via WhatsApp');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> WhatsApp';

    btn.addEventListener('click', function() {
      var sidebarNome = document.getElementById('rel-nome-sidebar');
      var nome = (sidebarNome && sidebarNome.textContent) ? sidebarNome.textContent : patientNome;
      var txt  = encodeURIComponent('Olá! Segue o resumo da sua consulta.\nPaciente: ' + nome + '\nRelatório: ' + window.location.href);
      window.open('https://wa.me/?text=' + txt, '_blank', 'noopener,noreferrer');
      announce('Abrindo WhatsApp');
    });

    nav.appendChild(btn);
  }

  // ── 15. Copiar relatório para clipboard ──────────────────
  function injectCopyReportBtn() {
    var nav = document.querySelector('.sidebar-nav');
    if (!nav || document.getElementById('btn-copiar-relatorio')) return;

    var btn = document.createElement('a');
    btn.id        = 'btn-copiar-relatorio';
    btn.href      = 'javascript:void(0)';
    btn.className = 'nav-item';
    btn.setAttribute('aria-label', 'Copiar texto do relatório para a área de transferência');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Copiar relatório';

    btn.addEventListener('click', function() {
      if (!navigator.clipboard) return;
      var mount = document.getElementById('rel-mount');
      if (!mount) return;

      var lines = [];
      var nomeEl = mount.querySelector('.rel-nome');
      var nome   = nomeEl ? nomeEl.textContent.trim() : patientNome;
      var data   = new Date().toLocaleDateString('pt-BR');
      lines.push('RELATÓRIO DE CONSULTA — ' + nome);
      lines.push('Data: ' + data);
      lines.push('');

      var cards = mount.querySelectorAll('.rel-card, .rel-sug-card');
      cards.forEach(function(el) {
        var titleEl = el.querySelector('.rel-card-title');
        if (titleEl) lines.push('\n== ' + titleEl.textContent.trim().toUpperCase() + ' ==');
        var rows = el.querySelectorAll('.rel-kv, .rel-peso-card');
        rows.forEach(function(row) {
          var t = row.textContent.replace(/\s+/g, ' ').trim();
          if (t) lines.push(t);
        });
      });

      var text = lines.join('\n');
      var orig = btn.innerHTML;
      navigator.clipboard.writeText(text).then(function() {
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E8B6A" stroke-width="1.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Copiado!';
        btn.style.color = '#2E8B6A';
        announce('Relatório copiado para a área de transferência');
        setTimeout(function() { btn.innerHTML = orig; btn.style.color = ''; }, 2200);
      });
    });

    nav.appendChild(btn);
  }

  // ── 16. Toggle Dark Mode ─────────────────────────────────
  function injectDarkModeToggle() {
    var nav = document.querySelector('.sidebar-nav');
    if (!nav || document.getElementById('btn-dark-mode')) return;

    var isDark = localStorage.getItem('erg_dark_mode') === '1';
    if (isDark) document.body.classList.add('erg-dark-mode');

    var btn = document.createElement('a');
    btn.id        = 'btn-dark-mode';
    btn.href      = 'javascript:void(0)';
    btn.className = 'nav-item';
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', isDark ? 'true' : 'false');
    btn.setAttribute('tabindex', '0');

    var moonSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    var sunSvg  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

    function updateBtn() {
      var dark = document.body.classList.contains('erg-dark-mode');
      btn.innerHTML = (dark ? sunSvg : moonSvg) + ' ' + (dark ? 'Modo claro' : 'Modo escuro');
      btn.setAttribute('aria-checked', dark ? 'true' : 'false');
      btn.setAttribute('aria-label', dark ? 'Alternar para modo claro' : 'Alternar para modo escuro');
    }

    updateBtn();

    btn.addEventListener('click', function() {
      document.body.classList.toggle('erg-dark-mode');
      var nowDark = document.body.classList.contains('erg-dark-mode');
      try { localStorage.setItem('erg_dark_mode', nowDark ? '1' : '0'); } catch (_e) {}
      updateBtn();
      announce(nowDark ? 'Modo escuro ativado' : 'Modo claro ativado');
    });

    nav.appendChild(btn);
  }

  // ── 17. Modo apresentação (foco no relatório) ────────────
  function injectPresentationMode() {
    var nav = document.querySelector('.sidebar-nav');
    if (!nav || document.getElementById('btn-apresentacao')) return;

    var btn = document.createElement('a');
    btn.id        = 'btn-apresentacao';
    btn.href      = 'javascript:void(0)';
    btn.className = 'nav-item';
    btn.setAttribute('aria-label', 'Ativar modo apresentação — foco no relatório');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> Apresentação';

    btn.addEventListener('click', function() {
      document.body.classList.add('erg-presentation-mode');
      announce('Modo apresentação ativado. Pressione Esc para sair.');
      var exitBtn = document.getElementById('erg-exit-presentation');
      if (!exitBtn) {
        exitBtn = document.createElement('button');
        exitBtn.id        = 'erg-exit-presentation';
        exitBtn.className = 'erg-exit-presentation';
        exitBtn.setAttribute('aria-label', 'Sair do modo apresentação');
        exitBtn.textContent = '× Sair da apresentação';
        exitBtn.addEventListener('click', exitPresentationMode);
        document.body.appendChild(exitBtn);
      }
      exitBtn.style.display = 'flex';
    });

    nav.appendChild(btn);
  }

  function exitPresentationMode() {
    document.body.classList.remove('erg-presentation-mode');
    var exitBtn = document.getElementById('erg-exit-presentation');
    if (exitBtn) exitBtn.style.display = 'none';
    announce('Modo apresentação desativado');
  }

  // ── 18. Contagem de palavras no relatório ────────────────
  function updateWordCount(container) {
    var text  = container.innerText || container.textContent || '';
    var words = text.trim().split(/\s+/).filter(function(w) { return w.length > 0; }).length;
    var capa  = container.querySelector('.rel-capa-sub');
    if (!capa) return;

    var badge = document.getElementById('erg-word-count');
    if (!badge) {
      badge = document.createElement('span');
      badge.id        = 'erg-word-count';
      badge.className = 'erg-word-count';
      capa.appendChild(badge);
    }
    badge.setAttribute('aria-label', 'Relatório contém ' + words + ' palavras');
    badge.textContent = words + ' palavras';
  }

  // ── 19. Print header com identidade da clínica ──────────
  function injectPrintHeader() {
    if (document.getElementById('erg-print-header')) return;

    var header = document.createElement('div');
    header.id        = 'erg-print-header';
    header.className = 'erg-print-header';
    header.setAttribute('aria-hidden', 'true');
    header.innerHTML = '<div class="erg-print-header-inner"><div class="erg-print-clinic-info"><p class="erg-print-clinic-name">ERG — Nutrição Clínica</p><p class="erg-print-clinic-sub">Relatório de Consulta — Documento Confidencial</p></div><div class="erg-print-clinic-date"><p class="erg-print-date-val">' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) + '</p><p class="erg-print-date-label">Data de emissão</p></div></div>';

    var main = document.querySelector('.main-content') || document.body;
    main.insertBefore(header, main.firstChild);
  }

  // ── 20. Assinatura digital simulada ─────────────────────
  function injectDigitalSignature(container) {
    if (document.getElementById('erg-signature-footer')) return;

    var sig = document.createElement('div');
    sig.id        = 'erg-signature-footer';
    sig.className = 'erg-signature-footer';
    sig.setAttribute('aria-hidden', 'true');

    var agora = new Date().toLocaleString('pt-BR');
    sig.innerHTML = '<div class="erg-sig-inner"><div class="erg-sig-line"></div><div class="erg-sig-content"><div class="erg-sig-left"><p class="erg-sig-name">Nutricionista Responsável</p><p class="erg-sig-role">CRN — ERG Nutrição Clínica</p><p class="erg-sig-date">Emitido em: ' + agora + '</p></div><div class="erg-sig-right"><div class="erg-sig-stamp"><p class="erg-sig-stamp-text">ERG</p><p class="erg-sig-stamp-sub">Documento Digital</p></div></div></div></div>';

    container.appendChild(sig);
  }

  // ── 21. Painel de notas clínicas (autosave localStorage) ─
  var NOTES_KEY = 'erg_rel_notes_' + patientId;

  function saveNotes(text) {
    try { localStorage.setItem(NOTES_KEY, text); } catch (_e) {}
  }

  function loadNotes() {
    try { return localStorage.getItem(NOTES_KEY) || ''; } catch (_e) { return ''; }
  }

  function showNotesStatus(msg) {
    var status = document.getElementById('erg-notes-status');
    if (!status) return;
    status.textContent = msg;
    status.classList.add('erg-notes-status-show');
    setTimeout(function() { status.classList.remove('erg-notes-status-show'); }, 2200);
  }

  function toggleNotesPanel(forceOpen) {
    var panel = document.getElementById('erg-notes-panel');
    var btn   = document.getElementById('btn-notas');
    if (!panel) return;

    var shouldOpen = (forceOpen !== undefined) ? forceOpen : !panel.classList.contains('open');
    panel.classList.toggle('open', shouldOpen);
    if (btn) btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');

    if (shouldOpen) {
      setTimeout(function() {
        var ta = panel.querySelector('#erg-notes-ta');
        if (ta) ta.focus();
      }, 100);
      announce('Painel de notas clínicas aberto');
    } else {
      announce('Painel de notas clínicas fechado');
    }
  }

  function injectNotesPanel() {
    if (document.getElementById('erg-notes-panel')) return;

    var nav = document.querySelector('.sidebar-nav');
    if (nav && !document.getElementById('btn-notas')) {
      var toggleBtn = document.createElement('a');
      toggleBtn.id        = 'btn-notas';
      toggleBtn.href      = 'javascript:void(0)';
      toggleBtn.className = 'nav-item';
      toggleBtn.setAttribute('aria-label', 'Abrir painel de notas clínicas');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.setAttribute('tabindex', '0');
      toggleBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Notas clínicas';
      toggleBtn.addEventListener('click', function() { toggleNotesPanel(); });
      nav.appendChild(toggleBtn);
    }

    var panel = document.createElement('div');
    panel.id        = 'erg-notes-panel';
    panel.className = 'erg-notes-panel';
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'Notas clínicas da consulta');

    var saved = loadNotes();
    panel.innerHTML = '<div class="erg-notes-header"><p class="erg-notes-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Notas Clínicas</p><div class="erg-notes-toolbar"><button id="erg-notes-voice" class="erg-notes-action-btn" aria-label="Ativar ditado por voz" title="Ditado por voz" aria-pressed="false"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button><button id="erg-notes-clear" class="erg-notes-action-btn" aria-label="Limpar notas" title="Limpar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button><button id="erg-notes-close" class="erg-notes-action-btn" aria-label="Fechar painel de notas"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div></div><textarea id="erg-notes-ta" class="erg-notes-textarea" placeholder="Anotações da consulta, observações clínicas, lembretes... (Ctrl+S para salvar)" aria-label="Campo de notas clínicas">' + (saved ? saved.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '') + '</textarea><div class="erg-notes-footer"><span id="erg-notes-status" class="erg-notes-status" aria-live="polite"></span><span class="erg-notes-hint">Ctrl+S para salvar</span></div>';

    document.body.appendChild(panel);

    var ta = panel.querySelector('#erg-notes-ta');
    var autosaveTimer;
    ta.addEventListener('input', function() {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(function() {
        saveNotes(ta.value);
        showNotesStatus('Salvo automaticamente');
      }, 1500);
    });

    panel.querySelector('#erg-notes-close').addEventListener('click', function() { toggleNotesPanel(false); });

    panel.querySelector('#erg-notes-clear').addEventListener('click', function() {
      if (ta.value && window.confirm('Limpar todas as notas?')) {
        ta.value = '';
        saveNotes('');
        showNotesStatus('Notas limpas');
        announce('Notas clínicas limpas');
      }
    });

    // 22. Voz para texto
    setupVoiceToText(panel.querySelector('#erg-notes-voice'), ta);
  }

  // ── 22. Voz para texto (Web Speech API) ─────────────────
  function setupVoiceToText(voiceBtn, textarea) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !voiceBtn) {
      if (voiceBtn) voiceBtn.style.display = 'none';
      return;
    }

    var recognition = new SR();
    recognition.lang            = 'pt-BR';
    recognition.continuous      = true;
    recognition.interimResults  = true;

    var isListening      = false;
    var baseTranscript   = '';

    recognition.onresult = function(event) {
      var interim = '';
      var i;
      for (i = event.resultIndex; i < event.results.length; i++) {
        var t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          baseTranscript += t + ' ';
        } else {
          interim += t;
        }
      }
      textarea.value = baseTranscript + interim;
    };

    recognition.onend = function() {
      if (isListening) { recognition.start(); return; }
      saveNotes(textarea.value);
      voiceBtn.classList.remove('erg-notes-voice-active');
      voiceBtn.setAttribute('aria-pressed', 'false');
      voiceBtn.setAttribute('aria-label', 'Ativar ditado por voz');
      showNotesStatus('Ditado finalizado');
    };

    recognition.onerror = function() {
      isListening = false;
      voiceBtn.classList.remove('erg-notes-voice-active');
      voiceBtn.setAttribute('aria-pressed', 'false');
    };

    voiceBtn.addEventListener('click', function() {
      if (isListening) {
        isListening = false;
        recognition.stop();
      } else {
        baseTranscript = textarea.value;
        isListening    = true;
        recognition.start();
        voiceBtn.classList.add('erg-notes-voice-active');
        voiceBtn.setAttribute('aria-pressed', 'true');
        voiceBtn.setAttribute('aria-label', 'Parar ditado por voz');
        announce('Ditado por voz ativado. Fale agora.');
        showNotesStatus('Ouvindo...');
      }
    });
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    injectSkipLink();
    injectAriaLive();
    improveMainAria();
    showProgressToast();
    injectCopyLinkBtn();
    injectWhatsAppBtn();
    injectCopyReportBtn();
    injectDarkModeToggle();
    injectPresentationMode();
    setupKeyboardShortcuts();
    injectBackToTop();
    watchMountChanges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init: init, announce: announce, hideProgressToast: hideProgressToast, toggleNotesPanel: toggleNotesPanel, exitPresentationMode: exitPresentationMode };
})();

// ═══ POLIMENTO V3 ═══
// V3: acessibilidade avançada — focus trap, arrow-key nav, ARIA regions, reduced-motion

(function _adminRelatorioV3() {

  // V3-1. aria-expanded dinâmico no hamburger
  function setupHamburgerAria() {
    const btn = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    if (!btn || !sidebar) return;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'sidebar');
    btn.setAttribute('aria-label', 'Abrir menu de navegação');
    new MutationObserver(() => {
      const open = sidebar.classList.contains('open');
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu de navegação');
    }).observe(sidebar, { attributes: true, attributeFilter: ['class'] });
  }

  // V3-2. Esc fecha sidebar mobile e devolve foco ao botão
  function setupEscClose() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar?.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay?.classList.remove('active');
        document.getElementById('hamburger-btn')?.focus();
      }
    });
  }

  // V3-3. Focus trap dentro do sidebar aberto (acessibilidade modal)
  function setupFocusTrap() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !sidebar.classList.contains('open')) return;
      const focusable = [...sidebar.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex="0"]'
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  // V3-4. Arrow key navigation nos itens da sidebar
  function setupArrowKeyNav() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;
    nav.addEventListener('keydown', (e) => {
      if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      const items = [...nav.querySelectorAll('.nav-item')];
      const idx = items.indexOf(document.activeElement);
      if (idx === -1) return;
      e.preventDefault();
      const next = e.key === 'ArrowDown'
        ? items[(idx + 1) % items.length]
        : items[(idx - 1 + items.length) % items.length];
      next?.focus();
    });
  }

  // V3-5. ARIA regions e labels dinâmicos no relatório
  function watchAndLabelRegions() {
    const mount = document.getElementById('rel-mount');
    if (!mount) return;

    function labelContainer(container) {
      // Capa
      const capa = container.querySelector('.rel-capa');
      if (capa && !capa.getAttribute('role')) {
        capa.setAttribute('role', 'region');
        capa.setAttribute('aria-label', 'Capa do relatório');
      }
      // Grid principal
      const grid = container.querySelector('.rel-grid');
      if (grid && !grid.getAttribute('role')) {
        grid.setAttribute('role', 'region');
        grid.setAttribute('aria-label', 'Dados da consulta');
      }
      // Seções largas — usa o título como label
      container.querySelectorAll('.rel-section-wide').forEach((sec) => {
        if (sec.getAttribute('role')) return;
        const title = sec.querySelector('.rel-section-title');
        if (!title) return;
        sec.setAttribute('role', 'region');
        if (!title.id) title.id = 'erg-sec-' + Math.random().toString(36).slice(2, 7);
        sec.setAttribute('aria-labelledby', title.id);
      });
      // Semáforo clínico com role=status
      container.querySelectorAll('.rel-semaforo').forEach((sem) => {
        if (!sem.getAttribute('role')) {
          sem.setAttribute('role', 'status');
          sem.setAttribute('aria-label', 'Status clínico: ' + sem.textContent.trim());
        }
      });
    }

    new MutationObserver(() => {
      const c = mount.querySelector('.rel-container');
      if (c) labelContainer(c);
    }).observe(mount, { childList: true, subtree: false });
  }

  // V3-6. User Timing API — mede tempo de geração do relatório
  function measureRender() {
    if (!window.performance?.mark) return;
    const mount = document.getElementById('rel-mount');
    if (!mount) return;
    performance.mark('erg-rel-start');
    new MutationObserver((_, obs) => {
      if (mount.querySelector('.rel-container')) {
        obs.disconnect();
        performance.mark('erg-rel-end');
        try {
          performance.measure('erg-rel-render', 'erg-rel-start', 'erg-rel-end');
          const [m] = performance.getEntriesByName('erg-rel-render');
          if (m) mount.setAttribute('data-render-ms', Math.round(m.duration));
        } catch (_) { /* noop: cross-origin guard */ }
      }
    }).observe(mount, { childList: true, subtree: true });
  }

  // V3-7. aria-current na página ativa da sidebar
  function setAriaCurrentPage() {
    const page = location.pathname.split('/').pop() || '';
    document.querySelectorAll('.sidebar-nav .nav-item[href]').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('/').pop();
      if (href && href !== 'javascript:void(0)' && href === page) {
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  // V3-8. Desabilita links inacessíveis durante carregamento
  function disableLoadingLinks() {
    const mount = document.getElementById('rel-mount');
    if (!mount) return;
    mount.querySelectorAll('a[href="javascript:void(0)"]').forEach((a) => {
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('tabindex', '-1');
    });
  }

  // V3-9. Anuncia intent de impressão via screen reader
  function setupPrintAnnounce() {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('print');
    const handler = (e) => {
      if (e.matches) window._adminRelatorioExtras?.announce('Abrindo diálogo de impressão');
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
  }

  function initV3() {
    setupHamburgerAria();
    setupEscClose();
    setupFocusTrap();
    setupArrowKeyNav();
    watchAndLabelRegions();
    measureRender();
    setAriaCurrentPage();
    disableLoadingLinks();
    setupPrintAnnounce();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV3);
  } else {
    initV3();
  }
})();
