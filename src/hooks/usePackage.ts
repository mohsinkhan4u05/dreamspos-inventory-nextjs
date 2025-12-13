import { useCallback, useEffect, useState } from 'react'
import { packageService } from '@/services/api'

interface PackageResponse<T = any> {
  data?: T
}

export function usePackage<T = any>(id: string | undefined) {
  const [pkg, setPkg] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(!!id)
  const [error, setError] = useState<string | null>(null)

  const fetchPackage = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const res = (await packageService.getPackage(id)) as PackageResponse<T> | T
      const parsed: T | null = (res as PackageResponse<T>).data
        ? (res as PackageResponse<T>).data!
        : (res as T)

      setPkg(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch package')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPackage()
  }, [fetchPackage])

  return { pkg, loading, error, refetch: fetchPackage }
}
