"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Euro, AlertTriangle } from "lucide-react"

interface UnbilledWorkData {
  totalUnbilledAmount: number
  totalWorkMinutes: number
  totalWorkAmount: number
  lastWorkEntry?: {
    id: string
    description: string
    minutes: number
    amount: number
    createdAt: string
    ticket: {
      title: string
      ticketNumber: number
    }
  }
}

export function UnbilledWorkCard() {
  const [data, setData] = useState<UnbilledWorkData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUnbilledWork = async () => {
      try {
        const response = await fetch('/api/customer/unbilled-work')
        if (response.ok) {
          const result = await response.json()
          setData(result.data)
        }
      } catch (error) {
        console.error('Failed to load unbilled work:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUnbilledWork()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Unabgerechneter Aufwand
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Unabgerechneter Aufwand
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Keine Daten verfügbar</p>
        </CardContent>
      </Card>
    )
  }


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-small font-medium">Unabgerechneter Aufwand</CardTitle>
        <Euro className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-h2">{loading ? "..." : `€${(data?.totalUnbilledAmount || 0).toFixed(2)}`}</div>
        <p className="text-xs text-muted-foreground">
          Unabgerechnet
        </p>
        {(data?.totalUnbilledAmount || 0) > 500 && (
          <div className="mt-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <span className="text-xs text-amber-600">Abrechnung ausstehend</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
