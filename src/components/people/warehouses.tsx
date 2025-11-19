"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, MouseEvent } from "react";
import Select from "react-select";
import  Table  from "@/core/common/pagination/datatable";
import Link from "next/link";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import CommonFooter from "@/core/common/footer/commonFooter";
import { useWarehouses } from "@/hooks/useWarehouses";
import { warehouseService } from "@/services/api";

export default function WareHousesComponent  ()  {
  const { warehouses, loading, error, refetch } = useWarehouses({ page: 1, limit: 50 });

  const [newName, setNewName] = useState("");
  const [newContactPerson, setNewContactPerson] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState("");
  const [newWorkPhone, setNewWorkPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress1, setNewAddress1] = useState("");
  const [newAddress2, setNewAddress2] = useState("");
  const [newCountry, setNewCountry] = useState<string | null>(null);
  const [newStateVal, setNewStateVal] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newZipcode, setNewZipcode] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editWarehouseId, setEditWarehouseId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContactPerson, setEditContactPerson] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editWorkPhone, setEditWorkPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress1, setEditAddress1] = useState("");
  const [editAddress2, setEditAddress2] = useState("");
  const [editCountry, setEditCountry] = useState<string | null>(null);
  const [editStateVal, setEditStateVal] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editZipcode, setEditZipcode] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [deleteWarehouseId, setDeleteWarehouseId] = useState<string | null>(null);
  const [deleteWarehouseName, setDeleteWarehouseName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const options1 = [
    { value: "choose", label: "Choose" },
    { value: "steven", label: "Steven" },
    { value: "gravely", label: "Gravely" },
  ];

  const options2 = [
    { value: "choose", label: "Choose" },
    { value: "uk", label: "United Kingdom" },
    { value: "us", label: "United States" },
  ];

  const dataSource =
    warehouses?.data?.map((w) => ({
      id: w.id,
      warehouse: w.name,
      contactPerson: w.contactPerson || "",
      phone: w.phone || "",
      workPhone: w.workPhone || "",
      email: w.email || "",
      address1: w.address1 || "",
      address2: w.address2 || "",
      country: w.country || "",
      state: w.state || "",
      city: w.city || "",
      zipcode: w.zipcode || "",
      totalProducts: "",
      stock: "",
      qty: "",
      createdOn: (w as any).createdAt ? new Date((w as any).createdAt).toLocaleDateString() : "",
      status: w.isActive ? "Active" : "Inactive",
      isActive: w.isActive,
    })) || [];

  const handleOpenEdit = (record: any) => {
    setEditWarehouseId(record.id);
    setEditName(record.warehouse || "");
    setEditContactPerson(record.contactPerson || null);
    setEditPhone(record.phone || "");
    setEditWorkPhone(record.workPhone || "");
    setEditEmail(record.email || "");
    setEditAddress1(record.address1 || "");
    setEditAddress2(record.address2 || "");
    setEditCountry(record.country || null);
    setEditStateVal(record.state || "");
    setEditCity(record.city || "");
    setEditZipcode(record.zipcode || "");
    setEditActive(record.isActive ?? true);
  };

  const handleOpenDelete = (record: any) => {
    setDeleteWarehouseId(record.id);
    setDeleteWarehouseName(record.warehouse || null);
  };

  const handleCreateWarehouse = async () => {
    if (!newName) return;

    try {
      setIsCreating(true);
      await warehouseService.createWarehouse({
        name: newName,
        contactPerson: newContactPerson || null,
        phone: newPhone || null,
        workPhone: newWorkPhone || null,
        email: newEmail || null,
        address1: newAddress1 || null,
        address2: newAddress2 || null,
        country: newCountry || null,
        state: newStateVal || null,
        city: newCity || null,
        zipcode: newZipcode || null,
      });

      setNewName("");
      setNewContactPerson(null);
      setNewPhone("");
      setNewWorkPhone("");
      setNewEmail("");
      setNewAddress1("");
      setNewAddress2("");
      setNewCountry(null);
      setNewStateVal("");
      setNewCity("");
      setNewZipcode("");

      await refetch();
    } catch (err) {
      console.error("Error creating warehouse:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateWarehouse = async () => {
    if (!editWarehouseId || !editName) return;

    try {
      setIsUpdating(true);
      await warehouseService.updateWarehouse(editWarehouseId, {
        name: editName,
        contactPerson: editContactPerson || null,
        phone: editPhone || null,
        workPhone: editWorkPhone || null,
        email: editEmail || null,
        address1: editAddress1 || null,
        address2: editAddress2 || null,
        country: editCountry || null,
        state: editStateVal || null,
        city: editCity || null,
        zipcode: editZipcode || null,
        isActive: editActive,
      });

      await refetch();
    } catch (err) {
      console.error("Error updating warehouse:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    if (!deleteWarehouseId) return;

    try {
      setIsDeleting(true);
      await warehouseService.deleteWarehouse(deleteWarehouseId);
      await refetch();
    } catch (err) {
      console.error("Error deleting warehouse:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      title: "Warehouse",
      dataIndex: "warehouse",
      sorter: (a:any, b:any) => a.warehouse.length - b.warehouse.length,
    },
    {
      title: "Contact Person",
      dataIndex: "contactPerson",
      render: (text:any,data:any) => (
        <div className="d-flex align-items-center">
          <Link href="#" className="avatar avatar-md">
            <img
              src={`assets/img/warehouse/${data.img}`}
              className="img-fluid rounded-2"
              alt="img"
            />
          </Link>
          <div className="ms-2">
            <p className="mb-0">
              <Link href="#" className="text-default">
                {text}
              </Link>
            </p>
          </div>
        </div>

      ),
      sorter: (a:any, b:any) => a.contactPerson.length - b.contactPerson.length,
    },

    {
      title: "Phone",
      dataIndex: "phone",
      sorter: (a:any, b:any) => a.phone.length - b.phone.length,
    },

    {
      title: "TotalProducts",
      dataIndex: "totalProducts",
      sorter: (a:any, b:any) => a.totalProducts.length - b.totalProducts.length,
    },
    {
      title: "Stock",
      dataIndex: "stock",
      sorter: (a:any, b:any) => a.stock.length - b.stock.length,
    },
    {
      title: "Qty",
      dataIndex: "qty",
      sorter: (a:any, b:any) => a.qty.length - b.qty.length,
    },
    {
      title: "CreatedOn",
      dataIndex: "createdOn",
      sorter: (a:any, b:any) => a.createdOn.length - b.createdOn.length,
    },
    {
      title: "Status",
      dataIndex: "status",
      sorter: (a:any, b:any) => a.status.length - b.status.length,
      render: (text:any) => (
        <span
          className={`badge  d-inline-flex align-items-center badge-xs ${
            text === "Active" ? "badge-success" : "badge-danger"
          }`}
        >
          <i className="ti ti-point-filled me-1"></i>{text}
        </span>
      ),
    },

    {
      title: "Actions",
      dataIndex: "actions",
      key: "actions",
      render: (_: unknown, record: any) => (
        <div className="action-table-data">
          <div className="edit-delete-action">
            <Link
              className="me-2 edit-icon p-2"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#edit-units"
              onClick={() => handleOpenEdit(record)}
            >
              <i data-feather="eye" className="feather-eye"></i>
            </Link>
            <Link
              className="me-2 p-2"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#edit-units"
              onClick={() => handleOpenEdit(record)}
            >
              <i data-feather="edit" className="feather-edit"></i>
            </Link>
            <Link
              className="confirm-text p-2"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#delete-modal"
              onClick={() => handleOpenDelete(record)}
            >
              <i data-feather="trash-2" className="feather-trash-2"></i>
            </Link>
          </div>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
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
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
            <div className="text-center">
              <h5 className="text-danger">Error loading warehouses</h5>
              <p className="text-muted">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4>Warehouses</h4>
                <h6>Manage Your warehouses</h6>
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
                className="btn btn-primary"
                data-bs-toggle="modal"
                data-bs-target="#add-units"
              >
              <i className='ti ti-circle-plus me-1'></i>
                Warehouses
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
                <Table columns={columns} dataSource={dataSource} />
              </div>
            </div>
          </div>
          {/* /product list */}
        </div>
        <CommonFooter />
      </div>
      <div>
        {/* Add Warehouse */}
        <div className="modal fade" id="add-units">
          <div className="modal-dialog modal-dialog-centered custom-modal-two">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content p-0">
                  <div className="modal-header border-0 custom-modal-header">
                    <div className="page-title">
                      <h4>Add Warehouse</h4>
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
                  <div className="modal-body custom-modal-body">
                    <form>
                      <div className="modal-title-head">
                        <h6>
                          <span>
                            <i
                              data-feather="info"
                              className="feather-info me-2"
                            />
                          </span>
                          Warehouse Info
                        </h6>
                      </div>
                      <div className="row">
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Name</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="input-blocks">
                            <label>Contact Person</label>
                            <Select
                              classNamePrefix="react-select"
                              options={options1}
                              value={
                                newContactPerson
                                  ? options1.find((o) => o.label === newContactPerson) ?? null
                                  : null
                              }
                              onChange={(option: any) =>
                                setNewContactPerson(option?.label ?? null)
                              }
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3 war-add">
                            <label className="mb-2">Phone Number</label>
                            <input
                              className="form-control"
                              id="phone"
                              name="phone"
                              type="text"
                              value={newPhone}
                              onChange={(e) => setNewPhone(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Work Phone</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newWorkPhone}
                              onChange={(e) => setNewWorkPhone(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">Email</label>
                            <input
                              type="email"
                              className="form-control"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="modal-title-head">
                          <h6>
                            <span>
                              <i data-feather="map-pin" />
                            </span>
                            Location
                          </h6>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">Address 1</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newAddress1}
                              onChange={(e) => setNewAddress1(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">Address 2</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newAddress2}
                              onChange={(e) => setNewAddress2(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="input-blocks">
                            <label>Country</label>
                            <Select
                              classNamePrefix="react-select"
                              options={options2}
                              value={
                                newCountry
                                  ? options2.find((o) => o.label === newCountry) ?? null
                                  : null
                              }
                              onChange={(option: any) =>
                                setNewCountry(option?.label ?? null)
                              }
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">State</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newStateVal}
                              onChange={(e) => setNewStateVal(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3 mb-0">
                            <label className="form-label">City</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newCity}
                              onChange={(e) => setNewCity(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3 mb-0">
                            <label className="form-label">Zipcode</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newZipcode}
                              onChange={(e) => setNewZipcode(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="modal-footer-btn">
                        <button
                          type="button"
                          className="btn btn-cancel me-2"
                          data-bs-dismiss="modal"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-submit"
                          data-bs-dismiss="modal"
                          onClick={handleCreateWarehouse}
                          disabled={isCreating}
                        >
                          {isCreating ? "Creating..." : "Create Warehouse"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /Add Warehouse */}
        {/* Edit Warehouse */}
        <div className="modal fade" id="edit-units">
          <div className="modal-dialog modal-dialog-centered custom-modal-two">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content p-0">
                  <div className="modal-header border-0 custom-modal-header">
                    <div className="page-title">
                      <h4>Edit Warehouse</h4>
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
                  <div className="modal-body custom-modal-body">
                    <form>
                      <div className="modal-title-head">
                        <h6>
                          <span>
                            <i
                              data-feather="info"
                              className="feather-info me-2"
                            />
                          </span>
                          Warehouse Info
                        </h6>
                      </div>
                      <div className="row">
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Name</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="input-blocks">
                            <label>Contact Person</label>
                            <Select
                              classNamePrefix="react-select"
                              options={options1}
                              value={
                                editContactPerson
                                  ? options1.find((o) => o.label === editContactPerson) ?? null
                                  : null
                              }
                              onChange={(option: any) =>
                                setEditContactPerson(option?.label ?? null)
                              }
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3 war-edit-phone">
                            <label className="mb-2">Phone Number</label>
                            <input
                              className="form-control"
                              id="phone2"
                              name="phone"
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3 war-edit-phone">
                            <label className="form-label">Work Phone</label>
                            <input
                              className="form-control"
                              id="phone3"
                              name="phone"
                              type="text"
                              value={editWorkPhone}
                              onChange={(e) => setEditWorkPhone(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">Email</label>
                            <input
                              type="email"
                              className="form-control"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="modal-title-head">
                          <h6>
                            <span>
                              <i data-feather="map-pin" />
                            </span>
                            Location
                          </h6>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">Address 1</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editAddress1}
                              onChange={(e) => setEditAddress1(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="input-blocks">
                            <label className="form-label">Address 2</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editAddress2}
                              onChange={(e) => setEditAddress2(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="input-blocks">
                            <label>Country</label>
                            <Select
                              classNamePrefix="react-select"
                              options={options2}
                              value={
                                editCountry
                                  ? options2.find((o) => o.label === editCountry) ?? null
                                  : null
                              }
                              onChange={(option: any) =>
                                setEditCountry(option?.label ?? null)
                              }
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">State</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editStateVal}
                              onChange={(e) => setEditStateVal(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3 mb-0">
                            <label className="form-label">City</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editCity}
                              onChange={(e) => setEditCity(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3 mb-0">
                            <label className="form-label">Zipcode</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editZipcode}
                              onChange={(e) => setEditZipcode(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="modal-footer-btn">
                        <button
                          type="button"
                          className="btn btn-cancel me-2"
                          data-bs-dismiss="modal"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-submit"
                          data-bs-dismiss="modal"
                          onClick={handleUpdateWarehouse}
                          disabled={isUpdating}
                        >
                          {isUpdating ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="modal fade" id="delete-modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content p-5 px-3 text-center">
                <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                  <i className="ti ti-trash fs-24 text-danger" />
                </span>
                <h4 className="fs-20 text-gray-9 fw-bold mb-2 mt-1">
                  Delete Warehouse
                </h4>
                <p className="text-gray-6 mb-0 fs-16">
                  Are you sure you want to delete {deleteWarehouseName || "this warehouse"}?
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
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Yes Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

