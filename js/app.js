// ============================================================
// EVELIN RIBEIRO GRECO — app.js
// Backend: Supabase (auth + database + storage)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Configuração Supabase ──────────────────────────────────
const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';

const ADMIN_EMAIL = 'evelinbeatrizrb@outlook.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Verifica se o usuário é admin por metadata (preferencial) ou email (fallback)
function isAdminUser(user) {
  return user?.user_metadata?.role === 'admin' || user?.email === ADMIN_EMAIL;
}

// ── Utilitários ───────────────────────────────────────────

function showMessage(el, text, type = 'error') {
  el.textContent  = text;
  el.className    = `form-message ${type} visible`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 3200);
}

// ── Formatação de data atual ───────────────────────────────
function getCurrentDateFormatted() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}

// ============================================================
// SAUDAÇÃO DINÂMICA
// ============================================================

/**
 * Retorna a saudação base pelo período do dia.
 * "Bom dia" / "Boa tarde" / "Boa noite" são neutras em gênero no português.
 */
function gerarSaudacao() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Bom dia,';
  if (h >= 12 && h < 18) return 'Boa tarde,';
  return 'Boa noite,';
}

/**
 * Retorna uma linha contextual: data formatada + frase motivacional curta.
 * A frase varia por dia da semana e, quando relevante, por gênero.
 * @param {Object} paciente — objeto com campo `sexo` ('F', 'M' ou null)
 */
function gerarContextoDia(paciente) {
  const hoje    = new Date();
  const dia     = hoje.getDay();   // 0 Dom … 6 Sáb
  const hora    = hoje.getHours();
  const sexo    = (paciente?.sexo || '').toUpperCase();
  const fem     = sexo === 'F';
  const mas     = sexo === 'M';

  // Data por extenso — ex.: "segunda-feira, 21 de abril de 2026"
  const dataStr = hoje.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  // Frases por dia — curtas e encorajadoras
  // null = sem frase extra (dias sem contexto específico)
  const FRASES = {
    0: fem ? 'Cuide-se — o descanso é parte do processo.'          // Dom <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="22"/><line x1="9" y1="19" x2="15" y2="19"/></svg>
           : 'Cuide-se — o descanso também é evolução.',           // Dom <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><circle cx="10" cy="14" r="5"/><line x1="14" y1="10" x2="20" y2="4"/><polyline points="14 4 20 4 20 10"/></svg>/neutro
    1: fem ? 'Nova semana, nova chance de cuidar de você.'         // Seg <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="22"/><line x1="9" y1="19" x2="15" y2="19"/></svg>
           : 'Nova semana. Vamos com tudo.',                       // Seg <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><circle cx="10" cy="14" r="5"/><line x1="14" y1="10" x2="20" y2="4"/><polyline points="14 4 20 4 20 10"/></svg>/neutro
    2: null,                                                        // Ter
    3: 'Metade da semana — continue com o plano.',                 // Qua (neutro)
    4: null,                                                        // Qui
    5: fem ? 'Mais uma semana dedicada. Orgulhe-se.'               // Sex <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="22"/><line x1="9" y1="19" x2="15" y2="19"/></svg>
           : 'Mais uma semana concluída. Continue o ritmo.',       // Sex <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><circle cx="10" cy="14" r="5"/><line x1="14" y1="10" x2="20" y2="4"/><polyline points="14 4 20 4 20 10"/></svg>/neutro
    6: null,                                                        // Sáb
  };

  // Ajuste por período do dia (sobreposição matinal em dias neutros)
  const FRASES_HORA = {
    // Madrugada/noite muito tarde — acolhimento
    cuidado: fem ? 'Já é tarde — cuide do seu sono.' : 'Já é tarde — descanse bem.',
  };

  let frase = FRASES[dia];

  // Madrugada (0–4h): reforço de sono independente do dia
  if (hora >= 0 && hora < 5) {
    frase = fem ? 'Já é tarde — cuide do seu sono.'
                : 'Já é tarde — descanse bem.';
  }

  return frase
    ? `${dataStr} · ${frase}`
    : dataStr;
}

/**
 * Retorna apenas o primeiro nome de uma string de nome completo.
 * "Maria Oliveira Santos" -> "Maria"
 */
function primeiroNome(nomeCompleto) {
  if (!nomeCompleto) return 'você';
  return nomeCompleto.trim().split(/\s+/)[0];
}

// ============================================================
// PÁGINA DE LOGIN (index.html)
// ============================================================

