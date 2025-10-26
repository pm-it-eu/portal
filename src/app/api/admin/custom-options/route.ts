import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/custom-options - Get all service options
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const options = await prisma.customOption.findMany({
      orderBy: { name: "asc" }
    })

    return NextResponse.json({ options })
  } catch (error) {
    console.error("Error fetching service options:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/custom-options - Create new service option
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
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

    const option = await prisma.customOption.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        billingCycle
      }
    })

    return NextResponse.json({ option })
  } catch (error) {
    console.error("Error creating service option:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}






