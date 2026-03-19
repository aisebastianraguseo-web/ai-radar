'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'

export default function RegisterPage(): React.JSX.Element {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const raw: RegisterInput = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    }

    const parsed = registerSchema.safeParse(raw)
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Ungültige Eingabe.')
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError('Registrierung fehlgeschlagen. Bitte versuche es erneut.')
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)
  }

  if (success) {
    return (
      <main id="main-content" className="text-center">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">E-Mail bestätigen</h1>
        <p className="text-muted-foreground mt-4 text-sm">
          Wir haben dir eine Bestätigungsmail gesendet. Bitte klicke auf den Link in der E-Mail, um
          dein Konto zu aktivieren.
        </p>
      </main>
    )
  }

  return (
    <main id="main-content">
      <div className="mb-8 text-center">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Konto erstellen</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Bereits registriert?{' '}
          <Link
            href="/login"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Anmelden
          </Link>
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-foreground block text-sm font-medium">
            E-Mail-Adresse
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-describedby={error ? 'auth-error' : undefined}
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none disabled:opacity-50"
            placeholder="you@example.com"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-foreground block text-sm font-medium">
            Passwort
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="password-hint"
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none disabled:opacity-50"
            disabled={isLoading}
          />
          <p id="password-hint" className="text-muted-foreground text-xs">
            Mindestens 8 Zeichen.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="text-foreground block text-sm font-medium">
            Passwort bestätigen
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-describedby={error ? 'auth-error' : undefined}
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none disabled:opacity-50"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div
            id="auth-error"
            role="alert"
            aria-live="polite"
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className="bg-primary text-primary-foreground focus-visible:outline-ring w-full rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Konto wird erstellt…' : 'Konto erstellen'}
        </button>
      </form>
    </main>
  )
}
