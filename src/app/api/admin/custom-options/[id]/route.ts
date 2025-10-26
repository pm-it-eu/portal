import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/admin/custom-options/[id] - Update service option
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { name, description, price, billingCycle } = await req.json()

    if (!name || !price || !billingCycle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (price <= 0) {
      return NextResponse.json({ error: "Price must be greater than 0" }, { status: 400 })
    }

    if (!["MONTHLY", "YEARLY"].includes(billingCycle)) {
      return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 })
    }

    const option = await prisma.customOption.update({
      where: { id },
      data: {
        name,
        description,
        price: parseFloat(price),
        billingCycle
      }
    })

    return NextResponse.json({ option })
  } catch (error) {
    console.error("Error updating service option:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/admin/custom-options/[id] - Delete service option
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    // Check if option is used by any companies
    const companyOptions = await prisma.companyCustomOption.findMany({
      where: { customOptionId: id }
    })

    if (companyOptions.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete option that is used by companies" 
      }, { status: 400 })
    }

    await prisma.customOption.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting service option:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}






