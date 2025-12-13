"use client";

import { useState } from "react";
import Link from "next/link";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import CommonFooter from "@/core/common/footer/commonFooter";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import Table from "@/core/common/pagination/datatable";
import { usePurchasePayments } from "@/hooks/usePurchasePayments";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useOrgFormatting } from "@/hooks/useOrgFormatting";
import { all_routes } from "@/data/all_routes";

export default function PurchasePaymentsList() {
  const route = all_routes;
  const { formatCurrency, formatDate } = useOrgFormatting();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { suppliers } = useSuppliers({ limit: 100 });

  const { payments, loading, error, refetch } = usePurchasePayments({
    limit: 100,
    status: statusFilter || undefined,
    supplierId: selectedSupplierId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const rows = (payments?.data || []).filter((p) => {
    if (!statusFilter) return true;
    return (p.status || "").toUpperCase() === statusFilter.toUpperCase();
  });

  const mappedData = rows.map((payment) => {
    const supplierName = payment.purchase?.supplier?.name || "-";
    const storeName = payment.purchase?.store?.name || "-";

    return {
      id: payment.id,
      date: formatDate(payment.createdAt),
      paymentno: payment.id.slice(0, 8),
      reference: payment.reference || "-",
      supplier: supplierName,
      billno: payment.purchase?.orderNumber || "-",
      store: storeName,
      mode: payment.paymentMethod,
      amount: formatCurrency(payment.amount),
      amountValue: payment.amount,
      status: payment.status,
    };
  });

  interface PaymentRow {
    id: string;
    date: string;
    paymentno: string;
    reference: string;
    supplier: string;
    billno: string;
    store: string;
    mode: string;
    amount: string;
    amountValue: number;
    status: string;
  }

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      sorter: (a: PaymentRow, b: PaymentRow) => a.date.localeCompare(b.date),
    },
    {
      title: "Payment #",
      dataIndex: "paymentno",
      render: (text: string, record: PaymentRow) => (
        <Link
          href={`${route.purchasepaymentdetails || "/purchase-payment-details"}?id=${record.id}` +
            `${statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ""}` +
            `${selectedSupplierId ? `&supplierId=${encodeURIComponent(selectedSupplierId)}` : ""}` +
            `${startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""}` +
            `${endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""}`}
        >
          {text}
        </Link>
      ),
      sorter: (a: PaymentRow, b: PaymentRow) =>
        a.paymentno.localeCompare(b.paymentno),
    },
    {
      title: "Reference #",
      dataIndex: "reference",
      sorter: (a: PaymentRow, b: PaymentRow) =>
        a.reference.localeCompare(b.reference),
    },
    {
      title: "Supplier",
      dataIndex: "supplier",
      sorter: (a: PaymentRow, b: PaymentRow) =>
        a.supplier.localeCompare(b.supplier),
    },
    {
      title: "Bill #",
      dataIndex: "billno",
      sorter: (a: PaymentRow, b: PaymentRow) =>
        a.billno.localeCompare(b.billno),
    },
    {
      title: "Store",
      dataIndex: "store",
      sorter: (a: PaymentRow, b: PaymentRow) =>
        a.store.localeCompare(b.store),
    },
    {
      title: "Mode",
      dataIndex: "mode",
      sorter: (a: PaymentRow, b: PaymentRow) => a.mode.localeCompare(b.mode),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      sorter: (a: PaymentRow, b: PaymentRow) => a.amountValue - b.amountValue,
    },
    {
      title: "Status",
      dataIndex: "status",
      sorter: (a: PaymentRow, b: PaymentRow) => a.status.localeCompare(b.status),
    },
  ];

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="page-title">
              <h4>Payments Made</h4>
              <h6>List of all payments made against supplier bills</h6>
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
          </div>

          <div className="card table-list-card no-search">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <div className="search-set" />
              <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="dropdown me-2">
                  <button
                    type="button"
                    className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Status
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => setStatusFilter("")}
                      >
                        All
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => setStatusFilter("PAID")}
                      >
                        Paid
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => setStatusFilter("PARTIAL")}
                      >
                        Partial
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => setStatusFilter("PENDING")}
                      >
                        Pending
                      </button>
                    </li>
                  </ul>
                </div>
                <div className="dropdown me-2">
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
                  <p>Loading payments...</p>
                ) : error ? (
                  <p className="text-danger">{error}</p>
                ) : (
                  <Table columns={columns} dataSource={mappedData} />
                )}
              </div>
            </div>
          </div>
        </div>
        <CommonFooter />
      </div>

      <CommonDeleteModal />
    </div>
  );
}
