import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import type { Database, AlertChannel, AlertType, DeliveryStatus } from '@/types/database'
import logger from '@/lib/logger'

interface AlertPayload {
  capabilityName: string
  disruptionScore: number
  impactStatement: string
  scoreId: string
}

async function sendEmail(to: string, payload: AlertPayload): Promise<DeliveryStatus> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    logger.warn('RESEND_API_KEY not set — skipping email delivery')
    return 'failed'
  }

  const resend = new Resend(resendKey)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  try {
    await resend.emails.send({
      from: 'AI Radar <noreply@ai-radar.app>',
      to,
      subject: `Disruption Alert: ${payload.capabilityName} (Score ${payload.disruptionScore})`,
      html: `
        <h2>AI Disruption Alert</h2>
        <p><strong>${payload.capabilityName}</strong></p>
        <p>Disruption Score: <strong>${payload.disruptionScore}</strong></p>
        <p>${payload.impactStatement}</p>
        <p><a href="${appUrl}/dashboard/disruptions/${payload.scoreId}">Im Dashboard ansehen</a></p>
      `,
      text: `AI Disruption Alert\n\n${payload.capabilityName}\nScore: ${payload.disruptionScore}\n\n${payload.impactStatement}\n\n${appUrl}/dashboard/disruptions/${payload.scoreId}`,
    })
    return 'sent'
  } catch (err) {
    logger.error({ err, to }, 'Email delivery failed')
    return 'failed'
  }
}

async function sendSlack(webhookUrl: string, payload: AlertPayload): Promise<DeliveryStatus> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `*Disruption Alert*: ${payload.capabilityName} (Score: ${payload.disruptionScore})\n${payload.impactStatement}\n${appUrl}/dashboard/disruptions/${payload.scoreId}`,
      }),
      signal: AbortSignal.timeout(5000),
    })
    return resp.ok ? 'sent' : 'failed'
  } catch (err) {
    logger.error({ err }, 'Slack delivery failed')
    return 'failed'
  }
}

async function logDelivery(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string
    scoreId: string
    channel: AlertChannel
    alertType: AlertType
    recipient: string
    status: DeliveryStatus
    errorMessage?: string
  }
): Promise<void> {
  await supabase.from('alert_logs').insert({
    user_id: params.userId,
    disruption_score_id: params.scoreId,
    alert_type: params.alertType,
    channel: params.channel,
    recipient: params.recipient,
    delivery_status: params.status,
    error_message: params.errorMessage ?? null,
  })
}

export async function deliverDisruptionAlert(
  supabase: SupabaseClient<Database>,
  scoreId: string
): Promise<void> {
  const { data: score } = await supabase
    .from('disruption_scores')
    .select('*')
    .eq('id', scoreId)
    .single()

  if (!score?.alert_triggered) return

  // Fetch capability name via delta
  const { data: delta } = await supabase
    .from('capability_deltas')
    .select('capability_name, delta_magnitude')
    .eq('id', score.delta_id)
    .single()

  const capabilityName = delta?.capability_name ?? 'Unknown capability'

  // Get top impact statement
  const { data: mappings } = await supabase
    .from('business_problem_mappings')
    .select('impact_statement')
    .eq('delta_id', score.delta_id)
    .limit(1)

  const impactStatement = mappings?.[0]?.impact_statement ?? ''

  const payload: AlertPayload = {
    capabilityName,
    disruptionScore: score.total_disruption_score,
    impactStatement,
    scoreId,
  }

  // Get all profiles and filter by alert_threshold in JS (JSONB filtering)
  const { data: profiles } = await supabase.from('profiles').select('id, preferences')

  for (const profile of profiles ?? []) {
    const prefs = profile.preferences
    const threshold = typeof prefs.alert_threshold === 'number' ? prefs.alert_threshold : 6
    if (score.total_disruption_score < threshold) continue

    const channels: AlertChannel[] = Array.isArray(prefs.alert_channels)
      ? (prefs.alert_channels as AlertChannel[])
      : ['in_app']

    for (const channel of channels) {
      let status: DeliveryStatus = 'pending'
      let errorMsg: string | undefined

      if (channel === 'in_app') {
        status = 'sent'
      } else if (channel === 'email') {
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
        const email = authUser?.user?.email
        if (email) {
          status = await sendEmail(email, payload)
        } else {
          status = 'failed'
          errorMsg = 'No email found'
        }
      } else if (channel === 'slack') {
        const webhookUrl = (prefs as { slack_webhook_url?: string }).slack_webhook_url
        if (webhookUrl) {
          status = await sendSlack(webhookUrl, payload)
        } else {
          status = 'failed'
          errorMsg = 'No Slack webhook URL configured'
        }
      }

      await logDelivery(supabase, {
        userId: profile.id,
        scoreId,
        channel,
        alertType: 'threshold',
        recipient: channel === 'in_app' ? profile.id : channel,
        status,
        errorMessage: errorMsg,
      })

      if (status === 'failed' && channel !== 'in_app') {
        logger.warn({ scoreId, channel, userId: profile.id }, 'Alert delivery failed')
      }
    }
  }
}
