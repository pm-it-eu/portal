"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, Plus, Search, Users, Edit, Trash2, Shield, User, CheckCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  companyId: string
}

interface Company {
  id: string
  name: string
  email: string
  phone: string
  address: string
  createdAt: string
  _count?: {
    users: number
  }
}

interface ServiceOption {
  id: string
  name: string
  description: string
  price: number
  billingCycle: "MONTHLY" | "YEARLY"
}

interface CompanyServiceOption {
  id: string
  companyId: string
  customOptionId: string
  customOption: ServiceOption
  activatedAt: string
  deactivatedAt?: string
  isActive: boolean
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  
  // Form states
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [companyUsers, setCompanyUsers] = useState<User[]>([])
  const [serviceOptionsOpen, setServiceOptionsOpen] = useState(false)
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([])
  const [companyServiceOptions, setCompanyServiceOptions] = useState<CompanyServiceOption[]>([])

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const response = await fetch("/api/companies")
        if (response.ok) {
          const data = await response.json()
          setCompanies(data.companies || [])
          setFilteredCompanies(data.companies || [])
        }
      } catch (error) {
        console.error("Failed to load companies:", error)
      } finally {
        setLoading(false)
      }
    }

    const loadServiceOptions = async () => {
      try {
        const response = await fetch("/api/admin/custom-options")
        if (response.ok) {
          const data = await response.json()
          setServiceOptions(data.options || [])
        }
      } catch (error) {
        console.error("Failed to load service options:", error)
      }
    }

    loadCompanies()
    loadServiceOptions()
  }, [])

  // Filter logic
  useEffect(() => {
    let filtered = companies

    if (searchTerm) {
      filtered = filtered.filter(company => 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredCompanies(filtered)
  }, [companies, searchTerm])

  const resetForm = () => {
    setName("")
    setEmail("")
    setPhone("")
    setAddress("")
    setEditingCompany(null)
  }

  const handleCreate = async () => {
    if (!name?.trim() || !email?.trim()) return
    setSubmitting(true)
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone?.trim() || undefined, address: address?.trim() || undefined })
      })
      if (response.ok) {
        const data = await response.json()
        setCompanies(prev => [...prev, data.company])
        setFilteredCompanies(prev => [...prev, data.company])
        setOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Failed to create company:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    setName(company.name)
    setEmail(company.email)
    setPhone(company.phone || "")
    setAddress(company.address || "")
    setOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingCompany || !name?.trim() || !email?.trim()) return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/companies/${editingCompany.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone?.trim() || undefined, address: address?.trim() || undefined })
      })
      if (response.ok) {
        const data = await response.json()
        setCompanies(prev => prev.map(c => c.id === editingCompany.id ? data.company : c))
        setFilteredCompanies(prev => prev.map(c => c.id === editingCompany.id ? data.company : c))
        setOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Failed to update company:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (companyId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie diese Firma löschen möchten?")) return
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "DELETE"
      })
      if (response.ok) {
        setCompanies(prev => prev.filter(c => c.id !== companyId))
        setFilteredCompanies(prev => prev.filter(c => c.id !== companyId))
      }
    } catch (error) {
      console.error("Failed to delete company:", error)
    }
  }

  const handleShowUsers = async (company: Company) => {
    setSelectedCompany(company)
    try {
      const response = await fetch(`/api/companies/${company.id}/users`)
      if (response.ok) {
        const data = await response.json()
        setCompanyUsers(data.users || [])
        setUsersOpen(true)
      }
    } catch (error) {
      console.error("Failed to load company users:", error)
    }
  }

  const handleServiceOptionsClick = async (company: Company) => {
    setSelectedCompany(company)
    setServiceOptionsOpen(true)
    
    try {
      const response = await fetch(`/api/companies/${company.id}/service-options`)
      if (response.ok) {
        const data = await response.json()
        setCompanyServiceOptions(data.serviceOptions || [])
      }
    } catch (error) {
      console.error("Failed to load company service options:", error)
    }
  }

  const handleToggleServiceOption = async (optionId: string, isActive: boolean) => {
    if (!selectedCompany) return

    try {
      const response = await fetch(`/api/companies/${selectedCompany.id}/service-options/toggle`, {
        method: isActive ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ optionId })
      })

      if (response.ok) {
        // Reload service options
        await handleServiceOptionsClick(selectedCompany)
      } else {
        alert("Fehler beim Aktivieren/Deaktivieren der Service-Option")
      }
    } catch (error) {
      console.error("Error toggling service option:", error)
      alert("Fehler beim Aktivieren/Deaktivieren der Service-Option")
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl">
        <h1 className="text-h1 text-blue-900 flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Kundenverwaltung
        </h1>
        <p className="text-blue-700 mt-2">
          Verwalten Sie alle Ihre Kunden und deren Einstellungen
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
            <Dialog open={open} onOpenChange={(open) => {
              setOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Neuen Kunden hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingCompany ? "Kunde bearbeiten" : "Neuen Kunden hinzufügen"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Firmenname *</Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Firmenname eingeben" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="firma@example.com" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input 
                      id="phone" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="+49 123 456789" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Textarea 
                      id="address" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      placeholder="Straße, PLZ Ort" 
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button 
                      onClick={editingCompany ? handleUpdate : handleCreate} 
                      disabled={!name?.trim() || !email?.trim() || submitting}
                    >
                      {submitting ? "Speichern..." : editingCompany ? "Aktualisieren" : "Erstellen"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Kunden durchsuchen..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Kunden gefunden</h3>
          <p className="text-gray-600">Fügen Sie Ihren ersten Kunden hinzu, um loszulegen.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <CardDescription>{company.email}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">Aktiv</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Benutzer:</span>
                    <span className="font-medium">{company._count?.users || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Service-Level:</span>
                    <span className="font-medium">Standard</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Registriert:</span>
                    <span className="font-medium">
                      {company.createdAt ? formatDistanceToNow(new Date(company.createdAt), { addSuffix: true, locale: de }) : 'Unbekannt'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleShowUsers(company)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Benutzer
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleServiceOptionsClick(company)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Optionen
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(company)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Bearbeiten
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(company.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Company Users Dialog */}
      <Dialog open={usersOpen} onOpenChange={setUsersOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Benutzer von {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {companyUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Benutzer gefunden</h3>
                <p className="text-gray-600">Diese Firma hat noch keine Benutzer.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {companyUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        user.role === "ADMIN" ? "bg-red-100" : "bg-blue-100"
                      }`}>
                        {user.role === "ADMIN" ? (
                          <Shield className="h-4 w-4 text-red-600" />
                        ) : (
                          <User className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant={user.role === "ADMIN" ? "destructive" : "outline"}>
                      {user.role === "ADMIN" ? "Admin" : "Kunde"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Options Dialog */}
      <Dialog open={serviceOptionsOpen} onOpenChange={setServiceOptionsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Service-Optionen für {selectedCompany?.name}
            </DialogTitle>
            <DialogDescription>
              Aktivieren oder deaktivieren Sie Service-Optionen für diesen Kunden.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {serviceOptions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Service-Optionen verfügbar</h3>
                <p className="text-gray-600">Erstellen Sie zuerst Service-Optionen im Admin-Bereich.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {serviceOptions.map((option) => {
                  const isActive = companyServiceOptions.some(
                    companyOption => companyOption.customOptionId === option.id && companyOption.isActive
                  )
                  
                  return (
                    <div key={option.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{option.name}</h4>
                          <p className="text-sm text-gray-600">{option.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-blue-600">
                              €{option.price.toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500">
                              pro {option.billingCycle === "MONTHLY" ? "Monat" : "Jahr"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => handleToggleServiceOption(option.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {isActive ? "Aktiviert" : "Deaktiviert"}
                          </span>
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