function initLoginPage() {
  const loginForm    = document.getElementById('login-form');
  const emailInput   = document.getElementById('email');
  const senhaInput   = document.getElementById('senha');
  const loginBtn     = document.getElementById('login-btn');
  const loginMsg     = document.getElementById('login-message');

  if (!loginForm) return; // Não está na página de login

  // Expõe para o handler inline do index.html
  window._appLogin = handleLogin;

  // ── 1) AUTO-FOCO NO E-MAIL ─────────────────────────────────
  try { emailInput.focus(); } catch (_) {}

  // ── 2) BANNER DE SESSÃO EXPIRADA (?expired=1) ─────────────
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('expired') === '1') {
    const banner = document.getElementById('session-banner');
    if (banner) banner.style.display = 'flex';
  }
  if (urlParams.get('reset') === 'ok') {
    const banner = document.getElementById('session-banner');
    const txt = document.getElementById('session-banner-text');
    if (banner && txt) {
      banner.style.display = 'flex';
      banner.classList.add('ok');
      txt.textContent = 'Link de recuperação enviado. Verifique seu e-mail.';
    }
  }

  // ── 3) TOGGLE OLHO (MOSTRAR/OCULTAR SENHA) ─────────────────
  const toggleBtn   = document.getElementById('toggle-senha');
  const eyeShow     = document.getElementById('eye-icon-show');
  const eyeHide     = document.getElementById('eye-icon-hide');
  const togglePw = () => {
    const isPw = senhaInput.type === 'password';
    senhaInput.type = isPw ? 'text' : 'password';
    if (eyeShow && eyeHide) {
      eyeShow.style.display = isPw ? 'none'  : '';
      eyeHide.style.display = isPw ? ''      : 'none';
    }
    if (toggleBtn) toggleBtn.setAttribute('aria-label', isPw ? 'Ocultar senha' : 'Mostrar senha');
    senhaInput.focus();
  };
  if (toggleBtn) toggleBtn.addEventListener('click', togglePw);

  // Atalho Alt+S para alternar visibilidade da senha
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      togglePw();
    }
  });

  // ── 4) AVISO DE CAPS LOCK ─────────────────────────────────
  const capsEl = document.getElementById('caps-warning');
  const updateCaps = (e) => {
    if (!capsEl) return;
    const on = e.getModifierState && e.getModifierState('CapsLock');
    capsEl.style.display = on ? 'flex' : 'none';
  };
  senhaInput.addEventListener('keydown', updateCaps);
  senhaInput.addEventListener('keyup',   updateCaps);
  senhaInput.addEventListener('blur', () => { if (capsEl) capsEl.style.display = 'none'; });

  // ── 5) VALIDAÇÃO INLINE DO E-MAIL ─────────────────────────
  const emailErrEl = document.getElementById('email-error');
  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  emailInput.addEventListener('blur', () => {
    const v = emailInput.value.trim();
    if (!v) { // vazio — não mostra erro ainda
      emailInput.classList.remove('has-error');
      if (emailErrEl) emailErrEl.style.display = 'none';
      return;
    }
    if (!isValidEmail(v)) {
      emailInput.classList.add('has-error');
      if (emailErrEl) emailErrEl.style.display = 'block';
    } else {
      emailInput.classList.remove('has-error');
      if (emailErrEl) emailErrEl.style.display = 'none';
    }
  });
  emailInput.addEventListener('input', () => {
    if (emailInput.classList.contains('has-error') && isValidEmail(emailInput.value.trim())) {
      emailInput.classList.remove('has-error');
      if (emailErrEl) emailErrEl.style.display = 'none';
    }
  });

  // ── 6) "ESQUECI MINHA SENHA" ──────────────────────────────
  window._appForgotPassword = async () => {
    const email = (emailInput.value || '').trim();
    if (!isValidEmail(email)) {
      emailInput.classList.add('has-error');
      if (emailErrEl) {
        emailErrEl.textContent = 'Digite seu e-mail acima para receber o link de recuperação.';
        emailErrEl.style.display = 'block';
      }
      emailInput.focus();
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/index.html?reset=ok'
      });
      if (error) {
        showMessage(loginMsg, 'Não foi possível enviar o link. Tente novamente.', 'error');
      } else {
        showMessage(loginMsg, 'Link de recuperação enviado para ' + email + '. Verifique sua caixa de entrada.', 'success');
      }
    } catch (err) {
      showMessage(loginMsg, 'Erro de conexão. Tente novamente.', 'error');
    }
  };

  // ── 7) SUBMIT (com spinner + lembrar dispositivo) ─────────
  const btnText    = document.getElementById('login-btn-text');
  const btnSpinner = document.getElementById('login-btn-spinner');
  const lembrarEl  = document.getElementById('lembrar-dispositivo');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    // Validação antes de submeter
    if (!isValidEmail(email)) {
      emailInput.classList.add('has-error');
      if (emailErrEl) emailErrEl.style.display = 'block';
      emailInput.focus();
      return;
    }
    if (!senha) {
      senhaInput.focus();
      return;
    }

    // Estado "carregando"
    loginBtn.disabled = true;
    loginBtn.classList.add('is-loading');
    if (btnText)    btnText.textContent = 'Entrando...';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';
    loginMsg.className = 'form-message';

    // Grava preferência de "lembrar dispositivo" antes de autenticar
    try {
      localStorage.setItem('erg_remember_device', lembrarEl && lembrarEl.checked ? '1' : '0');
    } catch (_) {}

    await handleLogin(email, senha, loginMsg, loginBtn, { btnText, btnSpinner });
  });
}

async function handleLogin(email, senha, msgEl, btnEl, ui) {
  // Expõe para o handler inline do index.html
  window._appLogin = handleLogin;

  // Helper p/ restaurar estado do botão (suporta UI nova com spinner)
  const restoreBtn = () => {
    btnEl.disabled = false;
    btnEl.classList && btnEl.classList.remove('is-loading');
    if (ui && ui.btnText)    ui.btnText.textContent = 'Entrar';
    if (ui && ui.btnSpinner) ui.btnSpinner.style.display = 'none';
    if (!ui) btnEl.textContent = 'Entrar';
  };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    const msg = /invalid/i.test(error.message || '')
      ? 'Credenciais inválidas. Verifique e-mail e senha.'
      : (error.message || 'Não foi possível entrar. Tente novamente.');
    showMessage(msgEl, msg, 'error');
    restoreBtn();
    return;
  }

  // Login bem-sucedido — redireciona conforme perfil
  if (isAdminUser(data.user)) {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'dashboard.html';
  }
}

