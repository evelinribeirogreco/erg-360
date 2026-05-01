// ============================================================
// ERG 360 — plano-extras.js (paciente)
// 3 features: marcar refeição feita, próxima refeição, share lista
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

let userId = null;
let patientId = null;
let refeicoesPlano = [];   // {nome, horario, alimentos[]}
let marcadasHoje = {};     // { 'Café da manhã': true, ... }

// ════════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ════════════════════════════════════════════════════════════
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  userId = session.user.id;
  const { data: p } = await supabase
    .from('patients')
    .select('id, plano_url')
    .eq('user_id', userId)
    .single();
  if (!p) return;
  patientId = p.id;

  // Aguarda 1.5s pro plano renderizar (depende do JS principal)
  setTimeout(async () => {
    await carregarMarcadasHoje();
    await detectarRefeicoesNoDOM();
    injetarUIRefeicoes();
    injetarProximaRefeicao();
    injetarBotaoCompartilharLista();
  }, 1500);
}

// ════════════════════════════════════════════════════════════
// #25 MARCAR REFEIÇÃO FEITA
// ════════════════════════════════════════════════════════════

async function carregarMarcadasHoje() {
  const hoje = new Date().toISOString().split('T')[0];
  try {
    const { data } = await supabase
      .from('refeicoes_marcadas')
      .select('refeicao_nome, feita')
      .eq('patient_id', patientId)
      .eq('data', hoje);
    if (data) {
      data.forEach(r => { marcadasHoje[r.refeicao_nome] = r.feita; });
    }
  } catch (_) {}
}

async function detectarRefeicoesNoDOM() {
  // Tenta encontrar refeições pelo padrão das classes do plano-paciente / plano.html
  refeicoesPlano = [];
  // Padrão 1: blocos com classe refeicao-block
  document.querySelectorAll('.refeicao-block, [data-ref-nome]').forEach(el => {
    const nome    = el.dataset.refNome || el.querySelector('.ref-title, .refeicao-titulo, h3')?.textContent?.trim();
    const horario = el.dataset.refHorario || el.querySelector('.ref-horario, .ref-time')?.textContent?.trim();
    if (nome) refeicoesPlano.push({ nome, horario, el });
  });
  // Padrão 2: tabs de refeição em plano-paciente.html
  document.querySelectorAll('.tab[data-ref]').forEach(t => {
    const nome = t.textContent?.trim();
    if (nome && !refeicoesPlano.find(r => r.nome === nome)) {
      refeicoesPlano.push({ nome, horario: null, el: t });
    }
  });
}

function injetarUIRefeicoes() {
  refeicoesPlano.forEach(({ nome, el }) => {
    if (!el || el.querySelector('.ci-marcar-feita')) return;
    const wrap = document.createElement('div');
    wrap.className = 'ci-marcar-feita';
    wrap.style.cssText = `
      display:flex;align-items:center;gap:8px;margin:10px 0;padding:10px 14px;
      background:rgba(76,184,160,0.06);border:1px solid rgba(76,184,160,0.25);
      border-radius:8px;font-family:'DM Sans','Outfit',sans-serif;
    `;
    const isMarcada = marcadasHoje[nome] === true;
    wrap.innerHTML = `
      <input type="checkbox" id="chk-feita-${slug(nome)}" ${isMarcada ? 'checked' : ''}
        style="width:18px;height:18px;cursor:pointer;accent-color:#2D6A56;">
      <label for="chk-feita-${slug(nome)}" style="font-size:0.84rem;color:#1A1A16;cursor:pointer;flex:1;">
        ${isMarcada ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg> Refeição realizada' : 'Marcar como realizada'}
      </label>
      <span class="ci-marcar-status" style="font-size:0.7rem;color:#6B6659;"></span>
    `;
    el.appendChild(wrap);
    const chk = wrap.querySelector('input');
    chk.addEventListener('change', async () => {
      const status = wrap.querySelector('.ci-marcar-status');
      const label  = wrap.querySelector('label');
      if (status) status.textContent = 'Salvando...';
      const ok = await marcarRefeicao(nome, chk.checked);
      if (ok) {
        if (status) status.textContent = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg>';
        if (label)  label.textContent = chk.checked ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg> Refeição realizada' : 'Marcar como realizada';
        marcadasHoje[nome] = chk.checked;
        setTimeout(() => { if (status) status.textContent = ''; }, 2000);
      } else {
        if (status) status.textContent = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> erro ao salvar';
        chk.checked = !chk.checked;
      }
    });
  });
}

