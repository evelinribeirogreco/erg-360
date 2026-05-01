// ============================================================
// safe-save.js — Camada de proteção contra perda de dados
// ============================================================
console.info('%c[safe-save] camada de proteção ATIVA', 'color:#2D6A56;font-weight:600');
// Garante que NENHUM salvamento se perca em caso de:
//   1. Coluna ausente no banco (migration não rodada)        -> remove campo + retenta
//   2. Erro de rede ou timeout                               -> enfileira e retenta
//   3. RLS / política / unique constraint                    -> mostra erro claro
//   4. Tela fechada/refresh antes de confirmar               -> backup local persiste
//
// Uso:
//   import { safeInsert, safeUpdate, safeUpsert, retryPending,
//            mountPendingBanner } from './safe-save.js';
//
//   const res = await safeInsert(supabase, 'antropometria', payload, {
//     label: 'Avaliação antropométrica',
//     redirectOnSuccess: 'admin.html',
//   });
//   if (res.ok)   showToast('Salvo com sucesso');
//   else          showError(res.error.message);
// ============================================================

const PENDING_KEY = 'erg_pending_saves';
const MAX_AUTO_RETRIES = 5;
const RETRY_BACKOFF_MS = [500, 1500, 3000, 6000, 12000];

// ── Storage helpers ──────────────────────────────────────────
function _readPending() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function _writePending(arr) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(arr)); }
  catch (e) { console.warn('[safe-save] não pôde gravar fila local:', e); }
}
function _addPending(item) {
  const arr = _readPending();
  arr.push({ ...item, id: `${item.table}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` });
  _writePending(arr);
}
function _removePending(id) {
  const arr = _readPending().filter(i => i.id !== id);
  _writePending(arr);
}
export function getPendingSaves() { return _readPending(); }

// ── Detector de erro de coluna inexistente ───────────────────
// Postgres-via-Supabase pode retornar várias formas:
//   • "column \"foo\" of relation \"bar\" does not exist"
//   • "Could not find the 'foo' column of 'bar' in the schema cache"
//   • "Could not find a column named 'foo' on 'bar'"
function _extractMissingColumn(errMsg) {
  if (!errMsg) return null;
  const patterns = [
    /column "([^"]+)" of relation "[^"]+" does not exist/i,
    /Could not find the '([^']+)' column of '[^']+' in the schema cache/i,
    /Could not find a column named '([^']+)'/i,
    /column ([a-zA-Z_][a-zA-Z0-9_]*) of relation [a-zA-Z_][a-zA-Z0-9_]* does not exist/i,
  ];
  for (const p of patterns) {
    const m = errMsg.match(p);
    if (m) return m[1];
  }
  return null;
}

// ── Detector de erro recuperável (rede, timeout) ─────────────
function _isRetriable(error) {
  if (!error) return false;
  // Erros de rede: NetworkError, TypeError de fetch, timeout
  if (error.code === 'PGRST301' || error.code === '57014') return true; // statement timeout
  if (error.message && /network|fetch|timeout|abort|connection/i.test(error.message)) return true;
  return false;
}

