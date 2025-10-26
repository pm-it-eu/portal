import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/service-levels
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Nur Admin kann alle Service-Levels sehen
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const serviceLevels = await prisma.serviceLevel.findMany({
    select: {
      id: true,
      name: true,
      timeVolumeMinutes: true,
      remainingMinutes: true,
      hourlyRate: true,
      renewalType: true,
      startDate: true,
      nextRenewalAt: true,
      lastRenewedAt: true,
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

  return NextResponse.json({ serviceLevels })
}

// POST /api/service-levels
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, timeVolumeMinutes, hourlyRate, renewalType, companyId, startDate } = body

    if (!name || !timeVolumeMinutes || !hourlyRate || !renewalType || !companyId || !startDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Prüfe, ob die Firma existiert
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Prüfe, ob bereits ein Service-Level für diese Firma existiert
    const existingServiceLevel = await prisma.serviceLevel.findUnique({
      where: { companyId }
    })

    if (existingServiceLevel) {
      return NextResponse.json({ 
        error: "Ein Service-Level für diese Firma existiert bereits. Bitte bearbeiten Sie das bestehende Service-Level oder löschen Sie es zuerst." 
      }, { status: 409 })
    }

    // Berechne nextRenewalAt basierend auf startDate und renewalType
    const startDateObj = new Date(startDate)
    const nextRenewalAt = renewalType === "MONTHLY" 
      ? new Date(startDateObj.getFullYear(), startDateObj.getMonth() + 1, startDateObj.getDate())
      : new Date(startDateObj.getFullYear() + 1, startDateObj.getMonth(), startDateObj.getDate())

    const serviceLevel = await prisma.serviceLevel.create({
      data: {
        name,
        timeVolumeMinutes: parseInt(timeVolumeMinutes),
        remainingMinutes: parseInt(timeVolumeMinutes),
        hourlyRate: parseFloat(hourlyRate),
        renewalType,
        startDate: startDateObj,
        nextRenewalAt,
        lastRenewedAt: startDateObj,
        companyId
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ serviceLevel }, { status: 201 })
  } catch (error) {
    console.error("Error creating service level:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
