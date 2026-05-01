-- ================================================================
-- ERG 360 — Seed de micronutrientes nos alimentos
-- Popula a coluna `micronutrientes` (jsonb) com valores médios TACO/USDA
-- por porcao_padrao_g (default 100g).
--
-- Estrutura do JSONB:
-- {
--   "calcio_mg": 0, "ferro_mg": 0, "magnesio_mg": 0,
--   "potassio_mg": 0, "sodio_mg": 0, "zinco_mg": 0,
--   "vit_a_mcg": 0, "vit_c_mg": 0, "vit_d_mcg": 0, "vit_e_mg": 0,
--   "vit_b1_mg": 0, "vit_b2_mg": 0, "vit_b3_mg": 0, "vit_b6_mg": 0,
--   "vit_b9_mcg": 0, "vit_b12_mcg": 0,
--   "fosforo_mg": 0, "selenio_mcg": 0, "cobre_mg": 0,
--   "colesterol_mg": 0, "g_saturada_g": 0, "g_trans_g": 0,
--   "g_mono_g": 0, "g_poli_g": 0, "acucar_g": 0
-- }
-- ================================================================

-- ── Cereais e pães ─────────────────────────────────────────────
UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":85,"ferro_mg":2.5,"magnesio_mg":58,"potassio_mg":210,"sodio_mg":510,
  "zinco_mg":1.4,"fosforo_mg":160,"selenio_mcg":40,
  "vit_b1_mg":0.4,"vit_b2_mg":0.2,"vit_b3_mg":4.5,"vit_b6_mg":0.2,"vit_b9_mcg":85,
  "g_saturada_g":0.6,"g_mono_g":0.5,"g_poli_g":0.6,"acucar_g":3.5
}'::jsonb WHERE nome_normalizado ILIKE '%pao integral%' OR nome ILIKE 'Pão integral%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":15,"ferro_mg":1.3,"magnesio_mg":25,"potassio_mg":35,"sodio_mg":1,
  "zinco_mg":0.9,"fosforo_mg":110,"selenio_mcg":15,
  "vit_b1_mg":0.05,"vit_b2_mg":0.03,"vit_b3_mg":1.4,"vit_b6_mg":0.1,"vit_b9_mcg":7,
  "g_saturada_g":0.1,"g_mono_g":0.1,"g_poli_g":0.1,"acucar_g":0.1
}'::jsonb WHERE nome_normalizado ILIKE '%arroz branco%' OR nome ILIKE 'Arroz branco%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":12,"ferro_mg":1.5,"magnesio_mg":110,"potassio_mg":280,"sodio_mg":7,
  "zinco_mg":2,"fosforo_mg":290,"selenio_mcg":15,
  "vit_b1_mg":0.4,"vit_b2_mg":0.15,"vit_b3_mg":4.1,"vit_b6_mg":0.5,"vit_b9_mcg":20,
  "g_saturada_g":0.7,"g_mono_g":1.2,"g_poli_g":1.5,"acucar_g":0.3
}'::jsonb WHERE nome_normalizado ILIKE '%arroz integral%' OR nome ILIKE 'Arroz integral%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":54,"ferro_mg":4.7,"magnesio_mg":177,"potassio_mg":429,"sodio_mg":12,
  "zinco_mg":2.6,"fosforo_mg":523,"selenio_mcg":34,
  "vit_b1_mg":0.76,"vit_b2_mg":0.14,"vit_b3_mg":1.5,"vit_b6_mg":0.12,"vit_b9_mcg":56,"vit_e_mg":0.6,
  "g_saturada_g":1.2,"g_mono_g":2.2,"g_poli_g":2.5,"acucar_g":1
}'::jsonb WHERE nome_normalizado ILIKE '%aveia%' OR nome ILIKE 'Aveia%';

