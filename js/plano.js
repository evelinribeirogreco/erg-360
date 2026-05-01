// ============================================================
// plano.js — Plano Alimentar ERG 360
// Layout baseado no plano da Helen · Cores ERG
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { exportPlanoPDF } from './plano-pdf-export.js';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Cores ERG para os gráficos
const CORES = {
  ptn:   '#3A5E8B',
  cho:   '#8B5E3C',
  lip:   '#4a7c5f',
  outro: '#ECDCCC',
};

// ── Inicialização ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (!patient) return;

  // Atualiza nome na sidebar e hero
  const nome = patient.nome || 'Paciente';
  setText('nav-paciente', nome.split(' ')[0]);
  setText('nav-nome-completo', nome);
  setText('hero-nome', nome);

  // Busca plano
  const { data: plano } = await supabase
    .from('planos_alimentares')
    .select('*')
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!plano) {
    // Preenche tela Hoje com estado de espera funcional
    const elHoje = document.getElementById('s-hoje');
    if (elHoje) {
      elHoje.innerHTML = `
        <div style="border:1px solid rgba(184,147,106,0.3);padding:20px;margin-bottom:16px;background:var(--bg2);">
          <p style="font-family:'DM Sans',sans-serif;font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--accent);margin-bottom:10px;font-weight:500;">Em elaboração</p>
          <p style="font-family:'Cormorant Garamond',serif;font-weight:300;font-size:1.2rem;color:var(--text);margin-bottom:8px;">Seu plano personalizado está sendo preparado</p>
          <p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--textl);line-height:1.7;margin-bottom:16px;">A Dra. Evelin está elaborando seu plano com base nas suas informações clínicas. Em breve ele estará disponível aqui.</p>
        </div>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--sub);margin-bottom:12px;font-weight:500;">Enquanto isso, siga estas orientações</p>
        ${[
          { titulo: 'Proteína em todas as refeições', desc: 'Ovos, frango, peixe, feijão ou iogurte — sempre' },
          { titulo: 'Beba 2L de água por dia', desc: 'Distribua ao longo do dia — não só nas refeições' },
          { titulo: 'Evite ultraprocessados', desc: 'Produtos com listas longas de ingredientes' },
          { titulo: 'Não pule refeições', desc: 'Café da manhã, almoço e jantar são essenciais' },
        ].map(o => `
          <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid rgba(184,147,106,0.15);align-items:baseline;">
            <span style="color:var(--detail);flex-shrink:0;font-size:0.9rem;">✓</span>
            <div>
              <p style="font-family:'DM Sans',sans-serif;font-size:0.82rem;font-weight:500;color:var(--text);margin-bottom:2px;">${o.titulo}</p>
              <p style="font-family:'DM Sans',sans-serif;font-size:0.75rem;font-weight:300;color:var(--textl);">${o.desc}</p>
            </div>
          </div>`).join('')}
        <a href="checkin.html" style="display:flex;align-items:center;justify-content:space-between;margin-top:20px;padding:14px 16px;background:var(--text);color:var(--bg);text-decoration:none;font-family:'DM Sans',sans-serif;font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;">
          Fazer check-in do dia
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </a>`;
    }
    document.getElementById('s-visao').innerHTML = `
      <div class="alert alert-azul">
        Seu plano alimentar está sendo elaborado pela Dra. Evelin Greco e em breve estará disponível aqui.
      </div>`;
    return;
  }

  renderPlano(plano, nome);
  // Habilita botões de PDF (Visualizar / Baixar)
  const btnVer = document.getElementById('btn-ver-pdf');
  const btnBxr = document.getElementById('btn-baixar-pdf');
  if (btnVer) {
    btnVer.style.display = 'inline-flex';
    btnVer.addEventListener('click', () => exportPlanoPDF(plano, nome, 'preview'));
  }
  if (btnBxr) {
    btnBxr.style.display = 'inline-flex';
    btnBxr.addEventListener('click', () => exportPlanoPDF(plano, nome, 'print'));
  }
});

