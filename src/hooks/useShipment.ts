import { useCallback, useEffect, useState } from 'react'
import { shipmentService } from '@/services/api'

interface ShipmentResponse<T = any> {
  data?: T
}

export function useShipment<T = any>(id: string | undefined) {
  const [shipment, setShipment] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(!!id)
  const [error, setError] = useState<string | null>(null)

  const fetchShipment = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const res = (await shipmentService.getShipment(id)) as ShipmentResponse<T> | T
      const parsed: T | null = (res as ShipmentResponse<T>).data
        ? (res as ShipmentResponse<T>).data!
        : (res as T)

      setShipment(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shipment')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchShipment()
  }, [fetchShipment])

  return { shipment, loading, error, refetch: fetchShipment }
}
