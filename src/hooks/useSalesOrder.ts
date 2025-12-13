import { useCallback, useEffect, useState } from 'react'
import { salesOrderService } from '@/services/api'
import type { SalesOrder } from './useSalesOrders'

interface SalesOrderResponse {
  data: SalesOrder
}

export function useSalesOrder(id: string | undefined) {
  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState<boolean>(!!id)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const res = (await salesOrderService.getSalesOrder(id)) as SalesOrderResponse

      // Support both `{ data: SalesOrder }` and bare SalesOrder shapes
      const parsed: SalesOrder | null = (res as any).data
        ? (res as any).data
        : (res as any)

      setOrder(parsed)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch sales order',
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  return { order, loading, error, refetch: fetchOrder }
}