async function handleSignup(email, senha, msgEl, btnEl) {
  if (senha.length < 6) {
    showMessage(msgEl, 'A senha deve ter no mínimo 6 caracteres.', 'error');
    btnEl.disabled    = false;
    btnEl.textContent = 'Criar conta';
    return;
  }

  const { error } = await supabase.auth.signUp({ email, password: senha });

  if (error) {
    showMessage(msgEl, error.message, 'error');
    btnEl.disabled    = false;
    btnEl.textContent = 'Criar conta';
    return;
  }

  showMessage(msgEl, 'Conta criada. Verifique seu e-mail para confirmar o acesso.', 'success');
  btnEl.disabled    = false;
  btnEl.textContent = 'Criar conta';
}

// ============================================================
// PÁGINA DE DASHBOARD (dashboard.html)
// ============================================================

function initDashboardPage() {
  const dashboardRoot = document.getElementById('dashboard-root');
  if (!dashboardRoot) return; // Não está na página de dashboard

  checkSession();
  initSidebarMobile();
  document.getElementById('current-date').textContent = getCurrentDateFormatted();
}

// Verifica sessão ativa — redireciona para login se não autenticado
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  loadPatientData(session.user);
  loadEvolucao(session.user.id);
  loadCheckinCard(session.user.id);
}

// Busca dados do paciente na tabela `patients`
async function loadPatientData(user) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    // Paciente não encontrado — exibe dados mínimos do auth
    renderMinimalData(user);
    return;
  }

  renderPatientData(data);
}

// Renderiza com dados completos
function renderPatientData(p) {
  // ── Cabeçalho dinâmico ──────────────────────────────────
  setText('patient-greeting', gerarSaudacao());
  setText('patient-name', primeiroNome(p.nome) || 'Paciente');
  setText('current-date', gerarContextoDia(p));

  // ── Sidebar ──────────────────────────────────────────────
  setText('sidebar-patient-name', primeiroNome(p.nome) || 'Paciente');

  // Info cards
  setText('ultima-consulta', formatDate(p.data_ultima_consulta));
  setText('proxima-consulta', formatDate(p.data_proxima_consulta));

  // Plano alimentar
  renderPlano(p);

  // Observações
  const obsEl = document.getElementById('observacoes-text');
  if (obsEl) {
    if (p.observacoes) {
      obsEl.textContent = p.observacoes;
      obsEl.className   = 'obs-text';
    } else {
      obsEl.textContent = 'Sem observações registradas.';
      obsEl.className   = 'obs-empty';
    }
  }

  // Metas
  renderMetas(p.metas);

  // Remove skeletons
  document.querySelectorAll('.skeleton-wrapper').forEach(el => el.remove());
  document.querySelectorAll('.data-content').forEach(el => el.style.display = '');
}

// Renderiza com dados mínimos (sem cadastro na tabela patients)
function renderMinimalData(user) {
  const nome = user.email.split('@')[0];
  setText('patient-greeting', gerarSaudacao());
  setText('patient-name', nome);
  setText('current-date', gerarContextoDia(null));  // sem gênero — neutro
  setText('sidebar-patient-name', nome);
  setText('ultima-consulta', '—');
  setText('proxima-consulta', '—');

  const obsEl = document.getElementById('observacoes-text');
  if (obsEl) { obsEl.textContent = 'Aguardando dados da nutricionista.'; obsEl.className = 'obs-empty'; }

  renderMetas(null);

  document.querySelectorAll('.skeleton-wrapper').forEach(el => el.remove());
  document.querySelectorAll('.data-content').forEach(el => el.style.display = '');
}

// Plano alimentar — gera URL assinada se for storage, ou usa link direto
async function renderPlano(p) {
  const container = document.getElementById('plano-container');
  if (!container) return;

  if (!p.plano_url) {
    container.innerHTML = `
      <div style="border:1px solid var(--detail);padding:24px;background:var(--bg-secondary);">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--detail);margin-bottom:12px;font-weight:500;">Em preparação</p>
        <p style="font-family:'Cormorant Garamond',serif;font-weight:300;font-size:1.2rem;color:var(--text);margin-bottom:8px;">Seu plano personalizado está sendo elaborado</p>
        <p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text-light);line-height:1.7;margin-bottom:20px;">
          Enquanto isso, algumas orientações gerais para o período inicial:
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
          ${['Inclua uma fonte de proteína em todas as refeições (ovos, frango, peixe, leguminosas)',
             'Beba água regularmente ao longo do dia — mínimo 2L',
             'Evite ultraprocessados e alimentos com açúcar adicionado',
             'Faça refeições em horários regulares, sem pular o café da manhã',
             'Mastigue devagar — sua digestão agradece'].map(d => `
            <div style="display:flex;align-items:baseline;gap:10px;">
              <span style="width:5px;height:5px;border-radius:50%;background:var(--detail);flex-shrink:0;margin-top:6px;"></span>
              <p style="font-family:'DM Sans',sans-serif;font-size:0.8rem;color:var(--text-light);line-height:1.5;">${d}</p>
            </div>`).join('')}
        </div>
        <a href="checkin.html" style="display:inline-flex;align-items:center;gap:8px;font-family:'DM Sans',sans-serif;font-size:0.65rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--subtitle);text-decoration:none;border-bottom:1px solid var(--detail);padding-bottom:2px;">
          Fazer check-in diário <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      </div>`;
    return;
  }

  // Se for um path do Supabase Storage (não começa com http)
  let url = p.plano_url;
  if (!url.startsWith('http')) {
    const { data, error } = await supabase.storage
      .from('planos')
      .createSignedUrl(url, 3600); // URL válida por 1 hora

    if (error || !data?.signedUrl) {
      container.innerHTML = '<p class="plano-empty">Erro ao carregar plano. Tente novamente.</p>';
      return;
    }
    url = data.signedUrl;
  }

  container.innerHTML = `
    <div class="plano-block">
      <div class="plano-info">
        <p class="plano-title">Plano Alimentar</p>
        <p class="plano-meta">Documento atualizado pela Dra. Evelin Greco</p>
      </div>
      <div class="plano-actions">
        <a href="${url}" target="_blank" class="btn-secondary" style="display:inline-block;padding:12px 28px;">
          Visualizar
        </a>
        <a href="${url}" download class="btn-primary" style="display:inline-block;padding:12px 28px;color:var(--bg-primary);">
          Download
        </a>
      </div>
    </div>
  `;
}

