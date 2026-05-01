// ============================================================
// relatorio-consulta.js — Relatório Inteligente de Consulta
// ERG 360 — Gerado automaticamente antes da consulta
// ============================================================

import { createClient }      from 'https://esm.sh/@supabase/supabase-js@2';
import { calcularScoreSemanal, detectarPadroes, gerarSugestoes } from './score-metabolico.js';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';
const ADMIN_EMAIL   = 'evelinbeatrizrb@outlook.com';

function isAdminUser(u) {
  return u?.user_metadata?.role === 'admin' || u?.email === ADMIN_EMAIL;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Nomes legíveis de patologias ─────────────────────────
const PATOLOGIA_LABELS = {
  diabetes:          'Diabetes',
  resistencia_insulina: 'Resistência à Insulina',
  hipertensao:       'Hipertensão',
  dislipidemia:      'Dislipidemia',
  sop:               'SOP',
  hipotireoidismo:   'Hipotireoidismo',
  hipertireoidismo:  'Hipertireoidismo',
  doenca_celiaca:    'Doença Celíaca',
  sii:               'Síndrome do Intestino Irritável',
  dpoc:              'DPOC',
  insuficiencia_cardiaca: 'Insuficiência Cardíaca',
  cancer:            'Câncer',
  osteoporose:       'Osteoporose',
  nao:               'Nenhuma',
};

const NIVEL_AF_LABELS = {
  sedentario:   'Sedentário',
  leve:         'Levemente ativo',
  moderado:     'Moderadamente ativo',
  intenso:      'Muito ativo',
  atleta:       'Atleta',
};

// ============================================================
// COLETA DE DADOS (paralelo)
// ============================================================
export async function coletarDadosRelatorio(patientId) {
  const dataInicio30 = new Date();
  dataInicio30.setDate(dataInicio30.getDate() - 30);
  const inicio30 = dataInicio30.toISOString().split('T')[0];

  const [
    checkinsRes,
    anamneseRes,
    antroRes,
    patientRes,
    insightsRes,
    modulosRes,
  ] = await Promise.all([
    supabase.from('checkins')
      .select('*')
      .eq('patient_id', patientId)
      .gte('data', inicio30)
      .order('data', { ascending: true }),

    supabase.from('anamnese')
      .select('*')
      .eq('patient_id', patientId)
      .order('data_avaliacao', { ascending: false })
      .limit(1),

    // Antropometria — query defensiva que faz fallback se colunas novas não existirem
    (async () => {
      const camposCompletos =
        'data_avaliacao, peso, altura, imc, pct_gordura, massa_magra, circ_cintura, ' +
        'densidade_corporal, area_muscular_braco, area_gordura_braco, ' +
        'massa_muscular_esqueletica, frame_size_index, peso_meta, peso_ideal, rcq';
      const camposBasicos =
        'data_avaliacao, peso, altura, imc, pct_gordura, massa_magra, circ_cintura, peso_meta, peso_ideal, rcq';
      let r = await supabase.from('antropometria').select(camposCompletos)
        .eq('patient_id', patientId).order('data_avaliacao', { ascending: false }).limit(5);
      if (r.error) {
        console.warn('[relatorio] fallback campos básicos:', r.error.message);
        r = await supabase.from('antropometria').select(camposBasicos)
          .eq('patient_id', patientId).order('data_avaliacao', { ascending: false }).limit(5);
      }
      return r;
    })(),

    supabase.from('patients')
      .select('nome, email, data_nascimento, sexo, data_proxima_consulta, plano_url')
      .eq('id', patientId)
      .single(),

    supabase.from('patient_anamnese_insights')
      .select('tipo, modulo_origem, mensagem, ordem')
      .eq('patient_id', patientId)
      .order('ordem', { ascending: true })
      .limit(20),

    supabase.from('patient_module_activations')
      .select('module_slug')
      .eq('patient_id', patientId),
  ]);

  return {
    checkins:  checkinsRes.data  || [],
    anamnese:  anamneseRes.data?.[0] || null,
    antro:     antroRes.data     || [],
    patient:   patientRes.data   || {},
    insights:  insightsRes.data  || [],
    modulos:   (modulosRes.data  || []).map(m => m.module_slug),
  };
}

// ============================================================
// MOTOR DE ANÁLISE
// ============================================================
export function analisarDados({ checkins, anamnese, antro, patient, insights, modulos }) {
  // ── Score e tendência ──
  const scoreData = calcularScoreSemanal(checkins);

  // ── Padrões clínicos ──
  const padroes  = detectarPadroes(checkins);
  const sugestoes = gerarSugestoes(padroes);

  // ── Evolução de peso ──
  const evolucaoPeso = calcularEvolucaoPeso(antro);

  // ── Métricas de comportamento (30d) ──
  const comportamento = calcularComportamento(checkins);

  // ── Adesão ──
  const adesao = calcularAdesaoRelatorio(checkins);

  // ── Agenda de consulta (o que abordar) ──
  const agenda = gerarAgenda({ padroes, evolucaoPeso, scoreData, anamnese, adesao, comportamento });

  // ── Semáforo geral ──
  const semaforo = calcularSemaforo(scoreData, padroes, adesao, evolucaoPeso);

  return {
    scoreData,
    padroes,
    sugestoes,
    evolucaoPeso,
    comportamento,
    adesao,
    agenda,
    semaforo,
  };
}

// ── Evolução de peso ─────────────────────────────────────
function calcularEvolucaoPeso(antro) {
  if (!antro || antro.length === 0) return null;

  // antro já vem DESC, reverte para cronológico
  const cronologico = [...antro].reverse();
  const atual = cronologico[cronologico.length - 1];
  const anterior = cronologico.length > 1 ? cronologico[cronologico.length - 2] : null;
  const inicial = cronologico[0];

  const deltaPeriodo = anterior ? (atual.peso - anterior.peso) : null;
  const deltaTotal   = cronologico.length > 1 ? (atual.peso - inicial.peso) : null;

  // Calcula semanas entre inicial e atual
  let semanasDecorridas = null;
  if (cronologico.length > 1) {
    const diffMs = new Date(atual.data_avaliacao) - new Date(inicial.data_avaliacao);
    semanasDecorridas = Math.round(diffMs / (7 * 24 * 3600 * 1000));
  }

  return {
    atual:           atual.peso,
    imc:             atual.imc,
    gordura:         atual.pct_gordura,
    massaMagra:      atual.massa_magra,
    circAbdominal:   atual.circ_cintura,
    densidade:       atual.densidade_corporal,
    amb:             atual.area_muscular_braco,
    agb:             atual.area_gordura_braco,
    smEsqueletica:   atual.massa_muscular_esqueletica,
    frameSize:       atual.frame_size_index,
    pesoMeta:        atual.peso_meta,
    pesoIdeal:       atual.peso_ideal,
    rcq:             atual.rcq,
    deltaPeriodo,
    deltaTotal,
    semanasDecorridas,
    historico:       cronologico.map(a => ({
      data:    a.data_avaliacao,
      peso:    a.peso,
      gordura: a.pct_gordura,
      mm:      a.massa_magra,
      amb:     a.area_muscular_braco,
      agb:     a.area_gordura_braco,
      densidade: a.densidade_corporal,
    })),
  };
}

// ── Comportamento alimentar/sono/treino ─────────────────
function calcularComportamento(checkins) {
  if (!checkins.length) return null;

  const avg = field => {
    const v = checkins.map(c => c[field]).filter(x => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  const n = checkins.length;
  return {
    n,
    sonoHoras:   avg('sono_horas'),
    sonoQual:    avg('sono_qualidade'),
    energia:     avg('energia'),
    humor:       avg('humor'),
    agua:        avg('agua_litros'),
    fome:        avg('fome_nivel'),
    pctTreino:   Math.round(checkins.filter(c => c.treinou).length / n * 100),
    pctEvacuou:  Math.round(checkins.filter(c => c.evacuou).length / n * 100),
    scoreMedio:  avg('score_diario'),
    diasComScore: checkins.filter(c => c.score_diario != null).length,
  };
}

// ── Adesão (baseada em check-ins vs. 30 dias esperados) ─
function calcularAdesaoRelatorio(checkins) {
  if (!checkins.length) return { pct: 0, diasRegistrados: 0, diasEsperados: 30 };
  const diasEsperados = 30;
  const pct = Math.min(Math.round((checkins.length / diasEsperados) * 100), 100);
  return { pct, diasRegistrados: checkins.length, diasEsperados };
}

// ── Agenda de consulta ────────────────────────────────────
function gerarAgenda({ padroes, evolucaoPeso, scoreData, anamnese, adesao, comportamento }) {
  const itens = [];

  // Baseado em padrões detectados
  padroes.problemas.forEach(p => {
    itens.push({ prioridade: 'alta', texto: `Discutir: ${p.titulo}` });
  });
  padroes.alertas.forEach(a => {
    itens.push({ prioridade: 'media', texto: `Avaliar: ${a.titulo}` });
  });

  // Baseado em evolução de peso
  if (evolucaoPeso) {
    if (evolucaoPeso.deltaTotal !== null) {
      const variacao = evolucaoPeso.deltaTotal;
      if (Math.abs(variacao) < 0.5 && evolucaoPeso.semanasDecorridas >= 3) {
        itens.push({ prioridade: 'alta', texto: 'Estagnação de peso — revisar plano e deficit calórico' });
      } else if (variacao > 2) {
        itens.push({ prioridade: 'media', texto: `Ganho de ${variacao.toFixed(1)} kg — investigar causa` });
      } else if (variacao <= -1) {
        itens.push({ prioridade: 'ok', texto: `Progresso: ${Math.abs(variacao).toFixed(1)} kg perdidos no período` });
      }
    }
  }

  // Baseado em adesão
  if (adesao.pct < 50) {
    itens.push({ prioridade: 'alta', texto: `Adesão baixa (${adesao.pct}%) — identificar barreiras` });
  } else if (adesao.pct < 70) {
    itens.push({ prioridade: 'media', texto: `Adesão moderada (${adesao.pct}%) — estratégias de manutenção` });
  }

  // Baseado em score
  if (scoreData) {
    if (scoreData.tendencia?.tipo === 'piorando') {
      itens.push({ prioridade: 'alta', texto: 'Score em queda — investigar causas (sono, fome, rotina)' });
    }
    if (scoreData.score < 45) {
      itens.push({ prioridade: 'alta', texto: `Score baixo (${scoreData.score}/100) — revisão geral do protocolo` });
    }
  }

  // Baseado em comportamento
  if (comportamento) {
    if (comportamento.sonoHoras !== null && comportamento.sonoHoras < 6.5) {
      itens.push({ prioridade: 'media', texto: `Sono médio curto (${comportamento.sonoHoras.toFixed(1)}h) — abordar higiene do sono` });
    }
    if (comportamento.agua !== null && comportamento.agua < 1.5) {
      itens.push({ prioridade: 'media', texto: 'Hidratação baixa — reforçar estratégias práticas' });
    }
    if (comportamento.pctTreino < 30) {
      itens.push({ prioridade: 'media', texto: `Baixa frequência de treinos (${comportamento.pctTreino}%) — revisar plano de exercício` });
    }
  }

  // Item padrão sempre presente
  itens.push({ prioridade: 'info', texto: 'Revisar exames laboratoriais recentes' });
  itens.push({ prioridade: 'info', texto: 'Atualizar metas e expectativas do paciente' });

  // Ordena: alta > media > ok > info
  const ordemPrior = { alta: 0, media: 1, ok: 2, info: 3 };
  itens.sort((a, b) => ordemPrior[a.prioridade] - ordemPrior[b.prioridade]);

  return itens;
}

// ── Semáforo geral ───────────────────────────────────────
function calcularSemaforo(scoreData, padroes, adesao, evolucaoPeso) {
  let pontos = 0, total = 0;

  if (scoreData) {
    pontos += scoreData.score; total += 100;
  }

  if (adesao.pct > 0) {
    pontos += adesao.pct; total += 100;
  }

  const nProblemas = padroes.problemas.length;
  const nAlertas   = padroes.alertas.length;
  const penalidade = nProblemas * 15 + nAlertas * 8;

  if (total === 0) return { nivel: 'sem-dados', cor: '#9A7D5E', label: 'Sem dados suficientes' };

  const nota = Math.max(0, Math.round(pontos / total * 100) - penalidade);

  if (nota >= 70) return { nivel: 'bom',    cor: '#2E8B6A', label: 'Evoluindo bem' };
  if (nota >= 45) return { nivel: 'atencao', cor: '#B8860B', label: 'Requer atenção' };
  return              { nivel: 'critico', cor: '#B33030', label: 'Intervenção necessária' };
}

// ============================================================
// RENDERIZAÇÃO HTML
// ============================================================
export function renderRelatorio(dados, analise, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const { checkins, anamnese, antro, patient, insights, modulos } = dados;
  const { scoreData, padroes, sugestoes, evolucaoPeso, comportamento, adesao, agenda, semaforo } = analise;

  const agora = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const consultaLabel = patient.data_proxima_consulta
    ? new Date(patient.data_proxima_consulta + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long'
      })
    : 'Data não agendada';

  el.innerHTML = `
    <div class="rel-container">

      <!-- ══ CAPA ══ -->
      <div class="rel-capa">
        <div class="rel-capa-meta">
          <span class="rel-label-sup">Relatório pré-consulta</span>
          <div class="rel-semaforo" style="background:${semaforo.cor}20;border-left:3px solid ${semaforo.cor};">
            <span style="color:${semaforo.cor};font-weight:700;font-size:0.75rem;font-family:'DM Sans',sans-serif;">${semaforo.label.toUpperCase()}</span>
          </div>
        </div>
        <h1 class="rel-nome">${patient.nome || '—'}</h1>
        <div class="rel-capa-sub">
          <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Consulta: ${consultaLabel}</span>
          <span>🕐 Gerado em: ${agora}</span>
          ${adesao.diasRegistrados > 0 ? `<span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg> ${adesao.diasRegistrados} check-ins nos últimos 30 dias</span>` : ''}
        </div>
      </div>

      <!-- ══ GRID PRINCIPAL ══ -->
      <div class="rel-grid">

        <!-- Coluna esquerda -->
        <div class="rel-col-left">
          ${renderIdentidadeClinica(anamnese, modulos, patient)}
          ${renderEvolucaoPeso(evolucaoPeso)}
          ${renderComportamento(comportamento, adesao)}
        </div>

        <!-- Coluna direita -->
        <div class="rel-col-right">
          ${renderScoreRelatorio(scoreData)}
          ${renderAlertasRelatorio(padroes)}
          ${renderInsightsRelatorio(insights)}
        </div>

      </div>

      <!-- ══ SEÇÕES LARGAS ══ -->
      ${renderSugestoesRelatorio(sugestoes)}
      ${renderAgenda(agenda)}

    </div>
  `;

  // Gráfico mini de evolução de peso
  if (evolucaoPeso && evolucaoPeso.historico.length > 1) {
    setTimeout(() => renderGraficoPeso(evolucaoPeso.historico), 50);
  }
}

// ── Identidade Clínica ────────────────────────────────────
function renderIdentidadeClinica(anamnese, modulos, patient) {
  if (!anamnese && !modulos.length) {
    return `<div class="rel-card">
      <p class="rel-card-title">Identidade Clínica</p>
      <p class="rel-empty">Anamnese não preenchida</p>
    </div>`;
  }

  const patologias = (anamnese?.patologias || [])
    .filter(p => p && p !== 'nao')
    .map(p => PATOLOGIA_LABELS[p] || p);

  const nivelAf = NIVEL_AF_LABELS[anamnese?.nivel_af] || anamnese?.nivel_af || '—';
  const motivo  = anamnese?.motivo || '—';

  const exames = [];
  if (anamnese?.glicemia)   exames.push(`Glicemia: <strong>${anamnese.glicemia} mg/dL</strong>`);
  if (anamnese?.hba1c)      exames.push(`HbA1c: <strong>${anamnese.hba1c}%</strong>`);
  if (anamnese?.insulina)   exames.push(`Insulina: <strong>${anamnese.insulina} μU/mL</strong>`);
  if (anamnese?.tg)         exames.push(`TG: <strong>${anamnese.tg} mg/dL</strong>`);
  if (anamnese?.hdl)        exames.push(`HDL: <strong>${anamnese.hdl} mg/dL</strong>`);
  if (anamnese?.ldl)        exames.push(`LDL: <strong>${anamnese.ldl} mg/dL</strong>`);

  const moduloLabels = {
    atleta: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><circle cx="13" cy="4" r="2"/><path d="M4 22 7 17 11 13 14 16 17 14 19 11"/><path d="M11 13 9 6 13 5 17 8"/></svg> Atleta', emagrecimento: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Emagrecimento',
    diabetes_ri: '🩸 Diabetes/RI', hipertensao: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> Hipertensão',
    sop: '🌸 SOP', dislipidemia: '🫀 Dislipidemia',
    gestante: '🤰 Gestante', idoso: '🧓 Idoso',
  };

  return `<div class="rel-card">
    <p class="rel-card-title">Identidade Clínica</p>

    <div class="rel-kv">
      <span class="rel-k">Objetivo</span>
      <span class="rel-v">${motivo}</span>
    </div>

    ${patologias.length ? `
    <div class="rel-kv">
      <span class="rel-k">Patologias</span>
      <span class="rel-v">${patologias.join(' · ')}</span>
    </div>` : ''}

    <div class="rel-kv">
      <span class="rel-k">Nível de atividade</span>
      <span class="rel-v">${nivelAf}</span>
    </div>

    ${modulos.length ? `
    <div class="rel-kv" style="align-items:flex-start;">
      <span class="rel-k" style="padding-top:4px;">Módulos ativos</span>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${modulos.map(m => `<span class="rel-badge">${moduloLabels[m] || m}</span>`).join('')}
      </div>
    </div>` : ''}

    ${exames.length ? `
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--detail);">
      <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--subtitle);margin:0 0 8px;">Último laboratório</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;">
        ${exames.map(e => `<span style="font-family:'DM Sans',sans-serif;font-size:0.72rem;color:var(--text);">${e}</span>`).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

// ── Evolução de peso ─────────────────────────────────────
function renderEvolucaoPeso(evol) {
  if (!evol) {
    return `<div class="rel-card">
      <p class="rel-card-title">Evolução de Peso</p>
      <p class="rel-empty">Nenhuma antropometria registrada</p>
    </div>`;
  }

  const deltaCorPeriodo = evol.deltaPeriodo === null ? 'var(--sub)'
    : evol.deltaPeriodo < -0.1 ? '#2E8B6A'
    : evol.deltaPeriodo > 0.1  ? '#B33030'
    : '#B8860B';

  const deltaPeriodoLabel = evol.deltaPeriodo !== null
    ? `${evol.deltaPeriodo > 0 ? '+' : ''}${evol.deltaPeriodo.toFixed(1)} kg`
    : '—';

  const deltaTotalLabel = evol.deltaTotal !== null
    ? `${evol.deltaTotal > 0 ? '+' : ''}${evol.deltaTotal.toFixed(1)} kg`
    : '—';

  const imc = evol.imc ? Number(evol.imc).toFixed(1) : null;
  let imcStatus = '';
  if (imc) {
    const imcN = parseFloat(imc);
    if (imcN < 18.5)      imcStatus = 'Baixo peso';
    else if (imcN < 25)   imcStatus = 'Peso normal';
    else if (imcN < 30)   imcStatus = 'Sobrepeso';
    else if (imcN < 35)   imcStatus = 'Obesidade grau I';
    else if (imcN < 40)   imcStatus = 'Obesidade grau II';
    else                  imcStatus = 'Obesidade grau III';
  }

  return `<div class="rel-card">
    <p class="rel-card-title">Evolução de Peso</p>

    <div class="rel-peso-grid">
      <div class="rel-peso-card">
        <p class="rel-peso-val">${evol.atual ? evol.atual.toFixed(1) : '—'} <span>kg</span></p>
        <p class="rel-peso-label">Peso atual</p>
      </div>
      <div class="rel-peso-card">
        <p class="rel-peso-val" style="color:${deltaCorPeriodo};">${deltaPeriodoLabel}</p>
        <p class="rel-peso-label">Última variação</p>
      </div>
      <div class="rel-peso-card">
        <p class="rel-peso-val">${evol.deltaTotal !== null ? deltaTotalLabel : '—'}</p>
        <p class="rel-peso-label">${evol.semanasDecorridas ? `em ${evol.semanasDecorridas} sem.` : 'Total'}</p>
      </div>
      ${evol.gordura ? `<div class="rel-peso-card">
        <p class="rel-peso-val">${evol.gordura.toFixed(1)}<span>%</span></p>
        <p class="rel-peso-label">% gordura</p>
      </div>` : ''}
    </div>

    ${imc ? `<div class="rel-kv" style="margin-top:10px;">
      <span class="rel-k">IMC</span>
      <span class="rel-v">${imc} — ${imcStatus}</span>
    </div>` : ''}

    ${evol.circAbdominal ? `<div class="rel-kv">
      <span class="rel-k">Circ. abdominal</span>
      <span class="rel-v">${evol.circAbdominal} cm</span>
    </div>` : ''}
    ${evol.rcq ? `<div class="rel-kv">
      <span class="rel-k">RCQ</span>
      <span class="rel-v">${(+evol.rcq).toFixed(2)}</span>
    </div>` : ''}
    ${evol.massaMagra ? `<div class="rel-kv">
      <span class="rel-k">Massa magra</span>
      <span class="rel-v">${(+evol.massaMagra).toFixed(1)} kg</span>
    </div>` : ''}
    ${evol.smEsqueletica ? `<div class="rel-kv">
      <span class="rel-k">MM esquelética (Lee)</span>
      <span class="rel-v">${(+evol.smEsqueletica).toFixed(1)} kg</span>
    </div>` : ''}
    ${evol.amb ? `<div class="rel-kv">
      <span class="rel-k">AMB corrigida</span>
      <span class="rel-v">${(+evol.amb).toFixed(1)} cm²</span>
    </div>` : ''}
    ${evol.agb ? `<div class="rel-kv">
      <span class="rel-k">AGB</span>
      <span class="rel-v">${(+evol.agb).toFixed(1)} cm²</span>
    </div>` : ''}
    ${evol.densidade ? `<div class="rel-kv">
      <span class="rel-k">Densidade corporal</span>
      <span class="rel-v">${(+evol.densidade).toFixed(4)} g/cm³</span>
    </div>` : ''}
    ${evol.frameSize ? `<div class="rel-kv">
      <span class="rel-k">Compleição (alt÷punho)</span>
      <span class="rel-v">${(+evol.frameSize).toFixed(2)}</span>
    </div>` : ''}

    ${evol.historico.length > 1 ? `<div style="margin-top:14px;">
      <canvas id="rel-chart-peso" height="70"></canvas>
    </div>` : ''}
  </div>`;
}

// ── Comportamento ─────────────────────────────────────────
function renderComportamento(comp, adesao) {
  if (!comp || comp.n === 0) {
    return `<div class="rel-card">
      <p class="rel-card-title">Comportamento (30d)</p>
      <p class="rel-empty">Sem check-ins no período</p>
    </div>`;
  }

  const badge = (val, ótimo, bom, label) => {
    if (val === null) return `<span class="rel-comp-val">—</span>`;
    const cor = val >= ótimo ? '#2E8B6A' : val >= bom ? '#B8860B' : '#B33030';
    return `<span class="rel-comp-val" style="color:${cor};">${label}</span>`;
  };

  const adesaoCor = adesao.pct >= 70 ? '#2E8B6A' : adesao.pct >= 50 ? '#B8860B' : '#B33030';

  return `<div class="rel-card">
    <p class="rel-card-title">Comportamento — ${comp.n} dias</p>

    <div class="rel-comp-row">
      <span class="rel-comp-label">Adesão (check-ins)</span>
      <div class="rel-comp-bar-bg">
        <div class="rel-comp-bar-fill" style="width:${adesao.pct}%;background:${adesaoCor};"></div>
      </div>
      <span class="rel-comp-val" style="color:${adesaoCor};">${adesao.pct}%</span>
    </div>

    ${comp.sonoHoras !== null ? `<div class="rel-comp-row">
      <span class="rel-comp-label">Sono médio</span>
      <div class="rel-comp-bar-bg">
        <div class="rel-comp-bar-fill" style="width:${Math.min(comp.sonoHoras / 9 * 100, 100)}%;background:${comp.sonoHoras >= 7 ? '#2E8B6A' : comp.sonoHoras >= 6 ? '#B8860B' : '#B33030'};"></div>
      </div>
      ${badge(comp.sonoHoras, 7, 6, comp.sonoHoras.toFixed(1) + 'h')}
    </div>` : ''}

    ${comp.energia !== null ? `<div class="rel-comp-row">
      <span class="rel-comp-label">Energia</span>
      <div class="rel-comp-bar-bg">
        <div class="rel-comp-bar-fill" style="width:${comp.energia / 5 * 100}%;background:${comp.energia >= 4 ? '#2E8B6A' : comp.energia >= 3 ? '#B8860B' : '#B33030'};"></div>
      </div>
      ${badge(comp.energia, 4, 3, comp.energia.toFixed(1) + '/5')}
    </div>` : ''}

    ${comp.humor !== null ? `<div class="rel-comp-row">
      <span class="rel-comp-label">Humor</span>
      <div class="rel-comp-bar-bg">
        <div class="rel-comp-bar-fill" style="width:${comp.humor / 5 * 100}%;background:${comp.humor >= 4 ? '#2E8B6A' : comp.humor >= 3 ? '#B8860B' : '#B33030'};"></div>
      </div>
      ${badge(comp.humor, 4, 3, comp.humor.toFixed(1) + '/5')}
    </div>` : ''}

    ${comp.agua !== null ? `<div class="rel-comp-row">
      <span class="rel-comp-label">Hidratação</span>
      <div class="rel-comp-bar-bg">
        <div class="rel-comp-bar-fill" style="width:${Math.min(comp.agua / 3 * 100, 100)}%;background:${comp.agua >= 2 ? '#2E8B6A' : comp.agua >= 1.5 ? '#B8860B' : '#B33030'};"></div>
      </div>
      ${badge(comp.agua, 2, 1.5, comp.agua.toFixed(1) + 'L')}
    </div>` : ''}

    ${comp.fome !== null ? `<div class="rel-comp-row">
      <span class="rel-comp-label">Fome média</span>
      <div class="rel-comp-bar-bg">
        <div class="rel-comp-bar-fill" style="width:${comp.fome / 4 * 100}%;background:${comp.fome <= 2 ? '#2E8B6A' : comp.fome <= 3 ? '#B8860B' : '#B33030'};"></div>
      </div>
      <span class="rel-comp-val" style="color:${comp.fome <= 2 ? '#2E8B6A' : comp.fome <= 3 ? '#B8860B' : '#B33030'};">${comp.fome.toFixed(1)}/4</span>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--detail);">
      <div style="text-align:center;">
        <p style="font-family:'DM Serif Display',serif;font-size:1.4rem;color:var(--text);margin:0;">${comp.pctTreino}%</p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.62rem;color:var(--sub);margin:2px 0 0;letter-spacing:0.1em;text-transform:uppercase;">Dias c/ treino</p>
      </div>
      <div style="text-align:center;">
        <p style="font-family:'DM Serif Display',serif;font-size:1.4rem;color:var(--text);margin:0;">${comp.pctEvacuou}%</p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.62rem;color:var(--sub);margin:2px 0 0;letter-spacing:0.1em;text-transform:uppercase;">Trânsito regular</p>
      </div>
    </div>
  </div>`;
}

// ── Score ─────────────────────────────────────────────────
function renderScoreRelatorio(scoreData) {
  if (!scoreData) {
    return `<div class="rel-card">
      <p class="rel-card-title">Score Metabólico</p>
      <p class="rel-empty">Dados insuficientes</p>
    </div>`;
  }

  const { score, tendencia, n } = scoreData;
  const scoreCor = score >= 75 ? '#2E8B6A' : score >= 50 ? '#B8860B' : '#B33030';
  const scoreLabel = score >= 75 ? 'Muito bom' : score >= 60 ? 'Bom' : score >= 45 ? 'Regular' : 'Baixo';

  return `<div class="rel-card">
    <p class="rel-card-title">Score Metabólico — ${n} dias</p>
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:16px;">
      <div style="position:relative;flex-shrink:0;">
        <svg width="100" height="56" viewBox="0 0 200 112">
          <path d="M 20 100 A 80 80 0 0 1 180 100" stroke="var(--detail)" stroke-width="14" fill="none" stroke-linecap="round"/>
          <path d="M 20 100 A 80 80 0 0 1 180 100" stroke="${scoreCor}" stroke-width="14" fill="none"
            stroke-linecap="round" stroke-dasharray="${score * 2.51} 999"/>
        </svg>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);text-align:center;">
          <p style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:${scoreCor};margin:0;">${score}</p>
        </div>
      </div>
      <div>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.75rem;color:var(--text);font-weight:600;margin:0 0 4px;">${scoreLabel}</p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.72rem;margin:0;" class="rel-tend-${tendencia.tipo}">
          ${tendencia.label || '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> Estável'}
        </p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.65rem;color:var(--sub);margin:6px 0 0;">Últimos 30 dias</p>
      </div>
    </div>

    ${renderComponentesScore(scoreData.componentes)}
  </div>`;
}

function renderComponentesScore(comp) {
  if (!comp) return '';
  const itens = [
    { label: 'Sono', val: comp.sono_horas ? Math.min(comp.sono_horas / 9, 1) : null, fmt: comp.sono_horas ? comp.sono_horas.toFixed(1) + 'h' : '—' },
    { label: 'Energia', val: comp.energia ? comp.energia / 5 : null, fmt: comp.energia ? comp.energia.toFixed(1) + '/5' : '—' },
    { label: 'Humor', val: comp.humor ? comp.humor / 5 : null, fmt: comp.humor ? comp.humor.toFixed(1) + '/5' : '—' },
    { label: 'Água', val: comp.agua_litros ? Math.min(comp.agua_litros / 3, 1) : null, fmt: comp.agua_litros ? comp.agua_litros.toFixed(1) + 'L' : '—' },
  ];

  return itens.map(({ label, val, fmt }) => {
    const pct = val !== null ? Math.round(val * 100) : 0;
    const cor = pct >= 75 ? '#2E8B6A' : pct >= 50 ? '#B8860B' : '#B33030';
    return `<div class="rel-comp-row">
      <span class="rel-comp-label">${label}</span>
      <div class="rel-comp-bar-bg">
        <div class="rel-comp-bar-fill" style="width:${pct}%;background:${cor};"></div>
      </div>
      <span class="rel-comp-val" style="color:${cor};">${fmt}</span>
    </div>`;
  }).join('');
}

// ── Alertas / Padrões ─────────────────────────────────────
function renderAlertasRelatorio(padroes) {
  const { problemas, alertas, positivos } = padroes;
  if (!problemas.length && !alertas.length && !positivos.length) {
    return `<div class="rel-card">
      <p class="rel-card-title">Alertas Clínicos</p>
      <p class="rel-empty">Nenhum padrão crítico detectado <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg></p>
    </div>`;
  }

  const renderItem = (item, tipo) => {
    const config = {
      problema: { cor: '#B33030', bg: 'rgba(179,48,48,0.06)', icone: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
      alerta:   { cor: '#B8860B', bg: 'rgba(184,134,11,0.06)', icone: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' },
      positivo: { cor: '#2E8B6A', bg: 'rgba(46,139,106,0.06)', icone: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg>' },
    }[tipo];
    return `<div style="padding:10px 14px;background:${config.bg};border-left:3px solid ${config.cor};margin-bottom:8px;">
      <p style="font-family:'DM Sans',sans-serif;font-size:0.76rem;font-weight:600;color:${config.cor};margin:0 0 3px;">${config.icone} ${item.titulo}</p>
      <p style="font-family:'DM Sans',sans-serif;font-size:0.7rem;color:var(--sub);margin:0;line-height:1.5;">${item.descricao}</p>
    </div>`;
  };

  return `<div class="rel-card">
    <p class="rel-card-title">Alertas Clínicos</p>
    ${problemas.map(p => renderItem(p, 'problema')).join('')}
    ${alertas.map(a => renderItem(a, 'alerta')).join('')}
    ${positivos.length ? `<div style="margin-top:8px;">${positivos.map(p => renderItem(p, 'positivo')).join('')}</div>` : ''}
  </div>`;
}

// ── Insights da Anamnese ──────────────────────────────────
function renderInsightsRelatorio(insights) {
  if (!insights || !insights.length) return '';

  const criticos = insights.filter(i => i.tipo === 'critico');
  const atencoes = insights.filter(i => i.tipo === 'atencao');
  if (!criticos.length && !atencoes.length) return '';

  const renderInsight = (item, cor, bg) =>
    `<div style="padding:8px 12px;background:${bg};border-left:2px solid ${cor};margin-bottom:6px;">
      <p style="font-family:'DM Sans',sans-serif;font-size:0.72rem;color:var(--text);margin:0;line-height:1.5;">${item.mensagem}</p>
    </div>`;

  return `<div class="rel-card">
    <p class="rel-card-title">Insights da Anamnese</p>
    ${criticos.map(i => renderInsight(i, '#B33030', 'rgba(179,48,48,0.05)')).join('')}
    ${atencoes.map(i => renderInsight(i, '#B8860B', 'rgba(184,134,11,0.05)')).join('')}
  </div>`;
}

// ── Sugestões ─────────────────────────────────────────────
function renderSugestoesRelatorio(sugestoes) {
  if (!sugestoes || !sugestoes.length) return '';

  const urgenciaConfig = {
    alta:  { cor: '#B33030', bg: 'rgba(179,48,48,0.07)', label: 'Urgente' },
    media: { cor: '#B8860B', bg: 'rgba(184,134,11,0.07)', label: 'Importante' },
    baixa: { cor: '#6D5ACF', bg: 'rgba(109,90,207,0.07)', label: 'Sugerido' },
  };

  return `<div class="rel-section-wide">
    <p class="rel-section-title">Sugestões de Ajuste para Esta Consulta</p>
    <div class="rel-sug-grid">
      ${sugestoes.slice(0, 6).map(s => {
        const cfg = urgenciaConfig[s.urgencia] || urgenciaConfig.baixa;
        return `<div class="rel-sug-card">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:1.2rem;">${s.icone || '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>'}</span>
              <p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;font-weight:600;color:var(--text);margin:0;">${s.titulo}</p>
            </div>
            <span style="flex-shrink:0;padding:2px 8px;background:${cfg.bg};color:${cfg.cor};border-radius:10px;font-family:'DM Sans',sans-serif;font-size:0.58rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">${cfg.label}</span>
          </div>
          <p style="font-family:'DM Sans',sans-serif;font-size:0.73rem;color:var(--text);margin:0 0 6px;line-height:1.5;">${s.acao}</p>
          ${s.impacto ? `<p style="font-family:'DM Sans',sans-serif;font-size:0.68rem;color:var(--sub);margin:0;line-height:1.5;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg> ${s.impacto}</p>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ── Agenda de Consulta ────────────────────────────────────
function renderAgenda(agenda) {
  if (!agenda || !agenda.length) return '';

  const priorConfig = {
    alta:  { cor: '#B33030', marker: '●' },
    media: { cor: '#B8860B', marker: '○' },
    ok:    { cor: '#2E8B6A', marker: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg>' },
    info:  { cor: '#9A7D5E', marker: '·' },
  };

  return `<div class="rel-section-wide">
    <p class="rel-section-title">Agenda da Consulta — O que abordar hoje</p>
    <div class="rel-agenda-grid">
      ${agenda.map((item, i) => {
        const cfg = priorConfig[item.prioridade] || priorConfig.info;
        return `<div class="rel-agenda-item">
          <span style="color:${cfg.cor};font-size:1rem;flex-shrink:0;margin-top:1px;">${cfg.marker}</span>
          <span style="font-family:'DM Sans',sans-serif;font-size:0.76rem;color:var(--text);line-height:1.5;">${item.texto}</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ── Gráfico mini de peso ──────────────────────────────────
function renderGraficoPeso(historico) {
  const canvas = document.getElementById('rel-chart-peso');
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = historico.map(h =>
    new Date(h.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  );
  const pesos = historico.map(h => h.peso);

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: pesos,
        borderColor: '#C9A882',
        backgroundColor: 'rgba(201,168,130,0.1)',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#C9A882',
        tension: 0.3,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          grid: { color: 'rgba(201,168,130,0.15)' },
          ticks: { font: { family: "'DM Sans'", size: 10 }, color: '#9A7D5E' },
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: "'DM Sans'", size: 10 }, color: '#9A7D5E' },
        }
      }
    }
  });
}

