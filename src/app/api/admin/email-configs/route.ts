import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const configs = await prisma.emailConfig.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ configs })
  } catch (error) {
    console.error('Fehler beim Laden der E-Mail-Konfigurationen:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Konfigurationen' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      name,
      emailAddress,
      imapHost,
      imapPort,
      imapSecure,
      imapUser,
      imapPassword,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      isActive,
      pollingInterval
    } = body

    const config = await prisma.emailConfig.create({
      data: {
        name,
        emailAddress,
        imapHost,
        imapPort: parseInt(imapPort),
        imapSecure: Boolean(imapSecure),
        imapUser,
        imapPassword,
        smtpHost,
        smtpPort: smtpPort ? parseInt(smtpPort) : null,
        smtpSecure: Boolean(smtpSecure),
        smtpUser,
        smtpPassword,
        isActive: Boolean(isActive),
        pollingInterval: parseInt(pollingInterval) || 5
      }
    })

    return NextResponse.json({ 
      success: true, 
      config,
      message: 'E-Mail-Konfiguration erfolgreich erstellt' 
    })
  } catch (error) {
    console.error('Fehler beim Erstellen der E-Mail-Konfiguration:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Erstellen der Konfiguration',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}




