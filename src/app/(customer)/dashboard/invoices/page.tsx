"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Download, Search, Euro, FileTextIcon, DownloadIcon, SearchIcon, EuroIcon, Calendar, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

interface InvoiceData {
  id: string
  invoiceNumber: string
  amount: number
  status: string
  dueDate: string
  createdAt: string
}

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const response = await fetch("/api/invoices")
        if (response.ok) {
          const data = await response.json()
          setInvoices(data.invoices || [])
        }
      } catch (error) {
        console.error("Failed to load invoices:", error)
      } finally {
        setLoading(false)
      }
    }
    loadInvoices()
  }, [])

  // Filter invoices based on search and filters
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchTerm === "" || 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.amount.toString().includes(searchTerm)
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    const matchesYear = yearFilter === "all" || 
      new Date(invoice.createdAt).getFullYear().toString() === yearFilter
    
    return matchesSearch && matchesStatus && matchesYear
  })

  // Calculate statistics
  const stats = {
    openAmount: invoices.filter(inv => inv.status === "OPEN").reduce((sum, inv) => sum + inv.amount, 0),
    paidAmount: invoices.filter(inv => inv.status === "PAID").reduce((sum, inv) => sum + inv.amount, 0),
    totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    openCount: invoices.filter(inv => inv.status === "OPEN").length,
    paidCount: invoices.filter(inv => inv.status === "PAID").length
  }
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-6 rounded-xl">
        <h1 className="text-h1 text-emerald-900 flex items-center gap-2">
          <FileTextIcon className="h-8 w-8 text-emerald-600" />
          Meine Rechnungen
        </h1>
        <p className="text-emerald-700 mt-2">
          Hier finden Sie alle Ihre Rechnungen zum Download
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5 text-blue-600" />
            Rechnungen durchsuchen & filtern
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Rechnungsnummer oder Betrag suchen..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alle Status</option>
                <option value="OPEN">Offen</option>
                <option value="PAID">Bezahlt</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Jahr</label>
              <select 
                value={yearFilter} 
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alle Jahre</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Invoices */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Meine Rechnungen</CardTitle>
          <CardDescription>
            Alle Ihre Rechnungen im Überblick
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
                        <div className="h-3 bg-gray-200 rounded w-40"></div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Rechnungen gefunden</h3>
              <p className="text-gray-600">Sie haben noch keine Rechnungen erhalten.</p>
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
                        €{invoice.amount.toLocaleString()} • 
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
                      onClick={() => {
                        // Download PDF file
                        window.open(`/api/invoices/${invoice.id}/download`, '_blank')
                      }}
                    >
                      <DownloadIcon className="h-4 w-4 mr-1" />
                      PDF herunterladen
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
