// ============================================================
// preferencias-alimentares.js — Taxonomia completa do cardápio
// ------------------------------------------------------------
// Define 7 camadas que combinam para formar um plano integrado:
//
//   1. ESTILO         — escolha do paciente (onívoro, vegano, paleo…)
//   2. CONDIÇÃO       — dietoterapia (diabetes, hipertensão, DASH…)
//   3. OBJETIVO       — emagrecimento, ganho, manutenção…
//   4. ESTRATÉGIA     — macros (low carb, high protein…)
//   5. CONSISTÊNCIA   — textura (líquido, pastoso, brando…)
//   6. FASE DA VIDA   — infantil, gestante, idoso…
//   7. RESTRIÇÕES     — sem glúten, sem lactose, hipossódico…
//
// Funções:
//   • getEstiloInfo, getCondicaoInfo, getObjetivoInfo…
//   • resumoPerfilPaciente(p)    — "Vegana · Diabetes · Emagrecimento"
//   • listaAvisos(p)             — avisos em array para lista
//   • isFoodCompativel(food, key, perfil) — usa estilo + restrições
//   • filtrarFoods(foods, perfil)
// ============================================================

// ─── 1. ESTILO ALIMENTAR ────────────────────────────────────
export const ESTILOS = {
  onivoro:                 { label:'Onívoro',                     short:'Onívoro',            icon:'🍽️', cor:'#8b5e3c', categoriasExcluidas:[],                                                mensagem:'Sem restrições de origem animal.' },
  vegetariano_ovolacto:    { label:'Vegetariano (ovolacto)',       short:'Ovolacto',           icon:'🥚', cor:'#3d6b4f', categoriasExcluidas:['carnes','peixes'],                               mensagem:'Sem carnes e peixes. Ovos e laticínios permitidos.' },
  vegetariano_lacto:       { label:'Lactovegetariano',             short:'Lactovegetariano',   icon:'🥛', cor:'#4a7a5a', categoriasExcluidas:['carnes','peixes','ovos'],                        mensagem:'Sem carnes, peixes e ovos. Laticínios permitidos.' },
  vegano:                  { label:'Vegano',                       short:'Vegano',             icon:'🌱', cor:'#2f6a3f', categoriasExcluidas:['carnes','peixes','ovos','laticinios'],            mensagem:'Sem produtos de origem animal (inclui mel).' },
  pescetariano:            { label:'Pescetariano',                 short:'Pescetariano',       icon:'🐟', cor:'#3a6b86', categoriasExcluidas:['carnes'],                                        mensagem:'Sem carnes vermelhas e aves. Peixes e frutos do mar permitidos.' },
  flexitariano:            { label:'Flexitariano',                 short:'Flexitariano',       icon:'🥗', cor:'#7a8f3b', categoriasExcluidas:[],                                                mensagem:'Predominantemente vegetal, com consumo ocasional de proteína animal.' },
  crudivoro:               { label:'Crudívoro',                    short:'Crudívoro',          icon:'🥒', cor:'#5a8f3d', categoriasExcluidas:[],                                                mensagem:'Alimentos crus ou desidratados (< 42 °C). Priorizar frutas, vegetais, oleaginosas e sementes.' },
  paleolitico:             { label:'Paleolítico',                  short:'Paleo',              icon:'🍖', cor:'#6b3b2c', categoriasExcluidas:['cereais','leguminosas','laticinios'],             mensagem:'Sem grãos, leguminosas, laticínios e processados. Carnes, peixes, ovos, vegetais, frutas, oleaginosas.' },
  cetogenico:              { label:'Cetogênico (estilo)',          short:'Keto',               icon:'🥑', cor:'#5a6d28', categoriasExcluidas:[],                                                mensagem:'Muito baixo em carboidrato (< 50 g/dia). Alto lipídio. Ver também "Estratégia cetogênica".' },
};

