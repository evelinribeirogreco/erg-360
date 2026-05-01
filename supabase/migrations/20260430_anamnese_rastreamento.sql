-- ================================================================
-- ERG 360 — Rastreamento Metabólico + Teia de Inter-relações
-- Adiciona à tabela anamnese:
--   • rastreamento_metabolico  jsonb — questionário 0-4 por sistema
--   • sintomas_selecionados    text[] — sintomas marcados (slugs)
--   • teia_lugares_afetados    text[] — áreas da teia afetadas
--   • teia_deficiencias        jsonb  — deficiências calculadas {nutriente: prob}
--   • teia_excessos            jsonb  — excessos calculados
--   • anexos                   jsonb  — lista de URLs/metadata de PDFs/imagens
-- ================================================================

ALTER TABLE anamnese
  ADD COLUMN IF NOT EXISTS rastreamento_metabolico jsonb,
  ADD COLUMN IF NOT EXISTS sintomas_selecionados   text[],
  ADD COLUMN IF NOT EXISTS teia_lugares_afetados   text[],
  ADD COLUMN IF NOT EXISTS teia_deficiencias       jsonb,
  ADD COLUMN IF NOT EXISTS teia_excessos           jsonb,
  ADD COLUMN IF NOT EXISTS anexos                  jsonb;

-- Validação
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'anamnese'
   AND column_name IN ('rastreamento_metabolico','sintomas_selecionados',
                       'teia_lugares_afetados','teia_deficiencias',
                       'teia_excessos','anexos')
 ORDER BY column_name;
