/**
 * ERG 360 — Meal Planner Clínico
 * ============================================================
 * Motor de montagem, validação e ajuste de planos alimentares
 * baseados em protocolos nutricionais clínicos.
 * ============================================================
 */

import { FOODS, PROTOCOLS, MEAL_TEMPLATES, SUBSTITUTIONS } from './nutrition-data.js';

// ── CONSTANTES ─────────────────────────────────────────────────
const TIPOS_REFEICAO = ['cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia'];
const LABELS_REFEICAO = {
  cafe_manha:   'Café da Manhã',
  lanche_manha: 'Lanche da Manhã',
  almoco:       'Almoço',
  lanche_tarde: 'Lanche da Tarde',
  jantar:       'Jantar',
  ceia:         'Ceia'
};

// ── 1. CÁLCULO NUTRICIONAL ─────────────────────────────────────

/**
 * Calcula totais nutricionais de uma lista de alimentos com gramagens
 * @param {Array} alimentos — [{ key, g }]
 * @returns {Object} totais nutricionais
 */
export function calcularTotaisRefeicao(alimentos) {
  const t = { kcal:0, cho:0, ptn:0, lip:0, fib:0, na:0, k:0, ca:0, fe:0, mg:0, omega3:0 };

  for (const item of alimentos) {
    const f = FOODS[item.key];
    if (!f) { console.warn(`[MealPlanner] Alimento não encontrado: ${item.key}`); continue; }
    const fator = item.g / 100;
    const n = f.n;
    t.kcal  += (n.kcal  || 0) * fator;
    t.cho   += (n.cho   || 0) * fator;
    t.ptn   += (n.ptn   || 0) * fator;
    t.lip   += (n.lip   || 0) * fator;
    t.fib   += (n.fib   || 0) * fator;
    t.na    += (n.na    || 0) * fator;
    t.k     += (n.k     || 0) * fator;
    t.ca    += (n.ca    || 0) * fator;
    t.fe    += (n.fe    || 0) * fator;
    t.mg    += (n.mg    || 0) * fator;
    t.omega3 += (n.omega3 || 0) * fator;
  }

  return arredondarObjeto(t, 1);
}

/**
 * Soma os totais de todas as refeições do dia
 */
export function calcularTotaisDia(planoDia) {
  const dia = { kcal:0, cho:0, ptn:0, lip:0, fib:0, na:0, k:0, ca:0, fe:0, mg:0, omega3:0 };
  for (const ref of Object.values(planoDia)) {
    const t = ref.totais;
    for (const k of Object.keys(dia)) dia[k] += (t[k] || 0);
  }
  return arredondarObjeto(dia, 1);
}

/**
 * Calcula distribuição de macros em % das calorias
 */
export function calcularDistribuicaoMacros(totais) {
  const kcal = totais.kcal || 1;
  return {
    cho_pct: arredondar((totais.cho * 4 / kcal) * 100, 1),
    ptn_pct: arredondar((totais.ptn * 4 / kcal) * 100, 1),
    lip_pct: arredondar((totais.lip * 9 / kcal) * 100, 1)
  };
}

// ── 2. MONTAGEM DO PLANO ───────────────────────────────────────

/**
 * Monta plano alimentar completo para um protocolo e meta calórica
 * @param {string} protocolSlug — slug do protocolo (ex: 'diabetes_ri')
 * @param {number} kcalAlvo    — meta calórica do paciente
 * @param {Object} opcoes      — { randomizar: true/false, opcoes_por_tipo: {cafe_manha: 2, ...} }
 * @returns {Object} plano completo
 */
