-- ================================================================
-- ERG 360 — Sistema de Refeições Clínicas Inteligentes
-- Execute no SQL Editor do Supabase (aba: SQL Editor)
-- ================================================================

-- ── 1. PROTOCOLOS NUTRICIONAIS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS protocols (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    text        UNIQUE NOT NULL,
  nome                    text        NOT NULL,
  descricao               text,
  objetivo_clinico        text,
  estrategia_nutricional  text,
  recomendacoes           text[],
  restricoes              text[],
  -- Metas de macronutrientes (% das kcal totais)
  cho_pct_min             numeric(4,1),
  cho_pct_max             numeric(4,1),
  ptn_pct_min             numeric(4,1),
  ptn_pct_max             numeric(4,1),
  lip_pct_min             numeric(4,1),
  lip_pct_max             numeric(4,1),
  -- Metas absolutas por dia
  kcal_base               numeric(7,1),
  fibra_min_g             numeric(5,1),
  sodio_max_mg            numeric(7,1),
  potassio_min_mg         numeric(7,1),
  calcio_min_mg           numeric(7,1),
  magnesio_min_mg         numeric(7,1),
  omega3_min_g            numeric(5,2),
  g_sat_max_pct           numeric(4,1),
  colesterol_max_mg       numeric(7,1),
  ig_max                  integer,
  num_refeicoes           integer DEFAULT 5,
  created_at              timestamptz DEFAULT now()
);

-- ── 2. BANCO DE ALIMENTOS (base TACO/IBGE) ─────────────────────
CREATE TABLE IF NOT EXISTS foods (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text        UNIQUE NOT NULL,
  nome                text        NOT NULL,
  categoria           text        NOT NULL,
  -- 'cereais' | 'tuberculos' | 'carnes' | 'peixes' | 'ovos'
  -- 'leguminosas' | 'laticinios' | 'vegetais' | 'frutas'
  -- 'oleaginosas' | 'sementes' | 'gorduras' | 'temperos' | 'outros'
  preparo_padrao      text        DEFAULT 'cru',
  -- Valores por 100g no estado indicado (preparo_padrao)
  kcal                numeric(7,2) NOT NULL,
  cho_g               numeric(6,2) NOT NULL DEFAULT 0,
  ptn_g               numeric(6,2) NOT NULL DEFAULT 0,
  lip_g               numeric(6,2) NOT NULL DEFAULT 0,
  fib_g               numeric(6,2) DEFAULT 0,
  na_mg               numeric(7,2) DEFAULT 0,   -- sódio
  k_mg                numeric(7,2) DEFAULT 0,   -- potássio
  ca_mg               numeric(7,2) DEFAULT 0,   -- cálcio
  fe_mg               numeric(6,2) DEFAULT 0,   -- ferro
  mg_mg               numeric(7,2) DEFAULT 0,   -- magnésio
  zn_mg               numeric(6,2) DEFAULT 0,   -- zinco
  vit_c_mg            numeric(7,2) DEFAULT 0,
  omega3_g            numeric(6,2) DEFAULT 0,
  g_sat_g             numeric(6,2) DEFAULT 0,   -- gordura saturada
  col_mg              numeric(7,2) DEFAULT 0,   -- colesterol
  ig                  integer,                  -- índice glicêmico
  cg                  numeric(5,1),             -- carga glicêmica
  taco_ref            text,                     -- código/referência TACO
  created_at          timestamptz DEFAULT now()
);

-- Tags dos alimentos (multi-valor)
CREATE TABLE IF NOT EXISTS food_tags (
  food_id   uuid  REFERENCES foods(id) ON DELETE CASCADE,
  tag       text  NOT NULL,
  PRIMARY KEY (food_id, tag)
);

-- ── 3. TEMPLATES DE REFEIÇÃO ───────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_templates (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id     uuid    REFERENCES protocols(id) ON DELETE CASCADE,
  tipo_refeicao   text    NOT NULL,
  -- 'cafe_manha' | 'lanche_manha' | 'almoco'
  -- 'lanche_tarde' | 'jantar' | 'ceia'
  opcao           integer NOT NULL DEFAULT 1,
  nome            text    NOT NULL,
  descricao       text,
  nota_clinica    text,
  -- Totais desnormalizados (calculados automaticamente)
  total_kcal      numeric(7,2),
  total_cho_g     numeric(6,2),
  total_ptn_g     numeric(6,2),
  total_lip_g     numeric(6,2),
  total_fib_g     numeric(6,2),
  total_na_mg     numeric(7,2),
  created_at      timestamptz DEFAULT now(),
  UNIQUE (protocol_id, tipo_refeicao, opcao)
);

-- Alimentos de cada template
CREATE TABLE IF NOT EXISTS meal_template_foods (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_template_id    uuid    REFERENCES meal_templates(id) ON DELETE CASCADE,
  food_id             uuid    REFERENCES foods(id),
  food_nome_livre     text,   -- fallback se não tiver no foods
  quantidade_g        numeric(7,2) NOT NULL,
  nota_preparo        text,
  opcional            boolean DEFAULT false,
  ordem               integer DEFAULT 0
);

