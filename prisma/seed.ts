import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Hash password für Admin-User
  const adminPassword = await bcrypt.hash('admin123', 10)

  // Create admin user (nur wenn noch nicht vorhanden)
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

  // SLA Warning Template (wird in work-entries verwendet)
  await prisma.emailTemplate.upsert({
    where: { name: 'sla-warning' },
    update: {},
    create: {
      name: 'sla-warning',
      subject: 'Service-Level Warnung: {{serviceLevelName}}',
      htmlContent: `
        <h2>Service-Level Warnung</h2>
        <p>Hallo {{firstName}},</p>
        <p>Ihr Service-Level "{{serviceLevelName}}" ist bald aufgebraucht:</p>
        <ul>
          <li><strong>Verfügbare Minuten:</strong> {{remainingMinutes}} von {{totalMinutes}} Minuten</li>
          <li><strong>Verbrauch:</strong> {{usagePercentage}}%</li>
          <li><strong>Nächste Verlängerung:</strong> {{nextRenewal}}</li>
          <li><strong>Stundensatz:</strong> {{hourlyRate}}€/h</li>
        </ul>
        <p>Sie können Ihr Dashboard hier einsehen: <a href="{{dashboardUrl}}">{{dashboardUrl}}</a></p>
        <p>Bitte kontaktieren Sie uns, um Ihr Service-Level zu verlängern oder zusätzliche Minuten zu kaufen.</p>
        <p>Mit freundlichen Grüßen<br>Ihr {{companyName}} Team</p>
      `,
      textContent: `
        Service-Level Warnung
        
        Hallo {{firstName}},
        
        Ihr Service-Level "{{serviceLevelName}}" ist bald aufgebraucht:
        
        Verfügbare Minuten: {{remainingMinutes}} von {{totalMinutes}} Minuten
        Verbrauch: {{usagePercentage}}%
        Nächste Verlängerung: {{nextRenewal}}
        Stundensatz: {{hourlyRate}}€/h
        
        Sie können Ihr Dashboard hier einsehen: {{dashboardUrl}}
        
        Bitte kontaktieren Sie uns, um Ihr Service-Level zu verlängern oder zusätzliche Minuten zu kaufen.
        
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
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
