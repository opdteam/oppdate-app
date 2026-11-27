'use client'

import { useState } from 'react'
import { Toaster } from 'sonner'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useSessionKeepAlive } from '@/hooks/useSessionKeepAlive'
import { useNotificationToasts } from '@/hooks/useNotificationToasts'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useSessionKeepAlive()
  useNotificationToasts()

  return (
    <div className="app-stage">
      <Toaster
        position="top-right"
        offset={16}
        gap={8}
        toastOptions={{
          className: 'opp-toast',
          duration: 6000,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TopBar onToggleSidebar={() => setSidebarOpen(o => !o)} />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="app-body">
          {children}
        </main>
      </div>
    </div>
  )
}
