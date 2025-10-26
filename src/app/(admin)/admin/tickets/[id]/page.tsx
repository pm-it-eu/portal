"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageThread, MessageThreadRef } from "@/components/tickets/MessageThread"
import WorkEntryForm from "@/components/tickets/WorkEntryForm"
import WorkEntryTable from "@/components/tickets/WorkEntryTable"
import { ArrowLeft, User, Building2, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTicketUpdates } from "@/hooks/useTicketUpdates"

interface Ticket {
  id: string
  ticketNumber: string
  title: string
  description?: string
  status: "OPEN" | "IN_PROGRESS" | "WAITING_FOR_CUSTOMER" | "CLOSED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  createdAt: string
  updatedAt: string
  company: {
    id: string
    name: string
  }
}

export default function AdminTicketDetailPage() {
  const params = useParams()
  const ticketId = params.id as string
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const messageThreadRef = useRef<MessageThreadRef | null>(null)

  const handleWorkEntryUpdate = () => {
    // Reload ticket data to get updated service level info
    const loadTicket = async () => {
      try {
        const response = await fetch(`/api/tickets/${ticketId}`)
        if (response.ok) {
          const data = await response.json()
          setTicket(data.ticket)
        }
      } catch (error) {
        console.error("Failed to reload ticket:", error)
      }
    }
    loadTicket()
  }

  useEffect(() => {
    const loadTicket = async () => {
      try {
        const response = await fetch(`/api/tickets/${ticketId}`)
        if (response.ok) {
          const data = await response.json()
          setTicket(data.ticket)
          
          // Mark all notifications for this ticket as read
          await fetch(`/api/notifications/ticket/${ticketId}`, {
            method: "PATCH"
          })
        }
      } catch (error) {
        console.error("Failed to load ticket:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTicket()
  }, [ticketId])

  // Use ticket updates hook for live polling
  useTicketUpdates({ ticketId, ticket, setTicket, messageThreadRef })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h1 className="text-h2 text-gray-500">Ticket nicht gefunden</h1>
          <Link href="/admin/tickets">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zur Übersicht
            </Button>
          </Link>
        </div>
      </div>
    )
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/tickets">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-h2">#{ticket.ticketNumber} - {ticket.title}</h1>
            <p className="text-gray-600">{ticket.company?.name || 'Unbekannte Firma'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getPriorityBadge(ticket.priority)}
          {getStatusBadge(ticket.status)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat Thread */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card className="h-[500px] lg:h-[600px] flex flex-col overflow-hidden">
            <CardHeader className="border-b flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Nachrichten
              </CardTitle>
              <CardDescription>
                Chat-Thread mit dem Kunden
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <MessageThread 
                ref={messageThreadRef}
                ticketId={ticketId} 
                userRole="ADMIN"
                ticketStatus={ticket?.status}
              />
            </CardContent>
          </Card>
        </div>

        {/* Ticket Info Sidebar */}
        <div className="space-y-4 order-1 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Ticket-Informationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <Select 
                    value={ticket.status} 
                    onValueChange={async (newStatus) => {
                      console.log("Status dropdown changed to:", newStatus)
                      try {
                        const response = await fetch(`/api/tickets/${ticketId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: newStatus })
                        })
                        console.log("API response status:", response.status)
                        if (response.ok) {
                          const data = await response.json()
                          console.log("Updated ticket data:", data.ticket)
                          setTicket(data.ticket)
                          
                          // Warte kurz, damit die SYSTEM-Nachricht erstellt wird, dann reload
                          setTimeout(() => {
                            console.log("Reloading message thread...")
                            messageThreadRef.current?.reload()
                          }, 500)
                        } else {
                          console.error("API error - Status:", response.status)
                          try {
                            const errorData = await response.json()
                            console.error("API error data:", errorData)
                          } catch (jsonError) {
                            console.error("API error - No JSON response:", jsonError)
                          }
                        }
                      } catch (error) {
                        console.error("Failed to update status:", error)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Offen</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Bearbeitung</SelectItem>
                      <SelectItem value="WAITING_FOR_CUSTOMER">Warten auf Kunden</SelectItem>
                      <SelectItem value="CLOSED">Geschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Priorität</label>
                <div className="mt-1">
                  <Select 
                    value={ticket.priority} 
                    onValueChange={async (newPriority) => {
                      console.log("Priority dropdown changed to:", newPriority)
                      try {
                        const response = await fetch(`/api/tickets/${ticketId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ priority: newPriority })
                        })
                        console.log("API response status:", response.status)
                        if (response.ok) {
                          const data = await response.json()
                          console.log("Updated ticket data:", data.ticket)
                          setTicket(data.ticket)
                          
                          // Warte kurz, damit die SYSTEM-Nachricht erstellt wird, dann reload
                          setTimeout(() => {
                            console.log("Reloading message thread...")
                            messageThreadRef.current?.reload()
                          }, 500)
                        } else {
                          console.error("API error - Status:", response.status)
                          try {
                            const errorData = await response.json()
                            console.error("API error data:", errorData)
                          } catch (jsonError) {
                            console.error("API error - No JSON response:", jsonError)
                          }
                        }
                      } catch (error) {
                        console.error("Failed to update priority:", error)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
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
                <label className="text-sm font-medium text-gray-600">Firma</label>
                <p className="text-sm">{ticket.company?.name || 'Unbekannte Firma'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Erstellt</label>
                <p className="text-sm">
                  {new Date(ticket.createdAt).toLocaleString("de-DE")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Zuletzt aktualisiert</label>
                <p className="text-sm">
                  {new Date(ticket.updatedAt).toLocaleString("de-DE")}
                </p>
              </div>
            </CardContent>
          </Card>

          {ticket.description && (
            <Card>
              <CardHeader>
                <CardTitle>Beschreibung</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{ticket.description}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Abrechnungsbereich - Volle Breite unter Chat und Sidebar */}
      <div className="mt-6 space-y-6">
        {/* Work Entry Form */}
        <WorkEntryForm 
          ticketId={ticketId} 
          companyId={ticket.company.id}
          onWorkEntryCreated={handleWorkEntryUpdate}
        />

        {/* Work Entry Table */}
        <WorkEntryTable 
          ticketId={ticketId} 
          companyId={ticket.company.id}
          onWorkEntryUpdated={handleWorkEntryUpdate}
        />
      </div>
    </div>
  )
}