// ── Renderização principal ────────────────────────────────
function renderPlano(p, nome) {
  // Hero macros
  setText('h-kcal', p.kcal_alvo ? p.kcal_alvo + ' kcal' : '—');
  setText('h-ptn',  p.proteina_g ? p.proteina_g + 'g' : '—');
  setText('h-cho',  p.carboidrato_g ? p.carboidrato_g + 'g' : '—');
  setText('h-lip',  p.lipidio_g ? p.lipidio_g + 'g' : '—');
  setText('h-ref',  p.num_refeicoes || '—');
  if (p.sub_titulo) setText('hero-sub', p.sub_titulo);

  // Destaca card de proteína (prioridade clínica)
  const ptnStat = document.getElementById('h-ptn')?.closest('.hero-stat');
  if (ptnStat) ptnStat.classList.add('destaque');

  renderVisaoGeral(p);
  renderComparativo(p);
  renderDietaAtual(p);
  renderPlanoRefeicoes(p, nome);
  renderSubstituicoes(p);
  renderHidratacao(p, nome);
  renderMicronutrientes(p);
  renderTiming(p, nome);
  renderSuplementacao(p);
  renderCompras(p, nome);
  renderOrientacoes(p, nome);
  renderHoje(p, nome);
}

// ══════════════════════════════════════════════════════════
// CAMADA 1 — HOJE (execução diária)
// ══════════════════════════════════════════════════════════

