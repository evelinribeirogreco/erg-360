-- ================================================================
-- ERG 360 — Antropometria: novas colunas (punho + AMB/AGB + densidade)
-- Tudo idempotente: não falha se a coluna já existir.
-- ================================================================

-- Circunferências de punho (D/E)
ALTER TABLE antropometria
  ADD COLUMN IF NOT EXISTS circ_punho_d numeric,
  ADD COLUMN IF NOT EXISTS circ_punho_e numeric;

-- Densidade corporal (g/cm³) — calculada a partir das equações de pregas
ALTER TABLE antropometria
  ADD COLUMN IF NOT EXISTS densidade_corporal numeric;

-- Área Muscular do Braço corrigida (cm²) — Heymsfield 1982 / Frisancho 1981
ALTER TABLE antropometria
  ADD COLUMN IF NOT EXISTS area_muscular_braco numeric;

-- Área de Gordura do Braço (cm²)
ALTER TABLE antropometria
  ADD COLUMN IF NOT EXISTS area_gordura_braco numeric;

-- Validação: confere se as colunas foram criadas
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_name = 'antropometria'
   AND column_name IN ('circ_punho_d','circ_punho_e','densidade_corporal',
                       'area_muscular_braco','area_gordura_braco')
 ORDER BY column_name;
