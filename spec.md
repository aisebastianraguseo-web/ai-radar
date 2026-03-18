# Spec: AI Capability Radar

**ID:** ai-radar
**Type:** web-saas
**Version:** 1.0
**Status:** draft
**Created:** 2026-03-18T00:00:00Z

---

## 1. Product Overview

### 1.1 Description

AI Capability Radar is a SaaS platform for enterprise teams that continuously monitors the AI vendor ecosystem, extracts genuine capability advances from the noise, maps them to addressable business problems, and delivers weekly actionable briefings. Users — strategy leads, product managers, and automation managers — receive ranked disruption alerts and structured intelligence so they can act on new AI capabilities before competitors.

### 1.2 Problem Statement

Enterprises are bombarded with daily AI announcements but lack a structured way to distinguish genuine capability advances (e.g., "token limits 10×", "new agentic autonomy") from marketing hype. Every team runs its own shallow research, findings are not mapped to concrete business processes, and decision-makers react after the fact. AI Capability Radar ingests official vendor channels and weak signals (GitHub, ArXiv, HN), scores each capability shift by disruption potential, maps it to one of nine business problem classes, and generates weekly executive briefings with actionable statements.

### 1.3 Success Criteria

1. A new user can register, configure preferences, and view the current capability landscape within 5 minutes.
2. The ingestion pipeline processes at least 100 source items per day and extracts capability deltas with < 5% manual correction rate.
3. A disruption alert (score ≥ 6) is delivered via configured channel within 5 minutes of scoring.
4. The weekly briefing is auto-generated every Monday at 08:00 UTC and delivered to all subscribed users.
5. The dashboard loads (LCP) in < 2.5s on a 4G connection with 100 concurrent users.

---

## 2. User Personas

### Persona: Enterprise AI/Strategy Lead
- **Role:** CTO or VP Innovation responsible for AI opportunity identification
- **Goals:** Spot genuine capability advances that create competitive advantage; build evidence-based roadmaps
- **Pain Points:** Manually curating dozens of newsletters; no structured signal vs. noise separation; delayed awareness
- **Technical Level:** medium — comfortable with dashboards, not with raw data pipelines

### Persona: Product Manager (AI/Automation)
- **Role:** PM responsible for AI-powered feature roadmaps
- **Goals:** Justify new features with concrete capability evidence; track specific vendors and problem classes
- **Pain Points:** No single source of truth for "what LLMs can do now vs. 6 months ago"; ad-hoc research is slow
- **Technical Level:** medium

### Persona: Business Process Automation Manager
- **Role:** Manages process automation programs, evaluates AI tools
- **Goals:** Know when a specific class of problem (e.g., invoice extraction) becomes newly solvable
- **Pain Points:** Capability changes are not mapped to process opportunities; no notification system
- **Technical Level:** low-medium — needs impact statements in plain business language

---

## 3. Features

## Feature: user-auth

**Priority:** P1

### Description
Email/password registration and sign-in via Supabase Auth. Includes profile creation with organisation, role, and notification preferences. Also covers sign-out, password reset, and user preference management.

### User Stories
- As a new user, I want to create an account with my work email and password so that I can access the platform.
- As an existing user, I want to sign in and be taken to the dashboard so that I can check the latest capability updates.
- As a user, I want to reset my forgotten password via email so that I can regain access.
- As a user, I want to configure my alert preferences (channels, threshold, vendor filters) so that I receive relevant notifications.

### Acceptance Criteria
- [ ] AC-auth-1: User can register with email + password; receives a verification email; cannot access dashboard until verified.
- [ ] AC-auth-2: User can sign in with correct credentials and is redirected to `/dashboard`.
- [ ] AC-auth-3: Incorrect credentials show an error message that does not reveal whether the email exists.
- [ ] AC-auth-4: Password reset sends a time-limited magic link to the registered email.
- [ ] AC-auth-5: User can sign out from any page; session is invalidated server-side.
- [ ] AC-auth-6: User can update organisation name, role (enum), and notification preferences.
- [ ] AC-auth-7: All auth endpoints are rate-limited: max 10 attempts per 15 minutes per IP.

### Data Requirements
- `profiles` table (extends Supabase auth.users): organisation, role enum, preferences JSON.

### API Surface
- `POST /api/auth/update-profile` — Update profile fields
  - Request: `{ organisation: string, role: string, preferences: PreferencesSchema }`
  - Response: `{ success: boolean }`
  - Auth: required
  - Errors: 400 (validation), 401 (unauth)

> ASSUMPTION: Supabase Auth handles `/auth/signup`, `/auth/signin`, `/auth/signout`, `/auth/reset-password` directly. Only the profile update route is a custom Next.js handler.

---

## Feature: data-ingestion-orchestrator

**Priority:** P1

### Description
Automated background pipeline that ingests content from two layers: (1) official vendor channels via RSS/Atom feeds and public APIs, (2) weak signals from GitHub Trending, ArXiv, Hacker News, and Product Hunt. Runs on a Vercel Cron schedule. Deduplicates sources by URL hash and stores raw content in `ingested_sources`.

**Stack Mapping (Assumption):** The intake specifies Python ETL and AWS infrastructure. Per governance/stack.md, the canonical stack is Next.js + Supabase + Vercel. The ingestion pipeline is implemented as Next.js API route handlers invoked by Vercel Cron Jobs. Heavy async work (LLM extraction) is queued via Supabase `pg_notify` + Supabase Edge Function workers.

