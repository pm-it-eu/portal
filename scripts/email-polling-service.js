const { PrismaClient } = require('@prisma/client')
const Imap = require('imap-simple')
const { simpleParser } = require('mailparser')

// Prisma-Client mit Fehlerbehandlung initialisieren
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

class EmailInboundService {
  constructor(config) {
    this.config = config
  }

  async connectToImap() {
    console.log(`🔐 Verbinde zu IMAP: ${this.config.imapHost}:${this.config.imapPort}`)
    console.log(`📧 Benutzer: ${this.config.imapUser}`)
    console.log(`🔒 TLS: ${this.config.imapSecure}`)
    
    const imapConfig = {
      imap: {
        user: this.config.imapUser,
        password: this.config.imapPassword,
        host: this.config.imapHost,
        port: this.config.imapPort,
        tls: this.config.imapSecure,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 30000,
        connTimeout: 30000,
        keepalive: {
          interval: 10000,
          idleInterval: 300000,
          forceNoop: true
        }
      }
    }

    // Versuche verschiedene Authentifizierungsmethoden
    const authMethods = ['LOGIN', 'PLAIN', 'CRAM-MD5', 'XOAUTH2']
    
    for (const authMethod of authMethods) {
      try {
        console.log(`🔐 Versuche Authentifizierung mit ${authMethod}...`)
        imapConfig.imap.authMethod = authMethod
        
        const connection = await Imap.connect(imapConfig)
        console.log(`✅ Erfolgreich mit ${authMethod} authentifiziert`)
        return connection
      } catch (error) {
        console.log(`❌ ${authMethod} fehlgeschlagen: ${error.message}`)
        if (authMethod === authMethods[authMethods.length - 1]) {
          // Letzte Methode fehlgeschlagen, detaillierten Fehler werfen
          console.error('🚨 Alle Authentifizierungsmethoden fehlgeschlagen!')
          console.error('📋 Überprüfen Sie:')
          console.error('   - E-Mail-Adresse und Passwort')
          console.error('   - IMAP-Server und Port')
          console.error('   - App-Passwort (falls 2FA aktiviert)')
          throw error
        }
      }
    }
  }

  async fetchEmails() {
    const connection = await this.connectToImap()
    const emails = []

    try {
      await connection.openBox('INBOX')
      const searchCriteria = this.getSearchCriteria()
      const fetchOptions = {
        bodies: '',
        struct: true,
        markSeen: false
      }

      const messages = await connection.search(searchCriteria, fetchOptions)

      for (const message of messages) {
        try {
          const parsedEmail = await this.parseEmail(message)
          if (parsedEmail) {
            emails.push(parsedEmail)
          }
        } catch (error) {
          console.error('Fehler beim Parsen der E-Mail:', error)
        }
      }

      return emails
    } finally {
      connection.end()
    }
  }

  getSearchCriteria() {
    const criteria = ['UNSEEN']
    if (this.config.lastPolledAt) {
      criteria.push(['SINCE', this.config.lastPolledAt])
    }
    return criteria
  }

