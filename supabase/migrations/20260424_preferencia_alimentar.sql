-- ============================================================
-- 20260424 — Preferência alimentar da paciente
-- ------------------------------------------------------------
-- Adiciona duas colunas à tabela `patients`:
--   preferencia_alimentar — padrão dietético (onívora, vegetariana, vegana,
--                           pescetariana, flexitariana)
--   restricoes_alimentares — array de restrições adicionais
--                           (sem_gluten, sem_lactose, low_carb, sem_acucar)
--
-- Ambos os campos são opcionais. Quando presentes, o editor de planos
-- alimentares (admin-plano) exibe um aviso e o helper
-- `preferencias-alimentares.js` filtra automaticamente as sugestões de
-- alimentos e substituições.
-- ============================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS preferencia_alimentar TEXT
    CHECK (preferencia_alimentar IN ('onivora','vegetariana','vegana','pescetariana','flexitariana'))
    DEFAULT 'onivora';

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS restricoes_alimentares TEXT[] DEFAULT '{}';

COMMENT ON COLUMN patients.preferencia_alimentar IS
  'Padrão alimentar: onivora | vegetariana | vegana | pescetariana | flexitariana';

COMMENT ON COLUMN patients.restricoes_alimentares IS
  'Array de restrições: sem_gluten, sem_lactose, low_carb, sem_acucar';

-- Índice para filtrar pacientes por padrão alimentar no admin
CREATE INDEX IF NOT EXISTS idx_patients_preferencia
  ON patients(preferencia_alimentar)
  WHERE preferencia_alimentar IS NOT NULL AND preferencia_alimentar <> 'onivora';
