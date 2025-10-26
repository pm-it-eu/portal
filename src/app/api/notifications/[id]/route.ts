import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/notifications/[id] - Mark notification as read
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params

  // Mark notification as read
  const notification = await prisma.notification.update({
    where: {
      id: id,
      userId: session.user.id // Sicherheit: Nur eigene Benachrichtigungen
    },
    data: {
      isRead: true
    }
  })

  return NextResponse.json({ notification })
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params

  // Delete notification
  await prisma.notification.delete({
    where: {
      id: id,
      userId: session.user.id // Sicherheit: Nur eigene Benachrichtigungen
    }
  })

  return NextResponse.json({ success: true })
}



