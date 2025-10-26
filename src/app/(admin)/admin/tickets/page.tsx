"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Ticket, Plus, Search, Filter, Unlock, List } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

interface Company {
	id: string
	name: string
}

interface TicketData {
	id: string
	ticketNumber: number
	title: string
	status: "OPEN" | "IN_PROGRESS" | "CLOSED"
	priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
	createdAt: string
	company: {
		id: string
		name: string
	}
}

export default function AdminTicketsPage() {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [title, setTitle] = useState("")
	const [description, setDescription] = useState("")
	const [priority, setPriority] = useState<"LOW"|"MEDIUM"|"HIGH"|"CRITICAL">("MEDIUM")
	const [companyId, setCompanyId] = useState("")
	const [companies, setCompanies] = useState<Company[]>([])
	const [tickets, setTickets] = useState<TicketData[]>([])
	const [filteredTickets, setFilteredTickets] = useState<TicketData[]>([])
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [priorityFilter, setPriorityFilter] = useState("")
	const [submitting, setSubmitting] = useState(false)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		// Load companies and tickets
		const loadData = async () => {
			try {
				const [companiesRes, ticketsRes] = await Promise.all([
					fetch("/api/companies"),
					fetch("/api/tickets")
				])
				
				if (companiesRes.ok) {
					const companiesData = await companiesRes.json()
					setCompanies(companiesData.companies || [])
				}
				
				if (ticketsRes.ok) {
					const ticketsData = await ticketsRes.json()
					setTickets(ticketsData.tickets || [])
					setFilteredTickets(ticketsData.tickets || [])
				}
			} catch (error) {
				console.error("Failed to load data:", error)
			} finally {
				setLoading(false)
			}
		}
		loadData()
	}, [])

	// Filter logic for all tickets
	useEffect(() => {
		let filtered = tickets

		// Search filter
		if (searchTerm) {
			// Remove # and trim whitespace from search term for ticket number search
			const cleanSearchTerm = searchTerm.replace('#', '').trim().toLowerCase()
			filtered = filtered.filter(ticket => 
				ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				ticket.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				ticket.ticketNumber.toString().includes(cleanSearchTerm)
			)
		}

		// Status filter
		if (statusFilter) {
			filtered = filtered.filter(ticket => ticket.status === statusFilter)
		}

		// Priority filter
		if (priorityFilter) {
			filtered = filtered.filter(ticket => ticket.priority === priorityFilter)
		}

		setFilteredTickets(filtered)
	}, [tickets, searchTerm, statusFilter, priorityFilter])

	// Calculate open tickets (filtered tickets that are not closed)
	const openTickets = filteredTickets.filter(ticket => ticket.status !== "CLOSED")

	async function handleCreate() {
		if (!title.trim() || !companyId.trim()) return
		setSubmitting(true)
		try {
			const res = await fetch("/api/tickets", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, priority, companyId: companyId.trim() })
			})
			if (res.ok) {
				const data = await res.json()
				setOpen(false)
				setTitle("")
				setDescription("")
				setCompanyId("")
				// Reload tickets
				const ticketsRes = await fetch("/api/tickets")
				if (ticketsRes.ok) {
					const ticketsData = await ticketsRes.json()
					setTickets(ticketsData.tickets || [])
				}
				router.push(`/admin/tickets/${data.ticket.id}`)
			}
		} finally {
			setSubmitting(false)
		}
	}

	const getPriorityBadge = (priority: string) => {
		switch (priority) {
			case "LOW":
				return <Badge variant="outline">Niedrig</Badge>
			case "MEDIUM":
				return <Badge variant="secondary">Mittel</Badge>
			case "HIGH":
				return <Badge className="bg-amber-100 text-amber-700">Hoch</Badge>
			case "CRITICAL":
				return <Badge variant="destructive">Kritisch</Badge>
			default:
				return <Badge variant="outline">{priority}</Badge>
		}
	}

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "OPEN":
				return <Badge variant="destructive">Offen</Badge>
			case "IN_PROGRESS":
				return <Badge className="bg-amber-100 text-amber-700">In Bearbeitung</Badge>
			case "WAITING_FOR_CUSTOMER":
				return <Badge className="bg-blue-100 text-blue-700">Warten auf Kunden</Badge>
			case "CLOSED":
				return <Badge variant="outline">Geschlossen</Badge>
			default:
				return <Badge variant="outline">{status}</Badge>
		}
	}

	return (
		<div className="space-y-6">
			<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl">
				<h1 className="text-h1 text-blue-900 flex items-center gap-2">
					<Ticket className="h-8 w-8" />
					Ticket-Verwaltung
				</h1>
				<p className="text-blue-700 mt-2">
					Verwalten Sie alle Support-Tickets und deren Status
				</p>
			</div>

			{/* Filters */}
			<Card className="bg-white border-gray-200 shadow-sm">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						Filter & Suche
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4 items-center">
						<div className="flex-1">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
								<Input 
									placeholder="Tickets durchsuchen (Titel, Firma, #Nummer)..." 
									className="pl-10"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
						</div>
						<div className="flex gap-2">
							<select 
								className="border rounded-md h-9 px-3 text-sm"
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
							>
								<option value="">Alle Status</option>
								<option value="OPEN">Offen</option>
								<option value="IN_PROGRESS">In Bearbeitung</option>
								<option value="WAITING_FOR_CUSTOMER">Warten auf Kunden</option>
								<option value="CLOSED">Geschlossen</option>
							</select>
							<select 
								className="border rounded-md h-9 px-3 text-sm"
								value={priorityFilter}
								onChange={(e) => setPriorityFilter(e.target.value)}
							>
								<option value="">Alle Prioritäten</option>
								<option value="LOW">Niedrig</option>
								<option value="MEDIUM">Mittel</option>
								<option value="HIGH">Hoch</option>
								<option value="CRITICAL">Kritisch</option>
							</select>
						</div>

						<Dialog open={open} onOpenChange={setOpen}>
							<DialogTrigger asChild>
								<Button>
									<Plus className="h-4 w-4 mr-2" />
									Neues Ticket
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-lg">
								<DialogHeader>
									<DialogTitle>Neues Ticket erstellen</DialogTitle>
								</DialogHeader>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="title">Titel</Label>
										<Input id="title" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Kurzer, präziser Titel" />
									</div>
									<div className="space-y-2">
										<Label htmlFor="desc">Beschreibung</Label>
										<Textarea id="desc" value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Details zum Problem" />
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="priority">Priorität</Label>
											<select id="priority" className="border rounded-md h-9 px-3" value={priority} onChange={(e)=>setPriority(e.target.value as any)}>
												<option value="LOW">Niedrig</option>
												<option value="MEDIUM">Mittel</option>
												<option value="HIGH">Hoch</option>
												<option value="CRITICAL">Kritisch</option>
											</select>
										</div>
										<div className="space-y-2">
											<Label htmlFor="company">Firma</Label>
											<select id="company" className="border rounded-md h-9 px-3" value={companyId} onChange={(e)=>setCompanyId(e.target.value)}>
												<option value="">Firma auswählen...</option>
												{companies.map((company) => (
													<option key={company.id} value={company.id}>
														{company.name}
													</option>
												))}
											</select>
										</div>
									</div>
									<div className="flex justify-end gap-2">
										<Button variant="outline" onClick={()=>setOpen(false)}>Abbrechen</Button>
										<Button onClick={handleCreate} disabled={!title.trim() || !companyId.trim() || submitting}>
											{ submitting ? "Erstellen..." : "Erstellen" }
										</Button>
									</div>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</CardContent>
			</Card>

			{/* Open Tickets Table */}
			<Card className="bg-white border-gray-200 shadow-sm">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Unlock className="h-5 w-5 text-orange-600" />
						Offene Tickets ({openTickets.length})
					</CardTitle>
					<CardDescription>
						Übersicht über alle offenen Support-Tickets
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="space-y-4">
							<div className="animate-pulse">
								<div className="h-16 bg-gray-200 rounded-lg"></div>
								<div className="h-16 bg-gray-200 rounded-lg"></div>
								<div className="h-16 bg-gray-200 rounded-lg"></div>
							</div>
						</div>
					) : openTickets.length === 0 ? (
						<div className="text-center py-8">
							<div className="text-gray-500 text-lg mb-2">🎉</div>
							<p className="text-gray-500">Keine offenen Tickets</p>
							<p className="text-sm text-gray-400 mt-1">
								Alle Tickets sind geschlossen oder es wurden keine gefunden
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{openTickets.map((ticket) => (
								<div 
									key={ticket.id} 
									onClick={() => router.push(`/admin/tickets/${ticket.id}`)} 
									className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
								>
									<div className="flex items-center space-x-4">
										<div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
											<Ticket className="h-5 w-5 text-orange-600" />
										</div>
										<div>
											<h3 className="font-medium text-gray-900">
												#{ticket.ticketNumber} - {ticket.title}
											</h3>
											<p className="text-sm text-gray-600">
												{ticket.company?.name || 'Unbekannte Firma'} • {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("de-DE") : 'Unbekannt'}
											</p>
										</div>
									</div>
									<div className="flex items-center space-x-3">
										{getPriorityBadge(ticket.priority)}
										{getStatusBadge(ticket.status)}
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* All Tickets Table */}
			<Card className="bg-white border-gray-200 shadow-sm">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<List className="h-5 w-5 text-blue-600" />
						Alle Tickets ({filteredTickets.length})
					</CardTitle>
					<CardDescription>
						Übersicht über alle Support-Tickets
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="space-y-4">
							<div className="animate-pulse">
								<div className="h-16 bg-gray-200 rounded-lg"></div>
								<div className="h-16 bg-gray-200 rounded-lg"></div>
								<div className="h-16 bg-gray-200 rounded-lg"></div>
							</div>
						</div>
					) : filteredTickets.length === 0 ? (
						<div className="text-center py-8">
							<Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">Keine Tickets gefunden</h3>
							<p className="text-gray-600">Erstellen Sie Ihr erstes Ticket, um loszulegen.</p>
						</div>
					) : (
						<div className="space-y-4">
							{filteredTickets.map((ticket) => (
								<div 
									key={ticket.id} 
									onClick={() => router.push(`/admin/tickets/${ticket.id}`)} 
									className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
								>
									<div className="flex items-center space-x-4">
										<div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
											<Ticket className="h-5 w-5 text-blue-600" />
										</div>
										<div>
											<h3 className="font-medium text-gray-900">
												#{ticket.ticketNumber} - {ticket.title}
											</h3>
											<p className="text-sm text-gray-600">
												{ticket.company?.name || 'Unbekannte Firma'} • {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("de-DE") : 'Unbekannt'}
											</p>
										</div>
									</div>
									<div className="flex items-center space-x-3">
										{getPriorityBadge(ticket.priority)}
										{getStatusBadge(ticket.status)}
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
