"use client"

import { useEffect, useRef } from "react"
import { MessageThreadRef } from "@/components/tickets/MessageThread"

interface UseTicketUpdatesProps {
  ticketId: string
  ticket: any
  setTicket: (ticket: any) => void
  messageThreadRef: React.RefObject<MessageThreadRef | null>
}

export function useTicketUpdates({ ticketId, ticket, setTicket, messageThreadRef }: UseTicketUpdatesProps) {
  // Smart polling - nur wenn kein Input-Feld fokussiert ist
  useEffect(() => {
    if (!ticket) return
    
    const interval = setInterval(() => {
      // Prüfe ob ein Input-Feld fokussiert ist
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true' ||
        activeElement.closest('[contenteditable="true"]') ||
        // Zusätzliche Prüfung für spezifische Elemente
        activeElement.closest('input[type="number"]') ||
        activeElement.closest('textarea') ||
        activeElement.closest('[role="textbox"]') ||
        activeElement.closest('select') ||
        activeElement.closest('[role="combobox"]') ||
        // Spezifische Prüfung für Arbeitsaufwand-Felder
        activeElement.closest('[data-testid*="work"]') ||
        activeElement.closest('[name*="minutes"]') ||
        activeElement.closest('[name*="description"]') ||
        activeElement.closest('[name*="hourlyRate"]')
      )
      
      if (!isInputFocused) {
        console.log("🔄 TICKET: Smart ticket polling...")
        // Reload ticket data
        fetch(`/api/tickets/${ticketId}`)
          .then(res => res.json())
          .then(data => {
            if (data.ticket) {
              console.log("🔄 TICKET: Ticket data updated, triggering message reload...")
              setTicket(data.ticket)
              // Trigger message reload if messageThreadRef is available
              if (messageThreadRef.current) {
                console.log("🔄 TICKET: Calling messageThreadRef.reload()...")
                messageThreadRef.current.reload()
              } else {
                console.log("🔄 TICKET: messageThreadRef.current is null")
              }
            }
          })
          .catch(err => console.error("🔄 TICKET: Failed to update ticket:", err))
      } else {
        console.log("🔄 TICKET: Skipping ticket poll - input focused:", activeElement?.tagName, activeElement?.className, (activeElement as HTMLInputElement)?.name)
      }
    }, 15000) // 15 Sekunden für noch weniger Störung
    
    return () => clearInterval(interval)
  }, [ticketId, ticket, setTicket, messageThreadRef])
}