> ASSUMPTION: Python ETL replaced by TypeScript API routes + Vercel Cron. This is sufficient for ≤1000 sources/day; higher throughput is a v2 concern.

### User Stories
- As an admin, I want the system to automatically ingest AI news from official vendor channels daily so that capability data stays current.
- As an admin, I want the ingestion log to show which sources were processed, skipped (duplicate), or errored so that I can monitor pipeline health.

### Acceptance Criteria
- [ ] AC-ingest-1: Vercel Cron triggers ingestion at 06:00 UTC daily.
- [ ] AC-ingest-2: At least the following RSS/API sources are ingested: OpenAI blog, Anthropic blog, Google DeepMind blog, GitHub Trending (AI orgs), ArXiv (cs.AI + cs.CL), Hacker News (top 50), Product Hunt (AI tag).
- [ ] AC-ingest-3: Duplicate detection: if `source_url` already exists in `ingested_sources` within the last 7 days, the item is skipped and logged as `duplicate`.
- [ ] AC-ingest-4: Each ingested item is stored with `source_type`, `source_url`, `title`, `content`, `publish_date`, `vendor` (nullable), `ingestion_status`.
- [ ] AC-ingest-5: Failed ingestion attempts (HTTP error, parse failure) are logged with `error_message`; do not halt the entire run.
- [ ] AC-ingest-6: Admin can view ingestion run history: date, sources processed, duplicates skipped, errors.
- [ ] AC-ingest-7: Manual trigger available via `POST /api/admin/ingest/trigger` (admin-only).

### Data Requirements
- `ingested_sources` table with ingestion status tracking.
- `ingestion_runs` table for run-level audit log.

### API Surface
- `POST /api/admin/ingest/trigger` — Manually trigger ingestion run
  - Request: `{ source_types?: string[] }`
  - Response: `{ run_id: string, status: "started" }`
  - Auth: required, admin role only
  - Errors: 401, 403

- `GET /api/admin/ingest/runs` — List ingestion run history
  - Response: `{ runs: IngestionRun[] }`
  - Auth: required, admin role only

---

## Feature: capability-delta-extraction

**Priority:** P1

### Description
LLM-powered analysis that processes ingested source items and produces structured `capability_deltas`. For each unprocessed `ingested_source`, calls the Anthropic Claude API with a structured prompt to identify capability category, delta magnitude, affected vendors, and evidence snippets. Runs as a post-ingestion step via Vercel Cron or immediate trigger.

### User Stories
- As a platform analyst, I want each ingested item automatically analysed by an LLM so that capability shifts are identified without manual review.
- As a platform analyst, I want extracted deltas to include a confidence score so that I can filter low-quality extractions.

### Acceptance Criteria
- [ ] AC-delta-1: Every `ingested_source` with `ingestion_status = 'ready'` is processed within 10 minutes of ingestion.
- [ ] AC-delta-2: Each extraction produces at least one `capability_delta` record with: `capability_category`, `capability_name`, `delta_magnitude` (0–2), `confidence_score` (0–1), `vendors_affected[]`, `evidence_snippets[]`.
- [ ] AC-delta-3: Extraction uses `claude-opus-4-6` as primary model; falls back to `claude-sonnet-4-6` on API error.
- [ ] AC-delta-4: LLM response is parsed as structured JSON; if parsing fails, item is marked `extraction_failed` and logged.
- [ ] AC-delta-5: Items with `confidence_score < 0.4` are stored but flagged as `low_confidence`.
- [ ] AC-delta-6: Maximum 1 LLM call per `ingested_source` (idempotent; re-run does not duplicate deltas).
- [ ] AC-delta-7: Anthropic API key is loaded from `ANTHROPIC_API_KEY` env var; never hardcoded.

### Data Requirements
- `capability_deltas` table.
- `ingested_sources.extraction_status` column updated on completion.

### API Surface
- `POST /api/admin/extraction/trigger` — Trigger extraction for pending sources
  - Request: `{ limit?: number }` (default 50)
  - Response: `{ queued: number }`
  - Auth: required, admin role
  - Errors: 401, 403

---

## Feature: capability-landscape-database

**Priority:** P1

### Description
Versioned knowledge base of all capability categories, their current score (0–10), and historical delta timeline per vendor. Serves as the canonical capability map powering charts, comparisons, and trend analysis. A `capability_landscape_versions` snapshot is saved daily.

> ASSUMPTION: Vector DB (Pinecone/Weaviate) is deferred to v2. Semantic search in v1 is handled by PostgreSQL full-text search (`tsvector`) via Supabase, which avoids an additional external dependency. pgvector extension enabled for future compatibility.

### User Stories
- As a product manager, I want to see the current level of "Multi-step Autonomy" per vendor so that I can compare Anthropic vs OpenAI.
- As a strategy lead, I want to query "how has Context Processing evolved over the last 6 months?" so that I can report on trend direction.

