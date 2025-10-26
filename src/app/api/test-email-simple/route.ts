import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // E-Mail-Konfiguration prüfen
    const emailConfig = {
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
      port: process.env.SMTP_PORT || process.env.EMAIL_PORT,
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: (process.env.SMTP_PASS || process.env.EMAIL_PASS) ? '***' : 'NOT_SET',
      from: process.env.EMAIL_FROM
    }

    console.log('E-Mail Konfiguration:', emailConfig)

    // Einfacher Test-Transporter - SSL Port 465
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
      port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465'),
      secure: true, // true für 465 (SSL), false für 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Für lokale Tests
      }
    })

    // Verbindung testen
    console.log('Teste SMTP-Verbindung...')
    await transporter.verify()
    console.log('SMTP-Verbindung erfolgreich!')

    // Test-E-Mail senden
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'PM-IT Support <support@pm-it.eu>',
      to: 'info@pm-it.eu',
      subject: 'Test E-Mail von PM-IT System',
      html: `
        <h1>Test E-Mail</h1>
        <p>Diese E-Mail wurde vom PM-IT System gesendet.</p>
        <p>Zeit: ${new Date().toLocaleString('de-DE')}</p>
        <p>Konfiguration:</p>
        <ul>
          <li>Host: ${process.env.EMAIL_HOST}</li>
          <li>Port: ${process.env.EMAIL_PORT}</li>
          <li>User: ${process.env.EMAIL_USER}</li>
        </ul>
      `,
      text: `Test E-Mail vom PM-IT System - ${new Date().toLocaleString('de-DE')}`
    }

    console.log('Sende Test-E-Mail...')
    const result = await transporter.sendMail(mailOptions)
    console.log('E-Mail gesendet:', result.messageId)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test-E-Mail erfolgreich gesendet',
      messageId: result.messageId,
      config: emailConfig
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message,
      config: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? '***' : 'NOT_SET',
        from: process.env.EMAIL_FROM
      }
    }, { status: 500 })
  }
}
