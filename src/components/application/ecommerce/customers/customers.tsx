"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, MouseEvent, FormEvent } from "react";
import Select from "react-select";
import { Edit, Eye, Trash2 } from "react-feather";
import Link from "next/link";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import Table from "@/core/common/pagination/datatable";
import CommonFooter from "@/core/common/footer/commonFooter";
import { city, countries, state } from "@/core/common/selectOption/selectOption";
import { useCustomers } from "@/hooks/useCustomers";
import { customerService } from "@/services/api";

interface CustomerRow {
  id: string;
  CustomerName: string;
  Code: string;
  Customer: string;
  Email: string;
  Phone: string;
  Country: string;
}

export default function CustomersComponent() {
  const { customers, loading, error, refetch } = useCustomers();

  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [deleteCustomerName, setDeleteCustomerName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const data: CustomerRow[] =
    customers?.data?.map((customer, index) => {
      const name = customer.name;
      return {
        id: customer.id,
        CustomerName: name,
        Code: `CU${(index + 1).toString().padStart(3, "0")}`,
        Customer: name,
        Email: customer.email ?? "",
        Phone: customer.phone ?? "",
        Country: "N/A",
      };
    }) || [];

  const handleCreateCustomer = async (event: MouseEvent<HTMLButtonElement> | FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newFirstName.trim() || !newEmail.trim() || !newPhone.trim()) {
      setCreateError("First name, email, and phone are required");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const name = `${newFirstName} ${newLastName}`.trim();

      await customerService.createCustomer({
        name,
        email: newEmail.trim(),
        phone: newPhone.trim(),
        address: newAddress.trim() || null,
        isActive: newActive,
      });

      await refetch();

      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewPhone("");
      setNewAddress("");
      setNewActive(true);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to add customer"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const openEditCustomer = (record: CustomerRow) => {
    setEditCustomerId(record.id);
    const parts = record.Customer.split(" ");
    setEditFirstName(parts[0] || "");
    setEditLastName(parts.slice(1).join(" ") || "");
    setEditEmail(record.Email);
    setEditPhone(record.Phone);
    setEditAddress("");
    setEditActive(true);
    setUpdateError(null);
  };

  const handleUpdateCustomer = async (event: MouseEvent<HTMLButtonElement> | FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editCustomerId) return;

    if (!editFirstName.trim() || !editEmail.trim() || !editPhone.trim()) {
      setUpdateError("First name, email, and phone are required");
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const name = `${editFirstName} ${editLastName}`.trim();

      await customerService.updateCustomer(editCustomerId, {
        name,
        email: editEmail.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim() || null,
        isActive: editActive,
      });

      await refetch();
    } catch (err) {
      setUpdateError(
        err instanceof Error ? err.message : "Failed to update customer"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeleteCustomer = (record: CustomerRow) => {
    setDeleteCustomerId(record.id);
    setDeleteCustomerName(record.Customer);
    setDeleteError(null);
  };

  const handleDeleteCustomer = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!deleteCustomerId) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await customerService.deleteCustomer(deleteCustomerId);
      await refetch();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete customer"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      title: "Customer Name",
      dataIndex: "Customer",
      sorter: (a: CustomerRow, b: CustomerRow) => a.Customer.length - b.Customer.length,
    },
    {
      title: "Code",
      dataIndex: "Code",
      sorter: (a: CustomerRow, b: CustomerRow) => a.Code.length - b.Code.length,
    },
    {
      title: "Customer",
      dataIndex: "Customer",
      sorter: (a: CustomerRow, b: CustomerRow) => a.Customer.length - b.Customer.length,
    },

    {
      title: "Email",
      dataIndex: "Email",
      sorter: (a: CustomerRow, b: CustomerRow) => a.Email.length - b.Email.length,
    },

    {
      title: "Phone",
      dataIndex: "Phone",
      sorter: (a: CustomerRow, b: CustomerRow) => a.Phone.length - b.Phone.length,
    },

    {
      title: "Country",
      dataIndex: "Country",
      sorter: (a: CustomerRow, b: CustomerRow) => a.Country.length - b.Country.length,
    },

    {
      title: "Action",
      dataIndex: "action",
      render: (_: unknown, record: CustomerRow) => (
        <div className="action-table-data">
          <div className="edit-delete-action">
            <div className="input-block add-lists"></div>

            <Link className="me-2 p-2" href="#">
              <Eye className="feather-view" />
            </Link>

            <Link
              className="me-2 p-2"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#edit-units"
              onClick={() => openEditCustomer(record)}
            >
              <Edit className="feather-edit" />
            </Link>

            <Link
              className="confirm-text p-2"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#delete-modal"
              onClick={() => openDeleteCustomer(record)}
            >
              <Trash2 className="feather-trash-2" />
            </Link>
          </div>
        </div>
      ),
      sorter: () => 0,
    },
  ];

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
              <h5 className="text-danger">Error loading customers</h5>
              <p className="text-muted">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4 className="fw-bold">Customers</h4>
                <h6>Manage your customers</h6>
              </div>
            </div>
            <ul className="table-top-head">
              <TooltipIcons />
              <RefreshIcon />
              <CollapesIcon />
            </ul>
            <div className="page-btn">
              <Link
                href="#"
                className="btn btn-primary text-white"
                data-bs-toggle="modal"
                data-bs-target="#add-units"
              >
              <i className='ti ti-circle-plus me-1'></i>
                Add Customer
              </Link>
            </div>
          </div>
          {/* /product list */}
          <div className="card table-list-card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <div className="search-set"></div>
              <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
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
                        Active
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="#"
                        className="dropdown-item rounded-1"
                      >
                        Inactive
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <Table columns={columns} dataSource={data} />
              </div>
            </div>
          </div>
          {/* /product list */}
        </div>
        <CommonFooter />
      </div>

      <>
        {/* Add Customer */}
        <div className="modal fade" id="add-units">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content">
                  <div className="modal-header">
                    <div className="page-title">
                      <h4>Add Customer</h4>
                    </div>
                    <button
                      type="button"
                      className="close"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                  <div className="modal-body">
                    <form onSubmit={handleCreateCustomer}>
                      <div className="new-employee-field">
                        <div className="profile-pic-upload">
                          <div className="profile-pic">
                            <span>
                              <i
                                data-feather="plus-circle"
                                className="plus-down-add"
                              />{" "}
                              Add Image
                            </span>
                          </div>
                          <div className="mb-3">
                            <div className="image-upload mb-0">
                              <input type="file" />
                              <div className="image-uploads">
                                <h4>Upload Image</h4>
                              </div>
                            </div>
                            <p className="mt-2">JPEG, PNG up to 2 MB</p>
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">
                            First Name<span className="text-danger ms-1">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={newFirstName}
                            onChange={(e) => setNewFirstName(e.target.value)}
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">
                            Last Name<span className="text-danger ms-1">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={newLastName}
                            onChange={(e) => setNewLastName(e.target.value)}
                          />
                        </div>
                        <div className="col-lg-12 mb-3">
                          <label className="form-label">
                            Email<span className="text-danger ms-1">*</span>
                          </label>
                          <input
                            type="email"
                            className="form-control"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                          />
                        </div>
                        <div className="col-lg-12 mb-3">
                          <label className="form-label">
                            Phone<span className="text-danger ms-1">*</span>
                          </label>
                          <input
                            type="tel"
                            className="form-control"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                          />
                        </div>
                        <div className="col-lg-12 mb-3">
                          <label className="form-label">
                            Address<span className="text-danger ms-1">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">
                            City<span className="text-danger ms-1">*</span>
                          </label>
                          <Select
                            classNamePrefix="react-select"
                            options={city}
                            placeholder="Choose"
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">
                            State<span className="text-danger ms-1">*</span>
                          </label>
                          <Select
                            classNamePrefix="react-select"
                            options={state}
                            placeholder="Choose"
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">
                            Country<span className="text-danger ms-1">*</span>
                          </label>
                          <Select
                            classNamePrefix="react-select"
                            options={countries}
                            placeholder="Choose"
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">
                            Postal Code<span className="text-danger ms-1">*</span>
                          </label>
                          <input type="text" className="form-control" />
                        </div>
                        <div className="col-lg-12">
                          <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                            <span className="status-label">Status</span>
                            <input
                              type="checkbox"
                              id="user1"
                              className="check"
                              checked={newActive}
                              onChange={(e) => setNewActive(e.target.checked)}
                            />
                            <label htmlFor="user1" className="checktoggle">
                              {" "}
                            </label>
                          </div>
                        </div>
                      </div>
                      {createError && (
                        <div className="mt-3 alert alert-danger" role="alert">
                          {createError}
                        </div>
                      )}
                    </form>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none"
                      data-bs-dismiss="modal"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary fs-13 fw-medium p-2 px-3"
                      onClick={handleCreateCustomer}
                      disabled={isCreating}
                      data-bs-dismiss={isCreating ? undefined : "modal"}
                    >
                      {isCreating ? "Saving..." : "Add Customer"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /Add Customer */}
        {/* Edit Customer */}
        <div className="modal fade" id="edit-units">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content">
                  <div className="modal-header">
                    <div className="page-title">
                      <h4>Edit Customer</h4>
                    </div>
                    <button
                      type="button"
                      className="close"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                  <div className="modal-body">
                    <form>
                      <div className="new-employee-field">
                        <div className="profile-pic-upload image-field">
                          <div className="profile-pic p-2">
                           <img
                              src="./assets/img/users/user-41.jpg"
                              className="object-fit-cover h-100 rounded-1"
                              alt="user"
                            />
                            <button type="button" className="close rounded-1">
                              <span aria-hidden="true">×</span>
                            </button>
                          </div>
                          <div className="mb-3">
                            <div className="image-upload mb-0">
                              <input type="file" />
                              <div className="image-uploads">
                                <h4>Change Image</h4>
                              </div>
                            </div>
                            <p className="mt-2">JPEG, PNG up to 2 MB</p>
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">
                            First Name<span className="text-danger ms-1">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">
                            Last Name<span className="text-danger ms-1">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                          />
                        </div>
                        <div className="col-lg-12 mb-3">
                          <label className="form-label">
                            Email<span className="text-danger ms-1">*</span>
                          </label>
                          <input
                            type="email"
                            className="form-control"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                          />
                        </div>
                        <div className="col-lg-12 mb-3">
                          <label className="form-label">
                            Phone<span className="text-danger ms-1">*</span>
                          </label>
                          <input
                            type="tel"
                            className="form-control"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                          />
                        </div>
                        <div className="col-lg-12 mb-3">
                          <label className="form-label">
                            Address<span className="text-danger ms-1">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">
                            City<span className="text-danger ms-1">*</span>
                          </label>
                          <Select
                            classNamePrefix="react-select"
                            options={city}
                            placeholder="Choose"
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">
                            State<span className="text-danger ms-1">*</span>
                          </label>
                          <Select
                            classNamePrefix="react-select"
                            options={state}
                            placeholder="Choose"
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">
                            Country<span className="text-danger ms-1">*</span>
                          </label>
                          <Select
                            classNamePrefix="react-select"
                            options={countries}
                            placeholder="Choose"
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">
                            Postal Code<span className="text-danger ms-1">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            defaultValue={90001}
                          />
                        </div>
                        <div className="col-lg-12">
                          <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                            <span className="status-label">Status</span>
                            <input
                              type="checkbox"
                              id="user2"
                              className="check"
                              checked={editActive}
                              onChange={(e) => setEditActive(e.target.checked)}
                            />
                            <label htmlFor="user2" className="checktoggle">
                              {" "}
                            </label>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none"
                      data-bs-dismiss="modal"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary fs-13 fw-medium p-2 px-3"
                      onClick={handleUpdateCustomer}
                      disabled={isUpdating}
                      data-bs-dismiss={isUpdating ? undefined : "modal"}
                    >
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /Edit Customer */}
        {/* delete modal */}
        <div className="modal fade" id="delete-modal">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content p-5 px-3 text-center">
                  <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                    <i className="ti ti-trash fs-24 text-danger" />
                  </span>
                  <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Customer</h4>
                  <p className="mb-0 fs-16">
                    Are you sure you want to delete {deleteCustomerName || "this customer"}?
                  </p>
                  {deleteError && (
                    <div className="mt-3 alert alert-danger" role="alert">
                      {deleteError}
                    </div>
                  )}
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
                      className="btn btn-primary fs-13 fw-medium p-2 px-3"
                      onClick={handleDeleteCustomer}
                      disabled={isDeleting}
                      data-bs-dismiss={isDeleting ? undefined : "modal"}
                    >
                      {isDeleting ? "Deleting..." : "Yes Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>

    </>


  );
};

