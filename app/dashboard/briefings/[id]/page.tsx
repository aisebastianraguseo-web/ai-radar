import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'

interface BriefingPageProps {
  params: Promise<{ id: string }>
}

export default async function BriefingDetailPage({
  params,
}: BriefingPageProps): Promise<React.JSX.Element> {
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
        <p className="text-muted-foreground text-xs">
          {format(new Date(briefing.week_start), 'dd.MM.')} –{' '}
          {format(new Date(briefing.week_end), 'dd.MM.yyyy')}
        </p>
        <h1 className="text-foreground mt-1 text-2xl font-bold tracking-tight">
          Weekly AI Briefing
        </h1>
        <p className="text-muted-foreground mt-2 text-base">{briefing.executive_summary}</p>
      </div>

      {briefing.full_content_md && (
        <div className="prose prose-invert border-border bg-card text-foreground max-w-none rounded-lg border p-6 text-sm">
          <pre className="font-sans whitespace-pre-wrap">{briefing.full_content_md}</pre>
        </div>
      )}

      <div className="text-muted-foreground text-xs">
        Generiert mit {briefing.model_version} am{' '}
        {format(new Date(briefing.created_at), 'dd.MM.yyyy HH:mm')} UTC
      </div>
    </div>
  )
}
