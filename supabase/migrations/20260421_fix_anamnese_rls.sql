-- ════════════════════════════════════════════════════════════════════
-- FIX: Política RLS da tabela `anamnese` (base)
-- ────────────────────────────────────────────────────────────────────
-- Sintoma 1: "new row violates row-level security policy for table anamnese"
-- Sintoma 2 (após primeira tentativa): "permission denied for table users"
--
-- Causa 1: a política anterior só permitia o dono da linha inserir.
-- Causa 2: consultar `auth.users` direto na policy exige permissão que
-- o role authenticated não tem em novas versões do Supabase.
--
-- Fix: usar `auth.jwt() ->> 'email'` — lê o email direto do token JWT,
-- sem precisar consultar nenhuma tabela.
-- ════════════════════════════════════════════════════════════════════

-- Garante RLS ligado
ALTER TABLE anamnese ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas (defensivo)
DROP POLICY IF EXISTS "anamnese_own"       ON anamnese;
DROP POLICY IF EXISTS "own_anamnese"       ON anamnese;
DROP POLICY IF EXISTS "user_anamnese"      ON anamnese;
DROP POLICY IF EXISTS "anamnese_select"    ON anamnese;
DROP POLICY IF EXISTS "anamnese_insert"    ON anamnese;
DROP POLICY IF EXISTS "anamnese_update"    ON anamnese;
DROP POLICY IF EXISTS "anamnese_delete"    ON anamnese;
DROP POLICY IF EXISTS "admin_anamnese"     ON anamnese;

-- Política unificada: admin (email específico, lido do JWT) vê/edita tudo;
-- paciente vê/edita somente o que é dela.
CREATE POLICY "admin_anamnese" ON anamnese
  FOR ALL USING (
    (auth.jwt() ->> 'email') = 'evelinbeatrizrb@outlook.com'
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'evelinbeatrizrb@outlook.com'
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────
-- As tabelas de módulos dinâmicos e insights foram criadas com o mesmo
-- padrão problemático (SELECT FROM auth.users). Refaz as três.
-- ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "admin_modulos"  ON patient_module_activations;
CREATE POLICY "admin_modulos" ON patient_module_activations
  FOR ALL USING (
    (auth.jwt() ->> 'email') = 'evelinbeatrizrb@outlook.com'
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'evelinbeatrizrb@outlook.com'
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_answers" ON patient_module_answers;
CREATE POLICY "admin_answers" ON patient_module_answers
  FOR ALL USING (
    (auth.jwt() ->> 'email') = 'evelinbeatrizrb@outlook.com'
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'evelinbeatrizrb@outlook.com'
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_insights" ON patient_anamnese_insights;
CREATE POLICY "admin_insights" ON patient_anamnese_insights
  FOR ALL USING (
    (auth.jwt() ->> 'email') = 'evelinbeatrizrb@outlook.com'
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'evelinbeatrizrb@outlook.com'
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );
