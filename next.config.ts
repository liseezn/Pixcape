import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Keep the current Vite production app intact until migration is verified.
  poweredByHeader: false,
  reactStrictMode: true,
  typescript: { tsconfigPath: 'tsconfig.next.json' },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' })
    }
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
