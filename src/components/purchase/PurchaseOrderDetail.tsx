"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import { all_routes } from "@/data/all_routes";
import { usePurchaseOrder } from "@/hooks/usePurchaseOrder";
import { useOrgFormatting } from "@/hooks/useOrgFormatting";
import { billService } from "@/services/api";

interface Props {
  id: string;
}

function renderStatusBadge(status: string) {
  const normalized = status?.toUpperCase?.() || "";
  let cls = "badge badge-soft-info badge-xs shadow-none";

  switch (normalized) {
    case "DRAFT":
      cls = "badge badge-soft-secondary badge-xs shadow-none";
      break;
    case "OPEN":
      cls = "badge badge-soft-primary badge-xs shadow-none";
      break;
    case "PARTIALLY_RECEIVED":
    case "PARTIALLY_BILLED":
      cls = "badge badge-soft-warning badge-xs shadow-none";
      break;
    case "RECEIVED":
    case "BILLED":
    case "CLOSED":
      cls = "badge badge-soft-success badge-xs shadow-none";
      break;
    case "CANCELLED":
      cls = "badge badge-soft-danger badge-xs shadow-none";
      break;
    default:
      cls = "badge badge-soft-info badge-xs shadow-none";
  }

  const label = normalized === "OPEN" ? "Issued" : status;

  return (
    <span className={cls}>
      <i className="ti ti-point-filled me-1" />
      {label}
    </span>
  );
}

