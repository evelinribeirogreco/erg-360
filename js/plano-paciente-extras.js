// ============================================================
// ERG 360 — plano-paciente-extras.js
// V1 — 18 melhorias UX: ARIA, teclado, ripple, macros visuais,
//      swipe, skeleton, sticky mobile bar, toast, print, hover
// ============================================================

// ═══ POLIMENTO V1 ═══

const _$ = id => document.getElementById(id);

// ── 1 + 2 + 3. ARIA roles: tablist / tab / tabpanel ──────────
function patchARIATabs() {
  const wrap = _$('tabs-wrap');
  if (!wrap) return;
  wrap.setAttribute('role', 'tablist');
  wrap.setAttribute('aria-label', 'Refeições do plano alimentar');

  wrap.querySelectorAll('.tab').forEach(tab => {
    const ref = tab.dataset.ref;
    if (!ref) return;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('id', 'tab-' + ref);
    tab.setAttribute('aria-controls', 'block-' + ref);
    tab.setAttribute('tabindex', tab.classList.contains('active') ? '0' : '-1');
    tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');
  });

  document.querySelectorAll('.refeicao-block').forEach(block => {
    const ref = block.id.replace('block-', '');
    block.setAttribute('role', 'tabpanel');
    block.setAttribute('aria-labelledby', 'tab-' + ref);
    block.setAttribute('aria-hidden', block.classList.contains('active') ? 'false' : 'true');
    block.setAttribute('tabindex', '0');
  });
}

// ── 4. ARIA live region para mudanças de aba ─────────────────
function criarARIALive() {
  if (_$('pp-aria-live')) return;
  const live = document.createElement('div');
  live.id = 'pp-aria-live';
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  document.body.appendChild(live);
}

// ── 5. Patch mudarTab: ARIA + scroll-into-view + persist ─────
function patchMudarTab() {
  const orig = window.mudarTab;
  if (!orig || window._ppMudarTabPatched) return;
  window._ppMudarTabPatched = true;

  window.mudarTab = function(key, el) {
    orig(key, el);

    const wrap = _$('tabs-wrap');

    // Atualiza ARIA
    document.querySelectorAll('.tab').forEach(t => {
      t.setAttribute('aria-selected', t.classList.contains('active') ? 'true' : 'false');
      t.setAttribute('tabindex', t.classList.contains('active') ? '0' : '-1');
    });
    document.querySelectorAll('.refeicao-block').forEach(b => {
      b.setAttribute('aria-hidden', b.classList.contains('active') ? 'false' : 'true');
    });

    // Rola a aba ativa para dentro da viewport (mobile)
    if (wrap && el) {
      const tL = el.offsetLeft;
      const tR = tL + el.offsetWidth;
      const wL = wrap.scrollLeft;
      const wR = wL + wrap.clientWidth;
      if (tL < wL) {
        wrap.scrollTo({ left: tL - 16, behavior: 'smooth' });
      } else if (tR > wR) {
        wrap.scrollTo({ left: tR - wrap.clientWidth + 16, behavior: 'smooth' });
      }
    }

    // Persiste aba no sessionStorage
    try { sessionStorage.setItem('pp-active-tab', key); } catch (_) {}

    // Notifica leitor de tela
    const live = _$('pp-aria-live');
    if (live) live.textContent = 'Refeição ativa: ' + (el?.textContent?.trim() || key);

    // Rola conteúdo ao topo da grade de macros (se usuário rolou pra baixo)
    if (window.scrollY > 120) {
      const mg = _$('macro-grid');
      if (mg) {
        const y = mg.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }
  };
}

// ── 6. Teclado nas tabs (Arrow, Home, End) ───────────────────
function setupKeyboardNav() {
  const wrap = _$('tabs-wrap');
  if (!wrap) return;
  wrap.addEventListener('keydown', e => {
    const tabs = [...wrap.querySelectorAll('.tab')];
    const idx = tabs.findIndex(t => t.classList.contains('active'));
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (idx + 1) % tabs.length;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (idx - 1 + tabs.length) % tabs.length;
      e.preventDefault();
    } else if (e.key === 'Home') {
      next = 0;
      e.preventDefault();
    } else if (e.key === 'End') {
      next = tabs.length - 1;
      e.preventDefault();
    }
    if (next >= 0) {
      tabs[next].focus();
      tabs[next].click();
    }
  });
}

