// ============================================================
// antropometria.js — Avaliação Antropométrica com cálculos
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { installFormGuard } from './form-guard.js';
import { renderSparkChart } from './sparkchart.js';

let formGuard = null;
let evolucaoData = [];      // cache das avaliações para re-render do gráfico
let evolucaoMetric = 'peso'; // métrica ativa

const SUPABASE_URL  = 'https://gqnlrhmriufepzpustna.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQxMDAsImV4cCI6MjA5MDU0MDEwMH0.MhGvF5BCjeEGdVKVeoSERO7pzIciPxCs26Jx-537qLo';
const ADMIN_EMAIL   = 'evelinbeatrizrb@outlook.com';

function isAdminUser(user) {
  return user?.user_metadata?.role === 'admin' || user?.email === ADMIN_EMAIL;
}

const supabase    = createClient(SUPABASE_URL, SUPABASE_ANON);
window._supabase  = supabase;  // expõe pra carregarEvolucao() e outros módulos
const TOTAL_STEPS = 4;
let currentStep   = 0;

// Dados do paciente (sexo e idade) — usados nos cálculos de pregas e AMB
let pacienteSexo  = 'feminino'; // fallback
let pacienteIdade = 30;          // fallback

// ── Inicialização ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkAdmin();
  loadPatientFromUrl();
  setDefaultDate();
  initToggleButtons();
  initForm();
  initSidebarMobile();
  updateProgress();
  await carregarDadosPaciente(); // sexo + idade pra cálculos precisos
});

// Busca sexo + data_nascimento do paciente p/ usar nos cálculos
async function carregarDadosPaciente() {
  const patientId = document.getElementById('patient-id')?.value;
  if (!patientId) return;
  try {
    const { data } = await supabase
      .from('patients')
      .select('sexo, data_nascimento')
      .eq('id', patientId)
      .maybeSingle();
    if (data) {
      if (data.sexo) {
        pacienteSexo = data.sexo.toLowerCase().startsWith('m') ? 'masculino' : 'feminino';
      }
      if (data.data_nascimento) {
        const hoje = new Date();
        const nasc = new Date(data.data_nascimento + 'T00:00:00');
        let idade  = hoje.getFullYear() - nasc.getFullYear();
        const m    = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        if (idade > 0 && idade < 120) pacienteIdade = idade;
      }
    }
  } catch (e) { console.warn('[antro] erro carregando dados do paciente:', e); }
}

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session && isAdminUser(session.user)) return;

  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed?.session && isAdminUser(refreshed.session.user)) return;

  window.location.href = 'index.html';
}

function loadPatientFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const patientId = params.get('patient_id') || params.get('patient');
  const userId    = params.get('user_id')    || params.get('user');
  const nome      = params.get('nome');
  if (patientId) document.getElementById('patient-id').value = patientId;
  if (userId)    document.getElementById('user-id').value    = userId;
  if (nome) {
    document.getElementById('patient-name-sidebar').textContent = nome.split(' ')[0];
    document.title = `Antropometria — ${nome}`;
  }
}

function setDefaultDate() {
  const el = document.getElementById('data_avaliacao');
  if (el && !el.value) el.value = new Date().toISOString().split('T')[0];
}

