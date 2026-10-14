import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Keep the current Vite production app intact until migration is verified.
  poweredByHeader: false,
  reactStrictMode: true,
}

export default nextConfig