// ── 7. Ripple nas tabs ───────────────────────────────────────
function setupTabRipple() {
  document.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    const rect = tab.getBoundingClientRect();
    const size = tab.offsetWidth * 1.4;
    const r = document.createElement('span');
    r.className = 'pp-tab-ripple';
    r.style.cssText = [
      'position:absolute', 'pointer-events:none', 'border-radius:50%',
      `background:rgba(76,184,160,0.28)`, 'transform:scale(0)',
      'animation:ppRipple 0.45s ease-out forwards',
      `width:${size}px`, `height:${size}px`,
      `left:${e.clientX - rect.left - size / 2}px`,
      `top:${e.clientY - rect.top - size / 2}px`,
    ].join(';');
    if (getComputedStyle(tab).position === 'static') tab.style.position = 'relative';
    tab.style.overflow = 'hidden';
    tab.appendChild(r);
    r.addEventListener('animationend', () => r.remove(), { once: true });
  });
}

// ── 8. Fade gradients nas tabs com overflow ───────────────────
function setupTabScrollFade() {
  const wrap = _$('tabs-wrap');
  if (!wrap) return;
  const update = () => {
    wrap.classList.toggle('pp-scroll-left', wrap.scrollLeft > 10);
    wrap.classList.toggle('pp-scroll-right',
      wrap.scrollLeft < wrap.scrollWidth - wrap.clientWidth - 10);
  };
  wrap.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  setTimeout(update, 1800);
}

// ── 9. Barras de progresso das macros ────────────────────────
const MACRO_REF = { kcal: 2000, ptn: 75, cho: 250, lip: 65 };

function injetarMacroBars() {
  const pairs = [['m-kcal','kcal'], ['m-ptn','ptn'], ['m-cho','cho'], ['m-lip','lip']];
  let count = 0;
  pairs.forEach(([id, key]) => {
    const el = _$(id);
    if (!el || el.parentElement.querySelector('.pp-macro-bar')) return;
    const raw = el.textContent?.trim();
    const val = parseFloat(raw);
    if (isNaN(val) || raw === '—') return;
    const pct = Math.min(110, (val / MACRO_REF[key]) * 100);
    const color = pct > 105
      ? 'var(--error,#E05252)'
      : pct > 88
        ? 'var(--detail,#4CB8A0)'
        : 'var(--accent,#2D6A56)';
    const bar = document.createElement('div');
    bar.className = 'pp-macro-bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuenow', String(Math.round(pct)));
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-label', key + ' ' + Math.round(pct) + '% do valor de referência');
    bar.innerHTML = `<div class="pp-macro-bar-fill" style="width:0;background:${color};"></div>`;
    el.parentElement.appendChild(bar);
    setTimeout(() => {
      const fill = bar.querySelector('.pp-macro-bar-fill');
      if (fill) fill.style.width = Math.round(pct) + '%';
    }, 60);
    count++;
  });
  return count;
}

function watchMacroBars() {
  if (injetarMacroBars() >= 4) return;
  const grid = _$('macro-grid');
  if (!grid) return;
  const obs = new MutationObserver(() => {
    if (injetarMacroBars() >= 4) obs.disconnect();
  });
  obs.observe(grid, { childList: true, subtree: true, characterData: true });
  setTimeout(() => { injetarMacroBars(); obs.disconnect(); }, 6000);
}

