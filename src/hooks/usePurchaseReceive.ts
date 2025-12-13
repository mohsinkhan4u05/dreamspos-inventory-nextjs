import { useCallback, useEffect, useState } from 'react'
import { purchaseReceiveService } from '@/services/api'
import type { PurchaseReceive } from './usePurchaseReceives'

interface PurchaseReceiveResponse {
  data?: PurchaseReceive
}

export function usePurchaseReceive(id: string | undefined) {
  const [receive, setReceive] = useState<PurchaseReceive | null>(null)
  const [loading, setLoading] = useState<boolean>(!!id)
  const [error, setError] = useState<string | null>(null)

  const fetchReceive = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const res = (await purchaseReceiveService.getPurchaseReceive(id)) as
        | PurchaseReceiveResponse
        | PurchaseReceive

      const parsed: PurchaseReceive | null = (res as PurchaseReceiveResponse).data
        ? (res as PurchaseReceiveResponse).data!
        : (res as PurchaseReceive)

      setReceive(parsed)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch purchase receive',
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchReceive()
  }, [fetchReceive])

  return { receive, loading, error, refetch: fetchReceive }
}
