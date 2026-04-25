/**
 * ERG 360 — Base de Dados Nutricional Clínica
 * ============================================================
 * Fonte: Tabela TACO (UNICAMP, 4ª ed.) + IBGE POF 2017-2018
 * Valores por 100g no estado de preparo indicado (preparo_padrao)
 * ============================================================
 */

// ── BANCO DE ALIMENTOS ─────────────────────────────────────────
// Estrutura: slug → { nome, categoria, preparo_padrao, n: {kcal,cho,ptn,lip,fib,na,k,ca,fe,mg,vit_c,omega3,g_sat,col}, ig, tags }
export const FOODS = {

  // ── CEREAIS & TUBÉRCULOS ────────────────────────────────────

  aveia_flocos: {
    nome: 'Aveia em flocos',
    categoria: 'cereais', preparo_padrao: 'cru',
    n: { kcal:394, cho:66.6, ptn:13.9, lip:7.0, fib:9.7, na:3,   k:293, ca:54,  fe:4.7, mg:129, vit_c:0,  omega3:0.11, g_sat:1.2,  col:0 },
    ig: 55, tags: ['baixo-ig','fibra-soluvel','beta-glucana','saciante','anti-inflamatorio']
  },
  arroz_integral_cozido: {
    nome: 'Arroz integral cozido',
    categoria: 'cereais', preparo_padrao: 'cozido',
    n: { kcal:124, cho:25.8, ptn:2.6,  lip:1.0, fib:1.7, na:0,   k:95,  ca:5,   fe:0.2, mg:44,  vit_c:0,  omega3:0.02, g_sat:0.2,  col:0 },
    ig: 50, tags: ['moderado-ig','integral','fibra']
  },
  arroz_branco_cozido: {
    nome: 'Arroz branco cozido',
    categoria: 'cereais', preparo_padrao: 'cozido',
    n: { kcal:128, cho:28.1, ptn:2.5,  lip:0.2, fib:1.2, na:1,   k:38,  ca:4,   fe:0.1, mg:9,   vit_c:0,  omega3:0,    g_sat:0.05, col:0 },
    ig: 72, tags: ['alto-ig']
  },
  quinoa_cozida: {
    nome: 'Quinoa cozida',
    categoria: 'cereais', preparo_padrao: 'cozida',
    n: { kcal:120, cho:21.3, ptn:4.4,  lip:1.9, fib:2.8, na:5,   k:172, ca:17,  fe:1.5, mg:64,  vit_c:0,  omega3:0.09, g_sat:0.2,  col:0 },
    ig: 53, tags: ['baixo-ig','aminoacidos-completos','sem-gluten','proteico-vegetal']
  },
  pao_integral: {
    nome: 'Pão de forma integral',
    categoria: 'cereais', preparo_padrao: 'pronto',
    n: { kcal:253, cho:50.4, ptn:9.6,  lip:3.0, fib:7.2, na:434, k:211, ca:34,  fe:2.7, mg:42,  vit_c:0,  omega3:0.05, g_sat:0.7,  col:0 },
    ig: 51, tags: ['moderado-ig','fibra','integral']
  },
  batata_doce_cozida: {
    nome: 'Batata-doce cozida',
    categoria: 'tuberculos', preparo_padrao: 'cozida',
    n: { kcal:77,  cho:18.4, ptn:1.2,  lip:0.1, fib:2.3, na:32,  k:337, ca:26,  fe:0.4, mg:17,  vit_c:13, omega3:0.01, g_sat:0.02, col:0 },
    ig: 54, tags: ['baixo-ig','potassio','beta-caroteno','anti-inflamatorio','energia']
  },
  tapioca_goma: {
    nome: 'Tapioca (goma hidratada)',
    categoria: 'cereais', preparo_padrao: 'pronto',
    n: { kcal:98,  cho:24.5, ptn:0.1,  lip:0.1, fib:0.0, na:10,  k:5,   ca:3,   fe:0.0, mg:1,   vit_c:0,  omega3:0,    g_sat:0.02, col:0 },
    ig: 85, tags: ['alto-ig','sem-gluten']
  },
  macarrao_integral_cozido: {
    nome: 'Macarrão integral cozido',
    categoria: 'cereais', preparo_padrao: 'cozido',
    n: { kcal:124, cho:26.0, ptn:4.5,  lip:0.5, fib:3.5, na:3,   k:95,  ca:15,  fe:1.3, mg:32,  vit_c:0,  omega3:0.03, g_sat:0.1,  col:0 },
    ig: 42, tags: ['baixo-ig','fibra','integral']
  },

  // ── PROTEÍNAS ANIMAIS ───────────────────────────────────────

  frango_peito_grelhado: {
    nome: 'Peito de frango grelhado',
    categoria: 'carnes', preparo_padrao: 'grelhado',
    n: { kcal:159, cho:0,    ptn:32.0, lip:3.2, fib:0,   na:68,  k:287, ca:8,   fe:0.6, mg:28,  vit_c:0,  omega3:0.06, g_sat:0.9,  col:85  },
    ig: 0, tags: ['proteico','magro','low-carb']
  },
  carne_patinho_grelhado: {
    nome: 'Patinho grelhado',
    categoria: 'carnes', preparo_padrao: 'grelhado',
    n: { kcal:192, cho:0,    ptn:28.0, lip:8.9, fib:0,   na:58,  k:298, ca:5,   fe:2.4, mg:21,  vit_c:0,  omega3:0.1,  g_sat:3.4,  col:75  },
    ig: 0, tags: ['proteico','ferro-hemico','low-carb']
  },
  salmon_grelhado: {
    nome: 'Salmão grelhado',
    categoria: 'peixes', preparo_padrao: 'grelhado',
    n: { kcal:208, cho:0,    ptn:20.1, lip:13.6,fib:0,   na:59,  k:363, ca:15,  fe:0.5, mg:27,  vit_c:0,  omega3:2.26, g_sat:2.1,  col:70  },
    ig: 0, tags: ['anti-inflamatorio','omega3','proteico','low-carb','cardio-protetor']
  },
  atum_agua: {
    nome: "Atum em conserva d'água",
    categoria: 'peixes', preparo_padrao: 'conserva',
    n: { kcal:111, cho:0,    ptn:25.5, lip:0.8, fib:0,   na:396, k:207, ca:8,   fe:1.3, mg:33,  vit_c:0,  omega3:0.26, g_sat:0.2,  col:48  },
    ig: 0, tags: ['proteico','magro','low-carb','pratico']
  },
  ovo_inteiro_cozido: {
    nome: 'Ovo inteiro cozido',
    categoria: 'ovos', preparo_padrao: 'cozido',
    n: { kcal:146, cho:1.0,  ptn:13.3, lip:9.5, fib:0,   na:137, k:138, ca:50,  fe:1.8, mg:11,  vit_c:0,  omega3:0.07, g_sat:2.8,  col:372 },
    ig: 0, tags: ['proteico','low-carb','colina','vitaminas-b']
  },
  sardinha_lata: {
    nome: 'Sardinha em azeite escorrida',
    categoria: 'peixes', preparo_padrao: 'conserva',
    n: { kcal:192, cho:0,    ptn:24.6, lip:10.5,fib:0,   na:505, k:397, ca:382, fe:2.7, mg:39,  vit_c:0,  omega3:1.48, g_sat:2.9,  col:105 },
    ig: 0, tags: ['omega3','calcio','proteico','anti-inflamatorio']
  },

  // ── LEGUMINOSAS ─────────────────────────────────────────────

  feijao_carioca_cozido: {
    nome: 'Feijão carioca cozido',
    categoria: 'leguminosas', preparo_padrao: 'cozido',
    n: { kcal:77,  cho:13.6, ptn:4.8,  lip:0.5, fib:8.4, na:2,   k:339, ca:27,  fe:1.5, mg:38,  vit_c:0,  omega3:0.03, g_sat:0.1,  col:0  },
    ig: 29, tags: ['baixo-ig','fibra-soluvel','proteico-vegetal','saciante','prebiotico','potassio']
  },
  lentilha_cozida: {
    nome: 'Lentilha cozida',
    categoria: 'leguminosas', preparo_padrao: 'cozida',
    n: { kcal:93,  cho:16.3, ptn:6.9,  lip:0.4, fib:7.9, na:2,   k:369, ca:24,  fe:3.3, mg:36,  vit_c:1,  omega3:0.04, g_sat:0.06, col:0  },
    ig: 25, tags: ['baixo-ig','fibra-soluvel','proteico-vegetal','ferro','anti-inflamatorio']
  },
  grao_de_bico_cozido: {
    nome: 'Grão-de-bico cozido',
    categoria: 'leguminosas', preparo_padrao: 'cozido',
    n: { kcal:164, cho:27.4, ptn:8.9,  lip:2.6, fib:7.6, na:7,   k:291, ca:49,  fe:2.9, mg:48,  vit_c:1,  omega3:0.09, g_sat:0.3,  col:0  },
    ig: 28, tags: ['baixo-ig','fibra','proteico-vegetal','ferro']
  },
  tofu_firme: {
    nome: 'Tofu firme',
    categoria: 'leguminosas', preparo_padrao: 'cru',
    n: { kcal:76,  cho:1.9,  ptn:8.1,  lip:4.5, fib:0.3, na:9,   k:121, ca:350, fe:1.6, mg:37,  vit_c:0,  omega3:0.4,  g_sat:0.7,  col:0  },
    ig: 15, tags: ['baixo-ig','proteico-vegetal','calcio','isoflavonas']
  },

  // ── LATICÍNIOS ──────────────────────────────────────────────

  leite_desnatado: {
    nome: 'Leite desnatado',
    categoria: 'laticinios', preparo_padrao: 'liquido',
    n: { kcal:35,  cho:4.8,  ptn:3.5,  lip:0.1, fib:0,   na:51,  k:150, ca:123, fe:0.0, mg:12,  vit_c:1,  omega3:0,    g_sat:0.05, col:3  },
    ig: 32, tags: ['baixo-ig','calcio','proteico','baixa-gordura']
  },
  iogurte_natural_desnatado: {
    nome: 'Iogurte natural desnatado',
    categoria: 'laticinios', preparo_padrao: 'pronto',
    n: { kcal:56,  cho:7.4,  ptn:5.7,  lip:0.4, fib:0,   na:72,  k:219, ca:150, fe:0.1, mg:17,  vit_c:1,  omega3:0,    g_sat:0.2,  col:3  },
    ig: 35, tags: ['baixo-ig','calcio','probiotico','proteico']
  },
  iogurte_grego_natural: {
    nome: 'Iogurte grego natural',
    categoria: 'laticinios', preparo_padrao: 'pronto',
    n: { kcal:97,  cho:3.8,  ptn:9.0,  lip:5.0, fib:0,   na:47,  k:141, ca:110, fe:0.0, mg:11,  vit_c:0,  omega3:0,    g_sat:3.2,  col:15 },
    ig: 11, tags: ['baixo-ig','proteico','probiotico','saciante']
  },
  queijo_cottage: {
    nome: 'Queijo cottage',
    categoria: 'laticinios', preparo_padrao: 'pronto',
    n: { kcal:98,  cho:3.4,  ptn:11.6, lip:4.3, fib:0,   na:372, k:84,  ca:83,  fe:0.1, mg:8,   vit_c:0,  omega3:0,    g_sat:2.7,  col:15 },
    ig: 10, tags: ['baixo-ig','proteico','baixo-carbo']
  },
  queijo_minas_frescal: {
    nome: 'Queijo Minas Frescal',
    categoria: 'laticinios', preparo_padrao: 'pronto',
    n: { kcal:264, cho:3.2,  ptn:17.4, lip:20.2,fib:0,   na:380, k:78,  ca:218, fe:0.5, mg:16,  vit_c:0,  omega3:0,    g_sat:12.8, col:69 },
    ig: 0, tags: ['proteico','calcio']
  },

  // ── VEGETAIS ────────────────────────────────────────────────

  brocolis_cozido: {
    nome: 'Brócolis cozido',
    categoria: 'vegetais', preparo_padrao: 'cozido',
    n: { kcal:25,  cho:4.8,  ptn:2.9,  lip:0.1, fib:2.6, na:20,  k:293, ca:40,  fe:0.7, mg:21,  vit_c:64, omega3:0.03, g_sat:0.01, col:0  },
    ig: 10, tags: ['anti-inflamatorio','crucifero','fibra','vitamina-c','calcio-vegetal','potassio']
  },
  espinafre_cozido: {
    nome: 'Espinafre cozido',
    categoria: 'vegetais', preparo_padrao: 'cozido',
    n: { kcal:23,  cho:3.4,  ptn:2.9,  lip:0.3, fib:2.2, na:70,  k:466, ca:136, fe:2.7, mg:87,  vit_c:16, omega3:0.07, g_sat:0.05, col:0  },
    ig: 15, tags: ['ferro','calcio-vegetal','magnesio','anti-inflamatorio','potassio']
  },
  cenoura_crua: {
    nome: 'Cenoura crua',
    categoria: 'vegetais', preparo_padrao: 'cru',
    n: { kcal:34,  cho:7.7,  ptn:0.9,  lip:0.2, fib:2.2, na:27,  k:320, ca:34,  fe:0.3, mg:12,  vit_c:6,  omega3:0.01, g_sat:0.04, col:0  },
    ig: 35, tags: ['beta-caroteno','fibra','potassio']
  },
  chuchu_cozido: {
    nome: 'Chuchu cozido',
    categoria: 'vegetais', preparo_padrao: 'cozido',
    n: { kcal:22,  cho:4.6,  ptn:0.6,  lip:0.1, fib:1.8, na:2,   k:123, ca:14,  fe:0.2, mg:11,  vit_c:6,  omega3:0,    g_sat:0.01, col:0  },
    ig: 15, tags: ['baixo-sodio','leve','hidratante']
  },
  abobrinha_crua: {
    nome: 'Abobrinha',
    categoria: 'vegetais', preparo_padrao: 'cru',
    n: { kcal:18,  cho:3.1,  ptn:1.5,  lip:0.2, fib:1.0, na:2,   k:262, ca:15,  fe:0.4, mg:18,  vit_c:20, omega3:0.03, g_sat:0.04, col:0  },
    ig: 15, tags: ['baixo-sodio','leve','potassio']
  },
  tomate_cru: {
    nome: 'Tomate cru',
    categoria: 'vegetais', preparo_padrao: 'cru',
    n: { kcal:15,  cho:3.3,  ptn:0.9,  lip:0.2, fib:1.2, na:4,   k:237, ca:8,   fe:0.3, mg:9,   vit_c:22, omega3:0.01, g_sat:0.03, col:0  },
    ig: 15, tags: ['licopeno','anti-inflamatorio','vitamina-c','potassio']
  },
  couve_refogada: {
    nome: 'Couve refogada',
    categoria: 'vegetais', preparo_padrao: 'refogada',
    n: { kcal:57,  cho:5.0,  ptn:3.1,  lip:3.2, fib:3.8, na:12,  k:394, ca:163, fe:1.1, mg:32,  vit_c:51, omega3:0.05, g_sat:0.5,  col:0  },
    ig: 15, tags: ['anti-inflamatorio','crucifero','calcio-vegetal','ferro','potassio']
  },
  beterraba_cozida: {
    nome: 'Beterraba cozida',
    categoria: 'vegetais', preparo_padrao: 'cozida',
    n: { kcal:43,  cho:9.6,  ptn:1.7,  lip:0.1, fib:2.3, na:65,  k:305, ca:16,  fe:0.8, mg:20,  vit_c:5,  omega3:0.01, g_sat:0.01, col:0  },
    ig: 64, tags: ['nitrato','anti-hipertensivo','potassio']
  },
  pepino_cru: {
    nome: 'Pepino cru',
    categoria: 'vegetais', preparo_padrao: 'cru',
    n: { kcal:13,  cho:2.9,  ptn:0.7,  lip:0.1, fib:0.9, na:2,   k:136, ca:16,  fe:0.3, mg:12,  vit_c:3,  omega3:0,    g_sat:0.02, col:0  },
    ig: 15, tags: ['hidratante','leve','baixo-sodio']
  },

  // ── FRUTAS ──────────────────────────────────────────────────

  banana_prata: {
    nome: 'Banana prata',
    categoria: 'frutas', preparo_padrao: 'crua',
    n: { kcal:92,  cho:23.8, ptn:1.4,  lip:0.1, fib:1.9, na:1,   k:358, ca:8,   fe:0.3, mg:27,  vit_c:9,  omega3:0.02, g_sat:0.04, col:0  },
    ig: 51, tags: ['potassio','energia','pre-treino']
  },
  maca_vermelha: {
    nome: 'Maçã vermelha (com casca)',
    categoria: 'frutas', preparo_padrao: 'crua',
    n: { kcal:56,  cho:15.2, ptn:0.3,  lip:0.1, fib:2.0, na:1,   k:120, ca:4,   fe:0.1, mg:5,   vit_c:5,  omega3:0.01, g_sat:0.02, col:0  },
    ig: 38, tags: ['baixo-ig','fibra-soluvel','pectina','anti-inflamatorio']
  },
  morango: {
    nome: 'Morango',
    categoria: 'frutas', preparo_padrao: 'cru',
    n: { kcal:30,  cho:7.1,  ptn:0.9,  lip:0.3, fib:1.8, na:1,   k:180, ca:15,  fe:0.3, mg:10,  vit_c:58, omega3:0.06, g_sat:0.02, col:0  },
    ig: 25, tags: ['baixo-ig','antioxidante','vitamina-c','anti-inflamatorio']
  },
  mamao_formosa: {
    nome: 'Mamão formosa',
    categoria: 'frutas', preparo_padrao: 'cru',
    n: { kcal:40,  cho:10.3, ptn:0.5,  lip:0.1, fib:1.8, na:3,   k:182, ca:20,  fe:0.1, mg:10,  vit_c:62, omega3:0.01, g_sat:0.03, col:0  },
    ig: 59, tags: ['vitamina-c','digestivo']
  },
  laranja_pera: {
    nome: 'Laranja pera',
    categoria: 'frutas', preparo_padrao: 'crua',
    n: { kcal:49,  cho:12.5, ptn:1.0,  lip:0.1, fib:2.4, na:0,   k:181, ca:34,  fe:0.2, mg:12,  vit_c:53, omega3:0.02, g_sat:0.01, col:0  },
    ig: 43, tags: ['baixo-ig','vitamina-c','flavonoides','fibra']
  },
  abacate: {
    nome: 'Abacate',
    categoria: 'frutas', preparo_padrao: 'cru',
    n: { kcal:96,  cho:6.0,  ptn:1.2,  lip:8.4, fib:6.3, na:4,   k:485, ca:13,  fe:0.5, mg:29,  vit_c:10, omega3:0.11, g_sat:1.2,  col:0  },
    ig: 10, tags: ['gordura-boa','potassio','anti-inflamatorio','saciante','baixo-ig']
  },
  mirtilo: {
    nome: 'Mirtilo (blueberry)',
    categoria: 'frutas', preparo_padrao: 'cru',
    n: { kcal:57,  cho:14.5, ptn:0.7,  lip:0.3, fib:2.4, na:1,   k:77,  ca:6,   fe:0.3, mg:6,   vit_c:10, omega3:0.06, g_sat:0.03, col:0  },
    ig: 25, tags: ['baixo-ig','antioxidante','anti-inflamatorio','neuroprotecao']
  },
  kiwi: {
    nome: 'Kiwi',
    categoria: 'frutas', preparo_padrao: 'cru',
    n: { kcal:61,  cho:14.7, ptn:1.1,  lip:0.5, fib:3.0, na:3,   k:312, ca:34,  fe:0.3, mg:17,  vit_c:93, omega3:0.04, g_sat:0.1,  col:0  },
    ig: 39, tags: ['baixo-ig','vitamina-c','potassio','fibra']
  },

  // ── OLEAGINOSAS & SEMENTES ──────────────────────────────────

  amendoas: {
    nome: 'Amêndoas cruas',
    categoria: 'oleaginosas', preparo_padrao: 'cruas',
    n: { kcal:579, cho:21.7, ptn:21.3, lip:49.4,fib:12.9,na:1,   k:705, ca:264, fe:3.7, mg:268, vit_c:0,  omega3:0.4,  g_sat:3.7,  col:0  },
    ig: 0, tags: ['gordura-boa','magnesio','calcio','proteico','saciante','anti-inflamatorio']
  },
  nozes: {
    nome: 'Nozes',
    categoria: 'oleaginosas', preparo_padrao: 'cruas',
    n: { kcal:620, cho:13.7, ptn:14.3, lip:59.4,fib:6.7, na:2,   k:441, ca:98,  fe:2.9, mg:158, vit_c:2,  omega3:9.08, g_sat:5.6,  col:0  },
    ig: 15, tags: ['omega3','anti-inflamatorio','gordura-boa','neuroprotecao','cardio-protetor']
  },
  castanha_do_para: {
    nome: 'Castanha-do-pará',
    categoria: 'oleaginosas', preparo_padrao: 'crua',
    n: { kcal:656, cho:12.3, ptn:14.3, lip:63.5,fib:7.5, na:3,   k:597, ca:160, fe:2.4, mg:376, vit_c:0,  omega3:0.05, g_sat:15.1, col:0  },
    ig: 0, tags: ['selenio','magnesio','gordura-boa','antioxidante']
  },
  chia_semente: {
    nome: 'Chia (semente)',
    categoria: 'sementes', preparo_padrao: 'crua',
    n: { kcal:485, cho:42.1, ptn:15.6, lip:30.7,fib:34.4,na:16,  k:407, ca:631, fe:7.7, mg:335, vit_c:1,  omega3:17.8, g_sat:3.3,  col:0  },
    ig: 1, tags: ['omega3','fibra-soluvel','calcio','anti-inflamatorio','saciante','baixo-ig']
  },
  linhaca_dourada_moida: {
    nome: 'Linhaça dourada moída',
    categoria: 'sementes', preparo_padrao: 'moída',
    n: { kcal:495, cho:28.9, ptn:18.3, lip:34.0,fib:26.9,na:6,   k:813, ca:211, fe:5.7, mg:392, vit_c:1,  omega3:16.0, g_sat:3.2,  col:0  },
    ig: 35, tags: ['omega3','fibra-soluvel','lignanas','anti-inflamatorio','hormonal']
  },
  pasta_amendoim_natural: {
    nome: 'Pasta de amendoim natural',
    categoria: 'oleaginosas', preparo_padrao: 'processado',
    n: { kcal:589, cho:21.0, ptn:25.0, lip:50.0,fib:6.0, na:9,   k:698, ca:49,  fe:1.9, mg:154, vit_c:0,  omega3:0.05, g_sat:8.3,  col:0  },
    ig: 14, tags: ['proteico','gordura-boa','saciante','baixo-ig']
  },

  // ── GORDURAS & TEMPEROS ─────────────────────────────────────

  azeite_oliva: {
    nome: 'Azeite de oliva extravirgem',
    categoria: 'gorduras', preparo_padrao: 'cru',
    n: { kcal:884, cho:0,    ptn:0,    lip:100, fib:0,   na:1,   k:1,   ca:1,   fe:0.6, mg:0,   vit_c:0,  omega3:0.76, g_sat:13.8, col:0  },
    ig: 0, tags: ['gordura-boa','omega9','anti-inflamatorio','cardio-protetor']
  },
  cacau_po_sem_acucar: {
    nome: 'Cacau em pó 100%',
    categoria: 'outros', preparo_padrao: 'cru',
    n: { kcal:228, cho:54.3, ptn:19.6, lip:13.7,fib:33.2,na:21,  k:1524,ca:128, fe:13.9,mg:499, vit_c:0,  omega3:0,    g_sat:8.1,  col:0  },
    ig: 20, tags: ['antioxidante','magnesio','ferro','polifenois','anti-inflamatorio']
  },
  canela_po: {
    nome: 'Canela em pó',
    categoria: 'temperos', preparo_padrao: 'seco',
    n: { kcal:261, cho:80.6, ptn:3.9,  lip:1.2, fib:53.1,na:10,  k:431, ca:1002,fe:8.3, mg:60,  vit_c:4,  omega3:0,    g_sat:0.3,  col:0  },
    ig: 5, tags: ['insulino-sensibilizante','anti-inflamatorio','antioxidante','glicemia']
  },
  gengibre_fresco: {
    nome: 'Gengibre fresco ralado',
    categoria: 'temperos', preparo_padrao: 'cru',
    n: { kcal:80,  cho:17.8, ptn:1.8,  lip:0.8, fib:2.0, na:13,  k:415, ca:16,  fe:0.6, mg:43,  vit_c:5,  omega3:0,    g_sat:0.2,  col:0  },
    ig: 15, tags: ['anti-inflamatorio','digestivo','antinausea','antioxidante']
  }
};

