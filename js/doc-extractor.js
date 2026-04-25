// ============================================================
// doc-extractor.js — Extração de PDF por padrões de texto
// Otimizado para o formato dos PDFs da Evelin Ribeiro Greco
// (tabelas com label na esquerda, valor na direita)
// ============================================================

// PDF.js — modo sem worker (síncrono, compatível com qualquer servidor)
let pdfJsLoaded = false;

function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(); return; }

    let base = '/js/';
    document.querySelectorAll('script[src]').forEach(s => {
      if (s.src && s.src.includes('doc-extractor')) {
        base = s.src.substring(0, s.src.lastIndexOf('/') + 1);
      }
    });

    const srcs = [base + 'pdf.min.js', '/js/pdf.min.js', 'js/pdf.min.js'];
    let tried = 0;

    const tryLoad = () => {
      if (tried >= srcs.length) {
        reject(new Error('pdf.min.js não encontrado em /js/'));
        return;
      }
      const src = srcs[tried++];
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => {
        // Desativa worker completamente — roda no thread principal
        // Funciona em qualquer servidor sem configuração adicional
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        resolve();
      };
      s.onerror = tryLoad;
      document.head.appendChild(s);
    };
    tryLoad();
  });
}

// ══════════════════════════════════════════════════════════
// EXTRAÇÃO DE TEXTO COM POSIÇÃO (para tabelas)
// ══════════════════════════════════════════════════════════
async function extractTextFromPdf(file) {
  await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;

  let fullText = '';
  let lines    = []; // [{y, text}]

  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Coleta itens com sua posição (x, y)
    const items = content.items
      .filter(it => it.str && it.str.trim())
      .map(it => ({ x: it.transform[4], y: it.transform[5], str: it.str }));

    // Ordena por Y desc (topo primeiro) para poder agrupar em linhas com tolerância
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // Agrupa itens com Y próximo (tolerância 3pt) na mesma linha.
    // Isso evita que labels e valores de uma tabela — que às vezes têm Y com
    // leve diferença por line-height — caiam em linhas separadas.
    const Y_TOL = 3;
    const pageLines = [];
    let current = null;
    items.forEach(it => {
      if (!current || Math.abs(current.y - it.y) > Y_TOL) {
        current = { y: it.y, items: [it] };
        pageLines.push(current);
      } else {
        current.items.push(it);
      }
    });

    pageLines.forEach(ln => {
      const row = ln.items
        .sort((a, b) => a.x - b.x)
        .map(i => i.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (row) {
        lines.push(row);
        fullText += row + '\n';
      }
    });
  }

  return { fullText, lines };
}

// ══════════════════════════════════════════════════════════
// PARSERS POR TIPO DE DOCUMENTO
// ══════════════════════════════════════════════════════════