export function montarPlanoDia(protocolSlug, kcalAlvo = null, opcoes = {}) {
  const protocol  = PROTOCOLS[protocolSlug];
  const templates = MEAL_TEMPLATES[protocolSlug];

  if (!protocol)  throw new Error(`Protocolo não encontrado: "${protocolSlug}". Disponíveis: ${Object.keys(PROTOCOLS).join(', ')}`);
  if (!templates) throw new Error(`Templates não encontrados para: "${protocolSlug}"`);

  const kcalBase   = protocol.metas.kcal_base;
  const kcalFinal  = kcalAlvo || kcalBase;
  const fator      = kcalFinal / kcalBase;

  const plano = {
    protocolo:       protocol.nome,
    protocol_slug:   protocolSlug,
    kcal_alvo:       kcalFinal,
    kcal_base_ref:   kcalBase,
    fator_ajuste:    arredondar(fator, 3),
    gerado_em:       new Date().toISOString(),
    refeicoes:       {}
  };

  const tiposAtivos = protocol.metas.num_refeicoes < 6
    ? TIPOS_REFEICAO.filter(t => t !== 'ceia')
    : TIPOS_REFEICAO;

  for (const tipo of tiposAtivos) {
    if (!templates[tipo]) continue;

    const opcoesTipo = templates[tipo];
    let idxOpcao = 0;

    if (opcoes.randomizar) {
      idxOpcao = Math.floor(Math.random() * opcoesTipo.length);
    } else if (opcoes.opcoes_por_tipo?.[tipo] !== undefined) {
      idxOpcao = Math.min(opcoes.opcoes_por_tipo[tipo] - 1, opcoesTipo.length - 1);
    }

    const refeicaoOriginal = opcoesTipo[idxOpcao];

    // Ajustar gramagens proporcionalmente à meta calórica
    const alimentosAjustados = refeicaoOriginal.alimentos.map(item => ({
      ...item,
      g: Math.round(item.g * fator)
    }));

    // Montar refeição completa com dados do alimento
    const refeicao = {
      tipo,
      label:          LABELS_REFEICAO[tipo],
      opcao:          refeicaoOriginal.opcao,
      nome:           refeicaoOriginal.nome,
      descricao:      refeicaoOriginal.descricao || null,
      nota_clinica:   refeicaoOriginal.nota_clinica || null,
      alimentos:      alimentosAjustados.map(item => ({
        ...item,
        alimento:     FOODS[item.key]?.nome || item.key,
        categoria:    FOODS[item.key]?.categoria || null,
        tags:         FOODS[item.key]?.tags || []
      })),
      totais: calcularTotaisRefeicao(alimentosAjustados)
    };

    plano.refeicoes[tipo] = refeicao;
  }

  // Totais do dia
  plano.totais_dia = calcularTotaisDia(plano.refeicoes);
  plano.macros_pct = calcularDistribuicaoMacros(plano.totais_dia);
  plano.validacao  = validarPlano(plano, protocolSlug);

  return plano;
}

/**
 * Gera semana completa (7 dias) com opções rotacionadas
 * @param {string} protocolSlug
 * @param {number} kcalAlvo
 * @returns {Array} 7 planos diários
 */
export function montarPlanoSemana(protocolSlug, kcalAlvo = null) {
  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  return diasSemana.map((dia, idx) => ({
    dia,
    ...montarPlanoDia(protocolSlug, kcalAlvo, { randomizar: idx > 0 })
  }));
}

// ── 3. AJUSTE CALÓRICO PERSONALIZADO ──────────────────────────

/**
 * Calcula meta calórica pelo método Mifflin-St Jeor + Fator Atividade
 * @param {Object} dados — { peso, altura, idade, sexo, nivel_atividade, objetivo }
 * @returns {Object} { tmb, get, kcal_alvo, distribuicao_macros }
 */
export function calcularMetaCalorica(dados) {
  const { peso, altura, idade, sexo, nivel_atividade, objetivo } = dados;

  // TMB Mifflin-St Jeor
  let tmb;
  if (sexo === 'F') {
    tmb = (10 * peso) + (6.25 * altura) - (5 * idade) - 161;
  } else {
    tmb = (10 * peso) + (6.25 * altura) - (5 * idade) + 5;
  }

  const FATORES_ATIVIDADE = {
    sedentario:       1.2,
    leve:             1.375,
    moderado:         1.55,
    ativo:            1.725,
    muito_ativo:      1.9
  };

  const get = tmb * (FATORES_ATIVIDADE[nivel_atividade] || 1.55);

  // Ajuste por objetivo
  const AJUSTE_OBJETIVO = {
    emagrecimento_moderado: -500,
    emagrecimento_leve:     -250,
    manutencao:              0,
    hipertrofia_leve:       +250,
    hipertrofia:            +400
  };

  const ajuste   = AJUSTE_OBJETIVO[objetivo] || 0;
  const kcalAlvo = Math.round(get + ajuste);

  // PTN recomendada por objetivo
  const ptn_por_kg = objetivo?.includes('hipertrofia') ? 2.0 : 1.5;
  const ptn_g      = Math.round(peso * ptn_por_kg);

  return {
    tmb:          Math.round(tmb),
    get:          Math.round(get),
    kcal_alvo:    kcalAlvo,
    ptn_g_dia:    ptn_g,
    ptn_g_por_kg: ptn_por_kg,
    nota: `TMB ${Math.round(tmb)} kcal × fator ${FATORES_ATIVIDADE[nivel_atividade]} = GET ${Math.round(get)} kcal ${ajuste >= 0 ? '+' : ''}${ajuste} (${objetivo}) = ${kcalAlvo} kcal/dia`
  };
}

