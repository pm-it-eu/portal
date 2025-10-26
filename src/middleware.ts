import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Security Headers setzen
  const response = NextResponse.next()
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
  )
  
  // X-Frame-Options (Clickjacking-Schutz)
  response.headers.set('X-Frame-Options', 'DENY')
  
  // X-Content-Type-Options (MIME-Sniffing-Schutz)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // X-XSS-Protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )
  
  // Strict-Transport-Security (nur bei HTTPS)
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
  
  // Rate Limiting für API-Routen
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // IP-basierte Rate Limiting (vereinfacht)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    
    // Hier könnte echte Rate Limiting-Logik stehen
    // Für jetzt: Nur Logging in Development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request from IP: ${ip} to ${request.nextUrl.pathname}`)
    }
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