// ── PROTOCOLOS CLÍNICOS ─────────────────────────────────────────
export const PROTOCOLS = {

  diabetes_ri: {
    slug: 'diabetes_ri',
    nome: 'Diabetes / Resistência Insulínica',
    descricao: 'Controle glicêmico com alimentação de baixo índice glicêmico, alta fibra e distribuição estratégica de carboidratos.',
    objetivo_clinico: 'Estabilizar glicemia, melhorar sensibilidade à insulina, prevenir complicações metabólicas',
    estrategia_nutricional: 'Fracionamento em 5 refeições, carboidratos de IG < 55, alta fibra solúvel (>30g/dia), gorduras saudáveis para reduzir carga glicêmica de cada refeição',
    metas: {
      kcal_base: 1600,
      cho_pct: { min: 40, max: 45 }, ptn_pct: { min: 25, max: 30 }, lip_pct: { min: 25, max: 30 },
      fibra_min_g: 30, sodio_max_mg: 2000, ig_max: 55, num_refeicoes: 5
    },
    restricoes: [
      'Açúcar simples e refinados (mel, açúcar branco, frutose industrializada)',
      'Alimentos ultraprocessados (biscoitos, refrigerantes, salgadinhos)',
      'Arroz branco em excesso — substituir por integral ou lentilha',
      'Tapioca pura (IG 85) — evitar ou combinar com proteína e gordura',
      'Sucos de frutas sem fibra — preferir fruta inteira',
      'Pão branco, bolo, bolacha recheada',
      'Batata inglesa cozida (IG 87)'
    ],
    recomendacoes: [
      'Incluir fibra em TODAS as refeições com carboidratos — reduz pico glicêmico',
      'Combinar carboidratos sempre com proteína + gordura saudável',
      '1/4 de colher de chá de canela/dia demonstrou reduzir glicemia em jejum',
      'Oleaginosas como lanche ideal — saciam e IG ≈ 0',
      'Fracionar carboidratos ao longo do dia, nunca concentrar à noite',
      'Leguminosas 1x/dia mínimo: feijão, lentilha, grão-de-bico têm IG < 30',
      'Usar vinagre de maçã (1 col sopa) antes das refeições principais'
    ],
    alimentos_chave: ['aveia_flocos','lentilha_cozida','feijao_carioca_cozido','chia_semente','brocolis_cozido','iogurte_grego_natural','amendoas','salmon_grelhado']
  },

  hipertensao: {
    slug: 'hipertensao',
    nome: 'Hipertensão Arterial',
    descricao: 'Protocolo DASH adaptado ao contexto brasileiro — redução de sódio, aumento de potássio, magnésio e cálcio para controle pressórico.',
    objetivo_clinico: 'Redução da pressão arterial sistólica e diastólica por modulação dietética',
    estrategia_nutricional: 'Padrão DASH: frutas, vegetais, laticínios desnatados, grãos integrais, sem sal de adição, ômega-3 3x/semana',
    metas: {
      kcal_base: 1800,
      cho_pct: { min: 50, max: 55 }, ptn_pct: { min: 18, max: 22 }, lip_pct: { min: 25, max: 30 },
      fibra_min_g: 25, sodio_max_mg: 1500, potassio_min_mg: 4700, calcio_min_mg: 1000, magnesio_min_mg: 400,
      g_sat_max_pct: 7, num_refeicoes: 5
    },
    restricoes: [
      'Sal de adição — máximo 1 colher de chá/dia (= 5g sal = 2.000mg sódio)',
      'Embutidos: linguiça, mortadela, presunto, salame, bacon',
      'Enlatados e conservas com sódio elevado',
      'Queijos curados e salgados (parmesão, provolone, prato)',
      'Molhos industrializados: shoyu, catchup, mostarda, tempero pronto',
      'Frituras em excesso e gordura saturada > 7% das calorias',
      'Álcool (elevação aguda e crônica da PA)',
      'Cafeína em excesso em casos de HAS severa'
    ],
    recomendacoes: [
      'Temperar com ervas frescas, limão, alho, cúrcuma, gengibre — substituem o sal',
      'Beterraba 3x/semana: nitrato → vasodilatação → redução da PA sistólica ~4–8 mmHg',
      'Banana + abacate + espinafre + batata-doce: pilares do potássio (DASH)',
      'Laticínios desnatados 3x/dia: cálcio + proteína sem gordura saturada',
      'Azeite extravirgem como gordura principal — sem sal adicionado',
      'Peixes ricos em ômega-3 no mínimo 3x/semana (salmão, sardinha)',
      'Cacau 100% com moderação: flavonoides reduzem PA 2–4 mmHg'
    ],
    alimentos_chave: ['espinafre_cozido','beterraba_cozida','banana_prata','abacate','salmon_grelhado','iogurte_natural_desnatado','batata_doce_cozida','linhaca_dourada_moida']
  },

  sop: {
    slug: 'sop',
    nome: 'SOP — Síndrome do Ovário Policístico',
    descricao: 'Controle da resistência insulínica, modulação hormonal e inflamação com alimentação anti-inflamatória de baixo IG.',
    objetivo_clinico: 'Reduzir resistência à insulina, regularizar ciclo menstrual, controlar peso e inflamação sistêmica crônica',
    estrategia_nutricional: 'Baixo IG + anti-inflamatório: ômega-3 elevado, redução de açúcares, adequação de zinco, magnésio e vitamina D, linhaça diariamente',
    metas: {
      kcal_base: 1500,
      cho_pct: { min: 40, max: 45 }, ptn_pct: { min: 25, max: 30 }, lip_pct: { min: 28, max: 33 },
      fibra_min_g: 28, sodio_max_mg: 2000, ig_max: 55, omega3_min_g: 2, num_refeicoes: 5
    },
    restricoes: [
      'Açúcar refinado e alimentos ultraprocessados',
      'Gorduras trans (margarina, produtos industrializados)',
      'Excesso de laticínios integrais (possível estímulo hormonal)',
      'Álcool (piora inflamação e resistência insulínica)',
      'Carboidratos simples sem combinação protetora de fibra + proteína',
      'Excesso de carboidratos no jantar'
    ],
    recomendacoes: [
      'Linhaça moída 1 colher sopa/dia: lignanas modulam estrógeno e DHT',
      'Ômega-3: salmão, sardinha ou nozes 3x/semana — anti-inflamatório',
      'Canela nas refeições demonstrou melhorar sensibilidade insulínica na SOP',
      'Zinco: carnes, oleaginosas, leguminosas — fundamental para ovulação',
      'Magnésio: vegetais verdes escuros, oleaginosas — reduz inflamação',
      'Vitamina D: verificar nível sérico e suplementar se < 30 ng/mL',
      'Menta-verde (chá): estudos demonstraram redução de androgênios',
      'Nunca pular o café da manhã — estabiliza insulina ao longo do dia'
    ],
    alimentos_chave: ['salmon_grelhado','chia_semente','linhaca_dourada_moida','lentilha_cozida','brocolis_cozido','nozes','iogurte_grego_natural','aveia_flocos']
  },

  dislipidemia: {
    slug: 'dislipidemia',
    nome: 'Dislipidemia',
    descricao: 'Redução de LDL e triglicerídeos com aumento de HDL por modulação das gorduras dietéticas e fibra solúvel.',
    objetivo_clinico: 'Normalizar perfil lipídico (LDL < 100, TG < 150, HDL > 50), reduzir risco cardiovascular',
    estrategia_nutricional: 'Substituição de gorduras saturadas por insaturadas, fibra solúvel ≥ 10g/dia, ômega-3 para triglicerídeos, restrição de colesterol e gordura trans',
    metas: {
      kcal_base: 1700,
      cho_pct: { min: 50, max: 55 }, ptn_pct: { min: 18, max: 22 }, lip_pct: { min: 25, max: 30 },
      fibra_min_g: 30, sodio_max_mg: 2000, omega3_min_g: 2, g_sat_max_pct: 7, colesterol_max_mg: 200,
      num_refeicoes: 5
    },
    restricoes: [
      'Gorduras saturadas > 7% das calorias (carnes gordas, laticínios integrais)',
      'Gorduras trans (margarina, produtos industrializados)',
      'Colesterol elevado em caso de LDL muito alto: max 2 gemas/semana',
      'Álcool especialmente com triglicerídeos altos',
      'Açúcar refinado e carboidratos simples (elevam triglicerídeos)',
      'Frituras e processados com gordura vegetal hidrogenada'
    ],
    recomendacoes: [
      'Aveia 40g/dia: beta-glucana reduz LDL em 5–10% em 3 meses',
      'Salmão, sardinha, atum 3x/semana: ômega-3 reduz triglicerídeos 20–30%',
      'Azeite extravirgem como gordura principal — substitui saturadas',
      'Nozes, amêndoas diariamente — melhora relação LDL/HDL',
      'Maçã e laranja: pectina (fibra solúvel) captura colesterol no intestino',
      'Linhaça 1 col sopa/dia: lignanas + ômega-3 + fibra solúvel',
      'Tofu e edamame: isoflavonas da soja reduzem LDL em até 6%'
    ],
    alimentos_chave: ['aveia_flocos','salmon_grelhado','nozes','maca_vermelha','linhaca_dourada_moida','azeite_oliva','feijao_carioca_cozido','tofu_firme']
  },

  hipertrofia: {
    slug: 'hipertrofia',
    nome: 'Hipertrofia Muscular',
    descricao: 'Superávit calórico controlado com alto aporte proteico, carboidratos estratégicos e timing peri-treino.',
    objetivo_clinico: 'Maximizar síntese proteica muscular (MPS) e ganho de massa magra com mínimo acúmulo de gordura',
    estrategia_nutricional: 'Alta proteína 1.8–2.2g/kg/dia, superávit de 200–400 kcal, carboidratos peri-treino, distribuição proteica a cada 3–4h com leucina adequada em cada refeição',
    metas: {
      kcal_base: 2400,
      cho_pct: { min: 50, max: 55 }, ptn_pct: { min: 25, max: 30 }, lip_pct: { min: 20, max: 25 },
      fibra_min_g: 25, sodio_max_mg: 2500, ptn_por_kg: { min: 1.8, max: 2.2 }, num_refeicoes: 6
    },
    restricoes: [
      'Déficit calórico (catabolismo)',
      'Excesso de gordura saturada',
      'Álcool: inibe síntese proteica muscular',
      'Jejum prolongado > 5h (catabolismo proteico)',
      'Ultraprocessados em excesso'
    ],
    recomendacoes: [
      'Proteína a cada 3–4 horas: cada refeição com ≥ 20–30g proteína ativa mTOR',
      'Leucina é o "gatilho" da síntese muscular: carnes, laticínios, leguminosas',
      'Carboidrato + proteína pré-treino (30–60 min antes): energia + anabolismo',
      'Janela pós-treino (até 2h): whey + banana ou arroz + frango',
      'Creatina monoidratada 3–5g/dia demonstra eficácia comprovada',
      'Hidratação: mínimo 40ml/kg/dia',
      'Não pular café da manhã — primeira janela anabólica do dia'
    ],
    alimentos_chave: ['frango_peito_grelhado','ovo_inteiro_cozido','iogurte_grego_natural','arroz_integral_cozido','batata_doce_cozida','salmon_grelhado','feijao_carioca_cozido','amendoas']
  }
};

