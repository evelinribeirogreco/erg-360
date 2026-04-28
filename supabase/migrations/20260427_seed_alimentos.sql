-- ================================================================
-- ERG 360 — Seed Banco de Alimentos (80 alimentos brasileiros)
-- Macros + 9 micronutrientes principais (TACO 4ª edição + USDA)
-- Por 100g de alimento na forma indicada
-- ================================================================

INSERT INTO alimentos
  (nome, categoria, subcategoria, porcao_padrao_g, kcal, ptn_g, cho_g, lip_g, fibras_g,
   ig, cg, micronutrientes, vegetariano, vegano, sem_gluten, sem_lactose, industrializado,
   tags, fonte_dados)
VALUES

-- ╔═══════════════════════════════════════════════════════╗
-- ║ PROTEÍNAS — Carnes, peixes, ovos                      ║
-- ╚═══════════════════════════════════════════════════════╝

('Peito de frango grelhado',          'proteina', 'carne_branca_magra', 100, 165, 31.0, 0.0, 3.6, 0.0, NULL, NULL,
 '{"calcio_mg":15,"ferro_mg":1.0,"sodio_mg":74,"potassio_mg":256,"magnesio_mg":29,"zinco_mg":1.0,"vit_b12_mcg":0.3,"vit_a_mcg":6,"vit_d_mcg":0.1}',
 false, false, true, true, false,
 ARRAY['alto_proteico','hipolipidico'], 'TACO_4ed'),

('Coxa de frango sem pele',           'proteina', 'carne_branca_magra', 100, 178, 24.0, 0.0, 8.0, 0.0, NULL, NULL,
 '{"calcio_mg":12,"ferro_mg":1.3,"sodio_mg":86,"potassio_mg":230,"magnesio_mg":23,"zinco_mg":1.8,"vit_b12_mcg":0.5}',
 false, false, true, true, false,
 ARRAY['alto_proteico'], 'TACO_4ed'),

('Patinho moído cru',                 'proteina', 'carne_vermelha_magra', 100, 172, 21.6, 0.0, 9.0, 0.0, NULL, NULL,
 '{"calcio_mg":4,"ferro_mg":2.7,"sodio_mg":58,"potassio_mg":323,"magnesio_mg":21,"zinco_mg":4.2,"vit_b12_mcg":2.1}',
 false, false, true, true, false,
 ARRAY['alto_proteico','rico_ferro'], 'TACO_4ed'),

('Filé mignon grelhado',              'proteina', 'carne_vermelha_magra', 100, 196, 32.0, 0.0, 7.0, 0.0, NULL, NULL,
 '{"calcio_mg":7,"ferro_mg":3.0,"sodio_mg":62,"potassio_mg":380,"magnesio_mg":24,"zinco_mg":4.8,"vit_b12_mcg":2.4}',
 false, false, true, true, false,
 ARRAY['alto_proteico','rico_ferro'], 'TACO_4ed'),

('Alcatra magra grelhada',            'proteina', 'carne_vermelha_magra', 100, 184, 30.0, 0.0, 6.5, 0.0, NULL, NULL,
 '{"calcio_mg":6,"ferro_mg":2.8,"sodio_mg":55,"potassio_mg":340,"magnesio_mg":22,"zinco_mg":5.1,"vit_b12_mcg":2.2}',
 false, false, true, true, false,
 ARRAY['alto_proteico','rico_ferro'], 'TACO_4ed'),

('Tilápia grelhada',                  'proteina', 'peixe_branco', 100, 128, 26.0, 0.0, 2.7, 0.0, NULL, NULL,
 '{"calcio_mg":14,"ferro_mg":0.7,"sodio_mg":56,"potassio_mg":380,"magnesio_mg":34,"zinco_mg":0.4,"vit_b12_mcg":1.9,"vit_d_mcg":3.1,"omega3_g":0.2}',
 false, false, true, true, false,
 ARRAY['alto_proteico','hipolipidico','anti_inflamatorio'], 'TACO_4ed'),

('Salmão grelhado',                   'proteina', 'peixe_gordo', 100, 208, 25.4, 0.0, 12.4, 0.0, NULL, NULL,
 '{"calcio_mg":13,"ferro_mg":0.8,"sodio_mg":59,"potassio_mg":363,"magnesio_mg":29,"zinco_mg":0.6,"vit_b12_mcg":3.2,"vit_d_mcg":11.0,"omega3_g":2.3}',
 false, false, true, true, false,
 ARRAY['alto_proteico','anti_inflamatorio','cardioprotetor'], 'USDA'),

