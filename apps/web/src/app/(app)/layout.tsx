import '../app.css'
import '../responsive.css'
import { AppLayout } from '@/components/app-shell/AppLayout'

export default function InnerAppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
