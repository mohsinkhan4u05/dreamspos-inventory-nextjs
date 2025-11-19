import { useState, useEffect, useCallback } from 'react'
import { productService } from '@/services/api'
import { Product } from '@/types/api'

export interface ProductListResponse {
  data: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useProducts(params?: {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  brandId?: string
  isActive?: boolean
}) {
  const [products, setProducts] = useState<ProductListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { page, limit, search, categoryId, brandId, isActive } = params || {}

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const apiResponse = await productService.getProducts({
        page,
        limit,
        search,
        categoryId,
        brandId,
        isActive,
      })

      const listResponse: ProductListResponse = {
        data: apiResponse.products || [],
        total: apiResponse.pagination?.total ?? 0,
        page: apiResponse.pagination?.page ?? (page || 1),
        limit: apiResponse.pagination?.limit ?? (limit || 10),
        totalPages: apiResponse.pagination?.pages ?? 1,
      }

      setProducts(listResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, categoryId, brandId, isActive])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  }
}
