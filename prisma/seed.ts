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
