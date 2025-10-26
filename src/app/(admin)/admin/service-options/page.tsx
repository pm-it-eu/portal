"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Euro,
  Calendar,
  SettingsIcon,
  PlusIcon,
  EditIcon,
  Trash2Icon,
  EuroIcon,
  CalendarIcon
} from "lucide-react"

interface ServiceOption {
  id: string
  name: string
  description: string
  price: number
  billingCycle: "MONTHLY" | "YEARLY"
  createdAt: string
  updatedAt: string
}

interface Company {
  id: string
  name: string
}

interface CompanyServiceOption {
  id: string
  companyId: string
  customOptionId: string
  company: Company
  customOption: ServiceOption
  activatedAt: string
  deactivatedAt?: string
  isBilled: boolean
}

export default function AdminServiceOptionsPage() {
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyAssignments, setCompanyAssignments] = useState<{[key: string]: boolean}>({})
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<ServiceOption | null>(null)
  const [assigningOption, setAssigningOption] = useState<ServiceOption | null>(null)
  const [saving, setSaving] = useState(false)

  // Form states
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY")

  useEffect(() => {
    loadServiceOptions()
    loadCompanies()
  }, [])

  const loadServiceOptions = async () => {
    try {
      const response = await fetch("/api/admin/custom-options")
      if (response.ok) {
        const data = await response.json()
        setServiceOptions(data.options || [])
      }
    } catch (error) {
      console.error("Failed to load service options:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCompanies = async () => {
    try {
      const response = await fetch("/api/companies")
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])
      }
    } catch (error) {
      console.error("Failed to load companies:", error)
    }
  }

  const loadCompanyAssignments = async (optionId: string) => {
    try {
      const response = await fetch(`/api/admin/custom-options/${optionId}/companies`)
      if (response.ok) {
        const data = await response.json()
        const assignments: {[key: string]: boolean} = {}
        data.assignments.forEach((assignment: any) => {
          assignments[assignment.companyId] = assignment.isActive
        })
        setCompanyAssignments(assignments)
      }
    } catch (error) {
      console.error("Failed to load company assignments:", error)
    }
  }

  const handleAssign = (option: ServiceOption) => {
    setAssigningOption(option)
    loadCompanyAssignments(option.id)
    setIsAssignDialogOpen(true)
  }

  const handleToggleAssignment = async (companyId: string, isActive: boolean) => {
    if (!assigningOption) return

    try {
      const response = await fetch(`/api/admin/custom-options/${assigningOption.id}/companies/${companyId}`, {
        method: isActive ? "POST" : "DELETE"
      })

      if (response.ok) {
        setCompanyAssignments(prev => ({
          ...prev,
          [companyId]: isActive
        }))
      } else {
        alert("Fehler beim Zuweisen der Service-Option")
      }
    } catch (error) {
      console.error("Error toggling assignment:", error)
      alert("Fehler beim Zuweisen der Service-Option")
    }
  }

  const handleCreate = async () => {
    if (!name || !price) {
      alert("Bitte füllen Sie alle Pflichtfelder aus")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/admin/custom-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          price: parseFloat(price),
          billingCycle
        })
      })

      if (response.ok) {
        await loadServiceOptions()
        resetForm()
        setIsCreateDialogOpen(false)
      } else {
        alert("Fehler beim Erstellen der Service-Option")
      }
    } catch (error) {
      console.error("Error creating service option:", error)
      alert("Fehler beim Erstellen der Service-Option")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (option: ServiceOption) => {
    setEditingOption(option)
    setName(option.name)
    setDescription(option.description || "")
    setPrice(option.price.toString())
    setBillingCycle(option.billingCycle)
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingOption || !name || !price) {
      alert("Bitte füllen Sie alle Pflichtfelder aus")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/custom-options/${editingOption.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          price: parseFloat(price),
          billingCycle
        })
      })

      if (response.ok) {
        await loadServiceOptions()
        resetForm()
        setIsEditDialogOpen(false)
        setEditingOption(null)
      } else {
        alert("Fehler beim Aktualisieren der Service-Option")
      }
    } catch (error) {
      console.error("Error updating service option:", error)
      alert("Fehler beim Aktualisieren der Service-Option")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (optionId: string) => {
    if (!confirm("Möchten Sie diese Service-Option wirklich löschen?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/custom-options/${optionId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        await loadServiceOptions()
      } else {
        alert("Fehler beim Löschen der Service-Option")
      }
    } catch (error) {
      console.error("Error deleting service option:", error)
      alert("Fehler beim Löschen der Service-Option")
    }
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setPrice("")
    setBillingCycle("MONTHLY")
    setEditingOption(null)
  }

  const getBillingCycleLabel = (cycle: string) => {
    return cycle === "MONTHLY" ? "Monatlich" : "Jährlich"
  }

  const getBillingCycleBadge = (cycle: string) => {
    return cycle === "MONTHLY" ? (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <CalendarIcon className="h-3 w-3 mr-1" />
        Monatlich
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CalendarIcon className="h-3 w-3 mr-1" />
        Jährlich
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl">
          <h1 className="text-h1 text-blue-900 flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-blue-600" />
            Service-Optionen verwalten
          </h1>
          <p className="text-blue-700 mt-2">Lade Service-Optionen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl">
        <h1 className="text-h1 text-blue-900 flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-blue-600" />
          Service-Optionen verwalten
        </h1>
        <p className="text-blue-700 mt-2">
          Erstellen und verwalten Sie verfügbare Service-Optionen für Kunden
        </p>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusIcon className="h-4 w-4 mr-2" />
              Neue Service-Option
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Service-Option erstellen</DialogTitle>
              <DialogDescription>
                Erstellen Sie eine neue Service-Option, die Kunden aktivieren können.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Premium Support"
                />
              </div>
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Beschreibung der Service-Option"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Preis *</Label>
                  <div className="relative">
                    <EuroIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="billingCycle">Abrechnungszyklus *</Label>
                  <Select value={billingCycle} onValueChange={(value: "MONTHLY" | "YEARLY") => setBillingCycle(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monatlich</SelectItem>
                      <SelectItem value="YEARLY">Jährlich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Erstelle..." : "Erstellen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Service Options List */}
      <div className="grid gap-4">
        {serviceOptions.length === 0 ? (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Service-Optionen</h3>
              <p className="text-gray-600">Erstellen Sie Ihre erste Service-Option für Kunden.</p>
            </CardContent>
          </Card>
        ) : (
          serviceOptions.map((option) => (
            <Card key={option.id} className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{option.name}</CardTitle>
                    <CardDescription className="mt-1">{option.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    {getBillingCycleBadge(option.billingCycle)}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        €{option.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        pro {option.billingCycle === "MONTHLY" ? "Monat" : "Jahr"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Erstellt: {new Date(option.createdAt).toLocaleDateString("de-DE")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssign(option)}
                    >
                      <SettingsIcon className="h-4 w-4 mr-1" />
                      Kunden zuweisen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(option)}
                    >
                      <EditIcon className="h-4 w-4 mr-1" />
                      Bearbeiten
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(option.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2Icon className="h-4 w-4 mr-1" />
                      Löschen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Service-Option bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Details der Service-Option.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Premium Support"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Beschreibung</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibung der Service-Option"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-price">Preis *</Label>
                <div className="relative">
                  <EuroIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-billingCycle">Abrechnungszyklus *</Label>
                <Select value={billingCycle} onValueChange={(value: "MONTHLY" | "YEARLY") => setBillingCycle(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monatlich</SelectItem>
                    <SelectItem value="YEARLY">Jährlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? "Speichere..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kunden zuweisen</DialogTitle>
            <DialogDescription>
              Wählen Sie aus, welche Kunden diese Service-Option aktiviert haben sollen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {companies.map((company) => (
              <div key={company.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {company.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{company.name}</p>
                    <p className="text-sm text-gray-500">Kunde</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={companyAssignments[company.id] || false}
                      onChange={(e) => handleToggleAssignment(company.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {companyAssignments[company.id] ? "Aktiviert" : "Deaktiviert"}
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
