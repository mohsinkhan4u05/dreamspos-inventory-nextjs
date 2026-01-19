"use client";

import React from "react";
import Link from "next/link";
import { useSalesOrders } from "@/hooks/useSalesOrders";
import Table from "@/core/common/pagination/datatable";

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

  const columns = [
    {
      title: "Shipment #",
      dataIndex: "shipmentNumber",
      priority: "always",
      render: (_: any, record: any) => (
        <Link href={`/shipments/${record.shipmentId}`}>
          #{record.shipmentNumber}
        </Link>
      ),
      sorter: (a: any, b: any) =>
        (a.shipmentNumber || "").localeCompare(b.shipmentNumber || ""),
    },
    {
      title: "Date",
      dataIndex: "shipmentDate",
      priority: "desktop",
      render: (value: string | null) =>
        value ? new Date(value).toLocaleDateString() : "-",
      sorter: (a: any, b: any) => {
        const aTime = a.shipmentDate ? new Date(a.shipmentDate).getTime() : 0;
        const bTime = b.shipmentDate ? new Date(b.shipmentDate).getTime() : 0;
        return aTime - bTime;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      priority: "always",
      sorter: (a: any, b: any) =>
        (a.status || "").localeCompare(b.status || ""),
    },
    {
      title: "Sales Order",
      dataIndex: "salesOrderNumber",
      priority: "optional",
      render: (_: any, record: any) => (
        <Link href={`/sales-orders/${record.salesOrderId}`}>
          #{record.salesOrderNumber}
        </Link>
      ),
      sorter: (a: any, b: any) =>
        (a.salesOrderNumber || "").localeCompare(b.salesOrderNumber || ""),
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      priority: "always",
      sorter: (a: any, b: any) =>
        (a.customerName || "").localeCompare(b.customerName || ""),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      priority: "optional",
      mobileHidden: true,
      render: (_: any, record: any) => (
        <div className="text-end">
          <Link
            href={`/shipments/${record.shipmentId}`}
            className="btn btn-outline-primary btn-sm"
          >
            View
          </Link>
        </div>
      ),
    },
  ];

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
              <div className="custom-datatable-filter table-responsive">
                <Table columns={columns} dataSource={rows} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
