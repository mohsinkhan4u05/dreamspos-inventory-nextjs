import { useState, useEffect, useCallback } from 'react'
import { stockService } from '@/services/api'

export interface Stock {
  id: string
  productId: string
  storeId: string
  quantity: number
  minStock: number
  maxStock?: number
  variantId?: string
  createdAt: Date
  updatedAt: Date
  product?: {
    id: string
    name: string
    sku: string
    image?: string
  }
  store?: {
    id: string
    name: string
    code: string
  }
  warehouse?: {
    id: string
    name: string
  }
  variant?: {
    id: string
    name: string
    sku: string
  }
}

export interface StockListResponse {
  data: Stock[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useStocks(params?: {
  page?: number
  limit?: number
  search?: string
  storeId?: string
  warehouseId?: string
  productId?: string
  lowStock?: boolean
}) {
  const [stocks, setStocks] = useState<StockListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, storeId, warehouseId, productId, lowStock } = params || {}

  const fetchStocks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const apiResponse = await stockService.getStocks({
        page,
        limit,
        search,
        storeId,
        warehouseId,
        productId,
        lowStock,
      })

      const listResponse: StockListResponse = {
        data: apiResponse.data || [],
        total: apiResponse.pagination?.total ?? 0,
        page: apiResponse.pagination?.page ?? (page || 1),
        limit: apiResponse.pagination?.limit ?? (limit || 50),
        totalPages: apiResponse.pagination?.pages ?? 1,
      }

      setStocks(listResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stocks')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, storeId, warehouseId, productId, lowStock])

  useEffect(() => {
    fetchStocks()
  }, [fetchStocks])

  return {
    stocks,
    loading,
    error,
    refetch: fetchStocks,
  }
}
