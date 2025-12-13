"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import CommonFooter from "@/core/common/footer/commonFooter";
import Table from "@/core/common/pagination/datatable";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import { all_routes } from "@/data/all_routes";
import { usePurchaseOrders, type PurchaseOrder } from "@/hooks/usePurchaseOrders";
import { formatCurrencyINR } from "@/lib/currency";

export default function PurchaseOrderReportComponent() {
  const route = all_routes;
  const { orders, loading, error, refetch } = usePurchaseOrders();
  const data: PurchaseOrder[] = orders?.data ?? [];

  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");

  const filteredData = useMemo(
    () =>
      data.filter((order) => {
        const s = (order.status || "").toUpperCase();

        if (statusFilter === "OPEN") {
          return !["RECEIVED", "BILLED", "CLOSED", "CANCELLED"].includes(s);
        }

        if (statusFilter === "CLOSED") {
          return ["RECEIVED", "BILLED", "CLOSED", "CANCELLED"].includes(s);
        }

        return true;
      }),
    [data, statusFilter],
  );

  const columns = [
    {
      title: "Date",
      dataIndex: "orderDate",
      render: (_: unknown, record: PurchaseOrder) =>
        new Date(record.orderDate || record.createdAt).toLocaleDateString(),
      sorter: (a: PurchaseOrder, b: PurchaseOrder) =>
        new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime(),
    },
    {
      title: "Purchase Order#",
      dataIndex: "orderNumber",
      render: (text: string, record: PurchaseOrder) => (
        <Link href={`/purchase-orders/${record.id}`}>{text}</Link>
      ),
      sorter: (a: PurchaseOrder, b: PurchaseOrder) =>
        a.orderNumber.localeCompare(b.orderNumber),
    },
    {
      title: "Reference#",
      dataIndex: "referenceNumber",
      render: (text: string | null | undefined) => text || "-",
      sorter: (a: PurchaseOrder, b: PurchaseOrder) =>
        (a.referenceNumber || "").localeCompare(b.referenceNumber || ""),
    },
    {
      title: "Supplier Name",
      dataIndex: "supplier",
      render: (_: unknown, record: PurchaseOrder) => record.supplier?.name || "-",
      sorter: (a: PurchaseOrder, b: PurchaseOrder) =>
        (a.supplier?.name || "").localeCompare(b.supplier?.name || ""),
    },
    {
      title: "Order Status",
      dataIndex: "status",
      render: (text: string) => {
        const s = (text || "").toUpperCase();
        let cls = "badge badge-soft-info badge-xs shadow-none";

        if (s === "DRAFT") {
          cls = "badge badge-soft-secondary badge-xs shadow-none";
        } else if (s === "OPEN") {
          cls = "badge badge-soft-primary badge-xs shadow-none";
        } else if (s === "PARTIALLY_RECEIVED" || s === "PARTIALLY_BILLED") {
          cls = "badge badge-soft-warning badge-xs shadow-none";
        } else if (s === "RECEIVED" || s === "BILLED" || s === "CLOSED") {
          cls = "badge badge-soft-success badge-xs shadow-none";
        } else if (s === "CANCELLED") {
          cls = "badge badge-soft-danger badge-xs shadow-none";
        }

        const label = s === "OPEN" ? "Issued" : text;

        return (
          <span className={cls}>
            <i className="ti ti-point-filled me-1" />
            {label}
          </span>
        );
      },
      sorter: (a: PurchaseOrder, b: PurchaseOrder) => a.status.localeCompare(b.status),
    },
    {
      title: "Received",
      dataIndex: "receivedStatus",
      render: (_: unknown, record: PurchaseOrder) => {
        const s = (record.status || "").toUpperCase();
        const isReceived = s === "RECEIVED" || s === "CLOSED";
        return isReceived ? (
          <span className="text-success fw-semibold">YES</span>
        ) : null;
      },
    },
    {
      title: "Billed",
      dataIndex: "billedStatus",
      render: (_: unknown, record: PurchaseOrder) => {
        const s = (record.status || "").toUpperCase();
        const isBilled = s === "BILLED" || s === "CLOSED";
        return isBilled ? (
          <span className="text-success fw-semibold">YES</span>
        ) : null;
      },
    },
    {
      title: "Amount",
      dataIndex: "totalAmount",
      render: (_: unknown, record: PurchaseOrder) =>
        formatCurrencyINR(record.totalAmount),
      sorter: (a: PurchaseOrder, b: PurchaseOrder) => a.totalAmount - b.totalAmount,
    },
  ];

  return (
    <>
      <div>
        <div className="page-wrapper">
          <div className="content">
            <div className="page-header">
              <div className="add-item d-flex">
                <div className="page-title">
                  <h4>Purchase Orders</h4>
                  <h6>Manage your purchase orders</h6>
                </div>
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
              <div className="page-btn">
                <Link
                  href={route.purchaseorderadd || "#"}
                  className="btn btn-primary"
                >
                  <i className="ti ti-circle-plus me-1" />
                  New Purchase Order
                </Link>
              </div>
            </div>
            {/* /product list */}
            <div className="card table-list-card">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                <div className="search-set"></div>
                <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                  <div className="d-flex align-items-center">
                    <span className="me-2">Status:</span>
                    <select
                      className="form-select"
                      style={{ minWidth: 140 }}
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as "ALL" | "OPEN" | "CLOSED")
                      }
                    >
                      <option value="ALL">All</option>
                      <option value="OPEN">Open</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  {loading ? (
                    <p>Loading purchase orders...</p>
                  ) : error ? (
                    <p className="text-danger">{error}</p>
                  ) : (
                    <Table columns={columns} dataSource={filteredData} />
                  )}
                </div>
              </div>
            </div>
            {/* /product list */}
          </div>
          <CommonFooter />
        </div>
      </div>
    </>
  );
}
