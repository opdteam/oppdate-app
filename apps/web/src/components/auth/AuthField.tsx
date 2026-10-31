'use client'

import { useState } from 'react'

const EyeIcon = ({ off }: { off: boolean }) => off ? (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24"/>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

interface AuthFieldProps {
  id: string
  label: string
  type?: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  toggle?: boolean
  invalid?: boolean
  autoComplete?: string
}

export function AuthField({ id, label, type = 'text', placeholder, value, onChange, toggle, invalid, autoComplete }: AuthFieldProps) {
  const [shown, setShown] = useState(false)

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <input
          id={id}
          className={'auth-input' + (toggle ? ' has-toggle' : '') + (invalid ? ' invalid' : '')}
          type={toggle ? (shown ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete || 'off'}
          aria-invalid={invalid || undefined}
        />
        {toggle && (
          <button
            type="button"
            className="auth-toggle-eye"
            onClick={() => setShown(v => !v)}
            aria-label={shown ? 'Hide password' : 'Show password'}
          >
            <EyeIcon off={shown} />
          </button>
        )}
      </div>
    </div>
  )
}
