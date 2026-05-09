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

// ═══ POLIMENTO V2 ═══
// 10 micro-interações: ripple, keyboard-nav, stagger, count-up, loading-state,
// shake, macro-badge, row-hover, block-hover, scroll-to-error

// ── V2.1 RIPPLE NOS BOTÕES ──────────────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#btn-calc-tmb, .btn-subst-inline, [data-ripple]');
  if (!btn) return;
  if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  const r = document.createElement('span');
  r.className = 'ap-ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(r);
  r.addEventListener('animationend', () => r.remove(), { once: true });
});

// ── V2.2 KEYBOARD NAVIGATION NO AUTOCOMPLETE (↑ ↓ Enter Esc) ──
document.addEventListener('keydown', (e) => {
  const dropdown = document.querySelector('.alim-autocomplete-dropdown');
  if (!dropdown) return;
  const opts = Array.from(dropdown.querySelectorAll('.alim-autocomplete-opt'));
  if (!opts.length) return;
  const active = dropdown.querySelector('.alim-ac-focused');
  const idx = active ? opts.indexOf(active) : -1;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    active?.classList.remove('alim-ac-focused');
    const next = opts[(idx + 1) % opts.length];
    next.classList.add('alim-ac-focused');
    next.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    active?.classList.remove('alim-ac-focused');
    const prev = opts[(idx - 1 + opts.length) % opts.length];
    prev.classList.add('alim-ac-focused');
    prev.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && active) {
    e.preventDefault();
    active.click();
  } else if (e.key === 'Escape') {
    fecharDropdownAutocomplete();
  }
});

// ── V2.3 STAGGER DE ENTRADA NAS OPÇÕES DO DROPDOWN ──────────
new MutationObserver((muts) => {
  for (const m of muts) {
    for (const node of m.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (!node.classList.contains('alim-autocomplete-dropdown')) continue;
      node.querySelectorAll('.alim-autocomplete-opt').forEach((opt, i) => {
        opt.style.opacity = '0';
        opt.style.transform = 'translateY(-5px)';
        opt.style.transition = `opacity 0.14s ${i * 25}ms ease, transform 0.14s ${i * 25}ms ease`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          opt.style.opacity = '1';
          opt.style.transform = 'translateY(0)';
        }));
      });
    }
  }
}).observe(document.body, { childList: true });

// ── V2.4 COUNT-UP NOS CAMPOS DE KCAL ────────────────────────
function _animarCountUp(el, alvo, duracao = 600) {
  if (!el) return;
  const inicio = parseFloat(el.value) || 0;
  if (Math.abs(alvo - inicio) < 1) return;
  const t0 = performance.now();
  function tick(t) {
    const p = Math.min((t - t0) / duracao, 1);
    el.value = Math.round(inicio + (alvo - inicio) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) {
      requestAnimationFrame(tick);
    } else {
      el.classList.add('ap-value-updated');
      el.addEventListener('animationend', () => el.classList.remove('ap-value-updated'), { once: true });
    }
  }
  requestAnimationFrame(tick);
}

// ── V2.5 LOADING STATE NO BTN-CALC-TMB + WRAP COUNT-UP ──────
const _origCalcTMB = window.calcularTMBGETPaciente;
window.calcularTMBGETPaciente = async function () {
  const kcalEl = document.getElementById('f-kcal-alvo') ||
                 document.getElementById('f-vet') ||
                 document.getElementById('f-kcal-dia');
  const valorAntes = parseFloat(kcalEl?.value) || 0;
  const btn = document.getElementById('btn-calc-tmb');
  if (btn && !btn._v2Loading) {
    btn._v2Loading = true;
    btn.disabled = true;
    btn._v2Html = btn.innerHTML;
    btn.innerHTML = '<span class="ap-spinner"></span> Calculando…';
  }
  try {
    const resultado = await _origCalcTMB();
    if (resultado && kcalEl) {
      kcalEl.value = valorAntes;
      _animarCountUp(kcalEl, resultado.kcalAlvo);
    }
    return resultado;
  } finally {
    if (btn && btn._v2Loading) {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = btn._v2Html;
        btn._v2Loading = false;
      }, 700);
    }
  }
};

// ── V2.6 SHAKE EM CAMPOS COM ERRO NA VALIDAÇÃO ───────────────
function _shakeEl(el) {
  if (!el) return;
  el.classList.remove('ap-shake');
  void el.offsetWidth; // força reflow para reiniciar animation
  el.classList.add('ap-shake');
  el.addEventListener('animationend', () => el.classList.remove('ap-shake'), { once: true });
}