async function renderHoje(p, nome) {
  const el = document.getElementById('s-hoje');
  if (!el) return;

  // Busca último check-in para personalizar
  const hoje = new Date().toISOString().split('T')[0];
  const { data: checkinHoje } = await supabase
    .from('checkins')
    .select('fome_nivel,energia,sono_qualidade,agua_litros,flags,score_diario,treinou')
    .eq('user_id', (await supabase.auth.getSession()).data.session?.user?.id)
    .eq('data', hoje)
    .maybeSingle();

  // Busca últimos 3 dias para padrão
  const tres = new Date(); tres.setDate(tres.getDate() - 2);
  const { data: recentes } = await supabase
    .from('checkins')
    .select('fome_nivel,energia,agua_litros')
    .eq('user_id', (await supabase.auth.getSession()).data.session?.user?.id)
    .gte('data', tres.toISOString().split('T')[0])
    .order('data', { ascending: false });

  // ── Status do dia ──
  let statusCor = '#3D6B4F', statusLabel = 'Tudo dentro do plano', statusIcon = '●';
  let alertaCheckin = '';

  if (checkinHoje) {
    const fome = checkinHoje.fome_nivel;
    const energia = checkinHoje.energia;
    if (fome >= 4 || energia <= 2) {
      statusCor = '#B8860B'; statusLabel = 'Atenção hoje';
    }
    if (fome >= 4 && energia <= 2) {
      statusCor = '#7A2E2E'; statusLabel = 'Dia difícil — mantenha o plano';
    }

    // Alerta contextual baseado no check-in
    const mediaFome = recentes?.length
      ? recentes.reduce((s,c) => s + (c.fome_nivel||0), 0) / recentes.length : null;

    if (mediaFome >= 4) {
      alertaCheckin = `<div style="border-left:3px solid #B8860B;background:rgba(184,134,11,0.06);padding:12px 14px;margin-bottom:16px;font-family:'DM Sans',sans-serif;font-size:0.78rem;color:#7A5E00;line-height:1.5;">
        Fome elevada nos últimos dias — considere lanche extra à tarde e priorize proteína nas refeições.
      </div>`;
    } else if (energia <= 2) {
      alertaCheckin = `<div style="border-left:3px solid #7A2E2E;background:rgba(122,46,46,0.06);padding:12px 14px;margin-bottom:16px;font-family:'DM Sans',sans-serif;font-size:0.78rem;color:#6B2020;line-height:1.5;">
        Energia baixa hoje — não pule refeições e inclua carboidratos complexos no almoço.
      </div>`;
    }
  } else {
    alertaCheckin = `<a href="checkin.html" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid rgba(184,147,106,0.3);margin-bottom:16px;text-decoration:none;background:var(--bg2);">
      <span style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text);">Fazer check-in de hoje</span>
      <span style="color:var(--detail);font-size:0.8rem;">→</span>
    </a>`;
  }

  // ── Foco do dia ──
  const hidra = p.hidratacao_meta || '2 – 2,5L';
  const focos = [];
  if (checkinHoje?.fome_nivel >= 4) focos.push('Controlar a fome — priorize proteína');
  else if (checkinHoje?.energia <= 2) focos.push('Repor energia — não pule refeições');
  else focos.push('Seguir o plano normalmente');
  if (checkinHoje?.agua_litros < 1.5 || !checkinHoje) focos.push(`Beber ${hidra} de água`);
  if (checkinHoje?.treinou) focos.push('Boa recuperação pós-treino');

  // ── Refeições do dia simplificadas ──
  let refeicoes_html = '';
  if (p.refeicoes && Array.isArray(p.refeicoes)) {
    refeicoes_html = p.refeicoes.map(r => {
      const itens = Array.isArray(r.itens) ? r.itens : [];
      const principal = itens.find(i => i.novo) || itens[0];
      const proteinas = itens.filter(i =>
        i.item?.toLowerCase().match(/frango|peixe|carne|ovo|atum|whey|proteína|feijão|lentilha|grão/)
      );

      return `
        <div style="border:1px solid rgba(184,147,106,0.25);margin-bottom:10px;overflow:hidden;">
          <div style="padding:12px 16px;background:var(--bg2);border-bottom:1px solid rgba(184,147,106,0.2);">
            <p style="font-family:'Cormorant Garamond',serif;font-weight:300;font-size:1rem;color:var(--text);">${r.nome || r.horario || 'Refeição'}</p>
            ${r.horario && r.nome ? `<p style="font-family:'DM Sans',sans-serif;font-size:0.65rem;color:var(--sub);margin-top:1px;">${r.horario}</p>` : ''}
          </div>
          <div style="padding:12px 16px;">
            ${itens.slice(0, 4).map(i => `
              <div style="display:flex;align-items:baseline;gap:8px;padding:4px 0;border-bottom:1px solid rgba(184,147,106,0.08);">
                ${proteinas.includes(i) ? `<span style="width:4px;height:4px;border-radius:50%;background:#3A5E8B;flex-shrink:0;margin-top:6px;"></span>` : `<span style="width:4px;height:4px;border-radius:50%;background:rgba(184,147,106,0.4);flex-shrink:0;margin-top:6px;"></span>`}
                <span style="font-family:'DM Sans',sans-serif;font-size:0.8rem;color:${proteinas.includes(i) ? 'var(--text)' : 'var(--textl)'};font-weight:${proteinas.includes(i) ? '500' : '300'};">${i.item}</span>
                ${i.porcao ? `<span style="font-family:'DM Sans',sans-serif;font-size:0.7rem;color:var(--sub);margin-left:auto;white-space:nowrap;">${i.porcao}</span>` : ''}
              </div>`).join('')}
            ${itens.length > 4 ? `<p style="font-family:'DM Sans',sans-serif;font-size:0.7rem;color:var(--sub);margin-top:6px;">+ ${itens.length - 4} itens — ver plano completo</p>` : ''}
          </div>
        </div>`;
    }).join('');
  } else {
    refeicoes_html = `<p style="font-family:'DM Sans',sans-serif;font-size:0.82rem;color:var(--textl);font-style:italic;">Refeições não cadastradas ainda.</p>`;
  }

  // ── Situações reais ──
  const situacoes = [
    { label: 'Comer fora', acao: 'Priorize proteína + salada. Evite frituras e sobremesa. Comer devagar ajuda.' },
    { label: 'Sem tempo para cozinhar', acao: 'Ovo mexido + fruta + queijo. Simples, rápido e dentro do plano.' },
    { label: 'Muita fome', acao: 'Beba água primeiro. Depois: fruta + proteína. Não fique mais de 4h sem comer.' },
    { label: 'Evento ou saída', acao: 'Coma algo leve antes. No evento, priorize proteínas. Volte ao plano na próxima refeição.' },
  ];

  el.innerHTML = `
    <!-- Status do dia -->
    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border:1px solid rgba(184,147,106,0.25);margin-bottom:16px;background:var(--bg2);">
      <span style="width:8px;height:8px;border-radius:50%;background:${statusCor};flex-shrink:0;"></span>
      <span style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text);">${statusLabel}</span>
      ${checkinHoje?.score_diario != null ? `<span style="margin-left:auto;font-family:'DM Sans',sans-serif;font-size:0.72rem;color:var(--sub);">Score: ${checkinHoje.score_diario}</span>` : ''}
    </div>

    ${alertaCheckin}

    <!-- Foco do dia -->
    <div style="border:1px solid rgba(184,147,106,0.25);padding:14px 16px;margin-bottom:20px;">
      <p style="font-family:'DM Sans',sans-serif;font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--sub);margin-bottom:10px;font-weight:500;">Hoje você deve</p>
      ${focos.map(f => `
        <div style="display:flex;align-items:baseline;gap:10px;padding:4px 0;">
          <span style="color:var(--detail);flex-shrink:0;">✓</span>
          <p style="font-family:'DM Sans',sans-serif;font-size:0.82rem;color:var(--text);line-height:1.4;">${f}</p>
        </div>`).join('')}
    </div>

    <!-- Plano do dia simplificado -->
    <p style="font-family:'DM Sans',sans-serif;font-size:0.62rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--sub);margin-bottom:12px;font-weight:500;">Suas refeições de hoje</p>
    <p style="font-family:'DM Sans',sans-serif;font-size:0.7rem;color:var(--sub);margin-bottom:12px;">
      <span style="display:inline-flex;align-items:center;gap:5px;"><span style="width:8px;height:8px;border-radius:50%;background:#3A5E8B;display:inline-block;"></span> Proteína — prioridade da refeição</span>
    </p>
    ${refeicoes_html}

    <!-- Situações reais -->
    <p style="font-family:'DM Sans',sans-serif;font-size:0.62rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--sub);margin:20px 0 12px;font-weight:500;">Se acontecer isso…</p>
    <div style="display:flex;flex-direction:column;gap:0;border:1px solid rgba(184,147,106,0.25);overflow:hidden;">
      ${situacoes.map(s => `
        <div style="padding:12px 16px;border-bottom:1px solid rgba(184,147,106,0.12);">
          <p style="font-family:'DM Sans',sans-serif;font-size:0.75rem;font-weight:500;color:var(--text);margin-bottom:3px;">${s.label}</p>
          <p style="font-family:'DM Sans',sans-serif;font-size:0.75rem;color:var(--textl);line-height:1.5;font-weight:300;">${s.acao}</p>
        </div>`).join('')}
    </div>
  `;
}