-- ── Carnes e ovos ──────────────────────────────────────────────
UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":18,"ferro_mg":2.7,"magnesio_mg":22,"potassio_mg":322,"sodio_mg":63,
  "zinco_mg":4.5,"fosforo_mg":200,"selenio_mcg":24,
  "vit_b6_mg":0.4,"vit_b12_mcg":2.6,"vit_b3_mg":4.5,
  "colesterol_mg":85,"g_saturada_g":4.5,"g_mono_g":5.5,"g_poli_g":0.4
}'::jsonb WHERE nome_normalizado ILIKE '%carne bovina%' OR nome ILIKE 'Carne bovina%' OR nome ILIKE 'Bife%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":12,"ferro_mg":1.0,"magnesio_mg":29,"potassio_mg":256,"sodio_mg":74,
  "zinco_mg":1.0,"fosforo_mg":210,"selenio_mcg":24,
  "vit_b6_mg":0.6,"vit_b12_mcg":0.3,"vit_b3_mg":13.7,
  "colesterol_mg":85,"g_saturada_g":1,"g_mono_g":1.2,"g_poli_g":0.7
}'::jsonb WHERE nome_normalizado ILIKE '%frango%' OR nome ILIKE 'Frango%' OR nome ILIKE 'Peito de frango%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":16,"ferro_mg":0.3,"magnesio_mg":29,"potassio_mg":363,"sodio_mg":54,
  "zinco_mg":0.4,"fosforo_mg":252,"selenio_mcg":47,
  "vit_b12_mcg":2.4,"vit_d_mcg":11,"vit_b3_mg":7.9,
  "colesterol_mg":50,"g_saturada_g":0.8,"g_mono_g":1.5,"g_poli_g":1.5
}'::jsonb WHERE nome_normalizado ILIKE '%peixe%' OR nome ILIKE 'Tilápia%' OR nome ILIKE 'Atum%' OR nome ILIKE 'Salmão%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":56,"ferro_mg":1.8,"magnesio_mg":12,"potassio_mg":138,"sodio_mg":142,
  "zinco_mg":1.3,"fosforo_mg":198,"selenio_mcg":31,
  "vit_a_mcg":160,"vit_b12_mcg":1.1,"vit_b2_mg":0.5,"vit_b9_mcg":47,"vit_d_mcg":2,
  "colesterol_mg":373,"g_saturada_g":3.3,"g_mono_g":4,"g_poli_g":1.4
}'::jsonb WHERE nome_normalizado ILIKE '%ovo%' OR nome ILIKE 'Ovo%';

-- ── Laticínios ─────────────────────────────────────────────────
UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":113,"ferro_mg":0.05,"magnesio_mg":10,"potassio_mg":143,"sodio_mg":43,
  "zinco_mg":0.4,"fosforo_mg":84,
  "vit_a_mcg":58,"vit_b2_mg":0.18,"vit_b12_mcg":0.5,"vit_d_mcg":1,
  "colesterol_mg":12,"g_saturada_g":2.3,"g_mono_g":1.1,"g_poli_g":0.1,"acucar_g":4.6
}'::jsonb WHERE nome_normalizado ILIKE '%leite%' OR nome ILIKE 'Leite%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":110,"ferro_mg":0.05,"magnesio_mg":11,"potassio_mg":155,"sodio_mg":36,
  "zinco_mg":0.5,"fosforo_mg":95,
  "vit_a_mcg":27,"vit_b2_mg":0.14,"vit_b12_mcg":0.4,"vit_d_mcg":0,
  "colesterol_mg":5,"g_saturada_g":1,"g_mono_g":0.5,"g_poli_g":0.05,"acucar_g":4.7
}'::jsonb WHERE nome_normalizado ILIKE '%iogurte%' OR nome ILIKE 'Iogurte%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":350,"ferro_mg":0.4,"magnesio_mg":18,"potassio_mg":76,"sodio_mg":620,
  "zinco_mg":2.6,"fosforo_mg":520,
  "vit_a_mcg":260,"vit_b2_mg":0.3,"vit_b12_mcg":2,
  "colesterol_mg":80,"g_saturada_g":15,"g_mono_g":7,"g_poli_g":0.7,"acucar_g":1
}'::jsonb WHERE nome_normalizado ILIKE '%queijo%' OR nome ILIKE 'Queijo%' OR nome ILIKE 'Mussarela%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":120,"ferro_mg":0.2,"magnesio_mg":10,"potassio_mg":105,"sodio_mg":810,
  "zinco_mg":0.8,"fosforo_mg":215,
  "vit_a_mcg":110,"vit_b2_mg":0.18,"vit_b12_mcg":0.6,
  "colesterol_mg":40,"g_saturada_g":12,"g_mono_g":4.5,"g_poli_g":0.4,"acucar_g":3
}'::jsonb WHERE nome_normalizado ILIKE '%requeijao%' OR nome ILIKE 'Requeijão%';

