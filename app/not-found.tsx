import Link from 'next/link'

export default function NotFound(): React.JSX.Element {
  return (
    <main
      id="main-content"
      className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <h1 className="text-foreground text-2xl font-semibold">Seite nicht gefunden</h1>
      <p className="text-muted-foreground max-w-md">Die angeforderte Seite existiert nicht.</p>
      <Link
        href="/dashboard"
        className="bg-primary text-primary-foreground focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Zum Dashboard
      </Link>
    </main>
  )
}
