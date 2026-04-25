// ============================================================
// score-metabolico.js — Motor de Inteligência Metabólica
// ERG 360 — Score · Padrões · Sugestões · Simulador
// ============================================================

// ─────────────────────────────────────────────────────────────
// 1. SCORE SEMANAL (0-100)
//    Usa score_diario já salvo no banco, com peso maior
//    para os dias mais recentes (regressão linear + média ponderada)
// ─────────────────────────────────────────────────────────────
export function calcularScoreSemanal(checkins) {
  // checkins: array ordenado ASC (mais antigo primeiro)
  const comScore = checkins.filter(c => c.score_diario !== null && c.score_diario !== undefined);
  if (!comScore.length) return null;

  // Média ponderada: peso cresce com a posição (mais recente = maior)
  const total = comScore.length;
  let soma = 0, pesos = 0;
  comScore.forEach((c, i) => {
    const w = 1 + (i / total);           // 1.0 … 2.0
    soma   += c.score_diario * w;
    pesos  += w;
  });
  const score = Math.round(soma / pesos);

  // Tendência: regressão linear simples nos score_diario
  const tendencia = calcularTendencia(comScore.map(c => c.score_diario));

  // Componentes médios para exibição
  const avg = field => {
    const vals = comScore.map(c => c[field]).filter(v => v !== null && v !== undefined);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  return {
    score,
    tendencia,
    n: comScore.length,
    componentes: {
      sono_horas:      avg('sono_horas'),
      sono_qualidade:  avg('sono_qualidade'),
      fome_nivel:      avg('fome_nivel'),
      energia:         avg('energia'),
      humor:           avg('humor'),
      agua_litros:     avg('agua_litros'),
      pct_treino:      comScore.filter(c => c.treinou).length / comScore.length * 100,
      pct_evacuacao:   comScore.filter(c => c.evacuou).length / comScore.length * 100,
    },
    historico: comScore.map(c => ({ data: c.data, score: c.score_diario }))
  };
}

// Regressão linear → tendência
function calcularTendencia(scores) {
  const n = scores.length;
  if (n < 3) return { tipo: 'insuficiente', slope: 0, delta: 0 };

  const xMean = (n - 1) / 2;
  const yMean = scores.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  scores.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  const slope = den !== 0 ? num / den : 0;
  const delta = Math.round(slope * n);   // pontos totais ganhos/perdidos

  if (slope > 1.2)  return { tipo: 'melhorando',  slope, delta, label: `↑ +${delta} pts`,  cor: '#2E8B6A' };
  if (slope < -1.2) return { tipo: 'piorando',    slope, delta, label: `↓ ${delta} pts`,   cor: '#B33030' };
  return              { tipo: 'estagnado',  slope, delta: 0, label: '→ Estável',         cor: '#B07A1A' };
}

// ─────────────────────────────────────────────────────────────
// 2. DETECÇÃO DE PADRÕES CLÍNICOS
// ─────────────────────────────────────────────────────────────
export function detectarPadroes(checkins) {
  const n = checkins.length;
  if (n === 0) return { problemas: [], alertas: [], positivos: [] };

  const pct = (fn)       => checkins.filter(fn).length / n;
  const avg = (field)    => {
    const v = checkins.map(c => c[field]).filter(x => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  // ── Métricas base ──
  const fomeMed    = avg('fome_nivel');
  const energiaMed = avg('energia');
  const sonoHoras  = avg('sono_horas');
  const sonoQual   = avg('sono_qualidade');
  const aguaMed    = avg('agua_litros');
  const scoreMed   = avg('score_diario');

  const pctFomeAlta      = pct(c => c.fome_nivel >= 4);
  const pctSonoRuim      = pct(c => c.sono_qualidade <= 2);
  const pctSonoCurto     = pct(c => c.sono_horas < 6.5);
  const pctEnergBaixa    = pct(c => c.energia <= 2);
  const pctDescontrole   = pct(c => ['moderado', 'forte'].includes(c.descontrole));
  const pctHidBaixa      = pct(c => c.agua_litros < 1.5);
  const pctBristolAlter  = pct(c => c.evacuacao_bristol && (c.evacuacao_bristol < 3 || c.evacuacao_bristol > 5));
  const pctTreino        = pct(c => c.treinou);
  const pctFadigaAlta    = pct(c => c.treinou && c.treino_fadiga >= 4);

  const problemas  = [];
  const alertas    = [];
  const positivos  = [];

  // ── PROBLEMAS (alta severidade) ──────────────────────────
  if (pctFomeAlta > 0.6 && pctDescontrole > 0.25) {
    problemas.push({
      id: 'dieta_restritiva',
      titulo: 'Dieta restritiva demais',
      descricao: `Fome elevada em ${Math.round(pctFomeAlta*100)}% dos dias com episódios de descontrole em ${Math.round(pctDescontrole*100)}%. Deficit calórico provável excessivo.`,
      icone: '🍽️',
      sugestoes: ['aumentar_calorias', 'redistribuir_proteina'],
    });
  }

  if (pctSonoRuim > 0.5 && scoreMed < 55) {
    problemas.push({
      id: 'sono_critico',
      titulo: 'Privação de sono impactando resultados',
      descricao: `Qualidade de sono ruim em ${Math.round(pctSonoRuim*100)}% dos dias. Score médio baixo (${Math.round(scoreMed || 0)}). Sono ruim eleva cortisol, prejudica composição corporal e aderência.`,
      icone: '🌙',
      sugestoes: ['higiene_sono', 'ajustar_horarios'],
    });
  }

  if (pctDescontrole > 0.4) {
    problemas.push({
      id: 'compulsao_recorrente',
      titulo: 'Compulsão alimentar recorrente',
      descricao: `Episódios de descontrole em ${Math.round(pctDescontrole*100)}% dos dias. Padrão de compulsão interfere na adesão e nos resultados.`,
      icone: '⚠️',
      sugestoes: ['fracionar_refeicoes', 'aumentar_calorias', 'ajustar_horarios'],
    });
  }

  if (pctTreino > 0.8 && pctFadigaAlta > 0.5 && pctEnergBaixa > 0.3) {
    problemas.push({
      id: 'overtraining',
      titulo: 'Sobretreinamento / recuperação insuficiente',
      descricao: `Treino em ${Math.round(pctTreino*100)}% dos dias com fadiga elevada em ${Math.round(pctFadigaAlta*100)}%. Energia cronicamente baixa (${energiaMed?.toFixed(1)}/5). Risco de catabolismo e lesões.`,
      icone: '💪',
      sugestoes: ['aumentar_calorias', 'redistribuir_proteina', 'dia_descanso'],
    });
  }

  // ── ALERTAS (severidade média) ───────────────────────────
  if (pctFomeAlta > 0.4 && pctDescontrole <= 0.25) {
    alertas.push({
      id: 'fome_moderada',
      titulo: 'Fome elevada frequente',
      descricao: `Fome ≥4 em ${Math.round(pctFomeAlta*100)}% dos dias. Considere aumentar fibras, proteína e volume alimentar.`,
      icone: '🟡',
      sugestoes: ['redistribuir_proteina', 'aumentar_fibras'],
    });
  }

  if ((pctSonoCurto > 0.4 || pctSonoRuim > 0.35) && scoreMed >= 55) {
    alertas.push({
      id: 'sono_insuficiente',
      titulo: 'Sono insuficiente ou irregular',
      descricao: `Sono curto (<6.5h) em ${Math.round(pctSonoCurto*100)}% dos dias. Pode prejudicar progressão dos resultados.`,
      icone: '🟡',
      sugestoes: ['higiene_sono'],
    });
  }

  if (pctBristolAlter > 0.45) {
    alertas.push({
      id: 'intestino_alterado',
      titulo: 'Trânsito intestinal alterado',
      descricao: `Consistência das fezes fora do ideal em ${Math.round(pctBristolAlter*100)}% dos dias. Pode indicar ingestão baixa de fibras ou água.`,
      icone: '🟡',
      sugestoes: ['aumentar_fibras', 'aumentar_agua'],
    });
  }

  if (pctHidBaixa > 0.5) {
    alertas.push({
      id: 'hidratacao_baixa',
      titulo: 'Hidratação cronicamente baixa',
      descricao: `Ingestão hídrica < 1,5L em ${Math.round(pctHidBaixa*100)}% dos dias (média: ${aguaMed?.toFixed(1) || '—'}L/dia).`,
      icone: '💧',
      sugestoes: ['aumentar_agua'],
    });
  }

  if (pctEnergBaixa > 0.3 && pctTreino < 0.5) {
    alertas.push({
      id: 'energia_baixa',
      titulo: 'Energia cronicamente baixa',
      descricao: `Energia ≤2 em ${Math.round(pctEnergBaixa*100)}% dos dias sem volume alto de treino. Pode indicar déficit calórico ou micronutrientes.`,
      icone: '🟡',
      sugestoes: ['aumentar_calorias', 'redistribuir_proteina'],
    });
  }

  // ── POSITIVOS ────────────────────────────────────────────
  const tendencia = calcularTendencia(
    checkins.filter(c => c.score_diario != null).map(c => c.score_diario)
  );

  if (tendencia.tipo === 'melhorando') {
    positivos.push({ titulo: 'Tendência de melhora', descricao: `Score subindo +${Math.abs(tendencia.delta)} pts no período.`, icone: '📈' });
  }
  if (pctFomeAlta < 0.2 && fomeMed !== null) {
    positivos.push({ titulo: 'Fome bem controlada', descricao: `Fome elevada em apenas ${Math.round(pctFomeAlta*100)}% dos dias. Excelente sinal de adequação calórica.`, icone: '✅' });
  }
  if (sonoHoras !== null && sonoHoras >= 7) {
    positivos.push({ titulo: 'Sono adequado', descricao: `Média de ${sonoHoras.toFixed(1)}h de sono — dentro do recomendado.`, icone: '✅' });
  }
  if (pctHidBaixa < 0.2 && aguaMed !== null) {
    positivos.push({ titulo: 'Boa hidratação', descricao: `Média de ${aguaMed.toFixed(1)}L/dia — hidratação dentro do alvo.`, icone: '💧' });
  }
  if (pctTreino > 0.6 && pctFadigaAlta < 0.3) {
    positivos.push({ titulo: 'Rotina de exercícios consistente', descricao: `Treinou em ${Math.round(pctTreino*100)}% dos dias com boa recuperação.`, icone: '🏋️' });
  }
  if (pctDescontrole < 0.1) {
    positivos.push({ titulo: 'Alta adesão alimentar', descricao: 'Poucos episódios de descontrole. Adesão ao plano excelente.', icone: '⭐' });
  }

  return { problemas, alertas, positivos };
}

// ─────────────────────────────────────────────────────────────
// 3. BANCO DE SUGESTÕES AUTOMÁTICAS
// ─────────────────────────────────────────────────────────────
const SUGESTOES_DB = {
  aumentar_calorias: {
    titulo: 'Aumentar aporte calórico (+10%)',
    acao:   'Acrescentar 150–200 kcal/dia distribuídas no lanche da manhã e ceia',
    impacto: 'Reduz fome, melhora energia e previne compulsão noturna',
    urgencia: 'alta',
    cor: '#C0632A',
    icone: '📊',
  },
  redistribuir_proteina: {
    titulo: 'Aumentar proteína nas refeições principais',
    acao:   'Garantir 30–40g de proteína no almoço e jantar para aumentar saciedade',
    impacto: 'Reduz fome entre refeições e preserva massa muscular',
    urgencia: 'media',
    cor: '#6D5ACF',
    icone: '🥩',
  },
  aumentar_fibras: {
    titulo: 'Aumentar fibras alimentares (+10g/dia)',
    acao:   'Incluir aveia, chia ou leguminosas diariamente',
    impacto: 'Melhora trânsito intestinal, saciedade e controle glicêmico',
    urgencia: 'media',
    cor: '#2E8B6A',
    icone: '🥦',
  },
  aumentar_agua: {
    titulo: 'Aumentar ingestão hídrica (+500ml/dia)',
    acao:   'Definir meta de 2–2,5L/dia com lembretes programados',
    impacto: 'Melhora funcionamento intestinal, energia e concentração',
    urgencia: 'media',
    cor: '#3A5E8B',
    icone: '💧',
  },
  higiene_sono: {
    titulo: 'Protocolo de higiene do sono',
    acao:   'Horário fixo de dormir/acordar, sem telas 1h antes, quarto escuro e fresco',
    impacto: 'Melhora cortisol, ghrelina, leptina — impacto direto em fome e composição corporal',
    urgencia: 'alta',
    cor: '#4A6B9B',
    icone: '🌙',
  },
  ajustar_horarios: {
    titulo: 'Reorganizar horários das refeições',
    acao:   'Distribuir 5–6 refeições em intervalos de 3h, sem passar 4h em jejum',
    impacto: 'Estabiliza glicemia, reduz fome noturna e compulsão',
    urgencia: 'alta',
    cor: '#B07A1A',
    icone: '⏰',
  },
  fracionar_refeicoes: {
    titulo: 'Aumentar fracionamento alimentar',
    acao:   'Garantir lanche da manhã e ceia leve para evitar chegada com muita fome às refeições principais',
    impacto: 'Reduz compulsão e melhora controle das porções',
    urgencia: 'alta',
    cor: '#B07A1A',
    icone: '🍱',
  },
  dia_descanso: {
    titulo: 'Inserir dias de descanso ativos',
    acao:   'Reduzir para 4–5 treinos/semana com 2–3 dias de descanso ativo (caminhada, alongamento)',
    impacto: 'Reduz fadiga acumulada, melhora recuperação e previne overtraining',
    urgencia: 'alta',
    cor: '#9B3C8E',
    icone: '🧘',
  },
  reduzir_calorias: {
    titulo: 'Ajustar déficit calórico (-5%)',
    acao:   'Reduzir 100–150 kcal/dia mantendo proteína alta para preservar massa magra',
    impacto: 'Retoma perda de peso sem sacrificar composição corporal',
    urgencia: 'baixa',
    cor: '#2E8B6A',
    icone: '⚖️',
  },
};

export function gerarSugestoes(padroes) {
  const slugsUsados = new Set();
  const sugestoes   = [];

  const adicionar = (slug, origemId) => {
    if (slugsUsados.has(slug)) return;
    const s = SUGESTOES_DB[slug];
    if (s) {
      slugsUsados.add(slug);
      sugestoes.push({ ...s, slug, origem: origemId });
    }
  };

  // Prioridade: problemas primeiro, depois alertas
  for (const p of padroes.problemas) {
    (p.sugestoes || []).forEach(s => adicionar(s, p.id));
  }
  for (const a of padroes.alertas) {
    (a.sugestoes || []).forEach(s => adicionar(s, a.id));
  }

  // Ordenação: alta > media > baixa
  const ord = { alta: 0, media: 1, baixa: 2 };
  sugestoes.sort((a, b) => (ord[a.urgencia] || 1) - (ord[b.urgencia] || 1));

  return sugestoes;
}

// ─────────────────────────────────────────────────────────────
// 4. SIMULADOR DE RESULTADO
// ─────────────────────────────────────────────────────────────
export function simularResultado({ pesoAtual, pesoMeta, kcalPlano, tmb, fatorAtividade, adesaoPct, semanas }) {
  // GET is: total energy expenditure = TMB × fator
  const get = (tmb || 1500) * (fatorAtividade || 1.3);

  // Déficit real considerando adesão
  const deficitDiario  = (get - (kcalPlano || get * 0.85)) * ((adesaoPct || 80) / 100);
  const kgPorSemana    = (deficitDiario * 7) / 7700; // 1kg gordura = ~7700 kcal

  // Projeta semana a semana
  const projecao = [];
  for (let s = 0; s <= Math.min(semanas, 52); s++) {
    const pesoEst = Math.max(
      pesoAtual - kgPorSemana * s,
      pesoMeta ?? 40   // não vai abaixo do meta
    );
    projecao.push({
      semana:      s,
      peso:        +pesoEst.toFixed(1),
      perdaTotal:  +(pesoAtual - pesoEst).toFixed(1),
    });
  }

  // Semanas até a meta
  const pesoAlvo    = pesoMeta ?? (pesoAtual * 0.9);
  const semanasAlvo = kgPorSemana > 0
    ? Math.ceil((pesoAtual - pesoAlvo) / kgPorSemana)
    : null;

  // Data estimada de chegada na meta
  const dataAlvo = semanasAlvo
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() + semanasAlvo * 7);
        return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      })()
    : null;

  // Avaliação de risco
  let risco, riscoLabel, riscoCor;
  const deficitSemanal = deficitDiario * 7;
  const kgSemBruto     = deficitSemanal / 7700;

  if (kgSemBruto > 1.2 || (adesaoPct || 80) < 50) {
    risco = 'alto';   riscoLabel = 'Alto — déficit muito agressivo';  riscoCor = '#B33030';
  } else if (kgSemBruto > 0.75 || (adesaoPct || 80) < 70) {
    risco = 'medio';  riscoLabel = 'Moderado — dentro do aceitável';  riscoCor = '#B07A1A';
  } else {
    risco = 'baixo';  riscoLabel = 'Baixo — ritmo sustentável';       riscoCor = '#2E8B6A';
  }

  return {
    projecao,
    kgPorSemana:  +kgPorSemana.toFixed(2),
    deficitDiario: +deficitDiario.toFixed(0),
    semanasAlvo,
    dataAlvo,
    pesoFinalSim: projecao[semanas]?.peso ?? pesoAtual,
    risco, riscoLabel, riscoCor,
  };
}

