"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Wrench, 
  Plus, 
  Calendar, 
  Clock, 
  Building, 
  AlertTriangle,
  CheckCircle,
  X,
  Trash2,
  RotateCcw,
  Edit,
  Check,
  XCircle
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
  company: {
    id: string
    name: string
  }
}

interface Company {
  id: string
  name: string
}

export default function AdminMaintenancePage() {
  const [maintenance, setMaintenance] = useState<MaintenanceWindow[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceWindow | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [maintenanceRes, companiesRes] = await Promise.all([
          fetch("/api/admin/maintenance"),
          fetch("/api/companies")
        ])
        
        if (maintenanceRes.ok) {
          const maintenanceData = await maintenanceRes.json()
          setMaintenance(maintenanceData.data || [])
        }
        
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json()
          setCompanies(companiesData.companies || [])
        }
      } catch (error) {
        console.error("Failed to load data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
    
    // Update every minute to check for time changes
    const interval = setInterval(loadData, 60000)
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

  const handleEdit = (maintenance: MaintenanceWindow) => {
    setSelectedMaintenance(maintenance)
    setShowEditDialog(true)
  }

  const handleComplete = async (maintenanceId: string) => {
    try {
      const response = await fetch(`/api/admin/maintenance/${maintenanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      })

      if (response.ok) {
        // Reload data
        window.location.reload()
      } else {
        alert('Fehler beim Abschließen der Wartung')
      }
    } catch (error) {
      console.error('Error completing maintenance:', error)
      alert('Fehler beim Abschließen der Wartung')
    }
  }

  const handleCancel = async (maintenanceId: string) => {
    try {
      const response = await fetch(`/api/admin/maintenance/${maintenanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      })

      if (response.ok) {
        // Reload data
        window.location.reload()
      } else {
        alert('Fehler beim Abbrechen der Wartung')
      }
    } catch (error) {
      console.error('Error cancelling maintenance:', error)
      alert('Fehler beim Abbrechen der Wartung')
    }
  }

  const handleDelete = (maintenance: MaintenanceWindow) => {
    setSelectedMaintenance(maintenance)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!selectedMaintenance) return
    
    try {
      const response = await fetch(`/api/admin/maintenance/${selectedMaintenance.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setSelectedMaintenance(null)
        // Reload data
        window.location.reload()
      } else {
        alert('Fehler beim Löschen der Wartung')
      }
    } catch (error) {
      console.error('Error deleting maintenance:', error)
      alert('Fehler beim Löschen der Wartung')
    }
  }

  const handleReschedule = (maintenance: MaintenanceWindow) => {
    setSelectedMaintenance(maintenance)
    setShowEditDialog(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl">
        <h1 className="text-h1 text-blue-900 flex items-center gap-2">
          <Wrench className="h-8 w-8 text-blue-600" />
          Wartungsfenster-Verwaltung
        </h1>
        <p className="text-blue-700 mt-2">
          Planen und verwalten Sie Wartungsfenster für Ihre Kunden
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Schnellaktionen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Neues Wartungsfenster
              </Button>
            </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white border-2 border-gray-200 shadow-xl">
                      <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 -m-6 mb-6 border-b border-gray-200">
                        <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <Plus className="h-5 w-5 text-blue-600" />
                          Neues Wartungsfenster erstellen
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 mt-2">
                          Planen Sie ein Wartungsfenster für einen Kunden
                        </DialogDescription>
                      </DialogHeader>
              <CreateMaintenanceForm 
                companies={companies}
                onClose={() => setShowCreateDialog(false)}
                onSuccess={() => {
                  setShowCreateDialog(false)
                  window.location.reload()
                }}
              />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Maintenance Windows List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Alle Wartungsfenster
          </CardTitle>
          <CardDescription>
            Übersicht aller geplanten und laufenden Wartungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-gray-500">Lade Wartungsfenster...</div>
          ) : maintenance.length === 0 ? (
            <p className="text-center text-gray-500">Keine Wartungsfenster gefunden.</p>
          ) : (
            <div className="space-y-4">
              {maintenance.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center space-x-4">
                    <Wrench className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-600">
                        {item.company.name} • {getTypeLabel(item.type)}
                      </p>
                      <div className={`flex items-center gap-2 mt-1 rounded-lg p-2 ${
                        item.status === 'IN_PROGRESS' || 
                        (item.status === 'SCHEDULED' && new Date() >= new Date(item.scheduledAt))
                          ? 'bg-red-50 border border-red-200' 
                          : 'bg-blue-50 border border-blue-200'
                      }`}>
                        <Clock className={`h-4 w-4 ${
                          item.status === 'IN_PROGRESS' || 
                          (item.status === 'SCHEDULED' && new Date() >= new Date(item.scheduledAt))
                            ? 'text-red-600' 
                            : 'text-blue-600'
                        }`} />
                        <span className={`text-sm font-semibold ${
                          item.status === 'IN_PROGRESS' || 
                          (item.status === 'SCHEDULED' && new Date() >= new Date(item.scheduledAt))
                            ? 'text-red-800' 
                            : 'text-blue-800'
                        }`}>
                          {new Date(item.scheduledAt).toLocaleString("de-DE", {
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
                      {item.estimatedDuration && (
                        <p className="text-xs text-gray-500">
                          Geschätzte Dauer: {item.estimatedDuration} Min
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(item)}
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Bearbeiten
                      </Button>
                      
                      {/* Aktive Wartungen */}
                      {item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS' ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleComplete(item.id)}
                            className="text-green-600 hover:text-green-700 flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Abschließen
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCancel(item.id)}
                            className="text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <XCircle className="h-3 w-3" />
                            Abbrechen
                          </Button>
                        </>
                      ) : null}
                      
                      {/* Abgebrochene Wartungen */}
                      {item.status === 'CANCELLED' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReschedule(item)}
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Neuplanen
                        </Button>
                      ) : null}
                      
                      {/* Alle Wartungen (außer abgeschlossene) */}
                      {item.status !== 'COMPLETED' ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDelete(item)}
                                className="text-red-600 hover:text-red-700 border-red-200 flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                Löschen
                              </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl bg-white border-2 border-gray-200 shadow-xl">
                  <DialogHeader className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 -m-6 mb-6 border-b border-gray-200">
                    <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Edit className="h-5 w-5 text-green-600" />
                      Wartungsfenster bearbeiten
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 mt-2">
                      Bearbeiten Sie die Details des Wartungsfensters
                    </DialogDescription>
                  </DialogHeader>
          {selectedMaintenance && (
            <EditMaintenanceForm 
              maintenance={selectedMaintenance}
              companies={companies}
              onClose={() => setShowEditDialog(false)}
              onSuccess={() => {
                setShowEditDialog(false)
                window.location.reload()
              }}
            />
          )}
        </DialogContent>
              </Dialog>

              {/* Delete Confirmation Dialog */}
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="max-w-md bg-white border-2 border-red-200 shadow-xl">
                  <DialogHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-6 -m-6 mb-6 border-b border-red-200">
                    <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Trash2 className="h-5 w-5 text-red-600" />
                      Wartung löschen
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 mt-2">
                      Diese Aktion kann nicht rückgängig gemacht werden
                    </DialogDescription>
                  </DialogHeader>
                  
                  {selectedMaintenance && (
                    <div className="p-2">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-red-800 mb-2">{selectedMaintenance.title}</h4>
                        <div className="text-sm text-red-700">
                          <strong>Firma:</strong> {selectedMaintenance.company.name}<br/>
                          <strong>Typ:</strong> {getTypeLabel(selectedMaintenance.type)}<br/>
                          <strong>Status:</strong> {getStatusBadge(selectedMaintenance)}
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowDeleteDialog(false)}
                          className="px-6"
                        >
                          Abbrechen
                        </Button>
                        <Button 
                          onClick={confirmDelete}
                          className="px-6 bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Endgültig löschen
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )
        }

// Edit Maintenance Form Component
function EditMaintenanceForm({
  maintenance,
  companies,
  onClose,
  onSuccess
}: {
  maintenance: MaintenanceWindow
  companies: Company[]
  onClose: () => void
  onSuccess: () => void
}) {
  // Hilfsfunktion für datetime-local Format (Berlin Zeitzone)
  const formatDateTimeLocal = (dateString: string) => {
    const date = new Date(dateString)
    // Konvertiere zu Berlin Zeitzone
    const berlinDate = new Date(date.toLocaleString("en-US", {timeZone: "Europe/Berlin"}))
    const year = berlinDate.getFullYear()
    const month = String(berlinDate.getMonth() + 1).padStart(2, '0')
    const day = String(berlinDate.getDate()).padStart(2, '0')
    const hours = String(berlinDate.getHours()).padStart(2, '0')
    const minutes = String(berlinDate.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const [formData, setFormData] = useState({
    title: maintenance.title,
    description: maintenance.description || '',
    type: maintenance.type,
    status: maintenance.status,
    scheduledAt: formatDateTimeLocal(maintenance.scheduledAt),
    estimatedDuration: maintenance.estimatedDuration?.toString() || '',
    notes: maintenance.notes || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/maintenance/${maintenance.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        console.error('Failed to update maintenance window:', errorData)
        alert(`Fehler beim Aktualisieren: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error updating maintenance window:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title" className="text-sm font-medium text-gray-700">Titel</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <Label htmlFor="type" className="text-sm font-medium text-gray-700">Typ</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Typ auswählen" />
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
        <Label htmlFor="description" className="text-sm font-medium text-gray-700">Beschreibung</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status" className="text-sm font-medium text-gray-700">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
            <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Status auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SCHEDULED">Geplant</SelectItem>
              <SelectItem value="IN_PROGRESS">Läuft</SelectItem>
              <SelectItem value="COMPLETED">Abgeschlossen</SelectItem>
              <SelectItem value="CANCELLED">Abgebrochen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="scheduledAt" className="text-sm font-medium text-gray-700">Geplant für</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            value={formData.scheduledAt}
            onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
            className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="estimatedDuration" className="text-sm font-medium text-gray-700">Geschätzte Dauer (Minuten)</Label>
        <Input
          id="estimatedDuration"
          type="number"
          value={formData.estimatedDuration}
          onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
          className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Notizen</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="px-6">
          Abbrechen
        </Button>
        <Button type="submit" disabled={saving || !formData.title || !formData.scheduledAt} className="px-6 bg-green-600 hover:bg-green-700">
          {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
        </Button>
      </div>
    </form>
  )
}

// Create Maintenance Form Component
function CreateMaintenanceForm({
  companies,
  onClose,
  onSuccess
}: {
  companies: Company[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    companyId: '',
    title: '',
    description: '',
    type: 'SYSTEM_UPDATE',
    scheduledAt: '',
    estimatedDuration: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        console.error('Failed to create maintenance window:', errorData)
        alert(`Fehler beim Erstellen: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error creating maintenance window:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="companyId">Firma</Label>
        <Select value={formData.companyId} onValueChange={(value) => setFormData(prev => ({ ...prev, companyId: value }))}>
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

      <div>
        <Label htmlFor="title">Titel</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor="type">Typ</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Typ auswählen" />
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

      <div>
        <Label htmlFor="scheduledAt">Geplant für</Label>
        <Input
          id="scheduledAt"
          type="datetime-local"
          value={formData.scheduledAt}
          onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="estimatedDuration">Geschätzte Dauer (Minuten)</Label>
        <Input
          id="estimatedDuration"
          type="number"
          value={formData.estimatedDuration}
          onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notizen</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={saving || !formData.companyId || !formData.title || !formData.scheduledAt}>
          {saving ? 'Wird erstellt...' : 'Wartungsfenster erstellen'}
        </Button>
      </div>
    </form>
  )
}




