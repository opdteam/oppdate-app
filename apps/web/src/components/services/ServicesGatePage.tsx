'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, Users, BookOpen, ArrowRight } from 'lucide-react'

const SERVICES = [
  {
    title: 'Consultations',
    description: 'Focused, one-off sessions with specialists matched to what you actually need. Choose the consultant whose focus fits your situation.',
    icon: GraduationCap,
    href: '/services/consultations',
  },
  {
    title: 'Mentorship',
    description: 'Structured programmes with a dedicated mentor and a clear goal. Choose the one that matches where you are in your application.',
    icon: Users,
    href: '/services/mentorship',
  },
  {
    title: 'eBooks',
    description: 'Practical, no-fluff handbooks on scholarships, visas, and building a career across borders.',
    icon: BookOpen,
    href: '/services/ebooks/library',
  },
]

export function ServicesGatePage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px 80px' }}>
      <div style={{ marginBottom: 36 }}>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--app-ginger-mid)',
            marginBottom: 10,
            display: 'block',
          }}
        >
          OppDate Services
        </span>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 600,
            fontSize: 36,
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            color: 'var(--app-ink)',
            margin: 0,
          }}
        >
          Expert guidance, every step of the way
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 16,
            lineHeight: 1.6,
            color: 'var(--app-ink-body)',
            marginTop: 12,
            maxWidth: 560,
          }}
        >
          From one-off consultations to structured mentorship and self-paced guides - choose what fits your needs.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 22,
        }}
      >
        {SERVICES.map((service, index) => (
          <ServiceCard key={service.title} service={service} index={index} />
        ))}
      </div>
    </div>
  )
}

function ServiceCard({
  service,
  index,
}: {
  service: (typeof SERVICES)[number]
  index: number
}) {
  const [hover, setHover] = useState(false)
  const Icon = service.icon

  return (
    <Link
      href={service.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 28,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.70)',
        boxShadow: hover
          ? 'var(--app-card-shadow-hi)'
          : 'var(--app-card-shadow)',
        transform: hover ? 'translateY(-4px)' : 'none',
        transition: 'transform 180ms var(--ease-out-soft), box-shadow 180ms var(--ease-out-soft)',
        animation: `ebRise 460ms var(--ease-out-soft) ${index * 60 + 120}ms both`,
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'rgba(122,45,5,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Icon size={24} style={{ color: 'var(--app-ginger)' }} />
      </div>

      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 600,
          fontSize: 22,
          color: 'var(--app-ink)',
          margin: '0 0 10px',
          letterSpacing: '-0.01em',
        }}
      >
        {service.title}
      </h2>

      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--app-ink-body)',
          margin: '0 0 24px',
          flex: 1,
        }}
      >
        {service.description}
      </p>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--app-ginger)',
          transition: 'background 150ms var(--ease-out-soft), transform 120ms',
        }}
      >
        Explore <ArrowRight size={16} />
      </span>
    </Link>
  )
}
