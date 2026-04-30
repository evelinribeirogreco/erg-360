-- ================================================================
-- ERG 360 — Tabela gastos_energeticos
-- Histórico de cálculos de TMB/GET por paciente, com atividades
-- físicas individualizadas e cenários (perda/manutenção/ganho).
-- ================================================================

CREATE TABLE IF NOT EXISTS gastos_energeticos (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid           NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id         uuid           NOT NULL,
  data_calculo    date           NOT NULL DEFAULT current_date,
  descricao       text,

  -- Identificação do cálculo
  tipo            text,          -- adulto | atleta | gestante | idoso
  protocolo       text,          -- mifflin | harris_benedict | katch_mcardle | cunningham | tinsley | henry
  nivel_atividade text,          -- sedentario | leve | moderado | ativo | muito_ativo | extremo
  fator_atividade numeric,       -- ex: 1.20, 1.375, 1.55, 1.725, 1.9, 1.48 (custom)

  -- Inputs usados (snapshot)
  peso            numeric,
  altura          numeric,
  idade           integer,
  sexo            text,          -- masculino | feminino
  massa_magra     numeric,       -- usado em Katch-McArdle e Cunningham
  fator_injuria   numeric,

  -- Atividades físicas individualizadas (lista)
  -- Ex: [{"tipo":"Tênis","kcal":125,"min_dia":60}, ...]
  atividades      jsonb          DEFAULT '[]'::jsonb,

  -- Resultados principais
  rdee            numeric,       -- TMB pelo protocolo (kcal)
  rdee_total      numeric,       -- GET = RDEE × fator + atividades (kcal)
  venta           numeric,       -- VENTA, se calculado

  -- Regra de bolso (cenários)
  kcal_perda_peso_min   numeric,
  kcal_perda_peso_max   numeric,
  kcal_manutencao       numeric,
  kcal_ganho_peso_min   numeric,
  kcal_ganho_peso_max   numeric,

  obs             text,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ge_paciente_data
  ON gastos_energeticos (patient_id, data_calculo DESC);

DROP TRIGGER IF EXISTS ge_set_updated_at ON gastos_energeticos;
CREATE TRIGGER ge_set_updated_at BEFORE UPDATE ON gastos_energeticos
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

ALTER TABLE gastos_energeticos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ge_select" ON gastos_energeticos;
CREATE POLICY "ge_select" ON gastos_energeticos
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com')
  );

DROP POLICY IF EXISTS "ge_all" ON gastos_energeticos;
CREATE POLICY "ge_all" ON gastos_energeticos
  FOR ALL
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com')
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com')
  );

-- Validação: confere se foi criada
SELECT 'gastos_energeticos criada' AS status,
       (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name = 'gastos_energeticos') AS colunas;