async function marcarRefeicao(refeicaoNome, feita) {
  const hoje = new Date().toISOString().split('T')[0];
  try {
    const { error } = await supabase
      .from('refeicoes_marcadas')
      .upsert({
        patient_id: patientId,
        user_id: userId,
        data: hoje,
        refeicao_nome: refeicaoNome,
        feita,
      }, { onConflict: 'patient_id,data,refeicao_nome' });
    if (error) {
      console.error('[plano-extras] erro marcar refeição:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[plano-extras] erro:', e);
    return false;
  }
}

function slug(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ════════════════════════════════════════════════════════════
// #27 PRÓXIMA REFEIÇÃO EM DESTAQUE
// ════════════════════════════════════════════════════════════

function parseHorario(horarioStr) {
  // '07h00' / '07:00' / '7h' / '7' -> Date hoje com essa hora
  if (!horarioStr) return null;
  const m = horarioStr.match(/(\d{1,2})[h:](\d{0,2})/i);
  if (!m) return null;
  const h = parseInt(m[1]);
  const min = parseInt(m[2] || '0');
  if (isNaN(h) || h < 0 || h > 23) return null;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d;
}

function calcularProximaRefeicao() {
  const agora = new Date();
  const candidatas = refeicoesPlano
    .map(r => ({ ...r, dt: parseHorario(r.horario) }))
    .filter(r => r.dt)
    .sort((a, b) => a.dt - b.dt);
  if (!candidatas.length) return null;
  // Próxima depois de agora
  const proxima = candidatas.find(r => r.dt > agora);
  if (proxima) return proxima;
  // Se passou todas, próxima é a primeira amanhã
  const primeira = candidatas[0];
  primeira.dt.setDate(primeira.dt.getDate() + 1);
  primeira._eAmanha = true;
  return primeira;
}

function formatarTempoRestante(dt) {
  const ms = dt - new Date();
  if (ms < 0) return 'agora';
  const minutos = Math.round(ms / 60000);
  if (minutos < 60) return `em ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas < 24) return `em ${horas}h${mins > 0 ? mins.toString().padStart(2,'0') : ''}`;
  return `amanhã às ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function injetarProximaRefeicao() {
  if (!refeicoesPlano.length) return;
  const proxima = calcularProximaRefeicao();
  if (!proxima) return;

  let banner = $('proxima-refeicao-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'proxima-refeicao-banner';
    banner.style.cssText = `
      position:sticky;top:0;z-index:90;background:linear-gradient(135deg,#2D6A56 0%,#4CB8A0 100%);
      color:#fff;padding:14px 20px;font-family:'DM Sans','Outfit',sans-serif;
      box-shadow:0 2px 12px rgba(0,0,0,0.12);
    `;
    // Insere antes do main ou no início do body
    const main = document.querySelector('main');
    if (main && main.parentElement) {
      main.parentElement.insertBefore(banner, main);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }
  const horarioFmt = proxima.dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const tempo = formatarTempoRestante(proxima.dt);
  const isProxima = !proxima._eAmanha && (proxima.dt - new Date()) < 60 * 60 * 1000; // < 1h
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:200px;">
        <span style="font-size:1.4rem;line-height:1;">${isProxima ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M3 2v7c0 1.1.9 2 2 2h2v11"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/></svg>'}</span>
        <div>
          <p style="margin:0;font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;opacity:0.85;">
            Próxima refeição ${tempo}
          </p>
          <p style="margin:2px 0 0;font-family:'Cormorant Garamond',serif;font-weight:400;font-size:1.2rem;line-height:1.1;">
            ${escapeHtml(proxima.nome)} <span style="opacity:0.7;font-size:0.85rem;">${horarioFmt}</span>
          </p>
        </div>
      </div>
      <button onclick="document.getElementById('proxima-refeicao-banner').style.display='none'"
        style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;
               width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:0.85rem;line-height:1;"
        title="Ocultar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
  `;
  // Atualiza a cada minuto
  if (!window._proximaRefeicaoTimer) {
    window._proximaRefeicaoTimer = setInterval(injetarProximaRefeicao, 60000);
  }
}

// ════════════════════════════════════════════════════════════
// #30 COMPARTILHAR LISTA DE COMPRAS VIA WHATSAPP
// ════════════════════════════════════════════════════════════

function extrairListaCompras() {
  // Tenta achar a seção/elemento de lista de compras
  const candidatos = [
    '#s-compras', '#compras', '.lista-compras', '[data-secao="compras"]',
    'section#compras', 'section[id*="compras"]'
  ];
  let container = null;
  for (const sel of candidatos) {
    container = document.querySelector(sel);
    if (container) break;
  }
  if (!container) return null;

  // Extrai itens (procura por categorias e itens)
  const categorias = [];
  // Padrão 1: divs com h3/h4 + ul ou divs filhos
  const titulos = container.querySelectorAll('h3, h4, .compras-cat-titulo, .lista-cat');
  if (titulos.length) {
    titulos.forEach(t => {
      const nome = t.textContent?.trim();
      if (!nome) return;
      const itens = [];
      let nx = t.nextElementSibling;
      while (nx && !['H3','H4'].includes(nx.tagName) && !nx.matches('.compras-cat-titulo, .lista-cat')) {
        nx.querySelectorAll('li, .compras-item, [data-compras-item]').forEach(i => {
          const txt = i.textContent?.trim();
          if (txt) itens.push(txt);
        });
        nx = nx.nextElementSibling;
      }
      if (itens.length) categorias.push({ nome, itens });
    });
  }
  // Fallback: lista plana
  if (!categorias.length) {
    const itens = [];
    container.querySelectorAll('li, .compras-item').forEach(i => {
      const txt = i.textContent?.trim();
      if (txt) itens.push(txt);
    });
    if (itens.length) categorias.push({ nome: 'Lista', itens });
  }
  return categorias.length ? categorias : null;
}

function montarTextoWhatsApp(categorias, dataAtual) {
  const linhas = [];
  linhas.push(`🛒 *Lista de Compras — ${dataAtual}*`);
  linhas.push('');
  categorias.forEach(cat => {
    linhas.push(`*${cat.nome}*`);
    cat.itens.forEach(item => linhas.push(`• ${item}`));
    linhas.push('');
  });
  linhas.push('_Plano Alimentar — Dra. Evelin Ribeiro Greco_');
  return linhas.join('\n');
}

window.compartilharListaWhatsApp = function() {
  const cats = extrairListaCompras();
  if (!cats) {
    alert('Não foi possível encontrar a lista de compras nesta página.');
    return;
  }
  const data = new Date().toLocaleDateString('pt-BR');
  const texto = montarTextoWhatsApp(cats, data);
  // Web Share API se disponível (mobile)
  if (navigator.share) {
    navigator.share({ title: 'Lista de Compras', text: texto })
      .catch(err => {
        if (err.name !== 'AbortError') _abrirWhatsAppLink(texto);
      });
  } else {
    _abrirWhatsAppLink(texto);
  }
};

function _abrirWhatsAppLink(texto) {
  const url = 'https://wa.me/?text=' + encodeURIComponent(texto);
  window.open(url, '_blank');
}

function injetarBotaoCompartilharLista() {
  // Procura container da lista de compras
  const cats = extrairListaCompras();
  if (!cats) return;
  const candidatos = ['#s-compras', '#compras', 'section#compras', 'section[id*="compras"]'];
  let container = null;
  for (const sel of candidatos) {
    container = document.querySelector(sel);
    if (container) break;
  }
  if (!container || $('btn-compartilhar-lista')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'btn-compartilhar-lista';
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      style="vertical-align:-2px;margin-right:5px;">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
    Compartilhar lista pelo WhatsApp
  `;
  btn.style.cssText = `
    display:inline-flex;align-items:center;justify-content:center;
    margin:10px 0;padding:10px 18px;background:#25D366;color:#fff;
    border:none;border-radius:6px;cursor:pointer;
    font-family:'DM Sans','Outfit',sans-serif;font-size:0.78rem;font-weight:500;
    box-shadow:0 2px 8px rgba(37,211,102,0.25);transition:all 0.15s;
  `;
  btn.onmouseover = () => { btn.style.background = '#1FA855'; btn.style.transform = 'translateY(-1px)'; };
  btn.onmouseout  = () => { btn.style.background = '#25D366'; btn.style.transform = 'translateY(0)'; };
  btn.addEventListener('click', window.compartilharListaWhatsApp);
  container.insertBefore(btn, container.firstChild?.nextSibling || null);
}

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', init);

// Re-detecta refeições se o plano carregar tarde (paciente.html monta dinâmico)
window.addEventListener('load', () => {
  setTimeout(async () => {
    await detectarRefeicoesNoDOM();
    if (refeicoesPlano.length) {
      injetarUIRefeicoes();
      injetarProximaRefeicao();
      injetarBotaoCompartilharLista();
    }
  }, 3000);
});

// Expõe API
window._planoExtras = {
  marcarRefeicao,
  carregarMarcadasHoje,
  compartilharLista: window.compartilharListaWhatsApp,
};