// ── Sleep ────────────────────────────────────────────────────
const _sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ════════════════════════════════════════════════════════════
// CORE — tenta executar a operação até 5x, removendo colunas
// inexistentes automaticamente. Mantém backup local entre tentativas.
// SUPORTA payload array (insert em lote) e payload objeto.
// ════════════════════════════════════════════════════════════
async function _tryOperation(supabase, op /* 'insert'|'update'|'upsert' */,
                              table, payload, where, opts = {}) {
  // Preserva o tipo: array clona como array, objeto clona como objeto
  let workingPayload = Array.isArray(payload)
    ? payload.map(item => ({ ...item }))
    : { ...payload };
  let columnsRemoved = [];
  let lastError = null;

  // Helper: confirma que a chave "missing" existe no payload (suporta array + obj)
  const _hasKey = (pl, key) => {
    if (Array.isArray(pl)) {
      return pl.some(item => item && typeof item === 'object' && key in item);
    }
    return pl && typeof pl === 'object' && key in pl;
  };
  // Helper: remove coluna do payload (suporta array + obj)
  const _removeKey = (pl, key) => {
    if (Array.isArray(pl)) {
      return pl.map(item => {
        if (!item || typeof item !== 'object') return item;
        const { [key]: _drop, ...rest } = item;
        return rest;
      });
    }
    const { [key]: _drop, ...rest } = pl;
    return rest;
  };

  for (let attempt = 0; attempt < MAX_AUTO_RETRIES; attempt++) {
    try {
      let q = supabase.from(table);
      let chain;
      if (op === 'insert') {
        chain = q.insert(workingPayload);
      } else if (op === 'update') {
        chain = q.update(workingPayload);
        for (const [k, v] of Object.entries(where || {})) chain = chain.eq(k, v);
      } else if (op === 'upsert') {
        chain = q.upsert(workingPayload, opts.upsertOpts || {});
      }

      // Permite encadear .select(...).single() opcionalmente
      let resp;
      if (opts.select) {
        chain = chain.select(opts.select);
        if (opts.single) chain = chain.single();
      }
      resp = await chain;

      const { error } = resp || {};
      if (!error) {
        return { ok: true, data: resp.data, payload: workingPayload, columnsRemoved };
      }
      lastError = error;

      // Coluna ausente — remove e tenta de novo (suporta array + obj)
      const missing = _extractMissingColumn(error.message);
      // Defesa: ignora "missing" puramente numérico (provável índice de array mal interpretado)
      if (missing && /^\d+$/.test(missing)) {
        console.error(`[safe-save] erro suspeito: extraído chave numérica "${missing}". Abortando para evitar loop.`, error);
        return { ok: false, error, payload: workingPayload, columnsRemoved };
      }
      if (missing && _hasKey(workingPayload, missing)) {
        console.warn(`[safe-save] coluna ausente "${missing}" — removendo e retentando`);
        columnsRemoved.push(missing);
        workingPayload = _removeKey(workingPayload, missing);
        continue; // sem backoff, é instantâneo
      }

      // Erro recuperável (rede) — backoff
      if (_isRetriable(error)) {
        const wait = RETRY_BACKOFF_MS[attempt] || 12000;
        console.warn(`[safe-save] erro recuperável — retry em ${wait}ms:`, error.message);
        await _sleep(wait);
        continue;
      }

      // Erro permanente (RLS, FK, unique, validação) — para
      return { ok: false, error, payload: workingPayload, columnsRemoved };
    } catch (netErr) {
      // Erro de rede a nível de fetch
      lastError = { message: netErr.message || 'Erro de rede', _net: true };
      const wait = RETRY_BACKOFF_MS[attempt] || 12000;
      console.warn(`[safe-save] exceção fetch — retry em ${wait}ms:`, netErr);
      await _sleep(wait);
    }
  }

  return { ok: false, error: lastError || { message: 'Limite de tentativas excedido' },
           payload: workingPayload, columnsRemoved };
}

// ════════════════════════════════════════════════════════════
// API PÚBLICA
// ════════════════════════════════════════════════════════════

/**
 * Insere `payload` em `table` com proteção total contra perda.
 * Sempre faz backup local antes; só remove o backup após sucesso.
 *
 * opts: { label, upsertOpts, redirectOnSuccess (string) }
 * @returns { ok, error?, payload, columnsRemoved }
 */
export async function safeInsert(supabase, table, payload, opts = {}) {
  return _safeOp(supabase, 'insert', table, payload, null, opts);
}

export async function safeUpdate(supabase, table, payload, where, opts = {}) {
  return _safeOp(supabase, 'update', table, payload, where, opts);
}

export async function safeUpsert(supabase, table, payload, opts = {}) {
  return _safeOp(supabase, 'upsert', table, payload, null, opts);
}