// Metas — renderiza lista
async function renderMetas(metasRaw) {
  const el = document.getElementById('metas-list');
  if (!el) return;

  let metas = [];

  if (typeof metasRaw === 'string') {
    // Salvo como texto simples, separado por \n
    metas = metasRaw.split('\n').map(s => s.trim()).filter(Boolean);
  } else if (Array.isArray(metasRaw)) {
    metas = metasRaw;
  }

  if (metas.length === 0) {
    // Busca último check-in para gerar metas automáticas
    const { data: lastCheckin } = await supabase
      .from('checkins')
      .select('energia,fome_nivel,sono_qualidade,agua_litros,evacuacao_bristol')
      .eq('user_id', window._currentUserId)
      .order('data', { ascending: false })
      .limit(1)
      .single()
      .catch(() => ({ data: null }));

    const metasAuto = [];
    if (lastCheckin) {
      if (lastCheckin.energia <= 2)         metasAuto.push({ texto: 'Melhorar nível de energia', origem: 'check-in' });
      if (lastCheckin.fome_nivel >= 4)      metasAuto.push({ texto: 'Regular a sensação de fome', origem: 'check-in' });
      if (lastCheckin.sono_qualidade <= 2)  metasAuto.push({ texto: 'Melhorar qualidade do sono', origem: 'check-in' });
      if (lastCheckin.agua_litros < 1.5)    metasAuto.push({ texto: 'Atingir 2L de água por dia', origem: 'check-in' });
      const b = lastCheckin.evacuacao_bristol;
      if (b && (b <= 2 || b >= 6))          metasAuto.push({ texto: 'Regular o trânsito intestinal', origem: 'check-in' });
    }

    if (!metasAuto.length) {
      metasAuto.push(
        { texto: 'Fazer check-in diário por 7 dias consecutivos', origem: 'geral' },
        { texto: 'Manter hidratação de 2L por dia', origem: 'geral' },
        { texto: 'Incluir proteína em todas as refeições', origem: 'geral' }
      );
    }

    el.innerHTML = `
      <div style="margin-bottom:12px;">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--subtitle);margin-bottom:14px;font-weight:400;">
          ${lastCheckin ? 'Sugestões baseadas no seu check-in' : 'Objetivos iniciais sugeridos'}
        </p>
        ${metasAuto.map(m => `
          <div class="meta-item" style="display:flex;align-items:baseline;gap:12px;padding:12px 0;border-bottom:1px solid rgba(184,147,106,0.15);">
            <div style="width:6px;height:6px;border-radius:50%;border:1.5px solid var(--detail);flex-shrink:0;margin-top:5px;"></div>
            <p style="font-family:'DM Sans',sans-serif;font-size:0.82rem;color:var(--text);line-height:1.5;">${m.texto}</p>
          </div>`).join('')}
      </div>`;
    return;
  }

  el.innerHTML = metas.map(m => `
    <div class="meta-item">
      <div class="meta-icon"></div>
      <p class="meta-text">${m}</p>
    </div>
  `).join('');
}

// Logout
async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

// Sidebar mobile
function initSidebarMobile() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const hambBtn  = document.getElementById('hamburger-btn');

  if (!hambBtn) return;

  hambBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}

// Utilitário
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ── Expõe logout globalmente (chamado via onclick no HTML)
window.logout = logout;

// ── Inicialização ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initDashboardPage();
});

// ============================================================
// EVOLUÇÃO CORPORAL — gráficos no dashboard da paciente
// ============================================================

async function loadEvolucao(userId) {
  const container = document.getElementById('evolucao-container');
  if (!container) return;

  // Busca histórico de antropometria
  const { data, error } = await supabase
    .from('antropometria')
    .select('data_avaliacao, peso, pct_gordura, pct_magra, massa_magra, massa_gorda, imc, circ_cintura, circ_quadril')
    .eq('user_id', userId)
    .order('data_avaliacao', { ascending: true });

  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="obs-empty">Nenhuma avaliação registrada ainda.</p>';
    return;
  }

  // Última avaliação — cards de destaque
  const ultima = data[data.length - 1];

  container.innerHTML = `
    <!-- Cards da última avaliação -->
    <div class="info-grid" style="margin-bottom:32px;">
      <div class="info-card">
        <p class="info-card-label">Peso atual</p>
        <p class="info-card-value large">${ultima.peso ? ultima.peso + ' kg' : '—'}</p>
        <p class="info-card-sub">Última avaliação: ${formatDate(ultima.data_avaliacao)}</p>
      </div>
      <div class="info-card">
        <p class="info-card-label">% Gordura</p>
        <p class="info-card-value large">${ultima.pct_gordura ? ultima.pct_gordura + '%' : '—'}</p>
      </div>
      <div class="info-card">
        <p class="info-card-label">% Massa Magra</p>
        <p class="info-card-value large">${ultima.pct_magra ? ultima.pct_magra + '%' : '—'}</p>
      </div>
      <div class="info-card">
        <p class="info-card-label">IMC</p>
        <p class="info-card-value large">${ultima.imc ? ultima.imc : '—'}</p>
      </div>
    </div>

    ${data.length >= 2 ? renderGraficos(data) : '<p class="obs-empty" style="font-style:italic;">Os gráficos de evolução aparecem a partir da segunda avaliação.</p>'}
  `;

  // Inicializa gráficos se tiver dados suficientes
  if (data.length >= 2) {
    initGraficos(data);
  }
}

