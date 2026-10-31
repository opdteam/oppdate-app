'use client'

import { useState } from 'react'
import { Bookmark, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, Tag, OrgMark } from '@/components/ui'
import type { OpportunityListItem } from './types'

function deadlineTone(daysOut: number): 'warn' | 'info' | 'neutral' {
  if (daysOut <= 7)  return 'warn'
  if (daysOut <= 30) return 'info'
  return 'neutral'
}

function formatAward(funding: OpportunityListItem['funding']): string | null {
  if (!funding) return null
  if (funding.type === 'fully_funded') return funding.label ?? 'Fully funded'
  if (funding.amount && funding.currency) {
    const amount = funding.amount.toLocaleString()
    return funding.period
      ? `${funding.currency} ${amount} / ${funding.period}`
      : `${funding.currency} ${amount}`
  }
  return funding.label ?? null
}

interface OpportunityCardProps {
  data: OpportunityListItem
  saved?: boolean
  onSave?: (id: string) => void
  onOpen?: () => void
}

export function OpportunityCard({ data, saved = false, onSave, onOpen }: OpportunityCardProps) {
  const [hover, setHover] = useState(false)
  const tone  = deadlineTone(data.closesIn)
  const award = formatAward(data.funding)

  return (
    <article
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        'flex cursor-pointer flex-col gap-3 rounded-lg border border-[var(--border)] bg-white p-5 transition-shadow duration-220 ease-out-soft',
        hover ? 'shadow-md' : 'shadow-sm'
      )}
    >
      {/* Row 1: org mark + title + save */}
      <div className="flex items-start gap-3.5">
        <OrgMark initials={data.orgInit} size={44} logoUrl={data.institutionLogoUrl} alt={data.org} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {data.org} · {data.country}
          </div>
          <h3 className="m-0 font-display text-[19px] font-semibold leading-snug tracking-[-0.01em] text-ink">
            {data.title}
          </h3>
        </div>
        <button
          aria-label={saved ? 'Saved' : 'Save'}
          onClick={(e) => { e.stopPropagation(); onSave?.(data.id) }}
          className={cn(
            'inline-flex shrink-0 p-1 transition-colors',
            saved ? 'text-ginger-dark' : 'text-muted hover:text-ink'
          )}
        >
          <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Row 2: type + tags + OppDate Apply */}
      <div className="flex flex-wrap gap-1.5">
        <Tag>{data.type}</Tag>
        {data.tags.map((t) => <Tag key={t}>{t}</Tag>)}
        {data.applyForMe && <Tag accent>OppDate Apply</Tag>}
      </div>

      {/* Row 3: deadline + award */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
        <div className="inline-flex items-center gap-1.5 font-mono text-xs text-muted">
          <Clock size={14} />
          {data.closes}{data.closesIn <= 14 ? ` · ${data.closesIn}d left` : ''}
        </div>
        <div className="flex items-center gap-2">
          {award && (
            <span className="font-sans text-xs font-semibold text-ginger-dark">{award}</span>
          )}
          <Badge tone={tone}>
            {data.closesIn <= 7
              ? `${data.closesIn}d left`
              : data.closesIn <= 30
              ? `${data.closesIn} days left`
              : 'Open'}
          </Badge>
        </div>
      </div>
    </article>
  )
}
