import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'warn' | 'error' | 'info' | 'ginger' | 'neutral'

interface BadgeProps {
  tone?: Tone
  dot?: boolean
  children: ReactNode
  className?: string
}

const toneStyles: Record<Tone, { wrapper: string; dot: string }> = {
  success: { wrapper: 'bg-success-bg text-success',        dot: 'bg-success' },
  warn:    { wrapper: 'bg-warning-bg text-warning',         dot: 'bg-warning' },
  error:   { wrapper: 'bg-error-bg text-error',             dot: 'bg-error' },
  info:    { wrapper: 'bg-info-bg text-info',               dot: 'bg-info' },
  ginger:  { wrapper: 'bg-ginger-light text-ginger-deep',   dot: 'bg-ginger-dark' },
  neutral: { wrapper: 'bg-white text-ink border border-[var(--border)]', dot: 'bg-muted' },
}

export function Badge({ tone = 'neutral', dot = true, children, className }: BadgeProps) {
  const t = toneStyles[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-[11px] py-[5px] font-sans text-xs font-medium leading-none',
        t.wrapper,
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} />}
      {children}
    </span>
  )
}
