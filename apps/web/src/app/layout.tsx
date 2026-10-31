import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: {
    default: 'OppDate - Intelligent. Warm. Elevated.',
    template: '%s | OppDate',
  },
  description: 'Discover and apply to global internships, scholarships, training programmes, and entry-level jobs - with AI-powered applications handled entirely on your behalf.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://oppdate.com'),
  openGraph: {
    type: 'website',
    siteName: 'OppDate',
    title: 'OppDate - Intelligent. Warm. Elevated.',
    description: 'AI-powered opportunity application platform. Discover. Apply. Land it.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OppDate',
    description: 'AI-powered opportunity application platform.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=DM+Mono:ital,wght@0,300..700;1,300..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
