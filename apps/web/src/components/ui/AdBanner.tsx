'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

type AdZone = 'listings_feed' | 'listing_page' | 'dashboard'

interface AdPlacement {
  id: string
  zone: string
  active: boolean
  provider: string | null
  config: Record<string, unknown>
}

interface Props {
  zone: AdZone
  className?: string
  style?: React.CSSProperties
}

export function AdBanner({ zone, className, style }: Props) {
  const [placement, setPlacement] = useState<AdPlacement | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api.get<{ data: AdPlacement | null }>(`/api/v1/opportunities/placements?zone=${zone}`)
      .then(r => {
        setPlacement(r.data?.data ?? null)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [zone])

  // Not yet loaded - render nothing (no layout shift)
  if (!loaded || !placement) return null

  const config = placement.config ?? {}
  const adClient = config.adClient as string | undefined
  const adSlot = config.adSlot as string | undefined
  const imageUrl = config.imageUrl as string | undefined
  const linkUrl = config.linkUrl as string | undefined
  const altText = (config.altText as string | undefined) ?? 'Advertisement'

  // Google AdSense placement
  if (placement.provider === 'google_ads' && adClient && adSlot) {
    return (
      <div className={className} style={{ textAlign: 'center', ...style }}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    )
  }

  // Direct image/link placement
  if (imageUrl) {
    const inner = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={altText}
        style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 8 }}
      />
    )
    return (
      <div className={className} style={style}>
        {linkUrl ? (
          <a href={linkUrl} target="_blank" rel="noopener noreferrer sponsored">
            {inner}
          </a>
        ) : inner}
      </div>
    )
  }

  return null
}