### Acceptance Criteria
- [ ] AC-landscape-1: All 12 capability categories from the intake are seeded with initial data.
- [ ] AC-landscape-2: `GET /api/capabilities` returns the current level per capability per vendor, sortable by category.
- [ ] AC-landscape-3: `GET /api/capabilities/[id]/history` returns the delta timeline for a specific capability (date, delta_magnitude, vendor).
- [ ] AC-landscape-4: Full-text search on `capability_name` and `capability_description` returns ranked results.
- [ ] AC-landscape-5: A daily snapshot is saved to `capability_landscape_versions` at 07:00 UTC.
- [ ] AC-landscape-6: `GET /api/capabilities/compare?vendors=A,B&category=reasoning` returns side-by-side capability levels.

### Data Requirements
- `capabilities` lookup table (seeded with 12 categories × vendors).
- `capability_deltas` (linked).
- `capability_landscape_versions` snapshot table.

### API Surface
- `GET /api/capabilities` — List all capabilities with current levels
  - Query: `?category=&vendor=&search=`
  - Response: `{ capabilities: Capability[] }`
  - Auth: required

- `GET /api/capabilities/[id]` — Single capability detail + recent deltas
  - Response: `{ capability: Capability, deltas: CapabilityDelta[] }`
  - Auth: required

- `GET /api/capabilities/[id]/history` — Delta timeline
  - Query: `?from=&to=&vendor=`
  - Response: `{ history: DeltaPoint[] }`
  - Auth: required

- `GET /api/capabilities/compare` — Side-by-side vendor comparison
  - Query: `?vendors=openai,anthropic&category=reasoning`
  - Response: `{ comparison: VendorComparison[] }`
  - Auth: required

---

## Feature: business-impact-mapper

**Priority:** P1

### Description
LLM-driven service that maps each high-magnitude capability delta to one or more of nine predefined business problem classes, generating a structured impact statement: "Problem [X] can now be better solved because [capability Y] improved by Δ [Z], enabling [process A] to be automated." Runs as part of the post-extraction pipeline.

### User Stories
- As an automation manager, I want each capability delta automatically mapped to a business problem class so that I know which processes are now addressable without manual research.
- As a PM, I want impact statements in plain language so that I can share them directly with stakeholders.

### Acceptance Criteria
- [ ] AC-impact-1: Every `capability_delta` with `delta_magnitude ≥ 1` is processed by the business impact mapper within 10 minutes of extraction.
- [ ] AC-impact-2: Each mapping produces a `business_problem_mapping` record with: `problem_class` (enum, 9 values), `impact_statement` (text), `addressable_process_name`, `readiness_level` (enum: experimental | early-adopter | production-ready).
- [ ] AC-impact-3: The LLM prompt uses the 9-class problem matrix from the intake verbatim as few-shot context.
- [ ] AC-impact-4: A single delta may map to multiple problem classes (up to 3 per delta).
- [ ] AC-impact-5: `impact_statement` is max 280 characters (suitable for alerts/notifications).
- [ ] AC-impact-6: `mapper_version` is recorded on every `business_problem_mapping` for auditability.

### Data Requirements
- `business_problem_mappings` table.
- `capability_deltas.mapping_status` updated on completion.

### API Surface
- `GET /api/impact-mappings` — List recent mappings
  - Query: `?problem_class=&readiness_level=&from=&limit=`
  - Response: `{ mappings: BusinessProblemMapping[] }`
  - Auth: required

- `GET /api/impact-mappings/[id]` — Single mapping detail
  - Response: `{ mapping: BusinessProblemMapping, delta: CapabilityDelta, source: IngestedSource }`
  - Auth: required

---

## Feature: disruption-scoring-engine

**Priority:** P1

### Description
Quantitative scoring model that calculates a `disruption_score` for each capability delta using the weighted scorecard from the intake (8 dimensions). Scores ≥ 6 trigger the alerting system. A ranked leaderboard of top disruptors is the primary dashboard view.

### User Stories
- As a strategy lead, I want each capability shift assigned a disruption score so that I can immediately know what's genuinely important.
- As an analyst, I want to see which dimension drove a high score so that I can validate the reasoning.

### Acceptance Criteria
- [ ] AC-score-1: Every `capability_delta` receives a `disruption_score` within 1 minute of business impact mapping completing.
- [ ] AC-score-2: The scorecard calculates 8 sub-scores: vendor_leadership (0–2), novelty (0–2), distribution_potential (0–2), open_source (0–1), cost_reduction (0–2), momentum (0–2), hype_adjustment (0–1, subtracted), multi_signal_bonus (0–1, added).
- [ ] AC-score-3: `total_disruption_score` = sum of sub-scores; stored as numeric(5,2).
- [ ] AC-score-4: `alert_triggered = true` when `total_disruption_score ≥ 6`.
- [ ] AC-score-5: `GET /api/disruptions?sort=score&limit=10` returns the top 10 most disruptive deltas.
- [ ] AC-score-6: Score history is immutable; re-scoring creates a new record (never updates).

### Data Requirements
- `disruption_scores` table.
- `capability_deltas.score_id` FK after scoring.

### API Surface
- `GET /api/disruptions` — Ranked disruption list
  - Query: `?sort=score|date&limit=&vendor=&category=&from=&to=`
  - Response: `{ disruptions: DisruptionWithDelta[] }`
  - Auth: required

- `GET /api/disruptions/[id]` — Single disruption detail
  - Response: `{ disruption: DisruptionScore, delta: CapabilityDelta, mappings: BusinessProblemMapping[] }`
  - Auth: required

