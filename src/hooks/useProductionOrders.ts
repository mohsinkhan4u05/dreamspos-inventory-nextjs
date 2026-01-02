import { useState, useEffect, useCallback } from "react";
import { productionOrderService } from "@/services/api";

export interface ProductionOrder {
  id: string;
  finishedProductId: string;
  storeId: string;
  quantityPlanned: number;
  quantityProduced?: number | null;
  status: string;
  notes?: string | null;
  createdById?: string;
  createdAt: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  finishedProduct?: {
    id: string;
    name: string;
    sku: string | null;
  };
  store?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface ProductionOrderListResponse {
  data: ProductionOrder[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function useProductionOrders(params?: {
  page?: number;
  limit?: number;
  storeId?: string;
  status?: string;
  finishedProductId?: string;
}) {
  const [orders, setOrders] = useState<ProductionOrderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { page, limit, storeId, status, finishedProductId } = params || {};

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await productionOrderService.getProductionOrders({
        page,
        limit,
        storeId,
        status,
        finishedProductId,
      });

      setOrders(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch production orders",
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, storeId, status, finishedProductId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
  };
}
