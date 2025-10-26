import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/notifications
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const where: any = {
    userId: session.user.id
  }

  // Clients sehen nur ihre eigenen Benachrichtigungen
  if (session.user.role === "CLIENT") {
    where.userId = session.user.id
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: {
      createdAt: "desc"
    }
  })

  // Für jede Benachrichtigung, die mit einem Ticket verknüpft ist, lade die Ticket-Informationen
  const notificationsWithTicket = await Promise.all(
    notifications.map(async (notification) => {
      if (notification.relatedId && (notification.type === "MESSAGE" || notification.type === "TICKET_UPDATE" || notification.type === "TICKET_CREATED")) {
        try {
          const ticket = await prisma.ticket.findUnique({
            where: { id: notification.relatedId },
            select: {
              id: true,
              ticketNumber: true,
              title: true,
              company: {
                select: {
                  name: true
                }
              }
            }
          })
          return {
            ...notification,
            ticket
          }
        } catch (error) {
          console.error("Failed to load ticket for notification:", error)
          return notification
        }
      }
      return notification
    })
  )

  // Zähle ungelesene Benachrichtigungen
  const unreadCount = await prisma.notification.count({
    where: {
      ...where,
      isRead: false
    }
  })

  return NextResponse.json({ 
    notifications: notificationsWithTicket,
    unreadCount 
  })
}

// POST /api/notifications (für das Erstellen neuer Benachrichtigungen)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { ticketId, message, type = "MESSAGE" } = body

  // Erstelle Benachrichtigung für alle Benutzer des Tickets
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      company: {
        include: {
          users: true
        }
      }
    }
  })

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
  }

  // Erstelle Benachrichtigungen für alle Benutzer der Firma (außer dem Absender)
  const notifications = await Promise.all(
    ticket.company.users
      .filter(user => user.id !== session.user.id)
      .map(user => 
        prisma.notification.create({
          data: {
            userId: user.id,
            title: "Neue Nachricht",
            message: message,
            type: type,
            relatedId: ticketId,
            isRead: false
          }
        })
      )
  )

  return NextResponse.json({ notifications })
}
