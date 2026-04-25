-- ============================================================
-- 20260424 — Taxonomia completa do cardápio (7 camadas)
-- ------------------------------------------------------------
-- Camadas que combinam para formar um plano integrado:
--   1. estilo_alimentar        (onívoro, vegano, paleo, keto, crudívoro…)
--   2. condicoes_clinicas[]    (diabetes, hipertensão, DASH, low FODMAP…)
--   3. objetivo                (emagrecimento, ganho_massa, performance…)
--   4. estrategia_nutricional  (low_carb, high_carb, cetogenica…)
--   5. consistencia            (normal, brando, pastoso, líquido…)
--   6. fase_da_vida            (adulto, gestante, idoso, infantil…)
--   7. restricoes_alimentares[] (sem_gluten, hipossódico…)
--
-- Esta migração expande a coluna `preferencia_alimentar` existente
-- e adiciona as novas dimensões como colunas independentes.
-- Preserva dados legados: preferencia_alimentar continua válida
-- e espelha estilo_alimentar para back-compat.
-- ============================================================

-- 1) Garante que a coluna legada preferencia_alimentar exista (idempotente).
--    Criada aqui sem CHECK para não restringir valores futuros.
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS preferencia_alimentar TEXT DEFAULT 'onivora';

-- Garante também a coluna restricoes_alimentares (legada).
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS restricoes_alimentares TEXT[] DEFAULT '{}';

-- 2) Remove CHECK restrito anterior (se existir) para aceitar nova taxonomia.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patients_preferencia_alimentar_check'
  ) THEN
    ALTER TABLE patients DROP CONSTRAINT patients_preferencia_alimentar_check;
  END IF;
END $$;

-- 3) Nova coluna canônica — estilo_alimentar
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS estilo_alimentar TEXT DEFAULT 'onivoro';

-- Drop CHECK antigo se já existia, para recriar (idempotente)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patients_estilo_alimentar_check'
  ) THEN
    ALTER TABLE patients DROP CONSTRAINT patients_estilo_alimentar_check;
  END IF;
END $$;

ALTER TABLE patients
  ADD CONSTRAINT patients_estilo_alimentar_check CHECK (
    estilo_alimentar IN (
      'onivoro',
      'vegetariano_ovolacto',
      'vegetariano_lacto',
      'vegano',
      'pescetariano',
      'flexitariano',
      'crudivoro',
      'paleolitico',
      'cetogenico'
    )
  );

-- 4) Copia valores antigos de preferencia_alimentar para estilo_alimentar.
--    Só executa se a coluna legada realmente tiver dados.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='patients' AND column_name='preferencia_alimentar'
  ) THEN
    UPDATE patients SET estilo_alimentar = CASE
      WHEN preferencia_alimentar = 'onivora'       THEN 'onivoro'
      WHEN preferencia_alimentar = 'vegetariana'   THEN 'vegetariano_ovolacto'
      WHEN preferencia_alimentar = 'vegana'        THEN 'vegano'
      WHEN preferencia_alimentar = 'pescetariana'  THEN 'pescetariano'
      WHEN preferencia_alimentar = 'flexitariana'  THEN 'flexitariano'
      ELSE COALESCE(estilo_alimentar, 'onivoro')
    END
    WHERE preferencia_alimentar IS NOT NULL
      AND (estilo_alimentar IS NULL OR estilo_alimentar = 'onivoro');
  END IF;
END $$;

-- 5) Condições clínicas (multi)
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS condicoes_clinicas TEXT[] DEFAULT '{}';

-- 6) Objetivo
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS objetivo TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_objetivo_check') THEN
    ALTER TABLE patients DROP CONSTRAINT patients_objetivo_check;
  END IF;
END $$;
ALTER TABLE patients
  ADD CONSTRAINT patients_objetivo_check CHECK (
    objetivo IS NULL OR objetivo IN (
      'emagrecimento','ganho_massa','manutencao','reeducacao',
      'performance','estetica_cutting','estetica_bulking'
    )
  );

-- 7) Estratégia nutricional
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS estrategia_nutricional TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_estrategia_check') THEN
    ALTER TABLE patients DROP CONSTRAINT patients_estrategia_check;
  END IF;
END $$;
ALTER TABLE patients
  ADD CONSTRAINT patients_estrategia_check CHECK (
    estrategia_nutricional IS NULL OR estrategia_nutricional IN (
      'low_carb','high_carb','high_protein','low_fat','cetogenico','moderada'
    )
  );

-- 8) Consistência
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS consistencia TEXT DEFAULT 'normal';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_consistencia_check') THEN
    ALTER TABLE patients DROP CONSTRAINT patients_consistencia_check;
  END IF;
END $$;
ALTER TABLE patients
  ADD CONSTRAINT patients_consistencia_check CHECK (
    consistencia IN ('normal','brando','pastoso','liquido_completo','liquido_claro')
  );

-- 9) Fase da vida
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS fase_da_vida TEXT DEFAULT 'adulto';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_fase_vida_check') THEN
    ALTER TABLE patients DROP CONSTRAINT patients_fase_vida_check;
  END IF;
END $$;
ALTER TABLE patients
  ADD CONSTRAINT patients_fase_vida_check CHECK (
    fase_da_vida IN ('adulto','infantil','adolescente','gestante','lactante','idoso')
  );

-- 9) Comentários
COMMENT ON COLUMN patients.estilo_alimentar       IS 'Estilo alimentar escolhido pelo paciente (onívoro, vegano, paleo…)';
COMMENT ON COLUMN patients.condicoes_clinicas     IS 'Condições clínicas ativas (array). Ex: {diabetes, hipertensao, dieta_dash}';
COMMENT ON COLUMN patients.objetivo               IS 'Objetivo do paciente (emagrecimento, ganho_massa…)';
COMMENT ON COLUMN patients.estrategia_nutricional IS 'Estratégia de macros (low_carb, cetogenica, moderada…)';
COMMENT ON COLUMN patients.consistencia           IS 'Textura do cardápio (normal, brando, pastoso, líquido…)';
COMMENT ON COLUMN patients.fase_da_vida           IS 'Fase da vida (adulto, gestante, idoso, infantil…)';
COMMENT ON COLUMN patients.restricoes_alimentares IS 'Array: sem_gluten, sem_lactose, sem_acucar, hipossodico, sem_alergenicos, low_carb';

-- 10) Índices úteis
CREATE INDEX IF NOT EXISTS idx_patients_estilo      ON patients(estilo_alimentar)
  WHERE estilo_alimentar IS NOT NULL AND estilo_alimentar <> 'onivoro';

CREATE INDEX IF NOT EXISTS idx_patients_objetivo    ON patients(objetivo)
  WHERE objetivo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_condicoes   ON patients USING GIN(condicoes_clinicas);
CREATE INDEX IF NOT EXISTS idx_patients_restricoes  ON patients USING GIN(restricoes_alimentares);
