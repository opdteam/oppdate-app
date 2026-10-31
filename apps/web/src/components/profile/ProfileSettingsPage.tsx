'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { keys, fetchers } from '@/lib/queries'
import { createPortal } from 'react-dom'
import {
  User,
  Shield,
  Bell,
  Globe,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Lock,
  Check,
  AlertCircle,
  X,
  Upload,
  Smile,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react'
import { api } from '@/lib/api'
import { clearUserToken } from '@/lib/token'
import { useUser } from '@/lib/UserContext'

type AvatarPreset = { id: string; url: string; label: string }

// ============================================================
// AvatarEditorModal
// Two tabs: "Upload photo" (canvas crop) and "Choose avatar" (presets)
// ============================================================

function AvatarEditorModal({
  initials,
  currentUrl,
  onClose,
  onSave,
}: {
  initials: string
  currentUrl: string | null
  onClose: () => void
  // previewUrl: local blob for immediate display; dbUrl: R2 URL stored in DB
  onSave: (previewUrl: string, dbUrl: string) => void
}) {
  const [tab, setTab] = useState<'upload' | 'preset'>('upload')
  // imgEl holds the decoded HTMLImageElement so drawCanvas never needs to re-decode
  const imgEl = useRef<HTMLImageElement | null>(null)
  const [hasImage, setHasImage] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [fitZoom, setFitZoom] = useState(1) // minimum zoom = image fills circle
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const { data: presetsData } = useQuery<{ data: AvatarPreset[] }>({
    queryKey: ['avatar-presets'],
    queryFn: () => api.get('/api/v1/auth/avatar-presets').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
  const presets: AvatarPreset[] = presetsData?.data ?? []

  useEffect(() => { setMounted(true) }, [])

  // Canvas size: fixed 280 px circle crop area
  const CANVAS = 280

  // Draw synchronously using the already-loaded imgEl ref
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgEl.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS, CANVAS)
    ctx.save()
    ctx.beginPath()
    ctx.arc(CANVAS / 2, CANVAS / 2, CANVAS / 2, 0, Math.PI * 2)
    ctx.clip()
    const scaledW = img.naturalWidth * zoom
    const scaledH = img.naturalHeight * zoom
    const dx = (CANVAS - scaledW) / 2 + offset.x
    const dy = (CANVAS - scaledH) / 2 + offset.y
    ctx.drawImage(img, dx, dy, scaledW, scaledH)
    ctx.restore()
  }, [zoom, offset])

  useEffect(() => { drawCanvas() }, [drawCanvas])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadErr('Only JPEG, PNG, and WebP images are allowed.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadErr('Please choose an image under 10 MB.')
      return
    }
    setUploadErr(null)
    const url = URL.createObjectURL(file)
    const tmp = new Image()
    tmp.onload = () => {
      // fit-zoom: smallest zoom that fills the circle with no gaps
      const fit = Math.max(CANVAS / tmp.naturalWidth, CANVAS / tmp.naturalHeight)
      imgEl.current = tmp
      setFitZoom(fit)
      setZoom(fit)
      setOffset({ x: 0, y: 0 })
      setHasImage(true)
    }
    tmp.src = url
    if (fileRef.current) fileRef.current.value = ''
  }

  // Mouse drag
  const onMouseDown = (e: React.MouseEvent) => {
    if (!hasImage) return
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
      y: dragStart.current.oy + (e.clientY - dragStart.current.my),
    })
  }
  const onMouseUp = () => { setDragging(false); dragStart.current = null }

  // Touch drag
  const touchStart = useRef<{ tx: number; ty: number; ox: number; oy: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    if (!hasImage || e.touches.length !== 1) return
    touchStart.current = { tx: e.touches[0].clientX, ty: e.touches[0].clientY, ox: offset.x, oy: offset.y }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || e.touches.length !== 1) return
    setOffset({
      x: touchStart.current.ox + (e.touches[0].clientX - touchStart.current.tx),
      y: touchStart.current.oy + (e.touches[0].clientY - touchStart.current.ty),
    })
  }

  // Wheel zoom and touch-move preventDefault must be registered non-passively
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (!hasImage) return
      e.preventDefault()
      setZoom(z => Math.min(Math.max(z - e.deltaY * 0.001, fitZoom), fitZoom * 4))
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart.current || e.touches.length !== 1) return
      e.preventDefault()
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('touchmove', handleTouchMove)
    }
  }, [hasImage, fitZoom])

  const resetCrop = () => {
    setZoom(fitZoom)
    setOffset({ x: 0, y: 0 })
  }

  // Export cropped canvas to Blob → upload
  const handleUploadCropped = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setUploading(true)
    setUploadErr(null)
    canvas.toBlob(async (blob) => {
      if (!blob) { setUploading(false); setUploadErr('Failed to process image.'); return }
      try {
        const form = new FormData()
        form.append('file', blob, 'avatar.jpg')
        const res = await api.post<{ data: { avatarUrl: string } }>('/api/v1/auth/me/avatar', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const dbUrl = res.data?.data?.avatarUrl
        if (dbUrl) { onSave(dbUrl, dbUrl); onClose() }
        else setUploadErr('Upload failed.')
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setUploadErr(msg || 'Upload failed. Please try again.')
      } finally {
        setUploading(false)
      }
    }, 'image/jpeg', 0.92)
  }

  // Use preset → save URL directly (no upload, it's already on R2)
  const handleUsePreset = async () => {
    if (!selectedPreset) return
    setUploading(true)
    setUploadErr(null)
    try {
      await api.patch('/api/v1/auth/me', { avatarUrl: selectedPreset })
      onSave(selectedPreset, selectedPreset)
      onClose()
    } catch {
      setUploadErr('Failed to save. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (!mounted) return null

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(20,8,2,0.62)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'ebFade 180ms ease both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          borderRadius: 20,
          background: 'rgba(255,252,248,0.97)',
          backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.10)',
          border: '1px solid rgba(255,255,255,0.8)',
          overflow: 'hidden',
          animation: 'ebRise 260ms var(--ease-out-soft) both',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 0',
        }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: 'var(--app-ink)' }}>
            Change profile photo
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            color: 'var(--app-helper)', display: 'flex', borderRadius: 8,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, padding: '14px 20px 0' }}>
          {([['upload', Upload, 'Upload photo'], ['preset', Smile, 'Choose avatar']] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: tab === id ? 600 : 400,
                background: tab === id ? 'rgba(122,45,5,0.09)' : 'transparent',
                color: tab === id ? 'var(--app-ginger)' : 'var(--app-helper)',
                transition: 'all 150ms var(--app-ease)',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px 20px 20px' }}>
          {/* ---- UPLOAD TAB ---- */}
          {tab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              {/* Canvas crop area */}
              <div style={{ position: 'relative' }}>
                <canvas
                  ref={canvasRef}
                  width={CANVAS}
                  height={CANVAS}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={() => { touchStart.current = null }}
                  style={{
                    width: CANVAS, height: CANVAS,
                    borderRadius: '50%',
                    border: hasImage ? '2.5px solid rgba(122,45,5,0.25)' : '2.5px dashed rgba(122,45,5,0.18)',
                    cursor: hasImage ? (dragging ? 'grabbing' : 'grab') : 'default',
                    background: hasImage ? 'transparent' : 'rgba(212,132,58,0.05)',
                    display: 'block',
                    touchAction: 'none',
                  }}
                />
                {/* Empty state inside canvas when no image */}
                {!hasImage && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, pointerEvents: 'none',
                  }}>
                    {currentUrl ? (
                      <img src={currentUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', opacity: 0.4 }} />
                    ) : (
                      <>
                        <span style={{
                          width: CANVAS, height: CANVAS, borderRadius: '50%', position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-sans)', fontSize: 56, fontWeight: 600,
                          color: 'rgba(122,45,5,0.18)', letterSpacing: '-2px',
                        }}>{initials}</span>
                      </>
                    )}
                    <div style={{
                      position: 'absolute', bottom: 28,
                      fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(122,45,5,0.5)', textAlign: 'center',
                    }}>
                      Select a photo below
                    </div>
                  </div>
                )}
              </div>

              {/* Zoom controls (only shown after image loaded) */}
              {hasImage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: CANVAS }}>
                  <button onClick={() => setZoom(z => Math.max(z - fitZoom * 0.15, fitZoom))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--app-helper)', display: 'flex' }}>
                    <ZoomOut size={16} />
                  </button>
                  <input
                    type="range"
                    min={Math.round(fitZoom * 100)}
                    max={Math.round(fitZoom * 400)}
                    value={Math.round(zoom * 100)}
                    onChange={e => setZoom(Number(e.target.value) / 100)}
                    style={{ flex: 1, accentColor: 'var(--app-ginger)' }}
                  />
                  <button onClick={() => setZoom(z => Math.min(z + fitZoom * 0.15, fitZoom * 4))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--app-helper)', display: 'flex' }}>
                    <ZoomIn size={16} />
                  </button>
                  <button onClick={resetCrop} title="Reset position" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--app-helper)', display: 'flex' }}>
                    <RotateCcw size={14} />
                  </button>
                </div>
              )}

              {hasImage && (
                <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-helper)', textAlign: 'center' }}>
                  Drag to reposition - scroll or use slider to zoom
                </p>
              )}

              {/* Select file button */}
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  height: 38, padding: '0 20px', borderRadius: 10,
                  border: '1.5px dashed rgba(122,45,5,0.30)', background: 'rgba(212,132,58,0.05)',
                  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                  color: 'var(--app-ginger)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                  transition: 'background 150ms ease',
                }}
              >
                <Upload size={14} /> {hasImage ? 'Choose different photo' : 'Select photo'}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onFileChange} />

              {uploadErr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 13, color: '#B91C1C' }}>
                  <AlertCircle size={14} /> {uploadErr}
                </div>
              )}
            </div>
          )}

          {/* ---- PRESET TAB ---- */}
          {tab === 'preset' && (
            <div>
              <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--app-text-sec)' }}>
                Pick one of our illustrated profile avatars.
              </p>
              {presets.length === 0 && (
                <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--app-helper)', textAlign: 'center' }}>
                  No presets available yet.
                </p>
              )}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10,
                maxHeight: 260, overflowY: 'auto', paddingRight: 2,
              }}>
                {presets.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPreset(p.url)}
                    title={p.label}
                    style={{
                      position: 'relative', width: '100%', aspectRatio: '1',
                      borderRadius: '50%', border: selectedPreset === p.url
                        ? '3px solid var(--app-ginger)'
                        : '3px solid transparent',
                      padding: 0, cursor: 'pointer', overflow: 'hidden',
                      boxShadow: selectedPreset === p.url ? '0 0 0 2px rgba(122,45,5,0.18)' : 'none',
                      transition: 'border-color 130ms ease, box-shadow 130ms ease',
                      background: 'var(--app-hairline)',
                    }}
                  >
                    <img src={p.url} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {selectedPreset === p.url && (
                      <div style={{
                        position: 'absolute', bottom: 2, right: 2,
                        width: 16, height: 16, borderRadius: '50%',
                        background: 'var(--app-ginger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={9} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {uploadErr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontFamily: 'var(--font-sans)', fontSize: 13, color: '#B91C1C' }}>
                  <AlertCircle size={14} /> {uploadErr}
                </div>
              )}
            </div>
          )}

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--app-hairline)' }}>
            <button onClick={onClose} style={{
              height: 38, padding: '0 18px', borderRadius: 10,
              border: '1px solid var(--app-hairline)', background: 'transparent',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
              color: 'var(--app-ink-body)', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button
              onClick={tab === 'upload' ? handleUploadCropped : handleUsePreset}
              disabled={uploading || (tab === 'upload' ? !hasImage : !selectedPreset)}
              style={{
                height: 38, padding: '0 22px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                color: '#fff', cursor: uploading || (tab === 'upload' ? !hasImage : !selectedPreset) ? 'default' : 'pointer',
                opacity: uploading || (tab === 'upload' ? !hasImage : !selectedPreset) ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 7,
                transition: 'opacity 150ms ease',
              }}
            >
              {uploading ? (
                <>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Saving...
                </>
              ) : (
                tab === 'upload' ? 'Use this photo' : 'Use this avatar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

function useIsMobile(bp = 960) {
  const [m, setM] = useState<boolean | null>(null)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    setM(mq.matches)
    const h = (e: MediaQueryListEvent) => setM(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [bp])
  return m
}

type TabId = 'profile' | 'account' | 'notifications'

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'account', label: 'Account', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

interface UserPreferences {
  bio?: string
  location?: string
  fieldOfStudy?: string
  educationLevel?: string
  role?: number | null
  interests?: number[]
  goal?: number | null
  country?: string
  nationality?: string
  skipped?: boolean
  [key: string]: unknown
}

interface ApiUser {
  id: string
  name: string
  email: string
  isPremium: boolean
  avatarUrl?: string | null
  isEmailVerified: boolean
  passwordHash?: string | null
  preferences?: UserPreferences | null
}

function ProfileSkeleton({ mob }: { mob: boolean }) {
  return (
    <div className="skel-wrap" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>
      <div style={{ marginBottom: mob ? 20 : 28 }}>
        <div className="skel skel-line w40" style={{ height: mob ? 24 : 28, marginBottom: 8 }} />
        <div className="skel skel-line w25" style={{ height: 13 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {[70, 70, 100].map((w, i) => <div key={i} className="skel skel-pill" style={{ width: w }} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
          <div className="skel skel-circle" style={{ width: 72, height: 72 }} />
          <div style={{ flex: 1 }}>
            <div className="skel skel-line w40" style={{ height: 16, marginBottom: 8 }} />
            <div className="skel skel-line w25" style={{ height: 12 }} />
          </div>
        </div>
        {[0, 1, 2, 3].map(i => (
          <div key={i}>
            <div className="skel skel-line w20" style={{ height: 11, marginBottom: 8 }} />
            <div className="skel" style={{ height: 46, borderRadius: 12, width: '100%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const mob = useIsMobile()
  const qc = useQueryClient()
  const { refetch: refetchUser } = useUser()

  const { data: user = null, isLoading: loading } = useQuery({
    queryKey: keys.me,
    queryFn: fetchers.me,
    staleTime: 5 * 60 * 1000,
  })

  const setUser = (u: ApiUser) => qc.setQueryData(keys.me, u)

  if (loading || mob === null) return <ProfileSkeleton mob={false} />

  return (
    <div
      className="r-profile-wrap"
      style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}
    >
      <div style={{ marginBottom: mob ? 20 : 28 }}>
        <h1 style={{
          margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 600,
          fontSize: mob ? 24 : 28, letterSpacing: '-0.01em', color: 'var(--app-ink)',
        }}>
          Profile & Settings
        </h1>
        <p style={{
          margin: '4px 0 0', fontFamily: 'var(--font-sans)',
          fontSize: mob ? 13 : 14, color: 'var(--app-text-sec)',
        }}>
          Manage your account, security, and notification preferences.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 6 : 8, marginBottom: mob ? 20 : 28, flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: mob ? '7px 14px' : '8px 20px', borderRadius: 999, cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: active ? 'var(--app-ginger)' : 'transparent',
                border: active ? '1px solid var(--app-ginger)' : '1px solid var(--app-hairline)',
                fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 14,
                fontWeight: active ? 600 : 400,
                color: active ? '#fff' : 'var(--app-ink-body)',
                transition: 'all 140ms var(--app-ease)',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'profile' && <ProfileTab mob={mob} user={user} onUserUpdate={setUser} onGlobalUserUpdate={refetchUser} />}
      {activeTab === 'account' && <AccountTab mob={mob} user={user} />}
      {activeTab === 'notifications' && <NotificationsTab mob={mob} user={user} />}
    </div>
  )
}

// ============================================================
// Shared primitives
// ============================================================

function Card({ heading, danger, children, mob }: {
  heading: string; danger?: boolean; children: React.ReactNode; mob?: boolean
}) {
  return (
    <div style={{
      borderRadius: mob ? 14 : 16,
      background: 'rgba(255,255,255,0.55)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      border: danger ? '1px solid rgba(220,38,38,0.25)' : '1px solid rgba(255,255,255,0.70)',
      boxShadow: 'var(--app-card-shadow)',
      padding: mob ? 16 : 24,
      marginBottom: mob ? 14 : 20,
    }}>
      <h2 style={{
        fontFamily: 'var(--font-sans)', fontSize: mob ? 15 : 16, fontWeight: 600,
        color: danger ? '#B91C1C' : 'var(--app-ink)', margin: mob ? '0 0 16px' : '0 0 20px',
      }}>
        {heading}
      </h2>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13,
      fontWeight: 500, color: 'var(--app-ink)', marginBottom: 6,
    }}>
      {children}
    </label>
  )
}

function FieldInput({
  value, onChange, placeholder, type = 'text', disabled, prefix,
}: {
  value: string; onChange?: (v: string) => void; placeholder?: string;
  type?: string; disabled?: boolean; prefix?: React.ReactNode
}) {
  return (
    <div style={{ position: 'relative' }}>
      {prefix && (
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%', height: 42, padding: prefix ? '0 14px 0 36px' : '0 14px',
          borderRadius: 10, border: '1px solid var(--app-hairline)',
          background: disabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
          fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--app-ink)',
          outline: 'none', boxSizing: 'border-box',
          opacity: disabled ? 0.7 : 1,
        }}
      />
    </div>
  )
}

function PasswordField({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', height: 42, padding: '0 42px 0 14px',
          borderRadius: 10, border: '1px solid var(--app-hairline)',
          background: 'rgba(255,255,255,0.6)',
          fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--app-ink)',
          outline: 'none', boxSizing: 'border-box',
        }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          color: 'var(--app-helper)', display: 'flex',
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

function SaveButton({
  children, onClick, loading: busy, disabled,
}: {
  children: React.ReactNode; onClick?: () => void; loading?: boolean; disabled?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        marginTop: 20, height: 42, padding: '0 24px', borderRadius: 12, border: 'none',
        background: hover && !disabled && !busy
          ? 'linear-gradient(135deg, #C07630 0%, #6A2504 100%)'
          : 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
        color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
        cursor: disabled || busy ? 'default' : 'pointer',
        opacity: disabled || busy ? 0.7 : 1,
        boxShadow: hover && !disabled && !busy ? '0 6px 20px rgba(122,45,5,0.36)' : '0 3px 12px rgba(122,45,5,0.26)',
        transform: hover && !disabled && !busy ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'background 160ms ease, box-shadow 160ms ease, transform 160ms ease',
      }}
    >
      {busy ? 'Saving...' : children}
    </button>
  )
}

function StatusMsg({ type, text }: { type: 'success' | 'error'; text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7, marginTop: 12,
      fontFamily: 'var(--font-sans)', fontSize: 13,
      color: type === 'success' ? '#15803D' : '#B91C1C',
    }}>
      {type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
      {text}
    </div>
  )
}

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', padding: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? 'var(--app-ginger)' : 'var(--app-hairline)',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 140ms var(--app-ease)',
        display: 'flex', alignItems: 'center', flexShrink: 0,
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transform: on ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 140ms var(--app-ease)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  )
}

// ============================================================
// Password strength
// ============================================================

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'rgba(122,45,5,0.08)' }
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 1) return { score: 1, label: 'Weak', color: '#EF4444' }
  if (s === 2) return { score: 2, label: 'Fair', color: '#F59E0B' }
  if (s === 3) return { score: 3, label: 'Good', color: '#10B981' }
  return { score: 4, label: 'Strong', color: 'var(--app-teal)' }
}

// ============================================================
// Profile Tab
// ============================================================

function ProfileTab({ mob, user, onUserUpdate, onGlobalUserUpdate }: {
  mob?: boolean
  user: ApiUser | null
  onUserUpdate: (u: ApiUser) => void
  onGlobalUserUpdate: () => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(user?.name || '')
  const [location, setLocation] = useState(user?.preferences?.location || '')
  const [bio, setBio] = useState(user?.preferences?.bio || '')
  const [fieldOfStudy, setFieldOfStudy] = useState(user?.preferences?.fieldOfStudy || '')
  const [educationLevel, setEducationLevel] = useState(user?.preferences?.educationLevel || '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete('/api/v1/auth/me')
    } catch {
      setDeleteError('Failed to delete account. Please try again.')
      setDeleting(false)
      return
    }
    // Cancel all in-flight queries and wipe the cache before navigating
    // so no 401 interceptor fires after the token is cleared
    await qc.cancelQueries()
    qc.clear()
    clearUserToken()
    window.location.replace('/')
  }
  const [avatarImgErr, setAvatarImgErr] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)

  const handleAvatarSaved = (previewUrl: string, dbUrl: string) => {
    setAvatarPreview(previewUrl)
    setAvatarImgErr(false)
    onUserUpdate({ ...user!, avatarUrl: dbUrl })
    onGlobalUserUpdate()
  }

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setStatus({ type: 'error', text: 'Name must be at least 2 characters.' })
      return
    }
    setSaving(true)
    setStatus(null)
    try {
      const res = await api.patch<{ data: ApiUser }>('/api/v1/auth/me', {
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        fieldOfStudy: fieldOfStudy.trim(),
        educationLevel: educationLevel.trim(),
      })
      const updated = res.data?.data
      if (updated) onUserUpdate({ ...user!, ...updated })
      onGlobalUserUpdate()
      setStatus({ type: 'success', text: 'Profile saved.' })
    } catch {
      setStatus({ type: 'error', text: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const sz = mob ? 60 : 72
  const initials = (user?.name || 'U').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'U'

  return (
    <div>
      {editorOpen && (
        <AvatarEditorModal
          initials={initials}
          currentUrl={avatarPreview}
          onClose={() => setEditorOpen(false)}
          onSave={handleAvatarSaved}
        />
      )}
      <Card heading="Profile" mob={mob}>
        <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 14 : 20, marginBottom: mob ? 18 : 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Avatar circle — clickable */}
            <div
              onClick={() => setEditorOpen(true)}
              style={{ position: 'relative', width: sz, height: sz, cursor: 'pointer' }}
            >
              {avatarPreview && !avatarImgErr ? (
                <img
                  src={avatarPreview}
                  alt="Profile"
                  onError={() => setAvatarImgErr(true)}
                  style={{ width: sz, height: sz, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <span style={{
                  width: sz, height: sz, borderRadius: '50%',
                  background: 'var(--app-amber)', color: '#fff', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)',
                  fontSize: mob ? 18 : 22, fontWeight: 600,
                }}>
                  {initials}
                </span>
              )}
              {/* Hover overlay */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.30)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 150ms ease',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >
                <Upload size={16} color="#fff" />
              </div>
            </div>

            <button
              onClick={() => setEditorOpen(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--app-ginger)',
              }}
            >
              Change photo
            </button>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--app-ink)' }}>
              {user?.name || ''}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--app-text-sec)', marginTop: 3 }}>
              {user?.email || ''}
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', marginTop: 8, height: 20, padding: '0 9px',
              borderRadius: 999, background: 'rgba(212,132,58,0.15)', color: 'var(--app-ginger-mid)',
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, lineHeight: 1,
            }}>
              {user?.isPremium ? 'Premium plan' : 'Free plan'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Label>Full name</Label>
            <FieldInput value={name} onChange={setName} placeholder="Your full name" />
          </div>
          <div>
            <Label>Email address</Label>
            <FieldInput value={user?.email || ''} disabled />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-helper)', marginTop: 4, display: 'block' }}>
              Changing your email requires verification.
            </span>
          </div>
          <div>
            <Label>Location</Label>
            <FieldInput
              value={location}
              onChange={setLocation}
              placeholder="e.g. Lagos, Nigeria"
              prefix={<Globe size={16} style={{ color: 'var(--app-helper)' }} />}
            />
          </div>
          <div>
            <Label>Education level</Label>
            <select
              value={educationLevel}
              onChange={e => setEducationLevel(e.target.value)}
              style={{
                width: '100%', height: 42, padding: '0 14px',
                borderRadius: 10, border: '1px solid var(--app-hairline)',
                background: 'rgba(255,255,255,0.6)',
                fontFamily: 'var(--font-sans)', fontSize: 14, color: educationLevel ? 'var(--app-ink)' : 'var(--app-helper)',
                outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
              }}
            >
              <option value="">Select education level</option>
              <option value="Undergraduate Student">Undergraduate Student</option>
              <option value="Postgraduate Student (Master's)">Postgraduate Student (Master's)</option>
              <option value="PhD / Research Student">PhD / Research Student</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <Label>Field of study</Label>
            <FieldInput
              value={fieldOfStudy}
              onChange={setFieldOfStudy}
              placeholder="e.g. Computer Science, Economics"
            />
          </div>
          <div>
            <Label>Bio</Label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell us a little about yourself..."
              rows={3}
              maxLength={500}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid var(--app-hairline)', background: 'rgba(255,255,255,0.6)',
                fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--app-ink)',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-text-sec)', marginTop: 4, display: 'block' }}>
              Shown on your public profile.
            </span>
          </div>
        </div>

        {status && <StatusMsg type={status.type} text={status.text} />}
        <SaveButton onClick={handleSave} loading={saving}>Save changes</SaveButton>
      </Card>

      <Card heading="Danger Zone" danger mob={mob}>
        <div className="r-profile-danger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.5, color: 'var(--app-ink-body)' }}>
            Permanently delete your account and all associated data. This cannot be undone.
          </span>
          <button onClick={() => setShowDeleteModal(true)} style={{
            flexShrink: 0, height: 36, padding: '0 16px', borderRadius: 8, cursor: 'pointer',
            border: '1px solid #B91C1C', background: 'transparent', color: '#B91C1C',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
          }}>
            Delete account
          </button>
        </div>
      </Card>

      {showDeleteModal && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(28,28,28,0.48)' }} onClick={() => { if (!deleting) setShowDeleteModal(false) }} />
          <div style={{
            position: 'fixed', zIndex: 201, top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 380, maxWidth: '90vw', borderRadius: 16, background: '#fff',
            border: '1px solid rgba(216,204,196,0.5)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', padding: 28,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(185,28,28,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={18} style={{ color: '#B91C1C' }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 700, color: 'var(--app-ink)', marginBottom: 6 }}>Delete your account?</div>
                <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.6, color: 'var(--app-ink-body)' }}>
                  This will permanently delete your account, all your applications, saved opportunities, documents, and messages. This action <strong>cannot be undone</strong>.
                </p>
              </div>
            </div>
            {deleteError && (
              <p style={{ margin: '0 0 12px', fontFamily: 'var(--font-sans)', fontSize: 12, color: '#B91C1C' }}>{deleteError}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteError('') }}
                disabled={deleting}
                style={{ height: 36, padding: '0 16px', borderRadius: 8, border: '1px solid rgba(216,204,196,0.6)', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--app-ink)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{ height: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: '#B91C1C', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Deleting...' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ============================================================
// Account Tab
// ============================================================

function AccountTab({ mob, user }: { mob?: boolean; user: ApiUser | null }) {
  // Password change
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwStatus, setPwStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const strength = passwordStrength(newPw)

  const handlePasswordChange = async () => {
    setPwStatus(null)
    if (!currentPw) { setPwStatus({ type: 'error', text: 'Enter your current password.' }); return }
    if (newPw.length < 8) { setPwStatus({ type: 'error', text: 'New password must be at least 8 characters.' }); return }
    if (newPw !== confirmPw) { setPwStatus({ type: 'error', text: 'Passwords do not match.' }); return }

    setPwSaving(true)
    try {
      await api.post('/api/v1/auth/me/password', { currentPassword: currentPw, newPassword: newPw })
      setPwStatus({ type: 'success', text: 'Password updated successfully.' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setPwStatus({ type: 'error', text: msg || 'Failed to update password.' })
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div>
      <Card heading="Change password" mob={mob}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Label>Current password</Label>
            <PasswordField value={currentPw} onChange={setCurrentPw} placeholder="Enter current password" />
          </div>
          <div>
            <Label>New password</Label>
            <PasswordField value={newPw} onChange={setNewPw} placeholder="Minimum 8 characters" />
            {newPw && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--app-helper)' }}>Password strength</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: strength.color }}>{strength.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} style={{
                      flex: 1, height: 4, borderRadius: 999,
                      background: i <= strength.score ? strength.color : 'rgba(122,45,5,0.08)',
                      transition: 'background 200ms ease',
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <Label>Confirm new password</Label>
            <PasswordField value={confirmPw} onChange={setConfirmPw} placeholder="Repeat new password" />
            {confirmPw && newPw !== confirmPw && (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#B91C1C', marginTop: 4, display: 'block' }}>
                Passwords do not match.
              </span>
            )}
          </div>
        </div>
        {pwStatus && <StatusMsg type={pwStatus.type} text={pwStatus.text} />}
        <SaveButton
          onClick={handlePasswordChange}
          loading={pwSaving}
          disabled={!currentPw || !newPw || !confirmPw}
        >
          Update password
        </SaveButton>
      </Card>

      <Card heading="Email preferences" mob={mob}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Label>Preferred email for communications</Label>
            <FieldInput value={user?.email || ''} disabled />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-helper)', marginTop: 4, display: 'block' }}>
              We will use this address for all account-related communications.
            </span>
          </div>
        </div>
      </Card>

      <Card heading="Active sessions" mob={mob}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
              <Monitor size={18} style={{ color: 'var(--app-text-sec)', marginTop: 1, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--app-ink)' }}>
                  Current browser session
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--app-green)', marginTop: 3 }}>
                  Active now
                </div>
              </div>
            </div>
            <span style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 10px',
              borderRadius: 999, background: 'rgba(122,45,5,0.06)', color: 'var(--app-helper)',
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, lineHeight: 1,
            }}>
              This device
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
            <Smartphone size={18} style={{ color: 'var(--app-text-sec)', marginTop: 1, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--app-ink)' }}>
                Mobile session
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--app-helper)', marginTop: 3 }}>
                Single-device JWT sessions - no multi-session management
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ============================================================
// Notifications Tab
// ============================================================

const EMAIL_NOTIF_ROWS: { key: string; title: string; desc: string; defaultOn: boolean; locked?: boolean }[] = [
  { key: 'email_app_status', title: 'Application status updates', desc: 'Your application has moved to a new stage.', defaultOn: true },
  { key: 'email_new_message', title: 'New message from OppDate team', desc: 'A team member has replied to your application thread.', defaultOn: true },
  { key: 'email_deadline', title: 'Opportunity deadline reminders', desc: 'A saved opportunity is closing within 7 days.', defaultOn: true },
  { key: 'email_matching', title: 'New matching opportunities', desc: 'Opportunities matching your profile and interests.', defaultOn: false },
  { key: 'email_security', title: 'Account and security alerts', desc: 'Sign-ins, password changes, and account activity.', defaultOn: true, locked: true },
]

const INAPP_NOTIF_ROWS: { key: string; title: string; desc: string; defaultOn: boolean }[] = [
  { key: 'inapp_pipeline', title: 'Application pipeline updates', desc: 'A tracked application has moved forward.', defaultOn: true },
  { key: 'inapp_messages', title: 'Unread messages', desc: 'Replies from the OppDate team in your threads.', defaultOn: true },
  { key: 'inapp_reminders', title: 'Saved opportunity reminders', desc: 'Deadlines approaching on bookmarked opportunities.', defaultOn: true },
  { key: 'inapp_announcements', title: 'Platform announcements', desc: 'New features and product updates.', defaultOn: false },
]

function NotificationsTab({ mob, user }: { mob?: boolean; user: ApiUser | null }) {
  const initState = () => {
    const saved = (user?.preferences ?? {}) as Record<string, unknown>
    const s: Record<string, boolean> = {}
    ;[...EMAIL_NOTIF_ROWS, ...INAPP_NOTIF_ROWS].forEach(r => {
      s[r.key] = typeof saved[r.key] === 'boolean' ? (saved[r.key] as boolean) : r.defaultOn
    })
    return s
  }
  const [prefs, setPrefs] = useState<Record<string, boolean>>(initState)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const toggle = (key: string) => setPrefs(p => ({ ...p, [key]: !p[key] }))

  const handleSave = async () => {
    setSaving(true)
    setStatus(null)
    try {
      await api.patch('/api/v1/auth/me/preferences', prefs)
      setStatus({ type: 'success', text: 'Preferences saved.' })
    } catch {
      setStatus({ type: 'error', text: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Card heading="Email notifications" mob={mob}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {EMAIL_NOTIF_ROWS.map(row => (
            <ToggleRow
              key={row.key}
              title={row.title}
              desc={row.desc}
              on={prefs[row.key]}
              locked={row.locked}
              onChange={() => toggle(row.key)}
            />
          ))}
        </div>
      </Card>

      <Card heading="In-app notifications" mob={mob}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {INAPP_NOTIF_ROWS.map(row => (
            <ToggleRow
              key={row.key}
              title={row.title}
              desc={row.desc}
              on={prefs[row.key]}
              onChange={() => toggle(row.key)}
            />
          ))}
        </div>
      </Card>

      {status && <StatusMsg type={status.type} text={status.text} />}
      <SaveButton onClick={handleSave} loading={saving}>Save preferences</SaveButton>
    </div>
  )
}

function ToggleRow({ title, desc, on, locked, onChange }: {
  title: string; desc: string; on: boolean; locked?: boolean; onChange: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--app-ink)' }}>
            {title}
          </span>
          {locked && <Lock size={12} style={{ color: 'var(--app-helper)' }} />}
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-text-sec)', marginTop: 3 }}>
          {desc}
        </div>
      </div>
      <Toggle on={on} disabled={locked} onChange={onChange} />
    </div>
  )
}
