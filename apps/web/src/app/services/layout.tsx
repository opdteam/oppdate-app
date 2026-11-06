import '../app.css'
import '../responsive.css'
import { AppLayout } from '@/components/app-shell/AppLayout'

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
