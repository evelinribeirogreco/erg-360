// ============================================================
// ERG 360 — admin-plano-extras.js
// 5 features: autocomplete, TMB+GET, substituições, autosave, validação
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const $ = (id) => document.getElementById(id);

// ════════════════════════════════════════════════════════════
// #5 AUTOCOMPLETE INTELIGENTE DE ALIMENTOS
// Quando usuário digita em "item-nome", busca no banco e mostra
// dropdown com sugestões + macros pré-calculados.
// ════════════════════════════════════════════════════════════

let autocompleteCache = []; // cache local pra evitar requests repetidos
let autocompleteFetched = false;

async function carregarBancoAlimentos() {
  if (autocompleteFetched) return autocompleteCache;
  try {
    const { data, error } = await supabase
      .from('alimentos')
      .select('id, nome, kcal, ptn_g, cho_g, lip_g, fibras_g, porcao_padrao_g')
      .eq('ativo', true)
      .order('nome');
    if (!error && data) {
      autocompleteCache = data;
      autocompleteFetched = true;
    }
  } catch (e) {
    console.warn('[admin-plano-extras] erro ao carregar alimentos:', e);
  }
  return autocompleteCache;
}

function fuzzyMatch(query, alimento) {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  const nome = alimento.nome.toLowerCase();
  // Match em palavras separadas
  const tokens = q.split(/\s+/);
  return tokens.every(t => nome.includes(t));
}

function fecharDropdownAutocomplete() {
  document.querySelectorAll('.alim-autocomplete-dropdown').forEach(d => d.remove());
}

