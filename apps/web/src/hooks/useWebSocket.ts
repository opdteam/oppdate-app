'use client'

import { useEffect, useRef } from 'react'
import { api } from '@/lib/api'

export interface WsMessage {
  type: 'connected' | 'new_message' | 'new_notification' | 'typing' | 'typing_start' | 'typing_stop' | 'document_uploaded' | 'application_status_change'
  threadId?: string
  message?: unknown
  notification?: unknown
  userId?: string
  documentId?: string
  itemId?: string
  status?: string
}

type Listener = (msg: WsMessage) => void

// Module-level singleton state
let socket: WebSocket | null = null
let connected = false
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = 1000
let unmounted = false
const listeners = new Set<Listener>()

// sendEvent is exposed to callers; queues nothing if socket not open
let sendEventFn: (event: object) => void = () => {}

function getWsUrl(ticket: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const wsBase = base.replace(/^https/, 'wss').replace(/^http/, 'ws')
  return `${wsBase}/api/v1/messages/ws?token=${encodeURIComponent(ticket)}`
}

function broadcast(msg: WsMessage) {
  listeners.forEach(fn => fn(msg))
}

function scheduleReconnect() {
  if (unmounted) return
  reconnectTimer = setTimeout(() => {
    if (listeners.size > 0 && !unmounted) {
      openConnection()
    }
  }, reconnectDelay)
  reconnectDelay = Math.min(reconnectDelay * 2, 30000)
}

function openConnection() {
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return

  // Fetch a short-lived ticket via the authenticated HTTP session
  api.get<{ data: { ticket: string } }>('/api/v1/messages/ws-ticket')
    .then(res => {
      const ticket = res.data?.data?.ticket
      if (!ticket) {
        scheduleReconnect()
        return
      }

      const ws = new WebSocket(getWsUrl(ticket))
      socket = ws

      ws.onopen = () => {
        reconnectDelay = 1000
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsMessage
          if (msg.type === 'connected') {
            connected = true
          }
          broadcast(msg)
        } catch {
          // ignore malformed frames
        }
      }

      ws.onclose = () => {
        connected = false
        socket = null
        if (listeners.size > 0) {
          scheduleReconnect()
        }
      }

      ws.onerror = () => {
        connected = false
        ws.close()
      }

      sendEventFn = (event: object) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(event))
        }
      }
    })
    .catch(() => {
      scheduleReconnect()
    })
}

function closeConnection() {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (socket) {
    socket.onclose = null
    socket.close()
    socket = null
  }
  connected = false
  sendEventFn = () => {}
}

export function useWebSocket(onMessage: (msg: WsMessage) => void): {
  sendEvent: (event: object) => void
  connected: boolean
} {
  const cbRef = useRef(onMessage)
  cbRef.current = onMessage

  useEffect(() => {
    unmounted = false

    const listener: Listener = (msg) => cbRef.current(msg)
    listeners.add(listener)

    if (listeners.size === 1) {
      // First subscriber - open the connection
      openConnection()
    }

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) {
        unmounted = true
        closeConnection()
      }
    }
  }, [])

  return {
    sendEvent: (event: object) => sendEventFn(event),
    connected,
  }
}
