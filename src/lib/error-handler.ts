import { NextResponse } from 'next/server'

// Sichere Error-Klassen
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
  }
}

// Sichere Error-Response-Funktion
export function createErrorResponse(error: unknown, fallbackMessage: string = 'Internal Server Error') {
  // Nur in Development: Detaillierte Error-Logs
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error)
  }
  
  // Sensible Daten aus Error-Logs entfernen
  const sanitizedError = {
    message: fallbackMessage,
    timestamp: new Date().toISOString(),
    // Keine Stack-Traces oder sensible Daten in Produktion
    ...(process.env.NODE_ENV === 'development' && {
      details: error instanceof Error ? error.message : String(error)
    })
  }
  
  // Bestimme HTTP-Status basierend auf Error-Typ
  let status = 500
  
  if (error instanceof ValidationError) {
    status = 400
  } else if (error instanceof AuthenticationError) {
    status = 401
  } else if (error instanceof AuthorizationError) {
    status = 403
  } else if (error instanceof RateLimitError) {
    status = 429
  }
  
  return NextResponse.json(sanitizedError, { status })
}

// Input-Sanitization für Logs
export function sanitizeForLogging(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }
  
  const sanitized = { ...data }
  
  // Sensible Felder entfernen/anonymisieren
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth']
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }
  
  // E-Mail-Adressen anonymisieren
  if (sanitized.email) {
    const [local, domain] = sanitized.email.split('@')
    sanitized.email = `${local.substring(0, 2)}***@${domain}`
  }
  
  return sanitized
}

// Async Error Wrapper für API-Routen
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Nur in Development: Detaillierte Error-Logs
      if (process.env.NODE_ENV === 'development') {
        console.error('Unhandled error in API route:', sanitizeForLogging(error))
      }
      throw error
    }
  }
}
