"use client";

import { useEffect, useState } from "react";
import { salesService, purchaseService } from "@/services/api";

export interface DashboardSummary {
  totalSalesAmount: number;
  totalSalesDue: number;
  totalPurchaseAmount: number;
  totalPurchaseDue: number;
  salesInvoiceCount: number;
  purchaseInvoiceCount: number;
}

interface UseDashboardSummaryOptions {
  limit?: number;
}

const defaultSummary: DashboardSummary = {
  totalSalesAmount: 0,
  totalSalesDue: 0,
  totalPurchaseAmount: 0,
  totalPurchaseDue: 0,
  salesInvoiceCount: 0,
  purchaseInvoiceCount: 0,
};

export function useDashboardSummary(options?: UseDashboardSummaryOptions) {
  const [summary, setSummary] = useState<DashboardSummary>(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = options?.limit ?? 100;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [salesRes, purchasesRes] = await Promise.all([
          salesService.getSales({ limit }),
          purchaseService.getPurchases({ limit }),
        ]);

        if (cancelled) return;

        const sales = (salesRes as any)?.data || [];
        const purchases = (purchasesRes as any)?.data || [];

        const totalSalesAmount = sales.reduce(
          (sum: number, s: any) => sum + (Number(s.totalAmount) || 0),
          0,
        );

        const totalSalesDue = sales.reduce((sum: number, s: any) => {
          const total = Number(s.totalAmount) || 0;
          const paid = Number(s.paidAmount) || 0;
          return sum + Math.max(total - paid, 0);
        }, 0);

        const totalPurchaseAmount = purchases.reduce(
          (sum: number, p: any) => sum + (Number(p.totalAmount) || 0),
          0,
        );

        const totalPurchasePaid = purchases.reduce(
          (sum: number, p: any) => sum + (Number(p.paidAmount) || 0),
          0,
        );

        const totalPurchaseDue = Math.max(
          totalPurchaseAmount - totalPurchasePaid,
          0,
        );

        const salesInvoiceCount = (salesRes as any)?.pagination?.total ?? 0;
        const purchaseInvoiceCount =
          (purchasesRes as any)?.pagination?.total ?? 0;

        setSummary({
          totalSalesAmount,
          totalSalesDue,
          totalPurchaseAmount,
          totalPurchaseDue,
          salesInvoiceCount,
          purchaseInvoiceCount,
        });
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Failed to load dashboard summary");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { summary, loading, error };
}
