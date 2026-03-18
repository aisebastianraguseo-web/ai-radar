import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import logger from '@/lib/logger'

const schema = z.object({
  alert_ids: z.array(z.string().uuid()).min(1).max(100),
})

export async function POST(request: NextRequest): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const { error } = await supabase
    .from('alert_logs')
    .update({ read_at: new Date().toISOString() })
    .in('id', parsed.data.alert_ids)
    .eq('user_id', user.id)
    .is('read_at', null)

  if (error) {
    logger.error({ err: error }, 'Failed to mark alerts as read')
    return NextResponse.json({ error: 'Update failed', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ updated: parsed.data.alert_ids.length })
}