// ─── 2. CONDIÇÃO CLÍNICA ────────────────────────────────────
// Grupo → lista; multiselect. Cada condição pode trazer orientações específicas.
export const CONDICOES_GRUPOS = [
  {
    grupo:'Metabólicas',  condicoes:[
      { key:'diabetes',           label:'Diabetes',              mensagem:'Controle glicêmico: IG/CG baixos, distribuir CHO, priorizar fibras.' },
      { key:'obesidade',          label:'Obesidade',             mensagem:'Déficit calórico moderado + saciedade (fibras e proteína).' },
      { key:'dislipidemia',       label:'Dislipidemia',          mensagem:'Reduzir saturada/trans, aumentar ômega-3 e fibras solúveis.' },
      { key:'sindrome_metabolica',label:'Síndrome metabólica',   mensagem:'Controle glicêmico + hipossódica + ômega-3.' },
    ]
  },
  {
    grupo:'Cardiovasculares', condicoes:[
      { key:'hipertensao',        label:'Hipertensão',           mensagem:'Hipossódica (< 2 g Na/dia). Priorizar potássio, magnésio e cálcio.' },
      { key:'dieta_dash',         label:'Dieta DASH',            mensagem:'Rica em frutas, vegetais, grãos integrais, laticínios magros. Baixo sódio.' },
    ]
  },
  {
    grupo:'Gastrointestinais', condicoes:[
      { key:'gastrite',           label:'Gastrite',              mensagem:'Evitar irritantes (café, álcool, pimenta, frituras). Fracionar refeições.' },
      { key:'refluxo',            label:'Refluxo',               mensagem:'Evitar gordura alta, cítricos, menta, chocolate, café. Não deitar logo após.' },
      { key:'intestino_irritavel',label:'Intestino irritável',   mensagem:'Considerar restrição de FODMAPs. Fibras solúveis em detrimento de insolúveis.' },
      { key:'low_fodmap',         label:'Low FODMAP',            mensagem:'Restringir oligossacarídeos, dissacarídeos, monossacarídeos e polióis fermentáveis.' },
    ]
  },
  {
    grupo:'Renais', condicoes:[
      { key:'doenca_renal',       label:'Doença renal crônica',  mensagem:'Restringir proteína (estágio-dependente), fósforo, potássio e sódio.' },
    ]
  },
  {
    grupo:'Hepáticas', condicoes:[
      { key:'esteatose',          label:'Esteatose hepática',    mensagem:'Reduzir açúcares (especialmente frutose livre), álcool e saturada. Ômega-3.' },
    ]
  },
  {
    grupo:'Outras', condicoes:[
      { key:'intolerancia_lactose', label:'Intolerância à lactose', mensagem:'Evitar laticínios com lactose. Alternativas: zero-lactose, vegetais.' },
      { key:'doenca_celiaca',       label:'Doença celíaca',         mensagem:'Exclusão total de glúten (trigo, cevada, centeio, aveia contaminada).' },
      { key:'oncologicos',          label:'Oncológicos',            mensagem:'Suporte individualizado: proteína adequada, anti-inflamatórios, hidratação.' },
    ]
  },
];

export const CONDICOES = Object.fromEntries(
  CONDICOES_GRUPOS.flatMap(g => g.condicoes.map(c => [c.key, { ...c, grupo:g.grupo }]))
);