// ============================================================
// PONTO DE ENTRADA — inicializa a página
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Verifica admin
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !isAdminUser(session.user)) {
    window.location.href = 'index.html';
    return;
  }

  const params     = new URLSearchParams(window.location.search);
  const patientId  = params.get('patient');
  const patientNome = decodeURIComponent(params.get('nome') || 'Paciente');

  if (!patientId) {
    document.getElementById('rel-mount').innerHTML =
      '<p style="padding:40px;text-align:center;color:var(--sub);font-family:\'DM Sans\',sans-serif;">Paciente não especificado.</p>';
    return;
  }

  // Atualiza elementos da interface
  document.getElementById('rel-nome-sidebar').textContent = patientNome.split(' ')[0];
  document.title = `Relatório — ${patientNome}`;

  // Coleta + analisa + renderiza
  try {
    const dados   = await coletarDadosRelatorio(patientId);
    const analise = analisarDados(dados);
    renderRelatorio(dados, analise, 'rel-mount');

    // Botão de imprimir
    document.getElementById('btn-imprimir')?.addEventListener('click', () => window.print());

    // Botão de ver check-ins
    const btnCheckins = document.getElementById('btn-ver-checkins');
    if (btnCheckins) {
      btnCheckins.href = `admin-checkins.html?patient=${patientId}&nome=${encodeURIComponent(patientNome)}`;
    }

  } catch (err) {
    console.error('[Relatório] Erro:', err);
    document.getElementById('rel-mount').innerHTML =
      `<p style="padding:40px;text-align:center;color:#B33030;font-family:'DM Sans',sans-serif;">Erro ao gerar relatório: ${err.message}</p>`;
  }
});
