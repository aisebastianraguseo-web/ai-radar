import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'

export async function GET(
  request: NextRequest,
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
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const vendor = searchParams.get('vendor')

  // Get the category for this delta
  const { data: root } = await supabase
    .from('capability_deltas')
    .select('capability_category')
    .eq('id', id)
    .single()

  if (!root) {
    return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  let query = supabase
    .from('capability_deltas')
    .select('id, capability_name, delta_magnitude, vendors_affected, detected_date, confidence_score')
    .eq('capability_category', root.capability_category)
    .order('detected_date', { ascending: true })

  if (from) query = query.gte('detected_date', from)
  if (to) query = query.lte('detected_date', to)
  if (vendor) query = query.contains('vendors_affected', [vendor])

  const { data, error } = await query.limit(200)

  if (error) {
    logger.error({ err: error }, 'Failed to fetch capability history')
    return NextResponse.json({ error: 'Query failed', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ history: data ?? [] })
}
