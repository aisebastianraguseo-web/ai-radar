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
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? Math.min(52, parseInt(limitParam, 10)) : 12

  const { data, error } = await supabase
    .from('weekly_briefings')
    .select('id, week_start, week_end, executive_summary, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error({ err: error }, 'Failed to fetch briefings')
    return NextResponse.json({ error: 'Query failed', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ briefings: data ?? [] })
}