// ── 10. Barra fixa de macros no mobile ───────────────────────
function injetarStickyMacroBar() {
  if (_$('pp-sticky-macro')) return;
  const bar = document.createElement('div');
  bar.id = 'pp-sticky-macro';
  bar.setAttribute('aria-live', 'polite');
  bar.setAttribute('aria-label', 'Resumo de macronutrientes');
  bar.innerHTML = `
    <div class="pp-sticky-macro-inner">
      <span class="pp-sticky-item" id="sm-kcal">— kcal</span>
      <span class="pp-sticky-sep">·</span>
      <span class="pp-sticky-item" id="sm-ptn">— g ptn</span>
      <span class="pp-sticky-sep">·</span>
      <span class="pp-sticky-item" id="sm-cho">— g cho</span>
      <span class="pp-sticky-sep">·</span>
      <span class="pp-sticky-item" id="sm-lip">— g lip</span>
    </div>`;
  document.body.appendChild(bar);

  let synced = false;
  const sync = () => {
    const kcal = _$('m-kcal')?.textContent?.trim();
    if (!kcal || kcal === '—') return;
    const get = id => _$(id)?.textContent?.trim() ?? '—';
    _$('sm-kcal').textContent = get('m-kcal') + ' kcal';
    _$('sm-ptn').textContent  = get('m-ptn')  + 'g ptn';
    _$('sm-cho').textContent  = get('m-cho')  + 'g cho';
    _$('sm-lip').textContent  = get('m-lip')  + 'g lip';
    synced = true;
  };
  let tries = 0;
  const iv = setInterval(() => {
    sync();
    if (synced || ++tries > 20) clearInterval(iv);
  }, 300);
}

// ── 11. Swipe horizontal entre tabs (mobile) ─────────────────
function setupSwipe() {
  let sx = 0, sy = 0;
  const content = document.querySelector('.page-content');
  if (!content) return;
  content.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  content.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 48 || Math.abs(dy) > Math.abs(dx) * 0.8) return;
    const tabs = [...document.querySelectorAll('.tab')];
    const idx = tabs.findIndex(t => t.classList.contains('active'));
    const next = dx < 0 ? idx + 1 : idx - 1;
    if (next >= 0 && next < tabs.length) tabs[next].click();
  }, { passive: true });
}

// ── 12. Header compacto ao rolar ─────────────────────────────
function setupHeaderScroll() {
  const header = document.querySelector('.page-header');
  if (!header) return;
  let compact = false;
  window.addEventListener('scroll', () => {
    const now = window.scrollY > 60;
    if (now === compact) return;
    compact = now;
    header.classList.toggle('pp-header-compact', compact);
  }, { passive: true });
}

// ── 13. Skeleton na mensagem de carregamento ─────────────────
function setupSkeleton() {
  document.querySelectorAll('.empty-state').forEach(el => {
    if (el.textContent?.trim() === 'Carregando plano...') {
      el.classList.add('pp-skeleton');
      el.setAttribute('aria-busy', 'true');
      el.setAttribute('aria-label', 'Carregando plano alimentar...');
    }
  });
}

// ── 14. Copiar nome do alimento com duplo-clique ─────────────
function setupFoodCopy() {
  document.addEventListener('dblclick', e => {
    const nome = e.target.closest('.alimento-nome');
    if (!nome || !navigator.clipboard) return;
    const text = nome.textContent?.trim();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copiado: ' + text);
    }).catch(() => {});
  });
}

// ── 15. Toast notification ───────────────────────────────────
function showToast(msg, ms) {
  ms = ms || 2500;
  let t = _$('pp-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'pp-toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('pp-toast-show');
  clearTimeout(t._tmr);
  t._tmr = setTimeout(() => t.classList.remove('pp-toast-show'), ms);
}

// ── 16. Restaura aba persistida ──────────────────────────────
function restoreTab() {
  try {
    const saved = sessionStorage.getItem('pp-active-tab');
    if (!saved) return;
    const tab = document.querySelector('.tab[data-ref="' + saved + '"]');
    if (tab && !tab.classList.contains('active')) {
      setTimeout(() => tab.click(), 250);
    }
  } catch (_) {}
}

// ════════════════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Fase 1 — imediata (não depende de dados async)
  setupSkeleton();
  setupTabRipple();
  setupFoodCopy();
  setupSwipe();
  setupHeaderScroll();

  // Fase 2 — após o JS principal ter renderizado as tabs (~700ms)
  setTimeout(() => {
    criarARIALive();
    patchARIATabs();
    patchMudarTab();
    setupKeyboardNav();
    setupTabScrollFade();
    injetarStickyMacroBar();
    restoreTab();
  }, 700);

  // Fase 3 — após dados async do Supabase (~2.2s)
  setTimeout(() => {
    patchARIATabs();
    watchMacroBars();
    setupTabScrollFade();
  }, 2200);
});

