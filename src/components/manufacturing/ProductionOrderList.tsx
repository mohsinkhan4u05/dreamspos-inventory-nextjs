"use client";

import { useMemo, useState } from "react";
import Table from "@/core/common/pagination/datatable";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import Link from "next/link";
import { all_routes } from "@/data/all_routes";
import { useProductionOrders, ProductionOrder } from "@/hooks/useProductionOrders";
import { useOrgFormatting } from "@/hooks/useOrgFormatting";
import { productionOrderService } from "@/services/api";
import { Tooltip } from "antd";

export default function ProductionOrderList() {
  const { orders, loading, error, refetch } = useProductionOrders();
  const { formatDate, formatCurrency } = useOrgFormatting();

  const data: ProductionOrder[] = orders?.data ?? [];

  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  >("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredData = useMemo(
    () =>
      data.filter((order) => {
        const s = (order.status || "").toUpperCase();

        if (statusFilter === "DRAFT") {
          return s === "DRAFT";
        }
        if (statusFilter === "IN_PROGRESS") {
          return s === "IN_PROGRESS";
        }
        if (statusFilter === "COMPLETED") {
          return s === "COMPLETED";
        }
        if (statusFilter === "CANCELLED") {
          return s === "CANCELLED";
        }
        return true;
      }),
    [data, statusFilter],
  );

  const handleComplete = async (order: ProductionOrder) => {
    if (order.status === "COMPLETED" || order.status === "CANCELLED") return;

    try {
      setActionLoadingId(order.id);
      setActionError(null);
      await productionOrderService.completeProductionOrder(order.id);
      await refetch();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to complete production order",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (order: ProductionOrder) => {
    if (order.status === "COMPLETED" || order.status === "CANCELLED") return;

    try {
      setActionLoadingId(order.id);
      setActionError(null);
      await productionOrderService.cancelProductionOrder(order.id);
      await refetch();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to cancel production order",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "createdAt",
      priority: "desktop",
      render: (_: unknown, record: ProductionOrder) =>
        formatDate(record.createdAt),
      sorter: (a: ProductionOrder, b: ProductionOrder) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Order#",
      dataIndex: "id",
      priority: "always",
      render: (_: unknown, record: ProductionOrder) => (
        <Link
          href={`${route.manufacturingProductionOrders}/${record.id}`}
        >
          {record.id.slice(-8)}
        </Link>
      ),
      sorter: (a: ProductionOrder, b: ProductionOrder) =>
        a.id.localeCompare(b.id),
    },
    {
      title: "Finished Product",
      dataIndex: "finishedProduct",
      priority: "always",
      render: (_: unknown, record: ProductionOrder) =>
        record.finishedProduct?.name || "-",
      sorter: (a: ProductionOrder, b: ProductionOrder) =>
        (a.finishedProduct?.name || "").localeCompare(b.finishedProduct?.name || ""),
    },
    {
      title: "Store",
      dataIndex: "store",
      priority: "optional",
      render: (_: unknown, record: ProductionOrder) => record.store?.name || "-",
      sorter: (a: ProductionOrder, b: ProductionOrder) =>
        (a.store?.name || "").localeCompare(b.store?.name || ""),
    },
    {
      title: "Planned Qty",
      dataIndex: "quantityPlanned",
      priority: "always",
      render: (value: number) => value,
      sorter: (a: ProductionOrder, b: ProductionOrder) =>
        a.quantityPlanned - b.quantityPlanned,
    },
    {
      title: "Produced Qty",
      dataIndex: "quantityProduced",
      priority: "optional",
      render: (_: unknown, record: ProductionOrder) => record.quantityProduced ?? "-",
      sorter: (a: ProductionOrder, b: ProductionOrder) =>
        (a.quantityProduced || 0) - (b.quantityProduced || 0),
    },
    {
      title: "Status",
      dataIndex: "status",
      priority: "always",
      render: (text: string) => (
        <span className="badge badge-soft-info badge-xs shadow-none">
          <i className="ti ti-point-filled me-1" />
          {text}
        </span>
      ),
      sorter: (a: ProductionOrder, b: ProductionOrder) =>
        a.status.localeCompare(b.status),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      priority: "optional",
      mobileHidden: true,
      render: (_: unknown, record: ProductionOrder) => {
        const disabled =
          actionLoadingId === record.id ||
          record.status === "COMPLETED" ||
          record.status === "CANCELLED";

        return (
          <div className="d-flex gap-2">
            <Tooltip title="Mark this production order as completed">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={disabled}
                onClick={() => handleComplete(record)}
              >
                Complete
              </button>
            </Tooltip>
            <Tooltip title="Cancel this production order">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={disabled}
                onClick={() => handleCancel(record)}
              >
                Cancel
              </button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  const route = all_routes;

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
            <div className="text-center">
              <h5 className="text-danger">Error loading production orders</h5>
              <p className="text-muted">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Production Orders</h4>
              <h6>Manage your production orders</h6>
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
              href={route.productlist || "/product-list"}
              className="btn btn-outline-primary me-2"
            >
              <i className="ti ti-box me-1" />
              Go to Items
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
                  style={{ minWidth: 160 }}
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as
                        | "ALL"
                        | "DRAFT"
                        | "IN_PROGRESS"
                        | "COMPLETED"
                        | "CANCELLED",
                    )
                  }
                >
                  <option value="ALL">All</option>
                  <option value="DRAFT">Draft</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card-body">
            {actionError && (
              <p className="text-danger mb-2">{actionError}</p>
            )}
            <div className="custom-datatable-filter table-responsive">
              <Table columns={columns} dataSource={filteredData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
