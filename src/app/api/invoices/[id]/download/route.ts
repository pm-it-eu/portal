import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { readFile } from "fs/promises"
import { join } from "path"

// GET /api/invoices/[id]/download - Download invoice PDF
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true }
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Check if user has access to this invoice
    if (session.user.role === "CLIENT" && invoice.companyId !== session.user.companyId) {
      console.log(`Access denied: User ${session.user.id} tried to access invoice ${id} from company ${invoice.companyId}, but user belongs to company ${session.user.companyId}`)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Security: Validate file path to prevent directory traversal
    const filePath = join(process.cwd(), "uploads", "invoices", invoice.filePath)
    
    // Ensure the file is within the uploads directory
    const uploadsDir = join(process.cwd(), "uploads", "invoices")
    if (!filePath.startsWith(uploadsDir)) {
      console.log(`Security violation: Attempted directory traversal with filePath: ${filePath}`)
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
    }
    
    const fileBuffer = await readFile(filePath)

    // Return the PDF file
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Error downloading invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
