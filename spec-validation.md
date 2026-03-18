# Spec Validation Report: ai-radar

**Validated:** 2026-03-18T00:00:00Z
**Spec Version:** 1.1
**Validator:** spec-validator v1
**Updated:** 2026-03-18T00:00:00Z (v1.1: weekly cadence, GitHub Actions cron, free-tier infra, OQ-1/OQ-2 resolved)

---

## Summary

| Check | Result |
|-------|--------|
| Completeness | PASS |
| Consistency | WARN |
| Security Review | PASS |
| Scope Realism | WARN |
| Open Questions | 4 unresolved (OQ-1, OQ-2 resolved) |
| Estimated Build Cost | ~$2–4 (pipeline tokens, Sonnet 4.6) |
| Infrastructure Cost/Month | ~$10–40 (weekly cadence, free tiers) |
| External Accounts Needed | 9 (GitHub Actions + CRON_SECRET added) |

**Overall Recommendation:** READY TO BUILD (with notes on OQ-3 — invite-only vs. open registration should be confirmed before scaffold, as it affects auth flow complexity)

---

## 1. Completeness Check

### 1.1 Required Sections

| Section | Present | Non-Empty | Notes |
|---------|---------|-----------|-------|
| 1. Product Overview | ✓ | ✓ | |
| 2. User Personas | ✓ | ✓ | 3 personas |
| 3. Features | ✓ | ✓ | 8 features |
| 4. Data Model | ✓ | ✓ | Full SQL DDL |
| 5. API Surface | ✓ | ✓ | 20 endpoints |
| 6. Non-Functional | ✓ | ✓ | |
| 7. Out of Scope | ✓ | ✓ | 16 deferred items |
| 8. External Dependencies | ✓ | ✓ | 8 services |
| 9. Open Questions | ✓ | ✓ | 6 questions |

### 1.2 Feature Completeness

| Feature | User Stories | Acceptance Criteria | API Surface | Data Requirements |
|---------|-------------|--------------------|-----------|--------------------|
| user-auth | 4 | 7 | ✓ | ✓ |
| data-ingestion-orchestrator | 2 | 7 | ✓ | ✓ |
| capability-delta-extraction | 2 | 7 | ✓ | ✓ |
| capability-landscape-database | 2 | 6 | ✓ | ✓ |
| business-impact-mapper | 2 | 6 | ✓ | ✓ |
| disruption-scoring-engine | 2 | 6 | ✓ | ✓ |
| dashboard-and-visualization | 3 | 8 | ✓ | ✓ |
| alerting-and-notification-system | 3 | 9 | ✓ | ✓ |
| weekly-briefing-generator | 2 | 8 | ✓ | ✓ |

All features have ≥ 2 user stories and ≥ 3 acceptance criteria. **PASS.**

### 1.3 Missing Implicit Requirements

- [x] Sign-out / session management — covered in AC-auth-5
- [x] Password reset flow — covered in AC-auth-4
- [x] Error states for all API endpoints — Section 5 states all errors follow `{ error, code }` pattern
- [ ] **Empty states for list views** — WARN: spec does not define what the dashboard shows when 0 disruptions exist (first-time user, no data yet). Feature agents should implement an empty state with onboarding hint.
- [x] Loading states for async operations — implied by Next.js App Router `loading.tsx` convention; feature agent should implement
- [x] 404 and error boundary pages — standard Next.js scaffold concern
- [ ] **Confirmation dialogs for destructive actions** — No destructive user actions exist in v1 (no delete features for end users). Admin pipeline triggers are safe to proceed without confirmation. **N/A.**
- [ ] **User onboarding / first-run experience** — WARN: spec does not define what a new user sees after email verification before data exists. Assumption: redirect to dashboard with empty-state instructions.

---

## 2. Consistency Check

### 2.1 Intake vs Spec Comparison