// API pública
window._planoPacienteExtras = {
  showToast,
  injetarMacroBars,
};

// ═══ POLIMENTO V3 ═══
// V3 — 10 micro-melhorias de acessibilidade avançada:
//      reduced-motion, page-visibility, ARIA landmarks, load-announce,
//      panel-focus, PDF aria-labels, tab counter, title update,
//      macro cell labels, forced-colors CSS

// ── 19. prefers-reduced-motion: aplica classe pp-no-motion ───
function setupReducedMotion() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = m => document.body.classList.toggle('pp-no-motion', m);
  apply(mq.matches);
  mq.addEventListener('change', e => apply(e.matches));
}

// ── 20. Page Visibility: re-sincroniza barra ao retornar ─────
function setupPageVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const get = id => document.getElementById(id)?.textContent?.trim() ?? '—';
    const sm  = id => document.getElementById(id);
    if (sm('sm-kcal') && get('m-kcal') !== '—') {
      sm('sm-kcal').textContent = get('m-kcal') + ' kcal';
      sm('sm-ptn').textContent  = get('m-ptn')  + 'g ptn';
      sm('sm-cho').textContent  = get('m-cho')  + 'g cho';
      sm('sm-lip').textContent  = get('m-lip')  + 'g lip';
    }
  });
}

// ── 21. ARIA landmarks: banner / main / region ───────────────
function patchLandmarks() {
  const hdr = document.querySelector('.page-header');
  if (hdr && !hdr.getAttribute('role')) hdr.setAttribute('role', 'banner');

  const mc = document.getElementById('main-content');
  if (mc && mc.getAttribute('role') !== 'main') mc.setAttribute('role', 'main');

  const mg = document.getElementById('macro-grid');
  if (mg) {
    if (!mg.getAttribute('role')) mg.setAttribute('role', 'region');
    if (!mg.getAttribute('aria-label'))
      mg.setAttribute('aria-label', 'Macronutrientes totais do dia');
  }
}

// ── 22. Anuncia plano carregado via live region ───────────────
function setupLoadAnnouncement() {
  const block = document.getElementById('block-resumo');
  if (!block) return;
  const obs = new MutationObserver(() => {
    if (block.querySelector('.empty-state[aria-busy]')) return;
    const tabs = document.querySelectorAll('#tabs-wrap .tab:not([data-ref="resumo"])').length;
    if (tabs < 1) return;
    const live = document.getElementById('pp-aria-live');
    if (live) {
      live.textContent =
        `Plano carregado com ${tabs} refeição${tabs !== 1 ? 'ões' : ''}.`;
    }
    obs.disconnect();
  });
  obs.observe(block, { childList: true, subtree: true });
}

// ── 23. Move foco ao painel ativo quando nav por teclado ─────
function setupPanelFocusOnKeyNav() {
  const wrap = document.getElementById('tabs-wrap');
  if (!wrap) return;
  let kbNav = false;
  wrap.addEventListener('keydown', () => { kbNav = true; }, { capture: true });

  const cnt = document.querySelector('.page-content') || document.body;
  const obs = new MutationObserver(muts => {
    if (!kbNav) return;
    for (const m of muts) {
      if (
        m.attributeName === 'class' &&
        m.target.classList?.contains('refeicao-block') &&
        m.target.classList.contains('active')
      ) {
        kbNav = false;
        const el = m.target.querySelector('.ref-title, [tabindex="0"]') || m.target;
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: false });
        break;
      }
    }
  });
  obs.observe(cnt, { attributes: true, attributeFilter: ['class'], subtree: true });
}

// ── 24. aria-label descritivo nos botões de PDF ──────────────
function enhancePDFButtons() {
  const titulo = document.getElementById('plano-titulo');
  const ver    = document.getElementById('pp-btn-ver-pdf');
  const baixar = document.getElementById('pp-btn-baixar-pdf');

  const applyLabels = () => {
    const t = titulo?.textContent?.trim() || 'plano alimentar';
    if (ver) {
      ver.setAttribute('aria-label', `Visualizar PDF do ${t}`);
      ver.querySelector('svg')?.setAttribute('aria-hidden', 'true');
    }
    if (baixar) {
      baixar.setAttribute('aria-label', `Baixar PDF do ${t}`);
      baixar.querySelector('svg')?.setAttribute('aria-hidden', 'true');
    }
  };

  applyLabels();
  if (titulo) {
    new MutationObserver(applyLabels)
      .observe(titulo, { characterData: true, childList: true });
  }
}

