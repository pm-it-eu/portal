"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Users, 
  Building2, 
  Ticket, 
  FileText, 
  Settings,
  BarChart3,
  Bell,
  Calculator,
  Settings as SettingsIcon,
  Mail,
  Mailbox,
  Wrench
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: BarChart3 },
  { name: "Firmen", href: "/admin/companies", icon: Building2 },
  { name: "Benutzer", href: "/admin/users", icon: Users },
  { name: "Tickets", href: "/admin/tickets", icon: Ticket },
  { name: "Abrechnung", href: "/admin/billing", icon: Calculator },
  { name: "Firmen-Abrechnung", href: "/admin/billing/companies", icon: Building2 },
  { name: "Rechnungen", href: "/admin/invoices", icon: FileText },
  { name: "Service-Level", href: "/admin/service-levels", icon: Settings },
  { name: "Service-Optionen", href: "/admin/service-options", icon: SettingsIcon },
  { name: "E-Mail Templates", href: "/admin/email-templates", icon: Mail },
  { name: "E-Mail-Konfiguration", href: "/admin/email-configs", icon: Mailbox },
  { name: "Wartungsfenster", href: "/admin/maintenance", icon: Wrench },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="w-60 bg-white border-r border-gray-200 shadow-sm">
      <div className="p-4">
        <h2 className="text-h4 font-semibold text-gray-900">Admin Panel</h2>
      </div>
      
      <nav className="space-y-1 px-4 pb-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-small font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
