// ============================================================
// anamnese-rastreamento.js — UI do Rastreamento Metabólico + Teia
// ============================================================
// Renderiza dois componentes:
//   1. Rastreamento Metabólico — questionário 0-4 por 14 sistemas
//      • Score em tempo real (total + por sistema)
//      • Interpretação clínica colorida
//      • Mini radar chart por sistema
//   2. Teia de Inter-relações
//      • Modal de seleção de sintomas (com busca)
//      • Áreas afetadas calculadas automaticamente
//      • Deficiências e excessos de nutrientes (gradiente visual)
//
// Estado é exposto via window._rastreamentoState e _teiaState
// para serem coletados no buildPayload da anamnese.
// ============================================================

import {
  RASTREAMENTO_SISTEMAS, SINTOMAS, AREAS_TEIA, NUTRIENTES,
  pontosSistema, pontosTotal, interpretarScore,
  calcularAreasTeia, calcularDeficiencias, calcularExcessos,
} from './sintomas-catalogo.js';

// Estado global (acessível pelo anamnese.js no buildPayload)
window._rastreamentoState = {};       // { cabeca: { dor_cabeca: 2, ... }, ... }
window._teiaState = {
  sintomas: [],                       // ['acne', 'caimbra', 'fadiga']
  lugaresAfetados: [],                // ['estrutura', 'energia']
  deficiencias: {},                   // { magnesio: { peso, probabilidade }, ... }
  excessos: {},
};

// ════════════════════════════════════════════════════════════
// COMPONENTE 1 — RASTREAMENTO METABÓLICO
// ════════════════════════════════════════════════════════════

