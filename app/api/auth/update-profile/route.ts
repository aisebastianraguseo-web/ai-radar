import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateProfileSchema } from '@/lib/validations/auth'
import { createRatelimiter, checkRateLimit } from '@/lib/rate-limit'
import logger from '@/lib/logger'
import type { UserPreferences } from '@/types/database'

const limiter = createRatelimiter(10, '15 m')

export async function POST(request: NextRequest): Promise<Response> {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { allowed } = await checkRateLimit(limiter, `update-profile:${ip}`)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, { status: 429 })
  }

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

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { organisation, role, preferences: preferencesUpdate } = parsed.data

  const updatePayload: {
    organisation?: string | null
    role?: 'admin' | 'analyst' | 'stakeholder' | 'viewer'
    preferences?: UserPreferences
  } = {}

  if (organisation !== undefined) updatePayload.organisation = organisation
  if (role !== undefined) updatePayload.role = role

  if (preferencesUpdate !== undefined) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    const current = existing?.preferences ?? {
      alert_channels: ['in_app' as const],
      digest_threshold: 3,
      alert_threshold: 6,
      weekly_briefing: true,
      muted_vendors: [],
      muted_problem_classes: [],
      vendor_filters: [],
      problem_class_filters: [],
    }

    updatePayload.preferences = { ...current, ...preferencesUpdate } as UserPreferences
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ success: true })
  }

  const { error: dbError } = await supabase.from('profiles').update(updatePayload).eq('id', user.id)

  if (dbError) {
    logger.error({ err: dbError }, 'Failed to update profile')
    return NextResponse.json({ error: 'Update failed', code: 'DB_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