// ── 4. VALIDAÇÃO CLÍNICA ───────────────────────────────────────

/**
 * Valida se o plano atende as metas do protocolo clínico
 * @returns {Object} { aprovado, alertas, ok, score }
 */
export function validarPlano(plano, protocolSlug) {
  const protocol = PROTOCOLS[protocolSlug];
  const metas    = protocol.metas;
  const t        = plano.totais_dia;
  const mac      = plano.macros_pct;

  const alertas = [];
  const ok      = [];

  // Carboidratos
  if (mac.cho_pct < metas.cho_pct.min)
    alertas.push(`⚠ CHO ${mac.cho_pct}% abaixo do mínimo (${metas.cho_pct.min}%)`);
  else if (mac.cho_pct > metas.cho_pct.max)
    alertas.push(`⚠ CHO ${mac.cho_pct}% acima do máximo (${metas.cho_pct.max}%)`);
  else ok.push(`✓ CHO ${mac.cho_pct}% [meta: ${metas.cho_pct.min}–${metas.cho_pct.max}%]`);

  // Proteínas
  if (mac.ptn_pct < metas.ptn_pct.min)
    alertas.push(`⚠ Proteína ${mac.ptn_pct}% abaixo do mínimo (${metas.ptn_pct.min}%)`);
  else ok.push(`✓ Proteína ${mac.ptn_pct}% [meta: ${metas.ptn_pct.min}–${metas.ptn_pct.max}%]`);

  // Lipídios
  if (mac.lip_pct < metas.lip_pct.min)
    alertas.push(`⚠ Lipídios ${mac.lip_pct}% abaixo do mínimo (${metas.lip_pct.min}%)`);
  else if (mac.lip_pct > metas.lip_pct.max)
    alertas.push(`⚠ Lipídios ${mac.lip_pct}% acima do máximo (${metas.lip_pct.max}%)`);
  else ok.push(`✓ Lipídios ${mac.lip_pct}% [meta: ${metas.lip_pct.min}–${metas.lip_pct.max}%]`);

  // Fibra
  if (metas.fibra_min_g) {
    if (t.fib < metas.fibra_min_g)
      alertas.push(`⚠ Fibra ${t.fib}g abaixo da meta (≥ ${metas.fibra_min_g}g)`);
    else ok.push(`✓ Fibra ${t.fib}g [meta: ≥ ${metas.fibra_min_g}g]`);
  }

  // Sódio
  if (metas.sodio_max_mg) {
    if (t.na > metas.sodio_max_mg)
      alertas.push(`⚠ Sódio ${t.na}mg acima do máximo (${metas.sodio_max_mg}mg)`);
    else ok.push(`✓ Sódio ${t.na}mg [meta: ≤ ${metas.sodio_max_mg}mg]`);
  }

  // Potássio (DASH)
  if (metas.potassio_min_mg) {
    if (t.k < metas.potassio_min_mg)
      alertas.push(`⚠ Potássio ${t.k}mg abaixo da meta (≥ ${metas.potassio_min_mg}mg)`);
    else ok.push(`✓ Potássio ${t.k}mg [meta: ≥ ${metas.potassio_min_mg}mg]`);
  }

  // Ômega-3
  if (metas.omega3_min_g) {
    if (t.omega3 < metas.omega3_min_g)
      alertas.push(`⚠ Ômega-3 ${t.omega3}g abaixo da meta (≥ ${metas.omega3_min_g}g)`);
    else ok.push(`✓ Ômega-3 ${t.omega3}g [meta: ≥ ${metas.omega3_min_g}g]`);
  }

  // Calorias ±15% da meta
  const desvioKcal = Math.abs(t.kcal - plano.kcal_alvo) / plano.kcal_alvo;
  if (desvioKcal > 0.15)
    alertas.push(`⚠ Total calórico ${t.kcal} kcal diverge >15% da meta (${plano.kcal_alvo} kcal)`);
  else ok.push(`✓ Calorias ${t.kcal} kcal [meta: ${plano.kcal_alvo} kcal ±15%]`);

  const score = Math.round((ok.length / (ok.length + alertas.length)) * 100);

  return { aprovado: alertas.length === 0, alertas, ok, score };
}

