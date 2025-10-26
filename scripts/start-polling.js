const { startEmailPolling } = require('./email-polling-service.js')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

console.log('🔄 Starte automatisches E-Mail-Polling...')

// Sofort einmal ausführen
startEmailPolling()
  .then(() => {
    console.log('✅ Erster Poll abgeschlossen')
  })
  .catch((error) => {
    console.error('❌ Fehler beim ersten Poll:', error)
  })

// Dynamisches Polling basierend auf DB-Einstellungen
async function startDynamicPolling() {
  try {
    // Lade aktive Konfigurationen
    const configs = await prisma.emailConfig.findMany({
      where: { isActive: true }
    })

    if (configs.length === 0) {
      console.log('⚠️ Keine aktiven E-Mail-Konfigurationen gefunden')
      return
    }

    // Verwende das kürzeste Intervall für das Polling
    const minInterval = Math.min(...configs.map(c => c.pollingInterval))
    const intervalMs = minInterval * 60 * 1000

    console.log(`⏰ E-Mail-Polling läuft alle ${minInterval} Minuten`)

    setInterval(async () => {
      try {
        console.log('🔄 Automatischer E-Mail-Poll gestartet...')
        await startEmailPolling()
        console.log('✅ Automatischer Poll abgeschlossen')
      } catch (error) {
        console.error('❌ Fehler beim automatischen Poll:', error)
      }
    }, intervalMs)

  } catch (error) {
    console.error('❌ Fehler beim Starten des dynamischen Pollings:', error)
  }
}

// Starte dynamisches Polling
startDynamicPolling()
