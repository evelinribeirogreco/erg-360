-- ================================================================
-- ERG 360 — Seed de 30 Prescrições Fitoterápicas (base científica)
-- Pré-requisito: 20260427_prescricoes_fitoterapicos.sql executado
-- Execute no SQL Editor do Supabase
-- ================================================================

-- Idempotência: só insere se a indicação ainda não existe
-- (evita duplicar se rodar a migration mais de uma vez)

INSERT INTO prescricoes_fitoterapicos
  (indicacao, categoria, nome_composto, descricao, formula, posologia, duracao_dias,
   contraindicacoes, interacoes, observacoes_clinicas, referencias, evidencia_nivel)
SELECT v.indicacao, v.categoria, v.nome_composto, v.descricao, v.formula::jsonb,
       v.posologia, v.duracao_dias, v.contraindicacoes, v.interacoes, v.observacoes_clinicas,
       v.referencias::jsonb, v.evidencia_nivel
FROM (VALUES

-- ╔═══════════════════════════════════════════════════════════╗
-- ║ SONO / ANSIEDADE                                          ║
-- ╚═══════════════════════════════════════════════════════════╝

(
  'Insônia',
  'Sono',
  'Composto sedativo natural — Passiflora + Magnésio + L-triptofano',
  'Indução e manutenção do sono, modulação GABAérgica e regulação do eixo serotonina-melatonina.',
  '[
    {"ativo":"Passiflora incarnata extrato seco padronizado (4% vitexina)","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Magnésio glicinato","dose":"300 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"L-triptofano","dose":"500 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula 30–60 minutos antes de dormir',
  60,
  ARRAY['Gravidez','Lactação','Hipotensão grave'],
  ARRAY['Benzodiazepínicos','ISRS (síndrome serotoninérgica com triptofano)','Álcool'],
  'Reforçar higiene do sono. Reduzir cafeína após 14h. Reavaliar em 30 dias.',
  '[
    {"titulo":"Passiflora incarnata in anxiety disorder: a review of clinical evidence","autores":"Akhondzadeh S et al.","revista":"Journal of Clinical Pharmacy and Therapeutics","ano":2001,"doi":"10.1046/j.1365-2710.2001.00367.x","pubmed_id":"11679026"},
    {"titulo":"Effect of magnesium supplementation on insomnia in elderly","autores":"Abbasi B et al.","revista":"Journal of Research in Medical Sciences","ano":2012,"pubmed_id":"23853635"}
  ]',
  'B'
),

(
  'Ansiedade',
  'Sono',
  'Suporte ansiolítico — Melissa + Ashwagandha + L-teanina',
  'Modulação do cortisol e sistema GABA, especialmente em quadros de ansiedade leve a moderada.',
  '[
    {"ativo":"Melissa officinalis extrato (7:1)","dose":"600 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Withania somnifera (Ashwagandha) KSM-66","dose":"600 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"L-teanina","dose":"200 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula pela manhã e 1 ao final da tarde',
  90,
  ARRAY['Gravidez','Lactação','Doença autoimune ativa (Ashwagandha imunomoduladora)','Hipertireoidismo'],
  ARRAY['Sedativos','Anti-hipertensivos','Hormônios tireoidianos'],
  'Avaliar TSH antes de iniciar. Suspender em pacientes com Hashimoto descompensado.',
  '[
    {"titulo":"An investigation into the stress-relieving and pharmacological actions of an Ashwagandha extract","autores":"Salve J et al.","revista":"Cureus","ano":2019,"doi":"10.7759/cureus.6466","pubmed_id":"32025399"},
    {"titulo":"L-theanine reduces psychological and physiological stress responses","autores":"Kimura K et al.","revista":"Biological Psychology","ano":2007,"doi":"10.1016/j.biopsycho.2006.06.006","pubmed_id":"16930802"}
  ]',
  'B'
),

(
  'Cansaço diurno',
  'Sono',
  'Recuperação energética — Rhodiola + B-complex + CoQ10',
  'Adaptógeno antifadiga + suporte mitocondrial em quadros de fadiga crônica e burnout leve.',
  '[
    {"ativo":"Rhodiola rosea extrato padronizado (3% rosavinas, 1% salidrosídeo)","dose":"400 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Vitamina B-complex (B1, B2, B3, B5, B6, B12)","dose":"1 dose","forma_farmaceutica":"cápsula"},
    {"ativo":"Coenzima Q10 (ubiquinol)","dose":"100 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula pela manhã em jejum',
  60,
  ARRAY['Transtorno bipolar (Rhodiola)','Gravidez','Lactação'],
  ARRAY['Anticoagulantes (CoQ10 reduz INR)','IMAOs'],
  'Não tomar à noite — Rhodiola pode ter efeito estimulante.',
  '[
    {"titulo":"Rhodiola rosea in stress-induced fatigue: a randomized trial","autores":"Olsson EM et al.","revista":"Planta Medica","ano":2009,"doi":"10.1055/s-0028-1088346","pubmed_id":"19016404"},
    {"titulo":"Coenzyme Q10 supplementation in fatigue","autores":"Mehrabani S et al.","revista":"Antioxidants","ano":2019,"doi":"10.3390/antiox8100416"}
  ]',
  'B'
),

(
  'Enxaqueca',
  'Sono',
  'Profilaxia de enxaqueca — Riboflavina + Magnésio + CoQ10',
  'Tripé mitocondrial com evidência B+ em prevenção de crises (American Headache Society endossa).',
  '[
    {"ativo":"Riboflavina (Vitamina B2)","dose":"400 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Magnésio dimalato","dose":"600 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Coenzima Q10 (ubiquinol)","dose":"150 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula pela manhã com refeição',
  90,
  ARRAY['Insuficiência renal grave (cuidado com magnésio)','Anticoagulação plena'],
  ARRAY['Anticoagulantes orais (warfarin)','Antibióticos tetraciclina (magnésio)'],
  'Resposta esperada em 8–12 semanas. Manter por 3 meses antes de avaliar eficácia.',
  '[
    {"titulo":"Effectiveness of high-dose riboflavin in migraine prophylaxis","autores":"Schoenen J et al.","revista":"Neurology","ano":1998,"doi":"10.1212/wnl.50.2.466","pubmed_id":"9484373"},
    {"titulo":"Magnesium and migraine: a review","autores":"Mauskop A, Varughese J","revista":"Journal of Neural Transmission","ano":2012,"doi":"10.1007/s00702-012-0790-2","pubmed_id":"22426836"}
  ]',
  'A'
),

-- ╔═══════════════════════════════════════════════════════════╗
-- ║ MULHER / HORMONAL                                         ║
-- ╚═══════════════════════════════════════════════════════════╝

(
  'SOP',
  'Hormonal',
  'Suporte SOP — Inositol + NAC + Vitex',
  'Sensibilização à insulina, regularização ovulatória e redução de hiperandrogenia.',
  '[
    {"ativo":"Myo-inositol + D-chiro-inositol (40:1)","dose":"4 g","forma_farmaceutica":"sachê"},
    {"ativo":"N-acetilcisteína (NAC)","dose":"1200 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Vitex agnus-castus extrato seco","dose":"175 mg","forma_farmaceutica":"cápsula"}
  ]',
  'Inositol 1 sachê em 200ml água em jejum + NAC e Vitex 1 cápsula cada após café',
  90,
  ARRAY['Gravidez (Vitex)','Pacientes em TRH','Bipolaridade','Anticoncepcional combinado (Vitex pode reduzir eficácia)'],
  ARRAY['Anticoncepcional combinado','Bromocriptina','Antipsicóticos dopaminérgicos'],
  'Avaliar ciclo após 90 dias. Útil em SOP com resistência insulínica predominante.',
  '[
    {"titulo":"Myo-inositol and d-chiro-inositol in women with PCOS","autores":"Unfer V et al.","revista":"Endocrine Connections","ano":2017,"doi":"10.1530/EC-17-0243","pubmed_id":"29042448"},
    {"titulo":"N-acetylcysteine in PCOS","autores":"Thakker D et al.","revista":"Obstetrics and Gynecology International","ano":2015,"doi":"10.1155/2015/817849"},
    {"titulo":"Vitex agnus-castus and women hormonal disorders","autores":"van Die MD et al.","revista":"Planta Medica","ano":2013,"doi":"10.1055/s-0032-1328070","pubmed_id":"23136064"}
  ]',
  'A'
),

