"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Wrench, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
  HardDrive,
  Download,
  Settings,
  Database
} from "lucide-react"

interface MaintenanceWindow {
  id: string
  title: string
  description?: string
  type: string
  status: string
  scheduledAt: string
  estimatedDuration?: number
  notes?: string
  createdAt: string
  updatedAt?: string
}

export function MaintenanceCard() {
  const [maintenance, setMaintenance] = useState<MaintenanceWindow[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const loadMaintenance = async () => {
      try {
        const response = await fetch('/api/customer/maintenance')
        if (response.ok) {
          const result = await response.json()
          setMaintenance(result.data || [])
          // Index zurücksetzen wenn sich Wartungen ändern
          setCurrentIndex(0)
        }
      } catch (error) {
        // Error handling ohne Debug-Logs
      } finally {
        setLoading(false)
      }
    }

    loadMaintenance()
    
    // Update every minute to check for time changes
    const interval = setInterval(loadMaintenance, 60000)
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (maintenance: MaintenanceWindow) => {
    const now = new Date()
    const scheduledTime = new Date(maintenance.scheduledAt)
    const isTimeReached = now >= scheduledTime
    
    // Wenn Zeit erreicht ist und Status noch SCHEDULED, zeige als "Läuft" in rot
    if (isTimeReached && maintenance.status === 'SCHEDULED') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Läuft</Badge>
    }
    
    switch (maintenance.status) {
      case 'SCHEDULED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Geplant</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Läuft</Badge>
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Abgeschlossen</Badge>
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Abgebrochen</Badge>
      default:
        return <Badge variant="outline">{maintenance.status}</Badge>
    }
  }

  const getTypeIcon = (type: string, isLarge: boolean = false) => {
    const sizeClass = isLarge ? "h-12 w-12" : "h-5 w-5"
    
    switch (type) {
      case 'SYSTEM_UPDATE':
        return <Settings className={`${sizeClass} text-blue-600`} />
      case 'SECURITY_PATCH':
        return <Shield className={`${sizeClass} text-red-600`} />
      case 'HARDWARE_MAINTENANCE':
        return <HardDrive className={`${sizeClass} text-gray-600`} />
      case 'SOFTWARE_UPDATE':
        return <Download className={`${sizeClass} text-green-600`} />
      case 'BACKUP_MAINTENANCE':
        return <Database className={`${sizeClass} text-purple-600`} />
      default:
        return <Wrench className={`${sizeClass} text-gray-600`} />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SYSTEM_UPDATE': return 'System-Update'
      case 'SECURITY_PATCH': return 'Sicherheits-Update'
      case 'HARDWARE_MAINTENANCE': return 'Hardware-Wartung'
      case 'SOFTWARE_UPDATE': return 'Software-Update'
      case 'BACKUP_MAINTENANCE': return 'Backup-Wartung'
      case 'OTHER': return 'Sonstige'
      default: return type
    }
  }

  // Navigation-Funktionen
  const nextMaintenance = () => {
    if (maintenance.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % maintenance.length)
    }
  }

  const prevMaintenance = () => {
    if (maintenance.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + maintenance.length) % maintenance.length)
    }
  }

  // Filtere Wartungen: Abgeschlossene nur 16h sichtbar
  const filteredMaintenance = maintenance.filter(item => {
    if (item.status === 'COMPLETED') {
      const completedTime = new Date(item.updatedAt || item.createdAt)
      const now = new Date()
      const hoursSinceCompletion = (now.getTime() - completedTime.getTime()) / (1000 * 60 * 60)
      return hoursSinceCompletion <= 16 // Nur 16 Stunden sichtbar
    }
    return true // Alle anderen Status immer sichtbar
  })

  // Sortiere Wartungen intelligent: Aktive -> Geplante -> Abgeschlossene -> Abgebrochene
  const sortedMaintenance = filteredMaintenance.sort((a, b) => {
    const now = new Date()
    const aTime = new Date(a.scheduledAt)
    const bTime = new Date(b.scheduledAt)
    
    // Aktive Wartungen (läuft oder Zeit erreicht) zuerst
    const aIsActive = a.status === 'IN_PROGRESS' || (a.status === 'SCHEDULED' && now >= aTime)
    const bIsActive = b.status === 'IN_PROGRESS' || (b.status === 'SCHEDULED' && now >= bTime)
    
    // Geplante Wartungen (zukünftige SCHEDULED)
    const aIsScheduled = a.status === 'SCHEDULED' && now < aTime
    const bIsScheduled = b.status === 'SCHEDULED' && now < bTime
    
    // Abgeschlossene Wartungen
    const aIsCompleted = a.status === 'COMPLETED'
    const bIsCompleted = b.status === 'COMPLETED'
    
    // Abgebrochene Wartungen
    const aIsCancelled = a.status === 'CANCELLED'
    const bIsCancelled = b.status === 'CANCELLED'
    
    // Priorität: Aktive -> Geplante -> Abgeschlossene -> Abgebrochene
    if (aIsActive && !bIsActive) return -1
    if (!aIsActive && bIsActive) return 1
    
    if (aIsScheduled && !bIsScheduled && !aIsActive && !bIsActive) return -1
    if (!aIsScheduled && bIsScheduled && !aIsActive && !bIsActive) return 1
    
    if (aIsCompleted && !bIsCompleted && !aIsActive && !bIsActive && !aIsScheduled && !bIsScheduled) return -1
    if (!aIsCompleted && bIsCompleted && !aIsActive && !bIsActive && !aIsScheduled && !bIsScheduled) return 1
    
    if (aIsCancelled && !bIsCancelled && !aIsActive && !bIsActive && !aIsScheduled && !bIsScheduled && !aIsCompleted && !bIsCompleted) return -1
    if (!aIsCancelled && bIsCancelled && !aIsActive && !bIsActive && !aIsScheduled && !bIsScheduled && !aIsCompleted && !bIsCompleted) return 1
    
    // Bei gleichem Status: nach Zeit sortieren
    return aTime.getTime() - bTime.getTime()
  })

  // Nächste geplante Wartung (nur zukünftige SCHEDULED)
  const nextScheduledMaintenance = maintenance
    .filter(m => {
      if (m.status !== 'SCHEDULED') return false
      const now = new Date()
      const scheduledTime = new Date(m.scheduledAt)
      return now < scheduledTime // Nur zukünftige
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]

  // Aktuelle Wartung basierend auf Index (mit Bounds-Check)
  const currentMaintenanceItem = sortedMaintenance.length > 0 && currentIndex < sortedMaintenance.length 
    ? sortedMaintenance[currentIndex] 
    : null

  // Laufende Wartung (erste aktive)
  const currentMaintenance = sortedMaintenance.find(m => {
    if (m.status === 'IN_PROGRESS') return true
    
    // Prüfe ob Zeit erreicht ist bei SCHEDULED
    const now = new Date()
    const scheduledTime = new Date(m.scheduledAt)
    return m.status === 'SCHEDULED' && now >= scheduledTime
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Aktuelle Vorkommnisse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Card bleibt neutral
  const getCardStyling = () => {
    return ""
  }

  return (
    <Card className={getCardStyling()}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Aktuelle Vorkommnisse
          </CardTitle>
          {maintenance.length > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={prevMaintenance}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-500 px-2">
                {currentIndex + 1} / {maintenance.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMaintenance}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
                {/* Aktuelle Wartung (durch Navigation) */}
                {currentMaintenanceItem && (
                  <div className={`rounded-lg p-4 ${
                    currentMaintenanceItem.status === 'IN_PROGRESS' || 
                    (currentMaintenanceItem.status === 'SCHEDULED' && new Date() >= new Date(currentMaintenanceItem.scheduledAt))
                      ? 'bg-red-50 border border-red-200' 
                      : currentMaintenanceItem.status === 'COMPLETED'
                      ? 'bg-green-50 border border-green-200'
                      : currentMaintenanceItem.status === 'CANCELLED'
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
            <div className="flex items-start gap-4">
              {/* Content links - 70% */}
              <div className="flex-1">
                {/* Art der Wartung oben */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    {getTypeLabel(currentMaintenanceItem.type)}
                  </span>
                </div>
                
                {/* Titel und Zeitpunkt rechts */}
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">
                        {currentMaintenanceItem.title}
                      </h3>
                    </div>
                    
                    {/* Zeitpunkt rechts */}
                    <div className={`flex items-center gap-2 ml-4 ${
                      currentMaintenanceItem.status === 'IN_PROGRESS' || 
                      (currentMaintenanceItem.status === 'SCHEDULED' && new Date() >= new Date(currentMaintenanceItem.scheduledAt))
                        ? 'bg-red-100 rounded-lg p-2' 
                        : currentMaintenanceItem.status === 'COMPLETED'
                        ? 'bg-green-100 rounded-lg p-2'
                        : currentMaintenanceItem.status === 'CANCELLED'
                        ? 'bg-gray-100 rounded-lg p-2'
                        : 'bg-blue-50 rounded-lg p-2'
                    }`}>
                      <Clock className={`h-4 w-4 ${
                        currentMaintenanceItem.status === 'IN_PROGRESS' || 
                        (currentMaintenanceItem.status === 'SCHEDULED' && new Date() >= new Date(currentMaintenanceItem.scheduledAt))
                          ? 'text-red-600' 
                          : currentMaintenanceItem.status === 'COMPLETED'
                          ? 'text-green-600'
                          : currentMaintenanceItem.status === 'CANCELLED'
                          ? 'text-gray-600'
                          : 'text-blue-600'
                      }`} />
                      <span className={`text-sm font-semibold ${
                        currentMaintenanceItem.status === 'IN_PROGRESS' || 
                        (currentMaintenanceItem.status === 'SCHEDULED' && new Date() >= new Date(currentMaintenanceItem.scheduledAt))
                          ? 'text-red-800' 
                          : currentMaintenanceItem.status === 'COMPLETED'
                          ? 'text-green-800'
                          : currentMaintenanceItem.status === 'CANCELLED'
                          ? 'text-gray-800'
                          : 'text-blue-800'
                      }`}>
                              {new Date(currentMaintenanceItem.scheduledAt).toLocaleString('de-DE', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Europe/Berlin'
                              })}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Beschreibung */}
                {currentMaintenanceItem.description && (
                  <div className="bg-white/60 rounded-lg p-3 border border-white/20">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {currentMaintenanceItem.description}
                    </p>
                  </div>
                )}
              </div>
              
                      {/* Großes Icon rechts - 30% */}
                      <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 self-center">
                        <div className="flex flex-col items-center justify-center h-16">
                          {getTypeIcon(currentMaintenanceItem.type, true)}
                          {currentMaintenanceItem.status === 'COMPLETED' && (
                            <CheckCircle className="h-8 w-8 text-green-600 mt-2" />
                          )}
                        </div>
                        
                        {/* Status unter den Icons */}
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg mt-2 w-full justify-center ${
                          currentMaintenanceItem.status === 'IN_PROGRESS' || 
                          (currentMaintenanceItem.status === 'SCHEDULED' && new Date() >= new Date(currentMaintenanceItem.scheduledAt))
                            ? 'bg-red-100' 
                            : currentMaintenanceItem.status === 'COMPLETED'
                            ? 'bg-green-100'
                            : currentMaintenanceItem.status === 'CANCELLED'
                            ? 'bg-gray-100'
                            : 'bg-blue-100'
                        }`}>
                          {currentMaintenanceItem.status === 'COMPLETED' ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : currentMaintenanceItem.status === 'CANCELLED' ? (
                            <AlertTriangle className="h-3 w-3 text-gray-600" />
                          ) : (
                            <Clock className={`h-3 w-3 ${
                              currentMaintenanceItem.status === 'IN_PROGRESS' || 
                              (currentMaintenanceItem.status === 'SCHEDULED' && new Date() >= new Date(currentMaintenanceItem.scheduledAt))
                                ? 'text-red-600' 
                                : 'text-blue-600'
                            }`} />
                          )}
                          <span className={`text-xs font-medium ${
                            currentMaintenanceItem.status === 'IN_PROGRESS' || 
                            (currentMaintenanceItem.status === 'SCHEDULED' && new Date() >= new Date(currentMaintenanceItem.scheduledAt))
                              ? 'text-red-800' 
                              : currentMaintenanceItem.status === 'COMPLETED'
                              ? 'text-green-800'
                              : currentMaintenanceItem.status === 'CANCELLED'
                              ? 'text-gray-800'
                              : 'text-blue-800'
                          }`}>
                            {currentMaintenanceItem.status === 'IN_PROGRESS' || 
                             (currentMaintenanceItem.status === 'SCHEDULED' && new Date() >= new Date(currentMaintenanceItem.scheduledAt))
                              ? 'Läuft' 
                              : currentMaintenanceItem.status === 'COMPLETED'
                              ? 'Abgeschlossen'
                              : currentMaintenanceItem.status === 'CANCELLED'
                              ? 'Abgebrochen'
                              : 'Geplant'}
                          </span>
                        </div>
                      </div>
            </div>
          </div>
        )}

        {/* Nächste geplante Wartung */}
        {nextScheduledMaintenance && !currentMaintenanceItem && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Nächste Wartung</span>
            </div>
            <div className="text-sm">
              <div className="font-medium">{nextScheduledMaintenance.title}</div>
              <div className="text-blue-700">
                {getTypeLabel(nextScheduledMaintenance.type)} • 
                {new Date(nextScheduledMaintenance.scheduledAt).toLocaleString('de-DE')}
              </div>
              {nextScheduledMaintenance.estimatedDuration && (
                <div className="text-xs text-blue-600 mt-1">
                  Geschätzte Dauer: {nextScheduledMaintenance.estimatedDuration} Min
                </div>
              )}
            </div>
          </div>
        )}

        {/* Keine Wartungen */}
        {!currentMaintenanceItem && !nextScheduledMaintenance && (
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Keine geplanten Wartungen</p>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