// Calcula adesão média a partir do histórico de check-ins
export function calcularAdesao(checkins) {
  const n = checkins.length;
  if (!n) return 75; // default
  // Proxy de adesão: (1 - taxa de descontrole) × frequência de check-in
  const descontroleDias = checkins.filter(c => ['moderado','forte'].includes(c.descontrole)).length;
  const adesaoBase = (1 - descontroleDias / n) * 100;
  return Math.round(Math.min(Math.max(adesaoBase, 20), 100));
}

// ─────────────────────────────────────────────────────────────
// 5. RENDERIZAÇÃO COMPLETA
// ─────────────────────────────────────────────────────────────
export function renderScoreMetabolico(checkins, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Dados processados
  const scoreData = calcularScoreSemanal(checkins);
  const padroes   = detectarPadroes(checkins);
  const sugestoes = gerarSugestoes(padroes);
  const adesao    = calcularAdesao(checkins);

  if (!scoreData) {
    container.innerHTML = `
      <div style="padding:32px;text-align:center;color:var(--sub);font-family:'DM Sans',sans-serif;font-size:0.8rem;">
        Dados insuficientes para calcular o score. Mínimo de 3 check-ins necessário.
      </div>`;
    return;
  }

  const { score, tendencia, componentes, historico } = scoreData;

  // Cor do score
  const scoreCor = score >= 70 ? '#2E8B6A' : score >= 50 ? '#B07A1A' : '#B33030';
  const scoreLbl = score >= 70 ? 'Excelente' : score >= 55 ? 'Bom' : score >= 40 ? 'Atenção' : 'Crítico';

  // Gauge SVG (semi-círculo, 251px = comprimento total do arco)
  const arcFill = Math.round(score * 2.51);
  const gauge = `
    <svg viewBox="0 0 200 110" width="200" height="110">
      <path d="M 20 100 A 80 80 0 0 1 180 100"
        stroke="#EDE5DC" stroke-width="14" fill="none" stroke-linecap="round"/>
      <path d="M 20 100 A 80 80 0 0 1 180 100"
        stroke="${scoreCor}" stroke-width="14" fill="none" stroke-linecap="round"
        stroke-dasharray="${arcFill} 999"
        style="transition:stroke-dasharray 0.8s ease"/>
      <text x="100" y="92" text-anchor="middle"
        style="font-family:'DM Serif Display',serif;font-size:36px;fill:${scoreCor};font-weight:400">${score}</text>
      <text x="100" y="108" text-anchor="middle"
        style="font-family:'DM Sans',sans-serif;font-size:11px;fill:#9A7D5E;letter-spacing:2px;text-transform:uppercase">${scoreLbl}</text>
    </svg>`;

  // Componente: barra mini
  const barComp = (label, val, max, ideal, unit = '') => {
    if (val === null || val === undefined) return '';
    const pct = Math.min((val / max) * 100, 100);
    const isGood = ideal ? val >= ideal : pct >= 60;
    const cor = isGood ? '#2E8B6A' : pct >= 40 ? '#B07A1A' : '#B33030';
    return `
      <div class="smet-comp-row">
        <span class="smet-comp-label">${label}</span>
        <div class="smet-comp-bar-bg">
          <div class="smet-comp-bar-fill" style="width:${pct}%;background:${cor}"></div>
        </div>
        <span class="smet-comp-val">${typeof val === 'number' ? val.toFixed(1) : val}${unit}</span>
      </div>`;
  };

  const compHtml = [
    barComp('Sono', componentes.sono_horas, 9, 7, 'h'),
    barComp('Energia', componentes.energia, 5, 4, '/5'),
    barComp('Humor', componentes.humor, 5, 4, '/5'),
    barComp('Água', componentes.agua_litros, 3, 2, 'L'),
    componentes.pct_treino !== null ? `
      <div class="smet-comp-row">
        <span class="smet-comp-label">Treinos</span>
        <div class="smet-comp-bar-bg">
          <div class="smet-comp-bar-fill" style="width:${componentes.pct_treino}%;background:${componentes.pct_treino >= 60 ? '#2E8B6A' : '#B07A1A'}"></div>
        </div>
        <span class="smet-comp-val">${Math.round(componentes.pct_treino)}%</span>
      </div>` : '',
  ].join('');

  // Padrões
  const renderPadraoCard = (p, tipo) => {
    const corBg = tipo === 'problema' ? '#fdf0f0' : tipo === 'alerta' ? '#fdf7e8' : '#edf7f3';
    const corBd = tipo === 'problema' ? '#B33030' : tipo === 'alerta' ? '#B07A1A' : '#2E8B6A';
    return `
      <div class="smet-padrao-card" style="border-left:3px solid ${corBd};background:${corBg}">
        <span class="smet-padrao-icone">${p.icone}</span>
        <div>
          <p class="smet-padrao-titulo">${p.titulo}</p>
          <p class="smet-padrao-desc">${p.descricao}</p>
        </div>
      </div>`;
  };

  const padroesHtml = [
    ...padroes.problemas.map(p => renderPadraoCard(p, 'problema')),
    ...padroes.alertas.map(a => renderPadraoCard(a, 'alerta')),
    ...padroes.positivos.map(p => renderPadraoCard(p, 'positivo')),
  ].join('') || `<p style="color:var(--sub);font-family:'DM Sans',sans-serif;font-size:0.78rem;padding:12px 0">Sem padrões identificados no período.</p>`;

  // Interpretação automática
  const interpretacao = gerarInterpretacao(padroes, scoreData);

  // Sugestões
  const sugestoesHtml = sugestoes.length ? sugestoes.map(s => `
    <div class="smet-sug-card" style="border-top:3px solid ${s.cor}">
      <div class="smet-sug-header">
        <span class="smet-sug-icone">${s.icone}</span>
        <div>
          <p class="smet-sug-titulo">${s.titulo}</p>
          <span class="smet-sug-badge" style="background:${s.cor}20;color:${s.cor}">
            ${s.urgencia === 'alta' ? 'Prioritário' : s.urgencia === 'media' ? 'Recomendado' : 'Sugerido'}
          </span>
        </div>
      </div>
      <p class="smet-sug-acao"><strong>Ação:</strong> ${s.acao}</p>
      <p class="smet-sug-impacto">💡 ${s.impacto}</p>
    </div>
  `).join('') : `<p style="color:var(--sub);font-family:'DM Sans',sans-serif;font-size:0.78rem;">Nenhuma sugestão de ajuste neste momento. Plano adequado para o perfil atual.</p>`;

  container.innerHTML = `
    <div class="smet-container">

      <!-- ── Cabeçalho ── -->
      <div class="smet-header">
        <div>
          <p class="smet-header-sup">Análise do Período · ${scoreData.n} check-ins</p>
          <h2 class="smet-header-titulo">Score Metabólico Inteligente</h2>
        </div>
        <div class="smet-badge-tend" style="background:${tendencia.cor}20;color:${tendencia.cor};border:1px solid ${tendencia.cor}40">
          ${tendencia.label}
        </div>
      </div>

      <!-- ── Linha 1: Gauge + Componentes + Padrões ── -->
      <div class="smet-row-top">

        <!-- Gauge -->
        <div class="smet-gauge-box">
          ${gauge}
          <p class="smet-gauge-period">${scoreData.n} dias analisados</p>
          <p class="smet-gauge-sub">Score 0–100 baseado em sono, fome, energia, intestino e hidratação</p>
        </div>

        <!-- Componentes -->
        <div class="smet-comps-box">
          <p class="smet-section-label">Componentes</p>
          ${compHtml}
        </div>

        <!-- Padrões rápidos -->
        <div class="smet-padroes-mini">
          <p class="smet-section-label">Padrões detectados</p>
          ${[...padroes.problemas, ...padroes.alertas].slice(0, 3).map(p => `
            <div class="smet-padrao-mini-item">
              ${p.icone} <span>${p.titulo}</span>
            </div>`).join('') || '<p class="smet-ok-label">✅ Sem problemas identificados</p>'}
        </div>
      </div>

      <!-- ── Evolução do Score (chart) ── -->
      <div class="smet-chart-box">
        <p class="smet-section-label">Evolução diária do score</p>
        <canvas id="smet-chart-score" height="70"></canvas>
      </div>

      <!-- ── Interpretação clínica ── -->
      ${interpretacao ? `
      <div class="smet-interpretacao-box">
        <div class="smet-interp-icon">🧠</div>
        <div>
          <p class="smet-interp-label">Interpretação do Sistema</p>
          <p class="smet-interp-text">${interpretacao}</p>
        </div>
      </div>` : ''}

      <!-- ── Padrões detalhados ── -->
      <div class="smet-section">
        <p class="smet-section-label">Análise de Padrões</p>
        <div class="smet-padroes-grid">
          ${padroesHtml}
        </div>
      </div>

      <!-- ── Sugestões automáticas ── -->
      <div class="smet-section">
        <p class="smet-section-label">Sugestões de Ajuste Automático</p>
        <div class="smet-sug-grid">
          ${sugestoesHtml}
        </div>
      </div>

      <!-- ── Simulador de Resultado ── -->
      <div class="smet-section smet-simulador-section">
        <p class="smet-section-label">Simulador de Resultado</p>
        <div class="smet-sim-layout">
          <div class="smet-sim-form">
            <div class="smet-sim-field">
              <label>Peso atual (kg)</label>
              <input type="number" id="sim-peso-atual" placeholder="Ex: 72.0" step="0.1">
            </div>
            <div class="smet-sim-field">
              <label>Peso meta (kg)</label>
              <input type="number" id="sim-peso-meta" placeholder="Ex: 62.0" step="0.1">
            </div>
            <div class="smet-sim-field">
              <label>Kcal do plano/dia</label>
              <input type="number" id="sim-kcal-plano" placeholder="Ex: 1600" step="50">
            </div>
            <div class="smet-sim-field">
              <label>TMB × fator atividade (GET)</label>
              <input type="number" id="sim-get" placeholder="Ex: 2000" step="50">
              <span class="smet-sim-hint">Gasto energético total estimado</span>
            </div>
            <div class="smet-sim-field">
              <label>Adesão média estimada (%)</label>
              <input type="number" id="sim-adesao" value="${adesao}" min="20" max="100">
              <span class="smet-sim-hint">Calculada: ${adesao}% com base no histórico</span>
            </div>
            <div class="smet-sim-field">
              <label>Projeção (semanas)</label>
              <input type="number" id="sim-semanas" value="12" min="4" max="52">
            </div>
            <button class="smet-sim-btn" onclick="executarSimulacao()">
              Simular resultado →
            </button>
          </div>
          <div class="smet-sim-result" id="smet-sim-result" style="display:none;">
            <div id="smet-sim-metrics" class="smet-sim-metrics"></div>
            <canvas id="smet-chart-sim" height="180"></canvas>
          </div>
        </div>
      </div>

    </div>`;

  // Renderiza gráfico de score
  renderGraficoScore(historico);
}

