import { createClient } from '@/lib/supabase/server'
import { getScoreColor } from '@/lib/utils'
import { format } from 'date-fns'

interface DeltaRow {
  capability_category: string
  capability_name: string
  vendors_affected: string[]
  detected_date: string
}

interface DisruptionRow {
  id: string
  total_disruption_score: number
  alert_triggered: boolean
  calculated_date: string
  capability_deltas: DeltaRow | null
}

interface TrendRow {
  category: string
  count: number
  total_magnitude: number
}

interface BriefingRow {
  id: string
  week_start: string
  week_end: string
  executive_summary: string
  status: string
  created_at: string
}

interface StatsResponse {
  top_disruptors: DisruptionRow[]
  trend_sparklines: TrendRow[]
  latest_briefing: BriefingRow | null
}

async function getStats(userId: string): Promise<StatsResponse | null> {
  // We pass the user id just for type-safety; auth is checked in the layout
  void userId
  try {
    const supabase = await createClient()
    const { subDays } = await import('date-fns')
    const weekAgo = subDays(new Date(), 7).toISOString()
    const monthAgo = subDays(new Date(), 30).toISOString()

    const [disruptionsRes, deltasCatRes, briefingRes] = await Promise.all([
      supabase
        .from('disruption_scores')
        .select(
          'id, total_disruption_score, alert_triggered, calculated_date, capability_deltas(capability_category, capability_name, vendors_affected, detected_date)'
        )
        .gte('calculated_date', weekAgo)
        .order('total_disruption_score', { ascending: false })
        .limit(10),
      supabase
        .from('capability_deltas')
        .select('capability_category, detected_date, delta_magnitude')
        .gte('detected_date', monthAgo),
      supabase
        .from('weekly_briefings')
        .select('id, week_start, week_end, executive_summary, status, created_at')
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

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

    const trendSparklines = CATEGORIES.map((cat) => {
      const catDeltas = (deltasCatRes.data ?? []).filter((d) => d.capability_category === cat)
      return {
        category: cat,
        count: catDeltas.length,
        total_magnitude: catDeltas.reduce((s, d) => s + d.delta_magnitude, 0),
      }
    })

    return {
      top_disruptors: (disruptionsRes.data as DisruptionRow[] | null) ?? [],
      trend_sparklines: trendSparklines,
      latest_briefing: briefingRes.data as BriefingRow | null,
    }
  } catch {
    return null
  }
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const stats = user ? await getStats(user.id) : null

  const topDisruptors = stats?.top_disruptors ?? []
  const sparklines = stats?.trend_sparklines ?? []
  const latestBriefing = stats?.latest_briefing ?? null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Übersicht</h1>
        <p className="text-muted-foreground mt-1 text-sm">AI Capability Radar — letzte 7 Tage</p>
      </div>

      {/* Top Disruptors */}
      <section aria-labelledby="disruptors-heading">
        <h2 id="disruptors-heading" className="text-foreground mb-4 text-lg font-semibold">
          Top Disruptoren dieser Woche
        </h2>
        {topDisruptors.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Noch keine Daten — Ingestion noch nicht gestartet.
          </p>
        ) : (
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="text-muted-foreground px-4 py-3 text-left font-medium">
                    Capability
                  </th>
                  <th scope="col" className="text-muted-foreground px-4 py-3 text-left font-medium">
                    Kategorie
                  </th>
                  <th scope="col" className="text-muted-foreground px-4 py-3 text-left font-medium">
                    Vendors
                  </th>
                  <th
                    scope="col"
                    className="text-muted-foreground px-4 py-3 text-right font-medium"
                  >
                    Score
                  </th>
                  <th scope="col" className="text-muted-foreground px-4 py-3 text-left font-medium">
                    Datum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {topDisruptors.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30">
                    <td className="text-foreground px-4 py-3 font-medium">
                      <a href={`/dashboard/disruptions/${d.id}`} className="hover:underline">
                        {d.capability_deltas?.capability_name ?? '—'}
                      </a>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {d.capability_deltas?.capability_category?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {d.capability_deltas?.vendors_affected?.join(', ') ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-mono font-semibold ${getScoreColor(d.total_disruption_score)}`}
                      >
                        {d.total_disruption_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {format(new Date(d.calculated_date), 'dd.MM.yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Capability Trends */}
      <section aria-labelledby="trends-heading">
        <h2 id="trends-heading" className="text-foreground mb-4 text-lg font-semibold">
          Capability-Trends (30 Tage)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sparklines.map((s) => (
            <div key={s.category} className="border-border bg-card rounded-lg border p-3">
              <p className="text-muted-foreground text-xs font-medium">
                {s.category.replace(/_/g, ' ')}
              </p>
              <p className="text-foreground mt-1 text-xl font-bold">{s.count}</p>
              <p className="text-muted-foreground text-xs">Deltas, Magnitude {s.total_magnitude}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest Briefing */}
      {latestBriefing && (
        <section aria-labelledby="briefing-heading">
          <h2 id="briefing-heading" className="text-foreground mb-4 text-lg font-semibold">
            Letztes Weekly Briefing
          </h2>
          <div className="border-border bg-card rounded-lg border p-5">
            <p className="text-muted-foreground text-xs">
              {format(new Date(latestBriefing.week_start), 'dd.MM.')} –{' '}
              {format(new Date(latestBriefing.week_end), 'dd.MM.yyyy')}
            </p>
            <p className="text-foreground mt-2 text-sm">{latestBriefing.executive_summary}</p>
            <a
              href={`/dashboard/briefings/${latestBriefing.id}`}
              className="text-primary mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
            >
              Vollständiges Briefing lesen →
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
