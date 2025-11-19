import { useState, useEffect, useCallback } from 'react'
import { storeService } from '@/services/api'

export interface Store {
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface StoreListResponse {
  data: Store[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useStores(params?: {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}) {
  const [stores, setStores] = useState<StoreListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, isActive } = params || {}

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await storeService.getStores({
        page,
        limit,
        search,
        isActive,
      })
      setStores(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stores')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, isActive])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  return {
    stores,
    loading,
    error,
    refetch: fetchStores,
  }
}
