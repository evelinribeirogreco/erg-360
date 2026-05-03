// ════════════════════════════════════════════════════════════════
// admin-dossie-extras.js — 20 melhorias UX — ERG 360
// Dossiê Clínico · Dra. Evelin Ribeiro Greco
// API exposta em window._adminDossieExtras
// ════════════════════════════════════════════════════════════════
window._adminDossieExtras = (() => {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────
  function getPatientId() {
    return new URLSearchParams(window.location.search).get('patient') || 'unknown';
  }

  function storageKey(suffix) {
    return 'erg-dossie-' + getPatientId() + '-' + suffix;
  }

  // ── 2. ARIA live announce ────────────────────────────────────
  function announce(msg) {
    var el = document.getElementById('ded-aria-live');
    if (!el) return;
    el.textContent = '';
    requestAnimationFrame(function () { el.textContent = msg; });
  }

  // General notification toast
  function showNotif(msg, isError) {
    var el = document.getElementById('ded-notif');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ded-notif';
      el.className = 'ded-notif';
      document.body.appendChild(el);
    }
    el.className = 'ded-notif' + (isError ? ' ded-notif-error' : '');
    el.textContent = msg;
    requestAnimationFrame(function () { el.classList.add('ded-notif-show'); });
    setTimeout(function () { el.classList.remove('ded-notif-show'); }, 2600);
  }

  // ── 1. Skip link ─────────────────────────────────────────────
  function injectSkipLink() {
    if (document.getElementById('ded-skip-link')) return;
    var a = document.createElement('a');
    a.id = 'ded-skip-link';
    a.href = '#dos-mount';
    a.textContent = 'Pular para o dossiê';
    a.className = 'ded-skip-link';
    document.body.prepend(a);
  }

  // ── 2. ARIA live region ──────────────────────────────────────
  function injectAriaLive() {
    if (document.getElementById('ded-aria-live')) return;
    var el = document.createElement('div');
    el.id = 'ded-aria-live';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'ded-sr-only';
    document.body.appendChild(el);
  }

  // ── 3. Loading progress toast ────────────────────────────────
  var _toastTimers = [];

  function injectLoadingToast() {
    var toast = document.getElementById('ded-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ded-toast';
      toast.className = 'ded-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    var steps = [
      { label: 'Carregando dados clínicos…', delay: 0 },
      { label: 'Analisando check-ins e padrões…', delay: 1500 },
      { label: 'Calculando score metabólico…', delay: 3000 },
      { label: 'Montando dossiê clínico…', delay: 4200 },
    ];
    steps.forEach(function (s) {
      var t = setTimeout(function () {
        toast.innerHTML = '<span class="ded-toast-dot" aria-hidden="true"></span> ' + s.label;
        toast.classList.add('ded-toast-visible');
        announce(s.label);
      }, s.delay);
      _toastTimers.push(t);
    });
  }

  function hideLoadingToast() {
    _toastTimers.forEach(clearTimeout);
    _toastTimers = [];
    var toast = document.getElementById('ded-toast');
    if (!toast) return;
    toast.innerHTML = '<span class="ded-toast-ok" aria-hidden="true">✓</span> Dossiê carregado';
    toast.classList.add('ded-toast-visible');
    announce('Dossiê carregado com sucesso');
    setTimeout(function () {
      toast.classList.remove('ded-toast-visible');
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, 420);
    }, 2200);
  }

  // ── 4. Reading progress bar ──────────────────────────────────
  function injectProgressBar() {
    if (document.getElementById('ded-progress-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'ded-progress-bar';
    bar.className = 'ded-progress-bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Progresso de leitura');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', '0');
    document.body.appendChild(bar);

    function updateBar() {
      var docEl = document.documentElement;
      var scrollTop = docEl.scrollTop || document.body.scrollTop;
      var scrollHeight = docEl.scrollHeight - docEl.clientHeight;
      var pct = scrollHeight > 0 ? Math.min(100, Math.round((scrollTop / scrollHeight) * 100)) : 0;
      bar.style.width = pct + '%';
      bar.setAttribute('aria-valuenow', pct);
    }
    window.addEventListener('scroll', updateBar, { passive: true });
  }

  // ── 5. Floating Table of Contents ────────────────────────────
  function injectToc() {
    if (document.getElementById('ded-toc-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'ded-toc-btn';
    btn.className = 'ded-toc-btn';
    btn.setAttribute('aria-label', 'Índice de seções (Ctrl+K)');
    btn.setAttribute('title', 'Índice (Ctrl+K)');
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>' +
      '<span>Índice</span>';
    document.body.appendChild(btn);

    var overlay = document.createElement('div');
    overlay.id = 'ded-toc-overlay';
    overlay.className = 'ded-toc-overlay';
    document.body.appendChild(overlay);

    var panel = document.createElement('div');
    panel.id = 'ded-toc-panel';
    panel.className = 'ded-toc-panel';
    panel.setAttribute('role', 'navigation');
    panel.setAttribute('aria-label', 'Índice do dossiê');
    panel.innerHTML =
      '<div class="ded-toc-header">' +
        'Índice do Dossiê' +
        '<button class="ded-toc-close" id="ded-toc-close" aria-label="Fechar índice">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="ded-toc-list" id="ded-toc-list"></div>';
    document.body.appendChild(panel);

    function openToc() {
      panel.classList.add('ded-toc-open');
      overlay.style.display = 'block';
      announce('Índice aberto');

      var list = document.getElementById('ded-toc-list');
      list.innerHTML = '';

      // Capa
      var capa = document.querySelector('.dos-capa');
      if (capa) {
        var capaItem = document.createElement('button');
        capaItem.className = 'ded-toc-item';
        capaItem.innerHTML = '<span class="ded-toc-num">—</span><span>Capa do Dossiê</span>';
        capaItem.addEventListener('click', function () {
          capa.scrollIntoView({ behavior: 'smooth', block: 'start' });
          closeToc();
        });
        list.appendChild(capaItem);
      }

      document.querySelectorAll('.dos-sec-titulo').forEach(function (el) {
        var section = el.closest('.dos-secao');
        var numEl = section && section.querySelector('.dos-sec-num');
        var num = numEl ? numEl.textContent.trim() : '';
        var item = document.createElement('button');
        item.className = 'ded-toc-item';
        item.innerHTML = '<span class="ded-toc-num">' + num + '</span><span>' + el.textContent.trim() + '</span>';
        item.addEventListener('click', function () {
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          closeToc();
        });
        list.appendChild(item);
      });
    }

    function closeToc() {
      panel.classList.remove('ded-toc-open');
      overlay.style.display = 'none';
    }

    btn.addEventListener('click', function () {
      panel.classList.contains('ded-toc-open') ? closeToc() : openToc();
    });
    document.getElementById('ded-toc-close').addEventListener('click', closeToc);
    overlay.addEventListener('click', closeToc);

    return { open: openToc, close: closeToc };
  }

  // ── 6. Inline search ─────────────────────────────────────────
  var _searchMatches = [];
  var _searchIndex = 0;
  var _searchActive = false;

  function injectSearch() {
    if (document.getElementById('ded-search-bar')) return;

    var bar = document.createElement('div');
    bar.id = 'ded-search-bar';
    bar.className = 'ded-search-bar';
    bar.setAttribute('role', 'search');
    bar.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
      '<input type="text" id="ded-search-input" class="ded-search-input" placeholder="Buscar no dossiê…" aria-label="Buscar no dossiê">' +
      '<span class="ded-search-count" id="ded-search-count" aria-live="polite"></span>' +
      '<div class="ded-search-nav">' +
        '<button class="ded-search-nav-btn" id="ded-search-prev" aria-label="Resultado anterior" title="Anterior (Shift+Enter)">↑</button>' +
        '<button class="ded-search-nav-btn" id="ded-search-next" aria-label="Próximo resultado" title="Próximo (Enter)">↓</button>' +
      '</div>' +
      '<button class="ded-search-close" id="ded-search-close" aria-label="Fechar busca" title="Fechar (Esc)">×</button>';
    document.body.appendChild(bar);

    var input = document.getElementById('ded-search-input');

    function openSearch() {
      bar.classList.add('ded-search-open');
      _searchActive = true;
      input.focus();
      input.select();
      announce('Busca aberta');
    }

    function closeSearch() {
      bar.classList.remove('ded-search-open');
      _searchActive = false;
      clearHighlights();
      document.getElementById('ded-search-count').textContent = '';
      announce('Busca fechada');
    }

    function clearHighlights() {
      document.querySelectorAll('mark.ded-highlight, mark.ded-highlight-active').forEach(function (mark) {
        var text = document.createTextNode(mark.textContent);
        if (mark.parentNode) mark.parentNode.replaceChild(text, mark);
      });
      _searchMatches = [];
    }

    function doSearch(term) {
      clearHighlights();
      var countEl = document.getElementById('ded-search-count');
      if (!term.trim()) { countEl.textContent = ''; return; }

      var doc = document.getElementById('dos-mount');
      if (!doc) return;

      var re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      var walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          var p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          var tag = p.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'MARK') return NodeFilter.FILTER_REJECT;
          if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      var textNodes = [];
      var n;
      while ((n = walker.nextNode())) textNodes.push(n);

      textNodes.forEach(function (tn) {
        var matches = [];
        var m;
        re.lastIndex = 0;
        while ((m = re.exec(tn.textContent)) !== null) matches.push(m);
        if (!matches.length) return;

        var frag = document.createDocumentFragment();
        var lastIdx = 0;
        matches.forEach(function (hit) {
          if (hit.index > lastIdx) {
            frag.appendChild(document.createTextNode(tn.textContent.slice(lastIdx, hit.index)));
          }
          var mark = document.createElement('mark');
          mark.className = 'ded-highlight';
          mark.textContent = hit[0];
          frag.appendChild(mark);
          _searchMatches.push(mark);
          lastIdx = hit.index + hit[0].length;
        });
        if (lastIdx < tn.textContent.length) {
          frag.appendChild(document.createTextNode(tn.textContent.slice(lastIdx)));
        }
        if (tn.parentNode) tn.parentNode.replaceChild(frag, tn);
      });

      _searchIndex = 0;
      updateActive();
      var count = _searchMatches.length;
      countEl.textContent = count > 0 ? (_searchIndex + 1) + '/' + count : 'Nenhum';
      announce(count > 0 ? count + ' resultado' + (count > 1 ? 's' : '') : 'Nenhum resultado');
    }

    function updateActive() {
      _searchMatches.forEach(function (m, i) {
        m.className = i === _searchIndex ? 'ded-highlight ded-highlight-active' : 'ded-highlight';
      });
      if (_searchMatches[_searchIndex]) {
        _searchMatches[_searchIndex].scrollIntoView({ block: 'center', behavior: 'smooth' });
        var count = _searchMatches.length;
        var countEl = document.getElementById('ded-search-count');
        if (countEl) countEl.textContent = (_searchIndex + 1) + '/' + count;
      }
    }

    var _searchTimer;
    input.addEventListener('input', function () {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(function () { doSearch(input.value); }, 220);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSearch(); return; }
      if (e.key === 'Enter' && _searchMatches.length) {
        e.preventDefault();
        _searchIndex = e.shiftKey
          ? (_searchIndex - 1 + _searchMatches.length) % _searchMatches.length
          : (_searchIndex + 1) % _searchMatches.length;
        updateActive();
      }
    });

    document.getElementById('ded-search-prev').addEventListener('click', function () {
      if (_searchMatches.length) {
        _searchIndex = (_searchIndex - 1 + _searchMatches.length) % _searchMatches.length;
        updateActive();
      }
    });
    document.getElementById('ded-search-next').addEventListener('click', function () {
      if (_searchMatches.length) {
        _searchIndex = (_searchIndex + 1) % _searchMatches.length;
        updateActive();
      }
    });
    document.getElementById('ded-search-close').addEventListener('click', closeSearch);

    return { open: openSearch, close: closeSearch };
  }

  // ── 7. Section collapse/expand ───────────────────────────────
  function wireSectionCollapse() {
    document.querySelectorAll('.dos-sec-header').forEach(function (header) {
      if (header.dataset.collapseWired) return;
      header.dataset.collapseWired = '1';

      var section = header.closest('.dos-secao');
      if (!section) return;

      // Add chevron to header
      var chevron = document.createElement('span');
      chevron.className = 'ded-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
      header.appendChild(chevron);

      header.classList.add('ded-section-toggle');
      header.setAttribute('tabindex', '0');
      header.setAttribute('role', 'button');
      header.setAttribute('aria-expanded', 'true');

      // Wrap section children (excluding header) in body div
      var body = document.createElement('div');
      body.className = 'ded-section-body';
      var children = Array.prototype.slice.call(section.children).filter(function (c) { return c !== header; });
      children.forEach(function (c) { body.appendChild(c); });
      section.appendChild(body);
      body.style.maxHeight = 'none';

      function toggle() {
        var collapsing = !section.classList.contains('ded-section-collapsed');
        if (collapsing) {
          // Snapshot current height then animate to 0
          body.style.maxHeight = body.scrollHeight + 'px';
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              section.classList.add('ded-section-collapsed');
              header.setAttribute('aria-expanded', 'false');
            });
          });
        } else {
          // Animate from 0 to measured height then release
          section.classList.remove('ded-section-collapsed');
          header.setAttribute('aria-expanded', 'true');
          body.style.maxHeight = body.scrollHeight + 'px';
          setTimeout(function () {
            if (!section.classList.contains('ded-section-collapsed')) {
              body.style.maxHeight = 'none';
            }
          }, 400);
        }
      }

      header.addEventListener('click', toggle);
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  // ── 8. Patient tags ──────────────────────────────────────────
  var TAG_DEFS = [
    { id: 'vip',        label: 'VIP',              cls: 'ded-tag-vip' },
    { id: 'complexo',   label: 'Alta Complexidade', cls: 'ded-tag-complexo' },
    { id: 'pos_op',     label: 'Pós-Operatório',    cls: 'ded-tag-pos-op' },
    { id: 'gestante',   label: 'Gestante',          cls: 'ded-tag-gestante' },
    { id: 'pediatrico', label: 'Pediátrico',        cls: 'ded-tag-pediatrico' },
  ];

  function loadTags() {
    try { return JSON.parse(localStorage.getItem(storageKey('tags')) || '[]'); } catch (e) { return []; }
  }
  function saveTags(tags) {
    try { localStorage.setItem(storageKey('tags'), JSON.stringify(tags)); } catch (e) { /* quota */ }
  }

  function injectTagSystem() {
    var footer = document.querySelector('.sidebar-user');
    if (!footer || document.getElementById('ded-tags-area')) return;

    var area = document.createElement('div');
    area.id = 'ded-tags-area';
    area.className = 'ded-tags-area';
    footer.appendChild(area);

    var editBtn = document.createElement('button');
    editBtn.className = 'ded-tags-btn';
    editBtn.textContent = '+ Tag';
    editBtn.setAttribute('aria-label', 'Gerenciar tags da paciente');

    function renderTags() {
      area.innerHTML = '';
      loadTags().forEach(function (id) {
        var def = TAG_DEFS.find(function (t) { return t.id === id; });
        if (!def) return;
        var span = document.createElement('span');
        span.className = 'ded-tag ' + def.cls;
        span.textContent = def.label;
        area.appendChild(span);
      });
      area.appendChild(editBtn);
    }

    editBtn.addEventListener('click', function () {
      var current = loadTags();
      var modal = document.createElement('div');
      modal.className = 'ded-tags-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Gerenciar tags da paciente');
      modal.innerHTML =
        '<div class="ded-tags-modal-box">' +
          '<p class="ded-tags-modal-title">Tags da Paciente</p>' +
          '<div class="ded-tags-options">' +
            TAG_DEFS.map(function (t) {
              return '<button class="ded-tags-option' + (current.indexOf(t.id) !== -1 ? ' ded-tags-option-active' : '') +
                '" data-tag="' + t.id + '">' + t.label + '</button>';
            }).join('') +
          '</div>' +
          '<div class="ded-tags-modal-footer">' +
            '<button class="ded-btn-sm ded-btn-cancel" id="ded-tags-cancel">Cancelar</button>' +
            '<button class="ded-btn-sm ded-btn-confirm" id="ded-tags-save">Salvar</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);

      var selected = new Set(current);
      modal.querySelectorAll('.ded-tags-option').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.dataset.tag;
          if (selected.has(id)) { selected.delete(id); btn.classList.remove('ded-tags-option-active'); }
          else { selected.add(id); btn.classList.add('ded-tags-option-active'); }
        });
      });
      modal.querySelector('#ded-tags-cancel').addEventListener('click', function () { modal.remove(); });
      modal.querySelector('#ded-tags-save').addEventListener('click', function () {
        saveTags(Array.from(selected));
        renderTags();
        modal.remove();
        announce('Tags atualizadas');
        showNotif('Tags salvas!');
      });
      modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    });

    renderTags();
  }

  // ── 9. Copy summary to clipboard ─────────────────────────────
  function buildSummaryText() {
    var doc = document.querySelector('.dos-documento');
    if (!doc) return 'Dossiê não carregado.';
    var nomePaciente = (document.querySelector('.dos-capa-nome') || {}).textContent || 'Paciente';
    var lines = [];
    lines.push('DOSSIÊ CLÍNICO — ' + nomePaciente.trim());
    lines.push('Gerado em: ' + new Date().toLocaleDateString('pt-BR'));
    lines.push('');

    doc.querySelectorAll('.dos-secao, .dos-capa').forEach(function (sec) {
      var titulo = sec.querySelector('.dos-sec-titulo');
      if (titulo) lines.push('\n== ' + titulo.textContent.trim() + ' ==');
      sec.querySelectorAll('.dos-kv').forEach(function (kv) {
        var label = (kv.querySelector('.dos-kv-label') || {}).textContent || '';
        var valor = (kv.querySelector('.dos-kv-valor') || {}).textContent || '';
        if (label && valor) lines.push('  ' + label.trim() + ': ' + valor.trim());
      });
      sec.querySelectorAll('.dos-gargalo-titulo, .dos-risco-titulo').forEach(function (el) {
        lines.push('  ⚠ ' + el.textContent.trim());
      });
    });
    return lines.join('\n');
  }

  function copySummaryToClipboard() {
    var text = buildSummaryText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { showNotif('Resumo copiado!'); announce('Resumo copiado para área de transferência'); })
        .catch(function () { showNotif('Erro ao copiar', true); });
    } else {
      showNotif('Clipboard não disponível', true);
    }
  }

  // ── 10. Export Markdown ───────────────────────────────────────
  function buildMarkdown() {
    var doc = document.querySelector('.dos-documento');
    if (!doc) return '# Dossiê não carregado\n';
    var nomePaciente = (document.querySelector('.dos-capa-nome') || {}).textContent || 'Paciente';
    var lines = [];
    lines.push('# Dossiê Clínico — ' + nomePaciente.trim());
    lines.push('**Gerado em:** ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }));
    lines.push('\n---\n');

    doc.querySelectorAll('.dos-secao, .dos-capa').forEach(function (sec) {
      var titulo = sec.querySelector('.dos-sec-titulo');
      if (titulo) lines.push('\n## ' + titulo.textContent.trim() + '\n');

      sec.querySelectorAll('.dos-kv').forEach(function (kv) {
        var label = (kv.querySelector('.dos-kv-label') || {}).textContent || '';
        var valor = (kv.querySelector('.dos-kv-valor') || {}).textContent || '';
        if (label && valor) lines.push('- **' + label.trim() + ':** ' + valor.trim());
      });

      sec.querySelectorAll('.dos-perfil-desc, .dos-obj-principal, .dos-conclusao-texto').forEach(function (p) {
        var text = p.textContent.trim();
        if (text) lines.push('\n' + text + '\n');
      });

      sec.querySelectorAll('.dos-gargalo-titulo').forEach(function (el) {
        lines.push('- ⚠ ' + el.textContent.trim());
      });
      sec.querySelectorAll('.dos-risco-titulo').forEach(function (el) {
        lines.push('- 🔴 ' + el.textContent.trim());
      });
      sec.querySelectorAll('.dos-rec-recomendacao').forEach(function (el) {
        lines.push('- ✅ ' + el.textContent.trim());
      });
    });

    lines.push('\n---\n*ERG 360 · Dra. Evelin Ribeiro Greco · Nutricionista Clínica*');
    return lines.join('\n');
  }

  function downloadFile(content, filename, type) {
    var blob = new Blob([content], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function exportMarkdown() {
    var md = buildMarkdown();
    var nome = ((document.querySelector('.dos-capa-nome') || {}).textContent || 'paciente')
      .trim().replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9\-]/g, '');
    downloadFile(md, 'dossie-' + nome + '.md', 'text/markdown;charset=utf-8');
    showNotif('Markdown exportado!');
    announce('Arquivo Markdown exportado');
  }

  // ── 11. Export JSON ───────────────────────────────────────────
  function exportJSON() {
    var doc = document.querySelector('.dos-documento');
    if (!doc) { showNotif('Dossiê não disponível', true); return; }

    var nomePaciente = (document.querySelector('.dos-capa-nome') || {}).textContent || '';
    var data = {
      paciente: nomePaciente.trim(),
      geradoEm: new Date().toISOString(),
      url: window.location.href,
      secoes: [],
    };

    doc.querySelectorAll('.dos-secao').forEach(function (sec) {
      var titulo = (sec.querySelector('.dos-sec-titulo') || {}).textContent || '';
      var kv = {};
      sec.querySelectorAll('.dos-kv').forEach(function (item) {
        var label = (item.querySelector('.dos-kv-label') || {}).textContent || '';
        var valor = (item.querySelector('.dos-kv-valor') || {}).textContent || '';
        if (label.trim()) kv[label.trim()] = valor.trim();
      });
      data.secoes.push({ titulo: titulo.trim(), dados: kv });
    });

    var nome = (nomePaciente.trim() || 'paciente').replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9\-]/g, '');
    downloadFile(JSON.stringify(data, null, 2), 'dossie-' + nome + '.json', 'application/json;charset=utf-8');
    showNotif('JSON exportado!');
    announce('Arquivo JSON exportado');
  }

  // ── 12. Shareable link ────────────────────────────────────────
  function copyShareableLink() {
    var url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(function () { showNotif('Link copiado!'); announce('Link copiado para área de transferência'); })
        .catch(function () { showNotif('Erro ao copiar link', true); });
    } else {
      showNotif('Clipboard não disponível', true);
    }
  }

  // ── 13. Dark mode ─────────────────────────────────────────────
  function toggleDarkMode() {
    var isDark = document.body.classList.toggle('ded-dark');
    try { localStorage.setItem('erg-dark-mode', isDark ? '1' : '0'); } catch (e) { /* quota */ }
    var labelEl = document.getElementById('ded-dark-label');
    if (labelEl) labelEl.textContent = isDark ? 'Light' : 'Dark';
    announce(isDark ? 'Modo escuro ativado' : 'Modo claro ativado');
  }

  function restoreDarkMode() {
    try {
      if (localStorage.getItem('erg-dark-mode') === '1') {
        document.body.classList.add('ded-dark');
      }
    } catch (e) { /* quota */ }
  }

  // ── 14. Presentation mode ─────────────────────────────────────
  function togglePresentationMode() {
    var isOn = document.body.classList.toggle('ded-presentation');
    announce(isOn ? 'Modo apresentação ativado' : 'Modo apresentação desativado');
    if (isOn) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showNotif('Modo apresentação — Esc para sair');
    }
  }

  function injectPresentationExit() {
    if (document.getElementById('ded-presentation-exit')) return;
    var btn = document.createElement('button');
    btn.id = 'ded-presentation-exit';
    btn.className = 'ded-presentation-exit';
    btn.textContent = '✕ Sair da Apresentação';
    btn.setAttribute('aria-label', 'Sair do modo apresentação');
    btn.addEventListener('click', function () {
      document.body.classList.remove('ded-presentation');
      announce('Modo apresentação desativado');
    });
    document.body.appendChild(btn);
  }

  // ── 15. Sticky notes ──────────────────────────────────────────
  function wireNotes() {
    document.querySelectorAll('.dos-secao').forEach(function (sec, idx) {
      if (sec.dataset.noteWired) return;
      sec.dataset.noteWired = '1';

      var noteKey = storageKey('note-' + idx);
      var savedNote;
      try { savedNote = localStorage.getItem(noteKey) || ''; } catch (e) { savedNote = ''; }

      var header = sec.querySelector('.dos-sec-header');
      if (!header) return;

      var noteBtn = document.createElement('button');
      noteBtn.className = 'ded-note-btn';
      noteBtn.setAttribute('aria-label', 'Adicionar anotação clínica');
      noteBtn.setAttribute('title', 'Nota clínica');
      noteBtn.innerHTML =
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
        ' Nota';
      header.appendChild(noteBtn);

      var noteArea = document.createElement('div');
      noteArea.className = 'ded-note-area';
      noteArea.style.display = savedNote ? 'block' : 'none';
      noteArea.innerHTML =
        '<div class="ded-note-label">' +
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
          ' Anotação Clínica' +
        '</div>' +
        '<textarea class="ded-note-textarea" placeholder="Anotações clínicas para esta seção…" aria-label="Anotação clínica">' +
          savedNote.replace(/</g, '&lt;') +
        '</textarea>';

      // Append to section body if it exists (after collapse wrapping)
      var body = sec.querySelector('.ded-section-body');
      if (body) body.appendChild(noteArea);
      else sec.appendChild(noteArea);

      var textarea = noteArea.querySelector('.ded-note-textarea');

      noteBtn.addEventListener('click', function (e) {
        e.stopPropagation(); // Don't collapse section
        var visible = noteArea.style.display !== 'none';
        noteArea.style.display = visible ? 'none' : 'block';
        if (!visible) {
          textarea.focus();
          announce('Área de anotação aberta');
          // Re-open section if collapsed
          if (sec.classList.contains('ded-section-collapsed')) {
            sec.classList.remove('ded-section-collapsed');
            header.setAttribute('aria-expanded', 'true');
            if (body) { body.style.maxHeight = 'none'; }
          }
        }
      });

      if (textarea) {
        var _noteTimer;
        textarea.addEventListener('input', function () {
          clearTimeout(_noteTimer);
          _noteTimer = setTimeout(function () {
            try { localStorage.setItem(noteKey, textarea.value); } catch (e) { /* quota */ }
          }, 400);
        });
      }
    });
  }

  // ── 16. Back-to-top button ────────────────────────────────────
  function injectBackToTop() {
    if (document.getElementById('ded-back-top')) return;
    var btn = document.createElement('button');
    btn.id = 'ded-back-top';
    btn.className = 'ded-back-top';
    btn.setAttribute('aria-label', 'Voltar ao topo');
    btn.setAttribute('title', 'Voltar ao topo');
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>';
    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      announce('Voltando ao topo');
    });
    window.addEventListener('scroll', function () {
      btn.classList.toggle('ded-back-top-visible', window.scrollY > 300);
    }, { passive: true });
  }

  // ── 17. Smart insights panel ──────────────────────────────────
  function injectInsightsPanel() {
    var mount = document.getElementById('dos-mount');
    if (!mount || document.getElementById('ded-insights-panel')) return;

    var items = [];

    document.querySelectorAll('.dos-dx-critico .dos-dx-texto').forEach(function (el) {
      var text = el.textContent.trim();
      if (text) items.push({ type: 'critico', text: text.length > 90 ? text.slice(0, 90) + '…' : text });
    });
    document.querySelectorAll('.dos-gargalo-titulo').forEach(function (el) {
      var text = el.textContent.trim();
      if (text) items.push({ type: 'atencao', text: text.length > 90 ? text.slice(0, 90) + '…' : text });
    });
    document.querySelectorAll('.dos-risco-titulo').forEach(function (el) {
      var text = el.textContent.trim();
      if (text) items.push({ type: 'atencao', text: text.length > 90 ? text.slice(0, 90) + '…' : text });
    });

    if (!items.length) return;

    var panel = document.createElement('div');
    panel.id = 'ded-insights-panel';
    panel.className = 'ded-insights-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Alertas clínicos detectados');

    var shown = items.slice(0, 5);
    var extra = items.length > 5 ? items.length - 5 : 0;

    panel.innerHTML =
      '<div class="ded-insights-header">' +
        '<p class="ded-insights-title">Alertas detectados neste dossiê</p>' +
        '<span class="ded-insights-count">' + items.length + '</span>' +
      '</div>' +
      '<div class="ded-insights-list">' +
        shown.map(function (it) {
          return '<div class="ded-insight-item ded-insight-' + it.type + '">' +
            '<div class="ded-insight-dot"></div>' +
            '<span>' + it.text + '</span>' +
            '</div>';
        }).join('') +
        (extra > 0
          ? '<div class="ded-insight-item"><div class="ded-insight-dot" style="background:var(--subtitle,#6B6659)"></div>' +
            '<span>+' + extra + ' alertas adicionais no documento</span></div>'
          : '') +
      '</div>';

    mount.prepend(panel);
    announce(items.length + ' alertas clínicos detectados');
  }

  // ── 18–20. Toolbar (wires all actions + font + KB) ───────────
  var _fontSize = 100;

  function injectToolbar() {
    if (document.getElementById('ded-toolbar')) return;
    var mount = document.getElementById('dos-mount');
    if (!mount) return;

    var isDarkNow = document.body.classList.contains('ded-dark');

    var toolbar = document.createElement('div');
    toolbar.id = 'ded-toolbar';
    toolbar.className = 'ded-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Ações do dossiê');

    toolbar.innerHTML =
      // Copy
      '<button class="ded-toolbar-btn" id="ded-btn-copy" title="Copiar resumo (Ctrl+Shift+C)" aria-label="Copiar resumo">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
        'Copiar' +
      '</button>' +
      // Export MD
      '<button class="ded-toolbar-btn" id="ded-btn-md" title="Exportar Markdown" aria-label="Exportar Markdown">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '.md' +
      '</button>' +
      // Export JSON
      '<button class="ded-toolbar-btn" id="ded-btn-json" title="Exportar JSON" aria-label="Exportar JSON">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '.json' +
      '</button>' +
      // Share link
      '<button class="ded-toolbar-btn" id="ded-btn-share" title="Copiar link compartilhável" aria-label="Copiar link">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
        'Link' +
      '</button>' +
      '<div class="ded-toolbar-sep" aria-hidden="true"></div>' +
      // Dark mode
      '<button class="ded-toolbar-btn" id="ded-btn-dark" title="Alternar modo escuro" aria-label="Alternar modo escuro">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
        '<span id="ded-dark-label">' + (isDarkNow ? 'Light' : 'Dark') + '</span>' +
      '</button>' +
      // Presentation mode
      '<button class="ded-toolbar-btn" id="ded-btn-present" title="Modo apresentação (fonte grande)" aria-label="Modo apresentação">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m10 0h3a2 2 0 0 0 2-2v-3"/></svg>' +
        'Apresentar' +
      '</button>' +
      '<div class="ded-toolbar-sep" aria-hidden="true"></div>' +
      // Font A-
      '<button class="ded-toolbar-btn" id="ded-btn-font-dec" title="Diminuir fonte" aria-label="Diminuir fonte">A–</button>' +
      // Font indicator
      '<span class="ded-font-indicator" id="ded-font-size-label" aria-live="polite">100%</span>' +
      // Font A+
      '<button class="ded-toolbar-btn" id="ded-btn-font-inc" title="Aumentar fonte" aria-label="Aumentar fonte">A+</button>' +
      '<div class="ded-toolbar-sep" aria-hidden="true"></div>' +
      // Print
      '<button class="ded-toolbar-btn" id="ded-btn-print" title="Imprimir / exportar PDF (Ctrl+P)" aria-label="Imprimir dossiê">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>' +
        'Imprimir' +
      '</button>' +
      '<div class="ded-toolbar-spacer"></div>' +
      // Keyboard help
      '<button class="ded-toolbar-btn" id="ded-btn-kb" title="Atalhos de teclado (?)" aria-label="Atalhos de teclado">?</button>';

    mount.parentNode.insertBefore(toolbar, mount);

    // Wire buttons
    document.getElementById('ded-btn-copy').addEventListener('click', copySummaryToClipboard);
    document.getElementById('ded-btn-md').addEventListener('click', exportMarkdown);
    document.getElementById('ded-btn-json').addEventListener('click', exportJSON);
    document.getElementById('ded-btn-share').addEventListener('click', copyShareableLink);
    document.getElementById('ded-btn-dark').addEventListener('click', toggleDarkMode);
    document.getElementById('ded-btn-present').addEventListener('click', togglePresentationMode);
    document.getElementById('ded-btn-print').addEventListener('click', function () { window.print(); });
    document.getElementById('ded-btn-kb').addEventListener('click', showKeyboardHelp);

    document.getElementById('ded-btn-font-inc').addEventListener('click', function () {
      _fontSize = Math.min(135, _fontSize + 5);
      applyFontSize(_fontSize);
    });
    document.getElementById('ded-btn-font-dec').addEventListener('click', function () {
      _fontSize = Math.max(80, _fontSize - 5);
      applyFontSize(_fontSize);
    });
  }

  function applyFontSize(pct) {
    var doc = document.querySelector('.dos-documento');
    if (doc) doc.style.fontSize = (pct / 100) + 'em';
    var label = document.getElementById('ded-font-size-label');
    if (label) label.textContent = pct + '%';
    announce('Fonte ' + pct + '%');
  }

  // ── 19. Keyboard shortcuts ────────────────────────────────────
  function wireKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      var tag = document.activeElement ? document.activeElement.tagName : '';

      // Ctrl+F → search
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 'f') {
        e.preventDefault();
        var bar = document.getElementById('ded-search-bar');
        if (bar) {
          bar.classList.add('ded-search-open');
          _searchActive = true;
          var inp = document.getElementById('ded-search-input');
          if (inp) { inp.focus(); inp.select(); }
        }
        return;
      }

      // Ctrl+K → ToC
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 'k') {
        e.preventDefault();
        var tocBtn = document.getElementById('ded-toc-btn');
        if (tocBtn) tocBtn.click();
        return;
      }

      // Ctrl+Shift+C → copy summary
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        copySummaryToClipboard();
        return;
      }

      // ? → keyboard help (not in input/textarea)
      if (e.key === '?' && !e.ctrlKey && !e.altKey && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        showKeyboardHelp();
        return;
      }

      // Escape → close open overlays
      if (e.key === 'Escape') {
        var searchBar = document.getElementById('ded-search-bar');
        if (searchBar && searchBar.classList.contains('ded-search-open')) {
          searchBar.classList.remove('ded-search-open');
          _searchActive = false;
          document.querySelectorAll('mark.ded-highlight, mark.ded-highlight-active').forEach(function (mark) {
            var text = document.createTextNode(mark.textContent);
            if (mark.parentNode) mark.parentNode.replaceChild(text, mark);
          });
          _searchMatches = [];
          var countEl = document.getElementById('ded-search-count');
          if (countEl) countEl.textContent = '';
        }

        var tocPanel = document.getElementById('ded-toc-panel');
        if (tocPanel && tocPanel.classList.contains('ded-toc-open')) {
          tocPanel.classList.remove('ded-toc-open');
          var tocOv = document.getElementById('ded-toc-overlay');
          if (tocOv) tocOv.style.display = 'none';
        }

        var kbOv = document.getElementById('ded-kb-overlay');
        if (kbOv) kbOv.remove();

        var tagsMod = document.querySelector('.ded-tags-modal');
        if (tagsMod) tagsMod.remove();

        if (document.body.classList.contains('ded-presentation')) {
          document.body.classList.remove('ded-presentation');
          announce('Modo apresentação desativado');
        }
      }
    });
  }

  // ── 19. Keyboard help overlay ─────────────────────────────────
  function showKeyboardHelp() {
    if (document.getElementById('ded-kb-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'ded-kb-overlay';
    overlay.className = 'ded-kb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Atalhos de teclado');
    overlay.innerHTML =
      '<div class="ded-kb-box">' +
        '<p class="ded-kb-title">Atalhos de Teclado</p>' +
        '<div class="ded-kb-list">' +
          '<div class="ded-kb-item"><span class="ded-kb-key">Ctrl + F</span><span>Buscar no dossiê</span></div>' +
          '<div class="ded-kb-item"><span class="ded-kb-key">Ctrl + K</span><span>Abrir índice de seções</span></div>' +
          '<div class="ded-kb-item"><span class="ded-kb-key">Ctrl + P</span><span>Imprimir / exportar PDF</span></div>' +
          '<div class="ded-kb-item"><span class="ded-kb-key">Ctrl + ⇧ + C</span><span>Copiar resumo clínico</span></div>' +
          '<div class="ded-kb-item"><span class="ded-kb-key">Escape</span><span>Fechar painéis e modos</span></div>' +
          '<div class="ded-kb-item"><span class="ded-kb-key">Enter / ⇧+Enter</span><span>Navegar resultados da busca</span></div>' +
          '<div class="ded-kb-item"><span class="ded-kb-key">?</span><span>Esta ajuda</span></div>' +
        '</div>' +
        '<button class="ded-kb-close-btn" id="ded-kb-close">Fechar</button>' +
      '</div>';
    document.body.appendChild(overlay);

    var closeBtn = document.getElementById('ded-kb-close');
    if (closeBtn) closeBtn.focus();
    if (closeBtn) closeBtn.addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    announce('Ajuda de atalhos de teclado aberta');
  }

  // ── Observer: enhancements after dossier renders ──────────────
  function onDossierReady() {
    hideLoadingToast();
    setTimeout(function () {
      injectToolbar();
      wireSectionCollapse();
      wireNotes();       // must run after wireSectionCollapse
      injectInsightsPanel();
    }, 160);
  }

  function setupContentObserver() {
    var mount = document.getElementById('dos-mount');
    if (!mount) return;

    // Already rendered (e.g. cached)
    if (mount.querySelector('.dos-documento')) {
      onDossierReady();
      return;
    }

    injectLoadingToast();

    var obs = new MutationObserver(function () {
      if (!mount.querySelector('.dos-documento')) return;
      obs.disconnect();
      onDossierReady();
    });
    obs.observe(mount, { childList: true, subtree: true });
  }

  // ── INIT ──────────────────────────────────────────────────────
  function init() {
    injectSkipLink();
    injectAriaLive();
    injectProgressBar();
    injectToc();
    injectSearch();
    injectBackToTop();
    injectPresentationExit();
    injectTagSystem();
    wireKeyboardShortcuts();
    restoreDarkMode();
    setupContentObserver();
    // Retry tag injection in case sidebar wasn't ready
    setTimeout(injectTagSystem, 600);
  }

  document.addEventListener('DOMContentLoaded', init);

  // ── Public API ────────────────────────────────────────────────
  return {
    copySummaryToClipboard: copySummaryToClipboard,
    exportMarkdown: exportMarkdown,
    exportJSON: exportJSON,
    copyShareableLink: copyShareableLink,
    toggleDarkMode: toggleDarkMode,
    togglePresentationMode: togglePresentationMode,
    showKeyboardHelp: showKeyboardHelp,
    announce: announce,
  };
})();
