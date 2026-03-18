import type {
  CapabilityCategory,
  ProblemClass,
  ReadinessLevel,
  UserRole,
  BriefingStatus,
  DeliveryStatus,
  AlertChannel,
  AlertType,
  SourceType,
} from './database'

export type {
  CapabilityCategory,
  ProblemClass,
  ReadinessLevel,
  UserRole,
  BriefingStatus,
  DeliveryStatus,
  AlertChannel,
  AlertType,
  SourceType,
}

// ─── API Response shapes ──────────────────────────────────────────────────────

export interface ApiError {
  error: string
  code: string
}

export interface ApiSuccess<T> {
  data: T
}

// ─── Dashboard types ──────────────────────────────────────────────────────────

export interface DisruptionRow {
  id: string
  capability_name: string
  capability_category: CapabilityCategory
  vendors_affected: string[]
  total_disruption_score: number
  alert_triggered: boolean
  calculated_date: string
  top_impact_statement: string | null
}

export interface TrendDataPoint {
  date: string
  value: number
  vendor: string
}

export interface TrendData {
  category: CapabilityCategory
  points: TrendDataPoint[]
}

export interface BriefingSummary {
  id: string
  week_start: string
  week_end: string
  executive_summary: string
  status: BriefingStatus
  created_at: string
}

export interface SearchResult {
  type: 'capability' | 'impact' | 'source'
  id: string
  title: string
  excerpt: string
  score: number
}

export interface HeatmapCell {
  problem_class: ProblemClass
  capability_category: CapabilityCategory
  addressability_score: number
  delta_count: number
}

// ─── Ingestion types ──────────────────────────────────────────────────────────

export interface IngestionRunSummary {
  id: string
  started_at: string
  completed_at: string | null
  sources_total: number
  sources_new: number
  sources_dup: number
  sources_failed: number
  triggered_by: string
  status: string
}

// ─── Alert types ──────────────────────────────────────────────────────────────

export interface AlertLogEntry {
  id: string
  disruption_score_id: string | null
  briefing_id: string | null
  user_id: string
  alert_type: AlertType
  channel: AlertChannel
  sent_timestamp: string
  delivery_status: DeliveryStatus
  recipient: string
  read_at: string | null
}

// ─── Capability types ─────────────────────────────────────────────────────────

export interface CapabilityDeltaWithSource {
  id: string
  source_id: string
  capability_category: CapabilityCategory
  capability_name: string
  delta_magnitude: number
  confidence_score: number
  vendors_affected: string[]
  detected_date: string
  evidence_snippets: string[]
  mapping_status: string
  low_confidence: boolean
  source_title?: string
  source_url?: string
}

export interface BusinessProblemMappingWithDelta {
  id: string
  delta_id: string
  problem_class: ProblemClass
  problem_description: string
  addressable_process_name: string
  impact_statement: string
  readiness_level: ReadinessLevel
  mapped_date: string
  mapper_version: string
  delta?: CapabilityDeltaWithSource
}

// ─── Vendor constants ─────────────────────────────────────────────────────────

export const TOP_VENDORS = [
  'OpenAI',
  'Google',
  'Anthropic',
  'Microsoft',
  'Meta',
  'Amazon',
  'NVIDIA',
  'Mistral',
  'Cohere',
  'xAI',
  'Apple',
] as const

export type TopVendor = (typeof TOP_VENDORS)[number]