// ── 25. Contador "(aba X de Y)" em cada tab ──────────────────
function setupTabCounter() {
  const wrap = document.getElementById('tabs-wrap');
  if (!wrap) return;

  const update = () => {
    const tabs = [...wrap.querySelectorAll('.tab')];
    if (tabs.length < 2) return;
    tabs.forEach((tab, i) => {
      const base = (tab.getAttribute('aria-label') || tab.textContent)
        .replace(/\s*\(aba \d+ de \d+\)$/i, '').trim();
      tab.setAttribute('aria-label', `${base} (aba ${i + 1} de ${tabs.length})`);
    });
  };

  new MutationObserver(update).observe(wrap, { childList: true });
  setTimeout(update, 1000);
}

// ── 26. Atualiza <title> com nome do paciente e do plano ─────
function patchDocumentTitle() {
  const nome   = document.getElementById('paciente-nome');
  const titulo = document.getElementById('plano-titulo');
  if (!nome || !titulo) return;

  const update = () => {
    const n = nome.textContent?.trim();
    const t = titulo.textContent?.trim();
    if (n && n !== '—' && t) document.title = `${t} · ${n} — ERG 360`;
  };
  [nome, titulo].forEach(el =>
    new MutationObserver(update).observe(el, { characterData: true, childList: true })
  );
}

// ── 27. aria-label nas células de macro dos alimentos ────────
function setupAlimentoMacroLabels() {
  const patch = row => {
    row.querySelectorAll('.alimento-macro').forEach(cell => {
      if (cell.hasAttribute('aria-label')) return;
      const lbl = cell.querySelector('.alimento-macro-label')?.textContent?.trim();
      const raw = [...cell.childNodes]
        .filter(n => n.nodeType === 3)
        .map(n => n.textContent.trim())
        .filter(Boolean)
        .join('');
      if (raw && lbl) cell.setAttribute('aria-label', `${raw} ${lbl}`);
    });
  };

  document.querySelectorAll('.alimento-row').forEach(patch);

  const obs = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.classList?.contains('alimento-row')) patch(n);
        n.querySelectorAll?.('.alimento-row').forEach(patch);
      });
    });
  });
  obs.observe(document.querySelector('.page-content') || document.body, {
    childList: true, subtree: true,
  });
}

// ── V3 Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupReducedMotion();
  setupPageVisibility();
  patchLandmarks();
  setupLoadAnnouncement();
  enhancePDFButtons();
  patchDocumentTitle();
  setupTabCounter();

  setTimeout(() => {
    setupPanelFocusOnKeyNav();
    setupAlimentoMacroLabels();
  }, 900);
});

// Extende API pública com exports V3
Object.assign(window._planoPacienteExtras || (window._planoPacienteExtras = {}), {
  patchDocumentTitle,
  setupTabCounter,
});

// ═══ POLIMENTO V4 ═══
// V4 — 10 melhorias de performance:
//      rAF throttle, debounce, DOM cache, IntersectionObserver
//      (macros + sticky bar), requestIdleCallback, CSS contain,
//      PDF prefetch, debounced MutationObserver

// ── 28. Utilitário: rAF-throttle para handlers de scroll ─────
function makeRAFThrottle(fn) {
  let ticking = false;
  return function (...args) {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { fn.apply(this, args); ticking = false; });
  };
}

// ── 29. Utilitário: debounce simples ─────────────────────────
function ppDebounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ── 30. Cache de elementos DOM frequentes ────────────────────
const ppCache = (() => {
  const m = new Map();
  return {
    id:    id  => { if (!m.has(id))  m.set(id,  document.getElementById(id));  return m.get(id); },
    qs:    sel => { if (!m.has(sel)) m.set(sel, document.querySelector(sel));   return m.get(sel); },
    clear: ()  => m.clear(),
  };
})();

