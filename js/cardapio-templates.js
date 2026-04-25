// ============================================================
// cardapio-templates.js — Catálogo de templates pré-prontos
// ------------------------------------------------------------
// Cada template representa uma combinação clínica frequente
// (estilo + condições + objetivo + estratégia). O `matchTemplates`
// pontua cada template contra o perfil da paciente e devolve
// a lista ordenada por aderência.
//
// Para adicionar mais templates, basta empurrar objetos no array
// CARDAPIO_TEMPLATES seguindo o formato abaixo.
// ============================================================

export const CARDAPIO_TEMPLATES = [

  // ── 1. Saudável padrão ─────────────────────────────────────
  {
    id:        'saudavel_manutencao',
    nome:      'Saudável · Manutenção',
    descricao: 'Plano equilibrado para manutenção de peso e saúde geral.',
    perfil_alvo: {
      estilos:                ['onivoro','flexitariano','pescetariano'],
      condicoes_obrigatorias: [],
      condicoes_bonus:        [],
      objetivos:              ['manutencao','reeducacao'],
      estrategias:            ['moderada',null],
    },
    plano: {
      kcal:           1800,
      cho_pct:        50, ptn_pct: 20, lip_pct: 30,
      ptn_g_por_kg:   1.2,
      fibras_g:       30,
      num_refeicoes:  5,
      criterio_central:
        'Manutenção de peso com alimentação equilibrada e variada. Priorizar alimentos in natura, reduzir ultraprocessados. Refeições fracionadas a cada 3–4 h.',
      calculo_vet:
        'VET ~1800 kcal para mulher adulta com atividade moderada. Ajustar conforme GET individual (TMB × AF).',
      orientacoes:
        'Hidratação 35 mL/kg/dia. Incluir 2 porções de frutas + 3 de vegetais. Reduzir adição de açúcar.',
    }
  },

  // ── 2. Diabetes + Emagrecimento (onívora) ──────────────────
  {
    id:        'diabetes_emagrecimento_onivora',
    nome:      'Diabetes · Emagrecimento',
    descricao: 'Controle glicêmico com déficit calórico. Baixo índice glicêmico, priorização de fibras e proteína.',
    perfil_alvo: {
      estilos:                ['onivoro','flexitariano','pescetariano'],
      condicoes_obrigatorias: ['diabetes'],
      condicoes_bonus:        ['obesidade','dislipidemia','sindrome_metabolica'],
      objetivos:              ['emagrecimento'],
      estrategias:            ['low_carb','moderada'],
    },
    plano: {
      kcal:           1500,
      cho_pct:        40, ptn_pct: 30, lip_pct: 30,
      ptn_g_por_kg:   1.6,
      fibras_g:       30,
      num_refeicoes:  5,
      criterio_central:
        'Plano hipocalórico com controle glicêmico. Priorizar alimentos de baixo IG/CG (< 55). Distribuir CHO em 5 refeições. Proteína em todas as refeições para saciedade. Evitar açúcares simples e farinhas refinadas.',
      calculo_vet:
        'Déficit de 300–500 kcal/dia sobre GET. Manutenção estimada em 1800–2000 kcal. Meta: perda de 0,5–0,75 kg/semana.',
      orientacoes:
        'Monitorar glicemia 2–4 vezes/semana. Preferir grãos integrais, leguminosas, proteínas magras, gorduras boas (azeite, abacate, oleaginosas). Evitar sucos, priorizar a fruta inteira.',
    }
  },

  // ── 3. Diabetes + Emagrecimento (vegetariana) ──────────────
  {
    id:        'diabetes_emagrecimento_vegetariana',
    nome:      'Vegetariana · Diabetes · Emagrecimento',
    descricao: 'Controle glicêmico e déficit calórico para paciente ovolactovegetariana. Fontes proteicas vegetais + ovos/laticínios.',
    perfil_alvo: {
      estilos:                ['vegetariano_ovolacto','vegetariano_lacto','flexitariano'],
      condicoes_obrigatorias: ['diabetes'],
      condicoes_bonus:        ['obesidade','sindrome_metabolica'],
      objetivos:              ['emagrecimento'],
      estrategias:            ['low_carb','moderada'],
    },
    plano: {
      kcal:           1500,
      cho_pct:        40, ptn_pct: 25, lip_pct: 35,
      ptn_g_por_kg:   1.4,
      fibras_g:       35,
      num_refeicoes:  5,
      criterio_central:
        'Plano vegetariano hipocalórico com controle glicêmico. Proteínas: leguminosas (feijão, lentilha, grão-de-bico), ovos, laticínios magros, tofu, iogurte natural. Priorizar baixo IG e fibras solúveis.',
      calculo_vet:
        'Déficit de 300–500 kcal/dia sobre GET. Atenção a ingestão proteica mínima (1,2–1,6 g/kg) com combinação de fontes vegetais.',
      orientacoes:
        'Combinar cereais + leguminosas nas refeições principais (perfil de aminoácidos completo). Vitamina B12: monitorar e suplementar se necessário. Ferro não-heme com vitamina C para absorção.',
    }
  },

  // ── 4. Vegana + Reeducação ─────────────────────────────────
  {
    id:        'vegana_reeducacao',
    nome:      'Vegana · Reeducação alimentar',
    descricao: 'Plano equilibrado 100% vegetal com atenção a proteína, B12, Fe, Zn, ômega-3.',
    perfil_alvo: {
      estilos:                ['vegano'],
      condicoes_obrigatorias: [],
      condicoes_bonus:        [],
      objetivos:              ['reeducacao','manutencao'],
      estrategias:            ['moderada',null],
    },
    plano: {
      kcal:           1800,
      cho_pct:        50, ptn_pct: 20, lip_pct: 30,
      ptn_g_por_kg:   1.2,
      fibras_g:       40,
      num_refeicoes:  5,
      criterio_central:
        'Plano vegano equilibrado. Proteínas: leguminosas, tofu, tempeh, seitan, quinoa. Combinar cereal + leguminosa para perfil de aminoácidos completo. Enriquecer com sementes (linhaça, chia, gergelim) e oleaginosas.',
      calculo_vet:
        'VET alinhado ao GET. Sem déficit — foco em qualidade e variedade.',
      orientacoes:
        'Suplementar B12 (obrigatório). Avaliar ingestão de Fe, Zn, Ca, D e ômega-3. Incluir linhaça ou chia diariamente. Hidratação reforçada pela alta ingestão de fibras.',
    }
  },

  // ── 5. Hipertensão (DASH) ──────────────────────────────────
  {
    id:        'hipertensao_dash',
    nome:      'Hipertensão · DASH',
    descricao: 'Dieta DASH: rica em frutas, vegetais, grãos integrais e laticínios magros. Hipossódica.',
    perfil_alvo: {
      estilos:                ['onivoro','flexitariano','pescetariano','vegetariano_ovolacto','vegetariano_lacto'],
      condicoes_obrigatorias: ['hipertensao'],
      condicoes_bonus:        ['dieta_dash','dislipidemia','obesidade'],
      objetivos:              ['manutencao','emagrecimento','reeducacao'],
      estrategias:            ['moderada','low_fat'],
    },
    plano: {
      kcal:           1800,
      cho_pct:        55, ptn_pct: 18, lip_pct: 27,
      ptn_g_por_kg:   1.0,
      fibras_g:       30,
      num_refeicoes:  5,
      criterio_central:
        'Dieta DASH adaptada: 4–5 porções de frutas, 4–5 de vegetais, 6–8 de grãos integrais, 2–3 de laticínios magros, 6 ou menos de carnes magras/peixes/aves. Sódio < 2 g/dia.',
      calculo_vet:
        'VET ajustado ao GET e objetivo. Foco maior em distribuição que em calorias.',
      orientacoes:
        'Retirar sal de mesa. Evitar embutidos, enlatados, caldos industrializados, molhos prontos. Temperar com ervas, alho, limão. Priorizar potássio: banana, feijão, batata-doce, espinafre, abacate.',
    }
  },

  // ── 6. Dislipidemia + Emagrecimento ────────────────────────
  {
    id:        'dislipidemia_emagrecimento',
    nome:      'Dislipidemia · Emagrecimento',
    descricao: 'Redução de LDL e triglicerídeos. Rica em ômega-3, fibras solúveis e gorduras boas.',
    perfil_alvo: {
      estilos:                ['onivoro','flexitariano','pescetariano','vegetariano_ovolacto','vegetariano_lacto'],
      condicoes_obrigatorias: ['dislipidemia'],
      condicoes_bonus:        ['obesidade','sindrome_metabolica','esteatose'],
      objetivos:              ['emagrecimento','manutencao'],
      estrategias:            ['moderada','low_fat'],
    },
    plano: {
      kcal:           1500,
      cho_pct:        45, ptn_pct: 25, lip_pct: 30,
      ptn_g_por_kg:   1.4,
      fibras_g:       30,
      num_refeicoes:  5,
      criterio_central:
        'Redução de ácidos graxos saturados (< 7 % VET) e trans (< 1 %). Aumentar MUFA (azeite, abacate) e PUFA ômega-3. Fibras solúveis (aveia, maçã, linhaça, psyllium): 10–25 g/dia.',
      calculo_vet:
        'Déficit de 300–500 kcal/dia. Distribuição: 45 CHO · 25 PTN · 30 LIP (sendo < 7 % saturada).',
      orientacoes:
        'Peixes gordurosos (salmão, sardinha, atum) 2–3 x/semana. Oleaginosas 30 g/dia. Evitar fritura, embutidos, carnes gordas, bacon, creme de leite.',
    }
  },

  // ── 7. Gastrite / Refluxo · Brando ─────────────────────────
  {
    id:        'gastrite_brando',
    nome:      'Gastrite / Refluxo · Brando',
    descricao: 'Consistência branda, sem irritantes. Refeições pequenas e frequentes.',
    perfil_alvo: {
      estilos:                ['onivoro','flexitariano','pescetariano','vegetariano_ovolacto','vegetariano_lacto','vegano'],
      condicoes_obrigatorias: [],
      condicoes_bonus:        ['gastrite','refluxo'],
      objetivos:              ['manutencao','reeducacao','emagrecimento'],
      estrategias:            ['moderada'],
    },
    plano: {
      kcal:           1600,
      cho_pct:        50, ptn_pct: 25, lip_pct: 25,
      ptn_g_por_kg:   1.1,
      fibras_g:       25,
      num_refeicoes:  6,
      criterio_central:
        'Consistência branda. Evitar: café, chá preto, álcool, pimenta, frituras, chocolate, frutas cítricas, tomate cru, menta, refrigerantes. Refeições pequenas a cada 2–3 h.',
      calculo_vet:
        'VET ajustado ao objetivo. Foco em fracionamento e textura.',
      orientacoes:
        'Não deitar por 2 h após refeições. Mastigar devagar. Elevar cabeceira 15 cm. Evitar líquidos durante as refeições. Temperatura morna.',
    }
  },

  // ── 8. Esteatose hepática + Emagrecimento ──────────────────
  {
    id:        'esteatose_emagrecimento',
    nome:      'Esteatose hepática · Emagrecimento',
    descricao: 'Redução de frutose livre, álcool e saturada. Ômega-3 e déficit calórico.',
    perfil_alvo: {
      estilos:                ['onivoro','flexitariano','pescetariano','vegetariano_ovolacto','vegetariano_lacto'],
      condicoes_obrigatorias: ['esteatose'],
      condicoes_bonus:        ['obesidade','dislipidemia','sindrome_metabolica','diabetes'],
      objetivos:              ['emagrecimento'],
      estrategias:            ['low_carb','moderada'],
    },
    plano: {
      kcal:           1500,
      cho_pct:        40, ptn_pct: 30, lip_pct: 30,
      ptn_g_por_kg:   1.6,
      fibras_g:       30,
      num_refeicoes:  5,
      criterio_central:
        'Déficit calórico + redução de frutose livre (sucos, refrigerantes, xarope de milho) e álcool (zero). Priorizar proteína magra, ômega-3, fibras solúveis. Meta: perda de 7–10 % do peso em 6 meses reverte esteatose em maioria dos casos.',
      calculo_vet:
        'Déficit de 500 kcal/dia. Monitorar enzimas hepáticas a cada 3 meses.',
      orientacoes:
        'Zero álcool. Peixes gordurosos 2 x/semana. Evitar sucos mesmo naturais — preferir fruta inteira. Atividade física 150 min/semana (combina aeróbio + resistido).',
    }
  },

  // ── 9. Gestante + Manutenção ───────────────────────────────
  {
    id:        'gestante_manutencao',
    nome:      'Gestante · Manutenção',
    descricao: 'Aumento calórico por trimestre. Ácido fólico, ferro, cálcio, ômega-3.',
    perfil_alvo: {
      estilos:                ['onivoro','flexitariano','pescetariano','vegetariano_ovolacto','vegetariano_lacto'],
      condicoes_obrigatorias: [],
      condicoes_bonus:        [],
      objetivos:              ['manutencao'],
      estrategias:            ['moderada'],
      fases_vida:             ['gestante'],
    },
    plano: {
      kcal:           2200,
      cho_pct:        50, ptn_pct: 20, lip_pct: 30,
      ptn_g_por_kg:   1.3,
      fibras_g:       30,
      num_refeicoes:  6,
      criterio_central:
        'VET do pré-gravídico + 340 kcal (2º trimestre) ou + 450 kcal (3º trimestre). Fracionar em 6 refeições para controlar náuseas e refluxo.',
      calculo_vet:
        'Base 1800 + 340–450 kcal = 2140–2250 kcal. Proteína: 71 g/dia mínimo (1,1 g/kg atual).',
      orientacoes:
        'Suplementar ácido fólico (5 mg) e Fe conforme prescrição médica. Ingerir 1200 mg Ca/dia (3 porções de laticínios). Ômega-3 (DHA) 200 mg/dia. Evitar: álcool, peixes ricos em mercúrio, queijos crus, carnes malpassadas, chás medicinais sem liberação.',
    }
  },

  // ── 10. Performance + Ganho de massa ───────────────────────
  {
    id:        'performance_ganho',
    nome:      'Performance · Ganho de massa',
    descricao: 'Superávit calórico + alta proteína para hipertrofia e recuperação.',
    perfil_alvo: {
      estilos:                ['onivoro','flexitariano','pescetariano','vegetariano_ovolacto','vegetariano_lacto'],
      condicoes_obrigatorias: [],
      condicoes_bonus:        [],
      objetivos:              ['ganho_massa','performance','estetica_bulking'],
      estrategias:            ['high_protein','high_carb','moderada'],
    },
    plano: {
      kcal:           2800,
      cho_pct:        55, ptn_pct: 25, lip_pct: 20,
      ptn_g_por_kg:   2.0,
      fibras_g:       35,
      num_refeicoes:  6,
      criterio_central:
        'Superávit de 300–500 kcal/dia sobre GET. Proteína 1,8–2,2 g/kg distribuída em 5–6 refeições. CHO pré e pós-treino. Lipídio moderado, preferência a gorduras boas.',
      calculo_vet:
        'GET × 1,1–1,2 (superávit conservador). Meta: ganho de 0,25–0,5 kg/semana.',
      orientacoes:
        'Pré-treino: CHO + PTN 1–2 h antes. Pós-treino: PTN + CHO até 1 h. Creatina 3–5 g/dia (após avaliação). Hidratação: 40 mL/kg + 500 mL por hora de treino.',
    }
  },

  // ── 11. Idoso + Sarcopenia (alta proteína) ─────────────────
  {
    id:        'idoso_sarcopenia',
    nome:      'Idoso · Preservação de massa magra',
    descricao: 'Proteína elevada para prevenir sarcopenia. Cálcio, vitamina D, B12.',
    perfil_alvo: {
      estilos:                ['onivoro','flexitariano','pescetariano','vegetariano_ovolacto','vegetariano_lacto'],
      condicoes_obrigatorias: [],
      condicoes_bonus:        [],
      objetivos:              ['manutencao','ganho_massa'],
      estrategias:            ['high_protein','moderada'],
      fases_vida:             ['idoso'],
    },
    plano: {
      kcal:           1800,
      cho_pct:        45, ptn_pct: 25, lip_pct: 30,
      ptn_g_por_kg:   1.3,
      fibras_g:       25,
      num_refeicoes:  5,
      criterio_central:
        'Proteína 1,2–1,5 g/kg distribuída em pelo menos 4 refeições (≥ 25 g/refeição ativa síntese muscular). Ca 1200 mg/dia, vitamina D 800–2000 UI/dia (com prescrição), B12 suplementada se deficiência.',
      calculo_vet:
        'VET conforme GET. Atenção: idosos tendem a subestimar ingestão — checar ingestão real.',
      orientacoes:
        'Texturas adequadas se houver dificuldade de mastigação. Hidratação 30–35 mL/kg mesmo sem sede. Exercício resistido 2 x/semana potencializa ganho de massa. Rastrear risco nutricional.',
    }
  },

  // ── 12. Low FODMAP (Intestino irritável) ───────────────────
  {
    id:        'low_fodmap_intestino',
    nome:      'Intestino irritável · Low FODMAP',
    descricao: 'Fase de eliminação de oligo/di/mono-sacarídeos e polióis fermentáveis. Temporária (4–6 semanas).',
    perfil_alvo: {
      estilos:                ['onivoro','flexitariano','pescetariano','vegetariano_ovolacto','vegetariano_lacto'],
      condicoes_obrigatorias: ['intestino_irritavel'],
      condicoes_bonus:        ['low_fodmap','gastrite'],
      objetivos:              ['manutencao','reeducacao','emagrecimento'],
      estrategias:            ['moderada','low_carb'],
    },
    plano: {
      kcal:           1700,
      cho_pct:        45, ptn_pct: 25, lip_pct: 30,
      ptn_g_por_kg:   1.2,
      fibras_g:       22,
      num_refeicoes:  5,
      criterio_central:
        'Fase de eliminação por 4–6 semanas. Evitar: trigo (frutanos), cebola, alho, leite com lactose, maçã, pera, melancia, abacate, cogumelos, couve-flor, leguminosas em grande quantidade, adoçantes polióis.',
      calculo_vet:
        'VET ajustado ao objetivo. Foco em seleção, não em calorias.',
      orientacoes:
        'Após 4–6 semanas, reintroduzir grupos de FODMAPs um a um para identificar gatilhos. Acompanhar com nutricionista — plano de manutenção é personalizado conforme tolerância individual.',
    }
  },
];

