'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'

export default function LoginPage(): React.JSX.Element {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const raw: LoginInput = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const parsed = loginSchema.safeParse(raw)
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Ungültige Eingabe.')
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (authError) {
      // Generic message — do not reveal whether email exists
      setError('E-Mail oder Passwort ist falsch.')
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main id="main-content">
      <div className="mb-8 text-center">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Anmelden</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Noch kein Konto?{' '}
          <Link
            href="/register"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Registrieren
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
            autoComplete="current-password"
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
          {isLoading ? 'Wird angemeldet…' : 'Anmelden'}
        </button>
      </form>

      <p className="text-muted-foreground mt-4 text-center text-xs">
        <Link href="/forgot-password" className="underline-offset-4 hover:underline">
          Passwort vergessen?
        </Link>
      </p>
    </main>
  )
}
