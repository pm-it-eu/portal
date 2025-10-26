"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  CheckCircle, 
  Calendar,
  SettingsIcon,
  CheckCircleIcon,
  CalendarIcon,
  Info
} from "lucide-react"

interface ServiceOption {
  id: string
  name: string
  description: string
  price: number
  billingCycle: "MONTHLY" | "YEARLY"
  activatedAt: string
  isActive: boolean
}

export default function ServiceOptionsCard() {
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadServiceOptions()
  }, [])

  const loadServiceOptions = async () => {
    try {
      const response = await fetch("/api/customer/service-options")
      if (response.ok) {
        const data = await response.json()
        setServiceOptions(data.options || [])
      }
    } catch (error) {
      console.error("Failed to load service options:", error)
    } finally {
      setLoading(false)
    }
  }

  const getBillingCycleBadge = (cycle: string) => {
    return cycle === "MONTHLY" ? (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <CalendarIcon className="h-3 w-3 mr-1" />
        Monatlich
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CalendarIcon className="h-3 w-3 mr-1" />
        Jährlich
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <SettingsIcon className="h-5 w-5" />
            Service-Optionen
          </CardTitle>
          <CardDescription className="text-gray-600">
            Lade Ihre aktiven Service-Optionen...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (serviceOptions.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <SettingsIcon className="h-5 w-5" />
            Service-Optionen
          </CardTitle>
          <CardDescription className="text-gray-600">
            Ihre aktiven Service-Optionen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 font-medium">Keine aktiven Service-Optionen</p>
            <p className="text-gray-500 text-sm mt-1">
              Kontaktieren Sie mich für zusätzliche Services
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }


  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <SettingsIcon className="h-5 w-5" />
          Service-Optionen
        </CardTitle>
        <CardDescription className="text-gray-600">
          Ihre aktiven Service-Optionen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Service Options List */}
        <div className="space-y-2">
          {serviceOptions.map((option) => (
            <div key={option.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-gray-900">{option.name}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {getBillingCycleBadge(option.billingCycle)}
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      €{option.price.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              {option.description && (
                <p className="text-sm text-gray-600 mt-1">{option.description}</p>
              )}
            </div>
          ))}
        </div>


        {/* Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-gray-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-800 font-medium">Hinweis</p>
              <p className="text-xs text-gray-700 mt-1">
                Service-Optionen werden im Voraus abgerechnet. 
                Kontaktieren Sie mich für Änderungen.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
