import { useState, useEffect, useCallback } from 'react'
import { salesService } from '@/services/api'

export interface SaleItem {
  id: string
  productId: string
  variantId?: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  discount: number
  taxRate: number
  taxAmount: number
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

export interface Sale {
  id: string
  invoiceNumber: string
  subtotal: number
  discount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  dueAmount: number
  paymentMethod?: string
  paymentStatus?: string
  status: string
  saleDate: string
  createdAt: string
  store?: {
    id: string
    name: string
    code: string
  }
  customer?: {
    id: string
    name: string
    email: string | null
    phone?: string | null
  } | null
  session?: {
    user?: {
      id: string
      username: string
      firstName?: string | null
      lastName?: string | null
    } | null
  } | null
  items?: SaleItem[]
  _count?: {
    items: number
  }
  payments?: Array<{
    id: string
    amount: number
    paymentMethod: string
    status: string
    createdAt: string
  }>
}

export interface SaleListResponse {
  data: Sale[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useSales(params?: {
  page?: number
  limit?: number
  search?: string
  saleId?: string
  storeId?: string
  status?: string
  paymentStatus?: string
  startDate?: string
  endDate?: string
  customerId?: string
}) {
  const [sales, setSales] = useState<SaleListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, saleId, storeId, status, paymentStatus, startDate, endDate, customerId } = params || {}

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const apiResponse = await salesService.getSales({
        page,
        limit,
        search,
        saleId,
        storeId,
        status,
        paymentStatus,
        startDate,
        endDate,
        customerId,
      })

      const listResponse: SaleListResponse = {
        data: apiResponse.data || [],
        total: apiResponse.pagination?.total ?? 0,
        page: apiResponse.pagination?.page ?? (page || 1),
        limit: apiResponse.pagination?.limit ?? (limit || 50),
        totalPages: apiResponse.pagination?.pages ?? 1,
      }

      setSales(listResponse)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch sales',
      )
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, saleId, storeId, status, paymentStatus, startDate, endDate, customerId])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  return {
    sales,
    loading,
    error,
    refetch: fetchSales,
  }
}