// ─── Interpretação textual automática ─────────────────────────
function gerarInterpretacao(padroes, scoreData) {
  const { score, tendencia, componentes } = scoreData;
  const { problemas, alertas, positivos } = padroes;

  if (problemas.length === 0 && alertas.length === 0 && score >= 70) {
    return `Score de ${score}/100 com tendência ${tendencia.tipo}. A paciente apresenta bom controle de sono, fome e energia. Manter plano atual e avaliar progressão nas métricas objetivas.`;
  }

  const parts = [];

  if (problemas.some(p => p.id === 'dieta_restritiva')) {
    parts.push(`Score ${score}/100 com padrão de fome elevada e descontrole — plano provavelmente muito restritivo.`);
    parts.push(`Aumentar 10–15% das calorias totais pode melhorar adesão e resultado final.`);
  } else if (problemas.some(p => p.id === 'sono_critico')) {
    parts.push(`Score ${score}/100 comprometido principalmente por qualidade de sono ruim.`);
    parts.push(`O sono afeta diretamente cortisol, grelina e leptina — impacto direto no peso e na fome.`);
  } else if (problemas.some(p => p.id === 'overtraining')) {
    parts.push(`Energia baixa com treino excessivo sugere overtraining.`);
    parts.push(`Reduzir volume de treino e aumentar recuperação é prioritário antes de qualquer ajuste calórico.`);
  } else if (alertas.length > 0) {
    parts.push(`Score ${score}/100 com ${alertas.length} ponto${alertas.length > 1 ? 's' : ''} de atenção.`);
    parts.push(tendencia.tipo === 'melhorando'
      ? `Tendência positiva — ajustes pontuais podem acelerar os resultados.`
      : `Ajustes preventivos recomendados para evitar estagnação.`);
  }

  if (tendencia.tipo === 'piorando') {
    parts.push(`⚠ Tendência de piora — revisar plano com urgência.`);
  }

  return parts.join(' ') || null;
}

