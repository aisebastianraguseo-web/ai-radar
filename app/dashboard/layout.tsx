import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header
        className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm"
        role="banner"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
            <span aria-hidden="true">📡</span>
            <span>AI Radar</span>
          </a>
          <nav aria-label="Hauptnavigation" className="hidden gap-4 sm:flex">
            <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Übersicht
            </a>
            <a
              href="/dashboard/capabilities"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Capabilities
            </a>
            <a
              href="/dashboard/heatmap"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Heatmap
            </a>
            <a
              href="/dashboard/alerts"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Alerts
            </a>
            <a
              href="/dashboard/briefings"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Briefings
            </a>
          </nav>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Abmelden
            </button>
          </form>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  )
}
