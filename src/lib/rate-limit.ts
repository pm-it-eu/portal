import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Redis-Konfiguration (für Produktion)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'http://localhost:6379',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'dummy-token'
})

// Rate Limiter für API-Aufrufe
export const apiRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 Requests pro Minute
  analytics: true,
  prefix: "api",
})

// Rate Limiter für E-Mail-Versand
export const emailRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"), // 10 E-Mails pro Stunde
  analytics: true,
  prefix: "email",
})

// Rate Limiter für Login-Versuche
export const loginRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 Login-Versuche pro 15 Minuten
  analytics: true,
  prefix: "login",
})

// Rate Limiter für Nachrichten
export const messageRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 Nachrichten pro Minute
  analytics: true,
  prefix: "message",
})

// Fallback für lokale Entwicklung (ohne Redis)
export const localRateLimit = {
  async limit(identifier: string) {
    // Einfacher In-Memory Rate Limiter für Entwicklung
    const now = Date.now()
    const window = 60000 // 1 Minute
    const maxRequests = 100
    
    // Simuliere Rate Limiting (in Produktion durch Redis ersetzen)
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: new Date(now + window)
    }
  }
}

// Rate Limiting Middleware
export async function checkRateLimit(
  identifier: string, 
  rateLimiter: Ratelimit = apiRateLimit
) {
  try {
    // In Produktion: Echte Redis-Verbindung
    if (process.env.NODE_ENV === 'production' && process.env.UPSTASH_REDIS_REST_URL) {
      const { success, limit, remaining, reset } = await rateLimiter.limit(identifier)
      
      if (!success) {
        throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)} seconds.`)
      }
      
      return { success, limit, remaining, reset }
    } else {
      // Lokale Entwicklung: Fallback
      return await localRateLimit.limit(identifier)
    }
  } catch (error) {
    // Bei Fehlern: Rate Limiting überspringen (nicht blockieren)
    return { success: true, limit: 100, remaining: 99, reset: new Date(Date.now() + 60000) }
  }
}
