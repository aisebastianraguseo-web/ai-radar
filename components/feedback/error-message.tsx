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
      className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
    >
      {message}
    </div>
  )
}
