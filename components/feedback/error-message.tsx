interface ErrorMessageProps {
  message: string
  id?: string
}

export function ErrorMessage({ message, id }: ErrorMessageProps): React.JSX.Element {
  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  )
}