('Sardinha em conserva (em água)',    'proteina', 'peixe_gordo', 100, 208, 24.6, 0.0, 11.4, 0.0, NULL, NULL,
 '{"calcio_mg":382,"ferro_mg":2.9,"sodio_mg":307,"potassio_mg":397,"magnesio_mg":39,"zinco_mg":1.3,"vit_b12_mcg":8.9,"vit_d_mcg":4.8,"omega3_g":1.5}',
 false, false, true, true, true,
 ARRAY['alto_proteico','rico_calcio','anti_inflamatorio'], 'TACO_4ed'),

('Atum em conserva (em água)',        'proteina', 'peixe_branco', 100, 132, 28.5, 0.0, 1.5, 0.0, NULL, NULL,
 '{"calcio_mg":11,"ferro_mg":1.1,"sodio_mg":314,"potassio_mg":270,"magnesio_mg":31,"zinco_mg":0.8,"vit_b12_mcg":2.5,"omega3_g":0.5}',
 false, false, true, true, true,
 ARRAY['alto_proteico','hipolipidico'], 'TACO_4ed'),

('Ovo de galinha cozido',             'proteina', 'ovo', 100, 146, 13.3, 0.6, 9.5, 0.0, NULL, NULL,
 '{"calcio_mg":42,"ferro_mg":1.5,"sodio_mg":140,"potassio_mg":131,"magnesio_mg":11,"zinco_mg":1.1,"vit_b12_mcg":1.1,"vit_a_mcg":140,"vit_d_mcg":1.7,"colina_mg":250}',
 true, false, true, true, false,
 ARRAY['alto_proteico','vegetariano','saciedade_alta'], 'TACO_4ed'),

('Tofu firme',                        'proteina', 'vegetal', 100, 144, 17.3, 2.8, 8.7, 2.3, 15, 0.4,
 '{"calcio_mg":350,"ferro_mg":2.7,"sodio_mg":14,"potassio_mg":237,"magnesio_mg":58,"zinco_mg":1.6,"vit_b12_mcg":0,"folato_mcg":29}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','alto_proteico','rico_calcio'], 'USDA'),

-- ╔═══════════════════════════════════════════════════════╗
-- ║ CEREAIS E TUBÉRCULOS                                  ║
-- ╚═══════════════════════════════════════════════════════╝

('Arroz branco cozido',               'carboidrato', 'cereal_refinado', 100, 128, 2.5, 28.1, 0.2, 1.6, 73, 20.5,
 '{"calcio_mg":4,"ferro_mg":0.3,"sodio_mg":1,"potassio_mg":35,"magnesio_mg":12,"zinco_mg":0.5}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano'], 'TACO_4ed'),

('Arroz integral cozido',             'carboidrato', 'cereal_integral', 100, 124, 2.6, 25.8, 1.0, 2.7, 50, 12.9,
 '{"calcio_mg":5,"ferro_mg":0.3,"sodio_mg":1,"potassio_mg":75,"magnesio_mg":59,"zinco_mg":0.7}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','baixo_ig','rico_fibras'], 'TACO_4ed'),

('Arroz parboilizado cozido',         'carboidrato', 'cereal_semi_integral', 100, 124, 2.6, 25.9, 0.7, 1.6, 38, 9.8,
 '{"calcio_mg":4,"ferro_mg":0.5,"sodio_mg":1,"potassio_mg":74,"magnesio_mg":31,"zinco_mg":0.5}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','baixo_ig'], 'TACO_4ed'),

('Quinoa cozida',                     'carboidrato', 'pseudocereal', 100, 120, 4.4, 21.3, 1.9, 2.8, 35, 7.5,
 '{"calcio_mg":17,"ferro_mg":1.5,"sodio_mg":7,"potassio_mg":172,"magnesio_mg":64,"zinco_mg":1.1,"folato_mcg":42}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','baixo_ig','rico_fibras','alto_proteico'], 'USDA'),

('Aveia em flocos',                   'carboidrato', 'cereal_integral', 100, 394, 13.9, 66.6, 8.5, 9.1, 55, 36.6,
 '{"calcio_mg":48,"ferro_mg":4.4,"sodio_mg":5,"potassio_mg":336,"magnesio_mg":119,"zinco_mg":2.6,"folato_mcg":56}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_fibras','baixo_ig','cardioprotetor'], 'TACO_4ed'),

('Pão francês',                       'carboidrato', 'cereal_refinado', 100, 300, 8.0, 58.6, 3.1, 2.3, 70, 41.0,
 '{"calcio_mg":16,"ferro_mg":1.6,"sodio_mg":648,"potassio_mg":135,"magnesio_mg":24,"zinco_mg":0.8}',
 true, true, false, true, true,
 ARRAY['vegano','vegetariano'], 'TACO_4ed'),