// ── 5. SUBSTITUIÇÕES ────────────────────────────────────────────

/**
 * Sugere substituições compatíveis com um protocolo
 * @param {string} foodKey     — chave do alimento original
 * @param {string} protocolSlug — protocolo ativo do paciente
 * @returns {Array} lista de substituições com informação nutricional
 */
export function sugerirSubstituicoes(foodKey, protocolSlug) {
  const subs      = SUBSTITUTIONS[foodKey];
  const original  = FOODS[foodKey];
  const protocol  = PROTOCOLS[protocolSlug];
  if (!subs || !original) return [];

  return subs
    .filter(sub => {
      // Verificar compatibilidade com protocolo
      if (sub.protocolos && sub.protocolos.length > 0 && !sub.protocolos.includes(protocolSlug)) return false;
      // Verificar IG máximo se o protocolo tiver restrição
      const subFood = FOODS[sub.subKey];
      if (!subFood) return false;
      if (protocol?.metas?.ig_max && subFood.ig > protocol.metas.ig_max) return false;
      return true;
    })
    .map(sub => {
      const subFood = FOODS[sub.subKey];
      // Calcular diferença nutricional
      const difKcal = calcularTotaisRefeicao([{ key: sub.subKey, g: sub.g_sub }]).kcal -
                      calcularTotaisRefeicao([{ key: foodKey, g: sub.g_ref }]).kcal;
      return {
        alimento_original: original.nome,
        alimento_substituto: subFood.nome,
        key_original:  foodKey,
        key_substituto: sub.subKey,
        g_original:    sub.g_ref,
        g_substituto:  sub.g_sub,
        observacao:    sub.obs,
        diferenca_kcal: arredondar(difKcal, 1),
        ig_substituto:  subFood.ig,
        tags_substituto: subFood.tags
      };
    });
}

/**
 * Verifica se um alimento é compatível com um protocolo
 */
export function alimentoCompativel(foodKey, protocolSlug) {
  const food     = FOODS[foodKey];
  const protocol = PROTOCOLS[protocolSlug];
  if (!food || !protocol) return { compativel: false, motivo: 'Não encontrado' };

  if (protocol.metas.ig_max && food.ig && food.ig > protocol.metas.ig_max) {
    return { compativel: false, motivo: `IG do alimento (${food.ig}) > máximo do protocolo (${protocol.metas.ig_max})` };
  }
  return { compativel: true, motivo: null };
}

// ── 6. BUSCA E FILTROS ─────────────────────────────────────────

/**
 * Busca alimentos por tag clínica
 * @param {string|string[]} tags — ex: 'omega3' ou ['omega3', 'anti-inflamatorio']
 * @returns {Array} alimentos com aquelas tags
 */
export function buscarAlimentosPorTag(tags) {
  const tagList = Array.isArray(tags) ? tags : [tags];
  return Object.entries(FOODS)
    .filter(([, food]) => tagList.every(tag => food.tags.includes(tag)))
    .map(([key, food]) => ({ key, nome: food.nome, categoria: food.categoria, tags: food.tags, ig: food.ig }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria));
}

/**
 * Lista protocolos disponíveis com resumo
 */
export function listarProtocolos() {
  return Object.entries(PROTOCOLS).map(([slug, p]) => ({
    slug,
    nome:            p.nome,
    kcal_base:       p.metas.kcal_base,
    num_refeicoes:   p.metas.num_refeicoes,
    alimentos_chave: p.alimentos_chave?.map(k => FOODS[k]?.nome).filter(Boolean)
  }));
}