---

## Feature: dashboard-and-visualization

**Priority:** P1

### Description
Web dashboard showing: (1) top disruptors this week (ranked table), (2) capability trend charts (time-series per category), (3) business problem heatmap (problem class × capability category, colour = addressability), (4) alert feed, (5) full-text search. Built with Next.js 15 App Router, Recharts for charts, shadcn/ui for UI components.

### User Stories
- As a strategy lead, I want to open the dashboard and immediately see the top 5 disruptions this week so that I can decide where to focus.
- As a PM, I want to filter the disruption list by vendor and problem class so that I see only what's relevant to my roadmap.
- As any user, I want to search for a specific capability or problem class by name so that I can find relevant signals quickly.

### Acceptance Criteria
- [ ] AC-dash-1: Dashboard home (`/dashboard`) shows top 10 disruptors (this week), capability trend sparklines for each of 12 categories, and the latest briefing summary.
- [ ] AC-dash-2: Disruption table supports column-sort by score, date, vendor. Supports filter by vendor (multi-select), problem class (multi-select), capability category (multi-select), date range.
- [ ] AC-dash-3: Capability trend page (`/dashboard/capabilities`) shows time-series line chart for selected capability × vendor over selectable time window (7d, 30d, 90d, 1y).
- [ ] AC-dash-4: Heatmap page (`/dashboard/heatmap`) shows 9 problem classes (rows) × 12 capability categories (columns); cell colour intensity represents addressability score. Clicking a cell shows drill-down list of relevant deltas.
- [ ] AC-dash-5: Alert feed (`/dashboard/alerts`) lists all `alert_triggered = true` events with impact statement, score, and source link.
- [ ] AC-dash-6: Global search (`/dashboard/search?q=`) returns results across capability names, impact statements, and source titles.
- [ ] AC-dash-7: All interactive elements are keyboard-navigable; WCAG 2.1 AA contrast ratios met throughout.
- [ ] AC-dash-8: Dashboard LCP < 2.5s measured on Vercel Edge (simulated 4G).

### Data Requirements
- Reads from `disruption_scores`, `capability_deltas`, `business_problem_mappings`, `ingested_sources`, `weekly_briefings`.

### API Surface
- `GET /api/dashboard/stats` — Aggregated home stats
  - Response: `{ top_disruptors: DisruptionRow[], trend_sparklines: TrendData[], latest_briefing: BriefingSummary }`
  - Auth: required

- `GET /api/search` — Full-text search
  - Query: `?q=&type=capability|impact|source`
  - Response: `{ results: SearchResult[] }`
  - Auth: required

---

## Feature: alerting-and-notification-system

**Priority:** P1

### Description
Configurable alerts triggered by disruption score threshold (≥ 6 = immediate), daily digest (score ≥ 3), and weekly briefing. Channels: email (via Resend), Slack webhook, in-app notification. Users configure channel preferences in their profile.

> ASSUMPTION: AWS SNS/SQS from intake replaced by Resend (transactional email) and Slack Incoming Webhooks. This avoids AWS dependency and is sufficient for v1 scale. Supabase Edge Functions handle async delivery.

### User Stories
- As a strategy lead, I want to receive an immediate Slack message when a disruption score ≥ 6 event occurs so that I can react within the hour.
- As a PM, I want a daily email digest of all score ≥ 3 events so that I stay informed without real-time interruptions.
- As any user, I want to see unread alert counts in the dashboard header so that I don't miss in-app notifications.

### Acceptance Criteria
- [ ] AC-alert-1: When `disruption_scores.alert_triggered = true`, an alert is enqueued and delivered within 5 minutes.
- [ ] AC-alert-2: Alert delivery supports three channels: email (Resend), Slack webhook, in-app. User preferences determine active channels.
- [ ] AC-alert-3: Slack alert includes: capability name, disruption score, top impact statement, link to dashboard detail page.
- [ ] AC-alert-4: Email alert uses HTML template (responsive, plain-text fallback) with same content as Slack.
- [ ] AC-alert-5: Daily digest is triggered at 18:00 UTC; includes all events scored ≥ 3 since last digest.
- [ ] AC-alert-6: In-app notification badge increments on new alerts; clicking marks them read.
- [ ] AC-alert-7: All alert deliveries are logged to `alert_logs` with `delivery_status` (pending | sent | failed).
- [ ] AC-alert-8: Failed deliveries are retried once after 5 minutes; permanent failure logged.
- [ ] AC-alert-9: Users can mute specific vendors or problem classes from triggering alerts (stored in preferences).

### Data Requirements
- `alert_logs` table.
- `profiles.preferences` JSON (channels, muted_vendors, muted_problem_classes, digest_threshold).

### API Surface
- `GET /api/alerts` — List user's alert history
  - Query: `?limit=&unread=true`
  - Response: `{ alerts: AlertLog[] }`
  - Auth: required

- `POST /api/alerts/mark-read` — Mark alerts as read
  - Request: `{ alert_ids: string[] }`
  - Response: `{ updated: number }`
  - Auth: required

- `GET /api/alerts/unread-count` — Unread badge count
  - Response: `{ count: number }`
  - Auth: required

---

## Feature: weekly-briefing-generator

**Priority:** P1

