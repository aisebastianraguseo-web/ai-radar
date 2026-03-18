-- =============================================================================
-- Migration: 20260318000001_rls_policies.sql
-- Product:   ai-radar
-- Generated: 2026-03-18T00:00:00Z
-- Status:    NOT APPLIED
-- Default posture: deny all. Explicit allow policies below.
-- =============================================================================

-- migrate:up

-- ========================
-- Helper: is_admin()
-- ========================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- ========================
-- RLS: profiles
-- ========================
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ========================
-- RLS: ingested_sources
-- ========================
CREATE POLICY "ingested_sources_authenticated_select"
  ON public.ingested_sources FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "ingested_sources_admin_all"
  ON public.ingested_sources FOR ALL
  USING (public.is_admin());

-- ========================
-- RLS: ingestion_runs
-- ========================
CREATE POLICY "ingestion_runs_admin_all"
  ON public.ingestion_runs FOR ALL
  USING (public.is_admin());

-- ========================
-- RLS: capability_deltas
-- ========================
CREATE POLICY "capability_deltas_authenticated_select"
  ON public.capability_deltas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "capability_deltas_admin_write"
  ON public.capability_deltas FOR ALL
  USING (public.is_admin());

-- ========================
-- RLS: business_problem_mappings
-- ========================
CREATE POLICY "bpm_authenticated_select"
  ON public.business_problem_mappings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "bpm_admin_write"
  ON public.business_problem_mappings FOR ALL
  USING (public.is_admin());

-- ========================
-- RLS: disruption_scores
-- ========================
CREATE POLICY "disruption_scores_authenticated_select"
  ON public.disruption_scores FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Scores are immutable (INSERT only via service_role; no UPDATE/DELETE from app)

-- ========================
-- RLS: capability_landscape_versions
-- ========================
CREATE POLICY "landscape_versions_authenticated_select"
  ON public.capability_landscape_versions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ========================
-- RLS: weekly_briefings
-- ========================
CREATE POLICY "weekly_briefings_authenticated_select"
  ON public.weekly_briefings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ========================
-- RLS: alert_logs
-- ========================
CREATE POLICY "alert_logs_select_own"
  ON public.alert_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "alert_logs_update_own_read"
  ON public.alert_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alert_logs_admin_all"
  ON public.alert_logs FOR ALL
  USING (public.is_admin());

-- migrate:down
DROP POLICY IF EXISTS "alert_logs_admin_all" ON public.alert_logs;
DROP POLICY IF EXISTS "alert_logs_update_own_read" ON public.alert_logs;
DROP POLICY IF EXISTS "alert_logs_select_own" ON public.alert_logs;
DROP POLICY IF EXISTS "weekly_briefings_authenticated_select" ON public.weekly_briefings;
DROP POLICY IF EXISTS "landscape_versions_authenticated_select" ON public.capability_landscape_versions;
DROP POLICY IF EXISTS "disruption_scores_authenticated_select" ON public.disruption_scores;
DROP POLICY IF EXISTS "bpm_admin_write" ON public.business_problem_mappings;
DROP POLICY IF EXISTS "bpm_authenticated_select" ON public.business_problem_mappings;
DROP POLICY IF EXISTS "capability_deltas_admin_write" ON public.capability_deltas;
DROP POLICY IF EXISTS "capability_deltas_authenticated_select" ON public.capability_deltas;
DROP POLICY IF EXISTS "ingestion_runs_admin_all" ON public.ingestion_runs;
DROP POLICY IF EXISTS "ingested_sources_admin_all" ON public.ingested_sources;
DROP POLICY IF EXISTS "ingested_sources_authenticated_select" ON public.ingested_sources;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP FUNCTION IF EXISTS public.is_admin();
