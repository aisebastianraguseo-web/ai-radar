-- =============================================================================
-- Migration: 20260318000000_initial_schema.sql
-- Product:   ai-radar
-- Generated: 2026-03-18T00:00:00Z
-- Status:    NOT APPLIED
--
-- IMPORTANT: Review before applying.
-- Apply to staging: supabase db push --db-url $STAGING_DB_URL
-- Apply to production ONLY after staging verification.
-- =============================================================================

-- migrate:up

-- ========================
-- Extensions
-- ========================
CREATE EXTENSION IF NOT EXISTS "moddatetime";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ========================
-- Enums
-- ========================
CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'stakeholder', 'viewer');

CREATE TYPE source_type AS ENUM (
  'blog_official', 'github_trending', 'arxiv', 'hacker_news',
  'product_hunt', 'vc_blog', 'twitter_list', 'rss_other'
);

CREATE TYPE ingestion_status AS ENUM (
  'ready', 'duplicate', 'extraction_queued', 'extraction_done',
  'extraction_failed', 'skipped'
);

CREATE TYPE capability_category AS ENUM (
  'context_processing', 'reasoning_depth', 'multi_step_autonomy',
  'tool_use', 'multimodality', 'deployment_flexibility',
  'cost_efficiency', 'autonomy_level', 'persistence',
  'self_improvement', 'integration_depth', 'governance_security'
);

CREATE TYPE problem_class AS ENUM (
  'fragmentation', 'knowledge_loss', 'manual_handoffs',
  'repetitivity', 'decision_uncertainty', 'long_cycles',
  'documentation_burden', 'transparency_gap', 'talent_constraints'
);

CREATE TYPE readiness_level AS ENUM ('experimental', 'early_adopter', 'production_ready');

CREATE TYPE alert_channel AS ENUM ('email', 'slack', 'in_app');

CREATE TYPE alert_type AS ENUM ('threshold', 'digest', 'briefing', 'custom');

CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'failed', 'retrying');

CREATE TYPE briefing_status AS ENUM ('generating', 'ready', 'failed');

-- ========================
-- Table: profiles
-- ========================
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  organisation TEXT,
  role         user_role NOT NULL DEFAULT 'viewer',
  preferences  JSONB NOT NULL DEFAULT '{
    "alert_channels": ["in_app"],
    "digest_threshold": 3,
    "alert_threshold": 6,
    "weekly_briefing": true,
    "muted_vendors": [],
    "muted_problem_classes": [],
    "vendor_filters": [],
    "problem_class_filters": []
  }'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ========================
-- Table: ingestion_runs
-- ========================
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  sources_total  INTEGER NOT NULL DEFAULT 0,
  sources_new    INTEGER NOT NULL DEFAULT 0,
  sources_dup    INTEGER NOT NULL DEFAULT 0,
  sources_failed INTEGER NOT NULL DEFAULT 0,
  triggered_by   TEXT NOT NULL DEFAULT 'cron',
  status         TEXT NOT NULL DEFAULT 'running',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER handle_updated_at_ingestion_runs
  BEFORE UPDATE ON public.ingestion_runs
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ========================
-- Table: ingested_sources
-- ========================
CREATE TABLE IF NOT EXISTS public.ingested_sources (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type      source_type NOT NULL,
  source_url       TEXT NOT NULL,
  url_hash         TEXT NOT NULL GENERATED ALWAYS AS (md5(source_url)) STORED,
  title            TEXT NOT NULL,
  content          TEXT,
  publish_date     TIMESTAMPTZ,
  ingestion_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vendor           TEXT,
  raw_metadata     JSONB,
  ingestion_status ingestion_status NOT NULL DEFAULT 'ready',
  extraction_status TEXT,
  error_message    TEXT,
  run_id           UUID REFERENCES public.ingestion_runs(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ingested_sources ENABLE ROW LEVEL SECURITY;

-- Lifetime-unique URL deduplication (no time window — see spec AMB-1 resolution)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingested_sources_url_hash
  ON public.ingested_sources (url_hash);

CREATE INDEX IF NOT EXISTS idx_ingested_sources_status
  ON public.ingested_sources (ingestion_status)
  WHERE ingestion_status = 'ready';

CREATE INDEX IF NOT EXISTS idx_ingested_sources_vendor
  ON public.ingested_sources (vendor)
  WHERE vendor IS NOT NULL;

-- ========================
-- Table: capability_deltas
-- ========================
CREATE TABLE IF NOT EXISTS public.capability_deltas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           UUID NOT NULL REFERENCES public.ingested_sources(id) ON DELETE CASCADE,
  capability_category capability_category NOT NULL,
  capability_name     TEXT NOT NULL,
  delta_magnitude     SMALLINT NOT NULL CHECK (delta_magnitude BETWEEN 0 AND 2),
  delta_numeric       NUMERIC,
  old_value           TEXT,
  new_value           TEXT,
  confidence_score    NUMERIC(3,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  vendors_affected    TEXT[] NOT NULL DEFAULT '{}',
  detected_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence_snippets   TEXT[] NOT NULL DEFAULT '{}',
  mapping_status      TEXT NOT NULL DEFAULT 'pending',
  score_id            UUID,
  low_confidence      BOOLEAN GENERATED ALWAYS AS (confidence_score < 0.4) STORED,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.capability_deltas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER handle_updated_at_capability_deltas
  BEFORE UPDATE ON public.capability_deltas
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE INDEX IF NOT EXISTS idx_capability_deltas_source_id
  ON public.capability_deltas (source_id);

CREATE INDEX IF NOT EXISTS idx_capability_deltas_mapping_status
  ON public.capability_deltas (mapping_status)
  WHERE mapping_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_capability_deltas_category_magnitude
  ON public.capability_deltas (capability_category, delta_magnitude);

CREATE INDEX IF NOT EXISTS idx_capability_deltas_detected_date
  ON public.capability_deltas (detected_date DESC);

CREATE INDEX IF NOT EXISTS idx_capability_deltas_fts
  ON public.capability_deltas USING gin(to_tsvector('english', capability_name));

-- ========================
-- Table: business_problem_mappings
-- ========================
CREATE TABLE IF NOT EXISTS public.business_problem_mappings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delta_id                 UUID NOT NULL REFERENCES public.capability_deltas(id) ON DELETE CASCADE,
  problem_class            problem_class NOT NULL,
  problem_description      TEXT NOT NULL,
  addressable_process_name TEXT NOT NULL,
  impact_statement         TEXT NOT NULL CHECK (char_length(impact_statement) <= 280),
  readiness_level          readiness_level NOT NULL,
  mapped_date              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mapper_version           TEXT NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.business_problem_mappings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bpm_delta_id
  ON public.business_problem_mappings (delta_id);

CREATE INDEX IF NOT EXISTS idx_bpm_problem_class
  ON public.business_problem_mappings (problem_class);

CREATE INDEX IF NOT EXISTS idx_bpm_fts
  ON public.business_problem_mappings
  USING gin(to_tsvector('english', impact_statement));

-- ========================
-- Table: disruption_scores
-- ========================
CREATE TABLE IF NOT EXISTS public.disruption_scores (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delta_id                     UUID NOT NULL REFERENCES public.capability_deltas(id) ON DELETE CASCADE,
  vendor_leadership_score      NUMERIC(3,1) NOT NULL DEFAULT 0,
  novelty_score                NUMERIC(3,1) NOT NULL DEFAULT 0,
  distribution_potential_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  open_source_score            NUMERIC(3,1) NOT NULL DEFAULT 0,
  cost_reduction_score         NUMERIC(3,1) NOT NULL DEFAULT 0,
  momentum_score               NUMERIC(3,1) NOT NULL DEFAULT 0,
  hype_adjustment              NUMERIC(3,1) NOT NULL DEFAULT 0,
  multi_signal_bonus           NUMERIC(3,1) NOT NULL DEFAULT 0,
  total_disruption_score       NUMERIC(5,2) NOT NULL,
  alert_triggered              BOOLEAN NOT NULL GENERATED ALWAYS AS (total_disruption_score >= 6) STORED,
  calculated_date              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.disruption_scores ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_disruption_scores_total_desc
  ON public.disruption_scores (total_disruption_score DESC);

CREATE INDEX IF NOT EXISTS idx_disruption_scores_alert_triggered
  ON public.disruption_scores (alert_triggered)
  WHERE alert_triggered = true;

-- ========================
-- Table: capability_landscape_versions
-- ========================
CREATE TABLE IF NOT EXISTS public.capability_landscape_versions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number         INTEGER NOT NULL,
  snapshot_date          DATE NOT NULL UNIQUE,
  capability_snapshots   JSONB NOT NULL,
  delta_count_since_last INTEGER NOT NULL DEFAULT 0,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.capability_landscape_versions ENABLE ROW LEVEL SECURITY;

-- ========================
-- Table: weekly_briefings
-- ========================
CREATE TABLE IF NOT EXISTS public.weekly_briefings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start       DATE NOT NULL UNIQUE,
  week_end         DATE NOT NULL,
  executive_summary TEXT NOT NULL,
  top_disruptors   JSONB NOT NULL,
  capability_trends JSONB NOT NULL,
  problem_matrix   JSONB NOT NULL,
  recommendations  JSONB NOT NULL,
  full_content_md  TEXT NOT NULL,
  status           briefing_status NOT NULL DEFAULT 'generating',
  model_version    TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.weekly_briefings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER handle_updated_at_weekly_briefings
  BEFORE UPDATE ON public.weekly_briefings
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ========================
-- Table: alert_logs
-- ========================
CREATE TABLE IF NOT EXISTS public.alert_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disruption_score_id UUID REFERENCES public.disruption_scores(id) ON DELETE SET NULL,
  briefing_id         UUID REFERENCES public.weekly_briefings(id) ON DELETE SET NULL,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type          alert_type NOT NULL,
  channel             alert_channel NOT NULL,
  sent_timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_status     delivery_status NOT NULL DEFAULT 'pending',
  recipient           TEXT NOT NULL,
  read_at             TIMESTAMPTZ,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER handle_updated_at_alert_logs
  BEFORE UPDATE ON public.alert_logs
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE INDEX IF NOT EXISTS idx_alert_logs_user_unread
  ON public.alert_logs (user_id, read_at)
  WHERE read_at IS NULL;

-- migrate:down
-- HUMAN REQUIRED: drops all tables. Run only on dev/staging.
-- DROP TABLE IF EXISTS public.alert_logs CASCADE;
-- DROP TABLE IF EXISTS public.weekly_briefings CASCADE;
-- DROP TABLE IF EXISTS public.capability_landscape_versions CASCADE;
-- DROP TABLE IF EXISTS public.disruption_scores CASCADE;
-- DROP TABLE IF EXISTS public.business_problem_mappings CASCADE;
-- DROP TABLE IF EXISTS public.capability_deltas CASCADE;
-- DROP TABLE IF EXISTS public.ingested_sources CASCADE;
-- DROP TABLE IF EXISTS public.ingestion_runs CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TYPE IF EXISTS briefing_status, delivery_status, alert_type, alert_channel,
--   readiness_level, problem_class, capability_category, ingestion_status, source_type, user_role;
