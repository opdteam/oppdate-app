'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { AuthField } from '@/components/auth/AuthField'
import { api } from '@/lib/api'
import { setUserToken, clearUserToken } from '@/lib/token'

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')

  useEffect(() => { clearUserToken() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!confirm || pw !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/v1/auth/register', { email, password: pw, name })
      const token = res.data?.data?.accessToken
      if (token) setUserToken(token)
      window.location.href = redirect || '/onboarding'
    } catch (err: unknown) {
      setLoading(false)
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
      if (axiosErr.response?.status === 409) {
        setError('An account with this email already exists.')
      } else {
        setError(axiosErr.response?.data?.error || 'Registration failed')
      }
    }
  }

  return (
    <AuthCard>
      <div className="auth-view">
        <form onSubmit={handleSubmit} noValidate>
          <h1 className="auth-heading">Create your account</h1>
          <p className="auth-subtext">Join thousands applying to global opportunities.</p>

          <GoogleButton onError={msg => setError(msg)} />

          <div className="auth-divider"><span>or</span></div>

          <AuthField
            id="name"
            label="Full name"
            placeholder="Your full name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
          />

          <AuthField
            id="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />

          <AuthField
            id="password"
            label="Password"
            placeholder="Minimum 8 characters"
            value={pw}
            onChange={e => { setPw(e.target.value); if (mismatch) setMismatch(false) }}
            toggle
            autoComplete="new-password"
          />
          <p className="auth-helper">Use at least 8 characters.</p>

          <AuthField
            id="confirm"
            label="Confirm password"
            placeholder="Repeat your password"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); if (mismatch) setMismatch(false) }}
            toggle
            invalid={mismatch}
            autoComplete="new-password"
          />
          {mismatch && (
            <p className="auth-error-msg"><AlertIcon /> {confirm ? 'Passwords do not match.' : 'Please confirm your password.'}</p>
          )}

          {error && <p className="auth-error-msg">{error}</p>}

          <p style={{ margin: '4px 0 12px', fontSize: 12, color: 'var(--auth-subtext)', textAlign: 'center', lineHeight: 1.6 }}>
            By creating an account you agree to our{' '}
            <Link href="/legal/terms" target="_blank" style={{ color: 'var(--auth-ginger)', textDecoration: 'none', fontWeight: 500 }}>Terms of Service</Link>
            {' '}and{' '}
            <Link href="/legal/privacy" target="_blank" style={{ color: 'var(--auth-ginger)', textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</Link>.
          </p>

          <button type="submit" className={'auth-btn-primary' + (loading ? ' loading' : '')} aria-busy={loading}>
            {loading ? <span className="auth-spinner" /> : 'Create account'}
          </button>

          <p className="auth-footer">
            Already have an account? <Link href={redirect ? `/auth/login?redirect=${encodeURIComponent(redirect)}` : '/auth/login'}>Log in</Link>
          </p>
        </form>
      </div>
    </AuthCard>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
