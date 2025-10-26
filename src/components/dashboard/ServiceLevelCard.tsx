'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, Calendar, RefreshCw, Euro } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

interface ServiceLevel {
  id: string
  name: string
  timeVolumeMinutes: number
  remainingMinutes: number
  hourlyRate: number
  renewalType: 'MONTHLY' | 'YEARLY'
  lastRenewedAt: string
  nextRenewalAt: string
}

interface ServiceLevelCardProps {
  companyId: string
}

export default function ServiceLevelCard({ companyId }: ServiceLevelCardProps) {
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadServiceLevel = async () => {
      try {
        const response = await fetch(`/api/service-levels/by-company/${companyId}`)
        if (response.ok) {
          const data = await response.json()
          setServiceLevel(data.serviceLevel)
        }
      } catch (error) {
        console.error('Error loading service level:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadServiceLevel()
  }, [companyId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vertragsoptionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!serviceLevel) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Clock className="h-6 w-6" />
            Vertragsoptionen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Kein Service Level konfiguriert</h3>
            <p className="text-gray-600 text-sm">
              Sie haben aktuell kein Vertragspaket aktiviert. Die Abrechnung erfolgt zum normalen Stundensatz.
            </p>
          </div>
          
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Euro className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Abrechnung</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-gray-700">
                      <span className="font-semibold text-blue-600">80€/h</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-gray-700">
                      <span className="font-semibold">15-Min-Takt</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-gray-700">
                      Jede angefangene 15-Min-Einheit wird vollständig berechnet
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-800 font-medium mb-1">Hinweis</p>
                <p className="text-xs text-amber-700">
                  Bei Fragen zu Vertragspaketen oder für eine individuelle Beratung kontaktieren Sie mich gerne.
                </p>
              </div>
            </div>
          </div>
        </div>
        </CardContent>
      </Card>
    )
  }

  const percentage = (serviceLevel.remainingMinutes / serviceLevel.timeVolumeMinutes) * 100
  const isLowVolume = percentage < 10 && percentage > 0
  const isWarningVolume = percentage < 50 && percentage >= 10
  const isVolumeDepleted = serviceLevel.remainingMinutes <= 0

  const getProgressColor = () => {
    if (isLowVolume || isVolumeDepleted) return 'bg-red-500'
    if (isWarningVolume) return 'bg-orange-500'
    return 'bg-green-500'
  }

  const getStatusBadge = () => {
    if (isLowVolume || isVolumeDepleted) {
      return <Badge variant="destructive" className="bg-red-100 text-red-700">Kritisch</Badge>
    }
    if (isWarningVolume) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-700">Warnung</Badge>
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-700">Normal</Badge>
  }

  const formatRenewalType = (type: string) => {
    return type === 'MONTHLY' ? 'monatlich' : 'jährlich'
  }

  return (
    <Card className={`${(isLowVolume || isVolumeDepleted) ? 'border-red-200 bg-red-50' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${(isLowVolume || isVolumeDepleted) ? 'text-red-900' : 'text-green-900'}`}>
            <Clock className="h-6 w-6" />
            {serviceLevel.name}
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className={`bg-white rounded-lg p-4 border ${(isLowVolume || isVolumeDepleted) ? 'border-red-200' : 'border-green-200'} shadow-sm`}>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Verfügbares Volumen</span>
              <span className={`text-sm font-semibold ${(isLowVolume || isVolumeDepleted) ? 'text-red-600' : 'text-green-600'}`}>
                {serviceLevel.remainingMinutes} von {serviceLevel.timeVolumeMinutes} Min
              </span>
            </div>
            <Progress 
              value={percentage} 
              className="h-3 bg-gray-200"
            />
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">0 Min</span>
              <span className="font-medium text-gray-700">{percentage.toFixed(1)}% verfügbar</span>
              <span className="text-gray-500">{serviceLevel.timeVolumeMinutes} Min</span>
            </div>
          </div>
        </div>

        {/* Volume Depleted Warning */}
        {isVolumeDepleted && (
          <div className="relative bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="absolute top-2 right-2">
              <AlertTriangle className="h-5 w-5 text-red-500 opacity-60" />
            </div>
            <div className="pr-8">
              <h4 className="font-semibold text-red-800 mb-2">Volumen aufgebraucht!</h4>
              <p className="text-sm text-red-700">
                Ab sofort wird jede weitere Leistung zum normalen Stundensatz (80€/h) abgerechnet, 
                bis sich das SLA erneuert.
              </p>
            </div>
          </div>
        )}

        {/* Renewal Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`bg-white rounded-lg p-4 border ${(isLowVolume || isVolumeDepleted) ? 'border-red-200' : 'border-green-200'} shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${(isLowVolume || isVolumeDepleted) ? 'bg-red-100' : 'bg-green-100'} rounded-lg flex items-center justify-center`}>
                <Calendar className={`h-4 w-4 ${(isLowVolume || isVolumeDepleted) ? 'text-red-600' : 'text-green-600'}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Nächste Erneuerung</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatRenewalType(serviceLevel.renewalType)} am{' '}
                  {new Date(serviceLevel.nextRenewalAt).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-lg p-4 border ${(isLowVolume || isVolumeDepleted) ? 'border-red-200' : 'border-green-200'} shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${(isLowVolume || isVolumeDepleted) ? 'bg-red-100' : 'bg-green-100'} rounded-lg flex items-center justify-center`}>
                <RefreshCw className={`h-4 w-4 ${(isLowVolume || isVolumeDepleted) ? 'text-red-600' : 'text-green-600'}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Zuletzt erneuert</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatDistanceToNow(new Date(serviceLevel.lastRenewedAt), { 
                    addSuffix: true, 
                    locale: de 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hourly Rate */}
        <div className={`bg-white rounded-lg p-4 border ${(isLowVolume || isVolumeDepleted) ? 'border-red-200' : 'border-green-200'} shadow-sm`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 ${(isLowVolume || isVolumeDepleted) ? 'bg-red-100' : 'bg-green-100'} rounded-lg flex items-center justify-center`}>
              <Euro className={`h-4 w-4 ${(isLowVolume || isVolumeDepleted) ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">
                Stundensatz für Überschreitungen: <span className={`font-semibold ${(isLowVolume || isVolumeDepleted) ? 'text-red-600' : 'text-green-600'}`}>{serviceLevel.hourlyRate.toFixed(2)}€/h</span>
              </p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-800 mb-1">Abrechnungsinformationen</p>
                <p className="text-xs text-blue-700">
                  Alle Arbeiten werden im 15-Minuten-Takt abgerechnet. 
                  Jede angefangene 15-Minuten-Einheit wird vollständig berechnet.
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* Warning Banner */}
        {isLowVolume && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Achtung: Ihr Inklusiv-Volumen ist fast aufgebraucht!</span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              Kontaktieren Sie mich, um Ihr Volumen zu erweitern oder für zusätzliche Unterstützung.
            </p>
          </div>
        )}

        {isWarningVolume && (
          <div className="mt-4 p-3 bg-orange-100 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Ihr Inklusiv-Volumen wird langsam weniger</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              Sie haben noch {serviceLevel.remainingMinutes} Minuten verfügbar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
