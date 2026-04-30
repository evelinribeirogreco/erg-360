-- ================================================================
-- ERG 360 — Marcar refeições como feitas (paciente)
-- Permite checkbox por refeição/dia no plano alimentar
-- ================================================================

CREATE TABLE IF NOT EXISTS refeicoes_marcadas (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid           NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id         uuid           NOT NULL,
  data            date           NOT NULL DEFAULT current_date,
  refeicao_nome   text           NOT NULL,                 -- ex: 'Café da manhã', 'Almoço'
  refeicao_horario text,                                    -- ex: '07h00' (cópia do plano)
  feita           boolean        NOT NULL DEFAULT true,
  observacao      text,                                     -- nota rápida da paciente
  fome_pre        smallint,                                 -- escala 1-5 antes
  fome_pos        smallint,                                 -- escala 1-5 depois
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now(),
  UNIQUE (patient_id, data, refeicao_nome)
);

CREATE INDEX IF NOT EXISTS idx_refmarc_paciente_data
  ON refeicoes_marcadas (patient_id, data DESC);

-- Trigger updated_at
DROP TRIGGER IF EXISTS rm_set_updated_at ON refeicoes_marcadas;
CREATE TRIGGER rm_set_updated_at BEFORE UPDATE ON refeicoes_marcadas
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- RLS: paciente vê/edita só as próprias; admin vê tudo
ALTER TABLE refeicoes_marcadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rm_select" ON refeicoes_marcadas;
CREATE POLICY "rm_select" ON refeicoes_marcadas
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com')
  );

DROP POLICY IF EXISTS "rm_upsert" ON refeicoes_marcadas;
CREATE POLICY "rm_upsert" ON refeicoes_marcadas
  FOR ALL
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com')
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com')
  );
