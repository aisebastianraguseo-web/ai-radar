'use client'

import { useState, useEffect } from 'react'

const PROBLEM_CLASSES = [
  'fragmentation', 'knowledge_loss', 'manual_handoffs', 'repetitivity',
  'decision_uncertainty', 'long_cycles', 'documentation_burden',
  'transparency_gap', 'talent_constraints',
]

const CAPABILITY_CATEGORIES = [
  'context_processing', 'reasoning_depth', 'multi_step_autonomy', 'tool_use',
  'multimodality', 'deployment_flexibility', 'cost_efficiency', 'autonomy_level',
  'persistence', 'self_improvement', 'integration_depth', 'governance_security',
]

const LABELS: Record<string, string> = {
  fragmentation: 'Fragmentierung',
  knowledge_loss: 'Wissensverlust',
  manual_handoffs: 'Manuelle Übergaben',
  repetitivity: 'Repetitivität',
  decision_uncertainty: 'Entscheidungsunsicherheit',
  long_cycles: 'Lange Zyklen',
  documentation_burden: 'Dokumentationsaufwand',
  transparency_gap: 'Transparenzlücke',
  talent_constraints: 'Talentengpässe',
  context_processing: 'Kontext',
  reasoning_depth: 'Reasoning',
  multi_step_autonomy: 'Autonomie',
  tool_use: 'Tool Use',
  multimodality: 'Multimodalität',
  deployment_flexibility: 'Deployment',
  cost_efficiency: 'Kosten',
  autonomy_level: 'Autonomielevel',
  persistence: 'Persistenz',
  self_improvement: 'Self-Improvement',
  integration_depth: 'Integration',
  governance_security: 'Governance',
}

interface MappingRow {
  problem_class: string
  delta_id: string
  readiness_level: string
}

function intensityClass(count: number): string {
  if (count === 0) return 'bg-muted/30'
  if (count === 1) return 'bg-primary/20'
  if (count === 2) return 'bg-primary/40'
  return 'bg-primary/70'
}

export default function HeatmapPage(): React.JSX.Element {
  const [mappings, setMappings] = useState<MappingRow[]>([])
  const [deltaCategories, setDeltaCategories] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<{ problem: string; category: string } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/impact-mappings?limit=500').then((r) => r.json()),
      fetch('/api/capabilities?limit=500').then((r) => r.json()),
    ])
      .then(([impactData, capData]: [{ mappings?: MappingRow[] }, { capabilities?: Array<{ id: string; capability_category: string }> }]) => {
        setMappings(impactData.mappings ?? [])
        const catMap: Record<string, string> = {}
        for (const cap of capData.capabilities ?? []) {
          catMap[cap.id] = cap.capability_category
        }
        setDeltaCategories(catMap)
      })
      .catch(() => { /* keep empty */ })
      .finally(() => setIsLoading(false))
  }, [])

  function cellCount(problem: string, category: string): number {
    return mappings.filter(
      (m) => m.problem_class === problem && deltaCategories[m.delta_id] === category
    ).length
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Business-Heatmap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Problemklassen (Zeilen) × Capability-Kategorien (Spalten) — Farbintensität = Anzahl Mappings
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lade…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th scope="col" className="w-40 p-2 text-left text-muted-foreground" />
                {CAPABILITY_CATEGORIES.map((cat) => (
                  <th
                    key={cat}
                    scope="col"
                    className="w-14 p-2 text-center text-muted-foreground"
                    title={cat}
                  >
                    <span className="inline-block -rotate-45 whitespace-nowrap">
                      {LABELS[cat] ?? cat}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROBLEM_CLASSES.map((problem) => (
                <tr key={problem}>
                  <th scope="row" className="p-2 text-right text-muted-foreground whitespace-nowrap">
                    {LABELS[problem] ?? problem}
                  </th>
                  {CAPABILITY_CATEGORIES.map((cat) => {
                    const count = cellCount(problem, cat)
                    return (
                      <td key={cat} className="p-1">
                        <button
                          onClick={() => setSelected({ problem, category: cat })}
                          aria-label={`${LABELS[problem] ?? problem} × ${LABELS[cat] ?? cat}: ${count} Mappings`}
                          className={`h-10 w-10 rounded transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${intensityClass(count)}`}
                          title={`${count} Mappings`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="font-medium text-foreground">
            {LABELS[selected.problem] ?? selected.problem} × {LABELS[selected.category] ?? selected.category}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {cellCount(selected.problem, selected.category)} Mappings
          </p>
          <button
            onClick={() => setSelected(null)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Schließen
          </button>
        </div>
      )}
    </div>
  )
}
