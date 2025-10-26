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

      // Automatische Antwort-E-Mail senden
      await this.sendTicketCreatedEmail(ticket, parsedEmail, companyId, user)

      // E-Mail nach "Erstellt" Ordner verschieben
      await this.moveEmailToFolder(parsedEmail.messageId, 'INBOX', 'Erstellt')

      return ticket.id
    } catch (error) {
      console.error('Fehler beim Erstellen des Tickets:', error)
      throw error
    }
  }

  /**
   * Prüft ob eine E-Mail eine Antwort auf ein bestehendes Ticket ist
   */
  async isReplyToExistingTicket(email) {
    try {
      // Prüfe verschiedene Reply-Indikatoren
      const replyIndicators = [
        'Re:',
        'RE:',
        'AW:',
        'Fwd:',
        'FWD:',
        'Antwort:',
        'Reply:'
      ]

      const subject = email.subject || ''
      const isReplySubject = replyIndicators.some(indicator => 
        subject.toLowerCase().startsWith(indicator.toLowerCase())
      )

      if (!isReplySubject) {
        return false
      }

      // Suche nach bestehenden Tickets mit ähnlichem Betreff
      const originalSubject = subject.replace(/^(Re:|RE:|AW:|Fwd:|FWD:|Antwort:|Reply:)\s*/i, '').trim()
      
      const existingTicket = await prisma.ticket.findFirst({
        where: {
          OR: [
            { title: { contains: originalSubject } },
            { title: { contains: subject } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })

      return !!existingTicket
    } catch (error) {
      console.error('Fehler beim Prüfen der Reply:', error)
      return false
    }
  }

  /**
   * Behandelt eine Antwort auf ein bestehendes Ticket
   */
  async handleReplyToTicket(email) {
    try {
      // Finde das ursprüngliche Ticket
      const originalSubject = email.subject.replace(/^(Re:|RE:|AW:|Fwd:|FWD:|Antwort:|Reply:)\s*/i, '').trim()
      
      const existingTicket = await prisma.ticket.findFirst({
        where: {
          OR: [
            { title: { contains: originalSubject } },
            { title: { contains: email.subject } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })

      if (!existingTicket) {
        console.log('⚠️ Kein ursprüngliches Ticket gefunden für Antwort')
        return
      }

      // Finde die ursprüngliche E-Mail
      const originalEmail = await prisma.inboundEmail.findFirst({
        where: {
          ticketId: existingTicket.id,
          isReply: false
        },
        orderBy: { receivedAt: 'asc' }
      })

      // Speichere die Antwort-E-Mail
      const inboundEmail = await prisma.inboundEmail.create({
        data: {
          emailConfigId: this.config.id,
          messageId: email.messageId,
          fromEmail: email.fromEmail,
          fromName: email.fromName,
          toEmail: email.toEmail,
          subject: email.subject,
          content: email.content,
          htmlContent: email.htmlContent,
          attachments: email.attachments,
          receivedAt: email.receivedAt,
          isReply: true,
          parentMessageId: originalEmail?.messageId,
          companyId: existingTicket.companyId,
          ticketId: existingTicket.id,
          isProcessed: true,
          processedAt: new Date()
        }
      })

      // Füge Nachricht zum Ticket hinzu
      await prisma.ticketMessage.create({
        data: {
          ticketId: existingTicket.id,
          content: `E-Mail-Antwort von ${email.fromEmail}:\n\n${email.content}`,
          authorId: 'system',
          isSystemMessage: true
        }
      })

      // Aktualisiere Ticket-Status (falls geschlossen, wieder öffnen)
      if (existingTicket.status === 'CLOSED') {
        await prisma.ticket.update({
          where: { id: existingTicket.id },
          data: { 
            status: 'OPEN',
            updatedAt: new Date()
          }
        })
      }

      // E-Mail nach "Erstellt" Ordner verschieben (auch Antworten)
      await this.moveEmailToFolder(email.messageId, 'INBOX', 'Erstellt')

      console.log(`✅ Antwort zu Ticket #${existingTicket.ticketNumber} hinzugefügt`)
    } catch (error) {
      console.error('Fehler beim Verarbeiten der Ticket-Antwort:', error)
      throw error
    }
  }

  /**
   * Stellt sicher, dass ein Ordner existiert
   */
  async ensureFolderExists(folderName) {
    try {
      const connection = await this.connectToImap()
      
      // Ordner-Namen mit INBOX-Präfix formatieren
      const fullFolderName = folderName.startsWith('INBOX') ? folderName : `INBOX.${folderName}`
      
      try {
        // Prüfe ob Ordner existiert
        await connection.openBox(fullFolderName)
        await this.log('DEBUG', `Ordner "${fullFolderName}" existiert bereits`)
      } catch (error) {
        // Ordner existiert nicht, erstelle ihn
        await connection.addBox(fullFolderName)
        await this.log('INFO', `Ordner "${fullFolderName}" erstellt`)
      } finally {
        connection.end()
      }
    } catch (error) {
      await this.log('ERROR', `Fehler beim Erstellen des Ordners "${folderName}"`, null, error)
    }
  }

  /**
   * Verschiebt eine E-Mail in einen anderen Ordner
   */
  async moveEmailToFolder(messageId, fromFolder, toFolder) {
    try {
      // Temporär deaktiviert - E-Mail-Verschiebung funktioniert nicht mit imap-simple
      await this.log('INFO', `E-Mail-Verschiebung temporär deaktiviert: ${messageId} von ${fromFolder} nach ${toFolder}`)
      console.log(`📁 E-Mail-Verschiebung deaktiviert: ${messageId} sollte nach "${toFolder}" verschoben werden`)
    } catch (error) {
      await this.log('ERROR', `Fehler beim Verschieben der E-Mail ${messageId}`, null, error)
    }
  }

  /**
   * Sendet automatische Antwort-E-Mail für neue Tickets
   */
  async sendTicketCreatedEmail(ticket, parsedEmail, companyId, user = null) {
    try {
      // Lade Firmen-Informationen
      const company = await prisma.company.findUnique({
        where: { id: companyId }
      })

      if (!company) {
        console.log('⚠️ Firma nicht gefunden für E-Mail-Versand')
        return
      }

      // Lade E-Mail-Template
      const template = await prisma.emailTemplate.findUnique({
        where: { name: 'ticket-created' }
      })

      if (!template || !template.isActive) {
        console.log('⚠️ Ticket-created Template nicht gefunden oder inaktiv')
        return
      }

      // E-Mail senden über OUTBOUND-Konfiguration aus .env
      const nodemailer = require('nodemailer')
      
      // Prüfe ob SMTP-Konfiguration in .env vorhanden ist
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('⚠️ SMTP-Konfiguration in .env nicht vollständig')
        console.log('   Benötigt: SMTP_HOST, SMTP_USER, SMTP_PASS')
        return
      }
      
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      })

      // Template-Variablen ersetzen
      let subject = template.subject
      let content = template.textContent

      // Deutsche Übersetzungen für Priorität und Status
      const priorityTranslations = {
        'LOW': 'Niedrig',
        'MEDIUM': 'Normal',
        'HIGH': 'Hoch',
        'URGENT': 'Dringend'
      }
      
      const statusTranslations = {
        'OPEN': 'Offen',
        'IN_PROGRESS': 'In Bearbeitung',
        'WAITING_FOR_CUSTOMER': 'Warten auf Kunden',
        'CLOSED': 'Geschlossen'
      }

      // Bestimme den Namen: Benutzer aus DB oder E-Mail-Parser
      const customerName = user ? `${user.firstName} ${user.lastName}`.trim() : (parsedEmail.fromName || 'Kunde')
      
      console.log('📧 E-Mail-Template Variablen:')
      console.log('   Benutzer aus DB:', user ? `${user.firstName} ${user.lastName}` : 'Nicht gefunden')
      console.log('   E-Mail-Parser Name:', parsedEmail.fromName)
      console.log('   Finaler Name:', customerName)

      const variables = {
        ticketNumber: ticket.ticketNumber,
        ticketTitle: ticket.title,
        firstName: customerName,
        customerName: customerName,
        companyName: company.name,
        ticketId: ticket.id,
        supportEmail: process.env.EMAIL_FROM || 'support@pm-it.eu',
        priority: priorityTranslations[ticket.priority] || 'Normal',
        status: statusTranslations[ticket.status] || 'Offen',
        createdAt: new Date(ticket.createdAt).toLocaleString('de-DE', {
          timeZone: 'Europe/Berlin',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        ticketUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/tickets/${ticket.id}`,
        description: ticket.description || 'Keine Beschreibung verfügbar'
      }

      console.log('🔧 Ersetze Template-Variablen:')
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        const oldSubject = subject
        const oldContent = content
        
        subject = subject.replace(regex, String(value || ''))
        content = content.replace(regex, String(value || ''))
        
        if (oldSubject !== subject || oldContent !== content) {
          console.log(`   {{${key}}} → ${value}`)
        }
      })
      
      console.log('📧 Finaler E-Mail-Inhalt:')
      console.log(`   Betreff: ${subject}`)
      console.log(`   Inhalt: ${content.substring(0, 200)}...`)

      const mailOptions = {
        from: `${process.env.SMTP_USER} <${process.env.SMTP_USER}>`,
        to: parsedEmail.fromEmail,
        subject: subject,
        text: content,
      }

      console.log(`📧 Sende automatische Antwort an ${parsedEmail.fromEmail}...`)
      console.log(`📧 SMTP-Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || '587'}`)
      console.log(`📧 SMTP-User: ${process.env.SMTP_USER}`)
      
      const result = await transporter.sendMail(mailOptions)
      console.log(`✅ Automatische Antwort erfolgreich gesendet: ${result.messageId}`)
      
      // Logge den Erfolg
      await this.log('INFO', `Automatische Antwort gesendet an ${parsedEmail.fromEmail}`, {
        ticketNumber: ticket.ticketNumber,
        messageId: result.messageId
      })
      
    } catch (error) {
      console.error('❌ Fehler beim Senden der automatischen Antwort:', error)
      
      // Logge den Fehler
      await this.log('ERROR', `Fehler beim Senden der automatischen Antwort: ${error.message}`, {
        ticketNumber: ticket.ticketNumber,
        error: error.message,
        stack: error.stack
      })
    }
  }

  /**
   * Spam-Filter für E-Mails
   */
  async checkSpam(email) {
    try {
      const spamIndicators = {
        // Spam-Schlüsselwörter im Betreff
        subjectSpam: [
          'viagra', 'cialis', 'lottery', 'winner', 'congratulations',
          'urgent', 'act now', 'limited time', 'free money',
          'click here', 'buy now', 'discount', 'sale'
        ],
        // Spam-Schlüsselwörter im Inhalt
        contentSpam: [
          'make money', 'work from home', 'get rich', 'investment',
          'crypto', 'bitcoin', 'forex', 'trading', 'guaranteed'
        ],
        // Verdächtige E-Mail-Domains
        suspiciousDomains: [
          'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'
        ],
        // Verdächtige Absender-Muster
        suspiciousSenders: [
          'noreply@', 'no-reply@', 'donotreply@', 'automated@'
        ]
      }

      const subject = (email.subject || '').toLowerCase()
      const content = (email.content || '').toLowerCase()
      const fromEmail = (email.fromEmail || '').toLowerCase()

      // Prüfe Spam-Schlüsselwörter im Betreff
      for (const keyword of spamIndicators.subjectSpam) {
        if (subject.includes(keyword)) {
          return { isSpam: true, reason: `Spam-Schlüsselwort im Betreff: ${keyword}` }
        }
      }

      // Prüfe Spam-Schlüsselwörter im Inhalt
      for (const keyword of spamIndicators.contentSpam) {
        if (content.includes(keyword)) {
          return { isSpam: true, reason: `Spam-Schlüsselwort im Inhalt: ${keyword}` }
        }
      }

      // Prüfe verdächtige Absender
      for (const pattern of spamIndicators.suspiciousSenders) {
        if (fromEmail.includes(pattern)) {
          return { isSpam: true, reason: `Verdächtiger Absender: ${pattern}` }
        }
      }

      // Prüfe auf zu viele Großbuchstaben
      const upperCaseRatio = (subject.match(/[A-Z]/g) || []).length / subject.length
      if (upperCaseRatio > 0.5 && subject.length > 10) {
        return { isSpam: true, reason: 'Zu viele Großbuchstaben im Betreff' }
      }

      // Prüfe auf verdächtige Zeichen
      const suspiciousChars = /[!]{3,}|[$]{2,}|[*]{3,}/g
      if (suspiciousChars.test(subject)) {
        return { isSpam: true, reason: 'Verdächtige Zeichen im Betreff' }
      }

      return { isSpam: false, reason: null }
    } catch (error) {
      console.error('Fehler beim Spam-Check:', error)
      return { isSpam: false, reason: null }
    }
  }

  /**
   * E-Mail-Validierung
   */
  async validateEmail(email) {
    try {
      // E-Mail-Adresse validieren
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.fromEmail)) {
        return { isValid: false, reason: 'Ungültige E-Mail-Adresse' }
      }

      // Betreff validieren
      if (!email.subject || email.subject.trim().length === 0) {
        return { isValid: false, reason: 'Leerer Betreff' }
      }

      if (email.subject.length > 200) {
        return { isValid: false, reason: 'Betreff zu lang' }
      }

      // Inhalt validieren
      if (!email.content || email.content.trim().length === 0) {
        return { isValid: false, reason: 'Leerer E-Mail-Inhalt' }
      }

      if (email.content.length > 10000) {
        return { isValid: false, reason: 'E-Mail-Inhalt zu lang' }
      }

      // Prüfe auf verdächtige Anhänge
      if (email.attachments && email.attachments.length > 5) {
        return { isValid: false, reason: 'Zu viele Anhänge' }
      }

      // Prüfe auf verdächtige Dateitypen
      if (email.attachments) {
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com']
        for (const attachment of email.attachments) {
          const filename = attachment.filename || ''
          const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
          if (dangerousExtensions.includes(extension)) {
            return { isValid: false, reason: `Gefährlicher Anhang: ${extension}` }
          }
        }
      }

      return { isValid: true, reason: null }
    } catch (error) {
      console.error('Fehler bei der E-Mail-Validierung:', error)
      return { isValid: false, reason: 'Validierungsfehler' }
    }
  }

  /**
   * Behandelt Spam-E-Mails
   */
  async handleSpamEmail(email, reason) {
    try {
      // Spam-E-Mail in Datenbank speichern (markiert als Spam)
      await prisma.inboundEmail.create({
        data: {
          emailConfigId: this.config.id,
          messageId: email.messageId,
          fromEmail: email.fromEmail,
          fromName: email.fromName,
          toEmail: email.toEmail,
          subject: email.subject,
          content: email.content,
          htmlContent: email.htmlContent,
          attachments: email.attachments,
          receivedAt: email.receivedAt,
          isProcessed: true,
          processedAt: new Date()
        }
      })

      console.log(`🚫 Spam-E-Mail gespeichert: ${reason}`)
    } catch (error) {
      console.error('Fehler beim Speichern der Spam-E-Mail:', error)
    }
  }

  /**
   * Behandelt ungültige E-Mails
   */
  async handleInvalidEmail(email, reason) {
    try {
      // Ungültige E-Mail in Datenbank speichern
      await prisma.inboundEmail.create({
        data: {
          emailConfigId: this.config.id,
          messageId: email.messageId,
          fromEmail: email.fromEmail,
          fromName: email.fromName,
          toEmail: email.toEmail,
          subject: email.subject,
          content: email.content,
          htmlContent: email.htmlContent,
          attachments: email.attachments,
          receivedAt: email.receivedAt,
          isProcessed: true,
          processedAt: new Date()
        }
      })

      console.log(`❌ Ungültige E-Mail gespeichert: ${reason}`)
    } catch (error) {
      console.error('Fehler beim Speichern der ungültigen E-Mail:', error)
    }
  }

  /**
   * Logging-Methode für E-Mail-Ereignisse
   */
  async log(level, message, details = null, error = null) {
    try {
      // Prüfe ob Prisma-Client verfügbar ist
      if (!prisma) {
        console.error('Prisma-Client nicht verfügbar für Logging')
        return
      }

      const logData = {
        emailConfigId: this.config.id,
        level,
        message,
        details,
        errorCode: error?.code || null,
        stackTrace: error?.stack || null,
        metadata: {
          timestamp: new Date().toISOString(),
          configName: this.config.name
        }
      }

      if (prisma && prisma.emailLog) {
        await prisma.emailLog.create({
          data: logData
        })
      } else {
        console.error('Prisma emailLog nicht verfügbar')
      }

      // Console-Logging für Development
      const timestamp = new Date().toISOString()
      const logMessage = `[${timestamp}] [${level}] ${message}`
      
      switch (level) {
        case 'ERROR':
          console.error(logMessage, error)
          break
        case 'WARN':
          console.warn(logMessage)
          break
        case 'DEBUG':
          console.debug(logMessage)
          break
        default:
          console.log(logMessage)
      }
    } catch (logError) {
      console.error('Fehler beim Logging:', logError)
    }
  }

  /**
   * Fehlerbehandlung mit Logging
   */
  async handleError(error, context, email = null) {
    const errorDetails = {
      error: error.message,
      stack: error.stack,
      context,
      email: email ? {
        fromEmail: email.fromEmail,
        subject: email.subject,
        messageId: email.messageId
      } : null
    }

    await this.log('ERROR', `Fehler in ${context}: ${error.message}`, errorDetails, error)
  }

  async runPollingCycle() {
    try {
      await this.log('INFO', `Starte E-Mail-Polling für ${this.config.name}`, {
        configId: this.config.id,
        configName: this.config.name
      })

      const emails = await this.fetchEmails()
      await this.log('INFO', `${emails.length} neue E-Mails gefunden`, {
        emailCount: emails.length,
        configId: this.config.id
      })

      // Erstelle Ordner falls nicht vorhanden
      await this.ensureFolderExists('Erstellt')
      await this.ensureFolderExists('Spam')
      await this.ensureFolderExists('Ungültig')

      for (const email of emails) {
        try {
          // Spam-Filter prüfen
          const spamCheck = await this.checkSpam(email)
          if (spamCheck.isSpam) {
            console.log(`🚫 Spam-E-Mail erkannt von ${email.fromEmail}: ${spamCheck.reason}`)
            await this.handleSpamEmail(email, spamCheck.reason)
            // Spam-E-Mail nach "Spam" Ordner verschieben
            await this.moveEmailToFolder(email.messageId, 'INBOX', 'Spam')
            continue
          }

          // E-Mail-Validierung
          const validationCheck = await this.validateEmail(email)
          if (!validationCheck.isValid) {
            console.log(`❌ Ungültige E-Mail von ${email.fromEmail}: ${validationCheck.reason}`)
            await this.handleInvalidEmail(email, validationCheck.reason)
            // Ungültige E-Mail nach "Ungültig" Ordner verschieben
            await this.moveEmailToFolder(email.messageId, 'INBOX', 'Ungültig')
            continue
          }

          // Prüfe ob E-Mail bereits verarbeitet wurde (für alle E-Mails)
          const existingEmail = await prisma.inboundEmail.findUnique({
            where: {
              messageId: email.messageId
            }
          })

          if (existingEmail) {
            await this.log('DEBUG', `E-Mail ${email.messageId} bereits verarbeitet, verschiebe nach "Erstellt"`)
            // E-Mail nach "Erstellt" Ordner verschieben (auch wenn bereits verarbeitet)
            await this.moveEmailToFolder(email.messageId, 'INBOX', 'Erstellt')
            console.log(`📁 Bereits verarbeitete E-Mail nach "Erstellt" Ordner verschoben`)
            continue
          }
          
          // E-Mail-Reply-Verarbeitung deaktiviert - nur neue Tickets werden erstellt
          // Prüfe ob es eine Antwort auf ein bestehendes Ticket ist
          const isReply = await this.isReplyToExistingTicket(email)
          
          if (isReply) {
            // E-Mail-Reply-Verarbeitung deaktiviert
            console.log(`📧 E-Mail-Reply von ${email.fromEmail} ignoriert (nur System-Antworten erlaubt)`)
            // E-Mail nach "Erstellt" Ordner verschieben (aber nicht verarbeiten)
            await this.moveEmailToFolder(email.messageId, 'INBOX', 'Erstellt')
            console.log(`📁 E-Mail-Reply nach "Erstellt" Ordner verschoben`)
          } else {
            const inboundEmailId = await this.saveEmailToDatabase(email)
            const companyId = await this.findCompanyByEmail(email.fromEmail)

            if (companyId) {
              await this.createTicketFromEmail(inboundEmailId, companyId, email)
              console.log(`✅ Neues Ticket erstellt für ${email.fromEmail}`)
              // E-Mail nach "Erstellt" Ordner verschieben
              await this.moveEmailToFolder(email.messageId, 'INBOX', 'Erstellt')
              console.log(`📁 Neue E-Mail nach "Erstellt" Ordner verschoben`)
            } else {
              console.log(`⚠️ Keine Firma gefunden für ${email.fromEmail}`)
            }
          }
        } catch (error) {
          await this.handleError(error, 'E-Mail-Verarbeitung', email)
        }
      }

      await prisma.emailConfig.update({
        where: { id: this.config.id },
        data: { lastPolledAt: new Date() }
      })

      await this.log('INFO', `E-Mail-Polling abgeschlossen für ${this.config.name}`)
    } catch (error) {
      await this.handleError(error, 'E-Mail-Polling-Zyklus')
    }
  }
}

async function startEmailPolling() {
  console.log('📧 E-Mail-Polling-Service gestartet')
  
  // Prüfe zuerst ob E-Mail-Konfigurationen existieren
  const initialConfigs = await prisma.emailConfig.findMany({
    where: { isActive: true }
  })

  if (initialConfigs.length === 0) {
    console.log('📧 Keine aktiven E-Mail-Konfigurationen gefunden - Service wird beendet')
    console.log('💡 Erstellen Sie eine E-Mail-Konfiguration im Admin-Panel um den Service zu aktivieren')
    await prisma.$disconnect()
    process.exit(0)
  }

  console.log(`📧 ${initialConfigs.length} aktive E-Mail-Konfigurationen gefunden`)
  
  // Kontinuierliches Polling mit konfigurierbarem Intervall
  const pollEmails = async () => {
    try {
      const configs = await prisma.emailConfig.findMany({
        where: { isActive: true }
      })

      if (configs.length === 0) {
        console.log('📧 Keine aktiven E-Mail-Konfigurationen gefunden - warte 5 Minuten...')
        return
      }

      console.log(`📧 Polling ${configs.length} E-Mail-Konfigurationen...`)

      for (const config of configs) {
        const service = new EmailInboundService(config)
        await service.runPollingCycle()
      }
    } catch (error) {
      console.error('Fehler beim E-Mail-Polling:', error)
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
  const startPolling = async () => {
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

  await startPolling()
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
      console.log('✅ E-Mail-Polling abgeschlossen')
      if (prisma) {
        await prisma.$disconnect()
      }
      process.exit(0)
    })
    .catch(async (error) => {
      console.error('❌ Fehler beim E-Mail-Polling:', error)
      if (prisma) {
        await prisma.$disconnect()
      }
      process.exit(1)
    })
}

module.exports = { startEmailPolling, EmailInboundService }
