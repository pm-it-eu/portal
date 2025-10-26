import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { companyId } = await params

    // Prüfe ob der Benutzer Zugriff auf diese Firma hat
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Admin kann alle Service Levels sehen, Kunden nur ihre eigene Firma
    if (user.role !== 'ADMIN' && user.companyId !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Lade Service Levels für die Firma
    const serviceLevels = await prisma.serviceLevel.findMany({
      where: { companyId },
      include: {
        company: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(serviceLevels)
  } catch (error) {
    console.error('Error fetching service levels:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { companyId } = await params
    const body = await request.json()

    const { name, description, responseTime, resolutionTime, availability } = body

    // Validiere erforderliche Felder
    if (!name || !responseTime || !resolutionTime || !availability) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Prüfe ob die Firma existiert
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Erstelle Service Level
    const serviceLevel = await prisma.serviceLevel.create({
      data: {
        name,
        description,
        responseTime,
        resolutionTime,
        availability,
        companyId
      },
      include: {
        company: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(serviceLevel, { status: 201 })
  } catch (error) {
    console.error('Error creating service level:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