('Pão integral',                      'carboidrato', 'cereal_integral', 100, 253, 9.4, 49.0, 3.7, 6.9, 51, 25.0,
 '{"calcio_mg":67,"ferro_mg":2.5,"sodio_mg":520,"potassio_mg":230,"magnesio_mg":78,"zinco_mg":1.5}',
 true, true, false, true, true,
 ARRAY['vegano','vegetariano','rico_fibras'], 'TACO_4ed'),

('Tapioca (goma hidratada)',          'carboidrato', 'cereal_refinado', 100, 240, 0.4, 59.5, 0.0, 0.0, 70, 41.7,
 '{"calcio_mg":4,"ferro_mg":0.4,"sodio_mg":1,"potassio_mg":11,"magnesio_mg":1,"zinco_mg":0.1}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','sem_gluten'], 'TACO_4ed'),

('Batata doce cozida',                'carboidrato', 'tuberculo', 100, 76, 1.4, 18.4, 0.1, 2.2, 44, 8.1,
 '{"calcio_mg":17,"ferro_mg":0.4,"sodio_mg":9,"potassio_mg":230,"magnesio_mg":17,"zinco_mg":0.2,"vit_a_mcg":709,"vit_c_mg":2.4}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','baixo_ig','rico_fibras'], 'TACO_4ed'),

('Batata inglesa cozida',             'carboidrato', 'tuberculo', 100, 87, 2.0, 20.1, 0.1, 1.8, 78, 15.7,
 '{"calcio_mg":3,"ferro_mg":0.3,"sodio_mg":2,"potassio_mg":380,"magnesio_mg":21,"zinco_mg":0.3,"vit_c_mg":7.4}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_potassio'], 'TACO_4ed'),

('Mandioca cozida',                   'carboidrato', 'tuberculo', 100, 125, 0.6, 30.1, 0.3, 1.6, 46, 13.8,
 '{"calcio_mg":17,"ferro_mg":0.3,"sodio_mg":2,"potassio_mg":271,"magnesio_mg":21,"zinco_mg":0.3,"vit_c_mg":20.6}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','baixo_ig','sem_gluten'], 'TACO_4ed'),

('Inhame cozido',                     'carboidrato', 'tuberculo', 100, 97, 2.1, 23.2, 0.2, 2.6, 51, 11.8,
 '{"calcio_mg":12,"ferro_mg":0.4,"sodio_mg":4,"potassio_mg":392,"magnesio_mg":25,"zinco_mg":0.3,"vit_c_mg":12.0}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_potassio','rico_fibras'], 'TACO_4ed'),

('Macarrão integral cozido',          'carboidrato', 'cereal_integral', 100, 124, 5.3, 26.5, 0.5, 4.0, 50, 13.2,
 '{"calcio_mg":15,"ferro_mg":1.5,"sodio_mg":4,"potassio_mg":62,"magnesio_mg":58,"zinco_mg":1.1}',
 true, true, false, true, true,
 ARRAY['vegano','vegetariano','rico_fibras'], 'USDA'),

-- ╔═══════════════════════════════════════════════════════╗
-- ║ LEGUMINOSAS                                           ║
-- ╚═══════════════════════════════════════════════════════╝

('Feijão carioca cozido',             'leguminosa', 'feijao', 100, 76, 4.8, 13.6, 0.5, 8.5, 35, 4.8,
 '{"calcio_mg":27,"ferro_mg":1.3,"sodio_mg":2,"potassio_mg":256,"magnesio_mg":42,"zinco_mg":0.6,"folato_mcg":149}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_fibras','baixo_ig'], 'TACO_4ed'),

('Feijão preto cozido',               'leguminosa', 'feijao', 100, 77, 4.5, 14.0, 0.5, 8.4, 30, 4.2,
 '{"calcio_mg":29,"ferro_mg":1.5,"sodio_mg":2,"potassio_mg":256,"magnesio_mg":40,"zinco_mg":0.7,"folato_mcg":135}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_fibras','baixo_ig','rico_ferro'], 'TACO_4ed'),

('Lentilha cozida',                   'leguminosa', 'lentilha', 100, 116, 9.0, 20.1, 0.5, 7.9, 32, 6.4,
 '{"calcio_mg":19,"ferro_mg":3.3,"sodio_mg":2,"potassio_mg":369,"magnesio_mg":36,"zinco_mg":1.3,"folato_mcg":181}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_fibras','baixo_ig','rico_ferro','alto_proteico'], 'TACO_4ed'),

