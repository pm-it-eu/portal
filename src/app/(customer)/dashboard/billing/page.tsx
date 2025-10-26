'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Clock, Euro, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { de } from 'date-fns/locale'

interface ServiceLevel {
  id: string
  name: string
  timeVolumeMinutes: number
  remainingMinutes: number
  hourlyRate: number
  renewalType: string
  nextRenewalAt: string
  startDate: string
}

interface WorkEntry {
  id: string
  minutes: number
  roundedMinutes: number
  description: string
  isFromIncludedVolume: boolean
  isBilled: boolean
  hourlyRate?: number
  totalAmount?: number
  createdAt: string
  ticket: {
    id: string
    ticketNumber: number
    title: string
  }
}

interface BillingData {
  serviceLevel: ServiceLevel | null
  workEntries: WorkEntry[]
  totalIncludedMinutes: number
  totalBillableMinutes: number
  totalBillableAmount: number
  totalBilledAmount: number
}

export default function CustomerBillingPage() {
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      const response = await fetch('/api/customer/billing')
      if (response.ok) {
        const data = await response.json()
        setBillingData(data)
      }
    } catch (error) {
      console.error('Error loading billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Lade Abrechnungsdaten...</div>
      </div>
    )
  }

  if (!billingData?.serviceLevel) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Kein Service Level konfiguriert</h3>
            <p className="text-gray-500">
              Sie haben aktuell kein Vertragspaket aktiviert. Die Abrechnung erfolgt zum normalen Stundensatz.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { serviceLevel, workEntries, totalIncludedMinutes, totalBillableMinutes, totalBillableAmount, totalBilledAmount } = billingData

  const usedPercentage = ((serviceLevel.timeVolumeMinutes - serviceLevel.remainingMinutes) / serviceLevel.timeVolumeMinutes) * 100
  const isLowVolume = usedPercentage > 90 && serviceLevel.remainingMinutes > 0
  const isWarningVolume = usedPercentage > 70 && usedPercentage <= 90
  const isVolumeDepleted = serviceLevel.remainingMinutes <= 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abrechnungsübersicht</h1>
        <p className="text-gray-600">Ihr Service Level und die Abrechnungsdetails</p>
      </div>

      {/* Service Level Overview */}
      <Card className={`${(isLowVolume || isVolumeDepleted) ? 'bg-red-50 border-red-200' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${(isLowVolume || isVolumeDepleted) ? 'text-red-900' : 'text-green-900'}`}>
            <Clock className="h-6 w-6" />
            {serviceLevel.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className={`bg-white rounded-lg p-4 border ${(isLowVolume || isVolumeDepleted) ? 'border-red-200' : 'border-green-200'} shadow-sm`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Inklusiv-Volumen</span>
              <span className={`text-sm font-semibold ${(isLowVolume || isVolumeDepleted) ? 'text-red-800' : 'text-green-800'}`}>
                {serviceLevel.remainingMinutes} von {serviceLevel.timeVolumeMinutes} Min verfügbar
              </span>
            </div>
            <Progress 
              value={usedPercentage} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Verbraucht: {serviceLevel.timeVolumeMinutes - serviceLevel.remainingMinutes} Min</span>
              <span>Verfügbar: {serviceLevel.remainingMinutes} Min</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`bg-white rounded-lg p-4 border ${(isLowVolume || isVolumeDepleted) ? 'border-red-200' : 'border-green-200'} shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`h-4 w-4 ${(isLowVolume || isVolumeDepleted) ? 'text-red-600' : 'text-green-600'}`} />
                <span className="text-sm font-medium text-gray-700">Verwendet</span>
              </div>
              <div className={`text-lg font-semibold ${(isLowVolume || isVolumeDepleted) ? 'text-red-800' : 'text-green-800'}`}>
                {serviceLevel.timeVolumeMinutes - serviceLevel.remainingMinutes} Min
              </div>
            </div>

            <div className={`bg-white rounded-lg p-4 border ${(isLowVolume || isVolumeDepleted) ? 'border-red-200' : 'border-green-200'} shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className={`h-4 w-4 ${(isLowVolume || isVolumeDepleted) ? 'text-red-600' : 'text-blue-600'}`} />
                <span className="text-sm font-medium text-gray-700">Verfügbar</span>
              </div>
              <div className={`text-lg font-semibold ${(isLowVolume || isVolumeDepleted) ? 'text-red-800' : 'text-blue-800'}`}>
                {serviceLevel.remainingMinutes} Min
              </div>
            </div>

            <div className={`bg-white rounded-lg p-4 border ${(isLowVolume || isVolumeDepleted) ? 'border-red-200' : 'border-green-200'} shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">
                <Euro className={`h-4 w-4 ${(isLowVolume || isVolumeDepleted) ? 'text-red-600' : 'text-amber-600'}`} />
                <span className="text-sm font-medium text-gray-700">Stundensatz</span>
              </div>
              <div className={`text-lg font-semibold ${(isLowVolume || isVolumeDepleted) ? 'text-red-800' : 'text-amber-800'}`}>
                {serviceLevel.hourlyRate}€/h
              </div>
            </div>
          </div>

          {/* Renewal Info */}
          <div className={`bg-white rounded-lg p-4 border ${(isLowVolume || isVolumeDepleted) ? 'border-red-200' : 'border-green-200'} shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className={`h-4 w-4 ${(isLowVolume || isVolumeDepleted) ? 'text-red-600' : 'text-green-600'}`} />
              <span className="text-sm font-medium text-gray-700">Nächste Erneuerung</span>
            </div>
            <div className={`text-sm ${(isLowVolume || isVolumeDepleted) ? 'text-red-800' : 'text-green-800'}`}>
              {new Date(serviceLevel.nextRenewalAt).toLocaleDateString('de-DE')} 
              <span className="text-gray-600 ml-2">
                ({formatDistanceToNow(new Date(serviceLevel.nextRenewalAt), { addSuffix: true, locale: de })})
              </span>
            </div>
          </div>

          {/* Warning Banners */}
          {isVolumeDepleted && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <TrendingDown className="h-4 w-4" />
                <span className="font-medium">Volumen aufgebraucht!</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                Ab sofort wird jede weitere Leistung zum normalen Stundensatz (80€/h) abgerechnet, 
                bis sich das SLA erneuert.
              </p>
            </div>
          )}

          {isLowVolume && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <TrendingDown className="h-4 w-4" />
                <span className="font-medium">Achtung: Ihr Inklusiv-Volumen ist fast aufgebraucht!</span>
              </div>
            </div>
          )}

          {isWarningVolume && !isLowVolume && (
            <div className="bg-orange-100 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-700">
                <TrendingDown className="h-4 w-4" />
                <span className="font-medium">Ihr Inklusiv-Volumen wird langsam weniger</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Entries Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Inklusiv-Volumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 mb-2">
              {totalIncludedMinutes} Min
            </div>
            <p className="text-sm text-gray-600">
              Aus dem Inklusiv-Volumen verbraucht
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-blue-600" />
              Abrechenbare Zeit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {totalBillableMinutes} Min
            </div>
            <p className="text-sm text-gray-600">
              {totalBillableAmount.toFixed(2)}€ Gesamtbetrag
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Work Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Arbeitsaufwände</CardTitle>
        </CardHeader>
        <CardContent>
          {workEntries.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              Noch keine Arbeitsaufwände erfasst
            </div>
          ) : (
            <div className="space-y-3">
              {workEntries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">
                        Ticket #{entry.ticket.ticketNumber}
                      </Badge>
                      {entry.isFromIncludedVolume ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          🟢 Inklusiv
                        </Badge>
                      ) : entry.isBilled ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          🔵 Abgerechnet
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          🟠 Abrechenbar
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      {entry.description}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(entry.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {entry.roundedMinutes} Min
                    </div>
                    {entry.totalAmount && (
                      <div className="text-sm text-blue-600">
                        {entry.totalAmount.toFixed(2)}€
                      </div>
                    )}
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
