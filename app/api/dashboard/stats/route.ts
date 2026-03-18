import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { subDays } from 'date-fns'
import logger from '@/lib/logger'
import type { CapabilityCategory } from '@/types/database'

const CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  'context_processing', 'reasoning_depth', 'multi_step_autonomy',
  'tool_use', 'multimodality', 'deployment_flexibility',
  'cost_efficiency', 'autonomy_level', 'persistence',
  'self_improvement', 'integration_depth', 'governance_security',
]

export async function GET(_request: NextRequest): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const weekAgo = subDays(new Date(), 7).toISOString()

  // Top disruptors this week
  const { data: topDisruptors, error: topErr } = await supabase
    .from('disruption_scores')
    .select(`
      id, total_disruption_score, alert_triggered, calculated_date,
      capability_deltas (
        capability_category, capability_name, vendors_affected, detected_date
      )
    `)
    .gte('calculated_date', weekAgo)
    .order('total_disruption_score', { ascending: false })
    .limit(10)

  if (topErr) {
    logger.error({ err: topErr }, 'Failed to fetch top disruptors')
  }

  // Trend sparklines: delta counts per category over last 30 days
  const monthAgo = subDays(new Date(), 30).toISOString()
  const { data: deltasByCategory } = await supabase
    .from('capability_deltas')
    .select('capability_category, detected_date, delta_magnitude')
    .gte('detected_date', monthAgo)

  const trendSparklines = CAPABILITY_CATEGORIES.map((cat) => {
    const catDeltas = (deltasByCategory ?? []).filter((d) => d.capability_category === cat)
    const totalMagnitude = catDeltas.reduce((sum, d) => sum + d.delta_magnitude, 0)
    return { category: cat, count: catDeltas.length, total_magnitude: totalMagnitude }
  })

  // Latest briefing
  const { data: latestBriefing } = await supabase
    .from('weekly_briefings')
    .select('id, week_start, week_end, executive_summary, status, created_at')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    top_disruptors: topDisruptors ?? [],
    trend_sparklines: trendSparklines,
    latest_briefing: latestBriefing ?? null,
  })
}
