// ============================================================
// checkin-resumo.js — Resumo semanal visual da paciente
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  await loadResumo(session.user);
});

async function loadResumo(user) {
  // Últimos 7 dias
  const hoje = new Date();
  const seteDias = new Date(hoje);
  seteDias.setDate(hoje.getDate() - 6);
  const dataInicio = seteDias.toISOString().split('T')[0];
  const dataFim    = hoje.toISOString().split('T')[0];

  // Seta período no header
  document.getElementById('resumo-periodo').textContent =
    seteDias.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' – ' +
    hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', user.id)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: true });

  // Busca nome da paciente
  const { data: patient } = await supabase
    .from('patients')
    .select('nome')
    .eq('user_id', user.id)
    .single();

  const nome = patient?.nome?.split(' ')[0] || 'Você';

  document.getElementById('resumo-loading').style.display = 'none';
  document.getElementById('resumo-content').style.display = '';

  if (!checkins || checkins.length === 0) {
    renderEmpty(nome);
    return;
  }

  // Exibe resumo com qualquer quantidade de check-ins (não precisa esperar 7 dias)
  renderResumo(checkins, nome, dataFim, checkins.length < 7);
}

function renderEmpty(nome) {
  document.getElementById('resumo-greeting').textContent = 'Olá,';
  document.getElementById('resumo-title').textContent = nome;
  document.getElementById('resumo-sub').textContent = 'Nenhum check-in registrado nos últimos 7 dias. Comece agora!';
  document.getElementById('cta-container').innerHTML = `
    <p class="cta-title">Registre como você está hoje</p>
    <button class="cta-btn" onclick="window.location.href='checkin.html'">Fazer check-in agora</button>
  `;
}