// ── Visão Geral ───────────────────────────────────────────
function renderVisaoGeral(p) {
  const el = document.getElementById('s-visao');
  if (!el) return;
  let html = '';

  if (p.criterio_central) html += `<div class="alert alert-azul"><strong>Critério central:</strong> ${p.criterio_central}</div>`;

  if (p.calculo_vet) {
    html += `<div class="sub-title">Cálculo do VET</div>
    <div class="card"><p style="font-size:.85rem;line-height:1.9;">${p.calculo_vet.replace(/\n/g,'<br>')}</p></div>`;
  }

  if (p.stats_clinicos?.length) {
    html += `<div class="card-grid">
    ${p.stats_clinicos.map(s => `
      <div class="stat-card">
        <div class="sc-label">${s.label}</div>
        <div class="sc-val ${s.cor ? 'sc-'+s.cor : ''}">${s.valor}</div>
        <div class="sc-desc">${s.desc}</div>
      </div>`).join('')}
    </div>`;
  }

  if (p.condicoes_clinicas?.length) {
    html += `<div class="sub-title">Condições clínicas ativas</div>
    <div class="tbl-wrap"><table>
    <thead><tr><th>Condição</th><th>Status</th><th>Impacto na dieta</th></tr></thead>
    <tbody>
    ${p.condicoes_clinicas.map(c => `
      <tr>
        <td class="td-b">${c.nome}</td>
        <td><span class="tag tag-${c.cor||'laranja'}">${c.status}</span></td>
        <td>${c.impacto}</td>
      </tr>`).join('')}
    </tbody></table></div>`;
  }

  el.innerHTML = html || '<p style="font-family:\'DM Sans\',sans-serif;font-size:0.85rem;color:var(--textl);font-style:italic;">Seção em elaboração.</p>';
}