function initToggleButtons() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      if (!field) return;
      document.querySelectorAll(`.toggle-btn[data-field="${field}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const hidden = document.getElementById(field);
      if (hidden) hidden.value = btn.dataset.value;
    });
  });
}

// ── Cálculos automáticos ──────────────────────────────────

function calcularIMC() {
  const peso   = parseFloat(document.getElementById('peso')?.value);
  let   altura = parseFloat(document.getElementById('altura')?.value);
  if (!altura || altura === 0) return;

  // ── Normaliza altura — se digitou em cm (>3), converte pra m ──
  // Ex: 165 → 1.65 ; 1.65 mantém ; 2.5 mantém (limite máx humano)
  if (altura > 3) {
    altura = altura / 100;
    const altEl = document.getElementById('altura');
    if (altEl) altEl.value = altura.toFixed(2); // corrige no input
  }
  // Validação: altura fisiologicamente razoável (0.5 – 2.5 m)
  if (altura < 0.5 || altura > 2.5) return;

  // ── 1. Peso ideal — sempre calcula se altura existe ─────────
  // Usa IMC alvo de 22 (meio do range saudável 18.5-24.9 kg/m²)
  // Range saudável: 18.5×alt² (mínimo) a 24.9×alt² (máximo)
  const alturaCm       = altura * 100;
  const pesoIdeal      = 22  * altura * altura;
  const pesoIdealMin   = 18.5 * altura * altura;
  const pesoIdealMax   = 24.9 * altura * altura;
  // Lorentz (1929) — clássica em nutrição clínica
  const pesoIdealLorentz = pacienteSexo === 'masculino'
    ? alturaCm - 100 - ((alturaCm - 150) / 4)
    : alturaCm - 100 - ((alturaCm - 150) / 2.5);
  // Devine (1974) — usada em cálculo de medicamentos / nutrição clínica
  const pesoIdealDevine = pacienteSexo === 'masculino'
    ? 50   + 0.91 * (alturaCm - 152.4)
    : 45.5 + 0.91 * (alturaCm - 152.4);

  const piEl = document.getElementById('peso_ideal');
  if (piEl) {
    // Só sobrescreve se o usuário ainda não digitou nada (campo vazio)
    // ou se foi calculado por nós antes (data-auto="1")
    if (!piEl.value || piEl.dataset.auto === '1') {
      piEl.value = pesoIdeal.toFixed(1);
      piEl.dataset.auto = '1';
    }
    // Adiciona hint com range saudável + alternativas
    let piHint = piEl.parentElement?.querySelector('.peso-ideal-hint');
    if (!piHint) {
      piHint = document.createElement('p');
      piHint.className = 'field-hint peso-ideal-hint';
      piHint.style.lineHeight = '1.5';
      piEl.parentElement?.appendChild(piHint);
    }
    piHint.innerHTML =
      `IMC 22: <strong>${pesoIdeal.toFixed(1)} kg</strong> · ` +
      `Lorentz: ${pesoIdealLorentz.toFixed(1)} kg · ` +
      `Devine: ${pesoIdealDevine.toFixed(1)} kg<br>` +
      `Faixa IMC saudável: ${pesoIdealMin.toFixed(1)}–${pesoIdealMax.toFixed(1)} kg`;
  }

  // ── 2. IMC — só calcula se peso existir ─────────────────────
  if (!peso) return;

  const imc = peso / (altura * altura);
  const imcEl = document.getElementById('imc');
  if (imcEl) imcEl.value = imc.toFixed(2);

  const classEl = document.getElementById('imc-class');
  if (classEl) {
    let texto = '', cor = '';
    if (imc < 18.5)      { texto = 'Abaixo do peso';   cor = 'class-baixo'; }
    else if (imc < 25)   { texto = 'Peso adequado';    cor = 'class-normal'; }
    else if (imc < 30)   { texto = 'Sobrepeso';        cor = 'class-atencao'; }
    else if (imc < 35)   { texto = 'Obesidade grau I'; cor = 'class-elevado'; }
    else if (imc < 40)   { texto = 'Obesidade grau II';cor = 'class-elevado'; }
    else                 { texto = 'Obesidade grau III';cor = 'class-elevado'; }
    classEl.textContent  = texto;
    classEl.className    = `field-hint ${cor}`;
  }

  atualizarResultado();
}

// Permite editar peso ideal manualmente (desativa auto-fill)
function _onPesoIdealManual() {
  const piEl = document.getElementById('peso_ideal');
  if (piEl) piEl.dataset.auto = '0';
}

function calcularComposicao() {
  const peso    = parseFloat(document.getElementById('peso')?.value);
  const pctGord = parseFloat(document.getElementById('pct_gordura')?.value);
  if (!peso || !pctGord) return;

  const pctMagra  = 100 - pctGord;
  const massaGorda = (peso * pctGord) / 100;
  const massaMagra = (peso * pctMagra) / 100;

  setVal('pct_magra',   pctMagra.toFixed(1));
  setVal('massa_gorda', massaGorda.toFixed(2));
  setVal('massa_magra', massaMagra.toFixed(2));

  atualizarResultado();
}

function calcularIndices() {
  const cintura = parseFloat(document.getElementById('circ_cintura')?.value);
  const quadril = parseFloat(document.getElementById('circ_quadril')?.value);
  const altura  = parseFloat(document.getElementById('altura')?.value);

  if (cintura && quadril) {
    const rcq = (cintura / quadril).toFixed(3);
    setVal('rcq', rcq);
  }

  if (cintura && altura) {
    const rcest = (cintura / (altura * 100)).toFixed(3);
    setVal('rcest', rcest);
  }

  atualizarResultado();
}

// ════════════════════════════════════════════════════════════
// Cálculo de pregas cutâneas — equações por sexo + idade
//
// Referências:
// • Pollock 7 (Jackson-Pollock-Ward 1980): mulheres / Jackson-Pollock 1978: homens
// • Pollock 3: idem (mulheres: tríc+supra+coxa / homens: peit+abd+coxa)
// • Guedes 1985: mulheres (subesc+supra+coxa) / homens (tríc+subesc+supra)
// • Faulkner 1968: ΣST4 (tríc+subesc+supra+abd) — independente de sexo
// • Conversão densidade→%G: Siri (1961) — % G = (4.95/D − 4.50) × 100
// ════════════════════════════════════════════════════════════
let _ultimaDensidade = null; // exposto pra atualizarResultado()

function calcularPregas() {
  const protocolo = document.getElementById('protocolo')?.value;
  validarProtocolo(); // sempre revalida (avisa dobras faltantes)
  if (!protocolo) return;

  const peso  = parseFloat(document.getElementById('peso')?.value) || 0;
  const sexo  = pacienteSexo;   // dinâmico (carregado do paciente)
  const idade = pacienteIdade;  // dinâmico

  const d = (id) => parseFloat(document.getElementById(id)?.value) || 0;
  const dobras = {
    biceps:       d('dobra_biceps'),
    triceps:      d('dobra_triceps'),
    subescapular: d('dobra_subescapular'),
    suprailiaca:  d('dobra_suprailiaca'),
    abdominal:    d('dobra_abdominal'),
    axilar:       d('dobra_axilar'),
    peitoral:     d('dobra_peitoral'),
    coxa:         d('dobra_coxa'),
    panturrilha:  d('dobra_panturrilha'),
  };

  let soma = 0, densidade = 0, pctGord = 0;

  if (protocolo === 'pollock7') {
    // Σ7 = peitoral + axilar + tríceps + subescapular + abdominal + suprailíaca + coxa
    soma = dobras.peitoral + dobras.axilar + dobras.triceps + dobras.subescapular +
           dobras.abdominal + dobras.suprailiaca + dobras.coxa;
    if (sexo === 'masculino') {
      // Jackson-Pollock (1978) homens
      densidade = 1.112 - (0.00043499 * soma) + (0.00000055 * soma * soma) - (0.00028826 * idade);
    } else {
      // Jackson-Pollock-Ward (1980) mulheres
      densidade = 1.097 - (0.00046971 * soma) + (0.00000056 * soma * soma) - (0.00012828 * idade);
    }
    pctGord = ((4.95 / densidade) - 4.50) * 100;

  } else if (protocolo === 'pollock3') {
    if (sexo === 'masculino') {
      // Homens: peitoral + abdominal + coxa
      soma = dobras.peitoral + dobras.abdominal + dobras.coxa;
      densidade = 1.10938 - (0.0008267 * soma) + (0.0000016 * soma * soma) - (0.0002574 * idade);
    } else {
      // Mulheres: tríceps + suprailíaca + coxa
      soma = dobras.triceps + dobras.suprailiaca + dobras.coxa;
      densidade = 1.0994921 - (0.0009929 * soma) + (0.0000023 * soma * soma) - (0.0001392 * idade);
    }
    pctGord = ((4.95 / densidade) - 4.50) * 100;

  } else if (protocolo === 'guedes') {
    if (sexo === 'masculino') {
      // Homens: tríceps + subescapular + suprailíaca
      soma = dobras.triceps + dobras.subescapular + dobras.suprailiaca;
      densidade = 1.17136 - (0.06706 * Math.log10(soma));
    } else {
      // Mulheres: subescapular + suprailíaca + coxa
      soma = dobras.subescapular + dobras.suprailiaca + dobras.coxa;
      densidade = 1.16650 - (0.07063 * Math.log10(soma));
    }
    pctGord = ((4.95 / densidade) - 4.50) * 100;

  } else if (protocolo === 'faulkner') {
    // Σ4 = tríceps + subescapular + suprailíaca + abdominal
    soma = dobras.triceps + dobras.subescapular + dobras.suprailiaca + dobras.abdominal;
    pctGord = (soma * 0.153) + 5.783;
    densidade = 0; // Faulkner não usa densidade
  }

  _ultimaDensidade = densidade > 0 ? densidade : null;

  setVal('soma_dobras', soma.toFixed(1));
  setVal('pct_gordura', pctGord.toFixed(1));

  const pctMagra   = 100 - pctGord;
  const massaGorda = peso > 0 ? (peso * pctGord / 100).toFixed(2) : '—';
  const massaMagra = peso > 0 ? (peso * pctMagra / 100).toFixed(2) : '—';
  const pctMagraFmt = pctMagra.toFixed(1);

  setVal('pct_magra',   pctMagraFmt);
  setVal('massa_gorda', massaGorda);
  setVal('massa_magra', massaMagra);

  // Exibe resultado das pregas
  const res = document.getElementById('resultado-pregas');
  if (res) {
    res.style.display = '';
    document.getElementById('res-pct-gordura').textContent = pctGord.toFixed(1) + '%';
    document.getElementById('res-pct-magra').textContent   = pctMagraFmt + '%';
    document.getElementById('res-massa-gorda').textContent = massaGorda + ' kg';
    document.getElementById('res-massa-magra').textContent = massaMagra + ' kg';
  }

  atualizarResultado();
}

// ════════════════════════════════════════════════════════════
// Área Muscular do Braço (AMB) e Área de Gordura do Braço (AGB)
//
// Referências:
// • AMB = ((CB − π·DT/10)²) / (4π)        [Frisancho 1981]
// • AMB corrigida (Heymsfield 1982): mulher AMB − 6.5 ; homem AMB − 10
// • AB (área total do braço) = CB² / (4π)
// • AGB = AB − AMB
// CB em cm, DT em mm (por isso /10 pra converter pra cm)
// Usa média D+E quando ambos estão preenchidos; senão usa o que tiver.
// ════════════════════════════════════════════════════════════
function calcularAreasBraco() {
  const cbD = parseFloat(document.getElementById('circ_braco_rel_d')?.value) || 0;
  const cbE = parseFloat(document.getElementById('circ_braco_rel_e')?.value) || 0;
  const dt  = parseFloat(document.getElementById('dobra_triceps')?.value)    || 0;

  // Média de D+E quando ambos preenchidos; fallback pro lado que tem
  let cb = 0;
  if (cbD > 0 && cbE > 0)      cb = (cbD + cbE) / 2;
  else if (cbD > 0)            cb = cbD;
  else if (cbE > 0)            cb = cbE;

  const ambEl = document.getElementById('rf-amb');
  const agbEl = document.getElementById('rf-agb');

  if (!cb || !dt) {
    if (ambEl) ambEl.textContent = '—';
    if (agbEl) agbEl.textContent = '—';
    return;
  }

  const PI = Math.PI;
  const dtCm   = dt / 10; // mm → cm
  const amb    = Math.pow(cb - (PI * dtCm), 2) / (4 * PI);
  const ambCorr = pacienteSexo === 'masculino' ? amb - 10 : amb - 6.5;
  const ab     = (cb * cb) / (4 * PI);
  const agb    = ab - amb;

  if (ambEl) ambEl.textContent = ambCorr.toFixed(2) + ' cm²';
  if (agbEl) agbEl.textContent = agb.toFixed(2)    + ' cm²';
}

// Versão "snapshot" usada no save — retorna número, não atualiza DOM
function _calcAreasBracoSnapshot() {
  const cbD = parseFloat(document.getElementById('circ_braco_rel_d')?.value) || 0;
  const cbE = parseFloat(document.getElementById('circ_braco_rel_e')?.value) || 0;
  const dt  = parseFloat(document.getElementById('dobra_triceps')?.value)    || 0;
  let cb = 0;
  if (cbD > 0 && cbE > 0)      cb = (cbD + cbE) / 2;
  else if (cbD > 0)            cb = cbD;
  else if (cbE > 0)            cb = cbE;
  if (!cb || !dt) return null;
  const PI = Math.PI;
  const dtCm = dt / 10;
  const amb  = Math.pow(cb - (PI * dtCm), 2) / (4 * PI);
  const ambCorr = pacienteSexo === 'masculino' ? amb - 10 : amb - 6.5;
  const ab   = (cb * cb) / (4 * PI);
  const agb  = ab - amb;
  return {
    amb: +amb.toFixed(2),
    amb_corrigida: +ambCorr.toFixed(2),
    ab: +ab.toFixed(2),
    agb: +agb.toFixed(2),
  };
}

// ════════════════════════════════════════════════════════════
// CLASSIFICAÇÃO DE % GORDURA (ACSM / Pollock-Wilmore)
// Tabela por idade × sexo. Retorna { texto, classe } pra colorir o card.
// ════════════════════════════════════════════════════════════
function classificarPctGordura(pctG, sexo, idade) {
  if (!pctG || !sexo || !idade) return null;
  // Faixa etária
  let faixa;
  if (idade < 30)      faixa = 0;
  else if (idade < 40) faixa = 1;
  else if (idade < 50) faixa = 2;
  else if (idade < 60) faixa = 3;
  else                 faixa = 4;

  // Limites por categoria (excelente, bom, acima_media, media, abaixo_media, ruim)
  // Mulher (Pollock-Wilmore)
  const TAB_F = [
    { exc:16, bom:19, acima:22, media:25, abaixo:28, ruim:32 }, // 20-29
    { exc:17, bom:20, acima:23, media:26, abaixo:29, ruim:33 }, // 30-39
    { exc:18, bom:23, acima:26, media:29, abaixo:32, ruim:36 }, // 40-49
    { exc:19, bom:24, acima:27, media:30, abaixo:33, ruim:37 }, // 50-59
    { exc:20, bom:25, acima:28, media:31, abaixo:34, ruim:38 }, // 60+
  ];
  // Homem
  const TAB_M = [
    { exc:11, bom:13, acima:16, media:19, abaixo:22, ruim:26 }, // 20-29
    { exc:12, bom:15, acima:18, media:21, abaixo:24, ruim:27 }, // 30-39
    { exc:14, bom:17, acima:20, media:23, abaixo:26, ruim:29 }, // 40-49
    { exc:15, bom:19, acima:22, media:25, abaixo:28, ruim:31 }, // 50-59
    { exc:16, bom:20, acima:23, media:26, abaixo:29, ruim:32 }, // 60+
  ];
  const t = (sexo === 'masculino' ? TAB_M : TAB_F)[faixa];
  if (pctG <  t.exc)    return { texto: 'Excelente',       classe: 'class-baixo' };
  if (pctG <= t.bom)    return { texto: 'Bom',             classe: 'class-baixo' };
  if (pctG <= t.acima)  return { texto: 'Acima da média',  classe: 'class-normal' };
  if (pctG <= t.media)  return { texto: 'Média',           classe: 'class-normal' };
  if (pctG <= t.abaixo) return { texto: 'Abaixo da média', classe: 'class-atencao' };
  if (pctG <= t.ruim)   return { texto: 'Ruim',            classe: 'class-atencao' };
  return                       { texto: 'Muito ruim',      classe: 'class-elevado' };
}

// ════════════════════════════════════════════════════════════
// FRAME SIZE / COMPLEIÇÃO CORPORAL — Grant (1980)
// R = altura_cm / circ_punho_cm
// ════════════════════════════════════════════════════════════
function calcularFrameSize() {
  const altura = parseFloat(document.getElementById('altura')?.value) || 0;
  const pD     = parseFloat(document.getElementById('circ_punho_d')?.value) || 0;
  const pE     = parseFloat(document.getElementById('circ_punho_e')?.value) || 0;
  let p = 0;
  if (pD > 0 && pE > 0) p = (pD + pE) / 2;
  else                  p = pD || pE;

  const compEl  = document.getElementById('rf-compleicao');
  const compCls = document.getElementById('rf-compleicao-class');
  if (!altura || !p) {
    if (compEl)  compEl.textContent = '—';
    if (compCls) compCls.textContent = 'altura ÷ punho';
    return null;
  }
  const alturaCm = altura > 3 ? altura : altura * 100;
  const r = alturaCm / p;
  // Limites Grant 1980 (sexo)
  const lim = pacienteSexo === 'masculino'
    ? { grande: 9.6,  pequena: 10.4 }
    : { grande: 10.1, pequena: 11.0 };
  let cat;
  if (r < lim.grande)       cat = 'Grande';
  else if (r > lim.pequena) cat = 'Pequena';
  else                      cat = 'Média';
  if (compEl)  compEl.textContent = cat;
  if (compCls) compCls.textContent = `R=${r.toFixed(2)} · altura ÷ punho`;
  return { r: +r.toFixed(2), categoria: cat };
}

// ════════════════════════════════════════════════════════════
// MASSA MUSCULAR ESQUELÉTICA — Lee (2000) antropométrica simples
// SM = (peso × 0.244) + (altura_m × 7.80) − (idade × 0.098)
//    + (6.6 × sexo) − 3.3
// sexo = 1 (M) | 0 (F)
// ════════════════════════════════════════════════════════════
function calcularMMEsqueletica() {
  const peso   = parseFloat(document.getElementById('peso')?.value) || 0;
  let altura   = parseFloat(document.getElementById('altura')?.value) || 0;
  if (altura > 3) altura = altura / 100; // normaliza
  const idade  = pacienteIdade;
  const sexoB  = pacienteSexo === 'masculino' ? 1 : 0;
  const el = document.getElementById('rf-mm-esq');
  if (!peso || !altura || !idade) {
    if (el) el.textContent = '—';
    return null;
  }
  const sm = (peso * 0.244) + (altura * 7.80) - (idade * 0.098) + (6.6 * sexoB) - 3.3;
  if (el) el.textContent = sm.toFixed(2) + ' kg';
  return +sm.toFixed(2);
}

// ════════════════════════════════════════════════════════════
// VALIDAÇÃO DE PROTOCOLO DE PREGAS
// Avisa quando o protocolo selecionado precisa de dobras que estão vazias.
// ════════════════════════════════════════════════════════════
function validarProtocolo() {
  const protocolo = document.getElementById('protocolo')?.value;
  const aviso = document.getElementById('protocolo-aviso');
  if (!aviso) return;

  if (!protocolo) {
    aviso.style.display = 'none';
    return;
  }

  // Dobras requeridas por protocolo (dependem do sexo p/ Pollock 3 e Guedes)
  const REQUERIDAS = {
    pollock7:  ['triceps','subescapular','suprailiaca','abdominal','axilar','peitoral','coxa'],
    pollock3:  pacienteSexo === 'masculino'
                 ? ['peitoral','abdominal','coxa']
                 : ['triceps','suprailiaca','coxa'],
    guedes:    pacienteSexo === 'masculino'
                 ? ['triceps','subescapular','suprailiaca']
                 : ['subescapular','suprailiaca','coxa'],
    faulkner:  ['triceps','subescapular','suprailiaca','abdominal'],
  };
  const NOMES = {
    triceps: 'Tríceps', subescapular: 'Subescapular', suprailiaca: 'Suprailíaca',
    abdominal: 'Abdominal', axilar: 'Axilar Média', peitoral: 'Peitoral',
    coxa: 'Coxa', biceps: 'Bíceps', panturrilha: 'Panturrilha Medial',
  };
  const req = REQUERIDAS[protocolo] || [];
  const faltantes = req.filter(d => {
    const v = parseFloat(document.getElementById('dobra_' + d)?.value);
    return !v || v <= 0;
  });

  if (faltantes.length === 0) {
    aviso.style.display = 'none';
    aviso.textContent = '';
  } else {
    const labelProto = ({
      pollock7: '7 Pregas (Pollock-Ward)',
      pollock3: '3 Pregas (Pollock)',
      guedes:   'Guedes',
      faulkner: 'Faulkner',
    })[protocolo] || protocolo;
    aviso.style.display = '';
    aviso.textContent =
      `${labelProto} requer ${req.length} dobras. ` +
      `Você preencheu ${req.length - faltantes.length}. ` +
      `Faltam: ${faltantes.map(f => NOMES[f]).join(', ')}.`;
  }
}

// ════════════════════════════════════════════════════════════
// DELTAS — diferença vs avaliação anterior
// Lê da última entrada de evolucaoData (que é populada antes do render)
// ════════════════════════════════════════════════════════════
function aplicarDeltas() {
  if (!evolucaoData || evolucaoData.length < 2) return;
  // O último item é o atual sendo editado/visto; o penúltimo é a avaliação anterior
  const atual    = evolucaoData[evolucaoData.length - 1];
  const anterior = evolucaoData[evolucaoData.length - 2];
  if (!atual || !anterior) return;

  const cards = [
    { id: 'rf-peso',      key: 'peso',                unit: 'kg',  decimais: 1 },
    { id: 'rf-imc',       key: 'imc',                 unit: '',    decimais: 2 },
    { id: 'rf-gordura',   key: 'pct_gordura',         unit: '%',   decimais: 1 },
    { id: 'rf-mm',        key: 'massa_magra',         unit: 'kg',  decimais: 1 },
    { id: 'rf-rcq',       key: 'rcq',                 unit: '',    decimais: 3 },
    { id: 'rf-amb',       key: 'area_muscular_braco', unit: 'cm²', decimais: 2 },
    { id: 'rf-agb',       key: 'area_gordura_braco',  unit: 'cm²', decimais: 2 },
    { id: 'rf-densidade', key: 'densidade_corporal',  unit: '',    decimais: 4 },
  ];

  cards.forEach(({ id, key, decimais }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const a = atual[key], b = anterior[key];
    if (a == null || b == null || isNaN(a) || isNaN(b)) return;
    const d = a - b;
    if (Math.abs(d) < Math.pow(10, -(decimais + 1))) return; // ignora ruído
    // Cria/atualiza span de delta
    let dEl = el.querySelector('.delta-anterior');
    if (!dEl) {
      dEl = document.createElement('span');
      dEl.className = 'delta-anterior';
      dEl.style.cssText = 'display:inline-block;margin-left:6px;font-size:0.55em;font-weight:500;letter-spacing:0;';
      el.appendChild(dEl);
    }
    const sinal = d > 0 ? '▲' : '▼';
    const cor   = d > 0 ? '#a04030' : '#3d6b4f';
    dEl.style.color = cor;
    dEl.textContent = ` ${sinal} ${Math.abs(d).toFixed(decimais)}`;
  });
}

function atualizarResultado() {
  const v = (id) => {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) || null : null;
  };
  const txt = (id) => {
    const el = document.getElementById(id);
    return el?.textContent || '';
  };

  const peso    = v('peso');
  const imc     = v('imc');
  const pctGord = v('pct_gordura');
  const pctMagra= v('pct_magra');
  const mg      = v('massa_gorda');
  const mm      = v('massa_magra');
  const rcq     = v('rcq');
  const rcest   = v('rcest');

  setResText('rf-peso',   peso   ? peso + ' kg'  : '—');
  setResText('rf-imc',    imc    ? imc.toFixed(2): '—');
  setResText('rf-gordura',pctGord? pctGord.toFixed(1) + '%': '—');
  setResText('rf-magra',  pctMagra? pctMagra.toFixed(1) + '%': '—');
  setResText('rf-mg',     mg     ? mg.toFixed(2) + ' kg': '—');
  setResText('rf-mm',     mm     ? mm.toFixed(2) + ' kg': '—');
  setResText('rf-rcq',    rcq    ? rcq.toFixed(3): '—');
  setResText('rf-rcest',  rcest  ? rcest.toFixed(3): '—');
  setResText('rf-densidade', _ultimaDensidade ? _ultimaDensidade.toFixed(4) : '—');

  // Recalcula áreas do braço, frame size, MM esquelética
  calcularAreasBraco();
  calcularFrameSize();
  calcularMMEsqueletica();

  // Classificação de % gordura (Pollock-Wilmore)
  if (pctGord) {
    const cls = classificarPctGordura(pctGord, pacienteSexo, pacienteIdade);
    const clsEl = document.getElementById('rf-gordura-class');
    if (clsEl && cls) {
      clsEl.textContent = cls.texto;
      clsEl.className = `resultado-card-class ${cls.classe}`;
    }
  }

  if (imc) {
    const cl = document.getElementById('rf-imc-class');
    if (cl) cl.textContent = txt('imc-class');
  }

  // Aplica deltas vs avaliação anterior (se houver)
  aplicarDeltas();
}

function showMetodo(tipo) {
  document.getElementById('secao-bio').style.display    = tipo === 'bio'    ? '' : 'none';
  document.getElementById('secao-pregas').style.display = tipo === 'pregas' ? '' : 'none';
}
window.showMetodo      = showMetodo;
window.calcularIMC     = calcularIMC;
window._onPesoIdealManual = _onPesoIdealManual;
window.calcularComposicao = calcularComposicao;
window.calcularIndices = calcularIndices;
window.calcularPregas  = calcularPregas;
window.calcularAreasBraco = calcularAreasBraco;
window.calcularFrameSize = calcularFrameSize;
window.calcularMMEsqueletica = calcularMMEsqueletica;
window.validarProtocolo = validarProtocolo;
window.classificarPctGordura = classificarPctGordura;

// ── Navegação ─────────────────────────────────────────────
function goToStep(n) {
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  document.getElementById(`snav-${currentStep}`).classList.remove('active');
  document.getElementById(`snav-${currentStep}`).classList.add('done');
  currentStep = n;
  document.getElementById(`step-${currentStep}`).classList.add('active');
  document.getElementById(`snav-${currentStep}`).classList.add('active');
  document.getElementById(`snav-${currentStep}`).classList.remove('done');
  if (currentStep === 3) atualizarResultado();
  updateNavBtns();
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() { if (currentStep < TOTAL_STEPS - 1) goToStep(currentStep + 1); }
function prevStep() { if (currentStep > 0) goToStep(currentStep - 1); }

function updateNavBtns() {
  document.getElementById('btn-prev').style.display = currentStep === 0 ? 'none' : '';
  document.getElementById('btn-next').style.display = currentStep === TOTAL_STEPS - 1 ? 'none' : '';
  document.getElementById('btn-save').style.display = currentStep === TOTAL_STEPS - 1 ? '' : 'none';
}

function updateProgress() {
  document.getElementById('progress-fill').style.width = (currentStep / (TOTAL_STEPS - 1)) * 100 + '%';
}

window.goToStep = goToStep;
window.nextStep = nextStep;
window.prevStep = prevStep;

// ── Submit ────────────────────────────────────────────────
function initForm() {
  const form = document.getElementById('antro-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarAvaliacao();
  });

  // Guarda universal: dirty + required + beforeunload
  formGuard = installFormGuard({ form, label: 'Antropometria' });
}

async function salvarAvaliacao() {
  const btn = document.getElementById('btn-save');
  const msg = document.getElementById('form-message');
  btn.disabled    = true;
  btn.textContent = 'Salvando...';

  const patientId = document.getElementById('patient-id').value;
  const userId    = document.getElementById('user-id').value;

  if (!patientId || !userId) {
    showMsg(msg, 'Paciente não identificada.', 'error');
    btn.disabled = false; btn.textContent = 'Salvar Avaliação';
    return;
  }

  // Limites por tipo de campo (previne overflow no Supabase NUMERIC)
  const LIMITES = {
    altura:           { min: 0.5,  max: 2.5,    auto_div_se_maior: 3 }, // metros
    peso:             { min: 1,    max: 999.9 },
    peso_ideal:       { min: 1,    max: 999.9 },
    peso_usual:       { min: 1,    max: 999.9 },
    peso_meta:        { min: 1,    max: 999.9 },
    imc:              { min: 5,    max: 99.99 },
    pct_gordura:      { min: 0,    max: 99.9 },
    pct_magra:        { min: 0,    max: 99.9 },
    massa_gorda:      { min: 0,    max: 999.9 },
    massa_magra:      { min: 0,    max: 999.9 },
    massa_muscular:   { min: 0,    max: 999.9 },
    massa_ossea:      { min: 0,    max: 99.9 },
    agua_corporal:    { min: 0,    max: 99.9 },
    gordura_visceral: { min: 0,    max: 99 },
    metabolismo_basal:{ min: 0,    max: 9999 },
    soma_dobras:      { min: 0,    max: 999 },
    rcq:              { min: 0,    max: 9.99 },
    rcest:            { min: 0,    max: 9.99 },
    densidade_corporal:           { min: 0.5, max: 1.2  },
    area_muscular_braco:          { min: 0,   max: 999.9 },
    area_gordura_braco:           { min: 0,   max: 999.9 },
    frame_size_index:             { min: 0,   max: 99.99 },
    massa_muscular_esqueletica:   { min: 0,   max: 999.9 },
    // Padrão pra circunferências e dobras: 0–999.9
    _default:         { min: 0,    max: 999.9 },
  };
  const vNum = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    let v = parseFloat(el.value);
    if (isNaN(v)) return null;
    const lim = LIMITES[id] || LIMITES._default;
    // Auto-correção: se altura > 3, divide por 100 (digitou em cm)
    if (lim.auto_div_se_maior && v > lim.auto_div_se_maior) v = v / 100;
    // Clamp dentro do range
    if (lim.min != null && v < lim.min) v = lim.min;
    if (lim.max != null && v > lim.max) v = lim.max;
    return v;
  };
  const vStr = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    return el.value.trim() || null;
  };

  const payload = {
    patient_id: patientId,
    user_id:    userId,
    data_avaliacao: vStr('data_avaliacao') || new Date().toISOString().split('T')[0],
    descricao:        vStr('descricao'),
    peso:             vNum('peso'),
    altura:           vNum('altura'),
    imc:              vNum('imc'),
    peso_ideal:       vNum('peso_ideal'),
    peso_usual:       vNum('peso_usual'),
    peso_meta:        vNum('peso_meta'),
    metodo:           vStr('metodo'),
    protocolo:        vStr('protocolo'),
    pct_gordura:      vNum('pct_gordura'),
    pct_magra:        vNum('pct_magra'),
    massa_gorda:      vNum('massa_gorda'),
    massa_magra:      vNum('massa_magra'),
    massa_muscular:   vNum('massa_muscular'),
    massa_ossea:      vNum('massa_ossea'),
    agua_corporal:    vNum('agua_corporal'),
    gordura_visceral: vNum('gordura_visceral'),
    metabolismo_basal:vNum('metabolismo_basal'),
    dobra_biceps:     vNum('dobra_biceps'),
    dobra_triceps:    vNum('dobra_triceps'),
    dobra_subescapular:vNum('dobra_subescapular'),
    dobra_suprailiaca:vNum('dobra_suprailiaca'),
    dobra_abdominal:  vNum('dobra_abdominal'),
    dobra_axilar:     vNum('dobra_axilar'),
    dobra_peitoral:   vNum('dobra_peitoral'),
    dobra_coxa:       vNum('dobra_coxa'),
    dobra_panturrilha:vNum('dobra_panturrilha'),
    soma_dobras:      vNum('soma_dobras'),
    circ_pescoco:     vNum('circ_pescoco'),
    circ_torax:       vNum('circ_torax'),
    circ_cintura:     vNum('circ_cintura'),
    circ_abdominal:   vNum('circ_abdominal'),
    circ_quadril:     vNum('circ_quadril'),
    circ_braco_rel_d: vNum('circ_braco_rel_d'),
    circ_braco_rel_e: vNum('circ_braco_rel_e'),
    circ_braco_cont_d:vNum('circ_braco_cont_d'),
    circ_braco_cont_e:vNum('circ_braco_cont_e'),
    circ_antebraco_d: vNum('circ_antebraco_d'),
    circ_antebraco_e: vNum('circ_antebraco_e'),
    circ_coxa_prox_d: vNum('circ_coxa_prox_d'),
    circ_coxa_prox_e: vNum('circ_coxa_prox_e'),
    circ_coxa_med_d:  vNum('circ_coxa_med_d'),
    circ_coxa_med_e:  vNum('circ_coxa_med_e'),
    circ_panturrilha_d:vNum('circ_panturrilha_d'),
    circ_panturrilha_e:vNum('circ_panturrilha_e'),
    circ_punho_d:     vNum('circ_punho_d'),
    circ_punho_e:     vNum('circ_punho_e'),
    rcq:              vNum('rcq'),
    rcest:            vNum('rcest'),
    densidade_corporal: _ultimaDensidade,
    obs:              vStr('obs'),
  };

  // AMB e AGB calculadas (recomputa pra garantir o valor mais recente no save)
  const _amb = _calcAreasBracoSnapshot();
  if (_amb) {
    payload.area_muscular_braco = _amb.amb_corrigida;
    payload.area_gordura_braco  = _amb.agb;
  }

  // Frame Size Index (compleição) e MM esquelética
  const _fs = calcularFrameSize();
  if (_fs && _fs.r) payload.frame_size_index = _fs.r;
  const _sm = calcularMMEsqueletica();
  if (_sm) payload.massa_muscular_esqueletica = _sm;

  const { error } = await supabase.from('antropometria').insert(payload);

  if (error) {
    showMsg(msg, 'Erro ao salvar: ' + error.message, 'error');
    btn.disabled = false; btn.textContent = 'Salvar Avaliação';
    return;
  }

  formGuard?.markSaved();
  showToast('Avaliação salva com sucesso.');
  setTimeout(() => window.location.href = 'admin.html', 1500);
}

// ── Utilitários ───────────────────────────────────────────
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function setResText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className   = `form-message ${type} visible`;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 3000);
}

function initSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btn     = document.getElementById('hamburger-btn');
  if (!btn) return;
  btn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
  overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
}



// ── Widget de documentos ───────────────────────────────────
import { initDocExtractor, preencherFormulario } from './doc-extractor.js';

document.addEventListener('DOMContentLoaded', () => {
  initDocExtractor('doc-extractor-antro', 'antropometria', (dados, tipo, n) => {
    const msg = n > 0
      ? `${n} campo(s) preenchido(s). Revise e salve.`
      : 'Preencha os campos acima e clique em "Preencher formulário".';
    if (typeof showToast === 'function') showToast(msg);
  });
});

// ══════════════════════════════════════════════════════════════
// MOTOR DE INTERPRETAÇÃO CLÍNICA — Antropometria
// ══════════════════════════════════════════════════════════════

// ── Referências por sexo e faixa de % gordura ─────────────
const GORDURA_REF = {
  feminino: [
    { max: 14, label: 'Atleta',          classe: 'score-bom',   cor: '#3D6B4F' },
    { max: 21, label: 'Excelente',       classe: 'score-bom',   cor: '#3D6B4F' },
    { max: 25, label: 'Bom',             classe: 'score-bom',   cor: '#3D6B4F' },
    { max: 32, label: 'Aceitável',       classe: 'score-medio', cor: '#B8860B' },
    { max: 38, label: 'Obesidade I',     classe: 'score-baixo', cor: '#8B5E3C' },
    { max: 999, label: 'Obesidade II',   classe: 'score-baixo', cor: '#7A2E2E' },
  ],
  masculino: [
    { max: 8,  label: 'Atleta',          classe: 'score-bom',   cor: '#3D6B4F' },
    { max: 14, label: 'Excelente',       classe: 'score-bom',   cor: '#3D6B4F' },
    { max: 18, label: 'Bom',             classe: 'score-bom',   cor: '#3D6B4F' },
    { max: 25, label: 'Aceitável',       classe: 'score-medio', cor: '#B8860B' },
    { max: 31, label: 'Obesidade I',     classe: 'score-baixo', cor: '#8B5E3C' },
    { max: 999, label: 'Obesidade II',   classe: 'score-baixo', cor: '#7A2E2E' },
  ],
};

// ── Classificar % gordura ─────────────────────────────────
function classificarGordura(pct, sexo) {
  const ref = GORDURA_REF[sexo] || GORDURA_REF.feminino;
  return ref.find(r => pct <= r.max) || ref[ref.length - 1];
}

// ── Score corporal (0–100) ────────────────────────────────
function calcularScore() {
  let score = 100;
  let penalidades = [];

  const pct    = parseFloat(document.getElementById('pct_gordura')?.value);
  const cintura= parseFloat(document.getElementById('circunferencia_cintura')?.value
                  || document.getElementById('cintura')?.value);
  const altura  = parseFloat(document.getElementById('altura')?.value);
  const quadril = parseFloat(document.getElementById('circunferencia_quadril')?.value
                   || document.getElementById('quadril')?.value);
  const imc     = parseFloat(document.getElementById('imc')?.value);
  const gv      = parseFloat(document.getElementById('gordura_visceral')?.value);

  // Sexo do paciente (tenta buscar da anamnese ou URL)
  const sexo = getSexoPaciente();

  // Penalidade por IMC
  if (!isNaN(imc)) {
    if (imc >= 40)      { score -= 30; penalidades.push({ texto: `IMC ${imc.toFixed(1)} — Obesidade Grau III`, cor: '#7A2E2E' }); }
    else if (imc >= 35) { score -= 22; penalidades.push({ texto: `IMC ${imc.toFixed(1)} — Obesidade Grau II`, cor: '#7A2E2E' }); }
    else if (imc >= 30) { score -= 15; penalidades.push({ texto: `IMC ${imc.toFixed(1)} — Obesidade Grau I`, cor: '#8B5E3C' }); }
    else if (imc >= 25) { score -= 8;  penalidades.push({ texto: `IMC ${imc.toFixed(1)} — Sobrepeso`, cor: '#B8860B' }); }
  }

  // Penalidade por % gordura
  if (!isNaN(pct)) {
    const ref = classificarGordura(pct, sexo);
    if (ref.label === 'Obesidade II')    { score -= 25; penalidades.push({ texto: `${pct}% gordura — Obesidade II`, cor: '#7A2E2E' }); }
    else if (ref.label === 'Obesidade I'){ score -= 18; penalidades.push({ texto: `${pct}% gordura — Obesidade I`, cor: '#8B5E3C' }); }
    else if (ref.label === 'Aceitável')  { score -= 8; }
  }

  // Penalidade por circunferência abdominal
  if (!isNaN(cintura)) {
    const limiar = sexo === 'masculino' ? 94 : 80;
    const limiarAlto = sexo === 'masculino' ? 102 : 88;
    if (cintura >= limiarAlto) { score -= 20; penalidades.push({ texto: `Cintura ${cintura}cm — risco cardiovascular muito elevado`, cor: '#7A2E2E' }); }
    else if (cintura >= limiar){ score -= 10; penalidades.push({ texto: `Cintura ${cintura}cm — risco cardiovascular elevado`, cor: '#B8860B' }); }
  }

  // Penalidade por RCE (cintura/estatura)
  if (!isNaN(cintura) && !isNaN(altura)) {
    const altCm = altura > 3 ? altura : altura * 100;
    const rce = cintura / altCm;
    if (rce > 0.6)       { score -= 15; penalidades.push({ texto: `RCE ${rce.toFixed(2)} — alto risco metabólico`, cor: '#7A2E2E' }); }
    else if (rce > 0.5)  { score -= 8; }
  }

  // Penalidade por gordura visceral
  if (!isNaN(gv) && gv > 12) { score -= 15; penalidades.push({ texto: `Gordura visceral nível ${gv} — muito elevada`, cor: '#7A2E2E' }); }
  else if (!isNaN(gv) && gv > 9) { score -= 8; penalidades.push({ texto: `Gordura visceral nível ${gv} — elevada`, cor: '#B8860B' }); }

  score = Math.max(0, Math.min(100, score));

  return { score: Math.round(score), penalidades };
}

// ── Gera diagnóstico clínico automático ───────────────────
function gerarDiagnostico() {
  const container = document.getElementById('diagnostico-container');
  const vazio     = document.getElementById('diagnostico-vazio');
  if (!container) return;

  const pct     = parseFloat(document.getElementById('pct_gordura')?.value);
  const mm      = parseFloat(document.getElementById('massa_magra')?.value);
  const mg      = parseFloat(document.getElementById('massa_gorda')?.value);
  const cintura = parseFloat(document.getElementById('circunferencia_cintura')?.value
                   || document.getElementById('cintura')?.value);
  const quadril = parseFloat(document.getElementById('circunferencia_quadril')?.value
                   || document.getElementById('quadril')?.value);
  const altura  = parseFloat(document.getElementById('altura')?.value);
  const imc     = parseFloat(document.getElementById('imc')?.value);
  const gv      = parseFloat(document.getElementById('gordura_visceral')?.value);
  const pesoMeta= parseFloat(document.getElementById('peso_meta')?.value);
  const peso    = parseFloat(document.getElementById('peso')?.value);
  const sexo    = getSexoPaciente();

  const temDados = !isNaN(pct) || !isNaN(imc) || !isNaN(cintura);
  if (!temDados) { container.style.display = 'none'; vazio.style.display = ''; return; }

  container.style.display = '';
  vazio.style.display = 'none';

  // Score
  const { score, penalidades } = calcularScore();
  renderScore(score, penalidades);

  // Achados
  const achados = [];
  const prioridades = [];

  if (!isNaN(pct)) {
    const ref = classificarGordura(pct, sexo);
    const cor = ref.cor;
    achados.push({ texto: `% Gordura: ${pct}% — ${ref.label}`, cor });
    if (['Obesidade I','Obesidade II'].includes(ref.label)) {
      prioridades.push({ texto: 'Reduzir gordura corporal com déficit calórico controlado + exercício', cor: '#B8860B' });
    }
  }

  if (!isNaN(imc)) {
    const imcClass = imc < 18.5 ? { l: 'Baixo peso', c: '#3A5E8B' }
      : imc < 25   ? { l: 'Eutrófico', c: '#3D6B4F' }
      : imc < 30   ? { l: 'Sobrepeso', c: '#B8860B' }
      : imc < 35   ? { l: 'Obesidade I', c: '#8B5E3C' }
      : imc < 40   ? { l: 'Obesidade II', c: '#7A2E2E' }
      :              { l: 'Obesidade III', c: '#7A2E2E' };
    achados.push({ texto: `IMC: ${imc.toFixed(1)} — ${imcClass.l}`, cor: imcClass.c });
  }

  if (!isNaN(cintura)) {
    const lim = sexo === 'masculino' ? 94 : 80;
    const limA = sexo === 'masculino' ? 102 : 88;
    if (cintura >= limA) {
      achados.push({ texto: `Cintura ${cintura}cm — risco muito elevado (ref: <${lim}cm)`, cor: '#7A2E2E' });
      prioridades.push({ texto: 'Prioridade: reduzir circunferência abdominal — marcador de risco cardiovascular e metabólico', cor: '#7A2E2E' });
    } else if (cintura >= lim) {
      achados.push({ texto: `Cintura ${cintura}cm — risco elevado (ref: <${lim}cm)`, cor: '#B8860B' });
    }
  }

  if (!isNaN(cintura) && !isNaN(altura)) {
    const altCm = altura > 3 ? altura : altura * 100;
    const rce = (cintura / altCm).toFixed(2);
    if (rce > 0.6)      achados.push({ texto: `RCE ${rce} — alto risco metabólico (ideal: <0,5)`, cor: '#7A2E2E' });
    else if (rce > 0.5) achados.push({ texto: `RCE ${rce} — risco metabólico aumentado`, cor: '#B8860B' });
    else                achados.push({ texto: `RCE ${rce} — adequado`, cor: '#3D6B4F' });
  }

  if (!isNaN(gv)) {
    if (gv > 12)      achados.push({ texto: `Gordura visceral nível ${gv} — muito elevada (ideal: ≤9)`, cor: '#7A2E2E' });
    else if (gv > 9)  achados.push({ texto: `Gordura visceral nível ${gv} — elevada`, cor: '#B8860B' });
    else              achados.push({ texto: `Gordura visceral nível ${gv} — adequada`, cor: '#3D6B4F' });
  }

  if (!isNaN(mm) && !isNaN(peso)) {
    const pctMM = (mm / peso) * 100;
    const limMM = sexo === 'masculino' ? 70 : 65;
    if (pctMM < limMM) {
      achados.push({ texto: `Massa magra ${mm}kg (${pctMM.toFixed(1)}%) — abaixo do ideal`, cor: '#B8860B' });
      prioridades.push({ texto: 'Preservar / aumentar massa magra: treino de força + aporte proteico adequado', cor: '#3A5E8B' });
    } else {
      achados.push({ texto: `Massa magra ${mm}kg (${pctMM.toFixed(1)}%) — adequada`, cor: '#3D6B4F' });
    }
  }

  // Prioridades padrão se não preenchidas
  if (!prioridades.length) {
    if (!isNaN(imc) && imc >= 25) prioridades.push({ texto: 'Déficit calórico moderado com preservação de massa muscular', cor: '#B8860B' });
    if (!isNaN(pct)) prioridades.push({ texto: 'Reavaliação em 30–60 dias para monitorar evolução', cor: '#3D6B4F' });
  }

  // Renderiza achados
  const achadosEl = document.getElementById('achados-lista');
  if (achadosEl) {
    achadosEl.innerHTML = achados.map(a => `
      <div class="achado-item">
        <div class="achado-dot" style="background:${a.cor};"></div>
        <span style="color:${a.cor};font-weight:500;">${a.texto}</span>
      </div>`).join('') || '<p style="color:var(--text-light);">Dados insuficientes para gerar achados.</p>';
  }

  const priorEl = document.getElementById('prioridades-lista');
  if (priorEl) {
    priorEl.innerHTML = prioridades.map((p,i) => `
      <div class="achado-item">
        <span style="font-family:'Cormorant Garamond',serif;font-weight:300;font-size:1rem;color:var(--detail);min-width:18px;">${i+1}.</span>
        <span>${p.texto}</span>
      </div>`).join('') || '<p style="color:var(--text-light);">Nenhuma prioridade identificada.</p>';
  }

  // Distância da meta
  const metaBox = document.getElementById('meta-box');
  const metaContent = document.getElementById('meta-content');
  if (!isNaN(pesoMeta) && !isNaN(peso) && metaBox && metaContent) {
    const diff = peso - pesoMeta;
    if (diff > 0) {
      const sem05 = Math.ceil(diff / 0.5);
      const sem075 = Math.ceil(diff / 0.75);
      metaBox.style.display = '';
      metaContent.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-family:'DM Sans',sans-serif;">
          <div style="text-align:center;padding:12px;border:1px solid rgba(184,147,106,0.3);">
            <p style="font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--subtitle);margin-bottom:6px;">Faltam</p>
            <p style="font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:300;color:var(--text);">${diff.toFixed(1)} kg</p>
          </div>
          <div style="text-align:center;padding:12px;border:1px solid rgba(184,147,106,0.3);">
            <p style="font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--subtitle);margin-bottom:6px;">0,5 kg/sem</p>
            <p style="font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:300;color:var(--text);">${sem05} sem</p>
            <p style="font-size:0.65rem;color:var(--text-light);">~${Math.round(sem05/4.3)} meses</p>
          </div>
          <div style="text-align:center;padding:12px;border:1px solid rgba(184,147,106,0.3);">
            <p style="font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--subtitle);margin-bottom:6px;">0,75 kg/sem</p>
            <p style="font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:300;color:var(--text);">${sem075} sem</p>
            <p style="font-size:0.65rem;color:var(--text-light);">~${Math.round(sem075/4.3)} meses</p>
          </div>
        </div>`;
    }
  }
}