function abrirDropdownAutocomplete(input) {
  fecharDropdownAutocomplete();
  if (!autocompleteCache.length) return;
  const q = input.value.trim();
  if (q.length < 2) return;

  const sugestoes = autocompleteCache.filter(a => fuzzyMatch(q, a)).slice(0, 8);
  if (!sugestoes.length) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'alim-autocomplete-dropdown';
  dropdown.innerHTML = sugestoes.map(a => `
    <button type="button" class="alim-autocomplete-opt" data-alim-id="${a.id}"
      data-nome="${escapeAttr(a.nome)}" data-kcal="${a.kcal||0}"
      data-ptn="${a.ptn_g||0}" data-cho="${a.cho_g||0}" data-lip="${a.lip_g||0}" data-fibras="${a.fibras_g||0}">
      <span class="alim-ac-nome">${escapeHtml(a.nome)}</span>
      <span class="alim-ac-macros">
        ${a.kcal ? Math.round(a.kcal) + ' kcal' : '—'}
        · P ${a.ptn_g || 0}g · C ${a.cho_g || 0}g · L ${a.lip_g || 0}g
        <span class="alim-ac-porcao">por ${a.porcao_padrao_g || 100}g</span>
      </span>
    </button>
  `).join('');

  // Posiciona abaixo do input
  const rect = input.getBoundingClientRect();
  dropdown.style.cssText = `
    position: absolute;
    top: ${rect.bottom + window.scrollY + 4}px;
    left: ${rect.left + window.scrollX}px;
    width: ${Math.max(rect.width, 320)}px;
    z-index: 1000;
  `;
  document.body.appendChild(dropdown);

  // Click escolhe
  dropdown.querySelectorAll('.alim-autocomplete-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      input.value = opt.dataset.nome;
      // Preenche macros da refeição (se for o último item, soma)
      _aplicarMacrosAlimento(input, {
        kcal:   +opt.dataset.kcal,
        ptn_g:  +opt.dataset.ptn,
        cho_g:  +opt.dataset.cho,
        lip_g:  +opt.dataset.lip,
        fibras: +opt.dataset.fibras,
      });
      fecharDropdownAutocomplete();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}

function _aplicarMacrosAlimento(input, macros) {
  // Encontra a refeição pai e soma os macros nos campos de totais
  const refDiv = input.closest('.dynamic-block[data-refid]');
  if (!refDiv) return;
  // Lê quantidade do campo irmão "item-qty"
  const row = input.closest('.refeicao-item-row');
  const qtyInput = row?.querySelector('input[name="item-qty"]');
  const qty = qtyInput ? _parseQty(qtyInput.value) : 100;
  const fator = qty / 100;

  // Soma macros na refeição
  const macrosCampos = {
    'ref-kcal':   refDiv.querySelector('input[name="ref-kcal"]'),
    'ref-ptn':    refDiv.querySelector('input[name="ref-ptn"]'),
    'ref-cho':    refDiv.querySelector('input[name="ref-cho"]'),
    'ref-lip':    refDiv.querySelector('input[name="ref-lip"]'),
    'ref-fibras': refDiv.querySelector('input[name="ref-fibras"]'),
  };
  // Recalcula totais somando todos os alimentos da refeição
  _recalcularMacrosRefeicao(refDiv);
}

function _parseQty(qtyStr) {
  if (!qtyStr) return 100;
  // Extrai número (ex: '120g' -> 120, '1 colher' -> 1)
  const m = qtyStr.match(/(\d+(?:[\.,]\d+)?)/);
  if (!m) return 100;
  return parseFloat(m[1].replace(',', '.'));
}

function _recalcularMacrosRefeicao(refDiv) {
  if (!refDiv) return;
  const totais = { kcal:0, ptn:0, cho:0, lip:0, fibras:0 };
  const linhas = refDiv.querySelectorAll('.refeicao-item-row');
  linhas.forEach(row => {
    const nome = row.querySelector('input[name="item-nome"]')?.value;
    const qty  = _parseQty(row.querySelector('input[name="item-qty"]')?.value || '100');
    const alim = autocompleteCache.find(a => a.nome === nome);
    if (alim) {
      const fator = qty / 100;
      totais.kcal   += (alim.kcal || 0) * fator;
      totais.ptn    += (alim.ptn_g || 0) * fator;
      totais.cho    += (alim.cho_g || 0) * fator;
      totais.lip    += (alim.lip_g || 0) * fator;
      totais.fibras += (alim.fibras_g || 0) * fator;
    }
  });
  // Aplica nos inputs (apenas se vazios — não sobrescreve valores manuais)
  const setIfEmpty = (selector, valor) => {
    const el = refDiv.querySelector(selector);
    if (el && (!el.value || el.dataset.autoCalc === '1')) {
      el.value = valor.toFixed(0);
      el.dataset.autoCalc = '1';
    }
  };
  setIfEmpty('input[name="ref-kcal"]',   totais.kcal);
  setIfEmpty('input[name="ref-ptn"]',    totais.ptn);
  setIfEmpty('input[name="ref-cho"]',    totais.cho);
  setIfEmpty('input[name="ref-lip"]',    totais.lip);
  setIfEmpty('input[name="ref-fibras"]', totais.fibras);
}

// Listener global pra inputs item-nome
function bindAutocomplete() {
  document.addEventListener('input', (e) => {
    if (e.target.matches('input[name="item-nome"]')) {
      abrirDropdownAutocomplete(e.target);
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.alim-autocomplete-dropdown') &&
        !e.target.matches('input[name="item-nome"]')) {
      fecharDropdownAutocomplete();
    }
  });
  // Recalcula macros quando muda quantidade
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[name="item-qty"]') ||
        e.target.matches('input[name="item-nome"]')) {
      const refDiv = e.target.closest('.dynamic-block[data-refid]');
      if (refDiv) _recalcularMacrosRefeicao(refDiv);
    }
  });
}

// ════════════════════════════════════════════════════════════
// #3 TMB + GET AUTOMÁTICO (Mifflin-St Jeor)
// ════════════════════════════════════════════════════════════

const FATOR_ATIVIDADE = {
  sedentario:        1.2,
  leve:              1.375,
  moderado:          1.55,
  intenso:           1.725,
  muito_intenso:     1.9,
};

const AJUSTE_OBJETIVO = {
  emagrecimento:    -500,   // déficit
  emagrecimento_leve: -300,
  manutencao:        0,
  reeducacao:        0,
  ganho_massa:      +400,
  hipertrofia:      +400,
  performance:      +200,
};

function calcularTMB(peso_kg, altura_cm, idade_anos, sexo) {
  // Mifflin-St Jeor (mais preciso que Harris-Benedict)
  const base = (10 * peso_kg) + (6.25 * altura_cm) - (5 * idade_anos);
  return sexo === 'masculino' ? base + 5 : base - 161;
}

