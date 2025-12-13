import { useState, useEffect, useCallback } from 'react'
import { purchasePaymentService } from '@/services/api'
import type { PurchasePayment } from './usePurchasePayments'

interface PurchasePaymentResponse {
  data: PurchasePayment
}

export function usePurchasePaymentDetail(id: string | undefined) {
  const [payment, setPayment] = useState<PurchasePayment | null>(null)
  const [loading, setLoading] = useState<boolean>(!!id)
  const [error, setError] = useState<string | null>(null)

  const fetchPayment = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const res = (await purchasePaymentService.getPurchasePaymentDetail(id)) as PurchasePaymentResponse | PurchasePayment
      const parsed: PurchasePayment | null = (res as any).data ? (res as any).data : (res as any)

      setPayment(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase payment')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPayment()
  }, [fetchPayment])

  return { payment, loading, error, refetch: fetchPayment }
}
