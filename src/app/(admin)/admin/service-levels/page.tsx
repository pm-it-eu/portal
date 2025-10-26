"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Settings, Plus, Search, Clock, Euro, AlertTriangle, Edit, Trash2, RotateCcw } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

interface ServiceLevelData {
  id: string
  name: string
  timeVolumeMinutes: number
  remainingMinutes: number
  hourlyRate: number
  renewalType: string
  startDate: string
  nextRenewalAt: string
  lastRenewedAt: string
  createdAt: string
  company: {
    id: string
    name: string
  }
}

interface Company {
  id: string
  name: string
}

export default function AdminServiceLevelsPage() {
  const [serviceLevels, setServiceLevels] = useState<ServiceLevelData[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredServiceLevels, setFilteredServiceLevels] = useState<ServiceLevelData[]>([])
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingServiceLevel, setEditingServiceLevel] = useState<ServiceLevelData | null>(null)
  
  // Form states
  const [name, setName] = useState("")
  const [timeVolumeMinutes, setTimeVolumeMinutes] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")
  const [renewalType, setRenewalType] = useState<"MONTHLY" | "YEARLY">("MONTHLY")
  const [companyId, setCompanyId] = useState("")
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load service levels
        const serviceLevelsResponse = await fetch("/api/service-levels")
        if (serviceLevelsResponse.ok) {
          const serviceLevelsData = await serviceLevelsResponse.json()
          setServiceLevels(serviceLevelsData.serviceLevels || [])
        }

        // Load companies
        const companiesResponse = await fetch("/api/companies")
        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json()
          setCompanies(companiesData.companies || [])
        }
      } catch (error) {
        console.error("Failed to load data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filter service levels
  useEffect(() => {
    let filtered = serviceLevels

    if (searchTerm) {
      filtered = filtered.filter(serviceLevel => 
        serviceLevel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        serviceLevel.company?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredServiceLevels(filtered)
  }, [serviceLevels, searchTerm])

  // CRUD Functions
  const resetForm = () => {
    setName("")
    setTimeVolumeMinutes("")
    setHourlyRate("")
    setRenewalType("MONTHLY")
    setCompanyId("")
    setStartDate(new Date().toISOString().split('T')[0])
  }

  const handleCreate = async () => {
    if (!name || !timeVolumeMinutes || !hourlyRate || !companyId || !startDate) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/service-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timeVolumeMinutes: parseInt(timeVolumeMinutes),
          hourlyRate: parseFloat(hourlyRate),
          renewalType,
          companyId,
          startDate
        })
      })

      if (response.ok) {
        const data = await response.json()
        setServiceLevels([data.serviceLevel, ...serviceLevels])
        setIsCreateDialogOpen(false)
        resetForm()
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Fehler beim Erstellen des Service-Levels")
      }
    } catch (error) {
      console.error("Error creating service level:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (serviceLevel: ServiceLevelData) => {
    setEditingServiceLevel(serviceLevel)
    setName(serviceLevel.name)
    setTimeVolumeMinutes(serviceLevel.timeVolumeMinutes.toString())
    setHourlyRate(serviceLevel.hourlyRate.toString())
    setRenewalType(serviceLevel.renewalType as "MONTHLY" | "YEARLY")
    setCompanyId(serviceLevel.company.id)
    setStartDate(serviceLevel.startDate.split('T')[0]) // Format für date input
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingServiceLevel || !name || !timeVolumeMinutes || !hourlyRate || !companyId || !startDate) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/service-levels/${editingServiceLevel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timeVolumeMinutes: parseInt(timeVolumeMinutes),
          hourlyRate: parseFloat(hourlyRate),
          renewalType,
          companyId,
          startDate
        })
      })

      if (response.ok) {
        const data = await response.json()
        setServiceLevels(serviceLevels.map(sl => sl.id === editingServiceLevel.id ? data.serviceLevel : sl))
        setIsEditDialogOpen(false)
        setEditingServiceLevel(null)
        resetForm()
      }
    } catch (error) {
      console.error("Error updating service level:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Sind Sie sicher, dass Sie dieses Service-Level löschen möchten?")) return
    
    try {
      const response = await fetch(`/api/service-levels/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setServiceLevels(serviceLevels.filter(sl => sl.id !== id))
      }
    } catch (error) {
      console.error("Error deleting service level:", error)
    }
  }

  const handleReset = async (id: string) => {
    if (!confirm("Sind Sie sicher, dass Sie das Service-Level zurücksetzen möchten? Dies setzt die verbleibende Zeit auf das Gesamtvolumen zurück.")) return
    
    try {
      const response = await fetch(`/api/service-levels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reset: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        setServiceLevels(serviceLevels.map(sl => sl.id === id ? data.serviceLevel : sl))
      }
    } catch (error) {
      console.error("Error resetting service level:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl">
        <h1 className="text-h1 text-blue-900 flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Service-Level Verwaltung
        </h1>
        <p className="text-blue-700 mt-2">
          Verwalten Sie alle Service-Level und deren Konfiguration
        </p>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Schnellaktionen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Neues Service-Level
            </Button>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Service-Level durchsuchen..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Levels */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : serviceLevels.length === 0 ? (
        <div className="text-center py-8">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Service-Level gefunden</h3>
          <p className="text-gray-600">Erstellen Sie Ihr erstes Service-Level, um loszulegen.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredServiceLevels.map((serviceLevel) => {
            const usedMinutes = serviceLevel.timeVolumeMinutes - serviceLevel.remainingMinutes
            const percentage = serviceLevel.timeVolumeMinutes > 0 ? (usedMinutes / serviceLevel.timeVolumeMinutes) * 100 : 0
            const isLow = percentage > 90
            const isWarning = percentage > 75


            return (
              <Card 
                key={serviceLevel.id} 
                className={`bg-white shadow-sm ${
                  isLow ? "border-red-200" : isWarning ? "border-yellow-200" : "border-gray-200"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isLow ? "bg-red-100" : isWarning ? "bg-yellow-100" : "bg-blue-100"
                      }`}>
                        {isLow ? (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Settings className={`h-5 w-5 ${
                            isWarning ? "text-yellow-600" : "text-blue-600"
                          }`} />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{serviceLevel.name}</CardTitle>
                        <CardDescription>{serviceLevel.company?.name || 'Unbekannte Firma'}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={isLow ? "destructive" : isWarning ? "secondary" : "outline"}>
                      {isLow ? "Niedrig" : isWarning ? "Warnung" : "Aktiv"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Verfügbare Zeit</span>
                        <span className={`font-medium ${isLow ? "text-red-600" : ""}`}>
                          {serviceLevel.remainingMinutes} von {serviceLevel.timeVolumeMinutes} Min ({Math.round(percentage)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Stundensatz:</span>
                        <div className="font-medium">€{serviceLevel.hourlyRate.toFixed(2)}/h</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Erneuerung:</span>
                        <div className="font-medium">
                          {serviceLevel.renewalType === "MONTHLY" ? "Monatlich" : "Jährlich"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Startdatum: {new Date(serviceLevel.startDate).toLocaleDateString('de-DE')}
                    </div>
                    <div className="text-xs text-gray-500">
                      Nächste Erneuerung: {serviceLevel.nextRenewalAt ? formatDistanceToNow(new Date(serviceLevel.nextRenewalAt), { addSuffix: true, locale: de }) : 'Nicht festgelegt'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(serviceLevel)}
                        className="text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Bearbeiten
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleReset(serviceLevel.id)}
                        className="text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Zurücksetzen
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `/admin/service-levels/${serviceLevel.id}/adjust-volume`}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Volumen
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(serviceLevel.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Service-Level erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie ein neues Service-Level für eine Firma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Premium Support"
              />
            </div>
            <div>
              <Label htmlFor="create-company">Firma</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Firma auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-volume">Zeitvolumen (Minuten)</Label>
                <Input
                  id="create-volume"
                  type="number"
                  value={timeVolumeMinutes}
                  onChange={(e) => setTimeVolumeMinutes(e.target.value)}
                  placeholder="z.B. 1200"
                />
              </div>
              <div>
                <Label htmlFor="create-rate">Stundensatz (€)</Label>
                <Input
                  id="create-rate"
                  type="number"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="z.B. 80.00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="create-renewal">Erneuerungstyp</Label>
              <Select value={renewalType} onValueChange={(value: "MONTHLY" | "YEARLY") => setRenewalType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monatlich</SelectItem>
                  <SelectItem value="YEARLY">Jährlich</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-company">Firma</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Firma auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-start-date">Startdatum</Label>
              <Input
                id="create-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Erstelle..." : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Service-Level bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Einstellungen des Service-Levels.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Premium Support"
              />
            </div>
            <div>
              <Label htmlFor="edit-company">Firma</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Firma auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-volume">Zeitvolumen (Minuten)</Label>
                <Input
                  id="edit-volume"
                  type="number"
                  value={timeVolumeMinutes}
                  onChange={(e) => setTimeVolumeMinutes(e.target.value)}
                  placeholder="z.B. 1200"
                />
              </div>
              <div>
                <Label htmlFor="edit-rate">Stundensatz (€)</Label>
                <Input
                  id="edit-rate"
                  type="number"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="z.B. 80.00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-renewal">Erneuerungstyp</Label>
              <Select value={renewalType} onValueChange={(value: "MONTHLY" | "YEARLY") => setRenewalType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monatlich</SelectItem>
                  <SelectItem value="YEARLY">Jährlich</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-company">Firma</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Firma auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-start-date">Startdatum</Label>
              <Input
                id="edit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? "Speichere..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
