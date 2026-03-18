import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'AI Capability Radar',
    template: '%s | AI Capability Radar',
  },
  description:
    'Track AI capability shifts, map them to business problems, and receive weekly strategic briefings.',
  robots: { index: false, follow: false }, // private SaaS — no public indexing
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        {/* Skip-to-content for screen readers and keyboard users */}
        <a href="#main-content" className="skip-to-content">
          Zum Hauptinhalt springen
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
