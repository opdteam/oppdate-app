'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Plus, Trash2, Check, Info,
  Instagram, Linkedin, Twitter, Facebook, Youtube,
} from 'lucide-react'

const SOCIAL_PLATFORMS: { value: string; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { value: 'instagram', label: 'Instagram', Icon: Instagram },
  { value: 'linkedin',  label: 'LinkedIn',  Icon: Linkedin },
  { value: 'twitter',   label: 'X (Twitter)', Icon: Twitter },
  { value: 'facebook',  label: 'Facebook',  Icon: Facebook },
  { value: 'youtube',   label: 'YouTube',   Icon: Youtube },
]

function getPlatformIcon(platform: string) {
  return SOCIAL_PLATFORMS.find(p => p.value === platform)?.Icon ?? Twitter
}

function PlatformSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = SOCIAL_PLATFORMS.find(p => p.value === value) ?? SOCIAL_PLATFORMS[0]

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={ref} className={`adm-csel${open ? ' open' : ''}`} style={{ flex: '0 0 148px' }}>
      <div className="adm-csel-trigger" onClick={() => setOpen(o => !o)}>
        <selected.Icon size={13} style={{ color: 'var(--adm-primary-hi)', flexShrink: 0 }} />
        <span className="adm-csel-val">{selected.label}</span>
        <svg className="adm-csel-arrow" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div className="adm-csel-drop">
        {SOCIAL_PLATFORMS.map(p => (
          <div
            key={p.value}
            className={`adm-csel-opt${p.value === value ? ' sel-on' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseDown={e => { e.preventDefault(); onChange(p.value); setOpen(false) }}
          >
            <p.Icon size={13} style={{ flexShrink: 0 }} />
            {p.label}
          </div>
        ))}
      </div>
    </div>
  )
}

type Tab = 'general' | 'gateways' | 'notifications' | 'advertising'

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'gateways', label: 'Payment Gateways' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'advertising', label: 'Advertising' },
]

const AD_PLACEMENTS = [
  { key: 'feed', label: 'Listings feed', zone: 'listings_feed' },
  { key: 'detail', label: 'Listing detail', zone: 'listing_page' },
  { key: 'dashboard', label: 'Dashboard', zone: 'dashboard' },
]

const ZONE_TO_KEY: Record<string, string> = {
  listings_feed: 'feed',
  listing_page: 'detail',
  dashboard: 'dashboard',
}

interface ApiAdPlacement {
  id: string
  zone: string
  active: boolean
  provider: string | null
  config: Record<string, unknown>
  updatedAt: string
}

interface ApiSettingsMap {
  socials?: Array<{ platform: string; label: string; url: string }>
  [key: string]: unknown
}

type SocialEntry = { platform: string; label: string; url: string }

// Toggle component
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return <div className={`adm-set-toggle${on ? ' on' : ''}`} onClick={onChange} />
}

// General tab
function GeneralTab() {
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery<ApiSettingsMap>({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/api/v1/admin/settings').then(r => r.data.data),
  })

  const [socials, setSocials] = useState<SocialEntry[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!settings) return
    setSocials(
      Array.isArray(settings.socials)
        ? (settings.socials as SocialEntry[])
        : [
            { platform: 'instagram', label: 'Instagram', url: '' },
            { platform: 'linkedin', label: 'LinkedIn', url: '' },
            { platform: 'twitter', label: 'X (Twitter)', url: '' },
          ]
    )
  }, [settings])

  const socialsMutation = useMutation({
    mutationFn: (value: SocialEntry[]) => api.put('/api/v1/admin/settings/socials', { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const handleSave = useCallback(async () => {
    await socialsMutation.mutateAsync(socials)
  }, [socials, socialsMutation])

  const handleSocialPlatform = useCallback((i: number, platform: string) => {
    const found = SOCIAL_PLATFORMS.find(p => p.value === platform)
    setSocials(prev => prev.map((s, idx) => idx === i ? { ...s, platform, label: found?.label ?? platform } : s))
  }, [])

  const handleSocialUrl = useCallback((i: number, url: string) => {
    setSocials(prev => prev.map((s, idx) => idx === i ? { ...s, url } : s))
  }, [])

  const handleRemoveSocial = useCallback((i: number) => {
    setSocials(prev => prev.filter((_, idx) => idx !== i))
  }, [])

  const handleAddLink = useCallback(() => {
    setSocials(prev => [...prev, { platform: 'instagram', label: 'Instagram', url: '' }])
  }, [])

  const isSaving = socialsMutation.isPending

  if (isLoading) {
    return (
      <div className="adm-set-formscreen">
        <div className="adm-set-inner">
          <div className="adm-set-card">
            <div className="adm-skel adm-skel-line w40" style={{ height: 14, marginBottom: 12 }} />
            <div className="adm-skel adm-skel-line w80" style={{ height: 36 }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="adm-set-formscreen">
      <div className="adm-set-inner">
        <div className="adm-set-card">
          <h3>Social media links</h3>
          {socials.map((s, i) => {
            const Icon = getPlatformIcon(s.platform)
            return (
              <div key={i} className="adm-set-linkrow">
                <div className="adm-set-linkico"><Icon size={16} /></div>
                <PlatformSelect value={s.platform} onChange={v => handleSocialPlatform(i, v)} />
                <input
                  className="adm-set-inp"
                  value={s.url}
                  placeholder="https://"
                  onChange={e => handleSocialUrl(i, e.target.value)}
                  style={{ flex: '1 1 auto' }}
                />
                <button className="adm-set-removebtn" onClick={() => handleRemoveSocial(i)}><Trash2 size={15} /></button>
              </div>
            )
          })}
          <div className="adm-set-addlink" onClick={handleAddLink}><Plus size={14} /> Add link</div>
        </div>
      </div>

      <div className="adm-set-footer">
        <div style={{ flex: '1 1 auto' }} />
        <button
          className="adm-set-btn adm-set-btn-ghost"
          onClick={() => {
            setSocials(Array.isArray(settings?.socials) ? (settings.socials as SocialEntry[]) : [])
          }}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button className="adm-set-btn adm-set-btn-primary" onClick={handleSave} disabled={isSaving}>
          {saved ? <><Check size={13} /> Saved</> : isSaving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

// Gateways tab
function GatewaysTab() {
  return (
    <div className="adm-set-inner">
      <div className="adm-set-card">
        <h3>Payment Gateways</h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--adm-t-low)', lineHeight: 1.6 }}>
          Payment gateway configuration is managed via environment variables and the respective gateway dashboards.
        </p>
      </div>
    </div>
  )
}

// Notifications tab
function NotificationsTab() {
  return (
    <div className="adm-set-inner">
      <div className="adm-set-card">
        <h3>Email templates</h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--adm-t-low)', lineHeight: 1.6 }}>
          Email template management coming soon.
        </p>
      </div>
    </div>
  )
}

// Advertising tab
function AdvertisingTab() {
  const queryClient = useQueryClient()

  const { data: placements, isLoading } = useQuery<ApiAdPlacement[]>({
    queryKey: ['admin-ads'],
    queryFn: () => api.get('/api/v1/admin/placements').then(r => r.data.data),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/api/v1/admin/placements/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] })
    },
  })

  const placementMap: Record<string, ApiAdPlacement> = {}
  if (placements) {
    for (const p of placements) {
      const key = ZONE_TO_KEY[p.zone]
      if (key) placementMap[key] = p
    }
  }

  const warningCard = (
    <div className="adm-set-card">
      <div className="adm-set-quietnote">
        <Info size={16} />
        <span>Ads are dormant by default. Activating any placement above will make ad space visible to users immediately.</span>
      </div>
    </div>
  )

  return (
    <div className="adm-set-inner">
      <div className="adm-set-card">
        <h3>Ad placements</h3>
        <div className="adm-set-cardsub">Ads are dormant by default</div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
            {AD_PLACEMENTS.map(p => (
              <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="adm-skel adm-skel-line w40" style={{ height: 14 }} />
                <div className="adm-skel" style={{ width: 44, height: 24, borderRadius: 12 }} />
              </div>
            ))}
          </div>
        ) : (
          AD_PLACEMENTS.map(p => {
            const placement = placementMap[p.key]
            const on = placement?.active ?? false
            const isPending = toggleMutation.isPending && toggleMutation.variables?.id === placement?.id

            return (
              <div key={p.key} className="adm-set-togglerow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="adm-set-togglelabel">{p.label}</span>
                  <Toggle
                    on={on}
                    onChange={() => {
                      if (!placement || isPending) return
                      toggleMutation.mutate({ id: placement.id, active: !on })
                    }}
                  />
                </div>
                {on && (
                  <div className="adm-set-inlinenote">
                    <Info size={15} /> Ad space will appear in this location once activated.
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {warningCard}
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="adm-set-page">
      <div className="adm-set-header">
        <div className="adm-set-pagehead">
          <div className="adm-skel adm-skel-line w25" style={{ height: 24, marginBottom: 8 }} />
          <div className="adm-skel adm-skel-line w15" style={{ height: 13 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {[70, 120, 100, 80].map((w, i) => <div key={i} className="adm-skel adm-skel-pill" style={{ width: w }} />)}
        </div>
      </div>
      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div className="adm-skel adm-skel-line w40" style={{ height: 14, marginBottom: 6 }} />
              <div className="adm-skel adm-skel-line w60" style={{ height: 10 }} />
            </div>
            <div className="adm-skel" style={{ width: 44, height: 24, borderRadius: 12 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('general')
  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t) }, [])

  if (loading) return <SettingsSkeleton />

  return (
    <div className="adm-set-page">
      <div className="adm-set-header">
        <div className="adm-set-pagehead">
          <h1>Settings</h1>
          <span className="adm-set-sub">Platform configuration</span>
        </div>
        <div className="adm-set-tabbar">
          {TABS.map(t => (
            <div key={t.key} className={`adm-set-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      <div className="adm-set-content">
        {tab === 'general' && <GeneralTab />}
        {tab === 'gateways' && <GatewaysTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'advertising' && <AdvertisingTab />}
      </div>
    </div>
  )
}
