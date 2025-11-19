import { useState, useEffect, useCallback } from 'react'
import { categoryService } from '@/services/api'

export interface Category {
  id: string
  name: string
  slug?: string
  description?: string
  image?: string
  parentId?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  parent?: {
    id: string
    name: string
  }
  _count?: {
    products: number
    children: number
  }
}

export interface CategoryListResponse {
  data: Category[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useCategories(params?: {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}) {
  const [categories, setCategories] = useState<CategoryListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, isActive } = params || {}

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await categoryService.getCategories({
        page,
        limit,
        search,
        isActive,
      })
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, isActive])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  }
}