export function renderRastreamento(mountEl) {
  if (!mountEl) return;
  mountEl.innerHTML = `
    <div style="margin-bottom:18px;padding:14px 18px;background:rgba(76,184,160,0.05);border-left:3px solid #2D6A56;font-family:'DM Sans',sans-serif;font-size:0.78rem;color:#1F4D3E;line-height:1.6;">
      <strong>Avalie cada sintoma</strong> com base no perfil de saúde típica nos últimos 30 dias.
      <ul style="margin:8px 0 0 18px;padding:0;list-style:disc;font-size:0.74rem;">
        <li><strong>0</strong> — Nunca ou quase nunca teve o sintoma</li>
        <li><strong>1</strong> — Ocasionalmente teve, efeito não foi severo</li>
        <li><strong>2</strong> — Ocasionalmente teve, efeito foi severo</li>
        <li><strong>3</strong> — Frequentemente teve, efeito não foi severo</li>
        <li><strong>4</strong> — Frequentemente teve, efeito foi severo</li>
      </ul>
    </div>

    <div id="rast-sistemas"></div>

    <div id="rast-resultado" style="margin-top:24px;padding:18px;border:1px solid var(--detail);background:var(--bg-secondary);">
      <div style="display:flex;align-items:baseline;gap:14px;margin-bottom:12px;flex-wrap:wrap;">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--subtitle);">Resultado do rastreamento</p>
        <p style="font-family:'Cormorant Garamond',serif;font-weight:300;font-size:2rem;color:var(--text);" id="rast-total">0</p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.7rem;color:var(--text-light);">pontos totais</p>
      </div>
      <p id="rast-interpretacao" style="font-family:'DM Sans',sans-serif;font-size:0.85rem;font-weight:500;padding:10px 14px;border-radius:3px;background:#fff;border-left:3px solid #ccc;color:#666;">Preencha o questionário acima.</p>

      <div style="margin-top:16px;">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--subtitle);margin-bottom:10px;">Score por sistema</p>
        <div id="rast-radar" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;"></div>
      </div>
    </div>
  `;

  const sistemasWrap = mountEl.querySelector('#rast-sistemas');
  for (const sistema of RASTREAMENTO_SISTEMAS) {
    const block = document.createElement('section');
    block.style.cssText = 'margin-bottom:22px;padding-bottom:14px;border-bottom:1px solid rgba(184,147,106,0.2);';
    block.innerHTML = `
      <h3 style="font-family:'Cormorant Garamond',serif;font-weight:300;font-size:1.15rem;color:var(--text);margin-bottom:10px;display:flex;justify-content:space-between;align-items:baseline;">
        ${sistema.nome}
        <span style="font-family:'DM Sans',sans-serif;font-size:0.7rem;color:var(--subtitle);font-weight:500;" id="rast-sub-${sistema.slug}">0 pts</span>
      </h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;">
        ${sistema.perguntas.map(q => `
          <div class="rast-pergunta" data-sistema="${sistema.slug}" data-id="${q.id}">
            <p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text);margin-bottom:6px;">${q.texto}</p>
            <div style="display:flex;gap:4px;">
              ${[0,1,2,3,4].map(v => `
                <button type="button" class="rast-btn" data-val="${v}"
                  style="flex:1;padding:8px 0;border:1px solid var(--detail);background:none;cursor:pointer;
                    font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text-light);
                    transition:all 0.15s;">${v}</button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    sistemasWrap.appendChild(block);
  }

  // Listener delegado pra todos os botões
  mountEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.rast-btn');
    if (!btn) return;
    const wrap = btn.closest('.rast-pergunta');
    const sistema = wrap.dataset.sistema;
    const id      = wrap.dataset.id;
    const val     = parseInt(btn.dataset.val);

    // Toggle: se clicar no mesmo, desmarca (volta a 0)
    const atual = window._rastreamentoState[sistema]?.[id];
    const novoVal = (atual === val) ? 0 : val;

    if (!window._rastreamentoState[sistema]) window._rastreamentoState[sistema] = {};
    window._rastreamentoState[sistema][id] = novoVal;

    // Atualiza visual dos botões da pergunta
    wrap.querySelectorAll('.rast-btn').forEach(b => {
      const bv = parseInt(b.dataset.val);
      const ativo = bv === novoVal;
      b.style.background = ativo ? 'var(--text)' : 'none';
      b.style.color      = ativo ? 'var(--bg-primary)' : 'var(--text-light)';
      b.style.fontWeight = ativo ? '600' : '400';
      b.style.borderColor = ativo ? 'var(--text)' : 'var(--detail)';
    });

    atualizarResultadoRastreamento();
  });

  atualizarResultadoRastreamento();
}

function atualizarResultadoRastreamento() {
  const respostas = window._rastreamentoState;
  const total = pontosTotal(respostas);
  const totalEl = document.getElementById('rast-total');
  if (totalEl) totalEl.textContent = total;

  const interp = interpretarScore(total);
  const interpEl = document.getElementById('rast-interpretacao');
  if (interpEl) {
    interpEl.textContent = interp.texto;
    interpEl.style.borderLeftColor = interp.cor;
    interpEl.style.color = interp.cor;
    interpEl.style.background = `${interp.cor}10`;
  }

  // Atualiza sub-totais por sistema
  const radarWrap = document.getElementById('rast-radar');
  let radarHtml = '';
  for (const sistema of RASTREAMENTO_SISTEMAS) {
    const pts = pontosSistema(sistema.slug, respostas);
    const max = sistema.perguntas.length * 4;
    const pct = max > 0 ? (pts / max) * 100 : 0;
    const cor = pct >= 75 ? '#A04030' : pct >= 50 ? '#C26B3F' : pct >= 25 ? '#B8860B' : '#3D6B4F';

    const subEl = document.getElementById(`rast-sub-${sistema.slug}`);
    if (subEl) {
      subEl.textContent = `${pts} pts (max ${max})`;
      subEl.style.color = pct > 25 ? cor : 'var(--subtitle)';
    }

    radarHtml += `
      <div style="text-align:center;padding:8px;border:1px solid rgba(184,147,106,0.2);">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.62rem;color:var(--text-light);margin-bottom:4px;">${sistema.nome}</p>
        <div style="height:6px;background:rgba(0,0,0,0.06);border-radius:3px;overflow:hidden;margin-bottom:4px;">
          <div style="height:100%;width:${pct}%;background:${cor};transition:width 0.3s;"></div>
        </div>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.7rem;font-weight:500;color:${cor};">${pts}/${max}</p>
      </div>`;
  }
  if (radarWrap) radarWrap.innerHTML = radarHtml;
}

export function setRastreamento(data) {
  if (!data || typeof data !== 'object') return;
  window._rastreamentoState = data;
  // Re-pinta os botões marcados
  for (const sistema of RASTREAMENTO_SISTEMAS) {
    const respostasSis = data[sistema.slug] || {};
    for (const p of sistema.perguntas) {
      const val = parseInt(respostasSis[p.id]);
      if (!isNaN(val) && val > 0) {
        const wrap = document.querySelector(`.rast-pergunta[data-sistema="${sistema.slug}"][data-id="${p.id}"]`);
        if (!wrap) continue;
        wrap.querySelectorAll('.rast-btn').forEach(b => {
          const ativo = parseInt(b.dataset.val) === val;
          b.style.background = ativo ? 'var(--text)' : 'none';
          b.style.color      = ativo ? 'var(--bg-primary)' : 'var(--text-light)';
          b.style.fontWeight = ativo ? '600' : '400';
          b.style.borderColor = ativo ? 'var(--text)' : 'var(--detail)';
        });
      }
    }
  }
  atualizarResultadoRastreamento();
}

// ════════════════════════════════════════════════════════════
// COMPONENTE 2 — TEIA DE INTER-RELAÇÕES
// ════════════════════════════════════════════════════════════

export function renderTeia(mountEl) {
  if (!mountEl) return;
  mountEl.innerHTML = `
    <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-bottom:18px;">
      <div style="flex:1;min-width:200px;">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text-light);line-height:1.6;">
          Selecione os sintomas relevantes do paciente. As <strong>áreas da teia afetadas</strong>,
          <strong>deficiências</strong> e <strong>excessos</strong> de nutrientes são calculados
          automaticamente com base no catálogo clínico (IFM).
        </p>
      </div>
      <button type="button" id="btn-selecionar-sintomas"
        style="padding:11px 20px;border:1px solid var(--text);background:var(--text);color:var(--bg-primary);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;">
        Selecionar sintomas
      </button>
    </div>

    <div style="margin-bottom:18px;">
      <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--subtitle);margin-bottom:8px;">Sintomas selecionados <span id="teia-count">(0)</span></p>
      <div id="teia-sintomas-tags" style="display:flex;flex-wrap:wrap;gap:6px;min-height:32px;">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.74rem;color:var(--text-light);font-style:italic;">Nenhum sintoma selecionado.</p>
      </div>
    </div>

    <div style="margin-bottom:18px;">
      <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--subtitle);margin-bottom:8px;">Lugares afetados na teia de inter-relações</p>
      <div id="teia-areas" style="display:flex;flex-wrap:wrap;gap:6px;min-height:32px;">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.74rem;color:var(--text-light);font-style:italic;">—</p>
      </div>
    </div>

    <div style="margin-bottom:18px;">
      <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--subtitle);margin-bottom:8px;">Provável deficiência de nutrientes</p>
      <div id="teia-deficiencias" style="display:flex;flex-wrap:wrap;gap:6px;min-height:32px;">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.74rem;color:var(--text-light);font-style:italic;">—</p>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:'DM Sans',sans-serif;font-size:0.6rem;color:var(--text-light);margin-top:4px;">
        <span>Menor probabilidade</span>
        <span>Maior probabilidade</span>
      </div>
    </div>

    <div>
      <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--subtitle);margin-bottom:8px;">Provável excesso de nutrientes</p>
      <div id="teia-excessos" style="display:flex;flex-wrap:wrap;gap:6px;min-height:32px;">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.74rem;color:var(--text-light);font-style:italic;">—</p>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:'DM Sans',sans-serif;font-size:0.6rem;color:var(--text-light);margin-top:4px;">
        <span>Menor probabilidade</span>
        <span>Maior probabilidade</span>
      </div>
    </div>
  `;

  document.getElementById('btn-selecionar-sintomas')?.addEventListener('click', abrirModalSintomas);
  atualizarTeia();
}

// Modal de seleção de sintomas
function abrirModalSintomas() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(44,34,24,0.65);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;`;
  const sintomasOrdenados = [...SINTOMAS].sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'));
  const selecionados = new Set(window._teiaState.sintomas || []);

  overlay.innerHTML = `
    <div style="background:var(--bg-primary);border:1px solid var(--detail);max-width:720px;width:100%;max-height:85vh;display:flex;flex-direction:column;">
      <div style="padding:18px 24px;border-bottom:1px solid rgba(184,147,106,0.2);display:flex;justify-content:space-between;align-items:center;">
        <div>
          <p style="font-family:'DM Sans',sans-serif;font-size:0.55rem;letter-spacing:0.22em;text-transform:uppercase;color:var(--subtitle);">Selecione os sintomas</p>
          <p style="font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:300;color:var(--text);">
            <span id="ms-disponiveis">${sintomasOrdenados.length}</span> disponíveis · <span id="ms-selecionados">${selecionados.size}</span> selecionados
          </p>
        </div>
        <button type="button" id="ms-fechar" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--text-light);">×</button>
      </div>

      <div style="padding:14px 24px;border-bottom:1px solid rgba(184,147,106,0.2);">
        <input type="text" id="ms-busca" placeholder="Filtrar por nome..."
          style="width:100%;padding:10px 14px;border:1px solid var(--detail);background:var(--bg-primary);font-family:'DM Sans',sans-serif;font-size:0.85rem;">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;flex:1;overflow:hidden;">
        <div style="border-right:1px solid rgba(184,147,106,0.2);overflow-y:auto;padding:8px 0;">
          <p style="padding:6px 18px;font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--subtitle);">Disponíveis</p>
          <div id="ms-lista-disp"></div>
        </div>
        <div style="overflow-y:auto;padding:8px 0;">
          <p style="padding:6px 18px;font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--subtitle);">Selecionados</p>
          <div id="ms-lista-sel"></div>
        </div>
      </div>

      <div style="padding:14px 24px;border-top:1px solid rgba(184,147,106,0.2);display:flex;gap:10px;justify-content:flex-end;">
        <button type="button" id="ms-todos"
          style="padding:9px 16px;border:1px solid var(--detail);background:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-light);">
          Selecionar todos
        </button>
        <button type="button" id="ms-limpar"
          style="padding:9px 16px;border:1px solid var(--detail);background:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-light);">
          Remover todos
        </button>
        <button type="button" id="ms-cancel"
          style="padding:9px 16px;border:1px solid var(--detail);background:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-light);">
          Cancelar
        </button>
        <button type="button" id="ms-salvar"
          style="padding:9px 22px;background:var(--text);color:var(--bg-primary);border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">
          Salvar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const renderListas = (filtro = '') => {
    const f = filtro.toLowerCase().trim();
    const disp = sintomasOrdenados.filter(s => !selecionados.has(s.slug) && (!f || s.nome.toLowerCase().includes(f)));
    const sel  = sintomasOrdenados.filter(s => selecionados.has(s.slug));
    const itemHtml = (s, isSel) => `
      <button type="button" data-slug="${s.slug}" class="ms-item"
        style="display:block;width:100%;text-align:left;padding:8px 18px;border:none;background:none;cursor:pointer;
          font-family:'DM Sans',sans-serif;font-size:0.82rem;color:var(--text);transition:background 0.1s;"
        onmouseover="this.style.background='rgba(184,147,106,0.08)'"
        onmouseout="this.style.background='none'">
        ${isSel ? '✓ ' : '+ '}${s.nome}
      </button>`;
    document.getElementById('ms-lista-disp').innerHTML =
      disp.map(s => itemHtml(s, false)).join('') ||
      `<p style="padding:14px 18px;font-size:0.74rem;color:var(--text-light);font-style:italic;">${f ? 'Nenhum resultado.' : 'Todos selecionados.'}</p>`;
    document.getElementById('ms-lista-sel').innerHTML =
      sel.map(s => itemHtml(s, true)).join('') ||
      '<p style="padding:14px 18px;font-size:0.74rem;color:var(--text-light);font-style:italic;">Nenhum selecionado.</p>';
    document.getElementById('ms-disponiveis').textContent = sintomasOrdenados.length - selecionados.size;
    document.getElementById('ms-selecionados').textContent = selecionados.size;
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
    const item = e.target.closest('.ms-item');
    if (item) {
      const slug = item.dataset.slug;
      if (selecionados.has(slug)) selecionados.delete(slug);
      else selecionados.add(slug);
      renderListas(document.getElementById('ms-busca').value);
    }
  });

  document.getElementById('ms-busca').addEventListener('input', (e) => renderListas(e.target.value));
  document.getElementById('ms-fechar').onclick = () => overlay.remove();
  document.getElementById('ms-cancel').onclick = () => overlay.remove();
  document.getElementById('ms-todos').onclick  = () => { sintomasOrdenados.forEach(s => selecionados.add(s.slug)); renderListas(); };
  document.getElementById('ms-limpar').onclick = () => { selecionados.clear(); renderListas(); };
  document.getElementById('ms-salvar').onclick = () => {
    window._teiaState.sintomas = [...selecionados];
    overlay.remove();
    atualizarTeia();
  };

  renderListas();
}

function atualizarTeia() {
  const sintomas = window._teiaState.sintomas || [];

  // Tags de sintomas selecionados
  const tagsWrap = document.getElementById('teia-sintomas-tags');
  const countEl  = document.getElementById('teia-count');
  if (countEl) countEl.textContent = `(${sintomas.length})`;
  if (tagsWrap) {
    if (sintomas.length === 0) {
      tagsWrap.innerHTML = `<p style="font-family:'DM Sans',sans-serif;font-size:0.74rem;color:var(--text-light);font-style:italic;">Nenhum sintoma selecionado.</p>`;
    } else {
      tagsWrap.innerHTML = sintomas.map(slug => {
        const s = SINTOMAS.find(x => x.slug === slug);
        if (!s) return '';
        return `<span style="padding:5px 10px;background:rgba(45,106,86,0.08);border:1px solid rgba(45,106,86,0.3);font-family:'DM Sans',sans-serif;font-size:0.72rem;color:#1F4D3E;">${s.nome}</span>`;
      }).join('');
    }
  }

  // Áreas da teia
  const areas = calcularAreasTeia(sintomas);
  window._teiaState.lugaresAfetados = Object.keys(areas);
  const areasWrap = document.getElementById('teia-areas');
  if (areasWrap) {
    if (Object.keys(areas).length === 0) {
      areasWrap.innerHTML = `<p style="font-family:'DM Sans',sans-serif;font-size:0.74rem;color:var(--text-light);font-style:italic;">—</p>`;
    } else {
      areasWrap.innerHTML = Object.entries(areas)
        .sort((a,b) => b[1] - a[1])
        .map(([slug, count]) => {
          const a = AREAS_TEIA[slug];
          return `<span title="${a?.desc || ''}" style="padding:5px 10px;background:rgba(184,147,106,0.1);border:1px solid var(--detail);font-family:'DM Sans',sans-serif;font-size:0.72rem;color:var(--text);">${a?.nome || slug} (${count})</span>`;
        }).join('');
    }
  }

  // Deficiências (gradiente verde)
  const deficiencias = calcularDeficiencias(sintomas);
  window._teiaState.deficiencias = deficiencias;
  const defWrap = document.getElementById('teia-deficiencias');
  if (defWrap) {
    const ordenadas = Object.entries(deficiencias).sort((a,b) => a[1].probabilidade - b[1].probabilidade);
    if (ordenadas.length === 0) {
      defWrap.innerHTML = `<p style="font-family:'DM Sans',sans-serif;font-size:0.74rem;color:var(--text-light);font-style:italic;">—</p>`;
    } else {
      defWrap.innerHTML = ordenadas.map(([slug, info]) => {
        // Gradiente verde claro → verde escuro com base em probabilidade
        const intensidade = 0.3 + (info.probabilidade * 0.7);
        const bg = `rgba(45, 106, 86, ${intensidade})`;
        const cor = info.probabilidade > 0.5 ? '#fff' : '#1F4D3E';
        return `<span title="Peso: ${info.peso} pts" style="padding:5px 10px;background:${bg};font-family:'DM Sans',sans-serif;font-size:0.72rem;color:${cor};font-weight:${info.probabilidade > 0.7 ? '600' : '400'};">${NUTRIENTES[slug] || slug}</span>`;
      }).join('');
    }
  }

  // Excessos (gradiente amarelo→laranja)
  const excessos = calcularExcessos(sintomas);
  window._teiaState.excessos = excessos;
  const excWrap = document.getElementById('teia-excessos');
  if (excWrap) {
    const ordenadas = Object.entries(excessos).sort((a,b) => a[1].probabilidade - b[1].probabilidade);
    if (ordenadas.length === 0) {
      excWrap.innerHTML = `<p style="font-family:'DM Sans',sans-serif;font-size:0.74rem;color:var(--text-light);font-style:italic;">—</p>`;
    } else {
      excWrap.innerHTML = ordenadas.map(([slug, info]) => {
        // Gradiente amarelo (#E8B83C) → laranja (#C26B3F)
        const r = Math.round(232 - (38 * info.probabilidade));
        const g = Math.round(184 - (77 * info.probabilidade));
        const b = Math.round(60  + (3  * info.probabilidade));
        return `<span title="Peso: ${info.peso} pts" style="padding:5px 10px;background:rgb(${r},${g},${b});font-family:'DM Sans',sans-serif;font-size:0.72rem;color:#fff;font-weight:${info.probabilidade > 0.7 ? '600' : '400'};">${NUTRIENTES[slug] || slug}</span>`;
      }).join('');
    }
  }
}

export function setTeia(data) {
  if (!data) return;
  window._teiaState.sintomas = Array.isArray(data.sintomas) ? data.sintomas : [];
  atualizarTeia();
}