('Grão-de-bico cozido',               'leguminosa', 'grao_de_bico', 100, 121, 7.8, 21.2, 1.4, 7.6, 28, 5.9,
 '{"calcio_mg":36,"ferro_mg":1.5,"sodio_mg":2,"potassio_mg":291,"magnesio_mg":48,"zinco_mg":1.5,"folato_mcg":172}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_fibras','baixo_ig','alto_proteico'], 'TACO_4ed'),

('Ervilha cozida',                    'leguminosa', 'ervilha', 100, 84, 5.4, 15.0, 0.4, 5.5, 51, 7.7,
 '{"calcio_mg":27,"ferro_mg":1.5,"sodio_mg":3,"potassio_mg":362,"magnesio_mg":33,"zinco_mg":1.2,"folato_mcg":63,"vit_c_mg":40}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_fibras'], 'USDA'),

-- ╔═══════════════════════════════════════════════════════╗
-- ║ FRUTAS                                                ║
-- ╚═══════════════════════════════════════════════════════╝

('Banana prata',                      'fruta', 'fruta_amilacea', 100, 98, 1.3, 26.0, 0.1, 2.0, 51, 13.3,
 '{"calcio_mg":8,"ferro_mg":0.4,"sodio_mg":1,"potassio_mg":358,"magnesio_mg":28,"zinco_mg":0.2,"vit_c_mg":21.6,"vit_b6_mg":0.4}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_potassio','pre_treino'], 'TACO_4ed'),

('Maçã com casca',                    'fruta', 'fruta_aquosa', 100, 56, 0.3, 15.2, 0.0, 1.3, 36, 5.5,
 '{"calcio_mg":2,"ferro_mg":0.1,"sodio_mg":1,"potassio_mg":75,"magnesio_mg":2,"zinco_mg":0.1,"vit_c_mg":2.4}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','baixo_ig','rico_fibras'], 'TACO_4ed'),

('Mamão papaia',                      'fruta', 'fruta_aquosa', 100, 40, 0.5, 10.4, 0.1, 1.0, 60, 6.2,
 '{"calcio_mg":25,"ferro_mg":0.2,"sodio_mg":3,"potassio_mg":182,"magnesio_mg":10,"zinco_mg":0.1,"vit_a_mcg":47,"vit_c_mg":62}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','anti_inflamatorio'], 'TACO_4ed'),

('Laranja pera',                      'fruta', 'citrica', 100, 37, 1.0, 8.9, 0.1, 1.0, 42, 3.7,
 '{"calcio_mg":35,"ferro_mg":0.1,"sodio_mg":1,"potassio_mg":163,"magnesio_mg":9,"zinco_mg":0.1,"vit_c_mg":53.2,"folato_mcg":30}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','baixo_ig','anti_inflamatorio'], 'TACO_4ed'),

('Morango',                           'fruta', 'berries', 100, 30, 0.9, 6.8, 0.3, 1.7, 40, 2.7,
 '{"calcio_mg":11,"ferro_mg":0.5,"sodio_mg":1,"potassio_mg":166,"magnesio_mg":11,"zinco_mg":0.2,"vit_c_mg":63.6,"folato_mcg":24}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','baixo_ig','anti_inflamatorio','rico_fibras'], 'TACO_4ed'),

('Mirtilo (blueberry)',               'fruta', 'berries', 100, 57, 0.7, 14.5, 0.3, 2.4, 53, 7.7,
 '{"calcio_mg":6,"ferro_mg":0.3,"sodio_mg":1,"potassio_mg":77,"magnesio_mg":6,"zinco_mg":0.2,"vit_c_mg":9.7,"vit_a_mcg":3,"vit_e_mg":0.6}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','anti_inflamatorio','baixo_ig'], 'USDA'),

('Abacate',                           'gordura', 'fruta_oleosa', 100, 96, 1.2, 6.0, 8.4, 6.3, 15, 0.9,
 '{"calcio_mg":8,"ferro_mg":0.2,"sodio_mg":2,"potassio_mg":206,"magnesio_mg":15,"zinco_mg":0.2,"vit_c_mg":8.7,"folato_mcg":22,"vit_e_mg":2.1}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','low_carb','anti_inflamatorio','rico_fibras','cardioprotetor'], 'TACO_4ed'),

-- ╔═══════════════════════════════════════════════════════╗
-- ║ VEGETAIS E LEGUMES                                    ║
-- ╚═══════════════════════════════════════════════════════╝

