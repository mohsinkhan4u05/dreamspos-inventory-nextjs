import { useState, useEffect, useCallback } from 'react'
import { brandService } from '@/services/api'

export interface Brand {
  id: string
  name: string
  slug?: string
  description?: string
  image?: string
  website?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    products: number
  }
}

export interface BrandListResponse {
  data: Brand[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useBrands(params?: {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}) {
  const [brands, setBrands] = useState<BrandListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, isActive } = params || {}

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await brandService.getBrands({
        page,
        limit,
        search,
        isActive,
      })
      setBrands(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch brands')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, isActive])

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  return {
    brands,
    loading,
    error,
    refetch: fetchBrands,
  }
}
