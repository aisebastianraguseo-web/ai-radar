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
  const category = searchParams.get('category')
  const vendor = searchParams.get('vendor')
  const search = searchParams.get('search')

  let query = supabase
    .from('capability_deltas')
    .select('capability_category, capability_name, vendors_affected, delta_magnitude, confidence_score, detected_date, id')
    .order('detected_date', { ascending: false })

  if (category) {
    // capability_category is an enum, cast is safe here
    query = query.eq('capability_category', category as 'context_processing')
  }
  if (vendor) {
    query = query.contains('vendors_affected', [vendor])
  }
  if (search) {
    query = query.ilike('capability_name', `%${search}%`)
  }

  const { data, error } = await query.limit(200)

  if (error) {
    logger.error({ err: error }, 'Failed to fetch capabilities')
    return NextResponse.json({ error: 'Query failed', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ capabilities: data ?? [] })
}
