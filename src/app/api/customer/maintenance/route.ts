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

    // Hole alle Wartungsfenster für die Firma des Benutzers
    const maintenanceWindows = await prisma.maintenanceWindow.findMany({
      where: {
        companyId: session.user.companyId
      },
      orderBy: {
        scheduledAt: 'desc'
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: maintenanceWindows 
    })

  } catch (error) {
    console.error("Error fetching maintenance windows:", error)
    return NextResponse.json(
      { error: "Failed to fetch maintenance windows" },
      { status: 500 }
    )
  }
}