// ── V2.7 SCROLL SUAVE PARA PRIMEIRO BLOCO COM ERRO ───────────
const _origAbrirModalVal = window.abrirModalValidacao;
window.abrirModalValidacao = function () {
  const { erros } = window.validarPlanoAntesPublicar();
  if (erros.length) {
    // Shake nos campos de nome de refeição vazios
    document.querySelectorAll('.dynamic-block[data-refid] input[name="ref-nome"]').forEach(el => {
      if (!el.value.trim()) _shakeEl(el);
    });
    // Scroll suave para o primeiro bloco de refeição
    setTimeout(() => {
      const primeiro = document.querySelector('#refeicoes-container .dynamic-block, .dynamic-block[data-refid]');
      primeiro?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
  }
  return _origAbrirModalVal.call(this);
};

// ── V2.8 MACRO BADGE POPUP AO SELECIONAR ALIMENTO ───────────
let _lastItemNomeInput = null;
document.addEventListener('focus', (e) => {
  if (e.target.matches('input[name="item-nome"]')) _lastItemNomeInput = e.target;
}, true);

document.addEventListener('click', (e) => {
  const opt = e.target.closest('.alim-autocomplete-opt');
  if (!opt || !_lastItemNomeInput || !opt.dataset.kcal) return;
  const badge = document.createElement('div');
  badge.className = 'ap-macro-badge';
  badge.innerHTML = `
    <span class="ap-mb-kcal">${Math.round(+opt.dataset.kcal)} kcal</span>
    <span>P ${opt.dataset.ptn}g</span>
    <span>C ${opt.dataset.cho}g</span>
    <span>L ${opt.dataset.lip}g</span>
  `;
  const rect = _lastItemNomeInput.getBoundingClientRect();
  badge.style.cssText = `position:fixed;top:${rect.top - 46}px;left:${Math.max(8, rect.left)}px;z-index:3500;`;
  document.body.appendChild(badge);
  requestAnimationFrame(() => requestAnimationFrame(() => badge.classList.add('ap-macro-badge--visible')));
  setTimeout(() => {
    badge.classList.remove('ap-macro-badge--visible');
    badge.addEventListener('transitionend', () => badge.remove(), { once: true });
  }, 2200);
}, true); // capture: roda antes do handler que fecha o dropdown

// ── V2.9 ROW HOVER + V2.10 BLOCK HOVER (ver css/admin-plano-extras.css) ─

// ── EXPÕE EXTENSÕES V2 ───────────────────────────────────────
window._adminPlanoExtras = Object.assign(window._adminPlanoExtras || {}, {
  v2: { animarCountUp: _animarCountUp, shakeEl: _shakeEl },
});

// ═══ POLIMENTO V3 ═══
// 10 melhorias de acessibilidade: aria-live, focus-trap, skip-link,
// listbox role, aria-expanded, aria-busy, aria-label dinâmico,
// anúncio verbal de macros, Esc fecha modais, focus return.

// ── V3.1 ARIA LIVE REGION CENTRAL ───────────────────────────
// Anuncia mensagens para leitores de tela (polite = não interrompe)
(function _initAriaLive() {
  if (document.getElementById('ap-aria-live')) return;
  const live = document.createElement('div');
  live.id = 'ap-aria-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;';
  document.body.appendChild(live);
})();

function _anunciarSR(msg) {
  const live = document.getElementById('ap-aria-live');
  if (!live) return;
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = msg; });
}

// Patch: _toast também anuncia para SR
const _toastOrigV3 = window._adminPlanoExtras?.toast || null;
{
  const _toastRef = typeof _toast === 'function' ? _toast : null;
  if (_toastRef) {
    const _origToast = _toastRef;
    // Intercepta chamadas globais via wrapper no objeto exposto
    window._adminPlanoExtras = window._adminPlanoExtras || {};
    window._adminPlanoExtras._anunciarSR = _anunciarSR;
  }
}

// ── V3.2 FOCUS TRAP NOS MODAIS ───────────────────────────────
function _criarFocusTrap(modalEl) {
  const focos = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function _getFocaveis() {
    return Array.from(modalEl.querySelectorAll(focos)).filter(el => el.offsetParent !== null);
  }
  function _handler(e) {
    if (e.key !== 'Tab') return;
    const focaveis = _getFocaveis();
    if (!focaveis.length) { e.preventDefault(); return; }
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    } else {
      if (document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }
  }
  modalEl.addEventListener('keydown', _handler);
  // Foca no primeiro elemento focável dentro do modal
  const focaveis = _getFocaveis();
  if (focaveis.length) focaveis[0].focus();
  return () => modalEl.removeEventListener('keydown', _handler);
}

// Aplica focus trap ao abrir modais (patch via MutationObserver)
new MutationObserver((muts) => {
  for (const m of muts) {
    for (const node of m.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.id === 'modal-substituicoes' || node.id === 'modal-validacao-plano') {
        node._destroyTrap = _criarFocusTrap(node);
        node.setAttribute('role', 'dialog');
        node.setAttribute('aria-modal', 'true');
        node.setAttribute('aria-label',
          node.id === 'modal-substituicoes' ? 'Substituições de alimento' : 'Validação do plano alimentar');
      }
    }
    for (const node of m.removedNodes) {
      if (node instanceof HTMLElement && node._destroyTrap) node._destroyTrap();
    }
  }
}).observe(document.body, { childList: true });

// ── V3.3 SKIP-LINK "IR PARA REFEIÇÕES" ──────────────────────
(function _initSkipLink() {
  if (document.getElementById('ap-skip-link')) return;
  const skip = document.createElement('a');
  skip.id = 'ap-skip-link';
  skip.href = '#refeicoes-container';
  skip.className = 'ap-skip-link';
  skip.textContent = 'Ir para as refeições';
  document.body.insertBefore(skip, document.body.firstChild);
})();