| Field | Intake Value | Spec Value | Match? |
|-------|-------------|------------|--------|
| Product type | web-saas | web-saas | ✓ |
| Feature count | 8 | 8 | ✓ |
| Out-of-scope items | 8 listed | 16 listed | ✓ (spec is more explicit) |
| LLM model | claude-opus-4-6 | claude-opus-4-6 | ✓ |
| Dark mode | true | true (default) | ✓ |
| Data region | EU primary | eu-central-1 | ✓ |
| Alert threshold | ≥ 6 | ≥ 6 | ✓ |
| Weekly briefing cadence | Monday weekly | Monday 07:30 UTC | ✓ |

### 2.2 Contradictions Found

- ~~**WARN — Vercel Cron vs. extraction latency**~~ **RESOLVED (v1.1):** GitHub Actions handles weekly ingestion trigger; Supabase Edge Function (DB trigger on insert) handles extraction within 10 minutes. Vercel Hobby plan used — no Cron dependency on Vercel.

- **WARN — Section 6.2 (Security) vs. Section 8 (External Dependencies):** Section 6.2 mentions `@upstash/ratelimit` for rate limiting, but Section 8 does not list Upstash as an external dependency with credentials. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to external dependencies.

### 2.3 Ambiguities Found

- [ ] AMB-1: Section 3 (data-ingestion-orchestrator) AC-ingest-3 states deduplication checks last 7 days. But some sources (e.g., ArXiv papers) may re-surface after 7 days legitimately. Is 7 days the right dedup window, or should it be URL-lifetime unique? **Recommendation:** Use URL-lifetime uniqueness (unique index on `url_hash` without date window).

- [ ] AMB-2: Section 3 (disruption-scoring-engine) AC-score-2 states `momentum_score (0-2)` but the intake's scorecard lists momentum as max +2 and is medium-weighted. Section 6 (OQ-6) proposes using mention-count. The formula `mention_count ≥ 5 → score=2, ≥ 2 → score=1, else 0` should be codified in spec to avoid ambiguous implementation.

### 2.4 Data Model Consistency

- All entities referenced in feature descriptions (`ingested_sources`, `capability_deltas`, `business_problem_mappings`, `disruption_scores`, `weekly_briefings`, `alert_logs`, `profiles`, `ingestion_runs`, `capability_landscape_versions`) are present in the schema. **PASS.**
- `capability_deltas.score_id` is declared but has no FK constraint in the DDL (to avoid circular dependency during insert). **Acceptable — note for feature agent: update `score_id` after `disruption_scores` insert.**
- `alert_logs` references `disruption_scores(id)` and `weekly_briefings(id)` both as nullable. Digest alerts will have `disruption_score_id = NULL` if they cover multiple events. **ACCEPTABLE** — impact statement field can aggregate.
- RLS policies grant `INSERT/UPDATE` on pipeline tables to admin role. **WARN:** The ingestion cron job runs as `service_role` (bypasses RLS). Confirm `SUPABASE_SERVICE_ROLE_KEY` is never passed to client-side code.

---

## 3. Security Review

### 3.1 Authentication & Authorisation

- [x] Auth method specified: Supabase Auth (email/password + magic link)
- [x] All authenticated endpoints listed — Section 5 shows all 20 endpoints require auth; admin endpoints noted
- [x] RLS policies present for all tables — Section 4.4 summary confirms all 9 tables
- [x] Default-deny RLS baseline confirmed — "no implicit access" stated in Section 4.4
- [x] Password reset flow specified — AC-auth-4
- [ ] **Session timeout policy** — WARN: Section 6.2 states "7 days of inactivity" but the Supabase JWT default is 1 hour with refresh tokens lasting 7 days. Clarify: is the 7-day policy for the refresh token? **Recommend:** specify `accessTokenExpiry: 3600, refreshTokenExpiry: 604800` in Supabase settings.

No blocking auth issues found.

### 3.2 Input Validation

