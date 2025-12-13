import { useCallback, useEffect, useState } from 'react'
import { stockAdjustmentService } from '@/services/api'

export interface AdjustmentItem {
  itemId: string
  name: string
  description?: string
  quantityAdjusted: number
  costPrice: number
  unit?: string
}

export interface AdjustmentDetails {
  id: string
  date: string
  reason: string | null
  account: string | null
  adjustmentType: 'Quantity' | 'Value'
  createdBy: string
  items: AdjustmentItem[]
}

export function useStockAdjustmentDetail(adjustmentId?: string) {
  const [detail, setDetail] = useState<AdjustmentDetails | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    if (!adjustmentId) return

    try {
      setLoading(true)
      setError(null)

      const data = await stockAdjustmentService.getStockAdjustmentDetail(adjustmentId)
      setDetail(data as AdjustmentDetails)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load adjustment details',
      )
    } finally {
      setLoading(false)
    }
  }, [adjustmentId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  return {
    detail,
    loading,
    error,
    refetch: fetchDetail,
  }
}
