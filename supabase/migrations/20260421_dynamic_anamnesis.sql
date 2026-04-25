-- ================================================================
-- ERG 360 — Sistema de Anamnese Dinâmica e Adaptativa
-- Execute no SQL Editor do Supabase
-- ================================================================

-- ── 1. ATIVAÇÕES DE MÓDULOS POR PACIENTE ──────────────────────
-- Registra quais módulos foram ativados para cada anamnese
CREATE TABLE IF NOT EXISTS patient_module_activations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid        REFERENCES patients(id) ON DELETE CASCADE,
  anamnese_id   uuid,                    -- FK à tabela anamnese (base)
  module_slug   text        NOT NULL,    -- 'atleta' | 'emagrecimento' | 'diabetes_ri' | etc.
  ativado_por   text        NOT NULL DEFAULT 'automatico', -- 'automatico' | 'manual'
  created_at    timestamptz DEFAULT now(),
  UNIQUE (patient_id, anamnese_id, module_slug)
);

-- ── 2. RESPOSTAS DOS MÓDULOS DINÂMICOS ────────────────────────
-- Armazena cada resposta como linha separada (EAV pattern)
CREATE TABLE IF NOT EXISTS patient_module_answers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid        REFERENCES patients(id) ON DELETE CASCADE,
  anamnese_id     uuid,                    -- FK à tabela anamnese (base)
  module_slug     text        NOT NULL,    -- qual módulo
  question_slug   text        NOT NULL,    -- qual pergunta dentro do módulo
  resposta_texto  text,                    -- valor principal (texto, número, select, toggle)
  -- resposta_texto para multiselect: valores separados por '|'
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (patient_id, anamnese_id, module_slug, question_slug)
);

-- ── 3. INSIGHTS GERADOS AUTOMATICAMENTE ─────────────────────
-- Cache dos insights clínicos gerados pelo motor
CREATE TABLE IF NOT EXISTS patient_anamnese_insights (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid        REFERENCES patients(id) ON DELETE CASCADE,
  anamnese_id   uuid,
  tipo          text        NOT NULL,  -- 'critico' | 'atencao' | 'conduta' | 'prioridade' | 'info'
  modulo_origem text,                  -- qual módulo gerou o insight (null = base)
  mensagem      text        NOT NULL,
  ordem         integer     DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- ── 4. ÍNDICES DE PERFORMANCE ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mod_activations_patient ON patient_module_activations(patient_id);
CREATE INDEX IF NOT EXISTS idx_mod_activations_anamnese ON patient_module_activations(anamnese_id);
CREATE INDEX IF NOT EXISTS idx_mod_answers_patient ON patient_module_answers(patient_id, module_slug);
CREATE INDEX IF NOT EXISTS idx_mod_answers_anamnese ON patient_module_answers(anamnese_id);
CREATE INDEX IF NOT EXISTS idx_insights_patient ON patient_anamnese_insights(patient_id, created_at DESC);

-- ── 5. TRIGGER: atualiza updated_at ───────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_module_answers_updated
  BEFORE UPDATE ON patient_module_answers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE patient_module_activations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_module_answers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_anamnese_insights    ENABLE ROW LEVEL SECURITY;

-- Nutricionista (admin) vê tudo; paciente vê apenas os seus dados
CREATE POLICY "admin_modulos" ON patient_module_activations
  FOR ALL USING (
    auth.uid() IN (
      SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com'
    )
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_answers" ON patient_module_answers
  FOR ALL USING (
    auth.uid() IN (
      SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com'
    )
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_insights" ON patient_anamnese_insights
  FOR ALL USING (
    auth.uid() IN (
      SELECT u.id FROM auth.users u WHERE u.email = 'evelinbeatrizrb@outlook.com'
    )
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- ── 7. VIEW: Resumo de módulos por paciente ───────────────────
CREATE OR REPLACE VIEW v_patient_modules AS
SELECT
  pma.patient_id,
  p.nome AS paciente_nome,
  array_agg(DISTINCT pma.module_slug ORDER BY pma.module_slug) AS modulos_ativos,
  count(DISTINCT pan.id)  AS total_respostas,
  max(pma.created_at)     AS ultima_atualizacao
FROM patient_module_activations pma
JOIN patients p ON p.id = pma.patient_id
LEFT JOIN patient_module_answers pan
  ON pan.patient_id = pma.patient_id
 AND pan.module_slug = pma.module_slug
GROUP BY pma.patient_id, p.nome;

-- ── 8. VIEW: Perfil clínico completo do paciente ─────────────
-- Consolida anamnese base + respostas dos módulos em uma query
CREATE OR REPLACE VIEW v_perfil_clinico AS
SELECT
  an.patient_id,
  an.id                   AS anamnese_id,
  an.data_avaliacao,
  an.motivo,
  an.patologias,
  an.nivel_af,
  an.glicemia,
  an.hba1c,
  an.insulina,
  an.tg,
  an.hdl,
  an.ldl,
  an.col_total,
  -- Módulos ativos
  (SELECT array_agg(DISTINCT module_slug)
   FROM patient_module_activations
   WHERE patient_id = an.patient_id)         AS modulos_ativos,
  -- Contagem de insights críticos
  (SELECT count(*) FROM patient_anamnese_insights
   WHERE patient_id = an.patient_id AND tipo = 'critico') AS n_alertas_criticos,
  (SELECT count(*) FROM patient_anamnese_insights
   WHERE patient_id = an.patient_id AND tipo = 'atencao') AS n_alertas_atencao
FROM anamnese an
ORDER BY an.data_avaliacao DESC;
