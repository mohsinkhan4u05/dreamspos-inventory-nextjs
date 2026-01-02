import { useState, useEffect, useCallback } from "react";
import { bomService } from "@/services/api";

export interface BomItemDto {
  id: string;
  finishedProductId: string;
  rawMaterialId: string;
  quantityRequired: number;
  unitId: string;
  rawMaterial?: {
    id: string;
    name: string;
    sku: string | null;
  };
  unit?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface BomResponse {
  finishedProductId: string;
  items: BomItemDto[];
}

export function useBom(finishedProductId?: string) {
  const [bom, setBom] = useState<BomResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBom = useCallback(async () => {
    if (!finishedProductId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await bomService.getBom(finishedProductId);
      setBom(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load BOM");
    } finally {
      setLoading(false);
    }
  }, [finishedProductId]);

  useEffect(() => {
    fetchBom();
  }, [fetchBom]);

  return {
    bom,
    loading,
    error,
    refetch: fetchBom,
  };
}