// ─── Gráfico de evolução do score ─────────────────────────────
let chartScore = null;
let chartSim   = null;

function renderGraficoScore(historico) {
  const ctx = document.getElementById('smet-chart-score');
  if (!ctx || !historico.length) return;

  if (chartScore) { chartScore.destroy(); chartScore = null; }

  const labels = historico.map(h => {
    const d = new Date(h.data + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  });
  const data = historico.map(h => h.score);

  chartScore = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Score diário',
        data,
        borderColor: '#C9A882',
        backgroundColor: 'rgba(201,168,130,0.08)',
        borderWidth: 2,
        pointRadius: 5,
        pointBackgroundColor: data.map(s => s >= 70 ? '#2E8B6A' : s >= 50 ? '#B07A1A' : '#B33030'),
        tension: 0.35,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `Score: ${ctx.parsed.y}/100`,
          }
        }
      },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { stepSize: 25 },
          grid: { color: 'rgba(201,168,130,0.12)' },
          border: { display: false },
        },
        x: { grid: { display: false } }
      }
    }
  });
}

// ─── Executa simulação interativa ─────────────────────────────
window.executarSimulacao = function() {
  const pesoAtual    = parseFloat(document.getElementById('sim-peso-atual')?.value);
  const pesoMeta     = parseFloat(document.getElementById('sim-peso-meta')?.value);
  const kcalPlano    = parseFloat(document.getElementById('sim-kcal-plano')?.value);
  const get          = parseFloat(document.getElementById('sim-get')?.value);
  const adesaoPct    = parseFloat(document.getElementById('sim-adesao')?.value) || 80;
  const semanas      = parseInt(document.getElementById('sim-semanas')?.value) || 12;

  if (!pesoAtual || !kcalPlano) {
    alert('Preencha pelo menos peso atual e kcal do plano.');
    return;
  }

  const result = simularResultado({
    pesoAtual, pesoMeta: pesoMeta || null,
    kcalPlano, tmb: null,
    fatorAtividade: null,
    adesaoPct, semanas,
    get,  // override direto do GET
  });

  // Override: se GET informado, recalcula com ele diretamente
  const getOverride = !isNaN(get) && get > 0;
  const deficitFinal = getOverride
    ? (get - kcalPlano) * (adesaoPct / 100)
    : result.deficitDiario;
  const kgSemFinal = (deficitFinal * 7) / 7700;

  const resultFinal = simularResultado({
    pesoAtual, pesoMeta: pesoMeta || null,
    kcalPlano, tmb: getOverride ? get : 1500,
    fatorAtividade: getOverride ? 1 : 1.3,
    adesaoPct, semanas,
  });

  // Exibe resultado
  const resultDiv = document.getElementById('smet-sim-result');
  const metricsDiv = document.getElementById('smet-sim-metrics');
  resultDiv.style.display = '';

  metricsDiv.innerHTML = `
    <div class="smet-sim-metric">
      <p class="smet-sm-val">${resultFinal.kgPorSemana.toFixed(2)} kg</p>
      <p class="smet-sm-label">/ semana estimado</p>
    </div>
    <div class="smet-sim-metric">
      <p class="smet-sm-val">${resultFinal.pesoFinalSim} kg</p>
      <p class="smet-sm-label">peso em ${semanas} semanas</p>
    </div>
    ${resultFinal.semanasAlvo ? `
    <div class="smet-sim-metric">
      <p class="smet-sm-val">${resultFinal.semanasAlvo} sem.</p>
      <p class="smet-sm-label">até a meta (${resultFinal.dataAlvo})</p>
    </div>` : ''}
    <div class="smet-sim-metric" style="border-top:3px solid ${resultFinal.riscoCor}">
      <p class="smet-sm-val" style="color:${resultFinal.riscoCor};font-size:0.8rem">${resultFinal.riscoLabel}</p>
      <p class="smet-sm-label">risco de baixa adesão</p>
    </div>`;

  // Gráfico de projeção
  const ctx = document.getElementById('smet-chart-sim');
  if (ctx) {
    if (chartSim) { chartSim.destroy(); chartSim = null; }
    chartSim = new Chart(ctx, {
      type: 'line',
      data: {
        labels: resultFinal.projecao.map(p => `Sem ${p.semana}`),
        datasets: [
          {
            label: 'Peso projetado (kg)',
            data: resultFinal.projecao.map(p => p.peso),
            borderColor: '#C9A882',
            backgroundColor: 'rgba(201,168,130,0.08)',
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
            fill: true,
          },
          ...(pesoMeta ? [{
            label: 'Meta',
            data: resultFinal.projecao.map(() => pesoMeta),
            borderColor: '#2E8B6A',
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0,
          }] : []),
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} kg` } }
        },
        scales: {
          y: {
            ticks: { callback: v => v + ' kg' },
            grid: { color: 'rgba(201,168,130,0.12)' },
          },
          x: { grid: { display: false } }
        }
      }
    });
  }
};
