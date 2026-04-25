// ============================================================
// sparkchart.js — gráfico de linha minimalista em SVG puro
// ────────────────────────────────────────────────────────────
// Zero dependências. Desenha série temporal com eixo Y automático,
// marcadores nos pontos, rótulos de data no X e valor no Y.
//
// API:
//   renderSparkChart(container, {
//     series: [{ label:'Peso', color:'#7a5d3b', points:[{x:'2026-01-10', y:98.4}, …] }],
//     height: 160,
//     unit:   'kg',
//   });
// ============================================================

export function renderSparkChart(container, opts) {
  const {
    series = [],
    height = 180,
    unit   = '',
    showGrid = true,
  } = opts || {};

  if (!container) return;

  // Filtra séries vazias
  const valid = series.filter(s => s.points && s.points.length > 0);
  if (!valid.length) {
    container.innerHTML = `<p class="spark-empty">Sem dados suficientes para plotar gráfico.</p>`;
    return;
  }

  const width   = container.clientWidth || 600;
  const padL    = 44, padR = 14, padT = 18, padB = 28;
  const innerW  = width  - padL - padR;
  const innerH  = height - padT - padB;

  // Coleta todos os x (datas ISO) e y para escalas comuns
  const allX = [...new Set(valid.flatMap(s => s.points.map(p => p.x)))].sort();
  const allY = valid.flatMap(s => s.points.map(p => p.y)).filter(y => y != null && !isNaN(y));

  if (!allY.length) {
    container.innerHTML = `<p class="spark-empty">Sem dados numéricos para plotar.</p>`;
    return;
  }

  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  const yPad = (yMax - yMin) * 0.15 || (yMax * 0.05) || 1;
  const y0   = yMin - yPad;
  const y1   = yMax + yPad;

  // Mapeamento x: proporcional à posição no allX
  const xCount = allX.length;
  const xIdx   = Object.fromEntries(allX.map((x, i) => [x, i]));
  const xScale = (x) => padL + (xCount > 1 ? (xIdx[x] / (xCount - 1)) * innerW : innerW / 2);
  const yScale = (y) => padT + innerH - ((y - y0) / (y1 - y0)) * innerH;

  // Ticks do Y (3 linhas)
  const yTicks = [y0, (y0 + y1) / 2, y1];
  const fmtY   = (y) => {
    if (Math.abs(y) >= 100) return y.toFixed(0);
    if (Math.abs(y) >= 10)  return y.toFixed(1);
    return y.toFixed(2);
  };
  const fmtDate = (iso) => {
    try {
      const d = new Date(iso + 'T12:00:00');
      return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
    } catch { return iso; }
  };

  const grid = showGrid ? yTicks.map(t => `
    <line x1="${padL}" x2="${width - padR}" y1="${yScale(t)}" y2="${yScale(t)}"
      stroke="rgba(196,160,108,0.15)" stroke-dasharray="2,3"/>
    <text x="${padL - 6}" y="${yScale(t) + 3}" text-anchor="end"
      font-family="DM Sans, sans-serif" font-size="9" fill="#8c7a5f">${fmtY(t)}</text>
  `).join('') : '';

  const xLabels = allX.map((x, i) => {
    // Em datasets densos, pula rótulos
    const stride = Math.max(1, Math.floor(xCount / 6));
    if (i % stride !== 0 && i !== xCount - 1) return '';
    return `<text x="${xScale(x)}" y="${height - 8}" text-anchor="middle"
      font-family="DM Sans, sans-serif" font-size="9" fill="#8c7a5f">${fmtDate(x)}</text>`;
  }).join('');

  const lines = valid.map(s => {
    const pts = s.points.filter(p => p.y != null && !isNaN(p.y))
      .sort((a, b) => a.x.localeCompare(b.x));
    if (!pts.length) return '';

    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x).toFixed(1)} ${yScale(p.y).toFixed(1)}`).join(' ');
    const color = s.color || '#c4a06c';

    const dots = pts.map(p => `
      <circle cx="${xScale(p.x).toFixed(1)}" cy="${yScale(p.y).toFixed(1)}" r="3"
        fill="#fff" stroke="${color}" stroke-width="1.5">
        <title>${fmtDate(p.x)}: ${fmtY(p.y)} ${unit}</title>
      </circle>
    `).join('');

    return `
      <path d="${d}" stroke="${color}" stroke-width="1.8" fill="none"
        stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
    `;
  }).join('');

  // Legenda
  const legend = valid.map(s => `
    <span class="spark-legend-item">
      <span class="spark-legend-dot" style="background:${s.color || '#c4a06c'}"></span>
      ${s.label}
    </span>`).join('');

  container.innerHTML = `
    <div class="sparkchart-wrap">
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}"
        role="img" aria-label="Gráfico de evolução">
        ${grid}
        ${lines}
        ${xLabels}
      </svg>
      <div class="spark-legend">${legend}${unit ? `<span class="spark-unit">em ${unit}</span>` : ''}</div>
    </div>
  `;

  // Injeta CSS se ainda não existir
  if (!document.getElementById('sparkchart-style')) {
    const style = document.createElement('style');
    style.id = 'sparkchart-style';
    style.textContent = `
      .sparkchart-wrap { width: 100%; }
      .spark-empty {
        font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
        color: var(--text-light, #8c7a5f); font-style: italic;
        padding: 12px; text-align: center;
      }
      .spark-legend {
        display: flex; flex-wrap: wrap; gap: 14px; margin-top: 6px;
        font-family: 'DM Sans', sans-serif; font-size: 0.72rem;
        color: var(--text-light, #5a4d3a);
      }
      .spark-legend-item { display: inline-flex; align-items: center; gap: 5px; }
      .spark-legend-dot {
        display: inline-block; width: 10px; height: 3px;
        border-radius: 2px;
      }
      .spark-unit { color: var(--subtitle, #8c7a5f); font-style: italic; }
    `;
    document.head.appendChild(style);
  }
}
