import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get service level for user's company
    const serviceLevel = await prisma.serviceLevel.findUnique({
      where: { companyId: session.user.companyId! }
    })

    if (!serviceLevel) {
      return NextResponse.json({ 
        serviceLevel: null,
        workEntries: [],
        totalIncludedMinutes: 0,
        totalBillableMinutes: 0,
        totalBillableAmount: 0,
        totalBilledAmount: 0
      })
    }

    // Get work entries for user's company
    const workEntries = await prisma.workEntry.findMany({
      where: {
        ticket: {
          companyId: session.user.companyId!
        }
      },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to recent entries
    })

    // Calculate totals
    const totalIncludedMinutes = workEntries
      .filter(entry => entry.isFromIncludedVolume)
      .reduce((sum, entry) => sum + entry.roundedMinutes, 0)

    const billableEntries = workEntries.filter(entry => !entry.isFromIncludedVolume)
    const totalBillableMinutes = billableEntries
      .reduce((sum, entry) => sum + entry.roundedMinutes, 0)
    
    const totalBillableAmount = billableEntries
      .reduce((sum, entry) => sum + (entry.totalAmount || 0), 0)

    const totalBilledAmount = billableEntries
      .filter(entry => entry.isBilled)
      .reduce((sum, entry) => sum + (entry.totalAmount || 0), 0)

    return NextResponse.json({
      serviceLevel,
      workEntries,
      totalIncludedMinutes,
      totalBillableMinutes,
      totalBillableAmount,
      totalBilledAmount
    })

  } catch (error) {
    console.error('Error loading billing data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