('Alface crespa',                     'vegetal', 'folhoso', 100, 11, 1.3, 1.7, 0.2, 1.8, 15, 0.3,
 '{"calcio_mg":40,"ferro_mg":0.4,"sodio_mg":4,"potassio_mg":267,"magnesio_mg":11,"vit_a_mcg":283,"vit_c_mg":15.6,"folato_mcg":136}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','low_carb','baixo_ig'], 'TACO_4ed'),

('Brócolis cozido',                   'vegetal', 'crucifera', 100, 25, 2.1, 4.0, 0.4, 3.4, 15, 0.6,
 '{"calcio_mg":51,"ferro_mg":0.5,"sodio_mg":7,"potassio_mg":205,"magnesio_mg":21,"zinco_mg":0.4,"vit_c_mg":42,"vit_a_mcg":78,"folato_mcg":108}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','low_carb','anti_inflamatorio','rico_fibras'], 'TACO_4ed'),

('Couve refogada',                    'vegetal', 'folhoso', 100, 39, 2.2, 4.7, 0.7, 3.2, 15, 0.7,
 '{"calcio_mg":131,"ferro_mg":0.8,"sodio_mg":13,"potassio_mg":313,"magnesio_mg":24,"zinco_mg":0.4,"vit_a_mcg":252,"vit_c_mg":92,"vit_d_mcg":0,"vit_k_mcg":705}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_calcio','anti_inflamatorio','rico_fibras'], 'TACO_4ed'),

('Espinafre cozido',                  'vegetal', 'folhoso', 100, 23, 2.9, 3.6, 0.3, 2.4, 15, 0.5,
 '{"calcio_mg":99,"ferro_mg":3.6,"sodio_mg":80,"potassio_mg":466,"magnesio_mg":79,"zinco_mg":0.5,"vit_a_mcg":469,"vit_c_mg":28,"folato_mcg":146}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_ferro','rico_potassio','anti_inflamatorio'], 'USDA'),

('Cenoura crua',                      'vegetal', 'raiz', 100, 34, 1.3, 7.7, 0.2, 3.2, 39, 3.0,
 '{"calcio_mg":27,"ferro_mg":0.2,"sodio_mg":65,"potassio_mg":315,"magnesio_mg":11,"vit_a_mcg":835,"vit_c_mg":5.9,"vit_k_mcg":13.2}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','baixo_ig','anti_inflamatorio'], 'TACO_4ed'),

('Tomate maduro',                     'vegetal', 'fruto_vegetal', 100, 15, 1.1, 3.1, 0.2, 1.2, 15, 0.5,
 '{"calcio_mg":7,"ferro_mg":0.2,"sodio_mg":4,"potassio_mg":222,"magnesio_mg":11,"zinco_mg":0.2,"vit_c_mg":21.2,"vit_a_mcg":42,"vit_k_mcg":7.9}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','low_carb','anti_inflamatorio'], 'TACO_4ed'),

('Pepino com casca',                  'vegetal', 'fruto_vegetal', 100, 14, 0.9, 2.0, 0.2, 0.6, 15, 0.3,
 '{"calcio_mg":15,"ferro_mg":0.2,"sodio_mg":2,"potassio_mg":147,"magnesio_mg":13,"zinco_mg":0.2,"vit_c_mg":2.8,"vit_k_mcg":16.4}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','low_carb','baixo_ig'], 'TACO_4ed'),

('Abobrinha cozida',                  'vegetal', 'fruto_vegetal', 100, 19, 1.0, 4.0, 0.4, 1.0, 15, 0.6,
 '{"calcio_mg":18,"ferro_mg":0.4,"sodio_mg":2,"potassio_mg":253,"magnesio_mg":17,"zinco_mg":0.3,"vit_c_mg":17.9,"vit_a_mcg":10}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','low_carb'], 'TACO_4ed'),

('Berinjela cozida',                  'vegetal', 'fruto_vegetal', 100, 27, 0.8, 6.6, 0.2, 2.5, 15, 1.0,
 '{"calcio_mg":7,"ferro_mg":0.3,"sodio_mg":1,"potassio_mg":230,"magnesio_mg":11,"zinco_mg":0.1,"vit_c_mg":1.3}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','low_carb','rico_fibras'], 'USDA'),

('Beterraba cozida',                  'vegetal', 'raiz', 100, 32, 1.3, 7.2, 0.2, 1.9, 64, 4.6,
 '{"calcio_mg":15,"ferro_mg":0.3,"sodio_mg":59,"potassio_mg":279,"magnesio_mg":17,"zinco_mg":0.4,"vit_c_mg":3.6,"folato_mcg":80}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_potassio','pre_treino'], 'TACO_4ed'),

-- ╔═══════════════════════════════════════════════════════╗
-- ║ LATICÍNIOS                                            ║
-- ╚═══════════════════════════════════════════════════════╝

