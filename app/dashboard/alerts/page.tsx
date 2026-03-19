'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'

interface AlertLog {
  id: string
  alert_type: string
  channel: string
  delivery_status: string
  sent_timestamp: string
  read_at: string | null
  disruption_score_id: string | null
  briefing_id: string | null
}

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-App',
  email: 'E-Mail',
  slack: 'Slack',
}

const TYPE_LABELS: Record<string, string> = {
  threshold: 'Disruption',
  digest: 'Digest',
  briefing: 'Briefing',
  custom: 'Custom',
}

export default function AlertsPage(): React.JSX.Element {
  const [alerts, setAlerts] = useState<AlertLog[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const fetchAlerts = useCallback((): void => {
    setIsLoading(true)
    const url = showUnreadOnly ? '/api/alerts?unread=true' : '/api/alerts'
    fetch(url)
      .then((r) => r.json())
      .then((data: { alerts?: AlertLog[] }) => setAlerts(data.alerts ?? []))
      .catch(() => setAlerts([]))
      .finally(() => setIsLoading(false))
  }, [showUnreadOnly])

  useEffect(() => {
    fetchAlerts()
    fetch('/api/alerts/unread-count')
      .then((r) => r.json())
      .then((data: { count?: number }) => setUnreadCount(data.count ?? 0))
      .catch(() => {
        /* ignore */
      })
  }, [fetchAlerts])

  function markAllRead(): void {
    const unreadIds = alerts.filter((a) => !a.read_at).map((a) => a.id)
    if (!unreadIds.length) return

    fetch('/api/alerts/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_ids: unreadIds }),
    })
      .then(() => {
        setAlerts((prev) =>
          prev.map((a) => ({ ...a, read_at: a.read_at ?? new Date().toISOString() }))
        )
        setUnreadCount(0)
      })
      .catch(() => {
        /* ignore */
      })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Alerts
            {unreadCount > 0 && (
              <span className="bg-destructive text-destructive-foreground ml-2 rounded-full px-2 py-0.5 text-xs font-medium">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Deine Disruption-Benachrichtigungen</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="rounded"
            />
            Nur ungelesene
          </label>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              Alle als gelesen markieren
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Lade…</p>
      ) : alerts.length === 0 ? (
        <p className="text-muted-foreground text-sm">Keine Alerts.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`bg-card rounded-lg border p-4 ${
                alert.read_at ? 'border-border opacity-70' : 'border-primary/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
                      {TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      via {CHANNEL_LABELS[alert.channel] ?? alert.channel}
                    </span>
                    {!alert.read_at && (
                      <span className="bg-primary h-2 w-2 rounded-full" aria-label="Ungelesen" />
                    )}
                  </div>
                  {alert.disruption_score_id && (
                    <a
                      href={`/dashboard/disruptions/${alert.disruption_score_id}`}
                      className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                    >
                      Disruption ansehen →
                    </a>
                  )}
                  {alert.briefing_id && (
                    <a
                      href={`/dashboard/briefings/${alert.briefing_id}`}
                      className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                    >
                      Briefing ansehen →
                    </a>
                  )}
                </div>
                <p className="text-muted-foreground shrink-0 text-xs">
                  {format(new Date(alert.sent_timestamp), 'dd.MM.yyyy HH:mm')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
