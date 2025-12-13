"use client";

import React from "react";
import Link from "next/link";
import { useSalesOrders } from "@/hooks/useSalesOrders";

export default function ShipmentsListPage() {
  const { orders, loading, error } = useSalesOrders({});

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>Loading shipments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p className="text-danger">{error}</p>
        </div>
      </div>
    );
  }

  // Flatten shipments from all orders (simple initial implementation)
  const rows: Array<{
    shipmentId: string;
    shipmentNumber: string;
    shipmentDate: string | null;
    status: string;
    salesOrderId: string;
    salesOrderNumber: string;
    customerName: string;
  }> = [];

  (orders?.data || []).forEach((order) => {
    (order.packages || []).forEach((pkg) => {
      (pkg.shipments || []).forEach((sh) => {
        rows.push({
          shipmentId: sh.id,
          shipmentNumber: sh.shipmentNumber,
          shipmentDate: sh.shipmentDate,
          status: sh.status,
          salesOrderId: order.id,
          salesOrderNumber: order.orderNumber,
          customerName: order.customer?.name || "-",
        });
      });
    });
  });

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="page-title">
            <h4>Shipments</h4>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {rows.length === 0 ? (
              <p className="mb-0 text-muted">No shipments found.</p>
            ) : (
              <div className="table-responsive">
                <table className="table datanew mb-0">
                  <thead>
                    <tr>
                      <th>Shipment #</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Sales Order</th>
                      <th>Customer</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.shipmentId}>
                        <td>
                          <Link href={`/shipments/${row.shipmentId}`}>
                            #{row.shipmentNumber}
                          </Link>
                        </td>
                        <td>
                          {row.shipmentDate
                            ? new Date(row.shipmentDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>{row.status}</td>
                        <td>
                          <Link href={`/sales-orders/${row.salesOrderId}`}>
                            #{row.salesOrderNumber}
                          </Link>
                        </td>
                        <td>{row.customerName}</td>
                        <td className="text-end">
                          <Link
                            href={`/shipments/${row.shipmentId}`}
                            className="btn btn-outline-primary btn-sm"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