// ── Anamnese ──────────────────────────────────────────────
// Suporta dois formatos PDF.js:
//   Formato A: "Nome |   | Helen de Paula Ribeiro"
//   Formato B: "Nome Helen de Paula Ribeiro"
function parseAnamnese(text, lines) {
  const results = [];
  const add = (field, label, value) => {
    if (value && value.trim() && value.trim() !== '—' && value.trim() !== 'o')
      results.push({ field, label, value: value.trim() });
  };

  // Extrai valor da linha — tenta separador |   | primeiro, depois regex inline
  const extract = (line, labelRe) => {
    // Formato A: label |   | valor
    const sep = line.indexOf('|   |');
    if (sep !== -1) {
      const v = line.substring(sep + 5).trim();
      return (v && v !== '—' && v !== 'o') ? v : null;
    }
    // Formato B: "Label valor" — captura tudo após o label
    const m = line.match(labelRe);
    return m ? m[1]?.trim() || null : null;
  };

  // Busca a linha que contém o label e extrai o valor
  const get = (labelRe, inlineRe) => {
    for (const line of lines) {
      if (labelRe.test(line)) {
        return extract(line, inlineRe || new RegExp(labelRe.source + '\\s+(.+)', labelRe.flags));
      }
    }
    return null;
  };

  // ── Identificação ──────────────────────────────────────
  add('nome',            'Nome',               get(/Nome\s*(\||$)/i,               /^Nome\s+(.+)/i));
  add('data_nascimento', 'Data de nascimento', get(/Data de nascimento/i,           /^Data de nascimento\s+(.+)/i));
  add('profissao',       'Profissão',          get(/Profiss[ãa]o/i,                 /^Profiss[ãa]o\s+(.+)/i));
  add('motivo',          'Motivo da consulta', get(/Motivo da consulta/i,           /^Motivo da consulta\s+(.+)/i));
  add('meta_peso',       'Meta de peso',       get(/Meta de peso/i,                 /^Meta de peso\s+(.+)/i));
  add('doencas',         'Doenças',            get(/Doen[çc]as marcadas/i,          /^Doen[çc]as marcadas\s+(.+)/i));
  add('freq_intestinal', 'Freq. intestinal',   get(/Freq\.?\s*intestinal/i,         /^Freq\.?\s*intestinal\s+(.+)/i));
  add('bristol',         'Escala de Bristol',  get(/Escala de Bristol/i,            /^Escala de Bristol\s+(.+)/i));
  add('sintomas_gi',     'Sintomas GI',        get(/Sintomas G[Ll]/i,              /^Sintomas G[Ll]\s+(.+)/i));
  add('qualidade_sono',  'Qualidade do sono',  get(/Qualidade do sono/i,            /^Qualidade do sono\s+(.+)/i));
  add('sint_not',        'Sintomas noturnos',  get(/Sintomas noturnos/i,            /^Sintomas noturnos\s+(.+)/i));

  // ── Peso / Altura / IMC ────────────────────────────────
  for (const line of lines) {
    if (/Peso\s*\/\s*Altura/i.test(line)) {
      const raw = line.indexOf('|   |') !== -1
        ? line.substring(line.indexOf('|   |') + 5)
        : line.replace(/^Peso\s*\/\s*Altura\s*\/\s*IMC\s*/i, '');
      const pesoM = raw.match(/([\d.]+)\s*kg/i);
      const altM  = raw.match(/([\d.]+)\s*m\b/i);
      const imcM  = raw.match(/m\s*\/\s*([\d.]+)/i);
      if (pesoM) add('peso',   'Peso (kg)',   pesoM[1]);
      // Altura em metros (o form de antropometria espera 1.65, não 165)
      if (altM)  add('altura', 'Altura (m)',  altM[1].replace(',', '.'));
      if (imcM)  add('imc',    'IMC',         imcM[1]);
      break;
    }
  }

  // ── Colesterol — "TC:189| HDL: 38 | LDL: 137 | TG: 62" ──
  for (const line of lines) {
    if (/Colesterol.*HDL/i.test(line)) {
      const tc  = line.match(/TC:\s*([\d.,]+)/i);
      const hdl = line.match(/HDL:\s*([\d.,]+)/i);
      const ldl = line.match(/LDL:\s*([\d.,]+)/i);
      const tg  = line.match(/TG:\s*([\d.,]+)/i);
      if (tc)  add('col_total', 'Colesterol Total', tc[1]);
      if (hdl) add('hdl',       'HDL',              hdl[1]);
      if (ldl) add('ldl',       'LDL',              ldl[1]);
      if (tg)  add('trigli',    'Triglicerídeos',   tg[1]);
      break;
    }
  }

  // ── TSH / VitD / B12 ──────────────────────────────────
  for (const line of lines) {
    if (/TSH.*Vit/i.test(line)) {
      const tsh  = line.match(/TSH:\s*([\d.,]+)/i);
      const vitd = line.match(/VitD:\s*([\d.,]+)/i);
      const b12  = line.match(/B12:\s*([\d.,]+)/i);
      if (tsh)  add('tsh',    'TSH',          tsh[1]);
      if (vitd) add('vit_d',  'Vitamina D',   vitd[1]);
      if (b12)  add('vit_b12','Vitamina B12', b12[1]);
      break;
    }
  }

  // ── Sono ───────────────────────────────────────────────
  for (const line of lines) {
    if (/Sono\s*\(horas/i.test(line)) {
      const raw = line.indexOf('|   |') !== -1
        ? line.substring(line.indexOf('|   |') + 5).trim()
        : line.replace(/^Sono\s*\([^)]+\)\s*/i, '').trim();
      const h = raw.match(/^(\d+)h/i);
      if (h) add('sono_horas', 'Horas de sono', h[1]);
      if (raw) add('obs_sono', 'Sono (horários)', raw);
      break;
    }
  }

  return results;
}

