import { useState, useEffect, useCallback } from 'react'
import { supplierService } from '@/services/api'

export interface Supplier {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  gstNumber?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SupplierListResponse {
  data: Supplier[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export function useSuppliers(params?: {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}) {
  const [suppliers, setSuppliers] = useState<SupplierListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, isActive } = params || {}

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await supplierService.getSuppliers({
        page,
        limit,
        search,
        isActive,
      })
      setSuppliers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, isActive])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  return {
    suppliers,
    loading,
    error,
    refetch: fetchSuppliers,
  }
}
