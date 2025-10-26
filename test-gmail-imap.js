const Imap = require('imap-simple')

async function testGmailImap() {
  try {
    console.log('🔍 Teste Gmail IMAP (nur Verbindung, ohne Login)...')
    
    // Teste nur die Verbindung, nicht die Authentifizierung
    const imapConfig = {
      imap: {
        user: 'test@example.com', // Dummy
        password: 'dummy', // Dummy
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 5000,
        connTimeout: 5000
      }
    }
    
    const connection = await Imap.connect(imapConfig)
    console.log('✅ Gmail IMAP-Verbindung erfolgreich!')
    await connection.end()
    
  } catch (error) {
    console.log('❌ Gmail IMAP-Test:', error.message)
  }
}

testGmailImap()




