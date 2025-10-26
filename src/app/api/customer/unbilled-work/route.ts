import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Hole alle Work Entries für die Firma des Benutzers (nur eigene Firma)
    const workEntries = await prisma.workEntry.findMany({
      where: {
        ticket: {
          companyId: session.user.companyId // Nur eigene Firma
        },
        isBilled: false // Nur unabgerechnete Einträge
      },
      include: {
        ticket: {
          select: {
            title: true,
            ticketNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Berechne Gesamtsummen
    const totalWorkMinutes = workEntries.reduce((sum, entry) => sum + (entry.minutes || 0), 0)
    const totalWorkAmount = workEntries.reduce((sum, entry) => sum + ((entry.hourlyRate || 0) * (entry.minutes || 0) / 60), 0)
    const totalUnbilledAmount = totalWorkAmount

    console.log(`📊 Unbilled Work für Firma ${session.user.companyId}:`, {
      workEntriesCount: workEntries.length,
      totalWorkMinutes,
      totalWorkAmount,
      totalUnbilledAmount
    })

    // Letzter Eintrag (neuester) - mit Null-Safety
    const lastWorkEntry = workEntries.length > 0 ? {
      id: workEntries[0].id,
      description: workEntries[0].description || '',
      minutes: workEntries[0].minutes || 0,
      amount: (workEntries[0].hourlyRate || 0) * (workEntries[0].minutes || 0) / 60,
      createdAt: workEntries[0].createdAt.toISOString(),
      ticket: workEntries[0].ticket
    } : undefined

    const data = {
      totalUnbilledAmount: totalUnbilledAmount || 0,
      totalWorkMinutes: totalWorkMinutes || 0,
      totalWorkAmount: totalWorkAmount || 0,
      lastWorkEntry,
      entryCount: workEntries.length || 0
    }

    return NextResponse.json({ 
      success: true, 
      data 
    })

  } catch (error) {
    console.error("Error fetching unbilled work:", error)
    return NextResponse.json(
      { error: "Failed to fetch unbilled work data" },
      { status: 500 }
    )
  }
}
