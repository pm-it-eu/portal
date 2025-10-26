'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Calculator, Euro, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

interface WorkEntry {
  id: string
  minutes: number
  roundedMinutes: number
  description: string
  hourlyRate: number
  totalAmount: number
  createdAt: string
  ticket: {
    id: string
    ticketNumber: number
    title: string
  }
}

interface CustomOption {
  id: string
  customOption: {
    name: string
    price: number
    billingCycle: "MONTHLY" | "YEARLY"
  }
}

interface BillingData {
  workEntries: WorkEntry[]
  customOptions: CustomOption[]
  totals: {
    workMinutes: number
    workAmount: number
    customOptionsAmount: number
    grandTotal: number
  }
  period: {
    startDate: string
    endDate: string
  }
}

interface Company {
  id: string
  name: string
}

export default function BillingHelperPage() {
  const searchParams = useSearchParams()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedWorkEntries, setSelectedWorkEntries] = useState<string[]>([])
  const [selectedCustomOptions, setSelectedCustomOptions] = useState<string[]>([])
  const [isMarkingBilled, setIsMarkingBilled] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')

  // Load companies and set initial values from URL params
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const response = await fetch('/api/companies')
        if (response.ok) {
          const data = await response.json()
          setCompanies(data.companies)
          
          // Set initial values from URL parameters
          const companyParam = searchParams.get('company')
          const monthParam = searchParams.get('month')
          const yearParam = searchParams.get('year')
          
          if (companyParam) {
            setSelectedCompany(companyParam)
          } else if (data.companies.length > 0) {
            setSelectedCompany(data.companies[0].id)
          }
          
          if (monthParam) {
            setSelectedMonth(parseInt(monthParam))
          }
          if (yearParam) {
            setSelectedYear(parseInt(yearParam))
          }
        }
      } catch (error) {
        console.error('Error loading companies:', error)
      }
    }

    loadCompanies()
  }, [searchParams])

  // Load billing data when filters change
  useEffect(() => {
    if (selectedCompany) {
      loadBillingData()
    }
  }, [selectedCompany, selectedMonth, selectedYear])

  const loadBillingData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/billing?companyId=${selectedCompany}&month=${selectedMonth}&year=${selectedYear}`
      )
      if (response.ok) {
        const data = await response.json()
        setBillingData(data)
        setSelectedWorkEntries([])
        setSelectedCustomOptions([])
      }
    } catch (error) {
      console.error('Error loading billing data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWorkEntryToggle = (entryId: string) => {
    setSelectedWorkEntries(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    )
  }

  const handleCustomOptionToggle = (optionId: string) => {
    setSelectedCustomOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    )
  }

  const handleSelectAllWorkEntries = () => {
    if (billingData) {
      if (selectedWorkEntries.length === billingData.workEntries.length) {
        setSelectedWorkEntries([])
      } else {
        setSelectedWorkEntries(billingData.workEntries.map(entry => entry.id))
      }
    }
  }

  const handleSelectAllCustomOptions = () => {
    if (billingData) {
      if (selectedCustomOptions.length === billingData.customOptions.length) {
        setSelectedCustomOptions([])
      } else {
        setSelectedCustomOptions(billingData.customOptions.map(option => option.id))
      }
    }
  }

  const handleMarkAsBilled = async () => {
    if (selectedWorkEntries.length === 0 && selectedCustomOptions.length === 0) {
      setModalMessage('Bitte wählen Sie mindestens einen Eintrag aus.')
      setShowErrorModal(true)
      return
    }

    setIsMarkingBilled(true)
    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workEntryIds: selectedWorkEntries,
          customOptionIds: selectedCustomOptions
        })
      })

      if (response.ok) {
        const data = await response.json()
        setModalMessage(`${data.billedCount} Positionen wurden als abgerechnet markiert.`)
        setShowSuccessModal(true)
        loadBillingData() // Reload data
      }
    } catch (error) {
      console.error('Error marking as billed:', error)
      setModalMessage('Fehler beim Markieren als abgerechnet.')
      setShowErrorModal(true)
    } finally {
      setIsMarkingBilled(false)
    }
  }

  const getSelectedAmount = () => {
    if (!billingData) return 0

    const selectedWorkAmount = billingData.workEntries
      .filter(entry => selectedWorkEntries.includes(entry.id))
      .reduce((sum, entry) => sum + entry.totalAmount, 0)

    const selectedCustomOptionsAmount = billingData.customOptions
      .filter(option => selectedCustomOptions.includes(option.id))
      .reduce((sum, option) => sum + option.customOption.price, 0)

    return selectedWorkAmount + selectedCustomOptionsAmount
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Abrechnungshelfer</h1>
        <p className="text-gray-600">
          Übersicht über abrechenbare Positionen für den gewählten Zeitraum
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="company">Firma</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
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
              <Label htmlFor="month">Monat</Label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2024, month - 1).toLocaleDateString('de-DE', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year">Jahr</Label>
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                min="2020"
                max="2030"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      ) : billingData ? (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Zusammenfassung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{billingData.totals.workMinutes}</div>
                  <div className="text-sm text-gray-600">Arbeitsminuten</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{billingData.totals.workAmount.toFixed(2)}€</div>
                  <div className="text-sm text-gray-600">Arbeitszeit</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{billingData.totals.customOptionsAmount.toFixed(2)}€</div>
                  <div className="text-sm text-gray-600">Zusatzoptionen</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{billingData.totals.grandTotal.toFixed(2)}€</div>
                  <div className="text-sm text-gray-600">Gesamtsumme</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Entries */}
          {billingData.workEntries.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Abrechenbare Arbeitszeiten</CardTitle>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedWorkEntries.length === billingData.workEntries.length}
                      onCheckedChange={handleSelectAllWorkEntries}
                    />
                    <Label>Alle auswählen</Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Auswählen</TableHead>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Zeit</TableHead>
                      <TableHead>Stundensatz</TableHead>
                      <TableHead>Betrag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingData.workEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedWorkEntries.includes(entry.id)}
                            onCheckedChange={() => handleWorkEntryToggle(entry.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">#{entry.ticket.ticketNumber}</div>
                            <div className="text-sm text-gray-600">{entry.ticket.title}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(entry.createdAt).toLocaleString("de-DE")}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {entry.roundedMinutes} Min
                          </div>
                        </TableCell>
                        <TableCell>{entry.hourlyRate ? entry.hourlyRate.toFixed(2) + '€/h' : '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Euro className="h-4 w-4 text-gray-400" />
                            {entry.totalAmount ? entry.totalAmount.toFixed(2) + '€' : '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Custom Options */}
          {billingData.customOptions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Zusatzoptionen</CardTitle>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedCustomOptions.length === billingData.customOptions.length}
                      onCheckedChange={handleSelectAllCustomOptions}
                    />
                    <Label>Alle auswählen</Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Auswählen</TableHead>
                      <TableHead>Option</TableHead>
                      <TableHead>Monatspreis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingData.customOptions.map((option) => (
                      <TableRow key={option.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCustomOptions.includes(option.id)}
                            onCheckedChange={() => handleCustomOptionToggle(option.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{option.customOption.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Euro className="h-4 w-4 text-gray-400" />
                            {option.customOption.price.toFixed(2)}€
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Mark as Billed */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Ausgewählte Positionen</h3>
                  <p className="text-sm text-gray-600">
                    {selectedWorkEntries.length + selectedCustomOptions.length} Positionen ausgewählt
                  </p>
                  <p className="text-lg font-bold text-purple-600">
                    Gesamtbetrag: {getSelectedAmount().toFixed(2)}€
                  </p>
                </div>
                <Button 
                  onClick={handleMarkAsBilled}
                  disabled={isMarkingBilled || (selectedWorkEntries.length === 0 && selectedCustomOptions.length === 0)}
                  className="flex items-center gap-2"
                >
                  {isMarkingBilled ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Als abgerechnet markieren
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Keine abrechenbaren Positionen für den gewählten Zeitraum gefunden.</p>
          </CardContent>
        </Card>
      )}

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Erfolgreich abgerechnet
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">{modalMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowSuccessModal(false)} className="bg-green-600 hover:bg-green-700">
              Verstanden
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Fehler
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">{modalMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowErrorModal(false)} className="bg-red-600 hover:bg-red-700">
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
