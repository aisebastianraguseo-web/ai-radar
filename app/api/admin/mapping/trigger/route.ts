import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret, isAdmin } from '@/lib/auth/guards'
import { runMappingBatch } from '@/lib/impact/mapper'
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

  let limit = 50
  try {
    const body = (await request.json()) as { limit?: number }
    if (typeof body.limit === 'number') limit = body.limit
  } catch {
    // default limit
  }

  try {
    const result = await runMappingBatch(supabase, limit)
    logger.info(result, 'Mapping batch completed')
    return NextResponse.json(result)
  } catch (err) {
    logger.error({ err }, 'Mapping batch failed')
    return NextResponse.json({ error: 'Mapping failed', code: 'MAPPING_ERROR' }, { status: 500 })
  }
}
