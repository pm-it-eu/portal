import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Nur die Felder aktualisieren, die gesendet wurden
    const updateData: any = {
      updatedAt: new Date()
    }

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.type !== undefined) updateData.type = body.type
    if (body.status !== undefined) updateData.status = body.status
    if (body.scheduledAt !== undefined) updateData.scheduledAt = new Date(body.scheduledAt)
    if (body.estimatedDuration !== undefined) {
      updateData.estimatedDuration = body.estimatedDuration ? parseInt(body.estimatedDuration) : null
    }
    if (body.notes !== undefined) updateData.notes = body.notes

    const updatedMaintenance = await prisma.maintenanceWindow.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ 
      success: true, 
      data: updatedMaintenance 
    })

  } catch (error) {
    console.error('Error updating maintenance window:', error)
    return NextResponse.json(
      { error: 'Failed to update maintenance window' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await prisma.maintenanceWindow.delete({
      where: { id }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Maintenance window deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting maintenance window:', error)
    return NextResponse.json(
      { error: 'Failed to delete maintenance window' },
      { status: 500 }
    )
  }
}
