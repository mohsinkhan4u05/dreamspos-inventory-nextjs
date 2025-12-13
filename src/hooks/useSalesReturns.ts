import { useState, useEffect, useCallback } from 'react'
import { salesReturnService } from '@/services/api'

export interface SalesReturnItem {
  id: string
  productId: string
  variantId?: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  product?: {
    id: string
    name: string
    sku: string
  }
  variant?: {
    id: string
    name: string
    sku: string
  } | null
}

export interface SalesReturn {
  id: string
  saleId: string
  returnNumber: string
  subtotal: number
  discount: number
  taxAmount: number
  totalAmount: number
  status: string
  notes?: string | null
  returnDate: string
  createdAt: string
  sale?: {
    id: string
    storeId: string
    store?: {
      id: string
      name: string
      code: string
    }
    customer?: {
      id: string
      name: string
      email: string | null
    } | null
  }
  items: SalesReturnItem[]
}

export interface SalesReturnListResponse {
  data: SalesReturn[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useSalesReturns(params?: {
  page?: number
  limit?: number
  saleId?: string
  storeId?: string
}) {
  const [returns, setReturns] = useState<SalesReturnListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, saleId, storeId } = params || {}

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const apiResponse = await salesReturnService.getSalesReturns({
        page,
        limit,
        saleId,
        storeId,
      })

      const listResponse: SalesReturnListResponse = {
        data: apiResponse.data || [],
        total: apiResponse.pagination?.total ?? 0,
        page: apiResponse.pagination?.page ?? (page || 1),
        limit: apiResponse.pagination?.limit ?? (limit || 50),
        totalPages: apiResponse.pagination?.pages ?? 1,
      }

      setReturns(listResponse)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch sales returns',
      )
    } finally {
      setLoading(false)
    }
  }, [page, limit, saleId, storeId])

  useEffect(() => {
    fetchReturns()
  }, [fetchReturns])

  return {
    returns,
    loading,
    error,
    refetch: fetchReturns,
  }
}
