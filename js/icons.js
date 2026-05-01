// ============================================================
// icons.js — Biblioteca de ícones SVG inline (estilo feather/lucide)
// ============================================================
// Substitui emojis por ícones limpos, em linha com o design ERG.
// Uso:
//    import { icon } from './icons.js';
//    icon('check')                         → SVG 14x14 stroke currentColor
//    icon('alert', { size: 16 })           → 16x16
//    icon('eye',   { color: '#2D6A56' })   → cor explícita
//    icon('check', { className: 'meu-icone' })
//
// Em template strings:  ${icon('check')}
// ============================================================

const SVG = (path, opts = {}) => {
  const size = opts.size || 14;
  const color = opts.color || 'currentColor';
  const cls = opts.className ? ` class="${opts.className}"` : '';
  const stroke = opts.stroke != null ? opts.stroke : 1.6;
  const style = opts.style ? ` style="${opts.style}"` : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"` +
    `${cls}${style} aria-hidden="true">${path}</svg>`;
};

// ── Catálogo de ícones (paths SVG do feather/lucide adaptados) ─
const ICONS = {
  // ── Status / feedback ──
  'check':         '<polyline points="20 6 9 17 4 12"/>',
  'check-circle':  '<circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/>',
  'check-double':  '<polyline points="20 6 9 17 4 12"/><polyline points="22 12 13 21 11 19"/>',
  'x':             '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  'x-circle':      '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  'minus':         '<line x1="5" y1="12" x2="19" y2="12"/>',
  'plus':          '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  'alert':         '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  'alert-circle':  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  'info':          '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  'help':          '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',

  // ── Setas / direções ──
  'arrow-up':      '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  'arrow-down':    '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  'arrow-right':   '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  'arrow-left':    '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  'trend-up':      '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  'trend-down':    '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
  'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
  'chevron-left':  '<polyline points="15 18 9 12 15 6"/>',
  'chevron-up':    '<polyline points="18 15 12 9 6 15"/>',
  'chevron-down':  '<polyline points="6 9 12 15 18 9"/>',

  // ── Visualização / interação ──
  'eye':           '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off':       '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  'edit':          '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  'trash':         '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  'search':        '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  'filter':        '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  'download':      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  'refresh':       '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  'save':          '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',

  // ── Status indicators (pontos coloridos pra status) ──
  'dot':           '<circle cx="12" cy="12" r="4"/>',
  'dot-filled':    '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
  'circle':        '<circle cx="12" cy="12" r="10"/>',
  'circle-filled': '<circle cx="12" cy="12" r="10" fill="currentColor"/>',

  // ── Saúde / nutrição ──
  'utensils':      '<path d="M3 2v7c0 1.1.9 2 2 2h2v11"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/>',
  'apple':         '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06z"/><path d="M10 2c1 .5 2 2 2 5"/>',
  'leaf':          '<path d="M6 3 21 3v15a3 3 0 0 1-3 3 3 3 0 0 1-3-3v-1c0-1.66 1.34-3 3-3"/><path d="M3 6c0 8.94 5.06 14 14 14"/>',
  'coffee':        '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
  'droplet':       '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  'flame':         '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  'heart':         '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  'pulse':         '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',

  // ── Pessoa / atividade ──
  'user':          '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'user-check':    '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>',
  'activity':      '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  'running':       '<circle cx="13" cy="4" r="2"/><path d="M4 22 7 17 11 13 14 16 17 14 19 11"/><path d="M11 13 9 6 13 5 17 8"/>',
  'flex':          '<path d="M4 12h6l2-3 2 3h6"/><path d="M14 9V5a2 2 0 1 0-4 0v4"/><path d="M5 19l3-7"/><path d="M19 19l-3-7"/>',
  'female':        '<circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="22"/><line x1="9" y1="19" x2="15" y2="19"/>',
  'male':          '<circle cx="10" cy="14" r="5"/><line x1="14" y1="10" x2="20" y2="4"/><polyline points="14 4 20 4 20 10"/>',

  // ── Tempo ──
  'clock':         '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'calendar':      '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  'sunrise':       '<path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="8 6 12 2 16 6"/>',
  'sun':           '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  'moon':          '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  'gift':          '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',

  // ── Análise / dados ──
  'bar-chart':     '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  'pie-chart':     '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  'line-chart':    '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/>',
  'target':        '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  'lightbulb':     '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>',
  'zap':           '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'star':          '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'shield':        '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  'shield-check':  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',

  // ── Documentos / texto ──
  'file':          '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  'file-text':     '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
  'clipboard':     '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
  'list':          '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  'check-list':    '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',

  // ── Configurações / sistema ──
  'settings':      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  'send':          '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  'link':          '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  'external':      '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
};