// ── Antropometria / Bioimpedância ─────────────────────────
function parseAntropometria(text, lines) {
  const results = [];
  const add = (field, label, value) => {
    if (value && value !== '—' && String(value).trim()) results.push({ field, label, value: String(value).trim() });
  };

  // Helper: busca o primeiro match em uma linha que começa com o label exato
  // (evita pegar "Peso usual" quando queremos "Peso atual").
  const findInLine = (labelRe, valueRe) => {
    for (const line of lines) {
      if (labelRe.test(line)) {
        const m = line.match(valueRe);
        if (m) return m[1];
      }
    }
    return null;
  };

  // ── Peso (prioriza "Peso atual", cai para "Peso" genérico) ─────────────
  let peso = findInLine(/Peso\s*atual/i, /([\d.,]+)\s*kg/i)
          || (text.match(/\bPeso\s*(?:atual)?[:\s]+([\d.,]+)\s*kg/i) || [])[1];
  if (peso) { add('peso_kg', 'Peso atual (kg)', peso); }

  const pUsual = findInLine(/Peso\s*usual/i, /([\d.,]+)\s*kg/i);
  if (pUsual) add('peso_usual', 'Peso usual (kg)', pUsual);

  const pIdeal = findInLine(/Peso\s*ideal/i, /([\d.,]+)\s*kg/i);
  if (pIdeal) add('peso_ideal', 'Peso ideal (kg)', pIdeal);

  const pMeta = findInLine(/Peso\s*meta/i, /([\d.,]+)\s*kg/i);
  if (pMeta) add('peso_meta', 'Peso meta (kg)', pMeta);

  // ── Altura — o form de antropometria espera METROS (step 0.01).
  // Se o PDF vier em cm, converte; se vier em m, mantém.
  const altLine = lines.find(l => /^Altura\b/i.test(l)) || '';
  const altMCm = altLine.match(/([\d.,]+)\s*cm\b/i);
  const altMM  = altLine.match(/([\d.,]+)\s*m\b/i);
  if (altMCm) {
    const vcm = parseFloat(altMCm[1].replace(',', '.'));
    add('altura_m', 'Altura (m)', (vcm / 100).toFixed(2));
  } else if (altMM) {
    add('altura_m', 'Altura (m)', altMM[1].replace(',', '.'));
  } else {
    // Fallback no texto completo
    const m = text.match(/altura[:\s]+([\d.,]+)\s*(cm|m)\b/i);
    if (m) {
      const v = parseFloat(m[1].replace(',', '.'));
      add('altura_m', 'Altura (m)', m[2].toLowerCase() === 'cm' ? (v / 100).toFixed(2) : m[1].replace(',', '.'));
    }
  }

  // Padrões diretos no texto (continuam funcionando após Y-merge)
  const pats = [
    { field: 'imc',          label: 'IMC',                    re: /\bIMC[:\s]+([\d.,]+)/i },
    { field: 'perc_gordura', label: '% Gordura',              re: /%?\s*Gordura\s*(?:corporal)?[:\s]+([\d.,]+)\s*%?/i },
    { field: 'massa_gorda',  label: 'Massa Gorda (kg)',       re: /massa\s*gorda[:\s]+([\d.,]+)\s*kg/i },
    { field: 'massa_magra',  label: 'Massa Magra (kg)',       re: /massa\s*magra[:\s]+([\d.,]+)\s*kg/i },
    { field: 'massa_musc',   label: 'Massa Muscular (kg)',    re: /massa\s*muscular[:\s]+([\d.,]+)\s*kg/i },
    { field: 'agua_corp',    label: 'Água Corporal (%)',      re: /[áa]gua\s*corporal[:\s]+([\d.,]+)\s*%?/i },
    { field: 'gord_visc',    label: 'Gordura Visceral',       re: /gordura\s*visceral[:\s]+([\d.,]+)/i },
    { field: 'tmb',          label: 'Metabolismo Basal',      re: /(?:metabolismo\s*basal|\bTMB)[:\s]+([\d.,]+)/i },
    { field: 'cint',         label: 'Cintura (cm)',           re: /\bCintura[:\s]+([\d.,]+)\s*cm/i },
    { field: 'quadril',      label: 'Quadril (cm)',           re: /\bQuadril[:\s]+([\d.,]+)\s*cm/i },
    // "Abdominal (umbigo) 108 cm" — aceita "abdominal" ou "abdômen"
    { field: 'abdomen',      label: 'Abdômen (cm)',           re: /Abdom(?:inal|en|ên)(?:\s*\([^)]*\))?[:\s]+([\d.,]+)\s*cm/i },
    { field: 'panturrilha',  label: 'Panturrilha (cm)',       re: /Panturrilha[:\s]+([\d.,]+)\s*cm/i },
    { field: 'tricipital',   label: 'Dobra Tricipital (mm)',  re: /tr[íi]ceps?[:\s]+([\d.,]+)/i },
    { field: 'subescap',     label: 'Subescapular (mm)',      re: /subescapular[:\s]+([\d.,]+)/i },
    { field: 'suprailiaca',  label: 'Suprailíaca (mm)',       re: /supraili[áa]ca[:\s]+([\d.,]+)/i },
  ];

  pats.forEach(({ field, label, re }) => {
    const m = text.match(re);
    if (m) add(field, label, m[1]);
  });

  // Data da avaliação — aceita "Data da avaliação 2026-03-18" ou "18/03/2026"
  const dataM = text.match(/Data\s+da?\s+avalia[çc][aã]o[:\s]+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i)
             || text.match(/Data\s+da?\s+avalia[çc][aã]o[^\n]*?(\d{4}-\d{2}-\d{2})/i);
  if (dataM) add('data_aval', 'Data da avaliação', dataM[1]);
  else {
    const d2 = matchAfter(lines, /^Data(?:\s*da?\s*avalia[çc][aã]o)?$/i);
    if (d2) add('data_aval', 'Data da avaliação', d2);
  }

  return results;
}

