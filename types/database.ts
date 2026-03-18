export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'analyst' | 'stakeholder' | 'viewer'

export type SourceType =
  | 'blog_official'
  | 'github_trending'
  | 'arxiv'
  | 'hacker_news'
  | 'product_hunt'
  | 'vc_blog'
  | 'twitter_list'
  | 'rss_other'

export type IngestionStatus =
  | 'ready'
  | 'duplicate'
  | 'extraction_queued'
  | 'extraction_done'
  | 'extraction_failed'
  | 'skipped'

export type CapabilityCategory =
  | 'context_processing'
  | 'reasoning_depth'
  | 'multi_step_autonomy'
  | 'tool_use'
  | 'multimodality'
  | 'deployment_flexibility'
  | 'cost_efficiency'
  | 'autonomy_level'
  | 'persistence'
  | 'self_improvement'
  | 'integration_depth'
  | 'governance_security'

export type ProblemClass =
  | 'fragmentation'
  | 'knowledge_loss'
  | 'manual_handoffs'
  | 'repetitivity'
  | 'decision_uncertainty'
  | 'long_cycles'
  | 'documentation_burden'
  | 'transparency_gap'
  | 'talent_constraints'

export type ReadinessLevel = 'experimental' | 'early_adopter' | 'production_ready'

export type AlertChannel = 'email' | 'slack' | 'in_app'

export type AlertType = 'threshold' | 'digest' | 'briefing' | 'custom'

export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'retrying'

export type BriefingStatus = 'generating' | 'ready' | 'failed'

// ─── User Preferences ────────────────────────────────────────────────────────

export interface UserPreferences {
  alert_channels: AlertChannel[]
  digest_threshold: number
  alert_threshold: number
  weekly_briefing: boolean
  muted_vendors: string[]
  muted_problem_classes: ProblemClass[]
  vendor_filters: string[]
  problem_class_filters: ProblemClass[]
  slack_webhook_url?: string
}