function renderResumo(checkins, nome, dataFim, parcial = false) {
  const n = checkins.length;

  // ── Médias ──────────────────────────────────────────────
  const avg = (field) => {
    const vals = checkins.map(c => c[field]).filter(v => v !== null && v !== undefined);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const sonoMedio     = avg('sono_horas');
  const sonoQual      = avg('sono_qualidade');
  const energiaMedia  = avg('energia');
  const humorMedio    = avg('humor');
  const aguaMedia     = avg('agua_litros');
  const fomeMedia     = avg('fome_nivel');
  const treinosDias   = checkins.filter(c => c.treinou).length;
  const evacDias      = checkins.filter(c => c.evacuou).length;

  // ── Score geral (0-10) — tolerante com campos nulos ─────
  let score = 0;
  let scorePesos = 0;

  if (sonoMedio !== null)    { score += Math.min((sonoMedio / 8) * 2, 2);    scorePesos += 2; }
  if (sonoQual !== null)     { score += (sonoQual / 5) * 1.5;                scorePesos += 1.5; }
  if (energiaMedia !== null) { score += (energiaMedia / 5) * 2;              scorePesos += 2; }
  if (humorMedio !== null)   { score += (humorMedio / 5) * 1.5;              scorePesos += 1.5; }
  if (aguaMedia !== null)    { score += Math.min((aguaMedia / 2) * 1.5, 1.5); scorePesos += 1.5; }
  if (n >= 5)                { score += 1.5; scorePesos += 1.5; }

  // Normaliza para 10 apenas se tiver dados suficientes
  if (scorePesos > 0) {
    score = (score / scorePesos) * 10;
  }
  score = Math.min(Math.round(score * 10) / 10, 10);

  // Se dados insuficientes, não exibe score enganoso
  const dadosInsuficientes = scorePesos < 3;

  // ── Saudação ─────────────────────────────────────────────
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia,' : hora < 18 ? 'Boa tarde,' : 'Boa noite,';

  document.getElementById('resumo-greeting').textContent = saudacao;
  document.getElementById('resumo-title').textContent = nome;

  const descricaoSemana = score >= 8 ? 'Semana excelente! Continue assim.'
    : score >= 6 ? 'Boa semana, com espaço para melhorar.'
    : score >= 4 ? 'Semana regular. Vamos focar nos pontos abaixo.'
    : 'Semana desafiadora. Pequenas mudanças fazem diferença.';

  document.getElementById('resumo-sub').textContent = `${n} check-in${n > 1 ? 's' : ''} registrado${n > 1 ? 's' : ''} esta semana. ${descricaoSemana}`;

  // ── Score em 0-100 (converte de 0-10) ───────────────────
  const score100 = Math.round(score * 10);
  const scoreFinal = score100;

  if (dadosInsuficientes) {
    document.getElementById('score-num').textContent = '—';
    document.getElementById('score-desc').textContent = 'Complete mais check-ins para calcular seu score.';
  } else {
    document.getElementById('score-num').textContent = scoreFinal;
    const classeScore = scoreFinal >= 80 ? 'Ótimo' : scoreFinal >= 60 ? 'Bom' : scoreFinal >= 40 ? 'Regular' : 'Crítico';
    document.getElementById('score-desc').textContent = classeScore + ' — ' + descricaoSemana;
  }

  // ── Tendências ────────────────────────────────────────────
  renderTendencias({ sonoMedio, sonoQual, energiaMedia, fomeMedia, aguaMedia, treinosDias, n });

  // ── Diagnóstico e ação ────────────────────────────────────
  renderDiagnostico({ sonoMedio, sonoQual, energiaMedia, fomeMedia, aguaMedia, n });
  document.getElementById('score-title').textContent = 'Score da semana';

  // ── Métricas ─────────────────────────────────────────────
  setMetric('rm-sono', sonoMedio ? sonoMedio.toFixed(1) + 'h' : '—',
    sonoMedio === null ? '' : sonoMedio >= 7 ? 'Ótimo' : sonoMedio >= 6 ? 'Adequado' : 'Insuficiente',
    sonoMedio === null ? '' : sonoMedio >= 7 ? 'rm-good' : sonoMedio >= 6 ? '' : 'rm-bad');

  setMetric('rm-intestino', evacDias + '/' + n,
    evacDias >= n * 0.8 ? 'Regular' : 'Atenção',
    evacDias >= n * 0.8 ? 'rm-good' : 'rm-warn');

  setMetric('rm-agua', aguaMedia ? aguaMedia.toFixed(1) + 'L' : '—',
    aguaMedia === null ? '' : aguaMedia >= 2 ? 'Ótima' : aguaMedia >= 1.5 ? 'Adequada' : 'Baixa',
    aguaMedia === null ? '' : aguaMedia >= 2 ? 'rm-good' : aguaMedia >= 1.5 ? '' : 'rm-warn');

  setMetric('rm-treino', treinosDias + 'x',
    treinosDias >= 4 ? 'Consistente' : treinosDias >= 2 ? 'Moderado' : 'Baixo',
    treinosDias >= 4 ? 'rm-good' : treinosDias >= 2 ? '' : 'rm-warn');

  setMetric('rm-energia', energiaMedia ? energiaMedia.toFixed(1) + '/5' : '—',
    energiaMedia === null ? '' : energiaMedia >= 4 ? 'Alta' : energiaMedia >= 3 ? 'Normal' : 'Baixa',
    energiaMedia === null ? '' : energiaMedia >= 4 ? 'rm-good' : energiaMedia >= 3 ? '' : 'rm-bad');

  setMetric('rm-humor', humorMedio ? humorMedio.toFixed(1) + '/5' : '—',
    humorMedio >= 4 ? 'Ótimo' : humorMedio >= 3 ? 'Estável' : 'Irregular',
    humorMedio >= 4 ? 'rm-good' : humorMedio >= 3 ? '' : 'rm-warn');

  // ── Aviso de poucos dados ────────────────────────────────
  if (n < 3) {
    const chartCards = document.querySelectorAll('.resumo-chart-card');
    chartCards.forEach(c => {
      c.innerHTML = `
        <p class="resumo-section-title">${c.querySelector('.resumo-section-title')?.textContent || 'Gráfico'}</p>
        <p style="font-family:'Jost',sans-serif;font-weight:300;font-size:0.82rem;color:var(--text-light);font-style:italic;padding:16px 0;">
          Os gráficos aparecem a partir de 3 check-ins registrados. Você tem ${n} até agora.
        </p>
      `;
    });
    renderDicas(gerarDicasSemanais({ sonoMedio, sonoQual, aguaMedia, evacDias, n, energiaMedia, fomeMedia, treinosDias }));
    const hoje = new Date().toISOString().split('T')[0];
    const fezHoje = checkins.some(c => c.data === hoje);
    document.getElementById('cta-container').innerHTML = fezHoje
      ? '<p class="cta-title" style="font-style:italic;">Check-in de hoje concluído</p>'
      : '<p class="cta-title">Continue registrando para ver sua evolução</p><button class="cta-btn" onclick="window.location.href='checkin.html'">Fazer check-in agora</button>';
    return;
  }

  // ── Gráficos ─────────────────────────────────────────────
  const labels = checkins.map(c => {
    const d = new Date(c.data + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { weekday: 'short' });
  });

  Chart.defaults.font.family = "'Jost', sans-serif";
  Chart.defaults.font.weight = '300';
  Chart.defaults.color       = '#9A7D5E';

  // Energia e humor
  new Chart(document.getElementById('chart-semana'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Energia',
          data: checkins.map(c => c.energia),
          borderColor: '#C9A882',
          backgroundColor: 'rgba(201,168,130,0.08)',
          borderWidth: 1.5,
          pointRadius: 4,
          pointBackgroundColor: '#C9A882',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Humor',
          data: checkins.map(c => c.humor),
          borderColor: '#9A7D5E',
          backgroundColor: 'rgba(154,125,94,0.06)',
          borderWidth: 1.5,
          pointRadius: 4,
          pointBackgroundColor: '#9A7D5E',
          tension: 0.3,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: 'rgba(201,168,130,0.15)' } },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 8 } }
      }
    }
  });

  // Sono
  new Chart(document.getElementById('chart-sono'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Horas de sono',
        data: checkins.map(c => c.sono_horas),
        backgroundColor: checkins.map(c =>
          c.sono_horas >= 7 ? 'rgba(74,124,95,0.5)' :
          c.sono_horas >= 6 ? 'rgba(201,168,130,0.5)' :
          'rgba(139,58,58,0.4)'
        ),
        borderColor: checkins.map(c =>
          c.sono_horas >= 7 ? '#4a7c5f' :
          c.sono_horas >= 6 ? '#C9A882' : '#8B3A3A'
        ),
        borderWidth: 1,
        borderRadius: 2,
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { min: 0, max: 10, ticks: { callback: v => v + 'h' }, grid: { color: 'rgba(201,168,130,0.15)' } },
        x: { grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });

  // ── Dicas semanais ───────────────────────────────────────
  const dicas = gerarDicasSemanais({ sonoMedio, sonoQual, aguaMedia, evacDias, n, energiaMedia, fomeMedia, treinosDias });
  renderDicas(dicas);

  // ── CTA check-in ─────────────────────────────────────────
  const hoje = new Date().toISOString().split('T')[0];
  const fezHoje = checkins.some(c => c.data === hoje);
  document.getElementById('cta-container').innerHTML = fezHoje
    ? `<p class="cta-title" style="font-style:italic;">Check-in de hoje concluído</p>`
    : `<p class="cta-title">Registre como você está hoje</p>
       <button class="cta-btn" onclick="window.location.href='checkin.html'">Fazer check-in agora</button>`;
}

