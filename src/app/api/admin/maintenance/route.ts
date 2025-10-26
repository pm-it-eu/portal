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
            name: true,
            users: {
              where: {
                emailNotifications: true
              },
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    // Sende E-Mail-Benachrichtigung an alle Benutzer der Firma
    try {
      const { sendTemplateEmail } = await import('@/lib/email')
      
      // Formatiere Datum und Zeit
      const scheduledDate = new Date(scheduledAt).toLocaleString('de-DE', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      // Formatiere geschätzte Dauer
      const durationText = estimatedDuration 
        ? `${estimatedDuration} Minuten` 
        : 'Nicht angegeben'

      // Sende E-Mail an jeden Benutzer der Firma
      for (const user of maintenanceWindow.company.users) {
        await sendTemplateEmail({
          templateName: 'maintenance-notification',
          to: user.email,
          variables: {
            firstName: user.firstName,
            companyName: maintenanceWindow.company.name,
            maintenanceTitle: title,
            maintenanceDescription: description || 'Keine Beschreibung verfügbar',
            scheduledDate: scheduledDate,
            estimatedDuration: durationText,
            status: 'Geplant',
            maintenanceUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/maintenance`
          }
        })
      }
      
      console.log(`Maintenance notification sent to ${maintenanceWindow.company.users.length} users for company ${maintenanceWindow.company.name}`)
    } catch (emailError) {
      console.error('Failed to send maintenance notification email:', emailError)
      // Continue anyway, don't fail the maintenance window creation
    }

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






