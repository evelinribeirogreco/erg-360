// ============================================================
// anamnese-engine.js — Motor de Anamnese Dinâmica e Adaptativa
// ERG 360 — Sistema Clínico Nutricional Inteligente
// ============================================================

// ── DEFINIÇÃO DOS MÓDULOS ─────────────────────────────────────
// Cada módulo tem: slug, nome, ícone SVG, cor, descrição e perguntas.
// Perguntas: slug, label, hint, tipo, opcoes, placeholder, condicional, obrigatoria

export const MODULES = {

  // ── 1. ATLETA / PERFORMANCE / HIPERTROFIA ──────────────────
  atleta: {
    slug: 'atleta',
    nome: 'Performance & Hipertrofia',
    icone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 4v16M18 4v16M3 12h18M3 6h3M18 6h3M3 18h3M18 18h3"/></svg>`,
    cor: '#6D5ACF',
    corBg: '#f0eeff',
    descricao: 'Perguntas específicas para atletas, praticantes de atividade física intensa e foco em performance.',
    perguntas: [
      { slug: 'modalidade', label: 'Modalidade esportiva principal', tipo: 'text', placeholder: 'Ex: Musculação, crossfit, corrida, natação...' },
      { slug: 'tempo_pratica_meses', label: 'Há quanto tempo pratica esta modalidade?', tipo: 'select', opcoes: ['Menos de 6 meses', '6 a 12 meses', '1 a 3 anos', '3 a 5 anos', 'Mais de 5 anos'] },
      { slug: 'sessoes_semana', label: 'Número de sessões por semana', tipo: 'number', placeholder: 'Ex: 5' },
      { slug: 'duracao_sessao', label: 'Duração média por sessão', tipo: 'select', opcoes: ['Menos de 30 min', '30 a 60 min', '60 a 90 min', 'Mais de 90 min'] },
      { slug: 'horario_treino', label: 'Horário preferido de treino', tipo: 'toggle', opcoes: [{v:'manha', l:'Manhã'}, {v:'tarde', l:'Tarde'}, {v:'noite', l:'Noite'}, {v:'variado', l:'Variado'}] },
      { slug: 'usa_suplementos', label: 'Usa suplementos atualmente?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'quais_suplementos', label: 'Quais suplementos usa?', tipo: 'multiselect', opcoes: ['Whey Protein', 'Creatina', 'Cafeína / Pré-treino', 'BCAA', 'Glutamina', 'Ômega-3', 'Vitamina D', 'Magnésio', 'Outro'], condicional: { campo: 'usa_suplementos', valor: 'sim' } },
      { slug: 'alimentacao_pre_treino', label: 'O que costuma comer antes do treino?', tipo: 'textarea', placeholder: 'Ex: Banana com pasta de amendoim, batata-doce com frango...' },
      { slug: 'proteina_pos_treino', label: 'Consome proteína após o treino?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'tempo_proteina_pos', label: 'Em quanto tempo após o treino?', tipo: 'select', opcoes: ['Imediatamente (< 30 min)', 'Entre 30 e 60 min', 'Entre 1 e 2 horas', 'Não me preocupo com o horário'], condicional: { campo: 'proteina_pos_treino', valor: 'sim' } },
      { slug: 'meta_composicao', label: 'Meta de composição corporal', tipo: 'textarea', placeholder: 'Ex: Reduzir gordura corporal para 12%, ganhar 4 kg de massa muscular...', obrigatoria: false },
      { slug: 'historico_lesoes', label: 'Histórico de lesões musculares ou articulares', tipo: 'textarea', placeholder: 'Ex: Lesão no joelho em 2023, tendinite no ombro...', obrigatoria: false },
      { slug: 'usa_hormonios', label: 'Usa anabolizantes ou hormônios?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'competicoes', label: 'Tem competições planejadas?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'data_competicao', label: 'Data da próxima competição', tipo: 'date', condicional: { campo: 'competicoes', valor: 'sim' } },
      { slug: 'gi_treino', label: 'Tem desconfortos gastrointestinais durante o exercício?', tipo: 'textarea', placeholder: 'Ex: Náusea, cólica, refluxo, inchaço...', obrigatoria: false },
    ]
  },

  // ── 2. EMAGRECIMENTO ───────────────────────────────────────
  emagrecimento: {
    slug: 'emagrecimento',
    nome: 'Emagrecimento',
    icone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    cor: '#2E8B6A',
    corBg: '#edf7f3',
    descricao: 'Perguntas específicas para pacientes com objetivo de perda de peso e emagrecimento saudável.',
    perguntas: [
      { slug: 'kg_deseja_perder', label: 'Quantos kg deseja perder?', tipo: 'number', placeholder: 'Ex: 10' },
      { slug: 'dietas_anteriores', label: 'Já fez outras dietas ou tratamentos para emagrecer?', tipo: 'textarea', placeholder: 'Ex: Tentei dieta low-carb por 2 meses em 2022, funcionou mas não mantive...' },
      { slug: 'maior_obstaculo', label: 'Qual o maior obstáculo para emagrecer?', tipo: 'select', opcoes: ['Ansiedade e compulsão alimentar', 'Falta de tempo para cozinhar', 'Dificuldade de manutenção a longo prazo', 'Fome excessiva', 'Confusão sobre o que comer', 'Falta de motivação', 'Outro'] },
      { slug: 'compulsao_alimentar', label: 'Tem episódios de compulsão alimentar?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'as-vezes', l:'Às vezes'}, {v:'nao', l:'Não'}] },
      { slug: 'frequencia_compulsao', label: 'Com que frequência ocorre?', tipo: 'select', opcoes: ['Diariamente', 'Algumas vezes por semana', 'Semanalmente', 'Raramente (< 1x/semana)'], condicional: { campo: 'compulsao_alimentar', valor: 'sim' } },
      { slug: 'gatilhos_compulsao', label: 'Quais são os gatilhos?', tipo: 'textarea', placeholder: 'Ex: Estresse, ansiedade, entedimento, situações sociais...', condicional: { campo: 'compulsao_alimentar', valor: 'sim' } },
      { slug: 'usa_med_emagrecimento', label: 'Usa ou já usou medicação para emagrecimento?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'qual_med_emagrecimento', label: 'Qual medicação e resultado?', tipo: 'text', placeholder: 'Ex: Ozempic 1mg — perdeu 8kg em 6 meses', condicional: { campo: 'usa_med_emagrecimento', valor: 'sim' } },
      { slug: 'historico_yoyo', label: 'Tem histórico de efeito sanfona (emagrece e engorda)?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'fome_emocional_detail', label: 'Come mais quando está estressada ou ansiosa?', tipo: 'toggle', opcoes: [{v:'sempre', l:'Sempre'}, {v:'as-vezes', l:'Às vezes'}, {v:'raramente', l:'Raramente'}, {v:'nao', l:'Não'}] },
      { slug: 'restricao_calorica', label: 'Costuma fazer restrições calóricas severas (pular refeições, comer muito pouco)?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'as-vezes', l:'Às vezes'}, {v:'nao', l:'Não'}] },
      { slug: 'alimentos_gatilho', label: 'Tem alimentos gatilho (difícil parar de comer)?', tipo: 'textarea', placeholder: 'Ex: Chocolate, pão, doces, frituras...', obrigatoria: false },
      { slug: 'horario_comer_mais', label: 'Qual período do dia come mais?', tipo: 'select', opcoes: ['Café da manhã', 'Almoço', 'Tarde (15h-18h)', 'Noite (após 20h)', 'Madrugada', 'Sem padrão definido'] },
    ]
  },

  // ── 3. DIABETES / RESISTÊNCIA INSULÍNICA ───────────────────
  diabetes_ri: {
    slug: 'diabetes_ri',
    nome: 'Diabetes & Resistência Insulínica',
    icone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    cor: '#C0632A',
    corBg: '#fdf3ec',
    descricao: 'Perguntas específicas para controle glicêmico, manejo de diabetes e resistência insulínica.',
    perguntas: [
      { slug: 'tipo_diabetes', label: 'Classificação do diagnóstico', tipo: 'select', opcoes: ['Diabetes tipo 1', 'Diabetes tipo 2', 'Diabetes gestacional', 'Pré-diabetes', 'Resistência insulínica (sem DM confirmado)', 'MODY / Outro tipo'] },
      { slug: 'tempo_diagnostico', label: 'Há quanto tempo tem o diagnóstico?', tipo: 'select', opcoes: ['Menos de 1 ano', '1 a 3 anos', '3 a 10 anos', 'Mais de 10 anos', 'Diagnóstico recente (< 3 meses)'] },
      { slug: 'usa_insulina', label: 'Usa insulina?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'tipo_insulina', label: 'Tipo e dose de insulina', tipo: 'text', placeholder: 'Ex: Insulina glargina 20UI/noite + lispro 6UI nas refeições', condicional: { campo: 'usa_insulina', valor: 'sim' } },
      { slug: 'usa_hipoglicemiante', label: 'Usa hipoglicemiante oral?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'qual_hipoglicemiante', label: 'Qual medicamento e dose?', tipo: 'text', placeholder: 'Ex: Metformina 850mg 2x/dia, Jardiance 10mg', condicional: { campo: 'usa_hipoglicemiante', valor: 'sim' } },
      { slug: 'monitora_glicemia', label: 'Monitora glicemia em casa?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'freq_monitoramento', label: 'Com que frequência monitora?', tipo: 'select', opcoes: ['Várias vezes ao dia', 'Uma vez ao dia (jejum)', 'Algumas vezes por semana', 'Raramente'], condicional: { campo: 'monitora_glicemia', valor: 'sim' } },
      { slug: 'glicemia_jejum_habitual', label: 'Glicemia de jejum habitual (média)', tipo: 'number', placeholder: 'Ex: 112', condicional: { campo: 'monitora_glicemia', valor: 'sim' } },
      { slug: 'hipoglicemias', label: 'Tem episódios de hipoglicemia?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'sintomas_ri', label: 'Sintomas associados à resistência insulínica', tipo: 'multiselect', opcoes: ['Cansaço / sonolência após refeições', 'Fome frequente mesmo após comer', 'Acantose nigricans (manchas escuras no pescoço / axilas)', 'Dificuldade para emagrecer', 'Irregularidade menstrual', 'Polidipsia (sede excessiva)', 'Poliúria (urinar muito)', 'Visão embaçada'] },
      { slug: 'horario_medicacoes', label: 'Horário de tomada das medicações', tipo: 'text', placeholder: 'Ex: Metformina às 7h e 19h com refeição' },
      { slug: 'dieta_lowcarb_experiencia', label: 'Já seguiu dieta low-carb ou cetogênica?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'resultado_lowcarb', label: 'Qual foi o resultado?', tipo: 'text', placeholder: 'Ex: Glicemia normalizou mas não mantive por mais de 3 meses', condicional: { campo: 'dieta_lowcarb_experiencia', valor: 'sim' } },
      { slug: 'complicacoes_dm', label: 'Tem complicações do diabetes?', tipo: 'textarea', placeholder: 'Ex: Neuropatia periférica, retinopatia, nefropatia, pé diabético...', obrigatoria: false },
    ]
  },

  // ── 4. HIPERTENSÃO ─────────────────────────────────────────
  hipertensao: {
    slug: 'hipertensao',
    nome: 'Hipertensão Arterial',
    icone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    cor: '#B33030',
    corBg: '#fdf0f0',
    descricao: 'Perguntas específicas para manejo da hipertensão arterial e protocolo DASH.',
    perguntas: [
      { slug: 'pa_sistolica_atual', label: 'Pressão arterial sistólica atual (mmHg)', tipo: 'number', placeholder: 'Ex: 138' },
      { slug: 'pa_diastolica_atual', label: 'Pressão arterial diastólica atual (mmHg)', tipo: 'number', placeholder: 'Ex: 88' },
      { slug: 'tempo_hipertensao', label: 'Há quanto tempo tem hipertensão?', tipo: 'select', opcoes: ['Menos de 1 ano', '1 a 3 anos', '3 a 10 anos', 'Mais de 10 anos', 'Diagnóstico recente'] },
      { slug: 'usa_anti_hipertensivo', label: 'Usa anti-hipertensivo?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'qual_anti_hipertensivo', label: 'Qual medicamento(s) e dose?', tipo: 'text', placeholder: 'Ex: Losartana 50mg 1x/dia, Anlodipino 5mg', condicional: { campo: 'usa_anti_hipertensivo', valor: 'sim' } },
      { slug: 'controla_em_casa', label: 'Controla a pressão em casa?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'freq_controle_ha', label: 'Com que frequência?', tipo: 'select', opcoes: ['Diariamente', 'Algumas vezes por semana', 'Semanalmente', 'Raramente'], condicional: { campo: 'controla_em_casa', valor: 'sim' } },
      { slug: 'historico_picos', label: 'Já teve picos hipertensivos ou crises?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'consumo_sodio_ha', label: 'Como classifica seu consumo de sódio?', tipo: 'select', opcoes: ['Muito alto — processados, embutidos e sal diariamente', 'Alto — frequência de 3 a 5x/semana', 'Moderado — cuida mas não controla rigidamente', 'Baixo — evita sal e processados'] },
      { slug: 'edema', label: 'Tem edema (inchaço) em membros?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'as-vezes', l:'Às vezes'}, {v:'nao', l:'Não'}] },
      { slug: 'sintomas_ha', label: 'Sintomas frequentes', tipo: 'multiselect', opcoes: ['Cefaleia / dor de cabeça', 'Tontura / vertigem', 'Visão turva', 'Palpitações', 'Zumbido no ouvido', 'Cansaço fácil', 'Falta de ar', 'Nenhum'] },
      { slug: 'acompanhamento_cardio', label: 'Faz acompanhamento com cardiologista?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'doenca_renal_assoc', label: 'Tem doença renal associada?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
    ]
  },

  // ── 5. SOP — SÍNDROME DOS OVÁRIOS POLICÍSTICOS ─────────────
  sop: {
    slug: 'sop',
    nome: 'Síndrome dos Ovários Policísticos',
    icone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
    cor: '#9B3C8E',
    corBg: '#f9eef8',
    descricao: 'Perguntas específicas para manejo clínico e nutricional da síndrome dos ovários policísticos.',
    perguntas: [
      { slug: 'ciclo_regular', label: 'Ciclo menstrual regular?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'irregular', l:'Irregular'}, {v:'ausente', l:'Ausente'}] },
      { slug: 'intervalo_ciclo_dias', label: 'Intervalo médio entre os ciclos (dias)', tipo: 'number', placeholder: 'Ex: 35 (padrão: 21-35 dias)' },
      { slug: 'duracao_menstruacao_dias', label: 'Duração habitual da menstruação (dias)', tipo: 'number', placeholder: 'Ex: 5' },
      { slug: 'sintomas_sop', label: 'Sintomas presentes', tipo: 'multiselect', opcoes: ['Acne', 'Hirsutismo (pelos em excesso)', 'Alopecia / queda de cabelo', 'Acantose nigricans (manchas escuras)', 'Ovários policísticos confirmados (ultrassom)', 'Nenhum dos acima'] },
      { slug: 'usa_anticoncepcional', label: 'Usa anticoncepcional?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'qual_anticoncepcional', label: 'Qual e há quanto tempo?', tipo: 'text', placeholder: 'Ex: Diane 35 há 2 anos', condicional: { campo: 'usa_anticoncepcional', valor: 'sim' } },
      { slug: 'usa_metformina_sop', label: 'Usa metformina?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'dose_metformina', label: 'Dose e frequência', tipo: 'text', placeholder: 'Ex: 850mg 2x/dia com refeição', condicional: { campo: 'usa_metformina_sop', valor: 'sim' } },
      { slug: 'deseja_engravidar', label: 'Tem desejo de engravidar nos próximos 12 meses?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}, {v:'ja-gravida', l:'Já está grávida'}] },
      { slug: 'ri_confirmada_sop', label: 'Tem resistência insulínica confirmada em exames?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}, {v:'nao-sabe', l:'Não sabe'}] },
      { slug: 'retencao_hidrica', label: 'Tem sensação de inchaço ou retenção hídrica?', tipo: 'toggle', opcoes: [{v:'sempre', l:'Sempre'}, {v:'ciclo', l:'Na fase pré-menstrual'}, {v:'raramente', l:'Raramente'}, {v:'nao', l:'Não'}] },
      { slug: 'oscilacoes_humor', label: 'Tem oscilações de humor frequentes?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'as-vezes', l:'Às vezes'}, {v:'nao', l:'Não'}] },
      { slug: 'historico_familiar_sop', label: 'Tem histórico familiar de SOP ou diabetes?', tipo: 'toggle', opcoes: [{v:'sop', l:'SOP na família'}, {v:'diabetes', l:'Diabetes na família'}, {v:'ambos', l:'Ambos'}, {v:'nao', l:'Não'} ] },
    ]
  },

  // ── 6. DISLIPIDEMIA ────────────────────────────────────────
  dislipidemia: {
    slug: 'dislipidemia',
    nome: 'Dislipidemia',
    icone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    cor: '#B07A1A',
    corBg: '#fdf7e8',
    descricao: 'Perguntas específicas para manejo do perfil lipídico e risco cardiovascular.',
    perguntas: [
      { slug: 'col_total_recente', label: 'Colesterol total mais recente (mg/dL)', tipo: 'number', placeholder: 'Ex: 220' },
      { slug: 'ldl_recente', label: 'LDL mais recente (mg/dL)', tipo: 'number', placeholder: 'Ex: 145' },
      { slug: 'hdl_recente', label: 'HDL mais recente (mg/dL)', tipo: 'number', placeholder: 'Ex: 42' },
      { slug: 'tg_recente', label: 'Triglicerídeos mais recentes (mg/dL)', tipo: 'number', placeholder: 'Ex: 210' },
      { slug: 'usa_estatina', label: 'Usa estatina?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'qual_estatina', label: 'Qual estatina e dose?', tipo: 'text', placeholder: 'Ex: Rosuvastatina 10mg 1x/noite', condicional: { campo: 'usa_estatina', valor: 'sim' } },
      { slug: 'usa_fibrato', label: 'Usa fibrato?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'consumo_gord_saturada', label: 'Frequência de gorduras saturadas (carnes gordas, laticínios integrais, embutidos, fast food)', tipo: 'select', opcoes: ['Diariamente', '3 a 5x por semana', '1 a 2x por semana', 'Raramente / quase nunca'] },
      { slug: 'consumo_omega3_dis', label: 'Consome ômega-3 com regularidade (peixe ou suplemento)?', tipo: 'select', opcoes: ['Sim, diariamente', 'Sim, algumas vezes por semana', 'Raramente', 'Não consome'] },
      { slug: 'consumo_fibras', label: 'Consome fibras solúveis regularmente (aveia, leguminosas, frutas)?', tipo: 'select', opcoes: ['Diariamente', 'Algumas vezes por semana', 'Raramente', 'Quase nunca'] },
      { slug: 'historico_cv', label: 'Tem histórico familiar de doença cardiovascular precoce?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'evento_cv_proprio', label: 'Já teve algum evento cardiovascular próprio?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'qual_evento_cv', label: 'Qual evento?', tipo: 'text', placeholder: 'Ex: Infarto em 2020, AVC isquêmico...', condicional: { campo: 'evento_cv_proprio', valor: 'sim' } },
    ]
  },

  // ── 7. GESTANTE ────────────────────────────────────────────
  gestante: {
    slug: 'gestante',
    nome: 'Gestação',
    icone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8v4l3 3"/><circle cx="19" cy="5" r="3"/></svg>`,
    cor: '#2A7E8C',
    corBg: '#edf7f8',
    descricao: 'Perguntas específicas para nutrição gestacional e acompanhamento do pré-natal.',
    perguntas: [
      { slug: 'semana_gestacional', label: 'Semana gestacional atual', tipo: 'number', placeholder: 'Ex: 24' },
      { slug: 'trimestre', label: 'Trimestre', tipo: 'toggle', opcoes: [{v:'1', l:'1º (1-12 sem)'}, {v:'2', l:'2º (13-27 sem)'}, {v:'3', l:'3º (28-40 sem)'}] },
      { slug: 'num_gestacoes_total', label: 'Número total de gestações (incluindo a atual)', tipo: 'number', placeholder: 'Ex: 2' },
      { slug: 'realiza_prenatal', label: 'Realiza pré-natal regularmente?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'especialista_prenatal', label: 'Com qual especialista?', tipo: 'text', placeholder: 'Ex: Obstetra Dr.ª Ana Lima, UBS', condicional: { campo: 'realiza_prenatal', valor: 'sim' } },
      { slug: 'enjoos_vomitos', label: 'Tem enjoos ou vômitos?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'leves', l:'Leves'}, {v:'nao', l:'Não'}] },
      { slug: 'freq_enjoos', label: 'Em qual período do dia?', tipo: 'select', opcoes: ['Pela manhã (ao acordar)', 'Durante todo o dia', 'À noite', 'Sem padrão definido'], condicional: { campo: 'enjoos_vomitos', valor: 'sim' } },
      { slug: 'hiperemese', label: 'Tem hiperêmese gravídica (vômitos intensos com perda de peso > 5%)?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'dm_gestacional', label: 'Tem diabetes gestacional?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}, {v:'suspeita', l:'Suspeita / em investigação'}] },
      { slug: 'has_gestacional', label: 'Tem hipertensão gestacional ou pré-eclâmpsia?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}, {v:'suspeita', l:'Suspeita'}] },
      { slug: 'suplementos_prenatal', label: 'Suplementos em uso na gestação', tipo: 'multiselect', opcoes: ['Ácido fólico', 'Ferro', 'Vitamina D', 'Cálcio', 'Ômega-3 / DHA', 'Iodo', 'Multivitamínico gestacional', 'Nenhum'] },
      { slug: 'desejo_aversao_alim', label: 'Tem desejos ou aversões alimentares específicas?', tipo: 'textarea', placeholder: 'Ex: Desejo por frutas cítricas, aversão a carne vermelha...', obrigatoria: false },
      { slug: 'ganho_peso_atual_kg', label: 'Ganho de peso até agora na gestação (kg)', tipo: 'number', placeholder: 'Ex: 8.5' },
      { slug: 'amamentando_outro', label: 'Está amamentando outro filho concomitantemente?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
    ]
  },

  // ── 8. IDOSO ───────────────────────────────────────────────
  idoso: {
    slug: 'idoso',
    nome: 'Nutrição do Idoso',
    icone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    cor: '#4A6B9B',
    corBg: '#eff3fa',
    descricao: 'Perguntas específicas para as necessidades nutricionais e particularidades clínicas do paciente idoso.',
    perguntas: [
      { slug: 'num_medicamentos', label: 'Quantos medicamentos usa regularmente?', tipo: 'number', placeholder: 'Ex: 5' },
      { slug: 'lista_medicamentos_idoso', label: 'Liste os principais medicamentos', tipo: 'textarea', placeholder: 'Ex: AAS 100mg, Atorvastatina 20mg, Metformina 500mg...' },
      { slug: 'polifarmacia', label: 'Tem dificuldade para tomar todos os medicamentos?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'dificuldade_mastigacao', label: 'Tem dificuldade de mastigação?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'as-vezes', l:'Às vezes'}, {v:'nao', l:'Não'}] },
      { slug: 'usa_protese', label: 'Usa prótese dentária?', tipo: 'toggle', opcoes: [{v:'total', l:'Total'}, {v:'parcial', l:'Parcial'}, {v:'nao', l:'Não'}] },
      { slug: 'disfagia', label: 'Tem disfagia (dificuldade para engolir)?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'solidos', l:'Apenas sólidos'}, {v:'nao', l:'Não'}] },
      { slug: 'autonomia_alimentar', label: 'Come sozinho ou precisa de auxílio?', tipo: 'select', opcoes: ['Come totalmente sozinho', 'Precisa de auxílio parcial para se servir', 'Precisa de auxílio para cortar alimentos', 'Dependente para alimentação'] },
      { slug: 'isolamento_social', label: 'Come sozinho frequentemente?', tipo: 'toggle', opcoes: [{v:'sempre', l:'Sempre'}, {v:'as-vezes', l:'Às vezes'}, {v:'raramente', l:'Raramente'}, {v:'nao', l:'Não'}] },
      { slug: 'acompanhamento_geriatrico', label: 'Faz acompanhamento geriátrico?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
      { slug: 'osteoporose_idoso', label: 'Tem osteoporose diagnosticada?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'osteopenia', l:'Osteopenia'}, {v:'nao', l:'Não'}] },
      { slug: 'sarcopenia', label: 'Tem sarcopenia diagnosticada ou suspeita de perda muscular?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'suspeita', l:'Suspeita'}, {v:'nao', l:'Não'}] },
      { slug: 'incontinencia', label: 'Tem incontinência urinária?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'as-vezes', l:'Às vezes'}, {v:'nao', l:'Não'}] },
      { slug: 'usa_laxante_idoso', label: 'Usa laxantes com frequência?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'as-vezes', l:'Às vezes'}, {v:'nao', l:'Não'}] },
      { slug: 'quedas_recentes', label: 'Teve quedas nos últimos 12 meses?', tipo: 'toggle', opcoes: [{v:'sim', l:'Sim'}, {v:'nao', l:'Não'}] },
    ]
  }
};

// ── REGRAS DE ATIVAÇÃO DOS MÓDULOS ───────────────────────────
// logica: 'OR' = qualquer condição ativa o módulo
// Condição: { campo, valores } — campo é o dado da anamnese base

export const ACTIVATION_RULES = [
  {
    module: 'atleta',
    logica: 'OR',
    condicoes: [
      { campo: 'nivel_af',      valores: ['muito-ativo', 'extremamente-ativo'] },
      { campo: 'intensidade_af', valores: ['intensa'] },
      { campo: 'texto_livre',   palavras: ['hipertrofia', 'performance', 'atleta', 'competicao', 'musculo', 'musculacao', 'crossfit', 'corrida', 'natacao', 'ciclismo', 'triathlon'] },
    ]
  },
  {
    module: 'emagrecimento',
    logica: 'OR',
    condicoes: [
      { campo: 'texto_livre', palavras: ['emagrecimento', 'emagrecer', 'perda de peso', 'perder peso', 'reduzir peso', 'gordura', 'emagrecimento', 'pesar menos'] },
    ]
  },
  {
    module: 'diabetes_ri',
    logica: 'OR',
    condicoes: [
      { campo: 'patologias', valores: ['Diabetes', 'Resistência insulínica', 'Síndrome metabólica', 'Hipoglicemia'] },
      { campo: 'texto_livre', palavras: ['diabetes', 'insulina', 'glicemia', 'glicemico', 'resistencia insulinica', 'hba1c', 'metformina'] },
    ]
  },
  {
    module: 'hipertensao',
    logica: 'OR',
    condicoes: [
      { campo: 'patologias', valores: ['Hipertensão', 'Cardíaco', 'Circulatório', 'Trombose'] },
      { campo: 'texto_livre', palavras: ['hipertensao', 'pressao alta', 'cardiovascular', 'pressao arterial', 'losartana', 'enalapril'] },
    ]
  },
  {
    module: 'sop',
    logica: 'OR',
    condicoes: [
      { campo: 'patologias', valores: ['SOP', 'Amenorreia', 'Endócrino'] },
      { campo: 'texto_livre', palavras: ['sop', 'ovario policistico', 'ovarios policisticos', 'hormonio', 'ciclo irregular', 'amenorreia', 'inositol'] },
    ]
  },
  {
    module: 'dislipidemia',
    logica: 'OR',
    condicoes: [
      { campo: 'patologias', valores: ['Dislipidemia', 'Síndrome metabólica'] },
      { campo: 'texto_livre', palavras: ['colesterol', 'triglicerides', 'dislipidemia', 'ldl', 'hdl', 'lipidio', 'estatina', 'fibrato'] },
    ]
  },
  {
    module: 'gestante',
    logica: 'OR',
    condicoes: [
      { campo: 'patologias', valores: ['Gestante', 'Gestação'] },
      { campo: 'texto_livre', palavras: ['gestante', 'gravidez', 'gravida', 'prenatal', 'pre-natal', 'gestacao', 'trimestre', 'amamentacao'] },
    ]
  },
  {
    module: 'idoso',
    logica: 'OR',
    condicoes: [
      { campo: 'idade_minima', valor: 60 },
      { campo: 'texto_livre', palavras: ['idoso', 'idosa', 'sarcopenia', 'osteoporose', 'disfagia', 'terceira idade'] },
    ]
  }
];

// ── DETECÇÃO AUTOMÁTICA DE MÓDULOS ───────────────────────────
// dados: { motivo, caso_clinico, patologias: [], nivel_af, intensidade_af, idade }
export function detectarModulos(dados) {
  const ativados = [];
  const textoLivre = normalizar((dados.motivo || '') + ' ' + (dados.caso_clinico || '') + ' ' + (dados.outras_patologias || ''));
  const patologias = Array.isArray(dados.patologias) ? dados.patologias : [];

  for (const rule of ACTIVATION_RULES) {
    let ativado = false;

    for (const cond of rule.condicoes) {
      let match = false;

      if (cond.campo === 'texto_livre') {
        match = cond.palavras.some(p => textoLivre.includes(normalizar(p)));

      } else if (cond.campo === 'patologias') {
        match = cond.valores.some(v => patologias.some(p => normalizar(p).includes(normalizar(v))));

      } else if (cond.campo === 'nivel_af') {
        match = cond.valores.includes(dados.nivel_af);

      } else if (cond.campo === 'intensidade_af') {
        match = cond.valores.includes(dados.intensidade_af);

      } else if (cond.campo === 'idade_minima') {
        match = (parseInt(dados.idade) || 0) >= cond.valor;
      }

      if (match) { ativado = true; break; }
    }

    if (ativado && !ativados.includes(rule.module)) {
      ativados.push(rule.module);
    }
  }

  return ativados;
}

function normalizar(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// ── RENDERIZAÇÃO: tela de introdução dos módulos ─────────────
export function renderModuleIntroStep(modulosAtivos) {
  if (!modulosAtivos.length) return '';

  const cards = modulosAtivos.map(slug => {
    const mod = MODULES[slug];
    if (!mod) return '';
    return `
      <div class="module-intro-card" style="border-left:3px solid ${mod.cor};background:${mod.corBg}">
        <div class="module-intro-icon" style="color:${mod.cor}">${mod.icone}</div>
        <div class="module-intro-text">
          <p class="module-intro-nome">${mod.nome}</p>
          <p class="module-intro-desc">${mod.descricao}</p>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="form-step" id="step-modules-intro">
      <header class="page-header fade-up">
        <div class="module-badge-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Módulos adicionados automaticamente
        </div>
        <h1 class="page-title">Perguntas Personalizadas</h1>
        <p class="page-greeting" style="max-width:520px;line-height:1.6">
          Com base no perfil clínico e objetivo desta paciente, o sistema identificou
          <strong>${modulosAtivos.length} módulo${modulosAtivos.length > 1 ? 's' : ''} adicional${modulosAtivos.length > 1 ? 'is' : ''}</strong>
          com perguntas específicas para uma conduta mais precisa.
        </p>
      </header>

      <section class="section fade-up fade-up-delay-1">
        <div class="modules-intro-list">
          ${cards}
        </div>
      </section>

      <section class="section fade-up fade-up-delay-2" style="padding:20px 28px;background:var(--bg2);border:1px solid var(--detail);">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.75rem;color:var(--sub);line-height:1.6;margin:0;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg> As respostas desses módulos são salvas separadamente e geram
          <strong>insights clínicos automáticos</strong> ao final da anamnese.
          Todas as seções são opcionais — pule se não forem relevantes para este atendimento.
        </p>
      </section>
    </div>`;
}

// ── RENDERIZAÇÃO: passo de um módulo ─────────────────────────
export function renderModuleStep(slug) {
  const mod = MODULES[slug];
  if (!mod) return '';

  const perguntas = mod.perguntas.map((p, i) => renderPergunta(p, slug, i)).join('');

  return `
    <div class="form-step" id="step-mod-${slug}" data-module="${slug}">
      <header class="page-header fade-up">
        <div class="module-badge-pill" style="background:${mod.corBg};color:${mod.cor};border-color:${mod.cor}30">
          ${mod.icone} Módulo Adicional
        </div>
        <h1 class="page-title">${mod.nome}</h1>
      </header>
      <section class="section fade-up fade-up-delay-1">
        <div id="modulo-${slug}-perguntas">
          ${perguntas}
        </div>
      </section>
    </div>`;
}

// ── Renderiza uma pergunta individual ─────────────────────────
function renderPergunta(p, moduleSlug, idx) {
  const id  = `mod__${moduleSlug}__${p.slug}`;
  const obr = p.obrigatoria === false ? '' : '';

  const condicAttr = p.condicional
    ? `data-cond-campo="mod__${moduleSlug}__${p.condicional.campo}" data-cond-valor="${p.condicional.valor}"`
    : '';
  const condicClass = p.condicional ? 'field-conditional hidden' : '';

  let input = '';
  switch (p.tipo) {
    case 'text':
      input = `<input class="form-input" type="text" id="${id}" placeholder="${p.placeholder || ''}">`;
      break;

    case 'number':
      input = `<input class="form-input" type="number" id="${id}" placeholder="${p.placeholder || ''}" step="any">`;
      break;

    case 'textarea':
      input = `<textarea class="form-input form-textarea" id="${id}" rows="3" placeholder="${p.placeholder || ''}"></textarea>`;
      break;

    case 'date':
      input = `<input class="form-input" type="date" id="${id}">`;
      break;

    case 'toggle': {
      const btns = p.opcoes.map(o =>
        `<button type="button" class="toggle-btn" data-field="${id}" data-value="${o.v}"
          onclick="engineToggle(this,'${id}','${o.v}')">${o.l}</button>`
      ).join('');
      input = `<div class="btn-group">${btns}</div><input type="hidden" id="${id}">`;
      break;
    }

    case 'select': {
      const opts = p.opcoes.map(o => `<option value="${o}">${o}</option>`).join('');
      input = `<select class="form-input" id="${id}"><option value="">Selecione...</option>${opts}</select>`;
      break;
    }

    case 'multiselect': {
      const chips = p.opcoes.map(o =>
        `<button type="button" class="patologia-btn" data-field="${id}" data-value="${o}"
          onclick="engineMultiToggle(this,'${id}')">${o}</button>`
      ).join('');
      input = `<div class="patologias-grid">${chips}</div><input type="hidden" id="${id}" value="">`;
      break;
    }
  }

  const hint = p.hint ? `<p class="field-hint">${p.hint}</p>` : '';

  return `
    <div class="form-group ${condicClass}" id="group-${id}" ${condicAttr}>
      <label class="form-label">${p.label}${obr}</label>
      ${hint}
      ${input}
    </div>`;
}

// ── Handlers de interação injetados no window ─────────────────
// Necessário porque botões são criados dinamicamente (innerHTML)
window.engineToggle = function(btn, fieldId, valor) {
  // Desmarca irmãos
  document.querySelectorAll(`.toggle-btn[data-field="${fieldId}"]`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Atualiza hidden
  const hidden = document.getElementById(fieldId);
  if (hidden) {
    hidden.value = valor;
    // Dispara condicionais
    checkModuleConditionals(fieldId, valor);
  }
};

window.engineMultiToggle = function(btn, fieldId) {
  btn.classList.toggle('active');
  const hidden = document.getElementById(fieldId);
  if (!hidden) return;
  const ativos = Array.from(document.querySelectorAll(`.patologia-btn[data-field="${fieldId}"].active`))
                      .map(b => b.dataset.value);
  hidden.value = ativos.join('|');
};

// ── Lógica de campos condicionais ─────────────────────────────
function checkModuleConditionals(changedFieldId, newValue) {
  document.querySelectorAll(`.field-conditional[data-cond-campo="${changedFieldId}"]`).forEach(group => {
    const expectedVal = group.dataset.condValor;
    if (newValue === expectedVal) {
      group.classList.remove('hidden');
    } else {
      group.classList.add('hidden');
    }
  });
}

// Re-checa todos os condicionais ao inicializar
export function initModuleConditionals(slug) {
  const prefix = `mod__${slug}__`;
  document.querySelectorAll(`[data-cond-campo]`).forEach(group => {
    const campoId = group.dataset.condCampo;
    if (!campoId.startsWith(prefix)) return;
    const hidden = document.getElementById(campoId);
    if (hidden && hidden.value) {
      checkModuleConditionals(campoId, hidden.value);
    }
  });
}

// ── COLETA DE RESPOSTAS DOS MÓDULOS ──────────────────────────
// Retorna objeto com todas as respostas dos módulos ativos
export function coletarRespostasModulos(modulosAtivos) {
  const resultado = {};

  for (const slug of modulosAtivos) {
    const mod = MODULES[slug];
    if (!mod) continue;

    resultado[slug] = {};

    for (const p of mod.perguntas) {
      const id = `mod__${slug}__${p.slug}`;
      const el = document.getElementById(id);
      if (!el) continue;

      let valor = null;
      if (p.tipo === 'number') {
        const n = parseFloat(el.value);
        valor = isNaN(n) ? null : n;
      } else if (p.tipo === 'multiselect') {
        valor = el.value ? el.value.split('|').filter(Boolean) : [];
      } else {
        valor = el.value?.trim() || null;
      }

      resultado[slug][p.slug] = valor;
    }
  }

  return resultado;
}

// ── GERAÇÃO DE INSIGHTS CLÍNICOS ─────────────────────────────
export function gerarInsights(dadosBase, respostasModulos, modulosAtivos) {
  const alertas   = [];
  const condutas  = [];
  const prioridades = [];

  // ── Base: sono e estresse
  if (dadosBase.qualidade_sono === 'mal') {
    alertas.push({ tipo: 'atencao', msg: 'Sono de má qualidade — pode elevar cortisol, grelina e dificultar a perda de peso.' });
  }
  const estresse = parseInt(dadosBase.escala_estresse);
  if (!isNaN(estresse) && estresse >= 7) {
    alertas.push({ tipo: 'atencao', msg: `Nível de estresse elevado (${estresse}/10) — eixo cortisol-insulina impactado.` });
    condutas.push('Considere abordagem de mindful eating e estratégias de manejo do estresse.');
  }
  if (dadosBase.nivel_af === 'sedentario') {
    alertas.push({ tipo: 'info', msg: 'Paciente sedentária — meta gradual de 150 min/semana de atividade moderada.' });
  }
  if (dadosBase.ingere_alcool === 'true' || dadosBase.ingere_alcool === true) {
    condutas.push('Redução ou eliminação de álcool pode impactar positivamente glicemia, peso e triglicerídeos.');
  }
  if (dadosBase.fumante === 'true' || dadosBase.fumante === true) {
    alertas.push({ tipo: 'atencao', msg: 'Tabagismo — aumenta resistência à insulina, risco cardiovascular e prejuízo na absorção de vitamina C e E.' });
  }

  // ── Módulo: Atleta
  if (modulosAtivos.includes('atleta') && respostasModulos.atleta) {
    const a = respostasModulos.atleta;
    const sessoes = parseInt(a.sessoes_semana) || 0;
    if (sessoes >= 5) {
      prioridades.push(`Alta frequência de treino (${sessoes}x/sem) — periodização nutricional e recuperação são prioridade.`);
    }
    if (a.proteina_pos_treino === 'nao') {
      condutas.push('Janela anabólica: iniciar ingestão proteica nas primeiras 2h pós-treino (0,3 g/kg).');
    }
    if (a.usa_hormonios === 'sim') {
      alertas.push({ tipo: 'atencao', msg: 'Uso de anabolizantes — monitorar perfil lipídico, hepático e renal.' });
    }
    if (a.gi_treino) {
      alertas.push({ tipo: 'info', msg: 'Sintomas GI durante treino — avaliar baixo FODMAP pré-treino e hidratação.' });
    }
    condutas.push('Distribuir proteína em 4–5 refeições (0,25–0,3 g/kg/refeição) para maximizar síntese proteica.');
  }

  // ── Módulo: Emagrecimento
  if (modulosAtivos.includes('emagrecimento') && respostasModulos.emagrecimento) {
    const e = respostasModulos.emagrecimento;
    if (e.compulsao_alimentar === 'sim') {
      alertas.push({ tipo: 'atencao', msg: 'Compulsão alimentar relatada — abordagem comportamental e refeições estruturadas são essenciais.' });
      condutas.push('Evitar restrições severas; priorizar regularidade alimentar e densidade nutricional.');
    }
    if (e.historico_yoyo === 'sim') {
      alertas.push({ tipo: 'info', msg: 'Histórico de efeito sanfona — abordar causas comportamentais e manutenção a longo prazo.' });
    }
    if (e.restricao_calorica === 'sim') {
      alertas.push({ tipo: 'atencao', msg: 'Restrição calórica severa — risco de perda de massa muscular e adaptação metabólica.' });
      condutas.push('Déficit calórico moderado (300–500 kcal/dia) é mais sustentável e preserva massa muscular.');
    }
    const kg = parseFloat(e.kg_deseja_perder) || 0;
    if (kg > 20) {
      prioridades.push(`Meta de ${kg} kg de perda — planejamento por fases (10% do peso corporal por etapa).`);
    }
  }

  // ── Módulo: Diabetes / RI
  if (modulosAtivos.includes('diabetes_ri') && respostasModulos.diabetes_ri) {
    const d = respostasModulos.diabetes_ri;
    if (d.usa_insulina === 'sim') {
      alertas.push({ tipo: 'critico', msg: 'Uso de insulina — sincronização precisa entre refeições e protocolo insulínico é obrigatória.' });
      prioridades.push('Distribuição de carboidratos em 5–6 refeições para evitar picos glicêmicos.');
    }
    if (d.hipoglicemias === 'sim') {
      alertas.push({ tipo: 'critico', msg: 'Episódios de hipoglicemia — lanche da manhã e horários regulares são mandatórios.' });
    }
    const glicHab = parseFloat(d.glicemia_jejum_habitual) || 0;
    if (glicHab > 130) {
      alertas.push({ tipo: 'critico', msg: `Glicemia de jejum habitual elevada (${glicHab} mg/dL) — controle urgente.` });
    }
    condutas.push('Iniciar refeição pela salada (fibra), depois proteína, depois carboidrato — sequência alimentar para controle glicêmico.');
    condutas.push('Índice glicêmico dos carboidratos ≤ 55; carga glicêmica ≤ 10 por refeição.');
  }

  // ── Módulo: Hipertensão
  if (modulosAtivos.includes('hipertensao') && respostasModulos.hipertensao) {
    const h = respostasModulos.hipertensao;
    const paSist = parseFloat(h.pa_sistolica_atual) || 0;
    const paDias = parseFloat(h.pa_diastolica_atual) || 0;
    if (paSist > 140 || paDias > 90) {
      alertas.push({ tipo: 'critico', msg: `PA atual ${paSist}×${paDias} mmHg — acima de 140/90. Conduta nutricional imediata.` });
    }
    if (h.consumo_sodio_ha?.includes('Muito alto') || h.consumo_sodio_ha?.includes('Alto')) {
      alertas.push({ tipo: 'atencao', msg: 'Consumo elevado de sódio — orientação DASH prioritária.' });
    }
    condutas.push('Dieta DASH: ↑ potássio (feijão, banana, batata) · ↑ magnésio (aveia, sementes) · ↓ sódio (< 2.000 mg/dia).');
    if (h.edema === 'sim') {
      condutas.push('Edema presente — avaliar hidratação adequada e restrição de sódio rigorosa.');
    }
  }

  // ── Módulo: SOP
  if (modulosAtivos.includes('sop') && respostasModulos.sop) {
    const s = respostasModulos.sop;
    if (s.ciclo_regular === 'irregular' || s.ciclo_regular === 'ausente') {
      alertas.push({ tipo: 'atencao', msg: 'Ciclo menstrual irregular — controle glicêmico e anti-inflamatório podem auxiliar na regularização.' });
    }
    if (s.ri_confirmada_sop === 'sim') {
      alertas.push({ tipo: 'atencao', msg: 'Resistência insulínica confirmada na SOP — protocolo low IG integrado ao plano alimentar.' });
      condutas.push('Inositol (mio-inositol 2g + D-chiro 50mg) pode complementar a abordagem nutricional na SOP com RI.');
    }
    condutas.push('Protocolo anti-inflamatório: ↑ ômega-3 · ↑ fibras · ↓ açúcar refinado · ↓ ultra-processados.');
    if (s.deseja_engravidar === 'sim') {
      prioridades.push('Desejo de engravidar — ácido fólico 400–800 mcg/dia · ferro biodisponível · avaliar vitamina D.');
    }
  }

  // ── Módulo: Dislipidemia
  if (modulosAtivos.includes('dislipidemia') && respostasModulos.dislipidemia) {
    const dl = respostasModulos.dislipidemia;
    const ldl = parseFloat(dl.ldl_recente) || 0;
    const tg  = parseFloat(dl.tg_recente) || 0;
    const hdl = parseFloat(dl.hdl_recente) || 0;
    if (ldl > 160) {
      alertas.push({ tipo: 'critico', msg: `LDL ${ldl} mg/dL — muito elevado. Redução de gorduras saturadas e aumento de fibras solúveis.` });
    }
    if (tg > 500) {
      alertas.push({ tipo: 'critico', msg: `Triglicerídeos ${tg} mg/dL — risco de pancreatite. Restrição rigorosa de açúcar e álcool.` });
    }
    if (hdl < 40) {
      alertas.push({ tipo: 'atencao', msg: `HDL baixo (${hdl} mg/dL) — atividade física aeróbica e ômega-3 são prioridade.` });
    }
    if (dl.consumo_omega3_dis?.includes('Não')) {
      condutas.push('Introduzir ômega-3: sardinha/atum 3x/sem ou suplemento EPA+DHA 2–4g/dia.');
    }
    if (dl.consumo_fibras?.includes('Raramente') || dl.consumo_fibras?.includes('Quase')) {
      condutas.push('Aumentar fibras solúveis (aveia, feijão, psyllium) — reduzem LDL em 5–15%.');
    }
  }

  // ── Módulo: Gestante
  if (modulosAtivos.includes('gestante') && respostasModulos.gestante) {
    const g = respostasModulos.gestante;
    const semana = parseInt(g.semana_gestacional) || 0;
    if (g.dm_gestacional === 'sim') {
      alertas.push({ tipo: 'critico', msg: 'Diabetes gestacional — monitoramento glicêmico pré e pós-prandial. Dieta fracionada (6 refeições).' });
    }
    if (g.has_gestacional === 'sim') {
      alertas.push({ tipo: 'critico', msg: 'Hipertensão gestacional — sódio < 2.000 mg/dia, hidratação adequada e repouso.' });
    }
    if (g.hiperemese === 'sim') {
      alertas.push({ tipo: 'atencao', msg: 'Hiperêmese — fracionamento extremo, alimentos frios e secos, vitamina B6.' });
    }
    prioridades.push(`Gestação semana ${semana} — necessidades aumentadas: ácido fólico, ferro, DHA, iodo, vitamina D, cálcio.`);
    if (semana > 27) {
      condutas.push('3º trimestre: cálcio 1.000–1.300 mg/dia · ferro 27 mg/dia · DHA 200–300 mg/dia · vitamina D 600 UI mínimo.');
    }
  }

  // ── Módulo: Idoso
  if (modulosAtivos.includes('idoso') && respostasModulos.idoso) {
    const id = respostasModulos.idoso;
    if (id.sarcopenia === 'sim' || id.sarcopenia === 'suspeita') {
      alertas.push({ tipo: 'atencao', msg: 'Sarcopenia — proteína ≥ 1,2 g/kg/dia distribuída em refeições com leucina (3g/refeição).' });
      prioridades.push('Atividade de resistência + proteína em cada refeição é a principal estratégia anti-sarcopenia.');
    }
    if (id.disfagia === 'sim' || id.disfagia === 'solidos') {
      alertas.push({ tipo: 'critico', msg: 'Disfagia — adequação de consistência obrigatória. Solicitar avaliação fonoaudiológica.' });
    }
    if (id.osteoporose_idoso === 'sim') {
      condutas.push('Osteoporose — cálcio 1.200 mg/dia · vitamina D 2.000 UI/dia mínimo · proteína adequada.');
    }
    const numMed = parseInt(id.num_medicamentos) || 0;
    if (numMed >= 5) {
      alertas.push({ tipo: 'atencao', msg: `Polifarmácia (${numMed} medicamentos) — investigar interações com nutrientes (B12, ferro, K, Mg).` });
    }
    if (id.isolamento_social === 'sempre') {
      alertas.push({ tipo: 'info', msg: 'Come sozinho sempre — risco de inadequação alimentar por falta de motivação para comer.' });
    }
  }

  return { alertas, condutas, prioridades };
}

// ── RENDERIZA PAINEL DE INSIGHTS ─────────────────────────────
export function renderInsightsPanel(insights) {
  const { alertas, condutas, prioridades } = insights;
  if (!alertas.length && !condutas.length && !prioridades.length) return '';

  const criticos  = alertas.filter(a => a.tipo === 'critico');
  const atencoes  = alertas.filter(a => a.tipo === 'atencao');
  const infos     = alertas.filter(a => a.tipo === 'info');

  let html = '<div class="insights-panel">';
  html += `<div class="insights-header">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    Insights Clínicos Gerados
  </div>`;

  if (prioridades.length) {
    html += `<div class="insights-section insights-prioridade">
      <p class="insights-section-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> Prioridades clínicas</p>
      ${prioridades.map(p => `<p class="insight-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> ${p}</p>`).join('')}
    </div>`;
  }
  if (criticos.length) {
    html += `<div class="insights-section insights-critico">
      <p class="insights-section-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Atenção imediata</p>
      ${criticos.map(a => `<p class="insight-item">${a.msg}</p>`).join('')}
    </div>`;
  }
  if (atencoes.length) {
    html += `<div class="insights-section insights-atencao">
      <p class="insights-section-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Alertas clínicos</p>
      ${atencoes.map(a => `<p class="insight-item">${a.msg}</p>`).join('')}
    </div>`;
  }
  if (condutas.length) {
    html += `<div class="insights-section insights-conduta">
      <p class="insights-section-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg> Condutas nutricionais sugeridas</p>
      ${condutas.map(c => `<p class="insight-item">${c}</p>`).join('')}
    </div>`;
  }
  if (infos.length) {
    html += `<div class="insights-section insights-info">
      <p class="insights-section-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg> Observações</p>
      ${infos.map(a => `<p class="insight-item">${a.msg}</p>`).join('')}
    </div>`;
  }

  html += '</div>';
  return html;
}

// ── PERSISTÊNCIA NO SUPABASE ─────────────────────────────────
export async function salvarRespostasModulos(supabase, patientId, anamneseId, modulosAtivos, respostas) {
  if (!modulosAtivos.length) return { ok: true };

  // Salva ativações
  const ativacoes = modulosAtivos.map(slug => ({
    patient_id:   patientId,
    anamnese_id:  anamneseId,
    module_slug:  slug,
    ativado_por:  'automatico',
  }));

  const { error: errAtiv } = await supabase
    .from('patient_module_activations')
    .upsert(ativacoes, { onConflict: 'patient_id,anamnese_id,module_slug' });

  if (errAtiv) console.warn('Erro ao salvar ativações:', errAtiv.message);

  // Salva respostas
  const rows = [];
  for (const slug of modulosAtivos) {
    const modRespostas = respostas[slug] || {};
    for (const [qSlug, valor] of Object.entries(modRespostas)) {
      if (valor === null || valor === '' || (Array.isArray(valor) && !valor.length)) continue;
      rows.push({
        patient_id:    patientId,
        anamnese_id:   anamneseId,
        module_slug:   slug,
        question_slug: qSlug,
        resposta_texto: Array.isArray(valor) ? valor.join('|') : String(valor),
      });
    }
  }

  if (!rows.length) return { ok: true };

  const { error: errAns } = await supabase
    .from('patient_module_answers')
    .upsert(rows, { onConflict: 'patient_id,anamnese_id,module_slug,question_slug' });

  if (errAns) return { ok: false, error: errAns.message };
  return { ok: true, savedCount: rows.length };
}

// ── CARREGAR RESPOSTAS EXISTENTES ─────────────────────────────
export async function carregarRespostasModulos(supabase, patientId) {
  const { data, error } = await supabase
    .from('patient_module_answers')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error || !data) return {};

  const resultado = {};
  for (const row of data) {
    if (!resultado[row.module_slug]) resultado[row.module_slug] = {};
    resultado[row.module_slug][row.question_slug] = row.resposta_texto;
  }
  return resultado;
}

export async function carregarModulosAtivos(supabase, patientId) {
  const { data, error } = await supabase
    .from('patient_module_activations')
    .select('module_slug')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return [...new Set(data.map(r => r.module_slug))];
}
