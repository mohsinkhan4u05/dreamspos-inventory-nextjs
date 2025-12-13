import { useState, useEffect, useCallback } from 'react'
import { salesService } from '@/services/api'
import type { Sale } from './useSales'

interface SaleResponse {
  data: Sale
}

export function useSaleDetail(id: string | undefined) {
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState<boolean>(!!id)
  const [error, setError] = useState<string | null>(null)

  const fetchSale = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const res = (await salesService.getSaleDetail(id)) as SaleResponse
      const parsed: Sale | null = (res as any).data ? (res as any).data : (res as any)

      setSale(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchSale()
  }, [fetchSale])

  return { sale, loading, error, refetch: fetchSale }
}
