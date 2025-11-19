import { useState, useEffect, useCallback } from 'react'
import { billerService } from '@/services/api'

export interface Biller {
  id: string
  name: string
  company?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  postalCode?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BillerListResponse {
  data: Biller[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export function useBillers(params?: {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}) {
  const [billers, setBillers] = useState<BillerListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, isActive } = params || {}

  const fetchBillers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await billerService.getBillers({
        page,
        limit,
        search,
        isActive,
      })
      setBillers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch billers')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, isActive])

  useEffect(() => {
    fetchBillers()
  }, [fetchBillers])

  return {
    billers,
    loading,
    error,
    refetch: fetchBillers,
  }
}