-- ── Frutas ─────────────────────────────────────────────────────
UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":5,"ferro_mg":0.3,"magnesio_mg":27,"potassio_mg":358,"sodio_mg":1,
  "zinco_mg":0.15,"fosforo_mg":22,
  "vit_a_mcg":3,"vit_c_mg":8.7,"vit_b6_mg":0.37,"vit_b9_mcg":20,"vit_e_mg":0.1,
  "g_saturada_g":0.1,"g_mono_g":0.03,"g_poli_g":0.07,"acucar_g":12,"colesterol_mg":0
}'::jsonb WHERE nome_normalizado ILIKE '%banana%' OR nome ILIKE 'Banana%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":6,"ferro_mg":0.1,"magnesio_mg":5,"potassio_mg":107,"sodio_mg":1,
  "zinco_mg":0.04,"fosforo_mg":11,
  "vit_a_mcg":3,"vit_c_mg":4.6,"vit_b6_mg":0.04,"vit_b9_mcg":3,"vit_e_mg":0.18,
  "g_saturada_g":0.03,"g_mono_g":0.01,"g_poli_g":0.05,"acucar_g":10.4,"colesterol_mg":0
}'::jsonb WHERE nome_normalizado ILIKE '%maca%' OR nome ILIKE 'Maçã%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":40,"ferro_mg":0.1,"magnesio_mg":10,"potassio_mg":181,"sodio_mg":0,
  "zinco_mg":0.07,"fosforo_mg":14,
  "vit_a_mcg":11,"vit_c_mg":53.2,"vit_b6_mg":0.06,"vit_b9_mcg":30,"vit_e_mg":0.18,
  "g_saturada_g":0.02,"g_mono_g":0.02,"g_poli_g":0.04,"acucar_g":9,"colesterol_mg":0
}'::jsonb WHERE nome_normalizado ILIKE '%laranja%' OR nome ILIKE 'Laranja%';

-- ── Leguminosas ────────────────────────────────────────────────
UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":27,"ferro_mg":1.3,"magnesio_mg":42,"potassio_mg":238,"sodio_mg":1,
  "zinco_mg":1,"fosforo_mg":138,"selenio_mcg":1,
  "vit_b1_mg":0.16,"vit_b6_mg":0.12,"vit_b9_mcg":149,
  "g_saturada_g":0.1,"g_mono_g":0.1,"g_poli_g":0.4,"acucar_g":0.3
}'::jsonb WHERE nome_normalizado ILIKE '%feijao carioca%' OR nome ILIKE 'Feijão carioca%' OR nome_normalizado ILIKE '%feijao%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":19,"ferro_mg":3.3,"magnesio_mg":36,"potassio_mg":369,"sodio_mg":2,
  "zinco_mg":1.3,"fosforo_mg":180,"selenio_mcg":3,
  "vit_b1_mg":0.17,"vit_b6_mg":0.18,"vit_b9_mcg":181,
  "g_saturada_g":0.05,"g_mono_g":0.05,"g_poli_g":0.16,"acucar_g":1.8
}'::jsonb WHERE nome_normalizado ILIKE '%lentilha%' OR nome ILIKE 'Lentilha%';