// ── TEMPLATES DE REFEIÇÃO ──────────────────────────────────────
// Estrutura: protocol_slug → tipo → [opcao1, opcao2, ...]
// Cada alimento: { key: foodKey, g: gramas, preparo?: 'nota' }
export const MEAL_TEMPLATES = {

  // ─── DIABETES / RESISTÊNCIA INSULÍNICA ──────────────────────
  diabetes_ri: {

    cafe_manha: [
      {
        opcao: 1, nome: 'Omelete proteico com vegetais e pão integral',
        descricao: 'Proteína + gordura + fibra = carga glicêmica baixíssima',
        alimentos: [
          { key: 'ovo_inteiro_cozido',        g: 120, preparo: 'omelete grelhado' },
          { key: 'queijo_cottage',             g: 40,  preparo: null },
          { key: 'espinafre_cozido',           g: 50,  preparo: 'refogado' },
          { key: 'tomate_cru',                 g: 60,  preparo: 'fatiado' },
          { key: 'pao_integral',               g: 30,  preparo: '1 fatia fina' },
          { key: 'azeite_oliva',               g: 5,   preparo: 'para refogar' }
        ],
        totais: { kcal: 352, cho: 20, ptn: 27, lip: 18, fib: 3.4, na: 574 },
        nota_clinica: 'Combinação proteína+gordura reduz IG do pão integral de 51 para ~20. Ideal para RI severa.'
      },
      {
        opcao: 2, nome: 'Bowl de aveia com chia e frutas vermelhas',
        descricao: 'Beta-glucana da aveia + chia = controle glicêmico excelente',
        alimentos: [
          { key: 'aveia_flocos',               g: 40,  preparo: 'cozida em água' },
          { key: 'iogurte_natural_desnatado',  g: 120, preparo: null },
          { key: 'chia_semente',               g: 10,  preparo: 'hidratada' },
          { key: 'morango',                    g: 100, preparo: 'fresco' },
          { key: 'canela_po',                  g: 2,   preparo: 'polvilhada' }
        ],
        totais: { kcal: 313, cho: 49, ptn: 16, lip: 7, fib: 10.9, na: 91 },
        nota_clinica: 'Combinação aveia+chia+iogurte reduz pico glicêmico pós-prandial mesmo com 49g CHO. Fibra 11g nesta refeição só.'
      },
      {
        opcao: 3, nome: 'Iogurte grego com oleaginosas e canela',
        descricao: 'Mínimo carboidrato, máximo saciedade. Excelente para RI severa.',
        alimentos: [
          { key: 'iogurte_grego_natural',      g: 150, preparo: null },
          { key: 'amendoas',                   g: 20,  preparo: 'cruas ou torradas s/ sal' },
          { key: 'morango',                    g: 80,  preparo: 'fresco' },
          { key: 'chia_semente',               g: 8,   preparo: 'misturada' },
          { key: 'canela_po',                  g: 1,   preparo: null }
        ],
        totais: { kcal: 331, cho: 19, ptn: 21, lip: 21, fib: 5.3, na: 47 },
        nota_clinica: 'IG estimado da refeição < 15. Máxima saciedade. Indicado para pré-diabetes e RI severa.'
      }
    ],

    lanche_manha: [
      {
        opcao: 1, nome: 'Maçã com pasta de amendoim natural',
        alimentos: [
          { key: 'maca_vermelha',              g: 130, preparo: 'com casca' },
          { key: 'pasta_amendoim_natural',      g: 15,  preparo: null }
        ],
        totais: { kcal: 162, cho: 23, ptn: 5, lip: 8, fib: 4.5, na: 9 },
        nota_clinica: 'Gordura + proteína da pasta reduz IG da maçã. Fibra 4.5g. Ótima escolha.'
      },
      {
        opcao: 2, nome: 'Mix de oleaginosas (sem sal)',
        alimentos: [
          { key: 'amendoas',                   g: 15,  preparo: null },
          { key: 'nozes',                      g: 10,  preparo: null },
          { key: 'castanha_do_para',           g: 10,  preparo: '2 unidades' }
        ],
        totais: { kcal: 228, cho: 6, ptn: 6, lip: 21, fib: 3.7, na: 2 },
        nota_clinica: 'IG ≈ 0. Selênio da castanha-do-pará melhora função tireoidiana (frequente co-ocorrência com RI).'
      }
    ],

    almoco: [
      {
        opcao: 1, nome: 'Frango grelhado com arroz integral, feijão e legumes',
        descricao: 'Prato completo com escolhas estratégicas de baixo IG',
        alimentos: [
          { key: 'frango_peito_grelhado',      g: 120, preparo: 'grelhado com ervas' },
          { key: 'arroz_integral_cozido',      g: 80,  preparo: null },
          { key: 'feijao_carioca_cozido',      g: 80,  preparo: 'sem sal extra' },
          { key: 'brocolis_cozido',            g: 100, preparo: 'al dente' },
          { key: 'cenoura_crua',               g: 60,  preparo: 'ralada' },
          { key: 'azeite_oliva',               g: 7,   preparo: 'tempero' }
        ],
        totais: { kcal: 489, cho: 47, ptn: 51, lip: 13, fib: 14.0, na: 113 },
        nota_clinica: 'Feijão reduz IG do arroz quando combinados (efeito "segundo prato"). 14g fibra = meia meta diária.'
      },
      {
        opcao: 2, nome: 'Salmão assado com lentilha e espinafre',
        descricao: 'Anti-inflamatório potente. Lentilha com o menor IG entre leguminosas.',
        alimentos: [
          { key: 'salmon_grelhado',            g: 120, preparo: 'assado com limão e dill' },
          { key: 'lentilha_cozida',            g: 100, preparo: 'com cúrcuma e pimenta' },
          { key: 'espinafre_cozido',           g: 80,  preparo: 'refogado no azeite' },
          { key: 'tomate_cru',                 g: 80,  preparo: 'salada' },
          { key: 'azeite_oliva',               g: 7,   preparo: null }
        ],
        totais: { kcal: 487, cho: 22, ptn: 43, lip: 24, fib: 10.9, na: 140 },
        nota_clinica: 'Ômega-3 do salmão + IG 25 da lentilha = combinação ótima anti-inflamatória e glicêmica.'
      },
      {
        opcao: 3, nome: 'Bowl de quinoa com frango e vegetais coloridos',
        alimentos: [
          { key: 'frango_peito_grelhado',      g: 100, preparo: null },
          { key: 'quinoa_cozida',              g: 100, preparo: null },
          { key: 'brocolis_cozido',            g: 80,  preparo: null },
          { key: 'cenoura_crua',               g: 60,  preparo: 'ralada' },
          { key: 'tomate_cru',                 g: 60,  preparo: null },
          { key: 'azeite_oliva',               g: 7,   preparo: null }
        ],
        totais: { kcal: 408, cho: 34, ptn: 44, lip: 13, fib: 7.4, na: 82 },
        nota_clinica: 'Quinoa: proteína completa + IG 53 vs arroz branco IG 72. Todos os aminoácidos essenciais.'
      }
    ],

    lanche_tarde: [
      {
        opcao: 1, nome: 'Iogurte grego com linhaça e morango',
        alimentos: [
          { key: 'iogurte_grego_natural',      g: 120, preparo: null },
          { key: 'linhaca_dourada_moida',      g: 10,  preparo: 'moída na hora' },
          { key: 'morango',                    g: 60,  preparo: null }
        ],
        totais: { kcal: 185, cho: 13, ptn: 13, lip: 9, fib: 4.5, na: 58 }
      },
      {
        opcao: 2, nome: 'Queijo cottage com tomate e azeite',
        alimentos: [
          { key: 'queijo_cottage',             g: 80,  preparo: null },
          { key: 'tomate_cru',                 g: 80,  preparo: 'fatiado' },
          { key: 'azeite_oliva',               g: 5,   preparo: null }
        ],
        totais: { kcal: 149, cho: 5, ptn: 10, lip: 9, fib: 1.0, na: 310 }
      }
    ],

    jantar: [
      {
        opcao: 1, nome: 'Sopa proteica de legumes com frango',
        descricao: 'Jantar leve reduz pico glicêmico noturno e glicemia em jejum',
        alimentos: [
          { key: 'frango_peito_grelhado',      g: 100, preparo: 'desfiado' },
          { key: 'chuchu_cozido',              g: 100, preparo: null },
          { key: 'cenoura_crua',               g: 80,  preparo: 'cozida' },
          { key: 'abobrinha_crua',             g: 80,  preparo: 'cozida' },
          { key: 'espinafre_cozido',           g: 40,  preparo: 'folhas' },
          { key: 'azeite_oliva',               g: 5,   preparo: 'finalização' }
        ],
        totais: { kcal: 289, cho: 18, ptn: 38, lip: 7, fib: 5.5, na: 90 },
        nota_clinica: 'CHO baixo no jantar melhora glicemia de jejum. Alta proteína preserva massa magra durante o sono.'
      },
      {
        opcao: 2, nome: 'Omelete de atum com salada completa',
        alimentos: [
          { key: 'ovo_inteiro_cozido',         g: 120, preparo: 'omelete' },
          { key: 'atum_agua',                  g: 80,  preparo: 'escorrido' },
          { key: 'tomate_cru',                 g: 60,  preparo: null },
          { key: 'espinafre_cozido',           g: 60,  preparo: 'folhas' },
          { key: 'azeite_oliva',               g: 7,   preparo: 'tempero' }
        ],
        totais: { kcal: 368, cho: 4, ptn: 51, lip: 17, fib: 1.8, na: 472 }
      }
    ],

    ceia: [
      {
        opcao: 1, nome: 'Oleaginosas + chá sem açúcar',
        alimentos: [
          { key: 'castanha_do_para',           g: 10,  preparo: '2 unidades' },
          { key: 'amendoas',                   g: 10,  preparo: null }
        ],
        totais: { kcal: 124, cho: 3, ptn: 3, lip: 11, fib: 2.0, na: 2 }
      },
      {
        opcao: 2, nome: 'Leite desnatado morno com canela',
        alimentos: [
          { key: 'leite_desnatado',            g: 200, preparo: 'morno' },
          { key: 'canela_po',                  g: 1,   preparo: 'polvilhada' }
        ],
        totais: { kcal: 73, cho: 10, ptn: 7, lip: 0.2, fib: 0.5, na: 105 },
        nota_clinica: 'Triptofano do leite favorece sono. Canela melhora glicemia de jejum pós-noite.'
      }
    ]
  },

  // ─── HIPERTENSÃO ───────────────────────────────────────────
  hipertensao: {

    cafe_manha: [
      {
        opcao: 1, nome: 'Aveia com banana e iogurte desnatado',
        descricao: 'Potássio da banana + cálcio do iogurte + beta-glucana da aveia',
        alimentos: [
          { key: 'aveia_flocos',               g: 40,  preparo: 'cozida em água' },
          { key: 'iogurte_natural_desnatado',  g: 150, preparo: null },
          { key: 'banana_prata',               g: 100, preparo: 'fatiada' },
          { key: 'linhaca_dourada_moida',      g: 10,  preparo: 'misturada' }
        ],
        totais: { kcal: 337, cho: 59, ptn: 16, lip: 6, fib: 8.5, na: 90 },
        nota_clinica: 'Potássio da banana (358mg) + magnésio da linhaça = dupla ação anti-hipertensiva.'
      },
      {
        opcao: 2, nome: 'Omelete de claras com vegetais (sem sal)',
        descricao: 'Sem sódio adicionado. Rico em potássio e cálcio.',
        alimentos: [
          { key: 'ovo_inteiro_cozido',         g: 120, preparo: 'omelete s/ sal' },
          { key: 'espinafre_cozido',           g: 60,  preparo: 'refogado s/ sal' },
          { key: 'tomate_cru',                 g: 80,  preparo: 'fatiado' },
          { key: 'queijo_cottage',             g: 40,  preparo: 'cottage baixo sódio' },
          { key: 'azeite_oliva',               g: 5,   preparo: null }
        ],
        totais: { kcal: 319, cho: 8, ptn: 28, lip: 19, fib: 1.9, na: 414 },
        nota_clinica: 'Atenção: cottage tem sódio. Escolher versão sem sal adicionado se disponível.'
      }
    ],

    lanche_manha: [
      {
        opcao: 1, nome: 'Kiwi + iogurte desnatado',
        alimentos: [
          { key: 'kiwi',                       g: 100, preparo: null },
          { key: 'iogurte_natural_desnatado',  g: 100, preparo: null }
        ],
        totais: { kcal: 117, cho: 22, ptn: 6, lip: 0.5, fib: 3.0, na: 75 },
        nota_clinica: 'Kiwi: potássio (312mg) + vitamina C (93mg) + fibra. Excelente para DASH.'
      },
      {
        opcao: 2, nome: 'Abacate amassado com limão',
        alimentos: [
          { key: 'abacate',                    g: 100, preparo: 'amassado com limão' },
          { key: 'tomate_cru',                 g: 60,  preparo: 'picado' }
        ],
        totais: { kcal: 105, cho: 9, ptn: 2, lip: 9, fib: 7.5, na: 7 },
        nota_clinica: 'Abacate: potássio 485mg/100g + gordura boa + fibra. Sem sódio adicionado.'
      }
    ],

    almoco: [
      {
        opcao: 1, nome: 'Salmão assado com batata-doce e brócolis',
        descricao: 'Ômega-3 + potássio + magnésio — protocolo DASH completo',
        alimentos: [
          { key: 'salmon_grelhado',            g: 130, preparo: 'assado s/ sal, com ervas' },
          { key: 'batata_doce_cozida',         g: 120, preparo: 'assada com casca' },
          { key: 'brocolis_cozido',            g: 100, preparo: 'no vapor' },
          { key: 'espinafre_cozido',           g: 60,  preparo: 'refogado s/ sal' },
          { key: 'azeite_oliva',               g: 7,   preparo: null }
        ],
        totais: { kcal: 487, cho: 29, ptn: 33, lip: 24, fib: 7.1, na: 152 },
        nota_clinica: 'Potássio total ~870mg. Ômega-3 2.9g. Sódio 152mg = dentro do limite DASH.'
      },
      {
        opcao: 2, nome: 'Frango com lentilha e beterraba assada',
        descricao: 'Nitrato da beterraba reduz PA sistólica 4–8 mmHg',
        alimentos: [
          { key: 'frango_peito_grelhado',      g: 120, preparo: 's/ sal, com ervas' },
          { key: 'lentilha_cozida',            g: 100, preparo: 'com cúrcuma' },
          { key: 'beterraba_cozida',           g: 100, preparo: 'assada ou cozida' },
          { key: 'espinafre_cozido',           g: 80,  preparo: 'refogado' },
          { key: 'azeite_oliva',               g: 7,   preparo: null }
        ],
        totais: { kcal: 437, cho: 38, ptn: 48, lip: 11, fib: 13.4, na: 185 },
        nota_clinica: 'Nitrato da beterraba convertido em NO (óxido nítrico) → vasodilatação ativa.'
      }
    ],

    lanche_tarde: [
      {
        opcao: 1, nome: 'Banana com nozes',
        alimentos: [
          { key: 'banana_prata',               g: 100, preparo: null },
          { key: 'nozes',                      g: 15,  preparo: null }
        ],
        totais: { kcal: 185, cho: 25, ptn: 3, lip: 9, fib: 2.9, na: 2 },
        nota_clinica: 'Potássio total ~424mg. Magnésio ~51mg. Ômega-3 1.4g. Perfeito para DASH.'
      },
      {
        opcao: 2, nome: 'Iogurte desnatado com kiwi e chia',
        alimentos: [
          { key: 'iogurte_natural_desnatado',  g: 120, preparo: null },
          { key: 'kiwi',                       g: 80,  preparo: null },
          { key: 'chia_semente',               g: 8,   preparo: null }
        ],
        totais: { kcal: 156, cho: 24, ptn: 9, lip: 3, fib: 5.3, na: 91 }
      }
    ],

    jantar: [
      {
        opcao: 1, nome: 'Sardinha assada com arroz integral e salada verde',
        alimentos: [
          { key: 'sardinha_lata',              g: 80,  preparo: 'escorrida, assada s/ sal' },
          { key: 'arroz_integral_cozido',      g: 80,  preparo: null },
          { key: 'espinafre_cozido',           g: 80,  preparo: 'refogado' },
          { key: 'tomate_cru',                 g: 60,  preparo: null },
          { key: 'azeite_oliva',               g: 7,   preparo: null }
        ],
        totais: { kcal: 376, cho: 29, ptn: 28, lip: 17, fib: 5.0, na: 475 },
        nota_clinica: 'Sardinha tem sódio elevado — usar escorrida e sem tempero extra. Ômega-3 1.2g.'
      },
      {
        opcao: 2, nome: 'Sopa de legumes com frango (sem sal adicionado)',
        alimentos: [
          { key: 'frango_peito_grelhado',      g: 100, preparo: 'desfiado' },
          { key: 'batata_doce_cozida',         g: 80,  preparo: 'cubos' },
          { key: 'cenoura_crua',               g: 80,  preparo: 'cozida' },
          { key: 'chuchu_cozido',              g: 80,  preparo: null },
          { key: 'espinafre_cozido',           g: 40,  preparo: null },
          { key: 'azeite_oliva',               g: 5,   preparo: 'finalização' }
        ],
        totais: { kcal: 326, cho: 30, ptn: 34, lip: 8, fib: 5.5, na: 103 },
        nota_clinica: 'Sem sal adicionado. Potássio total ~700mg. Jantar com sódio baixíssimo (103mg).'
      }
    ],

    ceia: [
      {
        opcao: 1, nome: 'Leite desnatado morno com cacau 100%',
        alimentos: [
          { key: 'leite_desnatado',            g: 200, preparo: 'morno' },
          { key: 'cacau_po_sem_acucar',        g: 5,   preparo: 'misturado' }
        ],
        totais: { kcal: 82, cho: 11, ptn: 8, lip: 0.9, fib: 1.7, na: 117 },
        nota_clinica: 'Flavonoides do cacau reduzem PA 2–4 mmHg em uso regular. Cálcio do leite ação DASH.'
      },
      {
        opcao: 2, nome: 'Banana amassada com chia',
        alimentos: [
          { key: 'banana_prata',               g: 80,  preparo: 'pequena' },
          { key: 'chia_semente',               g: 8,   preparo: 'hidratada' }
        ],
        totais: { kcal: 113, cho: 22, ptn: 3, lip: 3, fib: 5.7, na: 2 }
      }
    ]
  },

  // ─── SOP ────────────────────────────────────────────────────
  sop: {

    cafe_manha: [
      {
        opcao: 1, nome: 'Bowl anti-inflamatório de aveia com linhaça e frutas vermelhas',
        descricao: 'Lignanas da linhaça + antioxidantes das frutas + beta-glucana',
        alimentos: [
          { key: 'aveia_flocos',               g: 40,  preparo: 'cozida' },
          { key: 'iogurte_grego_natural',      g: 100, preparo: null },
          { key: 'linhaca_dourada_moida',      g: 10,  preparo: 'moída' },
          { key: 'morango',                    g: 80,  preparo: null },
          { key: 'mirtilo',                    g: 40,  preparo: null },
          { key: 'canela_po',                  g: 1,   preparo: null }
        ],
        totais: { kcal: 349, cho: 50, ptn: 18, lip: 10, fib: 9.8, na: 55 },
        nota_clinica: 'Lignanas da linhaça modulam receptor de estrógeno. Mirtilo reduz marcadores inflamatórios (IL-6, PCR).'
      },
      {
        opcao: 2, nome: 'Omelete com salmão defumado e espinafre',
        descricao: 'Ômega-3 logo pela manhã + proteína completa',
        alimentos: [
          { key: 'ovo_inteiro_cozido',         g: 120, preparo: 'omelete' },
          { key: 'espinafre_cozido',           g: 60,  preparo: 'refogado' },
          { key: 'tomate_cru',                 g: 60,  preparo: null },
          { key: 'azeite_oliva',               g: 5,   preparo: null },
          { key: 'pao_integral',               g: 25,  preparo: '1/2 fatia' }
        ],
        totais: { kcal: 327, cho: 16, ptn: 23, lip: 19, fib: 3.0, na: 443 }
      }
    ],

    lanche_manha: [
      {
        opcao: 1, nome: 'Mix de nozes com morango',
        alimentos: [
          { key: 'nozes',                      g: 15,  preparo: null },
          { key: 'morango',                    g: 100, preparo: null }
        ],
        totais: { kcal: 123, cho: 10, ptn: 3, lip: 9, fib: 3.6, na: 3 },
        nota_clinica: 'Ômega-3 das nozes (1.4g) + antioxidantes do morango. Ação anti-inflamatória dupla.'
      },
      {
        opcao: 2, nome: 'Iogurte grego com chia e canela',
        alimentos: [
          { key: 'iogurte_grego_natural',      g: 120, preparo: null },
          { key: 'chia_semente',               g: 10,  preparo: 'hidratada' },
          { key: 'canela_po',                  g: 1,   preparo: null }
        ],
        totais: { kcal: 170, cho: 9, ptn: 12, lip: 9, fib: 3.4, na: 57 }
      }
    ],

    almoco: [
      {
        opcao: 1, nome: 'Salmão grelhado com quinoa e vegetais anti-inflamatórios',
        alimentos: [
          { key: 'salmon_grelhado',            g: 130, preparo: 'com gengibre e limão' },
          { key: 'quinoa_cozida',              g: 80,  preparo: null },
          { key: 'brocolis_cozido',            g: 100, preparo: 'no vapor' },
          { key: 'espinafre_cozido',           g: 60,  preparo: 'refogado' },
          { key: 'azeite_oliva',               g: 7,   preparo: null }
        ],
        totais: { kcal: 497, cho: 26, ptn: 39, lip: 26, fib: 5.8, na: 124 },
        nota_clinica: 'Ômega-3 2.9g (acima da meta mínima de 2g/dia). Cúrcuma e gengibre como temperos potencializam ação anti-inflamatória.'
      },
      {
        opcao: 2, nome: 'Frango com lentilha, couve e cenoura',
        alimentos: [
          { key: 'frango_peito_grelhado',      g: 120, preparo: null },
          { key: 'lentilha_cozida',            g: 100, preparo: 'c/ cúrcuma' },
          { key: 'couve_refogada',             g: 80,  preparo: null },
          { key: 'cenoura_crua',               g: 60,  preparo: 'ralada' },
          { key: 'linhaca_dourada_moida',      g: 8,   preparo: 'polvilhada' },
          { key: 'azeite_oliva',               g: 7,   preparo: null }
        ],
        totais: { kcal: 447, cho: 34, ptn: 49, lip: 13, fib: 16.3, na: 121 }
      }
    ],

    lanche_tarde: [
      {
        opcao: 1, nome: 'Maçã com pasta de amendoim e canela',
        alimentos: [
          { key: 'maca_vermelha',              g: 120, preparo: 'com casca' },
          { key: 'pasta_amendoim_natural',      g: 15,  preparo: null },
          { key: 'canela_po',                  g: 1,   preparo: null }
        ],
        totais: { kcal: 155, cho: 21, ptn: 5, lip: 8, fib: 4.4, na: 8 }
      },
      {
        opcao: 2, nome: 'Iogurte grego com mirtilo e nozes',
        alimentos: [
          { key: 'iogurte_grego_natural',      g: 100, preparo: null },
          { key: 'mirtilo',                    g: 60,  preparo: null },
          { key: 'nozes',                      g: 10,  preparo: null }
        ],
        totais: { kcal: 193, cho: 14, ptn: 11, lip: 11, fib: 3.1, na: 49 }
      }
    ],

    jantar: [
      {
        opcao: 1, nome: 'Peixe assado com batata-doce e brócolis',
        alimentos: [
          { key: 'salmon_grelhado',            g: 100, preparo: 'assado com ervas' },
          { key: 'batata_doce_cozida',         g: 100, preparo: 'assada' },
          { key: 'brocolis_cozido',            g: 100, preparo: 'no vapor' },
          { key: 'azeite_oliva',               g: 7,   preparo: null }
        ],
        totais: { kcal: 375, cho: 24, ptn: 25, lip: 21, fib: 4.9, na: 123 }
      },
      {
        opcao: 2, nome: 'Bowl de tofu grelhado com lentilha e vegetais',
        alimentos: [
          { key: 'tofu_firme',                 g: 150, preparo: 'grelhado com shoyu ligth' },
          { key: 'lentilha_cozida',            g: 80,  preparo: null },
          { key: 'espinafre_cozido',           g: 80,  preparo: null },
          { key: 'cenoura_crua',               g: 60,  preparo: 'ralada' },
          { key: 'azeite_oliva',               g: 7,   preparo: null }
        ],
        totais: { kcal: 356, cho: 28, ptn: 24, lip: 15, fib: 10.5, na: 129 },
        nota_clinica: 'Isoflavonas do tofu modulam receptores estrogênicos. Ferro da lentilha + vitamina C do espinafre.'
      }
    ],

    ceia: [
      {
        opcao: 1, nome: 'Chá de menta-verde + castanha-do-pará',
        alimentos: [
          { key: 'castanha_do_para',           g: 10,  preparo: '2 unidades' }
        ],
        totais: { kcal: 66, cho: 1, ptn: 1, lip: 6, fib: 0.8, na: 0 },
        nota_clinica: 'Chá de menta-verde (Mentha spicata) demonstrou reduzir androgênios livres em mulheres com SOP. Selênio da castanha apoia função tireoidiana.'
      },
      {
        opcao: 2, nome: 'Leite desnatado com canela e cacau',
        alimentos: [
          { key: 'leite_desnatado',            g: 200, preparo: 'morno' },
          { key: 'cacau_po_sem_acucar',        g: 5,   preparo: null },
          { key: 'canela_po',                  g: 1,   preparo: null }
        ],
        totais: { kcal: 84, cho: 11, ptn: 8, lip: 1.1, fib: 2.2, na: 106 }
      }
    ]
  },

  // ─── HIPERTROFIA ────────────────────────────────────────────
  hipertrofia: {

    cafe_manha: [
      {
        opcao: 1, nome: 'Omelete de 3 ovos com aveia e banana',
        descricao: 'Proteína completa + carboidrato de qualidade + primeira janela anabólica',
        alimentos: [
          { key: 'ovo_inteiro_cozido',         g: 180, preparo: 'omelete — 3 ovos' },
          { key: 'aveia_flocos',               g: 50,  preparo: 'porridge' },
          { key: 'banana_prata',               g: 100, preparo: null },
          { key: 'iogurte_grego_natural',      g: 100, preparo: null },
          { key: 'azeite_oliva',               g: 5,   preparo: 'para grelhar' }
        ],
        totais: { kcal: 581, cho: 57, ptn: 36, lip: 22, fib: 6.5, na: 290 },
        nota_clinica: 'Leucina dos ovos + proteína do iogurte ativa mTOR. Banana: energia imediata sem pico glicêmico excessivo.'
      },
      {
        opcao: 2, nome: 'Bowl proteico com iogurte grego, granola de aveia e frutas',
        alimentos: [
          { key: 'iogurte_grego_natural',      g: 200, preparo: null },
          { key: 'aveia_flocos',               g: 50,  preparo: 'tostada — granola caseira' },
          { key: 'amendoas',                   g: 20,  preparo: 'picadas' },
          { key: 'banana_prata',               g: 80,  preparo: 'fatiada' },
          { key: 'morango',                    g: 60,  preparo: null }
        ],
        totais: { kcal: 570, cho: 60, ptn: 30, lip: 23, fib: 10.1, na: 108 }
      }
    ],

    lanche_manha: [
      {
        opcao: 1, nome: 'Sanduíche integral com frango e cottage',
        alimentos: [
          { key: 'pao_integral',               g: 60,  preparo: '2 fatias' },
          { key: 'frango_peito_grelhado',      g: 80,  preparo: 'desfiado' },
          { key: 'queijo_cottage',             g: 60,  preparo: null },
          { key: 'tomate_cru',                 g: 60,  preparo: null }
        ],
        totais: { kcal: 352, cho: 36, ptn: 37, lip: 7, fib: 5.3, na: 671 },
        nota_clinica: 'Refeição pré-treino ideal se treino for após 1h. Carboidrato + proteína = substrato anabólico.'
      },
      {
        opcao: 2, nome: 'Arroz integral com atum',
        alimentos: [
          { key: 'arroz_integral_cozido',      g: 120, preparo: null },
          { key: 'atum_agua',                  g: 100, preparo: 'escorrido' },
          { key: 'azeite_oliva',               g: 5,   preparo: null }
        ],
        totais: { kcal: 305, cho: 31, ptn: 27, lip: 5, fib: 2.0, na: 400 }
      }
    ],

    almoco: [
      {
        opcao: 1, nome: 'Frango grelhado com arroz integral, feijão e salada',
        descricao: 'Refeição âncora do dia para hipertrofia',
        alimentos: [
          { key: 'frango_peito_grelhado',      g: 180, preparo: null },
          { key: 'arroz_integral_cozido',      g: 120, preparo: null },
          { key: 'feijao_carioca_cozido',      g: 100, preparo: null },
          { key: 'brocolis_cozido',            g: 80,  preparo: null },
          { key: 'cenoura_crua',               g: 60,  preparo: null },
          { key: 'azeite_oliva',               g: 10,  preparo: null }
        ],
        totais: { kcal: 625, cho: 64, ptn: 66, lip: 15, fib: 13.5, na: 165 },
        nota_clinica: '66g de proteína nesta refeição. Feijão + arroz = proteína vegetal complementar (aminoácidos essenciais completos).'
      },
      {
        opcao: 2, nome: 'Salmão com batata-doce, quinoa e espinafre',
        alimentos: [
          { key: 'salmon_grelhado',            g: 150, preparo: null },
          { key: 'batata_doce_cozida',         g: 150, preparo: null },
          { key: 'quinoa_cozida',              g: 80,  preparo: null },
          { key: 'espinafre_cozido',           g: 80,  preparo: null },
          { key: 'azeite_oliva',               g: 7,   preparo: null }
        ],
        totais: { kcal: 567, cho: 52, ptn: 42, lip: 24, fib: 6.7, na: 152 }
      }
    ],

    lanche_tarde: [
      {
        opcao: 1, nome: 'Iogurte grego com banana e amendoas (pré ou pós-treino)',
        alimentos: [
          { key: 'iogurte_grego_natural',      g: 200, preparo: null },
          { key: 'banana_prata',               g: 100, preparo: null },
          { key: 'amendoas',                   g: 20,  preparo: null }
        ],
        totais: { kcal: 418, cho: 40, ptn: 22, lip: 20, fib: 4.5, na: 98 },
        nota_clinica: 'Pós-treino: carboidrato da banana repõe glicogênio + proteína do iogurte inicia recuperação.'
      },
      {
        opcao: 2, nome: 'Arroz integral com ovo e abacate',
        alimentos: [
          { key: 'arroz_integral_cozido',      g: 100, preparo: null },
          { key: 'ovo_inteiro_cozido',         g: 120, preparo: 'estrelado' },
          { key: 'abacate',                    g: 60,  preparo: null }
        ],
        totais: { kcal: 369, cho: 30, ptn: 17, lip: 21, fib: 5.8, na: 141 }
      }
    ],

    jantar: [
      {
        opcao: 1, nome: 'Carne bovina magra com batata-doce e salada',
        alimentos: [
          { key: 'carne_patinho_grelhado',     g: 160, preparo: null },
          { key: 'batata_doce_cozida',         g: 150, preparo: null },
          { key: 'brocolis_cozido',            g: 100, preparo: null },
          { key: 'tomate_cru',                 g: 60,  preparo: null },
          { key: 'azeite_oliva',               g: 7,   preparo: null }
        ],
        totais: { kcal: 543, cho: 33, ptn: 52, lip: 22, fib: 5.9, na: 153 },
        nota_clinica: 'Ferro hêmico da carne suporte síntese de hemoglobina e oxigenação muscular.'
      },
      {
        opcao: 2, nome: 'Frango com macarrão integral e vegetais',
        alimentos: [
          { key: 'frango_peito_grelhado',      g: 150, preparo: null },
          { key: 'macarrao_integral_cozido',   g: 120, preparo: null },
          { key: 'tomate_cru',                 g: 80,  preparo: 'molho caseiro' },
          { key: 'espinafre_cozido',           g: 60,  preparo: null },
          { key: 'azeite_oliva',               g: 7,   preparo: null }
        ],
        totais: { kcal: 504, cho: 47, ptn: 52, lip: 12, fib: 6.0, na: 182 }
      }
    ],

    ceia: [
      {
        opcao: 1, nome: 'Iogurte grego com pasta de amendoim (caseína noturna)',
        alimentos: [
          { key: 'iogurte_grego_natural',      g: 150, preparo: null },
          { key: 'pasta_amendoim_natural',      g: 15,  preparo: null }
        ],
        totais: { kcal: 235, cho: 11, ptn: 18, lip: 15, fib: 0.9, na: 84 },
        nota_clinica: 'Proteína do iogurte (caseína) é de digestão lenta — ideal para síntese proteica noturna.'
      },
      {
        opcao: 2, nome: 'Queijo cottage com nozes',
        alimentos: [
          { key: 'queijo_cottage',             g: 120, preparo: null },
          { key: 'nozes',                      g: 15,  preparo: null }
        ],
        totais: { kcal: 210, cho: 6, ptn: 16, lip: 15, fib: 1.0, na: 449 }
      }
    ]
  }
};

