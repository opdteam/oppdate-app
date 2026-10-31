import '../admin.css'
import { AdminLayout } from '@/components/admin/AdminLayout'

export const metadata = {
  title: 'OppDate Admin',
}

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