export default function PurchaseOrderDetail({ id }: Props) {
  const router = useRouter();
  const route = all_routes;
  const { order, loading, error, refetch } = usePurchaseOrder(id);
  const { formatCurrency, formatDate } = useOrgFormatting();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (loading || !order) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>
            {loading ? "Loading purchase order..." : error || "Purchase order not found"}
          </p>
        </div>
      </div>
    );
  }

  const handleAction = async (
    action: "open" | "cancel" | "receive" | "bill" | "close",
  ) => {
    if (!order) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const base = `/api/purchase-orders/${order.id}`;
      const endpoint = `${base}/${action}`;
      const res = await fetch(endpoint, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error ||
            `Unable to ${action} this purchase order. Please try again.`,
        );
      }

      await refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Action failed";
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPaymentFromPO = async () => {
    if (!order) return;

    try {
      setActionLoading(true);
      setActionError(null);

      const response = await billService.getBills({
        purchaseOrderId: order.id,
        limit: 2,
      });

      const bills =
        response && Array.isArray((response as { data?: unknown }).data)
          ? ((response as { data?: { id: string }[] }).data || [])
          : [];

      if (bills.length === 0) {
        setActionError(
          "Create a bill from this purchase order before recording a payment.",
        );
        return;
      }

      if (bills.length === 1) {
        const bill = bills[0];
        router.push(
          `${
            route.billdetails || "/bill-details"
          }?id=${bill.id}&purchaseOrderId=${order.id}&openPayment=1`,
        );
        return;
      }

      router.push(
        `${
          route.purchaselist || "/purchase-list"
        }?purchaseOrderId=${order.id}&purchaseOrderNumber=${order.orderNumber}`,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to navigate to bill payment for this purchase order.";
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const supplierName = order.supplier?.name || "-";
  const storeName = order.store?.name || "-";
  const orderDate = formatDate(order.orderDate || order.createdAt);
  const expectedReceipt = order.expectedReceiptDate
    ? formatDate(order.expectedReceiptDate)
    : "-";

  const isDraft = order.status === "DRAFT";
  const isOpen = order.status === "OPEN";
  const isPartiallyReceived = order.status === "PARTIALLY_RECEIVED";
  const isPartiallyBilled = order.status === "PARTIALLY_BILLED";
  const isReceived = order.status === "RECEIVED";
  const isBilled = order.status === "BILLED";
  const isCancelled = order.status === "CANCELLED";
  const isClosed = order.status === "CLOSED";

  const fullyReceived =
    order.items.length > 0 &&
    order.items.every((item) => item.receivedQuantity >= item.quantity);
  const fullyBilled =
    order.items.length > 0 &&
    order.items.every((item) => item.billedQuantity >= item.quantity);

  const toBeReceived = order.items.reduce((sum, item) => {
    const remaining = item.quantity - item.receivedQuantity;
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  const toBeBilled = order.items.reduce((sum, item) => {
    const remaining = item.quantity - item.billedQuantity;
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  const canReceive = !isCancelled && !isClosed && toBeReceived > 0;

  const canReceiveViaGRN =
    (isOpen || isPartiallyReceived || isPartiallyBilled || isBilled) &&
    canReceive;

  const canConvertToBill =
    (isOpen || isPartiallyReceived || isPartiallyBilled || isReceived) &&
    !fullyBilled &&
    !isCancelled &&
    !isClosed;

  const grnCount = order.grnCount ?? 0;
  const billCount = order.billCount ?? 0;
  const hasUnpaidBill = order.hasUnpaidBill ?? false;

  const showWhatsNext =
    (canReceiveViaGRN || canConvertToBill) && billCount === 0;

  const events: Array<{
    id: string;
    title: string;
    description?: string;
    time: string;
    badgeClass: string;
    iconClass: string;
  }> = [];

  if (order.createdAt) {
    events.push({
      id: "created",
      title: "Purchase order created",
      description: `Order #${order.orderNumber} created`,
      time: order.createdAt,
      badgeClass: "info",
      iconClass: "fas fa-file-alt",
    });
  }

  (order.activities || []).forEach((activity) => {
    const type = activity.type || "";
    let badgeClass = "info";
    let iconClass = "fas fa-info-circle";
    let title = activity.title || "";

    if (type === "PURCHASE_ORDER_CREATED") {
      badgeClass = "primary";
      iconClass = "fas fa-file-alt";
      title = title || "Purchase order created";
    } else if (type === "PURCHASE_ORDER_OPENED") {
      badgeClass = "primary";
      iconClass = "fas fa-file-alt";
      title = title || "Purchase order opened";
    } else if (type === "PURCHASE_ORDER_SENT") {
      badgeClass = "primary";
      iconClass = "fas fa-envelope";
      title = title || "Purchase order sent";
    } else if (type === "PURCHASE_ORDER_UPDATED") {
      badgeClass = "primary";
      iconClass = "fas fa-edit";
      title = title || "Purchase order updated";
    } else if (type === "PURCHASE_ORDER_RECEIVED") {
      badgeClass = "success";
      iconClass = "fas fa-box-open";
      title = title || "Purchase order received";
    } else if (type === "PURCHASE_ORDER_PARTIALLY_RECEIVED") {
      badgeClass = "warning";
      iconClass = "fas fa-box-open";
      title = title || "Purchase order partially received";
    } else if (type === "PURCHASE_ORDER_BILLED") {
      badgeClass = "success";
      iconClass = "fas fa-file-invoice";
      title = title || "Purchase order billed";
    } else if (type === "PURCHASE_ORDER_PARTIALLY_BILLED") {
      badgeClass = "warning";
      iconClass = "fas fa-file-invoice";
      title = title || "Purchase order partially billed";
    } else if (type === "PURCHASE_ORDER_CLOSED") {
      badgeClass = "success";
      iconClass = "fas fa-check-circle";
      title = title || "Purchase order closed";
    } else if (type === "PURCHASE_ORDER_CANCELLED") {
      badgeClass = "danger";
      iconClass = "fas fa-times-circle";
      title = title || "Purchase order cancelled";
    } else {
      return;
    }

    events.push({
      id: `activity-${activity.id}`,
      title,
      description: activity.description || undefined,
      time: activity.createdAt,
      badgeClass,
      iconClass,
    });
  });

  const sortedEvents = events.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="page-title">
              <h4>Purchase Order #{order.orderNumber}</h4>
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
            <div className="page-btn d-flex align-items-center gap-2">
              {renderStatusBadge(order.status)}
              <span
                className="badge badge-soft-secondary badge-xs shadow-none"
                title="Total quantity on this PO that has not yet been received via GRN."
              >
                <i className="ti ti-point-filled me-1" />
                To Be Received: {toBeReceived}
              </span>
              <span
                className="badge badge-soft-secondary badge-xs shadow-none"
                title="Total quantity on this PO that has not yet been converted to supplier bills."
              >
                <i className="ti ti-point-filled me-1" />
                To Be Billed: {toBeBilled}
              </span>
              <Link
                href={{
                  pathname: "/purchase-receives",
                  query: {
                    purchaseOrderId: order.id,
                    purchaseOrderNumber: order.orderNumber,
                  },
                }}
                className="badge badge-soft-info badge-xs shadow-none text-decoration-none"
                title="View Goods Receipt Notes created from this Purchase Order."
              >
                <i className="ti ti-point-filled me-1" />
                GRNs: {grnCount}
              </Link>
              <Link
                href={{
                  pathname: route.purchaselist || "/purchase-list",
                  query: {
                    purchaseOrderId: order.id,
                    purchaseOrderNumber: order.orderNumber,
                  },
                }}
                className="badge badge-soft-info badge-xs shadow-none text-decoration-none"
                title="View Bills created from this Purchase Order."
              >
                <i className="ti ti-point-filled me-1" />
                Bills: {billCount}
              </Link>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body d-flex justify-content-between flex-wrap gap-3 align-items-start">
              <div>
                <p className="mb-1">
                  <strong>Supplier:</strong> {supplierName}
                </p>
                <p className="mb-1">
                  <strong>Store:</strong> {storeName}
                </p>
                <p className="mb-1">
                  <strong>Order Date:</strong> {orderDate}
                </p>
                <p className="mb-0">
                  <strong>Expected Receipt:</strong> {expectedReceipt}
                </p>
              </div>
              <div className="text-end">
                <p className="mb-1">
                  <strong>Reference#:</strong> {order.referenceNumber || "-"}
                </p>
                <p className="mb-0">
                  <strong>Total:</strong> {formatCurrency(order.totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {showWhatsNext && (
            <div className="card mb-3 border">
              <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3 py-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge badge-soft-primary rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: 26, height: 26 }}>
                    <i className="ti ti-point-filled" />
                  </span>
                  <p className="mb-0 text-muted">
                    <span className="text-uppercase fw-semibold me-1">What&apos;s Next?</span>
                    Convert it to a bill or create a receive to complete your purchase.
                  </p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {canConvertToBill && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={actionLoading}
                      onClick={() =>
                        router.push(
                          `/purchase-orders/${order.id}/convert-to-bill`,
                        )
                      }
                    >
                      Convert to Bill
                    </button>
                  )}
                  {canReceiveViaGRN && (
                    <Link
                      href={{
                        pathname: "/purchase-receives/add",
                        query: { purchaseOrderId: order.id },
                      }}
                      className="btn btn-outline-primary btn-sm"
                    >
                      Receive
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasUnpaidBill && !isCancelled && !isClosed && (
            <div className="card mb-3 border">
              <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3 py-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge badge-soft-primary rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: 26, height: 26 }}>
                    <i className="ti ti-point-filled" />
                  </span>
                  <p className="mb-0 text-muted">
                    <span className="text-uppercase fw-semibold me-1">What&apos;s Next?</span>
                    This bill is in the open status. You can now record payment for this bill.
                  </p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={actionLoading}
                    onClick={handleRecordPaymentFromPO}
                  >
                    Record Payment
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Items</h5>
              <div className="d-flex gap-2">
                {isDraft && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm me-2"
                      disabled={actionLoading}
                      onClick={() =>
                        router.push(`/purchase-orders/${order.id}/send-email`)
                      }
                    >
                      Send Purchase Order
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      disabled={actionLoading}
                      onClick={() => handleAction("open")}
                    >
                      Mark as Issued
                    </button>
                  </>
                )}
                {(isDraft || isOpen || isPartiallyReceived || isPartiallyBilled) &&
                  !isCancelled &&
                  !isClosed && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      disabled={actionLoading}
                      onClick={() => handleAction("cancel")}
                    >
                      Cancel
                    </button>
                  )}
                {canReceiveViaGRN && (
                  <Link
                    href={{
                      pathname: "/purchase-receives/add",
                      query: { purchaseOrderId: order.id },
                    }}
                    className="btn btn-outline-primary btn-sm"
                  >
                    Receive via GRN
                  </Link>
                )}
                {canConvertToBill && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    disabled={actionLoading}
                    onClick={() =>
                      router.push(
                        `/purchase-orders/${order.id}/convert-to-bill`,
                      )
                    }
                  >
                    Convert To Bill
                  </button>
                )}
                {(isOpen ||
                  isPartiallyReceived ||
                  isPartiallyBilled ||
                  isReceived ||
                  isBilled) &&
                  !isCancelled &&
                  !isClosed &&
                  fullyReceived &&
                  fullyBilled && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      disabled={actionLoading}
                      onClick={() => handleAction("close")}
                    >
                      Close Order
                    </button>
                  )}
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table datanew">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Description</th>
                      <th className="text-end">Qty Ordered</th>
                      <th className="text-end">Qty Received</th>
                      <th className="text-end">Qty Billed</th>
                      <th className="text-end">Rate</th>
                      <th className="text-end">Tax</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product?.name || item.productId}</td>
                        <td>{item.description || "-"}</td>
                        <td className="text-end">{item.quantity}</td>
                        <td className="text-end">{item.receivedQuantity}</td>
                        <td className="text-end">{item.billedQuantity}</td>
                        <td className="text-end">{formatCurrency(item.rate)}</td>
                        <td className="text-end">{formatCurrency(item.taxAmount)}</td>
                        <td className="text-end">{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-6">
              <div className="card mb-3">
                <div className="card-header">
                  <h5 className="mb-0">Notes</h5>
                </div>
                <div className="card-body">
                  <p className="mb-0">{order.notes || "-"}</p>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card mb-3">
                <div className="card-header">
                  <h5 className="mb-0">Totals</h5>
                </div>
                <div className="card-body">
                  <ul className="list-unstyled mb-0">
                    <li className="d-flex justify-content-between mb-1">
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </li>
                    <li className="d-flex justify-content-between mb-1">
                      <span>Discount</span>
                      <span>{formatCurrency(order.discount)}</span>
                    </li>
                    <li className="d-flex justify-content-between mb-1">
                      <span>Tax</span>
                      <span>{formatCurrency(order.taxAmount)}</span>
                    </li>
                    <li className="d-flex justify-content-between mb-1">
                      <span>Adjustment</span>
                      <span>{formatCurrency(order.adjustment)}</span>
                    </li>
                    <li className="d-flex justify-content-between fw-bold mt-2 border-top pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(order.totalAmount)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <div className="card mb-3">
                <div className="card-header">
                  <h5 className="mb-0">Activity</h5>
                </div>
                <div className="card-body">
                  {sortedEvents.length === 0 ? (
                    <p className="mb-0 text-muted">No activity yet.</p>
                  ) : (
                    <ul className="timeline">
                      {sortedEvents.map((event, index) => (
                        <li
                          key={event.id}
                          className={index % 2 === 1 ? "timeline-inverted" : ""}
                        >
                          <div className={`timeline-badge ${event.badgeClass}`}>
                            <i className={event.iconClass} />
                          </div>
                          <div className="timeline-panel">
                            <div className="timeline-heading">
                              <h4 className="timeline-title">{event.title}</h4>
                              <p className="mb-0 text-muted small">
                                {new Date(event.time).toLocaleString()}
                              </p>
                            </div>
                            {event.description && (
                              <div className="timeline-body">
                                <p>{event.description}</p>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          {actionError && (
            <p className="text-danger mt-2">{actionError}</p>
          )}

          <div className="mt-3">
            <Link
              href={route.purchaseorderreport || "/purchase-order-report"}
              className="btn btn-outline-secondary"
            >
              Back to Purchase Orders
            </Link>
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
