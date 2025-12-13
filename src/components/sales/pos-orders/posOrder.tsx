"use client";
/* eslint-disable @next/next/no-img-element */

import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import { DollarSign, Download, Edit, Eye, PlusCircle, Trash2 } from "react-feather";
import Link from "next/link";
import  Table  from "@/core/common/pagination/datatable";
import CommonFooter from "@/core/common/footer/commonFooter";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import OnlineorderModal from "../online-orders/onlineorderModal";
import { useSales, Sale } from "@/hooks/useSales";


export default function PosOrderComponent(){
    const { sales, loading, error, refetch } = useSales({ limit: 100 });

    const mappedData = (sales?.data ?? []).map((sale: Sale) => {
        const statusLabel =
          sale.status.charAt(0) + sale.status.slice(1).toLowerCase();
        const paymentLabel =
          sale.paymentStatus === "PAID"
            ? "Paid"
            : sale.paymentStatus === "PARTIAL"
            ? "Partial"
            : "Unpaid";

        return {
          id: sale.id,
          customer: sale.customer?.name || "Walk-in Customer",
          image: "user-01.jpg",
          reference: sale.invoiceNumber,
          date: new Date(sale.saleDate || sale.createdAt).toLocaleDateString(),
          status: statusLabel,
          total: `$${sale.totalAmount.toFixed(2)}`,
          paid: `$${sale.paidAmount.toFixed(2)}`,
          due: `$${sale.dueAmount.toFixed(2)}`,
          paymentstatus: paymentLabel,
          biller:
              sale.session?.user?.firstName ||
              sale.session?.user?.username ||
              "POS User",
          action: "",
        };
      });

    const dataSource = mappedData;

    interface SalesRow {
      id: string;
      customer: string;
      image: string;
      reference: string;
      date: string;
      status: string;
      total: string;
      paid: string;
      due: string;
      paymentstatus: string;
      biller: string;
      action: string;
      createdby?: string;
    }

    const columns = [
        {
            title: "Customer Name",
            dataIndex: "customer",
            render: (text: string, record: SalesRow) => (
                <div className="d-flex align-items-center">
                    <Link href="#" className="avatar avatar-md me-2">
                        <img src={`assets/img/users/${record.image}`} alt="product" />
                    </Link>
                    <Link href="#">{text}</Link>
                </div>

            ),
            sorter: (a: SalesRow, b: SalesRow) => a.customer.length - b.customer.length,
        },
        {
            title: "Reference",
            dataIndex: "reference",
            sorter: (a: SalesRow, b: SalesRow) => a.reference.length - b.reference.length,
        },
        {
            title: "Date",
            dataIndex: "date",
            sorter: (a: SalesRow, b: SalesRow) => a.date.length - b.date.length,
        },

        {
            title: "Status",
            dataIndex: "status",
            render: (value: string) => (
                <span className={`badge ${value === 'Pending' ? 'badge-cyan' : value === 'Completed' ? 'badge-success' : ''} `}>{value}</span>
            ),
            sorter: (a: SalesRow, b: SalesRow) =>
                a.status.length - b.status.length,
        },
        {
            title: "Grand Total",
            dataIndex: "total",

            sorter: (a: SalesRow, b: SalesRow) => a.total.length - b.total.length,
        },
        {
            title: "Paid",
            dataIndex: "paid",
            sorter: (a: SalesRow, b: SalesRow) => a.paid.length - b.paid.length,
        },
        {
            title: "Due",
            dataIndex: "due",
            sorter: (a: SalesRow, b: SalesRow) => a.due.length - b.due.length,
        },
        {
            title: "Payment Status",
            dataIndex: "paymentstatus",
            render: (value: string) => (
                <span className={`badge badge-xs shadow-none ${value === 'Unpaid' ? 'badge-soft-danger' : value === 'Paid' ? 'badge-soft-success' : 'badge-soft-warning'} `}><i className="ti ti-point-filled me-1"></i>{value}</span>
            ),
            sorter: (a: SalesRow, b: SalesRow) => a.paymentstatus.length - b.paymentstatus.length,
        },
        {
            title: "Biller",
            dataIndex: "biller",
            sorter: (a: SalesRow, b: SalesRow) => a.biller.length - b.biller.length,
        },

        {
            title: "",
            dataIndex: "action",
            render: () => (
                <>
                    <Link
                        className="action-set"
                        href="#"
                        data-bs-toggle="dropdown"
                        aria-expanded="true"
                    >
                        <i className="fa fa-ellipsis-v" aria-hidden="true" />

                    </Link>
                    <ul className="dropdown-menu">
                        <li>
                            <Link
                                href="#"
                                className="dropdown-item"
                                data-bs-toggle="modal"
                                data-bs-target="#sales-details-new"
                            >
                                <Eye className="info-img" />
                                Sale Detail
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="#"
                                className="dropdown-item"
                                data-bs-toggle="modal"
                                data-bs-target="#edit-sales-new"
                            >
                                <Edit className="info-img" />
                                Edit Sale
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="#"
                                className="dropdown-item"
                                data-bs-toggle="modal"
                                data-bs-target="#showpayment"
                            >
                                <DollarSign className="info-img" />
                                Show Payments
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="#"
                                className="dropdown-item"
                                data-bs-toggle="modal"
                                data-bs-target="#createpayment"
                            >
                                <PlusCircle className="info-img" />
                                Create Payment
                            </Link>
                        </li>
                        <li>
                            <Link href="#" className="dropdown-item">
                                <Download className="info-img" />
                                Download pdf
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="#"
                                className="dropdown-item mb-0"
                                data-bs-toggle="modal"
                                data-bs-target="#delete-modal"
                            >
                                <Trash2 className="info-img" />
                                Delete Sale
                            </Link>
                        </li>
                    </ul>
                </>

            ),
            sorter: (a: SalesRow, b: SalesRow) => (a.createdby || "").length - (b.createdby || "").length,
        },
    ];
    return(
        <div>
            <div className="page-wrapper">
                <div className="content">
                    <div className="page-header">
                        <div className="add-item d-flex">
                            <div className="page-title">
                                <h4>POS Orders</h4>
                                <h6>Manage Your pos orders</h6>
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
                                href="#"
                                className="btn btn-primary"
                                data-bs-toggle="modal"
                                data-bs-target="#add-sales-new"
                            >
                              <i className='ti ti-circle-plus me-1'></i> Add Sales
                            </Link>
                        </div>
                    </div>
                    {/* /product list */}
                    <div className="card table-list-card manage-stock">
                        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                            <div className="search-set">
                               
                            </div>
                            <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                                <div className="dropdown me-2">
                                    <Link
                                        href="#"
                                        className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                                        data-bs-toggle="dropdown"
                                    >
                                        Customer
                                    </Link>
                                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Carl Evans
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Minerva Rameriz
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Robert Lamon
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Patricia Lewis
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                                <div className="dropdown me-2">
                                    <Link
                                        href="#"
                                        className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                                        data-bs-toggle="dropdown"
                                    >
                                        Staus
                                    </Link>
                                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Completed
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Pending
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                                <div className="dropdown me-2">
                                    <Link
                                        href="#"
                                        className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                                        data-bs-toggle="dropdown"
                                    >
                                        Payment Status
                                    </Link>
                                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Paid
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Unpaid
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Overdue
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                                <div className="dropdown">
                                    <Link
                                        href="#"
                                        className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                                        data-bs-toggle="dropdown"
                                    >
                                        Sort By : Last 7 Days
                                    </Link>
                                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Recently Added
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Ascending
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Desending
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Last Month
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href="#"
                                                className="dropdown-item rounded-1"
                                            >
                                                Last 7 Days
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="custom-datatable-filter table-responsive">
                                {loading ? (
                                    <p>Loading sales...</p>
                                ) : error ? (
                                    <p className="text-danger">{error}</p>
                                ) : (
                                    <Table columns={columns} dataSource={dataSource} />
                                )}
                            </div>
                        </div>
                    </div>
                    {/* /product list */}
                </div>
                <CommonFooter />
            </div>
            <OnlineorderModal />
            <CommonDeleteModal />
        </div>
    )
}