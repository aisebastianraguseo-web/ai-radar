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
  const unreadOnly = searchParams.get('unread') === 'true'
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? Math.min(100, parseInt(limitParam, 10)) : 50

  let query = supabase
    .from('alert_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('sent_timestamp', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data, error } = await query

  if (error) {
    logger.error({ err: error }, 'Failed to fetch alerts')
    return NextResponse.json({ error: 'Query failed', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ alerts: data ?? [] })
}
