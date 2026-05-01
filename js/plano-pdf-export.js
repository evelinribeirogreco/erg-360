// ============================================================
// plano-pdf-export.js
// ────────────────────────────────────────────────────────────
// Gera um PDF formatado do plano alimentar para envio à paciente.
//
// Abordagem: abre uma nova janela com HTML dedicado (sem UI de
// edição), aplica CSS print-ready, e chama window.print() — o
// browser oferece "Salvar como PDF" no diálogo.
//
// Vantagens sobre jsPDF + canvas:
//   • PDF vetorial (texto pesquisável e selecionável)
//   • Zero dependências externas
//   • Quebra de página automática e inteligente
//   • Qualidade de impressão nativa
//
// Uso:
//   import { exportPlanoPDF } from './plano-pdf-export.js';
//   exportPlanoPDF(plano, nomePaciente);
// ============================================================

// modo: 'preview' (apenas abre em nova aba) | 'print' (abre + dispara diálogo de impressão/salvar PDF)
export function exportPlanoPDF(plano, nomePaciente = 'Paciente', modo = 'print') {
  if (!plano) {
    alert('Preencha o plano antes de exportar.');
    return;
  }

  const html = renderPlanoHTML(plano, nomePaciente);
  const win  = window.open('', '_blank', 'width=900,height=720');
  if (!win) {
    alert('Permita pop-ups para visualizar/baixar o PDF.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();

  if (modo === 'preview') {
    // Apenas mostra; usuário decide imprimir/salvar
    return;
  }

  // Aguarda renderizar fontes e layout antes de imprimir
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  };
}

// ── Helpers ───────────────────────────────────────────────
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const nz = (v, unit = '') => (v === null || v === undefined || v === '' ? '—' : `${v}${unit}`);

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return iso; }
};

// ── Render de seções ──────────────────────────────────────
function sectionHeader(title, eyebrow = '') {
  return `
    <header class="sec-hd">
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
      <h2>${esc(title)}</h2>
    </header>`;
}

function renderCapa(plano, nome) {
  const kcal = plano.kcal_alvo ?? '—';
  return `
    <section class="capa page-break">
      <div class="capa-inner">
        <p class="capa-brand">Evelin Ribeiro Greco</p>
        <p class="capa-brand-sub">Nutrição Clínica</p>

        <h1 class="capa-titulo">Plano Alimentar</h1>
        <p class="capa-paciente">${esc(nome)}</p>

        <div class="capa-meta">
          <div><span>Data de elaboração</span><strong>${fmtDate(plano.data_elaboracao)}</strong></div>
          <div><span>Meta calórica</span><strong>${kcal} kcal</strong></div>
          <div><span>Refeições</span><strong>${plano.num_refeicoes ?? '—'}</strong></div>
        </div>

        ${plano.descricao ? `<p class="capa-descricao">${esc(plano.descricao)}</p>` : ''}
        ${plano.sub_titulo ? `<p class="capa-subtitulo">${esc(plano.sub_titulo)}</p>` : ''}

        <p class="capa-rodape">Documento pessoal · Uso exclusivo da paciente</p>
      </div>
    </section>`;
}

function renderMacros(plano) {
  const kcal = plano.kcal_alvo, ptn = plano.proteina_g, cho = plano.carboidrato_g, lip = plano.lipidio_g, fib = plano.fibras_g;
  if (!(kcal || ptn || cho || lip || fib)) return '';

  // Percentuais (se kcal alvo informado)
  let pctPtn = '—', pctCho = '—', pctLip = '—';
  if (kcal) {
    if (ptn) pctPtn = Math.round((ptn * 4 / kcal) * 100) + '%';
    if (cho) pctCho = Math.round((cho * 4 / kcal) * 100) + '%';
    if (lip) pctLip = Math.round((lip * 9 / kcal) * 100) + '%';
  }

  return `
    <section class="sec">
      ${sectionHeader('Metas nutricionais', 'Resumo')}
      <div class="macros-grid">
        <div class="macro-card macro-kcal">
          <span class="macro-val">${nz(kcal)}</span>
          <span class="macro-unit">kcal</span>
          <span class="macro-lbl">Meta calórica</span>
        </div>
        <div class="macro-card">
          <span class="macro-val">${nz(ptn)}<small>g</small></span>
          <span class="macro-lbl">Proteína <em>${pctPtn}</em></span>
        </div>
        <div class="macro-card">
          <span class="macro-val">${nz(cho)}<small>g</small></span>
          <span class="macro-lbl">Carboidrato <em>${pctCho}</em></span>
        </div>
        <div class="macro-card">
          <span class="macro-val">${nz(lip)}<small>g</small></span>
          <span class="macro-lbl">Lipídio <em>${pctLip}</em></span>
        </div>
        <div class="macro-card">
          <span class="macro-val">${nz(fib)}<small>g</small></span>
          <span class="macro-lbl">Fibras</span>
        </div>
      </div>
      ${plano.criterio_central ? `<p class="obs"><strong>Critério central:</strong> ${esc(plano.criterio_central)}</p>` : ''}
      ${plano.calculo_vet ? `<p class="obs"><strong>Cálculo do VET:</strong> ${esc(plano.calculo_vet)}</p>` : ''}
    </section>`;
}

