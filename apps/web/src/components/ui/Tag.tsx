import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TagProps {
  accent?: boolean
  children: ReactNode
  className?: string
}

export function Tag({ accent = false, children, className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-[5px] font-sans text-xs font-medium leading-snug border',
        accent
          ? 'bg-ginger-light border-[#e2c9a8] text-ginger-deep'
          : 'bg-white border-[var(--border)] text-ink-2',
        className
      )}
    >
      {children}
    </span>
  )
}
