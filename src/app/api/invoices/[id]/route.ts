import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/invoices/[id] - Update invoice status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { status } = await req.json()
    const { id } = await params
    
    if (!status || !["OPEN", "PAID"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { 
        status: status as "OPEN" | "PAID",
        ...(status === "PAID" && { paidAt: new Date() })
      },
      include: {
        company: { select: { name: true } }
      }
    })

    // Send invoice paid email notification if status changed to PAID
    if (status === "PAID") {
      try {
        const { sendTemplateEmail } = await import('@/lib/email')
        
        // Get company users for notification
        const companyUsers = await prisma.user.findMany({
          where: {
            companyId: invoice.companyId,
            emailNotifications: true,
            billingAlerts: true
          },
          select: { email: true, firstName: true, lastName: true }
        })

        // Send invoice paid email to each user
        for (const user of companyUsers) {
          await sendTemplateEmail({
            templateName: 'invoice-paid',
            to: user.email,
            variables: {
              firstName: user.firstName,
              companyName: invoice.company.name,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.amount.toFixed(2),
              paidAt: invoice.paidAt?.toLocaleDateString('de-DE') || new Date().toLocaleDateString('de-DE'),
              paymentMethod: 'Überweisung', // Default payment method
              invoiceUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/invoices`
            }
          })
        }
        
        console.log(`Invoice paid email sent to ${companyUsers.length} users for company ${invoice.company.name}`)
      } catch (emailError) {
        console.error('Failed to send invoice paid email:', emailError)
        // Continue anyway, don't fail the invoice update
      }
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error("Error updating invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/invoices/[id] - Delete invoice
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
    
    // Get invoice to find file path
    const invoice = await prisma.invoice.findUnique({
      where: { id }
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Delete the PDF file
    if (invoice.filePath) {
      try {
        const { unlink } = await import("fs/promises")
        const { join } = await import("path")
        const filePath = join(process.cwd(), "uploads", "invoices", invoice.filePath)
        await unlink(filePath)
      } catch (fileError) {
        console.warn("Could not delete PDF file:", fileError)
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await prisma.invoice.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