// ── Exames laboratoriais ──────────────────────────────────
function parseExames(text, lines) {
  const results = [];
  const add = (field, label, value) => {
    if (value && value !== '—' && value.trim()) results.push({ field, label, value: value.trim() });
  };

  const pats = [
    // Glicemia e metabolismo
    { field: 'glicemia',     label: 'Glicemia',              re: /glicemia[:\s]+([\d.,]+)/i },
    { field: 'hba1c',        label: 'HbA1c',                 re: /(?:hba1c|hemoglobina\s*glicada)[:\s]+([\d.,]+)/i },
    { field: 'insulina',     label: 'Insulina',              re: /insulina[:\s]+([\d.,]+)/i },
    // Tireoide
    { field: 'tsh',          label: 'TSH',                   re: /\bTSH[:\s]+([\d.,]+)/i },
    { field: 't4_livre',     label: 'T4 Livre',              re: /t4\s*livre[:\s]+([\d.,]+)/i },
    { field: 't3_livre',     label: 'T3 Livre',              re: /t3\s*livre[:\s]+([\d.,]+)/i },
    // Lipídios
    { field: 'col_total',    label: 'Colesterol Total',      re: /colesterol\s*total[:\s]+([\d.,]+)/i },
    { field: 'hdl',          label: 'HDL',                   re: /\bHDL[:\s]+([\d.,]+)/i },
    { field: 'ldl',          label: 'LDL',                   re: /\bLDL[:\s]+([\d.,]+)/i },
    { field: 'trigli',       label: 'Triglicerídeos',        re: /triglice?r[íi]de?os?[:\s]+([\d.,]+)/i },
    { field: 'vldl',         label: 'VLDL',                  re: /\bVLDL[:\s]+([\d.,]+)/i },
    // Vitaminas
    { field: 'vit_d',        label: 'Vitamina D',            re: /(?:vitamina\s*d|vitd)[:\s]+([\d.,]+)/i },
    { field: 'vit_b12',      label: 'Vitamina B12',          re: /(?:vitamina\s*b\.?12|b12)[:\s]+([\d.,]+)/i },
    // Ferro
    { field: 'ferro',        label: 'Ferro',                 re: /ferro\s*(?:sérico)?[:\s]+([\d.,]+)/i },
    { field: 'ferritina',    label: 'Ferritina',             re: /ferritina[:\s]+([\d.,]+)/i },
    // Função renal/hepática
    { field: 'creatinina',   label: 'Creatinina',            re: /creatinina[:\s]+([\d.,]+)/i },
    { field: 'ureia',        label: 'Ureia',                 re: /ure[íi]a[:\s]+([\d.,]+)/i },
    { field: 'acido_urico',  label: 'Ácido Úrico',           re: /[áa]cido\s*[úu]rico[:\s]+([\d.,]+)/i },
    { field: 'tgo',          label: 'TGO/AST',               re: /(?:tgo|ast)[:\s]+([\d.,]+)/i },
    { field: 'tgp',          label: 'TGP/ALT',               re: /(?:tgp|alt)[:\s]+([\d.,]+)/i },
    { field: 'pcr',          label: 'PCR',                   re: /\bPCR[:\s]+([\d.,]+)/i },
    // Hormônios
    { field: 'cortisol',     label: 'Cortisol',              re: /cortisol[:\s]+([\d.,]+)/i },
    { field: 'estradiol',    label: 'Estradiol',             re: /estradiol[:\s]+([\d.,]+)/i },
    { field: 'progesterona', label: 'Progesterona',          re: /progesterona[:\s]+([\d.,]+)/i },
    { field: 'prolactina',   label: 'Prolactina',            re: /prolactina[:\s]+([\d.,]+)/i },
    { field: 'fsh',          label: 'FSH',                   re: /\bFSH[:\s]+([\d.,]+)/i },
    { field: 'lh',           label: 'LH',                    re: /\bLH[:\s]+([\d.,]+)/i },
    { field: 'testosterona', label: 'Testosterona',          re: /testosterona[:\s]+([\d.,]+)/i },
    // Hemograma
    { field: 'hemoglobina',  label: 'Hemoglobina',           re: /hemoglobina[:\s]+([\d.,]+)/i },
    { field: 'hematocrito',  label: 'Hematócrito',           re: /hemat[óo]crito[:\s]+([\d.,]+)/i },
    { field: 'magnesio',     label: 'Magnésio',              re: /magn[eé]sio[:\s]+([\d.,]+)/i },
    { field: 'zinco',        label: 'Zinco',                 re: /\bzinco[:\s]+([\d.,]+)/i },
    { field: 'calcio',       label: 'Cálcio',                re: /c[áa]lcio[:\s]+([\d.,]+)/i },
    { field: 'sodio',        label: 'Sódio',                 re: /s[óo]dio[:\s]+([\d.,]+)/i },
    { field: 'potassio',     label: 'Potássio',              re: /pot[áa]ssio[:\s]+([\d.,]+)/i },
  ];

  // Aplica padrões no texto completo
  pats.forEach(({ field, label, re }) => {
    const m = text.match(re);
    if (m) add(field, label, m[1]);
  });

  // Tenta formato da anamnese: "TSH / Vit.D / B12   TSH: 1.51 | VitD: 24.5 | B12: 510"
  const tiro = text.match(/TSH[:\s]+([\d.,]+).*?VitD[:\s]+([\d.,]+).*?B12[:\s]+([\d.,]+)/i);
  if (tiro) {
    add('tsh',    'TSH',          tiro[1]);
    add('vit_d',  'Vitamina D',   tiro[2]);
    add('vit_b12','Vitamina B12', tiro[3]);
  }

  // Formato "TC: 189 | HDL: 38 | LDL: 137 | TG: 62"
  const lip = text.match(/TC:\s*([\d.,]+).*?HDL:\s*([\d.,]+).*?LDL:\s*([\d.,]+).*?TG:\s*([\d.,]+)/i);
  if (lip) {
    add('col_total', 'Colesterol Total', lip[1]);
    add('hdl',       'HDL',             lip[2]);
    add('ldl',       'LDL',             lip[3]);
    add('trigli',    'Triglicerídeos',  lip[4]);
  }

  return results;
}

