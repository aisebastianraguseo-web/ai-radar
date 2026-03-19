export default function RootLoading(): React.JSX.Element {
  return (
    <div
      className="bg-background flex min-h-screen items-center justify-center"
      role="status"
      aria-label="Wird geladen…"
    >
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
    </div>
  )
}