// ── SUBSTITUIÇÕES ALIMENTARES ──────────────────────────────────
// Formato: { foodKey: [{ subKey, g, observacao, protocolos }] }
export const SUBSTITUTIONS = {
  arroz_branco_cozido:    [
    { subKey: 'arroz_integral_cozido',  g_ref: 100, g_sub: 100, obs: 'Mesma gramagem. IG reduz de 72 → 50. Sempre preferir.', protocolos: [] },
    { subKey: 'quinoa_cozida',          g_ref: 100, g_sub: 100, obs: 'Mais proteína e aminoácidos completos.',               protocolos: [] },
    { subKey: 'lentilha_cozida',        g_ref: 100, g_sub: 100, obs: 'IG 25 — ideal para diabetes e SOP.',                  protocolos: ['diabetes_ri','sop'] }
  ],
  frango_peito_grelhado: [
    { subKey: 'atum_agua',              g_ref: 100, g_sub: 85,  obs: 'Atenção ao sódio elevado do atum em conserva.',       protocolos: [] },
    { subKey: 'tofu_firme',             g_ref: 100, g_sub: 150, obs: 'Opção vegetariana. Adicionar nutritional yeast.',      protocolos: ['sop','dislipidemia'] },
    { subKey: 'carne_patinho_grelhado', g_ref: 100, g_sub: 100, obs: 'Equivalente. Mais ferro, mais gordura saturada.',     protocolos: [] },
    { subKey: 'salmon_grelhado',        g_ref: 100, g_sub: 100, obs: 'Proteína equivalente + ômega-3 bônus.',               protocolos: [] }
  ],
  aveia_flocos: [
    { subKey: 'quinoa_cozida',          g_ref: 40,  g_sub: 80,  obs: 'Dobrar a gramagem (quinoa cozida vs aveia seca).',    protocolos: [] },
    { subKey: 'feijao_carioca_cozido',  g_ref: 40,  g_sub: 80,  obs: 'Para quem não tolera glúten.',                       protocolos: ['diabetes_ri'] }
  ],
  iogurte_grego_natural: [
    { subKey: 'iogurte_natural_desnatado', g_ref: 100, g_sub: 130, obs: 'Menos proteína. Aumentar 30% na gramagem.',        protocolos: [] },
    { subKey: 'queijo_cottage',         g_ref: 100, g_sub: 100, obs: 'Proteína equivalente. Mais sódio.',                  protocolos: [] }
  ],
  batata_doce_cozida: [
    { subKey: 'arroz_integral_cozido',  g_ref: 100, g_sub: 80,  obs: 'Menos fibra, mais carbo. Funciona como troca.',      protocolos: [] },
    { subKey: 'quinoa_cozida',          g_ref: 100, g_sub: 80,  obs: 'Mais proteína, menos carboidrato.',                  protocolos: ['diabetes_ri','sop'] },
    { subKey: 'lentilha_cozida',        g_ref: 100, g_sub: 100, obs: 'IG muito mais baixo. Adiciona fibra e proteína.',    protocolos: ['diabetes_ri','sop'] }
  ],
  salmon_grelhado: [
    { subKey: 'sardinha_lata',          g_ref: 100, g_sub: 80,  obs: 'Ômega-3 similar. Atenção ao sódio da sardinha.',     protocolos: [] },
    { subKey: 'atum_agua',              g_ref: 100, g_sub: 100, obs: 'Menos ômega-3. Mais proteína por caloria.',          protocolos: [] }
  ],
  amendoas: [
    { subKey: 'nozes',                  g_ref: 20,  g_sub: 20,  obs: 'Mais ômega-3 (nozes). Troca sem restrição.',         protocolos: [] },
    { subKey: 'castanha_do_para',       g_ref: 20,  g_sub: 10,  obs: 'Metade da gramagem — muito mais calórica.',          protocolos: [] }
  ]
};
