import { useState, useEffect, useCallback } from 'react'
import { purchaseOrderService } from '@/services/api'

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  productId: string
  variantId?: string | null
  description?: string | null
  quantity: number
  rate: number
  discount: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  receivedQuantity: number
  billedQuantity: number
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

export interface PurchaseOrder {
  id: string
  orderNumber: string
  supplierId?: string | null
  storeId: string
  referenceNumber?: string | null
  orderDate: string
  expectedReceiptDate?: string | null
  paymentTerms?: string | null
  deliveryMethod?: string | null
  buyer?: string | null
  subtotal: number
  discount: number
  taxAmount: number
  adjustment: number
  totalAmount: number
  status: string
  notes?: string | null
  terms?: string | null
  emailRecipients?: string | null
  createdAt: string
  updatedAt: string
  supplier?: {
    id: string
    name: string
    email: string | null
    phone?: string | null
  } | null
  store?: {
    id: string
    name: string
    code: string
  }
  items: PurchaseOrderItem[]
  activities?: Array<{
    id: string
    type: string
    title?: string | null
    description?: string | null
    entityType?: string | null
    entityId?: string | null
    createdAt: string
  }>
  grnCount?: number
  billCount?: number
  hasUnpaidBill?: boolean
}

export interface PurchaseOrderListResponse {
  data: PurchaseOrder[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function usePurchaseOrders(params?: {
  page?: number
  limit?: number
  search?: string
  storeId?: string
  status?: string
  supplierId?: string
  startDate?: string
  endDate?: string
}) {
  const [orders, setOrders] = useState<PurchaseOrderListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, storeId, status, supplierId, startDate, endDate } = params || {}

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const apiResponse = await purchaseOrderService.getPurchaseOrders({
        page,
        limit,
        search,
        storeId,
        status,
        supplierId,
        startDate,
        endDate,
      })

      const listResponse: PurchaseOrderListResponse = {
        data: apiResponse.data || [],
        total: apiResponse.pagination?.total ?? 0,
        page: apiResponse.pagination?.page ?? (page || 1),
        limit: apiResponse.pagination?.limit ?? (limit || 50),
        totalPages: apiResponse.pagination?.pages ?? 1,
      }

      setOrders(listResponse)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch purchase orders',
      )
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, storeId, status, supplierId, startDate, endDate])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
  }
}
