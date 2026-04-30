-- ================================================================
-- ERG 360 — Checkins retroativos com flag
-- Adiciona colunas para diferenciar checkin "no dia" vs "retroativo"
-- Idempotente.
-- ================================================================

-- Coluna is_retroativo: marca se foi preenchido depois do dia
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS is_retroativo boolean NOT NULL DEFAULT false;

-- Coluna feito_em: timestamp REAL do save (vs `data` que é o dia retratado)
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS feito_em timestamptz;

-- Backfill: marca checkins existentes
-- Se created_at::date != data → é retroativo
UPDATE checkins
SET is_retroativo = true
WHERE created_at::date <> data
  AND is_retroativo = false;

-- Popula feito_em com created_at quando vazio
UPDATE checkins
SET feito_em = created_at
WHERE feito_em IS NULL;

-- Índice para filtros de relatório
CREATE INDEX IF NOT EXISTS idx_checkins_retroativo
  ON checkins(patient_id, is_retroativo, data DESC);

DO $$
DECLARE total_retro int; total_total int;
BEGIN
  SELECT count(*) INTO total_total FROM checkins;
  SELECT count(*) INTO total_retro FROM checkins WHERE is_retroativo = true;
  RAISE NOTICE 'Total de checkins: % (retroativos: %)', total_total, total_retro;
END $$;
