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
import { Eye, Edit, Trash2, Plus, Mail, FileText, AlertTriangle, CheckCircle, Clock, Euro, User, Ticket, Send, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const templateIcons: { [key: string]: any } = {
  'welcome': User,
  'ticket-created': Ticket,
  'ticket-updated': Ticket,
  'invoice-created': Euro,
  'invoice-paid': CheckCircle,
  'sla-warning': AlertTriangle
}

const templateDescriptions: { [key: string]: string } = {
  'welcome': 'Willkommens-E-Mail für neue Benutzer',
  'ticket-created': 'Benachrichtigung bei neuem Ticket',
  'ticket-updated': 'Benachrichtigung bei Ticket-Update',
  'invoice-created': 'Rechnung erstellt Benachrichtigung',
  'invoice-paid': 'Rechnung bezahlt Bestätigung',
  'sla-warning': 'SLA-Volumen Warnung'
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    textContent: '',
    isActive: true
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/email-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Fehler beim Laden der Templates')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject,
      textContent: template.textContent,
      isActive: template.isActive
    })
    setEditOpen(true)
  }

  const handleCreate = () => {
    setSelectedTemplate(null)
    setFormData({
      name: '',
      subject: '',
      textContent: '',
      isActive: true
    })
    setCreateOpen(true)
  }

  const handleSave = async () => {
    try {
      const url = selectedTemplate 
        ? `/api/admin/email-templates/${selectedTemplate.id}`
        : '/api/admin/email-templates'
      
      const method = selectedTemplate ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(selectedTemplate ? 'Template aktualisiert' : 'Template erstellt')
        setEditOpen(false)
        setCreateOpen(false)
        loadTemplates()
      } else {
        toast.error('Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Fehler beim Speichern')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Template wirklich löschen?')) return

    try {
      const response = await fetch(`/api/admin/email-templates/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Template gelöscht')
        loadTemplates()
      } else {
        toast.error('Fehler beim Löschen')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Fehler beim Löschen')
    }
  }

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setPreviewOpen(true)
  }

  const handleTestEmail = async (template: EmailTemplate) => {
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'info@pm-it.eu', // Admin E-Mail
          templateName: template.name,
          variables: {
            firstName: 'Admin',
            email: 'info@pm-it.eu',
            loginUrl: 'http://localhost:3001/admin'
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        toast.error(`Server-Fehler: ${response.status}`)
        return
      }

      const data = await response.json()
      
      if (data.success) {
        toast.success('Test-E-Mail erfolgreich gesendet!')
      } else {
        toast.error(`Fehler: ${data.error}`)
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      toast.error('Fehler beim Senden der Test-E-Mail')
    }
  }

  const getTemplateIcon = (name: string) => {
    const iconKey = name.split('-')[0] || name
    return templateIcons[iconKey] || FileText
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Lade Templates...</p>
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
            E-Mail Templates
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie E-Mail-Templates für automatische Benachrichtigungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={async () => {
              try {
                const response = await fetch('/api/debug-env')
                const data = await response.json()
                console.log('Alle ENV Variablen:', data.allEnvVars)
                console.log('E-Mail Variablen:', data.emailVars)
                toast.success('Alle ENV Variablen in Console angezeigt')
              } catch (error) {
                toast.error('Fehler beim Laden der ENV Variablen')
              }
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            ENV Debug
          </Button>
          <Button 
            onClick={async () => {
              try {
                const response = await fetch('/api/debug-email-config')
                const data = await response.json()
                console.log('E-Mail Konfiguration:', data.config)
                toast.success('Konfiguration in Console angezeigt')
              } catch (error) {
                toast.error('Fehler beim Laden der Konfiguration')
              }
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Config Debug
          </Button>
          <Button 
            onClick={async () => {
              try {
                const response = await fetch('/api/test-email-simple', { method: 'POST' })
                const data = await response.json()
                if (data.success) {
                  toast.success('Test-E-Mail gesendet!')
                } else {
                  toast.error(`Fehler: ${data.error}`)
                }
              } catch (error) {
                toast.error('Fehler beim Testen')
              }
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            E-Mail Test
          </Button>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Neues Template
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const IconComponent = getTemplateIcon(template.name)
          return (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {templateDescriptions[template.name] || 'E-Mail Template'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Betreff</Label>
                  <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>Erstellt: {new Date(template.createdAt).toLocaleDateString('de-DE')}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(template)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Vorschau
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestEmail(template)}
                    className="flex-1 text-blue-600 hover:text-blue-700"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Test senden
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {templates.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Templates vorhanden</h3>
            <p className="text-gray-600 mb-4">Erstellen Sie Ihr erstes E-Mail-Template</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Template erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Vorschau: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-2">Text E-Mail Vorschau:</h4>
              <pre className="whitespace-pre-wrap text-sm font-mono">{selectedTemplate?.textContent || ''}</pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              {selectedTemplate ? 'Template bearbeiten' : 'Neues Template erstellen'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. welcome"
                />
              </div>
              <div>
                <Label htmlFor="subject">Betreff</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="E-Mail Betreff"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="textContent">Text E-Mail Inhalt</Label>
              <Textarea
                id="textContent"
                value={formData.textContent}
                onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                placeholder="Text E-Mail Inhalt mit ASCII-Art Formatierung"
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-sm text-gray-500 mt-1">
                Verwenden Sie ASCII-Art mit = Linien für Formatierung und Emojis für bessere Lesbarkeit
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Template aktiv</Label>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setEditOpen(false)
                setCreateOpen(false)
              }}>
                Abbrechen
              </Button>
              <Button onClick={handleSave}>
                {selectedTemplate ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
