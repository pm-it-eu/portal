'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Loader2, Settings, CheckCircle, XCircle } from 'lucide-react'

interface ServiceOption {
  id: string
  name: string
  description: string
  price: number
  isActive: boolean
  isEnabled: boolean
  category: string
}

export default function ServiceOptionsPage() {
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    loadServiceOptions()
  }, [])

  const loadServiceOptions = async () => {
    try {
      const response = await fetch('/api/customer/service-options')
      if (response.ok) {
        const data = await response.json()
        setServiceOptions(data)
      }
    } catch (error) {
      console.error('Failed to load service options:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleServiceOption = async (optionId: string, enabled: boolean) => {
    setSaving(optionId)
    try {
      const response = await fetch(`/api/customer/service-options/${optionId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })

      if (response.ok) {
        setServiceOptions(prev => 
          prev.map(option => 
            option.id === optionId 
              ? { ...option, isEnabled: enabled }
              : option
          )
        )
      }
    } catch (error) {
      console.error('Failed to toggle service option:', error)
    } finally {
      setSaving(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'SUPPORT': 'bg-blue-100 text-blue-800',
      'MAINTENANCE': 'bg-green-100 text-green-800',
      'CONSULTING': 'bg-purple-100 text-purple-800',
      'TRAINING': 'bg-orange-100 text-orange-800',
      'OTHER': 'bg-gray-100 text-gray-800'
    }
    return colors[category as keyof typeof colors] || colors.OTHER
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      'SUPPORT': 'Support',
      'MAINTENANCE': 'Wartung',
      'CONSULTING': 'Beratung',
      'TRAINING': 'Schulung',
      'OTHER': 'Sonstiges'
    }
    return labels[category as keyof typeof labels] || category
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">Service-Optionen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre aktiven Service-Optionen
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {serviceOptions.map((option) => (
          <Card key={option.id} className={`transition-all duration-200 ${option.isEnabled ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{option.name}</CardTitle>
                  <Badge className={getCategoryColor(option.category)}>
                    {getCategoryLabel(option.category)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {option.isEnabled ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
              <CardDescription>
                {option.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(option.price)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {option.isEnabled ? 'Aktiv' : 'Inaktiv'}
                    </span>
                    <Switch
                      checked={option.isEnabled}
                      onCheckedChange={(checked) => toggleServiceOption(option.id, checked)}
                      disabled={!option.isActive || saving === option.id}
                    />
                  </div>
                </div>
                
                {saving === option.id && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Speichere...
                  </div>
                )}

                {!option.isActive && (
                  <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    Diese Option ist derzeit nicht verfügbar
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {serviceOptions.length === 0 && (
        <div className="text-center py-12">
          <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Keine Service-Optionen verfügbar</h3>
          <p className="text-muted-foreground">
            Kontaktieren Sie Ihren Administrator, um Service-Optionen zu aktivieren.
          </p>
        </div>
      )}
    </div>
  )
}




