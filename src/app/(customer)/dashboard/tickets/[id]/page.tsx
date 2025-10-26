"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageThread, MessageThreadRef } from "@/components/tickets/MessageThread"
import { useTicketUpdates } from "@/hooks/useTicketUpdates"
import { ArrowLeft, User, MessageSquare, Lock, CheckCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Ticket {
  id: string
  title: string
  description?: string
  status: "OPEN" | "IN_PROGRESS" | "CLOSED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  createdAt: string
  updatedAt: string
}

export default function CustomerTicketDetailPage() {
  const params = useParams()
  const ticketId = params.id as string
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const messageThreadRef = useRef<MessageThreadRef>(null)

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

  // Live-Updates für Customer mit intelligenter Fokus-Erkennung
  useTicketUpdates({
    ticketId,
    ticket,
    setTicket,
    messageThreadRef
  })

  const handleCloseTicket = async () => {
    setIsClosing(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/close`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTicket(data.ticket)
        setShowCloseDialog(false)
        toast.success("Ticket wurde erfolgreich geschlossen")
        
        // Reload messages to show the system message
        if (messageThreadRef.current) {
          messageThreadRef.current.reload()
        }
      } else {
        const error = await response.json()
        toast.error(error.error || "Fehler beim Schließen des Tickets")
      }
    } catch (error) {
      console.error("Error closing ticket:", error)
      toast.error("Fehler beim Schließen des Tickets")
    } finally {
      setIsClosing(false)
    }
  }

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
          <Link href="/dashboard/tickets">
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
          <Link href="/dashboard/tickets">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-h2">#{ticket.ticketNumber} - {ticket.title}</h1>
            <p className="text-gray-600">Ihr Support-Ticket</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getPriorityBadge(ticket.priority)}
          {getStatusBadge(ticket.status)}
          {ticket.status !== "CLOSED" && (
            <Button
              onClick={() => setShowCloseDialog(true)}
              disabled={isClosing}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Ticket schließen
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat Thread */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card className="h-[500px] lg:h-[600px] flex flex-col overflow-hidden">
            <CardHeader className="border-b flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Nachrichten
              </CardTitle>
              <CardDescription>
                Chat mit dem Support-Team
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <MessageThread 
                ref={messageThreadRef}
                ticketId={ticketId} 
                userRole="CLIENT"
                ticketStatus={ticket.status}
              />
            </CardContent>
          </Card>
        </div>

        {/* Ticket Info Sidebar */}
        <div className="space-y-4 order-1 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Ticket-Informationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  {getStatusBadge(ticket.status)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Priorität</label>
                <div className="mt-1">
                  {getPriorityBadge(ticket.priority)}
                </div>
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

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">💡 Tipp</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-700">
                Beschreiben Sie Ihr Problem so detailliert wie möglich. 
                Je mehr Informationen Sie bereitstellen, desto schneller 
                kann ich Ihnen helfen.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Schöne Bestätigungsbox für Ticket schließen */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Ticket schließen
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-600">
              Möchten Sie dieses Ticket wirklich schließen? 
              <br />
              <span className="font-medium text-red-600">
                Sie können danach nicht mehr darauf antworten.
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 mb-1">Wichtiger Hinweis</h4>
                <p className="text-sm text-amber-700">
                  Nach dem Schließen können Sie keine weiteren Nachrichten an dieses Ticket senden. 
                  Falls Sie später noch Hilfe benötigen, müssen Sie ein neues Ticket erstellen.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCloseDialog(false)}
              disabled={isClosing}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCloseTicket}
              disabled={isClosing}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isClosing ? (
                <>
                  <Lock className="h-4 w-4 mr-2 animate-spin" />
                  Wird geschlossen...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Ja, Ticket schließen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