// ── Comparativo ───────────────────────────────────────────
function renderComparativo(p) {
  const el = document.getElementById('s-comp');
  if (!el || !p.comparativo) return;
  const c = p.comparativo;

  // Calcula % de macros para os gráficos
  const ptnG  = p.proteina_g    || 0;
  const choG  = p.carboidrato_g || 0;
  const lipG  = p.lipidio_g     || 0;
  const totalKcal = (ptnG * 4) + (choG * 4) + (lipG * 9);
  const pPtn = totalKcal ? Math.round((ptnG*4/totalKcal)*100) : 30;
  const pCho = totalKcal ? Math.round((choG*4/totalKcal)*100) : 35;
  const pLip = totalKcal ? Math.round((lipG*9/totalKcal)*100) : 35;

  el.innerHTML = `
    ${c.obs ? `<div class="alert alert-amar"><strong>Estimativa da dieta atual:</strong> ${c.obs}</div>` : ''}

    <div class="macro-compare">
      <div class="chart-card">
        <h3>Dieta Atual (Anamnese)</h3>
        <canvas id="chartAtual" width="220" height="220"></canvas>
        <div class="chart-meta" id="chart-atual-meta"></div>
      </div>
      <div class="chart-card">
        <h3>Plano Prescrito</h3>
        <canvas id="chartNovo" width="220" height="220"></canvas>
        <div class="chart-meta">
          <strong>${p.kcal_alvo ? p.kcal_alvo + ' kcal' : '—'}</strong><br>
          Proteína ${pPtn}% · CHO ${pCho}% · Lipídios ${pLip}%
        </div>
      </div>
    </div>

    ${c.diff?.length ? `
    <div class="sub-title">Comparação detalhada — Antes × Depois</div>
    <div style="border:1px solid var(--detail);overflow:hidden;">
      <div class="diff-header">
        <span>Nutriente</span><span>Antes</span><span>Depois</span><span>Variação</span>
      </div>
      ${c.diff.map(row => `
        <div class="diff-row">
          <div class="d-nutriente">${row.nutriente}</div>
          <div class="d-antes">${row.antes}</div>
          <div class="d-depois">${row.depois}</div>
          <div class="d-${row.tipo||'up'}">${row.delta}</div>
        </div>`).join('')}
    </div>` : ''}

    ${c.barras?.length ? `
    <div class="sub-title">Distribuição percentual</div>
    <div class="macro-bars">
      ${c.barras.map(b => `
        <div class="mbar-row">
          <div class="mbar-label">${b.label}</div>
          <div class="mbar-track"><div class="mbar-fill" style="width:${b.pct}%;background:${b.cor||'var(--detail)'}"></div></div>
          <div class="mbar-val">${b.pct}%</div>
        </div>`).join('')}
    </div>` : ''}
  `;

  // Renderiza gráficos de pizza após DOM atualizado
  requestAnimationFrame(() => {
    const PIE_OPTS = {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 11 }, padding: 10 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } }
      }
    };

    // Gráfico atual — estima com base no diff ou usa valores padrão
    const diffAtual = c.diff?.find(d => d.nutriente?.toLowerCase().includes('prot'));
    const ptnAtual = c.ptn_antes_pct || 39;
    const choAtual = c.cho_antes_pct || 24;
    const lipAtual = c.lip_antes_pct || 22;
    const outroAtual = Math.max(0, 100 - ptnAtual - choAtual - lipAtual);

    const atualEl = document.getElementById('chartAtual');
    const novoEl  = document.getElementById('chartNovo');
    if (!atualEl || !novoEl) return;

    new Chart(atualEl, {
      type: 'doughnut',
      data: {
        labels: [`Proteínas (${ptnAtual}%)`,`Carboidratos (${choAtual}%)`,`Lipídios (${lipAtual}%)`,outroAtual > 0 ? `Não contab. (${outroAtual}%)` : null].filter(Boolean),
        datasets: [{
          data: [ptnAtual, choAtual, lipAtual, outroAtual > 0 ? outroAtual : null].filter(v => v),
          backgroundColor: [CORES.ptn, CORES.cho, CORES.lip, CORES.outro].slice(0, outroAtual > 0 ? 4 : 3),
          borderWidth: 2, borderColor: '#F8F4EF'
        }]
      },
      options: PIE_OPTS
    });

    // Atualiza meta do gráfico atual
    const metaAtual = document.getElementById('chart-atual-meta');
    if (metaAtual) metaAtual.innerHTML = `<strong>Estimativa da anamnese</strong><br>Proteína alta · CHO baixo · Gordura insuficiente`;

    new Chart(novoEl, {
      type: 'doughnut',
      data: {
        labels: [`Proteínas (${pPtn}%)`,`Carboidratos (${pCho}%)`,`Lipídios (${pLip}%)`],
        datasets: [{
          data: [pPtn, pCho, pLip],
          backgroundColor: [CORES.ptn, CORES.cho, CORES.lip],
          borderWidth: 2, borderColor: '#F8F4EF'
        }]
      },
      options: PIE_OPTS
    });
  });
}

