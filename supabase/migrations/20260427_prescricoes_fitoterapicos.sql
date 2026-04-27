-- ================================================================
-- ERG 360 — Prescrições Fitoterápicas / Manipulação
-- Execute no SQL Editor do Supabase
-- ================================================================

-- ── 1. TABELA PRINCIPAL ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescricoes_fitoterapicos (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  indicacao            text          NOT NULL,                    -- ex: 'Insônia', 'Ansiedade', 'SOP'
  categoria            text          NOT NULL,                    -- ex: 'Sono', 'Hormonal', 'Digestão'
  nome_composto        text          NOT NULL,                    -- nome interno da fórmula
  descricao            text,                                       -- descrição clínica resumida
  formula              jsonb         NOT NULL DEFAULT '[]'::jsonb,
  --   formula = [{ ativo, dose, forma_farmaceutica, marca_sugerida? }]
  posologia            text          NOT NULL,                    -- ex: '1 cápsula 30min antes de dormir'
  duracao_dias         integer,                                    -- ex: 60
  contraindicacoes     text[]        DEFAULT '{}',
  interacoes           text[]        DEFAULT '{}',
  observacoes_clinicas text,
  referencias          jsonb         DEFAULT '[]'::jsonb,
  --   referencias = [{ titulo, autores, revista, ano, doi?, pubmed_id?, link? }]
  evidencia_nivel      text          CHECK (evidencia_nivel IN ('A','B','C','D')),
  -- A = meta-análise / revisão sistemática
  -- B = ECRs de boa qualidade
  -- C = estudos observacionais
  -- D = consenso de especialistas / uso tradicional
  ativo                boolean       NOT NULL DEFAULT true,
  created_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at           timestamptz   NOT NULL DEFAULT now()
);

-- ── 2. ÍNDICES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_presc_indicacao  ON prescricoes_fitoterapicos (indicacao);
CREATE INDEX IF NOT EXISTS idx_presc_categoria  ON prescricoes_fitoterapicos (categoria);
CREATE INDEX IF NOT EXISTS idx_presc_ativo      ON prescricoes_fitoterapicos (ativo);
CREATE INDEX IF NOT EXISTS idx_presc_evidencia  ON prescricoes_fitoterapicos (evidencia_nivel);

-- ── 3. TRIGGER updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prescricoes_set_updated_at ON prescricoes_fitoterapicos;
CREATE TRIGGER prescricoes_set_updated_at
  BEFORE UPDATE ON prescricoes_fitoterapicos
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ── 4. ROW-LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE prescricoes_fitoterapicos ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem LER (catálogo aberto)
DROP POLICY IF EXISTS "presc_select_authenticated" ON prescricoes_fitoterapicos;
CREATE POLICY "presc_select_authenticated" ON prescricoes_fitoterapicos
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Apenas admin (Dra. Evelin) pode escrever
DROP POLICY IF EXISTS "presc_admin_write" ON prescricoes_fitoterapicos;
CREATE POLICY "presc_admin_write" ON prescricoes_fitoterapicos
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com'
    )
  );

-- ── 5. TABELA DE VINCULO PACIENTE ↔ PRESCRIÇÃO (opcional) ─────
-- Permite atribuir uma prescrição a um paciente específico no prontuário
CREATE TABLE IF NOT EXISTS paciente_prescricoes (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          uuid         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescricao_id       uuid         NOT NULL REFERENCES prescricoes_fitoterapicos(id) ON DELETE CASCADE,
  data_prescricao     date         NOT NULL DEFAULT current_date,
  data_inicio         date,
  data_fim            date,
  observacoes_caso    text,
  status              text         NOT NULL DEFAULT 'ativa'
                                    CHECK (status IN ('ativa','suspensa','concluida','cancelada')),
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pp_paciente   ON paciente_prescricoes (patient_id);
CREATE INDEX IF NOT EXISTS idx_pp_prescricao ON paciente_prescricoes (prescricao_id);
CREATE INDEX IF NOT EXISTS idx_pp_status     ON paciente_prescricoes (status);

DROP TRIGGER IF EXISTS pp_set_updated_at ON paciente_prescricoes;
CREATE TRIGGER pp_set_updated_at
  BEFORE UPDATE ON paciente_prescricoes
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

ALTER TABLE paciente_prescricoes ENABLE ROW LEVEL SECURITY;

-- Admin vê tudo, paciente vê só as próprias
DROP POLICY IF EXISTS "pp_select" ON paciente_prescricoes;
CREATE POLICY "pp_select" ON paciente_prescricoes
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com'
    )
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "pp_admin_write" ON paciente_prescricoes;
CREATE POLICY "pp_admin_write" ON paciente_prescricoes
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com'
    )
  );

-- ── 6. VIEW DE CONSULTA RÁPIDA (opcional) ─────────────────────
CREATE OR REPLACE VIEW prescricoes_resumo AS
SELECT
  p.id,
  p.indicacao,
  p.categoria,
  p.nome_composto,
  p.evidencia_nivel,
  jsonb_array_length(p.formula)     AS qtd_ativos,
  jsonb_array_length(p.referencias) AS qtd_referencias,
  p.ativo,
  p.updated_at
FROM prescricoes_fitoterapicos p
WHERE p.ativo = true
ORDER BY p.categoria, p.indicacao;
