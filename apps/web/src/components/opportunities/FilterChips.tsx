'use client'

import { useState } from 'react'
import { Filter, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FilterId = 'all' | 'scholarship' | 'internship' | 'graduate' | 'training' | 'funded' | 'afm'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'scholarship', label: 'Scholarships' },
  { id: 'internship',  label: 'Internships' },
  { id: 'graduate',    label: 'Graduate roles' },
  { id: 'training',    label: 'Training' },
  { id: 'funded',      label: 'Funded only' },
  { id: 'afm',         label: 'OppDate Apply' },
]

function Chip({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  icon?: React.ReactNode
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-[7px] font-sans text-[13px] font-medium whitespace-nowrap cursor-pointer transition-all duration-140 ease-out-soft',
        active
          ? 'bg-ginger-dark border-ginger-dark text-white'
          : hover
          ? 'bg-white border-[var(--border)] text-ink-2'
          : 'bg-transparent border-[var(--border)] text-ink-2'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

interface FilterChipsProps {
  filter: FilterId
  setFilter: (f: FilterId) => void
}

export function FilterChips({ filter, setFilter }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip label="Filters" icon={<Filter size={14} />} onClick={() => {}} />
      <div className="mx-1 h-[22px] w-px bg-[var(--border)]" />
      {FILTERS.map((f) => (
        <Chip
          key={f.id}
          label={f.label}
          active={filter === f.id}
          onClick={() => setFilter(f.id)}
        />
      ))}
      <div className="flex-1" />
      <div className="inline-flex cursor-pointer items-center gap-1.5 font-sans text-[13px] text-muted">
        Sort: Deadline soonest <ChevronDown size={14} />
      </div>
    </div>
  )
}
