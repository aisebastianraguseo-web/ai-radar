import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret, isAdmin } from '@/lib/auth/guards'
import { generateWeeklyBriefing } from '@/lib/briefing/generator'
import logger from '@/lib/logger'

export async function POST(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get('authorization')
  const isCron = validateCronSecret(authHeader)

  const supabase = await createServiceClient()

  if (!isCron) {
    const admin = await isAdmin(supabase)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }
  }

  let weekStart: string | undefined
  try {
    const body = (await request.json()) as { week_start?: string }
    weekStart = body.week_start
  } catch {
    // no body
  }

  try {
    const briefingId = await generateWeeklyBriefing(supabase, weekStart)
    logger.info({ briefingId }, 'Weekly briefing generated')
    return NextResponse.json({ briefing_id: briefingId })
  } catch (err) {
    logger.error({ err }, 'Briefing generation failed')
    return NextResponse.json({ error: 'Generation failed', code: 'GENERATION_ERROR' }, { status: 500 })
  }
}
