import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tickets/[id]
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const session = await getServerSession(authOptions)
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { id } = await ctx.params

	const ticket = await prisma.ticket.findUnique({
		where: { id },
		include: {
			company: { select: { id: true, name: true } },
		},
	})
	if (!ticket) return NextResponse.json({ error: "Not Found" }, { status: 404 })

	// Clients: Ownership prüfen
	if (session.user.role === "CLIENT" && ticket.companyId !== session.user.companyId) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	}

	return NextResponse.json({ ticket })
}

// PATCH /api/tickets/[id]
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	console.log("=== PATCH /api/tickets/[id] called ===")
	console.log("Request URL:", req.url)
	console.log("Request method:", req.method)
	const session = await getServerSession(authOptions)
	if (!session?.user) {
		console.log("Unauthorized - no session")
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}
	// Nur Admin darf Status/Priority ändern
	if (session.user.role !== "ADMIN") {
		console.log("Forbidden - not admin, role:", session.user.role)
		return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	}
	console.log("User authorized, role:", session.user.role)
	console.log("Session user ID:", session.user.id)
	console.log("Session user:", JSON.stringify(session.user, null, 2))

	const { id } = await ctx.params
	const body = await req.json()
	console.log("PATCH /api/tickets/[id] - Request body:", body)
	const { status, priority, title, description } = body as {
		status?: "OPEN" | "IN_PROGRESS" | "CLOSED"
		priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
		title?: string
		description?: string
	}
	console.log("Extracted values - status:", status, "priority:", priority)

	// Hole aktuelles Ticket für Vergleich
	const currentTicket = await prisma.ticket.findUnique({
		where: { id },
		select: { status: true, priority: true, ticketNumber: true, companyId: true }
	})

	if (!currentTicket) {
		return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
	}
	
	console.log('Current ticket:', JSON.stringify(currentTicket, null, 2))

	let updated
	try {
		updated = await prisma.ticket.update({
			where: { id },
			data: { status, priority, title, description },
			include: {
				company: { select: { id: true, name: true } }
			}
		})
		console.log("Ticket updated successfully:", updated.id)
	} catch (error) {
		console.error("Failed to update ticket:", error)
		return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 })
	}

	// Erstelle SYSTEM-Nachrichten für Änderungen
	console.log("=== Starting system message creation ===")
	console.log("Status:", status, "Priority:", priority)
	const systemMessages = []

	// Status-Änderung (immer erstellen wenn status gesendet wird)
	if (status !== undefined) {
		console.log("Status is defined, creating system message...")
		const statusText = {
			OPEN: "Offen",
			IN_PROGRESS: "In Bearbeitung",
			WAITING_FOR_CUSTOMER: "Warten auf Kunden",
			CLOSED: "Geschlossen"
		}[status]
		
		console.log(`Creating system message for status: ${status} (was: ${currentTicket.status})`)
		console.log(`System message content: "Status geändert zu: **${statusText}**"`)
		
		// Verwende die korrekte Admin-User-ID aus der Datenbank
		const authorId = 'cmh6h5ly90000au04tcwlq2ik'
		console.log('Using authorId:', authorId)
		
		systemMessages.push(
			prisma.ticketMessage.create({
				data: {
					ticketId: id,
					authorId: authorId,
					content: `Status geändert zu: **${statusText}**`,
					isInternalNote: false, // SYSTEM-Nachrichten sind für Kunden sichtbar
					isSystemMessage: true
				}
			})
		)
	}

	// Prioritäts-Änderung (immer erstellen wenn priority gesendet wird)
	if (priority !== undefined) {
		const priorityText = {
			LOW: "Niedrig",
			MEDIUM: "Mittel",
			HIGH: "Hoch",
			CRITICAL: "Kritisch"
		}[priority]
		
		console.log(`Creating system message for priority: ${priority} (was: ${currentTicket.priority})`)
		
		// Verwende die korrekte Admin-User-ID aus der Datenbank
		const authorId = 'cmh6h5ly90000au04tcwlq2ik'
		console.log('Using authorId for priority:', authorId)
		
		systemMessages.push(
			prisma.ticketMessage.create({
				data: {
					ticketId: id,
					authorId: authorId,
					content: `Priorität geändert zu: **${priorityText}**`,
					isInternalNote: false, // SYSTEM-Nachrichten sind für Kunden sichtbar
					isSystemMessage: true
				}
			})
		)
	}

	// Erstelle alle SYSTEM-Nachrichten
	if (systemMessages.length > 0) {
		console.log(`Creating ${systemMessages.length} system messages`)
		try {
			const createdMessages = await Promise.all(systemMessages)
			console.log('System messages created successfully:', createdMessages.map(m => ({ id: m.id, content: m.content })))
			
			// Erstelle Benachrichtigungen für SYSTEM-Nachrichten
			console.log("Creating notifications for system messages...")
			try {
				// Hole alle Benutzer der Firma (außer dem aktuellen Admin)
				const companyUsers = await prisma.user.findMany({
					where: {
						companyId: currentTicket.companyId,
						id: { not: session.user.id }
					}
				})
				
				console.log(`Found ${companyUsers.length} users to notify`)
				
				// Erstelle Benachrichtigungen für jeden Benutzer
				const notifications = companyUsers.map(user => 
					prisma.notification.create({
						data: {
							userId: user.id,
							title: "Ticket-Status geändert",
							message: `Status oder Priorität wurde in Ticket #${currentTicket.ticketNumber} geändert`,
							type: "TICKET_UPDATE",
							relatedId: id
						}
					})
				)
				
				await Promise.all(notifications)
				console.log(`Created ${notifications.length} notifications for system messages`)
				
				// Sende E-Mail-Benachrichtigungen für Status/Prioritätsänderungen
				try {
					const { sendTicketUpdatedNotification } = await import('@/lib/email')
					
					// Hole die E-Mail-Adressen der Company-Users
					const companyUsers = await prisma.user.findMany({
						where: {
							companyId: currentTicket.companyId,
							emailNotifications: true
						},
						select: { email: true, firstName: true, lastName: true }
					})
					
					console.log(`Sending emails to ${companyUsers.length} company users:`, companyUsers.map(u => u.email))
					
					// Sende E-Mail an jeden Company-User
					for (const user of companyUsers) {
						await sendTicketUpdatedNotification({
							ticketId: id,
							ticketNumber: currentTicket.ticketNumber,
							customerEmail: user.email,
							customerName: `${user.firstName} ${user.lastName}`,
							ticketTitle: updated.title || 'Ticket',
							companyName: updated.company?.name || 'Firma',
							updateMessage: `Status oder Priorität wurde geändert`
						})
					}
					
					console.log('E-Mail-Benachrichtigung für Ticket-Update gesendet')
				} catch (emailError) {
					console.error("Fehler beim Senden der E-Mail:", emailError)
					// Continue anyway, don't fail the whole request
				}
			} catch (notificationError) {
				console.error("Failed to create notifications for system messages:", notificationError)
				// Continue anyway, don't fail the whole request
			}
		} catch (error) {
			console.error("Failed to create system messages:", error)
			// Continue anyway, don't fail the whole request
		}
	} else {
		console.log("No system messages to create")
	}

	// Debug: Log final response
	console.log("=== API Response ready ===")
	console.log("Updated ticket:", { id: updated.id, status: updated.status, priority: updated.priority })

	return NextResponse.json({ ticket: updated })
}
