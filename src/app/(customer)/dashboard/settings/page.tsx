"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Bell, 
  Shield, 
  Mail, 
  Phone, 
  Building, 
  Key, 
  AlertTriangle,
  CheckCircle,
  Settings as SettingsIcon,
  UserCircle,
  BellRing,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  MailIcon,
  PhoneIcon
} from 'lucide-react'

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: {
    id: string
    name: string
  }
}

interface NotificationSettings {
  emailNotifications: boolean
  ticketUpdates: boolean
  billingAlerts: boolean
  serviceLevelWarnings: boolean
}

export default function CustomerSettingsPage() {
  const { data: session } = useSession()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    ticketUpdates: true,
    billingAlerts: true,
    serviceLevelWarnings: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    loadUserData()
    loadNotificationSettings()
  }, [])

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/users/me')
      if (response.ok) {
        const data = await response.json()
        setUserData(data.user)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const loadNotificationSettings = async () => {
    try {
      const response = await fetch('/api/users/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotificationSettings(data.notificationSettings)
      }
    } catch (error) {
      console.error('Error loading notification settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: userData?.firstName,
          lastName: userData?.lastName,
          phone: userData?.phone
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profil erfolgreich aktualisiert!' })
      } else {
        setMessage({ type: 'error', text: 'Fehler beim Aktualisieren des Profils.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ein unerwarteter Fehler ist aufgetreten.' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/users/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Benachrichtigungseinstellungen gespeichert!' })
      } else {
        setMessage({ type: 'error', text: 'Fehler beim Speichern der Einstellungen.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ein unerwarteter Fehler ist aufgetreten.' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Neue Passwörter stimmen nicht überein.' })
      setSaving(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Neues Passwort muss mindestens 6 Zeichen lang sein.' })
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Passwort erfolgreich geändert!' })
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setShowPasswordForm(false)
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Fehler beim Ändern des Passworts.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ein unerwarteter Fehler ist aufgetreten.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Lade Einstellungen...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl">
        <h1 className="text-h1 text-blue-900 flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Einstellungen
        </h1>
        <p className="text-blue-700 mt-2">
          Verwalten Sie Ihr Profil und Ihre Benachrichtigungseinstellungen.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profil-Einstellungen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-blue-600" />
              Profil-Einstellungen
            </CardTitle>
            <CardDescription>
              Ihre persönlichen Informationen und Kontaktdaten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Vorname</Label>
                  <Input
                    id="firstName"
                    value={userData?.firstName || ''}
                    onChange={(e) => setUserData(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nachname</Label>
                  <Input
                    id="lastName"
                    value={userData?.lastName || ''}
                    onChange={(e) => setUserData(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  value={userData?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  E-Mail-Adresse kann nicht geändert werden. Kontaktieren Sie den Support.
                </p>
              </div>

              <div>
                <Label htmlFor="phone">Telefonnummer (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={userData?.phone || ''}
                  onChange={(e) => setUserData(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  placeholder="+49 123 456789"
                />
              </div>

              <div>
                <Label>Zugewiesene Firma</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{userData?.company?.name || 'Keine Firma zugewiesen'}</span>
                </div>
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Wird gespeichert...' : 'Profil speichern'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Benachrichtigungseinstellungen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-green-600" />
              Benachrichtigungen
            </CardTitle>
            <CardDescription>
              Konfigurieren Sie, wann und wie Sie benachrichtigt werden möchten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">E-Mail-Benachrichtigungen</Label>
                  <p className="text-sm text-gray-500">Alle Benachrichtigungen per E-Mail erhalten</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ticketUpdates">Ticket-Updates</Label>
                  <p className="text-sm text-gray-500">Benachrichtigungen bei neuen Nachrichten in Tickets</p>
                </div>
                <Switch
                  id="ticketUpdates"
                  checked={notificationSettings.ticketUpdates}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, ticketUpdates: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="billingAlerts">Abrechnungs-Benachrichtigungen</Label>
                  <p className="text-sm text-gray-500">Warnungen bei neuen Rechnungen oder Zahlungserinnerungen</p>
                </div>
                <Switch
                  id="billingAlerts"
                  checked={notificationSettings.billingAlerts}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, billingAlerts: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="serviceLevelWarnings">Service-Level Warnungen</Label>
                  <p className="text-sm text-gray-500">Warnungen bei niedrigem Inklusiv-Volumen</p>
                </div>
                <Switch
                  id="serviceLevelWarnings"
                  checked={notificationSettings.serviceLevelWarnings}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, serviceLevelWarnings: checked }))
                  }
                />
              </div>
            </div>

            <Button onClick={handleSaveNotifications} disabled={saving} className="w-full">
              {saving ? 'Wird gespeichert...' : 'Benachrichtigungen speichern'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sicherheit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-red-600" />
            Sicherheit
          </CardTitle>
          <CardDescription>
            Verwalten Sie Ihre Kontosicherheit und Passwort.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordForm ? (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Passwort ändern</p>
                  <p className="text-sm text-blue-700">Ändern Sie Ihr Passwort sicher</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPasswordForm(true)}
              >
                Passwort ändern
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-4">Passwort ändern</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">Neues Passwort</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} size="sm">
                    {saving ? 'Wird gespeichert...' : 'Passwort ändern'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowPasswordForm(false)
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    }}
                  >
                    Abbrechen
                  </Button>
                </div>
                
                {/* Passwort-Änderungs-Meldungen direkt hier anzeigen */}
                {message && (
                  <div className={`mt-3 p-3 rounded-md text-sm ${
                    message.type === 'success' 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message.text}
                  </div>
                )}
              </form>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-800">Zwei-Faktor-Authentifizierung</p>
                <p className="text-sm text-gray-700">2FA ist derzeit nicht verfügbar</p>
              </div>
            </div>
            <Badge variant="outline" className="text-gray-700 border-gray-300">
              Nicht verfügbar
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailIcon className="h-5 w-5 text-purple-600" />
            Support & Hilfe
          </CardTitle>
          <CardDescription>
            Kontaktieren Sie mich bei Fragen oder Problemen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <MailIcon className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium">E-Mail Support</h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">Schreiben Sie mir eine E-Mail</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.open('mailto:info@pm-it.eu', '_blank')}
              >
                info@pm-it.eu
              </Button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <PhoneIcon className="h-5 w-5 text-green-600" />
                <h3 className="font-medium">Telefon Support</h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">Rufen Sie mich direkt an</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.open('tel:+4915161630434', '_blank')}
              >
                +49 151 61 63 04 34
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
