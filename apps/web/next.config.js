const { withSentryConfig } = require('@sentry/nextjs/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@oppdate/types', '@oppdate/utils', 'react-pdf'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.cloudflare.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  clientConfigPath: './instrumentation-client.ts',
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
})
