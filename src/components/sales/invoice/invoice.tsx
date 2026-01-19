"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import CommonFooter from "@/core/common/footer/commonFooter";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import { all_routes } from "@/data/all_routes";
import { Eye, Trash2 } from "react-feather";
import Link from "next/link";
import Table from "@/core/common/pagination/datatable";
import { useSales, Sale } from "@/hooks/useSales";
import { useCustomers } from "@/hooks/useCustomers";
import { formatCurrencyINR } from "@/lib/currency";
import { DatePicker } from "antd";

const { RangePicker } = DatePicker;

export default function InvoiceComponent() {
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined); // paymentStatus code
    const [customerFilter, setCustomerFilter] = useState<string | undefined>(undefined); // customerId
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

    const [pendingStatus, setPendingStatus] = useState<string>(""); // paymentStatus code
    const [pendingCustomer, setPendingCustomer] = useState<string>(""); // customerId
    const [pendingDateRange, setPendingDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

    const { sales, loading, error } = useSales({
      limit: 100,
      startDate: dateRange?.[0]?.toISOString(),
      endDate: dateRange?.[1]?.toISOString(),
      paymentStatus: statusFilter,
      customerId: customerFilter,
    });
    const { customers: customersList } = useCustomers({ page: 1, limit: 1000, isActive: true });
    const route = all_routes;

    const mappedData = (sales?.data ?? []).map((sale: Sale) => {
      const normalizedStatus = sale.paymentStatus?.toUpperCase?.() || "PENDING";
      let statusLabel = "Unpaid";
      if (normalizedStatus === "PAID") {
        statusLabel = "Paid";
      } else if (normalizedStatus === "PARTIAL") {
        statusLabel = "Partial";
      } else if (normalizedStatus === "REFUNDED") {
        statusLabel = "Refunded";
      } else if (normalizedStatus === "FAILED") {
        statusLabel = "Failed";
      }

      const due = sale.saleDate || sale.createdAt;

      return {
        id: sale.id,
        invoiceno: sale.invoiceNumber,
        customer: sale.customer?.name || "Walk-in Customer",
        image: "user-01.jpg",
        duedate: due ? dayjs(due).format("DD-MM-YYYY") : "",
        dueDateValue: due ? new Date(due).getTime() : 0,
        amount: formatCurrencyINR(sale.totalAmount),
        amountValue: sale.totalAmount,
        paid: formatCurrencyINR(sale.paidAmount),
        paidValue: sale.paidAmount,
        amountdue: formatCurrencyINR(sale.dueAmount),
        amountdueValue: sale.dueAmount,
        status: statusLabel,
      };
    });

    const dataSource = mappedData;

    interface InvoiceRow {
      id: string;
      invoiceno: string;
      customer: string;
      customerId?: string | null;
      image: string;
      duedate: string;
      dueDateValue: number;
      amount: string;
      amountValue: number;
      paid: string;
      paidValue: number;
      amountdue: string;
      amountdueValue: number;
      status: string;
    }

    const columns = [
      {
        title: "Invoice No",
        dataIndex: "invoiceno",
        priority: "always",
        render:(text: string, record: InvoiceRow) =>(
          <>
          <Link href={`${route.invoicedetails}?id=${record.id}`}>{text}</Link>
          </>
        ),
        sorter: (a: InvoiceRow, b: InvoiceRow) => a.invoiceno.length - b.invoiceno.length,
      },

      {
        title: "Customer",
        dataIndex: "customer",
        priority: "always",
        render: (text: string, record: InvoiceRow) => (
          <div className="d-flex align-items-center">
            <Link href="#" className="avatar avatar-md">
              <img src={`assets/img/users/${record.image}`} alt="product" />
            </Link>
            <Link href="#" className="ms-2">{text}</Link>
          </div>

        ),
        sorter: (a: InvoiceRow, b: InvoiceRow) => a.customer.length - b.customer.length,
      },
      {
        title: "Due Date",
        dataIndex: "duedate",
        priority: "desktop",
        sorter: (a: InvoiceRow, b: InvoiceRow) => a.duedate.length - b.duedate.length,
      },
      {
        title: "Amount",
        dataIndex: "amount",
        priority: "desktop",
        sorter: (a: InvoiceRow, b: InvoiceRow) => a.amountValue - b.amountValue,
      },
      {
        title: "Paid",
        dataIndex: "paid",
        priority: "optional",
        sorter: (a: InvoiceRow, b: InvoiceRow) => a.paidValue - b.paidValue,
      },
      {
        title: "Amount Due",
        dataIndex: "amountdue",
        priority: "always",
        sorter: (a: InvoiceRow, b: InvoiceRow) => a.amountdueValue - b.amountdueValue,
      },

      {
        title: "Status",
        dataIndex: "status",
        priority: "always",
        render: (text: string) => (
          <div>
            {text === "Paid" && (
              <span className="badge badge-soft-success badge-xs shadow-none"><i className="ti ti-point-filled me-1"></i>{text}</span>
            )}
            {text === "Unpaid" && (
              <span className="badge badge-soft-danger badge-xs shadow-none"><i className="ti ti-point-filled me-1"></i>{text}</span>
            )}
            {text === "Partial" && (
              <span className="badge badge-soft-warning badge-xs shadow-none"><i className="ti ti-point-filled me-1"></i>{text}</span>
            )}
            {text === "Refunded" && (
              <span className="badge badge-soft-secondary badge-xs shadow-none"><i className="ti ti-point-filled me-1"></i>{text}</span>
            )}
            {text === "Failed" && (
              <span className="badge badge-soft-danger badge-xs shadow-none"><i className="ti ti-point-filled me-1"></i>{text}</span>
            )}
          </div>
        ),
        sorter: (a: InvoiceRow, b: InvoiceRow) => a.status.length - b.status.length,
      },
      {
        title: "",
        dataIndex: "action",
        priority: "optional",
        mobileHidden: true,
        render: (_: unknown, record: InvoiceRow) => (
          <div className="edit-delete-action d-flex align-items-center justify-content-center">
            <Link
              className="me-2 p-2 d-flex align-items-center justify-content-between border rounded"
              href={`${route.invoicedetails}?id=${record.id}`}
            >
              <Eye className="feather-eye" />
            </Link>
            <Link
              className="p-2 d-flex align-items-center justify-content-between border rounded"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#delete-modal"
            >
              <Trash2 className="feather-trash-2" />
            </Link>
          </div>

        ),
        sorter: (a: InvoiceRow, b: InvoiceRow) => a.status.length - b.status.length,
      },
    ];

    const allRows: InvoiceRow[] = dataSource.map((row, index) => ({
      ...row,
      customerId: sales?.data?.[index]?.customer?.id ?? null,
    }));

    const uniqueCustomers = useMemo(() => {
      const all = customersList?.data ?? [];
      return all.map((c) => ({ id: c.id, name: c.name || "Unnamed Customer" }));
    }, [customersList]);

    const filteredRows = useMemo(() => {
      // All filtering (customer, status, date) is handled server-side via useSales.
      // This memo simply reflects the current API result.
      return allRows;
    }, [allRows]);

    const summary = useMemo(() => {
      let totalAmount = 0;
      let totalPaid = 0;
      let totalUnpaid = 0;
      let overdue = 0;
      const today = Date.now();

      allRows.forEach((row) => {
        totalAmount += row.amountValue || 0;
        totalPaid += row.paidValue || 0;
        totalUnpaid += row.amountdueValue || 0;

        if (row.amountdueValue > 0 && row.dueDateValue < today) {
          overdue += row.amountdueValue;
        }
      });

      return {
        totalAmount,
        totalPaid,
        totalUnpaid,
        overdue,
      };
    }, [allRows]);

    return (
      <div>
        <div className="page-wrapper">
          <div className="content">
            <div className="page-header">
              <div className="add-item d-flex">
                <div className="page-title">
                  <h4>Invoices</h4>
                  <h6>Manage your stock invoices</h6>
                </div>
              </div>
              <ul className="table-top-head">
                <TooltipIcons />
                <RefreshIcon />
                <CollapesIcon />
              </ul>
            </div>

            {/* Summary cards */}
            <div className="row mb-3">
              <div className="col-xl-3 col-sm-6 col-12 d-flex">
                <div className="card border border-success sale-widget flex-fill">
                  <div className="card-body d-flex align-items-center">
                    <span className="sale-icon bg-success text-white">
                      <i className="ti ti-align-box-bottom-left-filled fs-24" />
                    </span>
                    <div className="ms-2">
                      <p className="fw-medium mb-1">Total Amount</p>
                      <div>
                        <h3>{formatCurrencyINR(summary.totalAmount)}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-xl-3 col-sm-6 col-12 d-flex">
                <div className="card border border-info sale-widget flex-fill">
                  <div className="card-body d-flex align-items-center">
                    <span className="sale-icon bg-info text-white">
                      <i className="ti ti-align-box-bottom-left-filled fs-24" />
                    </span>
                    <div className="ms-2">
                      <p className="fw-medium mb-1">Total Paid</p>
                      <div>
                        <h3>{formatCurrencyINR(summary.totalPaid)}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-xl-3 col-sm-6 col-12 d-flex">
                <div className="card border border-orange sale-widget flex-fill">
                  <div className="card-body d-flex align-items-center">
                    <span className="sale-icon bg-orange text-white">
                      <i className="ti ti-moneybag fs-24" />
                    </span>
                    <div className="ms-2">
                      <p className="fw-medium mb-1">Total Unpaid</p>
                      <div>
                        <h3>{formatCurrencyINR(summary.totalUnpaid)}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-xl-3 col-sm-6 col-12 d-flex">
                <div className="card border border-danger sale-widget flex-fill">
                  <div className="card-body d-flex align-items-center">
                    <span className="sale-icon bg-danger text-white">
                      <i className="ti ti-alert-circle-filled fs-24" />
                    </span>
                    <div className="ms-2">
                      <p className="fw-medium mb-1">Overdue</p>
                      <div>
                        <h3>{formatCurrencyINR(summary.overdue)}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter form */}
            <div className="card border-0 mb-3">
              <div className="card-body pb-1">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStatusFilter(pendingStatus || undefined);
                    setCustomerFilter(pendingCustomer || undefined);
                    const normalizedRange =
                      pendingDateRange && pendingDateRange[0] && pendingDateRange[1]
                        ? [pendingDateRange[0], pendingDateRange[1]]
                        : null;
                    setDateRange(normalizedRange as [Dayjs, Dayjs] | null);
                  }}
                >
                  <div className="row align-items-end">
                    <div className="col-lg-3 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Due Date Range</label>
                        <div className="input-icon-start position-relative">
                          <RangePicker
                            className="form-control datetimepicker"
                            format="DD-MM-YYYY"
                            value={pendingDateRange}
                            onChange={(value) =>
                              setPendingDateRange(
                                value as [Dayjs | null, Dayjs | null] | null,
                              )
                            }
                          />
                          <span className="input-icon-left">
                            <i className="ti ti-calendar" />
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Customer</label>
                        <select
                          className="form-control"
                          value={pendingCustomer}
                          onChange={(e) => setPendingCustomer(e.target.value)}
                        >
                          <option value="">All Customers</option>
                          {uniqueCustomers.map((cust) => (
                            <option key={cust.id} value={cust.id}>
                              {cust.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <select
                          className="form-control"
                          value={pendingStatus}
                          onChange={(e) => setPendingStatus(e.target.value)}
                        >
                          <option value="">All Statuses</option>
                          <option value="PAID">Paid</option>
                          <option value="PENDING">Unpaid</option>
                          <option value="PARTIAL">Partial</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <div className="mb-3">
                        <label className="form-label d-block">&nbsp;</label>
                        <button className="btn btn-primary w-100" type="submit">
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Invoices table */}
            <div className="card table-list-card no-search">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                <div>
                  <h4>Invoices</h4>
                </div>
                <ul className="table-top-head">
                  <TooltipIcons />
                </ul>
              </div>

              <div className="card-body">
                <div className=" table-responsive">
                  {loading ? (
                    <p>Loading invoices...</p>
                  ) : error ? (
                    <p className="text-danger">{error}</p>
                  ) : (
                    <Table columns={columns} dataSource={filteredRows} />
                  )}
                </div>
              </div>
            </div>
            {/* /product list */}
          </div>
          <CommonFooter />
        </div>

        <CommonDeleteModal />
      </div>
    );
  }