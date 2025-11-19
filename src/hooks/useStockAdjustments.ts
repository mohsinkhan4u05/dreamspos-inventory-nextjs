import { useState, useEffect, useCallback } from 'react'
import { stockAdjustmentService } from '@/services/api'

export interface StockAdjustment {
  id: string
  productId: string
  storeId: string
  stockId?: string | null
  movementType: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'
  quantity: number
  reference?: string | null
  description?: string | null
  createdAt: string
  product?: {
    id: string
    name: string
    sku: string
  }
  store?: {
    id: string
    name: string
    code: string
  }
}

export interface StockAdjustmentListResponse {
  data: StockAdjustment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useStockAdjustments(params?: {
  page?: number
  limit?: number
  search?: string
  storeId?: string
}) {
  const [adjustments, setAdjustments] = useState<StockAdjustmentListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, storeId } = params || {}

  const fetchAdjustments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const apiResponse = await stockAdjustmentService.getStockAdjustments({
        page,
        limit,
        search,
        storeId,
      })

      const listResponse: StockAdjustmentListResponse = {
        data: apiResponse.data || [],
        total: apiResponse.pagination?.total ?? 0,
        page: apiResponse.pagination?.page ?? (page || 1),
        limit: apiResponse.pagination?.limit ?? (limit || 50),
        totalPages: apiResponse.pagination?.pages ?? 1,
      }

      setAdjustments(listResponse)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch stock adjustments',
      )
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, storeId])

  useEffect(() => {
    fetchAdjustments()
  }, [fetchAdjustments])

  return {
    adjustments,
    loading,
    error,
    refetch: fetchAdjustments,
  }
}
