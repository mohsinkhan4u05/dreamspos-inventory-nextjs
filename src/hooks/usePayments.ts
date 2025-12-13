import { useState, useEffect, useCallback } from 'react'
import { paymentService } from '@/services/api'

export interface Payment {
  id: string
  amount: number
  paymentMethod: string
  status: string
  reference?: string | null
  createdAt: string
  sale?: {
    id: string
    invoiceNumber: string
    saleDate?: string
    createdAt?: string
    totalAmount?: number
    paidAmount?: number
    dueAmount?: number
    paymentStatus?: string
    store?: {
      id: string
      name: string
      address?: string | null
      phone?: string | null
      email?: string | null
    } | null
    customer?: {
      id: string
      name: string
      email: string
    } | null
  } | null
}

export interface PaymentListResponse {
  data: Payment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function usePayments(params?: {
  page?: number
  limit?: number
  status?: string
  customerId?: string
  startDate?: string
  endDate?: string
}) {
  const [payments, setPayments] = useState<PaymentListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, status, customerId, startDate, endDate } = params || {}

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const apiResponse = await paymentService.getPayments({
        page,
        limit,
        status,
        customerId,
        startDate,
        endDate,
      })

      const listResponse: PaymentListResponse = {
        data: apiResponse.data || [],
        total: apiResponse.pagination?.total ?? 0,
        page: apiResponse.pagination?.page ?? (page || 1),
        limit: apiResponse.pagination?.limit ?? (limit || 50),
        totalPages: apiResponse.pagination?.pages ?? 1,
      }

      setPayments(listResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payments')
    } finally {
      setLoading(false)
    }
  }, [page, limit, status, customerId, startDate, endDate])

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