function calcularGET(tmb, fator) {
  return Math.round(tmb * (fator || 1.2));
}

function calcularKcalAlvo(get, ajusteObj) {
  return Math.max(1200, Math.round(get + (ajusteObj || 0)));
}

// Helper: pega dados do paciente (via window._planoPaciente se existir, ou via localStorage de rascunho)
async function _carregarDadosPaciente() {
  // Tenta pegar do JS principal
  const idEl = $('f-paciente-id') || $('paciente-id');
  const patientId = idEl?.value;
  if (!patientId) return null;

  try {
    const { data } = await supabase
      .from('patients')
      .select('nome, sexo, data_nascimento, peso_atual, altura, objetivo')
      .eq('id', patientId)
      .single();
    if (data) {
      const idade = _calcularIdade(data.data_nascimento);
      // Tenta pegar peso/altura da última antropometria se peso_atual vazio
      let peso = data.peso_atual;
      let altura = data.altura;
      if (!peso || !altura) {
        const { data: antro } = await supabase
          .from('antropometria')
          .select('peso, altura')
          .eq('patient_id', patientId)
          .order('data_avaliacao', { ascending: false })
          .limit(1)
          .single();
        if (antro) {
          peso = peso || antro.peso;
          altura = altura || antro.altura;
        }
      }
      return {
        nome: data.nome,
        sexo: data.sexo || 'feminino',
        idade,
        peso_kg: peso,
        altura_cm: altura ? altura * 100 : null,
        objetivo: data.objetivo,
      };
    }
  } catch (e) { console.warn(e); }
  return null;
}

