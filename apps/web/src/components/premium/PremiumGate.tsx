'use client'

import { useState, useCallback } from 'react'
import { useUser } from '@/lib/UserContext'
import { UpgradeModal } from './UpgradeModal'

interface PremiumGateProps {
  children: (props: { openUpgrade: () => void }) => React.ReactNode
  /** If true, renders children regardless of premium status (for soft gates) */
  soft?: boolean
}

/**
 * Wraps any feature that requires premium.
 *
 * Usage (hard gate - renders nothing if not premium):
 *   <PremiumGate>{({ openUpgrade }) => <FeatureComponent onPremiumRequired={openUpgrade} />}</PremiumGate>
 *
 * Usage (soft gate - always renders but gives openUpgrade to trigger modal):
 *   <PremiumGate soft>{({ openUpgrade }) => <FeatureComponent onUpgrade={openUpgrade} />}</PremiumGate>
 *
 * To handle PREMIUM_REQUIRED 403 from an API call, call openUpgrade() in the catch block.
 */
export function PremiumGate({ children, soft = false }: PremiumGateProps) {
  const { isPremium } = useUser()
  const [open, setOpen] = useState(false)

  const openUpgrade = useCallback(() => setOpen(true), [])

  if (!soft && !isPremium) {
    return (
      <>
        {open && <UpgradeModal onClose={() => setOpen(false)} />}
        {children({ openUpgrade })}
      </>
    )
  }

  return (
    <>
      {open && <UpgradeModal onClose={() => setOpen(false)} />}
      {children({ openUpgrade })}
    </>
  )
}

/**
 * Utility: checks if an API error is a PREMIUM_REQUIRED 403.
 * Use in catch blocks to distinguish premium gates from other errors.
 */
export function isPremiumRequiredError(err: unknown): boolean {
  const e = err as { response?: { data?: { code?: string }; status?: number } }
  return (
    e?.response?.data?.code === 'PREMIUM_REQUIRED' ||
    e?.response?.status === 403
  )
}
