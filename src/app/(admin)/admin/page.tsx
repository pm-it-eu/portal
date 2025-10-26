"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Users, Ticket, FileText, AlertTriangle, Plus, Wrench, UserPlus, Building } from "lucide-react"
import { useRouter } from "next/navigation"

interface Company {
  id: string
  name: string
  email: string
  phone: string
  address: string
  createdAt: string
}

interface Ticket {
  id: string
  ticketNumber: string
  title: string
  status: string
  priority: string
  company?: Company
  createdAt: string
}

interface Invoice {
  id: string
  amount: number
  status: string
  createdAt: string
}

interface DashboardStats {
  companies: number
  users: number
  openTickets: number
  totalInvoices: number
}

interface RecentActivity {
  id: string
  type: string
  title: string
  description: string
  priority?: string
  status?: string
  createdAt: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    companies: 0,
    users: 0,
    openTickets: 0,
    totalInvoices: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dialog States
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [showTicketDialog, setShowTicketDialog] = useState(false)
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false)
  const [showCompanyDialog, setShowCompanyDialog] = useState(false)
  const [showUserDialog, setShowUserDialog] = useState(false)
  
  // Form States
  const [companies, setCompanies] = useState<Company[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load stats
        const [companiesRes, usersRes, ticketsRes, invoicesRes] = await Promise.all([
          fetch("/api/companies"),
          fetch("/api/users"),
          fetch("/api/tickets"),
          fetch("/api/invoices")
        ])

        const companiesData = companiesRes.ok ? (await companiesRes.json()).companies : []
        const users = usersRes.ok ? (await usersRes.json()).users.length : 0
        const tickets = ticketsRes.ok ? (await ticketsRes.json()).tickets : []
        const invoices = invoicesRes.ok ? (await invoicesRes.json()).invoices : []

        setCompanies(companiesData)

        const openTickets = tickets.filter((t: Ticket) => t.status === "OPEN").length
        const totalInvoices = invoices.reduce((sum: number, inv: Invoice) => sum + (inv.amount || 0), 0)

        setStats({
          companies: companiesData.length,
          users,
          openTickets,
          totalInvoices
        })

        // Load recent activity (last 5 tickets)
        const recentTickets = tickets.slice(0, 5).map((ticket: Ticket) => ({
          id: ticket.id,
          type: "ticket",
          title: `Ticket #${ticket.ticketNumber}`,
          description: `${ticket.title} - ${ticket.company?.name || 'Unbekannte Firma'}`,
          priority: ticket.priority,
          status: ticket.status,
          createdAt: ticket.createdAt
        }))

        setRecentActivity(recentTickets)
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const quickActions = [
    {
      title: "Rechnung erstellen",
      description: "Neue Rechnung für Kunde anlegen",
      icon: FileText,
      color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
      onClick: () => setShowInvoiceDialog(true)
    },
    {
      title: "Ticket erstellen",
      description: "Neues Support-Ticket anlegen",
      icon: Ticket,
      color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
      onClick: () => setShowTicketDialog(true)
    },
    {
      title: "Wartung erstellen",
      description: "Wartungsfenster planen",
      icon: Wrench,
      color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
      onClick: () => setShowMaintenanceDialog(true)
    },
    {
      title: "Firma erstellen",
      description: "Neuen Kunden anlegen",
      icon: Building,
      color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
      onClick: () => setShowCompanyDialog(true)
    },
    {
      title: "Benutzer erstellen",
      description: "Neuen Benutzer anlegen",
      icon: UserPlus,
      color: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
      onClick: () => setShowUserDialog(true)
    }
  ]

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl">
        <h1 className="text-h1 text-blue-900 flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Admin Dashboard
        </h1>
        <p className="text-blue-700 mt-2">
          Übersicht über alle Kunden und deren Tickets
        </p>
      </div>

      {/* Schnellzugriffe */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Schnellzugriffe
          </CardTitle>
          <CardDescription>
            Häufig verwendete Aktionen für schnellen Zugriff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className={`h-auto p-4 flex flex-col items-center gap-3 text-left ${action.color}`}
                onClick={action.onClick}
              >
                <action.icon className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs opacity-75 mt-1">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-small font-medium">Kunden</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-h2">{loading ? "..." : stats.companies}</div>
            <p className="text-xs text-muted-foreground">
              Registrierte Kunden
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-small font-medium">Benutzer</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-h2">{loading ? "..." : stats.users}</div>
            <p className="text-xs text-muted-foreground">
              Aktive Benutzer
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
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

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-small font-medium">Gesamt Rechnungen</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-h2">{loading ? "..." : `€${stats.totalInvoices.toLocaleString()}`}</div>
            <p className="text-xs text-muted-foreground">
              Gesamtvolumen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Letzte Aktivität</CardTitle>
            <CardDescription>
              Neueste Tickets und Updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Aktivität</p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="flex-1 space-y-1">
                    <p className="text-small font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                  {activity.priority && (
                    <Badge variant={activity.priority === "HIGH" ? "destructive" : "secondary"}>
                      {activity.priority === "LOW" ? "Niedrig" : 
                       activity.priority === "MEDIUM" ? "Mittel" :
                       activity.priority === "HIGH" ? "Hoch" :
                       activity.priority === "CRITICAL" ? "Kritisch" : activity.priority}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Warnungen</CardTitle>
            <CardDescription>
              Kritische Service-Level und Probleme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Keine Warnungen</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Dialogs */}
      
      {/* Rechnung erstellen Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Neue Rechnung erstellen
            </DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Rechnung für einen Kunden
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Kunde</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Betrag (€)</Label>
                <Input id="amount" type="number" placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea id="description" placeholder="Rechnungsbeschreibung..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
                Abbrechen
              </Button>
              <Button className="bg-green-600 hover:bg-green-700">
                Rechnung erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket erstellen Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-blue-600" />
              Neues Ticket erstellen
            </DialogTitle>
            <DialogDescription>
              Erstellen Sie ein neues Support-Ticket
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticketCompany">Kunde</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priorität</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Priorität auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Niedrig</SelectItem>
                    <SelectItem value="MEDIUM">Mittel</SelectItem>
                    <SelectItem value="HIGH">Hoch</SelectItem>
                    <SelectItem value="CRITICAL">Kritisch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="ticketTitle">Titel</Label>
              <Input id="ticketTitle" placeholder="Ticket-Titel..." />
            </div>
            <div>
              <Label htmlFor="ticketDescription">Beschreibung</Label>
              <Textarea id="ticketDescription" placeholder="Problembeschreibung..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
                Abbrechen
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Ticket erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wartung erstellen Dialog */}
      <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-600" />
              Wartungsfenster erstellen
            </DialogTitle>
            <DialogDescription>
              Planen Sie ein neues Wartungsfenster
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maintenanceCompany">Kunde</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="maintenanceType">Typ</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Wartungstyp auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SYSTEM_UPDATE">System-Update</SelectItem>
                    <SelectItem value="SECURITY_PATCH">Sicherheits-Update</SelectItem>
                    <SelectItem value="HARDWARE_MAINTENANCE">Hardware-Wartung</SelectItem>
                    <SelectItem value="SOFTWARE_UPDATE">Software-Update</SelectItem>
                    <SelectItem value="BACKUP_MAINTENANCE">Backup-Wartung</SelectItem>
                    <SelectItem value="OTHER">Sonstige</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="maintenanceTitle">Titel</Label>
              <Input id="maintenanceTitle" placeholder="Wartungstitel..." />
            </div>
            <div>
              <Label htmlFor="maintenanceDescription">Beschreibung</Label>
              <Textarea id="maintenanceDescription" placeholder="Wartungsbeschreibung..." />
            </div>
            <div>
              <Label htmlFor="scheduledAt">Geplant für</Label>
              <Input id="scheduledAt" type="datetime-local" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMaintenanceDialog(false)}>
                Abbrechen
              </Button>
              <Button className="bg-orange-600 hover:bg-orange-700">
                Wartung erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Firma erstellen Dialog */}
      <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-purple-600" />
              Neue Firma erstellen
            </DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen Kunden
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Firmenname</Label>
                <Input id="companyName" placeholder="Firmenname..." />
              </div>
              <div>
                <Label htmlFor="companyEmail">E-Mail</Label>
                <Input id="companyEmail" type="email" placeholder="firma@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyPhone">Telefon</Label>
                <Input id="companyPhone" placeholder="+49 123 456789" />
              </div>
              <div>
                <Label htmlFor="companyWebsite">Website</Label>
                <Input id="companyWebsite" placeholder="https://example.com" />
              </div>
            </div>
            <div>
              <Label htmlFor="companyAddress">Adresse</Label>
              <Textarea id="companyAddress" placeholder="Vollständige Adresse..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCompanyDialog(false)}>
                Abbrechen
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Firma erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Benutzer erstellen Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              Neuen Benutzer erstellen
            </DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen Benutzer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userFirstName">Vorname</Label>
                <Input id="userFirstName" placeholder="Vorname..." />
              </div>
              <div>
                <Label htmlFor="userLastName">Nachname</Label>
                <Input id="userLastName" placeholder="Nachname..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userEmail">E-Mail</Label>
                <Input id="userEmail" type="email" placeholder="benutzer@example.com" />
              </div>
              <div>
                <Label htmlFor="userRole">Rolle</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Rolle auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">Kunde</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="userCompany">Firma</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Firma auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                Abbrechen
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                Benutzer erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