function setMetric(id, valor, sub, classSub) {
  const el = document.getElementById(id);
  const subEl = document.getElementById(id + '-sub');
  if (el) el.textContent = valor;
  if (subEl) { subEl.textContent = sub; if (classSub) subEl.classList.add(classSub); }
}

function gerarDicasSemanais({ sonoMedio, sonoQual, aguaMedia, evacDias, n, energiaMedia, fomeMedia, treinosDias }) {
  const dicas = [];

  if (sonoMedio !== null && sonoMedio < 6.5) {
    dicas.push({
      titulo: 'Sono',
      texto: `Sua média de sono esta semana foi de ${sonoMedio.toFixed(1)}h — abaixo do ideal. Sono insuficiente aumenta o cortisol, dificulta a perda de gordura e aumenta a fome. Tente dormir e acordar no mesmo horário todos os dias.`
    });
  }

  if (aguaMedia !== null && aguaMedia < 1.8) {
    dicas.push({
      titulo: 'Hidratação',
      texto: `Você bebeu em média ${aguaMedia.toFixed(1)}L de água por dia. O ideal é entre 2 e 2,5L. Deixe uma garrafa sempre visível e beba um copo ao acordar antes do café.`
    });
  }

  if (evacDias < n * 0.7) {
    dicas.push({
      titulo: 'Trânsito Intestinal',
      texto: `Você evacuou em ${evacDias} de ${n} dias registrados. Inclua mais fibras (verduras, aveia, linhaça) e certifique-se de beber água suficiente para regular o intestino.`
    });
  }

  if (energiaMedia !== null && energiaMedia < 3) {
    dicas.push({
      titulo: 'Energia',
      texto: `Sua energia esteve baixa esta semana. Verifique se está pulando refeições ou consumindo poucos carboidratos. A energia adequada é fundamental para adesão ao plano.`
    });
  }

  if (fomeMedia !== null && fomeMedia >= 3) {
    dicas.push({
      titulo: 'Fome Elevada',
      texto: `Você registrou fome elevada com frequência. Certifique-se de incluir proteínas em todas as refeições — elas são o principal nutriente saciante.`
    });
  }

  if (treinosDias === 0) {
    dicas.push({
      titulo: 'Atividade Física',
      texto: `Nenhum treino registrado esta semana. A atividade física potencializa os resultados do plano nutricional. Comece com algo leve — mesmo uma caminhada de 30 minutos já faz diferença.`
    });
  }

  return dicas.slice(0, 3);
}