- [x] Validation library specified: Zod (governance/stack.md mandated)
- [x] Schemas required for all API route handlers — stated in Section 6.2
- [ ] **WARN:** Specific Zod schema shapes are not listed per-endpoint. Feature agent must define schemas. This is acceptable at spec level — not a blocker.
- [ ] **File upload** — Not applicable (no file uploads in v1).

### 3.3 Secrets Management

- [x] All credentials listed as env vars — Section 8 lists all 12+ env var names
- [x] `.env.example` referenced in governance rules
- [x] No secrets embedded in spec or data model
- [x] `SUPABASE_SERVICE_ROLE_KEY` explicitly noted as server-side only

**PASS.**

### 3.4 OWASP Checklist

| Risk | Addressed in Spec? | Notes |
|------|--------------------|-------|
| A01 Broken Access Control | ✓ | RLS default-deny; admin role checks on all admin endpoints |
| A02 Cryptographic Failures | ✓ | Supabase Auth handles hashing; HTTPS enforced; no plaintext passwords |
| A03 Injection | ✓ | Supabase JS SDK parameterised queries; Zod validation |
| A04 Insecure Design | partial | Threat model references intake notes; RLS default-deny in place |
| A05 Security Misconfiguration | ✓ | CSP nonce-based, all headers listed in Section 6.2 |
| A07 Auth Failures | ✓ | Rate limiting (10/15min/IP), JWT server-side verification |
| A09 Logging Failures | ✓ | `alert_logs` audit trail; server-side error logging required |
| A10 SSRF | partial | WARN: Ingestion pipeline fetches external URLs. RSS feeds and GitHub API responses must not be used to derive further server-side fetch URLs from user input. Validate all fetched URLs against an allowlist in the ingestion service. |

### 3.5 Security Risks

- **RISK:** Ingestion pipeline fetches arbitrary RSS feeds / web pages. If feed content contains URLs that are re-fetched server-side (e.g., a redirect chain), SSRF is possible. Mitigation: all outbound fetch calls must use a URL allowlist or domain-whitelist validation.
- **RISK:** LLM extraction prompt includes raw ingested content. Adversarial content ("prompt injection" via a crafted blog post) could attempt to manipulate the extraction output. Mitigation: Wrap user-content in explicit delimiters in the prompt; use Anthropic's structured output mode (JSON schema enforcement); do not allow LLM response to influence system calls.
- **RISK:** `RESEND_API_KEY` grants email sending capability. If leaked, could enable spam. Mitigation: rotate key on any suspicion; scope to minimum permissions in Resend dashboard.

---

## 4. Scope Realism Assessment

### 4.1 Feature Count and Complexity

| Feature | Estimated Effort | Complexity | Notes |
|---------|-----------------|-----------|-------|
| user-auth | S | low | Standard Supabase Auth + profile update |
| data-ingestion-orchestrator | L | high | 7+ external API integrations, cron, dedup logic |
| capability-delta-extraction | L | high | LLM pipeline, structured output, error handling |
| capability-landscape-database | M | medium | CRUD + time-series queries + snapshot cron |
| business-impact-mapper | M | medium | Second LLM call, enum mapping, idempotency |
| disruption-scoring-engine | S | medium | Weighted formula, generated column logic |
| dashboard-and-visualization | XL | high | 5 views, Recharts charts, heatmap, search, filters |
| alerting-and-notification-system | L | high | Multi-channel delivery, retry logic, in-app badge |
| weekly-briefing-generator | M | medium | LLM synthesis, email template, cron |

**Total estimated build effort: XL** (8 features, 3 of which are L or XL)

> WARN: This is a large MVP. For AI-generated code, the most complex features are `dashboard-and-visualization` (many components) and `data-ingestion-orchestrator` (external API brittleness). Consider whether `alerting-and-notification-system` could be simplified to in-app only for v1 with email deferred, to reduce external dependencies.

### 4.2 External Dependencies Risk

