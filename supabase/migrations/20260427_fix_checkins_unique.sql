-- ================================================================
-- ERG 360 — FIX: garante UNIQUE (patient_id, data) em checkins
-- Necessário para upsert funcionar (evitar perda de checkin via retry).
-- Idempotente.
-- ================================================================

-- ── 1. Detecta e remove duplicatas (mantém o mais recente) ──────
-- Se a paciente conseguiu salvar 2x o mesmo dia, mantém o de id maior
WITH duplicatas AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY patient_id, data
           ORDER BY created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM checkins
)
DELETE FROM checkins
WHERE id IN (SELECT id FROM duplicatas WHERE rn > 1);

-- Reporta quantas foram removidas
DO $$
DECLARE removidas int;
BEGIN
  SELECT count(*) INTO removidas FROM checkins;
  RAISE NOTICE 'Total de checkins (após dedup): %', removidas;
END $$;

-- ── 2. Adiciona constraint UNIQUE ───────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'checkins_patient_data_unique'
      AND conrelid = 'checkins'::regclass
  ) THEN
    ALTER TABLE checkins
      ADD CONSTRAINT checkins_patient_data_unique UNIQUE (patient_id, data);
    RAISE NOTICE 'Constraint UNIQUE adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Constraint UNIQUE já existia';
  END IF;
END $$;

-- ── 3. Garante coluna created_at (caso versão antiga não tenha) ──
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
