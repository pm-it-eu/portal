'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Calculator, CheckCircle, AlertCircle } from 'lucide-react'

interface ServiceLevel {
  id: string
  name: string
  timeVolumeMinutes: number
  remainingMinutes: number
  hourlyRate: number
}

interface WorkEntryFormProps {
  ticketId: string
  companyId: string
  onWorkEntryCreated: () => void
}

export default function WorkEntryForm({ ticketId, companyId, onWorkEntryCreated }: WorkEntryFormProps) {
  const [minutes, setMinutes] = useState('')
  const [description, setDescription] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [isFromIncludedVolume, setIsFromIncludedVolume] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load service level data
  useEffect(() => {
    const loadServiceLevel = async () => {
      try {
        const response = await fetch(`/api/service-levels/by-company/${companyId}`)
        if (response.ok) {
          const data = await response.json()
          setServiceLevel(data.serviceLevel)
          // Stundensatz immer auf 80€ setzen
          setHourlyRate('80')
        }
      } catch (error) {
        console.error('Error loading service level:', error)
      }
    }

    loadServiceLevel()
  }, [companyId])

  // Calculate rounded minutes and amount
  const inputMinutes = parseInt(minutes) || 0
  const roundedMinutes = Math.ceil(inputMinutes / 15) * 15
  const totalAmount = isFromIncludedVolume ? 0 : (roundedMinutes / 60) * parseFloat(hourlyRate || '0')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!minutes || !description) return

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/tickets/${ticketId}/work-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minutes: parseInt(minutes),
          description,
          hourlyRate: parseFloat(hourlyRate),
          isFromIncludedVolume
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        // Alle Felder leeren
        setMinutes('')
        setDescription('')
        setHourlyRate('80') // Stundensatz auf 80€ zurücksetzen
        setIsFromIncludedVolume(true) // Zurück zu Inklusiv-Volumen
        setError('')
        
        // Volumen aktualisieren
        onWorkEntryCreated()
        
        // Service Level neu laden um aktualisiertes Volumen zu zeigen
        const serviceResponse = await fetch(`/api/service-levels/${companyId}`)
        if (serviceResponse.ok) {
          const serviceData = await serviceResponse.json()
          setServiceLevel(serviceData.serviceLevel)
        }
      } else {
        setError(data.error || 'Fehler beim Erstellen des Arbeitsaufwands')
      }
    } catch (error) {
      setError('Fehler beim Erstellen des Arbeitsaufwands')
    } finally {
      setIsLoading(false)
    }
  }

  const canUseIncludedVolume = serviceLevel && serviceLevel.remainingMinutes >= roundedMinutes

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Arbeitsaufwand erfassen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minutes">Minuten</Label>
              <Input
                id="minutes"
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="z.B. 47"
                required
              />
            </div>
            <div>
              <Label htmlFor="hourlyRate">Stundensatz (€/h)</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="80.00"
                required
                className="bg-gray-50"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Fester Stundensatz: 80€/h</p>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Was wurde gemacht?"
              required
            />
          </div>

          {/* Live calculation display */}
          {minutes && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Berechnung:</div>
              <div className="space-y-1">
                <div>Eingabe: {inputMinutes} Min → Abgerechnet: {roundedMinutes} Min</div>
                {!isFromIncludedVolume && (
                  <div className="font-medium">
                    {roundedMinutes} Min × {hourlyRate}€/h = {totalAmount.toFixed(2)}€
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Billing type selection */}
          <div>
            <Label className="text-base font-medium">Abrechnungsart</Label>
            <RadioGroup
              value={isFromIncludedVolume ? 'included' : 'billing'}
              onValueChange={(value) => setIsFromIncludedVolume(value === 'included')}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="included" 
                  id="included"
                  disabled={!canUseIncludedVolume}
                />
                <Label 
                  htmlFor="included" 
                  className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    isFromIncludedVolume 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  } ${!canUseIncludedVolume ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-medium">Inklusiv-Volumen nutzen</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Verfügbar: {serviceLevel?.remainingMinutes || 0} Minuten
                    {!canUseIncludedVolume && roundedMinutes > 0 && (
                      <span className="text-red-600 ml-2">
                        (Nicht genug Volumen verfügbar)
                      </span>
                    )}
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="billing" id="billing" />
                <Label 
                  htmlFor="billing" 
                  className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    !isFromIncludedVolume 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="font-medium">Normal abrechnen</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {roundedMinutes} Min × {hourlyRate}€/h = {totalAmount.toFixed(2)}€
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Error/Success messages */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              {success}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isLoading || !minutes || !description}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Erfasse...
              </>
            ) : (
              'Aufwand erfassen'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
