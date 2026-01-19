"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import Table from "@/core/common/pagination/datatable";
import { all_routes } from "@/data/all_routes";
import Link from "next/link";
import { useSalesOrders, SalesOrder } from "@/hooks/useSalesOrders";
import { useOrgFormatting } from "@/hooks/useOrgFormatting";

export default function SalesOrderList() {
  const { orders, loading, error, refetch } = useSalesOrders();
  const { formatCurrency, formatDate } = useOrgFormatting();

  const data: SalesOrder[] = orders?.data ?? [];

  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">(
    "ALL",
  );

  const filteredData = useMemo(
    () =>
      data.filter((order) => {
        const s = (order.status || "").toUpperCase();

        if (statusFilter === "OPEN") {
          return s !== "CLOSED" && s !== "CANCELLED";
        }

        if (statusFilter === "CLOSED") {
          return s === "CLOSED" || s === "CANCELLED";
        }

        return true;
      }),
    [data, statusFilter],
  );

  const columns = [
    {
      title: "Date",
      dataIndex: "orderDate",
      priority: "desktop",
      render: (_: unknown, record: SalesOrder) =>
        formatDate(record.orderDate || record.createdAt),
      sorter: (a: SalesOrder, b: SalesOrder) =>
        new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime(),
    },
    {
      title: "Sales Order#",
      dataIndex: "orderNumber",
      priority: "always",
      render: (text: string, record: SalesOrder) => (
        <Link href={`/sales-orders/${record.id}`}>{text}</Link>
      ),
      sorter: (a: SalesOrder, b: SalesOrder) =>
        a.orderNumber.localeCompare(b.orderNumber),
    },
    {
      title: "Reference#",
      dataIndex: "referenceNumber",
      priority: "optional",
      render: (text: string | null | undefined) => text || "-",
      sorter: (a: SalesOrder, b: SalesOrder) =>
        (a.referenceNumber || "").localeCompare(b.referenceNumber || ""),
    },
    {
      title: "Customer Name",
      dataIndex: "customer",
      priority: "always",
      render: (_: unknown, record: SalesOrder) =>
        record.customer?.name || "-",
      sorter: (a: SalesOrder, b: SalesOrder) =>
        (a.customer?.name || "").localeCompare(b.customer?.name || ""),
    },
    {
      title: "Order Status",
      dataIndex: "status",
      priority: "always",
      render: (text: string) => (
        <span className="badge badge-soft-info badge-xs shadow-none">
          <i className="ti ti-point-filled me-1" />
          {text}
        </span>
      ),
      sorter: (a: SalesOrder, b: SalesOrder) =>
        a.status.localeCompare(b.status),
    },
    {
      title: "Payment",
      dataIndex: "paymentStatus",
      priority: "optional",
      render: (_: unknown, record: SalesOrder) => {
        const status = (record.status || "").toUpperCase();
        let label = "Open";
        let cls = "badge badge-soft-warning badge-xs shadow-none";

        if (status === "PARTIALLY_PAID") {
          label = "Partial";
          cls = "badge badge-soft-primary badge-xs shadow-none";
        } else if (status === "CLOSED" || status === "PAID") {
          label = "Closed";
          cls = "badge badge-soft-success badge-xs shadow-none";
        } else if (status === "CANCELLED") {
          label = "Cancelled";
          cls = "badge badge-soft-secondary badge-xs shadow-none";
        }

        return (
          <span className={cls}>
            <i className="ti ti-point-filled me-1" />
            {label}
          </span>
        );
      },
      sorter: (a: SalesOrder, b: SalesOrder) => {
        const rank = (s: string) => {
          const v = (s || "").toUpperCase();
          if (v === "PARTIALLY_PAID") return 1;
          if (v === "CLOSED" || v === "PAID" || v === "CANCELLED") return 2;
          return 0;
        };
        return rank(a.status) - rank(b.status);
      },
    },
    {
      title: "Invoiced",
      dataIndex: "invoiced",
      priority: "optional",
      render: (_: unknown, record: SalesOrder) => {
        const hasInvoice = (record.invoices?.length ?? 0) > 0;
        const text = hasInvoice ? "Yes" : "No";
        const cls = hasInvoice
          ? "badge badge-soft-success badge-xs shadow-none"
          : "badge badge-soft-warning badge-xs shadow-none";
        return (
          <span className={cls}>
            <i className="ti ti-point-filled me-1" />
            {text}
          </span>
        );
      },
      sorter: (a: SalesOrder, b: SalesOrder) =>
        (a.invoices?.length ?? 0) - (b.invoices?.length ?? 0),
    },
    {
      title: "Amount",
      dataIndex: "totalAmount",
      priority: "always",
      render: (_: unknown, record: SalesOrder) =>
        formatCurrency(record.totalAmount),
      sorter: (a: SalesOrder, b: SalesOrder) => a.totalAmount - b.totalAmount,
    },
  ];

  const route = all_routes;

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4>Sales Orders</h4>
                <h6>Manage your sales orders</h6>
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
                href={route.salesorderadd2 || "/sales-orders/add2"}
                className="btn btn-primary"
              >
                <i className="ti ti-circle-plus me-1" />
                New Sales Order
              </Link>
            </div>
          </div>

          <div className="card table-list-card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <div className="search-set" />
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
              <div className="custom-datatable-filter table-responsive">
                {loading ? (
                  <p>Loading sales orders...</p>
                ) : error ? (
                  <p className="text-danger">{error}</p>
                ) : (
                  <Table columns={columns} dataSource={filteredData} />
                )}
              </div>
            </div>
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