// ── Dieta Atual ───────────────────────────────────────────
function renderDietaAtual(p) {
  const el = document.getElementById('s-dieta');
  if (!el || !p.dieta_atual) return;
  const d = p.dieta_atual;

  let html = '';
  if (d.refeicoes?.length) {
    html += `<div class="tbl-wrap"><table>
    <thead><tr><th>Refeição</th><th>Consumo relatado</th><th>O que está bom</th><th>Ajustar</th></tr></thead>
    <tbody>
    ${d.refeicoes.map(r => `
      <tr>
        <td class="td-b">${r.nome}</td>
        <td>${r.consumo}</td>
        <td class="td-v">${r.bom||'—'}</td>
        <td class="td-l">${r.ajustar||'—'}</td>
      </tr>`).join('')}
    </tbody></table></div>`;
  }

  if (d.suplementos?.length) {
    html += `<div class="sub-title">Suplementos em uso</div>
    <div class="tbl-wrap"><table>
    <thead><tr><th>Suplemento</th><th>Dose</th><th>Avaliação</th><th>Conduta</th></tr></thead>
    <tbody>
    ${d.suplementos.map(s => `
      <tr>
        <td class="td-b">${s.nome}</td>
        <td>${s.dose}</td>
        <td class="td-${s.cor||'l'}">${s.avaliacao}</td>
        <td><span class="tag tag-${s.tag_cor||'verde'}">${s.conduta}</span></td>
      </tr>`).join('')}
    </tbody></table></div>`;
  }

  if (d.obs) html += `<div class="alert alert-amar">${d.obs}</div>`;
  el.innerHTML = html;
}

