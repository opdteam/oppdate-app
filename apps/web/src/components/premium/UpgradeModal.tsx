'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'


const FEATURES = [
  'Full access to every opportunity listing',
  'AI eligibility check on any opportunity',
  'OppDate Guide - your personal AI advisor',
  'OppDate Apply - we handle your application',
  'Priority support and early access',
]

const INK = '#2A1206'
const TEXT_SEC = '#8C6A55'
const TEXT_TER = '#6B6660'
const GINGER = '#7A2D05'
const GINGER_MID = '#B5530A'
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

interface UpgradeModalProps {
  onClose: () => void
}

export function UpgradeModal({ onClose }: UpgradeModalProps) {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('yearly')
  const [tier, setTier] = useState<'general' | 'regional'>('general')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const isRegional = tier === 'regional'

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10)
    return () => clearTimeout(t)
  }, [])

  // Fetch pricing tier from backend (IP-based, not spoofable by user)
  useEffect(() => {
    api.get('/api/v1/payments/pricing-tier')
      .then(res => { setTier(res.data?.data?.tier ?? 'general') })
      .catch(() => { /* default to general on failure */ })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const monthlyPrice = isRegional ? 12 : 29
  const yearlyPrice = isRegional ? 99 : 199
  const yearlyMonthly = isRegional ? 8.25 : 16.58
  const yearlySaving = isRegional ? (12 * 12 - 99) : (29 * 12 - 199)

  const handleCheckout = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/v1/payments/checkout', {
        purpose: 'premium',
        plan: interval,
        tier,
      })
      const url = res.data?.data?.checkoutUrl ?? res.data?.data?.url ?? res.data?.url
      if (url) {
        window.location.href = url
      } else {
        setError('Could not start checkout. Please try again.')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [interval, tier])

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px 16px',
    background: 'rgba(42,18,6,0.5)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    opacity: mounted ? 1 : 0,
    transition: `opacity 200ms ${EASE}`,
  }

  const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: 460,
    background: '#FFFAF7',
    borderRadius: 24,
    padding: '32px 28px 28px',
    boxShadow: '0 32px 80px rgba(42,18,6,0.22), 0 4px 16px rgba(42,18,6,0.10)',
    position: 'relative',
    transform: mounted ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
    transition: `transform 260ms ${EASE}, opacity 260ms ${EASE}`,
    opacity: mounted ? 1 : 0,
    maxHeight: '90vh',
    overflowY: 'auto',
  }

  return createPortal(
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-label="Upgrade to Premium">
      <div style={cardStyle} onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(42,18,6,0.06)', border: 'none', cursor: 'pointer',
            borderRadius: 8, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: TEXT_TER, transition: 'background 120ms',
          }}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Lock badge */}
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'rgba(122,45,5,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <Lock size={22} style={{ color: GINGER }} />
        </div>

        {/* Heading */}
        <h2 style={{
          margin: '0 0 6px',
          fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 22,
          color: INK, letterSpacing: '-0.01em',
        }}>
          Unlock all opportunities
        </h2>
        <p style={{
          margin: '0 0 20px',
          fontFamily: 'var(--font-sans)', fontSize: 14, color: TEXT_TER, lineHeight: 1.55,
        }}>
          Every opportunity, every AI tool, OppDate Apply, and priority support. All yours.
        </p>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
          {FEATURES.map(f => (
            <div key={f} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: 'var(--font-sans)', fontSize: 13.5, color: INK,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                background: 'rgba(122,45,5,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Check size={12} style={{ color: GINGER }} strokeWidth={2.5} />
              </div>
              {f}
            </div>
          ))}
        </div>

        {/* Billing toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          background: 'rgba(42,18,6,0.06)', borderRadius: 10, padding: 3,
          marginBottom: 16,
        }}>
          {(['monthly', 'yearly'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setInterval(opt)}
              style={{
                flex: 1, height: 36, borderRadius: 8, border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
                transition: `background 160ms ${EASE}, color 160ms ${EASE}, box-shadow 160ms ${EASE}`,
                background: interval === opt ? '#fff' : 'transparent',
                color: interval === opt ? INK : TEXT_SEC,
                boxShadow: interval === opt ? '0 1px 4px rgba(42,18,6,0.12)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {opt === 'yearly' ? 'Yearly' : 'Monthly'}
              {opt === 'yearly' && (
                <span style={{
                  fontSize: 10.5, fontWeight: 700, color: '#fff',
                  background: GINGER_MID, borderRadius: 4, padding: '1px 5px',
                  letterSpacing: '0.02em',
                }}>
                  SAVE ${yearlySaving}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Price display */}
        <div style={{
          background: 'rgba(122,45,5,0.04)',
          border: `1px solid rgba(122,45,5,0.12)`,
          borderRadius: 14, padding: '18px 20px', marginBottom: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 700,
              color: INK, letterSpacing: '-0.03em', lineHeight: 1,
            }}>
              ${interval === 'monthly' ? monthlyPrice : yearlyMonthly.toFixed(2)}
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: TEXT_SEC }}>
              / month
            </span>
            {interval === 'yearly' && (
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 12.5, color: TEXT_TER,
                marginLeft: 4,
              }}>
                billed ${yearlyPrice}/yr
              </span>
            )}
          </div>

          {/* Region indicator - read only, no override */}
          {isRegional && (
            <div style={{
              marginTop: 10, paddingTop: 10,
              borderTop: '1px solid rgba(42,18,6,0.08)',
              fontFamily: 'var(--font-sans)', fontSize: 12, color: TEXT_TER,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#4B7A3E', display: 'inline-block', flexShrink: 0,
              }} />
              Regional pricing applied automatically
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 10, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.18)',
            fontFamily: 'var(--font-sans)', fontSize: 13, color: '#B91C1C',
          }}>
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', height: 52, borderRadius: 14, border: 'none',
            background: loading ? 'rgba(122,45,5,0.5)' : GINGER,
            color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 15.5, fontWeight: 700,
            boxShadow: loading ? 'none' : '0 4px 16px rgba(122,45,5,0.28)',
            transition: `background 160ms ${EASE}, box-shadow 160ms ${EASE}, transform 120ms ${EASE}`,
            marginTop: 10,
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#5C2104' }}
          onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = GINGER }}
          onMouseDown={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)' }}
          onMouseUp={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        >
          {loading
            ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Starting checkout...</>
            : <>Get Premium <ArrowRight size={16} /></>}
        </button>

        <button
          onClick={onClose}
          style={{
            display: 'block', width: '100%', marginTop: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13, color: TEXT_TER,
            padding: '6px 0', textAlign: 'center',
          }}
        >
          Continue browsing
        </button>
      </div>
    </div>,
    document.body,
  )
}
