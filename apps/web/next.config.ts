import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // NEXT_PUBLIC_* vars are auto-exposed to the browser; listing here for docs
  env: {
    NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'] ?? '',
  },
}

export default nextConfig
