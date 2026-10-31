'use client'

import { X, Bookmark, ExternalLink, Calendar, MapPin, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button, Tag, OrgMark } from '@/components/ui'
import type { OpportunityListItem } from './types'

interface MetaRowProps {
  icon: React.ReactNode
  label: string
  value: string
}

function MetaRow({ icon, label, value }: MetaRowProps) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--border)] py-2.5 last:border-b-0">
      <span className="text-muted">{icon}</span>
      <span className="min-w-[110px] text-[13px] text-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  )
}


interface OpportunityDetailProps {
  data: OpportunityListItem
  saved?: boolean
  onSave?: (id: string) => void
  onClose?: () => void
  onApply?: () => void
}

export function OpportunityDetail({ data, saved = false, onSave, onClose, onApply }: OpportunityDetailProps) {
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto border-l border-[var(--border)] bg-white">
      {/* Top actions */}
      <div className="flex items-center gap-2 px-8 pt-6">
        <button
          onClick={onClose}
          className="inline-flex rounded-md p-1.5 text-muted transition-colors hover:bg-cream-2"
          aria-label="Close detail"
        >
          <X size={20} />
        </button>
        <span className="text-[13px] text-muted">Close</span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" icon={<Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />}
          onClick={() => onSave?.(data.id)}>
          {saved ? 'Saved' : 'Save'}
        </Button>
        <Button variant="ghost" size="sm" icon={<ExternalLink size={16} />}>
          Open source
        </Button>
      </div>

      <div className="flex flex-col gap-6 px-8 pb-8 pt-5">
        {/* Header */}
        <div className="flex items-start gap-[18px]">
          <OrgMark initials={data.orgInit} size={64} logoUrl={data.institutionLogoUrl} alt={data.org} />
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-ginger-dark">
              {data.org} · {data.country}
            </div>
            <h1 className="m-0 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
              {data.title}
            </h1>
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              <Tag>{data.type}</Tag>
              {data.tags.map((t) => <Tag key={t}>{t}</Tag>)}
              {data.applyForMe && <Tag accent>OppDate Apply eligible</Tag>}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="m-0 max-w-[640px] font-sans text-base leading-[1.65] text-ink-2">
          {data.description ?? data.summary}
        </p>

        {/* Meta */}
        <div className="max-w-[480px] rounded-lg border border-[var(--border)] bg-cream-2 px-[18px] py-1.5">
          <MetaRow icon={<Calendar size={16} />} label="Closes"   value={data.closes} />
          <MetaRow icon={<MapPin size={16} />}   label="Location" value={data.country} />
          <MetaRow icon={<Sparkles size={16} />} label="Award"
            value={data.funding?.label ?? (data.funding?.amount ? `${data.funding.currency} ${data.funding.amount.toLocaleString()}` : '-')} />
        </div>

        {/* Eligibility */}
        {data.eligibility && (
          <div>
            <h2 className="mb-3 font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">
              Eligibility
            </h2>
            <ul className="flex list-none flex-col gap-2.5 m-0 p-0">
              {data.eligibility.map((e, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px] leading-snug text-ink-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA bar */}
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-cream p-5">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">
              Ready when you are.
            </div>
            <div className="mt-1 text-sm text-muted">
              Apply yourself, or let our specialists draft the application with you.
            </div>
          </div>
          <Button variant="secondary">Apply yourself</Button>
          <Button
            variant="primary"
            icon={<Sparkles size={16} />}
            iconTrailing={<ArrowRight size={16} />}
            onClick={onApply}
          >
            Apply with OppDate Apply
          </Button>
        </div>
      </div>
    </section>
  )
}
