import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

// Lade .env-Datei falls nicht bereits geladen
if (!process.env.SMTP_HOST) {
  dotenv.config()
}

// E-Mail-Transporter konfigurieren - Robuste SSL/TLS Konfiguration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
  port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465'),
  secure: true, // true für 465 (SSL), false für 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    // Keine expliziten Cipher-Suites - lassen wir Node.js entscheiden
  },
  // Zusätzliche Optionen für bessere Kompatibilität
  connectionTimeout: 60000, // 60 Sekunden Timeout
  greetingTimeout: 30000, // 30 Sekunden Greeting Timeout
  socketTimeout: 60000, // 60 Sekunden Socket Timeout
  // Anti-Spam Konfiguration
  pool: true, // Connection Pooling für bessere Reputation
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 20000, // 20 Sekunden zwischen E-Mails
  rateLimit: 5, // Max 5 E-Mails pro Rate-Delta
  // DKIM Signierung deaktiviert (kann SSL-Probleme verursachen)
})

// Template-Variablen ersetzen
function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, String(value || ''))
  })
  
  return result
}

// E-Mail senden (nur Text)
export async function sendEmail({
  to,
  subject,
  textContent,
  variables = {}
}: {
  to: string
  subject: string
  textContent: string
  variables?: Record<string, any>
}) {
  try {
    // Variablen in Template ersetzen
    const processedSubject = replaceVariables(subject, variables)
    const processedText = replaceVariables(textContent, variables)

    const mailOptions = {
      from: process.env.EMAIL_FROM || `pmIT Support <${process.env.SMTP_USER || 'portal@pm-it.eu'}>`,
      to,
      subject: processedSubject,
      text: processedText,
      // Anti-Spam Headers
      headers: {
        'X-Mailer': 'pmIT Kundencenter',
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal',
        'X-Report-Abuse': 'Please report abuse to abuse@pm-it.eu',
        'List-Unsubscribe': '<mailto:unsubscribe@pm-it.eu>',
        'List-Id': 'pmIT Kundencenter <kundencenter.pm-it.eu>',
        'X-Auto-Response-Suppress': 'All',
        'Precedence': 'bulk',
        'Return-Path': process.env.SMTP_USER || 'portal@pm-it.eu',
        'Reply-To': 'support@pm-it.eu',
        'X-Entity-Ref-ID': `pmIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      // DKIM und SPF freundliche Konfiguration
      envelope: {
        from: process.env.SMTP_USER || 'portal@pm-it.eu',
        to: to
      }
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('E-Mail erfolgreich gesendet:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Fehler beim Senden der E-Mail:', error)
    return { success: false, error: error.message }
  }
}

// Template aus Datenbank laden und E-Mail senden
export async function sendTemplateEmail({
  templateName,
  to,
  variables = {}
}: {
  templateName: string
  to: string
  variables?: Record<string, any>
}) {
  try {
    // Template aus Datenbank laden
    const { prisma } = await import('@/lib/prisma')
    const template = await prisma.emailTemplate.findUnique({
      where: { name: templateName }
    })

    if (!template) {
      throw new Error(`Template '${templateName}' nicht gefunden`)
    }

    if (!template.isActive) {
      throw new Error(`Template '${templateName}' ist nicht aktiv`)
    }

    return await sendEmail({
      to,
      subject: template.subject,
      textContent: template.textContent,
      variables
    })
  } catch (error) {
    console.error('Fehler beim Senden der Template-E-Mail:', error)
    return { success: false, error: error.message }
  }
}

// Automatische Antwort auf neue Tickets senden
export async function sendTicketCreatedNotification({
  ticketId,
  ticketNumber,
  customerEmail,
  customerName,
  ticketTitle,
  companyName
}: {
  ticketId: string
  ticketNumber: number
  customerEmail: string
  customerName?: string
  ticketTitle: string
  companyName: string
}) {
  try {
    const variables = {
      ticketNumber,
      ticketTitle,
      customerName: customerName || 'Kunde',
      companyName,
      ticketId,
      supportEmail: process.env.EMAIL_FROM || 'support@pm-it.eu'
    }

    return await sendTemplateEmail({
      templateName: 'ticket-created',
      to: customerEmail,
      variables
    })
  } catch (error) {
    console.error('Fehler beim Senden der Ticket-Benachrichtigung:', error)
    return { success: false, error: error.message }
  }
}

// Automatische Antwort auf Ticket-Updates senden
export async function sendTicketUpdatedNotification({
  ticketId,
  ticketNumber,
  customerEmail,
  customerName,
  ticketTitle,
  companyName,
  updateMessage
}: {
  ticketId: string
  ticketNumber: number
  customerEmail: string
  customerName?: string
  ticketTitle: string
  companyName: string
  updateMessage: string
}) {
  try {
    const variables = {
      ticketNumber,
      ticketTitle,
      firstName: customerName || 'Kunde',
      newStatus: 'Status geändert',
      changedBy: 'System',
      updatedAt: new Date().toLocaleString('de-DE'),
      ticketUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/tickets/${ticketId}`,
      message: updateMessage,
      companyName,
      supportEmail: process.env.EMAIL_FROM || 'support@pm-it.eu'
    }

    return await sendTemplateEmail({
      templateName: 'ticket-updated',
      to: customerEmail,
      variables
    })
  } catch (error) {
    console.error('Fehler beim Senden der Ticket-Update-Benachrichtigung:', error)
    return { success: false, error: error.message }
  }
}

// Willkommens-E-Mail für neue Kunden senden
export async function sendWelcomeEmail({
  customerEmail,
  customerName,
  companyName
}: {
  customerEmail: string
  customerName?: string
  companyName: string
}) {
  try {
    const variables = {
      name: customerName || 'Kunde',
      customerName: customerName || 'Kunde',
      companyName,
      loginUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`,
      supportEmail: process.env.EMAIL_FROM || 'support@pm-it.eu'
    }

    return await sendTemplateEmail({
      templateName: 'welcome',
      to: customerEmail,
      variables
    })
  } catch (error) {
    console.error('Fehler beim Senden der Willkommens-E-Mail:', error)
    return { success: false, error: error.message }
  }
}