// ─── Database Schema ─────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          organisation: string | null
          role: UserRole
          preferences: UserPreferences
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organisation?: string | null
          role?: UserRole
          preferences?: UserPreferences
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organisation?: string | null
          role?: UserRole
          preferences?: UserPreferences
          updated_at?: string
        }
      }
      ingested_sources: {
        Row: {
          id: string
          source_type: SourceType
          source_url: string
          url_hash: string
          title: string
          content: string | null
          publish_date: string | null
          ingestion_date: string
          vendor: string | null
          raw_metadata: Json | null
          ingestion_status: IngestionStatus
          extraction_status: string | null
          error_message: string | null
          run_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source_type: SourceType
          source_url: string
          title: string
          content?: string | null
          publish_date?: string | null
          ingestion_date?: string
          vendor?: string | null
          raw_metadata?: Json | null
          ingestion_status?: IngestionStatus
          extraction_status?: string | null
          error_message?: string | null
          run_id?: string | null
          created_at?: string
        }
        Update: {
          source_type?: SourceType
          title?: string
          content?: string | null
          publish_date?: string | null
          vendor?: string | null
          raw_metadata?: Json | null
          ingestion_status?: IngestionStatus
          extraction_status?: string | null
          error_message?: string | null
          run_id?: string | null
        }
      }
      ingestion_runs: {
        Row: {
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
        Insert: {
          id?: string
          started_at?: string
          completed_at?: string | null
          sources_total?: number
          sources_new?: number
          sources_dup?: number
          sources_failed?: number
          triggered_by?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          sources_total?: number
          sources_new?: number
          sources_dup?: number
          sources_failed?: number
          status?: string
        }
      }
      capability_deltas: {
        Row: {
          id: string
          source_id: string
          capability_category: CapabilityCategory
          capability_name: string
          delta_magnitude: number
          delta_numeric: number | null
          old_value: string | null
          new_value: string | null
          confidence_score: number
          vendors_affected: string[]
          detected_date: string
          evidence_snippets: string[]
          mapping_status: string
          score_id: string | null
          low_confidence: boolean
          created_at: string
        }
        Insert: {
          id?: string
          source_id: string
          capability_category: CapabilityCategory
          capability_name: string
          delta_magnitude: number
          delta_numeric?: number | null
          old_value?: string | null
          new_value?: string | null
          confidence_score: number
          vendors_affected?: string[]
          detected_date?: string
          evidence_snippets?: string[]
          mapping_status?: string
          score_id?: string | null
          created_at?: string
        }
        Update: {
          mapping_status?: string
          score_id?: string | null
        }
      }
      business_problem_mappings: {
        Row: {
          id: string
          delta_id: string
          problem_class: ProblemClass
          problem_description: string
          addressable_process_name: string
          impact_statement: string
          readiness_level: ReadinessLevel
          mapped_date: string
          mapper_version: string
        }
        Insert: {
          id?: string
          delta_id: string
          problem_class: ProblemClass
          problem_description: string
          addressable_process_name: string
          impact_statement: string
          readiness_level: ReadinessLevel
          mapped_date?: string
          mapper_version: string
        }
        Update: never
      }
      disruption_scores: {
        Row: {
          id: string
          delta_id: string
          vendor_leadership_score: number
          novelty_score: number
          distribution_potential_score: number
          open_source_score: number
          cost_reduction_score: number
          momentum_score: number
          hype_adjustment: number
          multi_signal_bonus: number
          total_disruption_score: number
          alert_triggered: boolean
          calculated_date: string
        }
        Insert: {
          id?: string
          delta_id: string
          vendor_leadership_score: number
          novelty_score: number
          distribution_potential_score: number
          open_source_score: number
          cost_reduction_score: number
          momentum_score: number
          hype_adjustment: number
          multi_signal_bonus: number
          total_disruption_score: number
          calculated_date?: string
        }
        Update: never
      }
      capability_landscape_versions: {
        Row: {
          id: string
          version_number: number
          snapshot_date: string
          capability_snapshots: Json
          delta_count_since_last: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          version_number: number
          snapshot_date: string
          capability_snapshots: Json
          delta_count_since_last?: number
          notes?: string | null
          created_at?: string
        }
        Update: never
      }
      weekly_briefings: {
        Row: {
          id: string
          week_start: string
          week_end: string
          executive_summary: string
          top_disruptors: Json
          capability_trends: Json
          problem_matrix: Json
          recommendations: Json
          full_content_md: string
          status: BriefingStatus
          model_version: string
          created_at: string
        }
        Insert: {
          id?: string
          week_start: string
          week_end: string
          executive_summary: string
          top_disruptors: Json
          capability_trends: Json
          problem_matrix: Json
          recommendations: Json
          full_content_md: string
          status?: BriefingStatus
          model_version: string
          created_at?: string
        }
        Update: {
          executive_summary?: string
          top_disruptors?: Json
          capability_trends?: Json
          problem_matrix?: Json
          recommendations?: Json
          full_content_md?: string
          status?: BriefingStatus
        }
      }
      alert_logs: {
        Row: {
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
          error_message: string | null
        }
        Insert: {
          id?: string
          disruption_score_id?: string | null
          briefing_id?: string | null
          user_id: string
          alert_type: AlertType
          channel: AlertChannel
          sent_timestamp?: string
          delivery_status?: DeliveryStatus
          recipient: string
          read_at?: string | null
          error_message?: string | null
        }
        Update: {
          delivery_status?: DeliveryStatus
          read_at?: string | null
          error_message?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      source_type: SourceType
      ingestion_status: IngestionStatus
      capability_category: CapabilityCategory
      problem_class: ProblemClass
      readiness_level: ReadinessLevel
      alert_channel: AlertChannel
      alert_type: AlertType
      delivery_status: DeliveryStatus
      briefing_status: BriefingStatus
    }
  }
}