| Service | Risk | Mitigation |
|---------|------|-----------|
| Anthropic API | Cost overrun if extraction runs uncapped | Per-run extraction limit (AC-delta-6); weekly cadence keeps costs at $10–40/mo |
| GitHub API | 403 on rate limit (5000 req/hr) | Cache responses; weekly run uses < 100 requests |
| Product Hunt API | Auth complexity, rate limits | Mark as P2 — skip if auth blocks scaffold |
| ArXiv API | Atom feed may be slow / unreliable | Implement timeout + skip on failure |
| Resend | Email deliverability (DNS setup required) | Must verify sending domain before go-live |
| ~~Vercel Cron~~ | ~~Pro plan required~~ | RESOLVED: GitHub Actions used instead; Vercel Hobby sufficient |
| Supabase | Free tier pauses after 7 days inactivity | Weekly GitHub Actions cron keeps project active |
| GitHub Actions | Cron reliability (best-effort, not guaranteed exact time) | Acceptable for weekly briefing; max ~5 min delay |

### 4.3 Scope Creep Risks

- **Dashboard:** D3/Recharts heatmap with drill-down is the most open-ended component. Define fixed dimensions (9 × 12 grid) to prevent unbounded expansion.
- **Ingestion:** "weak signals" (VC blogs, Twitter lists) require ongoing maintenance as feed URLs change. Limit v1 to the 7 named sources in AC-ingest-3.
- **LLM prompt quality:** Extraction quality depends heavily on prompt engineering. Budget time for iteration. The spec does not lock in prompt templates — feature agent will need to iterate.

---

## 5. Cost Estimation

### 5.1 Build Token Estimate

| Phase | Agent | Est. Tokens | Basis |
|-------|-------|-------------|-------|
| 1. Spec | spec-agent | ~20,000 | Intake (750 lines) + governance → spec.md |
| 2. Validation | spec-validator | ~10,000 | spec.md → validation report |
| 3. Scaffold | scaffold-agent | ~30,000 | spec.md → ~60 boilerplate files |
| 4. Features | feature-agent × 8 | ~160,000 | ~20k/feature (read context + write code) |
| 5. Gate | gate-agent | ~8,000 | Read code + tool output → gate report |
| 6. Fix | fix-agent (1 run) | ~15,000 | Gate report + failing files → fixes |
| **Total** | | **~243,000** | |

**Price calculation (Sonnet 4.6):**
- Input tokens (~70%): 170k × $3/M = **$0.51**
- Output tokens (~30%): 73k × $15/M = **$1.09**
- **Total: ~$1.60–$4** (depending on fix iterations)

**Price calculation (Opus 4.6):**
- Input tokens: 170k × $15/M = $2.55
- Output tokens: 73k × $75/M = $5.48
- **Total: ~$8–12** (depending on fix iterations)

> Note: The earlier estimate of $18–22 and $85–100 was incorrect — it incorrectly multiplied total tokens by the blended rate without separating input/output ratios. Corrected above.

### 5.2 Infrastructure Cost Estimate (Monthly, weekly cadence)

| Service | Plan | Cost/Mo | Notes |
|---------|------|---------|-------|
| Supabase | Free | **$0** | 500MB DB, Edge Functions; weekly cron prevents pause |
| Vercel | Hobby | **$0** | No Cron needed; GitHub Actions handles scheduling |
| GitHub Actions | Free | **$0** | < 2 min/week; well within 500 min/mo free tier |
| Resend | Free | **$0** | < 3000 emails/mo for MVP |
| Anthropic API | Pay-per-use | **$10–40** | ~50–100 extractions/week @ $0.05–0.10/call |
| GitHub API | Free | **$0** | Public API, weekly usage far below rate limit |
| **Total** | | **~$10–40/mo** | Scales linearly with ingestion frequency |

**Scale-up triggers:**
- Supabase Pro ($25/mo): when DB > 400MB or Edge Functions > 400k invocations/month
- Vercel Pro ($20/mo): only if custom domain SSL automation or team features needed
- Anthropic costs double with each 2× increase in ingestion frequency

