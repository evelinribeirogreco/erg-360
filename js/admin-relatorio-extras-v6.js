// ═══ POLIMENTO V6 ═══
// V6: produtividade clínica avançada — templates, edição inline, histórico,
//     sugestões IA local, validação de campos, smart-fill
(function _adminRelatorioV6() {
  'use strict';

  var _params     = new URLSearchParams(window.location.search);
  var _patientId  = _params.get('patient') || 'unknown';

  function _announce(msg) {
    if (window._adminRelatorioExtras && window._adminRelatorioExtras.announce) {
      window._adminRelatorioExtras.announce(msg);
    }
  }

  // ── V6-1. Templates de relatório pré-configurados ────────
  var TEMPLATES = {
    'primeira-consulta': {
      label: '1ª Consulta',
      icon: '🆕',
      texto: 'RELATÓRIO — PRIMEIRA CONSULTA\n\nMotivo da consulta:\n\nHistória alimentar prévia:\n\nExames bioquímicos relevantes:\n\nConduta nutricional:\n• Meta calórica:\n• Distribuição de macros:\n• Orientações prioritárias:\n\nPróximos passos:\n1.\n2.\n3.\n\nRetorno previsto:'
    },
    'acompanhamento': {
      label: 'Acompanhamento',
      icon: '📋',
      texto: 'RELATÓRIO — ACOMPANHAMENTO\n\nEvolução desde última consulta:\n\nAdesão ao plano alimentar: ( ) Ótima  ( ) Boa  ( ) Regular  ( ) Ruim\n\nVariação de peso:\n\nSintomas relatados:\n\nAjustes no plano:\n\nMotivação / engajamento:\n\nPróximos objetivos:\n\nRetorno previsto:'
    },
    'intercorrencia': {
      label: 'Intercorrência',
      icon: '⚠️',
      texto: 'RELATÓRIO — INTERCORRÊNCIA\n\nDescrição da intercorrência:\n\nData de início dos sintomas:\n\nConduta adotada:\n\nOrientações emergenciais:\n\nEncaminhamentos necessários:\n\nAcompanhamento programado:\n\nObservações clínicas:'
    },
    'alta': {
      label: 'Alta Nutricional',
      icon: '✅',
      texto: 'RELATÓRIO — ALTA NUTRICIONAL\n\nObjetivos alcançados:\n• Peso alvo atingido: ( ) Sim  ( ) Não\n• Metas metabólicas: ( ) Sim  ( ) Parcial\n• Autonomia alimentar: ( ) Sim  ( ) Em progresso\n\nResumo da evolução:\n\nOrientações de manutenção:\n\nSinais de alerta para retorno:\n\nFrequência de acompanhamento recomendada:\n\nAssinatura e data:'
    }
  };

  function injectTemplateChooser() {
    var nav = document.querySelector('.sidebar-nav');
    if (!nav || document.getElementById('btn-templates')) return;

    var btn = document.createElement('a');
    btn.id        = 'btn-templates';
    btn.href      = 'javascript:void(0)';
    btn.className = 'nav-item';
    btn.setAttribute('aria-label', 'Escolher template de relatório');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
      '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>' +
      '<rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' +
      '</svg> Templates';

    var menu = document.createElement('div');
    menu.id        = 'erg-template-menu';
    menu.className = 'erg-template-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Templates de relatório');

    Object.keys(TEMPLATES).forEach(function(key) {
      var tmpl = TEMPLATES[key];
      var item = document.createElement('button');
      item.className = 'erg-template-item';
      item.setAttribute('role', 'menuitem');
      item.setAttribute('tabindex', '-1');
      item.setAttribute('data-template', key);
      item.textContent = tmpl.label;

      item.addEventListener('click', function() {
        applyTemplate(key);
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });

      menu.appendChild(item);
    });

    nav.appendChild(btn);
    nav.appendChild(menu);

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) {
        var first = menu.querySelector('.erg-template-item');
        if (first) setTimeout(function() { first.focus(); }, 50);
        _announce('Menu de templates aberto. Use setas para navegar.');
      }
    });

    menu.addEventListener('keydown', function(e) {
      var items = Array.prototype.slice.call(menu.querySelectorAll('.erg-template-item'));
      var idx   = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
      if (e.key === 'Escape')    { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });

    document.addEventListener('click', function() {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  function applyTemplate(key) {
    var tmpl = TEMPLATES[key];
    if (!tmpl) return;

    var panel = document.getElementById('erg-notes-panel');
    if (!panel || !panel.classList.contains('open')) {
      if (window._adminRelatorioExtras && window._adminRelatorioExtras.toggleNotesPanel) {
        window._adminRelatorioExtras.toggleNotesPanel(true);
      }
    }

    var ta = document.getElementById('erg-notes-ta');
    if (!ta) return;

    var patientNome = '';
    var nomeEl = document.querySelector('.rel-nome') || document.getElementById('rel-nome-sidebar');
    if (nomeEl) patientNome = nomeEl.textContent.trim();

    var data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    var header = 'Paciente: ' + (patientNome || '—') + '\nData: ' + data + '\n\n';
    ta.value = header + tmpl.texto;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
    _announce('Template ' + tmpl.label + ' aplicado nas notas clínicas.');
  }

  // ── V6-2. Edição inline contenteditable nos cards ────────
  function enableInlineEditing(container) {
    var EDIT_PREFIX = 'erg_edit_' + _patientId + '_';

    container.querySelectorAll('.rel-v, .rel-peso-val').forEach(function(el, i) {
      if (el.getAttribute('data-inline-edit')) return;
      el.setAttribute('data-inline-edit', 'true');
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', 'Campo editável. Clique para editar.');
      el.classList.add('erg-inline-editable');

      var storageKey = EDIT_PREFIX + i;
      var saved = null;
      try { saved = localStorage.getItem(storageKey); } catch (_) {}
      if (saved !== null) el.textContent = saved;

      var saveTimer;
      el.addEventListener('input', function() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function() {
          try { localStorage.setItem(storageKey, el.textContent); } catch (_) {}
        }, 800);
      });

      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          el.blur();
        }
        if (e.key === 'Escape') { el.blur(); }
      });

      el.addEventListener('blur', function() {
        try { localStorage.setItem(storageKey, el.textContent); } catch (_) {}
      });
    });
  }

  // ── V6-3. Histórico de relatórios da paciente ────────────
  var HISTORY_KEY = 'erg_rel_history_' + _patientId;
  var MAX_HISTORY = 5;

  function saveReportSnapshot(container) {
    var nomeEl = container.querySelector('.rel-nome');
    var nome   = nomeEl ? nomeEl.textContent.trim() : '—';
    var data   = new Date().toISOString();

    var cards = container.querySelectorAll('.rel-card');
    var excerpt = '';
    if (cards.length) {
      excerpt = cards[0].textContent.replace(/\s+/g, ' ').trim().slice(0, 200);
    }

    var snapshot = { data: data, nome: nome, excerpt: excerpt };

    var history = [];
    try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) {}
    if (!Array.isArray(history)) history = [];

    history.unshift(snapshot);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (_) {}
  }

  function injectHistoryBtn() {
    var nav = document.querySelector('.sidebar-nav');
    if (!nav || document.getElementById('btn-historico')) return;

    var history = [];
    try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) {}
    if (!Array.isArray(history) || !history.length) return;

    var btn = document.createElement('a');
    btn.id        = 'btn-historico';
    btn.href      = 'javascript:void(0)';
    btn.className = 'nav-item';
    btn.setAttribute('aria-label', 'Ver histórico de relatórios desta paciente');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
      '<polyline points="12 8 12 12 14 14"/>' +
      '<path d="M3.05 11a9 9 0 1 1 .5 4M3 16v-5h5"/>' +
      '</svg> Histórico <span class="erg-history-count">' + history.length + '</span>';

    var panel = document.createElement('div');
    panel.id        = 'erg-history-panel';
    panel.className = 'erg-history-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Histórico de relatórios');
    panel.setAttribute('aria-modal', 'true');

    var listHtml = history.map(function(snap, i) {
      var d = new Date(snap.data);
      var dateStr = isNaN(d) ? snap.data : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
      return '<div class="erg-history-item" role="listitem">' +
        '<p class="erg-history-date">' + dateStr + '</p>' +
        '<p class="erg-history-excerpt">' + (snap.excerpt || '').replace(/</g, '&lt;').slice(0, 120) + '…</p>' +
        '</div>';
    }).join('');

    panel.innerHTML =
      '<div class="erg-history-header">' +
        '<p class="erg-history-title">Histórico de Relatórios</p>' +
        '<button id="erg-history-close" class="erg-notes-action-btn" aria-label="Fechar histórico">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="erg-history-list" role="list">' + listHtml + '</div>';

    document.body.appendChild(panel);

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = panel.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) {
        panel.querySelector('#erg-history-close').focus();
        _announce('Painel de histórico de relatórios aberto.');
      }
    });

    panel.querySelector('#erg-history-close').addEventListener('click', function() {
      panel.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) {
        panel.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });

    nav.appendChild(btn);
  }

  // ── V6-4. Sugestões de conduta IA local (rule-based) ─────
  function injectAISuggestions(container) {
    if (container.querySelector('.erg-ai-suggestions')) return;

    var suggestions = [];
    var text = (container.innerText || container.textContent || '').toLowerCase();

    var imcMatch = text.match(/imc[\s\S]{0,20}?(\d{2}[,.]?\d*)/);
    var imc = imcMatch ? parseFloat(imcMatch[1].replace(',', '.')) : null;

    var gordMatch = text.match(/gordura[\s\S]{0,20}?(\d{2}[,.]?\d*)\s*%/);
    var gordura = gordMatch ? parseFloat(gordMatch[1].replace(',', '.')) : null;

    var scoreMatch = text.match(/score[\s\S]{0,30}?(\d{1,3})/);
    var score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

    if (imc !== null) {
      if (imc < 18.5) {
        suggestions.push({ tipo: 'alerta', texto: 'IMC ' + imc.toFixed(1) + ' — Baixo peso. Aumentar densidade calórica e proteica. Avaliar risco de desnutrição.' });
      } else if (imc >= 25 && imc < 30) {
        suggestions.push({ tipo: 'atencao', texto: 'IMC ' + imc.toFixed(1) + ' — Sobrepeso. Déficit calórico moderado de 300-500 kcal/dia. Priorizar proteína ≥1.6 g/kg.' });
      } else if (imc >= 30 && imc < 35) {
        suggestions.push({ tipo: 'alerta', texto: 'IMC ' + imc.toFixed(1) + ' — Obesidade G1. Déficit estruturado + monitoramento de comorbidades metabólicas.' });
      } else if (imc >= 35) {
        suggestions.push({ tipo: 'critico', texto: 'IMC ' + imc.toFixed(1) + ' — Obesidade G2+. Avaliar encaminhamento multidisciplinar. Considerar protocolos de VLCD supervisionado.' });
      }
    }

    if (gordura !== null && gordura > 35) {
      suggestions.push({ tipo: 'atencao', texto: '% Gordura ' + gordura.toFixed(1) + '% — Acima da referência. Priorizar treinamento resistido + aeróbico combinado.' });
    }

    if (score !== null) {
      if (score < 40) {
        suggestions.push({ tipo: 'critico', texto: 'Score metabólico baixo (' + score + '). Avaliar múltiplas áreas: sono, hidratação, adesão alimentar e nível de stress.' });
      } else if (score >= 40 && score < 65) {
        suggestions.push({ tipo: 'atencao', texto: 'Score ' + score + ' — margem de melhora. Identificar 2-3 comportamentos-chave para intervenção imediata.' });
      }
    }

    if (text.indexOf('sop') !== -1 || text.indexOf('síndrome do ovário policístico') !== -1) {
      suggestions.push({ tipo: 'info', texto: 'SOP identificada. Considerar baixo índice glicêmico, inositol (2-4g/dia) e manejo do cortisol.' });
    }
    if (text.indexOf('hipotireoidismo') !== -1) {
      suggestions.push({ tipo: 'info', texto: 'Hipotireoidismo: atentar para ingestão de selênio, zinco e vitamina D. Evitar excesso de goitrogênicos crus.' });
    }
    if (text.indexOf('diabetes') !== -1 || text.indexOf('resistência à insulina') !== -1) {
      suggestions.push({ tipo: 'atencao', texto: 'Resistência metabólica detectada. Priorizar controle de carga glicêmica, cronobiologia alimentar e jejum intermitente supervisionado.' });
    }

    if (!suggestions.length) {
      suggestions.push({ tipo: 'info', texto: 'Sem alertas automáticos detectados. Conduta conforme evolução clínica individualizada.' });
    }

    var typeIcons = { alerta: '⚠', critico: '🔴', atencao: '🟡', info: '🟢' };
    var typeLabels = { alerta: 'Alerta', critico: 'Crítico', atencao: 'Atenção', info: 'Info' };

    var html =
      '<div class="rel-section-wide erg-ai-suggestions" role="region" aria-label="Sugestões de conduta baseadas nos dados">' +
        '<p class="rel-section-title" id="erg-ai-title">Sugestões de Conduta — Análise Automática</p>' +
        '<div class="erg-ai-grid">' +
        suggestions.map(function(s) {
          return '<div class="erg-ai-card erg-ai-' + s.tipo + '" role="article" aria-label="Sugestão: ' + typeLabels[s.tipo] + '">' +
            '<span class="erg-ai-icon" aria-hidden="true">' + typeIcons[s.tipo] + '</span>' +
            '<p class="erg-ai-text">' + s.texto + '</p>' +
            '</div>';
        }).join('') +
        '</div>' +
        '<p class="erg-ai-disclaimer">Análise automática baseada em regras clínicas. Sempre valide com avaliação profissional.</p>' +
      '</div>';

    var lastSection = container.querySelector('.erg-signature-footer, #erg-signature-footer');
    if (lastSection) {
      lastSection.insertAdjacentHTML('beforebegin', html);
    } else {
      container.insertAdjacentHTML('beforeend', html);
    }
  }

  // ── V6-5. Validação de campos clínicos obrigatórios ──────
  var REQUIRED_SECTIONS = ['Dados Clínicos', 'Composição Corporal', 'Peso', 'Conduta'];

  function validateRequiredFields(container) {
    var missing = [];

    container.querySelectorAll('.rel-card').forEach(function(card) {
      var titleEl = card.querySelector('.rel-card-title');
      if (!titleEl) return;
      var title = titleEl.textContent.trim().toUpperCase();

      var isEmpty = !card.textContent.replace(title, '').replace(/[\s\-—]+/g, '').trim();
      var hasEmpty = card.querySelector('.rel-empty');

      REQUIRED_SECTIONS.forEach(function(req) {
        if (title.indexOf(req.toUpperCase()) !== -1 && (isEmpty || hasEmpty)) {
          card.classList.add('erg-missing-field');
          card.setAttribute('aria-describedby', 'erg-val-msg');
          missing.push(title);
        }
      });
    });

    if (!missing.length) return;

    var banner = document.getElementById('erg-validation-banner');
    if (banner) return;

    banner = document.createElement('div');
    banner.id        = 'erg-validation-banner';
    banner.className = 'erg-validation-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('id', 'erg-val-msg');
    banner.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' +
      '</svg> ' +
      missing.length + ' seção(ões) com dados ausentes: ' + missing.join(', ') +
      '<button class="erg-val-dismiss" aria-label="Dispensar aviso">&times;</button>';

    banner.querySelector('.erg-val-dismiss').addEventListener('click', function() {
      banner.remove();
    });

    var main = document.querySelector('.main-content');
    if (main) main.insertBefore(banner, main.firstChild.nextSibling || main.firstChild);

    _announce(missing.length + ' campos clínicos obrigatórios sem dados.');
  }

  // ── V6-6. Smart-fill da última consulta ──────────────────
  function smartFillFromLastConsultation(container) {
    var SMARTFILL_KEY = 'erg_smartfill_' + _patientId;

    var data = extractReportData(container);
    try { localStorage.setItem(SMARTFILL_KEY, JSON.stringify(data)); } catch (_) {}

    var btn = document.getElementById('btn-smart-fill');
    if (btn) return;

    var nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    var prevData = null;
    try {
      var raw = localStorage.getItem(SMARTFILL_KEY);
      if (raw) prevData = JSON.parse(raw);
    } catch (_) {}

    if (!prevData) return;

    var fillBtn = document.createElement('a');
    fillBtn.id        = 'btn-smart-fill';
    fillBtn.href      = 'javascript:void(0)';
    fillBtn.className = 'nav-item';
    fillBtn.setAttribute('aria-label', 'Smart-fill: preencher notas com dados desta consulta');
    fillBtn.setAttribute('tabindex', '0');
    fillBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>' +
      '</svg> Smart-fill';

    fillBtn.addEventListener('click', function() {
      var panel = document.getElementById('erg-notes-panel');
      if (!panel || !panel.classList.contains('open')) {
        if (window._adminRelatorioExtras && window._adminRelatorioExtras.toggleNotesPanel) {
          window._adminRelatorioExtras.toggleNotesPanel(true);
        }
      }

      var ta = document.getElementById('erg-notes-ta');
      if (!ta) return;

      var d = prevData;
      var lines = [
        '— DADOS PREENCHIDOS AUTOMATICAMENTE —',
        'Paciente: ' + (d.nome || '—'),
        'Data do relatório: ' + (d.data || '—'),
        ''
      ];
      if (d.peso)    lines.push('Peso atual: ' + d.peso);
      if (d.imc)     lines.push('IMC: ' + d.imc);
      if (d.gordura) lines.push('% Gordura: ' + d.gordura);
      if (d.score)   lines.push('Score metabólico: ' + d.score);
      lines.push('');
      lines.push('Notas de evolução:');
      lines.push('');

      var existing = ta.value ? ('\n\n' + ta.value) : '';
      ta.value = lines.join('\n') + existing;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
      _announce('Dados da última consulta inseridos nas notas.');
    });

    nav.appendChild(fillBtn);
  }

  function extractReportData(container) {
    var text    = (container.innerText || container.textContent || '');
    var nomeEl  = container.querySelector('.rel-nome');
    var nome    = nomeEl ? nomeEl.textContent.trim() : '';

    function grab(pattern) {
      var m = text.match(pattern);
      return m ? m[1].trim() : '';
    }

    return {
      nome:    nome,
      data:    new Date().toLocaleDateString('pt-BR'),
      peso:    grab(/peso\s*atual[\s\S]{0,10}?(\d{2,3}[,.]\d+\s*kg)/i) || grab(/(\d{2,3}[,.]\d+)\s*kg/i),
      imc:     grab(/imc[\s\S]{0,20}?(\d{2}[,.]?\d*)/i),
      gordura: grab(/gordura[\s\S]{0,20}?(\d{2}[,.]?\d*)\s*%/i),
      score:   grab(/score[\s\S]{0,30}?(\d{1,3})/i)
    };
  }

  // ── Observer central V6 ──────────────────────────────────
  function watchMountV6() {
    var mount = document.getElementById('rel-mount');
    if (!mount) return;

    var done = false;
    var obs = new MutationObserver(function() {
      if (done) return;
      var container = mount.querySelector('.rel-container');
      if (!container) return;
      done = true;
      obs.disconnect();

      setTimeout(function() {
        enableInlineEditing(container);
        injectAISuggestions(container);
        validateRequiredFields(container);
        saveReportSnapshot(container);
        smartFillFromLastConsultation(container);
        injectHistoryBtn();
      }, 600);
    });

    obs.observe(mount, { childList: true, subtree: false });
  }

  function initV6() {
    injectTemplateChooser();
    watchMountV6();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV6);
  } else {
    initV6();
  }
})();
