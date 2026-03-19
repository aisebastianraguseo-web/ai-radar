import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import logger from '@/lib/logger'

export interface ScorecardInputs {
  delta_magnitude: number // 0-2
  vendors_affected: string[] // number of vendors = distribution signal
  confidence_score: number // 0-1
  has_open_source: boolean // is any vendor open-weight/open-source?
  mapping_count: number // number of business problem mappings
  source_type: string // 'arxiv' | 'blog_official' | 'github_trending' etc.
}

export interface ScoreBreakdown {
  vendor_leadership_score: number // 0-2
  novelty_score: number // 0-2
  distribution_potential_score: number // 0-2
  open_source_score: number // 0-1
  cost_reduction_score: number // 0-2
  momentum_score: number // 0-2
  hype_adjustment: number // 0-1 (subtracted)
  multi_signal_bonus: number // 0-1 (added)
  total_disruption_score: number
}

const OPEN_SOURCE_VENDORS = new Set(['meta', 'mistral', 'huggingface', 'google', 'microsoft'])

export function calculateScore(inputs: ScorecardInputs): ScoreBreakdown {
  // vendor_leadership: top vendors (openai, anthropic, google) = 2, others = 1, unknown = 0
  const topVendors = new Set(['openai', 'anthropic', 'google', 'google_deepmind', 'meta'])
  const hasTopVendor = inputs.vendors_affected.some((v) => topVendors.has(v.toLowerCase()))
  const vendor_leadership_score = hasTopVendor ? 2 : inputs.vendors_affected.length > 0 ? 1 : 0

  // novelty: map delta_magnitude directly
  const novelty_score = inputs.delta_magnitude * 1 // 0, 1, or 2

  // distribution_potential: how many business mappings → wider impact
  const distribution_potential_score = Math.min(2, inputs.mapping_count)

  // open_source: any open-source/open-weight vendor affected
  const hasOpenSource = inputs.vendors_affected.some((v) =>
    OPEN_SOURCE_VENDORS.has(v.toLowerCase())
  )
  const open_source_score = inputs.has_open_source || hasOpenSource ? 1 : 0

  // cost_reduction: github/arxiv signals = real impl, 2; blog_official = 1; other = 0
  const implSources = new Set(['arxiv', 'github_trending'])
  const cost_reduction_score = implSources.has(inputs.source_type)
    ? 2
    : inputs.source_type === 'blog_official'
      ? 1
      : 0

  // momentum: multiple vendors affected = higher momentum
  const momentum_score = Math.min(2, inputs.vendors_affected.length)

  // hype_adjustment: low confidence = penalise
  const hype_adjustment = inputs.confidence_score < 0.5 ? 1 : 0

  // multi_signal_bonus: appeared across multiple source types (simplified: high confidence = bonus)
  const multi_signal_bonus = inputs.confidence_score >= 0.8 ? 1 : 0

  const raw =
    vendor_leadership_score +
    novelty_score +
    distribution_potential_score +
    open_source_score +
    cost_reduction_score +
    momentum_score -
    hype_adjustment +
    multi_signal_bonus

  const total_disruption_score = Math.max(0, Math.round(raw * 100) / 100)

  return {
    vendor_leadership_score,
    novelty_score,
    distribution_potential_score,
    open_source_score,
    cost_reduction_score,
    momentum_score,
    hype_adjustment,
    multi_signal_bonus,
    total_disruption_score,
  }
}

export async function scoreDelta(
  supabase: SupabaseClient<Database>,
  deltaId: string
): Promise<string | null> {
  const { data: delta } = await supabase
    .from('capability_deltas')
    .select('*')
    .eq('id', deltaId)
    .single()

  if (!delta) return null
  if (delta.score_id) return delta.score_id // already scored

  // Count business mappings
  const { count: mappingCount } = await supabase
    .from('business_problem_mappings')
    .select('id', { count: 'exact', head: true })
    .eq('delta_id', deltaId)

  // Get source type for scoring signal
  const { data: source } = await supabase
    .from('ingested_sources')
    .select('source_type')
    .eq('id', delta.source_id)
    .single()

  const sourceType = source?.source_type ?? 'rss_other'

  const inputs: ScorecardInputs = {
    delta_magnitude: delta.delta_magnitude,
    vendors_affected: delta.vendors_affected,
    confidence_score: delta.confidence_score,
    has_open_source: false,
    mapping_count: mappingCount ?? 0,
    source_type: sourceType,
  }

  const breakdown = calculateScore(inputs)

  const { data: scoreRow, error } = await supabase
    .from('disruption_scores')
    .insert({
      delta_id: deltaId,
      ...breakdown,
      alert_triggered: breakdown.total_disruption_score >= 6,
    })
    .select('id')
    .single()

  if (error || !scoreRow) {
    logger.error({ err: error, deltaId }, 'Failed to insert disruption score')
    return null
  }

  // Update delta with score FK
  await supabase.from('capability_deltas').update({ score_id: scoreRow.id }).eq('id', deltaId)

  return scoreRow.id
}

export async function runScoringBatch(
  supabase: SupabaseClient<Database>,
  limit = 100
): Promise<{ processed: number; scored: number; alerts: number }> {
  // Find deltas that are mapped but not scored
  const { data: pending } = await supabase
    .from('capability_deltas')
    .select('id')
    .eq('mapping_status', 'done')
    .is('score_id', null)
    .limit(limit)

  if (!pending?.length) return { processed: 0, scored: 0, alerts: 0 }

  let scored = 0
  let alerts = 0

  for (const delta of pending) {
    const scoreId = await scoreDelta(supabase, delta.id)
    if (scoreId) {
      scored++
      // Check if alert triggered
      const { data: score } = await supabase
        .from('disruption_scores')
        .select('alert_triggered')
        .eq('id', scoreId)
        .single()
      if (score?.alert_triggered) alerts++
    }
  }

  return { processed: pending.length, scored, alerts }
}
