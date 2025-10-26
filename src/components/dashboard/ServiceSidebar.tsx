"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Clock, 
  Mail, 
  Phone, 
  Globe, 
  Monitor, 
  Laptop,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  User
} from "lucide-react"
import { toast } from "sonner"

export function ServiceSidebar() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  // Aktualisiere Zeit jede Sekunde - nur auf Client
  useEffect(() => {
    // Set initial time on client side only
    setCurrentTime(new Date())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const serviceInfo = {
    email: "info@pm-it.eu",
    phone: "+49 151 61 63 04 34",
    website: "https://pm-it.eu",
    remoteWindows: "https://remote.pm-it.eu/windows",
    remoteMac: "https://remote.pm-it.eu/mac"
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(text)
      toast.success(`${label} kopiert!`)
      setTimeout(() => setCopiedItem(null), 2000)
    } catch (error) {
      toast.error("Fehler beim Kopieren")
    }
  }

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4 lg:sticky lg:top-6">
      {/* Welcome Banner - ganz oben */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
            <User className="h-5 w-5" />
            Willkommen!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-emerald-700 leading-relaxed">
            Hier ist Ihr persönliches Kundenportal. Sie können hier Tickets erstellen, 
            den Status verfolgen und Ihre Rechnungen einsehen.
          </p>
        </CardContent>
      </Card>

      {/* Aktuelles Datum & Uhrzeit */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Aktueller Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>
              {currentTime ? currentTime.toLocaleDateString('de-DE', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone: 'Europe/Berlin'
              }) : 'Lade...'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="font-mono">
              {currentTime ? currentTime.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' }) : '--:--:--'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Kontaktinformationen */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Kontakt & Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* E-Mail */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              <span className="text-sm">E-Mail</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(serviceInfo.email, "E-Mail")}
                className="h-6 px-2 text-xs"
              >
                {copiedItem === serviceInfo.email ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-600 ml-6 break-all">{serviceInfo.email}</p>

          {/* Telefon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-green-600" />
              <span className="text-sm">Telefon</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(serviceInfo.phone, "Telefon")}
                className="h-6 px-2 text-xs"
              >
                {copiedItem === serviceInfo.phone ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-600 ml-6 break-all">{serviceInfo.phone}</p>

          {/* Website */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-600" />
              <span className="text-sm">Website</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openLink(serviceInfo.website)}
                className="h-6 px-2 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-600 ml-6 break-all">{serviceInfo.website}</p>
        </CardContent>
      </Card>

      {/* Fernwartung */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Fernwartung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Windows Fernwartung */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Windows</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLink(serviceInfo.remoteWindows)}
              className="h-6 px-2 text-xs w-full sm:w-auto"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Öffnen
            </Button>
          </div>

          {/* Mac Fernwartung */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Laptop className="h-4 w-4 text-gray-600" />
              <span className="text-sm">Mac</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLink(serviceInfo.remoteMac)}
              className="h-6 px-2 text-xs w-full sm:w-auto"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Öffnen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Support Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="text-center">
            <h4 className="text-sm font-medium text-blue-900 mb-1">💡 Support-Tipp</h4>
            <p className="text-xs text-blue-700">
              Bei dringenden Problemen rufen Sie uns direkt an. 
              Für Fernwartung nutzen Sie die Links oben.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
