import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Manueller E-Mail-Poll gestartet...')
    
    // Führe den Server-Service aus
    const { stdout, stderr } = await execAsync('node scripts/email-polling-service.js')
    
    if (stderr) {
      console.error('E-Mail-Polling Stderr:', stderr)
    }
    
    console.log('E-Mail-Polling Output:', stdout)
    
    return NextResponse.json({ 
      success: true, 
      message: 'E-Mail-Polling erfolgreich abgeschlossen',
      output: stdout
    })
  } catch (error) {
    console.error('Fehler beim E-Mail-Polling:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim E-Mail-Polling',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'E-Mail-Polling API - POST für manuellen Poll verwenden' 
  })
}

