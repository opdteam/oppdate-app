'use client'

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', padding: 24,
    }}>
      <div style={{
        maxWidth: 380, textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(181, 83, 10, 0.10)', border: '1.5px solid rgba(181, 83, 10, 0.20)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B5530A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 style={{
          fontFamily: 'var(--font-sans, DM Sans, sans-serif)',
          fontSize: 18, fontWeight: 600, color: '#F5E6D8',
          margin: 0,
        }}>Something went wrong</h2>
        <p style={{
          fontFamily: 'var(--font-sans, DM Sans, sans-serif)',
          fontSize: 14, lineHeight: 1.5, color: 'rgba(245, 230, 216, 0.55)',
          margin: 0,
        }}>An error occurred while loading this page.</p>
        <button
          onClick={reset}
          style={{
            marginTop: 4, height: 40, padding: '0 24px',
            borderRadius: 10, border: '1px solid rgba(181, 83, 10, 0.30)',
            background: 'rgba(181, 83, 10, 0.15)', color: '#F0C8A0',
            fontFamily: 'var(--font-sans, DM Sans, sans-serif)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'background 140ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(181, 83, 10, 0.25)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(181, 83, 10, 0.15)')}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