### Description
Automated weekly report synthesised by LLM from the week's findings. Covers: executive summary, top disruptors table, capability trends, problem-opportunity matrix, and recommended actions. Delivered as email (HTML) and persisted in the dashboard. Generated every Monday at 07:30 UTC via Vercel Cron.

### User Stories
- As a strategy lead, I want to receive a structured weekly briefing every Monday morning so that I start the week with strategic AI intelligence.
- As any user, I want to view past briefings in the dashboard so that I can reference historical analysis.

### Acceptance Criteria
- [ ] AC-brief-1: Vercel Cron triggers briefing generation at 07:30 UTC every Monday.
- [ ] AC-brief-2: Briefing covers exactly the preceding 7 days (Mon 00:00 UTC → Sun 23:59 UTC).
- [ ] AC-brief-3: Briefing contains: executive summary (1–2 sentences), top-10 disruptors table (name, score, impact), capability trends section (which categories improved/stagnated), problem-opportunity matrix (which problem classes gained new addressability), 3–5 recommended actions.
- [ ] AC-brief-4: Briefing is generated using `claude-opus-4-6`; prompt includes the week's top disruptions and impact mappings as structured JSON context.
- [ ] AC-brief-5: Generated briefing is stored in `weekly_briefings` table.
- [ ] AC-brief-6: Email is sent to all users with `preferences.weekly_briefing = true`.
- [ ] AC-brief-7: `GET /api/briefings` lists all past briefings; `GET /api/briefings/[id]` returns full content.
- [ ] AC-brief-8: If generation fails (LLM error), an admin alert is sent; the briefing is marked `failed` (not silently skipped).

### Data Requirements
- `weekly_briefings` table.

### API Surface
- `GET /api/briefings` — List briefings
  - Query: `?limit=12`
  - Response: `{ briefings: BriefingSummary[] }`
  - Auth: required

- `GET /api/briefings/[id]` — Full briefing content
  - Response: `{ briefing: WeeklyBriefing }`
  - Auth: required

- `POST /api/admin/briefings/generate` — Manual trigger
  - Request: `{ week_start?: string }`
  - Response: `{ briefing_id: string }`
  - Auth: required, admin only

---

## 4. Data Model

### 4.1 Entity Relationship Overview

`profiles` extends Supabase `auth.users` 1:1. Each user has preferences for alerts and digest filters.

`ingested_sources` holds raw content from all ingest channels. Each source is processed through extraction → `capability_deltas` (1:N). Each delta is mapped through impact mapping → `business_problem_mappings` (1:N, max 3). Each delta also receives exactly one `disruption_scores` record. High-score deltas trigger `alert_logs` entries (1:N per user).

`capabilities` is a seeded lookup table of the 12 capability categories. `capability_deltas` references it by `capability_category` enum. `capability_landscape_versions` are daily snapshots of aggregate capability levels.

`weekly_briefings` are stand-alone generated documents referencing the scoring window by date range.

### 4.2 Database Schema

