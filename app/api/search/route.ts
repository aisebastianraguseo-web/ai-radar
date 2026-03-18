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
  const q = searchParams.get('q')?.trim() ?? ''
  const type = searchParams.get('type') // 'capability' | 'impact' | 'source'

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const pattern = `%${q}%`
  const results: Array<{ type: string; id: string; title: string; excerpt: string }> = []

  // Search capability deltas
  if (!type || type === 'capability') {
    const { data, error } = await supabase
      .from('capability_deltas')
      .select('id, capability_name, capability_category, vendors_affected')
      .ilike('capability_name', pattern)
      .limit(10)

    if (error) {
      logger.error({ err: error }, 'Capability search failed')
    }
    for (const row of data ?? []) {
      results.push({
        type: 'capability',
        id: row.id,
        title: row.capability_name,
        excerpt: `${row.capability_category} — ${row.vendors_affected.join(', ')}`,
      })
    }
  }

  // Search impact statements
  if (!type || type === 'impact') {
    const { data, error } = await supabase
      .from('business_problem_mappings')
      .select('id, impact_statement, problem_class, addressable_process_name')
      .ilike('impact_statement', pattern)
      .limit(10)

    if (error) {
      logger.error({ err: error }, 'Impact search failed')
    }
    for (const row of data ?? []) {
      results.push({
        type: 'impact',
        id: row.id,
        title: row.addressable_process_name,
        excerpt: row.impact_statement,
      })
    }
  }

  // Search source titles
  if (!type || type === 'source') {
    const { data, error } = await supabase
      .from('ingested_sources')
      .select('id, title, source_type, vendor')
      .ilike('title', pattern)
      .limit(10)

    if (error) {
      logger.error({ err: error }, 'Source search failed')
    }
    for (const row of data ?? []) {
      results.push({
        type: 'source',
        id: row.id,
        title: row.title,
        excerpt: `${row.source_type}${row.vendor ? ` — ${row.vendor}` : ''}`,
      })
    }
  }

  return NextResponse.json({ results })
}
