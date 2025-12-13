"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { all_routes } from "@/data/all_routes";
import { useShipment } from "@/hooks/useShipment";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ShipmentDetailPage({ params }: PageProps) {
  const resolvedParams = params as unknown as { id: string };
  const { id } = resolvedParams;
  const { shipment, loading, error } = useShipment<any>(id);
  const route = all_routes;
  const router = useRouter();
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  if (loading || !shipment) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>{loading ? "Loading shipment..." : error || "Shipment not found"}</p>
        </div>
      </div>
    );
  }

  const order = shipment.salesOrder;
  const pkg = shipment.package;

  const canConvertToInvoice =
    !!order && !["CANCELLED", "CLOSED"].includes((order as any).status);

  const handleConvertToInvoice = async () => {
    if (!order) return;
    setConvertLoading(true);
    setConvertError(null);

    try {
      const res = await fetch(`/api/sales-orders/${order.id}/convert-to-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shipmentId: shipment.id }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to convert to invoice");
      }

      const invoiceId = data?.invoice?.id as string | undefined;

      if (invoiceId) {
        const target = `${route.invoicedetails}?id=${invoiceId}`;
        router.push(target);
      } else {
        router.push(route.saleslist || "/invoice");
      }
    } catch (err: any) {
      setConvertError(err?.message || "Failed to convert to invoice");
    } finally {
      setConvertLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header d-flex justify-content-between align-items-center">
          <div className="page-title">
            <h4>Shipment #{shipment.shipmentNumber}</h4>
            {order && <h6>Sales Order #{order.orderNumber}</h6>}
          </div>
          {order && canConvertToInvoice && (
            <div className="page-btn">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConvertToInvoice}
                disabled={convertLoading}
              >
                {convertLoading ? "Converting..." : "Convert to Invoice"}
              </button>
            </div>
          )}
        </div>

        {convertError && (
          <p className="text-danger mb-2">{convertError}</p>
        )}

        <div className="card mb-3">
          <div className="card-body d-flex justify-content-between flex-wrap gap-3">
            <div>
              <p className="mb-1">
                <strong>Shipment Date:</strong>{" "}
                {shipment.shipmentDate
                  ? new Date(shipment.shipmentDate).toLocaleDateString()
                  : "-"}
              </p>
              <p className="mb-1">
                <strong>Status:</strong> {shipment.status}
              </p>
              <p className="mb-1">
                <strong>Delivered:</strong> {shipment.delivered ? "Yes" : "No"}
              </p>
            </div>
            <div className="text-end">
              {pkg && (
                <p className="mb-1">
                  <strong>Package:</strong>{" "}
                  <Link href={`/packages/${pkg.id}`}>#{pkg.packageNumber}</Link>
                </p>
              )}
              {order && (
                <>
                  <p className="mb-1">
                    <strong>Sales Order:</strong>{" "}
                    <Link href={`/sales-orders/${order.id}`}>#{order.orderNumber}</Link>
                  </p>
                  <p className="mb-1">
                    <strong>Customer:</strong> {order.customer?.name || "-"}
                  </p>
                </>
              )}
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
                    <th className="text-end">Shipped Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {shipment.items?.map((item: any) => {
                    const soItem = item.salesOrderItem;
                    return (
                      <tr key={item.id}>
                        <td>{soItem?.product?.name || soItem?.productId}</td>
                        <td className="text-end">{item.quantity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Tracking &amp; Notes</h5>
          </div>
          <div className="card-body">
            <p className="mb-1">
              <strong>Carrier:</strong> {shipment.carrier || "-"}
            </p>
            <p className="mb-1">
              <strong>Tracking #:</strong> {shipment.trackingNumber || "-"}
            </p>
            <p className="mb-1">
              <strong>Tracking URL:</strong>{" "}
              {shipment.trackingUrl ? (
                <a href={shipment.trackingUrl} target="_blank" rel="noreferrer">
                  {shipment.trackingUrl}
                </a>
              ) : (
                "-"
              )}
            </p>
            <p className="mb-1">
              <strong>Shipping Charges:</strong> {shipment.shippingCharges?.toFixed?.(2) ?? "0.00"}
            </p>
            <p className="mb-0 mt-2">
              <strong>Notes:</strong>
              <br />
              {shipment.notes || <span className="text-muted">No notes</span>}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <Link href={route.salesorders || "/sales-orders"} className="btn btn-outline-secondary">
            Back to Sales Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
