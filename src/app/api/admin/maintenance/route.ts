import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Hole alle Wartungsfenster
    const maintenanceWindows = await prisma.maintenanceWindow.findMany({
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      companyId, 
      title, 
      description, 
      type, 
      scheduledAt, 
      estimatedDuration, 
      notes 
    } = body

    // Erstelle neues Wartungsfenster
    const maintenanceWindow = await prisma.maintenanceWindow.create({
      data: {
        companyId,
        title,
        description,
        type,
        scheduledAt: new Date(scheduledAt),
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
        notes
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

    return NextResponse.json({ 
      success: true, 
      data: maintenanceWindow 
    })

  } catch (error) {
    console.error("Error creating maintenance window:", error)
    return NextResponse.json(
      { error: "Failed to create maintenance window" },
      { status: 500 }
    )
  }
}






