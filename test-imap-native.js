const { PrismaClient } = require('@prisma/client')
const Imap = require('imap')

const prisma = new PrismaClient()

async function testNativeImap() {
  try {
    console.log('🔍 Lade E-Mail-Konfiguration...')
    
    const config = await prisma.emailConfig.findFirst({
      where: { isActive: true }
    })
    
    if (!config) {
      console.log('❌ Keine aktive E-Mail-Konfiguration gefunden')
      return
    }
    
    console.log('📧 Teste native IMAP-Bibliothek...')
    
    const imap = new Imap({
      user: config.imapUser,
      password: config.imapPassword,
      host: config.imapHost,
      port: config.imapPort,
      tls: config.imapSecure,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
      connTimeout: 10000
    })
    
    imap.once('ready', function() {
      console.log('✅ IMAP-Verbindung erfolgreich!')
      
      imap.openBox('INBOX', false, function(err, box) {
        if (err) {
          console.log('❌ INBOX-Zugriff fehlgeschlagen:', err.message)
          imap.end()
          return
        }
        
        console.log('✅ INBOX-Zugriff erfolgreich!')
        console.log(`📧 ${box.messages.total} E-Mails im Postfach`)
        
        // Suche nach ungelesenen E-Mails
        imap.search(['UNSEEN'], function(err, results) {
          if (err) {
            console.log('❌ E-Mail-Suche fehlgeschlagen:', err.message)
          } else {
            console.log(`📧 ${results.length} ungelesene E-Mails gefunden`)
          }
          
          imap.end()
        })
      })
    })
    
    imap.once('error', function(err) {
      console.log('❌ IMAP-Fehler:', err.message)
      console.log('🔍 Fehlerdetails:', err)
    })
    
    imap.once('end', function() {
      console.log('🔚 IMAP-Verbindung beendet')
    })
    
    imap.connect()
    
    // Warte 10 Sekunden auf Verbindung
    setTimeout(() => {
      if (imap.state !== 'authenticated') {
        console.log('⏰ Timeout - Verbindung nicht erfolgreich')
        imap.end()
      }
    }, 10000)
    
  } catch (error) {
    console.error('❌ Fehler beim Test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testNativeImap()




