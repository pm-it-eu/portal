"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Lock, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  isInternalNote: boolean
  isSystemMessage: boolean
  createdAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    role: string
  }
}

interface MessageThreadProps {
  ticketId: string
  userRole: "ADMIN" | "CLIENT"
  ticketStatus?: "OPEN" | "IN_PROGRESS" | "WAITING_FOR_CUSTOMER" | "CLOSED"
  reloadTrigger?: number
}

export interface MessageThreadRef {
  reload: () => void
}

export const MessageThread = forwardRef<MessageThreadRef, MessageThreadProps>(({ ticketId, userRole, ticketStatus, reloadTrigger }, ref) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [isLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Auto-scroll entfernt - neueste Nachrichten werden oben angezeigt

  // Expose reload function via ref
  useImperativeHandle(ref, () => ({
    reload: loadMessages
  }))

  // Load messages
  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/messages`)
      if (response.ok) {
        const data = await response.json()
        
        // Sortiere Nachrichten nach Erstellungsdatum (neueste zuerst)
        const sortedMessages = data.messages.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setMessages(sortedMessages)
      }
    } catch (error) {
      // Error handling ohne Debug-Logs
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return
    
    // Block sending if ticket is closed and user is a client
    if (ticketStatus === "CLOSED" && userRole === "CLIENT") {
      alert("Dieses Ticket ist geschlossen. Sie können keine weiteren Nachrichten senden.")
      return
    }

    setIsSending(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage.trim(),
          isInternalNote: userRole === "ADMIN" ? isInternalNote : false,
        }),
      })

      if (response.ok) {
        setNewMessage("")
        setIsInternalNote(false)
        // Sofortige Aktualisierung nach dem Senden
        setTimeout(async () => {
          await loadMessages()
        }, 200)
      } else {
        const errorData = await response.json().catch(() => ({}))
        
        // Wenn der User nicht gefunden wurde, zur Anmeldung umleiten
        if (response.status === 401 && errorData.error?.includes("User not found")) {
          window.location.href = "/login"
        }
      }
    } catch (error) {
      // Error handling ohne Debug-Logs
    } finally {
      setIsSending(false)
    }
  }

  // Initial load only - polling is handled by useTicketUpdates
  useEffect(() => {
    loadMessages()
    
    return () => {
      // Cleanup
    }
  }, [ticketId])

  // Expose reload function to parent
  useImperativeHandle(ref, () => ({
    reload: () => {
      loadMessages()
    }
  }))

  // Reload when reloadTrigger changes
  useEffect(() => {
    if (reloadTrigger !== undefined) {
      loadMessages()
    }
  }, [reloadTrigger])

  // Auto-scroll entfernt - neueste Nachrichten werden oben angezeigt
  const [lastMessageCount, setLastMessageCount] = useState(0)
  
  useEffect(() => {
    if (messages.length > lastMessageCount && messages.length > 0) {
      setLastMessageCount(messages.length)
    }
  }, [messages, lastMessageCount])

  return (
    <div className="flex flex-col h-full max-h-full">
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" data-message-container>
        {messages.map((message) => {
          const isFromCustomer = message.author.role === "CLIENT"
          const isInternal = message.isInternalNote
          const isSystem = message.isSystemMessage

          // SYSTEM-Nachrichten wie Admin-Nachrichten anzeigen (links, grau)
          if (isSystem) {
            return (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-900">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium">SYSTEM</span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.createdAt).toLocaleString("de-DE")}
                  </p>
                </div>
              </div>
            )
          }

          return (
            <div
              key={message.id}
              className={cn(
                "flex",
                isFromCustomer ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-3",
                  isFromCustomer
                    ? "bg-blue-100 text-blue-900"
                    : isInternal
                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                    : "bg-gray-100 text-gray-900"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isInternal ? (
                    <Lock className="h-3 w-3" />
                  ) : isFromCustomer ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <img src="/Logo_PC.png" alt="Admin" className="h-3 w-3 object-contain" />
                  )}
                  <span className="text-xs font-medium">
                    {message.author.firstName} {message.author.lastName}
                    {isInternal && " (Intern)"}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.createdAt).toLocaleString("de-DE")}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Message Input */}
      <div className="border-t bg-white p-4 flex-shrink-0">
        {ticketStatus === "CLOSED" && userRole === "CLIENT" ? (
          <div className="text-center py-4 text-gray-500">
            <Lock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Dieses Ticket ist geschlossen. Sie können keine weiteren Nachrichten senden.</p>
          </div>
        ) : (
          <>
            {userRole === "ADMIN" && (
              <div className="mb-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded"
                  />
                  <Lock className="h-4 w-4" />
                  Interne Notiz (nur für Support sichtbar)
                </label>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Nachricht eingeben..."
                className="flex-1 min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
                className="self-end"
              >
                {isSending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
})

MessageThread.displayName = "MessageThread"
