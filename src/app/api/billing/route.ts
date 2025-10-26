import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can access billing data
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!companyId || !month || !year) {
      return NextResponse.json({ error: 'Company ID, month and year are required' }, { status: 400 })
    }

    // Create date range for the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

    // Get billable work entries
    const workEntries = await prisma.workEntry.findMany({
      where: {
        ticket: {
          companyId: companyId
        },
        isFromIncludedVolume: false,
        isBilled: false,
        createdAt: {
          gte: startDate,
          lte: endDate
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
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get active custom options for the company
    const customOptions = await prisma.companyCustomOption.findMany({
      where: {
        companyId: companyId,
        isBilled: false,
        OR: [
          {
            deactivatedAt: null
          },
          {
            deactivatedAt: {
              gte: startDate
            }
          }
        ]
      },
      include: {
        customOption: {
          select: {
            name: true,
            price: true,
            billingCycle: true
          }
        }
      }
    })

    // Calculate totals
    const totalWorkMinutes = workEntries.reduce((sum, entry) => sum + entry.roundedMinutes, 0)
    const totalWorkAmount = workEntries.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0)
    
    // Calculate custom options amount - all options are billed monthly in advance
    const totalCustomOptionsAmount = customOptions.reduce((sum, option) => {
      // All service options are billed monthly in advance
      return sum + option.customOption.price
    }, 0)
    
    const grandTotal = totalWorkAmount + totalCustomOptionsAmount

    return NextResponse.json({
      workEntries,
      customOptions,
      totals: {
        workMinutes: totalWorkMinutes,
        workAmount: totalWorkAmount,
        customOptionsAmount: totalCustomOptionsAmount,
        grandTotal
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching billing data:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can mark items as billed
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { workEntryIds, customOptionIds } = body

    const billedAt = new Date()

    // Mark work entries as billed
    if (workEntryIds && workEntryIds.length > 0) {
      await prisma.workEntry.updateMany({
        where: {
          id: {
            in: workEntryIds
          }
        },
        data: {
          isBilled: true,
          billedAt: billedAt
        }
      })
    }

    // Mark custom options as billed
    if (customOptionIds && customOptionIds.length > 0) {
      await prisma.companyCustomOption.updateMany({
        where: {
          id: {
            in: customOptionIds
          }
        },
        data: {
          isBilled: true,
          billedAt: billedAt
        }
      })
    }

    return NextResponse.json({ 
      message: 'Items marked as billed successfully',
      billedCount: (workEntryIds?.length || 0) + (customOptionIds?.length || 0)
    })
  } catch (error) {
    console.error('Error marking items as billed:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
