import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ProblemClass, ReadinessLevel } from '@/types/database'
import logger from '@/lib/logger'

const MAPPER_VERSION = 'v1.0'

const PROBLEM_CLASS_DESCRIPTIONS: Record<ProblemClass, string> = {
  fragmentation:
    'Scattered data/tools/knowledge across systems, preventing holistic view or action',
  knowledge_loss: 'Tacit knowledge leaving with people or locked in unstructured formats',
  manual_handoffs: 'Human-mediated handoffs between process steps creating latency and errors',
  repetitivity:
    'High-volume repetitive tasks that consume human capacity without adding strategic value',
  decision_uncertainty:
    'Decisions made with incomplete information due to analysis gaps or data quality',
  long_cycles: 'Extended end-to-end process durations due to sequential bottlenecks or waiting',
  documentation_burden: 'Manual effort required to create, update, or maintain documentation',
  transparency_gap: 'Inability to trace decisions, actions, or status through a process',
  talent_constraints: 'Bottlenecks caused by shortage of specialised skills or expert bandwidth',
}

function buildMappingPrompt(
  capabilityName: string,
  capabilityCategory: string,
  deltaMagnitude: number,
  evidenceSnippets: string[],
  vendorsAffected: string[]
): string {
  const problemClassList = Object.entries(PROBLEM_CLASS_DESCRIPTIONS)
    .map(([key, desc]) => `- ${key}: ${desc}`)
    .join('\n')

  return `You are a business process consultant. Map the following AI capability advance to relevant business problem classes.

CAPABILITY: ${capabilityName}
CATEGORY: ${capabilityCategory}
MAGNITUDE: ${deltaMagnitude}/2 (0=minor, 1=moderate, 2=major)
VENDORS: ${vendorsAffected.join(', ')}
EVIDENCE: ${evidenceSnippets.slice(0, 2).join(' | ')}

BUSINESS PROBLEM CLASSES:
${problemClassList}

Return a JSON array of mappings (maximum 3). Only include classes where this capability advance is genuinely relevant.

Each mapping:
{
  "problem_class": one of the problem class keys above,
  "problem_description": "1-2 sentence description of how this specific capability addresses this problem class",
  "addressable_process_name": "Name of a specific business process that becomes more automatable",
  "impact_statement": "Plain-language statement of the impact. MAX 280 characters. Format: '[Capability] enables [process] to [outcome], reducing [cost/time/risk] by [estimate].'",
  "readiness_level": "experimental" | "early_adopter" | "production_ready"
}

readiness_level guidance:
- experimental: proof-of-concept, limited real-world deployment
- early_adopter: works in controlled conditions, some production users
- production_ready: widely deployed, well-understood limitations

Return only valid JSON array, no commentary.`
}

interface RawMapping {
  problem_class?: unknown
  problem_description?: unknown
  addressable_process_name?: unknown
  impact_statement?: unknown
  readiness_level?: unknown
}

const VALID_PROBLEM_CLASSES: ProblemClass[] = [
  'fragmentation',
  'knowledge_loss',
  'manual_handoffs',
  'repetitivity',
  'decision_uncertainty',
  'long_cycles',
  'documentation_burden',
  'transparency_gap',
  'talent_constraints',
]

const VALID_READINESS: ReadinessLevel[] = ['experimental', 'early_adopter', 'production_ready']

function validateMapping(raw: RawMapping): {
  problem_class: ProblemClass
  problem_description: string
  addressable_process_name: string
  impact_statement: string
  readiness_level: ReadinessLevel
} | null {
  if (typeof raw.problem_class !== 'string') return null
  if (!VALID_PROBLEM_CLASSES.includes(raw.problem_class as ProblemClass)) return null
  if (typeof raw.problem_description !== 'string') return null
  if (typeof raw.addressable_process_name !== 'string') return null
  if (typeof raw.impact_statement !== 'string') return null
  if (typeof raw.readiness_level !== 'string') return null
  if (!VALID_READINESS.includes(raw.readiness_level as ReadinessLevel)) return null

  return {
    problem_class: raw.problem_class as ProblemClass,
    problem_description: raw.problem_description,
    addressable_process_name: raw.addressable_process_name,
    impact_statement: raw.impact_statement.slice(0, 280),
    readiness_level: raw.readiness_level as ReadinessLevel,
  }
}

export async function mapDelta(
  supabase: SupabaseClient<Database>,
  deltaId: string
): Promise<number> {
  const { data: delta } = await supabase
    .from('capability_deltas')
    .select('*')
    .eq('id', deltaId)
    .single()

  if (!delta || delta.delta_magnitude < 1) return 0
  if (delta.mapping_status === 'done') return 0

  const prompt = buildMappingPrompt(
    delta.capability_name,
    delta.capability_category,
    delta.delta_magnitude,
    delta.evidence_snippets,
    delta.vendors_affected
  )

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let text: string | null = null

  for (const model of ['claude-opus-4-6', 'claude-sonnet-4-6'] as const) {
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = message.content[0]
      if (block?.type === 'text') {
        text = block.text
        break
      }
    } catch (err) {
      logger.warn({ err, model }, 'Claude model failed for impact mapping')
    }
  }

  if (!text) {
    await supabase.from('capability_deltas').update({ mapping_status: 'failed' }).eq('id', deltaId)
    return 0
  }

  const jsonMatch = /\[[\s\S]*\]/.exec(text)
  if (!jsonMatch) {
    await supabase.from('capability_deltas').update({ mapping_status: 'done' }).eq('id', deltaId)
    return 0
  }

  let parsed: unknown[]
  try {
    parsed = JSON.parse(jsonMatch[0]) as unknown[]
  } catch {
    await supabase.from('capability_deltas').update({ mapping_status: 'done' }).eq('id', deltaId)
    return 0
  }

  const mappings = parsed
    .filter((m): m is RawMapping => typeof m === 'object' && m !== null)
    .map(validateMapping)
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .slice(0, 3)

  let inserted = 0
  for (const mapping of mappings) {
    const { error } = await supabase.from('business_problem_mappings').insert({
      delta_id: deltaId,
      problem_class: mapping.problem_class,
      problem_description: mapping.problem_description,
      addressable_process_name: mapping.addressable_process_name,
      impact_statement: mapping.impact_statement,
      readiness_level: mapping.readiness_level,
      mapper_version: MAPPER_VERSION,
    })
    if (!error) inserted++
  }

  await supabase.from('capability_deltas').update({ mapping_status: 'done' }).eq('id', deltaId)

  return inserted
}

export async function runMappingBatch(
  supabase: SupabaseClient<Database>,
  limit = 50
): Promise<{ processed: number; mapped: number }> {
  const { data: pending } = await supabase
    .from('capability_deltas')
    .select('id')
    .gte('delta_magnitude', 1)
    .eq('mapping_status', 'pending')
    .limit(limit)

  if (!pending?.length) return { processed: 0, mapped: 0 }

  let mapped = 0
  for (const delta of pending) {
    const count = await mapDelta(supabase, delta.id)
    mapped += count
  }

  return { processed: pending.length, mapped }
}
