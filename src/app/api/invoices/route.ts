import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// GET /api/invoices
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const where: any = {}

  // Clients sehen nur Rechnungen ihrer Firma
  if (session.user.role === "CLIENT") {
    where.companyId = session.user.companyId
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      company: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: "desc" }
  })

  return NextResponse.json({ invoices })
}

// POST /api/invoices
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const companyId = formData.get("companyId") as string
    const amount = parseFloat(formData.get("amount") as string)
    const status = formData.get("status") as string
    const pdfFile = formData.get("pdfFile") as File

    if (!companyId || !amount || !status || !pdfFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "uploads", "invoices")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename for storage
    const fileExtension = pdfFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`
    const filePath = join(uploadsDir, fileName)

    // Save file
    const bytes = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create invoice in database
    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        amount,
        status: status as "OPEN" | "PAID",
        invoiceNumber: pdfFile.name.replace(/\.[^/.]+$/, ""), // Clean PDF filename
        filePath: fileName, // Store relative path
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      include: {
        company: { select: { name: true } }
      }
    })

    // Send invoice created email notification
    try {
      const { sendTemplateEmail } = await import('@/lib/email')
      
      // Get company users for notification
      const companyUsers = await prisma.user.findMany({
        where: {
          companyId,
          emailNotifications: true,
          billingAlerts: true
        },
        select: { email: true, firstName: true, lastName: true }
      })

      console.log(`Found ${companyUsers.length} users for invoice notification in company ${companyId}`)
      console.log('Users:', companyUsers.map(u => ({ email: u.email, firstName: u.firstName })))

      // Send invoice created email to each user
      for (const user of companyUsers) {
        await sendTemplateEmail({
          templateName: 'invoice-created',
          to: user.email,
          variables: {
            firstName: user.firstName,
            companyName: invoice.company.name,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount.toFixed(2),
            dueDate: invoice.dueDate.toLocaleDateString('de-DE'),
            createdAt: invoice.createdAt.toLocaleDateString('de-DE'),
            invoiceUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/invoices`
          }
        })
      }
      
      console.log(`Invoice created email sent to ${companyUsers.length} users for company ${invoice.company.name}`)
    } catch (emailError) {
      console.error('Failed to send invoice created email:', emailError)
      // Continue anyway, don't fail the invoice creation
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
