"use client";
/* eslint-disable @next/next/no-img-element */

import CommonFooter from "@/core/common/footer/commonFooter";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import { Edit, Eye, Trash2 } from "react-feather";
import Link from "next/link";
import React, { useState, MouseEvent, FormEvent } from "react";
import Table from "@/core/common/pagination/datatable";
import Select from "react-select";
import { useBillers } from "@/hooks/useBillers";
import { billerService } from "@/services/api";

interface BillerRow {
  id: string;
  Code: string;
  Biller: string;
  Company_Name: string;
  Email: string;
  Phone: string;
  Phone_2: string;
  Country: string;
  image: string;
  address: string;
  postalCode: string;
  isActive: boolean;
}

export default function BillerComponent() {
  const { billers, loading, error, refetch } = useBillers();

  const countries = [
    { label: "Choose Country", value: "" },
    { label: "India", value: "India" },
    { label: "USA", value: "USA" },
  ];
  const city = [
    { label: "Choose Country", value: "" },
    { label: "United Kingdom", value: "United Kingdom" },
    { label: "United State", value: "United State" },
  ];
  const state = [
    { label: "Choose Country", value: "" },
    { label: "United Kingdom", value: "United Kingdom" },
    { label: "United State", value: "United State" },
  ];

  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPostalCode, setNewPostalCode] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editBillerId, setEditBillerId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [deleteBillerId, setDeleteBillerId] = useState<string | null>(null);
  const [deleteBillerName, setDeleteBillerName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const data: BillerRow[] =
    billers?.data?.map((biller, index) => {
      const name = biller.name;
      return {
        id: biller.id,
        Code: `BI${(index + 1).toString().padStart(3, "0")}`,
        Biller: name,
        Company_Name: biller.company ?? "",
        Email: biller.email ?? "",
        Phone: biller.phone ?? "",
        Phone_2: biller.country ?? "",
        Country: biller.isActive ? "Active" : "Inactive",
        image: "user-30.jpg",
        address: biller.address ?? "",
        postalCode: biller.postalCode ?? "",
        isActive: biller.isActive,
      };
    }) || [];

  const handleCreateBiller = async (
    event: MouseEvent<HTMLButtonElement> | FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!newFirstName.trim() || !newEmail.trim() || !newPhone.trim()) {
      setCreateError("First name, email, and phone are required");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const name = `${newFirstName} ${newLastName}`.trim();

      await billerService.createBiller({
        name,
        company: newCompany.trim() || null,
        email: newEmail.trim(),
        phone: newPhone.trim(),
        address: newAddress.trim() || null,
        postalCode: newPostalCode.trim() || null,
        isActive: newActive,
      });

      await refetch();

      setNewFirstName("");
      setNewLastName("");
      setNewCompany("");
      setNewEmail("");
      setNewPhone("");
      setNewAddress("");
      setNewPostalCode("");
      setNewActive(true);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to add biller",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const openEditBiller = (record: BillerRow) => {
    setEditBillerId(record.id);
    const parts = record.Biller.split(" ");
    setEditFirstName(parts[0] || "");
    setEditLastName(parts.slice(1).join(" ") || "");
    setEditCompany(record.Company_Name);
    setEditEmail(record.Email);
    setEditPhone(record.Phone);
    setEditAddress(record.address);
    setEditPostalCode(record.postalCode);
    setEditActive(record.isActive);
    setUpdateError(null);
  };

  const handleUpdateBiller = async (
    event: MouseEvent<HTMLButtonElement> | FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editBillerId) return;

    if (!editFirstName.trim() || !editEmail.trim() || !editPhone.trim()) {
      setUpdateError("First name, email, and phone are required");
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const name = `${editFirstName} ${editLastName}`.trim();

      await billerService.updateBiller(editBillerId, {
        name,
        company: editCompany.trim() || null,
        email: editEmail.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim() || null,
        postalCode: editPostalCode.trim() || null,
        isActive: editActive,
      });

      await refetch();
    } catch (err) {
      setUpdateError(
        err instanceof Error ? err.message : "Failed to update biller",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeleteBiller = (record: BillerRow) => {
    setDeleteBillerId(record.id);
    setDeleteBillerName(record.Biller);
    setDeleteError(null);
  };

  const handleDeleteBiller = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!deleteBillerId) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await billerService.deleteBiller(deleteBillerId);
      await refetch();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete biller",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      title: "Code",
      dataIndex: "Code",
      sorter: (a: BillerRow, b: BillerRow) => a.Code.length - b.Code.length,
    },
    {
      title: "Biller",
      dataIndex: "Biller",
      render: (text: string, render: BillerRow) => (
        <>
          <div className="d-flex align-items-center">
            <Link href="#" className="avatar avatar-md me-2">
              <img
                src={`assets/img/users/${render.image}`}
                alt="product"
              />
            </Link>
            <Link href="#">{text}</Link>
          </div>
        </>
      ),
      sorter: (a: BillerRow, b: BillerRow) => a.Biller.length - b.Biller.length,
    },

    {
      title: "Company Name",
      dataIndex: "Company_Name",
      sorter: (a: BillerRow, b: BillerRow) =>
        a.Company_Name.length - b.Company_Name.length,
    },

    {
      title: "Email",
      dataIndex: "Email",
      sorter: (a: BillerRow, b: BillerRow) => a.Email.length - b.Email.length,
    },

    {
      title: "Phone",
      dataIndex: "Phone",
      sorter: (a: BillerRow, b: BillerRow) => a.Phone.length - b.Phone.length,
    },
    {
      title: "Phone",
      dataIndex: "Phone",
      sorter: (a: BillerRow, b: BillerRow) => a.Phone_2.length - b.Phone_2.length,
    },

    {
      title: "Country",
      dataIndex: "Country",
      render: (text: string) => (
        <>
          <span
            className={`d-inline-flex align-items-center p-1 pe-2 rounded-1 text-white  fs-10 ${
              text === "Active" ? "bg-success" : "bg-danger"
            }`}
          >
            <i className="ti ti-point-filled me-1 fs-11" />
            {text}
          </span>
        </>
      ),
      sorter: (a: BillerRow, b: BillerRow) => a.Country.length - b.Country.length,
    },

    {
      title: "Action",
      dataIndex: "action",
      render: (_: unknown, record: BillerRow) => (
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
              onClick={() => openEditBiller(record)}
            >
              <Edit className="feather-edit" />
            </Link>

            <Link
              className="confirm-text p-2"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#delete-modal"
              onClick={() => openDeleteBiller(record)}
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
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ height: "400px" }}
          >
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
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ height: "400px" }}
          >
            <div className="text-center">
              <h5 className="text-danger">Error loading billers</h5>
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
                <h4 className="fw-bold">Billers</h4>
                <h6>Manage your billers</h6>
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
                <i className="ti ti-circle-plus me-1"></i>
                Add Biller
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
                      <Link href="#" className="dropdown-item rounded-1">
                        Active
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Inactive
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <Table
                  columns={columns}
                  dataSource={data}
                  rowKey={(record: BillerRow) => record.id}
                />
              </div>
            </div>
          </div>
          {/* /product list */}
        </div>
        <CommonFooter />
      </div>

      {/* Add biller */}
      <div className="modal fade" id="add-units">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content">
                <div className="modal-header">
                  <div className="page-title">
                    <h4>Add Biller</h4>
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
                  <form onSubmit={handleCreateBiller}>
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
                          Company Name
                          <span className="text-danger ms-1">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={newCompany}
                          onChange={(e) => setNewCompany(e.target.value)}
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
                        <input
                          type="text"
                          className="form-control"
                          value={newPostalCode}
                          onChange={(e) => setNewPostalCode(e.target.value)}
                        />
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
                    onClick={handleCreateBiller}
                    disabled={isCreating}
                    data-bs-dismiss={isCreating ? undefined : "modal"}
                  >
                    {isCreating ? "Saving..." : "Add Biller"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Add biller */}
      {/* Edit biller */}
      <div className="modal fade" id="edit-units">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content">
                <div className="modal-header">
                  <div className="page-title">
                    <h4>Edit Biller</h4>
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
                  <form onSubmit={handleUpdateBiller}>
                    <div className="new-employee-field">
                      <div className="profile-pic-upload image-field">
                        <div className="profile-pic p-2">
                          <img
                            src="./assets/img/users/user-46.png"
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
                          Company Name
                          <span className="text-danger ms-1">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={editCompany}
                          onChange={(e) => setEditCompany(e.target.value)}
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
                          value={editPostalCode}
                          onChange={(e) => setEditPostalCode(e.target.value)}
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
                    {updateError && (
                      <div className="mt-3 alert alert-danger" role="alert">
                        {updateError}
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
                    onClick={handleUpdateBiller}
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
      {/* /Edit biller */}
      {/* delete modal */}
      <div className="modal fade" id="delete-modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content p-5 px-3 text-center">
                <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                  <i className="ti ti-trash fs-24 text-danger" />
                </span>
                <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Biller</h4>
                <p className="mb-0 fs-16">
                  Are you sure you want to delete {deleteBillerName || "biller"}?
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
                    onClick={handleDeleteBiller}
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
  );
};