// ── Plano alimentar ───────────────────────────────────────
function parsePlano(text, lines) {
  const results = [];
  const add = (field, label, value) => {
    if (value && value !== '—' && value.trim()) results.push({ field, label, value: value.trim() });
  };

  // VET / calorias — aceita vários rótulos comuns usados pela Evelin
  //   "VET = 2.075 kcal/dia"  |  "Plano Calórico: 2900 kcal"
  //   "Calorias Totais: 2.900 kcal"  |  "Total: 2900 kcal"
  let vet = text.match(/VET[:\s=]+([\d.,]+)\s*kcal/i)
         || text.match(/Plano\s*Cal[oó]rico[:\s]+([\d.,]+)\s*kcal/i)
         || text.match(/Calorias?\s*(?:Tota(?:l|is)|alvo|di[áa]rias?)[:\s]+([\d.,]+)\s*kcal/i)
         || text.match(/Total[:\s]+([\d.,]+)\s*kcal/i)
         || text.match(/([\d.]{3,6})\s*kcal\s*\/?\s*dia/i);
  if (vet) add('kcal_alvo', 'Calorias alvo (kcal)', vet[1].replace(/\./g, ''));

  // Proteínas — aceita singular/plural + descritores entre parênteses
  //   "Proteínas (alimentar + suplemento) 30% ~155 g" → 155
  //   "Proteínas: 155g" → 155
  const ptn = text.match(/Prote[íi]nas?\b[^\n]{0,120}?~?\s*([\d.,]+)\s*g\b/i);
  if (ptn) add('proteina_g', 'Proteína (g)', ptn[1]);

  // Carboidratos — idem
  const cho = text.match(/Carboidratos?\b[^\n]{0,120}?~?\s*([\d.,]+)\s*g\b/i);
  if (cho) add('carboidrato_g', 'Carboidratos (g)', cho[1]);

  // Lipídios / Gorduras — aceita "Lipidios (mono/poli-insaturados) 35% ~80 g"
  const lip = text.match(/(?:Lip[íi]dios?|Gorduras?\s*Totais?|Gorduras?)\b[^\n]{0,120}?~?\s*([\d.,]+)\s*g\b/i);
  if (lip) add('lipidio_g', 'Lipídios (g)', lip[1]);

  // Fibras
  const fib = text.match(/Fibras?\b[^\n]{0,80}?(?:>=?\s*)?([\d.,]+)\s*g\b/i);
  if (fib) add('fibras_g', 'Fibras (g)', fib[1]);

  // Paciente
  const pac = matchAfter(lines, /^Paciente$/i) || text.match(/Paciente:\s*([A-ZÀ-Ú][^\n|]+)/)?.[1];
  if (pac) add('nome_pac', 'Paciente', pac);

  // Data do plano — converte para ISO (YYYY-MM-DD) p/ <input type="date">
  // Aceita:
  //   "Elaborado em 15/03/2026"  → 2026-03-15
  //   "Elaborado: Marco/2026"    → 2026-03-01
  //   "Elaborado: Março/2026"    → 2026-03-01
  //   "Data: 15/03/2026 |"       → 2026-03-15
  const MESES = { jan:1, fev:2, mar:3, abr:4, mai:5, jun:6, jul:7, ago:8, set:9, out:10, nov:11, dez:12 };
  const toIso = (dd, mm, yyyy) => {
    const y = String(yyyy).length === 2 ? '20' + yyyy : String(yyyy);
    return `${y}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  };

  let dataIso = null;
  // DD/MM/AAAA
  let m = text.match(/(?:Elaborado(?:\s*em)?|Data\s*(?:do\s*plano)?)[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i)
       || text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*\|/);
  if (m) dataIso = toIso(m[1], m[2], m[3]);

  // Mês/AAAA (Marco/2026, Março/2026, mar/2026…)
  if (!dataIso) {
    m = text.match(/(?:Elaborado(?:\s*em)?|Data(?:\s*do\s*plano)?)[:\s]+([A-Za-zçÇ]{3,})\/?(\d{4})/i);
    if (m) {
      const key = m[1].toLowerCase().slice(0,3).replace('ç','c');
      if (MESES[key]) dataIso = toIso(1, MESES[key], m[2]);
    }
  }

  if (dataIso) add('data_elaboracao', 'Data do plano', dataIso);

  return results;
}

// ── Busca valor na linha seguinte a um label ──────────────
function matchAfter(lines, pattern) {
  for (let i = 0; i < lines.length - 1; i++) {
    if (pattern.test(lines[i])) {
      const next = lines[i + 1]?.trim();
      if (next && next !== '—') return next;
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════
// WIDGET PRINCIPAL
// ══════════════════════════════════════════════════════════
export function initDocExtractor(containerId, defaultType, onFill) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Normaliza aliases para os valores reais das <option>
  const TYPE_ALIASES = {
    plano_alimentar: 'plano',
    bioimpedancia:   'antropometria',
    historico:       'anamnese',
    laboratorial:    'exames',
    geral:           'exames',
  };
  defaultType = TYPE_ALIASES[defaultType] || defaultType || 'anamnese';

  container.innerHTML = `
    <div class="doc-extractor">
      <div class="doc-extractor-header" id="dex-hdr-${containerId}">
        <div class="doc-extractor-header-left">
          <div class="doc-extractor-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div>
            <p class="doc-extractor-title">Anexar e extrair dados do PDF</p>
            <p class="doc-extractor-sub">Os valores são lidos automaticamente — sem digitação</p>
          </div>
        </div>
        <svg class="doc-extractor-toggle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      <div class="doc-extractor-body" id="dex-body-${containerId}">
        <div style="margin-bottom:16px;">
          <label class="form-label">Tipo de documento</label>
          <select class="form-input" id="dex-type-${containerId}">
            <option value="anamnese"      ${defaultType==='anamnese'?'selected':''}>Anamnese / Histórico</option>
            <option value="exames"        ${defaultType==='exames'?'selected':''}>Exames Laboratoriais</option>
            <option value="antropometria" ${defaultType==='antropometria'?'selected':''}>Antropometria / Bioimpedância</option>
            <option value="plano"         ${defaultType==='plano'?'selected':''}>Plano Alimentar</option>
          </select>
        </div>

        <div class="doc-drop-area" id="dex-drop-${containerId}">
          <input type="file" id="dex-file-${containerId}" accept=".pdf" style="display:none">
          <div class="doc-drop-content" id="dex-content-${containerId}">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <p class="doc-drop-label" id="dex-lbl-${containerId}">Clique ou arraste o PDF aqui</p>
            <p class="doc-drop-hint">PDF com texto selecionável</p>
          </div>
        </div>

        <div class="doc-status" id="dex-status-${containerId}" style="display:none;"></div>
        <div id="dex-results-${containerId}" style="display:none;"></div>

        <div class="doc-actions" id="dex-actions-${containerId}" style="display:none;">
          <button class="doc-btn-fill" id="dex-fill-${containerId}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Preencher formulário automaticamente
          </button>
          <button class="doc-btn-clear" id="dex-clear-${containerId}">Limpar</button>
        </div>
      </div>
    </div>
  `;

  const header    = document.getElementById(`dex-hdr-${containerId}`);
  const body      = document.getElementById(`dex-body-${containerId}`);
  const toggle    = header.querySelector('.doc-extractor-toggle');
  const typeEl    = document.getElementById(`dex-type-${containerId}`);
  const fileEl    = document.getElementById(`dex-file-${containerId}`);
  const dropArea  = document.getElementById(`dex-drop-${containerId}`);
  const labelEl   = document.getElementById(`dex-lbl-${containerId}`);
  const statusEl  = document.getElementById(`dex-status-${containerId}`);
  const resultsEl = document.getElementById(`dex-results-${containerId}`);
  const actionsEl = document.getElementById(`dex-actions-${containerId}`);
  const fillBtn   = document.getElementById(`dex-fill-${containerId}`);
  const clearBtn  = document.getElementById(`dex-clear-${containerId}`);

  let extractedData = [];

  // Colapsar
  header.addEventListener('click', () => {
    body.classList.toggle('open');
    toggle.classList.toggle('open');
  });

  // Drag and drop
  dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('drag-over'); });
  dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
  dropArea.addEventListener('drop', e => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    // Alguns navegadores não definem MIME para PDFs arrastados — faz fallback pela extensão
    const f = Array.from(e.dataTransfer.files).find(f =>
      f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
    );
    if (f) processFile(f);
    else setStatus('error', 'Arquivo inválido. Envie um PDF (.pdf).');
  });
  fileEl.addEventListener('change', () => { if (fileEl.files[0]) processFile(fileEl.files[0]); });

  async function processFile(file) {
    labelEl.textContent = file.name;
    dropArea.classList.add('has-file');
    actionsEl.style.display = 'none';
    resultsEl.style.display = 'none';
    extractedData = [];
    setStatus('loading', 'Lendo o PDF...');

    try {
      setStatus('loading', 'Extraindo texto do PDF...');
      const { fullText, lines } = await extractTextFromPdf(file);
      const type = typeEl.value;

      // Log de diagnóstico visível na tela
      const charCount = fullText.length;
      const lineCount = lines.length;
      setStatus('loading', `PDF lido: ${charCount} caracteres, ${lineCount} linhas. Extraindo valores...`);

      if (charCount < 10) {
        setStatus('error', `PDF sem texto extraível (${charCount} caracteres). O arquivo pode estar corrompido ou o PDF.js não conseguiu ler. Tente abrir o PDF e selecionar texto com o mouse para confirmar que tem texto.`);
        return;
      }

      let results = [];
      if (type === 'anamnese')           results = parseAnamnese(fullText, lines);
      else if (type === 'exames')        results = parseExames(fullText, lines);
      else if (type === 'antropometria') results = parseAntropometria(fullText, lines);
      else if (type === 'plano')         results = parsePlano(fullText, lines);
      else results = parseExames(fullText, lines);

      if (results.length === 0) {
        // Mostra as primeiras linhas para diagnóstico
        const preview = lines.slice(0, 8).join(' | ');
        setStatus('error',
          `Nenhum valor reconhecido. Primeiras linhas extraídas: "${preview}". ` +
          `Total: ${lineCount} linhas, ${charCount} chars.`
        );
        return;
      }

      extractedData = results;
      setStatus('success', `${results.length} valor(es) encontrado(s). Revise e clique em "Preencher formulário automaticamente".`);
      renderResults(results);
      actionsEl.style.display = '';

    } catch (err) {
      setStatus('error', 'Erro ao ler o PDF: ' + err.message);
      console.error(err);
    }
  }

  function renderResults(results) {
    resultsEl.style.display = '';
    resultsEl.innerHTML = `
      <div class="doc-preview-inner" style="margin-top:12px;">
        <p class="doc-preview-title">Valores extraídos — edite se necessário</p>
        <div class="doc-preview-grid">
          ${results.map((r, i) => `
            <div class="doc-preview-row">
              <span class="doc-preview-key">${r.label}</span>
              <input class="doc-edit-field" type="text" value="${escHtml(r.value)}" data-index="${i}"
                style="font-family:'DM Sans',sans-serif;font-weight:300;font-size:0.8rem;color:var(--text);
                       border:none;border-bottom:1px solid var(--detail);background:transparent;
                       padding:4px 0;outline:none;width:100%;">
            </div>`).join('')}
        </div>
      </div>`;

    resultsEl.querySelectorAll('.doc-edit-field').forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.index);
        if (extractedData[idx]) extractedData[idx].value = input.value;
      });
    });
  }

  function setStatus(type, msg) {
    statusEl.style.display = '';
    statusEl.className = `doc-status ${type}`;
    statusEl.textContent = msg;
  }

  fillBtn.addEventListener('click', () => {
    const n = preencherFormulario(extractedData);
    if (onFill) onFill(extractedData, typeEl.value, n);
    const msg = n > 0
      ? `${n} campo(s) preenchido(s) no formulário. Role a página para revisar e salvar.`
      : `Dados extraídos mas nenhum campo correspondente encontrado nesta seção do formulário. Os valores aparecem acima para você copiar manualmente.`;
    setStatus(n > 0 ? 'success' : 'loading', msg);
  });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileEl.value = '';
    dropArea.classList.remove('has-file');
    labelEl.textContent = 'Clique ou arraste o PDF aqui';
    statusEl.style.display = 'none';
    resultsEl.style.display = 'none';
    actionsEl.style.display = 'none';
    extractedData = [];
    document.querySelectorAll('.field-filled').forEach(el => el.classList.remove('field-filled'));
  });

  // Único handler de clique na área de drop
  document.getElementById(`dex-content-${containerId}`).addEventListener('click', () => {
    fileEl.click();
  });


}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ══════════════════════════════════════════════════════════
// MAPEAMENTO campo → IDs reais do formulário
// ══════════════════════════════════════════════════════════
// Cada campo lista TODOS os IDs possíveis em qualquer página do projeto.
// `preencherFormulario` tenta cada ID — os que não existem no DOM atual
// são ignorados silenciosamente. Permite reaproveitar o mesmo field
// entre anamnese.html, antropometria.html e admin-plano.html.
const FIELD_MAP = {
  // ── Identificação ─────────────────────────────────────────
  nome:            ['nome_paciente'],
  data_nascimento: ['data_nascimento'],
  motivo:          ['motivo', 'caso_clinico'],
  profissao:       ['profissao'],
  meta_peso:       ['peso_meta'],
  doencas:         ['outras_patologias'],
  freq_intestinal: ['habito_intestinal', 'freq_evacuacao'],
  bristol:         ['formato_fezes'],
  sintomas_gi:     ['obs_habito'],
  sono_horas:      ['horas_sono'],
  qualidade_sono:  ['qualidade_sono'],
  agua:            ['ingestao_hidrica'],
  atividade:       ['tipo_af'],
  medicamentos:    ['medicamentos'],
  alergias:        ['alergias'],
  intolerancias:   ['intolerancias'],

  // ── Peso/altura/IMC — IDs da anamnese + antropometria ────
  peso:            ['peso_atual', 'peso'],
  peso_kg:         ['peso_atual', 'peso'],
  peso_usual:      ['peso_usual'],
  peso_ideal:      ['peso_ideal'],
  peso_meta:       ['peso_meta'],
  altura:          ['altura'],
  altura_m:        ['altura'],
  altura_cm:       ['altura'],
  imc:             ['imc'],

  // ── Exames — IDs da anamnese ──────────────────────────────
  glicemia:        ['glicemia'],
  hba1c:           ['hba1c'],
  insulina:        ['insulina'],
  tsh:             ['tsh'],
  t4_livre:        ['tsh'],
  col_total:       ['col_total'],
  hdl:             ['hdl'],
  ldl:             ['ldl'],
  trigli:          ['tg'],
  vit_d:           ['vitamina_d'],
  vit_b12:         ['vitamina_b12'],
  calcio:          ['calcio'],
  ferro:           ['exames_obs'],
  ferritina:       ['exames_obs'],
  creatinina:      ['exames_obs'],
  ureia:           ['exames_obs'],
  tgo:             ['exames_obs'],
  tgp:             ['exames_obs'],
  pcr:             ['exames_obs'],

  // ── Antropometria — IDs REAIS de antropometria.html ───────
  perc_gordura:    ['pct_gordura'],
  massa_gorda:     ['massa_gorda'],
  massa_magra:     ['massa_magra'],
  massa_musc:      ['massa_muscular'],
  agua_corp:       ['agua_corporal'],
  gord_visc:       ['gordura_visceral'],
  tmb:             ['metabolismo_basal'],
  cint:            ['circ_cintura'],
  quadril:         ['circ_quadril'],
  abdomen:         ['circ_abdominal'],
  braco_d:         ['circ_braco_rel_d', 'circ_braco_cont_d'],
  coxa_d:          ['circ_coxa_med_d', 'circ_coxa_prox_d'],
  panturrilha:     ['circ_panturrilha_d'],
  tricipital:      ['dobra_triceps'],
  subescap:        ['dobra_subescapular'],
  suprailiaca:     ['dobra_suprailiaca'],
  abdominal_d:     ['dobra_abdominal'],
  data_aval:       ['data_avaliacao'],

  // ── Plano alimentar — IDs de admin-plano.html ─────────────
  kcal_alvo:       ['f-kcal'],
  proteina_g:      ['f-ptn'],
  carboidrato_g:   ['f-cho'],
  lipidio_g:       ['f-lip'],
  fibras_g:        ['f-fibras'],
  data_elaboracao: ['f-data', 'f-plano-data'],
};

export function preencherFormulario(dados) {
  let n = 0;
  dados.forEach(({ field, value }) => {
    const ids = FIELD_MAP[field] || [];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.classList.add('field-filled');
      n++;
    });
  });
  return n;
}
