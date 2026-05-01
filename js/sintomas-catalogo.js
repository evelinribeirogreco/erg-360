// ============================================================
// sintomas-catalogo.js — Catálogo clínico de sintomas
// ============================================================
// Cada sintoma mapeia para:
//   • areas_teia: áreas da teia de inter-relações afetadas (IFM)
//   • deficiencias: nutrientes potencialmente em deficit (peso 1-3)
//   • excessos:     nutrientes potencialmente em excesso (peso 1-3)
// Funções para calcular probabilidades a partir dos sintomas marcados.
// ============================================================

// ── Áreas da Teia (IFM Functional Medicine) ─────────────────
export const AREAS_TEIA = {
  assimilacao:      { nome: 'Assimilação',         desc: 'Digestão, absorção, microbioma' },
  defesa_reparo:    { nome: 'Defesa e Reparo',     desc: 'Imunidade, inflamação, cicatrização' },
  energia:          { nome: 'Energia',             desc: 'Mitocôndria, estresse oxidativo' },
  biotransformacao: { nome: 'Biotransformação',    desc: 'Detoxificação hepática, eliminação' },
  transporte:       { nome: 'Transporte',          desc: 'Cardiovascular, linfático' },
  comunicacao:      { nome: 'Hormônios e Neurotransmissores', desc: 'Sinalização endócrina e neural' },
  estrutura:        { nome: 'Estrutura',           desc: 'Membrana celular, integridade tissular' },
  mente:            { nome: 'Mente',               desc: 'Cognição, processamento' },
  emocao:           { nome: 'Emoção',              desc: 'Sentimentos, regulação afetiva' },
  espirito:         { nome: 'Espírito',            desc: 'Significado, propósito' },
};

// ── Nutrientes (com nome formal) ────────────────────────────
export const NUTRIENTES = {
  calcio:        'Cálcio',
  cromo:         'Cromo',
  ferro:         'Ferro',
  fosforo:       'Fósforo',
  iodo:          'Iodo',
  magnesio:      'Magnésio',
  manganes:      'Manganês',
  potassio:      'Potássio',
  selenio:       'Selênio',
  sodio:         'Sódio',
  zinco:         'Zinco',
  cobre:         'Cobre',
  vitamina_a:    'Vitamina A (Retinol)',
  vitamina_b1:   'Vitamina B1 (Tiamina)',
  vitamina_b2:   'Vitamina B2 (Riboflavina)',
  vitamina_b3:   'Vitamina B3 (Niacina)',
  vitamina_b5:   'Vitamina B5 (Ác. Pantotênico)',
  vitamina_b6:   'Vitamina B6 (Piridoxina)',
  vitamina_b7:   'Vitamina B7 (Biotina)',
  vitamina_b9:   'Vitamina B9 (Ác. Fólico)',
  vitamina_b12:  'Vitamina B12 (Cobalamina)',
  vitamina_c:    'Vitamina C (Ác. Ascórbico)',
  vitamina_d:    'Vitamina D',
  vitamina_e:    'Vitamina E (Tocoferol)',
  vitamina_k:    'Vitamina K (Naftoquinona)',
  omega3:        'Ômega 3',
  proteina:      'Proteína',
  fibra:         'Fibra',
  agua:          'Água',
  acucar:        'Açúcar refinado',
  gorduras_trans:'Gorduras trans',
  cafeina:       'Cafeína',
  glutamina:     'Glutamina',
  triptofano:    'Triptofano',
  taurina:       'Taurina',
};

