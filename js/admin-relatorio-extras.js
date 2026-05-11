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

// ═══ POLIMENTO V4 ═══
// V4: performance — rIC, Page Visibility, prefetch, sticky header, Network Info,
//     Nav Timing, ResizeObserver, lazy images, sessionStorage, content-visibility

(function _adminRelatorioV4() {
  'use strict';

  // V4-1. requestIdleCallback polyfill
  const rIC = window.requestIdleCallback
    ? (cb, opts) => window.requestIdleCallback(cb, opts)
    : (cb) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 200);

  // V4-2. Page Visibility — atualiza badge de tempo ao restaurar aba
  function setupPageVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden || !window._relatorioGeradoEm) return;
      const badge = document.querySelector('.erg-timestamp');
      if (!badge) return;
      const elapsed = Math.floor((Date.now() - window._relatorioGeradoEm) / 60000);
      const txt = elapsed < 1 ? 'Agora mesmo' : 'Há ' + elapsed + ' min';
      badge.textContent = txt;
      badge.setAttribute('aria-label', 'Tempo desde a geração do relatório: ' + txt);
    });
  }

  // V4-3. Prefetch próximas páginas prováveis no idle
  function prefetchLikelyPages() {
    const params = new URLSearchParams(window.location.search);
    const patient = encodeURIComponent(params.get('patient') || '');
    const nome    = encodeURIComponent(params.get('nome') || '');
    const qs      = patient ? ('?patient=' + patient + '&nome=' + nome) : '';

    const targets = ['admin.html'];
    if (qs) {
      targets.push('checkin-resumo.html' + qs);
      targets.push('admin-dossie.html' + qs);
    }

    rIC(() => {
      targets.forEach((url) => {
        if (document.head.querySelector('link[rel="prefetch"][href="' + url + '"]')) return;
        const link = document.createElement('link');
        link.rel  = 'prefetch';
        link.href = url;
        link.as   = 'document';
        document.head.appendChild(link);
      });
    }, { timeout: 3000 });
  }

  // V4-4. Sticky compact patient bar via IntersectionObserver
  function setupStickyPatientBar(container) {
    if (document.getElementById('erg-sticky-bar') || !container) return;
    const capa   = container.querySelector('.rel-capa');
    const nomeEl = container.querySelector('.rel-nome');
    if (!capa || !nomeEl) return;

    const semEl   = container.querySelector('.rel-semaforo span');
    const semCls  = semEl ? (semEl.parentElement.className || '') : '';

    const bar = document.createElement('div');
    bar.id        = 'erg-sticky-bar';
    bar.className = 'erg-sticky-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML =
      '<span class="erg-sticky-bar-nome">' + nomeEl.textContent.trim() + '</span>' +
      (semEl ? '<span class="erg-sticky-bar-sem ' + semCls + '">' + semEl.textContent.trim() + '</span>' : '');

    const main = document.getElementById('main-content') || document.querySelector('.main-content');
    if (!main) return;
    main.insertBefore(bar, main.firstChild);

    const io = new IntersectionObserver((entries) => {
      bar.classList.toggle('erg-sticky-bar-visible', !entries[0].isIntersecting);
    }, { threshold: 0, rootMargin: '-40px 0px 0px 0px' });
    io.observe(capa);
  }

  // V4-5. Network Information API — classe erg-slow-connection em conexões lentas
  function detectConnectionQuality() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    const slow = conn.saveData || ['slow-2g', '2g'].includes(conn.effectiveType);
    if (!slow) return;
    document.body.classList.add('erg-slow-connection');
    document.querySelectorAll('.erg-card-anim:not(.erg-card-visible)').forEach((el) => {
      el.classList.add('erg-card-visible');
    });
  }

  // V4-6. PerformanceNavigationTiming — atributos de timing no #rel-mount
  function enrichTimingData() {
    if (!window.performance || !performance.getEntriesByType) return;
    const [nav] = performance.getEntriesByType('navigation');
    if (!nav) return;
    const mount = document.getElementById('rel-mount');
    if (!mount) return;
    const interactive = Math.round(nav.domInteractive);
    const total       = Math.round(nav.loadEventEnd - nav.startTime);
    if (interactive > 0) mount.setAttribute('data-dom-interactive', interactive);
    if (total > 0)       mount.setAttribute('data-load-total', total);
  }

  // V4-7. ResizeObserver — ajuste dinâmico de colunas dos grids
  function setupResizeObserver() {
    if (!window.ResizeObserver) return;
    const mount = document.getElementById('rel-mount');
    if (!mount) return;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      const sugGrid = mount.querySelector('.rel-sug-grid');
      if (sugGrid) {
        sugGrid.style.gridTemplateColumns =
          w < 460 ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))';
      }
      const agendaGrid = mount.querySelector('.rel-agenda-grid');
      if (agendaGrid) {
        agendaGrid.style.gridTemplateColumns =
          w < 520 ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))';
      }
    });

    ro.observe(mount);
  }

  // V4-8. Lazy loading em imagens do relatório
  function lazyImages(container) {
    rIC(() => {
      container.querySelectorAll('img:not([loading])').forEach((img) => {
        img.loading  = 'lazy';
        img.decoding = 'async';
      });
    });
  }

  // V4-9. SessionStorage — persiste nome do paciente para navegação rápida
  function setupPatientNameCache() {
    const KEY    = 'erg_cached_patient_nome';
    const params = new URLSearchParams(window.location.search);
    const nome   = params.get('nome');

    if (nome) {
      try { sessionStorage.setItem(KEY, decodeURIComponent(nome)); } catch (_) {}
    }

    const sidebar = document.getElementById('rel-nome-sidebar');
    if (!sidebar) return;

    if (!nome && (!sidebar.textContent.trim() || sidebar.textContent.trim() === '—')) {
      const cached = sessionStorage.getItem(KEY);
      if (cached) sidebar.textContent = cached;
    }

    new MutationObserver(() => {
      const txt = sidebar.textContent.trim();
      if (txt && txt !== '—') {
        try { sessionStorage.setItem(KEY, txt); } catch (_) {}
      }
    }).observe(sidebar, { childList: true, characterData: true, subtree: true });
  }

  // V4-10. content-visibility: auto em seções abaixo da dobra
  function applyContentVisibility(container) {
    if (!CSS.supports('content-visibility', 'auto')) return;
    container.querySelectorAll('.rel-section-wide').forEach((sec, i) => {
      if (i < 2) return;
      sec.style.contentVisibility = 'auto';
      sec.style.setProperty('contain-intrinsic-block-size', '300px');
    });
  }

  // Observa o #rel-mount para executar features que dependem do container renderizado
  function watchMount() {
    const mount = document.getElementById('rel-mount');
    if (!mount) return;

    const obs = new MutationObserver(() => {
      const container = mount.querySelector('.rel-container');
      if (!container) return;
      obs.disconnect();
      setupStickyPatientBar(container);
      lazyImages(container);
      applyContentVisibility(container);
    });

    obs.observe(mount, { childList: true, subtree: false });
  }

  function initV4() {
    setupPageVisibility();
    detectConnectionQuality();
    setupResizeObserver();
    setupPatientNameCache();
    watchMount();
    rIC(() => {
      prefetchLikelyPages();
      enrichTimingData();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV4);
  } else {
    initV4();
  }
})();

