// ============================================================
// plano-refeicoes-pro.js — Onda 1: edição profissional de refeições
// ============================================================
// Inspirado no Dietbox, traz pra cada refeição:
//   • Tabela de alimentos com colunas PTN/CHO/LIP/kcal/qtd
//   • Subtotais automáticos por refeição
//   • Modal "Adicionar Alimento" com busca no banco + medida caseira
//   • Sidebar fixa lateral com pie chart + comparação Atual vs Meta
//   • Recalculo em tempo real ao adicionar/editar/remover alimento
//
// Persistência: refeicao.alimentos[] = array de objetos
//   { alimento_id, nome, medida, medida_label, qty_medida, qty_g,
//     ptn, cho, lip, kcal, fibras, novo }
//
// Compatibilidade: planos antigos com refeicao.itens[] (strings)
// continuam funcionando — a UI pro fica disponível só pra refeições
// com alimentos[]. Conversão automática quando o usuário adiciona o 1º.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ════════════════════════════════════════════════════════════
// CATÁLOGO DE MEDIDAS CASEIRAS
// ════════════════════════════════════════════════════════════
// Conversão genérica para gramas. Quando o paciente seleciona "1 xícara"
// de arroz, internamente vira `qty_g = 1 × 240 = 240g` e os macros são
// calculados sobre porcao_padrao_g do alimento (default 100g).
const MEDIDAS = {
  grama:            { label: 'Grama (g)',                 g: 1 },
  ml:               { label: 'Mililitro (ml)',            g: 1 },
  unidade_peq:      { label: 'Unidade pequena',           g: 50 },
  unidade_media:    { label: 'Unidade média',             g: 100 },
  unidade_grd:      { label: 'Unidade grande',            g: 150 },
  fatia_fina:       { label: 'Fatia fina',                g: 15 },
  fatia:            { label: 'Fatia média',               g: 25 },
  fatia_grossa:     { label: 'Fatia grossa',              g: 40 },
  colher_cha:       { label: 'Colher de chá',             g: 5 },
  colher_sobremesa: { label: 'Colher de sobremesa',       g: 10 },
  colher_sopa:      { label: 'Colher de sopa',            g: 15 },
  colher_arroz:     { label: 'Colher de arroz/servir',    g: 30 },
  xicara_cha:       { label: 'Xícara de chá',             g: 200 },
  xicara_cafe:      { label: 'Xícara de café',            g: 50 },
  copo_americano:   { label: 'Copo americano',            g: 200 },
  copo_req:         { label: 'Copo de requeijão',         g: 240 },
  escumadeira_rasa: { label: 'Escumadeira média rasa',    g: 60 },
  escumadeira:      { label: 'Escumadeira média',         g: 90 },
  concha_rasa:      { label: 'Concha média rasa',         g: 80 },
  concha:           { label: 'Concha média',              g: 100 },
  prato_raso:       { label: 'Prato raso',                g: 50 },
  punhado:          { label: 'Punhado',                   g: 30 },
  ponta_faca:       { label: 'Ponta de faca',             g: 5 },
  porcao:           { label: 'Porção (100g)',             g: 100 },
};

// Medidas em ordem de relevância na UI
const MEDIDAS_ORDEM = [
  'grama','unidade_media','unidade_peq','unidade_grd',
  'fatia','fatia_fina','fatia_grossa',
  'colher_sopa','colher_cha','colher_sobremesa','colher_arroz',
  'xicara_cha','xicara_cafe','copo_americano','copo_req',
  'escumadeira','escumadeira_rasa','concha','concha_rasa',
  'prato_raso','punhado','ponta_faca','porcao','ml'
];

// ════════════════════════════════════════════════════════════
// CACHE DO BANCO DE ALIMENTOS
// ════════════════════════════════════════════════════════════
let alimentosCache = [];
let alimentosFetched = false;

async function carregarAlimentos() {
  if (alimentosFetched) return alimentosCache;
  try {
    const { data, error } = await supabase
      .from('alimentos')
      .select('id, nome, categoria, subcategoria, porcao_padrao_g, kcal, ptn_g, cho_g, lip_g, fibras_g')
      .eq('ativo', true)
      .order('nome', { ascending: true });
    if (error) { console.warn('[refeicoes-pro] erro carregando alimentos:', error); return []; }
    alimentosCache = data || [];
    alimentosFetched = true;
  } catch (e) {
    console.warn('[refeicoes-pro] exceção:', e);
  }
  return alimentosCache;
}

// ════════════════════════════════════════════════════════════
// CÁLCULO DE MACROS POR ALIMENTO + QUANTIDADE
// ════════════════════════════════════════════════════════════
function calcMacros(alimento, qty_g) {
  const porcao = alimento.porcao_padrao_g || 100;
  const fator = qty_g / porcao;
  return {
    kcal:   round1((alimento.kcal   || 0) * fator),
    ptn:    round2((alimento.ptn_g  || 0) * fator),
    cho:    round2((alimento.cho_g  || 0) * fator),
    lip:    round2((alimento.lip_g  || 0) * fator),
    fibras: round2((alimento.fibras_g || 0) * fator),
  };
}
const round1 = (v) => Math.round(v * 10) / 10;
const round2 = (v) => Math.round(v * 100) / 100;

