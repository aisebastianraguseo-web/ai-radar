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

  const { data, error } = await supabase
    .from('weekly_briefings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
    }
    logger.error({ err: error }, 'Failed to fetch briefing')
    return NextResponse.json({ error: 'Query failed', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ briefing: data })
}
