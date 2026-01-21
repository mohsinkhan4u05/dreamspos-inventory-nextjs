"use client";

import CommonFooter from "@/core/common/footer/commonFooter";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import { Tooltip } from "antd";
import Table from "@/core/common/pagination/datatable";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye } from "react-feather";
import { all_routes } from "@/data/all_routes";
import { useBills, BillListItem } from "@/hooks/useBills";
import { useStores } from "@/hooks/useStores";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useMemo, useState } from "react";
import { useOrgFormatting } from "@/hooks/useOrgFormatting";

export default function PurchaseListComponent() {
  const route = all_routes;

  const { formatCurrency, formatDate } = useOrgFormatting();

  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const searchParams = useSearchParams();
  const purchaseOrderId = searchParams.get("purchaseOrderId") || undefined;
  const purchaseOrderNumber = searchParams.get("purchaseOrderNumber") || undefined;

  const { stores } = useStores({ limit: 100 });
  const { suppliers } = useSuppliers({ limit: 100 });

  const { bills, loading, error, refetch } = useBills({
    limit: 100,
    storeId: selectedStoreId || undefined,
    status: selectedStatus || undefined,
    purchaseOrderId,
    supplierId: selectedSupplierId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const mappedData = useMemo(
    () =>
      (bills?.data || []).map((bill: BillListItem) => {
        const normalizedPaymentStatus =
          bill.paymentStatus?.toUpperCase?.() || "PENDING";
        let paymentStatusLabel = "Unpaid";
        if (normalizedPaymentStatus === "PAID") {
          paymentStatusLabel = "Paid";
        } else if (normalizedPaymentStatus === "PARTIAL") {
          paymentStatusLabel = "Partial";
        } else if (normalizedPaymentStatus === "REFUNDED") {
          paymentStatusLabel = "Refunded";
        } else if (normalizedPaymentStatus === "FAILED") {
          paymentStatusLabel = "Failed";
        }
        return {
          id: bill.id,
          billno: bill.orderNumber,
          supplierId: bill.supplier?.id || null,
          supplierName: bill.supplier?.name || "-",
          date: formatDate(bill.purchaseDate || bill.createdAt),
          status: bill.status || "PENDING",
          total: bill.totalAmount,
          totalFormatted: formatCurrency(bill.totalAmount),
          paid: bill.paidAmount,
          paidFormatted: formatCurrency(bill.paidAmount),
          due: bill.dueAmount,
          dueFormatted: formatCurrency(bill.dueAmount),
          paymentStatus: paymentStatusLabel,
        };
      }),
    [bills?.data, formatCurrency, formatDate],
  );

  interface BillRow {
    id: string;
    billno: string;
    supplierId: string | null;
    supplierName: string;
    date: string;
    status: string;
    total: number;
    totalFormatted: string;
    paid: number;
    paidFormatted: string;
    due: number;
    dueFormatted: string;
    paymentStatus: string;
  }

  const columns = [
    {
      title: "Bill #",
      dataIndex: "billno",
      priority: "always",
      render: (text: string, record: BillRow) => (
        <Link href={`${route.billdetails}?id=${record.id}`}>{text}</Link>
      ),
      sorter: (a: BillRow, b: BillRow) => a.billno.localeCompare(b.billno),
    },
    {
      title: "Supplier",
      dataIndex: "supplierName",
      priority: "always",
      render: (text: string, record: BillRow) => (
        <Link
          href={{
            pathname: route.suppliers,
            query: record.supplierId ? { supplierId: record.supplierId } : undefined,
          }}
        >
          {text}
        </Link>
      ),
      sorter: (a: BillRow, b: BillRow) =>
        a.supplierName.localeCompare(b.supplierName),
    },
    {
      title: "Date",
      dataIndex: "date",
      priority: "desktop",
      sorter: (a: BillRow, b: BillRow) => a.date.localeCompare(b.date),
    },
    {
      title: "Status",
      dataIndex: "status",
      priority: "desktop",
      sorter: (a: BillRow, b: BillRow) => a.status.localeCompare(b.status),
    },
    {
      title: "Total",
      dataIndex: "totalFormatted",
      priority: "always",
      sorter: (a: BillRow, b: BillRow) => a.total - b.total,
    },
    {
      title: "Paid",
      dataIndex: "paidFormatted",
      priority: "optional",
      sorter: (a: BillRow, b: BillRow) => a.paid - b.paid,
    },
    {
      title: "Due",
      dataIndex: "dueFormatted",
      priority: "optional",
      sorter: (a: BillRow, b: BillRow) => a.due - b.due,
    },
    {
      title: "Payment Status",
      dataIndex: "paymentStatus",
      priority: "always",
      render: (text: string) => (
        <div>
          {text === "Paid" && (
            <span className="badge badge-soft-success badge-xs shadow-none">
              <i className="ti ti-point-filled me-1"></i>
              {text}
            </span>
          )}
          {text === "Unpaid" && (
            <span className="badge badge-soft-danger badge-xs shadow-none">
              <i className="ti ti-point-filled me-1"></i>
              {text}
            </span>
          )}
          {text === "Partial" && (
            <span className="badge badge-soft-warning badge-xs shadow-none">
              <i className="ti ti-point-filled me-1"></i>
              {text}
            </span>
          )}
          {text === "Refunded" && (
            <span className="badge badge-soft-secondary badge-xs shadow-none">
              <i className="ti ti-point-filled me-1"></i>
              {text}
            </span>
          )}
          {text === "Failed" && (
            <span className="badge badge-soft-danger badge-xs shadow-none">
              <i className="ti ti-point-filled me-1"></i>
              {text}
            </span>
          )}
        </div>
      ),
      sorter: (a: BillRow, b: BillRow) =>
        a.paymentStatus.localeCompare(b.paymentStatus),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      key: "actions",
      priority: "optional",
      mobileHidden: true,
      render: (_: unknown, record: BillRow) => (
        <div className="action-table-data">
          <div className="edit-delete-action">
            <Tooltip title="View Bill">
              <Link
                className="me-2 p-2 d-flex align-items-center justify-content-between border rounded"
                href={`${route.billdetails}?id=${record.id}`}
              >
                <Eye className="feather-eye" />
              </Link>
            </Tooltip>
          </div>
        </div>
      ),
    },
  ];
  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4>Bills</h4>
                <h6>Manage your vendor bills</h6>
                {purchaseOrderId && (
                  <div className="mt-1 d-flex align-items-center gap-2 small">
                    <span className="badge badge-soft-secondary">
                      Filtered by Purchase Order
                      {" "}
                      {purchaseOrderNumber ? `#${purchaseOrderNumber}` : ""}
                    </span>
                    <Link
                      href={route.purchaselist || "/purchase-list"}
                      className="btn btn-link btn-sm p-0"
                    >
                      Clear filter
                    </Link>
                  </div>
                )}
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
                href={route.billadd || "/bill-add"}
                className="btn btn-primary"
              >
                <i className="ti ti-circle-plus me-1" />
                New Bill
              </Link>
            </div>
          </div>
          {/* /product list */}
          <div className="card table-list-card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <div className="search-set" />
              <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="dropdown me-2">
                  <button
                    type="button"
                    className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Store {selectedStoreId ? " : Selected" : ""}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => setSelectedStoreId("")}
                      >
                        All Stores
                      </button>
                    </li>
                    {stores?.data?.map((store) => (
                      <li key={store.id}>
                        <button
                          type="button"
                          className="dropdown-item rounded-1"
                          onClick={() => setSelectedStoreId(store.id)}
                        >
                          {store.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="dropdown">
                  <button
                    type="button"
                    className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Status {selectedStatus ? ` : ${selectedStatus}` : ""}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => setSelectedStatus("")}
                      >
                        All
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => setSelectedStatus("PAID")}
                      >
                        Paid
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => setSelectedStatus("PENDING")}
                      >
                        Unpaid
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => setSelectedStatus("PARTIAL")}
                      >
                        Partial
                      </button>
                    </li>
                  </ul>
                </div>
                <div className="dropdown ms-2">
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
                {loading ? (
                  <p>Loading bills...</p>
                ) : error ? (
                  <p className="text-danger">{error}</p>
                ) : (
                  <Table columns={columns} dataSource={mappedData} />
                )}
              </div>
            </div>
          </div>
          {/* /product list */}
        </div>
        <CommonFooter />
      </div>
      {/* Legacy static purchase modals are no longer used for real bills */}
      <div className="modal fade" id="delete-modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content p-5 px-3 text-center">
                <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                  <i className="ti ti-trash fs-24 text-danger" />
                </span>
                <h4 className="fs-20 text-gray-9 fw-bold mb-2 mt-1">
                  Delete Product
                </h4>
                <p className="text-gray-6 mb-0 fs-16">
                  Are you sure you want to delete product?
                </p>
                <div className="modal-footer-btn mt-3 d-flex justify-content-center">
                  <button
                    type="button"
                    className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none"
                    data-bs-dismiss="modal"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    data-bs-dismiss="modal"
                    className="btn btn-primary fs-13 fw-medium p-2 px-3"
                  >
                    Yes Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
