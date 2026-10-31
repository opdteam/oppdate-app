import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FAF6F1',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 440, width: '100%', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        <p style={{
          fontFamily: 'var(--font-serif, Fraunces, Georgia, serif)',
          fontSize: 72, fontWeight: 700, color: 'rgba(122, 45, 5, 0.12)',
          margin: 0, lineHeight: 1, letterSpacing: '-0.03em',
        }}>404</p>
        <h1 style={{
          fontFamily: 'var(--font-serif, Fraunces, Georgia, serif)',
          fontSize: 24, fontWeight: 600, color: '#2A1206',
          margin: 0, letterSpacing: '-0.015em',
        }}>Page not found</h1>
        <p style={{
          fontFamily: 'var(--font-sans, DM Sans, sans-serif)',
          fontSize: 15, lineHeight: 1.5, color: '#8C6A55',
          margin: 0,
        }}>The page you are looking for does not exist or has been moved.</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <Link
            href="/"
            style={{
              height: 44, padding: '0 28px',
              borderRadius: 12, border: 'none',
              background: '#7A2D05', color: '#fff',
              fontFamily: 'var(--font-sans, DM Sans, sans-serif)',
              fontSize: 14, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(122, 45, 5, 0.25)',
            }}
          >
            Go home
          </Link>
          <Link
            href="/opportunities"
            style={{
              height: 44, padding: '0 28px',
              borderRadius: 12,
              border: '1px solid rgba(122, 45, 5, 0.18)',
              background: 'transparent', color: '#7A2D05',
              fontFamily: 'var(--font-sans, DM Sans, sans-serif)',
              fontSize: 14, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            Browse opportunities
          </Link>
        </div>
      </div>
    </div>
  )
}