// ── Catálogo de Sintomas ────────────────────────────────────
// (mapeamento clínico-funcional baseado em literatura IFM e nutrição funcional)
export const SINTOMAS = [
  // === PELE ===
  { slug:'acne', nome:'Acne', categoria:'pele',
    areas_teia:['estrutura','biotransformacao','defesa_reparo'],
    deficiencias:{ zinco:3, vitamina_a:2, omega3:2, vitamina_e:1, vitamina_b6:1 },
    excessos:{ acucar:2, gorduras_trans:2 } },
  { slug:'pele_seca', nome:'Pele seca / Erupções', categoria:'pele',
    areas_teia:['estrutura','assimilacao'],
    deficiencias:{ omega3:3, vitamina_a:2, vitamina_e:2, agua:2, vitamina_b3:1 },
    excessos:{} },
  { slug:'perda_cabelo', nome:'Perda de cabelo', categoria:'pele',
    areas_teia:['estrutura','comunicacao'],
    deficiencias:{ ferro:3, zinco:2, vitamina_b7:2, proteina:2, vitamina_d:1 },
    excessos:{} },
  { slug:'unhas_quebradicas', nome:'Unhas quebradiças', categoria:'pele',
    areas_teia:['estrutura'],
    deficiencias:{ ferro:2, zinco:2, vitamina_b7:3, proteina:2, calcio:1 },
    excessos:{} },

  // === CABEÇA / NEURO ===
  { slug:'dor_cabeca', nome:'Dor de cabeça', categoria:'cabeca',
    areas_teia:['biotransformacao','energia','transporte'],
    deficiencias:{ magnesio:3, vitamina_b2:2, vitamina_d:1, agua:2 },
    excessos:{ cafeina:1, acucar:1 } },
  { slug:'tonturas', nome:'Tonturas', categoria:'cabeca',
    areas_teia:['transporte','comunicacao'],
    deficiencias:{ ferro:2, vitamina_b12:2, sodio:1, agua:2 },
    excessos:{} },
  { slug:'insonia', nome:'Insônia', categoria:'cabeca',
    areas_teia:['comunicacao','energia'],
    deficiencias:{ magnesio:3, triptofano:2, vitamina_b6:2, calcio:1 },
    excessos:{ cafeina:3, acucar:1 } },

  // === ENERGIA ===
  { slug:'fadiga', nome:'Fadiga', categoria:'energia',
    areas_teia:['energia','estrutura','comunicacao'],
    deficiencias:{ ferro:3, vitamina_b12:3, vitamina_b9:2, magnesio:2, vitamina_d:2, vitamina_b1:1 },
    excessos:{ acucar:1 } },
  { slug:'apatia', nome:'Apatia / letargia', categoria:'energia',
    areas_teia:['energia','emocao'],
    deficiencias:{ vitamina_b12:2, ferro:2, vitamina_d:2, omega3:1 },
    excessos:{} },
  { slug:'fraqueza_muscular', nome:'Fraqueza muscular', categoria:'energia',
    areas_teia:['estrutura','energia'],
    deficiencias:{ proteina:3, magnesio:2, vitamina_b1:2, vitamina_d:2, potassio:2, calcio:1 },
    excessos:{} },

  // === ARTICULAÇÕES / MÚSCULOS ===
  { slug:'caimbra', nome:'Câimbra', categoria:'articulacoes',
    areas_teia:['estrutura','energia'],
    deficiencias:{ magnesio:3, potassio:3, calcio:2, sodio:1, agua:2 },
    excessos:{} },
  { slug:'dores_musculares', nome:'Dores musculares', categoria:'articulacoes',
    areas_teia:['estrutura','defesa_reparo'],
    deficiencias:{ magnesio:2, vitamina_d:2, omega3:2, proteina:1 },
    excessos:{} },
  { slug:'dores_articulares', nome:'Dores articulares', categoria:'articulacoes',
    areas_teia:['estrutura','defesa_reparo'],
    deficiencias:{ omega3:3, vitamina_d:2, vitamina_c:2, magnesio:1 },
    excessos:{ acucar:2, gorduras_trans:2 } },

  // === MENTE ===
  { slug:'memoria_ruim', nome:'Memória ruim', categoria:'mente',
    areas_teia:['mente','energia','comunicacao'],
    deficiencias:{ omega3:3, vitamina_b12:3, vitamina_b6:2, vitamina_d:1, ferro:1 },
    excessos:{} },
  { slug:'concentracao_ruim', nome:'Concentração ruim', categoria:'mente',
    areas_teia:['mente','comunicacao'],
    deficiencias:{ ferro:2, omega3:2, vitamina_b6:2, magnesio:1 },
    excessos:{ acucar:2 } },
  { slug:'confusao_mental', nome:'Confusão mental', categoria:'mente',
    areas_teia:['mente','energia'],
    deficiencias:{ vitamina_b12:3, vitamina_b9:2, vitamina_b1:2 },
    excessos:{} },

  // === EMOÇÕES ===
  { slug:'ansiedade', nome:'Ansiedade / nervosismo', categoria:'emocoes',
    areas_teia:['comunicacao','emocao'],
    deficiencias:{ magnesio:3, vitamina_b6:2, triptofano:2, omega3:1, vitamina_d:1 },
    excessos:{ cafeina:3, acucar:2 } },
  { slug:'depressao', nome:'Depressão', categoria:'emocoes',
    areas_teia:['emocao','comunicacao'],
    deficiencias:{ omega3:3, vitamina_d:3, vitamina_b12:2, vitamina_b9:2, triptofano:2, magnesio:1 },
    excessos:{} },
  { slug:'irritabilidade', nome:'Irritabilidade', categoria:'emocoes',
    areas_teia:['emocao','comunicacao'],
    deficiencias:{ magnesio:2, vitamina_b6:2, omega3:1 },
    excessos:{ cafeina:2, acucar:2 } },
  { slug:'mudancas_humor', nome:'Mudanças de humor', categoria:'emocoes',
    areas_teia:['emocao','comunicacao'],
    deficiencias:{ omega3:2, vitamina_d:2, vitamina_b6:2, magnesio:1 },
    excessos:{ acucar:2 } },

  // === TRATO DIGESTIVO ===
  { slug:'azia', nome:'Azia / refluxo', categoria:'digestivo',
    areas_teia:['assimilacao','biotransformacao'],
    deficiencias:{ vitamina_b12:1, zinco:1 },
    excessos:{ cafeina:2, acucar:1, gorduras_trans:1 } },
  { slug:'gases', nome:'Arrotos / gases intestinais', categoria:'digestivo',
    areas_teia:['assimilacao'],
    deficiencias:{ fibra:2 },
    excessos:{ acucar:2 } },
  { slug:'inchaco_abdominal', nome:'Sente-se inchado, abdômen distendido', categoria:'digestivo',
    areas_teia:['assimilacao','defesa_reparo'],
    deficiencias:{ fibra:2 },
    excessos:{ acucar:2 } },
  { slug:'constipacao', nome:'Constipação / prisão de ventre', categoria:'digestivo',
    areas_teia:['assimilacao','biotransformacao'],
    deficiencias:{ fibra:3, magnesio:3, agua:3, omega3:1 },
    excessos:{} },
  { slug:'diarreia', nome:'Diarréia', categoria:'digestivo',
    areas_teia:['assimilacao','defesa_reparo'],
    deficiencias:{ glutamina:2, zinco:2 },
    excessos:{ cafeina:1, acucar:1 } },
  { slug:'nauseas', nome:'Náuseas / vômito', categoria:'digestivo',
    areas_teia:['assimilacao'],
    deficiencias:{ vitamina_b6:2, magnesio:1 },
    excessos:{} },

  // === NARIZ / RESPIRATÓRIO ===
  { slug:'sinusite', nome:'Sinusite / problemas de seios nasais', categoria:'nariz',
    areas_teia:['defesa_reparo','assimilacao'],
    deficiencias:{ vitamina_c:2, vitamina_d:2, zinco:1, omega3:1 },
    excessos:{} },
  { slug:'corrimento_nasal', nome:'Corrimento nasal / espirros', categoria:'nariz',
    areas_teia:['defesa_reparo'],
    deficiencias:{ vitamina_c:2, vitamina_d:1, omega3:1 },
    excessos:{} },
  { slug:'muco_excessivo', nome:'Excessiva formação de muco', categoria:'nariz',
    areas_teia:['defesa_reparo','assimilacao'],
    deficiencias:{ vitamina_a:1, vitamina_c:1 },
    excessos:{ acucar:2 } },

  // === CORAÇÃO / CIRCULAÇÃO ===
  { slug:'palpitacoes', nome:'Batidas irregulares ou rápidas', categoria:'coracao',
    areas_teia:['transporte','comunicacao'],
    deficiencias:{ magnesio:3, potassio:2, taurina:1, vitamina_b1:1 },
    excessos:{ cafeina:3 } },

  // === IMUNE / OUTROS ===
  { slug:'frequentemente_doente', nome:'Frequentemente doente / infecções', categoria:'outros',
    areas_teia:['defesa_reparo'],
    deficiencias:{ vitamina_c:3, vitamina_d:3, zinco:2, vitamina_a:1, selenio:1 },
    excessos:{ acucar:2 } },
  { slug:'aftas', nome:'Aftas', categoria:'boca',
    areas_teia:['defesa_reparo','assimilacao'],
    deficiencias:{ ferro:2, vitamina_b9:2, vitamina_b12:2, zinco:1 },
    excessos:{} },
  { slug:'lingua_inchada', nome:'Língua / lábios inchados ou descoloridos', categoria:'boca',
    areas_teia:['defesa_reparo'],
    deficiencias:{ vitamina_b2:2, vitamina_b3:2, ferro:1 },
    excessos:{} },
  { slug:'olheiras', nome:'Bolsas / olheiras', categoria:'olhos',
    areas_teia:['biotransformacao','transporte'],
    deficiencias:{ ferro:2, agua:2, vitamina_k:1 },
    excessos:{} },
  { slug:'suor_excessivo', nome:'Suor excessivo', categoria:'pele',
    areas_teia:['biotransformacao','comunicacao'],
    deficiencias:{ magnesio:2, sodio:1, vitamina_d:1 },
    excessos:{} },
  { slug:'visao_borrada', nome:'Visão borrada', categoria:'olhos',
    areas_teia:['estrutura','energia'],
    deficiencias:{ vitamina_a:3, omega3:2, vitamina_b2:1 },
    excessos:{} },
  { slug:'tosse_cronica', nome:'Tosse crônica', categoria:'boca',
    areas_teia:['defesa_reparo','assimilacao'],
    deficiencias:{ vitamina_c:1, vitamina_d:1 },
    excessos:{} },
  { slug:'feridas_pele', nome:'Feridas que coçam, erupções', categoria:'pele',
    areas_teia:['estrutura','defesa_reparo'],
    deficiencias:{ omega3:2, zinco:2, vitamina_e:1 },
    excessos:{ acucar:2 } },
  { slug:'urinar_frequente', nome:'Frequente / urgente vontade de urinar', categoria:'outros',
    areas_teia:['biotransformacao','comunicacao'],
    deficiencias:{ magnesio:1 },
    excessos:{ cafeina:2 } },
  { slug:'rigidez_movimentos', nome:'Rigidez ou limitação dos movimentos', categoria:'articulacoes',
    areas_teia:['estrutura'],
    deficiencias:{ omega3:2, vitamina_d:2, magnesio:1 },
    excessos:{} },
  { slug:'sensacao_fraqueza', nome:'Sensação de fraqueza ou cansaço', categoria:'energia',
    areas_teia:['energia','estrutura'],
    deficiencias:{ ferro:2, vitamina_b12:2, vitamina_d:1, proteina:2 },
    excessos:{} },
  { slug:'hiperatividade', nome:'Agitação / Hiperatividade', categoria:'energia',
    areas_teia:['comunicacao','emocao'],
    deficiencias:{ omega3:2, magnesio:2 },
    excessos:{ acucar:3, cafeina:2 } },
  { slug:'olhos_lacrimejantes', nome:'Olhos lacrimejantes ou coçando', categoria:'olhos',
    areas_teia:['defesa_reparo'],
    deficiencias:{ vitamina_c:1, vitamina_a:1 },
    excessos:{} },
  { slug:'olhos_inchados', nome:'Olhos inchados / vermelhos', categoria:'olhos',
    areas_teia:['defesa_reparo','biotransformacao'],
    deficiencias:{ vitamina_c:1, vitamina_a:1 },
    excessos:{} },
];

