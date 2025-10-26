import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/users
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Nur Admin kann alle Benutzer sehen
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true,
      company: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  return NextResponse.json({ users })
}

// POST /api/users
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Nur Admin kann Benutzer erstellen
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { firstName, lastName, email, password, role, companyId } = await req.json()

    if (!firstName || !lastName || !email || !password || !role || !companyId) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Hash password
    const bcrypt = require('bcrypt')
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        companyId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Sende Willkommens-E-Mail für neue Kunden
    if (role === 'CLIENT') {
      try {
        const { sendWelcomeEmail } = await import('@/lib/email')
        await sendWelcomeEmail({
          customerEmail: email,
          customerName: `${firstName} ${lastName}`,
          companyName: user.company?.name || 'Ihre Firma'
        })
        console.log(`✅ Willkommens-E-Mail gesendet an ${email}`)
      } catch (emailError) {
        console.error('❌ Fehler beim Senden der Willkommens-E-Mail:', emailError)
        // E-Mail-Fehler soll die User-Erstellung nicht blockieren
      }
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Failed to create user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
