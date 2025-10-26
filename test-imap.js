const { PrismaClient } = require('@prisma/client')
const Imap = require('imap-simple')

const prisma = new PrismaClient()

async function testImapConnection() {
  try {
    console.log('🔍 Lade E-Mail-Konfiguration...')
    
    const config = await prisma.emailConfig.findFirst({
      where: { isActive: true }
    })
    
    if (!config) {
      console.log('❌ Keine aktive E-Mail-Konfiguration gefunden')
      return
    }
    
    console.log('📧 Konfiguration gefunden:')
    console.log(`   Host: ${config.imapHost}`)
    console.log(`   Port: ${config.imapPort}`)
    console.log(`   User: ${config.imapUser}`)
    console.log(`   TLS: ${config.imapSecure}`)
    
    // Teste verschiedene IMAP-Konfigurationen
    const testConfigs = [
      {
        name: 'Standard IMAP',
        config: {
          imap: {
            user: config.imapUser,
            password: config.imapPassword,
            host: config.imapHost,
            port: config.imapPort,
            tls: config.imapSecure,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 10000,
            connTimeout: 10000
          }
        }
      },
      {
        name: 'IMAP mit expliziter Auth',
        config: {
          imap: {
            user: config.imapUser,
            password: config.imapPassword,
            host: config.imapHost,
            port: config.imapPort,
            tls: config.imapSecure,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 10000,
            connTimeout: 10000,
            authMethod: 'LOGIN'
          }
        }
      },
      {
        name: 'IMAP ohne TLS (falls Port 143)',
        config: {
          imap: {
            user: config.imapUser,
            password: config.imapPassword,
            host: config.imapHost,
            port: config.imapPort === 993 ? 143 : config.imapPort,
            tls: false,
            authTimeout: 10000,
            connTimeout: 10000
          }
        }
      }
    ]
    
    for (const test of testConfigs) {
      try {
        console.log(`\n🔐 Teste: ${test.name}`)
        const connection = await Imap.connect(test.config)
        console.log(`✅ ${test.name} - ERFOLGREICH!`)
        
        // Teste INBOX-Zugriff
        await connection.openBox('INBOX')
        console.log(`✅ INBOX-Zugriff erfolgreich`)
        
        // Hole E-Mail-Anzahl
        const searchCriteria = ['UNSEEN']
        const fetchOptions = { bodies: '', struct: true }
        const messages = await connection.search(searchCriteria, fetchOptions)
        console.log(`📧 ${messages.length} ungelesene E-Mails gefunden`)
        
        await connection.end()
        console.log(`✅ Verbindung erfolgreich geschlossen`)
        return // Erfolg, beende Tests
        
      } catch (error) {
        console.log(`❌ ${test.name} - FEHLGESCHLAGEN: ${error.message}`)
      }
    }
    
    console.log('\n🚨 Alle IMAP-Tests fehlgeschlagen!')
    console.log('📋 Mögliche Ursachen:')
    console.log('   - Server ist offline')
    console.log('   - Firewall blockiert Port')
    console.log('   - Passwort ist abgelaufen')
    console.log('   - 2FA erfordert App-Passwort')
    
  } catch (error) {
    console.error('❌ Fehler beim Test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testImapConnection()