/**
 * Retorna todas as opções de refeição para um protocolo e tipo
 */
export function listarOpcoesRefeicao(protocolSlug, tipoRefeicao) {
  const templates = MEAL_TEMPLATES[protocolSlug]?.[tipoRefeicao];
  if (!templates) return [];
  return templates.map(tmpl => ({
    ...tmpl,
    totais_calculados: calcularTotaisRefeicao(tmpl.alimentos)
  }));
}

// ── 7. RENDERIZAÇÃO HTML ───────────────────────────────────────

/**
 * Gera HTML completo do plano diário para exibição no sistema
 */
export function renderizarPlanoHTML(plano) {
  const v = plano.validacao;
  const t = plano.totais_dia;

  let html = `
    <div class="mp-plano">
      <div class="mp-header">
        <div class="mp-header-left">
          <p class="mp-protocolo">${plano.protocolo}</p>
          <p class="mp-kcal">${Math.round(t.kcal)} kcal / dia</p>
        </div>
        <div class="mp-macros">
          <span class="mp-macro-pill mp-cho">CHO ${plano.macros_pct.cho_pct}%</span>
          <span class="mp-macro-pill mp-ptn">PTN ${plano.macros_pct.ptn_pct}%</span>
          <span class="mp-macro-pill mp-lip">LIP ${plano.macros_pct.lip_pct}%</span>
        </div>
      </div>
      <div class="mp-stats">
        <div class="mp-stat"><span class="mp-stat-val">${t.ptn}g</span><span class="mp-stat-lbl">Proteína</span></div>
        <div class="mp-stat"><span class="mp-stat-val">${t.cho}g</span><span class="mp-stat-lbl">Carboidratos</span></div>
        <div class="mp-stat"><span class="mp-stat-val">${t.lip}g</span><span class="mp-stat-lbl">Lipídios</span></div>
        <div class="mp-stat"><span class="mp-stat-val">${t.fib}g</span><span class="mp-stat-lbl">Fibras</span></div>
        <div class="mp-stat"><span class="mp-stat-val">${t.na}mg</span><span class="mp-stat-lbl">Sódio</span></div>
      </div>
  `;

  // Refeições
  html += '<div class="mp-refeicoes">';
  for (const [tipo, ref] of Object.entries(plano.refeicoes)) {
    html += `
      <div class="mp-refeicao">
        <div class="mp-ref-header">
          <span class="mp-ref-tipo">${ref.label}</span>
          <span class="mp-ref-nome">${ref.nome}</span>
          <span class="mp-ref-kcal">${Math.round(ref.totais.kcal)} kcal</span>
        </div>
        <ul class="mp-alimentos">
          ${ref.alimentos.map(a => `
            <li class="mp-alimento">
              <span class="mp-alimento-nome">${a.alimento}</span>
              <span class="mp-alimento-g">${a.g}g</span>
              ${a.preparo ? `<span class="mp-alimento-prep">${a.preparo}</span>` : ''}
            </li>
          `).join('')}
        </ul>
        <div class="mp-ref-macros">
          <span>${Math.round(ref.totais.cho)}g CHO</span>
          <span>${Math.round(ref.totais.ptn)}g PTN</span>
          <span>${Math.round(ref.totais.lip)}g LIP</span>
          ${ref.totais.fib > 0 ? `<span>${ref.totais.fib}g fibra</span>` : ''}
        </div>
        ${ref.nota_clinica ? `<p class="mp-nota">${ref.nota_clinica}</p>` : ''}
      </div>
    `;
  }
  html += '</div>';

  // Validação
  if (v.alertas.length > 0) {
    html += `<div class="mp-alertas">
      <p class="mp-alertas-title">⚠ Ajustes recomendados</p>
      ${v.alertas.map(a => `<p class="mp-alerta">${a}</p>`).join('')}
    </div>`;
  }

  html += `<div class="mp-score ${v.aprovado ? 'mp-score-ok' : 'mp-score-warn'}">
    Score do plano: ${v.score}% adequado ao protocolo
  </div></div>`;

  return html;
}

/**
 * Gera texto simples do plano (para PDF / WhatsApp)
 */