```sql
-- ============================================================
-- Enable extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for full-text similarity search
CREATE EXTENSION IF NOT EXISTS "vector";    -- pgvector (future use)

-- ============================================================
-- Enums
-- ============================================================
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

-- ============================================================
-- Profiles
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  organisation TEXT,
  role        user_role NOT NULL DEFAULT 'viewer',
  preferences JSONB NOT NULL DEFAULT '{
    "alert_channels": ["in_app"],
    "digest_threshold": 3,
    "alert_threshold": 6,
    "weekly_briefing": true,
    "muted_vendors": [],
    "muted_problem_classes": [],
    "vendor_filters": [],
    "problem_class_filters": []
  }'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- Ingested Sources
-- ============================================================
CREATE TABLE public.ingested_sources (
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
  run_id           UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ingested_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingested_sources_admin_all"
  ON public.ingested_sources FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "ingested_sources_authenticated_select"
  ON public.ingested_sources FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Ingestion Runs
-- ============================================================
CREATE TABLE public.ingestion_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  sources_total   INTEGER NOT NULL DEFAULT 0,
  sources_new     INTEGER NOT NULL DEFAULT 0,
  sources_dup     INTEGER NOT NULL DEFAULT 0,
  sources_failed  INTEGER NOT NULL DEFAULT 0,
  triggered_by    TEXT NOT NULL DEFAULT 'cron',  -- 'cron' | 'manual:<user_id>'
  status          TEXT NOT NULL DEFAULT 'running'
);

ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingestion_runs_admin_all"
  ON public.ingestion_runs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- Capability Deltas
-- ============================================================
CREATE TABLE public.capability_deltas (
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
  mapping_status      TEXT NOT NULL DEFAULT 'pending',  -- pending | done | failed
  score_id            UUID,  -- populated after scoring
  low_confidence      BOOLEAN GENERATED ALWAYS AS (confidence_score < 0.4) STORED,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.capability_deltas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capability_deltas_authenticated_select"
  ON public.capability_deltas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "capability_deltas_admin_insert_update"
  ON public.capability_deltas FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- Business Problem Mappings
-- ============================================================
CREATE TABLE public.business_problem_mappings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delta_id                UUID NOT NULL REFERENCES public.capability_deltas(id) ON DELETE CASCADE,
  problem_class           problem_class NOT NULL,
  problem_description     TEXT NOT NULL,
  addressable_process_name TEXT NOT NULL,
  impact_statement        TEXT NOT NULL CHECK (char_length(impact_statement) <= 280),
  readiness_level         readiness_level NOT NULL,
  mapped_date             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mapper_version          TEXT NOT NULL  -- e.g. 'claude-opus-4-6'
);

ALTER TABLE public.business_problem_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_problem_mappings_authenticated_select"
  ON public.business_problem_mappings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "business_problem_mappings_admin_write"
  ON public.business_problem_mappings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- Disruption Scores
-- ============================================================
CREATE TABLE public.disruption_scores (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delta_id                   UUID NOT NULL REFERENCES public.capability_deltas(id) ON DELETE CASCADE,
  vendor_leadership_score    NUMERIC(3,1) NOT NULL DEFAULT 0,
  novelty_score              NUMERIC(3,1) NOT NULL DEFAULT 0,
  distribution_potential_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  open_source_score          NUMERIC(3,1) NOT NULL DEFAULT 0,
  cost_reduction_score       NUMERIC(3,1) NOT NULL DEFAULT 0,
  momentum_score             NUMERIC(3,1) NOT NULL DEFAULT 0,
  hype_adjustment            NUMERIC(3,1) NOT NULL DEFAULT 0,
  multi_signal_bonus         NUMERIC(3,1) NOT NULL DEFAULT 0,
  total_disruption_score     NUMERIC(5,2) NOT NULL,
  alert_triggered            BOOLEAN NOT NULL GENERATED ALWAYS AS (total_disruption_score >= 6) STORED,
  calculated_date            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.disruption_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disruption_scores_authenticated_select"
  ON public.disruption_scores FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Capability Landscape Versions (daily snapshots)
-- ============================================================
CREATE TABLE public.capability_landscape_versions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number            INTEGER NOT NULL,
  snapshot_date             DATE NOT NULL UNIQUE,
  capability_snapshots      JSONB NOT NULL,  -- aggregate of all capability levels at this date
  delta_count_since_last    INTEGER NOT NULL DEFAULT 0,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.capability_landscape_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landscape_versions_authenticated_select"
  ON public.capability_landscape_versions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Weekly Briefings
-- ============================================================
CREATE TABLE public.weekly_briefings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start        DATE NOT NULL UNIQUE,  -- Monday ISO date
  week_end          DATE NOT NULL,
  executive_summary TEXT NOT NULL,
  top_disruptors    JSONB NOT NULL,
  capability_trends JSONB NOT NULL,
  problem_matrix    JSONB NOT NULL,
  recommendations   JSONB NOT NULL,
  full_content_md   TEXT NOT NULL,
  status            briefing_status NOT NULL DEFAULT 'generating',
  model_version     TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.weekly_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_briefings_authenticated_select"
  ON public.weekly_briefings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Alert Logs
-- ============================================================
CREATE TABLE public.alert_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disruption_score_id   UUID REFERENCES public.disruption_scores(id) ON DELETE SET NULL,
  briefing_id           UUID REFERENCES public.weekly_briefings(id) ON DELETE SET NULL,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type            alert_type NOT NULL,
  channel               alert_channel NOT NULL,
  sent_timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_status       delivery_status NOT NULL DEFAULT 'pending',
  recipient             TEXT NOT NULL,
  read_at               TIMESTAMPTZ,
  error_message         TEXT
);

ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_logs_select_own"
  ON public.alert_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "alert_logs_update_own_read"
  ON public.alert_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alert_logs_admin_all"
  ON public.alert_logs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));
```

### 4.3 Indexes

```sql
-- ingested_sources: deduplication + status queries
CREATE UNIQUE INDEX idx_ingested_sources_url_hash_recent
  ON public.ingested_sources (url_hash, date_trunc('day', ingestion_date));

CREATE INDEX idx_ingested_sources_status
  ON public.ingested_sources (ingestion_status) WHERE ingestion_status = 'ready';

CREATE INDEX idx_ingested_sources_vendor
  ON public.ingested_sources (vendor) WHERE vendor IS NOT NULL;

-- capability_deltas: pipeline processing + search
CREATE INDEX idx_capability_deltas_source_id
  ON public.capability_deltas (source_id);

CREATE INDEX idx_capability_deltas_mapping_status
  ON public.capability_deltas (mapping_status) WHERE mapping_status = 'pending';

CREATE INDEX idx_capability_deltas_category_magnitude
  ON public.capability_deltas (capability_category, delta_magnitude);

CREATE INDEX idx_capability_deltas_detected_date
  ON public.capability_deltas (detected_date DESC);

-- Full-text search on capability name
CREATE INDEX idx_capability_deltas_fts
  ON public.capability_deltas USING gin(to_tsvector('english', capability_name));

-- disruption_scores: leaderboard
CREATE INDEX idx_disruption_scores_total_desc
  ON public.disruption_scores (total_disruption_score DESC);

CREATE INDEX idx_disruption_scores_alert_triggered
  ON public.disruption_scores (alert_triggered) WHERE alert_triggered = true;

-- alert_logs: unread count
CREATE INDEX idx_alert_logs_user_unread
  ON public.alert_logs (user_id, read_at) WHERE read_at IS NULL;

-- business problem mappings
CREATE INDEX idx_bpm_delta_id ON public.business_problem_mappings (delta_id);
CREATE INDEX idx_bpm_problem_class ON public.business_problem_mappings (problem_class);

-- Full-text on impact statements
CREATE INDEX idx_bpm_fts
  ON public.business_problem_mappings USING gin(to_tsvector('english', impact_statement));
```