  async parseEmail(message) {
    try {
      const buffer = Buffer.from(message.parts[0].body)
      const parsed = await simpleParser(buffer)

      // Debug: E-Mail-Struktur analysieren
      console.log('📧 E-Mail-Parser Debug:')
      console.log('   from:', JSON.stringify(parsed.from, null, 2))
      console.log('   from.value:', parsed.from?.value)
      console.log('   from.text:', parsed.from?.text)

      // Verschiedene Wege, um den Namen zu extrahieren
      let fromName = 'Kunde'
      let fromEmail = ''

      if (parsed.from) {
        // Methode 1: parsed.from.value[0].name
        if (parsed.from.value && parsed.from.value[0]) {
          fromEmail = parsed.from.value[0].address || ''
          fromName = parsed.from.value[0].name || ''
        }
        
        // Methode 2: parsed.from.text (oft "Name <email@domain.com>")
        if (!fromName && parsed.from.text) {
          const textMatch = parsed.from.text.match(/^(.+?)\s*<(.+?)>$/)
          if (textMatch) {
            fromName = textMatch[1].trim().replace(/^["']|["']$/g, '') // Entferne Anführungszeichen
            fromEmail = textMatch[2].trim()
          }
        }
        
        // Methode 3: Nur E-Mail-Adresse, dann Username extrahieren
        if (!fromName && fromEmail) {
          fromName = fromEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }
      }

      console.log(`   Extrahierter Name: "${fromName}"`)
      console.log(`   Extrahierte E-Mail: "${fromEmail}"`)

      return {
        messageId: parsed.messageId || '',
        fromEmail: fromEmail,
        fromName: fromName,
        toEmail: parsed.to?.value[0]?.address || parsed.to?.text || '',
        subject: parsed.subject || '',
        content: parsed.text || '',
        htmlContent: parsed.html,
        attachments: parsed.attachments || [],
        receivedAt: parsed.date || new Date()
      }
    } catch (error) {
      console.error('E-Mail-Parsing-Fehler:', error)
      return null
    }
  }

  async saveEmailToDatabase(parsedEmail) {
    try {
      const inboundEmail = await prisma.inboundEmail.create({
        data: {
          emailConfigId: this.config.id,
          messageId: parsedEmail.messageId,
          fromEmail: parsedEmail.fromEmail,
          fromName: parsedEmail.fromName,
          toEmail: parsedEmail.toEmail,
          subject: parsedEmail.subject,
          content: parsedEmail.content,
          htmlContent: parsedEmail.htmlContent || null,
          attachments: parsedEmail.attachments,
          receivedAt: parsedEmail.receivedAt
        }
      })

      return inboundEmail.id
    } catch (error) {
      console.error('Fehler beim Speichern der E-Mail:', error)
      throw error
    }
  }

  async findCompanyByEmail(email) {
    try {
      const domain = email.split('@')[1]
      if (!domain) return null

      const company = await prisma.company.findFirst({
        where: {
          OR: [
            { email: { endsWith: `@${domain}` } },
            { users: { some: { email: { endsWith: `@${domain}` } } } }
          ]
        }
      })

      return company?.id || null
    } catch (error) {
      console.error('Fehler beim Suchen der Firma:', error)
      return null
    }
  }

  async createTicketFromEmail(inboundEmailId, companyId, parsedEmail) {
    try {
      // Suche den Benutzer anhand der E-Mail-Adresse
      const user = await prisma.user.findFirst({
        where: { 
          email: parsedEmail.fromEmail 
        },
        include: {
          company: true
        }
      })

      console.log('👤 Benutzer-Suche für E-Mail:', parsedEmail.fromEmail)
      console.log('   Gefundener Benutzer:', user ? `${user.firstName} ${user.lastName}` : 'Nicht gefunden')

      const lastTicket = await prisma.ticket.findFirst({
        orderBy: { ticketNumber: 'desc' }
      })
      const nextTicketNumber = (lastTicket?.ticketNumber || 0) + 1

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: nextTicketNumber,
          title: parsedEmail.subject || 'E-Mail-Ticket',
          description: parsedEmail.content,
          companyId: companyId,
          status: 'OPEN',
          priority: 'MEDIUM'
        }
      })

      await prisma.inboundEmail.update({
        where: { id: inboundEmailId },
        data: {
          companyId: companyId,
          ticketId: ticket.id,
          isProcessed: true,
          processedAt: new Date()
        }
      })

      // Erstelle erste Nachricht mit E-Mail-Text
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          content: `E-Mail von ${parsedEmail.fromEmail}:\n\n${parsedEmail.content}`,
          authorId: 'cmh6h5ly90000au04tcwlq2ik', // Admin-User-ID
          isSystemMessage: false, // Normale Nachricht, nicht System-Nachricht
          isInternalNote: false // Für Kunden sichtbar
        }
      })

      console.log(`✅ Neues Ticket #${ticket.ticketNumber} erstellt für ${parsedEmail.fromEmail}`)
      return ticket.id
    } catch (error) {
      console.error('Fehler beim Erstellen des Tickets:', error)
      throw error
    }
  }

  async runPollingCycle() {
    try {
      console.log(`📧 Starte E-Mail-Polling für ${this.config.name}`)

      const emails = await this.fetchEmails()
      console.log(`📧 ${emails.length} neue E-Mails gefunden`)

      for (const email of emails) {
        try {
          // Prüfe ob E-Mail bereits verarbeitet wurde
          const existingEmail = await prisma.inboundEmail.findUnique({
            where: {
              messageId: email.messageId
            }
          })

          if (existingEmail) {
            console.log(`📧 E-Mail ${email.messageId} bereits verarbeitet`)
            continue
          }
          
          const inboundEmailId = await this.saveEmailToDatabase(email)
          const companyId = await this.findCompanyByEmail(email.fromEmail)

          if (companyId) {
            await this.createTicketFromEmail(inboundEmailId, companyId, email)
          } else {
            console.log(`⚠️ Keine Firma gefunden für ${email.fromEmail}`)
          }
        } catch (error) {
          console.error('Fehler bei E-Mail-Verarbeitung:', error)
        }
      }

      await prisma.emailConfig.update({
        where: { id: this.config.id },
        data: { lastPolledAt: new Date() }
      })

      console.log(`✅ E-Mail-Polling abgeschlossen für ${this.config.name}`)
    } catch (error) {
      console.error('Fehler beim E-Mail-Polling-Zyklus:', error)
    }
  }
}

