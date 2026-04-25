-- ============================================================
-- ERG 360º — Migrações Supabase
-- Execute no SQL Editor do painel Supabase
-- ============================================================

-- ── 1. Garantir colunas de score e flags nos check-ins ─────
ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS score_diario INTEGER,
  ADD COLUMN IF NOT EXISTS flags        TEXT[];

-- ── 2. Índices de performance ─────────────────────────────
-- Consultas por paciente + data (mais frequentes do sistema)
CREATE INDEX IF NOT EXISTS idx_checkins_patient_data
  ON checkins(patient_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_user_data
  ON checkins(user_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_antropometria_patient_data
  ON antropometria(patient_id, data_avaliacao DESC);

CREATE INDEX IF NOT EXISTS idx_diario_patient_data
  ON diario_alimentar(patient_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_fases_patient_status
  ON fases(patient_id, status);

-- ── 3. View: resumo por paciente ──────────────────────────
-- Evita N queries no admin — carrega tudo num JOIN
CREATE OR REPLACE VIEW patient_summary AS
SELECT
  p.id,
  p.nome,
  p.email,
  p.plano_url,
  p.data_proxima_consulta,
  p.data_ultima_consulta,
  -- Último check-in
  MAX(c.data)                                              AS ultimo_checkin,
  -- Score médio dos últimos 7 dias
  ROUND(
    AVG(c.score_diario) FILTER (
      WHERE c.data >= NOW() - INTERVAL '7 days'
    ), 1
  )                                                        AS score_medio_7d,
  -- Contagem de check-ins na semana
  COUNT(c.id) FILTER (
    WHERE c.data >= NOW() - INTERVAL '7 days'
  )                                                        AS checkins_semana,
  -- Flags do último check-in
  (
    SELECT ci.flags FROM checkins ci
    WHERE ci.patient_id = p.id
    ORDER BY ci.data DESC LIMIT 1
  )                                                        AS flags_recentes,
  -- Último peso registrado
  (
    SELECT a.peso FROM antropometria a
    WHERE a.patient_id = p.id
    ORDER BY a.data_avaliacao DESC LIMIT 1
  )                                                        AS peso_atual,
  -- Último % gordura
  (
    SELECT a.pct_gordura FROM antropometria a
    WHERE a.patient_id = p.id
    ORDER BY a.data_avaliacao DESC LIMIT 1
  )                                                        AS gordura_atual
FROM patients p
LEFT JOIN checkins c ON c.patient_id = p.id
GROUP BY p.id, p.nome, p.email, p.plano_url,
         p.data_proxima_consulta, p.data_ultima_consulta;

-- ── 4. Tabela de notificações (nova) ─────────────────────
CREATE TABLE IF NOT EXISTS notificacoes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tipo        TEXT        NOT NULL,
  -- Tipos: 'sono_baixo' | 'fome_alta' | 'sem_checkin' | 'intestino' |
  --        'consulta_proxima' | 'sobrecarga' | 'positivo'
  mensagem    TEXT,
  lida        BOOLEAN     NOT NULL DEFAULT false,
  criada_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_patient_lida
  ON notificacoes(patient_id, lida, criada_em DESC);

-- ── 5. Definir role de admin via metadata ─────────────────
-- Execute para o usuário administrador (substitua o UUID correto):
--
--   UPDATE auth.users
--   SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'
--   WHERE email = 'evelinbeatrizrb@outlook.com';
--
-- Após isso, o email hardcoded no código pode ser removido.

-- ── 6. Cron para Edge Function de alertas ─────────────────
-- Requer extensões pg_cron e pg_net habilitadas no painel Supabase
-- (Database → Extensions → procurar pg_cron e pg_net → Enable)
--
-- Agenda: toda segunda-feira às 07h00 BRT (10h00 UTC)
-- Substitua <SUPABASE_SERVICE_ROLE_KEY> pela chave de serviço real
-- (Settings → API → service_role key)
--
SELECT cron.schedule(
  'erg-gerar-alertas-semanais',
  '0 10 * * 1',
  $$
    SELECT net.http_post(
      url     := 'https://gqnlrhmriufepzpustna.supabase.co/functions/v1/gerar-alertas',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- Para verificar jobs agendados:
--   SELECT * FROM cron.job;
--
-- Para remover:
--   SELECT cron.unschedule('erg-gerar-alertas-semanais');

-- ── 7. Deploy da Edge Function ─────────────────────────────
-- No terminal, com Supabase CLI instalado e autenticado:
--
--   supabase login
--   supabase link --project-ref gqnlrhmriufepzpustna
--   supabase functions deploy gerar-alertas
--
-- Teste manual (substitua o token):
--   curl -X POST \
--     https://gqnlrhmriufepzpustna.supabase.co/functions/v1/gerar-alertas \
--     -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
--     -H "Content-Type: application/json" \
--     -d '{}'
