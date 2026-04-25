// ============================================================
// FORM-GUARD — proteção universal de formulários clínicos
// ────────────────────────────────────────────────────────────
// Fornece:
//   • Rastreio de alterações (dirty) com indicador visual
//   • Contador de campos obrigatórios vazios em tempo real
//   • Aviso antes de sair com alterações não salvas (beforeunload)
//   • API simples: markSaved() após um save bem-sucedido
//
// Uso:
//   import { installFormGuard } from './form-guard.js';
//   const guard = installFormGuard({
//     form: document.getElementById('anamnese-form'),
//     label: 'Anamnese',
//     onSaveSuccess: () => guard.markSaved(),
//   });
//
// O módulo injeta um "chip" flutuante no canto inferior direito
// mostrando o estado atual: tudo preenchido / alterações pendentes /
// N campos obrigatórios vazios.
// ============================================================

const FIELD_SELECTOR = 'input:not([type=hidden]):not([type=file]):not([type=button]):not([type=submit]), textarea, select';

/**
 * Instala o guardião em um formulário.
 * @param {Object} opts
 * @param {HTMLElement} opts.form        — elemento <form> (obrigatório)
 * @param {string}      [opts.label]     — texto do chip (ex.: "Anamnese")
 * @param {boolean}     [opts.warnOnExit=true] — ativar beforeunload
 * @param {boolean}     [opts.showChip=true]   — ativar chip visual
 * @returns {{isDirty:()=>boolean, markSaved:()=>void, requiredMissing:()=>number, destroy:()=>void, refresh:()=>void}}
 */
export function installFormGuard(opts) {
  const {
    form,
    label = 'Formulário',
    warnOnExit = true,
    showChip = true,
  } = opts || {};

  if (!form) {
    console.warn('[form-guard] form não fornecido; abortando.');
    return { isDirty: () => false, markSaved: () => {}, requiredMissing: () => 0, destroy: () => {}, refresh: () => {} };
  }

  let dirty = false;
  let snapshot = serialize(form);
  let chip = null;

  // ── Chip flutuante ──────────────────────────────────────
  if (showChip) {
    chip = ensureChip();
  }

  // ── Listeners de alteração ──────────────────────────────
  const onInput = () => {
    const current = serialize(form);
    dirty = current !== snapshot;
    render();
  };

  form.addEventListener('input',  onInput);
  form.addEventListener('change', onInput);

  // ── beforeunload ────────────────────────────────────────
  const onBeforeUnload = (e) => {
    if (!dirty) return;
    e.preventDefault();
    // Chrome ignora o texto, mas precisa atribuir algo
    e.returnValue = 'Você tem alterações não salvas. Tem certeza que quer sair?';
    return e.returnValue;
  };

  if (warnOnExit) {
    window.addEventListener('beforeunload', onBeforeUnload);
  }

  // ── Primeiro render ─────────────────────────────────────
  render();

  // ── API pública ─────────────────────────────────────────
  function markSaved() {
    snapshot = serialize(form);
    dirty = false;
    render();
    // Feedback visual curto
    if (chip) {
      chip.classList.add('fg-pulse');
      setTimeout(() => chip && chip.classList.remove('fg-pulse'), 900);
    }
  }

  function requiredMissing() {
    return countRequiredEmpty(form);
  }

  function isDirty() {
    return dirty;
  }

  function destroy() {
    form.removeEventListener('input', onInput);
    form.removeEventListener('change', onInput);
    if (warnOnExit) window.removeEventListener('beforeunload', onBeforeUnload);
    if (chip && chip.parentNode) chip.parentNode.removeChild(chip);
  }

  function refresh() {
    render();
  }

  // ── Render do chip ──────────────────────────────────────
  function render() {
    if (!chip) return;
    const missing = countRequiredEmpty(form);

    let state, text, icon;
    if (missing > 0 && dirty) {
      state = 'warn';
      icon  = '●';
      text  = `${missing} campo${missing > 1 ? 's' : ''} obrigatório${missing > 1 ? 's' : ''} · não salvo`;
    } else if (missing > 0) {
      state = 'warn';
      icon  = '○';
      text  = `${missing} campo${missing > 1 ? 's' : ''} obrigatório${missing > 1 ? 's' : ''} vazio${missing > 1 ? 's' : ''}`;
    } else if (dirty) {
      state = 'dirty';
      icon  = '●';
      text  = 'Alterações não salvas';
    } else {
      state = 'ok';
      icon  = '✓';
      text  = `${label} · tudo preenchido`;
    }

    chip.setAttribute('data-fg-state', state);
    chip.innerHTML = `
      <span class="fg-icon">${icon}</span>
      <span class="fg-text">${text}</span>
      ${missing > 0 ? `<button type="button" class="fg-jump" aria-label="Ir para o primeiro campo vazio">Ver</button>` : ''}
    `;

    const jumpBtn = chip.querySelector('.fg-jump');
    if (jumpBtn) jumpBtn.addEventListener('click', jumpToFirstRequired);
  }

  function jumpToFirstRequired() {
    const first = findFirstEmptyRequired(form);
    if (!first) return;
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Destaque curto
    first.classList.add('fg-highlight');
    setTimeout(() => first.classList.remove('fg-highlight'), 1800);
    try { first.focus({ preventScroll: true }); } catch {}
  }

  return { isDirty, markSaved, requiredMissing, destroy, refresh };
}