### 4.4 RLS Policies

Default posture: all tables have RLS enabled with no implicit access. Policies are explicitly listed above per table.

Summary:
| Table | Authenticated Users | Admin Users |
|-------|--------------------|----|
| `profiles` | SELECT + UPDATE own row | — |
| `ingested_sources` | SELECT all | ALL |
| `ingestion_runs` | — | ALL |
| `capability_deltas` | SELECT all | ALL |
| `business_problem_mappings` | SELECT all | ALL |
| `disruption_scores` | SELECT all | — |
| `capability_landscape_versions` | SELECT all | — |
| `weekly_briefings` | SELECT all | — |
| `alert_logs` | SELECT + UPDATE own rows | ALL |

> ASSUMPTION: Pipeline workers (ingestion, extraction, scoring) use the Supabase `service_role` key (server-side only) which bypasses RLS. This key must never be exposed to the browser.

---

## 5. API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/update-profile` | required | Update profile fields |
| GET | `/api/capabilities` | required | List capability landscape |
| GET | `/api/capabilities/[id]` | required | Capability detail + recent deltas |
| GET | `/api/capabilities/[id]/history` | required | Delta timeline |
| GET | `/api/capabilities/compare` | required | Side-by-side vendor comparison |
| GET | `/api/disruptions` | required | Ranked disruption list |
| GET | `/api/disruptions/[id]` | required | Disruption detail |
| GET | `/api/impact-mappings` | required | Business problem mappings |
| GET | `/api/impact-mappings/[id]` | required | Single mapping detail |
| GET | `/api/dashboard/stats` | required | Aggregated home stats |
| GET | `/api/search` | required | Full-text search |
| GET | `/api/alerts` | required | User's alert history |
| POST | `/api/alerts/mark-read` | required | Mark alerts as read |
| GET | `/api/alerts/unread-count` | required | Unread badge count |
| GET | `/api/briefings` | required | List past briefings |
| GET | `/api/briefings/[id]` | required | Full briefing content |
| POST | `/api/admin/ingest/trigger` | required, admin | Manual ingestion trigger |
| GET | `/api/admin/ingest/runs` | required, admin | Ingestion run history |
| POST | `/api/admin/extraction/trigger` | required, admin | Manual extraction trigger |
| POST | `/api/admin/briefings/generate` | required, admin | Manual briefing trigger |

All endpoints return `Content-Type: application/json`. All error responses follow `{ error: string, code: string }`.

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Target concurrent users: 100
- Page load target: LCP < 2.5s on simulated 4G
- Database query target: < 200ms for 95th percentile (disruption leaderboard, capability list)
- Alert delivery latency: < 5 minutes from score calculation
- Weekly briefing generation: < 30 minutes (LLM call is the bottleneck)

### 6.2 Security
- **Auth:** Supabase Auth (email/password + magic link for password reset). JWT tokens stored in secure HTTP-only cookies via `@supabase/ssr`.
- **Session management:** Sessions expire after 7 days of inactivity. `Strict-Transport-Security` enforced.
- **RLS:** All tables RLS-enabled with default-deny. Service role key only used server-side.
- **HTTP headers** (Next.js `next.config.ts`):
  - `Content-Security-Policy`: nonce-based, no `unsafe-inline`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Input validation:** Zod schemas on all API route handlers (request body + query params).
- **No secrets in code:** All credentials via environment variables. `.env.example` provided.
- **Rate limiting:** Auth endpoints: max 10 attempts / 15 min / IP (Vercel Edge Middleware + `@upstash/ratelimit`). Admin trigger endpoints: 10 calls/min.
- **Parameterised queries:** All Supabase JS SDK calls use parameterised queries; no raw SQL string concatenation.
- **ANTHROPIC_API_KEY:** Never sent to the browser. Used only in Server Components and API routes.
- **Audit trail:** `alert_logs` records all alert deliveries.
- **Error responses:** Client receives generic messages; full errors logged server-side.

### 6.3 Accessibility
- WCAG 2.1 Level AA
- Dashboard charts use colour + pattern/label (not colour alone) to convey data
- Heatmap includes aria-labels per cell
- All chart components expose data as sortable tables for screen readers
- Skip-to-main link on every page

### 6.4 Browser / Platform Support
- Chrome ≥ 120, Firefox ≥ 120, Safari ≥ 17, Edge ≥ 120
- Mobile responsive (min-width 320px, touch targets ≥ 44px)
- Dark mode: default on (design: slate/gray palette)

### 6.5 Data Privacy
- EU data residency (Supabase `eu-central-1`, Vercel EU region)
- GDPR-applicable: user email and preferences stored; DPA required with Supabase, Vercel, Resend
- PII collected: email, organisation name (optional). Not included in LLM prompts.
- Data retention: `ingested_sources` 1 year, `capability_deltas` indefinite, `alert_logs` 2 years, `weekly_briefings` indefinite

---

## 7. Out of Scope

