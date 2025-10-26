import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Get all service options for this company
    const serviceOptions = await prisma.companyCustomOption.findMany({
      where: {
        companyId: id
      },
      include: {
        customOption: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            billingCycle: true
          }
        }
      }
    })

    return NextResponse.json({
      serviceOptions: serviceOptions.map(option => ({
        id: option.id,
        companyId: option.companyId,
        customOptionId: option.customOptionId,
        customOption: option.customOption,
        activatedAt: option.activatedAt,
        deactivatedAt: option.deactivatedAt,
        isActive: option.deactivatedAt === null
      }))
    })

  } catch (error) {
    console.error("Error fetching company service options:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}






