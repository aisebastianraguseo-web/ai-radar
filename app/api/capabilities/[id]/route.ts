import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params

  const { data: capability, error } = await supabase
    .from('capability_deltas')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !capability) {
    if (error?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
    }
    logger.error({ err: error }, 'Failed to fetch capability')
    return NextResponse.json({ error: 'Query failed', code: 'DB_ERROR' }, { status: 500 })
  }

  // Fetch recent deltas in same category
  const { data: deltas } = await supabase
    .from('capability_deltas')
    .select(
      'id, capability_name, delta_magnitude, vendors_affected, detected_date, confidence_score'
    )
    .eq('capability_category', capability.capability_category)
    .neq('id', id)
    .order('detected_date', { ascending: false })
    .limit(10)

  return NextResponse.json({ capability, deltas: deltas ?? [] })
}