---

## 6. External Accounts / Credentials Required

- [ ] **Supabase** — Create project (eu-central-1, free tier). Collect: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] **Vercel** — Create project (Hobby plan, free). Connect repo: `https://github.com/aisebastianraguseo-web/ai-radar.git`. Collect: `VERCEL_TOKEN`
- [ ] **GitHub** — Repository `https://github.com/aisebastianraguseo-web/ai-radar.git`. Generate PAT (read:public) for ingestion. Collect: `GITHUB_TOKEN`. Set `CRON_SECRET` in repo Secrets → Actions.
- [ ] **Anthropic** — Create account, enable billing. Collect: `ANTHROPIC_API_KEY`
- [ ] **Resend** — Create account, verify sending domain. Collect: `RESEND_API_KEY`, set `RESEND_FROM_EMAIL`
- [ ] **Upstash Redis** — Create free database for rate limiting. Collect: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] **Product Hunt** — Create OAuth application. Collect: `PRODUCTHUNT_API_TOKEN`
- [ ] **Slack** — Users configure per-workspace webhook URLs in profile settings (not a deployment credential)
- [ ] **ArXiv** — No account required (public Atom feed)
- [ ] **Hacker News** — No account required (public API)

---

## 7. Open Questions (from spec)

| # | Question | Severity | Blocks Build? |
|---|----------|----------|--------------|
| OQ-1 | ~~Product ID: `ai-radar` vs `ai-capability-radar`~~ | RESOLVED | ID = `ai-radar`; repo = `https://github.com/aisebastianraguseo-web/ai-radar.git` |
| OQ-2 | ~~Vercel Cron vs. alternative scheduler~~ | RESOLVED | GitHub Actions Cron (free, weekly); Supabase Edge Function for extraction |
| OQ-3 | User registration: open vs. invite-only for v1 | MED | **YES** — affects signup page, admin flow, and RLS |
| OQ-4 | Heatmap addressability score formula | MED | No (assumption: mean delta_magnitude last 30 days) |
| OQ-5 | Empty digest when no events above threshold | LOW | No (assumption: skip) |
| OQ-6 | Momentum score formula | MED | No (assumption: mention_count ≥5→2, ≥2→1, else 0) |

**Questions that BLOCK the build:**
- **OQ-3** (invite-only vs. open registration): The scaffold agent cannot generate the correct auth flow without this answer.

**Questions that can be resolved later:**
- OQ-4, OQ-5, OQ-6 — all have documented assumptions; build can proceed.

---

## 8. Validator Notes

1. **Complexity warning:** This is one of the more complex MVPs in the factory's template catalogue. It involves 3 LLM pipeline stages, 7 external API integrations, a multi-view analytics dashboard with charts, and a multi-channel notification system. An experienced feature-agent pass is critical — the scaffold and first feature commits will set the architectural tone.

2. **Deduplication fix:** AMB-1 (7-day dedup window) should be changed to URL-lifetime uniqueness before scaffold. The current schema has `UNIQUE INDEX ... (url_hash, date_trunc(...))` which would allow re-ingestion of the same URL weekly. Recommend: `UNIQUE INDEX idx_ingested_sources_url_hash ON public.ingested_sources (url_hash)`.

3. **Upstash credentials added to Section 8 of spec (v1.1):** `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` now documented. Free tier (10k requests/day) sufficient for rate limiting.

4. **SSRF mitigation must be implemented in ingestion feature:** The feature agent for `data-ingestion-orchestrator` must implement a URL allowlist validation step before any `fetch()` call to external sources.

5. **Prompt injection mitigation must be implemented in extraction feature:** The feature agent for `capability-delta-extraction` must wrap ingested content in explicit delimiters (e.g., `<source_content>...</source_content>`) and use Anthropic's structured output / JSON mode to constrain LLM response format.
