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

// ═══ POLIMENTO V2 ═══
// Micro-interações · hover states · animações sutis · ripples — 10 melhorias
(function () {
  'use strict';

  // V2.1 Ripple effect on toolbar buttons
  function injectRippleEffect() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.ded-toolbar-btn');
      if (!btn) return;
      var rect = btn.getBoundingClientRect();
      var ripple = document.createElement('span');
      ripple.className = 'ded-ripple';
      ripple.style.left = (e.clientX - rect.left) + 'px';
      ripple.style.top = (e.clientY - rect.top) + 'px';
      btn.style.position = btn.style.position || 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      setTimeout(function () { if (ripple.parentNode) ripple.remove(); }, 520);
    });
  }

  // V2.2 Count-up animation on insights panel counter
  function animateInsightsCount() {
    var countEl = document.querySelector('.ded-insights-count');
    if (!countEl || countEl.dataset.v2Animated) return;
    var target = parseInt(countEl.textContent.trim(), 10);
    if (!target || isNaN(target) || target <= 1) return;
    countEl.dataset.v2Animated = '1';
    var duration = 560;
    var startTime = performance.now();
    function step(now) {
      var t = Math.min((now - startTime) / duration, 1);
      var ease = 1 - Math.pow(1 - t, 3);
      countEl.textContent = Math.round(ease * target);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // V2.3 Scroll-reveal fade-in for sections
  function initScrollReveal() {
    if (!window.IntersectionObserver) return;
    var viewH = window.innerHeight;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('ded-revealed');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -16px 0px' });

    document.querySelectorAll('.dos-secao:not(.ded-revealed), .dos-capa:not(.ded-revealed)').forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < viewH) {
        el.classList.add('ded-revealed');
      } else {
        el.classList.add('ded-reveal-ready');
        obs.observe(el);
      }
    });
  }

  // V2.4 Search bar shake animation on zero results
  function wireSearchShake() {
    var countEl = document.getElementById('ded-search-count');
    if (!countEl) return;
    var obs = new MutationObserver(function () {
      if (countEl.textContent.trim() !== 'Nenhum') return;
      var bar = document.getElementById('ded-search-bar');
      if (!bar) return;
      bar.classList.remove('ded-search-shake');
      void bar.offsetWidth;
      bar.classList.add('ded-search-shake');
      setTimeout(function () { bar.classList.remove('ded-search-shake'); }, 420);
    });
    obs.observe(countEl, { childList: true, characterData: true, subtree: true });
  }

  // V2.5 Tag pill staggered entrance animation
  function wireTagEntrance() {
    document.querySelectorAll('.ded-tags-area .ded-tag:not([data-v2-enter])').forEach(function (tag, i) {
      tag.dataset.v2Enter = '1';
      tag.style.animationDelay = (i * 55) + 'ms';
      tag.classList.add('ded-tag-enter');
    });
  }

  // V2.6 Note area slide-down animation on show
  function wireNoteSlideIn() {
    var root = document.getElementById('dos-mount') || document.body;
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (mut) {
        var tgt = mut.target;
        if (
          mut.type === 'attributes' &&
          mut.attributeName === 'style' &&
          tgt.classList && tgt.classList.contains('ded-note-area') &&
          tgt.style.display === 'block'
        ) {
          tgt.classList.remove('ded-note-slide-in');
          void tgt.offsetWidth;
          tgt.classList.add('ded-note-slide-in');
        }
      });
    });
    obs.observe(root, { attributes: true, attributeFilter: ['style'], subtree: true });
  }

  // V2.7 Insights panel entrance animation
  function animateInsightsPanelEntrance() {
    var panel = document.getElementById('ded-insights-panel');
    if (!panel || panel.dataset.v2Entered) return;
    panel.dataset.v2Entered = '1';
    panel.classList.add('ded-insights-enter');
    animateInsightsCount();
  }

  // V2.8 Re-run tag entrance after tag modal saves
  function watchTagModalSave() {
    document.addEventListener('click', function (e) {
      if (!e.target || e.target.id !== 'ded-tags-save') return;
      setTimeout(wireTagEntrance, 80);
    });
  }

  function onDossierReadyV2() {
    setTimeout(function () {
      animateInsightsPanelEntrance();
      initScrollReveal();
      wireTagEntrance();
    }, 200);
  }

  function setupV2Observer() {
    var mount = document.getElementById('dos-mount');
    if (!mount) return;
    if (mount.querySelector('.dos-documento')) {
      onDossierReadyV2();
      return;
    }
    var obs = new MutationObserver(function () {
      if (!mount.querySelector('.dos-documento')) return;
      obs.disconnect();
      onDossierReadyV2();
    });
    obs.observe(mount, { childList: true, subtree: true });
  }

  function initV2() {
    injectRippleEffect();
    wireSearchShake();
    wireNoteSlideIn();
    watchTagModalSave();
    setupV2Observer();
    setTimeout(wireTagEntrance, 650);
  }

  document.addEventListener('DOMContentLoaded', initV2);
})();