export function exportarPlanoTexto(plano) {
  const t = plano.totais_dia;
  let txt = `PLANO ALIMENTAR — ${plano.protocolo.toUpperCase()}\n`;
  txt += `Meta: ${plano.kcal_alvo} kcal | CHO ${plano.macros_pct.cho_pct}% | PTN ${plano.macros_pct.ptn_pct}% | LIP ${plano.macros_pct.lip_pct}%\n`;
  txt += `Total: ${Math.round(t.kcal)} kcal | Fibra ${t.fib}g | Sódio ${t.na}mg\n\n`;

  for (const ref of Object.values(plano.refeicoes)) {
    txt += `▶ ${ref.label.toUpperCase()} — ${ref.nome}\n`;
    for (const a of ref.alimentos) {
      txt += `  • ${a.alimento}: ${a.g}g${a.preparo ? ` (${a.preparo})` : ''}\n`;
    }
    txt += `  → ${Math.round(ref.totais.kcal)} kcal | ${Math.round(ref.totais.cho)}g CHO | ${Math.round(ref.totais.ptn)}g PTN | ${Math.round(ref.totais.lip)}g LIP\n\n`;
  }

  if (plano.validacao.alertas.length > 0) {
    txt += 'ATENÇÃO:\n';
    plano.validacao.alertas.forEach(a => txt += `  ${a}\n`);
  }
  return txt;
}

// ── 8. INTEGRAÇÃO COM SUPABASE ─────────────────────────────────

/**
 * Salva plano gerado no Supabase para um paciente
 * @param {Object} supabase — cliente supabase
 * @param {string} patientId — ID do paciente
 * @param {Object} plano — plano gerado por montarPlanoDia()
 * @param {Object} meta — { nome, valido_de, valido_ate, observacoes, gerado_por }
 */
export async function salvarPlanoSupabase(supabase, patientId, plano, meta = {}) {
  // 1. Buscar protocol_id no banco
  const { data: protocolData } = await supabase
    .from('protocols')
    .select('id')
    .eq('slug', plano.protocol_slug)
    .single();

  if (!protocolData) throw new Error(`Protocolo "${plano.protocol_slug}" não encontrado no banco.`);

  // 2. Inserir patient_meal_plan
  const { data: planData, error: planError } = await supabase
    .from('patient_meal_plans')
    .insert({
      patient_id:   patientId,
      protocol_id:  protocolData.id,
      nome:         meta.nome || `Plano ${plano.protocolo} — ${new Date().toLocaleDateString('pt-BR')}`,
      kcal_alvo:    plano.kcal_alvo,
      valido_de:    meta.valido_de || new Date().toISOString().split('T')[0],
      valido_ate:   meta.valido_ate || null,
      observacoes:  meta.observacoes || null,
      gerado_por:   meta.gerado_por || null
    })
    .select('id')
    .single();

  if (planError) throw planError;

  // 3. Inserir cada refeição do plano
  for (const [tipo, ref] of Object.entries(plano.refeicoes)) {
    // Buscar meal_template_id se possível
    const { data: tmplData } = await supabase
      .from('meal_templates')
      .select('id')
      .eq('protocol_id', protocolData.id)
      .eq('tipo_refeicao', tipo)
      .eq('opcao', ref.opcao)
      .single();

    await supabase.from('patient_plan_meals').insert({
      plan_id:          planData.id,
      tipo_refeicao:    tipo,
      meal_template_id: tmplData?.id || null,
      fator_quantidade: plano.fator_ajuste,
      ordem:            TIPOS_REFEICAO.indexOf(tipo)
    });
  }

  return planData.id;
}

// ── UTILITÁRIOS INTERNOS ───────────────────────────────────────

function arredondar(num, casas = 1) {
  const fator = Math.pow(10, casas);
  return Math.round(num * fator) / fator;
}

function arredondarObjeto(obj, casas = 1) {
  const resultado = {};
  for (const [k, v] of Object.entries(obj)) {
    resultado[k] = arredondar(v, casas);
  }
  return resultado;
}

// ── EXPORTS ADICIONAIS ─────────────────────────────────────────
export { FOODS, PROTOCOLS, MEAL_TEMPLATES, SUBSTITUTIONS, TIPOS_REFEICAO, LABELS_REFEICAO };