// ── V3.4 ARIA ROLES NO DROPDOWN (listbox/option) ─────────────
// Patch: abrirDropdownAutocomplete agora seta roles ARIA
const _origAbrirDropdown = typeof abrirDropdownAutocomplete === 'function'
  ? abrirDropdownAutocomplete : null;

function _patchDropdownAria(input) {
  const dropdown = document.querySelector('.alim-autocomplete-dropdown');
  if (!dropdown) return;
  dropdown.setAttribute('role', 'listbox');
  dropdown.id = dropdown.id || 'ap-autocomplete-list';
  dropdown.querySelectorAll('.alim-autocomplete-opt').forEach((opt, i) => {
    opt.setAttribute('role', 'option');
    opt.setAttribute('aria-selected', 'false');
    opt.id = opt.id || `ap-ac-opt-${i}`;
  });
  // Liga input ao listbox
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-haspopup', 'listbox');
  input.setAttribute('aria-controls', dropdown.id);
  input.setAttribute('aria-expanded', 'true');
}

// MutationObserver para adicionar roles quando dropdown aparece
new MutationObserver((muts) => {
  for (const m of muts) {
    for (const node of m.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (!node.classList.contains('alim-autocomplete-dropdown')) continue;
      const activeInput = document.querySelector('input[name="item-nome"]:focus');
      if (activeInput) _patchDropdownAria(activeInput);
    }
    for (const node of m.removedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (!node.classList.contains('alim-autocomplete-dropdown')) continue;
      // Limpa aria-expanded em todos os inputs item-nome
      document.querySelectorAll('input[name="item-nome"]').forEach(inp => {
        inp.setAttribute('aria-expanded', 'false');
      });
    }
  }
}).observe(document.body, { childList: true });

// ── V3.5 ARIA-ACTIVEDESCENDANT no keyboard nav ───────────────
// Patch sobre o handler de keydown existente de V2
document.addEventListener('keydown', (e) => {
  const dropdown = document.querySelector('.alim-autocomplete-dropdown');
  if (!dropdown) return;
  const focused = dropdown.querySelector('.alim-ac-focused');
  if (!focused) return;
  const activeInput = document.querySelector('input[name="item-nome"]:focus');
  if (activeInput) activeInput.setAttribute('aria-activedescendant', focused.id || '');
  // Marca aria-selected na opção focada
  dropdown.querySelectorAll('.alim-autocomplete-opt').forEach(opt => {
    opt.setAttribute('aria-selected', opt === focused ? 'true' : 'false');
  });
}, { capture: false });

// ── V3.6 ARIA-BUSY NO BTN TMB ────────────────────────────────
// Patch sobre a versão V2 (que já wrappou a V1)
const _origCalcTMBV3 = window.calcularTMBGETPaciente;
window.calcularTMBGETPaciente = async function () {
  const btn = document.getElementById('btn-calc-tmb');
  if (btn) {
    btn.setAttribute('aria-busy', 'true');
    btn.setAttribute('aria-label', 'Calculando TMB e GET…');
    _anunciarSR('Calculando TMB e GET, aguarde.');
  }
  try {
    const resultado = await _origCalcTMBV3.apply(this, arguments);
    if (resultado) {
      _anunciarSR(`TMB ${resultado.tmb} kcal, GET ${resultado.get} kcal, alvo ${resultado.kcalAlvo} kcal por dia.`);
    }
    return resultado;
  } finally {
    if (btn) {
      btn.setAttribute('aria-busy', 'false');
      btn.setAttribute('aria-label', 'Calcular TMB e GET automaticamente');
    }
  }
};

// ── V3.7 ARIA-LABEL NOS BLOCOS DE REFEIÇÃO DINÂMICOS ─────────
function _labelarBlocoRefeicao(block) {
  if (block.dataset.ariaLabeled) return;
  block.setAttribute('role', 'group');
  const nomeInput = block.querySelector('input[name="ref-nome"]');
  const nomeVal = nomeInput?.value?.trim() || 'Refeição';
  block.setAttribute('aria-label', nomeVal);
  block.dataset.ariaLabeled = '1';
  // Atualiza label quando o nome muda
  nomeInput?.addEventListener('input', () => {
    block.setAttribute('aria-label', nomeInput.value.trim() || 'Refeição');
  });
}

function _labelarTodosOsBlocos() {
  document.querySelectorAll('.dynamic-block[data-refid]').forEach(_labelarBlocoRefeicao);
}

new MutationObserver(() => _labelarTodosOsBlocos())
  .observe(document.body, { childList: true, subtree: true });

document.addEventListener('DOMContentLoaded', _labelarTodosOsBlocos);
setTimeout(_labelarTodosOsBlocos, 800);

// ── V3.8 ANÚNCIO VERBAL DE MACROS AO SELECIONAR ALIMENTO ─────
document.addEventListener('click', (e) => {
  const opt = e.target.closest('.alim-autocomplete-opt[data-kcal]');
  if (!opt) return;
  const nome = opt.dataset.nome || '';
  const kcal = Math.round(+opt.dataset.kcal) || 0;
  const ptn = opt.dataset.ptn || '0';
  const cho = opt.dataset.cho || '0';
  const lip = opt.dataset.lip || '0';
  if (nome) {
    _anunciarSR(`${nome} selecionado. ${kcal} kcal, proteína ${ptn}g, carboidrato ${cho}g, gordura ${lip}g por 100g.`);
  }
}, { capture: true });

