'use client'

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FAF6F1',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 420, width: '100%', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(178, 58, 42, 0.08)', border: '1.5px solid rgba(178, 58, 42, 0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B23A2A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif, Fraunces, Georgia, serif)',
          fontSize: 24, fontWeight: 600, color: '#2A1206',
          margin: 0, letterSpacing: '-0.015em',
        }}>Something went wrong</h1>
        <p style={{
          fontFamily: 'var(--font-sans, DM Sans, sans-serif)',
          fontSize: 15, lineHeight: 1.5, color: '#8C6A55',
          margin: 0,
        }}>An unexpected error occurred. Please try again.</p>
        <button
          onClick={reset}
          style={{
            marginTop: 8, height: 44, padding: '0 28px',
            borderRadius: 12, border: 'none',
            background: '#7A2D05', color: '#fff',
            fontFamily: 'var(--font-sans, DM Sans, sans-serif)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(122, 45, 5, 0.25)',
            transition: 'background 140ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#B5530A')}
          onMouseLeave={e => (e.currentTarget.style.background = '#7A2D05')}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