(
  'Mioma',
  'Hormonal',
  'Modulação estrogênica — Curcumina + DIM + Vitex',
  'Suporte na modulação de estrogênios e redução de inflamação local. Não substitui acompanhamento ginecológico.',
  '[
    {"ativo":"Curcumina (Meriva® ou similar fitossomada)","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Diindolilmetano (DIM)","dose":"200 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Vitex agnus-castus","dose":"175 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada após o almoço',
  120,
  ARRAY['Gravidez','Cálculo biliar (Curcumina)','Anticoncepcional combinado (DIM/Vitex)'],
  ARRAY['Anticoagulantes (Curcumina)','Anticoncepcionais','Tamoxifeno'],
  'Indicado para miomas pequenos com sintomas leves. Acompanhar com ultrassom semestral.',
  '[
    {"titulo":"Curcumin in uterine fibroids: a systematic review","autores":"Tsuiji K et al.","revista":"Archives of Gynecology and Obstetrics","ano":2011,"doi":"10.1007/s00404-010-1721-9"},
    {"titulo":"Diindolylmethane and estrogen metabolism","autores":"Reed GA et al.","revista":"Cancer Epidemiology Biomarkers","ano":2008,"pubmed_id":"18841491"}
  ]',
  'C'
),

(
  'Menopausa',
  'Hormonal',
  'Climatério natural — Cimicifuga + Trifolium + Magnésio',
  'Redução de fogachos, sudorese noturna e oscilação de humor no climatério.',
  '[
    {"ativo":"Cimicifuga racemosa extrato padronizado (Remifemin®-like)","dose":"40 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Trifolium pratense (isoflavonas, 40 mg)","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Magnésio glicinato","dose":"300 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada após café da manhã',
  90,
  ARRAY['Câncer de mama hormônio-dependente','Hepatopatia ativa (Cimicifuga)','Tromboembolismo'],
  ARRAY['Tamoxifeno','Anticoagulantes','Hepatotóxicos'],
  'Início de resposta em 4–8 semanas. Reavaliar função hepática se uso > 6 meses.',
  '[
    {"titulo":"Cimicifuga racemosa for menopause: meta-analysis","autores":"Beer AM, Neff A","revista":"Evidence-Based Complementary Medicine","ano":2013,"doi":"10.1155/2013/860602","pubmed_id":"23864884"},
    {"titulo":"Red clover isoflavones in menopausal symptoms","autores":"Lipovac M et al.","revista":"Gynecological Endocrinology","ano":2012,"doi":"10.3109/09513590.2011.593671"}
  ]',
  'B'
),