// ── V3.9 ESC FECHA QUALQUER MODAL ────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const modal = document.getElementById('modal-substituicoes') ||
                document.getElementById('modal-validacao-plano');
  if (!modal) return;
  e.stopPropagation();
  // Retorna foco para o elemento que tinha foco antes
  const retornar = modal._focusReturn;
  modal.remove();
  if (retornar && retornar.focus) {
    requestAnimationFrame(() => retornar.focus());
    _anunciarSR('Modal fechado.');
  }
});

// ── V3.10 FOCUS RETURN APÓS FECHAR MODAL ─────────────────────
// Quando um modal abre, memoriza o elemento com foco
const _origAbrirSubst = window.abrirSubstituicoes;
window.abrirSubstituicoes = async function (alimentoNome, btn) {
  const focusAntes = document.activeElement;
  await _origAbrirSubst.apply(this, arguments);
  const modal = document.getElementById('modal-substituicoes');
  if (modal) {
    modal._focusReturn = focusAntes;
    // Botão fechar do modal retorna foco
    const closeBtn = modal.querySelector('button[onclick*="remove"]');
    if (closeBtn) {
      const _origClose = closeBtn.onclick;
      closeBtn.onclick = function (ev) {
        modal.remove();
        requestAnimationFrame(() => { focusAntes?.focus(); _anunciarSR('Modal de substituições fechado.'); });
      };
    }
  }
};

const _origAbrirValV3 = window.abrirModalValidacao;
window.abrirModalValidacao = function () {
  const focusAntes = document.activeElement;
  const resultado = _origAbrirValV3.apply(this, arguments);
  const modal = document.getElementById('modal-validacao-plano');
  if (modal) {
    modal._focusReturn = focusAntes;
    const voltarBtn = modal.querySelector('button[onclick*="remove"]');
    if (voltarBtn) {
      const _origOC = voltarBtn.onclick;
      voltarBtn.onclick = function (ev) {
        modal.remove();
        requestAnimationFrame(() => { focusAntes?.focus(); _anunciarSR('Modal de validação fechado. Revise o plano.'); });
      };
    }
  }
  return resultado;
};

// ── EXPÕE EXTENSÕES V3 ───────────────────────────────────────
window._adminPlanoExtras = Object.assign(window._adminPlanoExtras || {}, {
  v3: { anunciarSR: _anunciarSR, criarFocusTrap: _criarFocusTrap },
});

// ═══ POLIMENTO V4 ═══
// 10 melhorias de performance: debounce autocomplete, rIC pré-indexação,
// IntersectionObserver fade-in blocos, prefetch substituições ao hover,
// debounce recálculo macros, autosave diff-aware + Page Visibility API,
// scroll fecha dropdown, loading placeholder banco, validação idle.

// ── V4.1 DEBOUNCE NO AUTOCOMPLETE INPUT (280ms) ─────────────
// Intercepta capture phase e adia a chamada, cancelando o listener
// original (bubble) via stopImmediatePropagation — reduz round-trips
const _v4AcDebounce = new WeakMap();
document.addEventListener('input', (e) => {
  if (!e.target.matches('input[name="item-nome"]')) return;
  e.stopImmediatePropagation(); // cancela listener original (bubble)
  clearTimeout(_v4AcDebounce.get(e.target));
  const inp = e.target;
  _v4AcDebounce.set(inp, setTimeout(() => {
    _v4AcDebounce.delete(inp);
    if (inp.isConnected) abrirDropdownAutocomplete(inp);
  }, 280));
}, true); // capture phase

// ── V4.2 requestIdleCallback — PRÉ-INDEXAÇÃO O(1) DO BANCO ──
// Cria Map nome→alimento para lookups instantâneos em fuzzyMatch
const _v4AlimIdx = new Map();
let _v4IdxBuilt = false;
function _v4BuildIdx() {
  if (_v4IdxBuilt || !autocompleteCache.length) return;
  autocompleteCache.forEach(a => _v4AlimIdx.set(a.nome.toLowerCase(), a));
  _v4IdxBuilt = true;
}
(window.requestIdleCallback || (fn => setTimeout(fn, 600)))(
  () => autocompleteCache.length
    ? _v4BuildIdx()
    : carregarBancoAlimentos().then(_v4BuildIdx),
  { timeout: 5000 }
);

