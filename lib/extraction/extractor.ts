import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, CapabilityCategory } from '@/types/database'
import { buildExtractionPrompt, CAPABILITY_CATEGORIES } from './prompts'
import logger from '@/lib/logger'

interface RawDelta {
  capability_category?: unknown
  capability_name?: unknown
  delta_magnitude?: unknown
  confidence_score?: unknown
  vendors_affected?: unknown
  evidence_snippets?: unknown
}

interface ValidDelta {
  capability_category: CapabilityCategory
  capability_name: string
  delta_magnitude: number
  confidence_score: number
  vendors_affected: string[]
  evidence_snippets: string[]
}

function validateDelta(raw: RawDelta): ValidDelta | null {
  if (typeof raw.capability_category !== 'string') return null
  if (!CAPABILITY_CATEGORIES.includes(raw.capability_category as CapabilityCategory)) return null
  if (typeof raw.capability_name !== 'string' || !raw.capability_name) return null
  if (typeof raw.delta_magnitude !== 'number') return null
  if (typeof raw.confidence_score !== 'number') return null

  return {
    capability_category: raw.capability_category as CapabilityCategory,
    capability_name: raw.capability_name.slice(0, 80),
    delta_magnitude: Math.max(0, Math.min(2, Math.round(raw.delta_magnitude))),
    confidence_score: Math.max(0, Math.min(1, raw.confidence_score)),
    vendors_affected: Array.isArray(raw.vendors_affected)
      ? (raw.vendors_affected as unknown[]).filter((v): v is string => typeof v === 'string')
      : [],
    evidence_snippets: Array.isArray(raw.evidence_snippets)
      ? (raw.evidence_snippets as unknown[])
          .filter((s): s is string => typeof s === 'string')
          .slice(0, 3)
      : [],
  }
}

async function callClaude(prompt: string): Promise<ValidDelta[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let text: string | null = null

  // Try primary model (claude-opus-4-6), fall back to sonnet on error
  for (const model of ['claude-opus-4-6', 'claude-sonnet-4-6'] as const) {
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = message.content[0]
      if (block?.type === 'text') {
        text = block.text
        break
      }
    } catch (err) {
      logger.warn({ err, model }, 'Claude model failed, trying fallback')
    }
  }

  if (!text) return []

  // Extract JSON array from response
  const jsonMatch = /\[[\s\S]*\]/.exec(text)
  if (!jsonMatch) return []

  let parsed: unknown[]
  try {
    parsed = JSON.parse(jsonMatch[0]) as unknown[]
  } catch {
    return []
  }

  return parsed
    .filter((item): item is RawDelta => typeof item === 'object' && item !== null)
    .map(validateDelta)
    .filter((d): d is ValidDelta => d !== null)
}

export async function extractFromSource(
  supabase: SupabaseClient<Database>,
  sourceId: string
): Promise<number> {
  // Check idempotency: skip if already processed
  const { data: source } = await supabase
    .from('ingested_sources')
    .select('*')
    .eq('id', sourceId)
    .single()

  if (!source) return 0
  if (source.extraction_status === 'done') return 0

  // Mark as queued
  await supabase.from('ingested_sources').update({ extraction_status: 'queued' }).eq('id', sourceId)

  const title = source.title
  const content = source.content ?? source.title

  let deltas: ValidDelta[] = []
  try {
    const prompt = buildExtractionPrompt(title, content)
    deltas = await callClaude(prompt)
  } catch (err) {
    logger.error({ err, sourceId }, 'Extraction failed')
    await supabase
      .from('ingested_sources')
      .update({ extraction_status: 'failed', ingestion_status: 'extraction_failed' })
      .eq('id', sourceId)
    return 0
  }

  // Insert deltas
  let inserted = 0
  for (const delta of deltas) {
    const { error } = await supabase.from('capability_deltas').insert({
      source_id: sourceId,
      capability_category: delta.capability_category,
      capability_name: delta.capability_name,
      delta_magnitude: delta.delta_magnitude,
      confidence_score: delta.confidence_score,
      vendors_affected: delta.vendors_affected,
      evidence_snippets: delta.evidence_snippets,
      low_confidence: delta.confidence_score < 0.4,
      mapping_status: 'pending',
    })
    if (!error) inserted++
  }

  await supabase
    .from('ingested_sources')
    .update({
      extraction_status: 'done',
      ingestion_status: 'extraction_done',
    })
    .eq('id', sourceId)

  return inserted
}

export async function runExtractionBatch(
  supabase: SupabaseClient<Database>,
  limit = 50
): Promise<{ queued: number; extracted: number }> {
  const { data: pending } = await supabase
    .from('ingested_sources')
    .select('id')
    .eq('ingestion_status', 'ready')
    .is('extraction_status', null)
    .limit(limit)

  if (!pending?.length) return { queued: 0, extracted: 0 }

  let extracted = 0
  for (const source of pending) {
    const count = await extractFromSource(supabase, source.id)
    extracted += count
  }

  return { queued: pending.length, extracted }
}