// ══════════════════════════════════════════════════════════
// MATCHING
// ══════════════════════════════════════════════════════════

/**
 * Calcula score de aderência de um template ao perfil da paciente.
 * Template com condição obrigatória ausente → retorna null (descarta).
 *
 * @returns {Object|null} { score, motivos[] } ou null se incompatível
 */
export function scoreTemplate(template, perfil) {
  const motivos = [];
  let score = 0;

  const alvo = template.perfil_alvo || {};
  const estiloPaciente   = perfil?.estilo_alimentar || perfil?.preferencia_alimentar || 'onivoro';
  const condicoes        = Array.isArray(perfil?.condicoes_clinicas) ? perfil.condicoes_clinicas : [];
  const objetivo         = perfil?.objetivo || null;
  const estrategia       = perfil?.estrategia_nutricional || null;
  const fase             = perfil?.fase_da_vida || 'adulto';

  // ── 1. Estilo compatível? (obrigatório se template especifica)
  if (alvo.estilos?.length) {
    if (alvo.estilos.includes(estiloPaciente)) {
      score += 10;
      motivos.push(`Estilo compatível (${estiloPaciente})`);
    } else {
      // Estilo incompatível → inválido
      return null;
    }
  }

  // ── 2. Condições obrigatórias: todas devem estar presentes
  for (const c of alvo.condicoes_obrigatorias || []) {
    if (!condicoes.includes(c)) return null;
    score += 8;
    motivos.push(`Condição ${c}`);
  }

  // ── 3. Condições bônus: somam, mas não eliminam
  for (const c of alvo.condicoes_bonus || []) {
    if (condicoes.includes(c)) {
      score += 3;
      motivos.push(`Bônus ${c}`);
    }
  }

  // ── 4. Objetivo
  if (alvo.objetivos?.length) {
    if (objetivo && alvo.objetivos.includes(objetivo)) {
      score += 5;
      motivos.push(`Objetivo ${objetivo}`);
    } else if (objetivo && !alvo.objetivos.includes(objetivo)) {
      score -= 2; // desincentiva objetivos divergentes, mas não exclui
    }
  }

  // ── 5. Estratégia
  if (alvo.estrategias?.length) {
    if (estrategia && alvo.estrategias.includes(estrategia)) {
      score += 3;
      motivos.push(`Estratégia ${estrategia}`);
    }
  }

  // ── 6. Fase da vida (quando template especifica)
  if (alvo.fases_vida?.length) {
    if (alvo.fases_vida.includes(fase)) {
      score += 4;
      motivos.push(`Fase ${fase}`);
    } else {
      score -= 3;
    }
  }

  return { score, motivos };
}

