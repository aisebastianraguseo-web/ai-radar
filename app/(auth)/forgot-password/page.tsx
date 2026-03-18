import Link from 'next/link'

export const metadata = { title: 'Passwort zurücksetzen' }

export default function ForgotPasswordPage(): React.JSX.Element {
  return (
    <main id="main-content">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Passwort zurücksetzen
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Diese Funktion ist noch nicht verfügbar.
        </p>
      </div>
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </main>
  )
}