// ── Estrutura do Rastreamento Metabólico (questionário 0-4) ──
export const RASTREAMENTO_SISTEMAS = [
  { slug:'cabeca', nome:'Cabeça', perguntas:[
    { id:'dor_cabeca',  texto:'Dor de cabeça' },
    { id:'desmaio',     texto:'Sensação de desmaio' },
    { id:'tonturas',    texto:'Tonturas' },
    { id:'insonia',     texto:'Insônia' },
  ]},
  { slug:'olhos', nome:'Olhos', perguntas:[
    { id:'lacrimejantes', texto:'Lacrimejantes ou coçando' },
    { id:'inchados',      texto:'Inchados, vermelhos ou com cílios colando' },
    { id:'olheiras',      texto:'Bolsas ou olheiras abaixo dos olhos' },
    { id:'visao_borrada', texto:'Visão borrada ou em túnel (sem miopia/astigmatismo)' },
  ]},
  { slug:'ouvidos', nome:'Ouvidos', perguntas:[
    { id:'coceira',         texto:'Coceira' },
    { id:'dor_ouvido',      texto:'Dores de ouvido, infecções auditivas' },
    { id:'fluido_purulento',texto:'Retirada de fluido purulento do ouvido' },
    { id:'zunido',          texto:'Zunido, perda da audição' },
  ]},
  { slug:'nariz', nome:'Nariz', perguntas:[
    { id:'entupido',        texto:'Entupido' },
    { id:'sinusite',        texto:'Problemas de seios nasais (sinusite)' },
    { id:'corrimento_nasal',texto:'Corrimento nasal, espirros e coceira dos olhos' },
    { id:'ataques_espirros',texto:'Ataques de espirros' },
    { id:'muco_excessivo',  texto:'Excessiva formação de muco' },
  ]},
  { slug:'boca_garganta', nome:'Boca / Garganta', perguntas:[
    { id:'tosse_cronica',     texto:'Tosse crônica' },
    { id:'limpar_garganta',   texto:'Frequente necessidade de limpar a garganta' },
    { id:'dor_garganta',      texto:'Dor de garganta, rouquidão ou perda da voz' },
    { id:'lingua_inchada',    texto:'Língua, gengivas ou lábios inchados / descoloridos' },
    { id:'aftas',             texto:'Aftas' },
  ]},
  { slug:'pele', nome:'Pele', perguntas:[
    { id:'acne',         texto:'Acne' },
    { id:'feridas',      texto:'Feridas que coçam, erupções ou pele seca' },
    { id:'perda_cabelo', texto:'Perda de cabelo' },
    { id:'vermelhidao',  texto:'Vermelhidão, calorões' },
    { id:'suor',         texto:'Suor excessivo' },
  ]},
  { slug:'coracao', nome:'Coração', perguntas:[
    { id:'irregular',  texto:'Batidas irregulares ou falhando' },
    { id:'rapidas',    texto:'Batidas rápidas demais' },
    { id:'dor_peito',  texto:'Dor no peito' },
  ]},
  { slug:'pulmoes', nome:'Pulmões', perguntas:[
    { id:'congestao',   texto:'Congestão no peito' },
    { id:'asma',        texto:'Asma, bronquite' },
    { id:'pouco_folego',texto:'Pouco fôlego' },
    { id:'dif_respirar',texto:'Dificuldade para respirar' },
  ]},
  { slug:'trato_digestivo', nome:'Trato digestivo', perguntas:[
    { id:'nauseas',      texto:'Náuseas, vômito' },
    { id:'diarreia',     texto:'Diarréia' },
    { id:'constipacao',  texto:'Constipação, prisão de ventre' },
    { id:'inchado',      texto:'Sente-se inchado, abdômen distendido' },
    { id:'gases',        texto:'Arrotos e/ou gases intestinais' },
    { id:'azia',         texto:'Azia' },
    { id:'dor_estomacal',texto:'Dor estomacal / intestinal' },
  ]},
  { slug:'articulacoes', nome:'Articulações / Músculos', perguntas:[
    { id:'dores_articulares',texto:'Dores articulares' },
    { id:'artrite',          texto:'Artrite / artrose' },
    { id:'rigidez',          texto:'Rigidez ou limitação dos movimentos' },
    { id:'dores_musculares', texto:'Dores musculares' },
    { id:'fraqueza_cansaco', texto:'Sensação de fraqueza ou cansaço' },
  ]},
  { slug:'energia', nome:'Energia / Atividade', perguntas:[
    { id:'fadiga',          texto:'Fadiga, moleza' },
    { id:'apatia',          texto:'Apatia, letargia' },
    { id:'hiperatividade',  texto:'Hiperatividade' },
    { id:'dificuldade_relaxar',texto:'Dificuldade em descansar, relaxar' },
  ]},
  { slug:'mente', nome:'Mente', perguntas:[
    { id:'memoria_ruim',    texto:'Memória ruim' },
    { id:'confusao_mental', texto:'Confusão mental, compreensão ruim' },
    { id:'concentracao_ruim',texto:'Concentração ruim' },
    { id:'coordenacao',     texto:'Fraca coordenação motora' },
    { id:'tomar_decisoes',  texto:'Dificuldade em tomar decisões' },
    { id:'repeticao_palavras',texto:'Repetições de palavras, com pausas involuntárias' },
    { id:'pronuncia',       texto:'Pronuncia palavras de forma indistinta, confusa' },
    { id:'aprendizagem',    texto:'Problemas de aprendizagem' },
  ]},
  { slug:'emocoes', nome:'Emoções', perguntas:[
    { id:'mudancas_humor',  texto:'Mudanças de humor' },
    { id:'ansiedade',       texto:'Ansiedade, medo, nervosismo' },
    { id:'irritabilidade',  texto:'Raiva, irritabilidade, agressividade' },
    { id:'depressao',       texto:'Depressão' },
  ]},
  { slug:'outros', nome:'Outros', perguntas:[
    { id:'doente_freq',     texto:'Frequentemente doente' },
    { id:'urinar_freq',     texto:'Frequente ou urgente vontade de urinar' },
    { id:'coceira_genital', texto:'Coceira genital ou corrimento' },
  ]},
];

