'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthField } from '@/components/auth/AuthField'
import { api } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      await api.post('/api/v1/auth/forgot-password', { email })
      setSent(true)
    } catch (err: unknown) {
      setLoading(false)
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Something went wrong. Please try again.')
    }
  }

  if (sent) {
    return (
      <AuthCard>
        <div className="auth-view">
          <h1 className="auth-heading">Check your inbox</h1>
          <p className="auth-subtext">If an account exists for that email, a reset link has been sent.</p>
          <p className="auth-footer" style={{ marginTop: 20 }}>
            <Link href="/auth/login">Back to log in</Link>
          </p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <div className="auth-view">
        <form onSubmit={handleSubmit} noValidate>
          <h1 className="auth-heading">Reset your password</h1>
          <p className="auth-subtext">Enter your email and we&apos;ll send you a reset link.</p>

          <AuthField
            id="forgot-email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />

          {error && <p className="auth-error-msg">{error}</p>}

          <button type="submit" className={'auth-btn-primary' + (loading ? ' loading' : '')} aria-busy={loading}>
            {loading ? <span className="auth-spinner" /> : 'Send reset link'}
          </button>

          <p className="auth-footer" style={{ marginTop: 20 }}>
            <Link href="/auth/login">Back to log in</Link>
          </p>
        </form>
      </div>
    </AuthCard>
  )
}