// ── V4.3 IntersectionObserver — FADE-IN BLOCOS DE REFEIÇÃO ──
// Anima blocos quando entram no viewport (só una vez cada)
const _v4BlockIO = new IntersectionObserver((entries) => {
  entries.forEach(({ isIntersecting, target }) => {
    if (!isIntersecting || target._v4Seen) return;
    target._v4Seen = true;
    target.classList.add('ap-block-enter');
    _v4BlockIO.unobserve(target);
  });
}, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

function _v4WatchBlocks() {
  document.querySelectorAll('.dynamic-block[data-refid]:not([data-v4io])').forEach(el => {
    el.dataset.v4io = '1';
    _v4BlockIO.observe(el);
  });
}
new MutationObserver(_v4WatchBlocks).observe(document.body, { childList: true, subtree: true });
setTimeout(_v4WatchBlocks, 300);

// ── V4.4 PREFETCH DE SUBSTITUIÇÕES AO HOVER DO BTN ──────────
// Inicia request Supabase ao mouseenter — quando usuário clica, dados
// já chegaram (ou estão em voo) eliminando latência percebida
const _v4SubstPF = new Map();
document.addEventListener('mouseenter', (e) => {
  const btn = e.target.closest('.btn-subst-inline');
  if (!btn) return;
  const nome = btn.closest('.refeicao-item-row')
    ?.querySelector('input[name="item-nome"]')?.value?.trim();
  if (!nome || _v4SubstPF.has(nome)) return;
  const alim = autocompleteCache.find(a => a.nome === nome);
  if (!alim) return;
  _v4SubstPF.set(nome, supabase
    .from('substituicoes_alimentos')
    .select('alimento_substituto_id,base_equivalencia,fator_multiplicador,notas')
    .eq('alimento_origem_id', alim.id)
    .limit(20)
  );
}, true);

// ── V4.5 DEBOUNCE DO RECÁLCULO DE MACROS (300ms) ────────────
// Evita recalcular a cada tecla ao editar quantidade dos alimentos
const _v4MacroDebounce = new WeakMap();
document.addEventListener('input', (e) => {
  if (!e.target.matches('input[name="item-qty"]')) return;
  const ref = e.target.closest('.dynamic-block[data-refid]');
  if (!ref) return;
  clearTimeout(_v4MacroDebounce.get(ref));
  _v4MacroDebounce.set(ref, setTimeout(() => {
    _v4MacroDebounce.delete(ref);
    _recalcularMacrosRefeicao(ref);
  }, 300));
});

// ── V4.6–V4.8 AUTOSAVE DIFF-AWARE + PAGE VISIBILITY ─────────
// Substitui o setInterval cego por save inteligente: só persiste
// quando o formulário realmente mudou (reduz I/O localStorage)
function _v4FormHash() {
  try {
    const root = document.querySelector('#plano-form')
      || document.querySelector('form')
      || document.body;
    return Array.from(root.querySelectorAll('input,textarea,select'))
      .map(el => `${el.name || el.id}:${el.type === 'checkbox' ? +el.checked : el.value}`)
      .join('\x00');
  } catch (_) { return ''; }
}
let _v4PrevHash = '';
function _v4AutosaveIfChanged() {
  const h = _v4FormHash();
  if (h && h !== _v4PrevHash) { _v4PrevHash = h; salvarRascunhoLocal(); }
}
function _v4StartSmartSave() {
  clearInterval(autosaveTimer);
  autosaveTimer = setInterval(_v4AutosaveIfChanged, AUTOSAVE_INTERVAL);
}
_v4StartSmartSave();

// Pausa autosave quando aba está em background; retoma ao voltar
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
  } else {
    salvarRascunhoLocal();
    _v4StartSmartSave();
  }
});

// ── V4.7 SCROLL/RESIZE FECHA DROPDOWN (passive, throttled) ──
let _v4ScrollTimer = null;
window.addEventListener('scroll', () => {
  clearTimeout(_v4ScrollTimer);
  _v4ScrollTimer = setTimeout(fecharDropdownAutocomplete, 60);
}, { passive: true });
window.addEventListener('resize', fecharDropdownAutocomplete, { passive: true });

// ── V4.9 requestIdleCallback — VALIDAÇÃO PRÉ-EMPTIVA ─────────
// Valida o plano durante idle e guarda resultado; ao clicar Publicar
// o resultado já está pronto → modal abre instantaneamente
let _v4CachedVal = null;
(function _scheduleIdleVal() {
  (window.requestIdleCallback || (fn => setTimeout(fn, 4000)))(() => {
    try { _v4CachedVal = window.validarPlanoAntesPublicar?.(); } catch (_) {}
    setTimeout(_scheduleIdleVal, 60000); // re-valida a cada 60s
  }, { timeout: 8000 });
})();

const _origAbrirModalValV4 = window.abrirModalValidacao;
window.abrirModalValidacao = function () {
  const cached = _v4CachedVal;
  _v4CachedVal = null;
  if (cached) {
    // Injeta resultado cached para que a chamada interna retorne instantâneo
    const _origVal = window.validarPlanoAntesPublicar;
    window.validarPlanoAntesPublicar = () => {
      window.validarPlanoAntesPublicar = _origVal;
      return cached;
    };
  }
  return _origAbrirModalValV4.apply(this, arguments);
};

// ── V4.10 LOADING PLACEHOLDER ENQUANTO BANCO CARREGA ─────────
// Exibe spinner no dropdown se autocomplete acionado antes dos dados
// chegarem, depois atualiza automaticamente com os resultados reais
const _origAbrirDropV4 = abrirDropdownAutocomplete;
abrirDropdownAutocomplete = function _v4DropLoader(input) {
  if (!autocompleteFetched && input.value.trim().length >= 2) {
    fecharDropdownAutocomplete();
    const pl = document.createElement('div');
    pl.className = 'alim-autocomplete-dropdown';
    pl.setAttribute('aria-live', 'polite');
    pl.innerHTML = '<div class="ap-ac-loading-msg"><span class="ap-spinner"></span> Carregando banco de alimentos…</div>';
    const r = input.getBoundingClientRect();
    pl.style.cssText = `position:absolute;top:${r.bottom + scrollY + 4}px;left:${r.left + scrollX}px;width:${Math.max(r.width, 280)}px;z-index:1000;`;
    document.body.appendChild(pl);
    carregarBancoAlimentos().then(() => {
      pl.remove();
      if (input.isConnected) _origAbrirDropV4(input);
    });
    return;
  }
  _origAbrirDropV4(input);
};

