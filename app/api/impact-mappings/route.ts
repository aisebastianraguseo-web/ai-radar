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
  const problemClass = searchParams.get('problem_class')
  const readinessLevel = searchParams.get('readiness_level')
  const from = searchParams.get('from')
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? Math.min(100, parseInt(limitParam, 10)) : 50

  let query = supabase
    .from('business_problem_mappings')
    .select('*')
    .order('mapped_date', { ascending: false })
    .limit(limit)

  if (problemClass) {
    query = query.eq('problem_class', problemClass as 'fragmentation')
  }
  if (readinessLevel) {
    query = query.eq('readiness_level', readinessLevel as 'experimental')
  }
  if (from) {
    query = query.gte('mapped_date', from)
  }

  const { data, error } = await query

  if (error) {
    logger.error({ err: error }, 'Failed to fetch impact mappings')
    return NextResponse.json({ error: 'Query failed', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ mappings: data ?? [] })
}
