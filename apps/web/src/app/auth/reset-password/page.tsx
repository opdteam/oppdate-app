'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthField } from '@/components/auth/AuthField'

function getStrength(pw: string): number {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLOR = ['', 'var(--auth-error)', '#C77B1A', '#8B9A2B', '#3A8C4A']

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const strength = useMemo(() => getStrength(password), [password])
  const mismatch = confirm.length > 0 && password !== confirm

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading || password.length < 8 || mismatch || !confirm) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setDone(true)
      setTimeout(() => router.push('/auth/login'), 2000)
    }, 1200)
  }

  if (done) {
    return (
      <AuthCard>
        <div className="auth-view" style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(58, 140, 74, 0.10)', border: '1.5px solid rgba(58, 140, 74, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A8C4A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="auth-heading">Password updated</h1>
          <p className="auth-subtext">Redirecting you to log in...</p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <div className="auth-view">
        <form onSubmit={handleSubmit} noValidate>
          <h1 className="auth-heading">Set a new password</h1>
          <p className="auth-subtext">Choose a strong password for your account.</p>

          <AuthField
            id="reset-pw"
            label="New password"
            placeholder="At least 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            toggle
            autoComplete="new-password"
          />

          {password.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= strength ? STRENGTH_COLOR[strength] : 'rgba(42,18,6,0.10)',
                    transition: 'background 200ms ease',
                  }} />
                ))}
              </div>
              <p style={{
                margin: '4px 0 0', fontSize: 12,
                color: STRENGTH_COLOR[strength],
                fontFamily: 'var(--font-sans)',
              }}>{STRENGTH_LABEL[strength]}</p>
            </div>
          )}

          <AuthField
            id="reset-pw-confirm"
            label="Confirm password"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            toggle
            invalid={mismatch}
            autoComplete="new-password"
          />

          {mismatch && (
            <p className="auth-error-msg" style={{ marginTop: 6 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Passwords do not match
            </p>
          )}

          <button
            type="submit"
            className={'auth-btn-primary' + (loading ? ' loading' : '')}
            aria-busy={loading}
            disabled={password.length < 8 || mismatch || !confirm}
            style={password.length < 8 || mismatch || !confirm ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            {loading ? <span className="auth-spinner" /> : 'Reset password'}
          </button>

          <p className="auth-footer" style={{ marginTop: 20 }}>
            <Link href="/auth/login">Back to log in</Link>
          </p>
        </form>
      </div>
    </AuthCard>
  )
}
