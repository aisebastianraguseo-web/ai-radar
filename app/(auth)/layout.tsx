export default function AuthLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
