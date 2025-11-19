import { useState, useEffect, useCallback } from 'react'
import { customerService } from '@/services/api'

export interface Customer {
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

export interface CustomerListResponse {
  data: Customer[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export function useCustomers(params?: {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}) {
  const [customers, setCustomers] = useState<CustomerListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, isActive } = params || {}

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await customerService.getCustomers({
        page,
        limit,
        search,
        isActive,
      })
      setCustomers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, isActive])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  return {
    customers,
    loading,
    error,
    refetch: fetchCustomers,
  }
}