// ── EXPÕE EXTENSÕES V4 ───────────────────────────────────────
window._adminPlanoExtras = Object.assign(window._adminPlanoExtras || {}, {
  v4: {
    lookupAlimento: n => _v4AlimIdx.get(n?.toLowerCase()),
    blockObserver: _v4BlockIO,
    prefetchSubst: _v4SubstPF,
  },
});

// ═══ POLIMENTO V5 ═══
// 10 melhorias com Web APIs modernas: Wake Lock, Web Share, Clipboard,
// Notification, Vibration, Online/Offline, BeforeInstallPrompt,
// Storage Estimate, Broadcast Channel, Performance marks.

// ── V5.1 WAKE LOCK API — tela não apaga durante edição ──────
let _v5WakeLock = null;
async function _v5RequestWakeLock() {
  if (!('wakeLock' in navigator) || _v5WakeLock) return;
  try {
    _v5WakeLock = await navigator.wakeLock.request('screen');
    _v5WakeLock.addEventListener('release', () => { _v5WakeLock = null; }, { once: true });
  } catch (_) {}
}
async function _v5ReleaseWakeLock() {
  if (!_v5WakeLock) return;
  try { await _v5WakeLock.release(); } catch (_) {}
  _v5WakeLock = null;
}
// Solicita wake lock na primeira interação com o formulário
document.addEventListener('focusin', () => {
  if (!_v5WakeLock) _v5RequestWakeLock();
}, { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) _v5ReleaseWakeLock();
  else if (document.activeElement?.closest('form, #plano-form')) _v5RequestWakeLock();
});
window.addEventListener('beforeunload', _v5ReleaseWakeLock, { once: true });

// ── V5.2 WEB SHARE API — compartilha resumo do plano ────────
function _v5BuildShareText() {
  const paciente = document.getElementById('sb-paciente-nome')?.textContent?.trim() ||
                   'Paciente';
  const kcal = document.getElementById('prev-kcal')?.textContent?.trim() ||
               document.getElementById('f-kcal')?.value || '—';
  const ptn  = document.getElementById('prev-ptn')?.textContent?.trim()  || '—';
  const cho  = document.getElementById('prev-cho')?.textContent?.trim()  || '—';
  const lip  = document.getElementById('prev-lip')?.textContent?.trim()  || '—';
  const refs = Array.from(document.querySelectorAll('.dynamic-block[data-refid]'))
    .map(b => {
      const nome  = b.querySelector('input[name="ref-nome"]')?.value?.trim()    || 'Refeição';
      const hora  = b.querySelector('input[name="ref-horario"]')?.value?.trim() || '';
      const items = Array.from(b.querySelectorAll('input[name="item-nome"]'))
        .map(i => i.value.trim()).filter(Boolean);
      return `• ${nome}${hora ? ' (' + hora + ')' : ''}${items.length ? ': ' + items.slice(0, 3).join(', ') + (items.length > 3 ? '…' : '') : ''}`;
    }).join('\n');
  return `🥗 Plano Alimentar — ${paciente}\n` +
    `📊 Meta: ${kcal} kcal/dia | P ${ptn}g · C ${cho}g · L ${lip}g\n\n` +
    (refs || 'Plano em elaboração') +
    '\n\n— ERG 360';
}
function _v5CompartilharPlano() {
  const texto = _v5BuildShareText();
  const nomePlano = document.getElementById('f-plano-nome')?.value?.trim() ||
                    'Plano Alimentar ERG 360';
  if (navigator.share) {
    navigator.share({ title: nomePlano, text: texto }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(texto)
      .then(() => _anunciarSR('Resumo do plano copiado para área de transferência.'))
      .catch(() => {});
  }
}
(function _v5InjectShareBtn() {
  const init = () => {
    if (document.getElementById('ap-v5-share-btn')) return;
    const saveBtn = document.getElementById('btn-save');
    if (!saveBtn) return;
    const btn = document.createElement('button');
    btn.id = 'ap-v5-share-btn';
    btn.type = 'button';
    btn.className = 'ap-v5-share-btn';
    btn.setAttribute('aria-label', 'Compartilhar resumo do plano');
    btn.title = 'Compartilhar plano com paciente';
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg><span>Compartilhar</span>`;
    btn.addEventListener('click', _v5CompartilharPlano);
    saveBtn.insertAdjacentElement('beforebegin', btn);
  };
  if (document.readyState !== 'loading') setTimeout(init, 800);
  else document.addEventListener('DOMContentLoaded', () => setTimeout(init, 800));
})();

// ── V5.3 CLIPBOARD API — copia resumo de macros ─────────────
function _v5CopiarMacros() {
  const kcal   = document.getElementById('prev-kcal')?.textContent?.trim()   || '—';
  const ptn    = document.getElementById('prev-ptn')?.textContent?.trim()    || '—';
  const cho    = document.getElementById('prev-cho')?.textContent?.trim()    || '—';
  const lip    = document.getElementById('prev-lip')?.textContent?.trim()    || '—';
  const fibras = document.getElementById('prev-fibras')?.textContent?.trim() || '—';
  const texto  = `Calorias\t${kcal} kcal\nProteína\t${ptn} g\nCarboidratos\t${cho} g\nLipídios\t${lip} g\nFibras\t${fibras} g`;
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(texto).then(() => {
    const badge = document.createElement('div');
    badge.className = 'ap-v5-copy-badge';
    badge.setAttribute('role', 'status');
    badge.textContent = 'Macros copiados ✓';
    document.body.appendChild(badge);
    requestAnimationFrame(() => requestAnimationFrame(() => badge.classList.add('ap-v5-copy-badge--show')));
    setTimeout(() => {
      badge.classList.remove('ap-v5-copy-badge--show');
      badge.addEventListener('transitionend', () => badge.remove(), { once: true });
    }, 2000);
    _anunciarSR('Tabela de macros copiada.');
  }).catch(() => {});
}
(function _v5InjectCopyBtn() {
  const init = () => {
    if (document.getElementById('ap-v5-copy-btn')) return;
    const preview = document.querySelector('.plano-preview');
    if (!preview) return;
    const btn = document.createElement('button');
    btn.id = 'ap-v5-copy-btn';
    btn.type = 'button';
    btn.className = 'ap-v5-copy-btn';
    btn.setAttribute('aria-label', 'Copiar tabela de macros');
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar macros`;
    btn.addEventListener('click', _v5CopiarMacros);
    preview.appendChild(btn);
  };
  if (document.readyState !== 'loading') setTimeout(init, 1000);
  else document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));
})();