/**
 * Lista todos os templates ordenados por aderência ao perfil.
 * Filtra os incompatíveis (score null).
 *
 * @param {Object} perfil — objeto paciente
 * @param {Object} opts   — { minScore=1 }
 * @returns {Array} [{ template, score, motivos }]
 */
export function matchTemplates(perfil, opts = {}) {
  const { minScore = 1 } = opts;
  const out = [];
  for (const t of CARDAPIO_TEMPLATES) {
    const r = scoreTemplate(t, perfil);
    if (r && r.score >= minScore) {
      out.push({ template: t, score: r.score, motivos: r.motivos });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/**
 * Retorna todos os templates (mesmo incompatíveis) para listagem livre.
 */
export function listarTemplates() {
  return CARDAPIO_TEMPLATES.map(t => ({ template: t }));
}

/**
 * Converte %macros em gramas usando kcal do template.
 * Útil para preencher os inputs g de PTN/CHO/LIP.
 */
export function gramasMacrosDoTemplate(template) {
  const { kcal=2000, cho_pct=50, ptn_pct=20, lip_pct=30 } = template.plano || {};
  return {
    ptn_g: Math.round((kcal * (ptn_pct / 100)) / 4),
    cho_g: Math.round((kcal * (cho_pct / 100)) / 4),
    lip_g: Math.round((kcal * (lip_pct / 100)) / 9),
  };
}
