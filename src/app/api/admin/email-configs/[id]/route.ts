import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const config = await prisma.emailConfig.findUnique({
      where: { id }
    })

    if (!config) {
      return NextResponse.json(
        { error: 'E-Mail-Konfiguration nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Fehler beim Laden der E-Mail-Konfiguration:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Konfiguration' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const config = await prisma.emailConfig.update({
      where: { id },
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
      message: 'E-Mail-Konfiguration erfolgreich aktualisiert' 
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren der E-Mail-Konfiguration:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Aktualisieren der Konfiguration',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.emailConfig.delete({
      where: { id }
    })

    return NextResponse.json({ 
      success: true,
      message: 'E-Mail-Konfiguration erfolgreich gelöscht' 
    })
  } catch (error) {
    console.error('Fehler beim Löschen der E-Mail-Konfiguration:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Löschen der Konfiguration',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}



