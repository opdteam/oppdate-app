'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Trash2, Image as ImageIcon, Upload, AlertCircle, X } from 'lucide-react'
import { createPortal } from 'react-dom'

type AvatarPreset = {
  id: string
  url: string
  label: string
  createdAt: string
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [label, setLabel] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed.')
      return
    }
    if (f.size > 2 * 1024 * 1024) {
      setError('Image exceeds the 2 MB limit.')
      return
    }
    setError(null)
    setFile(f)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('label', label.trim() || 'Avatar')
      await api.post('/api/v1/admin/avatar-presets', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await qc.invalidateQueries({ queryKey: ['admin-avatar-presets'] })
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(10,4,0,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          borderRadius: 16,
          background: 'rgba(24,10,2,0.97)',
          backdropFilter: 'blur(24px) saturate(130%)',
          WebkitBackdropFilter: 'blur(24px) saturate(130%)',
          border: '1px solid rgba(181,83,10,0.35)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(181,83,10,0.18)' }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#F8EEE2' }}>Upload avatar preset</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#B09070', display: 'flex', borderRadius: 6 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Preview circle + select button side by side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
                border: preview ? '2.5px solid #B5530A' : '2.5px dashed rgba(181,83,10,0.35)',
                background: 'rgba(181,83,10,0.06)',
                cursor: 'pointer', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 150ms ease',
              }}
            >
              {preview
                ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <ImageIcon size={24} style={{ color: '#A07858' }} />
              }
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => fileRef.current?.click()}
                className="adm-btn adm-btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Upload size={13} /> {preview ? 'Choose different' : 'Select image'}
              </button>
              <span style={{ fontSize: 12, color: '#B09070' }}>JPEG, PNG, WebP - max 2 MB</span>
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onFileChange} />

          {/* Label field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#A07858' }}>Label</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Amber circle"
              maxLength={100}
              style={{
                height: 38, padding: '0 12px', borderRadius: 8,
                background: 'rgba(181,83,10,0.06)', border: '1px solid rgba(181,83,10,0.2)',
                fontSize: 13, color: '#F8EEE2',
                outline: 'none', width: '100%', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#F87171' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} className="adm-btn adm-btn-ghost">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !file}
            className="adm-btn adm-btn-primary"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: uploading || !file ? 0.5 : 1,
              cursor: uploading || !file ? 'default' : 'pointer',
            }}
          >
            {uploading ? 'Uploading...' : 'Upload preset'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

export function AdminAvatarsPage() {
  const qc = useQueryClient()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const id = 'adm-av-hover-css'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = '.adm-av-del-btn{opacity:0!important}div:hover>.adm-av-del-btn{opacity:1!important}'
    document.head.appendChild(el)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  const { data, isLoading } = useQuery<{ data: AvatarPreset[] }>({
    queryKey: ['admin-avatar-presets'],
    queryFn: () => api.get('/api/v1/admin/avatar-presets').then(r => r.data),
    staleTime: 30000,
  })

  const presets: AvatarPreset[] = data?.data ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/avatar-presets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-avatar-presets'] })
      setDeleteId(null)
    },
  })

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId)
  }, [deleteId, deleteMutation])

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <div>
          <h1 className="adm-page-title">Avatar Presets</h1>
          <p className="adm-page-sub">{presets.length} preset{presets.length !== 1 ? 's' : ''} available to users</p>
        </div>
        <button
          className="adm-btn adm-btn-primary"
          onClick={() => setUploadOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={15} /> Add preset
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16, padding: '8px 0' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', background: 'var(--adm-skeleton)', animation: 'adm-shimmer 1.4s ease infinite' }} />
          ))}
        </div>
      ) : presets.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '64px 24px', gap: 20,
        }}>
          {/* Placeholder circle grid */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
            {[80, 64, 80].map((size, i) => (
              <div
                key={i}
                style={{
                  width: size, height: size, borderRadius: '50%',
                  background: i === 1 ? 'rgba(122,45,5,0.07)' : 'rgba(122,45,5,0.04)',
                  border: '2px dashed rgba(122,45,5,0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  alignSelf: 'center',
                }}
              >
                <ImageIcon size={i === 1 ? 22 : 16} style={{ color: 'rgba(122,45,5,0.22)' }} />
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontFamily: 'var(--adm-font)', fontSize: 15, fontWeight: 600, color: 'var(--adm-ink)' }}>
              No avatar presets yet
            </p>
            <p style={{ margin: 0, fontFamily: 'var(--adm-font)', fontSize: 13, color: 'var(--adm-muted)', maxWidth: 280 }}>
              Upload illustrated avatars that users can pick from on their profile page.
            </p>
          </div>
          <button
            className="adm-btn adm-btn-primary"
            onClick={() => setUploadOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} /> Upload first preset
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 20, padding: '8px 0' }}>
          {presets.map(p => (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative', width: 96, height: 96 }}>
                <img
                  src={p.url}
                  alt={p.label}
                  style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--adm-line)', display: 'block' }}
                />
                <button
                  onClick={() => setDeleteId(p.id)}
                  title="Delete preset"
                  style={{
                    position: 'absolute', top: 0, right: 0,
                    width: 26, height: 26, borderRadius: '50%',
                    background: '#c0392b', border: '2px solid var(--adm-card)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', padding: 0,
                    opacity: 0,
                    transition: 'opacity 130ms ease',
                  }}
                  className="adm-av-del-btn"
                >
                  <Trash2 size={11} />
                </button>
              </div>
              <span style={{ fontFamily: 'var(--adm-font)', fontSize: 12, color: 'var(--adm-muted)', textAlign: 'center', lineHeight: 1.3, maxWidth: 96, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
            </div>
          ))}
        </div>
      )}

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}

      {deleteId && createPortal(
        <div
          onClick={() => setDeleteId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9100,
            background: 'rgba(10,4,0,0.50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 360,
              borderRadius: 14,
              background: 'rgba(24,10,2,0.97)',
              backdropFilter: 'blur(24px) saturate(130%)',
              WebkitBackdropFilter: 'blur(24px) saturate(130%)',
              border: '1px solid rgba(181,83,10,0.35)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.75)',
              padding: '24px 24px 20px',
            }}
          >
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#D8B896', lineHeight: 1.5 }}>
              Delete this avatar preset? Users who have already selected it will keep their current photo, but it will no longer appear in the picker.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setDeleteId(null)}
                className="adm-btn adm-btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="adm-btn adm-btn-danger-solid"
                style={{
                  opacity: deleteMutation.isPending ? 0.6 : 1,
                  cursor: deleteMutation.isPending ? 'default' : 'pointer',
                }}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