// ── V5.4 NOTIFICATION API — notifica autosave em background ─
let _v5NotifPermission = (typeof Notification !== 'undefined') ? Notification.permission : 'denied';
(function _v5InitNotif() {
  if (typeof Notification === 'undefined') return;
  // Solicita permissão discretamente após primeira interação real do usuário
  document.addEventListener('click', function _reqNotif(e) {
    if (!e.target.closest('button, input, textarea, select, a')) return;
    if (_v5NotifPermission !== 'default') {
      document.removeEventListener('click', _reqNotif);
      return;
    }
    Notification.requestPermission().then(p => {
      _v5NotifPermission = p;
      document.removeEventListener('click', _reqNotif);
    });
  });
})();

function _v5NotificarAutosave() {
  if (_v5NotifPermission !== 'granted' || !document.hidden) return;
  try {
    new Notification('ERG 360 — Rascunho salvo', {
      body: 'Plano alimentar salvo automaticamente.',
      tag:    'ap-autosave',
      silent: true,
    });
  } catch (_) {}
}

// ── V5.5 VIBRATION API — feedback tátil em mobile ───────────
function _v5Vibrar(pattern = [25]) {
  try { navigator.vibrate?.(pattern); } catch (_) {}
}
// Toque leve ao selecionar alimento do autocomplete
document.addEventListener('click', (e) => {
  if (e.target.closest('.alim-autocomplete-opt')) _v5Vibrar([20]);
}, { capture: true, passive: true });
// Padrão duplo ao submeter/publicar
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-save, form [type="submit"]')) _v5Vibrar([30, 60, 30]);
}, { passive: true });

// ── V5.6 ONLINE/OFFLINE DETECTION — banner + queue ──────────
const _v5OfflineQueue = [];
(function _v5InitOffline() {
  function _showBanner(show) {
    let banner = document.getElementById('ap-v5-offline-banner');
    if (!show) {
      if (banner) {
        banner.classList.remove('ap-v5-offline-banner--show');
        banner.addEventListener('transitionend', () => banner.remove(), { once: true });
      }
      return;
    }
    if (banner) return;
    banner = document.createElement('div');
    banner.id = 'ap-v5-offline-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.className = 'ap-v5-offline-banner';
    banner.textContent = '⚠ Sem conexão — alterações sendo salvas localmente';
    document.body.appendChild(banner);
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('ap-v5-offline-banner--show')));
  }
  window.addEventListener('offline', () => {
    _showBanner(true);
    _anunciarSR('Conexão perdida. Plano sendo salvo localmente.');
  });
  window.addEventListener('online', () => {
    _showBanner(false);
    _anunciarSR('Conexão restaurada.');
    while (_v5OfflineQueue.length) {
      const fn = _v5OfflineQueue.shift();
      try { fn(); } catch (_) {}
    }
  });
  if (!navigator.onLine) _showBanner(true);
})();

