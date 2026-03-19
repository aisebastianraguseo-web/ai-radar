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
      className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <h1 className="text-foreground text-2xl font-semibold">Etwas ist schiefgelaufen</h1>
      <p className="text-muted-foreground max-w-md">
        Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
      </p>
      <button
        onClick={reset}
        className="bg-primary text-primary-foreground focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Erneut versuchen
      </button>
    </main>
  )
}