(
  'Secura vaginal',
  'Hormonal',
  'Lubrificação e trofismo vaginal — Ômega-3 + Vitamina E + Sea buckthorn',
  'Melhora do trofismo da mucosa e hidratação tecidual em quadros de secura vaginal pós-menopausa.',
  '[
    {"ativo":"Óleo de espinheiro-marítimo (Hippophae rhamnoides)","dose":"3 g","forma_farmaceutica":"cápsula gelatinosa"},
    {"ativo":"Vitamina E (mistura tocoferóis naturais)","dose":"400 UI","forma_farmaceutica":"cápsula"},
    {"ativo":"Ômega-3 EPA+DHA","dose":"2 g","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada com refeição',
  90,
  ARRAY['Anticoagulação plena','Câncer ativo dependente de estrogênio (avaliar)'],
  ARRAY['Anticoagulantes (ômega-3 e vitamina E em altas doses)'],
  'Pode ser combinado com hidratante vaginal tópico (ácido hialurônico).',
  '[
    {"titulo":"Sea buckthorn oil for vaginal atrophy","autores":"Larmo PS et al.","revista":"Maturitas","ano":2014,"doi":"10.1016/j.maturitas.2014.07.010","pubmed_id":"25104582"}
  ]',
  'C'
),

(
  'Estimulação ovulatória',
  'Hormonal',
  'Suporte à fertilidade — Inositol + CoQ10 + Vitex',
  'Otimização da qualidade ovocitária e regularização do ciclo em pacientes com TTC (tentando engravidar).',
  '[
    {"ativo":"Myo-inositol + D-chiro-inositol (40:1)","dose":"4 g","forma_farmaceutica":"sachê"},
    {"ativo":"Coenzima Q10 (ubiquinol)","dose":"200 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Vitex agnus-castus","dose":"175 mg","forma_farmaceutica":"cápsula"}
  ]',
  'Inositol 1 sachê em jejum + CoQ10 e Vitex 1 cápsula cada após almoço',
  90,
  ARRAY['Gravidez confirmada (suspender Vitex)','Pacientes em FIV (avaliar com reprodutivista)'],
  ARRAY['Bromocriptina','Cabergolina','Anticoncepcionais'],
  'Suspender Vitex ao confirmar gravidez. Manter Inositol e CoQ10 em conjunto com pré-natal.',
  '[
    {"titulo":"Inositol on oocyte quality in IVF","autores":"Papaleo E et al.","revista":"Fertility and Sterility","ano":2009,"doi":"10.1016/j.fertnstert.2008.06.049","pubmed_id":"18791321"},
    {"titulo":"Coenzyme Q10 and female fertility","autores":"Bentov Y et al.","revista":"Reproductive BioMedicine Online","ano":2014,"doi":"10.1016/j.rbmo.2014.06.011"}
  ]',
  'B'
),

(
  'TPM',
  'Hormonal',
  'Modulação cíclica TPM — Vitex + B6 + Magnésio',
  'Redução de sintomas pré-menstruais físicos e emocionais (irritabilidade, mastalgia, retenção).',
  '[
    {"ativo":"Vitex agnus-castus","dose":"175 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Vitamina B6 (piridoxal-5-fosfato)","dose":"50 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Magnésio glicinato","dose":"300 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada pela manhã, durante todo o ciclo',
  90,
  ARRAY['Gravidez','Anticoncepcional combinado (Vitex pode reduzir eficácia)','Bipolaridade'],
  ARRAY['Anticoncepcionais','Antipsicóticos dopaminérgicos','L-DOPA'],
  'Resposta clínica em 2–3 ciclos. Documentar sintomas em diário menstrual.',
  '[
    {"titulo":"Vitex agnus-castus in PMS: systematic review","autores":"van Die MD et al.","revista":"Planta Medica","ano":2013,"doi":"10.1055/s-0032-1328070"},
    {"titulo":"Vitamin B-6 for PMS: systematic review","autores":"Wyatt KM et al.","revista":"BMJ","ano":1999,"doi":"10.1136/bmj.318.7195.1375"}
  ]',
  'A'
),

(
  'Acne hormonal',
  'Hormonal',
  'Anti-androgênico natural — Saw palmetto + Zinco + Vitex',
  'Redução de hiperandrogenia em acne adulta cíclica. Coadjuvante a tratamento dermatológico.',
  '[
    {"ativo":"Serenoa repens (Saw palmetto)","dose":"320 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Zinco quelato (bisglicinato)","dose":"30 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Vitex agnus-castus","dose":"175 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada após o almoço',
  120,
  ARRAY['Gravidez','Lactação','Hipersensibilidade ao zinco'],
  ARRAY['Anticoncepcionais','Anticoagulantes','Antibióticos quinolona (zinco quela)'],
  'Resposta visível a partir de 8–12 semanas. Avaliar dosagem de testosterona total e SHBG.',
  '[
    {"titulo":"Zinc in acne vulgaris: a systematic review","autores":"Cervantes J et al.","revista":"Journal of Drugs in Dermatology","ano":2018,"pubmed_id":"30005099"},
    {"titulo":"Saw palmetto extract reduces 5-alpha-reductase","autores":"Pais P","revista":"Indian Journal of Pharmaceutical Sciences","ano":2010,"doi":"10.4103/0250-474X.78529"}
  ]',
  'B'
),

