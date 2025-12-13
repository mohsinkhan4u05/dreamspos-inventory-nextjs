import { useState, useEffect, useCallback } from 'react'
import { billService } from '@/services/api'

export interface BillListItem {
  id: string
  orderNumber: string
  supplierId?: string | null
  storeId: string
  subtotal: number
  discount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  dueAmount: number
  paymentStatus?: string
  status?: string
  purchaseDate?: string
  createdAt: string
  store?: {
    id: string
    name: string
    code?: string | null
  } | null
  supplier?: {
    id: string
    name: string
  } | null
}

export interface BillListResponse {
  data: BillListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useBills(params?: {
  page?: number
  limit?: number
  storeId?: string
  startDate?: string
  endDate?: string
  status?: string
  purchaseOrderId?: string
  supplierId?: string
}) {
  const [bills, setBills] = useState<BillListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    page,
    limit,
    storeId,
    startDate,
    endDate,
    status,
    purchaseOrderId,
    supplierId,
  } = params || {}

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const apiResponse = await billService.getBills({
        page,
        limit,
        storeId,
        startDate,
        endDate,
        status,
        purchaseOrderId,
        supplierId,
      })

      const listResponse: BillListResponse = {
        data: apiResponse.data || [],
        total: apiResponse.pagination?.total ?? 0,
        page: apiResponse.pagination?.page ?? (page || 1),
        limit: apiResponse.pagination?.limit ?? (limit || 50),
        totalPages: apiResponse.pagination?.pages ?? 1,
      }

      setBills(listResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bills')
    } finally {
      setLoading(false)
    }
  }, [page, limit, storeId, startDate, endDate, status, purchaseOrderId, supplierId])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  return {
    bills,
    loading,
    error,
    refetch: fetchBills,
  }
}