// ─── 3. OBJETIVO ────────────────────────────────────────────
export const OBJETIVOS = {
  emagrecimento:         { label:'Emagrecimento (hipocalórico)',  short:'Emagrecimento',   icon:'📉', mensagem:'Déficit de 300–500 kcal. Priorizar saciedade e preservação de massa magra.' },
  ganho_massa:           { label:'Ganho de massa (hipercalórico)', short:'Ganho de massa',  icon:'📈', mensagem:'Superávit de 300–500 kcal + proteína 1,8–2,2 g/kg.' },
  manutencao:            { label:'Manutenção',                     short:'Manutenção',      icon:'⚖️', mensagem:'VET igual ao GET. Foco em qualidade e distribuição.' },
  reeducacao:            { label:'Reeducação alimentar',           short:'Reeducação',      icon:'🌿', mensagem:'Foco em hábitos, variedade e relação saudável com comida.' },
  performance:           { label:'Performance esportiva',          short:'Performance',     icon:'🏃', mensagem:'Periodizar CHO, proteína 1,6–2,2 g/kg, timing nutricional.' },
  estetica_cutting:      { label:'Estética — cutting',             short:'Cutting',         icon:'✂️', mensagem:'Definição: déficit mais agressivo + alto aporte de proteína.' },
  estetica_bulking:      { label:'Estética — bulking',             short:'Bulking',         icon:'💪', mensagem:'Hipertrofia: superávit controlado + sobrecarga de proteína.' },
};

// ─── 4. ESTRATÉGIA NUTRICIONAL ─────────────────────────────
export const ESTRATEGIAS = {
  low_carb:    { label:'Low carb',     short:'Low carb',     mensagem:'< 100 g CHO/dia. Priorizar proteína e gordura boa.' },
  high_carb:   { label:'High carb',    short:'High carb',    mensagem:'> 55 % VET de CHO. Útil em performance e ganho.' },
  high_protein:{ label:'High protein', short:'High protein', mensagem:'> 25 % VET de proteína (ou ≥ 2 g/kg).' },
  low_fat:     { label:'Low fat',      short:'Low fat',      mensagem:'< 25 % VET de lipídio. Controle de colesterol/TG.' },
  cetogenico:  { label:'Cetogênica',   short:'Cetogênica',   mensagem:'< 50 g CHO/dia + alto lipídio. Indução de cetose.' },
  moderada:    { label:'Moderada (equilibrada)', short:'Moderada', mensagem:'CHO 45–55 %, PTN 15–20 %, LIP 25–35 %.' },
};

// ─── 5. CONSISTÊNCIA / TEXTURA ─────────────────────────────
export const CONSISTENCIAS = {
  normal:           { label:'Normal',            mensagem:'Sem restrição de textura.' },
  brando:           { label:'Brando',            mensagem:'Cozidos macios, sem frituras, sem irritantes.' },
  pastoso:          { label:'Pastoso',           mensagem:'Purês, cremes, alimentos amassados. Disfagia leve/moderada.' },
  liquido_completo: { label:'Líquido completo',  mensagem:'Todos líquidos — sopas batidas, vitaminas, leite.' },
  liquido_claro:    { label:'Líquido claro',     mensagem:'Apenas transparentes — água, chá, caldos coados, gelatina.' },
};

// ─── 6. FASE DA VIDA ───────────────────────────────────────
export const FASES_VIDA = {
  adulto:      { label:'Adulto',       mensagem:'Padrão (19–59 anos).' },
  infantil:    { label:'Infantil',     mensagem:'DRIs pediátricas. Textura e porções apropriadas por faixa etária.' },
  adolescente: { label:'Adolescente',  mensagem:'Alta demanda de Fe, Ca, proteína e energia.' },
  gestante:    { label:'Gestante',     mensagem:'+340 kcal (2º tri) / +450 kcal (3º tri). Ácido fólico, Fe, Ca, ômega-3.' },
  lactante:    { label:'Lactante',     mensagem:'+500 kcal. Hidratação reforçada. Evitar cafeína excessiva e álcool.' },
  idoso:       { label:'Idoso',        mensagem:'Proteína ≥ 1,0–1,2 g/kg. Atenção a sarcopenia, hidratação, B12 e D.' },
};