-- ── 4. SUBSTITUIÇÕES ALIMENTARES ──────────────────────────────
CREATE TABLE IF NOT EXISTS food_substitutions (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id             uuid    REFERENCES foods(id),
  substituto_id       uuid    REFERENCES foods(id),
  quantidade_g        numeric(7,2),   -- quantidade do substituto
  ratio               numeric(5,3) DEFAULT 1.0,
  observacao          text,
  protocolos          text[], -- slugs compatíveis; vazio = todos
  created_at          timestamptz DEFAULT now()
);

-- ── 5. PLANOS GERADOS PARA PACIENTES ──────────────────────────
CREATE TABLE IF NOT EXISTS patient_meal_plans (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid    REFERENCES patients(id) ON DELETE CASCADE,
  protocol_id     uuid    REFERENCES protocols(id),
  nome            text,
  kcal_alvo       numeric(7,2),
  valido_de       date,
  valido_ate      date,
  observacoes     text,
  gerado_por      uuid,   -- user_id da nutricionista
  created_at      timestamptz DEFAULT now()
);

-- Refeições do plano do paciente
CREATE TABLE IF NOT EXISTS patient_plan_meals (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             uuid    REFERENCES patient_meal_plans(id) ON DELETE CASCADE,
  tipo_refeicao       text    NOT NULL,
  meal_template_id    uuid    REFERENCES meal_templates(id),
  fator_quantidade    numeric(4,2) DEFAULT 1.0,  -- multiplica as gramas
  observacoes_custom  text,
  dias_semana         text[], -- ['seg','ter',...] null = todo dia
  ordem               integer DEFAULT 0
);

-- ── 6. ÍNDICES DE PERFORMANCE ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_meal_templates_protocol ON meal_templates(protocol_id, tipo_refeicao);
CREATE INDEX IF NOT EXISTS idx_mtf_template ON meal_template_foods(meal_template_id);
CREATE INDEX IF NOT EXISTS idx_patient_plans ON patient_meal_plans(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_tags ON food_tags(tag);

-- ── 7. ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE protocols           ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods               ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_template_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_substitutions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_meal_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_plan_meals  ENABLE ROW LEVEL SECURITY;

-- Dados clínicos: leitura pública (nutricionista + patients autenticados)
CREATE POLICY "leitura_protocols"    ON protocols           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "leitura_foods"        ON foods               FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "leitura_food_tags"    ON food_tags           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "leitura_templates"    ON meal_templates      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "leitura_tmpl_foods"   ON meal_template_foods FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "leitura_subst"        ON food_substitutions  FOR SELECT USING (auth.role() = 'authenticated');

-- Planos dos patients: apenas o próprio paciente vê seu plano
CREATE POLICY "paciente_ver_plano" ON patient_meal_plans
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR auth.uid() IN (
      SELECT p.user_id FROM patients p
      JOIN auth.users u ON u.id = p.user_id
      WHERE u.email LIKE '%evelingreco%'
    )
  );

CREATE POLICY "paciente_ver_refeicoes" ON patient_plan_meals
  FOR SELECT USING (
    plan_id IN (
      SELECT id FROM patient_meal_plans
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    )
  );

-- ── 8. FUNÇÃO: calcular totais do template ─────────────────────
-- Chamada automaticamente ao inserir/editar alimentos de um template
CREATE OR REPLACE FUNCTION recalcular_totais_template()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  tmpl_id uuid;
BEGIN
  tmpl_id := COALESCE(NEW.meal_template_id, OLD.meal_template_id);

  UPDATE meal_templates mt SET
    total_kcal  = agg.kcal,
    total_cho_g = agg.cho,
    total_ptn_g = agg.ptn,
    total_lip_g = agg.lip,
    total_fib_g = agg.fib,
    total_na_mg = agg.na
  FROM (
    SELECT
      SUM(f.kcal * mtf.quantidade_g / 100) AS kcal,
      SUM(f.cho_g * mtf.quantidade_g / 100) AS cho,
      SUM(f.ptn_g * mtf.quantidade_g / 100) AS ptn,
      SUM(f.lip_g * mtf.quantidade_g / 100) AS lip,
      SUM(f.fib_g * mtf.quantidade_g / 100) AS fib,
      SUM(f.na_mg * mtf.quantidade_g / 100) AS na
    FROM meal_template_foods mtf
    JOIN foods f ON f.id = mtf.food_id
    WHERE mtf.meal_template_id = tmpl_id
  ) agg
  WHERE mt.id = tmpl_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalcular_totais
  AFTER INSERT OR UPDATE OR DELETE ON meal_template_foods
  FOR EACH ROW EXECUTE FUNCTION recalcular_totais_template();