function renderGraficos(data) {
  return `
    <div class="evolucao-graficos">
      <!-- Gráfico de peso -->
      <div class="grafico-card">
        <p class="grafico-titulo">Evolução do Peso</p>
        <canvas id="grafico-peso" height="200"></canvas>
      </div>

      <!-- Composição corporal — rosca -->
      <div class="grafico-card">
        <p class="grafico-titulo">Composição Corporal Atual</p>
        <canvas id="grafico-composicao" height="200"></canvas>
      </div>

      <!-- Gráfico % gordura e % magra -->
      <div class="grafico-card grafico-card--wide">
        <p class="grafico-titulo">Evolução da Composição Corporal</p>
        <canvas id="grafico-composicao-evolucao" height="180"></canvas>
      </div>
    </div>
  `;
}

function initGraficos(data) {
  const labels   = data.map(d => formatDate(d.data_avaliacao));
  const pesos    = data.map(d => d.peso);
  const gorduras = data.map(d => d.pct_gordura);
  const magras   = data.map(d => d.pct_magra);
  const ultima   = data[data.length - 1];

  const corDetalhe  = '#C9A882';
  const corSubtitle = '#9A7D5E';
  const corTexto    = '#4A3C2E';
  const corBg       = '#F8F4EF';

  Chart.defaults.font.family = "'Jost', sans-serif";
  Chart.defaults.font.weight = '300';
  Chart.defaults.color       = corSubtitle;

  // ── Gráfico de peso ──────────────────────────────────
  const ctxPeso = document.getElementById('grafico-peso');
  if (ctxPeso) {
    new Chart(ctxPeso, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Peso (kg)',
          data: pesos,
          borderColor: corDetalhe,
          backgroundColor: 'rgba(201,168,130,0.08)',
          borderWidth: 1.5,
          pointBackgroundColor: corDetalhe,
          pointRadius: 4,
          tension: 0.3,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(201,168,130,0.15)' } },
          y: { grid: { color: 'rgba(201,168,130,0.15)' }, ticks: { callback: v => v + ' kg' } }
        }
      }
    });
  }

  // ── Composição corporal atual — rosca ────────────────
  const ctxComp = document.getElementById('grafico-composicao');
  if (ctxComp && ultima.pct_gordura && ultima.pct_magra) {
    new Chart(ctxComp, {
      type: 'doughnut',
      data: {
        labels: ['Massa Gorda', 'Massa Magra'],
        datasets: [{
          data: [ultima.pct_gordura, ultima.pct_magra],
          backgroundColor: ['#C9A882', '#9A7D5E'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 20, usePointStyle: true, pointStyleWidth: 8 }
          },
          tooltip: {
            callbacks: { label: ctx => ctx.label + ': ' + ctx.raw + '%' }
          }
        }
      }
    });
  }

  // ── Evolução % gordura e % magra ─────────────────────
  const ctxEv = document.getElementById('grafico-composicao-evolucao');
  if (ctxEv) {
    new Chart(ctxEv, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '% Gordura',
            data: gorduras,
            borderColor: '#C9A882',
            backgroundColor: 'rgba(201,168,130,0.06)',
            borderWidth: 1.5,
            pointBackgroundColor: '#C9A882',
            pointRadius: 4,
            tension: 0.3,
            fill: true,
          },
          {
            label: '% Massa Magra',
            data: magras,
            borderColor: '#9A7D5E',
            backgroundColor: 'rgba(154,125,94,0.06)',
            borderWidth: 1.5,
            pointBackgroundColor: '#9A7D5E',
            pointRadius: 4,
            tension: 0.3,
            fill: true,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 20, usePointStyle: true, pointStyleWidth: 8 }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(201,168,130,0.15)' } },
          y: { grid: { color: 'rgba(201,168,130,0.15)' }, ticks: { callback: v => v + '%' } }
        }
      }
    });
  }
}

