import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tickets
export async function GET(req: NextRequest) {
	const session = await getServerSession(authOptions)
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const searchParams = req.nextUrl.searchParams
	const status = searchParams.get("status") || undefined
	const priority = searchParams.get("priority") || undefined

	const where: any = {}

	// Nur Filter hinzufügen wenn sie gesetzt sind
	if (status) where.status = status
	if (priority) where.priority = priority

	// Clients sehen nur Tickets ihrer Firma
	if (session.user.role === "CLIENT") {
		where.companyId = session.user.companyId
	}

	console.log("Tickets API - User:", session.user.role, "CompanyId:", session.user.companyId)
	console.log("Tickets API - Where clause:", where)

	const tickets = await prisma.ticket.findMany({
		where,
		include: {
			company: { select: { id: true, name: true } },
		},
		orderBy: { createdAt: "desc" },
	})

	console.log("Tickets API - Found tickets:", tickets.length)

	return NextResponse.json({ tickets })
}

// POST /api/tickets
export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions)
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const body = await req.json()
	const { title, description, companyId, priority } = body as {
		title: string
		description?: string
		companyId?: string
		priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
	}

	if (!title) {
		return NextResponse.json({ error: "Title required" }, { status: 400 })
	}

	let ticketCompanyId = companyId
	// Clients dürfen nur für die eigene Firma erstellen
	if (session.user.role === "CLIENT") {
		ticketCompanyId = session.user.companyId!
	}
	if (!ticketCompanyId) {
		return NextResponse.json({ error: "companyId required" }, { status: 400 })
	}

	// Generiere die nächste Ticket-Nummer
	const lastTicket = await prisma.ticket.findFirst({
		orderBy: { ticketNumber: 'desc' },
		select: { ticketNumber: true }
	})
	const nextTicketNumber = (lastTicket?.ticketNumber ?? 0) + 1

	const ticket = await prisma.ticket.create({
		data: {
			ticketNumber: nextTicketNumber,
			title,
			description,
			priority: (priority as any) ?? "MEDIUM",
			companyId: ticketCompanyId,
		},
	})

	// Erstelle automatisch eine erste Nachricht mit der Beschreibung
	if (description && description.trim()) {
		await prisma.ticketMessage.create({
			data: {
				content: description,
				authorId: session.user.id,
				ticketId: ticket.id,
				isInternalNote: false,
				isSystemMessage: false
			}
		})
	}

	// Erstelle Benachrichtigung für alle Benutzer der Firma (außer dem Ersteller)
	const company = await prisma.company.findUnique({
		where: { id: ticketCompanyId },
		include: {
			users: true
		}
	})

	if (company) {
		// Erstelle Benachrichtigungen für alle anderen Benutzer der Firma
		await Promise.all(
			company.users
				.filter(user => user.id !== session.user.id)
				.map(user => 
					prisma.notification.create({
						data: {
							userId: user.id,
							title: "Neues Ticket",
							message: `Neues Ticket erstellt: ${title}`,
							type: "TICKET_CREATED",
							relatedId: ticket.id,
							isRead: false
						}
					})
				)
		)
	}

	return NextResponse.json({ ticket }, { status: 201 })
}
