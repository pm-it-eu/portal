import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/customer/service-options - Get service options for current company (read-only)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get company's active service options
    const companyOptions = await prisma.companyCustomOption.findMany({
      where: { 
        companyId: session.user.companyId,
        deactivatedAt: null // Only active options
      },
      include: { 
        customOption: true 
      },
      orderBy: { activatedAt: 'desc' }
    })

    // Format for display
    const options = companyOptions.map(option => ({
      id: option.id,
      name: option.customOption.name,
      description: option.customOption.description,
      price: option.customOption.price,
      billingCycle: option.customOption.billingCycle,
      activatedAt: option.activatedAt.toISOString(),
      isActive: true
    }))

    return NextResponse.json({ options })
  } catch (error) {
    console.error("Error fetching service options:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}