async function startEmailPolling() {
  console.log('📧 E-Mail-Polling-Service gestartet')
  
  // Prüfe ob E-Mail-Konfigurationen existieren
  const configs = await prisma.emailConfig.findMany({
    where: { isActive: true }
  })

  if (configs.length === 0) {
    console.log('📧 Keine aktiven E-Mail-Konfigurationen gefunden')
    console.log('💡 Erstellen Sie eine E-Mail-Konfiguration im Admin-Panel um den Service zu aktivieren')
    console.log('⏰ Service wartet 5 Minuten und prüft erneut...')
    
    // Warte 5 Minuten und prüfe erneut
    setInterval(async () => {
      try {
        const newConfigs = await prisma.emailConfig.findMany({
          where: { isActive: true }
        })
        
        if (newConfigs.length > 0) {
          console.log(`📧 ${newConfigs.length} E-Mail-Konfigurationen gefunden - starte Polling...`)
          await startPollingWithConfigs(newConfigs)
        }
      } catch (error) {
        console.error('❌ Fehler beim Prüfen der E-Mail-Konfigurationen:', error)
      }
    }, 5 * 60 * 1000) // 5 Minuten
    
    return // Beende die Funktion, aber lasse den Prozess laufen
  }

  console.log(`📧 ${configs.length} aktive E-Mail-Konfigurationen gefunden`)
  await startPollingWithConfigs(configs)
}

// Funktion für Polling mit Konfigurationen
async function startPollingWithConfigs(configs) {
  console.log(`📧 Starte Polling für ${configs.length} E-Mail-Konfigurationen...`)

  // Polling-Funktion
  const pollEmails = async () => {
    try {
      for (const config of configs) {
        const service = new EmailInboundService(config)
        await service.runPollingCycle()
      }
    } catch (error) {
      console.error('❌ Fehler beim E-Mail-Polling:', error)
    }
  }

  // Erstes Polling sofort ausführen
  await pollEmails()

  // Dynamisches Intervall aus der Datenbank laden
  const getPollingInterval = async () => {
    try {
      const config = await prisma.emailConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' }
      })
      return (config?.pollingInterval || 5) * 60 * 1000 // Minuten zu Millisekunden
    } catch (error) {
      console.error('Fehler beim Laden des Polling-Intervalls:', error)
      return 5 * 60 * 1000 // Fallback: 5 Minuten
    }
  }

  // Kontinuierliches Polling mit dynamischem Intervall
  const interval = await getPollingInterval()
  console.log(`📧 E-Mail-Polling läuft alle ${interval / 60000} Minuten`)
  
  // Korrekte setInterval Implementierung mit Fehlerbehandlung
  setInterval(() => {
    pollEmails().catch(error => {
      console.error('❌ Fehler beim E-Mail-Polling:', error)
      // Script nicht beenden, nur loggen
    })
  }, interval)
}

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Graceful Shutdown...')
  if (prisma) {
    await prisma.$disconnect()
    console.log('✅ Prisma-Client getrennt')
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Graceful Shutdown...')
  if (prisma) {
    await prisma.$disconnect()
    console.log('✅ Prisma-Client getrennt')
  }
  process.exit(0)
})

// Wenn direkt ausgeführt
if (require.main === module) {
  startEmailPolling()
    .then(async () => {
      console.log('✅ E-Mail-Polling Service läuft')
    })
    .catch(async (error) => {
      console.error('❌ Fehler beim Starten des E-Mail-Polling:', error)
      if (prisma) {
        await prisma.$disconnect()
      }
      process.exit(1)
    })
}

module.exports = { startEmailPolling, EmailInboundService }