-- ╔═══════════════════════════════════════════════════════════╗
-- ║ DIGESTÃO                                                  ║
-- ╚═══════════════════════════════════════════════════════════╝

(
  'Má digestão',
  'Digestão',
  'Suporte enzimático — Enzimas + Gengibre + Carminativos',
  'Melhora da digestão, redução de empachamento pós-prandial e flatulência.',
  '[
    {"ativo":"Complexo enzimático (amilase, protease, lipase, lactase)","dose":"1 dose","forma_farmaceutica":"cápsula"},
    {"ativo":"Zingiber officinale (gengibre) extrato seco","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Foeniculum vulgare (erva-doce) extrato","dose":"200 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula 15 minutos antes das refeições principais (almoço e jantar)',
  30,
  ARRAY['Pancreatite ativa','Cálculos biliares (avaliar)','Anticoagulação plena'],
  ARRAY['Anticoagulantes (gengibre)','Hipoglicemiantes'],
  'Avaliar resposta em 4 semanas. Investigar causa subjacente se sintoma persistir.',
  '[
    {"titulo":"Ginger for digestive complaints: review","autores":"Bode AM, Dong Z","revista":"Herbal Medicine: Biomolecular and Clinical Aspects","ano":2011,"pubmed_id":"22593922"}
  ]',
  'C'
),

(
  'Disbiose',
  'Digestão',
  'Reequilíbrio microbiota — Berberina + Glutamina + Probiótico',
  'Modulação da microbiota intestinal, redução de bactérias patogênicas e suporte de mucosa.',
  '[
    {"ativo":"Berberina HCl","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"L-glutamina","dose":"5 g","forma_farmaceutica":"pó"},
    {"ativo":"Probiótico multi-cepa (Lactobacillus + Bifidobacterium)","dose":"≥ 10 bilhões UFC","forma_farmaceutica":"cápsula"}
  ]',
  'Berberina 1 cápsula 2x/dia + Glutamina 1 colher (5g) em jejum + Probiótico 1 cápsula à noite',
  60,
  ARRAY['Gravidez (Berberina contraindicada)','Lactação','Insuficiência hepática'],
  ARRAY['Ciclosporina','Hipoglicemiantes','Antibióticos (espaçar 2h do probiótico)'],
  'Reavaliar com sintomas + considerar GI Map se persistente.',
  '[
    {"titulo":"Berberine and gut microbiota modulation","autores":"Habtemariam S","revista":"Pharmacological Research","ano":2020,"doi":"10.1016/j.phrs.2020.104722","pubmed_id":"32070743"},
    {"titulo":"L-glutamine and intestinal barrier function","autores":"Rao R, Samak G","revista":"Current Pharmaceutical Design","ano":2012,"doi":"10.2174/138161212803832128"}
  ]',
  'B'
),

(
  'Enzimas digestivas',
  'Digestão',
  'Reposição enzimática plena',
  'Reposição em pacientes com insuficiência enzimática funcional ou pós-cirurgia bariátrica.',
  '[
    {"ativo":"Pancreatina (amilase 18.000U + lipase 6.000U + protease 25.000U)","dose":"1 dose","forma_farmaceutica":"cápsula"},
    {"ativo":"Bromelina","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Betaína HCl","dose":"500 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada no início das refeições principais',
  60,
  ARRAY['Úlcera péptica ativa (Betaína)','Pancreatite aguda','Alergia a abacaxi (Bromelina)'],
  ARRAY['Anticoagulantes (Bromelina)','IBPs (reduzem eficácia da Betaína)'],
  'Iniciar com 1 cápsula e ajustar conforme tolerância. Suspender se houver queimação retroesternal.',
  '[
    {"titulo":"Pancreatic enzyme replacement therapy","autores":"Layer P, Keller J","revista":"Pancreatology","ano":2017,"doi":"10.1016/j.pan.2017.01.009"}
  ]',
  'C'
),

(
  'Esvaziamento gástrico',
  'Digestão',
  'Pró-cinético natural — Gengibre + Iberogast® + Tegaserod natural',
  'Estímulo da motilidade gástrica em quadros de gastroparesia funcional e dispepsia tipo dismotilidade.',
  '[
    {"ativo":"Zingiber officinale (gengibre concentrado 5%)","dose":"1000 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Iberogast® (9 ervas: Iberis amara, Carum carvi, Glycyrrhiza, etc.)","dose":"20 gotas","forma_farmaceutica":"solução"},
    {"ativo":"Mentha piperita (óleo) cápsula entérica","dose":"200 mg","forma_farmaceutica":"cápsula entérica"}
  ]',
  '1 cápsula de gengibre + 20 gotas de Iberogast antes do almoço e jantar; Hortelã se sintomas',
  30,
  ARRAY['Cálculos biliares','Refluxo gastroesofágico (Hortelã pode piorar)','Gravidez (cuidado com alcaçuz)'],
  ARRAY['Anticoagulantes (gengibre)','IBPs','Antiarrítmicos (alcaçuz)'],
  'Para gastroparesia diabética: confirmar com cintilografia antes de iniciar.',
  '[
    {"titulo":"Ginger improves gastric motility: meta-analysis","autores":"Wu KL et al.","revista":"European Journal of Gastroenterology","ano":2008,"doi":"10.1097/MEG.0b013e3282f4b224","pubmed_id":"18403946"},
    {"titulo":"STW 5 (Iberogast) in functional dyspepsia: meta-analysis","autores":"Melzer J et al.","revista":"Alimentary Pharmacology","ano":2004,"doi":"10.1111/j.1365-2036.2004.02214.x"}
  ]',
  'B'
),