// ── Renderiza o score visual ──────────────────────────────
function renderScore(score, penalidades) {
  const val  = document.getElementById('score-valor');
  const circ = document.getElementById('score-circulo');
  const stat = document.getElementById('score-status');
  const desc = document.getElementById('score-descricao');
  const bar  = document.getElementById('score-barra');

  if (!val) return;

  val.textContent = score;
  bar.style.width = score + '%';

  let status, descricao, corCirc;
  if (score >= 80) {
    status = 'Composição corporal saudável';
    descricao = 'Indicadores dentro ou próximos dos parâmetros ideais. Manter hábitos.';
    corCirc = '#3D6B4F'; bar.style.background = '#3D6B4F';
    circ.className = 'score-bom';
  } else if (score >= 60) {
    status = 'Atenção — ajustes necessários';
    descricao = 'Alguns indicadores fora do ideal. Intervenção nutricional recomendada.';
    corCirc = '#B8860B'; bar.style.background = '#B8860B';
    circ.className = 'score-medio';
  } else if (score >= 40) {
    status = 'Risco metabólico aumentado';
    descricao = 'Múltiplos indicadores alterados. Intervenção prioritária.';
    corCirc = '#8B5E3C'; bar.style.background = '#8B5E3C';
    circ.className = 'score-baixo';
  } else {
    status = 'Risco metabólico elevado';
    descricao = 'Indicadores criticamente alterados. Intervenção imediata.';
    corCirc = '#7A2E2E'; bar.style.background = '#7A2E2E';
    circ.className = 'score-baixo';
  }

  val.style.color = corCirc;
  circ.style.borderColor = corCirc;
  if (stat) stat.textContent = status;
  if (desc) desc.textContent = descricao;
}

