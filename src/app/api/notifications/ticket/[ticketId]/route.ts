import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/notifications/ticket/[ticketId] - Mark all notifications for a ticket as read
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ ticketId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ticketId } = await ctx.params

  // Mark all notifications for this ticket as read for the current user
  const result = await prisma.notification.updateMany({
    where: {
      relatedId: ticketId,
      userId: session.user.id,
      isRead: false
    },
    data: {
      isRead: true
    }
  })

  return NextResponse.json({ 
    success: true, 
    updatedCount: result.count 
  })
}