function _calcularIdade(dataNasc) {
  if (!dataNasc) return 30; // default
  const hoje = new Date();
  const nasc = new Date(dataNasc + 'T00:00:00');
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

window.calcularTMBGETPaciente = async function() {
  const dados = await _carregarDadosPaciente();
  if (!dados || !dados.peso_kg || !dados.altura_cm) {
    alert('Dados insuficientes (peso/altura) na ficha do paciente. Preencha primeiro a antropometria.');
    return null;
  }
  const tmb = calcularTMB(dados.peso_kg, dados.altura_cm, dados.idade, dados.sexo);
  // Tenta pegar fator de atividade do select existente
  const fatorEl = $('f-fator-ativ') || $('f-nivel-af');
  const fatorKey = fatorEl?.value || 'leve';
  const fator = FATOR_ATIVIDADE[fatorKey] || 1.375;
  const get = calcularGET(tmb, fator);
  const kcalAlvo = calcularKcalAlvo(get, AJUSTE_OBJETIVO[dados.objetivo] || 0);
  // Aplica nos campos
  const kcalEl = $('f-kcal-alvo') || $('f-vet') || $('f-kcal-dia');
  if (kcalEl) {
    kcalEl.value = kcalAlvo;
    kcalEl.dispatchEvent(new Event('change', { bubbles: true }));
  }
  // Toast
  _toast(`TMB ${Math.round(tmb)} · GET ${get} · Alvo ${kcalAlvo} kcal/dia`, 'ok');
  return { tmb: Math.round(tmb), get, kcalAlvo };
};

// ════════════════════════════════════════════════════════════
// #14 SUBSTITUIÇÕES INLINE
// ════════════════════════════════════════════════════════════

window.abrirSubstituicoes = async function(alimentoNome, btn) {
  fecharDropdownAutocomplete();
  // Procura alimento no cache
  const alim = autocompleteCache.find(a => a.nome === alimentoNome);
  if (!alim) {
    _toast('Alimento não encontrado no banco (use autocomplete)', 'warn');
    return;
  }
  // Busca substituições
  const { data: subs } = await supabase
    .from('substituicoes_alimentos')
    .select('alimento_substituto_id, base_equivalencia, fator_multiplicador, notas')
    .eq('alimento_origem_id', alim.id)
    .limit(20);

  if (!subs || !subs.length) {
    _toast(`Sem substituições cadastradas para "${alimentoNome}"`, 'warn');
    return;
  }

  // Resolve nomes dos substitutos
  const subsIds = subs.map(s => s.alimento_substituto_id);
  const substitutos = autocompleteCache.filter(a => subsIds.includes(a.id));

  // Modal
  let modal = $('modal-substituicoes');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-substituicoes';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:2500;
      display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:24px 28px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 6px 28px rgba(0,0,0,0.18);font-family:'DM Sans','Outfit',sans-serif;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
        <div>
          <p style="font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;color:#6B6659;margin:0 0 4px;">Substituições para</p>
          <h3 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:1.3rem;color:#1A1A16;margin:0;">${escapeHtml(alimentoNome)}</h3>
        </div>
        <button onclick="this.closest('#modal-substituicoes').remove()" style="background:none;border:1px solid #D4D0C5;width:30px;height:30px;border-radius:6px;cursor:pointer;font-size:1rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${substitutos.map(s => {
          const sub = subs.find(x => x.alimento_substituto_id === s.id);
          return `
          <div style="padding:12px 14px;background:#F7F6F2;border:1px solid #E0DBD0;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:4px;">
              <strong style="font-size:0.88rem;color:#1A1A16;">${escapeHtml(s.nome)}</strong>
              <span style="font-size:0.72rem;color:#6B6659;">
                ${Math.round(s.kcal)} kcal · P ${s.ptn_g}g
              </span>
            </div>
            <div style="font-size:0.7rem;color:#6B6659;">
              Por ${(sub.fator_multiplicador * 100).toFixed(0)}g <span style="color:#4CB8A0">(equivale em ${sub.base_equivalencia})</span>
            </div>
          </div>`;
        }).join('')}
      </div>
      <p style="font-size:0.7rem;color:#6B6659;margin-top:14px;font-style:italic;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg> Substituições calculadas pela equivalência do macro principal.
      </p>
    </div>
  `;
};

// Adiciona botão ↔ ao lado de cada input item-nome
function injetarBotaoSubstituicao(input) {
  const row = input.closest('.refeicao-item-row');
  if (!row || row.querySelector('.btn-subst-inline')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-subst-inline';
  btn.title = 'Ver substituições equivalentes';
  btn.innerHTML = '⇄';
  btn.style.cssText = `
    margin-left:4px;padding:4px 8px;background:transparent;border:1px solid #4CB8A0;
    color:#2D6A56;border-radius:4px;cursor:pointer;font-size:0.8rem;line-height:1;
  `;
  btn.addEventListener('click', () => {
    if (input.value) window.abrirSubstituicoes(input.value, btn);
  });
  // Insere antes do botão remover
  const removeBtn = row.querySelector('.item-remove');
  if (removeBtn) removeBtn.before(btn);
  else row.appendChild(btn);
}

function bindBotoesSubstituicao() {
  // Observer pra detectar novos inputs (refeições adicionadas dinamicamente)
  const obs = new MutationObserver(() => {
    document.querySelectorAll('input[name="item-nome"]').forEach(injetarBotaoSubstituicao);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  // Inicial
  document.querySelectorAll('input[name="item-nome"]').forEach(injetarBotaoSubstituicao);
}

// ════════════════════════════════════════════════════════════
// #17 AUTOSAVE 5s + RECOVERY
// ════════════════════════════════════════════════════════════

const AUTOSAVE_KEY = 'erg_admin_plano_draft';
const AUTOSAVE_INTERVAL = 5000;

function snapshotForm() {
  const data = {};
  document.querySelectorAll('#plano-form input, #plano-form textarea, #plano-form select').forEach(el => {
    if (!el.id && !el.name) return;
    const key = el.id || el.name + '_' + Math.random().toString(36).slice(2, 6);
    if (el.type === 'checkbox') data[key] = el.checked;
    else data[key] = el.value;
  });
  return { ts: Date.now(), data };
}

function salvarRascunhoLocal() {
  try {
    const snap = snapshotForm();
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));
    _flashAutosave();
  } catch (_) {}
}

function _flashAutosave() {
  let badge = $('autosave-plano-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'autosave-plano-badge';
    badge.style.cssText = `
      position:fixed;bottom:16px;right:16px;z-index:500;
      padding:6px 12px;background:#fff;border:1px solid #4CB8A0;
      border-radius:100px;font-family:'DM Sans',sans-serif;font-size:0.7rem;
      color:#2D6A56;box-shadow:0 2px 8px rgba(0,0,0,0.06);
      transition:opacity 0.3s;opacity:0;
    `;
    badge.innerHTML = `<span style="display:inline-block;width:6px;height:6px;background:#4CB8A0;border-radius:50%;margin-right:6px;"></span>Salvo automaticamente`;
    document.body.appendChild(badge);
  }
  badge.style.opacity = '1';
  clearTimeout(badge._fadeTimer);
  badge._fadeTimer = setTimeout(() => { badge.style.opacity = '0.4'; }, 1800);
}

let autosaveTimer = null;
function iniciarAutosave() {
  if (autosaveTimer) clearInterval(autosaveTimer);
  autosaveTimer = setInterval(salvarRascunhoLocal, AUTOSAVE_INTERVAL);
  // Salva ao sair da página
  window.addEventListener('beforeunload', salvarRascunhoLocal);
}

// ════════════════════════════════════════════════════════════
// #16 VALIDAÇÃO PRÉ-PUBLICAÇÃO
// ════════════════════════════════════════════════════════════

window.validarPlanoAntesPublicar = function() {
  const erros = [];
  const avisos = [];

  // Pega refeições
  const refs = document.querySelectorAll('#refeicoes-container .dynamic-block');
  if (!refs.length) {
    erros.push('Nenhuma refeição cadastrada.');
  }

  let kcalTotal = 0;
  let temProteinaAlmoco = false, temProteinaJantar = false;
  let temFibras = false;

  refs.forEach((ref, i) => {
    const nome = ref.querySelector('input[name="ref-nome"]')?.value;
    const horario = ref.querySelector('input[name="ref-horario"]')?.value;
    const kcal = parseFloat(ref.querySelector('input[name="ref-kcal"]')?.value || 0);
    const ptn = parseFloat(ref.querySelector('input[name="ref-ptn"]')?.value || 0);
    const fibras = parseFloat(ref.querySelector('input[name="ref-fibras"]')?.value || 0);
    const itens = ref.querySelectorAll('.refeicao-item-row input[name="item-nome"]');
    const temItens = Array.from(itens).some(i => i.value.trim());

    if (!nome) erros.push(`Refeição #${i + 1}: sem nome`);
    if (!horario) avisos.push(`${nome || 'Refeição #' + (i+1)}: sem horário`);
    if (!temItens) erros.push(`${nome || 'Refeição #' + (i+1)}: sem alimentos`);
    if (kcal === 0 && temItens) avisos.push(`${nome}: kcal não calculado`);

    kcalTotal += kcal;
    fibras > 0 && (temFibras = true);
    if (nome && /almo[çc]o/i.test(nome) && ptn >= 20) temProteinaAlmoco = true;
    if (nome && /jantar/i.test(nome) && ptn >= 15) temProteinaJantar = true;
  });

  if (kcalTotal > 0 && kcalTotal < 1200) erros.push(`Calorias totais muito baixas (${kcalTotal} kcal/dia)`);
  if (kcalTotal > 3500) avisos.push(`Calorias totais elevadas (${kcalTotal} kcal/dia)`);
  if (refs.length >= 4) {
    if (!temProteinaAlmoco) avisos.push('Almoço sem proteína suficiente (< 20g)');
    if (!temProteinaJantar) avisos.push('Jantar sem proteína suficiente (< 15g)');
    if (!temFibras) avisos.push('Plano sem fibras estimadas (preencha o campo)');
  }

  return { erros, avisos, kcalTotal };
};

