import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, ctx: { params: Promise<{id: string}> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params

    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { company: true }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check access rights
    if (session.user.role === 'CLIENT' && ticket.companyId !== session.user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get work entries for this ticket
    const workEntries = await prisma.workEntry.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ workEntries })
  } catch (error) {
    console.error('Error fetching work entries:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{id: string}> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create work entries
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await ctx.params
    const body = await req.json()
    const { minutes, description, hourlyRate, isFromIncludedVolume } = body

    // Validate input
    if (!minutes || !description) {
      return NextResponse.json({ error: 'Minutes and description are required' }, { status: 400 })
    }

    // Get ticket and company
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { 
        company: { 
          include: { 
            serviceLevel: {
              select: {
                id: true,
                name: true,
                timeVolumeMinutes: true,
                remainingMinutes: true,
                hourlyRate: true,
                nextRenewalAt: true,
                renewalType: true
              }
            } 
          } 
        } 
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (!ticket.company?.serviceLevel) {
      return NextResponse.json({ error: 'No service level found for this company' }, { status: 400 })
    }

    // Round minutes to nearest 15
    const roundedMinutes = Math.ceil(minutes / 15) * 15

    // Check if using included volume
    if (isFromIncludedVolume) {
      // Check if enough volume is available
      if (ticket.company.serviceLevel.remainingMinutes < roundedMinutes) {
        return NextResponse.json({ 
          error: 'Not enough included volume available',
          availableMinutes: ticket.company.serviceLevel.remainingMinutes,
          requiredMinutes: roundedMinutes
        }, { status: 400 })
      }

      // Create work entry for included volume
      const workEntry = await prisma.workEntry.create({
        data: {
          ticketId: id,
          minutes,
          roundedMinutes,
          description,
          hourlyRate: null,
          totalAmount: null,
          isFromIncludedVolume: true,
          isBilled: false
        }
      })

      // Update service level remaining minutes
      const newRemainingMinutes = ticket.company.serviceLevel.remainingMinutes - roundedMinutes
      await prisma.serviceLevel.update({
        where: { id: ticket.company.serviceLevel.id },
        data: {
          remainingMinutes: newRemainingMinutes
        }
      })

      // Check if volume is running low and send warning email
      if (newRemainingMinutes <= 60 && newRemainingMinutes > 0) { // Warnung bei ≤ 1 Stunde
        try {
          const { sendTemplateEmail } = await import('@/lib/email')
          
          // Get company users for notification
          const companyUsers = await prisma.user.findMany({
            where: {
              companyId: ticket.companyId,
              emailNotifications: true,
              serviceLevelWarnings: true
            },
            select: { email: true, firstName: true, lastName: true }
          })

          // Send warning email to each user
          for (const user of companyUsers) {
            // Berechne Nutzungsprozentsatz
            const usedMinutes = ticket.company.serviceLevel.timeVolumeMinutes - newRemainingMinutes
            const usagePercentage = Math.round((usedMinutes / ticket.company.serviceLevel.timeVolumeMinutes) * 100)
            
            // Formatiere das nächste Erneuerungsdatum
            const nextRenewalDate = new Date(ticket.company.serviceLevel.nextRenewalAt).toLocaleDateString('de-DE')
            
            await sendTemplateEmail({
              templateName: 'sla-warning',
              to: user.email,
              variables: {
                firstName: user.firstName,
                companyName: ticket.company.name,
                serviceLevelName: ticket.company.serviceLevel.name,
                remainingMinutes: newRemainingMinutes,
                totalMinutes: ticket.company.serviceLevel.timeVolumeMinutes,
                usagePercentage: usagePercentage,
                nextRenewal: nextRenewalDate,
                hourlyRate: ticket.company.serviceLevel.hourlyRate.toString(),
                dashboardUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`
              }
            })
          }
          
          console.log(`SLA warning sent to ${companyUsers.length} users for company ${ticket.company.name}`)
        } catch (emailError) {
          console.error('Failed to send SLA warning email:', emailError)
          // Continue anyway, don't fail the work entry creation
        }
      }

      return NextResponse.json({ workEntry, message: 'Work entry created and deducted from included volume' })
    } else {
      // Create work entry for billing
      const totalAmount = (roundedMinutes / 60) * hourlyRate

      const workEntry = await prisma.workEntry.create({
        data: {
          ticketId: id,
          minutes,
          roundedMinutes,
          description,
          hourlyRate,
          totalAmount,
          isFromIncludedVolume: false,
          isBilled: false
        }
      })

      return NextResponse.json({ workEntry, message: 'Work entry created for billing' })
    }
  } catch (error) {
    console.error('Error creating work entry:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}



