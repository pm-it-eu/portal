import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { messageSchema, validateInput, sanitizeHtml } from "@/lib/validation"
import { checkRateLimit, messageRateLimit } from "@/lib/rate-limit"

// GET /api/tickets/[id]/messages
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const session = await getServerSession(authOptions)
	if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

	const { id } = await ctx.params

	// Existenz + Ownership prüfen
	const ticket = await prisma.ticket.findUnique({ where: { id } })
	if (!ticket) return NextResponse.json({ error: "Not Found" }, { status: 404 })
	if (session.user.role === "CLIENT" && ticket.companyId !== session.user.companyId) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	}

	const where: any = { ticketId: id }
	// Kunden sehen keine internen Notizen
	if (session.user.role === "CLIENT") {
		where.isInternalNote = false
	}

	const messages = await prisma.ticketMessage.findMany({
		where,
		include: {
			author: { select: { id: true, firstName: true, lastName: true, role: true } },
		},
		orderBy: { createdAt: "asc" },
	})

	return NextResponse.json({ messages })
}

// POST /api/tickets/[id]/messages
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const { id } = await ctx.params
		const ticket = await prisma.ticket.findUnique({ where: { id } })
		if (!ticket) {
			return NextResponse.json({ error: "Not Found" }, { status: 404 })
		}
		
		if (session.user.role === "CLIENT" && ticket.companyId !== session.user.companyId) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		// Rate Limiting prüfen
		const rateLimitResult = await checkRateLimit(session.user.id, messageRateLimit)
		if (!rateLimitResult.success) {
			return NextResponse.json({ 
				error: "Rate limit exceeded. Please wait before sending another message." 
			}, { status: 429 })
		}

		const body = await req.json()
		
		// Input-Validierung und Sanitization
		let content: string
		let isInternalNote: boolean
		
		try {
			const validatedData = validateInput(messageSchema, body)
			content = validatedData.content
			isInternalNote = validatedData.isInternalNote || false
			
			// HTML-Sanitization gegen XSS
			content = sanitizeHtml(content)
		} catch (validationError) {
			return NextResponse.json({ 
				error: validationError instanceof Error ? validationError.message : "Invalid input" 
			}, { status: 400 })
		}

		// Kunden dürfen KEINE internen Notizen erstellen
		if (session.user.role === "CLIENT") {
			isInternalNote = false
		}

		// Prüfe, ob der User existiert
		const userExists = await prisma.user.findUnique({
			where: { id: session.user.id }
		})
		
		if (!userExists) {
			return NextResponse.json({ error: "User not found. Please log in again." }, { status: 401 })
		}

		let systemMessageCreated = false

		// Nur bei öffentlichen Nachrichten (nicht bei internen Notizen)
		if (!isInternalNote) {
			let newStatus = null
			
			// Kunde antwortet → Status zu IN_PROGRESS (außer wenn bereits IN_PROGRESS)
			if (session.user.role === "CLIENT" && ticket.status === "WAITING_FOR_CUSTOMER") {
				newStatus = "IN_PROGRESS"
			}
			
			// Admin antwortet → Status zu WAITING_FOR_CUSTOMER (außer wenn bereits WAITING_FOR_CUSTOMER oder CLOSED)
			if (session.user.role === "ADMIN" && ticket.status === "IN_PROGRESS") {
				newStatus = "WAITING_FOR_CUSTOMER"
			}
			
			// Status aktualisieren und Systemmeldung ERST erstellen
			if (newStatus) {
				await prisma.ticket.update({
					where: { id },
					data: { status: newStatus }
				})
				
				// SYSTEM-Nachricht für Status-Änderung ERST erstellen
				const statusText = {
					IN_PROGRESS: "In Bearbeitung",
					WAITING_FOR_CUSTOMER: "Warten auf Kunden"
				}[newStatus]
				
				await prisma.ticketMessage.create({
					data: {
						ticketId: id,
						authorId: session.user.id,
						content: `Status automatisch geändert zu: **${statusText}**`,
						isInternalNote: false,
						isSystemMessage: true
					}
				})
				
				systemMessageCreated = true
			}
		}

		// Jetzt die reguläre Nachricht erstellen
		const message = await prisma.ticketMessage.create({
			data: {
				ticketId: id,
				content,
				isInternalNote: Boolean(isInternalNote),
				authorId: session.user.id,
			},
			include: {
				author: { select: { id: true, firstName: true, lastName: true, role: true } },
			},
		})
		
		// Erstelle Benachrichtigung für andere Benutzer (nur bei öffentlichen Nachrichten)
		if (!isInternalNote) {
			try {
				let usersToNotify = []
				
				// Wenn Admin antwortet: Benachrichtige alle Kunden der Firma
				if (session.user.role === "ADMIN") {
					usersToNotify = await prisma.user.findMany({
						where: {
							companyId: ticket.companyId,
							role: "CLIENT",
							id: { not: session.user.id }
						}
					})
				}
				// Wenn Kunde antwortet: Benachrichtige alle Admins
				else if (session.user.role === "CLIENT") {
					usersToNotify = await prisma.user.findMany({
						where: {
							role: "ADMIN",
							id: { not: session.user.id }
						}
					})
				}
				
				// Erstelle Benachrichtigungen für jeden Benutzer
				if (usersToNotify.length > 0) {
					const notifications = usersToNotify.map(user => 
						prisma.notification.create({
							data: {
								userId: user.id,
								title: "Neue Nachricht",
								message: `Neue Nachricht in Ticket #${ticket.ticketNumber}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
								type: "MESSAGE",
								relatedId: id
							}
						})
					)
					
					await Promise.all(notifications)
					
					// Sende E-Mail-Benachrichtigungen für Ticket-Antworten
					try {
						const { sendTemplateEmail } = await import('@/lib/email')
						
						// Hole Ticket-Details für E-Mail
						const ticketDetails = await prisma.ticket.findUnique({
							where: { id },
							include: {
								company: { select: { name: true } }
							}
						})
						
						// Sende E-Mail an jeden Benutzer
						for (const user of usersToNotify) {
							// Nur an Benutzer mit E-Mail-Benachrichtigungen senden
							if (user.emailNotifications) {
								await sendTemplateEmail({
									templateName: 'ticket-updated',
									to: user.email,
									variables: {
										firstName: user.firstName,
										companyName: ticketDetails?.company.name || 'Ihre Firma',
										ticketNumber: `#${ticket.ticketNumber}`,
										ticketTitle: ticketDetails?.title || 'Ticket',
										newStatus: 'Neue Nachricht',
										changedBy: session.user.role === 'ADMIN' ? 'Support-Team' : 'Kunde',
										updatedAt: new Date().toLocaleString('de-DE'),
										message: content,
										ticketUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/tickets/${id}`,
										supportEmail: process.env.EMAIL_FROM || 'support@pm-it.eu'
									}
								})
							}
						}
					} catch (emailError) {
						// Continue anyway, don't fail the message creation
					}
				}
			} catch (notificationError) {
				// Continue anyway, don't fail the whole request
			}
		}

		return NextResponse.json({ message }, { status: 201 })
	} catch (error) {
		// Nur in Development: Detaillierte Error-Logs
		if (process.env.NODE_ENV === 'development') {
			console.error("Message API Error:", error)
		}
		
		return NextResponse.json({ 
			error: "Internal Server Error"
		}, { status: 500 })
	}
}
