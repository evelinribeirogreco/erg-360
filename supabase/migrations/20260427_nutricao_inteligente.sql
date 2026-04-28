-- ================================================================
-- ERG 360 — Sistema de Nutrição Clínica Inteligente
-- 6 tabelas: alimentos, refeicoes_template, cardapios,
-- cardapio_refeicoes, substituicoes_alimentos, tags_nutricionais
-- Execute no SQL Editor do Supabase
-- ================================================================

-- ────────────────────────────────────────────────────────────
-- 1. ALIMENTOS — banco com composição nutricional completa
-- (Idempotente: cria do zero OU adiciona colunas faltantes em tabela antiga)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alimentos (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              text          NOT NULL
);

-- Adiciona colunas extras (idempotente — se já existem, ignora)
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS nome_normalizado  text;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS categoria         text;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS subcategoria      text;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS porcao_padrao_g   numeric(6,1) DEFAULT 100.0;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS kcal              numeric(6,1);
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS ptn_g             numeric(5,1);
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS cho_g             numeric(5,1);
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS lip_g             numeric(5,1);
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS fibras_g          numeric(4,1);
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS ig                integer;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS cg                numeric(4,1);
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS micronutrientes   jsonb DEFAULT '{}'::jsonb;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS vegetariano       boolean DEFAULT true;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS vegano            boolean DEFAULT false;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS sem_gluten        boolean DEFAULT true;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS sem_lactose       boolean DEFAULT true;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS industrializado   boolean DEFAULT false;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS tags              text[] DEFAULT '{}';
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS fonte_dados       text;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS observacoes       text;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS ativo             boolean NOT NULL DEFAULT true;
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS created_at        timestamptz NOT NULL DEFAULT now();
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now();

-- Garante NOT NULL em categoria após backfill
UPDATE alimentos SET categoria = 'misto' WHERE categoria IS NULL;
DO $$ BEGIN
  ALTER TABLE alimentos ALTER COLUMN categoria SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_alim_nome_norm  ON alimentos USING GIN (to_tsvector('portuguese', nome_normalizado));
CREATE INDEX IF NOT EXISTS idx_alim_categoria  ON alimentos (categoria);
CREATE INDEX IF NOT EXISTS idx_alim_tags       ON alimentos USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_alim_vegano     ON alimentos (vegano) WHERE vegano = true;
CREATE INDEX IF NOT EXISTS idx_alim_ativo      ON alimentos (ativo);

-- ────────────────────────────────────────────────────────────
-- 2. TAGS NUTRICIONAIS — catálogo de tags
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags_nutricionais (
  slug              text          PRIMARY KEY,                  -- 'anti_inflamatorio'
  label             text          NOT NULL,                     -- 'Anti-inflamatório'
  categoria         text          NOT NULL,                     -- 'perfil' | 'saude' | 'preferencia' | 'objetivo'
  cor               text,                                       -- hex ex: '#4CB8A0'
  icone             text,                                       -- emoji
  descricao         text,
  ordem             integer       DEFAULT 0
);

