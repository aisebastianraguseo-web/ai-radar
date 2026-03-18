import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'

interface BriefingPageProps {
  params: Promise<{ id: string }>
}

export default async function BriefingDetailPage({ params }: BriefingPageProps): Promise<React.JSX.Element> {
  const { id } = await params
  const supabase = await createClient()

  const { data: briefing } = await supabase
    .from('weekly_briefings')
    .select('*')
    .eq('id', id)
    .single()

  if (!briefing) notFound()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(briefing.week_start), 'dd.MM.')} –{' '}
          {format(new Date(briefing.week_end), 'dd.MM.yyyy')}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
          Weekly AI Briefing
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{briefing.executive_summary}</p>
      </div>

      {briefing.full_content_md && (
        <div className="prose prose-invert max-w-none rounded-lg border border-border bg-card p-6 text-sm text-foreground">
          <pre className="whitespace-pre-wrap font-sans">{briefing.full_content_md}</pre>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Generiert mit {briefing.model_version} am{' '}
        {format(new Date(briefing.created_at), 'dd.MM.yyyy HH:mm')} UTC
      </div>
    </div>
  )
}
