"use client"

import { signOut } from "next-auth/react"
import { Bell, LogOut, User, Home, Ticket, FileText, Settings, Menu, X } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  user: {
    firstName: string
    lastName: string
    role: string
    company?: {
      name: string
    }
  }
}

export function Header({ user }: HeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Navigation für Kunden
  const customerNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Tickets", href: "/dashboard/tickets", icon: Ticket },
    { name: "Rechnungen", href: "/dashboard/invoices", icon: FileText },
    { name: "Einstellungen", href: "/dashboard/settings", icon: Settings },
  ]

  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount || 0)
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error("Failed to load notifications:", error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH"
      })
      // Reload notifications to update counts
      loadNotifications()
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    // Mark as read first
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }

    // Navigate to ticket if it's ticket-related
    if (notification.relatedId && (notification.type === "MESSAGE" || notification.type === "TICKET_UPDATE" || notification.type === "TICKET_CREATED")) {
      // Determine the correct route based on user role
      const ticketRoute = user.role === "ADMIN" 
        ? `/admin/tickets/${notification.relatedId}`
        : `/dashboard/tickets/${notification.relatedId}`
      
      router.push(ticketRoute)
    }
  }

  useEffect(() => {
    loadNotifications()
    // Polling alle 10 Sekunden für neue Benachrichtigungen
    const interval = setInterval(loadNotifications, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-blue-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4 pl-4">
          <div className="flex items-center space-x-2">
            <img 
              src="/Logo_PC.png" 
              alt="pmIT Logo" 
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-h3 font-semibold text-gray-900">pmIT</h1>
          </div>
          {user.company && (
            <span className="text-small text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {user.company?.name || 'Keine Firma'}
            </span>
          )}
        </div>

        {/* Desktop Navigation für Kunden - nur auf Desktop */}
        {user.role === "CLIENT" && (
          <nav className="hidden lg:flex items-center space-x-1">
            {customerNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-700 hover:bg-blue-50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        )}

        {/* Mobile Menu Button für Kunden - auf allen Bildschirmen außer Desktop */}
        {user.role === "CLIENT" && (
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}

        <div className="flex items-center space-x-4 pr-4">
          {/* Notification Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>
                <div className="flex items-center justify-between">
                  <span>Benachrichtigungen</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {unreadCount} neu
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Keine Benachrichtigungen
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id} 
                    className={`flex flex-col items-start p-3 cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className="h-3 w-3" />
                      <span className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleDateString("de-DE")}
                      </span>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-sm font-medium">{notification.message}</p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 px-3 py-2">
                <User className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {user.firstName} {user.lastName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.role === "ADMIN" ? "Administrator" : "Kunde"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Navigation Menu - auf allen Bildschirmen außer Desktop */}
      {user.role === "CLIENT" && mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-2 space-y-1">
            {customerNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-700 hover:bg-blue-50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
