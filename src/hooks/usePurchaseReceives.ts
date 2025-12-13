import { useState, useEffect, useCallback } from 'react'
import { purchaseReceiveService } from '@/services/api'

export interface PurchaseReceiveItem {
  id: string
  purchaseReceiveId: string
  purchaseOrderItemId?: string | null
  productId: string
  quantity: number
  unitCost: number
  totalPrice: number
  discount: number
  taxRate: number
  taxAmount: number
  product?: {
    id: string
    name: string
    sku: string
  }
  purchaseOrderItem?: {
    id: string
    quantity: number
    receivedQuantity: number
  } | null
}

export interface PurchaseReceive {
  id: string
  receiveNumber: string
  purchaseOrderId?: string | null
  supplierId?: string | null
  storeId: string
  subtotal: number
  discount: number
  taxAmount: number
  totalAmount: number
  status: string
  notes?: string | null
  receiveDate: string
  createdAt: string
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
  } | null
  purchaseOrder?: {
    id: string
    orderNumber: string
  } | null
  items: PurchaseReceiveItem[]
}

export interface PurchaseReceiveListResponse {
  data: PurchaseReceive[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function usePurchaseReceives(params?: {
  page?: number
  limit?: number
  search?: string
  storeId?: string
  supplierId?: string
  purchaseOrderId?: string
  status?: string
  startDate?: string
  endDate?: string
}) {
  const [receives, setReceives] = useState<PurchaseReceiveListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, storeId, supplierId, purchaseOrderId, status, startDate, endDate } =
    params || {}

  const fetchReceives = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const apiResponse = await purchaseReceiveService.getPurchaseReceives({
        page,
        limit,
        search,
        storeId,
        supplierId,
        purchaseOrderId,
        status,
        startDate,
        endDate,
      })

      const listResponse: PurchaseReceiveListResponse = {
        data: apiResponse.data || [],
        total: apiResponse.pagination?.total ?? 0,
        page: apiResponse.pagination?.page ?? (page || 1),
        limit: apiResponse.pagination?.limit ?? (limit || 50),
        totalPages: apiResponse.pagination?.pages ?? 1,
      }

      setReceives(listResponse)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch purchase receives',
      )
    } finally {
      setLoading(false)
    }
  }, [
    page,
    limit,
    search,
    storeId,
    supplierId,
    purchaseOrderId,
    status,
    startDate,
    endDate,
  ])

  useEffect(() => {
    fetchReceives()
  }, [fetchReceives])

  return {
    receives,
    loading,
    error,
    refetch: fetchReceives,
  }
}
