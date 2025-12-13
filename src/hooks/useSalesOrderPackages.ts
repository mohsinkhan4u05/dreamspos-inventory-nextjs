import { useCallback, useEffect, useState } from 'react'
import { salesOrderService } from '@/services/api'
import type { SalesOrder } from './useSalesOrders'

export interface SalesOrderPackageItem {
  id: string
  packageId: string
  salesOrderItemId: string
  productId: string
  variantId?: string | null
  quantity: number
  shippedQuantity: number
  salesOrderItem?: SalesOrder['items'][number]
}

export interface SalesOrderPackage {
  id: string
  packageNumber: string
  salesOrderId: string
  storeId: string
  status: string
  packageDate: string
  notes?: string | null
  items: Array<{
    id: string
    packageId: string
    salesOrderItemId: string
    productId: string
    variantId?: string | null
    quantity: number
    shippedQuantity: number
    salesOrderItem?: SalesOrder['items'][number]
  }>
  shipments?: Array<{
    id: string
    shipmentNumber: string
    shipmentDate: string
    status: string
    delivered: boolean
  }>
}

interface SalesOrderPackagesResponse {
  data: SalesOrderPackage[]
}

export function useSalesOrderPackages(orderId: string | undefined) {
  const [packages, setPackages] = useState<SalesOrderPackage[]>([])
  const [loading, setLoading] = useState<boolean>(!!orderId)
  const [error, setError] = useState<string | null>(null)

  const fetchPackages = useCallback(async () => {
    if (!orderId) return

    try {
      setLoading(true)
      setError(null)

      const res = (await salesOrderService.getSalesOrderPackages(orderId)) as SalesOrderPackagesResponse | SalesOrderPackage[]

      const parsed: SalesOrderPackage[] = Array.isArray(res)
        ? res
        : (res as SalesOrderPackagesResponse).data || []

      setPackages(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch packages')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  return { packages, loading, error, refetch: fetchPackages }
}
