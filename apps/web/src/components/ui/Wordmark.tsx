import { cn } from '@/lib/utils'

interface WordmarkProps {
  size?: number
  className?: string
}

export function Wordmark({ size = 22, className }: WordmarkProps) {
  return (
    <span
      className={cn('inline-flex items-baseline font-display font-semibold tracking-[-0.01em] leading-none', className)}
      style={{ fontSize: size }}
    >
      <span className="wordmark-opp">Opp</span>
      <span className="wordmark-date">Date</span>
    </span>
  )
}