// ── Calcula streak de check-ins consecutivos ─────────────
function calcularStreak(checkins7) {
  const hoje = new Date().toISOString().split('T')[0];
  let streak = 0;
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (checkins7.some(c => c.data === dateStr)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ── Integração completa dashboard ────────────────────────
async function loadCheckinCard(userId) {
  window._currentUserId = userId;

  const hoje = new Date().toISOString().split('T')[0];

  // Busca check-in de hoje com score e flags
  const { data: checkinHoje } = await supabase
    .from('checkins')
    .select('id,score_diario,flags,energia,fome_nivel,sono_qualidade,humor')
    .eq('user_id', userId)
    .eq('data', hoje)
    .maybeSingle();

  // Busca checkins dos últimos 7 dias para detectar padrões e calcular streak
  const seteDias = new Date(); seteDias.setDate(seteDias.getDate() - 6);
  const { data: checkins7 } = await supabase
    .from('checkins')
    .select('data,score_diario,flags,energia,fome_nivel,sono_qualidade,agua_litros,evacuacao_bristol')
    .eq('user_id', userId)
    .gte('data', seteDias.toISOString().split('T')[0])
    .order('data', { ascending: false });

  // Busca fase ativa
  const { data: faseAtiva } = await supabase
    .from('fases')
    .select('nome,descricao,objetivo_clinico,tipo,calorias_alvo')
    .eq('user_id', userId)
    .eq('status', 'ativa')
    .maybeSingle();

  const streak = calcularStreak(checkins7 || []);

  renderHoje(checkinHoje, checkins7 || [], faseAtiva, streak);
  renderFaseAtual(faseAtiva);
  renderAlertasAutomaticos(checkins7 || []);
}

// ── Bloco "O que fazer hoje" ──────────────────────────────
function renderHoje(checkinHoje, checkins7, faseAtiva, streak) {
  const container = document.getElementById('hoje-container');
  if (!container) return;

  const fezCheckin = !!checkinHoje;
  const scoreCard  = document.getElementById('score-hoje-card');
  if (scoreCard) scoreCard.style.display = 'none';

  // Atualiza estado do FAB e botão bottom nav
  const fab = document.getElementById('fab-checkin');
  const bnavCheckin = document.getElementById('bnav-checkin');
  if (fezCheckin) {
    if (fab) fab.classList.add('done');
    if (bnavCheckin) bnavCheckin.classList.add('done');
  }

  // ── Banner de reforço positivo por streak ──
  const streakBanner = gerarStreakBanner(streak, fezCheckin);
  if (streakBanner) {
    const existing = document.getElementById('streak-banner');
    if (!existing) {
      const el = document.createElement('div');
      el.id = 'streak-banner';
      el.innerHTML = streakBanner;
      container.parentElement?.insertBefore(el, container);
    }
  }

  if (fezCheckin) {
    // ── Check-in feito: confirmação compacta + ações secundárias ──
    const s   = checkinHoje.score_diario;
    const cor = s >= 80 ? '#3D6B4F' : s >= 60 ? '#3A5E8B' : s >= 40 ? '#B8860B' : '#7A2E2E';

    const FLAG_LABEL = {
      energia_baixa: 'Energia baixa', sono_ruim: 'Sono ruim', fome_alta: 'Fome alta',
      descontrole: 'Descontrole', intestino: 'Intestino', overreaching: 'Sobrecarga',
      hidratacao: 'Hidratação', ok: 'Tudo bem',
    };
    const flagsHtml = (checkinHoje.flags || []).slice(0, 3).map(f => {
      const isOk = f === 'ok';
      return `<span style="font-family:'DM Sans',sans-serif;font-size:0.6rem;padding:3px 9px;
        background:${isOk ? 'rgba(61,107,79,0.1)' : 'rgba(184,147,106,0.12)'};
        color:${isOk ? '#2E5E3A' : 'var(--text-light)'};letter-spacing:0.07em;">
        ${FLAG_LABEL[f] || f}</span>`;
    }).join('');

    container.innerHTML = `
      <div style="border:1px solid rgba(61,107,79,0.25);background:rgba(61,107,79,0.04);
        padding:18px 20px;margin-bottom:10px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div style="width:40px;height:40px;border-radius:50%;border:1.5px solid #3D6B4F;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3D6B4F" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style="flex:1;min-width:0;">
          <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.82rem;color:var(--text);margin-bottom:3px;">
            Check-in de hoje feito
          </p>
          ${s != null ? `<p style="font-family:'DM Sans',sans-serif;font-size:0.72rem;color:${cor};margin-bottom:${flagsHtml ? '6px' : '0'};">Score: ${s}/100</p>` : ''}
          ${flagsHtml ? `<div style="display:flex;flex-wrap:wrap;gap:5px;">${flagsHtml}</div>` : ''}
        </div>
        <a href="checkin-resumo.html" style="font-family:'DM Sans',sans-serif;font-size:0.63rem;
          letter-spacing:0.14em;text-transform:uppercase;color:var(--subtitle);text-decoration:none;
          white-space:nowrap;flex-shrink:0;">Ver resumo <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
      </div>
      <div style="border:1px solid var(--detail);overflow:hidden;">
        <a href="diario.html" style="display:flex;align-items:center;justify-content:space-between;
          padding:13px 18px;background:var(--bg-primary);border-bottom:1px solid rgba(184,147,106,0.15);
          text-decoration:none;transition:opacity 0.15s;"
          onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
          <span style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text);">Registrar alimentação do dia</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--detail);flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
        ${faseAtiva ? `
        <a href="plano.html" style="display:flex;align-items:center;justify-content:space-between;
          padding:13px 18px;background:var(--bg-primary);text-decoration:none;transition:opacity 0.15s;"
          onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
          <span style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text);">Rever plano alimentar</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--detail);flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
        </a>` : ''}
      </div>`;

  } else {
    // ── Check-in NÃO feito: hero card de destaque ──
    const streakMsg = streak > 1
      ? `${streak} dias consecutivos`
      : streak === 1 ? 'Ontem você fez — continue hoje' : 'Sua primeira vez — comece agora';

    container.innerHTML = `
      <div style="border:1px solid var(--detail);overflow:hidden;margin-bottom:10px;">
        <div style="padding:28px 24px;background:var(--text);">
          <p style="font-family:'DM Sans',sans-serif;font-size:0.53rem;letter-spacing:0.24em;
            text-transform:uppercase;color:rgba(248,244,239,0.4);margin-bottom:10px;font-weight:500;">
            Check-in diário
          </p>
          <p style="font-family:'Cormorant Garamond',serif;font-weight:300;font-size:1.5rem;
            color:var(--bg-primary);line-height:1.2;margin-bottom:8px;">
            Como você está hoje?
          </p>
          <p style="font-family:'DM Sans',sans-serif;font-size:0.74rem;line-height:1.6;
            color:rgba(248,244,239,0.5);margin-bottom:24px;">
            Sono, fome, energia e intestino — leva menos de 2 minutos.
          </p>
          <a href="checkin.html"
            style="display:inline-flex;align-items:center;gap:10px;
              font-family:'DM Sans',sans-serif;font-size:0.7rem;font-weight:500;
              letter-spacing:0.1em;text-transform:uppercase;
              background:var(--bg-primary);color:var(--text);
              padding:14px 26px;text-decoration:none;transition:opacity 0.15s;"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            Responder agora
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
          ${streak > 0 ? `
          <p style="font-family:'DM Sans',sans-serif;font-size:0.64rem;
            color:rgba(248,244,239,0.38);margin-top:14px;">
            ${streakMsg}
          </p>` : ''}
        </div>
        ${faseAtiva ? `
        <a href="fases.html" style="display:flex;align-items:center;justify-content:space-between;
          padding:13px 20px;background:var(--bg-secondary);border-top:1px solid rgba(184,147,106,0.2);
          text-decoration:none;transition:opacity 0.15s;"
          onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
          <span style="font-family:'DM Sans',sans-serif;font-size:0.74rem;color:var(--text-light);">
            Fase atual: <strong style="color:var(--text);font-weight:500;">${faseAtiva.nome}</strong>
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--detail);flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
        </a>` : ''}
        <a href="diario.html" style="display:flex;align-items:center;justify-content:space-between;
          padding:13px 20px;background:var(--bg-primary);border-top:1px solid rgba(184,147,106,0.15);
          text-decoration:none;transition:opacity 0.15s;"
          onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
          <span style="font-family:'DM Sans',sans-serif;font-size:0.74rem;color:var(--text-light);">
            Registrar alimentação do dia
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--detail);flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>`;
  }
}

