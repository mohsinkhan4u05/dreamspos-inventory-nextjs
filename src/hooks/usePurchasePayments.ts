import { useState, useEffect, useCallback } from 'react'
import { purchasePaymentService } from '@/services/api'

export interface PurchasePayment {
  id: string
  amount: number
  paymentMethod: string
  status: string
  reference?: string | null
  createdAt: string
  purchase?: {
    id: string
    orderNumber: string
    createdAt?: string
    totalAmount?: number
    paidAmount?: number
    dueAmount?: number
    paymentStatus?: string
    store?: {
      id: string
      name: string
      code?: string | null
    } | null
    supplier?: {
      id: string
      name: string
    } | null
  } | null
}

export interface PurchasePaymentListResponse {
  data: PurchasePayment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function usePurchasePayments(params?: {
  page?: number
  limit?: number
  status?: string
  supplierId?: string
  storeId?: string
  startDate?: string
  endDate?: string
  purchaseId?: string
}) {
  const [payments, setPayments] = useState<PurchasePaymentListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, status, supplierId, storeId, startDate, endDate, purchaseId } = params || {}

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const apiResponse = await purchasePaymentService.getPurchasePayments({
        page,
        limit,
        status,
        supplierId,
        storeId,
        startDate,
        endDate,
        purchaseId,
      })

      const listResponse: PurchasePaymentListResponse = {
        data: apiResponse.data || [],
        total: apiResponse.pagination?.total ?? 0,
        page: apiResponse.pagination?.page ?? (page || 1),
        limit: apiResponse.pagination?.limit ?? (limit || 50),
        totalPages: apiResponse.pagination?.pages ?? 1,
      }

      setPayments(listResponse)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch purchase payments',
      )
    } finally {
      setLoading(false)
    }
  }, [page, limit, status, supplierId, storeId, startDate, endDate, purchaseId])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  return {
    payments,
    loading,
    error,
    refetch: fetchPayments,
  }
}
