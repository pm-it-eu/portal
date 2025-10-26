"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Plus, Search, Mail, Shield, User, Edit, Trash2, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  company?: {
    id: string
    name: string
  } | null
  createdAt: string
}

interface Company {
  id: string
  name: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [companyFilter, setCompanyFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  
  // Form states
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"ADMIN" | "CLIENT">("CLIENT")
  const [companyId, setCompanyId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, companiesRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/companies")
        ])
        
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData.users || [])
          setFilteredUsers(usersData.users || [])
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
  }, [])

  // Filter logic
  useEffect(() => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    if (companyFilter) {
      filtered = filtered.filter(user => user.company.id === companyFilter)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, roleFilter, companyFilter])

  const resetForm = () => {
    setFirstName("")
    setLastName("")
    setEmail("")
    setPassword("")
    setRole("CLIENT")
    setCompanyId("")
    setEditingUser(null)
  }

  const handleCreate = async () => {
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password?.trim() || !companyId) return
    setSubmitting(true)
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          firstName: firstName.trim(), 
          lastName: lastName.trim(), 
          email: email.trim(), 
          password: password.trim(),
          role,
          companyId
        })
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(prev => [...prev, data.user])
        setFilteredUsers(prev => [...prev, data.user])
        setOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Failed to create user:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (user: UserData) => {
    setEditingUser(user)
    setFirstName(user.firstName)
    setLastName(user.lastName)
    setEmail(user.email)
    setPassword("") // Don't pre-fill password
    setRole(user.role as "ADMIN" | "CLIENT")
    setCompanyId(user.company?.id || "")
    setOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingUser || !firstName?.trim() || !lastName?.trim() || !email?.trim()) return
    setSubmitting(true)
    try {
      const updateData: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role,
        companyId: companyId || null
      }
      
      // Only include password if it's provided
      if (password?.trim()) {
        updateData.password = password.trim()
      }

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(prev => prev.map(u => u.id === editingUser.id ? data.user : u))
        setFilteredUsers(prev => prev.map(u => u.id === editingUser.id ? data.user : u))
        setOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Failed to update user:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?")) return
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE"
      })
      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId))
        setFilteredUsers(prev => prev.filter(u => u.id !== userId))
      }
    } catch (error) {
      console.error("Failed to delete user:", error)
    }
  }
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl">
        <h1 className="text-h1 text-blue-900 flex items-center gap-2">
          <Users className="h-8 w-8" />
          Benutzerverwaltung
        </h1>
        <p className="text-blue-700 mt-2">
          Verwalten Sie alle Benutzer und deren Berechtigungen
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
                  Neuen Benutzer erstellen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? "Benutzer bearbeiten" : "Neuen Benutzer erstellen"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Vorname *</Label>
                      <Input 
                        id="firstName" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        placeholder="Vorname" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nachname *</Label>
                      <Input 
                        id="lastName" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        placeholder="Nachname" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="benutzer@example.com" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Passwort {editingUser ? "(leer lassen zum Beibehalten)" : "*"}
                    </Label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder={editingUser ? "Neues Passwort (optional)" : "Passwort"} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Rolle *</Label>
                      <Select value={role} onValueChange={(value: "ADMIN" | "CLIENT") => setRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CLIENT">Kunde</SelectItem>
                          <SelectItem value="ADMIN">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Firma *</Label>
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
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button 
                      onClick={editingUser ? handleUpdate : handleCreate} 
                      disabled={!firstName?.trim() || !lastName?.trim() || !email?.trim() || (!editingUser && !password?.trim()) || submitting}
                    >
                      {submitting ? "Speichern..." : editingUser ? "Aktualisieren" : "Erstellen"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Benutzer durchsuchen..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select 
                className="border rounded-md h-9 px-3 text-sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">Alle Rollen</option>
                <option value="ADMIN">Administrator</option>
                <option value="CLIENT">Kunde</option>
              </select>
              <select 
                className="border rounded-md h-9 px-3 text-sm"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="">Alle Firmen</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Alle Benutzer</CardTitle>
          <CardDescription>
            Übersicht über alle registrierten Benutzer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-48"></div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-12"></div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Benutzer gefunden</h3>
              <p className="text-gray-600">Fügen Sie Ihren ersten Benutzer hinzu, um loszulegen.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      user.role === "ADMIN" ? "bg-red-100" : "bg-blue-100"
                    }`}>
                      {user.role === "ADMIN" ? (
                        <Shield className="h-5 w-5 text-red-600" />
                      ) : (
                        <User className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {user.email} • {user.company?.name || 'Keine Firma'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={user.role === "ADMIN" ? "destructive" : "outline"}>
                      {user.role === "ADMIN" ? "Admin" : "Kunde"}
                    </Badge>
                    <Badge variant="outline">Aktiv</Badge>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Bearbeiten
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
