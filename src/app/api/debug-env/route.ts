import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Alle Umgebungsvariablen anzeigen (ohne sensible Daten)
    const allEnvVars = Object.keys(process.env)
      .filter(key => !key.includes('PASS') && !key.includes('SECRET') && !key.includes('KEY'))
      .reduce((obj, key) => {
        const value = process.env[key]
        obj[key] = value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'NOT_SET'
        return obj
      }, {} as Record<string, string>)

    // Spezifisch E-Mail-Variablen
    const emailVars = {
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS ? '***SET***' : 'NOT_SET',
      EMAIL_FROM: process.env.EMAIL_FROM,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS ? '***SET***' : 'NOT_SET',
      MAIL_HOST: process.env.MAIL_HOST,
      MAIL_PORT: process.env.MAIL_PORT,
      MAIL_USER: process.env.MAIL_USER,
      MAIL_PASS: process.env.MAIL_PASS ? '***SET***' : 'NOT_SET',
      MAIL_FROM: process.env.MAIL_FROM
    }

    return NextResponse.json({ 
      success: true,
      emailVars,
      allEnvVars,
      message: 'Alle Umgebungsvariablen überprüft'
    })
  } catch (error) {
    console.error('Error checking env vars:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}








