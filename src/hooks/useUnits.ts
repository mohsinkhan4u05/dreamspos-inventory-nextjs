import { useState, useEffect, useCallback } from 'react'
import { unitService } from '@/services/api'

export interface Unit {
  id: string
  name: string
  code: string
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    products: number
  }
}

export interface UnitListResponse {
  data: Unit[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export function useUnits(params?: {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}) {
  const [units, setUnits] = useState<UnitListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await unitService.getUnits(params)
      setUnits(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch units')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchUnits()
  }, [fetchUnits])

  return {
    units,
    loading,
    error,
    refetch: fetchUnits,
  }
}