// ── Busca sexo do paciente ────────────────────────────────
function getSexoPaciente() {
  // Tenta buscar de campo oculto ou URL
  const params = new URLSearchParams(window.location.search);
  return params.get('sexo') || 'feminino';
}

// ── Comparação temporal — busca avaliações anteriores ─────
async function carregarEvolucao(patientId) {
  if (!patientId || !window._supabase) return;

  // Busca campos amplos para alimentar tabela + gráfico de série temporal
  const { data } = await window._supabase
    .from('antropometria')
    .select('data_avaliacao,peso,imc,pct_gordura,massa_magra,massa_gorda,circ_cintura,' +
            'circ_quadril,circ_abdominal,rcq,rcest,' +
            'densidade_corporal,area_muscular_braco,area_gordura_braco,' +
            'massa_muscular_esqueletica,frame_size_index')
    .eq('patient_id', patientId)
    .order('data_avaliacao', { ascending: false })
    .limit(12);

  if (!data || data.length < 2) return;

  evolucaoData = [...data].reverse(); // ordem cronológica ascendente para o gráfico
  renderEvolucaoChart();
  initEvolucaoTabs();
  // Atualiza deltas na tela de resultado (caso já estejamos no step 3)
  if (typeof aplicarDeltas === 'function') aplicarDeltas();

  const tabela = document.getElementById('evolucao-tabela');
  const vazio  = document.getElementById('evolucao-vazio');
  if (!tabela) return;

  const atual = data[0];
  const ant   = data[1];

  const delta = (a, b, inv = false) => {
    if (a == null || b == null) return '—';
    const d = (a - b).toFixed(1);
    const cls = inv
      ? (d < 0 ? 'delta-down' : d > 0 ? 'delta-up' : 'delta-eq')
      : (d > 0 ? 'delta-up'  : d < 0 ? 'delta-down' : 'delta-eq');
    const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '=';
    return `<span class="${cls}">${arrow} ${Math.abs(d)}</span>`;
  };

  tabela.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="evolucao-table">
        <thead><tr>
          <th>Data</th><th>Peso (kg)</th><th>IMC</th>
          <th>% Gordura</th><th>Massa Magra (kg)</th><th>Cintura (cm)</th>
        </tr></thead>
        <tbody>
          ${data.map((r, i) => `<tr>
            <td>${r.data_avaliacao ? new Date(r.data_avaliacao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
            <td>${r.peso ?? '—'} ${i > 0 && data[i-1].peso ? delta(r.peso, data[i-1].peso, false) : ''}</td>
            <td>${r.imc ?? '—'}</td>
            <td>${r.pct_gordura ?? '—'} ${i > 0 && data[i-1].pct_gordura ? delta(r.pct_gordura, data[i-1].pct_gordura, false) : ''}</td>
            <td>${r.massa_magra ?? '—'} ${i > 0 && data[i-1].massa_magra ? delta(r.massa_magra, data[i-1].massa_magra, true) : ''}</td>
            <td>${r.circ_cintura ?? '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  tabela.style.display = '';
  if (vazio) vazio.style.display = 'none';
}

// ── Renderiza gráfico de série temporal baseado na métrica ativa ──
function renderEvolucaoChart() {
  const chartEl = document.getElementById('evolucao-chart');
  const wrap    = document.getElementById('evolucao-chart-wrap');
  if (!chartEl || !evolucaoData.length) return;

  const CONFIG = {
    peso:                 { label: 'Peso',        color: '#7a5d3b', unit: 'kg',  key: 'peso' },
    imc:                  { label: 'IMC',         color: '#c4a06c', unit: '',    key: 'imc' },
    pct_gordura:          { label: '% Gordura',   color: '#a04030', unit: '%',   key: 'pct_gordura' },
    massa_magra:          { label: 'Massa magra', color: '#3d6b4f', unit: 'kg',  key: 'massa_magra' },
    area_muscular_braco:  { label: 'AMB',         color: '#2D6A56', unit: 'cm²', key: 'area_muscular_braco' },
    area_gordura_braco:   { label: 'AGB',         color: '#a04030', unit: 'cm²', key: 'area_gordura_braco' },
    densidade_corporal:   { label: 'Densidade',   color: '#5a4a3a', unit: '',    key: 'densidade_corporal' },
    circ_cintura:         { label: 'Cintura',     color: '#b8860b', unit: 'cm',  key: 'circ_cintura' },
    circ_quadril:         { label: 'Quadril',     color: '#8b5e3c', unit: 'cm',  key: 'circ_quadril' },
  };

  let series;
  let unit = '';

  if (evolucaoMetric === 'todas') {
    // Plot multiseries de peso + cintura + %gordura (escalas diferentes — info apenas visual)
    series = [
      { label: 'Peso (kg)',      color: CONFIG.peso.color,         points: evolucaoData.map(r => ({ x: r.data_avaliacao, y: r.peso })) },
      { label: 'Cintura (cm)',   color: CONFIG.circ_cintura.color, points: evolucaoData.map(r => ({ x: r.data_avaliacao, y: r.circ_cintura })) },
      { label: '% Gordura',      color: CONFIG.pct_gordura.color,  points: evolucaoData.map(r => ({ x: r.data_avaliacao, y: r.pct_gordura })) },
    ];
  } else {
    const cfg = CONFIG[evolucaoMetric] || CONFIG.peso;
    unit = cfg.unit;
    series = [{
      label: cfg.label, color: cfg.color,
      points: evolucaoData.map(r => ({ x: r.data_avaliacao, y: r[cfg.key] })),
    }];
  }

  renderSparkChart(chartEl, { series, unit, height: 200 });
  wrap.style.display = '';
}

function initEvolucaoTabs() {
  const wrap = document.getElementById('evolucao-metric-tabs');
  if (!wrap || wrap.dataset.init) return;
  wrap.dataset.init = '1';
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.evol-tab');
    if (!btn) return;
    wrap.querySelectorAll('.evol-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    evolucaoMetric = btn.dataset.metric;
    renderEvolucaoChart();
  });
}

// ══════════════════════════════════════════════════════════════
// CÁLCULO DE TMB (Taxa Metabólica Basal) — Mifflin-St Jeor
// Armazena no localStorage para uso em sugestões de macros
// ══════════════════════════════════════════════════════════════

function calcularTMB() {
  const peso   = parseFloat(document.getElementById('peso')?.value);
  const altura = parseFloat(document.getElementById('altura')?.value);

  if (!peso || !altura) return null;

  // Estima idade: tenta buscar do URL ou usa 30 como padrão
  const params = new URLSearchParams(window.location.search);
  const nascStr = params.get('nascimento');
  let idade = 30;
  if (nascStr) {
    const anos = Math.floor((Date.now() - new Date(nascStr)) / (365.25 * 86400000));
    if (anos > 10 && anos < 100) idade = anos;
  }

  const sexo  = getSexoPaciente();
  const altCm = altura > 3 ? altura : altura * 100;

  // Mifflin-St Jeor (mais preciso que Harris-Benedict para adultos)
  let tmb;
  if (sexo === 'masculino') {
    tmb = Math.round((10 * peso) + (6.25 * altCm) - (5 * idade) + 5);
  } else {
    tmb = Math.round((10 * peso) + (6.25 * altCm) - (5 * idade) - 161);
  }

  // Persiste para que admin-fases.js possa usar em sugestão de macros
  localStorage.setItem('pac_tmb',  tmb);
  localStorage.setItem('pac_peso', peso);
  localStorage.setItem('pac_sexo', sexo);

  // Preenche campo metabolismo_basal se estiver vazio
  const mbEl = document.getElementById('metabolismo_basal');
  if (mbEl && !mbEl.value) mbEl.value = tmb;

  // Exibe widget de TMB com estimativas de GET por nível de atividade
  renderTMBWidget(tmb);

  return tmb;
}

function renderTMBWidget(tmb) {
  let widget = document.getElementById('tmb-widget');
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'tmb-widget';

    // Injeta logo após o campo metabolismo_basal (ou no step-1 como fallback)
    const anchor = document.getElementById('metabolismo_basal')?.closest('.form-group')
                || document.getElementById('step-1');
    if (anchor) anchor.appendChild(widget);
  }

  widget.style.cssText = `margin-top:12px;padding:14px 16px;
    border:1px solid rgba(184,147,106,0.25);background:var(--bg-secondary);`;

  widget.innerHTML = `
    <p style="font-family:'DM Sans',sans-serif;font-size:0.58rem;letter-spacing:0.16em;
      text-transform:uppercase;color:var(--subtitle);margin-bottom:10px;font-weight:500;">
      TMB calculada (Mifflin-St Jeor)
    </p>
    <p style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:300;
      color:var(--text);margin-bottom:10px;">${tmb} kcal/dia</p>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;">
      ${[
        { label: 'Sedentário',      fator: 1.20 },
        { label: 'Leve (1–2x)',     fator: 1.375 },
        { label: 'Moderado (3–4x)', fator: 1.55 },
        { label: 'Intenso (5–6x)',  fator: 1.725 },
      ].map(n => `
        <div style="padding:8px 10px;border:1px solid rgba(184,147,106,0.15);background:var(--bg-primary);">
          <p style="font-family:'DM Sans',sans-serif;font-size:0.6rem;color:var(--subtitle);margin-bottom:2px;">${n.label}</p>
          <p style="font-family:'DM Sans',sans-serif;font-size:0.82rem;color:var(--text);font-weight:500;">${Math.round(tmb * n.fator)} kcal</p>
        </div>`).join('')}
    </div>
    <p style="font-family:'DM Sans',sans-serif;font-size:0.65rem;color:var(--text-light);
      margin-top:8px;line-height:1.5;">
      GET = TMB × fator de atividade. Use o valor correspondente para definir calorias do plano.
    </p>`;
}

window.calcularTMB = calcularTMB;

// ── Conecta gatilhos ──────────────────────────────────────
const CAMPOS_DIAGNOSTICO = [
  'pct_gordura','massa_magra','massa_gorda','peso','imc','altura',
  'circunferencia_cintura','circunferencia_quadril','gordura_visceral',
  'peso_meta','cintura','quadril',
];

document.addEventListener('DOMContentLoaded', () => {
  CAMPOS_DIAGNOSTICO.forEach(id => {
    document.getElementById(id)?.addEventListener('input', gerarDiagnostico);
  });

  // TMB é recalculada sempre que peso ou altura mudam
  ['peso', 'altura'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calcularTMB);
  });

  // Carrega evolução quando tiver patient_id
  const params = new URLSearchParams(window.location.search);
  const patId  = params.get('patient_id');
  if (patId) setTimeout(() => carregarEvolucao(patId), 1000);
});

window.gerarDiagnostico = gerarDiagnostico;
window.calcularScore    = calcularScore;