// ════════════════════════════════════════════════════════════
// MODAL "ADICIONAR ALIMENTO"
// ════════════════════════════════════════════════════════════
// Resolve com { alimento, medida, qty_medida, qty_g, macros } ou null se cancelar.
export async function abrirModalAdicionarAlimento(opts = {}) {
  await carregarAlimentos();
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'pro-modal-overlay';
    overlay.innerHTML = `
      <div class="pro-modal">
        <div class="pro-modal-header">
          <div>
            <p class="pro-modal-eyebrow">Refeição · ${opts.refeicaoNome || 'Adicionar alimento'}</p>
            <p class="pro-modal-titulo">Adicionar alimento</p>
          </div>
          <button type="button" class="pro-modal-close" aria-label="Fechar">×</button>
        </div>

        <div class="pro-modal-body">
          <div class="pro-form-group">
            <label class="pro-form-label">Alimento (digite para buscar)</label>
            <input type="text" class="pro-form-input" id="pro-alim-busca"
                   placeholder="Ex: pão, arroz, ovo..." autocomplete="off">
            <div class="pro-alim-dropdown" id="pro-alim-dropdown" style="display:none;"></div>
            <input type="hidden" id="pro-alim-id">
            <p class="pro-form-hint" id="pro-alim-info"></p>
          </div>

          <div class="pro-form-row">
            <div class="pro-form-group">
              <label class="pro-form-label">Medida caseira</label>
              <select class="pro-form-input" id="pro-alim-medida" disabled>
                <option value="">Selecione um alimento primeiro</option>
              </select>
            </div>
            <div class="pro-form-group" style="max-width:160px;">
              <label class="pro-form-label">Quantidade</label>
              <input type="number" class="pro-form-input" id="pro-alim-qty"
                     placeholder="1" step="0.5" min="0.1" disabled>
            </div>
          </div>

          <div class="pro-preview" id="pro-preview" style="display:none;">
            <p class="pro-preview-label">Preview do que será adicionado:</p>
            <div class="pro-preview-row">
              <span class="pro-preview-name" id="pro-preview-name"></span>
              <span class="pro-preview-qty"  id="pro-preview-qty"></span>
            </div>
            <div class="pro-preview-macros">
              <span><strong id="pro-preview-kcal">—</strong> kcal</span>
              <span class="m-ptn"><strong id="pro-preview-ptn">—</strong> g PTN</span>
              <span class="m-cho"><strong id="pro-preview-cho">—</strong> g CHO</span>
              <span class="m-lip"><strong id="pro-preview-lip">—</strong> g LIP</span>
            </div>
          </div>
        </div>

        <div class="pro-modal-footer">
          <button type="button" class="pro-btn pro-btn-ghost" id="pro-btn-cancel">Cancelar</button>
          <button type="button" class="pro-btn pro-btn-primary" id="pro-btn-confirm" disabled>
            Adicionar à refeição
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const $ = (id) => document.getElementById(id);
    let alimentoSel = null;

    // Busca com filtro
    const inputBusca = $('pro-alim-busca');
    const dropdown   = $('pro-alim-dropdown');
    const renderDropdown = (q) => {
      const ql = (q || '').trim().toLowerCase();
      if (!ql) { dropdown.style.display = 'none'; return; }
      const matches = alimentosCache
        .filter(a => (a.nome || '').toLowerCase().includes(ql))
        .slice(0, 12);
      if (!matches.length) {
        dropdown.innerHTML = `<div class="pro-alim-empty">Nenhum alimento encontrado</div>`;
        dropdown.style.display = '';
        return;
      }
      dropdown.innerHTML = matches.map(a => `
        <button type="button" class="pro-alim-item" data-id="${a.id}">
          <span class="pro-alim-nome">${escapeHtml(a.nome)}</span>
          <span class="pro-alim-meta">${a.kcal || 0} kcal · P${a.ptn_g || 0} · C${a.cho_g || 0} · L${a.lip_g || 0} <em>(${a.porcao_padrao_g || 100}g)</em></span>
        </button>`).join('');
      dropdown.style.display = '';
    };
    inputBusca.addEventListener('input', (e) => renderDropdown(e.target.value));
    inputBusca.addEventListener('focus',  ()  => renderDropdown(inputBusca.value));

    dropdown.addEventListener('click', (e) => {
      const btn = e.target.closest('.pro-alim-item');
      if (!btn) return;
      const id = btn.dataset.id;
      alimentoSel = alimentosCache.find(a => a.id === id);
      if (!alimentoSel) return;
      inputBusca.value = alimentoSel.nome;
      $('pro-alim-id').value = alimentoSel.id;
      $('pro-alim-info').textContent =
        `Por ${alimentoSel.porcao_padrao_g || 100}g: ${alimentoSel.kcal || 0} kcal · ` +
        `${alimentoSel.ptn_g || 0}g PTN · ${alimentoSel.cho_g || 0}g CHO · ` +
        `${alimentoSel.lip_g || 0}g LIP · ${alimentoSel.fibras_g || 0}g fibras`;
      // Habilita medida + qty
      const medidaSel = $('pro-alim-medida');
      medidaSel.disabled = false;
      medidaSel.innerHTML = MEDIDAS_ORDEM.map(k =>
        `<option value="${k}" ${k === 'unidade_media' ? 'selected' : ''}>${MEDIDAS[k].label} (${MEDIDAS[k].g}g)</option>`
      ).join('');
      const qtyInput = $('pro-alim-qty');
      qtyInput.disabled = false;
      qtyInput.value = '1';
      qtyInput.focus();
      qtyInput.select();
      dropdown.style.display = 'none';
      atualizarPreview();
    });

    // Atualiza preview
    const atualizarPreview = () => {
      if (!alimentoSel) return;
      const medidaKey = $('pro-alim-medida').value || 'unidade_media';
      const qty       = parseFloat($('pro-alim-qty').value) || 0;
      const medida    = MEDIDAS[medidaKey];
      const qty_g     = qty * medida.g;
      const macros    = calcMacros(alimentoSel, qty_g);

      $('pro-preview').style.display = '';
      $('pro-preview-name').textContent = alimentoSel.nome;
      $('pro-preview-qty').textContent  = `${qty} × ${medida.label} = ${qty_g}g`;
      $('pro-preview-kcal').textContent = macros.kcal;
      $('pro-preview-ptn').textContent  = macros.ptn;
      $('pro-preview-cho').textContent  = macros.cho;
      $('pro-preview-lip').textContent  = macros.lip;

      $('pro-btn-confirm').disabled = qty <= 0;
    };
    $('pro-alim-medida').addEventListener('change', atualizarPreview);
    $('pro-alim-qty').addEventListener('input',     atualizarPreview);

    // Cancelar / Fechar
    const fechar = (resultado) => {
      overlay.remove();
      resolve(resultado);
    };
    overlay.querySelector('.pro-modal-close').addEventListener('click', () => fechar(null));
    $('pro-btn-cancel').addEventListener('click', () => fechar(null));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(null); });

    // Confirmar
    $('pro-btn-confirm').addEventListener('click', () => {
      if (!alimentoSel) return;
      const medidaKey = $('pro-alim-medida').value || 'unidade_media';
      const qty       = parseFloat($('pro-alim-qty').value) || 1;
      const medida    = MEDIDAS[medidaKey];
      const qty_g     = qty * medida.g;
      const macros    = calcMacros(alimentoSel, qty_g);
      fechar({
        alimento_id:   alimentoSel.id,
        nome:          alimentoSel.nome,
        medida:        medidaKey,
        medida_label:  medida.label,
        qty_medida:    qty,
        qty_g:         qty_g,
        ...macros,
      });
    });

    // ESC pra fechar
    const onEsc = (e) => { if (e.key === 'Escape') fechar(null); };
    document.addEventListener('keydown', onEsc, { once: true });

    setTimeout(() => inputBusca.focus(), 50);
  });
}

// ════════════════════════════════════════════════════════════
// RENDERIZADOR DA TABELA DE ALIMENTOS DENTRO DE UMA REFEIÇÃO
// ════════════════════════════════════════════════════════════
// Recebe um <div class="dynamic-block"> de refeição e injeta UI nova.
// Retorna o objeto refeição em memória pra leitura via getRefeicaoData.
export function renderTabelaAlimentos(blockEl, alimentos = []) {
  let mount = blockEl.querySelector('.pro-alim-mount');
  if (!mount) {
    mount = document.createElement('div');
    mount.className = 'pro-alim-mount';
    // Insere antes do macros-row
    const macrosRow = blockEl.querySelector('.macros-row');
    if (macrosRow) blockEl.insertBefore(mount, macrosRow);
    else blockEl.appendChild(mount);
  }
  // Guarda em memória no próprio elemento
  blockEl._proAlimentos = [...(alimentos || [])];

  const renderRows = () => {
    const lista = blockEl._proAlimentos;
    // Barra de ações sempre presente (Carregar / Salvar como modelo)
    const acoesTopoHtml = `
      <div class="pro-ref-acoes">
        <button type="button" class="pro-btn pro-btn-ghost-sm pro-btn-carregar">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Carregar refeição
        </button>
        <button type="button" class="pro-btn pro-btn-ghost-sm pro-btn-salvar-modelo" ${lista.length ? '' : 'disabled'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Salvar como modelo
        </button>
      </div>`;
    const bindAcoesTopo = () => {
      const carregarBtn = mount.querySelector('.pro-btn-carregar');
      const salvarBtn   = mount.querySelector('.pro-btn-salvar-modelo');
      carregarBtn?.addEventListener('click', () => abrirModalCarregar(blockEl, renderRows));
      salvarBtn?.addEventListener('click',   () => abrirModalSalvarModelo(blockEl));
    };

    if (!lista.length) {
      mount.innerHTML = acoesTopoHtml + `
        <div class="pro-alim-vazio">
          <p>Nenhum alimento adicionado.</p>
          <button type="button" class="pro-btn pro-btn-primary pro-btn-add">
            + Adicionar primeiro alimento
          </button>
        </div>`;
      mount.querySelector('.pro-btn-add').addEventListener('click', () =>
        adicionarAlimento(blockEl, mount, renderRows));
      bindAcoesTopo();
      atualizarMacrosRefeicao(blockEl);
      window._planoSidebar?.atualizar();
      return;
    }
    const totais = lista.reduce((acc, a) => {
      acc.ptn  += a.ptn  || 0;
      acc.cho  += a.cho  || 0;
      acc.lip  += a.lip  || 0;
      acc.kcal += a.kcal || 0;
      acc.qty_g += a.qty_g || 0;
      return acc;
    }, { ptn:0, cho:0, lip:0, kcal:0, qty_g:0 });

    mount.innerHTML = acoesTopoHtml + `
      <div class="pro-alim-tabela">
        <div class="pro-alim-thead">
          <div class="pro-alim-col pro-alim-col-nome">Alimento</div>
          <div class="pro-alim-col m-ptn">PTN</div>
          <div class="pro-alim-col m-cho">CHO</div>
          <div class="pro-alim-col m-lip">LIP</div>
          <div class="pro-alim-col">Kcal</div>
          <div class="pro-alim-col">Qtd</div>
          <div class="pro-alim-col pro-alim-col-acoes"></div>
        </div>
        ${lista.map((a, i) => `
          <div class="pro-alim-tr">
            <div class="pro-alim-col pro-alim-col-nome">
              <span class="pro-alim-tnome">${escapeHtml(a.nome)}</span>
              <span class="pro-alim-tmedida">${a.qty_medida} × ${escapeHtml(a.medida_label || a.medida || '')}</span>
              ${a.novo ? '<span class="pro-tag-novo">NOVO</span>' : ''}
            </div>
            <div class="pro-alim-col m-ptn">${round2(a.ptn || 0)}<small>g</small></div>
            <div class="pro-alim-col m-cho">${round2(a.cho || 0)}<small>g</small></div>
            <div class="pro-alim-col m-lip">${round2(a.lip || 0)}<small>g</small></div>
            <div class="pro-alim-col">${round1(a.kcal || 0)}</div>
            <div class="pro-alim-col">${a.qty_g}<small>g</small></div>
            <div class="pro-alim-col pro-alim-col-acoes">
              <button type="button" class="pro-icon-btn" data-acao="novo" data-i="${i}" title="${a.novo ? 'Marcado como novo' : 'Marcar como novo'}">
                ${a.novo ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="#C9A84C" stroke="#C9A84C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
                          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'}
              </button>
              <button type="button" class="pro-icon-btn" data-acao="del" data-i="${i}" title="Remover">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        `).join('')}
        <div class="pro-alim-tr pro-alim-trtotal">
          <div class="pro-alim-col pro-alim-col-nome">TOTAL</div>
          <div class="pro-alim-col m-ptn">${round2(totais.ptn)}<small>g</small></div>
          <div class="pro-alim-col m-cho">${round2(totais.cho)}<small>g</small></div>
          <div class="pro-alim-col m-lip">${round2(totais.lip)}<small>g</small></div>
          <div class="pro-alim-col">${round1(totais.kcal)}</div>
          <div class="pro-alim-col">${round1(totais.qty_g)}<small>g</small></div>
          <div class="pro-alim-col pro-alim-col-acoes"></div>
        </div>
      </div>
      <button type="button" class="pro-btn pro-btn-secondary pro-btn-add">
        + Adicionar alimento
      </button>`;

    mount.querySelector('.pro-btn-add').addEventListener('click', () =>
      adicionarAlimento(blockEl, mount, renderRows));

    mount.querySelectorAll('[data-acao]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.i;
        if (btn.dataset.acao === 'del') {
          blockEl._proAlimentos.splice(idx, 1);
        } else if (btn.dataset.acao === 'novo') {
          blockEl._proAlimentos[idx].novo = !blockEl._proAlimentos[idx].novo;
        }
        renderRows();
      });
    });

    bindAcoesTopo();
    atualizarMacrosRefeicao(blockEl);
    window._planoSidebar?.atualizar();
  };

  renderRows();
}

// ════════════════════════════════════════════════════════════
// MODAL SALVAR REFEIÇÃO COMO MODELO
// ════════════════════════════════════════════════════════════
async function abrirModalSalvarModelo(blockEl) {
  const lista = blockEl._proAlimentos || [];
  if (!lista.length) {
    alert('Adicione ao menos um alimento antes de salvar como modelo.');
    return;
  }
  const nomeAtual = blockEl.querySelector('input[name="ref-nome"]')?.value || '';
  const horaAtual = blockEl.querySelector('input[name="ref-horario"]')?.value || '';

  const overlay = document.createElement('div');
  overlay.className = 'pro-modal-overlay';
  overlay.innerHTML = `
    <div class="pro-modal" style="max-width:480px;">
      <div class="pro-modal-header">
        <div>
          <p class="pro-modal-eyebrow">Templates · Salvar para reutilizar</p>
          <p class="pro-modal-titulo">Salvar como modelo</p>
        </div>
        <button type="button" class="pro-modal-close">×</button>
      </div>
      <div class="pro-modal-body">
        <div class="pro-form-group">
          <label class="pro-form-label">Nome do modelo</label>
          <input type="text" class="pro-form-input" id="pro-modelo-nome" value="${escapeHtml(nomeAtual)}" placeholder="Ex: Café da manhã low carb">
        </div>
        <div class="pro-form-row">
          <div class="pro-form-group">
            <label class="pro-form-label">Tipo de refeição</label>
            <select class="pro-form-input" id="pro-modelo-tipo">
              <option value="cafe_manha">Café da manhã</option>
              <option value="lanche_manha">Lanche da manhã</option>
              <option value="almoco">Almoço</option>
              <option value="lanche_tarde">Lanche da tarde</option>
              <option value="jantar">Jantar</option>
              <option value="ceia">Ceia</option>
              <option value="pre_treino">Pré-treino</option>
              <option value="pos_treino">Pós-treino</option>
            </select>
          </div>
          <div class="pro-form-group">
            <label class="pro-form-label">Horário sugerido</label>
            <input type="text" class="pro-form-input" id="pro-modelo-hora" value="${escapeHtml(horaAtual)}" placeholder="07h30">
          </div>
        </div>
        <div class="pro-form-group">
          <label class="pro-form-label">Descrição (opcional)</label>
          <textarea class="pro-form-input" id="pro-modelo-desc" rows="2" placeholder="Observações sobre quando usar este modelo..."></textarea>
        </div>
        <div class="pro-form-group">
          <label class="pro-form-label">Tags (separadas por vírgula)</label>
          <input type="text" class="pro-form-input" id="pro-modelo-tags" placeholder="alto_proteico, sem_gluten, pre_treino">
        </div>
        <p class="pro-form-hint">${lista.length} alimento(s) serão salvos no modelo.</p>
      </div>
      <div class="pro-modal-footer">
        <button type="button" class="pro-btn pro-btn-ghost" id="pro-modelo-cancel">Cancelar</button>
        <button type="button" class="pro-btn pro-btn-primary" id="pro-modelo-confirm">Salvar modelo</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const fechar = () => overlay.remove();
  overlay.querySelector('.pro-modal-close').onclick = fechar;
  overlay.querySelector('#pro-modelo-cancel').onclick = fechar;
  overlay.addEventListener('click', e => { if (e.target === overlay) fechar(); });

  // Tenta inferir o tipo a partir do horário
  const inferTipo = (hora) => {
    if (!hora) return 'cafe_manha';
    const h = parseInt(hora.replace(/[^0-9]/g, '').slice(0, 2)) || 0;
    if (h <= 9)  return 'cafe_manha';
    if (h <= 11) return 'lanche_manha';
    if (h <= 14) return 'almoco';
    if (h <= 17) return 'lanche_tarde';
    if (h <= 21) return 'jantar';
    return 'ceia';
  };
  overlay.querySelector('#pro-modelo-tipo').value = inferTipo(horaAtual);

  overlay.querySelector('#pro-modelo-confirm').onclick = async () => {
    const nome = overlay.querySelector('#pro-modelo-nome').value.trim();
    const tipo = overlay.querySelector('#pro-modelo-tipo').value;
    const hora = overlay.querySelector('#pro-modelo-hora').value.trim();
    const desc = overlay.querySelector('#pro-modelo-desc').value.trim();
    const tagsStr = overlay.querySelector('#pro-modelo-tags').value.trim();
    if (!nome) { alert('Informe um nome para o modelo.'); return; }

    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
    const macros = lista.reduce((acc, a) => ({
      kcal:   (acc.kcal   || 0) + (a.kcal   || 0),
      ptn_g:  (acc.ptn_g  || 0) + (a.ptn    || 0),
      cho_g:  (acc.cho_g  || 0) + (a.cho    || 0),
      lip_g:  (acc.lip_g  || 0) + (a.lip    || 0),
      fibras_g: (acc.fibras_g || 0) + (a.fibras || 0),
    }), {});

    const payload = {
      nome,
      tipo,
      descricao: desc || null,
      horario_sugerido: hora || null,
      alimentos: lista,           // mesma estrutura usada no plano
      macros,
      tags,
    };

    const btn = overlay.querySelector('#pro-modelo-confirm');
    btn.disabled = true; btn.textContent = 'Salvando...';
    const { error } = await supabase.from('refeicoes_template').insert(payload);
    if (error) {
      alert('Erro ao salvar modelo: ' + error.message);
      btn.disabled = false; btn.textContent = 'Salvar modelo';
      return;
    }
    fechar();
    if (window._showToast) window._showToast('Modelo salvo com sucesso.');
    else alert('Modelo salvo com sucesso.');
  };
}

// ════════════════════════════════════════════════════════════
// MODAL CARREGAR REFEIÇÃO (4 abas)
// ════════════════════════════════════════════════════════════
async function abrirModalCarregar(blockEl, renderRows) {
  const overlay = document.createElement('div');
  overlay.className = 'pro-modal-overlay';
  overlay.innerHTML = `
    <div class="pro-modal" style="max-width:760px;">
      <div class="pro-modal-header">
        <div>
          <p class="pro-modal-eyebrow">Templates de refeição</p>
          <p class="pro-modal-titulo">Carregar refeição</p>
        </div>
        <button type="button" class="pro-modal-close">×</button>
      </div>

      <div class="pro-tab-bar">
        <button type="button" class="pro-tab active" data-tab="meus">Meus modelos</button>
        <button type="button" class="pro-tab" data-tab="erg">Modelos ERG</button>
        <button type="button" class="pro-tab" data-tab="paciente">Planos do paciente</button>
        <button type="button" class="pro-tab" data-tab="recordatorios">Recordatórios</button>
      </div>

      <div class="pro-modal-body" id="pro-tab-content">
        <p class="pro-form-hint" style="text-align:center;padding:24px;">Carregando...</p>
      </div>

      <div class="pro-modal-footer">
        <button type="button" class="pro-btn pro-btn-ghost" id="pro-load-cancel">Fechar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const fechar = () => overlay.remove();
  overlay.querySelector('.pro-modal-close').onclick = fechar;
  overlay.querySelector('#pro-load-cancel').onclick = fechar;
  overlay.addEventListener('click', e => { if (e.target === overlay) fechar(); });

  let abaAtiva = 'meus';
  const trocarAba = (aba) => {
    abaAtiva = aba;
    overlay.querySelectorAll('.pro-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === aba));
    carregarAba();
  };
  overlay.querySelectorAll('.pro-tab').forEach(t =>
    t.addEventListener('click', () => trocarAba(t.dataset.tab)));

  const tabContent = overlay.querySelector('#pro-tab-content');

  const carregarAba = async () => {
    tabContent.innerHTML = `<p class="pro-form-hint" style="text-align:center;padding:24px;">Carregando...</p>`;
    const patientId = document.getElementById('patient-id')?.value;
    let items = [];

    try {
      if (abaAtiva === 'meus') {
        const { data } = await supabase.from('refeicoes_template')
          .select('id, nome, tipo, descricao, horario_sugerido, alimentos, macros, tags')
          .order('created_at', { ascending: false }).limit(50);
        items = (data || []).map(r => ({
          id: r.id,
          titulo: r.nome,
          subtitulo: `${labelTipo(r.tipo)}${r.horario_sugerido ? ' · ' + r.horario_sugerido : ''}`,
          desc: r.descricao || (r.tags?.length ? r.tags.join(' · ') : ''),
          macros: r.macros,
          alimentos: r.alimentos || [],
        }));
      } else if (abaAtiva === 'erg') {
        // Templates oficiais do sistema (mesma tabela, filtra por tag 'erg_oficial')
        const { data } = await supabase.from('refeicoes_template')
          .select('id, nome, tipo, descricao, horario_sugerido, alimentos, macros, tags')
          .contains('tags', ['erg_oficial']);
        items = (data || []).map(r => ({
          id: r.id,
          titulo: r.nome,
          subtitulo: `${labelTipo(r.tipo)} · ERG`,
          desc: r.descricao || '',
          macros: r.macros,
          alimentos: r.alimentos || [],
        }));
      } else if (abaAtiva === 'paciente' && patientId) {
        const { data } = await supabase.from('planos_alimentares')
          .select('id, descricao, data_elaboracao, refeicoes')
          .eq('patient_id', patientId)
          .order('data_elaboracao', { ascending: false }).limit(20);
        // Cada refeição de cada plano vira um item
        const expandido = [];
        (data || []).forEach(p => {
          const refs = Array.isArray(p.refeicoes) ? p.refeicoes : [];
          refs.forEach((r, idx) => {
            if (!Array.isArray(r.alimentos) || r.alimentos.length === 0) return;
            expandido.push({
              id: `${p.id}_${idx}`,
              titulo: r.nome || `Refeição ${idx+1}`,
              subtitulo: `${p.descricao || 'Plano'} · ${formatDate(p.data_elaboracao)}${r.horario ? ' · ' + r.horario : ''}`,
              desc: `${r.alimentos.length} alimento(s)`,
              macros: r.macros,
              alimentos: r.alimentos,
            });
          });
        });
        items = expandido;
      } else if (abaAtiva === 'recordatorios') {
        // Recordatórios do paciente — vem da tabela diario_alimentar (se existir)
        if (!patientId) items = [];
        else {
          try {
            const { data } = await supabase.from('diario_alimentar')
              .select('id, data, cafe, lanche_manha, almoco, lanche_tarde, jantar, ceia, observacoes')
              .eq('patient_id', patientId)
              .order('data', { ascending: false }).limit(15);
            // Recordatórios são em texto livre — exibe como "Carregar como texto"
            const expand = [];
            (data || []).forEach(d => {
              ['cafe','lanche_manha','almoco','lanche_tarde','jantar','ceia'].forEach(tipo => {
                const txt = d[tipo];
                if (!txt) return;
                expand.push({
                  id: `rec_${d.id}_${tipo}`,
                  titulo: `${labelTipo(tipo)} (${formatDate(d.data)})`,
                  subtitulo: 'Recordatório do paciente',
                  desc: txt.slice(0, 120) + (txt.length > 120 ? '…' : ''),
                  textoLivre: txt,    // não tem alimentos[] estruturado
                });
              });
            });
            items = expand;
          } catch (e) {
            items = [];
          }
        }
      }
    } catch (e) {
      console.warn('[carregar] erro:', e);
      items = [];
    }

    if (!items.length) {
      tabContent.innerHTML = `
        <div class="pro-empty">
          <p>Nenhum item disponível nesta aba.</p>
          ${abaAtiva === 'meus' ? `<p class="pro-form-hint">Use "Salvar como modelo" em qualquer refeição pra criar seu primeiro template.</p>` : ''}
        </div>`;
      return;
    }

    tabContent.innerHTML = `
      <div class="pro-load-list">
        ${items.map(it => `
          <div class="pro-load-item" data-id="${it.id}">
            <div class="pro-load-info">
              <p class="pro-load-titulo">${escapeHtml(it.titulo)}</p>
              <p class="pro-load-sub">${escapeHtml(it.subtitulo || '')}</p>
              ${it.desc ? `<p class="pro-load-desc">${escapeHtml(it.desc)}</p>` : ''}
              ${it.macros ? `<p class="pro-load-macros">
                <span><strong>${round1(it.macros.kcal||0)}</strong> kcal</span>
                <span class="m-ptn"><strong>${round1(it.macros.ptn_g||it.macros.ptn||0)}</strong>g P</span>
                <span class="m-cho"><strong>${round1(it.macros.cho_g||it.macros.cho||0)}</strong>g C</span>
                <span class="m-lip"><strong>${round1(it.macros.lip_g||it.macros.lip||0)}</strong>g L</span>
              </p>` : ''}
            </div>
            <button type="button" class="pro-btn pro-btn-primary pro-btn-sm pro-load-btn" data-id="${it.id}">
              Carregar
            </button>
          </div>
        `).join('')}
      </div>`;

    tabContent.querySelectorAll('.pro-load-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        const item = items.find(x => x.id === btn.dataset.id);
        if (!item) return;
        if (item.textoLivre) {
          alert('Recordatórios em texto livre não podem ser carregados como tabela. ' +
                'Use o texto como referência manual:\n\n' + item.textoLivre);
          return;
        }
        if (!Array.isArray(item.alimentos) || item.alimentos.length === 0) {
          alert('Este item não tem alimentos calculados pra carregar.');
          return;
        }
        // Confirmação se já houver alimentos
        if ((blockEl._proAlimentos || []).length > 0) {
          if (!confirm('Substituir os alimentos atuais pelos do modelo?')) return;
        }
        blockEl._proAlimentos = JSON.parse(JSON.stringify(item.alimentos));
        // Atualiza nome/hora se vazios
        const refNome = blockEl.querySelector('input[name="ref-nome"]');
        const refHora = blockEl.querySelector('input[name="ref-horario"]');
        if (refNome && !refNome.value) refNome.value = item.titulo;
        if (refHora && !refHora.value) {
          const m = (item.subtitulo || '').match(/\d{1,2}h?\d{0,2}|\d{1,2}:\d{2}/);
          if (m) refHora.value = m[0];
        }
        fechar();
        renderRows();
      }));
  };

  carregarAba();
}

function labelTipo(t) {
  return ({
    cafe_manha: 'Café da manhã', lanche_manha: 'Lanche da manhã',
    almoco: 'Almoço', lanche_tarde: 'Lanche da tarde',
    jantar: 'Jantar', ceia: 'Ceia',
    pre_treino: 'Pré-treino', pos_treino: 'Pós-treino', cafe: 'Café da manhã',
  })[t] || t;
}
function formatDate(s) {
  if (!s) return '';
  try { return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR'); } catch { return s; }
}

async function adicionarAlimento(blockEl, mount, renderRows) {
  const refNomeInput = blockEl.querySelector('input[name="ref-nome"]');
  const refeicaoNome = refNomeInput?.value || 'Nova refeição';
  const novo = await abrirModalAdicionarAlimento({ refeicaoNome });
  if (!novo) return;
  blockEl._proAlimentos.push(novo);
  renderRows();
}

// Atualiza os campos f-kcal/f-ptn/f-cho/f-lip da refeição com a soma
function atualizarMacrosRefeicao(blockEl) {
  const lista = blockEl._proAlimentos || [];
  const t = lista.reduce((acc, a) => {
    acc.kcal   += a.kcal   || 0;
    acc.ptn    += a.ptn    || 0;
    acc.cho    += a.cho    || 0;
    acc.lip    += a.lip    || 0;
    acc.fibras += a.fibras || 0;
    return acc;
  }, { kcal:0, ptn:0, cho:0, lip:0, fibras:0 });

  const set = (name, val) => {
    const el = blockEl.querySelector(`input[name="${name}"]`);
    if (el) el.value = val ? round1(val) : '';
  };
  set('ref-kcal',   t.kcal);
  set('ref-ptn',    t.ptn);
  set('ref-cho',    t.cho);
  set('ref-lip',    t.lip);
  set('ref-fibras', t.fibras);
}

// Ler dados (chamado pelo buildPayload)
export function getRefeicaoData(blockEl) {
  return blockEl._proAlimentos || [];
}

// ════════════════════════════════════════════════════════════
// SIDEBAR DE MACROS (pie chart + comparação Atual vs Meta)
// ════════════════════════════════════════════════════════════
export function montarSidebarMacros(opts = {}) {
  // Cria sidebar uma vez só
  let host = document.getElementById('pro-macros-sidebar');
  if (host) return;

  host = document.createElement('div');
  host.id = 'pro-macros-sidebar';
  host.className = 'pro-macros-sidebar';
  host.innerHTML = `
    <div class="pro-macros-header">
      <p class="pro-macros-eyebrow">Resumo de macronutrientes</p>
      <p class="pro-macros-titulo">Cálculo em tempo real</p>
    </div>

    <div class="pro-pie-wrap">
      <svg viewBox="0 0 200 200" class="pro-pie" id="pro-pie">
        <circle cx="100" cy="100" r="80" fill="#f5f1ea"/>
        <circle cx="100" cy="100" r="55" fill="#fff"/>
        <text x="100" y="95" text-anchor="middle" class="pro-pie-kcal" id="pro-pie-kcal">0</text>
        <text x="100" y="115" text-anchor="middle" class="pro-pie-kcal-lbl">kcal totais</text>
      </svg>
    </div>

    <div class="pro-macros-rows" id="pro-macros-rows">
      <!-- Linhas geradas por atualizar() -->
    </div>

    <div class="pro-macros-foot" id="pro-macros-foot"></div>
  `;
  document.body.appendChild(host);

  const sidebar = {
    atualizar() {
      const blocks = document.querySelectorAll('#refeicoes-container .dynamic-block');
      let totais = { ptn:0, cho:0, lip:0, kcal:0, qty_g:0 };
      blocks.forEach(b => {
        const lista = b._proAlimentos || [];
        lista.forEach(a => {
          totais.ptn   += a.ptn   || 0;
          totais.cho   += a.cho   || 0;
          totais.lip   += a.lip   || 0;
          totais.kcal  += a.kcal  || 0;
          totais.qty_g += a.qty_g || 0;
        });
      });

      // Metas vêm dos campos do plano
      const meta = {
        kcal: parseFloat(document.getElementById('f-kcal')?.value)   || 0,
        ptn:  parseFloat(document.getElementById('f-ptn')?.value)    || 0,
        cho:  parseFloat(document.getElementById('f-cho')?.value)    || 0,
        lip:  parseFloat(document.getElementById('f-lip')?.value)    || 0,
      };
      // Peso do paciente (pra g/kg) — pega de localStorage ou input se houver
      const peso = parseFloat(localStorage.getItem('pac_peso')) ||
                   parseFloat(document.getElementById('f-peso-paciente')?.value) || 0;

      // Pie chart: kcal de cada macro (4 kcal/g PTN+CHO; 9 kcal/g LIP)
      const kp = totais.ptn * 4;
      const kc = totais.cho * 4;
      const kl = totais.lip * 9;
      const kt = kp + kc + kl;
      const renderPie = () => {
        const pie = document.getElementById('pro-pie');
        if (!pie) return;
        // Limpa segments existentes
        pie.querySelectorAll('.pro-pie-seg').forEach(s => s.remove());
        if (kt <= 0) {
          document.getElementById('pro-pie-kcal').textContent = '0';
          return;
        }
        const segs = [
          { val: kp, color: '#A04030', label: 'PTN' },
          { val: kc, color: '#5E4FB8', label: 'CHO' },
          { val: kl, color: '#C26B3F', label: 'LIP' },
        ];
        let acc = 0;
        const cx = 100, cy = 100, r = 80;
        for (const s of segs) {
          if (s.val <= 0) continue;
          const a0 = (acc / kt) * Math.PI * 2 - Math.PI / 2;
          acc += s.val;
          const a1 = (acc / kt) * Math.PI * 2 - Math.PI / 2;
          const x0 = cx + r * Math.cos(a0);
          const y0 = cy + r * Math.sin(a0);
          const x1 = cx + r * Math.cos(a1);
          const y1 = cy + r * Math.sin(a1);
          const large = (a1 - a0) > Math.PI ? 1 : 0;
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`);
          path.setAttribute('fill', s.color);
          path.classList.add('pro-pie-seg');
          // Inserir antes do círculo branco (para ficar atrás)
          const branco = pie.querySelectorAll('circle')[1];
          pie.insertBefore(path, branco);
        }
        document.getElementById('pro-pie-kcal').textContent = round1(totais.kcal).toLocaleString('pt-BR');
      };
      renderPie();

      // Linhas Atual vs Meta
      const rows = [
        { lbl: 'PTN', cor: '#A04030', atual: totais.ptn, meta: meta.ptn, unit: 'g' },
        { lbl: 'CHO', cor: '#5E4FB8', atual: totais.cho, meta: meta.cho, unit: 'g' },
        { lbl: 'LIP', cor: '#C26B3F', atual: totais.lip, meta: meta.lip, unit: 'g' },
      ];
      document.getElementById('pro-macros-rows').innerHTML = rows.map(r => {
        const pct = meta.kcal > 0 ? ((r.atual * (r.lbl === 'LIP' ? 9 : 4) / meta.kcal) * 100) : 0;
        const gKg = peso > 0 ? (r.atual / peso) : 0;
        const diff = r.meta > 0 ? (r.atual - r.meta) : 0;
        const arrow = !r.meta ? '' : (Math.abs(diff) < 5 ? '<svg class="arr ok" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3D6B4F" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
                       : diff > 0 ? '<svg class="arr up" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A04030" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>'
                                  : '<svg class="arr dn" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B8860B" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>');
        return `
          <div class="pro-macro-row" style="--macro-cor:${r.cor}">
            <div class="pro-macro-l">
              <span class="pro-macro-tag" style="background:${r.cor}">${r.lbl}</span>
              <span class="pro-macro-gkg">${peso ? round2(gKg) + ' g/kg' : '—'}</span>
            </div>
            <div class="pro-macro-c">
              <span class="pro-macro-atual">${round1(r.atual)}<small>g</small></span>
              <span class="pro-macro-pct">${round1(pct)}%</span>
            </div>
            <div class="pro-macro-r">
              <span class="pro-macro-meta">${r.meta ? round1(r.meta) + 'g' : 'sem meta'}</span>
              ${arrow}
            </div>
          </div>`;
      }).join('');

      // Footer com kcal vs meta
      const pctKcal = meta.kcal > 0 ? (totais.kcal / meta.kcal * 100) : 0;
      const corKcal = pctKcal > 110 ? '#A04030' : pctKcal < 85 ? '#B8860B' : '#3D6B4F';
      document.getElementById('pro-macros-foot').innerHTML = `
        <div class="pro-kcal-bar">
          <div class="pro-kcal-fill" style="width:${Math.min(120, pctKcal)}%;background:${corKcal}"></div>
        </div>
        <div class="pro-kcal-info">
          <span class="pro-kcal-atual">${round1(totais.kcal).toLocaleString('pt-BR')} kcal</span>
          <span class="pro-kcal-meta">de ${meta.kcal ? meta.kcal.toLocaleString('pt-BR') : '—'} kcal</span>
        </div>`;
    },
    toggle() {
      host.classList.toggle('aberta');
    },
  };
  window._planoSidebar = sidebar;

  // Listener: campos de meta mudaram → reatualiza
  ['f-kcal', 'f-ptn', 'f-cho', 'f-lip'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => sidebar.atualizar());
  });

  sidebar.atualizar();
  return sidebar;
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

// Expõe globalmente para admin-plano.js usar
window._refeicoesPro = {
  carregarAlimentos,
  abrirModalAdicionarAlimento,
  renderTabelaAlimentos,
  getRefeicaoData,
  montarSidebarMacros,
  MEDIDAS, MEDIDAS_ORDEM,
};