// Modal de validação
window.abrirModalValidacao = function() {
  const { erros, avisos, kcalTotal } = window.validarPlanoAntesPublicar();
  if (!erros.length && !avisos.length) {
    _toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg> Plano validado: nenhum erro ou aviso', 'ok');
    return true; // pode prosseguir
  }
  let modal = $('modal-validacao-plano');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-validacao-plano';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:2500;
      display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:24px 28px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;font-family:'DM Sans','Outfit',sans-serif;">
      <h3 style="font-family:'Cormorant Garamond',serif;font-weight:400;font-size:1.3rem;color:#1A1A16;margin:0 0 6px;">
        Validação do plano
      </h3>
      <p style="font-size:0.78rem;color:#6B6659;margin:0 0 16px;">
        Total: <strong>${kcalTotal} kcal/dia</strong>
      </p>
      ${erros.length ? `
        <div style="margin-bottom:14px;padding:12px;background:rgba(224,82,82,0.08);border-left:3px solid #E05252;border-radius:4px;">
          <p style="font-weight:600;color:#7A2E2E;font-size:0.78rem;margin:0 0 6px;">⛔ Erros (corrigir antes):</p>
          <ul style="margin:0;padding-left:20px;font-size:0.78rem;color:#1A1A16;">
            ${erros.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
          </ul>
        </div>` : ''}
      ${avisos.length ? `
        <div style="margin-bottom:14px;padding:12px;background:rgba(184,134,11,0.08);border-left:3px solid #B8860B;border-radius:4px;">
          <p style="font-weight:600;color:#6B5A20;font-size:0.78rem;margin:0 0 6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Avisos (recomenda revisar):</p>
          <ul style="margin:0;padding-left:20px;font-size:0.78rem;color:#1A1A16;">
            ${avisos.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
          </ul>
        </div>` : ''}
      <div style="display:flex;gap:8px;">
        <button onclick="this.closest('#modal-validacao-plano').remove()"
          style="flex:1;padding:10px;background:transparent;border:1px solid #D4D0C5;border-radius:6px;cursor:pointer;font-family:inherit;">
          Voltar e corrigir
        </button>
        ${erros.length === 0 ? `
          <button onclick="this.closest('#modal-validacao-plano').remove();window._aprovouValidacaoPlano=true;document.getElementById('btn-publicar')?.click();"
            style="flex:1;padding:10px;background:#2D6A56;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:inherit;font-weight:500;">
            Publicar mesmo assim
          </button>` : ''}
      </div>
    </div>
  `;
  return false; // não pode prosseguir sem revisar
};

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function _toast(msg, type = 'ok') {
  let t = $('admin-plano-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'admin-plano-toast';
    t.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);
      padding:12px 22px;background:#1A1A16;color:#fff;border-radius:100px;
      font-family:'DM Sans',sans-serif;font-size:0.82rem;z-index:3000;
      box-shadow:0 4px 16px rgba(0,0,0,0.18);
      opacity:0;transition:opacity 0.2s,transform 0.2s;pointer-events:none;
      max-width:90vw;white-space:nowrap;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = type === 'warn' ? '#B8860B' : type === 'error' ? '#E05252' : '#2D6A56';
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._fadeTimer);
  t._fadeTimer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2400);
}

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Carrega banco em background
  carregarBancoAlimentos();
  // Bind eventos
  bindAutocomplete();
  bindBotoesSubstituicao();
  // Autosave
  iniciarAutosave();
  // Botão de TMB+GET (se admin tem campo de kcal)
  setTimeout(_injetarBotaoTMB, 500);
});

function _injetarBotaoTMB() {
  const kcalEl = $('f-kcal-alvo') || $('f-vet') || $('f-kcal-dia');
  if (!kcalEl || $('btn-calc-tmb')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'btn-calc-tmb';
  btn.textContent = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Calcular TMB+GET';
  btn.title = 'Calcula calorias-alvo automaticamente (Mifflin-St Jeor)';
  btn.style.cssText = `
    margin-top:6px;padding:7px 14px;background:rgba(76,184,160,0.10);
    border:1px solid #4CB8A0;color:#2D6A56;border-radius:6px;cursor:pointer;
    font-family:'DM Sans','Outfit',sans-serif;font-size:0.72rem;font-weight:500;
  `;
  btn.addEventListener('click', window.calcularTMBGETPaciente);
  kcalEl.parentElement?.appendChild(btn);
}

// Expõe API global
window._adminPlanoExtras = {
  carregarBancoAlimentos,
  validarPlano: () => window.validarPlanoAntesPublicar(),
  salvarRascunho: salvarRascunhoLocal,
  abrirSubstituicoes: window.abrirSubstituicoes,
};
