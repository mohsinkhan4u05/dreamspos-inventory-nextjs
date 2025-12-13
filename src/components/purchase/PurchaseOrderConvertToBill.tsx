"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import { all_routes } from "@/data/all_routes";
import { usePurchaseOrder } from "@/hooks/usePurchaseOrder";
import { billService } from "@/services/api";
import { formatCurrencyINR } from "@/lib/currency";

interface Props {
  id: string;
}

function parseNumber(value: string, fallback = 0): number {
  if (!value) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function PurchaseOrderConvertToBill({ id }: Props) {
  const router = useRouter();
  const route = all_routes;
  const { order, loading, error, refetch } = usePurchaseOrder(id);

  const [billDate, setBillDate] = useState<Date | null>(new Date());
  const [expectedPaymentDate, setExpectedPaymentDate] = useState<Date | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!order) return;

    const initial: Record<string, string> = {};
    order.items.forEach((item) => {
      const remaining = item.quantity - item.billedQuantity;
      if (remaining > 0) {
        initial[item.id] = String(remaining);
      }
    });

    setQuantities(initial);
    setNotes(order.notes || "");
    setExpectedPaymentDate(null);
    setBillDate(new Date());
  }, [order]);

  const totals = useMemo(() => {
    if (!order) {
      return { subtotal: 0, discount: 0, taxAmount: 0, total: 0 };
    }

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    order.items.forEach((item) => {
      const raw = quantities[item.id];
      const qty = parseNumber(raw || "", 0);
      if (qty <= 0) return;

      const rate = item.rate ?? 0;
      const perDiscount = item.quantity > 0 ? item.discount / item.quantity : 0;
      const perTax = item.quantity > 0 ? item.taxAmount / item.quantity : 0;

      subtotal += qty * rate;
      discountTotal += perDiscount * qty;
      taxTotal += perTax * qty;
    });

    const total = subtotal - discountTotal + taxTotal;

    return { subtotal, discount: discountTotal, taxAmount: taxTotal, total };
  }, [order, quantities]);

  const handleQuantityChange = (itemId: string, value: string) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!order) return;

    try {
      setSubmitting(true);
      setFormError(null);

      const itemsPayload: { purchaseOrderItemId: string; quantity: number }[] = [];

      for (const item of order.items) {
        const raw = quantities[item.id];
        const qty = parseNumber(raw || "", 0);
        if (!Number.isFinite(qty) || qty <= 0) continue;

        const remaining = item.quantity - item.billedQuantity;
        if (qty > remaining) {
          throw new Error(
            "Billed quantity cannot exceed the remaining quantity for any item.",
          );
        }

        itemsPayload.push({
          purchaseOrderItemId: item.id,
          quantity: qty,
        });
      }

      if (itemsPayload.length === 0) {
        throw new Error(
          "Please enter a quantity to bill for at least one item.",
        );
      }

      const payload: Record<string, unknown> = {
        purchaseOrderId: order.id,
        items: itemsPayload,
        notes: notes || null,
        billDate: billDate ? billDate.toISOString() : null,
        expectedPaymentDate: expectedPaymentDate
          ? expectedPaymentDate.toISOString()
          : null,
      };

      const result = (await billService.createBillFromPurchaseOrder(
        payload,
      )) as {
        billId?: string;
        id?: string;
        purchaseId?: string;
      };
      const billId = result.billId || result.id || result.purchaseId;

      if (billId) {
        router.push(
          `${route.billdetails || "/bill-details"}?id=${encodeURIComponent(
            billId,
          )}&purchaseOrderId=${encodeURIComponent(order.id)}`,
        );
      } else {
        router.push(route.purchaselist || "/purchase-list");
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "Failed to convert purchase order to bill.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!id) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>Purchase order id is required.</p>
          <Link
            href={route.purchaseorderreport || "/purchase-order-report"}
            className="btn btn-outline-secondary mt-2"
          >
            Back to Purchase Orders
          </Link>
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

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="page-title">
              <h4>Convert to Bill - PO #{order.orderNumber}</h4>
              <h6>{supplierName}</h6>
            </div>
            <ul className="table-top-head">
              <TooltipIcons />
              <button
                type="button"
                className="btn btn-link p-0 ms-2"
                onClick={() => refetch()}
              >
                <RefreshIcon />
              </button>
              <CollapesIcon />
            </ul>
          </div>

          <div className="card mb-3">
            <div className="card-body d-flex justify-content-between flex-wrap gap-3">
              <div>
                <p className="mb-1">
                  <strong>Supplier:</strong> {supplierName}
                </p>
                <p className="mb-1">
                  <strong>Store:</strong> {storeName}
                </p>
              </div>
              <div className="text-end">
                <p className="mb-1">
                  <strong>PO Total:</strong> {formatCurrencyINR(order.totalAmount)}
                </p>
                <p className="mb-1">
                  <strong>Bill Total (this bill):</strong> {" "}
                  {formatCurrencyINR(totals.total)}
                </p>
              </div>
            </div>
          </div>

          <div className="card border-0 mb-3">
            <div className="card-body pb-0">
              <div className="row">
                <div className="col-lg-4 col-sm-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Bill Date</label>
                    <div className="input-groupicon calender-input">
                      <DatePicker
                        className="form-control datetimepicker"
                        value={billDate ? dayjs(billDate) : null}
                        onChange={(value: Dayjs | null) =>
                          setBillDate(value ? value.toDate() : null)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="col-lg-4 col-sm-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Expected Payment Date</label>
                    <div className="input-groupicon calender-input">
                      <DatePicker
                        className="form-control datetimepicker"
                        value={expectedPaymentDate ? dayjs(expectedPaymentDate) : null}
                        onChange={(value: Dayjs | null) =>
                          setExpectedPaymentDate(
                            value ? value.toDate() : null,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-lg-8 col-12">
                  <div className="mb-3">
                    <label className="form-label">Bill Notes</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-lg-4 col-12">
                  <div className="card mb-0">
                    <div className="card-header">
                      <h5 className="mb-0">Bill Summary</h5>
                    </div>
                    <div className="card-body">
                      <ul className="list-unstyled mb-0">
                        <li className="d-flex justify-content-between mb-1">
                          <span>Subtotal</span>
                          <span>{formatCurrencyINR(totals.subtotal)}</span>
                        </li>
                        <li className="d-flex justify-content-between mb-1">
                          <span>Discount</span>
                          <span>{formatCurrencyINR(totals.discount)}</span>
                        </li>
                        <li className="d-flex justify-content-between mb-1">
                          <span>Tax</span>
                          <span>{formatCurrencyINR(totals.taxAmount)}</span>
                        </li>
                        <li className="d-flex justify-content-between fw-bold mt-2 border-top pt-2">
                          <span>Total</span>
                          <span>{formatCurrencyINR(totals.total)}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Items to Bill</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table datanew">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-end">Ordered</th>
                      <th className="text-end">Received</th>
                      <th className="text-end">Already Billed</th>
                      <th className="text-end">Remaining to Bill</th>
                      <th className="text-end">Qty to Bill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => {
                      const remaining =
                        item.quantity - item.billedQuantity;
                      if (remaining <= 0) {
                        return null;
                      }

                      return (
                        <tr key={item.id}>
                          <td>{item.product?.name || item.productId}</td>
                          <td className="text-end">{item.quantity}</td>
                          <td className="text-end">{item.receivedQuantity}</td>
                          <td className="text-end">{item.billedQuantity}</td>
                          <td className="text-end">{remaining}</td>
                          <td
                            className="text-end"
                            style={{ maxWidth: 140 }}
                          >
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              step="any"
                              className="form-control text-end"
                              value={quantities[item.id] ?? ""}
                              onChange={(e) =>
                                handleQuantityChange(item.id, e.target.value)
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {formError && <p className="text-danger mt-2">{formError}</p>}

          <div className="mt-3 d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Creating Bill..." : "Create Bill"}
            </button>
          </div>
        </div>
        <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
          <p className="mb-0">2014-2025 © DreamsPOS. All Right Reserved</p>
          <p>
            Designed &amp; Developed By{" "}
            <Link href="#" className="text-primary">
              Dreams
            </Link>
          </p>
        </div>
      </div>

      <CommonDeleteModal />
    </div>
  );
}
