import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Alle verfügbaren Umgebungsvariablen anzeigen
    const allEnvVars = Object.keys(process.env).filter(key => 
      key.includes('EMAIL') || key.includes('SMTP') || key.includes('MAIL')
    ).reduce((obj, key) => {
      obj[key] = process.env[key] ? '***SET***' : 'NOT_SET'
      return obj
    }, {} as Record<string, string>)

    // E-Mail-Konfiguration prüfen (ohne Passwort anzuzeigen)
    const emailConfig = {
      host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'NOT_SET',
      port: process.env.EMAIL_PORT || process.env.SMTP_PORT || 'NOT_SET',
      user: process.env.EMAIL_USER || process.env.SMTP_USER || 'NOT_SET',
      pass: (process.env.EMAIL_PASS || process.env.SMTP_PASS) ? '***SET***' : 'NOT_SET',
      from: process.env.EMAIL_FROM || process.env.MAIL_FROM || 'NOT_SET',
      allEnvVars,
      // Zusätzliche Debug-Info
      nodeEnv: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
      // Zeige alle E-Mail-ähnlichen Variablen
      emailRelatedVars: allEnvVars
    }

    return NextResponse.json({ 
      success: true,
      config: emailConfig,
      message: 'E-Mail-Konfiguration überprüft'
    })
  } catch (error) {
    console.error('Error checking email config:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}
