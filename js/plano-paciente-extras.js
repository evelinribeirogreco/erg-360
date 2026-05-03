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