('Leite desnatado UHT',               'laticinio', 'leite', 100, 35, 3.4, 4.9, 0.1, 0.0, 32, 1.6,
 '{"calcio_mg":121,"ferro_mg":0,"sodio_mg":52,"potassio_mg":166,"magnesio_mg":11,"zinco_mg":0.4,"vit_b12_mcg":0.4,"vit_a_mcg":1,"vit_d_mcg":1.2}',
 true, false, true, false, true,
 ARRAY['vegetariano','rico_calcio','hipolipidico'], 'TACO_4ed'),

('Iogurte natural desnatado',         'laticinio', 'iogurte', 100, 41, 4.1, 5.7, 0.1, 0.0, 11, 0.6,
 '{"calcio_mg":143,"ferro_mg":0,"sodio_mg":52,"potassio_mg":167,"magnesio_mg":13,"zinco_mg":0.6,"vit_b12_mcg":0.5}',
 true, false, true, false, true,
 ARRAY['vegetariano','rico_calcio','alto_proteico','saciedade_alta'], 'TACO_4ed'),

('Queijo branco fresco (minas frescal)', 'laticinio', 'queijo_fresco', 100, 264, 17.4, 3.2, 20.2, 0.0, NULL, NULL,
 '{"calcio_mg":579,"ferro_mg":0.4,"sodio_mg":346,"potassio_mg":105,"magnesio_mg":13,"zinco_mg":1.6,"vit_b12_mcg":1.0,"vit_a_mcg":227}',
 true, false, true, false, false,
 ARRAY['vegetariano','rico_calcio','alto_proteico'], 'TACO_4ed'),

('Queijo cottage',                    'laticinio', 'queijo_fresco', 100, 98, 11.1, 3.4, 4.3, 0.0, NULL, NULL,
 '{"calcio_mg":83,"ferro_mg":0.1,"sodio_mg":364,"potassio_mg":104,"magnesio_mg":8,"zinco_mg":0.4,"vit_b12_mcg":0.4}',
 true, false, true, false, true,
 ARRAY['vegetariano','alto_proteico','hipolipidico','saciedade_alta'], 'USDA'),

('Requeijão light',                   'laticinio', 'creme', 100, 175, 9.0, 5.0, 13.0, 0.0, NULL, NULL,
 '{"calcio_mg":250,"ferro_mg":0,"sodio_mg":420,"potassio_mg":80,"magnesio_mg":8}',
 true, false, true, false, true,
 ARRAY['vegetariano','rico_calcio'], 'industrializado'),

-- ╔═══════════════════════════════════════════════════════╗
-- ║ GORDURAS BOAS / OLEAGINOSAS                           ║
-- ╚═══════════════════════════════════════════════════════╝

('Azeite de oliva extra virgem',      'gordura', 'oleo_vegetal', 100, 884, 0.0, 0.0, 100.0, 0.0, NULL, NULL,
 '{"calcio_mg":1,"ferro_mg":0.6,"sodio_mg":2,"potassio_mg":1,"vit_e_mg":14.4,"vit_k_mcg":60.2,"omega3_g":0.8,"omega6_g":9.8}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','low_carb','cardioprotetor','anti_inflamatorio'], 'USDA'),

('Castanha-do-pará',                  'gordura', 'oleaginosa', 100, 643, 14.5, 15.1, 63.5, 7.9, NULL, NULL,
 '{"calcio_mg":146,"ferro_mg":2.4,"sodio_mg":3,"potassio_mg":659,"magnesio_mg":376,"zinco_mg":4.1,"selenio_mcg":1917,"vit_e_mg":5.7}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','low_carb','cardioprotetor','anti_inflamatorio','rico_fibras'], 'TACO_4ed'),

('Castanha de caju',                  'gordura', 'oleaginosa', 100, 553, 18.2, 30.2, 43.9, 3.3, 25, 7.6,
 '{"calcio_mg":37,"ferro_mg":6.7,"sodio_mg":12,"potassio_mg":660,"magnesio_mg":292,"zinco_mg":5.8,"vit_e_mg":0.9}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_ferro','alto_proteico','low_carb'], 'TACO_4ed'),

('Amêndoa torrada',                   'gordura', 'oleaginosa', 100, 581, 18.6, 29.5, 47.3, 11.6, 15, 4.4,
 '{"calcio_mg":236,"ferro_mg":3.0,"sodio_mg":1,"potassio_mg":687,"magnesio_mg":268,"zinco_mg":3.1,"vit_e_mg":24.6}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','low_carb','rico_calcio','rico_fibras','cardioprotetor'], 'TACO_4ed'),

