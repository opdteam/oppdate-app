'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Clock, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface Programme {
  id: string
  title: string
  description: string
  monthlyPriceUsd: number // cents
  active: boolean
}

function fmtPrice(cents: number) {
  return '$' + (cents / 100).toFixed(0)
}

export function MentorshipListingPage() {
  const router = useRouter()
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ data: Programme[] }>('/api/v1/mentorships/programmes')
      .then(r => setProgrammes(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>
      <button
        onClick={() => router.push('/services')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--app-ginger)', fontFamily: 'var(--font-sans)',
          fontSize: 14, fontWeight: 500, padding: 0, marginBottom: 32,
        }}
      >
        <ArrowLeft size={16} /> Back to Services
      </button>

      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Users size={22} color="var(--app-ginger)" />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, margin: 0 }}>
            Mentorship Programmes
          </h1>
        </div>
        <p style={{ color: '#64748b', fontSize: 15, maxWidth: 560, margin: 0 }}>
          Structured programmes with a dedicated mentor and a clear goal. Choose the one that matches where you are in your application journey.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 140, borderRadius: 12,
              background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
            }} />
          ))}
        </div>
      ) : programmes.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          color: '#94a3b8', fontFamily: 'var(--font-sans)', fontSize: 15,
        }}>
          No programmes available at this time. Check back soon.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {programmes.map(prog => (
            <div
              key={prog.id}
              style={{
                border: '1px solid #e2e8f0', borderRadius: 12,
                padding: '24px 28px', background: '#fff',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, margin: 0 }}>
                  {prog.title}
                </h2>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700,
                  color: 'var(--app-ginger)',
                }}>
                  {fmtPrice(prog.monthlyPriceUsd)}<span style={{ fontSize: 13, fontWeight: 400, color: '#64748b' }}>/mo</span>
                </span>
              </div>

              <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {prog.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 13 }}>
                  <Clock size={14} />
                  Monthly programme
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 13 }}>
                  <CheckCircle size={14} />
                  Dedicated mentor
                </div>
              </div>

              <div>
                <button
                  onClick={() => router.push(`/services/mentorship/enrol?programme=${prog.id}`)}
                  style={{
                    padding: '10px 24px', borderRadius: 8,
                    background: 'var(--app-ginger)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                  }}
                >
                  Enrol Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
