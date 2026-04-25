// ============================================================
// fases.js — Mapa de progresso e plano de fases da paciente
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  const { data: patient } = await supabase
    .from('patients')
    .select('id, nome')
    .eq('user_id', session.user.id)
    .single();

  const { data: fases } = await supabase
    .from('fases')
    .select('*')
    .eq('user_id', session.user.id)
    .order('ordem', { ascending: true });

  document.getElementById('fases-loading').style.display = 'none';
  document.getElementById('fases-content').style.display = '';

  renderFases(fases || [], patient?.nome?.split(' ')[0] || 'você');
});

function renderFases(fases, nome) {
  const container = document.getElementById('fases-content');

  if (fases.length === 0) {
    container.innerHTML = `
      <div class="fases-hero">
        <p class="fases-hero-label">Plano de tratamento</p>
        <h1 class="fases-hero-title">Seu plano</h1>
        <p class="fases-hero-sub">Seu plano de fases ainda está sendo elaborado pela Dra. Evelin. Em breve aparecerá aqui.</p>
      </div>
      <div class="fases-empty">
        <p>Aguarde — seu plano personalizado<br>está sendo preparado com cuidado.</p>
      </div>
    `;
    return;
  }

  const faseAtiva    = fases.find(f => f.status === 'ativa');
  const faseSeguinte = faseAtiva ? fases.find(f => f.ordem === faseAtiva.ordem + 1) : null;

  container.innerHTML = `
    <div class="fases-hero">
      <p class="fases-hero-label">Plano de tratamento</p>
      <h1 class="fases-hero-title">Seu plano, ${nome}</h1>
      <p class="fases-hero-sub">Cada fase foi desenhada especialmente para você. Clique em cada etapa para ver os detalhes.</p>
    </div>

    ${faseAtiva ? `
    <div class="voce-aqui">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="flex-shrink:0;color:var(--detail)"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <div class="voce-aqui-texto">
        <p class="voce-aqui-label">Você está aqui</p>
        <p class="voce-aqui-fase">${faseAtiva.nome}</p>
        ${faseSeguinte ? `<p class="voce-aqui-prox">Próxima fase: ${faseSeguinte.nome}</p>` : '<p class="voce-aqui-prox">Última fase do plano</p>'}
      </div>
    </div>` : ''}

    <div class="fases-mapa">
      <p class="fases-mapa-title">Mapa de progresso</p>
      <div class="fases-timeline">
        ${fases.map(f => renderFaseItem(f)).join('')}
      </div>
    </div>
  `;
}

function renderFaseItem(f) {
  const statusClass = f.status === 'ativa' ? 'ativa' : f.status === 'concluida' ? 'concluida' : 'pendente';
  const badgeClass  = `badge-${f.status}`;
  const badgeLabel  = f.status === 'ativa' ? 'Em andamento' : f.status === 'concluida' ? 'Concluída' : 'Em breve';

  const datas = f.data_inicio && f.data_fim
    ? `${formatDate(f.data_inicio)} – ${formatDate(f.data_fim)}`
    : f.duracao_semanas ? `${f.duracao_semanas} semanas` : '';

  const dicas = Array.isArray(f.dicas) ? f.dicas : (f.dicas ? [f.dicas] : []);
  const restricoes = Array.isArray(f.restricoes) ? f.restricoes : [];
  const permitidos = Array.isArray(f.permitidos) ? f.permitidos : [];

  return `
    <div class="fase-item ${statusClass}" onclick="toggleFase('fase-${f.id}')">
      <div class="fase-dot">
        <span class="fase-dot-num">${f.status === 'concluida' ? '✓' : f.ordem}</span>
      </div>
      <div class="fase-content">
        <span class="fase-status-badge ${badgeClass}">${badgeLabel}</span>
        <p class="fase-nome">${f.nome}</p>
        <p class="fase-objetivo">${f.objetivo || ''}</p>
        ${datas ? `<p class="fase-duracao">${datas}</p>` : ''}

        <!-- Detalhe expansível -->
        <div class="fase-detalhe" id="fase-${f.id}">
          ${f.descricao ? `
          <div class="fase-detalhe-secao">
            <p class="fase-detalhe-label">Sobre esta fase</p>
            <p class="fase-detalhe-texto">${f.descricao}</p>
          </div>` : ''}

          ${f.calorias_alvo ? `
          <div class="fase-detalhe-secao">
            <p class="fase-detalhe-label">Metas nutricionais</p>
            <p class="fase-detalhe-texto">
              ${f.calorias_alvo ? `${f.calorias_alvo} kcal/dia` : ''}
              ${f.proteina_alvo ? ` · Proteína: ${f.proteina_alvo}g` : ''}
              ${f.carboidrato_alvo ? ` · Carboidratos: ${f.carboidrato_alvo}g` : ''}
              ${f.gordura_alvo ? ` · Gorduras: ${f.gordura_alvo}g` : ''}
            </p>
          </div>` : ''}

          ${restricoes.length ? `
          <div class="fase-detalhe-secao">
            <p class="fase-detalhe-label">Evitar nesta fase</p>
            <p class="fase-detalhe-texto">${restricoes.join(', ')}</p>
          </div>` : ''}

          ${permitidos.length ? `
          <div class="fase-detalhe-secao">
            <p class="fase-detalhe-label">Alimentos liberados</p>
            <p class="fase-detalhe-texto">${permitidos.join(', ')}</p>
          </div>` : ''}

          ${dicas.length ? `
          <div class="fase-detalhe-secao">
            <p class="fase-detalhe-label">Dicas desta fase</p>
            <ul class="fase-dicas-list">
              ${dicas.map(d => `<li>${d}</li>`).join('')}
            </ul>
          </div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function toggleFase(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('open');
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

window.toggleFase = toggleFase;
