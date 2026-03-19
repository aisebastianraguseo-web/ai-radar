'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface CapabilityRow {
  id: string
  capability_category: string
  capability_name: string
  vendors_affected: string[]
  delta_magnitude: number
  confidence_score: number
  detected_date: string
}

const TIME_WINDOWS = [
  { label: '7T', days: 7 },
  { label: '30T', days: 30 },
  { label: '90T', days: 90 },
  { label: '1J', days: 365 },
]

export default function CapabilitiesPage(): React.JSX.Element {
  const [capabilities, setCapabilities] = useState<CapabilityRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWindow, setSelectedWindow] = useState(30)
  const [vendorFilter, setVendorFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    setIsLoading(true)
    const params = new URLSearchParams()
    if (vendorFilter) params.set('vendor', vendorFilter)
    if (categoryFilter) params.set('category', categoryFilter)

    fetch(`/api/capabilities?${params.toString()}`)
      .then((r) => r.json())
      .then((data: { capabilities?: CapabilityRow[] }) => {
        const from = new Date()
        from.setDate(from.getDate() - selectedWindow)
        const filtered = (data.capabilities ?? []).filter((c) => new Date(c.detected_date) >= from)
        setCapabilities(filtered)
      })
      .catch(() => setCapabilities([]))
      .finally(() => setIsLoading(false))
  }, [selectedWindow, vendorFilter, categoryFilter])

  const magnitudeLabel = (m: number): string => {
    if (m >= 2) return 'Groß'
    if (m >= 1) return 'Mittel'
    return 'Klein'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Capabilities</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Capability-Deltas nach Zeitfenster und Filter
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Time window selector */}
        <div role="group" aria-label="Zeitfenster" className="flex gap-1">
          {TIME_WINDOWS.map((w) => (
            <button
              key={w.days}
              onClick={() => setSelectedWindow(w.days)}
              aria-pressed={selectedWindow === w.days}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedWindow === w.days
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Vendor filtern…"
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          aria-label="Nach Vendor filtern"
          className="border-input bg-background placeholder:text-muted-foreground focus:ring-ring rounded-md border px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
        />

        <input
          type="text"
          placeholder="Kategorie filtern…"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Nach Kategorie filtern"
          className="border-input bg-background placeholder:text-muted-foreground focus:ring-ring rounded-md border px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Lade…</p>
      ) : capabilities.length === 0 ? (
        <p className="text-muted-foreground text-sm">Keine Daten für diesen Zeitraum.</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Capability
                </th>
                <th scope="col" className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Kategorie
                </th>
                <th scope="col" className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Vendors
                </th>
                <th scope="col" className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Magnitude
                </th>
                <th scope="col" className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Datum
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {capabilities.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="text-foreground px-4 py-3 font-medium">
                    <a href={`/api/capabilities/${c.id}`} className="hover:underline">
                      {c.capability_name}
                    </a>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {c.capability_category.replace(/_/g, ' ')}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {c.vendors_affected.join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        c.delta_magnitude >= 2
                          ? 'bg-red-500/20 text-red-400'
                          : c.delta_magnitude >= 1
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {magnitudeLabel(c.delta_magnitude)}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {format(new Date(c.detected_date), 'dd.MM.yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
