import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, ctx: { params: Promise<{companyId: string}> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { companyId } = await ctx.params

    // Check access rights
    if (session.user.role === 'CLIENT' && session.user.companyId !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get service level for company
    const serviceLevel = await prisma.serviceLevel.findUnique({
      where: { companyId },
      include: { company: true }
    })

    if (!serviceLevel) {
      return NextResponse.json({ error: 'Service level not found' }, { status: 404 })
    }

    return NextResponse.json({ serviceLevel })
  } catch (error) {
    console.error('Error fetching service level:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}




