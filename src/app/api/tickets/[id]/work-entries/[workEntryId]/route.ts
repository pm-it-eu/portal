import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, ctx: { params: Promise<{id: string, workEntryId: string}> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update work entries
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, workEntryId } = await ctx.params
    const body = await req.json()
    const { minutes, description, hourlyRate, isFromIncludedVolume } = body

    // Get existing work entry
    const existingWorkEntry = await prisma.workEntry.findUnique({
      where: { id: workEntryId },
      include: { ticket: { include: { company: { include: { serviceLevel: true } } } } }
    })

    if (!existingWorkEntry) {
      return NextResponse.json({ error: 'Work entry not found' }, { status: 404 })
    }

    if (existingWorkEntry.ticketId !== id) {
      return NextResponse.json({ error: 'Work entry does not belong to this ticket' }, { status: 400 })
    }

    // Check if already billed
    if (existingWorkEntry.isBilled) {
      return NextResponse.json({ error: 'Cannot edit billed work entry' }, { status: 400 })
    }

    // Round minutes to nearest 15
    const roundedMinutes = Math.ceil(minutes / 15) * 15

    // Handle volume changes
    const serviceLevel = existingWorkEntry.ticket.company?.serviceLevel
    if (!serviceLevel) {
      return NextResponse.json({ error: 'No service level found' }, { status: 400 })
    }

    let newRemainingMinutes = serviceLevel.remainingMinutes

    // If changing from billing to included volume
    if (!existingWorkEntry.isFromIncludedVolume && isFromIncludedVolume) {
      // Check if enough volume is available
      if (serviceLevel.remainingMinutes < roundedMinutes) {
        return NextResponse.json({ 
          error: 'Not enough included volume available',
          availableMinutes: serviceLevel.remainingMinutes,
          requiredMinutes: roundedMinutes
        }, { status: 400 })
      }
      newRemainingMinutes = serviceLevel.remainingMinutes - roundedMinutes
    }
    // If changing from included volume to billing
    else if (existingWorkEntry.isFromIncludedVolume && !isFromIncludedVolume) {
      // Return volume to service level
      newRemainingMinutes = serviceLevel.remainingMinutes + existingWorkEntry.roundedMinutes
    }
    // If staying with included volume but minutes changed
    else if (existingWorkEntry.isFromIncludedVolume && isFromIncludedVolume) {
      const minutesDifference = roundedMinutes - existingWorkEntry.roundedMinutes
      if (serviceLevel.remainingMinutes < minutesDifference) {
        return NextResponse.json({ 
          error: 'Not enough included volume available',
          availableMinutes: serviceLevel.remainingMinutes,
          requiredMinutes: minutesDifference
        }, { status: 400 })
      }
      newRemainingMinutes = serviceLevel.remainingMinutes - minutesDifference
    }

    // Update work entry
    const totalAmount = isFromIncludedVolume ? null : (roundedMinutes / 60) * hourlyRate

    const workEntry = await prisma.workEntry.update({
      where: { id: workEntryId },
      data: {
        minutes,
        roundedMinutes,
        description,
        hourlyRate: isFromIncludedVolume ? null : hourlyRate,
        totalAmount,
        isFromIncludedVolume
      }
    })

    // Update service level if needed
    if (newRemainingMinutes !== serviceLevel.remainingMinutes) {
      await prisma.serviceLevel.update({
        where: { id: serviceLevel.id },
        data: { remainingMinutes: newRemainingMinutes }
      })
    }

    return NextResponse.json({ workEntry, message: 'Work entry updated successfully' })
  } catch (error) {
    console.error('Error updating work entry:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{id: string, workEntryId: string}> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete work entries
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, workEntryId } = await ctx.params

    // Get existing work entry
    const existingWorkEntry = await prisma.workEntry.findUnique({
      where: { id: workEntryId },
      include: { ticket: { include: { company: { include: { serviceLevel: true } } } } }
    })

    if (!existingWorkEntry) {
      return NextResponse.json({ error: 'Work entry not found' }, { status: 404 })
    }

    if (existingWorkEntry.ticketId !== id) {
      return NextResponse.json({ error: 'Work entry does not belong to this ticket' }, { status: 400 })
    }

    // Check if already billed
    if (existingWorkEntry.isBilled) {
      return NextResponse.json({ error: 'Cannot delete billed work entry' }, { status: 400 })
    }

    // If it was from included volume, return the minutes
    if (existingWorkEntry.isFromIncludedVolume) {
      const serviceLevel = existingWorkEntry.ticket.company?.serviceLevel
      if (serviceLevel) {
        await prisma.serviceLevel.update({
          where: { id: serviceLevel.id },
          data: { 
            remainingMinutes: serviceLevel.remainingMinutes + existingWorkEntry.roundedMinutes 
          }
        })
      }
    }

    // Delete work entry
    await prisma.workEntry.delete({
      where: { id: workEntryId }
    })

    return NextResponse.json({ message: 'Work entry deleted successfully' })
  } catch (error) {
    console.error('Error deleting work entry:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}



