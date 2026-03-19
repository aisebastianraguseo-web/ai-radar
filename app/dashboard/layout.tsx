import Link from 'next/link'
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
    <div className="bg-background flex min-h-screen flex-col">
      <header
        className="border-border bg-card/80 sticky top-0 z-50 border-b backdrop-blur-sm"
        role="banner"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/dashboard" className="text-foreground flex items-center gap-2 font-semibold">
            <span aria-hidden="true">📡</span>
            <span>AI Radar</span>
          </a>
          <nav aria-label="Hauptnavigation" className="hidden gap-4 sm:flex">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground text-sm">
              Übersicht
            </Link>
            <Link
              href="/dashboard/capabilities"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Capabilities
            </Link>
            <Link
              href="/dashboard/heatmap"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Heatmap
            </Link>
            <Link
              href="/dashboard/alerts"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Alerts
            </Link>
            <Link
              href="/dashboard/briefings"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Briefings
            </Link>
          </nav>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="text-muted-foreground hover:text-foreground focus-visible:outline-ring text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
