'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Eye, Edit, Trash2, Plus, Mail, Settings, Play, Pause, Clock, Server, User, Lock, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface EmailConfig {
  id: string
  name: string
  emailAddress: string
  imapHost: string
  imapPort: number
  imapSecure: boolean
  imapUser: string
  imapPassword: string
  smtpHost?: string
  smtpPort?: number
  smtpSecure: boolean
  smtpUser?: string
  smtpPassword?: string
  isActive: boolean
  pollingInterval: number
  lastPolledAt?: string
  createdAt: string
  updatedAt: string
}

export default function EmailConfigsPage() {
  const [configs, setConfigs] = useState<EmailConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConfig, setSelectedConfig] = useState<EmailConfig | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    emailAddress: '',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    imapUser: '',
    imapPassword: '',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: '',
    smtpPassword: '',
    isActive: true,
    pollingInterval: 5
  })

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/email-configs')
      if (response.ok) {
        const data = await response.json()
        setConfigs(data.configs || [])
      }
    } catch (error) {
      console.error('Error loading configs:', error)
      toast.error('Fehler beim Laden der Konfigurationen')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (config: EmailConfig) => {
    setSelectedConfig(config)
    setFormData({
      name: config.name,
      emailAddress: config.emailAddress,
      imapHost: config.imapHost,
      imapPort: config.imapPort,
      imapSecure: config.imapSecure,
      imapUser: config.imapUser,
      imapPassword: config.imapPassword,
      smtpHost: config.smtpHost || '',
      smtpPort: config.smtpPort || 587,
      smtpSecure: config.smtpSecure,
      smtpUser: config.smtpUser || '',
      smtpPassword: config.smtpPassword || '',
      isActive: config.isActive,
      pollingInterval: config.pollingInterval
    })
    setEditOpen(true)
  }

  const handleCreate = () => {
    setSelectedConfig(null)
    setFormData({
      name: '',
      emailAddress: '',
      imapHost: '',
      imapPort: 993,
      imapSecure: true,
      imapUser: '',
      imapPassword: '',
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: true,
      smtpUser: '',
      smtpPassword: '',
      isActive: true,
      pollingInterval: 5
    })
    setCreateOpen(true)
  }

  const handleSave = async () => {
    try {
      const url = selectedConfig 
        ? `/api/admin/email-configs/${selectedConfig.id}`
        : '/api/admin/email-configs'
      
      const method = selectedConfig ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(selectedConfig ? 'Konfiguration aktualisiert' : 'Konfiguration erstellt')
        setEditOpen(false)
        setCreateOpen(false)
        loadConfigs()
      } else {
        toast.error('Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Fehler beim Speichern')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Konfiguration wirklich löschen?')) return

    try {
      const response = await fetch(`/api/admin/email-configs/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Konfiguration gelöscht')
        loadConfigs()
      } else {
        toast.error('Fehler beim Löschen')
      }
    } catch (error) {
      console.error('Error deleting config:', error)
      toast.error('Fehler beim Löschen')
    }
  }

  const handlePoll = async () => {
    try {
      const response = await fetch('/api/email/poll', {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('E-Mail-Polling gestartet')
      } else {
        toast.error('Fehler beim Polling')
      }
    } catch (error) {
      console.error('Error starting poll:', error)
      toast.error('Fehler beim Polling')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Lade Konfigurationen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Mail className="h-8 w-8" />
            E-Mail-Konfigurationen
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie E-Mail-Inbound-Konfigurationen für automatische Ticket-Erstellung
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handlePoll}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Manueller Poll
          </Button>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Neue Konfiguration
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {configs.map((config) => (
          <Card key={config.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {config.emailAddress}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={config.isActive ? "default" : "secondary"}>
                  {config.isActive ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs font-medium text-gray-500">IMAP Host</Label>
                  <p className="text-sm">{config.imapHost}:{config.imapPort}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500">Polling</Label>
                  <p className="text-sm">{config.pollingInterval} Min</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>
                  {config.lastPolledAt 
                    ? `Letzter Poll: ${new Date(config.lastPolledAt).toLocaleString('de-DE')}`
                    : 'Noch nie gepollt'
                  }
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(config)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Bearbeiten
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(config.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {configs.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Konfigurationen vorhanden</h3>
            <p className="text-gray-600 mb-4">Erstellen Sie Ihre erste E-Mail-Konfiguration</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Konfiguration erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen || createOpen} onOpenChange={(open) => {
        if (!open) {
          setEditOpen(false)
          setCreateOpen(false)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedConfig ? 'E-Mail-Konfiguration bearbeiten' : 'Neue E-Mail-Konfiguration erstellen'}
            </DialogTitle>
            <DialogDescription>
              Konfigurieren Sie IMAP/SMTP-Einstellungen für automatische E-Mail-Verarbeitung
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Grundlegende Einstellungen */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Grundlegende Einstellungen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. Support E-Mail"
                  />
                </div>
                <div>
                  <Label htmlFor="emailAddress">E-Mail-Adresse</Label>
                  <Input
                    id="emailAddress"
                    value={formData.emailAddress}
                    onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                    placeholder="support@pm-it.eu"
                  />
                </div>
              </div>
            </div>

            {/* IMAP-Einstellungen */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">IMAP-Einstellungen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="imapHost">IMAP Host</Label>
                  <Input
                    id="imapHost"
                    value={formData.imapHost}
                    onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                    placeholder="imap.gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="imapPort">IMAP Port</Label>
                  <Input
                    id="imapPort"
                    type="number"
                    value={formData.imapPort}
                    onChange={(e) => setFormData({ ...formData, imapPort: parseInt(e.target.value) })}
                    placeholder="993"
                  />
                </div>
                <div>
                  <Label htmlFor="imapUser">IMAP Benutzer</Label>
                  <Input
                    id="imapUser"
                    value={formData.imapUser}
                    onChange={(e) => setFormData({ ...formData, imapUser: e.target.value })}
                    placeholder="support@pm-it.eu"
                  />
                </div>
                <div>
                  <Label htmlFor="imapPassword">IMAP Passwort</Label>
                  <Input
                    id="imapPassword"
                    type="password"
                    value={formData.imapPassword}
                    onChange={(e) => setFormData({ ...formData, imapPassword: e.target.value })}
                    placeholder="App-Passwort"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="imapSecure"
                  checked={formData.imapSecure}
                  onCheckedChange={(checked) => setFormData({ ...formData, imapSecure: checked })}
                />
                <Label htmlFor="imapSecure">SSL/TLS verwenden</Label>
              </div>
            </div>

            {/* SMTP-Einstellungen (optional) */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">SMTP-Einstellungen (optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={formData.smtpHost}
                    onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={formData.smtpPort}
                    onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                    placeholder="587"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpUser">SMTP Benutzer</Label>
                  <Input
                    id="smtpUser"
                    value={formData.smtpUser}
                    onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                    placeholder="support@pm-it.eu"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPassword">SMTP Passwort</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={formData.smtpPassword}
                    onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                    placeholder="App-Passwort"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="smtpSecure"
                  checked={formData.smtpSecure}
                  onCheckedChange={(checked) => setFormData({ ...formData, smtpSecure: checked })}
                />
                <Label htmlFor="smtpSecure">SSL/TLS verwenden</Label>
              </div>
            </div>

            {/* Polling-Einstellungen */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Polling-Einstellungen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pollingInterval">Polling-Intervall (Minuten)</Label>
                  <Input
                    id="pollingInterval"
                    type="number"
                    value={formData.pollingInterval}
                    onChange={(e) => setFormData({ ...formData, pollingInterval: parseInt(e.target.value) })}
                    placeholder="5"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Konfiguration aktiv</Label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setEditOpen(false)
                setCreateOpen(false)
              }}>
                Abbrechen
              </Button>
              <Button onClick={handleSave}>
                {selectedConfig ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}