('Pasta de amendoim integral',        'gordura', 'oleaginosa', 100, 588, 25.0, 21.0, 49.0, 7.0, 14, 2.9,
 '{"calcio_mg":54,"ferro_mg":1.9,"sodio_mg":17,"potassio_mg":650,"magnesio_mg":154,"zinco_mg":2.5,"vit_e_mg":4.4}',
 true, true, true, true, true,
 ARRAY['vegano','vegetariano','alto_proteico','low_carb'], 'TACO_4ed'),

('Chia (semente)',                    'gordura', 'semente', 100, 486, 16.5, 42.1, 30.7, 34.4, NULL, NULL,
 '{"calcio_mg":631,"ferro_mg":7.7,"sodio_mg":16,"potassio_mg":407,"magnesio_mg":335,"zinco_mg":4.6,"omega3_g":17.8,"omega6_g":5.8}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_calcio','rico_ferro','rico_fibras','anti_inflamatorio','cardioprotetor'], 'USDA'),

('Linhaça (semente)',                 'gordura', 'semente', 100, 534, 18.3, 28.9, 42.2, 27.3, NULL, NULL,
 '{"calcio_mg":255,"ferro_mg":5.7,"sodio_mg":30,"potassio_mg":813,"magnesio_mg":392,"zinco_mg":4.3,"omega3_g":22.8,"omega6_g":5.9,"folato_mcg":87}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','rico_fibras','anti_inflamatorio','cardioprotetor','rico_calcio'], 'USDA'),

('Manteiga sem sal',                  'gordura', 'gordura_animal', 100, 717, 0.9, 0.1, 81.1, 0.0, NULL, NULL,
 '{"calcio_mg":24,"ferro_mg":0,"sodio_mg":11,"potassio_mg":24,"vit_a_mcg":684,"vit_d_mcg":1.5,"vit_e_mg":2.3}',
 true, false, true, false, false,
 ARRAY['vegetariano','low_carb','cetogenico'], 'USDA'),

-- ╔═══════════════════════════════════════════════════════╗
-- ║ SUPLEMENTOS / PROTEÍNAS EM PÓ                         ║
-- ╚═══════════════════════════════════════════════════════╝

('Whey protein concentrado',          'proteina', 'suplemento', 30, 113, 24.0, 2.0, 1.5, 0.5, NULL, NULL,
 '{"calcio_mg":140,"ferro_mg":0.6,"sodio_mg":75,"potassio_mg":150,"magnesio_mg":18,"zinco_mg":0.6}',
 true, false, true, false, true,
 ARRAY['vegetariano','alto_proteico','pos_treino'], 'industrializado'),

('Whey protein isolado',              'proteina', 'suplemento', 30, 110, 27.0, 1.0, 0.5, 0.0, NULL, NULL,
 '{"calcio_mg":120,"ferro_mg":0.4,"sodio_mg":50,"potassio_mg":130,"magnesio_mg":12,"zinco_mg":0.4}',
 true, false, true, true, true,
 ARRAY['vegetariano','alto_proteico','pos_treino','sem_lactose','low_carb'], 'industrializado'),

('Proteína vegetal (ervilha + arroz)', 'proteina', 'suplemento', 30, 115, 22.0, 5.0, 1.5, 1.0, NULL, NULL,
 '{"calcio_mg":80,"ferro_mg":2.5,"sodio_mg":150,"potassio_mg":300,"magnesio_mg":40,"zinco_mg":1.5}',
 true, true, true, true, true,
 ARRAY['vegano','vegetariano','alto_proteico','pos_treino'], 'industrializado'),

-- ╔═══════════════════════════════════════════════════════╗
-- ║ BEBIDAS                                               ║
-- ╚═══════════════════════════════════════════════════════╝

('Café preto sem açúcar',             'bebida', 'cafeinada', 100, 2, 0.1, 0.0, 0.0, 0.0, NULL, NULL,
 '{"calcio_mg":2,"sodio_mg":2,"potassio_mg":49,"magnesio_mg":3,"cafeina_mg":40}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','low_carb','cetogenico','pre_treino'], 'TACO_4ed'),

('Chá verde sem açúcar',              'bebida', 'cha', 100, 1, 0.0, 0.0, 0.0, 0.0, NULL, NULL,
 '{"calcio_mg":3,"sodio_mg":1,"potassio_mg":21,"cafeina_mg":12}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','anti_inflamatorio','low_carb','cetogenico'], 'USDA'),

