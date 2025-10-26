import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/companies/[id]
export async function GET(req: NextRequest, ctx: { params: Promise<{id: string}> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Nur Admin kann Firmen sehen
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await ctx.params

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error("Failed to fetch company:", error)
    return NextResponse.json({ error: "Failed to fetch company" }, { status: 500 })
  }
}

// PATCH /api/companies/[id]
export async function PATCH(req: NextRequest, ctx: { params: Promise<{id: string}> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Nur Admin kann Firmen bearbeiten
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await ctx.params

  try {
    const { name, email, phone, address } = await req.json()

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        name,
        email,
        phone: phone || null,
        address: address || null,
      },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    return NextResponse.json({ company })
  } catch (error) {
    console.error("Failed to update company:", error)
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 })
  }
}

// DELETE /api/companies/[id]
export async function DELETE(req: NextRequest, ctx: { params: Promise<{id: string}> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Nur Admin kann Firmen löschen
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await ctx.params

  try {
    // Prüfe, ob die Firma noch Benutzer hat
    const userCount = await prisma.user.count({
      where: { companyId: id }
    })

    if (userCount > 0) {
      return NextResponse.json({ 
        error: "Cannot delete company with existing users. Please remove all users first." 
      }, { status: 400 })
    }

    await prisma.company.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete company:", error)
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 })
  }
}