(
  'Hipocloridria',
  'Digestão',
  'Estímulo de acidez gástrica — Betaína HCl + Gentiana + Zinco',
  'Suporte em hipocloridria funcional, idosos, pós-uso crônico de IBP, sintomas de empachamento e arrotos.',
  '[
    {"ativo":"Betaína HCl","dose":"650 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Gentiana lutea (gencianina) tintura","dose":"20 gotas","forma_farmaceutica":"tintura"},
    {"ativo":"Zinco quelato","dose":"15 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de Betaína + 20 gotas de Gentiana 10min antes das refeições + Zinco no almoço',
  60,
  ARRAY['Úlcera péptica','Gastrite ativa','Helicobacter pylori não tratado','Uso de AINEs'],
  ARRAY['IBPs','Antagonistas H2','Antibióticos quinolona (zinco)'],
  'Iniciar com 1 cápsula e ajustar até sentir leve calor epigástrico. Suspender se queimação.',
  '[
    {"titulo":"Betaine hydrochloride and gastric acid restoration","autores":"Yago MR et al.","revista":"Molecular Pharmaceutics","ano":2013,"doi":"10.1021/mp400035n"}
  ]',
  'D'
),

(
  'Constipação',
  'Digestão',
  'Trânsito intestinal — Psyllium + Magnésio + Probiótico',
  'Aumento de bolo fecal, atração osmótica de água ao lúmen e modulação da microbiota.',
  '[
    {"ativo":"Psyllium husk (Plantago ovata)","dose":"5 g","forma_farmaceutica":"pó"},
    {"ativo":"Magnésio citrato","dose":"400 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Probiótico Bifidobacterium animalis BB-12","dose":"≥ 1 bilhão UFC","forma_farmaceutica":"cápsula"}
  ]',
  'Psyllium 1 colher em 300ml água à noite + Magnésio à noite + Probiótico no almoço',
  60,
  ARRAY['Obstrução intestinal','Estenose esofágica (Psyllium)','Insuficiência renal (cuidado magnésio)'],
  ARRAY['Levotiroxina (espaçar 4h do Psyllium)','Antibióticos','Tetraciclinas'],
  'Aumentar ingestão hídrica para 2,5 L/dia. Resposta esperada em 7 dias.',
  '[
    {"titulo":"Psyllium for chronic constipation: meta-analysis","autores":"McRorie JW","revista":"American Journal of Gastroenterology","ano":2015,"doi":"10.1038/ajg.2014.300"}
  ]',
  'A'
),

-- ╔═══════════════════════════════════════════════════════════╗
-- ║ IMUNIDADE / INFECÇÃO                                      ║
-- ╚═══════════════════════════════════════════════════════════╝

(
  'Imunidade',
  'Imunidade',
  'Suporte imune — Equinácea + Vitamina C + Zinco',
  'Modulação imune em quadros recorrentes de IVAS (infecções de vias aéreas superiores).',
  '[
    {"ativo":"Echinacea purpurea extrato padronizado","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Vitamina C (ácido ascórbico)","dose":"1000 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Zinco quelato","dose":"15 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada pela manhã com café',
  60,
  ARRAY['Doenças autoimunes (Equinácea — imunoestimulante)','Cálculo renal de oxalato (vit C)','Hipersensibilidade ao zinco'],
  ARRAY['Imunossupressores (Equinácea)','Quimioterápicos','Anticoncepcionais'],
  'Uso por 2 meses, pausa de 1 mês. Não usar em flares de autoimunidade.',
  '[
    {"titulo":"Echinacea for the prevention of upper respiratory tract infections","autores":"Karsch-Völk M et al.","revista":"Cochrane Database","ano":2014,"doi":"10.1002/14651858.CD000530.pub3"},
    {"titulo":"Zinc lozenges and common cold: meta-analysis","autores":"Hemilä H","revista":"BMC Family Practice","ano":2013,"doi":"10.1186/1471-2296-14-94"}
  ]',
  'B'
),

(
  'Candidíase',
  'Imunidade',
  'Antifúngico natural — Ácido caprílico + Berberina + Probiótico vaginal',
  'Combate ao supercrescimento de Candida albicans intestinal e/ou vaginal.',
  '[
    {"ativo":"Ácido caprílico (cápsula entérica)","dose":"600 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Berberina HCl","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Probiótico Lactobacillus rhamnosus GR-1 + L. reuteri RC-14","dose":"≥ 1 bilhão UFC","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada após o almoço',
  30,
  ARRAY['Gravidez (Berberina)','Hepatopatia ativa','Crianças menores de 12 anos'],
  ARRAY['Ciclosporina','Hipoglicemiantes','Antibióticos (espaçar do probiótico)'],
  'Combinar com restrição alimentar de açúcares simples e álcool por 30 dias.',
  '[
    {"titulo":"Lactobacillus probiotics in vulvovaginal candidiasis","autores":"Reid G","revista":"FEMS Immunology","ano":2017,"doi":"10.1093/femspd/ftx049"},
    {"titulo":"Caprylic acid as antifungal agent","autores":"Bergsson G et al.","revista":"Antimicrobial Agents Chemotherapy","ano":2001,"doi":"10.1128/AAC.45.11.3209-3212.2001"}
  ]',
  'C'
),

