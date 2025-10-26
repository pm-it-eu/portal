const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function seedAdminUser() {
  try {
    console.log('🔐 Erstelle Standard-Admin-User...')

    // Prüfe ob Admin bereits existiert
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@pm-it.eu' }
    })

    if (existingAdmin) {
      console.log('✅ Admin-User existiert bereits')
      return
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash('admin123', 10)

    // Admin-User erstellen
    const admin = await prisma.user.create({
      data: {
        email: 'admin@pm-it.eu',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN'
      }
    })

    console.log('✅ Admin-User erfolgreich erstellt:')
    console.log(`   E-Mail: admin@pm-it.eu`)
    console.log(`   Passwort: admin123`)
    console.log(`   Rolle: ADMIN`)
    console.log(`   ID: ${admin.id}`)

  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Admin-Users:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Script ausführen
if (require.main === module) {
  seedAdminUser()
    .then(() => {
      console.log('🎉 Admin-User-Seeding abgeschlossen')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Fehler beim Seeding:', error)
      process.exit(1)
    })
}

module.exports = { seedAdminUser }
