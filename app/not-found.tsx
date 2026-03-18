import Link from 'next/link'

export default function NotFound(): React.JSX.Element {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center"
    >
      <h1 className="text-2xl font-semibold text-foreground">Seite nicht gefunden</h1>
      <p className="max-w-md text-muted-foreground">
        Die angeforderte Seite existiert nicht.
      </p>
      <Link
        href="/dashboard"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Zum Dashboard
      </Link>
    </main>
  )
}
