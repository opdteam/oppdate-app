'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowLeft, Check, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { setAdminToken } from '@/lib/token'

type View = 'login' | 'forgot' | 'reset' | 'invite'

// Floating particles for ambient depth
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cvs = ref.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    let raf: number
    let w = 0
    let h = 0

    function resize() {
      w = cvs!.width = window.innerWidth
      h = cvs!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: { x: number; y: number; r: number; vx: number; vy: number; a: number; phase: number }[] = []
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1.8 + Math.random() * 3.2,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.2 - Math.random() * 0.35,
        a: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      })
    }

    function draw(t: number) {
      ctx!.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.vx + Math.sin(t * 0.0006 + p.phase) * 0.15
        p.y += p.vy
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w }
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.001 + p.phase)
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(181,83,10,${p.a * (0.6 + 0.4 * pulse)})`
        ctx!.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="adm-auth-particles" />
}

// Animated typing cursor for heading
function TypedHeading({ text, delay = 0 }: { text: string; delay?: number }) {
  const [shown, setShown] = useState(0)
  const [cursorVisible, setCursorVisible] = useState(true)

  useEffect(() => {
    const startTimer = setTimeout(() => {
      let i = 0
      const interval = setInterval(() => {
        i++
        setShown(i)
        if (i >= text.length) clearInterval(interval)
      }, 38)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(startTimer)
  }, [text, delay])

  useEffect(() => {
    const blink = setInterval(() => setCursorVisible(v => !v), 530)
    return () => clearInterval(blink)
  }, [])

  return (
    <h1 className="adm-auth-heading">
      {text.slice(0, shown)}
      <span className="adm-auth-cursor" style={{ opacity: cursorVisible && shown < text.length ? 1 : shown >= text.length ? 0 : 1 }}>|</span>
    </h1>
  )
}

function PasswordInput({ value, onChange, placeholder, id, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder: string; id: string; autoFocus?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="adm-auth-inputwrap">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className="adm-auth-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={id.includes('new') ? 'new-password' : 'current-password'}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="adm-auth-eye"
        onClick={() => setVisible(v => !v)}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

// Strength meter
function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  if (!password) return null

  const labels = ['Weak', 'Fair', 'Good', 'Strong']
  const colors = ['#F87171', '#D97706', '#34D399', '#34D399']

  return (
    <div className="adm-auth-strength">
      <div className="adm-auth-strength-bar">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="adm-auth-strength-seg" style={{ background: i < score ? colors[score - 1] : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <span className="adm-auth-strength-label" style={{ color: colors[score - 1] }}>{labels[score - 1]}</span>
    </div>
  )
}

// Login
function LoginView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit = email.includes('@') && password.length >= 1

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/v1/admin/login', { email, password })
      const user = res.data?.data?.user
      // Persist admin identity so layout and dashboard can display real name/role
      const accessToken = res.data?.data?.accessToken
      if (accessToken) setAdminToken(accessToken)
      localStorage.setItem('oppdate_admin', JSON.stringify({
        name: user.name || user.email,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
      }))
      window.location.href = redirect || '/admin/dashboard'
    } catch (err: unknown) {
      setLoading(false)
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
      if (axiosErr.response?.status === 401) {
        setError('Invalid email or password.')
      } else {
        setError(axiosErr.response?.data?.error || 'Login failed')
      }
    }
  }, [canSubmit, email, password, redirect])

  return (
    <form className="adm-auth-card" onSubmit={handleSubmit}>
      <div className="adm-auth-logo">
        <img src="/assets/oppdate-monogram.png" alt="OppDate" />
      </div>
      <TypedHeading text="Log in to admin" delay={300} />
      <p className="adm-auth-sub">Access the OppDate administration panel</p>

      <div className="adm-auth-fields">
        <div className="adm-auth-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="adm-auth-input"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="you@oppdate.com"
            autoComplete="email"
            autoFocus
          />
        </div>
        <div className="adm-auth-field">
          <label htmlFor="login-pass">Password</label>
          <PasswordInput id="login-pass" value={password} onChange={v => { setPassword(v); setError('') }} placeholder="Enter your password" />
        </div>
        {error && (
          <div className="adm-auth-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <button type="submit" className="adm-auth-submit" disabled={!canSubmit || loading}>
        {loading ? <Loader2 size={16} className="adm-auth-spin" /> : null}
        {loading ? 'Signing in...' : 'Log in'}
      </button>

      <button type="button" className="adm-auth-link" onClick={() => onNavigate('forgot')}>
        Forgot password?
      </button>
    </form>
  )
}

// Forgot password
function ForgotView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return
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
  }, [email])

  return (
    <form className="adm-auth-card" onSubmit={handleSubmit}>
      <div className="adm-auth-logo">
        <img src="/assets/oppdate-monogram.png" alt="OppDate" />
      </div>

      {sent ? (
        <>
          <div className="adm-auth-success-icon"><Check size={28} /></div>
          <TypedHeading text="Check your inbox" delay={100} />
          <p className="adm-auth-sub">If an account exists for that email, a reset link has been sent. Check your inbox and spam folder.</p>
          <button type="button" className="adm-auth-submit" onClick={() => onNavigate('login')}>
            Back to log in
          </button>
        </>
      ) : (
        <>
          <TypedHeading text="Reset your password" delay={300} />
          <p className="adm-auth-sub">Enter your email and we&apos;ll send you a link to reset your password.</p>
          <div className="adm-auth-fields">
            <div className="adm-auth-field">
              <label htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                type="email"
                className="adm-auth-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@oppdate.com"
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>
          {error && (
            <div className="adm-auth-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          <button type="submit" className="adm-auth-submit" disabled={!email.includes('@') || loading}>
            {loading ? <Loader2 size={16} className="adm-auth-spin" /> : null}
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
          <button type="button" className="adm-auth-link adm-auth-back" onClick={() => onNavigate('login')}>
            <ArrowLeft size={14} />Back to log in
          </button>
        </>
      )}
    </form>
  )
}

// Reset password
function ResetView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const match = password.length > 0 && confirm.length > 0 && password === confirm
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = match && password.length >= 8

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      await api.post('/api/v1/auth/reset-password', { token, newPassword: password })
      setLoading(false)
      setDone(true)
      setTimeout(() => router.push('/admin/login'), 2000)
    } catch (err: unknown) {
      setLoading(false)
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Password reset failed. The link may have expired.')
    }
  }, [canSubmit, token, password, router])

  return (
    <form className="adm-auth-card" onSubmit={handleSubmit}>
      <div className="adm-auth-logo">
        <img src="/assets/oppdate-monogram.png" alt="OppDate" />
      </div>

      {done ? (
        <>
          <div className="adm-auth-success-icon"><Check size={28} /></div>
          <TypedHeading text="Password updated" delay={100} />
          <p className="adm-auth-sub">Your password has been reset. Redirecting to log in...</p>
          <div className="adm-auth-redirect-bar"><div className="adm-auth-redirect-fill" /></div>
        </>
      ) : (
        <>
          <TypedHeading text="Set a new password" delay={300} />
          <p className="adm-auth-sub">Choose a strong password for your admin account</p>
          <div className="adm-auth-fields">
            <div className="adm-auth-field">
              <label htmlFor="reset-new">New password</label>
              <PasswordInput id="reset-new" value={password} onChange={setPassword} placeholder="Minimum 8 characters" autoFocus />
              <PasswordStrength password={password} />
            </div>
            <div className="adm-auth-field">
              <label htmlFor="reset-confirm">Confirm password</label>
              <PasswordInput id="reset-confirm" value={confirm} onChange={setConfirm} placeholder="Re-enter your password" />
              {mismatch && (
                <div className="adm-auth-inline-err">
                  <AlertCircle size={12} />Passwords do not match
                </div>
              )}
              {match && password.length >= 8 && (
                <div className="adm-auth-inline-ok">
                  <Check size={12} />Passwords match
                </div>
              )}
            </div>
          </div>
          {error && (
            <div className="adm-auth-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          <button type="submit" className="adm-auth-submit" disabled={!canSubmit || loading}>
            {loading ? <Loader2 size={16} className="adm-auth-spin" /> : null}
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </>
      )}
    </form>
  )
}

// Accept invite
function InviteView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const match = password.length > 0 && confirm.length > 0 && password === confirm
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = match && password.length >= 8 && !!token

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      await api.post('/api/v1/admin/accept-invite', { token, password })
      setDone(true)
      setTimeout(() => router.replace('/admin/login'), 2000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Invalid or expired invite link. Please contact your administrator.')
    } finally {
      setLoading(false)
    }
  }, [canSubmit, token, password, router])

  if (!token) {
    return (
      <div className="adm-auth-card">
        <div className="adm-auth-logo">
          <img src="/assets/oppdate-monogram.png" alt="OppDate" />
        </div>
        <h2 className="adm-auth-heading">Invalid invite link</h2>
        <p className="adm-auth-sub">This invite link is missing a token. Please use the link from your invitation email.</p>
        <button className="adm-auth-submit" onClick={() => router.replace('/admin/login')}>Back to login</button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="adm-auth-card">
        <div className="adm-auth-logo">
          <img src="/assets/oppdate-monogram.png" alt="OppDate" />
        </div>
        <div className="adm-auth-success-icon"><Check size={28} /></div>
        <h2 className="adm-auth-heading">Password set</h2>
        <p className="adm-auth-sub">Your account is ready. Redirecting you to the admin panel...</p>
      </div>
    )
  }

  return (
    <form className="adm-auth-card" onSubmit={handleSubmit}>
      <div className="adm-auth-logo">
        <img src="/assets/oppdate-monogram.png" alt="OppDate" />
      </div>
      <TypedHeading text="Welcome to OppDate" delay={300} />
      <p className="adm-auth-sub">
        You have been invited to the OppDate admin panel. Set a password to activate your account.
      </p>

      {error && (
        <div className="adm-auth-error">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <div className="adm-auth-fields">
        <div className="adm-auth-field">
          <label htmlFor="invite-new">Password</label>
          <PasswordInput id="invite-new" value={password} onChange={setPassword} placeholder="Minimum 8 characters" autoFocus />
          <PasswordStrength password={password} />
        </div>
        <div className="adm-auth-field">
          <label htmlFor="invite-confirm">Confirm password</label>
          <PasswordInput id="invite-confirm" value={confirm} onChange={setConfirm} placeholder="Re-enter your password" />
          {mismatch && (
            <div className="adm-auth-inline-err">
              <AlertCircle size={12} />Passwords do not match
            </div>
          )}
          {match && password.length >= 8 && (
            <div className="adm-auth-inline-ok">
              <Check size={12} />Passwords match
            </div>
          )}
        </div>
      </div>

      <button type="submit" className="adm-auth-submit" disabled={!canSubmit || loading}>
        {loading ? <Loader2 size={16} className="adm-auth-spin" /> : null}
        {loading ? 'Setting up your account...' : 'Set password and continue'}
      </button>
    </form>
  )
}

function AdminLoginInner() {
  const [view, setView] = useState<View>('login')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="adm-auth-stage">
      <div className="adm-auth-bg" />
      {mounted && <Particles />}
      <div className="adm-auth-center" key={view}>
        {view === 'login' && <LoginView onNavigate={setView} />}
        {view === 'forgot' && <ForgotView onNavigate={setView} />}
      </div>
      <div className="adm-auth-footer">
        <span className="adm-auth-foottext">OppDate Admin Panel</span>
      </div>
    </div>
  )
}

export function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginInner />
    </Suspense>
  )
}

export function AdminForgotPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return (
    <div className="adm-auth-stage">
      <div className="adm-auth-bg" />
      {mounted && <Particles />}
      <div className="adm-auth-center">
        <ForgotView onNavigate={() => window.location.href = '/admin/login'} />
      </div>
      <div className="adm-auth-footer">
        <span className="adm-auth-foottext">OppDate Admin Panel</span>
      </div>
    </div>
  )
}

export function AdminResetPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return (
    <div className="adm-auth-stage">
      <div className="adm-auth-bg" />
      {mounted && <Particles />}
      <div className="adm-auth-center">
        <Suspense>
          <ResetView />
        </Suspense>
      </div>
      <div className="adm-auth-footer">
        <span className="adm-auth-foottext">OppDate Admin Panel</span>
      </div>
    </div>
  )
}

export function AdminInvitePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return (
    <div className="adm-auth-stage">
      <div className="adm-auth-bg" />
      {mounted && <Particles />}
      <div className="adm-auth-center">
        <Suspense>
          <InviteView />
        </Suspense>
      </div>
      <div className="adm-auth-footer">
        <span className="adm-auth-foottext">OppDate Admin Panel</span>
      </div>
    </div>
  )
}
