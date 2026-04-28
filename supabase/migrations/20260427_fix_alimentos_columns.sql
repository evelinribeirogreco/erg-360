-- ================================================================
-- ERG 360 — FIX: garante todas as colunas em `alimentos`
-- Use SE você já rodou parte do SQL anterior e deu erro de coluna faltando.
-- Idempotente: pode rodar múltiplas vezes sem problema.
-- ================================================================

-- Extensão necessária
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ── Garante que cada coluna exista ───────────────────────────
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS nome_normalizado  text;
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

-- Garante 'categoria' (NOT NULL — se a tabela velha não tiver, define default)
ALTER TABLE alimentos ADD COLUMN IF NOT EXISTS categoria         text;
UPDATE alimentos SET categoria = 'misto' WHERE categoria IS NULL;
ALTER TABLE alimentos ALTER COLUMN categoria SET NOT NULL;

-- Garante 'nome' (deve já existir, mas por segurança)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='alimentos' AND column_name='nome') THEN
    ALTER TABLE alimentos ADD COLUMN nome text NOT NULL DEFAULT 'sem nome';
  END IF;
END $$;

-- ── Recria os índices (já são IF NOT EXISTS) ────────────────
CREATE INDEX IF NOT EXISTS idx_alim_nome_norm  ON alimentos USING GIN (to_tsvector('portuguese', COALESCE(nome_normalizado, '')));
CREATE INDEX IF NOT EXISTS idx_alim_categoria  ON alimentos (categoria);
CREATE INDEX IF NOT EXISTS idx_alim_tags       ON alimentos USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_alim_vegano     ON alimentos (vegano) WHERE vegano = true;
CREATE INDEX IF NOT EXISTS idx_alim_ativo      ON alimentos (ativo);

-- ── Trigger de normalização (popula nome_normalizado) ──────
CREATE OR REPLACE FUNCTION trg_alimentos_normalizar()
RETURNS trigger AS $$
BEGIN
  NEW.nome_normalizado = lower(unaccent(NEW.nome));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alim_normalizar ON alimentos;
CREATE TRIGGER alim_normalizar BEFORE INSERT OR UPDATE ON alimentos
  FOR EACH ROW EXECUTE FUNCTION trg_alimentos_normalizar();

-- Retroativo: popula nome_normalizado nas linhas existentes
UPDATE alimentos
SET nome_normalizado = lower(unaccent(nome))
WHERE nome_normalizado IS NULL OR nome_normalizado = '';

-- ── Trigger updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alim_set_updated_at ON alimentos;
CREATE TRIGGER alim_set_updated_at BEFORE UPDATE ON alimentos
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ── Verificação ─────────────────────────────────────────────
DO $$
DECLARE total_cols int; total_alim int;
BEGIN
  SELECT count(*) INTO total_cols FROM information_schema.columns
  WHERE table_name = 'alimentos';
  SELECT count(*) INTO total_alim FROM alimentos;
  RAISE NOTICE 'Tabela alimentos: % colunas', total_cols;
  RAISE NOTICE 'Linhas existentes: %', total_alim;
END $$;