// ═══ POLIMENTO V5 ═══
// V5: Web APIs modernas — Wake Lock, Web Share, Notifications, Battery, Vibration,
//     Offline detection, Clipboard Read, Screen Orientation, Auto Color Scheme, PWA install

(function _adminRelatorioV5() {
  'use strict';

  const _rIC = window.requestIdleCallback
    ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
    : (cb) => setTimeout(cb, 300);

  function _announce(msg) {
    if (window._adminRelatorioExtras && window._adminRelatorioExtras.announce) {
      window._adminRelatorioExtras.announce(msg);
    }
  }

  // V5-1. Wake Lock API — mantém tela acesa durante modo apresentação
  var _wakeLock = null;

  function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock.request('screen').then(function(lock) {
      _wakeLock = lock;
      _wakeLock.addEventListener('release', function() { _wakeLock = null; });
    }).catch(function() { /* permissão negada ou tab em background */ });
  }

  function releaseWakeLock() {
    if (_wakeLock) { _wakeLock.release(); _wakeLock = null; }
  }

  new MutationObserver(function() {
    if (document.body.classList.contains('erg-presentation-mode')) {
      acquireWakeLock();
    } else {
      releaseWakeLock();
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && document.body.classList.contains('erg-presentation-mode')) {
      acquireWakeLock();
    }
  });

  // V5-2. Web Share API — compartilha relatório via share sheet nativo
  function injectWebShareBtn() {
    if (!navigator.share) return;
    var nav = document.querySelector('.sidebar-nav');
    if (!nav || document.getElementById('btn-web-share')) return;

    var btn = document.createElement('a');
    btn.id        = 'btn-web-share';
    btn.href      = 'javascript:void(0)';
    btn.className = 'nav-item';
    btn.setAttribute('aria-label', 'Compartilhar relatório via share sheet nativo');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Compartilhar';

    btn.addEventListener('click', function() {
      var nomeEl = document.querySelector('.rel-nome') || document.getElementById('rel-nome-sidebar');
      var nome   = nomeEl ? nomeEl.textContent.trim() : 'Paciente';
      navigator.share({
        title: 'Relatório ERG — ' + nome,
        text:  'Relatório de consulta nutricional de ' + nome,
        url:   window.location.href,
      }).then(function() {
        _announce('Compartilhamento iniciado');
      }).catch(function(err) {
        if (err.name !== 'AbortError') { /* usuário cancelou — silencioso */ }
      });
    });

    nav.appendChild(btn);
  }

  // V5-3. Notifications API — avisa quando relatório carrega em aba em background
  function setupNotification() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') return;

    var mount = document.getElementById('rel-mount');
    if (!mount) return;

    var obs = new MutationObserver(function(_, ob) {
      if (!mount.querySelector('.rel-container')) return;
      ob.disconnect();

      if (document.visibilityState === 'visible') return;

      function tryNotify() {
        if (Notification.permission !== 'granted') return;
        var nomeEl = mount.querySelector('.rel-nome');
        var nome   = nomeEl ? nomeEl.textContent.trim() : 'Paciente';
        var n = new Notification('Relatório ERG pronto', {
          body: 'O relatório de ' + nome + ' foi gerado.',
          icon: 'favicon.ico',
          tag:  'erg-relatorio-pronto',
        });
        n.onclick = function() { window.focus(); n.close(); };
      }

      if (Notification.permission === 'granted') {
        tryNotify();
      } else {
        Notification.requestPermission().then(function(perm) {
          if (perm === 'granted') tryNotify();
        }).catch(function() { /* permissão negada */ });
      }
    });

    obs.observe(mount, { childList: true, subtree: false });
  }

  // V5-4. Battery Status API — modo economia automático em bateria < 20%
  function setupBatteryMode() {
    if (!navigator.getBattery) return;
    navigator.getBattery().then(function(battery) {
      function check() {
        var isLow = !battery.charging && battery.level < 0.20;
        var wasLow = document.body.classList.contains('erg-battery-saver');
        document.body.classList.toggle('erg-battery-saver', isLow);
        if (isLow && !wasLow) {
          _announce('Bateria baixa — animações reduzidas para economizar energia');
        }
      }
      battery.addEventListener('levelchange', check);
      battery.addEventListener('chargingchange', check);
      check();
    }).catch(function() { /* API indisponível ou negada */ });
  }

  // V5-5. Vibration API — feedback háptico ao copiar/salvar (mobile)
  function setupVibrationFeedback() {
    if (!navigator.vibrate) return;

    document.addEventListener('click', function(e) {
      if (e.target.closest('#btn-copiar-link, #btn-copiar-relatorio, #btn-web-share')) {
        navigator.vibrate(30);
      }
    }, true);

    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (document.getElementById('erg-notes-ta')) {
          navigator.vibrate([20, 40, 20]);
        }
      }
    }, true);
  }

  // V5-6. Offline/Online detection — banner ao perder conexão
  function setupOfflineDetection() {
    var banner = null;

    function showBanner() {
      if (banner) return;
      banner = document.createElement('div');
      banner.id        = 'erg-offline-banner';
      banner.className = 'erg-offline-banner';
      banner.setAttribute('role', 'alert');
      banner.setAttribute('aria-live', 'assertive');
      banner.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
        '<line x1="1" y1="1" x2="23" y2="23"/>' +
        '<path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>' +
        '</svg> Sem conexão — relatório em modo offline';
      document.body.appendChild(banner);
      _announce('Conexão perdida. Trabalhando em modo offline.');
    }

    function hideBanner() {
      if (!banner) return;
      banner.classList.add('erg-offline-banner-hide');
      var b = banner;
      banner = null;
      setTimeout(function() { if (b.parentNode) b.parentNode.removeChild(b); }, 400);
      _announce('Conexão restaurada.');
    }

    if (!navigator.onLine) showBanner();
    window.addEventListener('offline', showBanner);
    window.addEventListener('online', hideBanner);
  }

  // V5-7. Clipboard Read API — colar da área de transferência nas notas
  function setupClipboardPaste() {
    if (!navigator.clipboard || !navigator.clipboard.readText) return;
    var panel = document.getElementById('erg-notes-panel');
    if (!panel) return;
    var toolbar = panel.querySelector('.erg-notes-toolbar');
    if (!toolbar || document.getElementById('btn-notes-paste')) return;

    var pasteBtn = document.createElement('button');
    pasteBtn.id        = 'btn-notes-paste';
    pasteBtn.className = 'erg-notes-action-btn';
    pasteBtn.setAttribute('aria-label', 'Colar da área de transferência nas notas');
    pasteBtn.setAttribute('title', 'Colar (Clipboard)');
    pasteBtn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
      '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>' +
      '<rect x="8" y="2" width="8" height="4" rx="1"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>' +
      '</svg>';

    pasteBtn.addEventListener('click', function() {
      var ta = document.getElementById('erg-notes-ta');
      if (!ta) return;
      navigator.clipboard.readText().then(function(text) {
        var start = ta.selectionStart;
        var end   = ta.selectionEnd;
        ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + text.length;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        _announce('Texto colado nas notas clínicas');
      }).catch(function() {
        _announce('Permissão de leitura da área de transferência necessária');
      });
    });

    var closeBtn = toolbar.querySelector('#erg-notes-close');
    toolbar.insertBefore(pasteBtn, closeBtn);
  }

  // V5-8. Screen Orientation Lock — trava landscape no modo apresentação (mobile)
  function setupOrientationLock() {
    var scr = window.screen;
    if (!scr || !scr.orientation || !scr.orientation.lock) return;

    new MutationObserver(function() {
      if (document.body.classList.contains('erg-presentation-mode')) {
        scr.orientation.lock('landscape').catch(function() { /* negado em desktop */ });
      } else {
        try { scr.orientation.unlock(); } catch (_) {}
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  // V5-9. System Color Scheme — auto-dark sincroniza com OS em tempo real
  function setupAutoColorScheme() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia('(prefers-color-scheme: dark)');

    function syncScheme(dark) {
      var manual = null;
      try { manual = localStorage.getItem('erg_dark_mode'); } catch (_) {}
      if (manual !== null) return;
      document.body.classList.toggle('erg-dark-mode', dark);
    }

    syncScheme(mq.matches);

    var handler = function(e) { syncScheme(e.matches); };
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    } else if (mq.addListener) {
      mq.addListener(handler);
    }
  }

  // V5-10. PWA BeforeInstallPrompt — botão "Instalar app" na sidebar
  function setupPwaInstallPrompt() {
    var deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      deferredPrompt = e;

      var nav = document.querySelector('.sidebar-nav');
      if (!nav || document.getElementById('btn-pwa-install')) return;

      var btn = document.createElement('a');
      btn.id        = 'btn-pwa-install';
      btn.href      = 'javascript:void(0)';
      btn.className = 'nav-item erg-pwa-install-btn';
      btn.setAttribute('aria-label', 'Instalar ERG 360 como aplicativo');
      btn.setAttribute('tabindex', '0');
      btn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
        '<path d="M12 2v13m0 0l-4-4m4 4l4-4M3 18h18"/>' +
        '</svg> Instalar app';

      btn.addEventListener('click', function() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(result) {
          if (result.outcome === 'accepted') {
            btn.remove();
            _announce('ERG 360 instalado com sucesso');
          }
          deferredPrompt = null;
        });
      });

      nav.appendChild(btn);
    });

    window.addEventListener('appinstalled', function() {
      var btn = document.getElementById('btn-pwa-install');
      if (btn) btn.remove();
      deferredPrompt = null;
    });
  }

  // ── Init V5 ──────────────────────────────────────────────
  function initV5() {
    injectWebShareBtn();
    setupOfflineDetection();
    setupVibrationFeedback();
    setupOrientationLock();
    setupPwaInstallPrompt();
    setupAutoColorScheme();

    _rIC(function() {
      setupBatteryMode();
      setupNotification();
    });

    // Clipboard paste — aguarda painel de notas ser injetado no body
    if (document.getElementById('erg-notes-panel')) {
      setupClipboardPaste();
    } else {
      var notesObs = new MutationObserver(function(_, ob) {
        if (!document.getElementById('erg-notes-panel')) return;
        ob.disconnect();
        setupClipboardPaste();
      });
      notesObs.observe(document.body, { childList: true, subtree: false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV5);
  } else {
    initV5();
  }
})();
