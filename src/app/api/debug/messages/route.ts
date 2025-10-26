import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/debug/messages - Debug endpoint to check all messages
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const messages = await prisma.ticketMessage.findMany({
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        ticket: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 10 // Last 10 messages
    })

    return NextResponse.json({ 
      messages: messages.map(m => ({
        id: m.id,
        content: m.content,
        isSystemMessage: m.isSystemMessage,
        isInternalNote: m.isInternalNote,
        createdAt: m.createdAt,
        author: m.author,
        ticket: m.ticket
      }))
    })
  } catch (error) {
    console.error("Debug messages error:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}



