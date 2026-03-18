import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/guards'
import logger from '@/lib/logger'

export async function GET(_request: NextRequest): Promise<Response> {
  const supabase = await createServiceClient()

  const admin = await isAdmin(supabase)
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('ingestion_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) {
    logger.error({ err: error }, 'Failed to fetch ingestion runs')
    return NextResponse.json({ error: 'Query failed', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ runs: data ?? [] })
}