function renderDicas(dicas) {
  const container = document.getElementById('resumo-dicas');
  if (!container || dicas.length === 0) return;

  container.innerHTML = `
    <p class="resumo-section-title" style="padding: 0 0 16px;">Recomendações da semana</p>
    ${dicas.map(d => `
      <div class="resumo-dica-item">
        <p class="resumo-dica-titulo">${d.titulo}</p>
        <p class="resumo-dica-texto">${d.texto}</p>
      </div>
    `).join('')}
  `;
}


// ── Tendências da semana ──────────────────────────────────
function renderTendencias({ sonoMedio, sonoQual, energiaMedia, fomeMedia, aguaMedia, treinosDias, n }) {
  const container = document.getElementById('tendencias-container');
  if (!container) return;

  const items = [];

  const tendencia = (val, bom, medio, invertido = false) => {
    if (val === null) return null;
    const alto = invertido ? val <= bom : val >= bom;
    const ok   = invertido ? val <= medio : val >= medio;
    return { seta: alto ? '↑' : ok ? '→' : '↓', cor: alto ? '#3D6B4F' : ok ? '#B8860B' : '#7A2E2E' };
  };

  if (energiaMedia !== null) {
    const t = tendencia(energiaMedia, 3.5, 2.5);
    items.push({ label: 'Energia', val: energiaMedia.toFixed(1) + '/5', ...t });
  }
  if (sonoQual !== null) {
    const t = tendencia(sonoQual, 3.5, 2.5);
    items.push({ label: 'Sono', val: sonoQual.toFixed(1) + '/5', ...t });
  }
  if (fomeMedia !== null) {
    const t = tendencia(fomeMedia, 4, 3.5, true); // invertido: fome alta = ruim
    const corFome = fomeMedia >= 4 ? '#7A2E2E' : fomeMedia >= 3 ? '#B8860B' : '#3D6B4F';
    items.push({ label: 'Fome', val: fomeMedia.toFixed(1) + '/5', seta: fomeMedia >= 4 ? '↑' : fomeMedia <= 2 ? '↓' : '→', cor: corFome });
  }
  if (aguaMedia !== null) {
    const t = tendencia(aguaMedia, 2, 1.5);
    items.push({ label: 'Hidratação', val: aguaMedia.toFixed(1) + 'L', ...t });
  }
  items.push({ label: 'Check-ins', val: n + ' dias', seta: n >= 5 ? '↑' : n >= 3 ? '→' : '↓', cor: n >= 5 ? '#3D6B4F' : n >= 3 ? '#B8860B' : '#7A2E2E' });

  if (!items.length) { container.style.display = 'none'; return; }

  container.innerHTML = `
    <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--subtitle);margin-bottom:12px;font-weight:500;">Tendências desta semana</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:1px;background:var(--detail);border:1px solid var(--detail);">
      ${items.map(i => `
        <div style="background:var(--bg-primary);padding:14px 12px;text-align:center;">
          <p style="font-family:'DM Sans',sans-serif;font-size:1.1rem;font-weight:400;color:${i.cor};margin-bottom:3px;">${i.seta} ${i.val}</p>
          <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--subtitle);">${i.label}</p>
        </div>`).join('')}
    </div>`;
}

