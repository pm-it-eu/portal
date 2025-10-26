'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Edit, Trash2, Clock, Euro, CheckCircle, AlertCircle } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { de } from 'date-fns/locale'

interface WorkEntry {
  id: string
  minutes: number
  roundedMinutes: number
  description: string
  hourlyRate: number | null
  totalAmount: number | null
  isFromIncludedVolume: boolean
  isBilled: boolean
  billedAt: string | null
  createdAt: string
}

interface WorkEntryTableProps {
  ticketId: string
  companyId: string
  onWorkEntryUpdated: () => void
}

export default function WorkEntryTable({ ticketId, companyId, onWorkEntryUpdated }: WorkEntryTableProps) {
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    minutes: '',
    description: '',
    hourlyRate: '',
    isFromIncludedVolume: true
  })

  // Load work entries
  const loadWorkEntries = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/work-entries`)
      if (response.ok) {
        const data = await response.json()
        setWorkEntries(data.workEntries)
      }
    } catch (error) {
      console.error('Error loading work entries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkEntries()
  }, [ticketId])

  // Calculate totals
  const includedMinutes = workEntries
    .filter(entry => entry.isFromIncludedVolume)
    .reduce((sum, entry) => sum + entry.roundedMinutes, 0)

  const billableMinutes = workEntries
    .filter(entry => !entry.isFromIncludedVolume && !entry.isBilled)
    .reduce((sum, entry) => sum + entry.roundedMinutes, 0)

  const billableAmount = workEntries
    .filter(entry => !entry.isFromIncludedVolume && !entry.isBilled)
    .reduce((sum, entry) => sum + (entry.totalAmount || 0), 0)

  const billedMinutes = workEntries
    .filter(entry => entry.isBilled)
    .reduce((sum, entry) => sum + entry.roundedMinutes, 0)

  const billedAmount = workEntries
    .filter(entry => entry.isBilled)
    .reduce((sum, entry) => sum + (entry.totalAmount || 0), 0)

  const handleEdit = (entry: WorkEntry) => {
    setEditingEntry(entry)
    setEditForm({
      minutes: entry.minutes.toString(),
      description: entry.description,
      hourlyRate: entry.hourlyRate?.toString() || '',
      isFromIncludedVolume: entry.isFromIncludedVolume
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingEntry) return

    try {
      const response = await fetch(`/api/tickets/${ticketId}/work-entries/${editingEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minutes: parseInt(editForm.minutes),
          description: editForm.description,
          hourlyRate: parseFloat(editForm.hourlyRate),
          isFromIncludedVolume: editForm.isFromIncludedVolume
        })
      })

      if (response.ok) {
        setIsEditDialogOpen(false)
        setEditingEntry(null)
        loadWorkEntries()
        onWorkEntryUpdated()
      }
    } catch (error) {
      console.error('Error updating work entry:', error)
    }
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm('Möchten Sie diesen Arbeitsaufwand wirklich löschen?')) return

    try {
      const response = await fetch(`/api/tickets/${ticketId}/work-entries/${entryId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadWorkEntries()
        onWorkEntryUpdated()
      }
    } catch (error) {
      console.error('Error deleting work entry:', error)
    }
  }

  const getStatusBadge = (entry: WorkEntry) => {
    if (entry.isBilled) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Abgerechnet</Badge>
    } else if (entry.isFromIncludedVolume) {
      return <Badge variant="secondary" className="bg-green-100 text-green-700">Inklusiv</Badge>
    } else {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-700">Abrechenbar</Badge>
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Arbeitsaufwände</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Arbeitsaufwände an diesem Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          {workEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Noch keine Arbeitsaufwände erfasst
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Zeit</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Betrag</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {format(new Date(entry.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(entry.createdAt).toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {entry.roundedMinutes} Min
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {entry.description}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(entry)}
                      </TableCell>
                      <TableCell>
                        {entry.totalAmount ? (
                          <div className="flex items-center gap-1">
                            <Euro className="h-4 w-4 text-gray-400" />
                            {entry.totalAmount.toFixed(2)}€
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                            disabled={entry.isBilled}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                            disabled={entry.isBilled}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Zusammenfassung</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Inklusiv: {includedMinutes} Min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span>Abrechenbar: {billableMinutes} Min = {billableAmount.toFixed(2)}€</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Abgerechnet: {billedMinutes} Min = {billedAmount.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Arbeitsaufwand bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-minutes">Minuten</Label>
                <Input
                  id="edit-minutes"
                  type="number"
                  value={editForm.minutes}
                  onChange={(e) => setEditForm({ ...editForm, minutes: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-hourlyRate">Stundensatz (€/h)</Label>
                <Input
                  id="edit-hourlyRate"
                  type="number"
                  step="0.01"
                  value={editForm.hourlyRate}
                  onChange={(e) => setEditForm({ ...editForm, hourlyRate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Beschreibung</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-base font-medium">Abrechnungsart</Label>
              <RadioGroup
                value={editForm.isFromIncludedVolume ? 'included' : 'billing'}
                onValueChange={(value) => setEditForm({ 
                  ...editForm, 
                  isFromIncludedVolume: value === 'included' 
                })}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="included" id="edit-included" />
                  <Label htmlFor="edit-included">Inklusiv-Volumen</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="billing" id="edit-billing" />
                  <Label htmlFor="edit-billing">Normal abrechnen</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleUpdate}>
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