(
  'ITU recorrente',
  'Imunidade',
  'Profilaxia ITU — Cranberry + D-manose + Probiótico',
  'Prevenção de ITU recorrente por inibição da adesão bacteriana ao urotélio.',
  '[
    {"ativo":"Cranberry (Vaccinium macrocarpon) PAC ≥ 36 mg","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"D-manose","dose":"2 g","forma_farmaceutica":"pó"},
    {"ativo":"Probiótico Lactobacillus rhamnosus GR-1 + L. reuteri RC-14","dose":"≥ 1 bilhão UFC","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula Cranberry + 1 dose D-manose pela manhã + Probiótico à noite',
  90,
  ARRAY['Cálculo de oxalato','Diabetes descompensada (D-manose tem pequena absorção)','Anticoagulação plena (Cranberry)'],
  ARRAY['Warfarin (Cranberry)','Antibióticos (espaçar do probiótico)'],
  'Tomar com bastante água. Manter por 90 dias e reavaliar episódios.',
  '[
    {"titulo":"Cranberry for prevention of UTI: Cochrane review","autores":"Jepson RG et al.","revista":"Cochrane Database","ano":2012,"doi":"10.1002/14651858.CD001321.pub5"},
    {"titulo":"D-mannose and recurrent UTI in women","autores":"Kranjčec B et al.","revista":"World Journal of Urology","ano":2014,"doi":"10.1007/s00345-013-1091-6","pubmed_id":"23633128"}
  ]',
  'A'
),

-- ╔═══════════════════════════════════════════════════════════╗
-- ║ COMPOSIÇÃO / PERFORMANCE                                  ║
-- ╚═══════════════════════════════════════════════════════════╝

(
  'Compulsão por doce',
  'Performance',
  'Controle glicêmico e desejo — Cromo + Gymnema + Berberina',
  'Modulação da glicemia, sensibilização à insulina e bloqueio do paladar doce (Gymnema).',
  '[
    {"ativo":"Cromo picolinato","dose":"400 mcg","forma_farmaceutica":"cápsula"},
    {"ativo":"Gymnema sylvestre extrato (25% ácidos gimnêmicos)","dose":"400 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Berberina HCl","dose":"500 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada 30min antes do almoço e jantar',
  60,
  ARRAY['Gravidez (Berberina)','Hipoglicemia frequente','Insuficiência hepática'],
  ARRAY['Hipoglicemiantes (risco de hipoglicemia)','Insulina','Ciclosporina'],
  'Monitorar glicemia capilar nos primeiros 14 dias se paciente diabético.',
  '[
    {"titulo":"Chromium for binge eating: systematic review","autores":"Tian H et al.","revista":"BMC Endocrine Disorders","ano":2013,"doi":"10.1186/1472-6823-13-2"},
    {"titulo":"Gymnema sylvestre and sweet taste suppression","autores":"Kanetkar P et al.","revista":"Journal of Clinical Biochemistry","ano":2007,"doi":"10.3164/jcbn.40.163"}
  ]',
  'B'
),

(
  'Saciedade',
  'Performance',
  'Controle de fome — 5-HTP + Garcinia + Glucomanan',
  'Aumento da saciedade pós-prandial e redução de fome hedônica em emagrecimento.',
  '[
    {"ativo":"5-Hidroxitriptofano (5-HTP)","dose":"100 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Garcinia cambogia (50% ácido hidroxicítrico)","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Glucomanan (Konjac)","dose":"1500 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada 30min antes do almoço e jantar com 300ml de água',
  60,
  ARRAY['Uso de ISRS/IMAO (5-HTP)','Síndrome serotoninérgica','Estenose esofágica (Glucomanan)'],
  ARRAY['ISRS','IMAO','Triptanos','Levotiroxina (espaçar 4h do Glucomanan)'],
  '5-HTP pode causar desconforto GI inicial. Iniciar com metade da dose por 7 dias.',
  '[
    {"titulo":"5-HTP and weight loss: clinical trial","autores":"Cangiano C et al.","revista":"American Journal of Clinical Nutrition","ano":1992,"doi":"10.1093/ajcn/56.5.863"},
    {"titulo":"Glucomannan and body weight: meta-analysis","autores":"Onakpoya I et al.","revista":"Journal of the American College of Nutrition","ano":2014,"doi":"10.1080/07315724.2013.875456"}
  ]',
  'B'
),

(
  'Redução de medidas',
  'Performance',
  'Lipólise e termogênese — L-carnitina + Cafeína + Capsaicina',
  'Estímulo da oxidação de gordura periférica em conjunto com déficit calórico estruturado.',
  '[
    {"ativo":"L-carnitina tartarato","dose":"2 g","forma_farmaceutica":"cápsula"},
    {"ativo":"Cafeína anidra","dose":"200 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Capsaicina (Capsimax®)","dose":"100 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada 30min antes do treino (ou pela manhã se sedentária)',
  60,
  ARRAY['Hipertensão não controlada','Arritmias','Gravidez','Lactação','Refluxo gastroesofágico (Capsaicina)'],
  ARRAY['Anti-hipertensivos','Anticoagulantes','Estimulantes','Tireoidianos'],
  'Não tomar após 16h. Combinar com plano de exercício.',
  '[
    {"titulo":"L-carnitine supplementation and weight loss: meta-analysis","autores":"Pooyandjoo M et al.","revista":"Obesity Reviews","ano":2016,"doi":"10.1111/obr.12436","pubmed_id":"27335245"},
    {"titulo":"Capsaicinoids and energy expenditure: meta-analysis","autores":"Whiting S et al.","revista":"Appetite","ano":2014,"doi":"10.1016/j.appet.2013.10.019"}
  ]',
  'B'
),

(
  'Hipertrofia',
  'Performance',
  'Anabolismo muscular — Creatina + Beta-alanina + HMB',
  'Tripé anabólico para hipertrofia: ressíntese de ATP, tamponamento muscular e anti-catabólico.',
  '[
    {"ativo":"Creatina monohidratada (Creapure®)","dose":"5 g","forma_farmaceutica":"pó"},
    {"ativo":"Beta-alanina","dose":"3,2 g","forma_farmaceutica":"pó"},
    {"ativo":"HMB (β-hidroxi-β-metilbutirato)","dose":"3 g","forma_farmaceutica":"cápsula"}
  ]',
  'Creatina diariamente em qualquer horário + Beta-alanina dividida em 2 doses (manhã e pré-treino) + HMB pré-treino',
  90,
  ARRAY['Insuficiência renal','Gravidez','Lactação'],
  ARRAY['Diuréticos','AINEs (cuidado renal com creatina)'],
  'Sem necessidade de saturação. Hidratar bem (35 ml/kg/dia). Beta-alanina pode causar parestesia transitória.',
  '[
    {"titulo":"International Society of Sports Nutrition position: creatine","autores":"Kreider RB et al.","revista":"JISSN","ano":2017,"doi":"10.1186/s12970-017-0173-z","pubmed_id":"28615996"},
    {"titulo":"Beta-alanine and exercise performance: meta-analysis","autores":"Saunders B et al.","revista":"British Journal of Sports Medicine","ano":2017,"doi":"10.1136/bjsports-2016-096396"}
  ]',
  'A'
),

