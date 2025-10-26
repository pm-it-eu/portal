// Production-ready Logging System
type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  userId?: string
  requestId?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.sanitizeContext(context)
    }

    // In Development: Alle Logs anzeigen
    if (this.isDevelopment) {
      console[level](`[${level.toUpperCase()}] ${message}`, context || '')
      return
    }

    // In Production: Nur Errors und Warnings loggen
    if (this.isProduction && (level === 'error' || level === 'warn')) {
      // Hier könnte ein externer Logging-Service integriert werden
      // z.B. Sentry, LogRocket, oder ein eigener Log-Service
      console[level](`[${level.toUpperCase()}] ${message}`, context || '')
    }
  }

  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return context

    const sanitized = { ...context }
    
    // Sensible Daten entfernen
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'session']
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]'
      }
    })

    // E-Mail-Adressen anonymisieren
    if (sanitized.email) {
      const [local, domain] = sanitized.email.split('@')
      sanitized.email = `${local.substring(0, 2)}***@${domain}`
    }

    return sanitized
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context)
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context)
  }

  // Spezielle Logger für verschiedene Bereiche
  api(message: string, context?: Record<string, any>) {
    this.log('info', `[API] ${message}`, context)
  }

  auth(message: string, context?: Record<string, any>) {
    this.log('info', `[AUTH] ${message}`, context)
  }

  security(message: string, context?: Record<string, any>) {
    this.log('warn', `[SECURITY] ${message}`, context)
  }

  performance(message: string, context?: Record<string, any>) {
    this.log('info', `[PERF] ${message}`, context)
  }
}

// Singleton Logger-Instanz
export const logger = new Logger()

// Convenience-Funktionen für häufige Use Cases
export const logError = (message: string, error?: Error, context?: Record<string, any>) => {
  logger.error(message, {
    ...context,
    error: error?.message,
    stack: error?.stack
  })
}

export const logApiCall = (method: string, url: string, status?: number, context?: Record<string, any>) => {
  logger.api(`${method} ${url}`, {
    ...context,
    status,
    timestamp: new Date().toISOString()
  })
}

export const logSecurityEvent = (event: string, context?: Record<string, any>) => {
  logger.security(event, context)
}

export const logPerformance = (operation: string, duration: number, context?: Record<string, any>) => {
  logger.performance(`${operation} took ${duration}ms`, context)
}



