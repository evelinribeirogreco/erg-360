// ============================================================
// ERG 360 — Catálogo de Refeições Prontas
// Templates editáveis para acelerar montagem de planos alimentares.
// Cada refeição pode ser ajustada depois de importada.
// ============================================================

export const REFEICOES_PRONTAS = [

  // ── CAFÉ DA MANHÃ ──────────────────────────────────────────
  {
    id: 'cafe_simples_lc',
    tipo: 'cafe_manha',
    nome: 'Café simples (low carb)',
    descricao: 'Para quem acorda com pouca fome — alta saciedade',
    horario: '07h00',
    alimentos: [
      { nome: 'Café preto sem açúcar', qty: '1 xícara' },
      { nome: 'Ovos mexidos', qty: '2 unidades' },
      { nome: 'Queijo branco', qty: '40g' },
    ],
    macros: { kcal: 280, ptn: 22, cho: 3, lip: 19, fibras: 0 },
    perfil: ['emagrecimento', 'low_carb', 'manutencao'],
  },
  {
    id: 'cafe_completo_classico',
    tipo: 'cafe_manha',
    nome: 'Café completo clássico',
    descricao: 'Café equilibrado com proteína, carboidrato complexo e fruta',
    horario: '07h00',
    alimentos: [
      { nome: 'Pão integral', qty: '2 fatias' },
      { nome: 'Ovos mexidos', qty: '2 unidades' },
      { nome: 'Queijo branco', qty: '30g' },
      { nome: 'Mamão', qty: '100g' },
      { nome: 'Café preto sem açúcar', qty: '1 xícara' },
    ],
    macros: { kcal: 420, ptn: 25, cho: 42, lip: 16, fibras: 6 },
    perfil: ['manutencao', 'reeducacao', 'ganho_massa'],
  },
  {
    id: 'cafe_aveia_fruta',
    tipo: 'cafe_manha',
    nome: 'Mingau de aveia com fruta',
    descricao: 'Carboidrato de baixo IG + fibras + gorduras boas',
    horario: '07h00',
    alimentos: [
      { nome: 'Aveia em flocos', qty: '40g' },
      { nome: 'Leite desnatado', qty: '200ml' },
      { nome: 'Banana', qty: '1 unidade' },
      { nome: 'Pasta de amendoim integral', qty: '1 colher de sopa' },
      { nome: 'Canela', qty: 'a gosto' },
    ],
    macros: { kcal: 380, ptn: 14, cho: 58, lip: 11, fibras: 7 },
    perfil: ['emagrecimento', 'manutencao', 'pre_treino'],
  },
  {
    id: 'cafe_iogurte_proteico',
    tipo: 'cafe_manha',
    nome: 'Iogurte proteico com granola',
    descricao: 'Rápido, prático e proteico',
    horario: '07h00',
    alimentos: [
      { nome: 'Iogurte natural desnatado', qty: '170g' },
      { nome: 'Granola sem açúcar', qty: '30g' },
      { nome: 'Frutas vermelhas', qty: '50g' },
      { nome: 'Chia', qty: '1 colher de sopa' },
    ],
    macros: { kcal: 310, ptn: 18, cho: 38, lip: 9, fibras: 8 },
    perfil: ['manutencao', 'reeducacao', 'emagrecimento'],
  },
  {
    id: 'cafe_tapioca_proteica',
    tipo: 'cafe_manha',
    nome: 'Tapioca com frango e queijo',
    descricao: 'Versão proteica da tapioca tradicional',
    horario: '07h00',
    alimentos: [
      { nome: 'Goma de tapioca', qty: '40g' },
      { nome: 'Frango desfiado', qty: '50g' },
      { nome: 'Queijo branco', qty: '30g' },
      { nome: 'Café preto sem açúcar', qty: '1 xícara' },
    ],
    macros: { kcal: 350, ptn: 22, cho: 32, lip: 13, fibras: 1 },
    perfil: ['ganho_massa', 'manutencao'],
  },

  // ── LANCHE DA MANHÃ ────────────────────────────────────────
  {
    id: 'lanche_manha_fruta',
    tipo: 'lanche_manha',
    nome: 'Fruta com oleaginosa',
    descricao: 'Lanche leve, fibras + gorduras boas',
    horario: '10h00',
    alimentos: [
      { nome: 'Maçã', qty: '1 unidade' },
      { nome: 'Castanhas mistas', qty: '20g' },
    ],
    macros: { kcal: 200, ptn: 4, cho: 22, lip: 12, fibras: 4 },
    perfil: ['emagrecimento', 'manutencao', 'reeducacao'],
  },
  {
    id: 'lanche_manha_iogurte',
    tipo: 'lanche_manha',
    nome: 'Iogurte com chia',
    descricao: 'Proteína + ômega-3',
    horario: '10h00',
    alimentos: [
      { nome: 'Iogurte natural', qty: '170g' },
      { nome: 'Chia', qty: '1 colher de sopa' },
    ],
    macros: { kcal: 180, ptn: 12, cho: 18, lip: 7, fibras: 5 },
    perfil: ['manutencao', 'emagrecimento'],
  },
  {
    id: 'lanche_manha_proteico',
    tipo: 'lanche_manha',
    nome: 'Whey com fruta',
    descricao: 'Pré-treino ou lanche proteico',
    horario: '10h00',
    alimentos: [
      { nome: 'Whey protein', qty: '30g (1 scoop)' },
      { nome: 'Banana', qty: '1 unidade' },
      { nome: 'Água gelada', qty: '300ml' },
    ],
    macros: { kcal: 240, ptn: 26, cho: 28, lip: 2, fibras: 3 },
    perfil: ['hipertrofia', 'pre_treino', 'pos_treino'],
  },

  // ── ALMOÇO ─────────────────────────────────────────────────
  {
    id: 'almoco_classico_brasileiro',
    tipo: 'almoco',
    nome: 'Almoço clássico brasileiro',
    descricao: 'Arroz, feijão, proteína magra e salada',
    horario: '12h30',
    alimentos: [
      { nome: 'Arroz integral cozido', qty: '4 colheres de sopa (100g)' },
      { nome: 'Feijão carioca cozido', qty: '1 concha (80g)' },
      { nome: 'Patinho moído refogado', qty: '120g' },
      { nome: 'Alface', qty: 'à vontade' },
      { nome: 'Tomate', qty: '1/2 unidade' },
      { nome: 'Pepino', qty: '1/2 unidade' },
      { nome: 'Azeite extra virgem', qty: '1 colher de sopa' },
    ],
    macros: { kcal: 580, ptn: 38, cho: 62, lip: 18, fibras: 12 },
    perfil: ['manutencao', 'emagrecimento', 'reeducacao'],
  },
  {
    id: 'almoco_frango_salada',
    tipo: 'almoco',
    nome: 'Frango grelhado com salada e batata doce',
    descricao: 'Versão fitness — alta proteína, carbo complexo',
    horario: '12h30',
    alimentos: [
      { nome: 'Peito de frango grelhado', qty: '150g' },
      { nome: 'Batata doce assada', qty: '120g' },
      { nome: 'Brócolis no vapor', qty: '100g' },
      { nome: 'Mix de folhas verdes', qty: 'à vontade' },
      { nome: 'Tomate cereja', qty: '6 unidades' },
      { nome: 'Azeite extra virgem', qty: '1 colher de sopa' },
    ],
    macros: { kcal: 480, ptn: 42, cho: 38, lip: 14, fibras: 8 },
    perfil: ['hipertrofia', 'emagrecimento', 'performance'],
  },
  {
    id: 'almoco_peixe_legumes',
    tipo: 'almoco',
    nome: 'Salmão com legumes assados',
    descricao: 'Rico em ômega-3 e baixo IG',
    horario: '12h30',
    alimentos: [
      { nome: 'Filé de salmão grelhado', qty: '130g' },
      { nome: 'Quinoa cozida', qty: '4 colheres de sopa' },
      { nome: 'Abobrinha grelhada', qty: '100g' },
      { nome: 'Cenoura assada', qty: '80g' },
      { nome: 'Rúcula', qty: 'à vontade' },
      { nome: 'Limão', qty: 'a gosto' },
    ],
    macros: { kcal: 510, ptn: 35, cho: 42, lip: 22, fibras: 9 },
    perfil: ['manutencao', 'dislipidemia', 'reeducacao'],
  },
  {
    id: 'almoco_vegetariano',
    tipo: 'almoco',
    nome: 'Vegetariano completo',
    descricao: 'Combinação proteica vegetal — feijão + arroz',
    horario: '12h30',
    alimentos: [
      { nome: 'Arroz integral cozido', qty: '100g' },
      { nome: 'Feijão preto cozido', qty: '100g' },
      { nome: 'Tofu grelhado', qty: '100g' },
      { nome: 'Couve refogada', qty: '80g' },
      { nome: 'Cenoura ralada', qty: '50g' },
      { nome: 'Azeite extra virgem', qty: '1 colher de sopa' },
    ],
    macros: { kcal: 540, ptn: 28, cho: 70, lip: 16, fibras: 16 },
    perfil: ['vegetariano', 'manutencao'],
  },
  {
    id: 'almoco_low_carb',
    tipo: 'almoco',
    nome: 'Low carb — proteína + salada',
    descricao: 'Sem cereais, foco em proteína e gorduras boas',
    horario: '12h30',
    alimentos: [
      { nome: 'Filé mignon grelhado', qty: '150g' },
      { nome: 'Mix de folhas verdes', qty: 'à vontade' },
      { nome: 'Abacate', qty: '1/2 unidade' },
      { nome: 'Tomate cereja', qty: '8 unidades' },
      { nome: 'Pepino', qty: '1 unidade' },
      { nome: 'Azeite extra virgem', qty: '1 colher de sopa' },
    ],
    macros: { kcal: 510, ptn: 38, cho: 14, lip: 35, fibras: 9 },
    perfil: ['low_carb', 'emagrecimento'],
  },

  // ── LANCHE DA TARDE ────────────────────────────────────────
  {
    id: 'lanche_tarde_classico',
    tipo: 'lanche_tarde',
    nome: 'Pão integral com queijo e fruta',
    descricao: 'Lanche balanceado',
    horario: '15h30',
    alimentos: [
      { nome: 'Pão integral', qty: '1 fatia' },
      { nome: 'Queijo branco', qty: '30g' },
      { nome: 'Maçã', qty: '1 unidade' },
      { nome: 'Chá verde sem açúcar', qty: '1 xícara' },
    ],
    macros: { kcal: 240, ptn: 12, cho: 30, lip: 7, fibras: 5 },
    perfil: ['manutencao', 'reeducacao'],
  },
  {
    id: 'lanche_tarde_proteico',
    tipo: 'lanche_tarde',
    nome: 'Iogurte com whey e frutas',
    descricao: 'Alta proteína para hipertrofia/cutting',
    horario: '15h30',
    alimentos: [
      { nome: 'Iogurte natural desnatado', qty: '170g' },
      { nome: 'Whey protein', qty: '15g (1/2 scoop)' },
      { nome: 'Frutas vermelhas', qty: '60g' },
      { nome: 'Granola sem açúcar', qty: '20g' },
    ],
    macros: { kcal: 310, ptn: 25, cho: 32, lip: 6, fibras: 5 },
    perfil: ['hipertrofia', 'emagrecimento'],
  },
  {
    id: 'lanche_tarde_low_carb',
    tipo: 'lanche_tarde',
    nome: 'Ovos cozidos com castanhas',
    descricao: 'Low carb — saciante',
    horario: '15h30',
    alimentos: [
      { nome: 'Ovos cozidos', qty: '2 unidades' },
      { nome: 'Castanhas mistas', qty: '20g' },
      { nome: 'Café preto sem açúcar', qty: '1 xícara' },
    ],
    macros: { kcal: 280, ptn: 18, cho: 4, lip: 22, fibras: 2 },
    perfil: ['low_carb', 'emagrecimento'],
  },

  // ── JANTAR ─────────────────────────────────────────────────
  {
    id: 'jantar_leve_sopa',
    tipo: 'jantar',
    nome: 'Sopa de legumes com frango',
    descricao: 'Jantar leve, fácil digestão',
    horario: '19h30',
    alimentos: [
      { nome: 'Frango desfiado', qty: '100g' },
      { nome: 'Cenoura', qty: '1 unidade' },
      { nome: 'Abobrinha', qty: '1 unidade' },
      { nome: 'Mandioquinha', qty: '80g' },
      { nome: 'Tempero verde (cebolinha, salsa)', qty: 'a gosto' },
      { nome: 'Azeite extra virgem', qty: '1 colher de sopa' },
    ],
    macros: { kcal: 320, ptn: 26, cho: 26, lip: 11, fibras: 6 },
    perfil: ['manutencao', 'reeducacao', 'gastrite'],
  },
  {
    id: 'jantar_omelete',
    tipo: 'jantar',
    nome: 'Omelete com salada',
    descricao: 'Prática, alta proteína, low carb',
    horario: '19h30',
    alimentos: [
      { nome: 'Ovos', qty: '3 unidades' },
      { nome: 'Queijo branco', qty: '30g' },
      { nome: 'Tomate', qty: '1/2 unidade' },
      { nome: 'Cebola', qty: 'a gosto' },
      { nome: 'Mix de folhas verdes', qty: 'à vontade' },
      { nome: 'Azeite extra virgem', qty: '1 colher de sopa' },
    ],
    macros: { kcal: 360, ptn: 26, cho: 8, lip: 26, fibras: 4 },
    perfil: ['low_carb', 'emagrecimento'],
  },
  {
    id: 'jantar_repetido_almoco',
    tipo: 'jantar',
    nome: 'Repetir almoço (porção menor)',
    descricao: 'Mesma estrutura do almoço, porção 30% menor',
    horario: '19h30',
    alimentos: [
      { nome: 'Arroz integral cozido', qty: '70g' },
      { nome: 'Feijão cozido', qty: '60g' },
      { nome: 'Frango grelhado', qty: '100g' },
      { nome: 'Salada verde', qty: 'à vontade' },
      { nome: 'Azeite extra virgem', qty: '1 colher de sopa' },
    ],
    macros: { kcal: 420, ptn: 32, cho: 44, lip: 12, fibras: 9 },
    perfil: ['manutencao', 'reeducacao'],
  },
  {
    id: 'jantar_peixe_legumes',
    tipo: 'jantar',
    nome: 'Tilápia grelhada com legumes',
    descricao: 'Jantar leve e proteico',
    horario: '19h30',
    alimentos: [
      { nome: 'Filé de tilápia grelhado', qty: '150g' },
      { nome: 'Brócolis no vapor', qty: '100g' },
      { nome: 'Cenoura cozida', qty: '80g' },
      { nome: 'Abobrinha grelhada', qty: '80g' },
      { nome: 'Limão', qty: 'a gosto' },
      { nome: 'Azeite extra virgem', qty: '1 colher de sopa' },
    ],
    macros: { kcal: 320, ptn: 35, cho: 16, lip: 13, fibras: 7 },
    perfil: ['emagrecimento', 'manutencao', 'dislipidemia'],
  },

  // ── CEIA ───────────────────────────────────────────────────
  {
    id: 'ceia_leite_morno',
    tipo: 'ceia',
    nome: 'Leite morno com canela',
    descricao: 'Indutor natural do sono (triptofano)',
    horario: '22h00',
    alimentos: [
      { nome: 'Leite desnatado', qty: '200ml' },
      { nome: 'Canela em pó', qty: 'a gosto' },
    ],
    macros: { kcal: 90, ptn: 7, cho: 10, lip: 0, fibras: 0 },
    perfil: ['manutencao', 'insonia'],
  },
  {
    id: 'ceia_iogurte_chia',
    tipo: 'ceia',
    nome: 'Iogurte com chia',
    descricao: 'Caseína de absorção lenta + ômega-3',
    horario: '22h00',
    alimentos: [
      { nome: 'Iogurte natural desnatado', qty: '170g' },
      { nome: 'Chia', qty: '1 colher de sopa' },
    ],
    macros: { kcal: 140, ptn: 12, cho: 14, lip: 5, fibras: 5 },
    perfil: ['manutencao', 'hipertrofia'],
  },
  {
    id: 'ceia_cha_castanhas',
    tipo: 'ceia',
    nome: 'Chá calmante com castanhas',
    descricao: 'Para quem quer comer pouco antes de dormir',
    horario: '22h00',
    alimentos: [
      { nome: 'Chá de camomila ou erva-cidreira', qty: '1 xícara' },
      { nome: 'Castanhas mistas', qty: '15g' },
    ],
    macros: { kcal: 100, ptn: 3, cho: 4, lip: 9, fibras: 1 },
    perfil: ['emagrecimento', 'low_carb', 'insonia'],
  },

];

// Mapeamento tipo → label visual
export const TIPOS_REFEICAO_LABEL = {
  cafe_manha:   '🌅 Café da manhã',
  lanche_manha: '☕ Lanche da manhã',
  almoco:       '🍽 Almoço',
  lanche_tarde: '🍎 Lanche da tarde',
  jantar:       '🌙 Jantar',
  ceia:         '🌃 Ceia',
};

// Filtra por tipo + perfil opcional
export function filtrarRefeicoes({ tipo, perfil } = {}) {
  return REFEICOES_PRONTAS.filter(r => {
    if (tipo && r.tipo !== tipo) return false;
    if (perfil && !r.perfil.includes(perfil)) return false;
    return true;
  });
}

// Total de refeições por tipo (pra estatísticas)
export function contarPorTipo() {
  const cont = {};
  for (const r of REFEICOES_PRONTAS) {
    cont[r.tipo] = (cont[r.tipo] || 0) + 1;
  }
  return cont;
}