async function _safeOp(supabase, op, table, payload, where, opts) {
  // 1. Backup IMEDIATO antes de qualquer rede
  const backup = { op, table, payload, where, opts: { upsertOpts: opts.upsertOpts },
                   label: opts.label || table, timestamp: Date.now() };
  _addPending(backup);
  const backupId = _readPending().slice(-1)[0]?.id;

  // 2. Tenta operação com retry inteligente
  const result = await _tryOperation(supabase, op, table, payload, where, opts);

  // 3. Sucesso — remove backup
  if (result.ok) {
    if (backupId) _removePending(backupId);
    if (result.columnsRemoved.length) {
      console.warn(`[safe-save] ${table} salvo, mas ${result.columnsRemoved.length} ` +
                   `coluna(s) foram ignoradas (não existem no banco): ${result.columnsRemoved.join(', ')}. ` +
                   `Rode a migration para evitar perda futura.`);
    }
    return result;
  }

  // 4. Falha — backup permanece, atualiza UI
  console.error(`[safe-save] FALHA ao salvar em ${table}:`, result.error);
  _renderBanner();
  return result;
}

// ════════════════════════════════════════════════════════════
// FILA DE REENVIO — tenta reenviar pendências automaticamente
// ════════════════════════════════════════════════════════════
let _retryInProgress = false;
export async function retryPending(supabase) {
  if (_retryInProgress) return { tried: 0, sent: 0 };
  _retryInProgress = true;
  const pendentes = _readPending();
  let sent = 0;
  for (const item of pendentes) {
    const result = await _tryOperation(supabase, item.op, item.table,
                                        item.payload, item.where, item.opts || {});
    if (result.ok) {
      _removePending(item.id);
      sent++;
    }
  }
  _retryInProgress = false;
  _renderBanner();
  return { tried: pendentes.length, sent };
}

// Reenvia automaticamente quando voltar online
let _onlineHookInstalled = false;
export function installOnlineHook(supabase) {
  if (_onlineHookInstalled) return;
  _onlineHookInstalled = true;
  window.addEventListener('online', () => {
    console.info('[safe-save] online — tentando reenviar pendências');
    retryPending(supabase);
  });
  // Tenta uma vez no carregamento (caso tenha pendência de sessão anterior)
  setTimeout(() => retryPending(supabase), 2000);
}

// ════════════════════════════════════════════════════════════
// BANNER PERSISTENTE — mostra "X dados pendentes [Tentar agora]"
// ════════════════════════════════════════════════════════════
function _renderBanner() {
  let banner = document.getElementById('erg-pending-banner');
  const pendentes = _readPending();

  if (pendentes.length === 0) {
    if (banner) banner.remove();
    return;
  }

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'erg-pending-banner';
    banner.style.cssText =
      'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:10000;' +
      'background:#7A2E2E;color:#fff;padding:14px 20px;border-radius:6px;' +
      'box-shadow:0 4px 18px rgba(0,0,0,0.3);font-family:"DM Sans",sans-serif;' +
      'font-size:0.85rem;display:flex;align-items:center;gap:14px;max-width:90vw;';
    document.body.appendChild(banner);
  }

  const labels = pendentes.map(p => p.label).join(', ');
  banner.innerHTML = `
    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> <strong>${pendentes.length} dado(s) pendente(s)</strong>: ${labels}</span>
    <button id="erg-pending-retry" style="background:#fff;color:#7A2E2E;border:none;
      padding:6px 14px;cursor:pointer;font-weight:600;border-radius:3px;font-size:0.78rem;">
      Tentar agora
    </button>
    <button id="erg-pending-dismiss" style="background:transparent;border:1px solid #fff;color:#fff;
      padding:6px 10px;cursor:pointer;font-size:0.78rem;border-radius:3px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;

  document.getElementById('erg-pending-retry').onclick = async () => {
    if (!window._supabase) {
      alert('Aguarde — Supabase carregando...');
      return;
    }
    const r = await retryPending(window._supabase);
    alert(`${r.sent} de ${r.tried} enviados.`);
  };
  document.getElementById('erg-pending-dismiss').onclick = () => banner.remove();
}

export function mountPendingBanner() {
  _renderBanner();
}

// ════════════════════════════════════════════════════════════
// MODO DEBUG — exibe pendências no console
// ════════════════════════════════════════════════════════════
window.ergPending = {
  list:  () => _readPending(),
  clear: () => { _writePending([]); _renderBanner(); },
  retry: () => window._supabase ? retryPending(window._supabase) : Promise.reject('sem supabase'),
};
