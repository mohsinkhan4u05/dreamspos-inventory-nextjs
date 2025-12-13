"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePurchaseReceive } from "@/hooks/usePurchaseReceive";
import { formatCurrencyINR } from "@/lib/currency";

function renderReceiveStatus(status: string) {
  if (!status) return "-";
  const normalized = status.toUpperCase();
  if (normalized === "POSTED") return "Received";
  if (normalized === "DRAFT") return "Draft";
  if (normalized === "CANCELLED") return "Cancelled";
  return status;
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function PurchaseReceiveDetailPage({ params }: PageProps) {
  const resolvedParams = params as unknown as { id: string };
  const { id } = resolvedParams;
  const { receive, loading, error, refetch } = usePurchaseReceive(id);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  if (loading || !receive) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>
            {loading
              ? "Loading purchase receive..."
              : error || "Purchase receive not found"}
          </p>
        </div>
      </div>
    );
  }

  const supplierName = receive.supplier?.name || "-";
  const storeName = receive.store?.name || "-";
  const poNumber = receive.purchaseOrder?.orderNumber;

  const canPost =
    receive.status !== "POSTED" && receive.status !== "CANCELLED";

  const handlePost = async () => {
    try {
      setPostLoading(true);
      setPostError(null);

      const res = await fetch(`/api/purchase-receives/${receive.id}/post`, {
        method: "POST",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Something went wrong while posting this purchase receive.",
        );
      }

      await refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to post this purchase receive.";
      setPostError(message);
    } finally {
      setPostLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header d-flex justify-content-between align-items-center">
          <div className="page-title">
            <h4>Goods Receipt Note #{receive.receiveNumber}</h4>
            {poNumber && (
              <h6>
                Purchase Order #{" "}
                {receive.purchaseOrder && (
                  <Link href={`/purchase-orders/${receive.purchaseOrder.id}`}>
                    {receive.purchaseOrder.orderNumber}
                  </Link>
                )}
              </h6>
            )}
          </div>
          {canPost && (
            <div className="page-btn">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePost}
                disabled={postLoading}
              >
                {postLoading ? "Posting..." : "Post GRN"}
              </button>
            </div>
          )}
        </div>

        {postError && <p className="text-danger mb-2">{postError}</p>}

        <div className="card mb-3">
          <div className="card-body d-flex justify-content-between flex-wrap gap-3">
            <div>
              <p className="mb-1">
                <strong>Supplier:</strong> {supplierName}
              </p>
              <p className="mb-1">
                <strong>Store:</strong> {storeName}
              </p>
              <p className="mb-1">
                <strong>Receive Date:</strong>{" "}
                {receive.receiveDate
                  ? new Date(receive.receiveDate).toLocaleDateString()
                  : "-"}
              </p>
            </div>
            <div className="text-end">
              <p className="mb-1">
                <strong>Status:</strong> {renderReceiveStatus(receive.status)}
              </p>
              <p className="mb-1">
                <strong>Total:</strong> {formatCurrencyINR(receive.totalAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Items</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table datanew mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-end">Quantity</th>
                    <th className="text-end">Unit Cost</th>
                    <th className="text-end">Tax</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receive.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.product?.name || item.productId}</td>
                      <td className="text-end">{item.quantity}</td>
                      <td className="text-end">
                        {formatCurrencyINR(item.unitCost)}
                      </td>
                      <td className="text-end">
                        {formatCurrencyINR(item.taxAmount)}
                      </td>
                      <td className="text-end">
                        {formatCurrencyINR(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Totals</h5>
          </div>
          <div className="card-body">
            <ul className="list-unstyled mb-0">
              <li className="d-flex justify-content-between mb-1">
                <span>Subtotal</span>
                <span>{formatCurrencyINR(receive.subtotal)}</span>
              </li>
              <li className="d-flex justify-content-between mb-1">
                <span>Discount</span>
                <span>{formatCurrencyINR(receive.discount)}</span>
              </li>
              <li className="d-flex justify-content-between mb-1">
                <span>Tax</span>
                <span>{formatCurrencyINR(receive.taxAmount)}</span>
              </li>
              <li className="d-flex justify-content-between fw-bold mt-2 border-top pt-2">
                <span>Total</span>
                <span>{formatCurrencyINR(receive.totalAmount)}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-3">
          <Link
            href="/purchase-receives"
            className="btn btn-outline-secondary"
          >
            Back to Purchase Receives
          </Link>
        </div>
      </div>
    </div>
  );
}
