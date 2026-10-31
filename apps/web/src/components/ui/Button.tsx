'use client'

import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'link'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconTrailing?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconTrailing,
  children,
  className,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-sans font-medium whitespace-nowrap cursor-pointer border transition-all duration-140 ease-out-soft focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50'

  const sizes: Record<Size, string> = {
    sm: 'px-[14px] py-2 text-[13px] rounded-md',
    md: 'px-[18px] py-[11px] text-sm rounded-md',
    lg: 'px-6 py-[14px] text-[15px] rounded-lg',
  }

  const variants: Record<Variant, string> = {
    primary:
      'bg-ginger-dark border-transparent text-white shadow-sm hover:bg-ginger-mid hover:-translate-y-px hover:shadow-ginger active:bg-ginger-deep active:translate-y-0',
    secondary:
      'bg-white border-[var(--border)] text-ink shadow-xs hover:bg-ginger-light hover:border-[#e2c9a8] active:bg-cream-2',
    ghost:
      'bg-transparent border-transparent text-ink-2 hover:bg-cream-2 active:bg-cream-deep',
    link: 'bg-transparent border-transparent p-0 text-ginger-dark underline-offset-4 hover:underline rounded-none',
  }

  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {icon}
      {children}
      {iconTrailing}
    </button>
  )
}
