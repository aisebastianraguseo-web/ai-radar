import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret, isAdmin } from '@/lib/auth/guards'
import { runIngestionPipeline } from '@/lib/ingestion/pipeline'
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

  let body: { source_types?: string[] } = {}
  try {
    body = (await request.json()) as { source_types?: string[] }
  } catch {
    // empty body is fine
  }

  const triggeredBy = isCron ? 'github_actions_cron' : 'admin_manual'

  try {
    const result = await runIngestionPipeline(supabase, triggeredBy, body.source_types)
    logger.info(result, 'Ingestion pipeline completed')
    return NextResponse.json(
      { status: 'completed', ...result },
      { status: 200 }
    )
  } catch (err) {
    logger.error({ err }, 'Ingestion pipeline failed')
    return NextResponse.json({ error: 'Pipeline failed', code: 'PIPELINE_ERROR' }, { status: 500 })
  }
}
