import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: companyId } = await params
    const { optionId } = await req.json()

    // Check if assignment already exists
    const existingAssignment = await prisma.companyCustomOption.findFirst({
      where: {
        companyId,
        customOptionId: optionId
      }
    })

    if (existingAssignment) {
      // Reactivate if it was deactivated
      await prisma.companyCustomOption.update({
        where: {
          id: existingAssignment.id
        },
        data: {
          deactivatedAt: null,
          activatedAt: new Date()
        }
      })
    } else {
      // Create new assignment
      await prisma.companyCustomOption.create({
        data: {
          companyId,
          customOptionId: optionId,
          activatedAt: new Date()
        }
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Error activating service option:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: companyId } = await params
    const { optionId } = await req.json()

    // Deactivate the assignment
    await prisma.companyCustomOption.updateMany({
      where: {
        companyId,
        customOptionId: optionId,
        deactivatedAt: null
      },
      data: {
        deactivatedAt: new Date()
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Error deactivating service option:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}






