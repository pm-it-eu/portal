"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import ServiceLevelCard from "@/components/dashboard/ServiceLevelCard"
import ServiceOptionsCard from "@/components/dashboard/ServiceOptionsCard"
import { UnbilledWorkCard } from "@/components/dashboard/UnbilledWorkCard"
import { MaintenanceCard } from "@/components/dashboard/MaintenanceCard"
import { ServiceSidebar } from "@/components/dashboard/ServiceSidebar"
import { Ticket, FileText, Clock, Euro, Settings, Lock, Unlock, List, User } from "lucide-react"

interface Ticket {
  id: string
  ticketNumber: string
  title: string
  status: string
  priority: string
  createdAt: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  amount: number
  status: string
  dueDate: string
}

interface DashboardStats {
  openTickets: number
  inProgressTickets: number
  openInvoicesCount: number
  openInvoicesAmount: number
}

interface RecentTicket {
  id: string
  title: string
  status: string
  priority: string
  createdAt: string
}

interface RecentInvoice {
  id: string
  invoiceNumber: string
  amount: number
  status: string
  dueDate: string
}

export default function CustomerDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    openTickets: 0,
    inProgressTickets: 0,
    openInvoicesCount: 0,
    openInvoicesAmount: 0
  })
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([])
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [ticketsRes, invoicesRes] = await Promise.all([
          fetch("/api/tickets"),
          fetch("/api/invoices")
        ])

        const tickets = ticketsRes.ok ? (await ticketsRes.json()).tickets : []
        const invoices = invoicesRes.ok ? (await invoicesRes.json()).invoices : []

        const openTickets = tickets.filter((t: Ticket) => t.status === "OPEN").length
        const inProgressTickets = tickets.filter((t: Ticket) => t.status === "IN_PROGRESS").length
        const openInvoices = invoices.filter((inv: Invoice) => inv.status === "OPEN")
        const openInvoicesCount = openInvoices.length
        const openInvoicesAmount = openInvoices.reduce((sum: number, inv: Invoice) => sum + (inv.amount || 0), 0)

        setStats({
          openTickets,
          inProgressTickets,
          openInvoicesCount,
          openInvoicesAmount
        })

        // Recent tickets (last 3)
        setRecentTickets(tickets.slice(0, 3).map((ticket: Ticket) => ({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt
        })))

        // Recent invoices (last 2)
        setRecentInvoices(invoices.slice(0, 2).map((invoice: Invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          status: invoice.status,
          dueDate: invoice.dueDate
        })))
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])
  return (
    <div className="grid gap-8 lg:grid-cols-4">
      {/* Main Content */}
      <div className="lg:col-span-3 space-y-8 order-1 lg:order-1">
      {/* Maintenance Window - mittig */}
      <MaintenanceCard />

      {/* Service Level and Options - untereinander */}
      <div className="space-y-8">
        {/* Service Level Card */}
        {session?.user?.companyId && (
          <ServiceLevelCard companyId={session.user.companyId} />
        )}

        {/* Service Options */}
        <ServiceOptionsCard />
      </div>


      {/* Stats Cards */}
      <div className="grid gap-6 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-small font-medium">Offene Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-h2">{loading ? "..." : stats.openTickets}</div>
            <p className="text-xs text-muted-foreground">
              Benötigen Aufmerksamkeit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-small font-medium">In Bearbeitung</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-h2">{loading ? "..." : stats.inProgressTickets}</div>
            <p className="text-xs text-muted-foreground">
              Werden bearbeitet
            </p>
          </CardContent>
        </Card>

        <UnbilledWorkCard />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-small font-medium">Offene Rechnungen</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-h2">{loading ? "..." : stats.openInvoicesCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.openInvoicesAmount > 0 ? `€${stats.openInvoicesAmount.toLocaleString()}` : "Alle bezahlt"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Letzte Tickets</CardTitle>
          <CardDescription>
            Ihre neuesten Support-Anfragen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ) : recentTickets.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Tickets</p>
            ) : (
              recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-small font-medium">#{ticket.ticketNumber} - {ticket.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.priority === "LOW" ? "Niedrig" : 
                       ticket.priority === "MEDIUM" ? "Mittel" :
                       ticket.priority === "HIGH" ? "Hoch" :
                       ticket.priority === "CRITICAL" ? "Kritisch" : ticket.priority} • {new Date(ticket.createdAt).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <Badge variant={ticket.status === "OPEN" ? "destructive" : ticket.status === "IN_PROGRESS" ? "secondary" : "outline"}>
                    {ticket.status === "OPEN" ? "Offen" : ticket.status === "IN_PROGRESS" ? "In Bearbeitung" : "Geschlossen"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Letzte Rechnungen</CardTitle>
          <CardDescription>
            Ihre neuesten Rechnungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ) : recentInvoices.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Rechnungen</p>
            ) : (
              recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-small font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      €{invoice.amount.toLocaleString()} • {new Date(invoice.dueDate).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <Badge variant={invoice.status === "OPEN" ? "destructive" : "outline"}>
                    {invoice.status === "OPEN" ? "Offen" : "Bezahlt"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar - Full Height */}
      <div className="lg:col-span-1 order-2 lg:order-2">
        <div className="sticky top-6">
          <ServiceSidebar />
        </div>
      </div>
    </div>
  )
}
