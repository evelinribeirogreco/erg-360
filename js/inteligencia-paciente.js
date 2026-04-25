// ============================================================
// inteligencia-paciente.js — Central de Inteligência Clínica
// ERG 360 — Gargalos · Riscos · Oportunidades · Perfis
// ============================================================

import { createClient }   from 'https://esm.sh/@supabase/supabase-js@2';
import { calcularScoreSemanal, detectarPadroes, gerarSugestoes } from './score-metabolico.js';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';
const ADMIN_EMAIL   = 'evelinbeatrizrb@outlook.com';

function isAdminUser(u) {
  return u?.user_metadata?.role === 'admin' || u?.email === ADMIN_EMAIL;
}
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// COLETA DE DADOS COMPLETA
// ============================================================
export async function coletarDadosDossie(patientId) {
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const d90 = new Date(); d90.setDate(d90.getDate() - 90);

  const [
    checkins30Res,
    checkins90Res,
    anamneseRes,
    antroRes,
    patientRes,
    insightsRes,
    modulosRes,
    fasesRes,
  ] = await Promise.all([
    supabase.from('checkins').select('*').eq('patient_id', patientId)
      .gte('data', d30.toISOString().split('T')[0]).order('data', { ascending: true }),

    supabase.from('checkins').select('data,score_diario,energia,humor,sono_horas,agua_litros,treinou,fome_nivel')
      .eq('patient_id', patientId)
      .gte('data', d90.toISOString().split('T')[0]).order('data', { ascending: true }),

    supabase.from('anamnese').select('*').eq('patient_id', patientId)
      .order('data_avaliacao', { ascending: false }).limit(1),

    supabase.from('antropometria')
      .select('data_avaliacao,peso,imc,pct_gordura,massa_magra,circunferencia_cintura')
      .eq('patient_id', patientId)
      .order('data_avaliacao', { ascending: false }).limit(8),

    supabase.from('patients')
      .select('nome,email,data_nascimento,sexo,data_proxima_consulta,plano_url')
      .eq('id', patientId).single(),

    supabase.from('patient_anamnese_insights')
      .select('tipo,modulo_origem,mensagem,ordem').eq('patient_id', patientId)
      .order('ordem', { ascending: true }).limit(20),

    supabase.from('patient_module_activations')
      .select('module_slug').eq('patient_id', patientId),

    supabase.from('fases').select('*')
      .eq('patient_id', patientId).order('ordem', { ascending: true }),
  ]);

  return {
    checkins30: checkins30Res.data  || [],
    checkins90: checkins90Res.data  || [],
    anamnese:   anamneseRes.data?.[0] || null,
    antro:      antroRes.data       || [],
    patient:    patientRes.data     || {},
    insights:   insightsRes.data    || [],
    modulos:    (modulosRes.data    || []).map(m => m.module_slug),
    fases:      fasesRes.data       || [],
  };
}

// ============================================================
// MOTOR DE ANÁLISE COMPLETO
// ============================================================
export function analisarIntelligence(dados) {
  const { checkins30, checkins90, anamnese, antro, patient, insights, modulos, fases } = dados;

  // ── Métricas base ──
  const comp30  = calcularComportamento(checkins30);
  const comp90  = calcularComportamento(checkins90);
  const evolPeso = calcularEvolucaoPeso(antro);
  const scoreData = calcularScoreSemanal(checkins30);
  const padroes  = detectarPadroes(checkins30);
  const sugestoes = gerarSugestoes(padroes);
  const adesao   = calcularAdesao30(checkins30);

  // ── Tendência de adesão (30d vs 90d) ──
  const tendAdesao = calcularTendenciaAdesao(checkins30, checkins90);

  // ── Inteligência central ──
  const gargalos    = detectarGargalos(comp30, padroes, evolPeso, anamnese, checkins30);
  const riscos      = detectarRiscos(comp30, comp90, adesao, tendAdesao, scoreData, evolPeso, fases);
  const oportunidades = detectarOportunidades(comp30, adesao, scoreData, evolPeso, fases, padroes);

  // ── Perfis ──
  const perfilMetabolico    = gerarPerfilMetabolico(comp30, evolPeso, padroes, anamnese);
  const perfilComportamental = gerarPerfilComportamental(comp30, padroes, anamnese, adesao, tendAdesao);

  // ── Fase atual ──
  const faseAtual = fases.find(f => f.status === 'ativa') || fases[fases.length - 1] || null;

  // ── Timeline de evolução ──
  const timeline = construirTimeline(checkins90, antro);

  return {
    comp30, comp90, evolPeso, scoreData, padroes, sugestoes,
    adesao, tendAdesao, gargalos, riscos, oportunidades,
    perfilMetabolico, perfilComportamental, faseAtual, fases,
    timeline,
  };
}