// ── V5.7 BeforeInstallPrompt — botão "Instalar app" ─────────
let _v5DeferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _v5DeferredInstall = e;
  if (document.getElementById('ap-v5-install-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'ap-v5-install-btn';
  btn.className = 'ap-v5-install-btn';
  btn.setAttribute('aria-label', 'Instalar ERG 360 como aplicativo');
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Instalar ERG 360`;
  btn.addEventListener('click', async () => {
    if (!_v5DeferredInstall) return;
    _v5DeferredInstall.prompt();
    const { outcome } = await _v5DeferredInstall.userChoice;
    _v5DeferredInstall = null;
    btn.remove();
    if (outcome === 'accepted') _anunciarSR('ERG 360 instalado com sucesso.');
  });
  document.body.appendChild(btn);
});
window.addEventListener('appinstalled', () => {
  document.getElementById('ap-v5-install-btn')?.remove();
  _v5DeferredInstall = null;
});

// ── V5.8 STORAGE ESTIMATE — avisa quando quase cheio ────────
(async function _v5CheckStorage() {
  if (!navigator.storage?.estimate) return;
  await new Promise(r => setTimeout(r, 4000));
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (!quota || usage / quota < 0.80) return;
    const pct = Math.round((usage / quota) * 100);
    const aviso = document.createElement('div');
    aviso.id = 'ap-v5-storage-warn';
    aviso.className = 'ap-v5-storage-warn';
    aviso.setAttribute('role', 'alert');
    aviso.innerHTML = `⚠ Armazenamento ${pct}% cheio &nbsp;<button id="ap-v5-limpar-btn" type="button">Limpar rascunhos antigos</button>`;
    document.body.appendChild(aviso);
    requestAnimationFrame(() => requestAnimationFrame(() => aviso.classList.add('ap-v5-storage-warn--show')));
    document.getElementById('ap-v5-limpar-btn')?.addEventListener('click', () => {
      const LIMIT = 30 * 86400000;
      const agora = Date.now();
      Object.keys(localStorage).filter(k => k.startsWith('rascunho-plano-')).forEach(k => {
        try {
          const obj = JSON.parse(localStorage.getItem(k) || '{}');
          if (!obj.ts || agora - obj.ts > LIMIT) localStorage.removeItem(k);
        } catch (_) { localStorage.removeItem(k); }
      });
      aviso.remove();
      _anunciarSR('Rascunhos antigos removidos com sucesso.');
    });
  } catch (_) {}
})();

// ── V5.9 BROADCAST CHANNEL — sync e notificação entre abas ──
// Wrapped save: notifica Notification (V5.4) + Broadcast (V5.9)
const _v5OrigSalvar = salvarRascunhoLocal;
salvarRascunhoLocal = function _v5WrappedSave() {
  const r = _v5OrigSalvar.apply(this, arguments);
  _v5NotificarAutosave();
  if (typeof BroadcastChannel !== 'undefined' && _v5BcChannel) {
    try {
      const planoId = document.getElementById('f-plano-id')?.value || 'sem-id';
      _v5BcChannel.postMessage({ tipo: 'autosave', planoId, ts: Date.now() });
    } catch (_) {}
  }
  return r;
};

let _v5BcChannel = null;
if (typeof BroadcastChannel !== 'undefined') {
  _v5BcChannel = new BroadcastChannel('erg360-admin-plano');
  _v5BcChannel.onmessage = ({ data }) => {
    if (data?.tipo !== 'autosave') return;
    const planoIdLocal = document.getElementById('f-plano-id')?.value;
    if (data.planoId && planoIdLocal && data.planoId !== planoIdLocal) return;
    const badge = document.getElementById('autosave-plano-badge');
    if (badge) {
      badge.style.opacity = '1';
      clearTimeout(badge._fadeTimer);
      badge._fadeTimer = setTimeout(() => { badge.style.opacity = '0.4'; }, 1800);
    }
    _anunciarSR('Rascunho sincronizado de outra aba.');
  };
}

// ── V5.10 PERFORMANCE MARKS — User Timing API ───────────────
performance.mark('ap-v5-loaded');
performance.measure('ap-extras-total-load', 'ap-v5-init-start', 'ap-v5-loaded');

// Marca quando o banco de alimentos ficar disponível
const _v5OrigCarregarBanco = carregarBancoAlimentos;
carregarBancoAlimentos = async function _v5MarkedBancoLoad() {
  if (!performance.getEntriesByName('ap-banco-load-start').length) {
    performance.mark('ap-banco-load-start');
  }
  const r = await _v5OrigCarregarBanco.apply(this, arguments);
  if (!performance.getEntriesByName('ap-banco-load-end').length) {
    performance.mark('ap-banco-load-end');
    try {
      performance.measure('ap-banco-carregamento', 'ap-banco-load-start', 'ap-banco-load-end');
    } catch (_) {}
  }
  return r;
};

// Marca quando a primeira refeição é adicionada pelo usuário
document.addEventListener('click', function _markFirstBlock(e) {
  if (!e.target.closest('[onclick*="addRefeicao"], .btn-add-refeicao')) return;
  performance.mark('ap-first-refeicao-added');
  document.removeEventListener('click', _markFirstBlock);
});

performance.mark('ap-v5-init-start'); // retrocompatível: recria se ausente

// ── EXPÕE EXTENSÕES V5 ───────────────────────────────────────
window._adminPlanoExtras = Object.assign(window._adminPlanoExtras || {}, {
  v5: {
    wakeLock:      { request: _v5RequestWakeLock, release: _v5ReleaseWakeLock },
    compartilhar:  _v5CompartilharPlano,
    copiarMacros:  _v5CopiarMacros,
    vibrar:        _v5Vibrar,
    offlineQueue:  _v5OfflineQueue,
    channel:       _v5BcChannel,
  },
});