// ─── 7. RESTRIÇÕES ALIMENTARES ─────────────────────────────
export const RESTRICOES = {
  sem_gluten: {
    label:  'Sem glúten',
    tagsExcluidas:       ['gluten'],
    alimentosExcluidos:  ['aveia_em_flocos','pao_integral','macarrao_integral','trigo','cevada','centeio'],
    mensagem: 'Evitar trigo, cevada, centeio e derivados.',
  },
  sem_lactose: {
    label:  'Sem lactose',
    tagsExcluidas:       ['lactose'],
    categoriasExcluidas: ['laticinios'],
    mensagem: 'Evitar leite e derivados com lactose. Alternativas: bebidas vegetais, queijos sem lactose.',
  },
  sem_acucar: {
    label:  'Sem açúcar',
    tagsExcluidas:       ['acucar','refinado'],
    alimentosExcluidos:  ['acucar','mel'],
    mensagem: 'Evitar açúcar refinado e mel. Usar adoçantes naturais com moderação.',
  },
  hipossodico: {
    label:  'Hipossódico',
    tagsExcluidas:       ['alto-sodio','embutido'],
    mensagem: 'Sódio < 2 g/dia. Evitar embutidos, conservas, caldos industrializados.',
  },
  sem_alergenicos: {
    label:  'Sem alergênicos',
    mensagem: 'Excluir alimentos alergênicos conforme prescrição médica (leite, ovo, soja, oleaginosas, peixes, crustáceos, trigo).',
  },
  low_carb: {
    label:  'Low carb',
    tagsExcluidas:       ['alto-ig'],
    mensagem: 'Restringir CHO refinados e açúcares. Priorizar proteínas, gorduras boas e vegetais.',
  },
};

// ─── BACK-COMPAT ──────────────────────────────────────────
// Mantém nomes usados no código legado para que nada quebre
export const PREFERENCIAS = ESTILOS;

// ─── API ──────────────────────────────────────────────────

export function getEstiloInfo(key)   { return ESTILOS[key] || ESTILOS.onivoro; }
export function getObjetivoInfo(key) { return OBJETIVOS[key] || null; }
export function getEstrategiaInfo(key){ return ESTRATEGIAS[key] || null; }
export function getConsistenciaInfo(key){ return CONSISTENCIAS[key] || CONSISTENCIAS.normal; }
export function getFaseVidaInfo(key) { return FASES_VIDA[key] || FASES_VIDA.adulto; }
export function getCondicaoInfo(key) { return CONDICOES[key] || null; }
// back-compat
export function getPreferenciaInfo(key) { return getEstiloInfo(key); }

/**
 * Converte paciente em resumo legível de uma linha.
 * Aceita tanto os campos novos (estilo_alimentar, condicoes_clinicas…)
 * quanto o legado (preferencia_alimentar, restricoes_alimentares).
 */
export function resumoPerfilPaciente(p) {
  if (!p) return '';
  const estilo  = p.estilo_alimentar || p.preferencia_alimentar || 'onivoro';
  const partes  = [];
  const estiloInfo = getEstiloInfo(estilo);
  if (estilo !== 'onivoro') partes.push(estiloInfo.short);

  const condicoes = Array.isArray(p.condicoes_clinicas) ? p.condicoes_clinicas : [];
  if (condicoes.length) partes.push(condicoes.map(c => CONDICOES[c]?.label).filter(Boolean).join(' + '));

  if (p.objetivo && OBJETIVOS[p.objetivo])             partes.push(OBJETIVOS[p.objetivo].short);
  if (p.estrategia_nutricional && ESTRATEGIAS[p.estrategia_nutricional]) partes.push(ESTRATEGIAS[p.estrategia_nutricional].short);
  if (p.consistencia && p.consistencia !== 'normal')   partes.push(CONSISTENCIAS[p.consistencia]?.label);
  if (p.fase_da_vida && p.fase_da_vida !== 'adulto')   partes.push(FASES_VIDA[p.fase_da_vida]?.label);

  const restr = Array.isArray(p.restricoes_alimentares) ? p.restricoes_alimentares : [];
  const rLabels = restr.map(r => RESTRICOES[r]?.label).filter(Boolean);
  if (rLabels.length) partes.push(rLabels.join(' · '));

  return partes.join(' · ') || 'Perfil padrão';
}