// ═══ POLIMENTO V3 ═══
// Acessibilidade avançada: focus traps · roving tabindex · aria-controls · reduced-motion — 10 melhorias
(function () {
  'use strict';

  // ─── V3.1 Focus trap utility ──────────────────────────────────
  var _FOCUSABLE = [
    'a[href]:not([disabled])',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function createFocusTrap(container) {
    function getFocusable() {
      return Array.prototype.slice.call(container.querySelectorAll(_FOCUSABLE))
        .filter(function (el) { return el.offsetParent !== null; });
    }
    function handleTab(e) {
      if (e.key !== 'Tab') return;
      var els = getFocusable();
      if (!els.length) { e.preventDefault(); return; }
      var first = els[0], last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          e.preventDefault(); last.focus();
        }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
          e.preventDefault(); first.focus();
        }
      }
    }
    return {
      activate: function () {
        container.addEventListener('keydown', handleTab);
        var els = getFocusable();
        if (els.length) els[0].focus();
      },
      deactivate: function () {
        container.removeEventListener('keydown', handleTab);
      }
    };
  }

  // ─── V3.2 Focus restoration ───────────────────────────────────
  var _savedFocus = null;
  function saveFocus() { _savedFocus = document.activeElement; }
  function restoreFocus() {
    if (_savedFocus && typeof _savedFocus.focus === 'function') {
      try { _savedFocus.focus(); } catch (e) { /* ignore */ }
      _savedFocus = null;
    }
  }

  // ─── V3.3 ToC panel: focus trap + restoration ─────────────────
  function patchTocFocusTrap() {
    var panel = document.getElementById('ded-toc-panel');
    if (!panel || panel.dataset.v3Trap) return;
    panel.dataset.v3Trap = '1';
    var trap = createFocusTrap(panel);
    new MutationObserver(function () {
      if (panel.classList.contains('ded-toc-open')) {
        saveFocus();
        trap.activate();
      } else {
        trap.deactivate();
        restoreFocus();
      }
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  // ─── V3.4 Tags modal: focus trap via body MutationObserver ────
  function patchTagsModalFocusTrap() {
    new MutationObserver(function (muts) {
      muts.forEach(function (mut) {
        mut.addedNodes.forEach(function (node) {
          if (!node.classList || !node.classList.contains('ded-tags-modal')) return;
          if (node.dataset.v3Trap) return;
          node.dataset.v3Trap = '1';
          saveFocus();
          var box = node.querySelector('.ded-tags-modal-box') || node;
          var trap = createFocusTrap(box);
          trap.activate();
          var release = function () { trap.deactivate(); restoreFocus(); };
          var cancel = node.querySelector('#ded-tags-cancel');
          var save = node.querySelector('#ded-tags-save');
          if (cancel) cancel.addEventListener('click', release, { once: true });
          if (save) save.addEventListener('click', release, { once: true });
          new MutationObserver(function (_, obs) {
            if (!document.body.contains(node)) { obs.disconnect(); trap.deactivate(); restoreFocus(); }
          }).observe(document.body, { childList: true });
        });
      });
    }).observe(document.body, { childList: true });
  }

  // ─── V3.5 Keyboard help overlay: focus trap ───────────────────
  function patchKbFocusTrap() {
    new MutationObserver(function (muts) {
      muts.forEach(function (mut) {
        mut.addedNodes.forEach(function (node) {
          if (!node.id || node.id !== 'ded-kb-overlay') return;
          saveFocus();
          var trap = createFocusTrap(node);
          trap.activate();
          var release = function () { trap.deactivate(); restoreFocus(); };
          var closeBtn = node.querySelector('#ded-kb-close');
          if (closeBtn) closeBtn.addEventListener('click', release, { once: true });
          new MutationObserver(function (_, obs) {
            if (!document.body.contains(node)) { obs.disconnect(); trap.deactivate(); restoreFocus(); }
          }).observe(document.body, { childList: true });
        });
      });
    }).observe(document.body, { childList: true });
  }

  // ─── V3.6 Arrow key navigation in ToC list ────────────────────
  function wireRovingToc() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var panel = document.getElementById('ded-toc-panel');
      if (!panel || !panel.classList.contains('ded-toc-open')) return;
      if (!panel.contains(document.activeElement)) return;
      var items = Array.prototype.slice.call(panel.querySelectorAll('.ded-toc-item'));
      if (!items.length) return;
      var idx = items.indexOf(document.activeElement);
      e.preventDefault();
      var next = e.key === 'ArrowDown'
        ? items[idx === -1 ? 0 : (idx + 1) % items.length]
        : items[idx === -1 ? items.length - 1 : (idx - 1 + items.length) % items.length];
      next.focus();
    });
  }

  // ─── V3.7 aria-controls: section headers → section bodies ─────
  function wireAriaControls() {
    var counter = 0;
    document.querySelectorAll('.dos-secao:not([data-v3-ctrl])').forEach(function (sec) {
      sec.dataset.v3Ctrl = '1';
      var header = sec.querySelector('.dos-sec-header');
      var body = sec.querySelector('.ded-section-body');
      if (!header || !body) return;
      if (!body.id) body.id = 'ded-body-' + (counter++);
      header.setAttribute('aria-controls', body.id);
    });
  }

  // ─── V3.8 Toolbar roving tabindex (Left/Right arrows) ─────────
  function wireToolbarRovingTabindex() {
    var toolbar = document.getElementById('ded-toolbar');
    if (!toolbar || toolbar.dataset.v3Tab) return;
    toolbar.dataset.v3Tab = '1';
    var btns = Array.prototype.slice.call(toolbar.querySelectorAll('.ded-toolbar-btn'));
    btns.forEach(function (btn, i) { btn.tabIndex = i === 0 ? 0 : -1; });
    toolbar.addEventListener('focusin', function (e) {
      if (!e.target.classList || !e.target.classList.contains('ded-toolbar-btn')) return;
      btns.forEach(function (b) { b.tabIndex = -1; });
      e.target.tabIndex = 0;
    });
    toolbar.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var live = Array.prototype.slice.call(toolbar.querySelectorAll('.ded-toolbar-btn'));
      var idx = live.indexOf(document.activeElement);
      if (idx === -1) return;
      e.preventDefault();
      var next = e.key === 'ArrowRight'
        ? live[(idx + 1) % live.length]
        : live[(idx - 1 + live.length) % live.length];
      live.forEach(function (b) { b.tabIndex = -1; });
      next.tabIndex = 0;
      next.focus();
    });
  }

  // ─── V3.9 Verbose ARIA for section collapse/expand ────────────
  function wireVerboseCollapseAria() {
    document.addEventListener('click', function (e) {
      var header = e.target.closest && e.target.closest('.ded-section-toggle');
      if (!header) return;
      setTimeout(function () {
        var sec = header.closest('.dos-secao');
        if (!sec) return;
        var titulo = (sec.querySelector('.dos-sec-titulo') || {}).textContent || 'Seção';
        var collapsed = sec.classList.contains('ded-section-collapsed');
        var live = document.getElementById('ded-aria-live');
        if (!live) return;
        live.textContent = '';
        requestAnimationFrame(function () {
          live.textContent = titulo.trim() + (collapsed ? ' — recolhida' : ' — expandida');
        });
      }, 60);
    });
  }

  // ─── V3.10 Reduced motion detection ──────────────────────────
  function initReducedMotion() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    function apply(on) { document.body.classList.toggle('ded-reduced-motion', !!on); }
    apply(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', function (ev) { apply(ev.matches); });
    else if (mq.addListener) mq.addListener(function (ev) { apply(ev.matches); });
  }

  // ─── Init ─────────────────────────────────────────────────────
  function onDossierReadyV3() {
    setTimeout(function () {
      wireAriaControls();
      wireToolbarRovingTabindex();
    }, 250);
  }

  function initV3() {
    initReducedMotion();
    patchTocFocusTrap();
    patchTagsModalFocusTrap();
    patchKbFocusTrap();
    wireRovingToc();
    wireVerboseCollapseAria();

    var mount = document.getElementById('dos-mount');
    if (!mount) return;
    if (mount.querySelector('.dos-documento')) {
      onDossierReadyV3();
      return;
    }
    var obs = new MutationObserver(function () {
      if (!mount.querySelector('.dos-documento')) return;
      obs.disconnect();
      onDossierReadyV3();
    });
    obs.observe(mount, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', initV3);
})();

