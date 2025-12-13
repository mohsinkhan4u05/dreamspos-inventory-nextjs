"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePurchaseReceives } from "@/hooks/usePurchaseReceives";
import { useSuppliers } from "@/hooks/useSuppliers";
import { formatCurrencyINR } from "@/lib/currency";

function renderReceiveStatus(status: string) {
  if (!status) return "-";
  const normalized = status.toUpperCase();
  if (normalized === "POSTED") return "Received";
  if (normalized === "DRAFT") return "Draft";
  if (normalized === "CANCELLED") return "Cancelled";
  return status;
}

export default function PurchaseReceivesPage() {
  const searchParams = useSearchParams();
  const purchaseOrderId = searchParams.get("purchaseOrderId") || undefined;
  const purchaseOrderNumber = searchParams.get("purchaseOrderNumber") || undefined;
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { suppliers } = useSuppliers({ limit: 100 });

  const { receives, loading, error } = usePurchaseReceives({
    purchaseOrderId,
    supplierId: selectedSupplierId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const data = receives?.data ?? [];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>Loading purchase receives...</p>
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

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="page-title">
            <h4>Goods Receipt Notes (GRN)</h4>
            <h6>Track purchase receives from suppliers</h6>
            {purchaseOrderId && (
              <div className="mt-1 d-flex align-items-center gap-2 small">
                <span className="badge badge-soft-secondary">
                  Filtered by Purchase Order
                  {" "}
                  {purchaseOrderNumber ? `#${purchaseOrderNumber}` : ""}
                </span>
                <Link
                  href="/purchase-receives"
                  className="btn btn-link btn-sm p-0"
                >
                  Clear filter
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="card table-list-card">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <div className="search-set" />
            <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
              <div className="dropdown">
                <button
                  type="button"
                  className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                  data-bs-toggle="dropdown"
                >
                  Supplier
                  {selectedSupplierId ? " : Selected" : ""}
                </button>
                <ul className="dropdown-menu dropdown-menu-end p-3">
                  <li>
                    <button
                      type="button"
                      className="dropdown-item rounded-1"
                      onClick={() => setSelectedSupplierId("")}
                    >
                      All Suppliers
                    </button>
                  </li>
                  {suppliers?.data?.map((supplier) => (
                    <li key={supplier.id}>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => setSelectedSupplierId(supplier.id)}
                      >
                        {supplier.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="ms-2 d-flex align-items-center gap-2">
                <div className="d-flex align-items-center gap-1">
                  <span className="small text-muted">From</span>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="d-flex align-items-center gap-1">
                  <span className="small text-muted">To</span>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              {data.length === 0 ? (
                <p className="mb-0 text-muted">No purchase receives found.</p>
              ) : (
                <table className="table datanew mb-0">
                  <thead>
                    <tr>
                      <th>GRN #</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Purchase Order</th>
                      <th>Supplier</th>
                      <th>Store</th>
                      <th className="text-end">Amount</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((receive) => (
                      <tr key={receive.id}>
                        <td>
                          <Link href={`/purchase-receives/${receive.id}`}>
                            #{receive.receiveNumber}
                          </Link>
                        </td>
                        <td>
                          {receive.receiveDate
                            ? new Date(receive.receiveDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>{renderReceiveStatus(receive.status)}</td>
                        <td>
                          {receive.purchaseOrder ? (
                            <Link href={`/purchase-orders/${receive.purchaseOrder.id}`}>
                              #{receive.purchaseOrder.orderNumber}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{receive.supplier?.name || "-"}</td>
                        <td>{receive.store?.name || "-"}</td>
                        <td className="text-end">
                          {formatCurrencyINR(receive.totalAmount)}
                        </td>
                        <td className="text-end">
                          <Link
                            href={`/purchase-receives/${receive.id}`}
                            className="btn btn-outline-primary btn-sm"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
