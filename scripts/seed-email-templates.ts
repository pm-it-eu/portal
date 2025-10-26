import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const emailTemplates = [
  {
    name: 'welcome',
    subject: 'Willkommen bei pmIT - Ihr Kundencenter ist bereit!',
    htmlContent: '',
    textContent: `
================================================
WILLKOMMEN BEI PMIT - IHR KUNDENCENTER IST BEREIT!
================================================

Liebe/r {{name}},

ich freue mich, Sie in Ihrem persönlichen Kundencenter begrüßen zu dürfen! 
Ihr Account wurde erfolgreich eingerichtet und Sie können nun alle Services 
von pmIT bequem online verwalten.

🚀 WAS SIE IN IHREM KUNDENCENTER ERWARTET:
================================================
• Übersicht über Ihre Service-Level und verbleibende Leistungen
• Ticket-System für schnelle Support-Anfragen  
• Transparente Abrechnungsübersicht
• Direkter Zugang zu Ihren Rechnungen und Dokumenten

🔗 ZUM KUNDENCENTER:
{{loginUrl}}

Bei Fragen oder Problemen stehe ich Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen,
Ihr pmIT Team

================================================
PMIT SUPPORT
================================================
E-Mail: info@pm-it.eu
Telefon: +49 151 61 63 04 34
Web: https://pm-it.eu

Dein Partner in der digitalen Revolution

---
Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.
Bei Fragen wenden Sie sich an: support@pm-it.eu
    `
  },
  {
    name: 'ticket-created',
    subject: 'Neues Ticket #{{ticketNumber}} erstellt',
    htmlContent: '',
    textContent: `
================================================
NEUES TICKET ERSTELLT
================================================

Hallo {{firstName}},

Ihr Support-Ticket wurde erfolgreich erstellt und ist in meinem System eingegangen.

TICKET-DETAILS:
================================================
• Ticket-Nummer: #{{ticketNumber}}
• Titel: {{ticketTitle}}
• Priorität: {{priority}}
• Status: {{status}}
• Erstellt am: {{createdAt}}

Mein Support-Team wird sich schnellstmöglich um Ihr Anliegen kümmern.

Ticket ansehen: {{ticketUrl}}

================================================
PMIT SUPPORT
================================================
E-Mail: info@pm-it.eu
Telefon: +49 151 61 63 04 34
Web: https://pm-it.eu

Dein Partner in der digitalen Revolution
    `
  },
  {
    name: 'ticket-updated',
    subject: 'Ticket #{{ticketNumber}} wurde aktualisiert',
    htmlContent: '',
    textContent: `
================================================
TICKET UPDATE
================================================

Hallo {{firstName}},

Ihr Ticket #{{ticketNumber}} wurde aktualisiert.

AKTUALISIERUNG:
================================================
• Ticket: {{ticketTitle}}
• Neuer Status: {{newStatus}}
• Geändert von: {{changedBy}}
• Zeitpunkt: {{updatedAt}}

📝 NEUE NACHRICHT:
================================================
{{message}}

🔗 Ticket ansehen: {{ticketUrl}}

================================================
PMIT SUPPORT
================================================
E-Mail: info@pm-it.eu
Telefon: +49 151 61 63 04 34
Web: https://pm-it.eu

Dein Partner in der digitalen Revolution
    `
  },
  {
    name: 'invoice-created',
    subject: 'Neue Rechnung #{{invoiceNumber}}',
    htmlContent: '',
    textContent: `
================================================
NEUE RECHNUNG
================================================

Hallo {{firstName}},

eine neue Rechnung wurde für Sie erstellt und steht zum Download bereit.

RECHNUNGSDETAILS:
================================================
• Rechnungsnummer: {{invoiceNumber}}
• Betrag: €{{amount}}
• Fälligkeitsdatum: {{dueDate}}
• Erstellt am: {{createdAt}}

Bitte begleichen Sie die Rechnung bis zum Fälligkeitsdatum.

Rechnung herunterladen: {{invoiceUrl}}

================================================
PMIT SUPPORT
================================================
E-Mail: info@pm-it.eu
Telefon: +49 151 61 63 04 34
Web: https://pm-it.eu

Dein Partner in der digitalen Revolution
    `
  },
  {
    name: 'invoice-paid',
    subject: '✅ Rechnung #{{invoiceNumber}} bezahlt',
    htmlContent: '',
    textContent: `
================================================
RECHNUNG BEZAHLT
================================================

Hallo {{firstName}},

vielen Dank! Ihre Rechnung wurde erfolgreich beglichen.

RECHNUNGSDETAILS:
================================================
• Rechnungsnummer: {{invoiceNumber}}
• Betrag: €{{amount}}
• Bezahlt am: {{paidAt}}
• Zahlungsmethode: {{paymentMethod}}

Ihre Rechnung ist nun vollständig beglichen.

Rechnung ansehen: {{invoiceUrl}}

================================================
PMIT SUPPORT
================================================
E-Mail: info@pm-it.eu
Telefon: +49 151 61 63 04 34
Web: https://pm-it.eu

Dein Partner in der digitalen Revolution
    `
  },
  {
    name: 'sla-warning',
    subject: '⚠️ SLA-Volumen Warnung',
    htmlContent: '',
    textContent: `
================================================
SLA-VOLUMEN WARNUNG
================================================

Hallo {{firstName}},

Ihr inklusives SLA-Volumen ist fast aufgebraucht. Ab Überschreitung wird zum normalen Stundensatz abgerechnet.

VOLUMEN-STATUS:
================================================
• Service Level: {{serviceLevelName}}
• Verbleibendes Volumen: {{remainingMinutes}} von {{totalMinutes}} Minuten
• Verwendung: {{usagePercentage}}%
• Nächste Erneuerung: {{nextRenewal}}

Ab Überschreitung wird zum Stundensatz von €{{hourlyRate}}/h abgerechnet.

Zum Dashboard: {{dashboardUrl}}

================================================
PMIT SUPPORT
================================================
E-Mail: info@pm-it.eu
Telefon: +49 151 61 63 04 34
Web: https://pm-it.eu

Dein Partner in der digitalen Revolution
    `
  }
]

async function main() {
  console.log('🌱 Seeding email templates...')
  
  for (const template of emailTemplates) {
    try {
      await prisma.emailTemplate.upsert({
        where: { name: template.name },
        update: template,
        create: template
      })
      console.log(`✅ Template "${template.name}" created/updated`)
    } catch (error) {
      console.error(`❌ Error creating template "${template.name}":`, error)
    }
  }
  
  console.log('🎉 Email templates seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })