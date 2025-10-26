import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        emailNotifications: true,
        ticketUpdates: true,
        billingAlerts: true,
        serviceLevelWarnings: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const notificationSettings = {
      emailNotifications: user.emailNotifications,
      ticketUpdates: user.ticketUpdates,
      billingAlerts: user.billingAlerts,
      serviceLevelWarnings: user.serviceLevelWarnings
    }

    return NextResponse.json({ notificationSettings })

  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { emailNotifications, ticketUpdates, billingAlerts, serviceLevelWarnings } = await req.json()

    // Validate input
    if (typeof emailNotifications !== 'boolean' || 
        typeof ticketUpdates !== 'boolean' || 
        typeof billingAlerts !== 'boolean' || 
        typeof serviceLevelWarnings !== 'boolean') {
      return NextResponse.json({ error: 'Invalid notification settings' }, { status: 400 })
    }

    // Update user notification settings in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        emailNotifications,
        ticketUpdates,
        billingAlerts,
        serviceLevelWarnings
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
