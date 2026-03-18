'use client'

import { useEffect } from 'react'
import logger from '@/lib/logger'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps): React.JSX.Element {
  useEffect(() => {
    logger.error({ err: error, digest: error.digest }, 'Unhandled client error')
  }, [error])

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center"
    >
      <h1 className="text-2xl font-semibold text-foreground">Etwas ist schiefgelaufen</h1>
      <p className="max-w-md text-muted-foreground">
        Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Erneut versuchen
      </button>
    </main>
  )
}