INSERT INTO tags_nutricionais (slug, label, categoria, cor, icone, descricao, ordem) VALUES
('alto_proteico',     'Alto teor proteico',  'objetivo',    '#7A2E2E', '💪', 'Refeições com ≥ 25g de proteína',                       1),
('low_carb',          'Low carb',            'preferencia', '#3A5E8B', '🥑', 'Carboidratos < 30g por refeição',                       2),
('cetogenico',        'Cetogênico',          'preferencia', '#5E4FB8', '🥥', 'Muito baixo CHO + alto LIP (cetose nutricional)',       3),
('hipossodico',       'Hipossódico',         'saude',       '#B8860B', '🧂', 'Sódio < 400 mg/refeição (DASH)',                        4),
('hipolipidico',      'Hipolipídico',        'saude',       '#3D6B4F', '💧', 'Gordura saturada < 5g/refeição',                        5),
('baixo_ig',          'Baixo IG',            'saude',       '#2D6A56', '📉', 'Índice glicêmico ≤ 55',                                 6),
('rico_fibras',       'Rico em fibras',      'saude',       '#6B4F2E', '🌾', '≥ 6g de fibras por refeição',                           7),
('anti_inflamatorio', 'Anti-inflamatório',   'saude',       '#4CB8A0', '✨', 'Rico em ômega-3, polifenóis, antioxidantes',            8),
('saciedade_alta',    'Saciedade alta',      'objetivo',    '#C9A84C', '🍴', 'Combinação proteína + fibra + gordura boa',             9),
('rico_calcio',       'Rico em cálcio',      'saude',       '#8B5E3C', '🦴', '≥ 250 mg de cálcio',                                   10),
('rico_ferro',        'Rico em ferro',       'saude',       '#7A2E2E', '🩸', '≥ 4 mg de ferro',                                      11),
('rico_potassio',     'Rico em potássio',    'saude',       '#506E8B', '🍌', '≥ 600 mg de potássio',                                 12),
('vegano',            'Vegano',              'preferencia', '#3D6B4F', '🌱', 'Sem ingredientes de origem animal',                    13),
('vegetariano',       'Vegetariano',         'preferencia', '#3D6B4F', '🥗', 'Sem carnes (pode incluir ovos/laticínios)',            14),
('sem_gluten',        'Sem glúten',          'preferencia', '#B8506E', '🚫', 'Livre de trigo, centeio, cevada',                      15),
('sem_lactose',       'Sem lactose',         'preferencia', '#B8506E', '🥛', 'Livre de lactose',                                     16),
('cardioprotetor',    'Cardioprotetor',      'saude',       '#7A2E2E', '❤️', 'Padrão DASH/Mediterrâneo',                             17),
('hepatoprotetor',    'Hepatoprotetor',      'saude',       '#6B4F2E', '🫁', 'Suporte hepático (NAFLD)',                             18),
('renal_friendly',    'Friendly renal',      'saude',       '#506E8B', '💧', 'Baixo K+/P+ (DRC)',                                    19),
('pre_treino',        'Pré-treino',          'objetivo',    '#C9A84C', '⚡', 'CHO complexo + proteína 1-2h antes do exercício',      20),
('pos_treino',        'Pós-treino',          'objetivo',    '#4CB8A0', '🏋️', 'Janela anabólica — proteína + CHO simples',            21)
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 3. REFEIÇÕES TEMPLATE — biblioteca de refeições prontas
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refeicoes_template (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               text          NOT NULL,
  tipo               text          NOT NULL CHECK (tipo IN
    ('cafe_manha','lanche_manha','almoco','lanche_tarde','jantar','ceia','pre_treino','pos_treino')),
  descricao          text,
  horario_sugerido   text,                                         -- '07h00'
  -- Composição: array de itens com referência a alimentos
  alimentos          jsonb         NOT NULL DEFAULT '[]'::jsonb,
  --   [{ alimento_id?, nome, qty_g, qty_visual ('2 col. sopa'), substituicoes_ok? }]
  -- Macros calculados (cache, atualizado por trigger ou manualmente)
  macros             jsonb         DEFAULT '{}'::jsonb,
  --   { kcal, ptn_g, cho_g, lip_g, fibras_g }
  micronutrientes    jsonb         DEFAULT '{}'::jsonb,
  -- Tags pra filtros
  tags               text[]        DEFAULT '{}',
  perfil_clinico     text[]        DEFAULT '{}',                  -- ['diabetes_t2','sop','dislipidemia']
  -- Metadados
  modo_preparo       text,
  observacoes        text,
  ativo              boolean       NOT NULL DEFAULT true,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ref_tipo     ON refeicoes_template (tipo);
CREATE INDEX IF NOT EXISTS idx_ref_tags     ON refeicoes_template USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_ref_perfil   ON refeicoes_template USING GIN (perfil_clinico);
CREATE INDEX IF NOT EXISTS idx_ref_ativo    ON refeicoes_template (ativo);

-- ────────────────────────────────────────────────────────────
-- 4. CARDÁPIOS — perfis completos com 5 refeições
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cardapios (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text          UNIQUE NOT NULL,                -- 'onivoro_padrao_1800kcal'
  nome               text          NOT NULL,
  -- Categorização
  perfil_categoria   text          NOT NULL CHECK (perfil_categoria IN
    ('estilo_alimentar','condicao_clinica','objetivo')),
  perfil_slug        text          NOT NULL,                       -- 'onivoro' | 'diabetes_t2' | 'emagrecimento'
  -- Objetivos
  objetivo_clinico   text,
  descricao          text,
  publico_alvo       text,
  contraindicacoes   text[],
  -- Macros alvo
  kcal_alvo          integer       NOT NULL,
  cho_pct            numeric(4,1),
  ptn_pct            numeric(4,1),
  lip_pct            numeric(4,1),
  fibras_g_dia       numeric(4,1),
  ptn_g_por_kg       numeric(3,1),                                  -- ex: 1.6 g/kg
  -- Justificativa nutricional (texto curto)
  justificativa      text,
  observacoes_clinicas text,
  -- Tags
  tags               text[]        DEFAULT '{}',
  -- Metadados
  ativo              boolean       NOT NULL DEFAULT true,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_perfil    ON cardapios (perfil_categoria, perfil_slug);
CREATE INDEX IF NOT EXISTS idx_card_tags      ON cardapios USING GIN (tags);

-- ────────────────────────────────────────────────────────────
-- 5. CARDAPIO_REFEICOES — vincula refeições aos cardápios
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cardapio_refeicoes (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  cardapio_id         uuid          NOT NULL REFERENCES cardapios(id) ON DELETE CASCADE,
  refeicao_template_id uuid         NOT NULL REFERENCES refeicoes_template(id) ON DELETE CASCADE,
  tipo                text          NOT NULL,                      -- redundante c/ refeicoes_template.tipo, facilita query
  ordem               integer       NOT NULL DEFAULT 0,
  opcao_n             integer       DEFAULT 1,                     -- 1, 2, 3 (várias opções pra mesma refeição)
  nota_clinica        text,
  ajuste_qty_pct      numeric(5,2)  DEFAULT 100.0,                 -- multiplicador pra ajustar tamanho da porção
  created_at          timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (cardapio_id, refeicao_template_id, opcao_n)
);

CREATE INDEX IF NOT EXISTS idx_crf_cardapio  ON cardapio_refeicoes (cardapio_id, ordem);
CREATE INDEX IF NOT EXISTS idx_crf_refeicao  ON cardapio_refeicoes (refeicao_template_id);

-- ────────────────────────────────────────────────────────────
-- 6. SUBSTITUIÇÕES DE ALIMENTOS — equivalências por macro
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS substituicoes_alimentos (
  id                   uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  alimento_origem_id   uuid         NOT NULL REFERENCES alimentos(id) ON DELETE CASCADE,
  alimento_substituto_id uuid       NOT NULL REFERENCES alimentos(id) ON DELETE CASCADE,
  base_equivalencia    text         NOT NULL CHECK (base_equivalencia IN
    ('calorias','proteina','carboidrato','gordura')),
  fator_multiplicador  numeric(6,2) NOT NULL DEFAULT 1.0,           -- ex: 100g frango → 80g (fator 0.80) de outro
  notas                text,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (alimento_origem_id, alimento_substituto_id, base_equivalencia)
);

CREATE INDEX IF NOT EXISTS idx_sub_origem    ON substituicoes_alimentos (alimento_origem_id);
CREATE INDEX IF NOT EXISTS idx_sub_substituto ON substituicoes_alimentos (alimento_substituto_id);

-- ────────────────────────────────────────────────────────────
-- TRIGGERS — updated_at automático
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alim_set_updated_at ON alimentos;
CREATE TRIGGER alim_set_updated_at BEFORE UPDATE ON alimentos
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS ref_set_updated_at ON refeicoes_template;
CREATE TRIGGER ref_set_updated_at BEFORE UPDATE ON refeicoes_template
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS card_set_updated_at ON cardapios;
CREATE TRIGGER card_set_updated_at BEFORE UPDATE ON cardapios
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ────────────────────────────────────────────────────────────
-- TRIGGER de normalização — popula nome_normalizado em alimentos
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_alimentos_normalizar()
RETURNS trigger AS $$
BEGIN
  NEW.nome_normalizado = lower(unaccent(NEW.nome));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Habilita unaccent se disponível (Supabase tem por padrão)
CREATE EXTENSION IF NOT EXISTS unaccent;

DROP TRIGGER IF EXISTS alim_normalizar ON alimentos;
CREATE TRIGGER alim_normalizar BEFORE INSERT OR UPDATE ON alimentos
  FOR EACH ROW EXECUTE FUNCTION trg_alimentos_normalizar();

-- ────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- Banco aberto pra leitura por autenticados; escrita só admin.
-- ────────────────────────────────────────────────────────────
ALTER TABLE alimentos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE refeicoes_template      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapios               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardapio_refeicoes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE substituicoes_alimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags_nutricionais       ENABLE ROW LEVEL SECURITY;

-- Função helper: é admin?
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND u.email = 'evelinbeatrizrb@outlook.com'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- SELECT aberto pra autenticados
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "nutri_select_auth" ON alimentos               FOR SELECT USING (auth.role() = ''authenticated'')';
  EXECUTE 'CREATE POLICY "nutri_select_auth" ON refeicoes_template      FOR SELECT USING (auth.role() = ''authenticated'')';
  EXECUTE 'CREATE POLICY "nutri_select_auth" ON cardapios               FOR SELECT USING (auth.role() = ''authenticated'')';
  EXECUTE 'CREATE POLICY "nutri_select_auth" ON cardapio_refeicoes      FOR SELECT USING (auth.role() = ''authenticated'')';
  EXECUTE 'CREATE POLICY "nutri_select_auth" ON substituicoes_alimentos FOR SELECT USING (auth.role() = ''authenticated'')';
  EXECUTE 'CREATE POLICY "nutri_select_auth" ON tags_nutricionais       FOR SELECT USING (auth.role() = ''authenticated'')';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ALL operations pra admin
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "nutri_admin_all" ON alimentos               FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user())';
  EXECUTE 'CREATE POLICY "nutri_admin_all" ON refeicoes_template      FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user())';
  EXECUTE 'CREATE POLICY "nutri_admin_all" ON cardapios               FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user())';
  EXECUTE 'CREATE POLICY "nutri_admin_all" ON cardapio_refeicoes      FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user())';
  EXECUTE 'CREATE POLICY "nutri_admin_all" ON substituicoes_alimentos FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user())';
  EXECUTE 'CREATE POLICY "nutri_admin_all" ON tags_nutricionais       FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user())';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- VIEWS úteis pra consultas frequentes
-- ────────────────────────────────────────────────────────────

-- Cardápio completo com refeições aninhadas
CREATE OR REPLACE VIEW cardapio_completo AS
SELECT
  c.id, c.slug, c.nome, c.perfil_categoria, c.perfil_slug,
  c.objetivo_clinico, c.kcal_alvo,
  c.cho_pct, c.ptn_pct, c.lip_pct,
  jsonb_agg(
    jsonb_build_object(
      'cr_id',         cr.id,
      'tipo',          cr.tipo,
      'ordem',         cr.ordem,
      'opcao',         cr.opcao_n,
      'refeicao',      to_jsonb(rt.*),
      'ajuste_qty_pct', cr.ajuste_qty_pct,
      'nota_clinica',  cr.nota_clinica
    ) ORDER BY cr.ordem, cr.opcao_n
  ) FILTER (WHERE cr.id IS NOT NULL) AS refeicoes
FROM cardapios c
LEFT JOIN cardapio_refeicoes cr ON cr.cardapio_id = c.id
LEFT JOIN refeicoes_template rt ON rt.id = cr.refeicao_template_id
WHERE c.ativo = true
GROUP BY c.id;

-- Alimento com substituições agrupadas
CREATE OR REPLACE VIEW alimento_com_substituicoes AS
SELECT
  a.*,
  COALESCE(jsonb_agg(
    jsonb_build_object(
      'substituto_id', sub.alimento_substituto_id,
      'nome',          a2.nome,
      'base',          sub.base_equivalencia,
      'fator',         sub.fator_multiplicador,
      'notas',         sub.notas
    ) ORDER BY sub.base_equivalencia
  ) FILTER (WHERE sub.id IS NOT NULL), '[]'::jsonb) AS substituicoes
FROM alimentos a
LEFT JOIN substituicoes_alimentos sub ON sub.alimento_origem_id = a.id
LEFT JOIN alimentos a2 ON a2.id = sub.alimento_substituto_id
WHERE a.ativo = true
GROUP BY a.id;
