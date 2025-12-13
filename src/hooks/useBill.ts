import { useState, useEffect, useCallback } from 'react'
import { billService } from '@/services/api'

export interface BillItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  discount: number
  taxRate: number
  taxAmount: number
  product?: {
    id: string
    name: string
    sku?: string | null
  } | null
}

export interface Bill {
  id: string
  orderNumber: string
  supplierId?: string | null
  storeId: string
  createdAt: string
  subtotal: number
  discount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  dueAmount: number
  paymentStatus?: string
  status?: string
  purchaseDate?: string
  expectedDate?: string | null
  notes?: string | null
  store?: {
    id: string
    name: string
    code?: string | null
  } | null
  supplier?: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
  } | null
  items: BillItem[]
  payments?: {
    id: string
    amount: number
    paymentMethod: string
    status: string
    reference?: string | null
    createdAt: string
  }[]
}

export function useBill(id?: string) {
  const [bill, setBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBill = useCallback(async () => {
    if (!id) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const data = await billService.getBillDetail(id)
      setBill(data as Bill)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bill')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchBill()
  }, [fetchBill])

  return {
    bill,
    loading,
    error,
    refetch: fetchBill,
  }
}