// ── Cálculos ─────────────────────────────────────────────────

// Soma os pontos de um sistema
export function pontosSistema(sistemaSlug, respostas) {
  const sistema = RASTREAMENTO_SISTEMAS.find(s => s.slug === sistemaSlug);
  if (!sistema || !respostas?.[sistemaSlug]) return 0;
  return sistema.perguntas.reduce((sum, p) => sum + (parseInt(respostas[sistemaSlug][p.id]) || 0), 0);
}

// Soma total
export function pontosTotal(respostas) {
  if (!respostas) return 0;
  return RASTREAMENTO_SISTEMAS.reduce((sum, s) => sum + pontosSistema(s.slug, respostas), 0);
}

// Interpretação clínica do score total
export function interpretarScore(total) {
  if (total <= 15)  return { texto:'Baixa probabilidade de hipersensibilidade', cor:'#3D6B4F', faixa:'baixa' };
  if (total <= 30)  return { texto:'Possível hipersensibilidade leve',           cor:'#7A9B5E', faixa:'leve' };
  if (total <= 45)  return { texto:'Hipersensibilidade moderada',                cor:'#B8860B', faixa:'moderada' };
  if (total <= 75)  return { texto:'Absoluta certeza da existência de hipersensibilidades', cor:'#C26B3F', faixa:'alta' };
  return              { texto:'Hipersensibilidade severa — investigação aprofundada recomendada', cor:'#A04030', faixa:'severa' };
}