// ── Comportamento médio ────────────────────────────────────
function calcularComportamento(checkins) {
  if (!checkins.length) return null;
  const avg = f => {
    const v = checkins.map(c => c[f]).filter(x => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const n = checkins.length;
  return {
    n,
    sonoHoras:  avg('sono_horas'),
    sonoQual:   avg('sono_qualidade'),
    energia:    avg('energia'),
    humor:      avg('humor'),
    agua:       avg('agua_litros'),
    fome:       avg('fome_nivel'),
    scoreMedio: avg('score_diario'),
    pctTreino:  Math.round(checkins.filter(c => c.treinou).length / n * 100),
    pctEvacuou: Math.round(checkins.filter(c => c.evacuou).length / n * 100),
    pctDescontrole: Math.round(
      checkins.filter(c => c.descontrole === 'moderado' || c.descontrole === 'forte').length / n * 100
    ),
  };
}

// ── Evolução de peso ──────────────────────────────────────
function calcularEvolucaoPeso(antro) {
  if (!antro || antro.length === 0) return null;
  const cronologico = [...antro].reverse();
  const atual = cronologico[cronologico.length - 1];
  const inicial = cronologico[0];
  const deltaTotal = cronologico.length > 1 ? (atual.peso - inicial.peso) : null;
  let semanasDecorridas = null;
  if (cronologico.length > 1) {
    const diffMs = new Date(atual.data_avaliacao) - new Date(inicial.data_avaliacao);
    semanasDecorridas = Math.max(1, Math.round(diffMs / (7 * 24 * 3600 * 1000)));
  }
  const kgPorSemana = semanasDecorridas ? deltaTotal / semanasDecorridas : null;
  return {
    atual: atual.peso, imc: atual.imc,
    gordura: atual.pct_gordura, massaMagra: atual.massa_magra,
    circAbdominal: atual.circunferencia_cintura,
    deltaTotal, semanasDecorridas, kgPorSemana,
    historico: cronologico.map(a => ({
      data: a.data_avaliacao, peso: a.peso,
      gordura: a.pct_gordura, massaMagra: a.massa_magra,
    })),
  };
}

// ── Adesão 30d ────────────────────────────────────────────
function calcularAdesao30(checkins) {
  const pct = Math.min(Math.round((checkins.length / 30) * 100), 100);
  return { pct, dias: checkins.length };
}

// ── Tendência de adesão 30d vs 90d ────────────────────────
function calcularTendenciaAdesao(ci30, ci90) {
  // Compara frequência das últimas 2 semanas vs 2 anteriores
  const agora = new Date();
  const d14   = new Date(); d14.setDate(d14.getDate() - 14);
  const d28   = new Date(); d28.setDate(d28.getDate() - 28);

  const ultimas2sem   = ci30.filter(c => new Date(c.data) >= d14).length;
  const penultimas2sem = ci30.filter(c => new Date(c.data) >= d28 && new Date(c.data) < d14).length;

  if (ultimas2sem > penultimas2sem + 1)  return 'subindo';
  if (ultimas2sem < penultimas2sem - 1)  return 'caindo';
  return 'estavel';
}

// ── Timeline para gráfico ─────────────────────────────────
function construirTimeline(checkins90, antro) {
  const scoreHist = checkins90
    .filter(c => c.score_diario != null)
    .map(c => ({ data: c.data, score: c.score_diario }));

  const pesoHist = [...antro].reverse().map(a => ({
    data: a.data_avaliacao, peso: a.peso
  }));

  return { scoreHist, pesoHist };
}

// ============================================================
// DETECÇÃO DE GARGALOS (cadeias causais)
// ============================================================
function detectarGargalos(comp, padroes, evolPeso, anamnese, checkins) {
  if (!comp) return [];
  const lista = [];

  // 1. Sono ruim → Fome elevada (grelina/leptina)
  if (comp.sonoHoras !== null && comp.sonoHoras < 6.5 && comp.fome !== null && comp.fome > 2.5) {
    lista.push({
      id: 'sono_fome',
      titulo: 'Sono insuficiente → Fome elevada',
      mecanismo: 'Privação de sono eleva grelina (+24%) e reduz leptina, amplificando a sensação de fome e cravings.',
      evidencia: `Sono médio: ${comp.sonoHoras.toFixed(1)}h · Fome: ${comp.fome.toFixed(1)}/4`,
      impacto: 'alto',
      areas: ['hormonal', 'comportamental'],
    });
  }

  // 2. Sono ruim → Energia baixa → Abandono de treinos
  if (comp.sonoHoras !== null && comp.sonoHoras < 6.5 && comp.energia !== null && comp.energia < 3 && comp.pctTreino < 40) {
    lista.push({
      id: 'sono_energia_treino',
      titulo: 'Sono insuficiente → Fadiga → Sedentarismo',
      mecanismo: 'Recuperação inadequada prejudica disposição e reduz frequência de treinos, diminuindo o gasto calórico.',
      evidencia: `Sono: ${comp.sonoHoras.toFixed(1)}h · Energia: ${comp.energia.toFixed(1)}/5 · Treinos: ${comp.pctTreino}% dos dias`,
      impacto: 'alto',
      areas: ['recuperação', 'metabolismo'],
    });
  }

  // 3. Restrição excessiva → Compulsão
  if (padroes.problemas.some(p => p.id === 'dieta_restritiva')) {
    lista.push({
      id: 'restricao_compulsao',
      titulo: 'Restrição excessiva → Episódios de compulsão',
      mecanismo: 'Déficit calórico muito agressivo ativa mecanismos de sobrevivência: aumento de grelina, pensamentos obsessivos sobre comida e perda de controle.',
      evidencia: `Fome elevada em ${Math.round(checkins.filter(c => c.fome_nivel >= 4).length / checkins.length * 100)}% dos dias`,
      impacto: 'alto',
      areas: ['dietético', 'comportamental', 'hormonal'],
    });
  }

  // 4. Hidratação baixa → Fome confundida com sede
  if (comp.agua !== null && comp.agua < 1.5 && comp.fome !== null && comp.fome > 2) {
    lista.push({
      id: 'desidratacao_fome',
      titulo: 'Desidratação → Fome falsa',
      mecanismo: 'O hipotálamo processa fome e sede na mesma região. Desidratação leve é frequentemente interpretada como fome, levando a excessos calóricos.',
      evidencia: `Água média: ${comp.agua.toFixed(1)}L/dia (recomendado ≥2L)`,
      impacto: 'medio',
      areas: ['dietético', 'comportamental'],
    });
  }

  // 5. Treino intenso → Calorias insuficientes (overreaching)
  if (comp.pctTreino > 70 && comp.fome !== null && comp.fome > 2.5 && comp.energia !== null && comp.energia < 3.5) {
    lista.push({
      id: 'treino_subnutricao',
      titulo: 'Alta carga de treino + subnutrição → Overreaching',
      mecanismo: 'Treinos frequentes com ingestão calórica insuficiente elevam cortisol, prejudicam recuperação e podem causar catabolismo muscular.',
      evidencia: `Treinos: ${comp.pctTreino}% dos dias · Energia: ${comp.energia.toFixed(1)}/5 · Fome: ${comp.fome.toFixed(1)}/4`,
      impacto: 'alto',
      areas: ['metabolismo', 'hormonal', 'composição corporal'],
    });
  }

  // 6. Humor baixo → Descontrole alimentar (componente emocional)
  if (comp.humor !== null && comp.humor < 3 && comp.pctDescontrole > 25) {
    lista.push({
      id: 'humor_descontrole',
      titulo: 'Humor rebaixado → Alimentação emocional',
      mecanismo: 'Estados emocionais negativos ativam busca por alimentos hiperpalatáveis como regulação emocional. Estratégia de curto prazo que sabota resultados.',
      evidencia: `Humor médio: ${comp.humor.toFixed(1)}/5 · Descontrole: ${comp.pctDescontrole}% dos dias`,
      impacto: 'alto',
      areas: ['psicológico', 'comportamental'],
    });
  }

  // 7. Peso estagnado + boa adesão = adaptação metabólica
  if (evolPeso && Math.abs(evolPeso.deltaTotal || 0) < 0.5 && evolPeso.semanasDecorridas >= 4 && comp.pctTreino >= 40) {
    lista.push({
      id: 'adaptacao_metabolica',
      titulo: 'Plateau de peso com boa adesão',
      mecanismo: 'O organismo adapta o metabolismo basal à restrição calórica (termogênese adaptativa). Necessário ajuste no plano para retomar progresso.',
      evidencia: `Variação: ${(evolPeso.deltaTotal || 0).toFixed(1)} kg em ${evolPeso.semanasDecorridas} semanas`,
      impacto: 'alto',
      areas: ['metabólico', 'dietético'],
    });
  }

  // 8. Trânsito intestinal alterado → Inflamação/desconforto
  const pctSemEvacu = 100 - comp.pctEvacuou;
  if (pctSemEvacu > 40) {
    lista.push({
      id: 'intestino_lento',
      titulo: 'Trânsito intestinal irregular',
      mecanismo: 'Constipação frequente pode indicar baixa ingestão de fibras ou água, disbiose intestinal ou estresse. Impacta absorção de nutrientes e bem-estar.',
      evidencia: `Sem evacuação em ${pctSemEvacu}% dos dias registrados`,
      impacto: 'medio',
      areas: ['digestivo', 'inflamação'],
    });
  }

  // 9. Patologias que criam gargalos clínicos
  const patologias = anamnese?.patologias || [];
  if (patologias.includes('resistencia_insulina') || patologias.includes('diabetes')) {
    if (comp.fome !== null && comp.fome > 2.5) {
      lista.push({
        id: 'ri_fome',
        titulo: 'Resistência à insulina → Fome persistente',
        mecanismo: 'RI reduz eficiência da sinalização de saciedade (leptina e insulina). Células não recebem glicose adequadamente, gerando fome mesmo após refeições.',
        evidencia: `Diagnóstico: ${patologias.includes('diabetes') ? 'Diabetes' : 'RI'} · Fome média: ${comp.fome.toFixed(1)}/4`,
        impacto: 'alto',
        areas: ['metabólico', 'hormonal', 'clínico'],
      });
    }
  }

  return lista;
}

// ============================================================
// DETECÇÃO DE RISCOS
// ============================================================
function detectarRiscos(comp30, comp90, adesao, tendAdesao, scoreData, evolPeso, fases) {
  const riscos = [];

  // 1. Queda de adesão
  if (tendAdesao === 'caindo') {
    riscos.push({
      id: 'adesao_caindo',
      titulo: 'Queda de adesão nos últimos 14 dias',
      descricao: 'Frequência de check-ins reduzindo. Padrão precursor de abandono do acompanhamento.',
      urgencia: 'alta',
      acao: 'Contato proativo. Identificar barreiras (rotina, motivação, plano inadequado).',
    });
  }

  // 2. Adesão baixa persistente
  if (adesao.pct < 40) {
    riscos.push({
      id: 'adesao_critica',
      titulo: `Adesão crítica — ${adesao.pct}% (${adesao.dias}/30 dias)`,
      descricao: 'Menos de 40% dos dias com registro. Impossível monitorar evolução com precisão.',
      urgencia: 'alta',
      acao: 'Revisar estratégia de engajamento. Considerar simplificação do check-in ou contato direto.',
    });
  }

  // 3. Score em queda
  if (scoreData && scoreData.tendencia?.tipo === 'piorando') {
    riscos.push({
      id: 'score_caindo',
      titulo: `Score metabólico em queda — ${scoreData.tendencia.label}`,
      descricao: 'Deterioração consistente dos indicadores de bem-estar. Risco de abandono ou piora clínica.',
      urgencia: 'alta',
      acao: 'Investigar causas (rotina, estresse, sono). Possível necessidade de ajuste no plano.',
    });
  }

  // 4. Sono crítico prolongado
  if (comp30?.sonoHoras !== null && comp30.sonoHoras < 5.5) {
    riscos.push({
      id: 'sono_critico',
      titulo: `Sono médio crítico — ${comp30.sonoHoras.toFixed(1)}h`,
      descricao: 'Menos de 5.5h por noite prejudica metabolismo, imunidade e regulação hormonal. Resultados comprometidos.',
      urgencia: 'alta',
      acao: 'Abordar na próxima consulta. Considerar encaminhamento para avaliação do sono se persistir.',
    });
  }

  // 5. Energia em colapso
  if (comp30?.energia !== null && comp30.energia < 2) {
    riscos.push({
      id: 'energia_colapso',
      titulo: `Energia média muito baixa — ${comp30.energia.toFixed(1)}/5`,
      descricao: 'Energia cronicamente baixa pode indicar subalimentação, anemia, hipotireoidismo ou overtraining.',
      urgencia: 'alta',
      acao: 'Revisar adequação calórica e proteica. Solicitar exames se não houver melhora.',
    });
  }

  // 6. Compulsão recorrente
  if (comp30?.pctDescontrole > 40) {
    riscos.push({
      id: 'compulsao_risco',
      titulo: `Episódios de descontrole em ${comp30.pctDescontrole}% dos dias`,
      descricao: 'Frequência elevada de compulsão pode evoluir para transtorno alimentar. Atenção clínica necessária.',
      urgencia: 'alta',
      acao: 'Avaliar componente emocional/psicológico. Considerar encaminhamento para psicólogo.',
    });
  }

  // 7. Fase atrasada
  const faseAtiva = fases.find(f => f.status === 'ativa');
  if (faseAtiva?.duracao_semanas) {
    // Verificar se a fase está atrasada (sem dados de datas de início disponíveis, apenas alertar se evolPeso indica plateau)
    if (evolPeso && Math.abs(evolPeso.deltaTotal || 0) < 0.3 && evolPeso.semanasDecorridas > faseAtiva.duracao_semanas) {
      riscos.push({
        id: 'fase_atrasada',
        titulo: `Fase "${faseAtiva.nome}" pode estar além do prazo`,
        descricao: `Fase prevista para ${faseAtiva.duracao_semanas} semanas sem resultado de peso esperado.`,
        urgencia: 'media',
        acao: 'Avaliar transição de fase ou revisão de protocolo.',
      });
    }
  }

  // 8. Sem consulta agendada + baixa adesão
  if (!fases.some(f => f.status === 'ativa') && adesao.pct < 60) {
    riscos.push({
      id: 'sem_estrutura',
      titulo: 'Sem fase ativa + baixo engajamento',
      descricao: 'Paciente sem protocolo estruturado e com engajamento abaixo do ideal. Alto risco de abandono.',
      urgencia: 'media',
      acao: 'Estruturar plano por fases. Reforçar próxima consulta.',
    });
  }

  return riscos;
}

// ============================================================
// DETECÇÃO DE OPORTUNIDADES
// ============================================================
function detectarOportunidades(comp30, adesao, scoreData, evolPeso, fases, padroes) {
  const ops = [];

  // 1. Score subindo + peso estagnado → ajuste calórico
  if (scoreData?.tendencia?.tipo === 'melhorando' && evolPeso && Math.abs(evolPeso.deltaTotal || 0) < 0.5) {
    ops.push({
      id: 'ajuste_calorico_positivo',
      titulo: 'Momento ideal para ajuste de calorias',
      descricao: 'Score em melhora indica boa adaptação ao plano atual. Com peso estagnado, é o momento perfeito para revisar o déficit calórico ou redistribuir macros.',
      tipo: 'dietético',
      impacto: 'Pode destravar progresso de peso sem comprometer bem-estar.',
    });
  }

  // 2. Alta adesão + boa evolução → próxima fase
  const faseAtiva = fases.find(f => f.status === 'ativa');
  const proximaFase = fases.find(f => f.status === 'pendente');
  if (adesao.pct >= 70 && evolPeso?.deltaTotal !== null && evolPeso.deltaTotal < -1 && proximaFase) {
    ops.push({
      id: 'proxima_fase',
      titulo: `Paciente pronta para a próxima fase`,
      descricao: `Alta adesão (${adesao.pct}%) e evolução positiva indicam prontidão para avançar para "${proximaFase.nome}".`,
      tipo: 'protocolo',
      impacto: 'Evolução sustentada e motivação elevada.',
    });
  }

  // 3. Sono melhorando → boa janela para ajuste de treino
  if (comp30?.sonoHoras !== null && comp30.sonoHoras >= 7 && comp30.energia !== null && comp30.energia >= 3.5 && comp30.pctTreino < 50) {
    ops.push({
      id: 'aumentar_treinos',
      titulo: 'Boa recuperação — aumentar frequência de treinos',
      descricao: `Sono adequado (${comp30.sonoHoras.toFixed(1)}h) e boa energia (${comp30.energia.toFixed(1)}/5) criam condições ideais para incrementar estímulo de treino.`,
      tipo: 'exercício',
      impacto: 'Maior gasto energético sem risco de overtraining.',
    });
  }

  // 4. Sem padrões críticos → fase de otimização
  if (!padroes.problemas.length && adesao.pct >= 65 && scoreData?.score >= 65) {
    ops.push({
      id: 'otimizacao',
      titulo: 'Janela de otimização metabólica',
      descricao: 'Nenhum padrão crítico detectado, boa adesão e score elevado. Momento ideal para estratégias de otimização: ciclagem calórica, refeed, periodização de treino.',
      tipo: 'estratégico',
      impacto: 'Maximizar resultados sem sacrificar bem-estar.',
    });
  }

  // 5. Trânsito intestinal bom + sono bom → suplementação/ajuste fino
  if (comp30?.pctEvacuou >= 80 && comp30?.sonoHoras >= 7 && comp30?.agua >= 2) {
    ops.push({
      id: 'ajuste_fino',
      titulo: 'Hábitos de base sólidos — ajuste fino possível',
      descricao: 'Hidratação, sono e trânsito intestinal adequados. Base fisiológica para intervenções mais precisas: suplementação direcionada ou ajuste de micronutrientes.',
      tipo: 'clínico',
      impacto: 'Alta resposta a intervenções mais precisas.',
    });
  }

  // 6. Alta fome controlada + boa adesão → proteína ou volume
  if (comp30?.fome !== null && comp30.fome >= 2.5 && comp30.fome < 3.5 && adesao.pct >= 60) {
    ops.push({
      id: 'volume_saciedade',
      titulo: 'Fome manejável — estratégias de saciedade',
      descricao: 'Fome presente mas controlada com boa adesão. Aumentar proteína ou volume alimentar pode eliminar o desconforto sem comprometer o déficit.',
      tipo: 'dietético',
      impacto: 'Melhora de conforto e sustentabilidade do plano.',
    });
  }

  return ops;
}

// ============================================================
// PERFIL METABÓLICO
// ============================================================
const PERFIS_METABOLICOS = [
  {
    slug: 'resposta_ideal',
    titulo: 'Resposta Metabólica Ideal',
    subtitulo: 'Alta sensibilidade ao protocolo',
    descricao: 'Boa adaptação ao déficit calórico com manutenção de energia e sono. Organismo respondendo de forma eficiente às intervenções nutricionais.',
    cor: '#2E8B6A',
    bg: 'rgba(46,139,106,0.06)',
    icone: '⚡',
    caracteristicas: ['Perde peso de forma consistente', 'Mantém boa energia mesmo em déficit', 'Sono não comprometido', 'Baixa variabilidade de resultados'],
    condicao: (c, e) => e?.kgPorSemana !== null && e.kgPorSemana < -0.1 && c?.energia >= 3.5 && c?.sonoHoras >= 6.5,
  },
  {
    slug: 'resistente',
    titulo: 'Padrão Metabólico Resistente',
    subtitulo: 'Adaptação metabólica elevada',
    descricao: 'Perda de peso lenta apesar de boa adesão. Organismo com alta capacidade adaptativa — necessita de estratégias avançadas: ciclagem calórica, refeed programado ou ajuste de macros.',
    cor: '#8B5E3C',
    bg: 'rgba(139,94,60,0.06)',
    icone: '🔄',
    caracteristicas: ['Perda de peso lenta ou estagnada', 'Boa energia apesar do déficit', 'Alta adesão sem resultado proporcional', 'Requer estratégias avançadas'],
    condicao: (c, e) => e?.deltaTotal !== null && Math.abs(e.deltaTotal) < 0.5 && e.semanasDecorridas >= 4 && c?.energia >= 3,
  },
  {
    slug: 'inflamatorio',
    titulo: 'Padrão Inflamatório',
    subtitulo: 'Inflamação crônica de baixo grau',
    descricao: 'Sono ruim, energia baixa e fome elevada sugerem estado inflamatório. Pode estar relacionado a disbiose, estresse crônico ou dieta pró-inflamatória.',
    cor: '#B33030',
    bg: 'rgba(179,48,48,0.06)',
    icone: '🔥',
    caracteristicas: ['Cansaço frequente', 'Fome elevada', 'Sono de má qualidade', 'Recuperação lenta de treinos'],
    condicao: (c) => c?.sonoHoras !== null && c.sonoHoras < 6.5 && c?.fome > 2.5 && c?.energia < 3,
  },
  {
    slug: 'alta_variabilidade',
    titulo: 'Alta Variabilidade Metabólica',
    subtitulo: 'Padrões inconsistentes',
    descricao: 'Resultados muito variáveis entre períodos. Pode refletir irregularidade alimentar, alto estresse ou comportamento de "começa e para". Necessita de maior estrutura.',
    cor: '#B8860B',
    bg: 'rgba(184,134,11,0.06)',
    icone: '📊',
    caracteristicas: ['Resultados inconsistentes', 'Boas e más semanas alternadas', 'Dificuldade de manutenção', 'Alta sensibilidade ao contexto'],
    condicao: (c) => c?.pctDescontrole > 20 && c?.humor < 3.5,
  },
  {
    slug: 'hormonal',
    titulo: 'Perfil Hormonal Sensível',
    subtitulo: 'Foco em equilíbrio hormonal',
    descricao: 'Fome, humor e energia com alta variabilidade sugerem sensibilidade hormonal (cortisol, estradiol, insulina). Estratégia nutricional deve priorizar estabilização antes de déficit.',
    cor: '#6D5ACF',
    bg: 'rgba(109,90,207,0.06)',
    icone: '🧬',
    caracteristicas: ['Fome e humor muito variáveis', 'Sensível a mudanças de rotina', 'Resposta não linear ao protocolo', 'Necessita abordagem hormonal'],
    condicao: (c) => c?.humor !== null && c.humor < 3.5 && c?.fome > 2 && c?.energia < 3.5,
  },
];

export function gerarPerfilMetabolico(comp, evolPeso, padroes, anamnese) {
  if (!comp) return PERFIS_METABOLICOS[3]; // default: alta variabilidade
  for (const p of PERFIS_METABOLICOS) {
    if (p.condicao(comp, evolPeso)) return p;
  }
  return PERFIS_METABOLICOS[0]; // resposta ideal como fallback positivo
}

// ============================================================
// PERFIL COMPORTAMENTAL
// ============================================================
const PERFIS_COMPORTAMENTAIS = [
  {
    slug: 'alta_adesao',
    titulo: 'Alta Aderência',
    subtitulo: 'Comprometimento consistente',
    descricao: 'Paciente engajada, registra com frequência, poucos episódios de descontrole. Perfil que responde bem a aumento de complexidade do protocolo.',
    cor: '#2E8B6A',
    bg: 'rgba(46,139,106,0.06)',
    icone: '🎯',
    estrategia: 'Avançar protocolo. Introduzir periodização e estratégias avançadas.',
    condicao: (c, a) => a.pct >= 70 && c?.pctDescontrole < 15 && c?.humor >= 3.5,
  },
  {
    slug: 'emocional',
    titulo: 'Perfil Emocional',
    subtitulo: 'Alimentação como regulação emocional',
    descricao: 'Episódios de descontrole correlacionados com humor baixo. Comida usada como mecanismo de enfrentamento. Abordagem psicológica complementar é indicada.',
    cor: '#B33030',
    bg: 'rgba(179,48,48,0.06)',
    icone: '💭',
    estrategia: 'Trabalhar gatilhos emocionais. Estruturar alimentação sem proibições. Considerar suporte psicológico.',
    condicao: (c) => c?.pctDescontrole > 25 && c?.humor < 3,
  },
  {
    slug: 'rigido_fragil',
    titulo: 'Rígido-Frágil',
    subtitulo: 'Perfeccionismo → colapso',
    descricao: 'Alterna entre dias perfeitos e quebras totais. Pensamento "tudo ou nada" — uma falha cancela o dia inteiro. Necessita de plano mais flexível com "regra dos 80%".',
    cor: '#8B5E3C',
    bg: 'rgba(139,94,60,0.06)',
    icone: '⚖️',
    estrategia: 'Flexibilizar protocolo. Trabalhar relação com "imperfeição". Plano com substitutos e adaptações.',
    condicao: (c, a) => a.pct >= 55 && c?.pctDescontrole > 20 && c?.humor >= 3,
  },
  {
    slug: 'baixo_engajamento',
    titulo: 'Baixo Engajamento',
    subtitulo: 'Dificuldade de manutenção',
    descricao: 'Poucos registros, irregularidade nos check-ins. Pode refletir rotina intensa, baixa motivação ou plano inadequado à realidade da paciente.',
    cor: '#B8860B',
    bg: 'rgba(184,134,11,0.06)',
    icone: '📉',
    estrategia: 'Simplificar. Identificar barreiras reais. Ajustar complexidade do plano à rotina.',
    condicao: (c, a) => a.pct < 40,
  },
  {
    slug: 'atleta_mental',
    titulo: 'Atleta Mental',
    subtitulo: 'Alta disciplina, alto resultado',
    descricao: 'Treina com frequência, registra consistentemente, mantém boa energia. Perfil de alta performance que responde bem a estratégias avançadas.',
    cor: '#3A5E8B',
    bg: 'rgba(58,94,139,0.06)',
    icone: '🏃',
    estrategia: 'Periodização nutricional. Foco em composição corporal. Nutrição de performance.',
    condicao: (c, a) => c?.pctTreino >= 70 && a.pct >= 60 && c?.energia >= 3.5,
  },
  {
    slug: 'adaptativo',
    titulo: 'Perfil Adaptativo',
    subtitulo: 'Equilíbrio e consistência',
    descricao: 'Adesão moderada, poucos extremos, adaptação gradual. Responde bem a mudanças progressivas e metas realistas.',
    cor: '#6D5ACF',
    bg: 'rgba(109,90,207,0.06)',
    icone: '🔆',
    estrategia: 'Progresso gradual. Metas de curto prazo. Reforço positivo frequente.',
    condicao: () => true, // fallback
  },
];

export function gerarPerfilComportamental(comp, padroes, anamnese, adesao, tendAdesao) {
  if (!comp) return PERFIS_COMPORTAMENTAIS[3];
  for (const p of PERFIS_COMPORTAMENTAIS) {
    if (p.condicao(comp, adesao)) return p;
  }
  return PERFIS_COMPORTAMENTAIS[5];
}

// ============================================================
// HELPERS GLOBAIS DE RENDERIZAÇÃO
// ============================================================
const MARCA = 'ERG 360 · Dra. Evelin Ribeiro Greco · Nutricionista Clínica';

function secNum(n, titulo, sub = '') {
  return `<div class="dos-sec-header">
    <span class="dos-sec-num">${String(n).padStart(2,'0')}</span>
    <div>
      <h2 class="dos-sec-titulo">${titulo}</h2>
      ${sub ? `<p class="dos-sec-sub">${sub}</p>` : ''}
    </div>
  </div>`;
}

function formatData(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function kv(label, valor, destaque = false) {
  return `<div class="dos-kv ${destaque ? 'dos-kv-destaque' : ''}">
    <span class="dos-kv-label">${label}</span>
    <span class="dos-kv-valor">${valor}</span>
  </div>`;
}

function badge(texto, cor = 'var(--sub)', bg = 'var(--bg2)') {
  return `<span class="dos-badge" style="color:${cor};background:${bg};">${texto}</span>`;
}

// ── Geração de sub-objetivos a partir do perfil ───────────
function gerarSubObjetivos(anamnese, padroes, antro, modulos) {
  const objetivos = [];
  const pat = anamnese?.patologias || [];

  // Por patologia
  if (pat.some(p => ['diabetes','resistencia_insulina'].includes(p)))
    objetivos.push({ icone: '🩸', texto: 'Estabilização glicêmica e redução de picos de insulina' });
  if (pat.some(p => ['hipertensao'].includes(p)))
    objetivos.push({ icone: '❤️', texto: 'Redução da pressão arterial via dieta anti-inflamatória' });
  if (pat.some(p => ['sop'].includes(p)))
    objetivos.push({ icone: '🌸', texto: 'Regulação hormonal e melhora dos ciclos' });
  if (pat.some(p => ['dislipidemia'].includes(p)))
    objetivos.push({ icone: '🫀', texto: 'Melhora do perfil lipídico (LDL, TG, HDL)' });

  // Por padrões de check-in
  if (padroes.problemas.some(p => p.id === 'sono_critico'))
    objetivos.push({ icone: '😴', texto: 'Restauração da qualidade do sono e recuperação' });
  if (padroes.problemas.some(p => p.id === 'dieta_restritiva'))
    objetivos.push({ icone: '🍽️', texto: 'Reestruturação do padrão alimentar com saciedade' });

  // Por composição corporal
  const antroAtual = antro?.[0];
  if (antroAtual?.pct_gordura > 30)
    objetivos.push({ icone: '⚖️', texto: 'Redução de gordura corporal com preservação de massa magra' });
  if (antroAtual?.massa_magra)
    objetivos.push({ icone: '💪', texto: 'Manutenção e melhora da composição corporal' });

  // Sempre presente
  objetivos.push({ icone: '⚡', texto: 'Aumento de energia, foco e qualidade de vida' });
  if (modulos.includes('atleta'))
    objetivos.push({ icone: '🏃', texto: 'Otimização de performance e recuperação esportiva' });

  return objetivos.slice(0, 5);
}

// ── Diagnóstico integrado ─────────────────────────────────
function gerarAchadosDiagnostico(anamnese, comp, antro, insights, padroes) {
  const achados = [];

  // De exames laboratoriais
  if (anamnese?.glicemia > 99)
    achados.push({ nivel: 'critico', texto: `Glicemia de jejum elevada (${anamnese.glicemia} mg/dL) — risco de RI/diabetes`, origem: 'Laboratório' });
  if (anamnese?.hba1c > 5.7)
    achados.push({ nivel: 'critico', texto: `HbA1c aumentada (${anamnese.hba1c}%) — controle glicêmico comprometido`, origem: 'Laboratório' });
  if (anamnese?.tg > 150)
    achados.push({ nivel: 'atencao', texto: `Triglicerídeos elevados (${anamnese.tg} mg/dL) — risco cardiovascular`, origem: 'Laboratório' });
  if (anamnese?.hdl && anamnese.hdl < 50)
    achados.push({ nivel: 'atencao', texto: `HDL baixo (${anamnese.hdl} mg/dL) — proteção cardiovascular insuficiente`, origem: 'Laboratório' });
  if (anamnese?.insulina > 10)
    achados.push({ nivel: 'critico', texto: `Insulina basal elevada (${anamnese.insulina} μU/mL) — hiperinsulinemia`, origem: 'Laboratório' });

  // De antropometria
  const antroAtual = antro?.[0];
  if (antroAtual?.imc > 30)
    achados.push({ nivel: 'atencao', texto: `IMC ${Number(antroAtual.imc).toFixed(1)} — obesidade grau ${antroAtual.imc >= 40 ? 'III' : antroAtual.imc >= 35 ? 'II' : 'I'}`, origem: 'Antropometria' });
  if (antroAtual?.pct_gordura > 30)
    achados.push({ nivel: 'atencao', texto: `Gordura corporal elevada (${antroAtual.pct_gordura.toFixed(1)}%)`, origem: 'Antropometria' });
  if (antroAtual?.circunferencia_cintura > 88)
    achados.push({ nivel: 'atencao', texto: `Circunferência de cintura aumentada (${antroAtual.circunferencia_cintura} cm) — risco metabólico`, origem: 'Antropometria' });

  // De check-ins
  if (comp?.fome > 2.5)
    achados.push({ nivel: 'atencao', texto: `Fome média elevada (${comp.fome.toFixed(1)}/4) — possível déficit calórico ou hormonal`, origem: 'Check-ins' });
  if (comp?.sonoHoras < 6.5)
    achados.push({ nivel: 'critico', texto: `Privação crônica de sono (${comp.sonoHoras.toFixed(1)}h/noite) — impacto hormonal e metabólico`, origem: 'Check-ins' });
  if (comp?.pctEvacuou < 60)
    achados.push({ nivel: 'atencao', texto: `Trânsito intestinal irregular (${comp.pctEvacuou}% dos dias) — possível disbiose`, origem: 'Check-ins' });
  if (comp?.agua < 1.5)
    achados.push({ nivel: 'atencao', texto: `Hidratação insuficiente (${comp.agua.toFixed(1)}L/dia)`, origem: 'Check-ins' });

  // De insights da anamnese
  insights.filter(i => i.tipo === 'critico').forEach(i => {
    achados.push({ nivel: 'critico', texto: i.mensagem, origem: 'Anamnese' });
  });

  return achados.slice(0, 8);
}

// ── Geração de score por área ─────────────────────────────
function calcularScoreAreas(comp, adesao) {
  if (!comp) return null;
  const s = n => Math.round(Math.min(Math.max(n * 100, 0), 100));
  return {
    sono:        s(comp.sonoHoras != null ? (comp.sonoHoras / 8.5) * (comp.sonoQual != null ? comp.sonoQual / 5 : 0.7) : 0),
    alimentacao: s(comp.fome != null ? (1 - (comp.fome - 1) / 3) * (1 - comp.pctDescontrole / 100) : 0.5),
    intestino:   s(comp.pctEvacuou / 100),
    energia:     s(comp.energia != null ? comp.energia / 5 : 0),
    adesao:      adesao.pct,
  };
}

// ── Macros recomendados por perfil ────────────────────────
function gerarEstruturaMacros(anamnese, perfilMetabolico, faseAtual) {
  const pat = anamnese?.patologias || [];
  const kcal = faseAtual?.calorias_alvo || null;
  const nivel = anamnese?.nivel_af || 'moderado';

  let cho, ptn, lip, justificativas;

  if (pat.some(p => ['diabetes','resistencia_insulina'].includes(p))) {
    cho = { pct: 35, g: kcal ? Math.round(kcal * 0.35 / 4) : null };
    ptn = { pct: 30, g: kcal ? Math.round(kcal * 0.30 / 4) : null };
    lip = { pct: 35, g: kcal ? Math.round(kcal * 0.35 / 9) : null };
    justificativas = {
      cho: 'Redução de carboidratos para controle glicêmico e melhora da sensibilidade insulínica',
      ptn: 'Proteína elevada para saciedade e preservação de massa magra com déficit calórico',
      lip: 'Gorduras boas (mono e poli-insaturadas) para sinalização hormonal e anti-inflamação',
    };
  } else if (pat.includes('sop')) {
    cho = { pct: 40, g: kcal ? Math.round(kcal * 0.40 / 4) : null };
    ptn = { pct: 28, g: kcal ? Math.round(kcal * 0.28 / 4) : null };
    lip = { pct: 32, g: kcal ? Math.round(kcal * 0.32 / 9) : null };
    justificativas = {
      cho: 'Carboidratos de baixo índice glicêmico para regularização hormonal e insulina',
      ptn: 'Proteína moderada-alta para saciedade e manutenção metabólica',
      lip: 'Ácidos graxos essenciais para produção hormonal (ômega-3 e gorduras insaturadas)',
    };
  } else if (nivel === 'intenso' || nivel === 'atleta') {
    cho = { pct: 50, g: kcal ? Math.round(kcal * 0.50 / 4) : null };
    ptn = { pct: 28, g: kcal ? Math.round(kcal * 0.28 / 4) : null };
    lip = { pct: 22, g: kcal ? Math.round(kcal * 0.22 / 9) : null };
    justificativas = {
      cho: 'Carboidratos como principal combustível para treinos de alta intensidade',
      ptn: 'Proteína elevada para síntese proteica e recuperação muscular',
      lip: 'Gorduras para sinalização hormonal e absorção de vitaminas lipossolúveis',
    };
  } else {
    cho = { pct: 45, g: kcal ? Math.round(kcal * 0.45 / 4) : null };
    ptn = { pct: 25, g: kcal ? Math.round(kcal * 0.25 / 4) : null };
    lip = { pct: 30, g: kcal ? Math.round(kcal * 0.30 / 9) : null };
    justificativas = {
      cho: 'Carboidratos de qualidade (integrais, frutas, leguminosas) para energia sustentada',
      ptn: 'Proteína distribuída ao longo do dia para saciedade e preservação muscular',
      lip: 'Gorduras boas para saúde cardiovascular e hormonal',
    };
  }

  return { kcal, cho, ptn, lip, justificativas };
}

// ── Regras de ajuste automático ───────────────────────────
function gerarRegrasAjuste(evolPeso, padroes, perfilMetabolico) {
  const regras = [];

  regras.push({
    gatilho: 'Peso estagnado por 2+ semanas com boa adesão',
    acao: 'Reduzir 200–300 kcal/dia OU adicionar 1–2 treinos aeróbicos semanais',
    justificativa: 'Termogênese adaptativa — organismo reduziu metabolismo basal em resposta ao déficit',
    urgencia: 'alta',
  });
  regras.push({
    gatilho: 'Fome elevada persistente (>3/4 por 5+ dias)',
    acao: 'Aumentar proteína (+20–30g/dia) OU adicionar volumosa de baixa caloria em cada refeição',
    justificativa: 'Alta fome indica déficit agressivo ou distribuição de macros inadequada para saciedade',
    urgencia: 'alta',
  });
  regras.push({
    gatilho: 'Energia abaixo de 2/5 por 1+ semana',
    acao: 'Revisar adequação calórica total; adicionar carboidratos ao café da manhã e pré-treino',
    justificativa: 'Energia cronicamente baixa sugere subalimentação ou carboidrato insuficiente',
    urgencia: 'alta',
  });
  regras.push({
    gatilho: 'Perda de peso rápida (>1kg/sem por 2+ semanas)',
    acao: 'Aumentar 200 kcal/dia (preferencialmente proteína + gordura); monitorar energia',
    justificativa: 'Perda muito acelerada eleva risco de catabolismo muscular e reganho posterior',
    urgencia: 'media',
  });
  regras.push({
    gatilho: 'Episódios de compulsão frequentes (>3x/semana)',
    acao: 'Revisar distribuição de refeições; adicionar colação com proteína; eliminar alimentos-gatilho do ambiente',
    justificativa: 'Compulsão recorrente é sinal de restrição excessiva ou gatilho emocional não endereçado',
    urgencia: 'alta',
  });
  regras.push({
    gatilho: 'Sono médio < 6h por 1+ semana',
    acao: 'Ajustar horários de refeições (última refeição ≥2h antes de dormir); reduzir cafeína após 14h',
    justificativa: 'Timing alimentar impacta melatonina e qualidade do sono',
    urgencia: 'media',
  });

  return regras;
}

// ── Recomendações personalizadas ─────────────────────────
function gerarRecomendacoes(anamnese, comp, perfilMetabolico, modulos, antro) {
  const recs = [];
  const pat = anamnese?.patologias || [];
  const antroAtual = antro?.[0];

  // Hidratação
  const pesoRef = antroAtual?.peso || 70;
  const litrosRec = Math.round((pesoRef * 35) / 1000 * 10) / 10;
  recs.push({
    categoria: 'Hidratação',
    icone: '💧',
    recomendacao: `${litrosRec}L de água/dia (35ml/kg de peso corporal)`,
    detalhe: comp?.agua < litrosRec ? `Atual: ${comp.agua?.toFixed(1) || '?'}L — déficit de ${(litrosRec - (comp?.agua || 0)).toFixed(1)}L/dia` : 'Meta atingida. Manter o padrão.',
    prioridade: comp?.agua < 1.5 ? 'alta' : 'media',
  });

  // Sono
  recs.push({
    categoria: 'Sono',
    icone: '😴',
    recomendacao: '7–8h de sono por noite, horários regulares (mesma hora de dormir e acordar)',
    detalhe: comp?.sonoHoras < 7
      ? `Atual: ${comp.sonoHoras?.toFixed(1)}h. Evitar telas 1h antes de dormir; última refeição 2h antes; considerar magnésio glicinato à noite.`
      : 'Sono adequado. Manter consistência nos horários.',
    prioridade: comp?.sonoHoras < 6.5 ? 'alta' : 'info',
  });

  // Suplementação baseada em patologias/exames
  if (pat.some(p => ['resistencia_insulina','diabetes','sop'].includes(p))) {
    recs.push({
      categoria: 'Suplementação',
      icone: '💊',
      recomendacao: 'Considerar: Inositol (4g/dia), Berberina (500mg 2x/dia) ou Cromo (200mcg/dia)',
      detalhe: 'Compostos com evidência para melhora de sensibilidade insulínica. Avaliar com exames de acompanhamento.',
      prioridade: 'media',
    });
  }
  if (anamnese?.vitamina_d && anamnese.vitamina_d < 30) {
    recs.push({
      categoria: 'Suplementação',
      icone: '☀️',
      recomendacao: 'Vitamina D3 + K2 — dose baseada no exame (mínimo 2.000 UI/dia)',
      detalhe: `Última dosagem: ${anamnese.vitamina_d} ng/mL. Deficiência associada a resistência insulínica, imunidade e humor.`,
      prioridade: 'alta',
    });
  }
  if (comp?.sonoHoras < 6.5 || comp?.energia < 3) {
    recs.push({
      categoria: 'Suplementação',
      icone: '🧪',
      recomendacao: 'Magnésio glicinato (300–400mg à noite) — para sono e recuperação',
      detalhe: 'Magnésio atua na qualidade do sono, redução de cortisol e relaxamento muscular.',
      prioridade: 'media',
    });
  }

  // Rotina alimentar
  recs.push({
    categoria: 'Rotina Alimentar',
    icone: '⏰',
    recomendacao: 'Janela alimentar de 10–12h; café da manhã proteico; evitar comer após 20h',
    detalhe: 'Alimentação com horários regulares melhora metabolismo, glicemia e qualidade do sono.',
    prioridade: 'media',
  });

  // Movimento
  if (comp?.pctTreino < 50) {
    recs.push({
      categoria: 'Movimento',
      icone: '🏃',
      recomendacao: '150 min/semana de atividade moderada mínima — caminhar 20–30min/dia já impacta',
      detalhe: `Atual: ${comp.pctTreino}% dos dias com treino. Cada 10% de aumento na frequência melhora score metabólico em ~5 pontos.`,
      prioridade: comp.pctTreino < 30 ? 'alta' : 'media',
    });
  }

  return recs;
}

// ── Projeção de resultado ─────────────────────────────────
function gerarProjecao(evolPeso, adesao, fases) {
  if (!evolPeso) return null;

  const ritmoAtual = evolPeso.kgPorSemana || -0.3;
  const semanasTotais = fases.reduce((s, f) => s + (f.duracao_semanas || 0), 0) || 12;

  const cenarios = [
    { nome: 'Conservador', ritmo: Math.abs(ritmoAtual) * 0.6, desc: 'Adesão ~50% · Ajustes lentos', cor: '#B8860B' },
    { nome: 'Realista', ritmo: Math.abs(ritmoAtual), desc: `Manutenção da adesão atual (${adesao.pct}%)`, cor: '#3A5E8B' },
    { nome: 'Otimista', ritmo: Math.abs(ritmoAtual) * 1.4, desc: 'Adesão >80% · Ajustes pontuais', cor: '#2E8B6A' },
  ];

  return cenarios.map(c => ({
    ...c,
    kgTotal: (c.ritmo * semanasTotais).toFixed(1),
    semanas: semanasTotais,
    dataAlvo: (() => {
      const d = new Date(); d.setDate(d.getDate() + semanasTotais * 7);
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    })(),
  }));
}

// ── Indicadores de sucesso ────────────────────────────────
function gerarIndicadores(anamnese, evolPeso, padroes, comp) {
  const indicadores = [];
  const pat = anamnese?.patologias || [];
  const antroRef = evolPeso?.atual;

  // Peso / composição
  if (antroRef) {
    const metaPeso = antroRef - (evolPeso.kgPorSemana ? Math.abs(evolPeso.kgPorSemana) * 12 : 5);
    indicadores.push({ area: 'Composição Corporal', meta: `Peso ≤ ${metaPeso.toFixed(1)} kg ou redução de 5–10% do peso atual`, metrica: 'Antropometria mensal' });
  }
  if (evolPeso?.gordura > 25)
    indicadores.push({ area: 'Gordura Corporal', meta: `Redução de ${Math.min(5, evolPeso.gordura - 20).toFixed(0)}% de gordura corporal`, metrica: 'Bioimpedância trimestral' });

  // Energia / bem-estar
  indicadores.push({ area: 'Energia', meta: 'Energia média ≥ 4/5 por pelo menos 70% dos dias', metrica: 'Check-in diário' });
  indicadores.push({ area: 'Sono', meta: '7h+/noite, qualidade ≥ 4/5 por 70% dos dias', metrica: 'Check-in diário' });
  indicadores.push({ area: 'Adesão', meta: 'Mínimo 70% de dias com check-in e seguimento do plano', metrica: 'Registro semanal' });

  // Laboratorial
  if (anamnese?.glicemia > 99)
    indicadores.push({ area: 'Glicemia', meta: 'Glicemia de jejum < 100 mg/dL', metrica: 'Exame trimestral' });
  if (anamnese?.tg > 150)
    indicadores.push({ area: 'Triglicerídeos', meta: 'TG < 150 mg/dL', metrica: 'Lipidograma 3 meses' });

  // Comportamental
  if (comp?.pctDescontrole > 20)
    indicadores.push({ area: 'Controle Alimentar', meta: 'Episódios de descontrole < 2x/semana', metrica: 'Check-in diário' });

  indicadores.push({ area: 'Score Metabólico', meta: 'Score geral ≥ 70/100 sustentado por 3+ semanas', metrica: 'Dashboard automático' });

  return indicadores.slice(0, 6);
}

// ============================================================
// RENDERIZAÇÃO — 15 SEÇÕES PREMIUM
// ============================================================
export function renderDossie(dados, analise, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const { patient, anamnese, modulos, fases, antro, insights, checkins30 } = dados;
  const {
    comp30, evolPeso, scoreData, adesao, tendAdesao,
    gargalos, riscos, oportunidades,
    perfilMetabolico, perfilComportamental,
    faseAtual, timeline,
  } = analise;

  // ── Dados processados para seções ──
  const idadeAnos = patient.data_nascimento
    ? Math.floor((Date.now() - new Date(patient.data_nascimento)) / (365.25 * 24 * 3600 * 1000))
    : null;
  const dataInicio = anamnese?.data_avaliacao || antro?.[antro.length-1]?.data_avaliacao || null;
  const subObjetivos = gerarSubObjetivos(anamnese, analise.padroes, antro, modulos);
  const achadosDx = gerarAchadosDiagnostico(anamnese, comp30, antro, insights, analise.padroes);
  const scoreAreas = calcularScoreAreas(comp30, adesao);
  const macros = gerarEstruturaMacros(anamnese, perfilMetabolico, faseAtual);
  const regrasAjuste = gerarRegrasAjuste(evolPeso, analise.padroes, perfilMetabolico);
  const recsPersonalizadas = gerarRecomendacoes(anamnese, comp30, perfilMetabolico, modulos, antro);
  const projecao = gerarProjecao(evolPeso, adesao, fases);
  const indicadores = gerarIndicadores(anamnese, evolPeso, analise.padroes, comp30);

  el.innerHTML = `
  <div class="dos-documento">

    <!-- ════════════════════════════════════════════
         SEÇÃO 1 — CAPA
         ════════════════════════════════════════════ -->
    <section class="dos-capa dos-page-break-after">
      <div class="dos-capa-marca">${MARCA}</div>
      <div class="dos-capa-centro">
        <p class="dos-capa-label">Dossiê Clínico Premium</p>
        <h1 class="dos-capa-nome">${patient.nome || '—'}</h1>
        <div class="dos-capa-linha"></div>
        <div class="dos-capa-meta">
          ${kv('Início do acompanhamento', formatData(dataInicio))}
          ${kv('Objetivo principal', anamnese?.motivo || 'A definir')}
          ${idadeAnos ? kv('Idade', idadeAnos + ' anos') : ''}
          ${patient.data_proxima_consulta ? kv('Próxima consulta', formatData(patient.data_proxima_consulta)) : ''}
        </div>
      </div>
      <div class="dos-capa-rodape">
        <div class="dos-capa-rod-perfis">
          <div class="dos-rod-perfil" style="border-color:${perfilMetabolico.cor};">
            <span style="color:${perfilMetabolico.cor};">${perfilMetabolico.icone}</span>
            <span>${perfilMetabolico.titulo}</span>
          </div>
          <div class="dos-rod-perfil" style="border-color:${perfilComportamental.cor};">
            <span style="color:${perfilComportamental.cor};">${perfilComportamental.icone}</span>
            <span>${perfilComportamental.titulo}</span>
          </div>
          ${scoreData ? `<div class="dos-rod-perfil">
            <span>Score</span><strong>${scoreData.score}/100</strong>
          </div>` : ''}
        </div>
        <p class="dos-capa-rod-data">Gerado em: ${new Date().toLocaleDateString('pt-BR', { day:'2-digit',month:'long',year:'numeric' })}</p>
      </div>
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 2 — OBJETIVO ESTRATÉGICO
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(2, 'Objetivo Estratégico', 'Metas clínicas estruturadas com critérios de sucesso mensuráveis')}
      <div class="dos-2col">
        <div>
          <p class="dos-card-label">Objetivo Principal</p>
          <p class="dos-obj-principal">${anamnese?.motivo || 'A definir na anamnese'}</p>
          <p class="dos-card-label" style="margin-top:20px;">Sub-objetivos Clínicos</p>
          <div class="dos-subobj-lista">
            ${subObjetivos.map(o => `
              <div class="dos-subobj-item">
                <span class="dos-subobj-icone">${o.icone}</span>
                <span class="dos-subobj-texto">${o.texto}</span>
              </div>`).join('')}
          </div>
        </div>
        <div>
          <p class="dos-card-label">Prazo Estimado</p>
          <p class="dos-prazo-num">${fases.reduce((s,f)=>s+(f.duracao_semanas||0),0) || '—'}<span>semanas</span></p>
          <p class="dos-card-label" style="margin-top:20px;">Métrica de Sucesso</p>
          <div class="dos-metricas-sucesso">
            ${evolPeso?.atual ? `<div class="dos-ms-item">${kv('Peso atual', evolPeso.atual.toFixed(1) + ' kg')}</div>` : ''}
            ${evolPeso?.gordura ? `<div class="dos-ms-item">${kv('Gordura corporal', evolPeso.gordura.toFixed(1) + '%')}</div>` : ''}
            <div class="dos-ms-item">${kv('Score metabólico', scoreData ? scoreData.score + '/100' : '—')}</div>
            <div class="dos-ms-item">${kv('Adesão atual', adesao.pct + '%')}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 3 — PERFIL DO PACIENTE
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(3, 'Perfil do Paciente', 'Análise tridimensional: metabólico · comportamental · fisiológico')}

      <div class="dos-3col">
        <!-- 3.1 Metabólico -->
        <div class="dos-perfil-bloco" style="border-top:3px solid ${perfilMetabolico.cor};">
          <p class="dos-card-label">3.1 Perfil Metabólico</p>
          <p class="dos-perfil-titulo-bloco" style="color:${perfilMetabolico.cor};">${perfilMetabolico.icone} ${perfilMetabolico.titulo}</p>
          <p class="dos-perfil-subtitulo">${perfilMetabolico.subtitulo}</p>
          <p class="dos-perfil-desc">${perfilMetabolico.descricao}</p>
          <ul class="dos-perfil-lista">
            ${perfilMetabolico.caracteristicas.map(c=>`<li>${c}</li>`).join('')}
          </ul>
        </div>

        <!-- 3.2 Comportamental -->
        <div class="dos-perfil-bloco" style="border-top:3px solid ${perfilComportamental.cor};">
          <p class="dos-card-label">3.2 Perfil Comportamental</p>
          <p class="dos-perfil-titulo-bloco" style="color:${perfilComportamental.cor};">${perfilComportamental.icone} ${perfilComportamental.titulo}</p>
          <p class="dos-perfil-subtitulo">${perfilComportamental.subtitulo}</p>
          <p class="dos-perfil-desc">${perfilComportamental.descricao}</p>
          <div class="dos-perfil-estrategia">
            <p class="dos-card-label">Estratégia</p>
            <p>${perfilComportamental.estrategia}</p>
          </div>
        </div>

        <!-- 3.3 Fisiológico -->
        <div class="dos-perfil-bloco" style="border-top:3px solid #6D5ACF;">
          <p class="dos-card-label">3.3 Perfil Fisiológico</p>
          ${comp30 ? `
          <div class="dos-fisio-grid">
            <div class="dos-fisio-item">
              <p class="dos-fisio-val" style="color:${comp30.sonoHoras >= 7 ? '#2E8B6A' : comp30.sonoHoras >= 6 ? '#B8860B' : '#B33030'};">${comp30.sonoHoras?.toFixed(1) || '—'}h</p>
              <p class="dos-fisio-label">Sono médio</p>
              <p class="dos-fisio-status">${comp30.sonoHoras >= 7 ? 'Adequado' : comp30.sonoHoras >= 6 ? 'Limitado' : 'Insuficiente'}</p>
            </div>
            <div class="dos-fisio-item">
              <p class="dos-fisio-val" style="color:${comp30.pctEvacuou >= 80 ? '#2E8B6A' : comp30.pctEvacuou >= 60 ? '#B8860B' : '#B33030'};">${comp30.pctEvacuou}%</p>
              <p class="dos-fisio-label">Trânsito intestinal</p>
              <p class="dos-fisio-status">${comp30.pctEvacuou >= 80 ? 'Regular' : comp30.pctEvacuou >= 60 ? 'Irregular' : 'Comprometido'}</p>
            </div>
            <div class="dos-fisio-item">
              <p class="dos-fisio-val" style="color:${comp30.energia >= 4 ? '#2E8B6A' : comp30.energia >= 3 ? '#B8860B' : '#B33030'};">${comp30.energia?.toFixed(1) || '—'}/5</p>
              <p class="dos-fisio-label">Energia média</p>
              <p class="dos-fisio-status">${comp30.energia >= 4 ? 'Alta' : comp30.energia >= 3 ? 'Moderada' : 'Baixa'}</p>
            </div>
            <div class="dos-fisio-item">
              <p class="dos-fisio-val" style="color:${comp30.agua >= 2 ? '#2E8B6A' : comp30.agua >= 1.5 ? '#B8860B' : '#B33030'};">${comp30.agua?.toFixed(1) || '—'}L</p>
              <p class="dos-fisio-label">Hidratação</p>
              <p class="dos-fisio-status">${comp30.agua >= 2 ? 'Boa' : comp30.agua >= 1.5 ? 'Baixa' : 'Insuficiente'}</p>
            </div>
          </div>` : '<p class="dos-empty">Sem dados de check-in</p>'}
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 4 — DIAGNÓSTICO NUTRICIONAL INTEGRADO
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(4, 'Diagnóstico Nutricional Integrado', 'Cruzamento de anamnese · exames · antropometria · comportamento alimentar')}
      ${achadosDx.length ? `
      <div class="dos-dx-grid">
        ${achadosDx.map(a => `
          <div class="dos-dx-item dos-dx-${a.nivel}">
            <div class="dos-dx-nivel-badge">${a.nivel === 'critico' ? '⚠ Crítico' : 'Atenção'}</div>
            <p class="dos-dx-texto">${a.texto}</p>
            <span class="dos-dx-origem">${a.origem}</span>
          </div>`).join('')}
      </div>` : '<p class="dos-empty">Complete a anamnese e os check-ins para gerar o diagnóstico.</p>'}

      ${gargalos.length ? `
      <p class="dos-card-label" style="margin-top:24px;">Problemas Prioritários (cadeias causais detectadas)</p>
      <div class="dos-gargalos-lista">
        ${gargalos.map((g,i) => `
          <div class="dos-gargalo-linha">
            <span class="dos-gargalo-num">${String(i+1).padStart(2,'0')}</span>
            <div>
              <p class="dos-gargalo-titulo">${g.titulo}</p>
              <p class="dos-gargalo-mec">${g.mecanismo}</p>
              <p class="dos-gargalo-ev">📊 ${g.evidencia}</p>
            </div>
          </div>`).join('')}
      </div>` : ''}
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 5 — SCORE INTELIGENTE
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(5, 'Score Metabólico Inteligente', 'Pontuação composta baseada em dados reais dos últimos 30 dias')}
      ${scoreData && scoreAreas ? `
      <div class="dos-score-layout">
        <div class="dos-score-gauge-box">
          <svg width="180" height="100" viewBox="0 0 200 112">
            <path d="M 20 100 A 80 80 0 0 1 180 100" stroke="var(--detail)" stroke-width="16" fill="none" stroke-linecap="round"/>
            <path d="M 20 100 A 80 80 0 0 1 180 100" stroke="${scoreData.score >= 70 ? '#2E8B6A' : scoreData.score >= 50 ? '#B8860B' : '#B33030'}"
              stroke-width="16" fill="none" stroke-linecap="round"
              stroke-dasharray="${scoreData.score * 2.51} 999"/>
          </svg>
          <div class="dos-score-gauge-val">
            <p class="dos-score-num" style="color:${scoreData.score >= 70 ? '#2E8B6A' : scoreData.score >= 50 ? '#B8860B' : '#B33030'};">${scoreData.score}</p>
            <p class="dos-score-label">${scoreData.score >= 75 ? 'Muito Bom' : scoreData.score >= 60 ? 'Bom' : scoreData.score >= 45 ? 'Regular' : 'Baixo'}</p>
          </div>
          <p class="dos-score-tend" style="color:${scoreData.tendencia?.cor || 'var(--sub)'};">${scoreData.tendencia?.label || '→ Estável'}</p>
        </div>
        <div class="dos-score-areas">
          ${[
            { label: 'Sono', val: scoreAreas.sono, icone: '😴' },
            { label: 'Alimentação', val: scoreAreas.alimentacao, icone: '🍽️' },
            { label: 'Intestino', val: scoreAreas.intestino, icone: '🌿' },
            { label: 'Energia', val: scoreAreas.energia, icone: '⚡' },
            { label: 'Adesão', val: scoreAreas.adesao, icone: '🎯' },
          ].map(a => {
            const cor = a.val >= 70 ? '#2E8B6A' : a.val >= 50 ? '#B8860B' : '#B33030';
            return `<div class="dos-score-area-row">
              <span class="dos-score-area-icone">${a.icone}</span>
              <span class="dos-score-area-label">${a.label}</span>
              <div class="dos-score-bar-bg">
                <div class="dos-score-bar-fill" style="width:${a.val}%;background:${cor};"></div>
              </div>
              <span class="dos-score-area-val" style="color:${cor};">${a.val}</span>
            </div>`;
          }).join('')}
        </div>
      </div>` : '<p class="dos-empty">Score disponível após 5+ check-ins registrados.</p>'}
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 6 — LINHA DO TEMPO
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(6, 'Linha do Tempo', 'Evolução integrada — peso · score · adesão nos últimos 90 dias')}
      ${(analise.timeline.scoreHist.length >= 3 || analise.timeline.pesoHist.length >= 2) ? `
      <div class="dos-timeline-grid">
        ${analise.timeline.scoreHist.length >= 3 ? `<div class="dos-timeline-chart-box">
          <p class="dos-card-label">Score Metabólico (90d)</p>
          <canvas id="dos-chart-score" height="90"></canvas>
        </div>` : ''}
        ${analise.timeline.pesoHist.length >= 2 ? `<div class="dos-timeline-chart-box">
          <p class="dos-card-label">Evolução de Peso</p>
          <canvas id="dos-chart-peso" height="90"></canvas>
        </div>` : ''}
      </div>
      ${evolPeso ? `
      <div class="dos-timeline-kpis">
        <div class="dos-tl-kpi">
          <p class="dos-tl-val">${evolPeso.atual?.toFixed(1) || '—'} kg</p>
          <p class="dos-tl-label">Peso atual</p>
        </div>
        ${evolPeso.deltaTotal !== null ? `<div class="dos-tl-kpi">
          <p class="dos-tl-val" style="color:${evolPeso.deltaTotal < 0 ? '#2E8B6A' : evolPeso.deltaTotal > 0 ? '#B33030' : '#B8860B'};">${evolPeso.deltaTotal > 0 ? '+' : ''}${evolPeso.deltaTotal.toFixed(1)} kg</p>
          <p class="dos-tl-label">Variação total</p>
        </div>` : ''}
        ${evolPeso.kgPorSemana !== null ? `<div class="dos-tl-kpi">
          <p class="dos-tl-val">${Math.abs(evolPeso.kgPorSemana).toFixed(2)} kg/sem</p>
          <p class="dos-tl-label">Ritmo de perda</p>
        </div>` : ''}
        <div class="dos-tl-kpi">
          <p class="dos-tl-val">${adesao.pct}%</p>
          <p class="dos-tl-label">Adesão 30d</p>
        </div>
      </div>` : ''}` : '<p class="dos-empty">Dados insuficientes para linha do tempo. Continue registrando check-ins e antropometrias.</p>'}
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 7 — GARGALOS E RISCOS
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(7, 'Gargalos e Riscos Clínicos', 'Identificação automática de bloqueadores de resultado e pontos de atenção')}
      <div class="dos-2col">
        <div>
          <p class="dos-card-label" style="color:#B33030;">⬤ Gargalos (cadeias causais)</p>
          ${!gargalos.length ? '<p class="dos-empty">Nenhum gargalo identificado ✓</p>' :
            gargalos.map(g => `<div class="dos-risco-card" style="border-left-color:#B33030;">
              <p class="dos-risco-titulo" style="color:#B33030;">${g.titulo}</p>
              <p class="dos-risco-desc">${g.mecanismo}</p>
              <p class="dos-risco-ev">📊 ${g.evidencia}</p>
            </div>`).join('')}
        </div>
        <div>
          <p class="dos-card-label" style="color:#B8860B;">⬤ Riscos de Acompanhamento</p>
          ${!riscos.length ? '<p class="dos-empty">Sem riscos identificados ✓</p>' :
            riscos.map(r => `<div class="dos-risco-card" style="border-left-color:#B8860B;">
              <p class="dos-risco-titulo" style="color:#B8860B;">${r.titulo}</p>
              <p class="dos-risco-desc">${r.descricao}</p>
              <p class="dos-risco-ev">→ ${r.acao}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 8 — ESTRATÉGIA NUTRICIONAL
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(8, 'Estratégia Nutricional por Fases', 'Protocolo de tratamento personalizado — não uma dieta, uma estratégia')}
      ${!fases.length ? `<div class="dos-alert-info">
        Nenhuma fase cadastrada. Acesse o módulo de Fases para definir a estratégia de tratamento.
      </div>` : `
      <div class="dos-fases-doc">
        ${fases.map((f, i) => {
          const STATUS = { pendente:'#9A7D5E', ativa:'#2E8B6A', concluida:'#B8860B' };
          const cor = STATUS[f.status] || '#9A7D5E';
          const ativa = f.status === 'ativa';
          return `<div class="dos-fase-doc ${ativa ? 'dos-fase-doc-ativa' : ''}">
            <div class="dos-fase-doc-num" style="color:${cor};border-color:${cor};">
              ${f.status === 'concluida' ? '✓' : `F${i+1}`}
            </div>
            <div class="dos-fase-doc-corpo">
              <div class="dos-fase-doc-header">
                <h3 class="dos-fase-doc-nome">${f.nome}</h3>
                <span class="dos-fase-doc-status" style="color:${cor};background:${cor}18;">${f.status === 'ativa' ? 'Em curso' : f.status === 'concluida' ? 'Concluída' : 'Pendente'}</span>
                ${f.duracao_semanas ? `<span class="dos-fase-doc-dur">${f.duracao_semanas} sem</span>` : ''}
                ${f.calorias_alvo ? `<span class="dos-fase-doc-dur">${f.calorias_alvo} kcal/dia</span>` : ''}
              </div>
              ${f.objetivo_clinico || f.objetivo ? `<p class="dos-fase-doc-obj"><strong>Objetivo:</strong> ${f.objetivo_clinico || f.objetivo}</p>` : ''}
              ${f.descricao ? `<p class="dos-fase-doc-desc">${f.descricao}</p>` : ''}
              ${f.meta_peso_diff ? `<p class="dos-fase-doc-meta">Meta de composição: ${f.meta_peso_diff > 0 ? '+' : ''}${f.meta_peso_diff} kg</p>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 9 — PLANO ALIMENTAR COM INTELIGÊNCIA
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(9, 'Estrutura do Plano Alimentar', 'Distribuição de macros com justificativa clínica individualizada')}
      <div class="dos-2col">
        <div>
          ${macros.kcal ? `<div class="dos-kcal-destaque">
            <p class="dos-kcal-num">${macros.kcal}<span>kcal/dia</span></p>
            <p class="dos-kcal-label">Meta calórica da fase atual</p>
          </div>` : '<div class="dos-alert-info">Defina as calorias na fase ativa para calcular a distribuição de macros.</div>'}

          <p class="dos-card-label" style="margin-top:20px;">Distribuição de Macronutrientes</p>
          ${['cho','ptn','lip'].map(m => {
            const cfg = { cho: { nome:'Carboidratos', cor:'#C9A882' }, ptn: { nome:'Proteínas', cor:'#3A5E8B' }, lip: { nome:'Gorduras', cor:'#2E8B6A' } };
            const item = macros[m];
            const c = cfg[m];
            return `<div class="dos-macro-row">
              <div class="dos-macro-header">
                <span class="dos-macro-nome" style="color:${c.cor};">${c.nome}</span>
                <span class="dos-macro-pct" style="color:${c.cor};">${item.pct}%${item.g ? ` · ${item.g}g/dia` : ''}</span>
              </div>
              <div class="dos-macro-bar-bg">
                <div class="dos-macro-bar-fill" style="width:${item.pct}%;background:${c.cor};"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
        <div>
          <p class="dos-card-label">Justificativa Clínica</p>
          ${['cho','ptn','lip'].map(m => {
            const cfg = { cho: { nome:'Carboidratos', cor:'#C9A882' }, ptn: { nome:'Proteínas', cor:'#3A5E8B' }, lip: { nome:'Gorduras', cor:'#2E8B6A' } };
            const c = cfg[m];
            return `<div class="dos-justif-item" style="border-left:2px solid ${c.cor};">
              <p class="dos-justif-macro" style="color:${c.cor};">${c.nome}</p>
              <p class="dos-justif-texto">${macros.justificativas[m]}</p>
            </div>`;
          }).join('')}
          <div class="dos-alert-info" style="margin-top:16px;">
            💡 O plano alimentar completo está disponível no módulo <strong>Plano Alimentar</strong> do sistema.
          </div>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 10 — ESTRATÉGIA DE AJUSTES
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(10, 'Estratégia de Ajustes', 'Regras automáticas de intervenção — quando e como o plano evolui')}
      <div class="dos-ajustes-grid">
        ${regrasAjuste.map((r, i) => `
          <div class="dos-ajuste-card">
            <div class="dos-ajuste-num">${String(i+1).padStart(2,'0')}</div>
            <div class="dos-ajuste-corpo">
              <p class="dos-ajuste-gatilho">SE: ${r.gatilho}</p>
              <p class="dos-ajuste-acao">ENTÃO: ${r.acao}</p>
              <p class="dos-ajuste-justif">Por quê: ${r.justificativa}</p>
            </div>
            <span class="dos-ajuste-badge" style="color:${r.urgencia === 'alta' ? '#B33030' : '#B8860B'};background:${r.urgencia === 'alta' ? 'rgba(179,48,48,0.08)' : 'rgba(184,134,11,0.08)'};">${r.urgencia === 'alta' ? 'Alta' : 'Média'}</span>
          </div>`).join('')}
      </div>
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 11 — PLANO DE ACOMPANHAMENTO
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(11, 'Plano de Acompanhamento', 'Frequência · monitoramento · critérios de intervenção')}
      <div class="dos-3col">
        <div class="dos-acomp-bloco">
          <p class="dos-card-label">📅 Frequência</p>
          <div class="dos-acomp-item"><strong>Check-in diário:</strong> Score, sono, fome, energia, humor, água</div>
          <div class="dos-acomp-item"><strong>Diário alimentar:</strong> Registro de refeições (quando aplicável)</div>
          <div class="dos-acomp-item"><strong>Pesagem:</strong> 1–2x/semana, mesmas condições (manhã, em jejum)</div>
          <div class="dos-acomp-item"><strong>Consulta:</strong> ${patient.data_proxima_consulta ? formatData(patient.data_proxima_consulta) : 'A agendar'}</div>
        </div>
        <div class="dos-acomp-bloco">
          <p class="dos-card-label">📊 O que monitorar</p>
          <div class="dos-acomp-item">Score metabólico e tendência</div>
          <div class="dos-acomp-item">Peso e variação semanal</div>
          <div class="dos-acomp-item">Qualidade e quantidade de sono</div>
          <div class="dos-acomp-item">Nível de fome e descontroles</div>
          <div class="dos-acomp-item">Frequência de treinos</div>
          <div class="dos-acomp-item">Hidratação e trânsito intestinal</div>
        </div>
        <div class="dos-acomp-bloco">
          <p class="dos-card-label">🚨 Intervenção Imediata Se</p>
          <div class="dos-acomp-item dos-acomp-alerta">Score < 40 por 3+ dias consecutivos</div>
          <div class="dos-acomp-item dos-acomp-alerta">Fome ≥ 4/4 por 5+ dias</div>
          <div class="dos-acomp-item dos-acomp-alerta">Energia < 2/5 por 1 semana</div>
          <div class="dos-acomp-item dos-acomp-alerta">Sem check-in por 5+ dias</div>
          <div class="dos-acomp-item dos-acomp-alerta">Descontrole em >5 dias na semana</div>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 12 — RECOMENDAÇÕES PERSONALIZADAS
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(12, 'Recomendações Personalizadas', 'Hidratação · sono · suplementação · rotina — baseadas no perfil individual')}
      <div class="dos-recs-grid">
        ${recsPersonalizadas.map(r => `
          <div class="dos-rec-item" style="border-left:3px solid ${r.prioridade === 'alta' ? '#B33030' : r.prioridade === 'media' ? '#B8860B' : '#9A7D5E'};">
            <div class="dos-rec-header">
              <span class="dos-rec-icone">${r.icone}</span>
              <div>
                <p class="dos-rec-categoria">${r.categoria}</p>
                <p class="dos-rec-recomendacao">${r.recomendacao}</p>
              </div>
              <span class="dos-rec-prio" style="color:${r.prioridade==='alta'?'#B33030':r.prioridade==='media'?'#B8860B':'#9A7D5E'};background:${r.prioridade==='alta'?'rgba(179,48,48,0.07)':r.prioridade==='media'?'rgba(184,134,11,0.07)':'var(--bg2)'};">${r.prioridade==='alta'?'Urgente':r.prioridade==='media'?'Importante':'Info'}</span>
            </div>
            <p class="dos-rec-detalhe">${r.detalhe}</p>
          </div>`).join('')}
      </div>
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 13 — PROJEÇÃO DE RESULTADO
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(13, 'Projeção de Resultado', 'Cenários estimados baseados no ritmo atual de evolução')}
      ${projecao ? `
      <div class="dos-cenarios-grid">
        ${projecao.map(c => `
          <div class="dos-cenario-card" style="border-top:3px solid ${c.cor};">
            <p class="dos-cenario-nome" style="color:${c.cor};">${c.nome}</p>
            <p class="dos-cenario-desc">${c.desc}</p>
            <p class="dos-cenario-kg">${c.kgTotal}<span>kg em ${c.semanas} sem.</span></p>
            <p class="dos-cenario-data">Prazo estimado: ${c.dataAlvo}</p>
          </div>`).join('')}
      </div>
      <div class="dos-alert-info" style="margin-top:16px;">
        ⚠️ Projeções são estimativas baseadas no ritmo atual. Fatores como adesão, ajustes de plano e resposta individual influenciam o resultado real.
      </div>` : '<p class="dos-empty">Dados de evolução insuficientes para projeção. Continue registrando peso e check-ins.</p>'}
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 14 — INDICADORES DE SUCESSO
         ════════════════════════════════════════════ -->
    <section class="dos-secao">
      ${secNum(14, 'Indicadores de Sucesso', 'Critérios mensuráveis que definem progresso e resultado')}
      <div class="dos-indicadores-grid">
        ${indicadores.map((ind, i) => `
          <div class="dos-ind-card">
            <p class="dos-ind-num">${String(i+1).padStart(2,'0')}</p>
            <p class="dos-ind-area">${ind.area}</p>
            <p class="dos-ind-meta">${ind.meta}</p>
            <p class="dos-ind-metrica">Mensurado via: ${ind.metrica}</p>
          </div>`).join('')}
      </div>
    </section>

    <!-- ════════════════════════════════════════════
         SEÇÃO 15 — CONCLUSÃO ESTRATÉGICA
         ════════════════════════════════════════════ -->
    <section class="dos-secao dos-conclusao">
      ${secNum(15, 'Conclusão Estratégica', 'Síntese clínica · plano definido · próximos passos')}
      <div class="dos-2col">
        <div>
          <p class="dos-card-label">Situação Atual</p>
          <p class="dos-conclusao-texto">
            ${patient.nome?.split(' ')[0] || 'A paciente'} apresenta
            ${perfilMetabolico.titulo.toLowerCase()} com perfil comportamental de ${perfilComportamental.titulo.toLowerCase()}.
            ${comp30 ? `Nos últimos 30 dias, registrou ${adesao.dias} check-ins (${adesao.pct}% de adesão) com
            energia média de ${comp30.energia?.toFixed(1) || '—'}/5 e sono de ${comp30.sonoHoras?.toFixed(1) || '—'}h.` : ''}
            ${scoreData ? `Score metabólico: ${scoreData.score}/100 (${scoreData.tendencia?.label || 'estável'}).` : ''}
          </p>
          ${gargalos.length ? `<p class="dos-conclusao-texto" style="margin-top:12px;">
            Principais gargalos identificados: ${gargalos.slice(0,2).map(g=>g.titulo).join('; ')}.
          </p>` : ''}

          <p class="dos-card-label" style="margin-top:20px;">Plano Definido</p>
          <p class="dos-conclusao-texto">
            Estratégia de ${fases.reduce((s,f)=>s+(f.duracao_semanas||0),0) || '—'} semanas estruturada em ${fases.length || '—'} fase${fases.length !== 1 ? 's' : ''}.
            ${faseAtual ? `Fase atual: "${faseAtual.nome}"${faseAtual.calorias_alvo ? ` (${faseAtual.calorias_alvo} kcal/dia)` : ''}.` : ''}
            Distribuição de macros ajustada ao perfil ${perfilMetabolico.titulo.toLowerCase()}.
          </p>
        </div>
        <div>
          <p class="dos-card-label">Próximos Passos (14 dias)</p>
          <div class="dos-proximos-lista">
            ${riscos.filter(r=>r.urgencia==='alta').slice(0,2).map(r => `<div class="dos-proximo-item dos-proximo-urgente">⚠ ${r.acao}</div>`).join('')}
            ${oportunidades.slice(0,2).map(o => `<div class="dos-proximo-item dos-proximo-op">✦ ${o.titulo}</div>`).join('')}
            <div class="dos-proximo-item">→ Manter check-in diário</div>
            <div class="dos-proximo-item">→ Pesagem ${antro?.length ? '2x/semana' : 'semanal'} nas mesmas condições</div>
            ${patient.data_proxima_consulta ? `<div class="dos-proximo-item">📅 Próxima consulta: ${formatData(patient.data_proxima_consulta)}</div>` : ''}
          </div>

          <div class="dos-assinatura">
            <div class="dos-assinatura-linha"></div>
            <p class="dos-assinatura-nome">Dra. Evelin Ribeiro Greco</p>
            <p class="dos-assinatura-titulo">Nutricionista Clínica · CRN</p>
          </div>
        </div>
      </div>
    </section>

  </div>`;

  // Renderiza gráficos após DOM
  setTimeout(() => renderGraficosTimeline(analise.timeline), 80);
}

// ── Gráficos (stub para remoção de funções obsoletas abaixo) ──
function renderColGargalos(g){return'';}
function renderColRiscos(r){return'';}
function renderColOportunidades(o){return'';}
function renderPerfilMetabolicoDetalhado(){return'';}
function renderPerfilComportamentalDetalhado(){return'';}
function renderTimeline(){return'';}
function renderEstrategia(){return'';}
function renderRecomendacoes(){return'';}
function renderMiniPerfil(){return'';}

// (funções stub — conteúdo migrado para as 15 seções premiums)

// ── Coluna de Riscos ──────────────────────────────────────
function renderColRiscos(riscos) {
  return `<div class="dos-decisao-col">
    <div class="dos-decisao-col-header" style="border-bottom:2px solid #B8860B;">
      <span style="color:#B8860B;">⬤</span>
      <p class="dos-decisao-col-titulo">Riscos</p>
      <span class="dos-decisao-badge" style="background:rgba(184,134,11,0.1);color:#B8860B;">${riscos.length}</span>
    </div>
    <div class="dos-decisao-col-body">
      ${!riscos.length
        ? `<p class="dos-empty-col">Sem riscos identificados ✓</p>`
        : riscos.map(r => `
          <div class="dos-item-risco">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
              <p class="dos-item-titulo" style="color:#B8860B;">${r.titulo}</p>
              <span class="dos-item-badge" style="background:rgba(184,134,11,0.08);color:#B8860B;flex-shrink:0;">${r.urgencia === 'alta' ? '⚠ Urgente' : 'Atenção'}</span>
            </div>
            <p class="dos-item-mecanismo">${r.descricao}</p>
            <p class="dos-item-acao">→ ${r.acao}</p>
          </div>`).join('')}
    </div>
  </div>`;
}

// ── Coluna de Oportunidades ───────────────────────────────
function renderColOportunidades(ops) {
  return `<div class="dos-decisao-col">
    <div class="dos-decisao-col-header" style="border-bottom:2px solid #2E8B6A;">
      <span style="color:#2E8B6A;">⬤</span>
      <p class="dos-decisao-col-titulo">Oportunidades</p>
      <span class="dos-decisao-badge" style="background:rgba(46,139,106,0.1);color:#2E8B6A;">${ops.length}</span>
    </div>
    <div class="dos-decisao-col-body">
      ${!ops.length
        ? `<p class="dos-empty-col">Aguardando dados suficientes</p>`
        : ops.map(o => `
          <div class="dos-item-op">
            <p class="dos-item-titulo" style="color:#2E8B6A;">✦ ${o.titulo}</p>
            <p class="dos-item-mecanismo">${o.descricao}</p>
            <p class="dos-item-acao" style="color:#2E8B6A;">💡 ${o.impacto}</p>
            <span class="dos-area-tag" style="background:rgba(46,139,106,0.08);color:#2E8B6A;">${o.tipo}</span>
          </div>`).join('')}
    </div>
  </div>`;
}

// ── Perfil Metabólico Detalhado ───────────────────────────
function renderPerfilMetabolicoDetalhado(perfil, comp, evolPeso) {
  const metricas = [];
  if (comp) {
    if (comp.energia !== null)   metricas.push({ label: 'Energia média', val: comp.energia.toFixed(1), max: 5, unidade: '/5' });
    if (comp.sonoHoras !== null) metricas.push({ label: 'Sono médio', val: comp.sonoHoras.toFixed(1), max: 9, unidade: 'h' });
    if (comp.agua !== null)      metricas.push({ label: 'Hidratação', val: comp.agua.toFixed(1), max: 3, unidade: 'L' });
    if (comp.scoreMedio !== null) metricas.push({ label: 'Score médio', val: Math.round(comp.scoreMedio), max: 100, unidade: 'pts' });
  }
  if (evolPeso?.kgPorSemana !== null && evolPeso?.kgPorSemana !== undefined) {
    metricas.push({
      label: 'Ritmo de perda',
      val: (evolPeso.kgPorSemana > 0 ? '+' : '') + evolPeso.kgPorSemana.toFixed(2),
      max: null,
      unidade: 'kg/sem',
    });
  }

  return `<div class="dos-perfil-card" style="border-left:3px solid ${perfil.cor};">
    <p class="dos-perfil-tipo">Perfil Metabólico</p>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
      <span style="font-size:1.6rem;">${perfil.icone}</span>
      <div>
        <p class="dos-perfil-titulo" style="color:${perfil.cor};">${perfil.titulo}</p>
        <p class="dos-perfil-sub">${perfil.subtitulo}</p>
      </div>
    </div>
    <p class="dos-perfil-desc">${perfil.descricao}</p>
    ${metricas.length ? `
    <div class="dos-perfil-metricas">
      ${metricas.map(m => `
        <div class="dos-metrica">
          <p class="dos-metrica-val" style="color:${perfil.cor};">${m.val}<span>${m.unidade}</span></p>
          <p class="dos-metrica-label">${m.label}</p>
        </div>`).join('')}
    </div>` : ''}
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--detail);">
      <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--subtitle);margin:0 0 8px;">Características</p>
      ${perfil.caracteristicas.map(c => `
        <p style="font-family:'DM Sans',sans-serif;font-size:0.73rem;color:var(--text);margin:0 0 5px;display:flex;gap:8px;align-items:flex-start;">
          <span style="color:${perfil.cor};flex-shrink:0;margin-top:1px;">·</span>${c}
        </p>`).join('')}
    </div>
  </div>`;
}

// ── Perfil Comportamental Detalhado ───────────────────────
function renderPerfilComportamentalDetalhado(perfil, comp, adesao, tendAdesao) {
  const tendLabel = { subindo: '↑ Subindo', caindo: '↓ Caindo', estavel: '→ Estável' }[tendAdesao] || '—';
  const tendCor   = { subindo: '#2E8B6A', caindo: '#B33030', estavel: '#B8860B' }[tendAdesao] || 'var(--sub)';

  return `<div class="dos-perfil-card" style="border-left:3px solid ${perfil.cor};">
    <p class="dos-perfil-tipo">Perfil Comportamental</p>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
      <span style="font-size:1.6rem;">${perfil.icone}</span>
      <div>
        <p class="dos-perfil-titulo" style="color:${perfil.cor};">${perfil.titulo}</p>
        <p class="dos-perfil-sub">${perfil.subtitulo}</p>
      </div>
    </div>
    <p class="dos-perfil-desc">${perfil.descricao}</p>

    <div class="dos-perfil-metricas">
      <div class="dos-metrica">
        <p class="dos-metrica-val" style="color:${adesao.pct >= 70 ? '#2E8B6A' : adesao.pct >= 50 ? '#B8860B' : '#B33030'};">${adesao.pct}<span>%</span></p>
        <p class="dos-metrica-label">Adesão 30d</p>
      </div>
      ${comp ? `
      <div class="dos-metrica">
        <p class="dos-metrica-val" style="color:${comp.pctDescontrole < 15 ? '#2E8B6A' : comp.pctDescontrole < 30 ? '#B8860B' : '#B33030'};">${comp.pctDescontrole}<span>%</span></p>
        <p class="dos-metrica-label">Dias c/ descontrole</p>
      </div>
      <div class="dos-metrica">
        <p class="dos-metrica-val" style="color:${comp.pctTreino >= 60 ? '#2E8B6A' : '#B8860B'};">${comp.pctTreino}<span>%</span></p>
        <p class="dos-metrica-label">Dias c/ treino</p>
      </div>` : ''}
      <div class="dos-metrica">
        <p class="dos-metrica-val" style="color:${tendCor};">${tendLabel}</p>
        <p class="dos-metrica-label">Tendência adesão</p>
      </div>
    </div>

    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--detail);">
      <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--subtitle);margin:0 0 8px;">Estratégia recomendada</p>
      <p style="font-family:'DM Sans',sans-serif;font-size:0.76rem;color:var(--text);line-height:1.6;margin:0;border-left:2px solid ${perfil.cor};padding-left:12px;">${perfil.estrategia}</p>
    </div>
  </div>`;
}

// ── Linha do Tempo ────────────────────────────────────────
function renderTimeline(timeline) {
  const temScore = timeline.scoreHist.length >= 3;
  const temPeso  = timeline.pesoHist.length >= 2;
  if (!temScore && !temPeso) return '';

  return `<div class="dos-section-wide">
    <p class="dos-section-sup">Linha do Tempo</p>
    <p class="dos-section-sub">Últimos 90 dias — evolução integrada</p>
    <div style="background:var(--bg-primary);border:1px solid var(--detail);padding:20px;display:grid;grid-template-columns:${temScore && temPeso ? '1fr 1fr' : '1fr'};gap:1px;background:var(--detail);">
      ${temScore ? `<div style="background:var(--bg-primary);padding:16px;">
        <p class="dos-chart-label">Score Metabólico (90d)</p>
        <canvas id="dos-chart-score" height="100"></canvas>
      </div>` : ''}
      ${temPeso ? `<div style="background:var(--bg-primary);padding:16px;">
        <p class="dos-chart-label">Evolução de Peso</p>
        <canvas id="dos-chart-peso" height="100"></canvas>
      </div>` : ''}
    </div>
  </div>`;
}

// ── Estratégia por Fases ──────────────────────────────────
function renderEstrategia(fases, faseAtual) {
  if (!fases.length) {
    return `<div class="dos-section-wide">
      <p class="dos-section-sup">Estratégia de Tratamento</p>
      <div style="padding:24px;background:rgba(184,134,11,0.05);border:1px solid rgba(184,134,11,0.2);text-align:center;">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:#B8860B;margin:0;">Nenhuma fase cadastrada. <a href="javascript:history.back()" style="color:#B8860B;">Definir estratégia de fases →</a></p>
      </div>
    </div>`;
  }

  const STATUS = {
    pendente: { cor: '#9A7D5E', label: 'Pendente' },
    ativa:    { cor: '#2E8B6A', label: 'Em curso' },
    concluida:{ cor: '#B8860B', label: 'Concluída' },
  };

  return `<div class="dos-section-wide">
    <p class="dos-section-sup">Estratégia Clínica por Fases</p>
    <p class="dos-section-sub">Protocolo personalizado de ${fases.reduce((s,f) => s + (f.duracao_semanas||0), 0)} semanas</p>
    <div class="dos-fases-track">
      ${fases.map((f, i) => {
        const st = STATUS[f.status] || STATUS.pendente;
        const ativa = f.status === 'ativa';
        return `<div class="dos-fase-item ${ativa ? 'dos-fase-ativa' : ''}">
          <div class="dos-fase-num" style="border-color:${st.cor};${ativa ? 'background:' + st.cor + ';color:var(--bg-primary);' : ''}">
            ${f.status === 'concluida' ? '✓' : i + 1}
          </div>
          <div class="dos-fase-body" style="${ativa ? 'border-left:3px solid ' + st.cor + ';' : ''}">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
              <p class="dos-fase-nome">${f.nome}</p>
              <span class="dos-fase-status" style="color:${st.cor};background:${st.cor}18;">${st.label}</span>
              ${f.duracao_semanas ? `<span class="dos-fase-dur">${f.duracao_semanas} semanas</span>` : ''}
              ${f.calorias_alvo ? `<span class="dos-fase-dur">${f.calorias_alvo} kcal</span>` : ''}
            </div>
            ${f.objetivo || f.objetivo_clinico ? `<p class="dos-fase-obj">${f.objetivo_clinico || f.objetivo}</p>` : ''}
            ${f.descricao ? `<p class="dos-fase-desc">${f.descricao}</p>` : ''}
            ${f.meta_peso_diff ? `<p class="dos-fase-meta">Meta: ${f.meta_peso_diff > 0 ? '+' : ''}${f.meta_peso_diff} kg</p>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ── Recomendações Clínicas ────────────────────────────────
function renderRecomendacoes(gargalos, riscos, ops, sugestoes) {
  const urgentes = riscos.filter(r => r.urgencia === 'alta');

  // Compila todas ações em ordem de prioridade
  const acoes = [
    ...urgentes.map(r => ({ prioridade: 1, texto: r.acao, contexto: r.titulo, cor: '#B33030' })),
    ...gargalos.filter(g => g.impacto === 'alto').map(g => ({
      prioridade: 2, texto: `Corrigir: ${g.titulo}`, contexto: g.evidencia, cor: '#B33030'
    })),
    ...ops.slice(0, 3).map(o => ({
      prioridade: 3, texto: `Capitalizar: ${o.titulo}`, contexto: o.impacto, cor: '#2E8B6A'
    })),
    ...(sugestoes || []).slice(0, 3).map(s => ({
      prioridade: 4, texto: s.acao, contexto: s.titulo, cor: '#6D5ACF'
    })),
  ];

  if (!acoes.length) return '';

  return `<div class="dos-section-wide">
    <p class="dos-section-sup">Recomendações Clínicas Prioritárias</p>
    <p class="dos-section-sub">Geradas automaticamente com base na análise integrada</p>
    <div class="dos-rec-grid">
      ${acoes.slice(0, 6).map((a, i) => `
        <div class="dos-rec-card">
          <div class="dos-rec-num" style="color:${a.cor};border-color:${a.cor}20;">${String(i+1).padStart(2,'0')}</div>
          <div>
            <p class="dos-rec-texto">${a.texto}</p>
            <p class="dos-rec-contexto">${a.contexto}</p>
          </div>
        </div>`).join('')}
    </div>
  </div>`;
}

// ── Gráficos de Evolução ──────────────────────────────────
function renderGraficosTimeline(timeline) {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.font.weight = '300';
  Chart.defaults.color = '#9A7D5E';

  const opts = (yLabel) => ({
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: 'rgba(201,168,130,0.15)' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 8 } }
    }
  });

  // Score 90d
  const scoreEl = document.getElementById('dos-chart-score');
  if (scoreEl && timeline.scoreHist.length >= 3) {
    new Chart(scoreEl, {
      type: 'line',
      data: {
        labels: timeline.scoreHist.map(h =>
          new Date(h.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        ),
        datasets: [{
          data: timeline.scoreHist.map(h => h.score),
          borderColor: '#C9A882', backgroundColor: 'rgba(201,168,130,0.08)',
          borderWidth: 2, pointRadius: 3, tension: 0.4, fill: true,
        }]
      },
      options: { ...opts('Score'), scales: { ...opts().scales, y: { ...opts().scales?.y, min: 0, max: 100 } } }
    });
  }

  // Peso
  const pesoEl = document.getElementById('dos-chart-peso');
  if (pesoEl && timeline.pesoHist.length >= 2) {
    new Chart(pesoEl, {
      type: 'line',
      data: {
        labels: timeline.pesoHist.map(h =>
          new Date(h.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        ),
        datasets: [{
          data: timeline.pesoHist.map(h => h.peso),
          borderColor: '#9A7D5E', backgroundColor: 'rgba(154,125,94,0.07)',
          borderWidth: 2, pointRadius: 5, pointBackgroundColor: '#9A7D5E', tension: 0.3, fill: true,
        }]
      },
      options: opts('kg'),
    });
  }
}

// ============================================================
// PONTO DE ENTRADA
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !isAdminUser(session.user)) {
    window.location.href = 'index.html';
    return;
  }

  const params      = new URLSearchParams(window.location.search);
  const patientId   = params.get('patient');
  const patientNome = decodeURIComponent(params.get('nome') || 'Paciente');

  if (!patientId) {
    document.getElementById('dos-mount').innerHTML =
      '<p style="padding:40px;text-align:center;color:var(--sub);font-family:\'DM Sans\',sans-serif;">Paciente não especificado.</p>';
    return;
  }

  document.getElementById('dos-nome-sidebar').textContent = patientNome.split(' ')[0];
  document.title = `Dossiê — ${patientNome}`;

  try {
    const dados   = await coletarDadosDossie(patientId);
    const analise = analisarIntelligence(dados);
    renderDossie(dados, analise, 'dos-mount');

    // Botão imprimir
    document.getElementById('btn-imprimir-dos')?.addEventListener('click', () => window.print());

    // Link check-ins
    const btnCi = document.getElementById('btn-checkins-dos');
    if (btnCi) btnCi.href = `admin-checkins.html?patient=${patientId}&nome=${encodeURIComponent(patientNome)}`;

    // Link relatório
    const btnRel = document.getElementById('btn-relatorio-dos');
    if (btnRel) btnRel.href = `admin-relatorio.html?patient=${patientId}&nome=${encodeURIComponent(patientNome)}`;

  } catch (err) {
    console.error('[Dossiê] Erro:', err);
    document.getElementById('dos-mount').innerHTML =
      `<p style="padding:40px;text-align:center;color:#B33030;font-family:'DM Sans',sans-serif;">Erro ao gerar dossiê: ${err.message}</p>`;
  }
});