// ── 31. Upgrade scroll → rAF-throttled (header compact) ──────
function upgradeScrollToRAF() {
  const header = ppCache.qs('.page-header');
  if (!header || header._ppRAF) return;
  header._ppRAF = true;
  let compact = header.classList.contains('pp-header-compact');

  window.addEventListener('scroll', makeRAFThrottle(() => {
    const now = window.scrollY > 60;
    if (now !== compact) {
      compact = now;
      header.classList.toggle('pp-header-compact', compact);
    }
  }), { passive: true });
}

// ── 32. IntersectionObserver: dispara macro bars quando visível ──
function setupMacroBarIO() {
  const grid = ppCache.id('macro-grid');
  if (!grid || grid._ppMacroIO || !('IntersectionObserver' in window)) return;
  grid._ppMacroIO = true;

  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('.pp-macro-bar-fill').forEach(fill => {
        if (!fill.style.width || fill.style.width === '0' || fill.style.width === '0%') {
          window._planoPacienteExtras?.injetarMacroBars?.();
        }
      });
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }).observe(grid);
}

// ── 33. IntersectionObserver: sticky bar inteligente ─────────
function setupStickyBarIO() {
  const bar  = ppCache.id('pp-sticky-macro');
  const grid = ppCache.id('macro-grid');
  if (!bar || !grid || !('IntersectionObserver' in window)) return;
  if (grid._ppStickyIO) return;
  grid._ppStickyIO = true;

  new IntersectionObserver(entries => {
    entries.forEach(e => {
      bar.classList.toggle('pp-sticky-hidden-io', e.isIntersecting);
    });
  }, { threshold: 0 }).observe(grid);
}

// ── 34. requestIdleCallback para tarefas de baixa prioridade ──
function scheduleIdleTasks() {
  const idle = window.requestIdleCallback
    ? fn => requestIdleCallback(fn, { timeout: 2000 })
    : fn => setTimeout(fn, 100);

  idle(() => window._planoPacienteExtras?.setupTabCounter?.());
  idle(() => window._planoPacienteExtras?.patchDocumentTitle?.());
}

// ── 35. CSS contain nas refeição-blocks inativas ─────────────
function applyContainToInactivePanels() {
  const cnt = ppCache.qs('.page-content') || document.body;

  const apply = () => {
    document.querySelectorAll('.refeicao-block').forEach(b => {
      b.style.contain = b.classList.contains('active') ? '' : 'layout style';
    });
  };

  apply();

  new MutationObserver(ppDebounce(muts => {
    if (muts.some(m => m.target.classList?.contains('refeicao-block'))) apply();
  }, 60)).observe(cnt, { attributes: true, attributeFilter: ['class'], subtree: true });
}

// ── 36. Prefetch de scripts PDF ao passar o mouse ─────────────
function setupPDFPrefetch() {
  let done = false;
  ['pp-btn-ver-pdf', 'pp-btn-baixar-pdf'].forEach(id => {
    const btn = ppCache.id(id);
    if (!btn) return;
    btn.addEventListener('pointerenter', () => {
      if (done) return;
      done = true;
      [...document.querySelectorAll('script[src]')]
        .map(s => s.src)
        .filter(s => /pdf|print/i.test(s))
        .forEach(href => {
          if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
          const lnk = document.createElement('link');
          lnk.rel = 'prefetch';
          lnk.href = href;
          document.head.appendChild(lnk);
        });
    }, { once: true, passive: true });
  });
}

// ── 37. Debounce no MutationObserver de macro bars ────────────
function upgradeWatchMacroBarsDebounce() {
  const grid = ppCache.id('macro-grid');
  if (!grid || grid._ppDebounceObs) return;
  grid._ppDebounceObs = true;

  const debouncedInject = ppDebounce(
    () => window._planoPacienteExtras?.injetarMacroBars?.(),
    150
  );
  new MutationObserver(debouncedInject).observe(grid, {
    childList: true, subtree: true, characterData: true,
  });
}

// ── V4 Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  upgradeScrollToRAF();
  setupPDFPrefetch();

  setTimeout(() => {
    setupMacroBarIO();
    setupStickyBarIO();
    applyContainToInactivePanels();
  }, 900);

  setTimeout(() => {
    scheduleIdleTasks();
    upgradeWatchMacroBarsDebounce();
  }, 2600);
});

