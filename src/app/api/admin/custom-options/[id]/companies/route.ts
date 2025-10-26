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

    // Get all companies
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true
      }
    })

    // Get current assignments for this custom option
    const assignments = await prisma.companyCustomOption.findMany({
      where: {
        customOptionId: id
      },
      select: {
        companyId: true,
        deactivatedAt: true
      }
    })

    // Create assignment map
    const assignmentMap = assignments.map(assignment => ({
      companyId: assignment.companyId,
      isActive: assignment.deactivatedAt === null
    }))

    return NextResponse.json({
      companies,
      assignments: assignmentMap
    })

  } catch (error) {
    console.error("Error fetching company assignments:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}









