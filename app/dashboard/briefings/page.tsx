import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

interface BriefingSummary {
  id: string
  week_start: string
  week_end: string
  executive_summary: string
  status: string
  created_at: string
}

export default async function BriefingsPage(): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('weekly_briefings')
    .select('id, week_start, week_end, executive_summary, status, created_at')
    .order('created_at', { ascending: false })
    .limit(52)

  const briefings = (data ?? []) as BriefingSummary[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Weekly Briefings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wöchentliche KI-Capability-Berichte
        </p>
      </div>

      {briefings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Noch kein Briefing generiert. Das erste Briefing erscheint am nächsten Montag.
        </p>
      ) : (
        <ul className="space-y-3">
          {briefings.map((b) => (
            <li key={b.id}>
              <a
                href={`/dashboard/briefings/${b.id}`}
                className="block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(b.week_start), 'dd.MM.')} –{' '}
                      {format(new Date(b.week_end), 'dd.MM.yyyy')}
                    </p>
                    <p className="mt-1 text-sm text-foreground line-clamp-2">
                      {b.executive_summary || 'Zusammenfassung nicht verfügbar.'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                      b.status === 'ready'
                        ? 'bg-green-500/20 text-green-400'
                        : b.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
