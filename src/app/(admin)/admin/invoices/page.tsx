"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Plus, Search, FileTextIcon, PlusIcon, SearchIcon, Edit, Trash2, Eye, Calendar, Euro, Building, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

interface InvoiceData {
  id: string
  invoiceNumber: string
  amount: number
  status: string
  dueDate: string
  createdAt: string
  company: {
    id: string
    name: string
  }
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [companies, setCompanies] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [companyFilter, setCompanyFilter] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<InvoiceData | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [invoicesRes, companiesRes] = await Promise.all([
          fetch("/api/invoices"),
          fetch("/api/companies")
        ])
        
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json()
          setInvoices(invoicesData.invoices || [])
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

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchTerm === "" || 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.amount.toString().includes(searchTerm)
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    const matchesCompany = companyFilter === "all" || invoice.company?.id === companyFilter
    
    return matchesSearch && matchesStatus && matchesCompany
  })

  // Calculate statistics
  const stats = {
    totalInvoices: invoices.length,
    openInvoices: invoices.filter(inv => inv.status === "OPEN").length,
    paidInvoices: invoices.filter(inv => inv.status === "PAID").length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    openAmount: invoices.filter(inv => inv.status === "OPEN").reduce((sum, inv) => sum + inv.amount, 0),
    paidAmount: invoices.filter(inv => inv.status === "PAID").reduce((sum, inv) => sum + inv.amount, 0)
  }
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl">
        <h1 className="text-h1 text-blue-900 flex items-center gap-2">
          <FileTextIcon className="h-8 w-8 text-blue-600" />
          Rechnungsverwaltung
        </h1>
        <p className="text-blue-700 mt-2">
          Verwalten Sie alle Rechnungen und deren Status
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gesamt Rechnungen</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalInvoices}</p>
              </div>
              <FileTextIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Offene Rechnungen</p>
                <p className="text-2xl font-bold text-red-600">{stats.openInvoices}</p>
                <p className="text-xs text-gray-500">€{stats.openAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
              </div>
              <Calendar className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bezahlte Rechnungen</p>
                <p className="text-2xl font-bold text-green-600">{stats.paidInvoices}</p>
                <p className="text-xs text-gray-500">€{stats.paidAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gesamtumsatz</p>
                <p className="text-2xl font-bold text-purple-600">€{stats.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
              </div>
              <Euro className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Search */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusIcon className="h-5 w-5 text-blue-600" />
            Schnellaktionen & Suche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center flex-wrap">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Neue Rechnung
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Neue Rechnung erstellen</DialogTitle>
                  <DialogDescription>
                    Erstellen Sie eine neue Rechnung für einen Kunden
                  </DialogDescription>
                </DialogHeader>
                <CreateInvoiceForm 
                  companies={companies}
                  onClose={() => setShowCreateDialog(false)}
                  onSuccess={() => {
                    setShowCreateDialog(false)
                    // Reload invoices
                    window.location.reload()
                  }}
                />
              </DialogContent>
            </Dialog>
            
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Rechnungen durchsuchen..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="OPEN">Offen</SelectItem>
                <SelectItem value="PAID">Bezahlt</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Firma filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Firmen</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Alle Rechnungen</CardTitle>
          <CardDescription>
            Übersicht über alle erstellten Rechnungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
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
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Rechnungen gefunden</h3>
              <p className="text-gray-600">Erstellen Sie Ihre erste Rechnung, um loszulegen.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      invoice.status === "OPEN" ? "bg-red-100" : "bg-emerald-100"
                    }`}>
                      <FileText className={`h-5 w-5 ${
                        invoice.status === "OPEN" ? "text-red-600" : "text-emerald-600"
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{invoice.invoiceNumber}</h3>
                      <p className="text-sm text-gray-600">
                        {invoice.company?.name || 'Unbekannte Firma'} • €{invoice.amount.toLocaleString()} • 
                        {invoice.status === "OPEN" ? ` Fällig: ${new Date(invoice.dueDate).toLocaleDateString("de-DE")}` : 
                         ` Bezahlt am ${new Date(invoice.createdAt).toLocaleDateString("de-DE")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={invoice.status === "OPEN" ? "destructive" : "outline"}>
                      {invoice.status === "OPEN" ? "Offen" : "Bezahlt"}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        const newStatus = invoice.status === "OPEN" ? "PAID" : "OPEN"
                        try {
                          const response = await fetch(`/api/invoices/${invoice.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: newStatus })
                          })
                          if (response.ok) {
                            // Reload page to update the list
                            window.location.reload()
                          }
                        } catch (error) {
                          console.error('Error updating status:', error)
                        }
                      }}
                    >
                      {invoice.status === "OPEN" ? "Als bezahlt markieren" : "Als offen markieren"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (confirm(`Möchten Sie die Rechnung "${invoice.invoiceNumber}" wirklich löschen?`)) {
                          try {
                            const response = await fetch(`/api/invoices/${invoice.id}`, {
                              method: 'DELETE'
                            })
                            if (response.ok) {
                              // Reload page to update the list
                              window.location.reload()
                            } else {
                              alert('Fehler beim Löschen der Rechnung')
                            }
                          } catch (error) {
                            console.error('Error deleting invoice:', error)
                            alert('Fehler beim Löschen der Rechnung')
                          }
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Löschen
                    </Button>
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

// Create Invoice Form Component
function CreateInvoiceForm({ 
  companies, 
  onClose, 
  onSuccess 
}: { 
  companies: {id: string, name: string}[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    companyId: '',
    amount: '',
    status: 'OPEN',
    pdfFile: null as File | null
  })
  const [saving, setSaving] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, pdfFile: file }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.pdfFile) return
    
    setSaving(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('companyId', formData.companyId)
      formDataToSend.append('amount', formData.amount)
      formDataToSend.append('status', formData.status)
      formDataToSend.append('pdfFile', formData.pdfFile)

      const response = await fetch('/api/invoices', {
        method: 'POST',
        body: formDataToSend
      })

      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        console.error('Failed to create invoice:', errorData)
        alert(`Fehler beim Erstellen der Rechnung: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
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
        <Label htmlFor="amount">Betrag (€)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
          placeholder="0.00"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Status auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Offen</SelectItem>
            <SelectItem value="PAID">Bezahlt</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="pdfFile">PDF-Datei</Label>
        <Input
          id="pdfFile"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          required
        />
        {formData.pdfFile && (
          <p className="text-sm text-gray-600 mt-1">
            Ausgewählte Datei: {formData.pdfFile.name}
          </p>
        )}
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={saving || !formData.pdfFile}>
          {saving ? 'Wird hochgeladen...' : 'Rechnung hochladen'}
        </Button>
      </div>
    </form>
  )
}
