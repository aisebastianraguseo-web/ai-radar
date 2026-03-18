import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import type { Database, SourceType } from '@/types/database'
import { INGESTION_SOURCES } from './sources'
import { fetchSource } from './fetchers'
import logger from '@/lib/logger'

export interface RunResult {
  run_id: string
  sources_total: number
  sources_new: number
  sources_dup: number
  sources_failed: number
}

function urlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex')
}

export async function runIngestionPipeline(
  supabase: SupabaseClient<Database>,
  triggeredBy: string,
  sourceTypeFilter?: string[]
): Promise<RunResult> {
  // Create run record
  const { data: runData, error: runError } = await supabase
    .from('ingestion_runs')
    .insert({ triggered_by: triggeredBy, status: 'running' })
    .select('id')
    .single()

  if (runError || !runData) {
    throw new Error(`Failed to create ingestion run: ${runError?.message ?? 'unknown'}`)
  }

  const runId = runData.id
  let sourcesTotal = 0
  let sourcesNew = 0
  let sourcesDup = 0
  let sourcesFailed = 0

  const sources = sourceTypeFilter?.length
    ? INGESTION_SOURCES.filter((s) => sourceTypeFilter.includes(s.type))
    : INGESTION_SOURCES

  for (const source of sources) {
    let items = []
    try {
      items = await fetchSource(source)
    } catch (err) {
      logger.error({ err, source: source.id }, 'Source fetch failed')
      sourcesFailed++
      continue
    }

    for (const item of items) {
      if (!item.source_url) continue
      sourcesTotal++

      const hash = urlHash(item.source_url)

      // Lifetime dedup: skip if URL already ingested
      const { data: existing } = await supabase
        .from('ingested_sources')
        .select('id')
        .eq('url_hash', hash)
        .maybeSingle()

      if (existing) {
        sourcesDup++
        continue
      }

      const { error: insertError } = await supabase.from('ingested_sources').insert({
        source_type: source.type as SourceType,
        source_url: item.source_url,
        url_hash: hash,
        title: item.title,
        content: item.content,
        publish_date: item.publish_date,
        vendor: item.vendor,
        ingestion_status: 'ready',
        run_id: runId,
      })

      if (insertError) {
        logger.error({ err: insertError, url: item.source_url }, 'Failed to insert source')
        sourcesFailed++
      } else {
        sourcesNew++
      }
    }
  }

  // Update run record
  await supabase
    .from('ingestion_runs')
    .update({
      completed_at: new Date().toISOString(),
      sources_total: sourcesTotal,
      sources_new: sourcesNew,
      sources_dup: sourcesDup,
      sources_failed: sourcesFailed,
      status: 'completed',
    })
    .eq('id', runId)

  return { run_id: runId, sources_total: sourcesTotal, sources_new: sourcesNew, sources_dup: sourcesDup, sources_failed: sourcesFailed }
}
