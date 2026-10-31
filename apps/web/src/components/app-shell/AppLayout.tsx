'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useSessionKeepAlive } from '@/hooks/useSessionKeepAlive'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useSessionKeepAlive()

  return (
    <div className="app-stage">
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