// ── Diagnóstico + ação ────────────────────────────────────
function renderDiagnostico({ sonoMedio, sonoQual, energiaMedia, fomeMedia, aguaMedia, n }) {
  const container = document.getElementById('diagnostico-semana');
  if (!container) return;

  const problemas = [];
  const acoes     = [];

  if (fomeMedia !== null && fomeMedia >= 4) {
    problemas.push('Fome elevada durante a semana');
    acoes.push('Inclua proteína em todas as refeições e não pule lanches');
  }
  if (sonoQual !== null && sonoQual <= 2.5) {
    problemas.push('Qualidade do sono abaixo do ideal');
    acoes.push('Priorize rotina noturna — desligue telas 30min antes de dormir');
  }
  if (sonoMedio !== null && sonoMedio < 6) {
    problemas.push('Horas de sono insuficientes');
    acoes.push('Tente dormir 30min mais cedo esta semana');
  }
  if (energiaMedia !== null && energiaMedia <= 2) {
    problemas.push('Energia baixa de forma recorrente');
    acoes.push('Verifique se está pulando refeições ou em déficit excessivo');
  }
  if (aguaMedia !== null && aguaMedia < 1.5) {
    problemas.push('Hidratação insuficiente na maior parte dos dias');
    acoes.push('Deixe uma garrafa de água visível durante o dia');
  }

  if (!problemas.length && n >= 3) {
    container.innerHTML = `
      <div style="border-left:3px solid #3D6B4F;background:rgba(61,107,79,0.06);padding:14px 16px;">
        <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.78rem;color:#2E5E3A;margin-bottom:4px;">Boa aderência esta semana</p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.75rem;color:var(--text-light);line-height:1.5;">Continue com o plano. A consistência é o fator mais importante.</p>
      </div>`;
    return;
  }

  if (!problemas.length) { container.style.display = 'none'; return; }

  container.innerHTML = `
    <div style="border:1px solid var(--detail);overflow:hidden;margin-top:16px;">
      <div style="background:var(--bg-secondary);padding:12px 16px;border-bottom:1px solid rgba(184,147,106,0.2);">
        <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--subtitle);">Diagnóstico da semana</p>
      </div>
      <div style="padding:16px;">
        ${problemas.map(p => `
          <div style="display:flex;gap:10px;align-items:baseline;padding:6px 0;border-bottom:1px solid rgba(184,147,106,0.1);">
            <span style="color:#B8860B;font-size:0.8rem;flex-shrink:0;">→</span>
            <p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text);line-height:1.4;">${p}</p>
          </div>`).join('')}
      </div>
      <div style="background:rgba(61,107,79,0.04);padding:12px 16px;border-top:1px solid rgba(184,147,106,0.2);">
        <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;color:#2E5E3A;margin-bottom:8px;">Ações para esta semana</p>
        ${acoes.map(a => `
          <div style="display:flex;gap:10px;align-items:baseline;padding:4px 0;">
            <span style="color:#3D6B4F;font-size:0.8rem;flex-shrink:0;">✓</span>
            <p style="font-family:'DM Sans',sans-serif;font-size:0.75rem;color:var(--text-light);line-height:1.4;">${a}</p>
          </div>`).join('')}
      </div>
    </div>`;
}
