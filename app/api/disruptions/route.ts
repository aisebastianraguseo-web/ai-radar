import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'

export async function GET(request: NextRequest): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sort = searchParams.get('sort') ?? 'score'
  const limitParam = searchParams.get('limit')
  const vendor = searchParams.get('vendor')
  const category = searchParams.get('category')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = limitParam ? Math.min(100, parseInt(limitParam, 10)) : 10

  let query = supabase
    .from('disruption_scores')
    .select(
      `
      *,
      capability_deltas (
        id, capability_category, capability_name, vendors_affected,
        detected_date, confidence_score, evidence_snippets
      )
    `
    )
    .order(sort === 'date' ? 'calculated_date' : 'total_disruption_score', { ascending: false })
    .limit(limit)

  if (from) query = query.gte('calculated_date', from)
  if (to) query = query.lte('calculated_date', to)

  const { data, error } = await query

  if (error) {
    logger.error({ err: error }, 'Failed to fetch disruptions')
    return NextResponse.json({ error: 'Query failed', code: 'DB_ERROR' }, { status: 500 })
  }

  // Post-filter by vendor/category (nested filters not easily done in Supabase query)
  let filtered = data ?? []
  if (vendor) {
    filtered = filtered.filter((d) => {
      const delta = d.capability_deltas as unknown as { vendors_affected: string[] } | null
      return delta?.vendors_affected.includes(vendor)
    })
  }
  if (category) {
    filtered = filtered.filter((d) => {
      const delta = d.capability_deltas as unknown as { capability_category: string } | null
      return delta?.capability_category === category
    })
  }

  return NextResponse.json({ disruptions: filtered })
}
