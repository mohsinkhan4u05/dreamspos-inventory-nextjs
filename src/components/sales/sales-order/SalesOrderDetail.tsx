"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import React, { useState } from "react";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import { all_routes } from "@/data/all_routes";
import { useSalesOrder } from "@/hooks/useSalesOrder";
import { useSalesOrderPackages } from "@/hooks/useSalesOrderPackages";
import { formatCurrencyINR } from "@/lib/currency";

interface Props {
  id: string;
}

export default function SalesOrderDetail({ id }: Props) {
  const router = useRouter();
  const route = all_routes;
  const { order, loading, error, refetch } = useSalesOrder(id);
  const {
    packages,
    loading: packagesLoading,
    error: packagesError,
    refetch: refetchPackages,
  } = useSalesOrderPackages(id);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showShipmentWarning, setShowShipmentWarning] = useState(false);
  const [packageNotes, setPackageNotes] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [packageQuantities, setPackageQuantities] = useState<Record<string, string>>({});
  const [shipmentQuantities, setShipmentQuantities] = useState<Record<string, string>>({});
  const [packageError, setPackageError] = useState<string | null>(null);
  const [shipmentError, setShipmentError] = useState<string | null>(null);
  const [packageSubmitting, setPackageSubmitting] = useState(false);
  const [shipmentSubmitting, setShipmentSubmitting] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({
    shipmentDate: "",
    type: "MANUAL" as "MANUAL" | "CARRIER",
    carrier: "",
    trackingNumber: "",
    trackingUrl: "",
    shippingCharges: "",
    notes: "",
    delivered: false,
  });

  const latestInvoice = order?.invoices && order.invoices.length > 0
    ? order.invoices[order.invoices.length - 1]
    : null;

  const handleAction = async (action: "confirm" | "cancel" | "reopen" | "convert") => {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const base = `/api/sales-orders/${order.id}`;
      const endpoint =
        action === "confirm"
          ? `${base}/confirm`
          : action === "cancel"
          ? `${base}/cancel`
          : action === "reopen"
          ? `${base}/reopen`
          : `${base}/convert-to-invoice`;

      const res = await fetch(endpoint, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to ${action} sales order`);
      }

      if (action === "convert") {
        const data = await res.json().catch(() => null);
        const invoiceId = data?.invoice?.id as string | undefined;
        const invoiceNumber = data?.invoice?.invoiceNumber as string | undefined;

        if (invoiceId) {
          const target = `${route.invoicedetails}?id=${invoiceId}`;
          router.push(target);
        } else {
          router.push(route.saleslist || "/invoice");
        }
        return;
      }

      await refetch();
      await refetchPackages();
    } catch (e: any) {
      setActionError(e?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const hasUnpackedItems =
    order?.items?.some((item) => (item.packedQuantity ?? 0) < item.quantity) ?? false;

  const getShippablePackages = () => {
    return (packages || []).filter((pkg) =>
      pkg.items.some((item) => item.quantity > item.shippedQuantity),
    );
  };

  const handleOpenPackageModal = () => {
    if (!order) return;
    const quantities: Record<string, string> = {};

    order.items.forEach((item) => {
      const packed = item.packedQuantity ?? 0;
      const remaining = item.quantity - packed;
      if (remaining > 0) {
        quantities[item.id] = remaining.toString();
      }
    });

    setPackageQuantities(quantities);
    setPackageNotes("");
    setPackageError(null);
    setShowPackageModal(true);
  };

  const handlePackageQuantityChange = (itemId: string, value: string) => {
    setPackageQuantities((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleSubmitPackage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!order) return;

    try {
      setPackageSubmitting(true);
      setPackageError(null);

      const itemsPayload = order.items
        .map((item) => {
          const raw = packageQuantities[item.id];
          const qty = raw ? parseFloat(raw) : 0;
          if (!Number.isFinite(qty) || qty <= 0) {
            return null;
          }
          return {
            salesOrderItemId: item.id,
            quantity: qty,
          };
        })
        .filter(Boolean) as { salesOrderItemId: string; quantity: number }[];

      if (itemsPayload.length === 0) {
        setPackageError("Please enter a quantity to pack for at least one item.");
        return;
      }

      await (await import("@/services/api")).salesOrderService.createPackage(order.id, {
        packageDate: new Date().toISOString(),
        notes: packageNotes || null,
        items: itemsPayload,
      });

      setShowPackageModal(false);
      await refetch();
      await refetchPackages();
    } catch (err: any) {
      setPackageError(err?.message || "Failed to create package");
    } finally {
      setPackageSubmitting(false);
    }
  };

  const prepareShipmentQuantities = (pkgId: string) => {
    const pkg = (packages || []).find((p) => p.id === pkgId);
    if (!pkg) return;
    const quantities: Record<string, string> = {};
    pkg.items.forEach((item) => {
      const remaining = item.quantity - item.shippedQuantity;
      if (remaining > 0) {
        quantities[item.id] = remaining.toString();
      }
    });
    setShipmentQuantities(quantities);
  };

  const handleOpenShipmentModal = (pkgId?: string) => {
    const shippable = getShippablePackages();
    if (shippable.length === 0) {
      setShowShipmentWarning(true);
      return;
    }

    const targetPackageId = pkgId || shippable[0].id;
    setSelectedPackageId(targetPackageId);
    prepareShipmentQuantities(targetPackageId);
    setShipmentError(null);
    setShipmentForm((prev) => ({
      ...prev,
      shipmentDate: new Date().toISOString().slice(0, 10),
    }));
    setShowShipmentModal(true);
  };

  const handleShipmentQuantityChange = (packageItemId: string, value: string) => {
    setShipmentQuantities((prev) => ({
      ...prev,
      [packageItemId]: value,
    }));
  };

  const handleShipmentFormChange = (
    field:
      | "shipmentDate"
      | "type"
      | "carrier"
      | "trackingNumber"
      | "trackingUrl"
      | "shippingCharges"
      | "notes"
      | "delivered",
    value: string | boolean,
  ) => {
    setShipmentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitShipment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPackageId) return;

    try {
      setShipmentSubmitting(true);
      setShipmentError(null);

      const pkg = (packages || []).find((p) => p.id === selectedPackageId);
      if (!pkg) {
        setShipmentError("Selected package not found.");
        return;
      }

      const itemsPayload = pkg.items
        .map((item) => {
          const raw = shipmentQuantities[item.id];
          const qty = raw ? parseFloat(raw) : 0;
          if (!Number.isFinite(qty) || qty <= 0) {
            return null;
          }
          return {
            packageItemId: item.id,
            quantity: qty,
          };
        })
        .filter(Boolean) as { packageItemId: string; quantity: number }[];

      if (itemsPayload.length === 0) {
        setShipmentError("Please enter a quantity to ship for at least one line.");
        return;
      }

      const shipmentDateValue = shipmentForm.shipmentDate
        ? new Date(shipmentForm.shipmentDate)
        : new Date();

      const payload = {
        shipmentDate: shipmentDateValue.toISOString(),
        type: shipmentForm.type,
        carrier: shipmentForm.carrier || null,
        trackingNumber: shipmentForm.trackingNumber || null,
        trackingUrl: shipmentForm.trackingUrl || null,
        shippingCharges: shipmentForm.shippingCharges
          ? parseFloat(shipmentForm.shippingCharges)
          : 0,
        notes: shipmentForm.notes || null,
        delivered: shipmentForm.delivered,
        deliveredAt: shipmentForm.delivered ? new Date().toISOString() : null,
        sendNotification: false,
        items: itemsPayload,
      };

      await (await import("@/services/api")).packageService.createShipment(
        selectedPackageId,
        payload,
      );

      setShowShipmentModal(false);
      await refetch();
      await refetchPackages();
    } catch (err: any) {
      setShipmentError(err?.message || "Failed to create shipment");
    } finally {
      setShipmentSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const normalized = status?.toUpperCase?.() || "";
    let cls = "badge badge-soft-info badge-xs shadow-none";

    switch (normalized) {
      case "DRAFT":
        cls = "badge badge-soft-secondary badge-xs shadow-none";
        break;
      case "CONFIRMED":
        cls = "badge badge-soft-primary badge-xs shadow-none";
        break;
      case "PACKED":
        cls = "badge badge-soft-warning badge-xs shadow-none";
        break;
      case "SHIPPED":
        cls = "badge badge-soft-info badge-xs shadow-none";
        break;
      case "INVOICED":
      case "PAID":
        cls = "badge badge-soft-success badge-xs shadow-none";
        break;
      case "CANCELLED":
        cls = "badge badge-soft-danger badge-xs shadow-none";
        break;
      case "CLOSED":
        cls = "badge badge-soft-dark badge-xs shadow-none";
        break;
      default:
        cls = "badge badge-soft-info badge-xs shadow-none";
    }

    return (
      <span className={cls}>
        <i className="ti ti-point-filled me-1" />
        {status}
      </span>
    );
  };

  if (loading || !order) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>{loading ? "Loading sales order..." : error || "Sales order not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="page-title">
              <h4>Sales Order #{order.orderNumber}</h4>
              <h6>{order.customer?.name || ""}</h6>
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
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => router.push(`/sales-orders/${order.id}/send-email`)}
              >
                Send Sales Order
              </button>
              {latestInvoice && (
                <Link
                  href={`${route.invoicedetails}?id=${latestInvoice.id}`}
                  className="btn btn-outline-primary btn-sm"
                >
                  View Invoice {latestInvoice.invoiceNumber}
                </Link>
              )}
              {latestInvoice &&
                typeof latestInvoice.dueAmount === "number" &&
                latestInvoice.dueAmount > 0 &&
                (order.status === "SHIPPED" || order.status === "INVOICED") && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      router.push(
                        `${route.invoicedetails}?id=${latestInvoice.id}&autoOpenPayment=1`,
                      )
                    }
                  >
                    Record Payment
                  </button>
                )}
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body d-flex justify-content-between flex-wrap gap-3">
              <div>
                <p className="mb-1">
                  <strong>Customer:</strong> {order.customer?.name || "-"}
                </p>
                <p className="mb-1">
                  <strong>Order Date:</strong>{" "}
                  {new Date(order.orderDate || order.createdAt).toLocaleDateString()}
                </p>
                <p className="mb-1">
                  <strong>Expected Shipment:</strong>{" "}
                  {order.expectedShipmentDate
                    ? new Date(order.expectedShipmentDate).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              <div className="text-end">
                <p className="mb-1">
                  <strong>Reference#:</strong> {order.referenceNumber || "-"}
                </p>
                <p className="mb-1">
                  <strong>Total:</strong> {formatCurrencyINR(order.totalAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Items</h5>
              <div className="d-flex gap-2">
                {order.status === "DRAFT" && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    disabled={actionLoading}
                    onClick={() => handleAction("confirm")}
                  >
                    Confirm
                  </button>
                )}
                {order.status === "CONFIRMED" && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    disabled={actionLoading}
                    onClick={() => handleAction("cancel")}
                  >
                    Cancel
                  </button>
                )}
                {(order.status === "CONFIRMED" ||
                  order.status === "PACKED" ||
                  order.status === "SHIPPED" ||
                  order.status === "INVOICED") && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={actionLoading}
                    onClick={() => handleAction("convert")}
                  >
                    Convert to Invoice
                  </button>
                )}
                {order.status === "CANCELLED" && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={actionLoading}
                    onClick={() => handleAction("reopen")}
                  >
                    Reopen
                  </button>
                )}
                {(order.status === "CONFIRMED" ||
                  order.status === "PACKED" ||
                  order.status === "SHIPPED" ||
                  order.status === "INVOICED") && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    disabled={actionLoading || !hasUnpackedItems}
                    onClick={handleOpenPackageModal}
                  >
                    New Package
                  </button>
                )}
                {(order.status === "CONFIRMED" ||
                  order.status === "PACKED" ||
                  order.status === "SHIPPED" ||
                  order.status === "INVOICED") && (
                  <button
                    type="button"
                    className="btn btn-outline-success btn-sm"
                    disabled={actionLoading || getShippablePackages().length === 0}
                    onClick={() => handleOpenShipmentModal()}
                  >
                    Create Shipment
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
                      <th className="text-end">Qty</th>
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
                        <td className="text-end">{formatCurrencyINR(item.rate)}</td>
                        <td className="text-end">{formatCurrencyINR(item.taxAmount)}</td>
                        <td className="text-end">{formatCurrencyINR(item.totalAmount)}</td>
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
                      <span>{formatCurrencyINR(order.subtotal)}</span>
                    </li>
                    <li className="d-flex justify-content-between mb-1">
                      <span>Discount</span>
                      <span>{formatCurrencyINR(order.discount)}</span>
                    </li>
                    <li className="d-flex justify-content-between mb-1">
                      <span>Tax</span>
                      <span>{formatCurrencyINR(order.taxAmount)}</span>
                    </li>
                    <li className="d-flex justify-content-between mb-1">
                      <span>Adjustment</span>
                      <span>{formatCurrencyINR(order.adjustment)}</span>
                    </li>
                    <li className="d-flex justify-content-between fw-bold mt-2 border-top pt-2">
                      <span>Total</span>
                      <span>{formatCurrencyINR(order.totalAmount)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Packages &amp; Shipments</h5>
            </div>
            <div className="card-body">
              {packagesLoading && <p className="mb-2">Loading packages...</p>}
              {packagesError && (
                <p className="mb-2 text-danger">{packagesError}</p>
              )}
              {!packagesLoading && (packages || []).length === 0 && (
                <p className="mb-0 text-muted">No packages created yet.</p>
              )}
              {(packages || []).length > 0 && (
                <div className="table-responsive mb-3">
                  <table className="table datanew mb-0">
                    <thead>
                      <tr>
                        <th>Package #</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th className="text-end">Items</th>
                        <th className="text-end">Shipments</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(packages || []).map((pkg) => {
                        const totalLines = pkg.items.length;
                        const totalShippedLines = pkg.items.filter(
                          (i) => i.shippedQuantity >= i.quantity,
                        ).length;
                        return (
                          <tr key={pkg.id}>
                            <td>
                              <Link href={`/packages/${pkg.id}`}>#{pkg.packageNumber}</Link>
                            </td>
                            <td>
                              {pkg.packageDate
                                ? new Date(pkg.packageDate).toLocaleDateString()
                                : "-"}
                            </td>
                            <td>{pkg.status}</td>
                            <td className="text-end">
                              {totalLines} line{totalLines === 1 ? "" : "s"}
                            </td>
                            <td className="text-end">
                              {pkg.shipments?.length ?? 0}
                            </td>
                            <td className="text-end">
                              <div className="d-inline-flex gap-2">
                                <Link
                                  href={`/packages/${pkg.id}`}
                                  className="btn btn-outline-primary btn-sm"
                                >
                                  View Shipments
                                </Link>
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm p-0"
                                  onClick={() => handleOpenShipmentModal(pkg.id)}
                                >
                                  Ship
                                </button>
                              </div>
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

                    <div className="row">
            <div className="col-12">
              <div className="card mb-3">
                <div className="card-header">
                  <h5 className="mb-0">Activity</h5>
                </div>
                <div className="card-body">
                  {(() => {
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
                        title: "Sales order created",
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

                      if (type === "SALES_ORDER_CONFIRMED") {
                        badgeClass = "primary";
                        iconClass = "fas fa-check-circle";
                        title = title || "Sales order confirmed";
                      } else if (type === "SALES_ORDER_CANCELLED") {
                        badgeClass = "danger";
                        iconClass = "fas fa-times-circle";
                        title = title || "Sales order cancelled";
                      } else if (type === "SALES_ORDER_REOPENED") {
                        badgeClass = "warning";
                        iconClass = "fas fa-undo";
                        title = title || "Sales order reopened";
                      } else if (type === "SALES_ORDER_PACKED") {
                        badgeClass = "primary";
                        iconClass = "fas fa-box";
                        title = title || "Sales order packed";
                      } else if (type === "SALES_ORDER_PARTIALLY_PACKED") {
                        badgeClass = "warning";
                        iconClass = "fas fa-box";
                        title = title || "Sales order partially packed";
                      } else if (type === "SALES_ORDER_SHIPPED") {
                        badgeClass = "success";
                        iconClass = "fas fa-truck";
                        title = title || "Sales order shipped";
                      } else if (type === "SALES_ORDER_PARTIALLY_SHIPPED") {
                        badgeClass = "warning";
                        iconClass = "fas fa-truck";
                        title = title || "Sales order partially shipped";
                      } else if (type === "SALES_ORDER_INVOICED") {
                        badgeClass = "success";
                        iconClass = "fas fa-file-invoice";
                        title = title || "Sales order invoiced";
                      } else if (type === "SALES_ORDER_PAID") {
                        badgeClass = "success";
                        iconClass = "fas fa-check-double";
                        title = title || "Sales order paid";
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

                    (order.invoices || []).forEach((invoice) => {
                      const time = invoice.createdAt || order.updatedAt || order.createdAt;
                      if (!time) return;
                      events.push({
                        id: `invoice-${invoice.id}`,
                        title: `Invoice ${invoice.invoiceNumber} created`,
                        description: `Total amount ${formatCurrencyINR(invoice.totalAmount)}`,
                        time,
                        badgeClass: "success",
                        iconClass: "fas fa-file-invoice",
                      });

                      (invoice.payments || []).forEach((payment) => {
                        events.push({
                          id: `payment-${payment.id}`,
                          title: `Payment received (${payment.status})`,
                          description: `Amount ${formatCurrencyINR(payment.amount)} via ${payment.paymentMethod}`,
                          time: payment.createdAt,
                          badgeClass: "success",
                          iconClass: "fas fa-credit-card",
                        });
                      });
                    });

                    const sorted = events.sort((a, b) =>
                      new Date(a.time).getTime() - new Date(b.time).getTime(),
                    );

                    if (sorted.length === 0) {
                      return <p className="mb-0 text-muted">No activity yet.</p>;
                    }

                    return (
                      <ul className="timeline">
                        {sorted.map((event, index) => (
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
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {actionError && (
            <p className="text-danger mt-2">{actionError}</p>
          )}

          <div className="mt-3">
            <Link href={route.salesorders || "/sales-orders"} className="btn btn-outline-secondary">
              Back to Sales Orders
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

      {showPackageModal && order && (
        <>
          <div
            className="modal fade show"
            style={{ display: "block" }}
            aria-modal="true"
            role="dialog"
          >
            <div className="modal-dialog modal-dialog-centered custom-modal-two">
              <div className="modal-content">
                <div className="page-wrapper-new p-0">
                  <div className="content">
                    <div className="modal-header border-0 custom-modal-header">
                      <div className="page-title">
                        <h4>New Package</h4>
                        <p className="mb-0 small text-muted">
                          Sales Order #{order.orderNumber}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="close"
                        aria-label="Close"
                        onClick={() => setShowPackageModal(false)}
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </div>
                    <div className="modal-body custom-modal-body">
                      {packageError && (
                        <p className="text-danger mb-2">{packageError}</p>
                      )}
                      <form onSubmit={handleSubmitPackage}>
                        <div className="row">
                          <div className="col-lg-12">
                            <div className="input-blocks mb-3">
                              <label className="form-label">Notes</label>
                              <textarea
                                className="form-control"
                                rows={2}
                                value={packageNotes}
                                onChange={(e) => setPackageNotes(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="col-lg-12">
                            <div className="modal-body-table">
                              <div className="table-responsive">
                                <table className="table datanew mb-0">
                                  <thead>
                                    <tr>
                                      <th>Item</th>
                                      <th className="text-end">Ordered</th>
                                      <th className="text-end">Packed</th>
                                      <th className="text-end">Remaining</th>
                                      <th className="text-end">Qty to Pack</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.items.map((item) => {
                                      const packed = item.packedQuantity ?? 0;
                                      const remaining = item.quantity - packed;
                                      if (remaining <= 0) {
                                        return null;
                                      }
                                      return (
                                        <tr key={item.id}>
                                          <td>{item.product?.name || item.productId}</td>
                                          <td className="text-end">{item.quantity}</td>
                                          <td className="text-end">{packed}</td>
                                          <td className="text-end">{remaining}</td>
                                          <td className="text-end" style={{ maxWidth: 140 }}>
                                            <input
                                              type="number"
                                              min={0}
                                              max={remaining}
                                              step="any"
                                              className="form-control text-end"
                                              value={packageQuantities[item.id] ?? ""}
                                              onChange={(e) =>
                                                handlePackageQuantityChange(
                                                  item.id,
                                                  e.target.value,
                                                )
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
                        </div>
                        <div className="modal-footer-btn mt-3">
                          <button
                            type="button"
                            className="btn btn-cancel me-2"
                            onClick={() => setShowPackageModal(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn btn-submit"
                            disabled={packageSubmitting}
                          >
                            {packageSubmitting ? "Saving..." : "Save Package"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {showShipmentModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: "block" }}
            aria-modal="true"
            role="dialog"
          >
            <div className="modal-dialog modal-dialog-centered custom-modal-two">
              <div className="modal-content">
                <div className="page-wrapper-new p-0">
                  <div className="content">
                    <div className="modal-header border-0 custom-modal-header">
                      <div className="page-title">
                        <h4>New Shipment</h4>
                        {order && (
                          <p className="mb-0 small text-muted">
                            Sales Order #{order.orderNumber}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="close"
                        aria-label="Close"
                        onClick={() => setShowShipmentModal(false)}
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </div>
                    <div className="modal-body custom-modal-body">
                      {shipmentError && (
                        <p className="text-danger mb-2">{shipmentError}</p>
                      )}
                      <form onSubmit={handleSubmitShipment}>
                        <div className="row mb-3">
                          <div className="col-md-4">
                            <div className="input-blocks">
                              <label className="form-label">Package</label>
                              <select
                                className="form-select"
                                value={selectedPackageId ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value || null;
                                  setSelectedPackageId(value);
                                  if (value) {
                                    prepareShipmentQuantities(value);
                                  }
                                }}
                              >
                                <option value="">Select package</option>
                                {getShippablePackages().map((pkg) => (
                                  <option key={pkg.id} value={pkg.id}>
                                    {pkg.packageNumber}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="input-blocks">
                              <label className="form-label">Shipment Date</label>
                              <input
                                type="date"
                                className="form-control"
                                value={shipmentForm.shipmentDate}
                                onChange={(e) =>
                                  handleShipmentFormChange(
                                    "shipmentDate",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="input-blocks">
                              <label className="form-label">Type</label>
                              <select
                                className="form-select"
                                value={shipmentForm.type}
                                onChange={(e) =>
                                  handleShipmentFormChange("type", e.target.value)
                                }
                              >
                                <option value="MANUAL">Manual</option>
                                <option value="CARRIER">Carrier</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="row mb-3">
                          <div className="col-md-4">
                            <div className="input-blocks">
                              <label className="form-label">Carrier</label>
                              <input
                                type="text"
                                className="form-control"
                                value={shipmentForm.carrier}
                                onChange={(e) =>
                                  handleShipmentFormChange("carrier", e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="input-blocks">
                              <label className="form-label">Tracking #</label>
                              <input
                                type="text"
                                className="form-control"
                                value={shipmentForm.trackingNumber}
                                onChange={(e) =>
                                  handleShipmentFormChange(
                                    "trackingNumber",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="input-blocks">
                              <label className="form-label">Shipping Charges</label>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                className="form-control"
                                value={shipmentForm.shippingCharges}
                                onChange={(e) =>
                                  handleShipmentFormChange(
                                    "shippingCharges",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mb-3 form-check">
                          <input
                            id="shipment-delivered"
                            type="checkbox"
                            className="form-check-input"
                            checked={shipmentForm.delivered}
                            onChange={(e) =>
                              handleShipmentFormChange(
                                "delivered",
                                e.target.checked,
                              )
                            }
                          />
                          <label
                            className="form-check-label"
                            htmlFor="shipment-delivered"
                          >
                            Shipment already delivered
                          </label>
                        </div>

                        <div className="mb-3">
                          <div className="input-blocks">
                            <label className="form-label">Notes</label>
                            <textarea
                              className="form-control"
                              rows={2}
                              value={shipmentForm.notes}
                              onChange={(e) =>
                                handleShipmentFormChange("notes", e.target.value)
                              }
                            />
                          </div>
                        </div>

                        <div className="modal-body-table mb-3">
                          <div className="table-responsive">
                            <table className="table datanew mb-0">
                              <thead>
                                <tr>
                                  <th>Item</th>
                                  <th className="text-end">Package Qty</th>
                                  <th className="text-end">Shipped</th>
                                  <th className="text-end">Remaining</th>
                                  <th className="text-end">Qty to Ship</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(((packages || []).find(
                                  (p) => p.id === selectedPackageId,
                                )?.items) || []).map((item) => {
                                  const remaining = item.quantity - item.shippedQuantity;
                                  if (remaining <= 0) {
                                    return null;
                                  }
                                  const soItem = item.salesOrderItem;
                                  return (
                                    <tr key={item.id}>
                                      <td>{soItem?.product?.name || soItem?.productId}</td>
                                      <td className="text-end">{item.quantity}</td>
                                      <td className="text-end">{item.shippedQuantity}</td>
                                      <td className="text-end">{remaining}</td>
                                      <td className="text-end" style={{ maxWidth: 140 }}>
                                        <input
                                          type="number"
                                          min={0}
                                          max={remaining}
                                          step="any"
                                          className="form-control text-end"
                                          value={shipmentQuantities[item.id] ?? ""}
                                          onChange={(e) =>
                                            handleShipmentQuantityChange(
                                              item.id,
                                              e.target.value,
                                            )
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

                        <div className="modal-footer-btn">
                          <button
                            type="button"
                            className="btn btn-cancel me-2"
                            onClick={() => setShowShipmentModal(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn btn-submit"
                            disabled={shipmentSubmitting || !selectedPackageId}
                          >
                            {shipmentSubmitting ? "Saving..." : "Save Shipment"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {showShipmentWarning && (
        <>
          <div
            className="modal fade show"
            style={{ display: "block" }}
            aria-modal="true"
            role="dialog"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="page-wrapper-new p-0">
                  <div className="content">
                    <div className="modal-header border-0 custom-modal-header">
                      <div className="page-title">
                        <h4>Cannot Create Shipment</h4>
                      </div>
                      <button
                        type="button"
                        className="close"
                        aria-label="Close"
                        onClick={() => setShowShipmentWarning(false)}
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </div>
                    <div className="modal-body custom-modal-body">
                      <p className="mb-2">
                        To create a shipment, at least one package with unshipped
                        items is required.
                      </p>
                      <p className="mb-3 text-muted">
                        No packages or no unshipped packages are currently
                        available for this sales order.
                      </p>
                      <div className="modal-footer-btn">
                        <button
                          type="button"
                          className="btn btn-submit"
                          onClick={() => setShowShipmentWarning(false)}
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </div>
  );
}