function renderRefeicoes(plano) {
  if (!plano.refeicoes?.length) return '';
  return `
    <section class="sec">
      ${sectionHeader('Plano de refeições', 'Cardápio')}
      ${plano.refeicoes.map(r => {
        // Formato novo (Onda 1): alimentos[] com macros calculados
        const usaAlimentos = Array.isArray(r.alimentos) && r.alimentos.length > 0;
        // Formato antigo: itens[] com strings
        const usaItens = !usaAlimentos && Array.isArray(r.itens) && r.itens.length > 0;
        // Macros já vêm calculados ou somam dos alimentos
        let macros = r.macros || {};
        if (usaAlimentos && (!macros.kcal && !macros.ptn)) {
          macros = r.alimentos.reduce((acc, a) => ({
            kcal:   (acc.kcal   || 0) + (a.kcal   || 0),
            ptn:    (acc.ptn    || 0) + (a.ptn    || 0),
            cho:    (acc.cho    || 0) + (a.cho    || 0),
            lip:    (acc.lip    || 0) + (a.lip    || 0),
            fibras: (acc.fibras || 0) + (a.fibras || 0),
          }), {});
          // Arredonda
          for (const k of Object.keys(macros)) macros[k] = Math.round(macros[k] * 10) / 10;
        }
        return `
        <article class="refeicao avoid-break">
          <header class="ref-hd">
            <h3>${esc(r.nome)}</h3>
            ${r.horario ? `<span class="ref-horario">${esc(r.horario)}</span>` : ''}
          </header>

          ${usaAlimentos ? `
            <table class="ref-tabela">
              <thead>
                <tr>
                  <th>Alimento</th>
                  <th class="num">Qtd</th>
                  <th class="num">PTN</th>
                  <th class="num">CHO</th>
                  <th class="num">LIP</th>
                  <th class="num">kcal</th>
                </tr>
              </thead>
              <tbody>
                ${r.alimentos.map(a => `
                  <tr>
                    <td>
                      <strong>${esc(a.nome)}</strong>
                      ${a.medida_label ? `<br><span class="medida">${esc(a.qty_medida)} × ${esc(a.medida_label)}</span>` : ''}
                      ${a.novo ? '<span class="tag-novo">novo</span>' : ''}
                    </td>
                    <td class="num">${esc(a.qty_g)}<span class="unit">g</span></td>
                    <td class="num m-ptn">${esc(a.ptn || 0)}</td>
                    <td class="num m-cho">${esc(a.cho || 0)}</td>
                    <td class="num m-lip">${esc(a.lip || 0)}</td>
                    <td class="num">${esc(a.kcal || 0)}</td>
                  </tr>`).join('')}
                <tr class="ref-total">
                  <td><strong>TOTAL</strong></td>
                  <td class="num">${macros.qty_g ? Math.round(macros.qty_g) : '—'}<span class="unit">g</span></td>
                  <td class="num m-ptn"><strong>${esc(macros.ptn || 0)}</strong></td>
                  <td class="num m-cho"><strong>${esc(macros.cho || 0)}</strong></td>
                  <td class="num m-lip"><strong>${esc(macros.lip || 0)}</strong></td>
                  <td class="num"><strong>${esc(macros.kcal || 0)}</strong></td>
                </tr>
              </tbody>
            </table>` : ''}

          ${usaItens ? `
            <ul class="ref-itens">
              ${r.itens.map(it => `
                <li>
                  <span class="ref-item-qty">${esc(it.qty || '')}</span>
                  <span class="ref-item-nome">${esc(it.nome)}</span>
                </li>`).join('')}
            </ul>` : ''}

          ${(!usaAlimentos && macros && (macros.kcal || macros.ptn || macros.cho || macros.lip)) ? `
            <p class="ref-macros">
              ${macros.kcal ? `<span><strong>${esc(macros.kcal)}</strong> kcal</span>` : ''}
              ${macros.ptn  ? `<span>PTN <strong>${esc(macros.ptn)}</strong>g</span>` : ''}
              ${macros.cho  ? `<span>CHO <strong>${esc(macros.cho)}</strong>g</span>` : ''}
              ${macros.lip  ? `<span>LIP <strong>${esc(macros.lip)}</strong>g</span>` : ''}
              ${macros.fibras ? `<span>Fibras <strong>${esc(macros.fibras)}</strong>g</span>` : ''}
            </p>` : ''}

          ${r.obs ? `<p class="ref-obs"><em>${esc(r.obs)}</em></p>` : ''}
          ${r.alerta ? `<p class="ref-alerta cor-${esc(r.alerta_cor || 'amarelo')}">⚠ ${esc(r.alerta)}</p>` : ''}
        </article>`;
      }).join('')}
    </section>`;
}

