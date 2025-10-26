import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/companies/[id]/users
export async function GET(req: NextRequest, ctx: { params: Promise<{id: string}> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Nur Admin kann Firmen-Benutzer sehen
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await ctx.params

  try {
    // Prüfe, ob die Firma existiert
    const company = await prisma.company.findUnique({
      where: { id }
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Lade alle Benutzer dieser Firma
    const users = await prisma.user.findMany({
      where: { companyId: id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Failed to fetch company users:", error)
    return NextResponse.json({ error: "Failed to fetch company users" }, { status: 500 })
  }
}