('Suco de laranja natural',           'bebida', 'suco_natural', 100, 36, 0.7, 8.7, 0.1, 0.2, 50, 4.4,
 '{"calcio_mg":11,"ferro_mg":0.2,"sodio_mg":1,"potassio_mg":200,"magnesio_mg":11,"vit_c_mg":50,"folato_mcg":30}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','anti_inflamatorio'], 'TACO_4ed'),

-- ╔═══════════════════════════════════════════════════════╗
-- ║ INDUSTRIALIZADOS COMUNS                               ║
-- ╚═══════════════════════════════════════════════════════╝

('Granola sem açúcar',                'carboidrato', 'cereal_misto', 100, 412, 11.0, 65.0, 12.0, 8.0, 50, 32.5,
 '{"calcio_mg":85,"ferro_mg":3.5,"sodio_mg":12,"potassio_mg":380,"magnesio_mg":120,"zinco_mg":2.5}',
 true, true, true, true, true,
 ARRAY['vegano','vegetariano','rico_fibras'], 'industrializado'),

('Iogurte grego natural sem açúcar',  'laticinio', 'iogurte_grego', 100, 73, 9.5, 4.0, 2.0, 0.0, 11, 0.4,
 '{"calcio_mg":110,"ferro_mg":0,"sodio_mg":36,"potassio_mg":141,"magnesio_mg":11,"zinco_mg":0.5,"vit_b12_mcg":0.5}',
 true, false, true, false, true,
 ARRAY['vegetariano','alto_proteico','rico_calcio','saciedade_alta'], 'industrializado'),

('Patê de atum light',                'proteina', 'pasta', 100, 110, 18.0, 2.0, 4.0, 0.0, NULL, NULL,
 '{"calcio_mg":15,"ferro_mg":1.0,"sodio_mg":380,"potassio_mg":250}',
 false, false, true, true, true,
 ARRAY['alto_proteico','hipolipidico'], 'industrializado'),

-- ╔═══════════════════════════════════════════════════════╗
-- ║ TEMPEROS BÁSICOS (sem macros relevantes)              ║
-- ╚═══════════════════════════════════════════════════════╝

('Sal refinado',                      'tempero', 'sal',  5, 0, 0.0, 0.0, 0.0, 0.0, NULL, NULL,
 '{"sodio_mg":2000}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano'], 'TACO_4ed'),

('Pimenta-do-reino moída',            'tempero', 'tempero_natural', 5, 251, 10.4, 64.0, 3.3, 26.5, NULL, NULL,
 '{"calcio_mg":443,"ferro_mg":9.7,"potassio_mg":1329,"magnesio_mg":171}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','anti_inflamatorio'], 'TACO_4ed'),

('Cúrcuma (açafrão da terra)',        'tempero', 'tempero_natural', 5, 354, 7.8, 64.9, 9.9, 21.1, NULL, NULL,
 '{"calcio_mg":183,"ferro_mg":41.4,"potassio_mg":2525,"magnesio_mg":193}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','anti_inflamatorio','hepatoprotetor'], 'USDA'),

('Canela em pó',                      'tempero', 'tempero_natural', 3, 247, 4.0, 80.6, 1.2, 53.1, NULL, NULL,
 '{"calcio_mg":1002,"ferro_mg":8.3,"potassio_mg":431,"magnesio_mg":60}',
 true, true, true, true, false,
 ARRAY['vegano','vegetariano','anti_inflamatorio','baixo_ig'], 'USDA')

ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- SUBSTITUIÇÕES INICIAIS — equivalências por proteína
-- (mostra como popular; mais migrarão depois)
-- ────────────────────────────────────────────────────────────
INSERT INTO substituicoes_alimentos (alimento_origem_id, alimento_substituto_id, base_equivalencia, fator_multiplicador, notas)
SELECT a1.id, a2.id, 'proteina', round((a1.ptn_g / NULLIF(a2.ptn_g, 0))::numeric, 2),
       'Equivalente em proteína (' || a1.ptn_g || 'g vs ' || a2.ptn_g || 'g por 100g)'
FROM alimentos a1
JOIN alimentos a2 ON a1.categoria = 'proteina' AND a2.categoria = 'proteina' AND a1.id != a2.id
WHERE a1.ativo AND a2.ativo AND a2.ptn_g > 0
ON CONFLICT DO NOTHING;

-- Verificação final
DO $$
DECLARE total_alim int; total_tags int;
BEGIN
  SELECT count(*) INTO total_alim FROM alimentos WHERE ativo;
  SELECT count(*) INTO total_tags FROM tags_nutricionais;
  RAISE NOTICE 'Alimentos ativos: %', total_alim;
  RAISE NOTICE 'Tags catalogadas: %', total_tags;
END $$;
