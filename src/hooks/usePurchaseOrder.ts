import { useCallback, useEffect, useState } from 'react'
import { purchaseOrderService } from '@/services/api'
import type { PurchaseOrder } from './usePurchaseOrders'

interface PurchaseOrderResponse {
  data: PurchaseOrder
}

export function usePurchaseOrder(id: string | undefined) {
  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState<boolean>(!!id)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const res = (await purchaseOrderService.getPurchaseOrder(id)) as PurchaseOrderResponse

      const parsed: PurchaseOrder | null = (res as any).data
        ? (res as any).data
        : (res as any)

      setOrder(parsed)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch purchase order',
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
