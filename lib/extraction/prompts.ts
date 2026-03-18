import type { CapabilityCategory } from '@/types/database'

export const CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  'context_processing',
  'reasoning_depth',
  'multi_step_autonomy',
  'tool_use',
  'multimodality',
  'deployment_flexibility',
  'cost_efficiency',
  'autonomy_level',
  'persistence',
  'self_improvement',
  'integration_depth',
  'governance_security',
]

export function buildExtractionPrompt(title: string, content: string): string {
  return `You are an AI capability analyst. Analyse the following content and extract any genuine AI capability advances (not marketing hype).

TITLE: ${title}
CONTENT: ${content.slice(0, 4000)}

Return a JSON array of capability deltas found. If no genuine capability advances are found, return an empty array [].

Each delta must have this exact structure:
{
  "capability_category": one of ${JSON.stringify(CAPABILITY_CATEGORIES)},
  "capability_name": "short descriptive name (max 80 chars)",
  "delta_magnitude": integer 0-2 (0=minor, 1=moderate, 2=major),
  "confidence_score": float 0.0-1.0,
  "vendors_affected": ["vendor1", "vendor2"],
  "evidence_snippets": ["quote from text supporting this claim"]
}

Rules:
- Only include genuine technical capability advances, not product launches or pricing changes
- delta_magnitude=2 means a step-change (e.g. 10x context window, true multi-step autonomy)
- confidence_score reflects how clearly the text supports the delta
- vendors_affected should be lowercase (e.g. "openai", "anthropic", "google", "meta", "mistral")
- evidence_snippets: 1-3 short quotes from the source text

Return only valid JSON, no commentary.`
}

export const EXTRACTION_SCHEMA = {
  type: 'object' as const,
  properties: {
    deltas: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        required: [
          'capability_category',
          'capability_name',
          'delta_magnitude',
          'confidence_score',
          'vendors_affected',
          'evidence_snippets',
        ],
        properties: {
          capability_category: { type: 'string' as const },
          capability_name: { type: 'string' as const },
          delta_magnitude: { type: 'integer' as const },
          confidence_score: { type: 'number' as const },
          vendors_affected: { type: 'array' as const, items: { type: 'string' as const } },
          evidence_snippets: { type: 'array' as const, items: { type: 'string' as const } },
        },
      },
    },
  },
}