// ── Helpers ───────────────────────────────────────────────

function serialize(form) {
  const fields = form.querySelectorAll(FIELD_SELECTOR);
  const parts = [];
  fields.forEach(el => {
    if (el.type === 'checkbox' || el.type === 'radio') {
      parts.push(`${el.name || el.id}=${el.checked ? '1' : '0'}`);
    } else {
      parts.push(`${el.name || el.id}=${(el.value ?? '').trim()}`);
    }
  });
  return parts.join('|');
}

function countRequiredEmpty(form) {
  const req = form.querySelectorAll(`${FIELD_SELECTOR}[required]`);
  let count = 0;
  req.forEach(el => {
    if (el.offsetParent === null && el.type !== 'hidden') return; // invisível = não conta
    const v = (el.value ?? '').trim();
    if (!v) count++;
  });
  return count;
}

function findFirstEmptyRequired(form) {
  const req = form.querySelectorAll(`${FIELD_SELECTOR}[required]`);
  for (const el of req) {
    if (el.offsetParent === null && el.type !== 'hidden') continue;
    if (!(el.value ?? '').trim()) return el;
  }
  return null;
}

// Garante que existe UM chip global na página (permite múltiplos
// form-guards sem criar várias UIs). O último que renderizar domina.
function ensureChip() {
  let el = document.getElementById('form-guard-chip');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'form-guard-chip';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);

  // Injeta CSS uma única vez
  if (!document.getElementById('form-guard-style')) {
    const style = document.createElement('style');
    style.id = 'form-guard-style';
    style.textContent = FG_CSS;
    document.head.appendChild(style);
  }

  return el;
}

const FG_CSS = `
#form-guard-chip {
  position: fixed;
  right: 18px;
  bottom: 18px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  border: 1px solid var(--detail, #c4a06c);
  background: var(--bg-primary, #fff);
  color: var(--text, #2c2218);
  box-shadow: 0 4px 18px rgba(44,34,24,0.12);
  z-index: 950;
  transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
  max-width: calc(100vw - 36px);
}
#form-guard-chip[data-fg-state="ok"] {
  color: #3D6B4F;
  border-color: rgba(61,107,79,0.35);
  background: rgba(61,107,79,0.06);
}
#form-guard-chip[data-fg-state="dirty"] {
  color: #B8860B;
  border-color: rgba(184,134,11,0.4);
  background: rgba(184,134,11,0.06);
}
#form-guard-chip[data-fg-state="warn"] {
  color: #7A2E2E;
  border-color: rgba(122,46,46,0.4);
  background: rgba(122,46,46,0.06);
}
#form-guard-chip .fg-icon {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1;
}
#form-guard-chip .fg-jump {
  background: transparent;
  border: 1px solid currentColor;
  color: inherit;
  font-family: inherit;
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 3px 8px;
  cursor: pointer;
  border-radius: 0;
  margin-left: 4px;
  transition: opacity 0.15s;
}
#form-guard-chip .fg-jump:hover { opacity: 0.75; }

#form-guard-chip.fg-pulse {
  animation: fg-pulse 0.8s ease-out;
}
@keyframes fg-pulse {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}

/* Destaque quando form-guard pula para campo vazio */
.fg-highlight {
  animation: fg-hl 1.6s ease-out;
  outline: 2px solid rgba(184,134,11,0.6) !important;
  outline-offset: 2px;
}
@keyframes fg-hl {
  0%   { outline-color: rgba(184,134,11,0.9); }
  100% { outline-color: rgba(184,134,11,0); }
}

/* Em mobile, encolhe um pouco */
@media (max-width: 640px) {
  #form-guard-chip {
    right: 10px;
    bottom: 10px;
    padding: 8px 12px;
    font-size: 0.66rem;
  }
}

/* Respeita dark mode */
body.dark-mode #form-guard-chip {
  background: rgba(30, 24, 18, 0.96);
  box-shadow: 0 4px 18px rgba(0,0,0,0.4);
}
`;