// ── Bloco fase atual ──────────────────────────────────────
function renderFaseAtual(fase) {
  const bloco = document.getElementById('bloco-fase');
  const card  = document.getElementById('fase-atual-card');
  if (!bloco || !card || !fase) return;

  const TIPO_LABEL = {
    adaptacao: 'Adaptação', deficit_leve: 'Déficit leve',
    deficit_moderado: 'Déficit moderado', recomposicao: 'Recomposição',
    manutencao: 'Manutenção', ganho_massa: 'Ganho de massa',
  };

  // ── Calcula progresso da fase ──
  let progressoHtml = '';
  if (fase.data_inicio && fase.data_fim) {
    const inicio  = new Date(fase.data_inicio + 'T00:00:00');
    const fim     = new Date(fase.data_fim    + 'T00:00:00');
    const hoje    = new Date();
    const total   = Math.max(1, fim - inicio);
    const decorrido = Math.max(0, Math.min(hoje - inicio, total));
    const pct     = Math.round((decorrido / total) * 100);

    const semanaTotal    = Math.round(total / (7 * 86400000));
    const semanaAtual    = Math.min(semanaTotal, Math.round(decorrido / (7 * 86400000)) + 1);
    const diasRestantes  = Math.max(0, Math.round((fim - hoje) / 86400000));

    progressoHtml = `
      <div class="fase-progress-wrap">
        <div class="fase-progress-header">
          <span class="fase-progress-label">Progresso</span>
          <span class="fase-progress-pct">${pct}%</span>
        </div>
        <div class="fase-progress-bar">
          <div class="fase-progress-fill" style="width:0%" data-target="${pct}"></div>
        </div>
        <div class="fase-semanas-info">
          <span>Semana ${semanaAtual} de ${semanaTotal}</span>
          <span>${diasRestantes > 0 ? `${diasRestantes} dias restantes` : 'Fase concluída'}</span>
        </div>
      </div>`;
  }

  bloco.style.display = '';
  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:${progressoHtml ? '16px' : '0'};">
      <div style="flex:1;">
        <p style="font-family:'DM Sans',sans-serif;font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;
          color:var(--detail);margin-bottom:6px;font-weight:500;">
          ${TIPO_LABEL[fase.tipo] || 'Fase ativa'}
        </p>
        <p style="font-family:'Cormorant Garamond',serif;font-weight:300;font-size:1.15rem;color:var(--text);margin-bottom:8px;">
          ${fase.nome}
        </p>
        ${fase.descricao ? `<p style="font-family:'DM Sans',sans-serif;font-size:0.78rem;color:var(--text-light);line-height:1.6;">${fase.descricao}</p>` : ''}
      </div>
      <a href="fases.html" style="font-family:'DM Sans',sans-serif;font-size:0.62rem;letter-spacing:0.14em;
        text-transform:uppercase;color:var(--subtitle);text-decoration:none;white-space:nowrap;flex-shrink:0;">
        Ver fases <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </a>
    </div>
    ${progressoHtml}`;

  // Anima a barra de progresso após inserir no DOM
  requestAnimationFrame(() => {
    const fill = card.querySelector('.fase-progress-fill');
    if (fill) {
      setTimeout(() => { fill.style.width = fill.dataset.target + '%'; }, 100);
    }
  });
}

// ── Alertas automáticos por padrão nos últimos 7 dias ─────
function renderAlertasAutomaticos(checkins) {
  const bloco = document.getElementById('bloco-alertas');
  const cont  = document.getElementById('alertas-container');
  if (!bloco || !cont || checkins.length < 2) return;

  const alertas = [];

  // Fome alta por 2+ dias
  const diasFomeAlta = checkins.filter(c => c.fome_nivel >= 4).length;
  if (diasFomeAlta >= 2) {
    alertas.push({
      tipo: 'warn',
      titulo: `Fome elevada em ${diasFomeAlta} dos últimos ${checkins.length} dias`,
      msg: 'Isso pode indicar que o plano está restritivo. Garanta proteína em cada refeição e não pule lanches.',
    });
  }

  // Sono ruim por 3+ dias
  const diasSonoRuim = checkins.filter(c => c.sono_qualidade <= 2 || c.sono_horas < 5.5).length;
  if (diasSonoRuim >= 3) {
    alertas.push({
      tipo: 'warn',
      titulo: `Sono comprometido em ${diasSonoRuim} dias`,
      msg: 'Sono ruim eleva cortisol, dificulta perda de gordura e aumenta fome. Priorize uma rotina de descanso.',
    });
  }

  // Energia baixa
  const diasEnergBaixa = checkins.filter(c => c.energia <= 2).length;
  if (diasEnergBaixa >= 2) {
    alertas.push({
      tipo: 'crit',
      titulo: `Energia baixa em ${diasEnergBaixa} dias`,
      msg: 'Verifique se não está pulando refeições. Carboidratos complexos no pré-treino podem ajudar.',
    });
  }

  // Dia positivo sem alertas
  if (!alertas.length && checkins.length >= 3) {
    const scoresMedio = checkins.filter(c => c.score_diario).reduce((s,c) => s+c.score_diario, 0) / checkins.filter(c => c.score_diario).length;
    if (scoresMedio >= 65) {
      alertas.push({
        tipo: 'ok',
        titulo: 'Boa consistência esta semana',
        msg: `Score médio de ${Math.round(scoresMedio)} — continue com o plano.`,
      });
    }
  }

  if (!alertas.length) return;

  bloco.style.display = '';
  cont.innerHTML = alertas.map(a => {
    const estilos = {
      ok:   { borda: '#3D6B4F', bg: 'rgba(61,107,79,0.06)',  cor: '#2E5E3A' },
      warn: { borda: '#B8860B', bg: 'rgba(184,134,11,0.06)', cor: '#7A5E00' },
      crit: { borda: '#7A2E2E', bg: 'rgba(122,46,46,0.06)',  cor: '#6B2020' },
    }[a.tipo];
    return `
      <div style="border-left:3px solid ${estilos.borda};background:${estilos.bg};
        padding:14px 16px;margin-bottom:8px;">
        <p style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.78rem;color:${estilos.cor};margin-bottom:4px;">${a.titulo}</p>
        <p style="font-family:'DM Sans',sans-serif;font-weight:300;font-size:0.75rem;color:var(--text-light);line-height:1.5;">${a.msg}</p>
      </div>`;
  }).join('');
}

// ============================================================
// UX IMPROVEMENTS
// ============================================================

// ── Streak banner ─────────────────────────────────────────
function gerarStreakBanner(streak, fezHoje) {
  if (streak < 3) return null; // só mostra a partir de 3 dias
  const msgs = {
    3:  { icon: '🌱', texto: '<strong>3 dias seguidos!</strong> Você está criando um hábito.' },
    5:  { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>', texto: '<strong>5 dias consecutivos!</strong> Consistência é o caminho.' },
    7:  { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', texto: '<strong>Semana completa!</strong> Você fez check-in todos os dias.' },
    10: { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M4 12h6l2-3 2 3h6"/><path d="M14 9V5a2 2 0 1 0-4 0v4"/><path d="M5 19l3-7"/><path d="M19 19l-3-7"/></svg>', texto: '<strong>10 dias!</strong> Sua dedicação está gerando resultados.' },
    14: { icon: '🏆', texto: '<strong>2 semanas seguidas!</strong> Você é extraordinária.' },
    21: { icon: '✨', texto: '<strong>21 dias!</strong> Hábito formado — parabéns.' },
    30: { icon: '🌟', texto: '<strong>30 dias consecutivos!</strong> Comprometimento de alto nível.' },
  };
  // Pega a mensagem do marco mais próximo atingido
  const marco = [30, 21, 14, 10, 7, 5, 3].find(m => streak >= m);
  if (!marco) return null;
  const { icon, texto } = msgs[marco];
  return `<div class="streak-banner">
    <span class="streak-banner-icon">${icon}</span>
    <div class="streak-banner-text">${texto}
      <span style="opacity:0.7;font-size:0.72rem;"> (${streak} dias)</span>
    </div>
  </div>`;
}

// ── Dark mode ─────────────────────────────────────────────
function initDarkMode() {
  const saved = localStorage.getItem('erg_theme') || 'light';
  applyTheme(saved);

  const btn = document.getElementById('dark-toggle');
  if (btn) btn.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('erg_theme', next);
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const icon = document.getElementById('dark-icon');
  if (!icon) return;
  if (theme === 'dark') {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

// ── Pull-to-refresh ───────────────────────────────────────
function initPullToRefresh() {
  // Só ativa em dispositivos touch com viewport mobile
  // Dupla verificação: largura da tela + suporte a touch real
  const isMobile  = window.innerWidth <= 900;
  const isTouch   = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const indicator = document.getElementById('ptr-indicator');

  // Sai silenciosamente se não for mobile/touch ou se o elemento não existir
  if (!isMobile || !isTouch || !indicator) return;

  let startY  = 0;
  let pulling = false;
  const THRESHOLD = 80;

  document.addEventListener('touchstart', e => {
    // Só começa o pull quando a página está no topo
    if (window.scrollY === 0) {
      startY  = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 20)          indicator.classList.add('visible');
    if (dy > THRESHOLD)   indicator.textContent = '↑ Solte para atualizar';
    else if (dy > 20)     indicator.textContent = '↓ Puxe para atualizar';
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!pulling) return;
    const dy = e.changedTouches[0].clientY - startY;
    indicator.classList.remove('visible');
    indicator.textContent = '↓ Solte para atualizar';
    if (dy > THRESHOLD) window.location.reload();
    pulling = false;
  });
}

// ── Inicializa melhorias quando DOM estiver pronto ────────
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initPullToRefresh();
});
