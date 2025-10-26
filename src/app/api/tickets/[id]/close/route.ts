import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    console.log("🔐 Session check:", { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id 
    })
    
    if (!session?.user?.id) {
      console.log("❌ No session or user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    console.log("🎫 Processing ticket close for ID:", id)

    // Prüfe ob das Ticket existiert und dem Benutzer gehört
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            users: {
              where: { id: session.user.id }
            }
          }
        }
      }
    })

    console.log("🎫 Ticket found:", { 
      hasTicket: !!ticket, 
      ticketId: ticket?.id,
      companyId: ticket?.company?.id,
      userCount: ticket?.company?.users?.length 
    })

    if (!ticket) {
      console.log("❌ Ticket not found")
      return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 })
    }

    // Prüfe ob der Benutzer Zugriff auf das Ticket hat
    if (ticket.company.users.length === 0) {
      console.log("❌ No access to ticket")
      return NextResponse.json({ error: "Kein Zugriff auf dieses Ticket" }, { status: 403 })
    }

    // Prüfe ob das Ticket bereits geschlossen ist
    if (ticket.status === "CLOSED") {
      console.log("❌ Ticket already closed")
      return NextResponse.json({ error: "Ticket ist bereits geschlossen" }, { status: 400 })
    }

    console.log("✅ Closing ticket...")
    
    // Schließe das Ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        status: "CLOSED",
        updatedAt: new Date()
      }
    })

    console.log("✅ Ticket closed, creating system message...")

    // Erstelle eine System-Nachricht für das Schließen
    await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        authorId: session.user.id,
        content: "Ticket wurde vom Kunden geschlossen.",
        isInternalNote: false, // Für Kunden sichtbar
        isSystemMessage: true
      }
    })

    console.log("✅ Ticket close completed successfully")
    
    return NextResponse.json({ 
      success: true, 
      ticket: updatedTicket 
    })

  } catch (error) {
    console.error("Error closing ticket:", error)
    return NextResponse.json(
      { error: "Fehler beim Schließen des Tickets" },
      { status: 500 }
    )
  }
}