function renderSubstituicoes(plano) {
  if (!plano.substituicoes?.length) return '';
  return `
    <section class="sec page-break-before">
      ${sectionHeader('Tabela de substituições', 'Flexibilidade')}
      ${plano.substituicoes.map(g => `
        <div class="subst-grupo avoid-break">
          <h3>${esc(g.categoria)}</h3>
          <table class="subst-tbl">
            <thead><tr><th>Alimento base</th><th>Opção 1</th><th>Opção 2</th></tr></thead>
            <tbody>
              ${g.itens.map(it => `
                <tr>
                  <td><strong>${esc(it.base)}</strong></td>
                  <td>${esc(it.sub1)}</td>
                  <td>${esc(it.sub2)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`).join('')}
    </section>`;
}

function renderHidratacao(plano) {
  const h = plano.hidratacao;
  if (!h) return '';
  const meta = h.meta, timeline = h.timeline || [], restr = h.restricoes;
  if (!meta && !timeline.length && !restr) return '';
  return `
    <section class="sec avoid-break">
      ${sectionHeader('Hidratação', 'Água')}
      ${meta ? `<p class="obs"><strong>Meta diária:</strong> ${esc(meta)}</p>` : ''}
      ${timeline.length ? `
        <ul class="hidra-tl">
          ${timeline.map(t => `
            <li>
              <span class="hidra-hora">${esc(t.hora)}</span>
              <span class="hidra-desc">${esc(t.desc)}</span>
              ${t.qty ? `<span class="hidra-qty">${esc(t.qty)}</span>` : ''}
            </li>`).join('')}
        </ul>` : ''}
      ${restr ? `<p class="obs"><strong>Restrições:</strong> ${esc(restr)}</p>` : ''}
    </section>`;
}

function renderSuplementos(plano) {
  const s = plano.suplementacao;
  if (!s?.itens?.length) return '';
  return `
    <section class="sec avoid-break">
      ${sectionHeader('Suplementação', 'Protocolo')}
      ${s.obs ? `<p class="obs">${esc(s.obs)}</p>` : ''}
      <table class="supl-tbl">
        <thead><tr><th>Suplemento</th><th>Dose</th><th>Horário</th><th>Status</th></tr></thead>
        <tbody>
          ${s.itens.map(it => `
            <tr>
              <td><strong>${esc(it.nome)}</strong>${it.justificativa ? `<br><small>${esc(it.justificativa)}</small>` : ''}</td>
              <td>${esc(it.dose)}</td>
              <td>${esc(it.horario)}</td>
              <td><span class="tag tag-${esc(it.tag_cor || 'verde')}">${esc(it.status)}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </section>`;
}

function renderMicro(plano) {
  if (!plano.micronutrientes?.length) return '';
  return `
    <section class="sec avoid-break">
      ${sectionHeader('Micronutrientes prioritários', 'Foco')}
      ${plano.micronutrientes.map(m => `
        <div class="micro-card">
          <p class="micro-nome">${esc(m.nome)}</p>
          ${m.motivo ? `<p class="micro-linha"><strong>Motivo:</strong> ${esc(m.motivo)}</p>` : ''}
          ${m.fontes ? `<p class="micro-linha"><strong>Fontes:</strong> ${esc(m.fontes)}</p>` : ''}
          ${m.meta ? `<p class="micro-linha"><strong>Meta:</strong> ${esc(m.meta)}</p>` : ''}
        </div>`).join('')}
    </section>`;
}

function renderListaCompras(plano) {
  if (!plano.lista_compras?.length) return '';
  return `
    <section class="sec page-break-before">
      ${sectionHeader('Lista de compras', 'Semana')}
      <div class="compras-grid">
        ${plano.lista_compras.map(cat => `
          <div class="compras-cat avoid-break">
            <h3>${esc(cat.categoria)}${cat.sub ? ` <small>— ${esc(cat.sub)}</small>` : ''}</h3>
            <ul>
              ${cat.itens.map(it => `<li>${esc(it.nome)}${it.novo ? ' <em>(novo)</em>' : ''}</li>`).join('')}
            </ul>
          </div>`).join('')}
      </div>
      ${plano.compras_evitar ? `<p class="obs"><strong>Evitar nas compras:</strong> ${esc(plano.compras_evitar)}</p>` : ''}
    </section>`;
}

function renderOrientacoes(plano) {
  const o = plano.orientacoes;
  if (!o) return '';
  const listKids = (arr, titulo, cor) => !arr?.length ? '' : `
    <div class="orient-col">
      <h3 class="orient-h ${cor}">${esc(titulo)}</h3>
      <ul>
        ${arr.map(i => `<li class="${i.destaque ? 'destaque' : ''}">${esc(i.texto)}</li>`).join('')}
      </ul>
    </div>`;

  if (!(o.manter?.length || o.mudar?.length || o.atencao?.length || o.exames?.length || o.rodape)) return '';

  return `
    <section class="sec">
      ${sectionHeader('Orientações clínicas', 'Conduta')}
      <div class="orient-grid">
        ${listKids(o.manter,  'O que manter',       'verde')}
        ${listKids(o.mudar,   'O que ajustar',      'laranja')}
        ${listKids(o.atencao, 'Sinais de atenção',  'vermelho')}
        ${listKids(o.exames,  'Exames de retorno',  'azul')}
      </div>
      ${o.rodape ? `<p class="obs obs-rodape">${esc(o.rodape)}</p>` : ''}
    </section>`;
}

// ── HTML completo ─────────────────────────────────────────
function renderPlanoHTML(plano, nome) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Plano Alimentar — ${esc(nome)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
  ${renderCapa(plano, nome)}
  <main class="corpo">
    ${renderMacros(plano)}
    ${renderRefeicoes(plano)}
    ${renderHidratacao(plano)}
    ${renderSuplementos(plano)}
    ${renderMicro(plano)}
    ${renderSubstituicoes(plano)}
    ${renderListaCompras(plano)}
    ${renderOrientacoes(plano)}
  </main>
  <footer class="doc-footer">
    <p>Evelin Ribeiro Greco · Nutrição Clínica</p>
    <p class="doc-footer-sub">Plano elaborado em ${fmtDate(plano.data_elaboracao)} · Documento pessoal</p>
  </footer>
  <div id="print-toolbar" class="no-print">
    <button onclick="window.print()">Imprimir / Salvar PDF</button>
    <button onclick="window.close()" class="btn-close">Fechar</button>
  </div>
</body>
</html>`;
}

// ── CSS de impressão ──────────────────────────────────────
const PRINT_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'Georgia', 'DM Sans', serif;
    color: #2c2218; background: #fff;
    font-size: 11pt; line-height: 1.55;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Capa */
  .capa {
    min-height: 80vh;
    display: flex; align-items: center; justify-content: center;
    padding: 20mm 0;
    border-bottom: 1px solid #e8dbc5;
  }
  .capa-inner { max-width: 90%; text-align: center; }
  .capa-brand {
    font-family: 'Cormorant Garamond', 'Georgia', serif;
    font-size: 14pt; letter-spacing: 0.1em; color: #7a5d3b;
    margin-bottom: 4px;
  }
  .capa-brand-sub {
    font-size: 8pt; letter-spacing: 0.3em; text-transform: uppercase;
    color: #a08660; margin-bottom: 40px;
  }
  .capa-titulo {
    font-family: 'Cormorant Garamond', 'Georgia', serif;
    font-size: 34pt; font-weight: 300; margin: 0 0 14px;
    color: #2c2218;
  }
  .capa-paciente {
    font-size: 16pt; color: #7a5d3b; margin-bottom: 36px;
    font-style: italic;
  }
  .capa-meta {
    display: flex; justify-content: center; gap: 22px;
    margin: 0 0 30px; flex-wrap: wrap;
  }
  .capa-meta > div {
    padding: 10px 18px;
    border: 1px solid #e8dbc5;
    min-width: 120px;
  }
  .capa-meta span {
    display: block; font-size: 7pt; text-transform: uppercase;
    letter-spacing: 0.14em; color: #8c7a5f; margin-bottom: 4px;
  }
  .capa-meta strong { font-size: 11pt; color: #2c2218; font-weight: 500; }
  .capa-descricao { font-size: 11pt; color: #4a3d2c; max-width: 70%; margin: 16px auto; }
  .capa-subtitulo { font-size: 9pt; color: #8c7a5f; font-style: italic; }
  .capa-rodape {
    margin-top: 40px; font-size: 7pt; text-transform: uppercase;
    letter-spacing: 0.24em; color: #a08660;
  }

  /* Seções */
  .corpo { padding: 0 0 20mm; }
  .sec { margin-bottom: 18mm; page-break-inside: auto; }
  .sec-hd { border-bottom: 1px solid #c4a06c; padding-bottom: 8px; margin-bottom: 16px; }
  .sec-hd .eyebrow {
    font-size: 7.5pt; letter-spacing: 0.2em; text-transform: uppercase;
    color: #8c7a5f; margin-bottom: 3px;
  }
  .sec-hd h2 {
    font-family: 'Cormorant Garamond', 'Georgia', serif;
    font-size: 18pt; font-weight: 300; margin: 0; color: #2c2218;
  }

  .obs { font-size: 10pt; color: #4a3d2c; margin: 6px 0; }
  .obs strong { color: #2c2218; }
  .obs-rodape { margin-top: 14px; font-style: italic; }

  /* Macros */
  .macros-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }
  .macro-card {
    border: 1px solid #e8dbc5; padding: 12px; text-align: center;
    display: flex; flex-direction: column; gap: 4px;
  }
  .macro-card.macro-kcal { background: #faf6ee; border-color: #c4a06c; }
  .macro-val {
    font-family: 'Cormorant Garamond', 'Georgia', serif;
    font-size: 20pt; font-weight: 400; color: #2c2218;
  }
  .macro-val small { font-size: 10pt; color: #7a5d3b; font-weight: 400; }
  .macro-unit { font-size: 8pt; color: #8c7a5f; }
  .macro-lbl { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.1em; color: #8c7a5f; }
  .macro-lbl em { font-style: normal; color: #7a5d3b; font-weight: 500; }

  /* Refeições */
  .refeicao {
    border: 1px solid #e8dbc5;
    padding: 14px 16px;
    margin-bottom: 10px;
  }
  .ref-hd {
    display: flex; align-items: baseline; justify-content: space-between;
    border-bottom: 1px dashed #e8dbc5; padding-bottom: 6px; margin-bottom: 8px;
  }
  .ref-hd h3 {
    font-family: 'Cormorant Garamond', 'Georgia', serif;
    font-size: 14pt; font-weight: 400; margin: 0; color: #2c2218;
  }
  .ref-horario { font-size: 9pt; color: #7a5d3b; font-style: italic; }
  .ref-itens { list-style: none; padding: 0; margin: 0 0 10px; }
  .ref-itens li {
    display: flex; gap: 10px; padding: 3px 0;
    border-bottom: 1px dotted #f0e6d4; font-size: 10pt;
  }
  .ref-item-qty { min-width: 75px; color: #7a5d3b; font-weight: 500; }
  .ref-item-nome { flex: 1; }
  .ref-macros {
    display: flex; gap: 14px; flex-wrap: wrap;
    font-size: 8.5pt; color: #7a5d3b;
    padding-top: 6px; border-top: 1px dashed #e8dbc5; margin: 0;
  }
  .ref-macros strong { color: #2c2218; }
  .ref-alerta {
    margin: 6px 0 0; padding: 6px 10px;
    font-size: 9pt; border-left: 3px solid #d4a843;
    background: #fdf6e3; color: #7a5d20;
  }
  .ref-alerta.cor-vermelho { border-color: #a04030; background: #fbe9e5; color: #7a2e20; }
  .ref-alerta.cor-verde { border-color: #4a7a4a; background: #e9f2e9; color: #2e5a2e; }
  .ref-alerta.cor-laranja { border-color: #c26b3f; background: #fdeee5; color: #7a3a20; }
  .ref-alerta.cor-azul { border-color: #2d6a8a; background: #e5f0f7; color: #1e4a5a; }
  .ref-obs { margin: 4px 0; font-size: 9pt; color: #6b5a40; }

  /* Tabela de alimentos (formato Onda 1) */
  .ref-tabela {
    width: 100%; border-collapse: collapse;
    margin: 8px 0 10px;
    font-size: 9.5pt;
  }
  .ref-tabela thead th {
    text-align: left;
    padding: 6px 8px;
    background: #f7f3ed;
    border-bottom: 1px solid #c9a882;
    font-weight: 600;
    font-size: 8.5pt; letter-spacing: 0.06em;
    text-transform: uppercase; color: #7a5e2e;
  }
  .ref-tabela tbody td {
    padding: 6px 8px;
    border-bottom: 1px dotted #f0e6d4;
    vertical-align: top;
  }
  .ref-tabela td.num, .ref-tabela th.num {
    text-align: right; white-space: nowrap;
  }
  .ref-tabela .medida {
    font-size: 8pt; color: #7a5d3b; font-style: italic;
  }
  .ref-tabela .unit {
    font-size: 0.8em; color: #999; margin-left: 1px;
  }
  .ref-tabela .m-ptn { color: #a04030; }
  .ref-tabela .m-cho { color: #5e4fb8; }
  .ref-tabela .m-lip { color: #c26b3f; }
  .ref-tabela .ref-total td {
    background: #f7f3ed;
    border-top: 1px solid #c9a882; border-bottom: none;
    font-weight: 600;
  }
  .ref-tabela .tag-novo {
    display: inline-block;
    margin-left: 4px;
    padding: 1px 6px;
    background: rgba(201,168,76,0.18);
    color: #8b6e18;
    font-size: 7.5pt; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  /* Substituições */
  .subst-grupo { margin-bottom: 10px; }
  .subst-grupo h3 {
    font-family: 'Cormorant Garamond', 'Georgia', serif;
    font-size: 13pt; font-weight: 400; color: #2c2218; margin: 0 0 6px;
    border-bottom: 1px solid #e8dbc5; padding-bottom: 4px;
  }
  .subst-tbl {
    width: 100%; border-collapse: collapse;
    font-size: 9.5pt;
  }
  .subst-tbl th, .subst-tbl td {
    text-align: left; padding: 6px 10px;
    border-bottom: 1px solid #f0e6d4;
  }
  .subst-tbl th {
    font-size: 7.5pt; text-transform: uppercase;
    letter-spacing: 0.14em; color: #8c7a5f; font-weight: 500;
    border-bottom: 1px solid #c4a06c;
  }

  /* Hidratação */
  .hidra-tl { list-style: none; padding: 0; margin: 10px 0 0;
    border-left: 2px solid #c4a06c; padding-left: 12px; }
  .hidra-tl li {
    display: flex; gap: 10px; padding: 4px 0;
    font-size: 10pt;
  }
  .hidra-hora { min-width: 55px; color: #7a5d3b; font-weight: 500; }
  .hidra-desc { flex: 1; }
  .hidra-qty { color: #7a5d3b; font-style: italic; }

  /* Suplementos */
  .supl-tbl {
    width: 100%; border-collapse: collapse; font-size: 9.5pt;
  }
  .supl-tbl th, .supl-tbl td {
    padding: 7px 10px; border-bottom: 1px solid #f0e6d4;
    vertical-align: top;
  }
  .supl-tbl th {
    font-size: 7.5pt; text-transform: uppercase;
    letter-spacing: 0.14em; color: #8c7a5f;
    border-bottom: 1px solid #c4a06c; text-align: left;
  }
  .supl-tbl small { color: #8c7a5f; font-size: 8.5pt; font-style: italic; }
  .tag {
    display: inline-block; padding: 2px 8px; font-size: 8pt;
    border-radius: 10px; font-weight: 500;
  }
  .tag-verde    { background: #e9f2e9; color: #2e5a2e; }
  .tag-amarelo  { background: #fdf6e3; color: #7a5d20; }
  .tag-laranja  { background: #fce9d4; color: #7a4d1a; }
  .tag-vermelho { background: #fbe9e5; color: #7a2e20; }
  .tag-azul     { background: #e5eff8; color: #1f4a6e; }

  /* Micronutrientes */
  .micro-card {
    border-left: 3px solid #c4a06c;
    padding: 8px 14px; margin-bottom: 8px;
    background: #fbf7f0;
  }
  .micro-nome {
    font-family: 'Cormorant Garamond', 'Georgia', serif;
    font-size: 12pt; font-weight: 500; color: #2c2218; margin: 0 0 4px;
  }
  .micro-linha { font-size: 9.5pt; color: #4a3d2c; margin: 2px 0; }

  /* Lista de compras */
  .compras-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .compras-cat { border: 1px solid #e8dbc5; padding: 10px 14px; }
  .compras-cat h3 {
    font-family: 'Cormorant Garamond', 'Georgia', serif;
    font-size: 12pt; font-weight: 500; color: #2c2218; margin: 0 0 6px;
    border-bottom: 1px dashed #e8dbc5; padding-bottom: 3px;
  }
  .compras-cat small { font-size: 8.5pt; color: #8c7a5f; font-weight: 400; }
  .compras-cat ul { list-style: none; padding: 0; margin: 0; font-size: 10pt; }
  .compras-cat li { padding: 2px 0; border-bottom: 1px dotted #f0e6d4; }
  .compras-cat li em {
    color: #c4a06c; font-style: normal; font-size: 8pt;
    text-transform: uppercase; letter-spacing: 0.08em;
  }

  /* Orientações */
  .orient-grid {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .orient-col {
    border: 1px solid #e8dbc5; padding: 10px 14px;
  }
  .orient-h {
    font-family: 'Cormorant Garamond', 'Georgia', serif;
    font-size: 12pt; font-weight: 500; margin: 0 0 6px;
    padding-bottom: 4px; border-bottom: 1px solid;
  }
  .orient-h.verde     { color: #2e5a2e; border-color: #e9f2e9; }
  .orient-h.laranja   { color: #7a4d1a; border-color: #fce9d4; }
  .orient-h.vermelho  { color: #7a2e20; border-color: #fbe9e5; }
  .orient-h.azul      { color: #1f4a6e; border-color: #e5eff8; }
  .orient-col ul {
    list-style: disc; padding-left: 16px; margin: 0;
    font-size: 10pt; color: #4a3d2c;
  }
  .orient-col li { padding: 2px 0; }
  .orient-col li.destaque { font-weight: 500; color: #2c2218; }

  /* Page breaks */
  .page-break { page-break-after: always; }
  .page-break-before { page-break-before: always; }
  .avoid-break { page-break-inside: avoid; }

  /* Rodapé */
  .doc-footer {
    padding: 12mm 0 0; margin-top: 12mm;
    border-top: 1px solid #e8dbc5;
    text-align: center;
    font-size: 8pt; color: #8c7a5f;
  }
  .doc-footer p { margin: 2px 0; }
  .doc-footer-sub { font-style: italic; }

  /* Barra de ações (só aparece na tela, não no PDF) */
  #print-toolbar {
    position: fixed; bottom: 18px; right: 18px;
    display: flex; gap: 8px;
    background: #2c2218; padding: 10px 14px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    z-index: 9999;
  }
  #print-toolbar button {
    font-family: 'DM Sans', sans-serif;
    font-size: 10pt; font-weight: 500;
    padding: 8px 16px;
    background: #c4a06c; color: #2c2218;
    border: none; cursor: pointer;
    letter-spacing: 0.08em; text-transform: uppercase;
  }
  #print-toolbar .btn-close {
    background: transparent; color: #fff; border: 1px solid #c4a06c;
  }

  @media print {
    .no-print, #print-toolbar { display: none !important; }
  }
`;