// ═══ POLIMENTO V4 ═══
// Performance: requestIdleCallback · rAF throttle · hover prefetch · ResizeObserver · IO sentinel · pagehide cleanup — 10 melhorias
(function () {
  'use strict';

  // ─── V4 state ─────────────────────────────────────────────────
  var _v4Observers = [];
  var _prefetched = new Set();

  // ─── V4.1 requestIdleCallback polyfill ───────────────────────
  var ric = window.requestIdleCallback
    ? function (cb, opts) { return window.requestIdleCallback(cb, opts || { timeout: 2000 }); }
    : function (cb) { return setTimeout(function () { cb({ timeRemaining: function () { return 0; }, didTimeout: true }); }, 1); };

  // ─── V4.2 rAF throttle factory ───────────────────────────────
  function rafThrottle(fn) {
    var pending = false;
    return function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; fn(); });
    };
  }

  // ─── V4.3 Hover prefetch for sidebar navigation links ────────
  function initHoverPrefetch() {
    document.querySelectorAll('.sidebar-nav a[href]:not([data-v4-pf])').forEach(function (a) {
      a.dataset.v4Pf = '1';
      a.addEventListener('mouseenter', function () {
        var href = a.href;
        if (!href || _prefetched.has(href)) return;
        if (href === window.location.href) return;
        if (href.startsWith('javascript') || href.startsWith('mailto')) return;
        _prefetched.add(href);
        var link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        link.as = 'document';
        document.head.appendChild(link);
      }, { passive: true });
    });
  }

  // ─── V4.4 ResizeObserver compact toolbar mode ─────────────────
  function initToolbarResizeObserver() {
    var toolbar = document.getElementById('ded-toolbar');
    if (!toolbar || toolbar.dataset.v4Resize || !window.ResizeObserver) return;
    toolbar.dataset.v4Resize = '1';
    var ro = new ResizeObserver(rafThrottle(function () {
      toolbar.classList.toggle('ded-toolbar-compact', toolbar.scrollHeight > 46);
    }));
    ro.observe(toolbar);
    _v4Observers.push({ disconnect: function () { ro.disconnect(); } });
  }

  // ─── V4.5 IntersectionObserver sentinel for back-to-top ───────
  function upgradeBackToTopIO() {
    var btn = document.getElementById('ded-back-top');
    if (!btn || btn.dataset.v4Io || !window.IntersectionObserver) return;
    btn.dataset.v4Io = '1';
    var sentinel = document.getElementById('ded-v4-sentinel');
    if (!sentinel) {
      sentinel = document.createElement('div');
      sentinel.id = 'ded-v4-sentinel';
      sentinel.setAttribute('aria-hidden', 'true');
      document.body.prepend(sentinel);
    }
    var io = new IntersectionObserver(function (entries) {
      btn.classList.toggle('ded-back-top-visible', !entries[0].isIntersecting);
    }, { threshold: 0, rootMargin: '-400px 0px 0px 0px' });
    io.observe(sentinel);
    _v4Observers.push(io);
  }

  // ─── V4.6 document.fonts.ready body class ─────────────────────
  function initFontsReadyClass() {
    if (!document.fonts || typeof document.fonts.ready === 'undefined') {
      document.body.classList.add('ded-fonts-ready');
      return;
    }
    document.fonts.ready.then(function () {
      document.body.classList.add('ded-fonts-ready');
    });
  }

  // ─── V4.7 Performance timing marks ────────────────────────────
  function wirePerformanceMarks() {
    if (!window.performance || !performance.mark) return;
    try { performance.mark('ded:init'); } catch (e) { /* noop */ }
    var mount = document.getElementById('dos-mount');
    if (!mount) return;
    if (mount.querySelector('.dos-documento')) {
      try {
        performance.mark('ded:dossier-ready');
        performance.measure('ded:time-to-dossier', 'ded:init', 'ded:dossier-ready');
      } catch (e) { /* noop */ }
      return;
    }
    var obs = new MutationObserver(function () {
      if (!mount.querySelector('.dos-documento')) return;
      obs.disconnect();
      try {
        performance.mark('ded:dossier-ready');
        performance.measure('ded:time-to-dossier', 'ded:init', 'ded:dossier-ready');
      } catch (e) { /* noop */ }
    });
    obs.observe(mount, { childList: true, subtree: true });
    _v4Observers.push(obs);
  }

  // ─── V4.8 Idle-time prefetch of in-dossier cross-links ────────
  function idlePrefetchCrossLinks() {
    ric(function () {
      document.querySelectorAll('#dos-mount a[href]:not([data-v4-pf])').forEach(function (a) {
        var href = a.href;
        if (!href || _prefetched.has(href) || href === window.location.href) return;
        if (href.startsWith('http') && href.indexOf(window.location.hostname) === -1) return;
        if (href.startsWith('javascript') || href.startsWith('mailto')) return;
        _prefetched.add(href);
        var link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        link.as = 'document';
        document.head.appendChild(link);
      });
    }, { timeout: 6000 });
  }

  // ─── V4.9 Observer cleanup on pagehide ────────────────────────
  function wireCleanup() {
    window.addEventListener('pagehide', function () {
      _v4Observers.forEach(function (obs) {
        try { if (obs && typeof obs.disconnect === 'function') obs.disconnect(); } catch (e) { /* noop */ }
      });
      _v4Observers.length = 0;
    }, { once: true });
  }

  // ─── V4.10 Lazy-load images inside dossier content ────────────
  function lazyLoadDossierImages() {
    var mount = document.getElementById('dos-mount');
    if (!mount) return;
    mount.querySelectorAll('img:not([loading])').forEach(function (img) {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    });
  }

  // ─── Init ─────────────────────────────────────────────────────
  function onDossierReadyV4() {
    setTimeout(function () {
      upgradeBackToTopIO();
      initToolbarResizeObserver();
      lazyLoadDossierImages();
      idlePrefetchCrossLinks();
    }, 320);
  }

  function initV4() {
    wireCleanup();
    wirePerformanceMarks();
    initFontsReadyClass();
    initHoverPrefetch();

    var mount = document.getElementById('dos-mount');
    if (!mount) return;
    if (mount.querySelector('.dos-documento')) {
      onDossierReadyV4();
      return;
    }
    var obs = new MutationObserver(function () {
      if (!mount.querySelector('.dos-documento')) return;
      obs.disconnect();
      onDossierReadyV4();
    });
    obs.observe(mount, { childList: true, subtree: true });
    _v4Observers.push(obs);
  }

  document.addEventListener('DOMContentLoaded', initV4);
})();

