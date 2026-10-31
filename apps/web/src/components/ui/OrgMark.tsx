import { useState } from 'react'
import { cn } from '@/lib/utils'

interface OrgMarkProps {
  initials: string
  size?: number
  className?: string
  logoUrl?: string | null
  alt?: string
}

export function OrgMark({ initials, size = 44, className, logoUrl, alt }: OrgMarkProps) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[8px] border border-[var(--border)] bg-cream-2 font-display font-semibold text-ginger-dark',
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4, overflow: 'hidden' }}
    >
      {logoUrl && !imgErr
        ? <img src={logoUrl} alt={alt || initials} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : initials}
    </span>
  )
}