Object.assign(window._planoPacienteExtras || (window._planoPacienteExtras = {}), {
  makeRAFThrottle,
  ppDebounce,
  ppCache,
});

// ═══ POLIMENTO V5 ═══
// V5 — 10 melhorias com Web APIs modernas:
//      Wake Lock, Web Share, Vibration, offline banner,
//      copiar refeição, saveData, PWA install, Storage Estimate,
//      Device Memory, welcome-back após ausência longa

// ── 38. Wake Lock API — mantém tela acesa durante leitura ────
async function setupWakeLock() {
  if (!('wakeLock' in navigator)) return;
  let lock = null;
  const acquire = async () => {
    try { lock = await navigator.wakeLock.request('screen'); } catch (_) {}
  };
  const release = () => { lock?.release(); lock = null; };
  acquire();
  document.addEventListener('visibilitychange', () =>
    document.visibilityState === 'visible' ? acquire() : release()
  );
  window.addEventListener('pagehide', release, { once: true });
}

// ── 39. Web Share API — botão compartilhar com fallback ──────
function setupWebShare() {
  if (!navigator.share && !navigator.clipboard) return;
  const ppActions = document.getElementById('pp-pdf-actions');
  if (!ppActions) return;

  const buildBtn = () => {
    if (document.getElementById('pp-btn-share')) return;
    const btn = document.createElement('button');
    btn.id = 'pp-btn-share';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Compartilhar plano alimentar');
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Compartilhar';
    btn.addEventListener('click', async () => {
      const titulo = document.getElementById('plano-titulo')?.textContent?.trim() || 'Plano Alimentar';
      const nome   = document.getElementById('paciente-nome')?.textContent?.trim() || '';
      const kcal   = document.getElementById('m-kcal')?.textContent?.trim() || '—';
      const ptn    = document.getElementById('m-ptn')?.textContent?.trim() || '—';
      const text   = `${titulo}${nome ? ' — ' + nome : ''}\n📊 ${kcal} kcal · ${ptn}g proteína/dia\n${window.location.href}`;
      const shareData = { title: titulo, text, url: window.location.href };
      if (navigator.canShare?.(shareData)) {
        try { await navigator.share(shareData); return; } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text).catch(() => {});
        window._planoPacienteExtras?.showToast?.('Link copiado!');
      }
    });
    ppActions.prepend(btn);
  };

  if (ppActions.style.display !== 'none') {
    buildBtn();
  } else {
    const obs = new MutationObserver(() => {
      if (ppActions.style.display !== 'none') { obs.disconnect(); buildBtn(); }
    });
    obs.observe(ppActions, { attributes: true, attributeFilter: ['style'] });
  }
}

// ── 40. Vibration API — feedback tátil ───────────────────────
function setupVibration() {
  if (!navigator.vibrate) return;
  document.getElementById('tabs-wrap')?.addEventListener('click', e => {
    if (e.target.closest('.tab')) navigator.vibrate(12);
  }, { passive: true });
  document.addEventListener('dblclick', e => {
    if (e.target.closest('.alimento-nome')) navigator.vibrate([20, 30, 20]);
  }, { passive: true });
}

