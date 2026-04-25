// ============================================================
// ERG 360º — Edge Function: gerar-alertas
// Analisa pacientes e gera notificações clínicas automáticas.
// Executar: toda segunda-feira às 07h BRT via pg_cron
//           ou manualmente via POST /functions/v1/gerar-alertas
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tipos de notificação suportados
type TipoNotif =
  | 'sem_checkin'
  | 'sono_baixo'
  | 'fome_alta'
  | 'sobrecarga'
  | 'intestino'
  | 'consulta_proxima'
  | 'positivo';

interface NovaNotif {
  patient_id: string;
  tipo: TipoNotif;
  mensagem: string;
}

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,  // service role — bypassa RLS
  );

  const hoje      = new Date().toISOString().split('T')[0];
  const amanha    = new Date(); amanha.setDate(amanha.getDate() + 1);
  const amanhaStr = amanha.toISOString().split('T')[0];
  const tresAtras = new Date(); tresAtras.setDate(tresAtras.getDate() - 3);
  const tresStr   = tresAtras.toISOString().split('T')[0];
  const seteAtras = new Date(); seteAtras.setDate(seteAtras.getDate() - 7);
  const seteStr   = seteAtras.toISOString().split('T')[0];

  // ── 1. Busca todos os pacientes ──────────────────────────
  const { data: patients, error: errPac } = await supabase
    .from('patients')
    .select('id, nome, data_proxima_consulta, plano_url');

  if (errPac || !patients?.length) {
    return new Response(
      JSON.stringify({ ok: true, geradas: 0, motivo: 'sem pacientes' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const patientIds = patients.map((p) => p.id);

  // ── 2. Busca check-ins dos últimos 7 dias ────────────────
  const { data: checkins } = await supabase
    .from('checkins')
    .select('patient_id, data, flags')
    .in('patient_id', patientIds)
    .gte('data', seteStr)
    .order('data', { ascending: false });

  // Agrupa check-ins por patient_id (primeiro = mais recente)
  const checkinPorPac: Record<string, { data: string; flags: string[] }> = {};
  for (const c of checkins || []) {
    if (!checkinPorPac[c.patient_id]) {
      checkinPorPac[c.patient_id] = { data: c.data, flags: c.flags || [] };
    }
  }

  // ── 3. Busca notificações já criadas HOJE (evita duplicatas) ─
  const { data: jaExistem } = await supabase
    .from('notificacoes')
    .select('patient_id, tipo')
    .gte('criada_em', hoje + 'T00:00:00Z');

  const jaSet = new Set(
    (jaExistem || []).map((n) => `${n.patient_id}__${n.tipo}`)
  );

  // Utilitário: verifica se notif já existe hoje
  const jaTemHoje = (pid: string, tipo: TipoNotif) =>
    jaSet.has(`${pid}__${tipo}`);

  // ── 4. Analisa cada paciente ─────────────────────────────
  const novas: NovaNotif[] = [];

  for (const p of patients) {
    const nome     = p.nome.split(' ')[0];
    const checkin  = checkinPorPac[p.id];

    // ── Sem check-in há 3+ dias (pacientes com plano) ────
    if (p.plano_url) {
      const semRecente = !checkin || checkin.data < tresStr;
      if (semRecente && !jaTemHoje(p.id, 'sem_checkin')) {
        const diasStr = checkin
          ? `há ${Math.ceil(
              (Date.now() - new Date(checkin.data + 'T12:00:00').getTime()) /
              86400000
            )} dias`
          : 'nunca';
        novas.push({
          patient_id: p.id,
          tipo: 'sem_checkin',
          mensagem: `${nome} sem check-in ${diasStr}`,
        });
      }
    }

    if (!checkin) continue;
    const flags = checkin.flags;

    // ── Sono ruim ─────────────────────────────────────────
    if (flags.includes('sono_ruim') && !jaTemHoje(p.id, 'sono_baixo')) {
      novas.push({
        patient_id: p.id,
        tipo: 'sono_baixo',
        mensagem: `${nome} com qualidade de sono ruim no último check-in`,
      });
    }

    // ── Fome alta ─────────────────────────────────────────
    if (flags.includes('fome_alta') && !jaTemHoje(p.id, 'fome_alta')) {
      novas.push({
        patient_id: p.id,
        tipo: 'fome_alta',
        mensagem: `${nome} com nível de fome elevado`,
      });
    }

    // ── Sobrecarga / overreaching ─────────────────────────
    if (flags.includes('overreaching') && !jaTemHoje(p.id, 'sobrecarga')) {
      novas.push({
        patient_id: p.id,
        tipo: 'sobrecarga',
        mensagem: `${nome} com sinais de sobrecarga de treino`,
      });
    }

    // ── Alteração intestinal ──────────────────────────────
    if (flags.includes('intestino') && !jaTemHoje(p.id, 'intestino')) {
      novas.push({
        patient_id: p.id,
        tipo: 'intestino',
        mensagem: `${nome} reportou alteração intestinal`,
      });
    }

    // ── Score positivo (≥ 80) — reforço positivo ─────────
    // (flags_recentes usa o check-in mais recente; score precisaria de query separada)

    // ── Consulta amanhã ───────────────────────────────────
    if (
      p.data_proxima_consulta === amanhaStr &&
      !jaTemHoje(p.id, 'consulta_proxima')
    ) {
      novas.push({
        patient_id: p.id,
        tipo: 'consulta_proxima',
        mensagem: `Consulta de ${nome} é amanhã`,
      });
    }
  }

  // ── 5. Insere notificações novas ─────────────────────────
  if (novas.length > 0) {
    const { error: errInsert } = await supabase
      .from('notificacoes')
      .insert(novas);

    if (errInsert) {
      return new Response(
        JSON.stringify({ ok: false, erro: errInsert.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ ok: true, geradas: novas.length, analisados: patients.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