// Áreas da teia afetadas (a partir dos sintomas selecionados)
export function calcularAreasTeia(sintomasSlugs) {
  const total = {};
  for (const slug of (sintomasSlugs || [])) {
    const s = SINTOMAS.find(x => x.slug === slug);
    if (!s) continue;
    for (const area of s.areas_teia || []) {
      total[area] = (total[area] || 0) + 1;
    }
  }
  return total; // { estrutura: 3, energia: 2, ... }
}

// Calcula deficiências de nutrientes a partir dos sintomas
// Retorna { nutriente: { peso, probabilidade (0-1) } }
export function calcularDeficiencias(sintomasSlugs) {
  const acumulado = {};
  for (const slug of (sintomasSlugs || [])) {
    const s = SINTOMAS.find(x => x.slug === slug);
    if (!s) continue;
    for (const [nutriente, peso] of Object.entries(s.deficiencias || {})) {
      acumulado[nutriente] = (acumulado[nutriente] || 0) + peso;
    }
  }
  const maxPeso = Math.max(0, ...Object.values(acumulado));
  const result = {};
  for (const [n, p] of Object.entries(acumulado)) {
    result[n] = { peso: p, probabilidade: maxPeso > 0 ? p / maxPeso : 0 };
  }
  return result;
}

export function calcularExcessos(sintomasSlugs) {
  const acumulado = {};
  for (const slug of (sintomasSlugs || [])) {
    const s = SINTOMAS.find(x => x.slug === slug);
    if (!s) continue;
    for (const [nutriente, peso] of Object.entries(s.excessos || {})) {
      acumulado[nutriente] = (acumulado[nutriente] || 0) + peso;
    }
  }
  const maxPeso = Math.max(0, ...Object.values(acumulado));
  const result = {};
  for (const [n, p] of Object.entries(acumulado)) {
    result[n] = { peso: p, probabilidade: maxPeso > 0 ? p / maxPeso : 0 };
  }
  return result;
}
