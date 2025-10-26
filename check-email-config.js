const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkEmailConfig() {
  try {
    console.log('🔍 Prüfe E-Mail-Konfigurationen...')
    
    const configs = await prisma.emailConfig.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📧 ${configs.length} E-Mail-Konfigurationen gefunden:`)
    
    configs.forEach((config, index) => {
      console.log(`\n📋 Konfiguration ${index + 1}:`)
      console.log(`   ID: ${config.id}`)
      console.log(`   Name: ${config.name}`)
      console.log(`   E-Mail: ${config.emailAddress}`)
      console.log(`   IMAP Host: ${config.imapHost}`)
      console.log(`   IMAP Port: ${config.imapPort}`)
      console.log(`   IMAP User: ${config.imapUser}`)
      console.log(`   IMAP Secure: ${config.imapSecure}`)
      console.log(`   Aktiv: ${config.isActive}`)
      console.log(`   Polling-Intervall: ${config.pollingInterval} Min`)
      console.log(`   Letztes Polling: ${config.lastPolledAt || 'Nie'}`)
      console.log(`   Erstellt: ${config.createdAt}`)
      console.log(`   Aktualisiert: ${config.updatedAt}`)
    })
    
    // Prüfe E-Mail-Logs
    console.log('\n📊 E-Mail-Logs (letzte 5):')
    const logs = await prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        emailConfig: {
          select: { name: true }
        }
      }
    })
    
    logs.forEach((log, index) => {
      console.log(`\n📝 Log ${index + 1}:`)
      console.log(`   Zeit: ${log.createdAt}`)
      console.log(`   Level: ${log.level}`)
      console.log(`   Nachricht: ${log.message}`)
      console.log(`   Konfiguration: ${log.emailConfig.name}`)
      if (log.errorCode) {
        console.log(`   Fehler-Code: ${log.errorCode}`)
      }
    })
    
  } catch (error) {
    console.error('❌ Fehler beim Prüfen der Konfiguration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkEmailConfig()

