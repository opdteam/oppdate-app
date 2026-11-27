'use client'

import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useWebSocket, type WsMessage } from './useWebSocket'

interface NotifPayload {
  id: string
  type: string
  title: string
  body: string
  referenceId?: string | null
  referenceType?: string | null
}

function resolveHref(type: string, referenceType?: string | null, referenceId?: string | null): string | null {
  switch (type) {
    case 'application_status_change':
    case 'document_assistance':
      return referenceId ? `/apply/status?applicationId=${referenceId}` : '/applications'
    case 'new_message':
      return '/messages'
    case 'payment_confirmed':
      if (referenceType === 'application') return referenceId ? `/apply/confirm?applicationId=${referenceId}` : '/applications'
      if (referenceType === 'consultation') return '/dashboard'
      if (referenceType === 'mentorship') return '/dashboard'
      if (referenceType === 'premium') return '/profile'
      return '/dashboard'
    case 'deadline_reminder':
      return '/opportunities'
    case 'consultation_confirmed':
      return '/dashboard'
    case 'mentorship_update':
      return '/dashboard'
    case 'saved_search_alert':
      return '/opportunities'
    default:
      return null
  }
}

// Sound types mapped to notification urgency
const SOUND_TYPES: Record<string, 'soft' | 'alert'> = {
  payment_confirmed: 'alert',
  application_status_change: 'alert',
  deadline_reminder: 'alert',
  new_message: 'soft',
  consultation_confirmed: 'soft',
  mentorship_update: 'soft',
  saved_search_alert: 'soft',
  document_assistance: 'soft',
}

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch {
      return null
    }
  }
  return audioCtx
}

function playNotificationSound(variant: 'soft' | 'alert') {
  const ctx = getAudioCtx()
  if (!ctx) return

  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.connect(ctx.destination)

  if (variant === 'alert') {
    // Two-tone chime: C5 then E5
    const o1 = ctx.createOscillator()
    o1.type = 'sine'
    o1.frequency.value = 523.25 // C5
    o1.connect(gain)
    o1.start(now)
    o1.stop(now + 0.12)

    const o2 = ctx.createOscillator()
    o2.type = 'sine'
    o2.frequency.value = 659.25 // E5
    o2.connect(gain)
    o2.start(now + 0.14)
    o2.stop(now + 0.26)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
  } else {
    // Single soft ping: G5
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 783.99 // G5
    osc.connect(gain)
    osc.start(now)
    osc.stop(now + 0.15)

    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  }
}

export function useNotificationToasts() {
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router

  const onMessage = useCallback((msg: WsMessage) => {
    if (msg.type === 'new_notification') {
      const notif = msg.notification as NotifPayload | undefined
      if (!notif?.title) return

      const href = resolveHref(notif.type, notif.referenceType, notif.referenceId)
      const soundType = SOUND_TYPES[notif.type] ?? 'soft'

      playNotificationSound(soundType)

      toast(notif.title, {
        description: notif.body,
        duration: 6000,
        action: href ? {
          label: 'View',
          onClick: () => routerRef.current.push(href),
        } : undefined,
      })
    }

    if (msg.type === 'new_message') {
      const message = msg.message as { senderType?: string; content?: string } | undefined
      // Only toast for team/system messages, not the user's own messages
      if (!message || message.senderType === 'user') return

      playNotificationSound('soft')

      toast('New message', {
        description: typeof message.content === 'string'
          ? message.content.slice(0, 100) + (message.content.length > 100 ? '...' : '')
          : 'You have a new message',
        duration: 5000,
        action: {
          label: 'Open',
          onClick: () => routerRef.current.push(msg.threadId ? `/messages?thread=${msg.threadId}` : '/messages'),
        },
      })
    }

    if (msg.type === 'application_status_change') {
      const appMsg = msg as WsMessage & { applicationId?: string; status?: string }
      if (!appMsg.status) return

      playNotificationSound('alert')

      const label = appMsg.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      toast('Application update', {
        description: `Your application status changed to: ${label}`,
        duration: 6000,
        action: {
          label: 'View',
          onClick: () => routerRef.current.push(
            appMsg.applicationId
              ? `/apply/status?applicationId=${appMsg.applicationId}`
              : '/applications'
          ),
        },
      })
    }
  }, [])

  useWebSocket(onMessage)
}
