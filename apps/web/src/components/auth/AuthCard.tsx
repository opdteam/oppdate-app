import Image from 'next/image'

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-card">
      <div className="auth-brand">
        <Image src="/assets/oppdate-monogram.png" alt="" width={42} height={42} />
        <p className="auth-wordmark">
          <span className="opp">Opp</span><span className="date">Date</span>
        </p>
      </div>
      {children}
    </div>
  )
}
