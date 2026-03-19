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
  const vendorsParam = searchParams.get('vendors') ?? ''
  const category = searchParams.get('category')

  const vendors = vendorsParam
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

  if (vendors.length === 0) {
    return NextResponse.json(
      { error: 'vendors param required', code: 'BAD_REQUEST' },
      { status: 400 }
    )
  }

  let query = supabase
    .from('capability_deltas')
    .select(
      'capability_category, capability_name, delta_magnitude, vendors_affected, detected_date, confidence_score'
    )
    .order('detected_date', { ascending: false })
    .limit(500)

  if (category) {
    query = query.eq('capability_category', category as 'context_processing')
  }

  const { data, error } = await query

  if (error) {
    logger.error({ err: error }, 'Failed to fetch capabilities for compare')
    return NextResponse.json({ error: 'Query failed', code: 'DB_ERROR' }, { status: 500 })
  }

  // Group by vendor, summing delta magnitudes per category
  const vendorMap: Record<string, Record<string, number>> = {}
  for (const vendor of vendors) {
    vendorMap[vendor] = {}
  }

  for (const delta of data ?? []) {
    for (const affectedVendor of delta.vendors_affected) {
      if (!vendors.includes(affectedVendor)) continue
      const cat = delta.capability_category
      vendorMap[affectedVendor] ??= {}
      vendorMap[affectedVendor][cat] = (vendorMap[affectedVendor][cat] ?? 0) + delta.delta_magnitude
    }
  }

  const comparison = Object.entries(vendorMap).map(([vendor, categories]) => ({
    vendor,
    categories,
  }))

  return NextResponse.json({ comparison })
}
