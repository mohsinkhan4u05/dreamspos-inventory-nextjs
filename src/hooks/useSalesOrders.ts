import { useState, useEffect, useCallback } from 'react'
import { salesOrderService } from '@/services/api'

export interface SalesOrderItem {
  id: string
  salesOrderId: string
  productId: string
  variantId?: string | null
  description?: string | null
  quantity: number
  rate: number
  discount: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  packedQuantity: number
  shippedQuantity: number
  invoicedQuantity: number
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

export interface SalesOrder {
  id: string
  orderNumber: string
  customerId?: string | null
  storeId: string
  referenceNumber?: string | null
  orderDate: string
  expectedShipmentDate?: string | null
  paymentTerms?: string | null
  deliveryMethod?: string | null
  salesperson?: string | null
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
  customer?: {
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
  items: SalesOrderItem[]
  packages?: Array<{
    id: string
    packageNumber: string
    packageDate: string | null
    status: string
    shipments?: Array<{
      id: string
      shipmentNumber: string
      shipmentDate: string | null
      status: string
    }>
  }>
  invoices?: Array<{
    id: string
    invoiceNumber: string
    totalAmount: number
    paidAmount: number
    dueAmount: number
    paymentStatus: string
    createdAt?: string
    payments?: Array<{
      id: string
      amount: number
      paymentMethod: string
      status: string
      createdAt: string
    }>
  }>
  activities?: Array<{
    id: string
    type: string
    title?: string | null
    description?: string | null
    entityType?: string | null
    entityId?: string | null
    createdAt: string
  }>
}

export interface SalesOrderListResponse {
  data: SalesOrder[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useSalesOrders(params?: {
  page?: number
  limit?: number
  search?: string
  storeId?: string
  status?: string
  customerId?: string
  startDate?: string
  endDate?: string
}) {
  const [orders, setOrders] = useState<SalesOrderListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, storeId, status, customerId, startDate, endDate } = params || {}

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const apiResponse = await salesOrderService.getSalesOrders({
        page,
        limit,
        search,
        storeId,
        status,
        customerId,
        startDate,
        endDate,
      })

      const listResponse: SalesOrderListResponse = {
        data: apiResponse.data || [],
        total: apiResponse.pagination?.total ?? 0,
        page: apiResponse.pagination?.page ?? (page || 1),
        limit: apiResponse.pagination?.limit ?? (limit || 50),
        totalPages: apiResponse.pagination?.pages ?? 1,
      }

      setOrders(listResponse)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch sales orders',
      )
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, storeId, status, customerId, startDate, endDate])

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