(
  'Performance',
  'Performance',
  'Endurance e VO2máx — Beterraba + Beta-alanina + Cafeína',
  'Maximização do desempenho aeróbico através de NO (nitrato), tamponamento muscular e SNC.',
  '[
    {"ativo":"Extrato de beterraba (Beta vulgaris) — 400 mg nitrato","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Beta-alanina","dose":"3,2 g","forma_farmaceutica":"pó"},
    {"ativo":"Cafeína anidra","dose":"3 mg/kg de peso","forma_farmaceutica":"cápsula"}
  ]',
  'Beterraba 2-3h antes do treino + Beta-alanina dividida ao longo do dia + Cafeína 45min pré-treino',
  60,
  ARRAY['Hipertensão','Arritmias','Ansiedade','Gravidez'],
  ARRAY['Anti-hipertensivos','Estimulantes','Anticoagulantes'],
  'Para atletas de endurance. Cuidado com cafeína em treinos noturnos.',
  '[
    {"titulo":"Dietary nitrate and exercise performance: meta-analysis","autores":"Hoon MW et al.","revista":"International Journal of Sport Nutrition","ano":2013,"doi":"10.1123/ijsnem.23.5.522"},
    {"titulo":"Caffeine and exercise performance: ISSN position","autores":"Guest NS et al.","revista":"JISSN","ano":2021,"doi":"10.1186/s12970-020-00383-4"}
  ]',
  'A'
),

(
  'Pré-treino',
  'Performance',
  'Pré-treino estimulante — Cafeína + L-tirosina + Citrulina',
  'Foco mental, vasodilatação e energia pré-treino sem sobrecarga estimulante.',
  '[
    {"ativo":"Cafeína anidra","dose":"200 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"L-tirosina","dose":"2 g","forma_farmaceutica":"cápsula"},
    {"ativo":"L-citrulina malato","dose":"6 g","forma_farmaceutica":"pó"}
  ]',
  '1 dose 30-45min antes do treino, em 300ml de água',
  90,
  ARRAY['Hipertensão','Arritmias','Hipertireoidismo (Tirosina)','Uso de IMAO'],
  ARRAY['IMAO','Levodopa (Tirosina)','Anti-hipertensivos','Estimulantes'],
  'Não usar em treinos < 4h antes de dormir. Hidratação reforçada.',
  '[
    {"titulo":"L-citrulline supplementation in exercise: meta-analysis","autores":"Trexler ET et al.","revista":"JISSN","ano":2019,"doi":"10.1186/s12970-019-0276-9"},
    {"titulo":"Tyrosine for cognitive performance under stress","autores":"Jongkees BJ et al.","revista":"Journal of Psychiatric Research","ano":2015,"doi":"10.1016/j.jpsychires.2015.08.014"}
  ]',
  'B'
),

-- ╔═══════════════════════════════════════════════════════════╗
-- ║ OUTROS                                                    ║
-- ╚═══════════════════════════════════════════════════════════╝

(
  'Diurético natural',
  'Outros',
  'Diurese natural — Cavalinha + Hibisco + Potássio',
  'Aumento da diurese fisiológica em retenção hídrica funcional. Não substitui diurético clínico.',
  '[
    {"ativo":"Equisetum arvense (Cavalinha) extrato seco","dose":"600 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Hibiscus sabdariffa extrato","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Citrato de potássio","dose":"99 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada pela manhã e ao meio-dia (evitar à noite)',
  30,
  ARRAY['Insuficiência renal','Insuficiência cardíaca','Hiponatremia','Hipocalemia'],
  ARRAY['Diuréticos (potencialização)','iECA/BRA (hipercalemia)','Lítio'],
  'Reforçar ingestão de água. Monitorar PA e edema. Não usar > 30 dias contínuos.',
  '[
    {"titulo":"Equisetum arvense as a diuretic: clinical trial","autores":"Carneiro DM et al.","revista":"Evidence-Based Complementary","ano":2014,"doi":"10.1155/2014/760683"},
    {"titulo":"Hibiscus sabdariffa and blood pressure: meta-analysis","autores":"Serban C et al.","revista":"Journal of Hypertension","ano":2015,"doi":"10.1097/HJH.0000000000000585"}
  ]',
  'C'
),