// Ícone por nome com opções
export function icon(name, opts = {}) {
  const path = ICONS[name];
  if (!path) {
    console.warn(`[icons] não encontrado: "${name}"`);
    return '';
  }
  return SVG(path, opts);
}

// Atalho: ícone com cor (verde / vermelho / amarelo / azul)
export function statusDot(color = 'gray', opts = {}) {
  const colors = {
    'verde':    '#3D6B4F',
    'green':    '#3D6B4F',
    'amarelo':  '#B8860B',
    'yellow':   '#B8860B',
    'laranja':  '#C26B3F',
    'orange':   '#C26B3F',
    'vermelho': '#A04030',
    'red':      '#A04030',
    'azul':     '#2D6A56',
    'blue':     '#2D6A56',
    'gray':     '#999',
  };
  return SVG(ICONS['dot-filled'], { ...opts, color: colors[color] || color });
}

// Mapa de substituição emoji → ícone (auto)
export const EMOJI_TO_ICON = {
  '✓': 'check',
  '✔': 'check',
  '✗': 'x',
  '✕': 'x',
  '❌': 'x-circle',
  '✅': 'check-circle',
  '⚠': 'alert',
  '⚠️': 'alert',
  '⚡': 'zap',
  '👁': 'eye',
  '👁️': 'eye',
  '📊': 'bar-chart',
  '💡': 'lightbulb',
  '🍽': 'utensils',
  '🍽️': 'utensils',
  '🏃': 'running',
  '📅': 'calendar',
  '🌙': 'moon',
  '😴': 'moon',
  '💪': 'flex',
  '💧': 'droplet',
  '⭐': 'star',
  '🎂': 'gift',
  '📋': 'clipboard',
  '🌿': 'leaf',
  '🎯': 'target',
  '⏰': 'clock',
  '🌅': 'sunrise',
  '☕': 'coffee',
  '🍎': 'apple',
  '⚖': 'pulse',
  '⚖️': 'pulse',
  '🔥': 'flame',
  '❤': 'heart',
  '❤️': 'heart',
  '⬤': 'dot-filled',
  '•': 'dot-filled',
  '→': 'arrow-right',
  '←': 'arrow-left',
  '↑': 'arrow-up',
  '↓': 'arrow-down',
  '▲': 'trend-up',
  '▼': 'trend-down',
  '🟢': 'dot-filled',  // verde
  '🟡': 'dot-filled',  // amarelo
  '🟠': 'dot-filled',  // laranja
  '🔴': 'dot-filled',  // vermelho
  '♀': 'female',
  '♂': 'male',
};

// Substitui emojis em uma string HTML com os SVGs correspondentes
export function replaceEmojis(html, opts = {}) {
  let out = html;
  for (const [emoji, name] of Object.entries(EMOJI_TO_ICON)) {
    if (out.includes(emoji)) {
      out = out.split(emoji).join(icon(name, opts));
    }
  }
  return out;
}

// Expõe globalmente (útil pra arquivos não-modulares)
window._icon = icon;
window._statusDot = statusDot;
