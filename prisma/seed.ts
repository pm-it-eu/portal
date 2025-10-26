import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10)
  const clientPassword = await bcrypt.hash('kunde123', 10)

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pmit.de' },
    update: {},
    create: {
      email: 'admin@pmit.de',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  })

  // Create demo company
  const company = await prisma.company.upsert({
    where: { id: 'demo-company' },
    update: {},
    create: {
      id: 'demo-company',
      name: 'Beispiel GmbH',
      email: 'info@beispiel.de',
      phone: '+49 123 456789',
      address: 'Musterstraße 123, 12345 Musterstadt',
    },
  })

  // Create client user
  const client = await prisma.user.upsert({
    where: { email: 'kunde@beispiel.de' },
    update: {},
    create: {
      email: 'kunde@beispiel.de',
      password: clientPassword,
      firstName: 'Max',
      lastName: 'Mustermann',
      role: 'CLIENT',
      companyId: company.id,
    },
  })

  // Create service level for company
  const serviceLevel = await prisma.serviceLevel.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      name: 'Standard Support',
      timeVolumeMinutes: 480, // 8 hours
      remainingMinutes: 480, // Start with full volume
      hourlyRate: 85.0,
      renewalType: 'MONTHLY',
      lastRenewedAt: new Date(),
      nextRenewalAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  })

  // Create custom options
  const backupOption = await prisma.customOption.upsert({
    where: { id: 'backup-option' },
    update: {},
    create: {
      id: 'backup-option',
      name: 'Backup-Service',
      description: 'Tägliche automatische Backups',
      price: 25.0,
    },
  })

  const monitoringOption = await prisma.customOption.upsert({
    where: { id: 'monitoring-option' },
    update: {},
    create: {
      id: 'monitoring-option',
      name: 'Server-Monitoring',
      description: '24/7 Server-Überwachung',
      price: 45.0,
    },
  })

  // Assign custom options to company
  await prisma.companyCustomOption.upsert({
    where: {
      companyId_customOptionId: {
        companyId: company.id,
        customOptionId: backupOption.id,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      customOptionId: backupOption.id,
    },
  })

  // Create sample tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      ticketNumber: 1,
      title: 'Server läuft langsam',
      description: 'Unser Server reagiert sehr langsam auf Anfragen.',
      status: 'OPEN',
      priority: 'HIGH',
      companyId: company.id,
    },
  })

  const ticket2 = await prisma.ticket.create({
    data: {
      ticketNumber: 2,
      title: 'Backup-Fehler',
      description: 'Das gestrige Backup ist fehlgeschlagen.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      companyId: company.id,
    },
  })

  // Create sample messages
  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket1.id,
      content: 'Hallo, unser Server läuft seit gestern sehr langsam. Können Sie das bitte überprüfen?',
      isInternalNote: false,
      authorId: client.id,
    },
  })

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket1.id,
      content: 'Ich schaue mir das Problem an und melde mich zurück.',
      isInternalNote: false,
      authorId: admin.id,
    },
  })

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket1.id,
      content: 'Interne Notiz: Server-Logs zeigen hohe CPU-Last. Möglicherweise DDoS-Angriff.',
      isInternalNote: true,
      authorId: admin.id,
    },
  })

  // Create sample work entries
  await prisma.workEntry.create({
    data: {
      ticketId: ticket1.id,
      minutes: 45,
      roundedMinutes: 45,
      description: 'Server-Analyse und Performance-Optimierung',
      hourlyRate: null, // Inklusiv-Volumen
      totalAmount: null, // Kein Betrag bei Inklusiv
      isFromIncludedVolume: true,
      isBilled: false,
    },
  })

  // Create sample invoice
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-001',
      companyId: company.id,
      amount: 150.0,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: 'OPEN',
    },
  })

  // Create email templates
  await prisma.emailTemplate.upsert({
    where: { name: 'ticket-created' },
    update: {},
    create: {
      name: 'ticket-created',
      subject: 'Neues Ticket #{{ticketNumber}} - {{ticketTitle}}',
      htmlContent: `
        <h2>Neues Ticket erstellt</h2>
        <p>Hallo {{firstName}},</p>
        <p>Ihr Ticket wurde erfolgreich erstellt:</p>
        <ul>
          <li><strong>Ticket-Nummer:</strong> #{{ticketNumber}}</li>
          <li><strong>Titel:</strong> {{ticketTitle}}</li>
          <li><strong>Priorität:</strong> {{priority}}</li>
          <li><strong>Status:</strong> {{status}}</li>
          <li><strong>Erstellt am:</strong> {{createdAt}}</li>
        </ul>
        <p><strong>Beschreibung:</strong></p>
        <p>{{description}}</p>
        <p>Sie können Ihr Ticket hier einsehen: <a href="{{ticketUrl}}">{{ticketUrl}}</a></p>
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        <p>Mit freundlichen Grüßen<br>Ihr {{companyName}} Team</p>
      `,
      textContent: `
        Neues Ticket erstellt
        
        Hallo {{firstName}},
        
        Ihr Ticket wurde erfolgreich erstellt:
        
        Ticket-Nummer: #{{ticketNumber}}
        Titel: {{ticketTitle}}
        Priorität: {{priority}}
        Status: {{status}}
        Erstellt am: {{createdAt}}
        
        Beschreibung:
        {{description}}
        
        Sie können Ihr Ticket hier einsehen: {{ticketUrl}}
        
        Bei Fragen stehen wir Ihnen gerne zur Verfügung.
        
        Mit freundlichen Grüßen
        Ihr {{companyName}} Team
      `,
      isActive: true,
    },
  })

  await prisma.emailTemplate.upsert({
    where: { name: 'ticket-updated' },
    update: {},
    create: {
      name: 'ticket-updated',
      subject: 'Ticket #{{ticketNumber}} wurde aktualisiert',
      htmlContent: `
        <h2>Ticket aktualisiert</h2>
        <p>Hallo {{firstName}},</p>
        <p>Ihr Ticket #{{ticketNumber}} wurde aktualisiert:</p>
        <ul>
          <li><strong>Titel:</strong> {{ticketTitle}}</li>
          <li><strong>Status:</strong> {{status}}</li>
          <li><strong>Priorität:</strong> {{priority}}</li>
          <li><strong>Letzte Aktualisierung:</strong> {{updatedAt}}</li>
        </ul>
        <p>Sie können Ihr Ticket hier einsehen: <a href="{{ticketUrl}}">{{ticketUrl}}</a></p>
        <p>Mit freundlichen Grüßen<br>Ihr {{companyName}} Team</p>
      `,
      textContent: `
        Ticket aktualisiert
        
        Hallo {{firstName}},
        
        Ihr Ticket #{{ticketNumber}} wurde aktualisiert:
        
        Titel: {{ticketTitle}}
        Status: {{status}}
        Priorität: {{priority}}
        Letzte Aktualisierung: {{updatedAt}}
        
        Sie können Ihr Ticket hier einsehen: {{ticketUrl}}
        
        Mit freundlichen Grüßen
        Ihr {{companyName}} Team
      `,
      isActive: true,
    },
  })

  await prisma.emailTemplate.upsert({
    where: { name: 'ticket-closed' },
    update: {},
    create: {
      name: 'ticket-closed',
      subject: 'Ticket #{{ticketNumber}} wurde geschlossen',
      htmlContent: `
        <h2>Ticket geschlossen</h2>
        <p>Hallo {{firstName}},</p>
        <p>Ihr Ticket #{{ticketNumber}} wurde erfolgreich geschlossen:</p>
        <ul>
          <li><strong>Titel:</strong> {{ticketTitle}}</li>
          <li><strong>Status:</strong> {{status}}</li>
          <li><strong>Geschlossen am:</strong> {{closedAt}}</li>
        </ul>
        <p>Falls Sie weitere Fragen haben, können Sie gerne ein neues Ticket erstellen.</p>
        <p>Mit freundlichen Grüßen<br>Ihr {{companyName}} Team</p>
      `,
      textContent: `
        Ticket geschlossen
        
        Hallo {{firstName}},
        
        Ihr Ticket #{{ticketNumber}} wurde erfolgreich geschlossen:
        
        Titel: {{ticketTitle}}
        Status: {{status}}
        Geschlossen am: {{closedAt}}
        
        Falls Sie weitere Fragen haben, können Sie gerne ein neues Ticket erstellen.
        
        Mit freundlichen Grüßen
        Ihr {{companyName}} Team
      `,
      isActive: true,
    },
  })

  // Invoice Created Template
  await prisma.emailTemplate.upsert({
    where: { name: 'invoice-created' },
    update: {},
    create: {
      name: 'invoice-created',
      subject: 'Rechnung #{{invoiceNumber}} - {{amount}}€',
      htmlContent: `
        <h2>Neue Rechnung erstellt</h2>
        <p>Hallo {{firstName}},</p>
        <p>eine neue Rechnung wurde für Sie erstellt:</p>
        <ul>
          <li><strong>Rechnungsnummer:</strong> {{invoiceNumber}}</li>
          <li><strong>Betrag:</strong> {{amount}}€</li>
          <li><strong>Fälligkeitsdatum:</strong> {{dueDate}}</li>
          <li><strong>Status:</strong> {{status}}</li>
        </ul>
        <p>Sie können Ihre Rechnungen hier einsehen: <a href="{{invoiceUrl}}">{{invoiceUrl}}</a></p>
        <p>Mit freundlichen Grüßen<br>Ihr {{companyName}} Team</p>
      `,
      textContent: `
        Neue Rechnung erstellt
        
        Hallo {{firstName}},
        
        eine neue Rechnung wurde für Sie erstellt:
        
        Rechnungsnummer: {{invoiceNumber}}
        Betrag: {{amount}}€
        Fälligkeitsdatum: {{dueDate}}
        Status: {{status}}
        
        Sie können Ihre Rechnungen hier einsehen: {{invoiceUrl}}
        
        Mit freundlichen Grüßen
        Ihr {{companyName}} Team
      `,
      isActive: true,
    },
  })

  // Invoice Paid Template
  await prisma.emailTemplate.upsert({
    where: { name: 'invoice-paid' },
    update: {},
    create: {
      name: 'invoice-paid',
      subject: 'Rechnung #{{invoiceNumber}} bezahlt - Vielen Dank!',
      htmlContent: `
        <h2>Rechnung bezahlt</h2>
        <p>Hallo {{firstName}},</p>
        <p>vielen Dank für die Zahlung Ihrer Rechnung:</p>
        <ul>
          <li><strong>Rechnungsnummer:</strong> {{invoiceNumber}}</li>
          <li><strong>Betrag:</strong> {{amount}}€</li>
          <li><strong>Bezahlt am:</strong> {{paidAt}}</li>
        </ul>
        <p>Ihre Rechnung wurde erfolgreich beglichen.</p>
        <p>Mit freundlichen Grüßen<br>Ihr {{companyName}} Team</p>
      `,
      textContent: `
        Rechnung bezahlt
        
        Hallo {{firstName}},
        
        vielen Dank für die Zahlung Ihrer Rechnung:
        
        Rechnungsnummer: {{invoiceNumber}}
        Betrag: {{amount}}€
        Bezahlt am: {{paidAt}}
        
        Ihre Rechnung wurde erfolgreich beglichen.
        
        Mit freundlichen Grüßen
        Ihr {{companyName}} Team
      `,
      isActive: true,
    },
  })

  // Welcome Email Template
  await prisma.emailTemplate.upsert({
    where: { name: 'welcome' },
    update: {},
    create: {
      name: 'welcome',
      subject: 'Willkommen bei {{companyName}}!',
      htmlContent: `
        <h2>Willkommen bei {{companyName}}!</h2>
        <p>Hallo {{firstName}},</p>
        <p>herzlich willkommen in unserem Kundenportal!</p>
        <p>Ihr Account wurde erfolgreich erstellt:</p>
        <ul>
          <li><strong>E-Mail:</strong> {{email}}</li>
          <li><strong>Firma:</strong> {{companyName}}</li>
          <li><strong>Rolle:</strong> {{role}}</li>
        </ul>
        <p>Sie können sich hier anmelden: <a href="{{loginUrl}}">{{loginUrl}}</a></p>
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        <p>Mit freundlichen Grüßen<br>Ihr {{companyName}} Team</p>
      `,
      textContent: `
        Willkommen bei {{companyName}}!
        
        Hallo {{firstName}},
        
        herzlich willkommen in unserem Kundenportal!
        
        Ihr Account wurde erfolgreich erstellt:
        
        E-Mail: {{email}}
        Firma: {{companyName}}
        Rolle: {{role}}
        
        Sie können sich hier anmelden: {{loginUrl}}
        
        Bei Fragen stehen wir Ihnen gerne zur Verfügung.
        
        Mit freundlichen Grüßen
        Ihr {{companyName}} Team
      `,
      isActive: true,
    },
  })

  // Maintenance Notification Template
  await prisma.emailTemplate.upsert({
    where: { name: 'maintenance-notification' },
    update: {},
    create: {
      name: 'maintenance-notification',
      subject: 'Wartungsmeldung: {{maintenanceTitle}}',
      htmlContent: `
        <h2>Wartungsmeldung</h2>
        <p>Hallo {{firstName}},</p>
        <p>wir möchten Sie über eine geplante Wartung informieren:</p>
        <ul>
          <li><strong>Titel:</strong> {{maintenanceTitle}}</li>
          <li><strong>Beschreibung:</strong> {{maintenanceDescription}}</li>
          <li><strong>Geplant für:</strong> {{scheduledDate}}</li>
          <li><strong>Geschätzte Dauer:</strong> {{estimatedDuration}}</li>
          <li><strong>Status:</strong> {{status}}</li>
        </ul>
        <p>Falls Sie Fragen haben, kontaktieren Sie uns gerne.</p>
        <p>Mit freundlichen Grüßen<br>Ihr {{companyName}} Team</p>
      `,
      textContent: `
        Wartungsmeldung
        
        Hallo {{firstName}},
        
        wir möchten Sie über eine geplante Wartung informieren:
        
        Titel: {{maintenanceTitle}}
        Beschreibung: {{maintenanceDescription}}
        Geplant für: {{scheduledDate}}
        Geschätzte Dauer: {{estimatedDuration}}
        Status: {{status}}
        
        Falls Sie Fragen haben, kontaktieren Sie uns gerne.
        
        Mit freundlichen Grüßen
        Ihr {{companyName}} Team
      `,
      isActive: true,
    },
  })

  console.log('Seed data created successfully!')
  console.log('Admin user:', admin.email)
  console.log('Client user:', client.email)
  console.log('Company:', company.name)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