(
  'Vitamina D',
  'Outros',
  'Reposição vitamina D — D3 + K2 + Magnésio',
  'Reposição em deficiência ou insuficiência (25-OH < 30 ng/mL). Combinação com cofatores.',
  '[
    {"ativo":"Vitamina D3 (colecalciferol)","dose":"5000 UI","forma_farmaceutica":"cápsula gelatinosa"},
    {"ativo":"Vitamina K2 MK-7 (all-trans)","dose":"100 mcg","forma_farmaceutica":"cápsula"},
    {"ativo":"Magnésio glicinato","dose":"300 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada com refeição contendo gordura',
  90,
  ARRAY['Hipercalcemia','Sarcoidose','Cálculo renal de cálcio','Anticoagulação plena (K2)'],
  ARRAY['Warfarin (K2 antagoniza efeito)','Diuréticos tiazídicos (cálcio)','Bifosfonatos'],
  'Reavaliar 25-OH em 90 dias. Meta: 40–60 ng/mL.',
  '[
    {"titulo":"Vitamin D supplementation: optimal dose","autores":"Vieth R","revista":"American Journal of Clinical Nutrition","ano":2011,"doi":"10.3945/ajcn.111.012641"},
    {"titulo":"Vitamin K2 and bone health: meta-analysis","autores":"Huang ZB et al.","revista":"Osteoporosis International","ano":2015,"doi":"10.1007/s00198-014-2989-6"}
  ]',
  'A'
),

(
  'Hipotireoidismo subclínico',
  'Outros',
  'Suporte tireoidiano — Selênio + Zinco + Tirosina',
  'Coadjuvante em Hashimoto subclínico — redução de anti-TPO e suporte enzimático.',
  '[
    {"ativo":"Selênio (selenometionina)","dose":"200 mcg","forma_farmaceutica":"cápsula"},
    {"ativo":"Zinco quelato","dose":"15 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"L-tirosina","dose":"500 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada pela manhã, em jejum (Tirosina) e com almoço (Selênio + Zinco)',
  90,
  ARRAY['Hipertireoidismo','Doença de Graves não tratada','Uso de levotiroxina sem ajuste'],
  ARRAY['Levotiroxina (Tirosina espaçar 4h)','IMAO','Anticonvulsivantes'],
  'Selênio max 400 mcg/dia. Avaliar TSH, T4L e anti-TPO antes e em 90 dias.',
  '[
    {"titulo":"Selenium supplementation in Hashimoto thyroiditis: meta-analysis","autores":"Wichman J et al.","revista":"Thyroid","ano":2016,"doi":"10.1089/thy.2015.0256","pubmed_id":"27192404"},
    {"titulo":"Zinc and thyroid function: review","autores":"Severo JS et al.","revista":"Biological Trace Element Research","ano":2019,"doi":"10.1007/s12011-018-1289-y"}
  ]',
  'B'
),

(
  'Esteatose hepática',
  'Outros',
  'Proteção hepática — Silimarina + Berberina + NAC',
  'Hepatoproteção e melhora do perfil metabólico em esteatose não alcoólica (NAFLD).',
  '[
    {"ativo":"Silymarin (Silybum marianum) extrato 80% silimarina","dose":"600 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"Berberina HCl","dose":"500 mg","forma_farmaceutica":"cápsula"},
    {"ativo":"N-acetilcisteína (NAC)","dose":"600 mg","forma_farmaceutica":"cápsula"}
  ]',
  '1 cápsula de cada após o almoço',
  120,
  ARRAY['Gravidez (Berberina)','Asma (NAC pode causar broncoespasmo raro)','Hepatopatia descompensada'],
  ARRAY['Hipoglicemiantes','Ciclosporina (Berberina)','Anticoagulantes'],
  'Reavaliar enzimas hepáticas (TGO/TGP/GGT) em 60 e 120 dias.',
  '[
    {"titulo":"Silymarin in NAFLD: systematic review","autores":"Kalopitas G et al.","revista":"Nutrition","ano":2021,"doi":"10.1016/j.nut.2020.110991","pubmed_id":"33032215"},
    {"titulo":"Berberine in NAFLD: meta-analysis","autores":"Wei X et al.","revista":"Clinics and Research in Hepatology","ano":2016,"doi":"10.1016/j.clinre.2015.11.015"}
  ]',
  'B'
)

) AS v(indicacao, categoria, nome_composto, descricao, formula, posologia, duracao_dias,
       contraindicacoes, interacoes, observacoes_clinicas, referencias, evidencia_nivel)
WHERE NOT EXISTS (
  SELECT 1 FROM prescricoes_fitoterapicos p
  WHERE p.indicacao = v.indicacao AND p.nome_composto = v.nome_composto
);

-- Verificação final
DO $$
DECLARE
  total int;
BEGIN
  SELECT count(*) INTO total FROM prescricoes_fitoterapicos WHERE ativo = true;
  RAISE NOTICE 'Total de prescricoes ativas: %', total;
END $$;