| Item | Deferred To |
|------|-------------|
| Mobile native app | v2 |
| Google / GitHub OAuth | v2 |
| Multi-tenant team management (shared workspace) | v2 |
| Custom alert rules (user-defined trigger formulas) | v2 |
| CRM/ERP integrations (Salesforce, Jira) | v2 |
| Predictive ML (early-warning forecasting) | v2 |
| White-label / private-label deployment | v2 |
| Microsoft Teams integration | v2 |
| Self-hosted / on-prem deployment | v2 |
| Real-time streaming dashboard (WebSocket) | v2 (polling sufficient for v1) |
| Chinese AI ecosystem dedicated feed (DeepSeek, Qwen) | v2 |
| Vector DB / semantic search (Pinecone / Weaviate) | v2 (pgvector prepared, not activated) |
| Python ETL pipeline (AWS Glue / Airflow) | v2 (Vercel Cron sufficient for ≤1000/day) |
| CSV / PDF export | v2 |
| API for third-party integrations | v2 |
| Pricing / billing / subscription management | v2 |
| SSO / OIDC (OKTA, Azure AD) | v2 |

---

## 8. External Dependencies

### Anthropic Claude API
- **Purpose:** LLM-powered capability delta extraction, business impact mapping, weekly briefing synthesis
- **Required Credentials:** `ANTHROPIC_API_KEY`
- **Account Setup:** Create account at anthropic.com/api; generate API key; enable billing
- **Pricing Tier:** Pay-per-token; Opus 4.6 ~$15/M input, ~$75/M output. Estimated 500 extractions/week ≈ $25–50/week

### Supabase
- **Purpose:** PostgreSQL database, Auth, RLS, Edge Functions for async workers
- **Required Credentials:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Account Setup:** Create project at supabase.com; select region eu-central-1; run migrations
- **Pricing Tier:** Free tier (500MB, 50k monthly active users) sufficient for MVP; Pro ($25/mo) for production

### Vercel
- **Purpose:** Next.js hosting, Vercel Cron Jobs, Edge Middleware (rate limiting)
- **Required Credentials:** `VERCEL_TOKEN` (for CI/CD deploy)
- **Account Setup:** Create project; connect GitHub repo; configure environment variables
- **Pricing Tier:** Hobby (free) for dev; Pro ($20/mo) required for Vercel Cron and custom domains

### Resend
- **Purpose:** Transactional email delivery (alerts, digest, weekly briefing, password reset)
- **Required Credentials:** `RESEND_API_KEY`
- **Account Setup:** Create account at resend.com; verify sending domain; configure DNS records
- **Pricing Tier:** Free tier (3000 emails/month); sufficient for MVP

### GitHub API
- **Purpose:** Ingest GitHub Trending repositories from AI organisations
- **Required Credentials:** `GITHUB_TOKEN` (personal access token, read:public scope)
- **Account Setup:** Generate PAT at github.com/settings/tokens
- **Pricing Tier:** Free (5000 requests/hour with auth)

### Hacker News API
- **Purpose:** Ingest top tech discussions
- **Required Credentials:** none (public API)
- **Pricing Tier:** Free

### Product Hunt API
- **Purpose:** Ingest newly launched AI products
- **Required Credentials:** `PRODUCTHUNT_API_TOKEN`
- **Account Setup:** Create Developer application at producthunt.com/v2/oauth/applications
- **Pricing Tier:** Free

### ArXiv API
- **Purpose:** Ingest AI/ML research papers (cs.AI, cs.CL, cs.LG)
- **Required Credentials:** none required for v1 (public Atom feed)
- **Pricing Tier:** Free

### Slack Incoming Webhooks
- **Purpose:** Deliver threshold alerts to Slack channels
- **Required Credentials:** `SLACK_WEBHOOK_URL` (per user, stored in `profiles.preferences`)
- **Account Setup:** Users create Incoming Webhook in their Slack workspace settings
- **Pricing Tier:** Free (Slack free plan supports webhooks)

---

## 9. Open Questions

| # | Question | Severity | Blocks Build? |
|---|----------|----------|--------------|
| OQ-1 | The intake specifies `id: ai-capability-radar` internally but the file is `ai-radar.yaml`. Which ID should the product directory and git repo use? | LOW | No — assumption: `ai-radar` (filename wins) |
| OQ-2 | Vercel Cron Jobs on Pro plan are limited to 1-minute minimum interval. For sub-5-minute alert delivery, should we use Supabase Edge Functions triggered by `pg_notify` instead? | MED | No — can use Supabase Realtime triggers for alerts in v1 |
| OQ-3 | The intake does not specify a pricing or billing model. Should user registration be open (anyone can sign up) or invite-only for v1? | MED | No — assumption: invite-only (admin creates users) for v1 |
| OQ-4 | The heatmap (problem class × capability category) requires an "addressability score" aggregation — which formula? Intake does not specify. | MED | No — assumption: mean `delta_magnitude` of all mapped deltas in that cell, last 30 days |
| OQ-5 | For the daily digest, should users receive a digest even if there are no new events ≥ threshold? | LOW | No — assumption: skip digest if no events above threshold |
| OQ-6 | Disruption score dimension "momentum" relies on GitHub velocity and ArXiv cluster growth signals. These require time-series comparison. Is a simple "items mentioning this capability in last 24h" count acceptable for v1? | MED | No — assumption: yes, simple mention count for v1 |