-- ── Vegetais e folhas ─────────────────────────────────────────
UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":36,"ferro_mg":1.1,"magnesio_mg":11,"potassio_mg":237,"sodio_mg":28,
  "zinco_mg":0.2,"fosforo_mg":29,
  "vit_a_mcg":166,"vit_c_mg":3.7,"vit_k_mcg":126,"vit_b9_mcg":38,"vit_e_mg":0.3,
  "g_saturada_g":0.03,"g_mono_g":0.01,"g_poli_g":0.07,"acucar_g":0.8,"colesterol_mg":0
}'::jsonb WHERE nome_normalizado ILIKE '%alface%' OR nome ILIKE 'Alface%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":10,"ferro_mg":0.3,"magnesio_mg":11,"potassio_mg":237,"sodio_mg":5,
  "zinco_mg":0.17,"fosforo_mg":24,
  "vit_a_mcg":42,"vit_c_mg":13.7,"vit_b9_mcg":15,"vit_e_mg":0.5,
  "g_saturada_g":0.03,"g_mono_g":0.03,"g_poli_g":0.08,"acucar_g":2.6,"colesterol_mg":0
}'::jsonb WHERE nome_normalizado ILIKE '%tomate%' OR nome ILIKE 'Tomate%';

-- ── Oleaginosas ────────────────────────────────────────────────
UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":160,"ferro_mg":3.7,"magnesio_mg":270,"potassio_mg":730,"sodio_mg":1,
  "zinco_mg":3.1,"fosforo_mg":480,"selenio_mcg":2.5,
  "vit_b2_mg":1.1,"vit_b3_mg":3.6,"vit_b6_mg":0.14,"vit_b9_mcg":51,"vit_e_mg":25.6,
  "g_saturada_g":3.7,"g_mono_g":31.5,"g_poli_g":12.3,"acucar_g":4.4
}'::jsonb WHERE nome_normalizado ILIKE '%amendoa%' OR nome ILIKE 'Amêndoa%';

UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":160,"ferro_mg":2.4,"magnesio_mg":376,"potassio_mg":659,"sodio_mg":3,
  "zinco_mg":4.1,"fosforo_mg":725,"selenio_mcg":1917,
  "vit_b1_mg":0.6,"vit_b2_mg":0.04,"vit_b3_mg":0.3,"vit_b6_mg":0.1,"vit_e_mg":5.7,
  "g_saturada_g":16,"g_mono_g":24,"g_poli_g":21,"acucar_g":2.3
}'::jsonb WHERE nome_normalizado ILIKE '%castanha%para%' OR nome ILIKE 'Castanha-do-pará%' OR nome ILIKE 'Castanha do Pará%';

-- ── Cafés / Bebidas ────────────────────────────────────────────
UPDATE alimentos SET micronutrientes = '{
  "calcio_mg":2,"ferro_mg":0.01,"magnesio_mg":3,"potassio_mg":49,"sodio_mg":2,
  "vit_b2_mg":0.01,"vit_b3_mg":0.2,
  "g_saturada_g":0,"g_mono_g":0,"g_poli_g":0,"acucar_g":0,"colesterol_mg":0
}'::jsonb WHERE nome_normalizado ILIKE '%cafe%' OR nome ILIKE 'Café%';

-- Padrão zero para alimentos não cobertos (evita NULL nos cálculos)
UPDATE alimentos
   SET micronutrientes = '{}'::jsonb
 WHERE micronutrientes IS NULL;

-- Validação
SELECT COUNT(*) AS com_micros FROM alimentos
 WHERE micronutrientes IS NOT NULL
   AND jsonb_typeof(micronutrientes) = 'object'
   AND micronutrientes != '{}'::jsonb;
