"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePurchaseOrder } from "@/hooks/usePurchaseOrder";
import { formatCurrencyINR } from "@/lib/currency";

export default function NewPurchaseReceivePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseOrderId = searchParams.get("purchaseOrderId") || "";

  const { order, loading, error } = usePurchaseOrder(purchaseOrderId);

  const [receiveDate, setReceiveDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [batches, setBatches] = useState<
    Record<
      string,
      {
        batchNumber: string;
        manufacturingDate: string;
        expiryDate: string;
      }
    >
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingReceived, setSavingReceived] = useState(false);

  useEffect(() => {
    if (!order) return;

    const initial: Record<string, string> = {};
    order.items.forEach((item) => {
      const remaining = item.quantity - item.receivedQuantity;
      if (remaining > 0) {
        initial[item.id] = remaining.toString();
      }
    });
    setQuantities(initial);

    if (!receiveDate) {
      const today = new Date();
      const iso = today.toISOString().slice(0, 10);
      setReceiveDate(iso);
    }
  }, [order, receiveDate]);

  const toBeReceived = useMemo(() => {
    if (!order) return 0;
    return order.items.reduce((sum, item) => {
      const remaining = item.quantity - item.receivedQuantity;
      return sum + (remaining > 0 ? remaining : 0);
    }, 0);
  }, [order]);

  const handleQuantityChange = useCallback(
    (itemId: string, value: string) => {
      setQuantities((prev) => ({
        ...prev,
        [itemId]: value,
      }));
    },
    [],
  );

  const handleBatchFieldChange = useCallback(
    (
      itemId: string,
      field: "batchNumber" | "manufacturingDate" | "expiryDate",
      value: string,
    ) => {
      setBatches((prev) => {
        const existing = prev[itemId] || {
          batchNumber: "",
          manufacturingDate: "",
          expiryDate: "",
        };
        return {
          ...prev,
          [itemId]: {
            ...existing,
            [field]: value,
          },
        };
      });
    },
    [],
  );

  const handleSubmit = useCallback(
    async (mode: "draft" | "received") => {
      if (!order) return;

      try {
        setSubmitError(null);
        if (mode === "draft") {
          setSavingDraft(true);
        } else {
          setSavingReceived(true);
        }

        const itemsPayload = order.items
          .map((item) => {
            const raw = quantities[item.id];
            const qty = raw ? parseFloat(raw) : 0;
            if (!Number.isFinite(qty) || qty <= 0) {
              return null;
            }
            const remaining = item.quantity - item.receivedQuantity;
            if (qty > remaining) {
              throw new Error(
                "Received quantity cannot exceed remaining quantity for any item.",
              );
            }

            const batchInfo = batches[item.id];
            const hasBatchValues =
              batchInfo &&
              (batchInfo.batchNumber ||
                batchInfo.manufacturingDate ||
                batchInfo.expiryDate);

            return {
              purchaseOrderItemId: item.id,
              quantity: qty,
              batch: hasBatchValues
                ? {
                    batchNumber: batchInfo.batchNumber || null,
                    manufacturingDate:
                      batchInfo.manufacturingDate || null,
                    expiryDate: batchInfo.expiryDate || null,
                  }
                : undefined,
            };
          })
          .filter(Boolean) as {
          purchaseOrderItemId: string;
          quantity: number;
          batch?: {
            batchNumber?: string | null;
            manufacturingDate?: string | null;
            expiryDate?: string | null;
          };
        }[];

        if (itemsPayload.length === 0) {
          setSubmitError(
            "Please enter a quantity to receive for at least one item.",
          );
          return;
        }

        const res = await fetch("/api/purchase-receives", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            purchaseOrderId: order.id,
            items: itemsPayload,
            notes: notes || null,
            receiveDate: receiveDate || undefined,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Something went wrong while creating this purchase receive.",
          );
        }

        const receiveId: string | undefined = data?.id;
        if (!receiveId) {
          throw new Error("Failed to create purchase receive.");
        }

        if (mode === "received") {
          const postRes = await fetch(`/api/purchase-receives/${receiveId}/post`, {
            method: "POST",
          });

          const postData = await postRes.json().catch(() => null);

          if (!postRes.ok) {
            throw new Error(
              postData?.error ||
                "Something went wrong while posting this purchase receive.",
            );
          }
        }

        router.push(`/purchase-receives/${receiveId}`);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to save this purchase receive.";
        setSubmitError(message);
      } finally {
        setSavingDraft(false);
        setSavingReceived(false);
      }
    },
    [order, quantities, notes, receiveDate, router],
  );

  if (!purchaseOrderId) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p className="text-danger">
            Purchase order is required to create a purchase receive.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !order) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>
            {loading
              ? "Loading purchase order..."
              : error || "Purchase order not found"}
          </p>
        </div>
      </div>
    );
  }

  const supplierName = order.supplier?.name || "-";
  const storeName = order.store?.name || "-";
  const orderDate = new Date(order.orderDate || order.createdAt).toLocaleDateString();

  const canSubmit = toBeReceived > 0;

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header d-flex justify-content-between align-items-center">
          <div className="page-title">
            <h4>New Goods Receipt Note (GRN)</h4>
            <h6 className="mb-1">
              For Purchase Order #{" "}
              <Link href={`/purchase-orders/${order.id}`}>
                {order.orderNumber}
              </Link>
            </h6>
            <p className="mb-0 small text-muted">
              Supplier: {supplierName} | Store: {storeName} | Order Date: {orderDate}
            </p>
          </div>
          <div className="page-btn d-flex flex-column align-items-end">
            <div className="mb-2">
              <label className="form-label mb-0 me-2">Receive Date</label>
              <input
                type="date"
                className="form-control form-control-sm d-inline-block"
                style={{ minWidth: 160 }}
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
              />
            </div>
            <div className="d-flex gap-2 mt-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => router.push(`/purchase-orders/${order.id}`)}
             >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                disabled={!canSubmit || savingDraft || savingReceived}
                onClick={() => handleSubmit("draft")}
              >
                {savingDraft ? "Saving Draft..." : "Save as Draft"}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!canSubmit || savingDraft || savingReceived}
                onClick={() => handleSubmit("received")}
              >
                {savingReceived ? "Saving..." : "Save Received"}
              </button>
            </div>
          </div>
        </div>

        {submitError && <p className="text-danger mb-2">{submitError}</p>}

        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Items to Receive</h5>
          </div>
          <div className="card-body">
            {toBeReceived === 0 ? (
              <p className="mb-0 text-muted">
                All items on this purchase order have already been fully received.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table datanew mb-0">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-end">Ordered</th>
                      <th className="text-end">Received</th>
                      <th className="text-end">Remaining</th>
                      <th className="text-end">Qty to Receive</th>
                      <th>Batch No.</th>
                      <th>Mfg Date</th>
                      <th>Expiry Date</th>
                      <th className="text-end">Rate</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => {
                      const remaining = item.quantity - item.receivedQuantity;
                      if (remaining <= 0) {
                        return null;
                      }
                      const qtyValue = quantities[item.id] ?? "";
                      const parsedQty = qtyValue ? parseFloat(qtyValue) : 0;
                      const effectiveQty = Number.isFinite(parsedQty)
                        ? Math.min(parsedQty, remaining)
                        : 0;
                      const lineTotal = effectiveQty * item.rate;
                      const batchInfo = batches[item.id] || {
                        batchNumber: "",
                        manufacturingDate: "",
                        expiryDate: "",
                      };

                      return (
                        <tr key={item.id}>
                          <td>{item.product?.name || item.productId}</td>
                          <td className="text-end">{item.quantity}</td>
                          <td className="text-end">{item.receivedQuantity}</td>
                          <td className="text-end">{remaining}</td>
                          <td className="text-end" style={{ maxWidth: 140 }}>
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              step="any"
                              className="form-control text-end"
                              value={qtyValue}
                              onChange={(e) =>
                                handleQuantityChange(item.id, e.target.value)
                              }
                            />
                          </td>
                          <td style={{ maxWidth: 180 }}>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Batch number"
                              value={batchInfo.batchNumber}
                              onChange={(e) =>
                                handleBatchFieldChange(
                                  item.id,
                                  "batchNumber",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td style={{ maxWidth: 160 }}>
                            <input
                              type="date"
                              className="form-control"
                              value={batchInfo.manufacturingDate}
                              onChange={(e) =>
                                handleBatchFieldChange(
                                  item.id,
                                  "manufacturingDate",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td style={{ maxWidth: 160 }}>
                            <input
                              type="date"
                              className="form-control"
                              value={batchInfo.expiryDate}
                              onChange={(e) =>
                                handleBatchFieldChange(
                                  item.id,
                                  "expiryDate",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td className="text-end">
                            {formatCurrencyINR(item.rate)}
                          </td>
                          <td className="text-end">
                            {formatCurrencyINR(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Notes</h5>
          </div>
          <div className="card-body">
            <textarea
              className="form-control"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this receive..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