// ═══ POLIMENTO V5 ═══
// Web APIs modernas: Page Visibility · Web Share · Wake Lock · Online/Offline · beforeunload · Storage Events · Color-scheme · Vibration · Network Info · Clipboard paste — 10 melhorias
(function () {
  'use strict';

  // ─── V5 mini-toast (reutiliza padrão ded-notif) ──────────────────
  function showV5Toast(msg) {
    var el = document.getElementById('ded-notif');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ded-notif';
      el.className = 'ded-notif';
      document.body.appendChild(el);
    }
    el.className = 'ded-notif';
    el.textContent = msg;
    requestAnimationFrame(function () { el.classList.add('ded-notif-show'); });
    setTimeout(function () { el.classList.remove('ded-notif-show'); }, 2800);
  }

  // ─── V5.1 Page Visibility: welcome-back toast após ausência ──────
  function initPageVisibility() {
    var _hiddenAt = null;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        _hiddenAt = Date.now();
      } else {
        if (_hiddenAt) {
          var away = Math.floor((Date.now() - _hiddenAt) / 60000);
          if (away >= 2) {
            showV5Toast('Bem-vinda de volta! Ausente por ' + away + ' min.');
          }
          _hiddenAt = null;
        }
      }
    });
  }

  // ─── V5.2 Web Share API: upgrade botão de link para share nativo ─
  function upgradeShareButton() {
    if (!navigator.share) return;
    var btn = document.getElementById('ded-btn-share');
    if (!btn || btn.dataset.v5Share) return;
    btn.dataset.v5Share = '1';
    btn.title = 'Compartilhar dossiê (nativo)';
    btn.setAttribute('aria-label', 'Compartilhar dossiê');
    btn.addEventListener('click', function (e) {
      e.stopImmediatePropagation();
      var nomePaciente = (document.querySelector('.dos-capa-nome') || {}).textContent || '';
      navigator.share({
        title: 'Dossiê Clínico — ' + nomePaciente.trim(),
        text: 'Dossiê clínico via ERG 360 · Dra. Evelin Ribeiro Greco',
        url: window.location.href,
      }).catch(function () { /* usuária cancelou */ });
    }, true);
  }

  // ─── V5.3 Wake Lock API: tela sempre ligada no modo apresentação ─
  var _wakeLock = null;

  function requestWakeLock() {
    if (!navigator.wakeLock) return;
    navigator.wakeLock.request('screen').then(function (lock) {
      _wakeLock = lock;
      document.body.classList.add('ded-wakelock-active');
      lock.addEventListener('release', function () {
        document.body.classList.remove('ded-wakelock-active');
        _wakeLock = null;
      });
    }).catch(function () { /* negado ou indisponível */ });
  }

  function releaseWakeLock() {
    if (!_wakeLock) return;
    _wakeLock.release().catch(function () {});
    _wakeLock = null;
    document.body.classList.remove('ded-wakelock-active');
  }

  function wireWakeLockToPresentation() {
    new MutationObserver(function () {
      if (document.body.classList.contains('ded-presentation')) {
        requestWakeLock();
      } else {
        releaseWakeLock();
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    // Reaquire após voltar de outra aba (OS pode revogar o lock)
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && document.body.classList.contains('ded-presentation') && !_wakeLock) {
        requestWakeLock();
      }
    });
  }

  // ─── V5.4 Online / Offline: banner persistente ────────────────────
  function initOnlineOffline() {
    function update() {
      var banner = document.getElementById('ded-offline-banner');
      if (navigator.onLine) {
        if (banner) {
          banner.classList.add('ded-offline-banner-out');
          setTimeout(function () { if (banner.parentNode) banner.remove(); }, 380);
        }
      } else {
        if (!banner) {
          banner = document.createElement('div');
          banner.id = 'ded-offline-banner';
          banner.className = 'ded-offline-banner';
          banner.setAttribute('role', 'alert');
          banner.setAttribute('aria-live', 'assertive');
          banner.innerHTML =
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
            '<line x1="1" y1="1" x2="23" y2="23"/>' +
            '<path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>' +
            '<path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>' +
            '<path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>' +
            '<path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>' +
            '<path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>' +
            '<line x1="12" y1="20" x2="12.01" y2="20"/></svg>' +
            ' Sem conexão — dossiê operando offline';
          document.body.prepend(banner);
        }
      }
    }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  // ─── V5.5 beforeunload: avisa se há anotações não salvas ─────────
  var _notesDirty = false;

  function wireBeforeUnload() {
    document.addEventListener('input', function (e) {
      if (!e.target || !e.target.classList || !e.target.classList.contains('ded-note-textarea')) return;
      _notesDirty = true;
      clearTimeout(e.target._v5DirtyTimer);
      // Auto-save do V1 roda em 400ms → limpamos flag após 500ms
      e.target._v5DirtyTimer = setTimeout(function () { _notesDirty = false; }, 500);
    });
    window.addEventListener('beforeunload', function (e) {
      if (_notesDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // ─── V5.6 Storage Event: sincroniza dark mode entre abas ─────────
  function initStorageSync() {
    window.addEventListener('storage', function (e) {
      if (e.key !== 'erg-dark-mode') return;
      var isDark = e.newValue === '1';
      document.body.classList.toggle('ded-dark', isDark);
      var labelEl = document.getElementById('ded-dark-label');
      if (labelEl) labelEl.textContent = isDark ? 'Light' : 'Dark';
    });
  }

  // ─── V5.7 Color-scheme: segue SO se usuária nunca alterou manualmente ─
  function initAutoColorScheme() {
    try { if (localStorage.getItem('erg-dark-mode') !== null) return; } catch (e) { return; }
    if (!window.matchMedia) return;
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    function apply(on) {
      document.body.classList.toggle('ded-dark', on);
      var labelEl = document.getElementById('ded-dark-label');
      if (labelEl) labelEl.textContent = on ? 'Light' : 'Dark';
    }
    apply(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', function (ev) { apply(ev.matches); });
    else if (mq.addListener) mq.addListener(function (ev) { apply(ev.matches); });
  }

  // ─── V5.8 Vibration API: haptic em ações-chave (mobile) ──────────
  function vibrateIfSupported(pattern) {
    if (!navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) { /* noop */ }
  }

  function wireVibration() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.ded-toolbar-btn');
      if (!btn) return;
      var id = btn.id || '';
      if (id === 'ded-btn-copy' || id === 'ded-btn-share' || id === 'ded-btn-md' || id === 'ded-btn-json') {
        vibrateIfSupported([12, 40, 12]);
      } else if (id === 'ded-btn-dark' || id === 'ded-btn-present') {
        vibrateIfSupported(18);
      }
    });
    document.addEventListener('click', function (e) {
      if (!e.target || e.target.id !== 'ded-tags-save') return;
      vibrateIfSupported([10, 30, 10]);
    });
  }

  // ─── V5.9 Network Information API: avisa sobre conexão lenta ─────
  function initNetworkHint() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    function onConnectionChange() {
      var etype = conn.effectiveType || '';
      var slow = etype === '2g' || etype === 'slow-2g';
      if (slow && !document.getElementById('ded-offline-banner')) {
        showV5Toast('Conexão lenta detectada — dossiê pode demorar mais.');
      }
    }
    conn.addEventListener('change', onConnectionChange);
    onConnectionChange();
  }

  // ─── V5.10 Clipboard paste hint em áreas de anotação vazias ──────
  function initClipboardPasteHint() {
    if (!navigator.clipboard || !navigator.clipboard.readText) return;
    document.addEventListener('focusin', function (e) {
      var ta = e.target;
      if (!ta || !ta.classList || !ta.classList.contains('ded-note-textarea')) return;
      if (ta.dataset.v5PasteWired) return;
      ta.dataset.v5PasteWired = '1';
      if (ta.value) return; // área já preenchida: não oferece colar
      var hint = document.createElement('button');
      hint.className = 'ded-paste-hint';
      hint.type = 'button';
      hint.setAttribute('aria-label', 'Colar da área de transferência');
      hint.textContent = 'Colar ⌘V';
      ta.parentNode.insertBefore(hint, ta);
      hint.addEventListener('click', function () {
        navigator.clipboard.readText().then(function (text) {
          if (text && text.trim()) {
            ta.value = text.trim();
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            ta.focus();
          }
          hint.remove();
        }).catch(function () { hint.remove(); });
      });
      // Remove hint se usuária começa a digitar
      ta.addEventListener('input', function () { if (hint.parentNode) hint.remove(); }, { once: true });
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────
  function initV5() {
    initPageVisibility();
    initOnlineOffline();
    initStorageSync();
    wireBeforeUnload();
    wireVibration();
    initNetworkHint();
    initClipboardPasteHint();

    function onDossierReadyV5() {
      setTimeout(function () {
        upgradeShareButton();
        wireWakeLockToPresentation();
        initAutoColorScheme();
      }, 400);
    }

    var mount = document.getElementById('dos-mount');
    if (!mount) return;
    if (mount.querySelector('.dos-documento')) {
      onDossierReadyV5();
      return;
    }
    var obs = new MutationObserver(function () {
      if (!mount.querySelector('.dos-documento')) return;
      obs.disconnect();
      onDossierReadyV5();
    });
    obs.observe(mount, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', initV5);
})();
// ═══════════════════════════════════════════════════════════════
// POLIMENTO V6 — 15 melhorias UX clínicas — admin-dossie-extras
// Leitura estimada · sticky bar · copiar seção · salto numérico ·
// posição de rolagem · marcadores · expandir/recolher tudo ·
// relatório clínico · print aprimorado · indicador de seção
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── helpers ──────────────────────────────────────────────────
  function _v6Announce(msg) {
    var el = document.getElementById('ded-aria-live');
    if (!el) return;
    el.textContent = '';
    requestAnimationFrame(function () { el.textContent = msg; });
  }

  function _v6Toast(msg, isError) {
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

  function _v6PatientId() {
    return new URLSearchParams(window.location.search).get('patient') || 'default';
  }

  function _v6OnReady(fn, delay) {
    var mount = document.getElementById('dos-mount');
    if (!mount) return;
    if (mount.querySelector('.dos-documento')) {
      setTimeout(fn, delay || 0);
      return;
    }
    var obs = new MutationObserver(function () {
      if (!mount.querySelector('.dos-documento')) return;
      obs.disconnect();
      setTimeout(fn, delay || 0);
    });
    obs.observe(mount, { childList: true, subtree: true });
  }

  // ── V6.1 Estimativa de tempo de leitura ──────────────────────
  function injectReadingTime() {
    _v6OnReady(function () {
      var doc = document.querySelector('.dos-documento');
      if (!doc || doc.dataset.v6Reading) return;
      doc.dataset.v6Reading = '1';
      var words = (doc.innerText || doc.textContent || '').split(/\s+/).filter(Boolean).length;
      var min = Math.max(1, Math.round(words / 200));
      var capa = doc.querySelector('.dos-capa');
      if (!capa) return;
      var badge = document.createElement('p');
      badge.className = 'ded-reading-time';
      badge.setAttribute('aria-label', 'Tempo estimado de leitura: ' + min + ' minutos');
      badge.innerHTML =
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' +
        '</svg> ~' + min + ' min de leitura · ' + words.toLocaleString('pt-BR') + ' palavras';
      capa.appendChild(badge);
    }, 250);
  }

  // ── V6.2 Barra sticky de resumo da paciente ──────────────────
  function injectStickyBar() {
    if (document.getElementById('ded-sticky-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'ded-sticky-bar';
    bar.className = 'ded-sticky-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML =
      '<span class="ded-sticky-name" id="ded-sticky-name">—</span>' +
      '<span class="ded-sticky-sep" aria-hidden="true">·</span>' +
      '<span class="ded-sticky-sec" id="ded-sticky-sec">Dossiê Clínico</span>';
    document.body.appendChild(bar);

    _v6OnReady(function () {
      var capa = document.querySelector('.dos-capa');
      if (!capa) return;

      // Populate patient name
      var nomeEl = capa.querySelector('.dos-capa-nome');
      if (nomeEl) {
        var sn = document.getElementById('ded-sticky-name');
        if (sn) sn.textContent = nomeEl.textContent.trim();
      }

      // Show bar when capa scrolls out of view
      var io1 = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) bar.classList.remove('ded-sticky-bar-vis');
        else bar.classList.add('ded-sticky-bar-vis');
      }, { threshold: 0.05 });
      io1.observe(capa);

      // Track current section title
      var sections = document.querySelectorAll('.dos-secao');
      if (sections.length) {
        var io2 = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            var t = e.target.querySelector('.dos-sec-titulo');
            var ss = document.getElementById('ded-sticky-sec');
            if (t && ss) ss.textContent = t.textContent.trim();
          });
        }, { rootMargin: '-20% 0px -70% 0px' });
        sections.forEach(function (s) { io2.observe(s); });
      }
    }, 300);
  }

  // ── V6.3 Botão copiar conteúdo por seção ─────────────────────
  function injectSectionCopyBtns() {
    _v6OnReady(function () {
      document.querySelectorAll('.dos-sec-header').forEach(function (hdr) {
        if (hdr.dataset.v6Copy) return;
        hdr.dataset.v6Copy = '1';
        var btn = document.createElement('button');
        btn.className = 'ded-sec-copy-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Copiar conteúdo desta seção');
        btn.title = 'Copiar seção';
        btn.innerHTML =
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
            '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
          '</svg>';
        hdr.appendChild(btn);
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var sec = hdr.closest('.dos-secao') || hdr.parentElement;
          var clone = sec ? sec.cloneNode(true) : null;
          if (!clone) return;
          clone.querySelectorAll('button, svg, canvas, .ded-note-area').forEach(function (x) { x.remove(); });
          var text = (clone.innerText || clone.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
          function done() {
            btn.classList.add('ded-sec-copy-ok');
            setTimeout(function () { btn.classList.remove('ded-sec-copy-ok'); }, 1400);
            _v6Toast('Seção copiada!');
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(function () { _v6Toast('Erro ao copiar', true); });
          } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
            document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
            done();
          }
        });
      });
    }, 260);
  }

  // ── V6.4 Alt+1–9 para saltar diretamente a seções ─────────────
  function wireJumpKeys() {
    document.addEventListener('keydown', function (e) {
      if (!e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;
      var n = parseInt(e.key, 10);
      if (isNaN(n) || n < 1 || n > 9) return;
      var tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      var secs = document.querySelectorAll('.dos-secao');
      var target = secs[n - 1];
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      var titulo = target.querySelector('.dos-sec-titulo');
      _v6Announce('Seção ' + n + (titulo ? ': ' + titulo.textContent.trim() : ''));
    });
  }

  // ── V6.5 Memória de posição de rolagem por paciente ───────────
  function wireScrollMemory() {
    var key = 'ded-scroll-' + _v6PatientId();
    // Restore
    _v6OnReady(function () {
      var y = parseInt(sessionStorage.getItem(key) || '0', 10);
      if (y > 120) setTimeout(function () { window.scrollTo({ top: y, behavior: 'smooth' }); }, 450);
    }, 200);
    // Save (throttled)
    var timer;
    window.addEventListener('scroll', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { sessionStorage.setItem(key, String(Math.round(window.scrollY))); }, 300);
    }, { passive: true });
  }

  // ── V6.6 Marcadores de seção (bookmark) ──────────────────────
  var _bmarks = {};
  function _bmKey() { return 'ded-bm-' + _v6PatientId(); }
  function _bmLoad() { try { _bmarks = JSON.parse(localStorage.getItem(_bmKey()) || '{}'); } catch (e) { _bmarks = {}; } }
  function _bmSave() { localStorage.setItem(_bmKey(), JSON.stringify(_bmarks)); }

  function injectBookmarks() {
    _bmLoad();
    _v6OnReady(function () {
      var sections = document.querySelectorAll('.dos-secao');
      sections.forEach(function (sec, idx) {
        var hdr = sec.querySelector('.dos-sec-header');
        if (!hdr || hdr.dataset.v6Bm) return;
        hdr.dataset.v6Bm = '1';
        var k = 'sec' + idx;
        var active = !!_bmarks[k];
        var btn = document.createElement('button');
        btn.className = 'ded-bm-btn' + (active ? ' ded-bm-on' : '');
        btn.type = 'button';
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.setAttribute('aria-label', active ? 'Remover marcador' : 'Marcar para consulta');
        btn.title = active ? 'Remover marcador' : 'Marcar para consulta';
        btn.dataset.bmk = k;
        btn.innerHTML =
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' +
          '</svg>';
        hdr.appendChild(btn);
        btn.addEventListener('click', function (evnt) {
          evnt.stopPropagation();
          var on = btn.classList.toggle('ded-bm-on');
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
          btn.setAttribute('aria-label', on ? 'Remover marcador' : 'Marcar para consulta');
          btn.title = on ? 'Remover marcador' : 'Marcar para consulta';
          if (on) {
            var t = sec.querySelector('.dos-sec-titulo');
            _bmarks[k] = t ? t.textContent.trim() : 'Seção ' + (idx + 1);
          } else { delete _bmarks[k]; }
          _bmSave();
          _v6Toast(on ? 'Seção marcada para consulta' : 'Marcador removido');
          _updateBmCount();
        });
      });
      _updateBmCount();
    }, 310);
  }

  function _updateBmCount() {
    var n = Object.keys(_bmarks).length;
    var badge = document.getElementById('ded-bm-count');
    if (badge) { badge.textContent = n > 0 ? String(n) : ''; badge.style.display = n > 0 ? 'inline-flex' : 'none'; }
  }

  // ── V6.7 Expandir / Recolher todas as seções ─────────────────
  function injectExpandCollapseAll() {
    _v6OnReady(function () {
      var toolbar = document.getElementById('ded-toolbar');
      if (!toolbar || toolbar.dataset.v6Exp) return;
      toolbar.dataset.v6Exp = '1';

      function mkBtn(id, title, svgPts) {
        var b = document.createElement('button');
        b.id = id; b.className = 'ded-toolbar-btn'; b.type = 'button';
        b.title = title; b.setAttribute('aria-label', title);
        b.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + svgPts + '</svg>';
        return b;
      }

      var sep = document.createElement('span');
      sep.className = 'ded-toolbar-sep'; sep.setAttribute('aria-hidden', 'true');

      var bExp = mkBtn('ded-btn-exp-all', 'Expandir todas as seções',
        '<polyline points="7 11 12 6 17 11"/><line x1="12" y1="18" x2="12" y2="6" style="opacity:.35"/>');
      var bCol = mkBtn('ded-btn-col-all', 'Recolher todas as seções',
        '<polyline points="7 6 12 11 17 6"/><line x1="12" y1="6" x2="12" y2="18" style="opacity:.35"/>');

      toolbar.appendChild(sep);
      toolbar.appendChild(bExp);
      toolbar.appendChild(bCol);

      bExp.addEventListener('click', function () {
        document.querySelectorAll('.dos-secao.ded-section-collapsed').forEach(function (sec) {
          sec.classList.remove('ded-section-collapsed');
          var hdr = sec.querySelector('.ded-section-toggle');
          if (hdr) hdr.setAttribute('aria-expanded', 'true');
          var body = sec.querySelector('.ded-section-body');
          if (body) {
            body.style.maxHeight = body.scrollHeight + 'px';
            setTimeout(function () { if (!sec.classList.contains('ded-section-collapsed')) body.style.maxHeight = 'none'; }, 420);
          }
        });
        _v6Announce('Todas as seções expandidas');
        _v6Toast('Todas as seções expandidas');
      });

      bCol.addEventListener('click', function () {
        document.querySelectorAll('.dos-secao').forEach(function (sec) {
          if (sec.classList.contains('ded-section-collapsed')) return;
          var body = sec.querySelector('.ded-section-body');
          if (body) body.style.maxHeight = body.scrollHeight + 'px';
          requestAnimationFrame(function () { requestAnimationFrame(function () {
            sec.classList.add('ded-section-collapsed');
            var hdr = sec.querySelector('.ded-section-toggle');
            if (hdr) hdr.setAttribute('aria-expanded', 'false');
          }); });
        });
        _v6Announce('Todas as seções recolhidas');
        _v6Toast('Todas as seções recolhidas');
      });
    }, 520);
  }

  // ── V6.8 Gerador de relatório clínico textual ─────────────────
  function generateClinicalReport() {
    var doc = document.querySelector('.dos-documento');
    if (!doc) { _v6Toast('Dossiê ainda carregando...', true); return; }
    var lines = [];
    var now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    var nome = '';
    var nomeEl = doc.querySelector('.dos-capa-nome');
    if (nomeEl) nome = nomeEl.textContent.trim();
    var LINE60 = '─'.repeat(60);
    var LINE40 = '─'.repeat(40);
    lines.push('RELATÓRIO CLÍNICO — ERG 360');
    lines.push('Dra. Evelin Ribeiro Greco · Nutrição Clínica');
    lines.push('Gerado em: ' + now);
    if (nome) lines.push('Paciente: ' + nome);
    lines.push(''); lines.push(LINE60); lines.push('');
    var sections = doc.querySelectorAll('.dos-secao');
    sections.forEach(function (sec, idx) {
      var titulo = sec.querySelector('.dos-sec-titulo');
      var sub = sec.querySelector('.dos-sec-sub');
      lines.push('SEÇÃO ' + (idx + 1) + (titulo ? ': ' + titulo.textContent.trim().toUpperCase() : ''));
      if (sub) lines.push('(' + sub.textContent.trim() + ')');
      lines.push('');
      var clone = sec.cloneNode(true);
      ['button', 'svg', 'canvas', 'input', 'textarea', '.ded-note-area', '.ded-sec-header',
       '.ded-sec-copy-btn', '.ded-bm-btn', 'style'].forEach(function (sel) {
        clone.querySelectorAll(sel).forEach(function (x) { x.remove(); });
      });
      var text = (clone.innerText || clone.textContent || '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
      if (text) lines.push(text);
      lines.push(''); lines.push(LINE40); lines.push('');
    });
    lines.push('Fim do relatório.');
    var content = lines.join('\n');
    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-' + (nome || 'paciente').toLowerCase().replace(/\s+/g, '-') + '-' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 800);
    _v6Toast('Relatório clínico exportado!');
    _v6Announce('Relatório clínico baixado.');
  }

  function injectReportButton() {
    _v6OnReady(function () {
      var toolbar = document.getElementById('ded-toolbar');
      if (!toolbar || toolbar.dataset.v6Rep) return;
      toolbar.dataset.v6Rep = '1';
      var btn = document.createElement('button');
      btn.id = 'ded-btn-report';
      btn.className = 'ded-toolbar-btn';
      btn.type = 'button';
      btn.title = 'Gerar relatório clínico (.txt)';
      btn.setAttribute('aria-label', 'Gerar relatório clínico textual');
      btn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
          '<polyline points="14 2 14 8 20 8"/>' +
          '<line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' +
          '<polyline points="10 9 9 9 8 9"/>' +
        '</svg>';
      toolbar.appendChild(btn);
      btn.addEventListener('click', generateClinicalReport);
    }, 560);
  }

  // ── V6.9 Print: watermark + header ERG ───────────────────────
  function injectPrintWatermark() {
    if (document.getElementById('ded-v6-print')) return;
    var s = document.createElement('style');
    s.id = 'ded-v6-print';
    s.textContent =
      '@media print {' +
      '  @page { margin: 2cm 1.8cm; }' +
      '  .dos-capa::after {' +
      '    content: "Dossiê gerado pelo sistema ERG 360 · Uso exclusivo clínico · Confidencial";' +
      '    display: block; font-size: 7pt; color: #9A7D5E;' +
      '    font-family: "DM Sans", sans-serif;' +
      '    margin-top: 14pt; border-top: 0.5pt solid #C9A882; padding-top: 6pt;' +
      '  }' +
      '  .dos-documento::before {' +
      '    content: "ERG 360 · Dra. Evelin Ribeiro Greco · Nutrição Clínica";' +
      '    display: block; font-size: 7pt; color: #9A7D5E; letter-spacing: 0.06em;' +
      '    font-family: "DM Sans", sans-serif; text-transform: uppercase;' +
      '    padding-bottom: 8pt; border-bottom: 0.5pt solid #C9A882; margin-bottom: 18pt;' +
      '  }' +
      '}';
    document.head.appendChild(s);
  }

  // ── V6.10 Indicador de seção flutuante ─────────────────────────
  function injectSectionIndicator() {
    if (document.getElementById('ded-sec-ind')) return;
    var pill = document.createElement('div');
    pill.id = 'ded-sec-ind';
    pill.className = 'ded-sec-ind';
    pill.setAttribute('aria-hidden', 'true');
    document.body.appendChild(pill);
    _v6OnReady(function () {
      var sections = document.querySelectorAll('.dos-secao');
      if (!sections.length) return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var num = entry.target.dataset.v6Idx;
          var t = entry.target.querySelector('.dos-sec-titulo');
          if (!num || !t) return;
          pill.textContent = num + ' · ' + t.textContent.trim();
          pill.classList.add('ded-sec-ind-show');
          clearTimeout(pill._t);
          pill._t = setTimeout(function () { pill.classList.remove('ded-sec-ind-show'); }, 2400);
        });
      }, { rootMargin: '-15% 0px -75% 0px', threshold: 0 });
      sections.forEach(function (sec, i) {
        sec.dataset.v6Idx = String(i + 1);
        io.observe(sec);
      });
    }, 420);
  }

  // ── V6.11 Contador de marcadores no toolbar ──────────────────
  function injectBookmarkCounter() {
    _v6OnReady(function () {
      var toolbar = document.getElementById('ded-toolbar');
      if (!toolbar || document.getElementById('ded-bm-count')) return;
      var badge = document.createElement('span');
      badge.id = 'ded-bm-count';
      badge.className = 'ded-bm-count';
      badge.setAttribute('aria-label', 'Seções marcadas');
      badge.style.display = 'none';
      toolbar.appendChild(badge);
      _updateBmCount();
    }, 540);
  }

  // ── V6.12 Atualizar ajuda de teclado com novos atalhos ────────
  function patchKeyboardHelp() {
    var orig = window._adminDossieExtras && window._adminDossieExtras.showKeyboardHelp;
    if (!orig) return;
    var list = document.querySelector('.ded-kb-list');
    if (!list) return;
    var newItems =
      '<div class="ded-kb-item"><span class="ded-kb-key">Alt + 1–9</span><span>Saltar para seção numerada</span></div>';
    list.insertAdjacentHTML('beforeend', newItems);
  }

  // ── V6.13 Salto rápido: G + número via sequência dupla ────────
  // (registrado junto com V6.4 na função wireJumpKeys acima)

  // ── V6.14 Resetar zoom com Ctrl+0 ─────────────────────────────
  function wireZoomReset() {
    document.addEventListener('keydown', function (e) {
      if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
      if (e.key !== '0') return;
      var tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      var doc = document.querySelector('.dos-documento');
      if (doc) doc.style.fontSize = '1em';
      var label = document.getElementById('ded-font-size-label');
      if (label) label.textContent = '100%';
      _v6Announce('Tamanho de fonte redefinido para 100%');
      _v6Toast('Zoom redefinido para 100%');
    });
  }

  // ── V6.15 Destaque de seções com marcador (visual) ───────────
  function injectBookmarkHighlight() {
    _bmLoad();
    _v6OnReady(function () {
      var sections = document.querySelectorAll('.dos-secao');
      sections.forEach(function (sec, idx) {
        var k = 'sec' + idx;
        if (_bmarks[k]) sec.classList.add('ded-sec-bookmarked');
      });
      // Re-apply on bookmark toggle (via event)
      document.addEventListener('click', function (e) {
        var btn = e.target.closest('.ded-bm-btn');
        if (!btn) return;
        var k = btn.dataset.bmk;
        if (!k) return;
        var idx = parseInt(k.replace('sec', ''), 10);
        var sec = document.querySelectorAll('.dos-secao')[idx];
        if (!sec) return;
        if (btn.classList.contains('ded-bm-on')) sec.classList.add('ded-sec-bookmarked');
        else sec.classList.remove('ded-sec-bookmarked');
      });
    }, 350);
  }

  // ── V6 INIT ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    injectReadingTime();
    injectStickyBar();
    injectSectionCopyBtns();
    wireJumpKeys();
    wireScrollMemory();
    injectBookmarks();
    injectExpandCollapseAll();
    injectReportButton();
    injectPrintWatermark();
    injectSectionIndicator();
    injectBookmarkCounter();
    wireZoomReset();
    injectBookmarkHighlight();
    // Patch KB help after dossier ready
    _v6OnReady(patchKeyboardHelp, 800);
  });

})();
