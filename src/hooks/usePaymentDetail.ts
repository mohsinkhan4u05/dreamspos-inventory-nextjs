import { useState, useEffect, useCallback } from 'react'
import { paymentService } from '@/services/api'
import type { Payment } from './usePayments'

interface PaymentResponse {
  data: Payment
}

export function usePaymentDetail(id: string | undefined) {
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState<boolean>(!!id)
  const [error, setError] = useState<string | null>(null)

  const fetchPayment = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const res = (await paymentService.getPaymentDetail(id)) as PaymentResponse
      const parsed: Payment | null = (res as any).data ? (res as any).data : (res as any)

      setPayment(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPayment()
  }, [fetchPayment])

  return { payment, loading, error, refetch: fetchPayment }
}
