import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/auth'
import { consumeLoginRateLimit } from '@/lib/login-rate-limit'

const nextAuthHandler = NextAuth(authOptions) as unknown as (request: Request) => Promise<Response>

async function handleAuthRequest(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
    return NextResponse.json(
      { error: 'Authentication is not configured on this deployment.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  const path = new URL(request.url).pathname
  const isSensitiveAuthEndpoint = /^\/api\/auth\/(?:signin(?:\/|$)|callback\/)/.test(path)

  if (isSensitiveAuthEndpoint) {
    // Configure this header only behind a reverse proxy that overwrites it.
    const ipHeader = (process.env.LOGIN_RATE_LIMIT_IP_HEADER || 'x-real-ip').toLowerCase()
    const clientAddress = request.headers.get(ipHeader) || 'unknown'
    try {
      const result = await consumeLoginRateLimit(clientAddress)
      if (!result.allowed) {
        return NextResponse.json(
          { error: 'Too many login attempts. Please wait before trying again.' },
          { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds), 'Cache-Control': 'no-store' } },
        )
      }
    } catch {
      // Fail closed if the persistent limiter cannot be consulted.
      return NextResponse.json(
        { error: 'Authentication is temporarily unavailable. Please try again shortly.' },
        { status: 503, headers: { 'Retry-After': '30', 'Cache-Control': 'no-store' } },
      )
    }
  }

  return nextAuthHandler(request)
}

export { handleAuthRequest as GET, handleAuthRequest as POST }
