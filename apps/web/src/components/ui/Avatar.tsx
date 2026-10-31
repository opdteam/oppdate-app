import { cn } from '@/lib/utils'

interface AvatarProps {
  initials?: string
  size?: number
  gradient?: boolean
  className?: string
}

export function Avatar({ initials = 'AN', size = 32, gradient = true, className }: AvatarProps) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-sans font-semibold leading-none', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: gradient ? 'var(--opp-grad-ginger)' : 'var(--opp-cream-2)',
        color: gradient ? '#fff' : 'var(--opp-ink)',
      }}
    >
      {initials}
    </span>
  )
}
