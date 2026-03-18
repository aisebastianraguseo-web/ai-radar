'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage(): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/update-password`,
    })

    // Always show success to prevent email enumeration
    if (resetError) {
      // Log silently — do not reveal to user whether email exists
    }

    setIsLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main id="main-content">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">E-Mail gesendet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Falls ein Konto mit dieser E-Mail-Adresse existiert, erhältst du in Kürze einen
            Link zum Zurücksetzen deines Passworts.
          </p>
        </div>
        <p className="text-center text-sm">
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Zurück zur Anmeldung
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main id="main-content">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Passwort zurücksetzen
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gib deine E-Mail-Adresse ein und wir senden dir einen Reset-Link.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            E-Mail-Adresse
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            placeholder="you@example.com"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !email}
          aria-busy={isLoading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Wird gesendet…' : 'Reset-Link senden'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </main>
  )
}
