"use client";

import { useState } from "react";
import Link from "next/link";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import CommonFooter from "@/core/common/footer/commonFooter";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import Table from "@/core/common/pagination/datatable";
import { all_routes } from "@/data/all_routes";
import { usePayments } from "@/hooks/usePayments";
import { formatCurrencyINR } from "@/lib/currency";

export default function PaymentsList() {
  const route = all_routes;
  const { payments, loading, error, refetch } = usePayments({ limit: 100 });

  const [statusFilter, setStatusFilter] = useState<string>("");

  const rows = (payments?.data || []).filter((p) => {
    if (!statusFilter) return true;
    return (p.status || "").toUpperCase() === statusFilter.toUpperCase();
  });

  const mappedData = rows.map((payment) => {
    const customerName =
      payment.sale?.customer?.name || "Walk-in Customer";

    return {
      id: payment.id,
      date: new Date(payment.createdAt).toLocaleDateString(),
      paymentno: payment.id.slice(0, 8),
      reference: payment.reference || "-",
      customer: customerName,
      invoiceno: payment.sale?.invoiceNumber || "-",
      mode: payment.paymentMethod,
      amount: formatCurrencyINR(payment.amount),
      amountValue: payment.amount,
      unused: formatCurrencyINR(0),
      unusedValue: 0,
      status: payment.status,
    };
  });

  interface PaymentRow {
    id: string;
    date: string;
    paymentno: string;
    reference: string;
    customer: string;
    invoiceno: string;
    mode: string;
    amount: string;
    amountValue: number;
    unused: string;
    unusedValue: number;
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
        <Link href={`${route.paymentdetails}?id=${record.id}`}>{text}</Link>
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
      title: "Customer",
      dataIndex: "customer",
      sorter: (a: PaymentRow, b: PaymentRow) =>
        a.customer.localeCompare(b.customer),
    },
    {
      title: "Invoice #",
      dataIndex: "invoiceno",
      sorter: (a: PaymentRow, b: PaymentRow) =>
        a.invoiceno.localeCompare(b.invoiceno),
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
      title: "Unused Amount",
      dataIndex: "unused",
      sorter: (a: PaymentRow, b: PaymentRow) =>
        a.unusedValue - b.unusedValue,
    },
  ];

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="page-title">
              <h4>Received Payments</h4>
              <h6>List of all payments received against invoices</h6>
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
              <Link
                href={route.recordpayment || "/record-payment"}
                className="btn btn-primary"
              >
                Record Payment
              </Link>
            </div>
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
