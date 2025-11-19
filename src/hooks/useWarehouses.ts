import { useState, useEffect, useCallback } from 'react'
import { warehouseService } from '@/services/api'

export interface Warehouse {
  id: string
  name: string
  contactPerson?: string
  phone?: string
  workPhone?: string
  email?: string
  address1?: string
  address2?: string
  country?: string
  state?: string
  city?: string
  zipcode?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WarehouseListResponse {
  data: Warehouse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useWarehouses(params?: {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}) {
  const [warehouses, setWarehouses] = useState<WarehouseListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, isActive } = params || {}

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await warehouseService.getWarehouses({
        page,
        limit,
        search,
        isActive,
      })
      setWarehouses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch warehouses')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, isActive])

  useEffect(() => {
    fetchWarehouses()
  }, [fetchWarehouses])

  return {
    warehouses,
    loading,
    error,
    refetch: fetchWarehouses,
  }
}
