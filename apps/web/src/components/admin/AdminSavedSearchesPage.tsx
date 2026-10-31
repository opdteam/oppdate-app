'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { TrendingUp } from 'lucide-react'

interface InsightsData {
  total: number
  alertsOn: number
  topTypes: { type: string; count: number }[]
}

function formatTypeName(raw: string): string {
  if (raw === 'any') return 'Any type'
  return raw
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function Skeleton() {
  return (
    <div className="adm-anl-page">
      <div className="adm-anl-pagehead">
        <div className="adm-skel adm-skel-line w25" style={{ height: 24, marginBottom: 8 }} />
        <div className="adm-skel adm-skel-line w15" style={{ height: 13 }} />
      </div>
      <div className="adm-anl-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[0, 1, 2].map(i => <div key={i} className="adm-skel" style={{ height: 112, borderRadius: 14 }} />)}
        </div>
        <div className="adm-anl-card">
          <div className="adm-skel adm-skel-line w25" style={{ height: 16, marginBottom: 20 }} />
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div className="adm-skel" style={{ width: 120, height: 12, flexShrink: 0, borderRadius: 6 }} />
              <div className="adm-skel" style={{ flex: 1, height: 6, borderRadius: 3 }} />
              <div className="adm-skel" style={{ width: 28, height: 12, flexShrink: 0, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BarRow({ label, count, maxCount, index }: { label: string; count: number; maxCount: number; index: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr 36px',
        alignItems: 'center',
        gap: 14,
        padding: '10px 0',
        borderBottom: '1px solid var(--adm-card-border)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--adm-t-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {formatTypeName(label)}
      </span>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(181,83,10,0.12)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 3,
            background: 'linear-gradient(90deg, var(--adm-primary), var(--adm-primary-hi))',
            width: `${pct}%`,
            transition: `width 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 60}ms`,
          }}
        />
      </div>
      <span style={{ fontSize: 13, color: 'var(--adm-t-low)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </span>
    </div>
  )
}

export function AdminSavedSearchesPage() {
  const { data, isLoading, isError } = useQuery<InsightsData>({
    queryKey: ['admin', 'saved-searches', 'insights'],
    queryFn: () => api.get('/api/v1/saved-searches/admin/insights').then(r => r.data.data),
  })

  if (isLoading) return <Skeleton />

  if (isError || !data) {
    return (
      <div className="adm-anl-page">
        <div className="adm-anl-pagehead">
          <h1>Saved Searches</h1>
          <span className="adm-anl-sub">Search alert analytics</span>
        </div>
        <div className="adm-anl-content">
          <div className="adm-anl-card adm-anl-anim">
            <div className="adm-anl-empty-state">Failed to load saved search insights. Please refresh the page.</div>
          </div>
        </div>
      </div>
    )
  }

  const alertPct = data.total > 0 ? Math.round((data.alertsOn / data.total) * 100) : 0
  const maxCount = data.topTypes.length > 0 ? data.topTypes[0].count : 1

  return (
    <div className="adm-anl-page">
      <div className="adm-anl-pagehead">
        <h1>Saved Searches</h1>
        <span className="adm-anl-sub">Search alert analytics</span>
      </div>

      <div className="adm-anl-content">
        {/* Stat strip */}
        <div className="adm-anl-statstrip cols-3">
          <div className="adm-anl-stat adm-anl-anim" style={{ animationDelay: '0ms' }}>
            <div className="adm-anl-stat-n mono">{data.total.toLocaleString()}</div>
            <div className="adm-anl-stat-l">Total saved searches</div>
          </div>
          <div className="adm-anl-stat adm-anl-anim" style={{ animationDelay: '80ms' }}>
            <div>
              <div className="adm-anl-stat-n mono">{data.alertsOn.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: 'var(--adm-t-low)', marginTop: 6 }}>{alertPct}% of searches</div>
            </div>
            <div className="adm-anl-stat-l">Alerts enabled</div>
          </div>
          <div className="adm-anl-stat adm-anl-anim" style={{ animationDelay: '160ms' }}>
            <div>
              <div className="adm-anl-stat-n adm-anl-stat-txt">Every 6 hours</div>
              <div style={{ fontSize: 12, color: 'var(--adm-t-low)', marginTop: 6 }}>Automated via BullMQ</div>
            </div>
            <div className="adm-anl-stat-l">Alert dispatch</div>
          </div>
        </div>

        {/* Bar chart card */}
        <div className="adm-anl-card adm-anl-anim" style={{ animationDelay: '240ms' }}>
          <div className="adm-anl-cardhead">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={15} style={{ color: 'var(--adm-primary-hi)', flexShrink: 0 }} />
              Most-saved filter types
            </h3>
          </div>

          {data.topTypes.length === 0 ? (
            <div className="adm-anl-empty-state">No saved search data yet.</div>
          ) : (
            <div>
              {data.topTypes.map((item, i) => (
                <BarRow key={item.type} label={item.type} count={item.count} maxCount={maxCount} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Insight callout */}
        <div
          className="adm-anl-card adm-anl-anim"
          style={{
            animationDelay: '320ms',
            borderLeft: '3px solid var(--adm-primary)',
            borderRadius: '0 8px 8px 0',
            padding: '14px 18px',
          }}
        >
          <p style={{ fontSize: 13, color: 'var(--adm-t-mid)', margin: 0, lineHeight: 1.6 }}>
            These filter patterns reflect what users are actively searching for. High counts on a specific
            type indicate strong editorial demand - consider prioritising new listings in those categories.
          </p>
        </div>
      </div>
    </div>
  )
}