// ── Plano Diário ──────────────────────────────────────────
function renderPlanoRefeicoes(p, nome) {
  const el = document.getElementById('s-plano');
  if (!el) return;

  if (p.plano_obs) setText('s-plano-sub', p.plano_obs);

  if (!p.refeicoes?.length) {
    el.innerHTML = '<p style="font-family:\'DM Sans\',sans-serif;font-size:0.85rem;color:var(--textl);font-style:italic;">Refeições em elaboração.</p>';
    return;
  }

  let html = `<div class="meal-grid">`;

  p.refeicoes.forEach(r => {
    const alertHtml = r.alerta
      ? `<div class="alert alert-${r.alerta_cor||'amar'}" style="font-size:.75rem;padding:8px 12px;margin-bottom:10px">${r.alerta}</div>`
      : '';

    const itensHtml = r.itens?.map(item => `
      <div class="meal-item">
        <span class="food ${item.novo ? 'novo' : ''}">
          ${item.novo ? '<span class="novo-star">Novo</span>' : ''}
          ${item.nome}
        </span>
        <span class="qty">${item.qty||''}</span>
      </div>`).join('') || '';

    const macrosHtml = r.macros && Object.values(r.macros).some(v => v) ? `
      <div class="meal-macros">
        ${r.macros.kcal ? `<span class="macro-pill">${r.macros.kcal} kcal</span>` : ''}
        ${r.macros.ptn  ? `<span class="macro-pill">Ptn ${r.macros.ptn}g</span>` : ''}
        ${r.macros.cho  ? `<span class="macro-pill">CHO ${r.macros.cho}g</span>` : ''}
        ${r.macros.lip  ? `<span class="macro-pill">Lip ${r.macros.lip}g</span>` : ''}
        ${r.macros.fibras ? `<span class="macro-pill">Fibras ${r.macros.fibras}g</span>` : ''}
      </div>` : '';

    html += `
      <div class="meal-card">
        <div class="meal-header">
          <h3>${r.nome}</h3>
          <span class="hora">${r.horario||''}</span>
        </div>
        <div class="meal-body">
          ${alertHtml}
          ${itensHtml}
          ${macrosHtml}
        </div>
      </div>`;
  });

  html += `</div>`;
  el.innerHTML = html;
}

// ── Substituições ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════
// CAMADA 2 — SUBSTITUIÇÕES (reformulada)
// ══════════════════════════════════════════════════════════
function renderSubstituicoes(p) {
  const el = document.getElementById('s-subst');
  if (!el || !p.substituicoes?.length) return;

  el.innerHTML = p.substituicoes.map(grupo => `
    <div class="sub-title">${grupo.categoria}</div>
    <div class="tbl-wrap"><table>
    <thead><tr><th>Base</th><th>Substituição 1</th><th>Substituição 2</th></tr></thead>
    <tbody>
    ${grupo.itens?.map(row => `
      <tr>
        <td>${row.base}</td>
        <td>${row.sub1||'—'}</td>
        <td>${row.sub2||'—'}</td>
      </tr>`).join('')}
    </tbody></table></div>`).join('');
}

// ── Hidratação ────────────────────────────────────────────
function renderHidratacao(p, nome) {
  const el = document.getElementById('s-hidra');
  if (!el || !p.hidratacao) return;
  const h = p.hidratacao;

  if (h.meta) setText('s-hidra-sub', `${nome.split(' ')[0]} — ${h.meta}`);

  let html = '';
  if (h.meta) html += `<div class="alert alert-verde"><strong>Meta: ${h.meta}</strong></div>`;

  if (h.timeline?.length) {
    html += `<div class="agua-timeline">
    ${h.timeline.map(item => `
      <div class="agua-item">
        <div class="agua-hora">${item.hora}</div>
        <div class="agua-desc">${item.desc}</div>
        <div class="agua-qty ${item.atencao ? 'agua-atencao' : ''}">${item.qty}</div>
      </div>`).join('')}
    </div>`;
  }

  if (h.restricoes) html += `<div class="alert alert-laranja" style="margin-top:16px"><strong>Atenção:</strong> ${h.restricoes}</div>`;
  el.innerHTML = html;
}

// ── Micronutrientes ───────────────────────────────────────
function renderMicronutrientes(p) {
  const el = document.getElementById('s-micro');
  if (!el || !p.micronutrientes?.length) return;

  el.innerHTML = `<div class="micro-grid">
  ${p.micronutrientes.map(m => `
    <div class="micro-card">
      <div class="mc-name">${m.nome}</div>
      <div class="mc-why">${m.motivo}</div>
      <div class="mc-fonte">${m.fontes}</div>
      <div class="mc-meta ${m.ok ? 'mc-ok' : ''}">${m.meta}</div>
    </div>`).join('')}
  </div>`;
}

