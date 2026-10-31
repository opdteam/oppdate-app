'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { AuthField } from '@/components/auth/AuthField'
import { api } from '@/lib/api'
import { setUserToken, clearUserToken } from '@/lib/token'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const inactivity = searchParams.get('reason') === 'inactivity'

  useEffect(() => { clearUserToken() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/v1/auth/login', { email, password: pw })
      const token = res.data?.data?.accessToken
      if (token) setUserToken(token)
      window.location.href = redirect || '/dashboard'
    } catch (err: unknown) {
      setLoading(false)
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
      if (axiosErr.response?.status === 401) {
        setError('Invalid email or password.')
      } else {
        setError(axiosErr.response?.data?.error || 'Login failed')
      }
    }
  }

  return (
    <AuthCard>
      <div className="auth-view">
        <form onSubmit={handleSubmit} noValidate>
          <h1 className="auth-heading">Welcome back</h1>
          <p className="auth-subtext">Log in to continue your applications.</p>

          <GoogleButton onError={msg => setError(msg)} />

          <div className="auth-divider"><span>or</span></div>

          <AuthField
            id="login-email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />

          <AuthField
            id="login-password"
            label="Password"
            placeholder="Your password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            toggle
            autoComplete="current-password"
          />
          <div className="auth-row-link">
            <Link href="/auth/forgot-password">Forgot password?</Link>
          </div>

          {inactivity && !error && <p className="auth-error-msg" style={{ background: 'rgba(212,132,58,0.08)', borderColor: 'rgba(212,132,58,0.3)', color: '#92400E' }}>Your session expired due to inactivity. Please log in again.</p>}
          {error && <p className="auth-error-msg">{error}</p>}

          <button type="submit" className={'auth-btn-primary' + (loading ? ' loading' : '')} aria-busy={loading}>
            {loading ? <span className="auth-spinner" /> : 'Log in'}
          </button>

          <p className="auth-footer">
            Don&apos;t have an account? <Link href={redirect ? `/auth/register?redirect=${encodeURIComponent(redirect)}` : '/auth/register'}>Get started</Link>
          </p>
        </form>
      </div>
    </AuthCard>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
