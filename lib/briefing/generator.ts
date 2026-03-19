import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns'
import type { Database } from '@/types/database'
import logger from '@/lib/logger'

const MODEL = 'claude-opus-4-6' as const

interface BriefingContext {
  weekStart: string
  weekEnd: string
  topDisruptors: Array<{
    name: string
    score: number
    category: string
    vendors: string[]
    impactStatement: string
  }>
  categoryTrends: Array<{ category: string; deltaCount: number; totalMagnitude: number }>
  problemOpportunities: Array<{ problemClass: string; newMappings: number }>
}

async function buildContext(
  supabase: SupabaseClient<Database>,
  weekStart: string,
  weekEnd: string
): Promise<BriefingContext> {
  const [disruptionsRes, deltasRes, mappingsRes] = await Promise.all([
    supabase
      .from('disruption_scores')
      .select(
        'total_disruption_score, delta_id, capability_deltas(capability_name, capability_category, vendors_affected)'
      )
      .gte('calculated_date', weekStart)
      .lte('calculated_date', weekEnd)
      .order('total_disruption_score', { ascending: false })
      .limit(10),
    supabase
      .from('capability_deltas')
      .select('capability_category, delta_magnitude')
      .gte('detected_date', weekStart)
      .lte('detected_date', weekEnd),
    supabase
      .from('business_problem_mappings')
      .select('problem_class, impact_statement, delta_id')
      .gte('mapped_date', weekStart)
      .lte('mapped_date', weekEnd),
  ])

  // Top disruptors
  const deltaImpactMap: Record<string, string> = {}
  for (const m of mappingsRes.data ?? []) {
    if (!deltaImpactMap[m.delta_id]) {
      deltaImpactMap[m.delta_id] = m.impact_statement
    }
  }

  const topDisruptors = (disruptionsRes.data ?? []).map((d) => {
    const delta = d.capability_deltas as {
      capability_name?: string
      capability_category?: string
      vendors_affected?: string[]
    } | null
    return {
      name: delta?.capability_name ?? 'Unknown',
      score: d.total_disruption_score,
      category: delta?.capability_category ?? 'unknown',
      vendors: delta?.vendors_affected ?? [],
      impactStatement: deltaImpactMap[d.delta_id] ?? '',
    }
  })

  // Category trends
  const CATEGORIES = [
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
  const categoryTrends = CATEGORIES.map((cat) => {
    const deltas = (deltasRes.data ?? []).filter((d) => d.capability_category === cat)
    return {
      category: cat,
      deltaCount: deltas.length,
      totalMagnitude: deltas.reduce((s, d) => s + d.delta_magnitude, 0),
    }
  }).filter((c) => c.deltaCount > 0)

  // Problem opportunities
  const problemMap: Record<string, number> = {}
  for (const m of mappingsRes.data ?? []) {
    problemMap[m.problem_class] = (problemMap[m.problem_class] ?? 0) + 1
  }
  const problemOpportunities = Object.entries(problemMap)
    .sort(([, a], [, b]) => b - a)
    .map(([problemClass, newMappings]) => ({ problemClass, newMappings }))

  return { weekStart, weekEnd, topDisruptors, categoryTrends, problemOpportunities }
}

function buildBriefingPrompt(ctx: BriefingContext): string {
  return `You are an AI strategy analyst. Generate a comprehensive weekly briefing based on the following data.

WEEK: ${ctx.weekStart} to ${ctx.weekEnd}

TOP DISRUPTORS (ranked by disruption score):
${ctx.topDisruptors.map((d, i) => `${i + 1}. ${d.name} (Score: ${d.score}, Category: ${d.category}, Vendors: ${d.vendors.join(', ')})\n   Impact: ${d.impactStatement}`).join('\n')}

CAPABILITY TRENDS:
${ctx.categoryTrends.map((c) => `- ${c.category}: ${c.deltaCount} deltas, total magnitude ${c.totalMagnitude}`).join('\n')}

BUSINESS PROBLEM OPPORTUNITIES:
${ctx.problemOpportunities.map((p) => `- ${p.problemClass}: ${p.newMappings} new mappings`).join('\n')}

Generate a JSON briefing with exactly this structure:
{
  "executive_summary": "1-2 sentences summarising the most important AI capability shifts this week",
  "top_disruptors": [
    {"name": "...", "score": 0.0, "impact": "..."}
  ],
  "capability_trends": [
    {"category": "...", "trend": "improving|stagnant|declining", "notes": "..."}
  ],
  "problem_matrix": [
    {"problem_class": "...", "addressability": "high|medium|low", "key_capability": "..."}
  ],
  "recommendations": [
    "Recommendation 1 (max 1 sentence)",
    "Recommendation 2",
    "Recommendation 3"
  ],
  "full_content_md": "## Weekly AI Capability Briefing\\n\\n[Full markdown content here, 400-800 words]"
}

Return only valid JSON, no commentary.`
}

interface RawBriefing {
  executive_summary?: unknown
  top_disruptors?: unknown
  capability_trends?: unknown
  problem_matrix?: unknown
  recommendations?: unknown
  full_content_md?: unknown
}

export async function generateWeeklyBriefing(
  supabase: SupabaseClient<Database>,
  weekStartOverride?: string
): Promise<string> {
  // Determine week window
  const referenceDate = weekStartOverride ? new Date(weekStartOverride) : subWeeks(new Date(), 1)
  const weekStart = format(startOfWeek(referenceDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(referenceDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  // Check if briefing already exists for this week
  const { data: existing } = await supabase
    .from('weekly_briefings')
    .select('id')
    .eq('week_start', weekStart)
    .maybeSingle()

  if (existing) return existing.id

  // Create placeholder
  const { data: placeholder, error: insertErr } = await supabase
    .from('weekly_briefings')
    .insert({
      week_start: weekStart,
      week_end: weekEnd,
      executive_summary: '',
      top_disruptors: [],
      capability_trends: [],
      problem_matrix: [],
      recommendations: [],
      full_content_md: '',
      status: 'generating',
      model_version: MODEL,
    })
    .select('id')
    .single()

  if (insertErr || !placeholder) {
    throw new Error(`Failed to create briefing placeholder: ${insertErr?.message ?? 'unknown'}`)
  }

  const briefingId = placeholder.id

  try {
    const ctx = await buildContext(supabase, weekStart, weekEnd)
    const prompt = buildBriefingPrompt(ctx)

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    let text: string | null = null

    for (const model of [MODEL, 'claude-sonnet-4-6'] as const) {
      try {
        const message = await client.messages.create({
          model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        })
        const block = message.content[0]
        if (block?.type === 'text') {
          text = block.text
          break
        }
      } catch (err) {
        logger.warn({ err, model }, 'Model failed for briefing, trying fallback')
      }
    }

    if (!text) throw new Error('No response from Claude')

    // Parse JSON
    const jsonMatch = /\{[\s\S]*\}/.exec(text)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0]) as RawBriefing

    await supabase
      .from('weekly_briefings')
      .update({
        executive_summary:
          typeof parsed.executive_summary === 'string' ? parsed.executive_summary : '',
        top_disruptors: Array.isArray(parsed.top_disruptors) ? parsed.top_disruptors : [],
        capability_trends: Array.isArray(parsed.capability_trends) ? parsed.capability_trends : [],
        problem_matrix: Array.isArray(parsed.problem_matrix) ? parsed.problem_matrix : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        full_content_md: typeof parsed.full_content_md === 'string' ? parsed.full_content_md : '',
        status: 'ready',
      })
      .eq('id', briefingId)

    // Send email to subscribed users
    await sendBriefingEmails(
      supabase,
      briefingId,
      weekStart,
      weekEnd,
      typeof parsed.executive_summary === 'string' ? parsed.executive_summary : ''
    )

    return briefingId
  } catch (err) {
    logger.error({ err, briefingId }, 'Briefing generation failed')
    await supabase.from('weekly_briefings').update({ status: 'failed' }).eq('id', briefingId)
    throw err
  }
}

async function sendBriefingEmails(
  supabase: SupabaseClient<Database>,
  briefingId: string,
  weekStart: string,
  weekEnd: string,
  summary: string
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, preferences')
    .eq('preferences->>weekly_briefing' as 'id', 'true')

  if (!profiles?.length) return

  const resend = new Resend(resendKey)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  for (const profile of profiles) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (!email) continue

      await resend.emails.send({
        from: 'AI Radar <noreply@ai-radar.app>',
        to: email,
        subject: `Weekly AI Briefing: ${weekStart} – ${weekEnd}`,
        html: `
          <h2>Weekly AI Capability Briefing</h2>
          <p><strong>Woche:</strong> ${weekStart} – ${weekEnd}</p>
          <p>${summary}</p>
          <p><a href="${appUrl}/dashboard/briefings/${briefingId}">Vollständiges Briefing lesen →</a></p>
        `,
        text: `Weekly AI Capability Briefing\n\n${summary}\n\n${appUrl}/dashboard/briefings/${briefingId}`,
      })

      await supabase.from('alert_logs').insert({
        user_id: profile.id,
        briefing_id: briefingId,
        alert_type: 'briefing',
        channel: 'email',
        recipient: email,
        delivery_status: 'sent',
      })
    } catch (err) {
      logger.error({ err, userId: profile.id }, 'Failed to send briefing email')
    }
  }
}