// ── Timing ────────────────────────────────────────────────
function renderTiming(p, nome) {
  const el = document.getElementById('s-timing');
  if (!el || !p.timing?.length) return;

  setText('s-timing-sub', `Condutas baseadas nas condições clínicas de ${nome.split(' ')[0]}, aplicadas à dieta que ela já faz.`);

  el.innerHTML = `<div class="timing-grid">
  ${p.timing.map(t => `
    <div class="timing-item">
      <div class="timing-cond">${t.condicao}${t.detalhe ? `<span>${t.detalhe}</span>` : ''}</div>
      <div class="timing-desc">${t.descricao}</div>
    </div>`).join('')}
  </div>`;
}

// ── Suplementação ─────────────────────────────────────────
function renderSuplementacao(p) {
  const el = document.getElementById('s-supl');
  if (!el || !p.suplementacao) return;
  const s = p.suplementacao;

  let html = '';
  if (s.obs) html += `<div class="alert alert-azul">${s.obs}</div>`;

  if (s.itens?.length) {
    html += `<div class="supl-grid">
    ${s.itens.map(item => `
      <div class="supl-card" style="border-left-color:var(--${item.cor||'verde'})">
        <div class="supl-header">
          <div>
            <div class="supl-name">${item.nome}</div>
            <div class="supl-dose">${item.dose}</div>
          </div>
          <span class="tag tag-${item.tag_cor||'verde'}">${item.status}</span>
        </div>
        <div class="supl-hora">${item.horario||''}</div>
        <div class="supl-just">${item.justificativa}</div>
      </div>`).join('')}
    </div>`;
  }

  el.innerHTML = html;
}

// ── Compras ───────────────────────────────────────────────
function renderCompras(p, nome) {
  const el = document.getElementById('s-compras');
  if (!el) return;

  let html = '';
  if (p.lista_compras?.length) {
    html += `<div class="shop-grid">
    ${p.lista_compras.map(cat => `
      <div class="shop-cat">
        <div class="shop-cat-title">${cat.categoria}${cat.sub ? `<span style="font-family:'DM Sans',sans-serif;font-size:0.65rem;color:var(--sub);font-weight:300;display:block;margin-top:2px">${cat.sub}</span>` : ''}</div>
        <div>
        ${cat.itens?.map(item => `
          <div class="shop-item ${item.novo ? 'novo' : ''}">${item.nome}</div>`).join('')}
        </div>
      </div>`).join('')}
    </div>`;
  }

  if (p.compras_evitar) html += `<div class="alert alert-verm"><strong>Evitar:</strong> ${p.compras_evitar}</div>`;
  el.innerHTML = html;
}

// ── Orientações ───────────────────────────────────────────
function renderOrientacoes(p, nome) {
  const el = document.getElementById('s-orient');
  if (!el || !p.orientacoes) return;
  const o = p.orientacoes;
  let html = '';

  if (o.manter?.length) {
    html += `<div class="sub-title" style="color:var(--verde)">O que manter</div>
    <ul class="bul-list">
    ${o.manter.map(item => `<li ${item.destaque?'class="bold"':''}>${item.texto}</li>`).join('')}
    </ul>`;
  }

  if (o.mudar?.length) {
    html += `<div class="sub-title" style="color:var(--laranja)">O que ajustar</div>
    <ul class="bul-list">
    ${o.mudar.map(item => `<li ${item.destaque?'class="bold"':''}>${item.texto}</li>`).join('')}
    </ul>`;
  }

  if (o.atencao?.length) {
    html += `<div class="sub-title" style="color:var(--verm)">Sinais de atenção</div>
    <ul class="bul-list">
    ${o.atencao.map(item => `<li>${item.texto}</li>`).join('')}
    </ul>`;
  }

  if (o.exames?.length) {
    html += `<div class="sub-title">Exames de retorno</div>
    <ul class="bul-list">
    ${o.exames.map(item => `<li>${item.texto}</li>`).join('')}
    </ul>`;
  }

  if (o.rodape) html += `<div class="alert alert-verde" style="margin-top:24px">${o.rodape}</div>`;
  el.innerHTML = html;
}

// ── Utilitário ────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el && val !== null && val !== undefined) el.textContent = val;
}