// Mantém compatibilidade com código que chama resumoPreferencia(p)
export function resumoPreferencia(p) { return resumoPerfilPaciente(p); }

/**
 * Avisos para lista. Aceita um objeto paciente ou parâmetros legados.
 */
export function listaAvisos(pOrEstilo, restricoesLegado) {
  // Compat: se chamado com (string, array)
  let p;
  if (typeof pOrEstilo === 'string' || pOrEstilo == null) {
    p = { estilo_alimentar: pOrEstilo, restricoes_alimentares: restricoesLegado || [] };
  } else {
    p = pOrEstilo;
  }

  const out = [];
  const estilo  = p.estilo_alimentar || p.preferencia_alimentar || 'onivoro';
  if (estilo !== 'onivoro') {
    const info = getEstiloInfo(estilo);
    out.push(`${info.label}: ${info.mensagem}`);
  }

  const condicoes = Array.isArray(p.condicoes_clinicas) ? p.condicoes_clinicas : [];
  for (const c of condicoes) {
    const info = CONDICOES[c];
    if (info) out.push(`${info.label}: ${info.mensagem}`);
  }

  if (p.objetivo     && OBJETIVOS[p.objetivo])       out.push(`${OBJETIVOS[p.objetivo].label}: ${OBJETIVOS[p.objetivo].mensagem}`);
  if (p.estrategia_nutricional && ESTRATEGIAS[p.estrategia_nutricional])
    out.push(`${ESTRATEGIAS[p.estrategia_nutricional].label}: ${ESTRATEGIAS[p.estrategia_nutricional].mensagem}`);
  if (p.consistencia && p.consistencia !== 'normal')
    out.push(`Consistência ${CONSISTENCIAS[p.consistencia]?.label}: ${CONSISTENCIAS[p.consistencia]?.mensagem}`);
  if (p.fase_da_vida && p.fase_da_vida !== 'adulto')
    out.push(`${FASES_VIDA[p.fase_da_vida].label}: ${FASES_VIDA[p.fase_da_vida].mensagem}`);

  const restr = Array.isArray(p.restricoes_alimentares) ? p.restricoes_alimentares : [];
  for (const r of restr) {
    const info = RESTRICOES[r];
    if (info) out.push(`${info.label}: ${info.mensagem}`);
  }

  return out;
}

/**
 * Compatibilidade de um alimento com estilo + restrições + condições
 * @param {Object} food     — entrada do FOODS ({ categoria, tags })
 * @param {string} keyFood  — slug
 * @param {Object} p        — paciente (ou legado: string estilo, array restricoes)
 */
export function isFoodCompativel(food, keyFood, p, restricoesLegado) {
  if (!food) return true;
  // Compat legado: isFoodCompativel(food, key, estilo, restricoes)
  let perfil = p;
  if (typeof p === 'string' || p == null) {
    perfil = { estilo_alimentar: p, restricoes_alimentares: restricoesLegado || [] };
  }

  const estilo = perfil.estilo_alimentar || perfil.preferencia_alimentar || 'onivoro';
  const info = getEstiloInfo(estilo);
  if (info.categoriasExcluidas?.includes(food.categoria)) return false;

  const tags  = food.tags || [];
  const restr = Array.isArray(perfil.restricoes_alimentares) ? perfil.restricoes_alimentares : [];
  for (const r of restr) {
    const rinfo = RESTRICOES[r];
    if (!rinfo) continue;
    if (rinfo.categoriasExcluidas?.includes(food.categoria)) return false;
    if (rinfo.tagsExcluidas?.some(t => tags.includes(t))) return false;
    if (rinfo.alimentosExcluidos?.includes(keyFood)) return false;
  }
  return true;
}

/**
 * Filtra FOODS {key: food} removendo incompatíveis
 */
export function filtrarFoods(foods, p, restricoesLegado) {
  const out = {};
  for (const [k, f] of Object.entries(foods || {})) {
    if (isFoodCompativel(f, k, p, restricoesLegado)) out[k] = f;
  }
  return out;
}