// ── 41. Offline banner ────────────────────────────────────────
function setupOfflineBanner() {
  if (document.getElementById('pp-offline-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'pp-offline-banner';
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'assertive');
  banner.textContent = 'Você está offline — o plano exibido pode estar desatualizado.';
  document.body.appendChild(banner);

  const toggle = online => banner.classList.toggle('pp-offline-show', !online);
  toggle(navigator.onLine);
  window.addEventListener('online',  () => toggle(true));
  window.addEventListener('offline', () => toggle(false));
}

// ── 42. Botão copiar lista de alimentos da refeição ativa ────
function setupCopyMealList() {
  const injectButtons = () => {
    document.querySelectorAll('.refeicao-block:not([data-pp-copy-btn])').forEach(block => {
      const header = block.querySelector('.ref-header');
      if (!header) return;
      block.dataset.ppCopyBtn = '1';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pp-copy-meal-btn';
      btn.dataset.ppCopyMeal = '1';
      btn.setAttribute('aria-label', 'Copiar lista de alimentos desta refeição');
      btn.title = 'Copiar alimentos';
      btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      header.appendChild(btn);
    });
  };

  document.addEventListener('click', e => {
    if (!e.target.closest('[data-pp-copy-meal]') || !navigator.clipboard) return;
    const block = document.querySelector('.refeicao-block.active');
    if (!block) return;
    const title = block.querySelector('.ref-title')?.textContent?.trim() || '';
    const lines = [...block.querySelectorAll('.alimento-row')].map(row => {
      const nome   = row.querySelector('.alimento-nome')?.textContent?.trim() || '';
      const medida = row.querySelector('.alimento-medida')?.textContent?.trim() || '';
      return nome + (medida ? ' — ' + medida : '');
    }).filter(Boolean);
    if (!lines.length) return;
    navigator.clipboard.writeText((title ? title + '\n' : '') + lines.join('\n'))
      .then(() => {
        window._planoPacienteExtras?.showToast?.('Lista copiada!');
        if (navigator.vibrate) navigator.vibrate(30);
      }).catch(() => {});
  });

  const ppD = window._planoPacienteExtras?.ppDebounce;
  const handler = ppD ? ppD(injectButtons, 200) : injectButtons;
  new MutationObserver(handler).observe(
    document.querySelector('.page-content') || document.body,
    { childList: true, subtree: true }
  );
  setTimeout(injectButtons, 2500);
}

// ── 43. Network Information — saveData e conexão lenta ───────
function setupNetworkAdaptation() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return;
  const applyAdaptation = () => {
    const slow = conn.saveData || ['slow-2g', '2g'].includes(conn.effectiveType);
    document.body.classList.toggle('pp-save-data', !!slow);
  };
  applyAdaptation();
  conn.addEventListener('change', applyAdaptation);
}

// ── 44. beforeinstallprompt — botão de instalação PWA ────────
function setupPWAInstall() {
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (document.getElementById('pp-install-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'pp-install-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Instalar ERG 360 como aplicativo');
    btn.title = 'Instalar ERG 360';
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v13"/><path d="m5 9 7 6 7-6"/><path d="M5 20h14"/></svg>Instalar';
    btn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted') btn.remove();
    });
    document.querySelector('.page-header')?.appendChild(btn);
  });
}

// ── 45. Storage Estimate — avisa se armazenamento quase cheio ─
async function checkStorageQuota() {
  if (!navigator.storage?.estimate) return;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (quota && usage / quota > 0.85) {
      window._planoPacienteExtras?.showToast?.(
        'Armazenamento local quase cheio — libere espaço no navegador.'
      );
    }
  } catch (_) {}
}

// ── 46. Device Memory API — simplifica UI em <1 GB RAM ───────
function setupDeviceMemoryAdaptation() {
  const mem = navigator.deviceMemory;
  if (mem && mem < 1) document.body.classList.add('pp-low-memory');
}

// ── 47. Visibility: anuncia retorno após ≥10min de ausência ──
function setupVisibilityWelcomeBack() {
  let hiddenAt = null;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
    } else if (hiddenAt) {
      const away = Date.now() - hiddenAt;
      hiddenAt = null;
      if (away >= 10 * 60 * 1000) {
        const live  = document.getElementById('pp-aria-live');
        const title = document.getElementById('plano-titulo')?.textContent?.trim() || 'plano alimentar';
        if (live) live.textContent = `Bem-vindo de volta ao ${title}.`;
      }
    }
  });
}

// ── V5 Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupOfflineBanner();
  setupVibration();
  setupNetworkAdaptation();
  setupDeviceMemoryAdaptation();
  setupPWAInstall();
  setupVisibilityWelcomeBack();

  setTimeout(() => {
    setupWebShare();
    setupCopyMealList();
  }, 1000);

  const idle = window.requestIdleCallback
    ? fn => requestIdleCallback(fn, { timeout: 3000 })
    : fn => setTimeout(fn, 200);
  idle(setupWakeLock);
  idle(checkStorageQuota);
});

Object.assign(window._planoPacienteExtras || (window._planoPacienteExtras = {}), {
  setupWebShare,
  setupOfflineBanner,
  checkStorageQuota,
});
