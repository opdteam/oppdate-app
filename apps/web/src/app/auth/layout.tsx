import './auth.css'
import { AuthScene } from '@/components/auth/AuthScene'
import { GoogleProvider } from '@/components/auth/GoogleProvider'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GoogleProvider>
      <div className="auth-stage">
        <AuthScene />
        {children}
      </div>
    </GoogleProvider>
  )
}
