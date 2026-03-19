'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface SearchResult {
  type: string
  id: string
  title: string
  excerpt: string
}

function SearchContent(): React.JSX.Element {
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQ)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const doSearch = useCallback((q: string): void => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setIsLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data: { results?: SearchResult[] }) => setResults(data.results ?? []))
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300)
    return (): void => clearTimeout(timer)
  }, [query, doSearch])

  const typeLabel: Record<string, string> = {
    capability: 'Capability',
    impact: 'Impact',
    source: 'Quelle',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Suche</h1>
      </div>

      <div>
        <label htmlFor="search-input" className="sr-only">
          Suche nach Capabilities, Impact Statements oder Quellen
        </label>
        <input
          id="search-input"
          type="search"
          placeholder="Capabilities, Impact Statements, Quellen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
        />
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Suche…</p>}

      {!isLoading && query.length >= 2 && results.length === 0 && (
        <p className="text-muted-foreground text-sm">Keine Ergebnisse für &bdquo;{query}&ldquo;.</p>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={`${r.type}-${r.id}`} className="border-border bg-card rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-foreground font-medium">{r.title}</p>
                  <p className="text-muted-foreground mt-1 text-sm">{r.excerpt}</p>
                </div>
                <span className="bg-muted text-muted-foreground shrink-0 rounded px-2 py-0.5 text-xs">
                  {typeLabel[r.type] ?? r.type}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function SearchPage(): React.JSX.Element {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Lade…</p>}>
      <SearchContent />
    </Suspense>
  )
}
