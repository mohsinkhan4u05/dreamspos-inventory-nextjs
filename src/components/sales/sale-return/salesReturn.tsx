"use client";
/* eslint-disable @next/next/no-img-element */

import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import Link from "next/link";
import Table from "@/core/common/pagination/datatable";
import AddSalesReturns from "@/core/modals/sales/addsalesreturns";
import EditSalesRetuens from "@/core/modals/sales/editsalesretuens";
import { useSalesReturns, SalesReturn } from "@/hooks/useSalesReturns";
import { useOrgFormatting } from "@/hooks/useOrgFormatting";

export default function SalesReturnComponent(){
  const { returns, loading, error, refetch } = useSalesReturns()
  const { formatCurrency, formatDate } = useOrgFormatting()

  const data: SalesReturn[] = returns?.data ?? []

  const columns = [
    {
      title: "Product Name",
      dataIndex: "productname",
      render: (_: unknown, record: SalesReturn) => {
        const firstItem = record.items[0]
        const name = firstItem?.product?.name || firstItem?.variant?.name || "-"
        return (
          <div className="productimgname">
            <Link href="#" className="ms-2">
              {name}
            </Link>
          </div>
        )
      },
      sorter: (a: SalesReturn, b: SalesReturn) => {
        const aName = a.items[0]?.product?.name || ""
        const bName = b.items[0]?.product?.name || ""
        return aName.localeCompare(bName)
      },
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (_: unknown, record: SalesReturn) => {
        const date = record.returnDate || record.createdAt
        return formatDate(date)
      },
      sorter: (a: SalesReturn, b: SalesReturn) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Customer",
      dataIndex: "customer",
      render: (_: unknown, record: SalesReturn) => {
        const name = record.sale?.customer?.name || "-"
        return (
          <div className="d-flex align-items-center">
            <span>{name}</span>
          </div>
        )
      },
      sorter: (a: SalesReturn, b: SalesReturn) => {
        const aName = a.sale?.customer?.name || ""
        const bName = b.sale?.customer?.name || ""
        return aName.localeCompare(bName)
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string) => (
        <div>
          {text === "Received" && (
            <span className="badge badge-success shadow-none">{text}</span>
          )}
          {text === "Pending" && (
            <span className="badge badge-cyan shadow-none">{text}</span>
          )}
          {text === "Ordered" && (
            <span className="badges bg-lightyellow">{text}</span>
          )}
        </div>
      ),
      sorter: (a: SalesReturn, b: SalesReturn) => a.status.localeCompare(b.status),
    },
    {
      title: "Grand Total",
      dataIndex: "grandtotal",
      render: (_: unknown, record: SalesReturn) =>
        formatCurrency(record.totalAmount),
      sorter: (a: SalesReturn, b: SalesReturn) => a.totalAmount - b.totalAmount,
    },
    {
      title: "Paid",
      dataIndex: "paid",
      render: () => "0.00",
      sorter: () => 0,
    },
    {
      title: "Due",
      dataIndex: "due",
      render: (_: unknown, record: SalesReturn) =>
        formatCurrency(record.totalAmount),
      sorter: (a: SalesReturn, b: SalesReturn) => a.totalAmount - b.totalAmount,
    },
    {
      title: "paymentstatus",
      dataIndex: "paymentstatus",
      render: () => {
        const text: string = "Unpaid"
        return (
          <div>
            {text === "Paid" && (
              <span className="badge badge-soft-success badge-xs shadow-none"><i className="ti ti-point-filled me2"></i>{text}</span>
            )}
            {text === "Unpaid" && (
              <span className="badge badge-soft-danger badge-xs shadow-none"><i className="ti ti-point-filled me2"></i>{text}</span>
            )}
            {text === "Partial" && (
              <span className="badge badge-soft-warning badge-xs shadow-none"><i className="ti ti-point-filled me2"></i>{text}</span>
            )}
          </div>
        )
      },
      sorter: () => 0,
    },
    {
      title: "Actions",
      dataIndex: "actions",
      key: "actions",
      render: () => (
        <div className="action-table-data">
          <div className="edit-delete-action">
            <Link
              className="me-2 p-2"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#edit-sales-new"
            >
              <i data-feather="edit" className="feather-edit"></i>
            </Link>
            <Link className="confirm-text p-2" href="#">
              <i
                data-feather="trash-2"
                className="feather-trash-2" data-bs-toggle="modal" data-bs-target="#delete-modal"
              ></i>
            </Link>
          </div>
        </div>
      ),
    },
  ];
    return(
        <div>
        <div className="page-wrapper">
          <div className="content">
            <div className="page-header">
              <div className="add-item d-flex">
                <div className="page-title">
                  <h4>Sales Return</h4>
                  <h6>Manage your returns</h6>
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
                  <i className='ti ti-circle-plus me-1'></i>
                  Add Sales Return
                </Link>
              </div>
            </div>
            {/* /product list */}
            <div className="card table-list-card">
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
                      Status
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
                    <p>Loading sales returns...</p>
                  ) : error ? (
                    <p className="text-danger">{error}</p>
                  ) : (
                    <Table columns={columns} dataSource={data} />
                  )}
                </div>
              </div>
            </div>
            {/* /product list */}
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
  
        <AddSalesReturns onCreated={refetch} />
        <EditSalesRetuens />
        <CommonDeleteModal />
      </div>
    )
}