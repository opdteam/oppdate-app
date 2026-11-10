import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: { default: 'Legal', template: '%s | OppDate' },
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--opp-cream)', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(250,243,234,0.88)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderBottom: '1px solid var(--opp-line)',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Image src="/assets/oppdate-monogram.png" alt="OppDate" width={28} height={28} />
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 17, color: 'var(--opp-ink)', letterSpacing: '-0.01em' }}>OppDate</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/legal/terms" style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--opp-ink-2)', textDecoration: 'none', fontWeight: 500 }}>Terms</Link>
            <Link href="/legal/privacy" style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--opp-ink-2)', textDecoration: 'none', fontWeight: 500 }}>Privacy</Link>
            <Link href="/auth/login" style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
              color: '#fff', background: 'var(--opp-ginger-dark)',
              padding: '7px 16px', borderRadius: 999, textDecoration: 'none',
            }}>Sign in</Link>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--opp-line)', padding: '28px 24px', background: 'var(--opp-cream-2)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--opp-mute)' }}>
            &copy; {new Date().getFullYear()} OppDate. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/legal/terms" style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--opp-mute)', textDecoration: 'none' }}>Terms of Service</Link>
            <Link href="/legal/privacy" style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--opp-mute)', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/auth/login" style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--opp-mute)', textDecoration: 'none' }}>Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
