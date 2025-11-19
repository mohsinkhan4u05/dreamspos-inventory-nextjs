"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, MouseEvent } from "react";
import  Table  from "@/core/common/pagination/datatable";
import Link from "next/link";
import { Edit, Eye, PlusCircle } from "react-feather";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import { useStores } from "@/hooks/useStores";
import { storeService } from "@/services/api";

export default function StoreListComponent () {
  const { stores, loading, error, refetch } = useStores({ page: 1, limit: 50 });

  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreCode, setNewStoreCode] = useState("");
  const [newStoreEmail, setNewStoreEmail] = useState("");
  const [newStorePhone, setNewStorePhone] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editStoreId, setEditStoreId] = useState<string | null>(null);
  const [editStoreName, setEditStoreName] = useState("");
  const [editStoreCode, setEditStoreCode] = useState("");
  const [editStoreEmail, setEditStoreEmail] = useState("");
  const [editStorePhone, setEditStorePhone] = useState("");
  const [editStoreActive, setEditStoreActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [deleteStoreId, setDeleteStoreId] = useState<string | null>(null);
  const [deleteStoreName, setDeleteStoreName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const dataSource =
    stores?.data?.map((store) => ({
      id: store.id,
      CustomerName: store.name,
      Customer: store.code,
      Email: store.email || "",
      Phone: store.phone || "",
      Country: store.address || "",
      Code: store.code,
      isActive: store.isActive,
    })) || [];

  const handleOpenEdit = (record: any) => {
    setEditStoreId(record.id);
    setEditStoreName(record.CustomerName || "");
    setEditStoreCode(record.Customer || "");
    setEditStoreEmail(record.Email || "");
    setEditStorePhone(record.Phone || "");
    setEditStoreActive(record.isActive ?? true);
  };

  const handleOpenDelete = (record: any) => {
    setDeleteStoreId(record.id);
    setDeleteStoreName(record.CustomerName || null);
  };

  const handleCreateStore = async () => {
    if (!newStoreName || !newStoreCode) {
      return;
    }

    try {
      setIsCreating(true);
      await storeService.createStore({
        name: newStoreName,
        code: newStoreCode,
        email: newStoreEmail || null,
        phone: newStorePhone || null,
      });
      setNewStoreName("");
      setNewStoreCode("");
      setNewStoreEmail("");
      setNewStorePhone("");
      await refetch();
    } catch (err) {
      console.error("Error creating store:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStore = async () => {
    if (!editStoreId || !editStoreName || !editStoreCode) {
      return;
    }

    try {
      setIsUpdating(true);
      await storeService.updateStore(editStoreId, {
        name: editStoreName,
        code: editStoreCode,
        email: editStoreEmail || null,
        phone: editStorePhone || null,
        isActive: editStoreActive,
      });
      await refetch();
    } catch (err) {
      console.error("Error updating store:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    if (!deleteStoreId) return;

    try {
      setIsDeleting(true);
      await storeService.deleteStore(deleteStoreId);
      await refetch();
    } catch (err) {
      console.error("Error deleting store:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      title: "Store Name",
      dataIndex: "CustomerName",
      sorter: (a:any, b:any) => a.CustomerName.length - b.CustomerName.length,
    },

    {
      title: "Store",
      dataIndex: "Customer",
      sorter: (a:any, b:any) => a.Customer.length - b.Customer.length,
    },

    {
      title: "Email",
      dataIndex: "Email",
      sorter: (a:any, b:any) => a.Email.length - b.Email.length,
    },

    {
      title: "Phone",
      dataIndex: "Phone",
      sorter: (a:any, b:any) => a.Phone.length - b.Phone.length,
    },

    {
      title: "Country",
      dataIndex: "Country",
      sorter: (a:any, b:any) => a.Country.length - b.Country.length,
    },
    {
      title: "Status",
      dataIndex: "Code",
      render: () => (
        <span className={`badge  badge-success d-inline-flex align-items-center badge-xs`}>
          <i className="ti ti-point-filled me-1" />
          Active
        </span>

      ),
      sorter: (a:any, b:any) => a.Code.length - b.Code.length,
    },
    {
      title: "Action",
      dataIndex: "action",
      render: (_: unknown, record: any) => (
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
              data-bs-target="#edit-store"
              onClick={() => handleOpenEdit(record)}
            >
              <Edit className="feather-edit" />
            </Link>

            <Link
              data-bs-toggle="modal"
              data-bs-target="#delete-modal"
              className="p-2 d-flex align-items-center border rounded"
              href="#"
              onClick={() => handleOpenDelete(record)}
            >
              <i data-feather="trash-2" className="feather-trash-2" />
            </Link>
          </div>
        </div>
      ),
      sorter: (a:any, b:any) => a.createdby.length - b.createdby.length,
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
              <h5 className="text-danger">Error loading stores</h5>
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
                <h4>Stores</h4>
                <h6>Manage your Store</h6>
              </div>
            </div>
            <ul className="table-top-head">

              <TooltipIcons />
              <RefreshIcon />
              <CollapesIcon />
            </ul>
            <div className="page-btn">
              <Link href="#" data-bs-toggle="modal" data-bs-target="#add-store" className="btn btn-primary">
                <PlusCircle data-feather="plus-circle" className=" me-2" />
                Add Store
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
                    Select Status
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
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        New Joiners
                      </Link>
                    </li>
                  </ul>
                </div>
               
              </div>
            </div>
            <div className="card-body pb-0">
              <div className=" table-responsive">
                <Table columns={columns} dataSource={dataSource} />
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
      <>
        {/* Add Store */}
        <div className="modal fade" id="add-store">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title">
                  <h4>Add Store</h4>
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
              <form>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">
                      Store Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      User Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={newStoreCode}
                      onChange={(e) => setNewStoreCode(e.target.value)}
                    />
                  </div>
                  <div className="input-blocks mb-3">
                    <label className="form-label">
                      Password <span className="text-danger">*</span>
                    </label>
                    <div className="pass-group">
                      <input type="password" className="form-control pass-input" />
                      <span className="fas toggle-password fa-eye-slash" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={newStoreEmail}
                      onChange={(e) => setNewStoreEmail(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Phone <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={newStorePhone}
                      onChange={(e) => setNewStorePhone(e.target.value)}
                    />
                  </div>
                  <div className="mb-0">
                    <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                      <span className="status-label ">Status</span>
                      <input
                        type="checkbox"
                        id="user2"
                        className="check"
                        defaultChecked
                      />
                      <label htmlFor="user2" className="checktoggle" />
                    </div>
                  </div>
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
                    type="button"
                    data-bs-dismiss="modal"
                    className="btn btn-primary fs-13 fw-medium p-2 px-3"
                    onClick={handleCreateStore}
                    disabled={isCreating}
                  >
                    {isCreating ? "Adding..." : "Add Store"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Add Store */}
        {/* Edit Store */}
        <div className="modal fade" id="edit-store">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title">
                  <h4>Edit Store</h4>
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
              <form >
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">
                      Store Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStoreName}
                      onChange={(e) => setEditStoreName(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      User Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStoreCode}
                      onChange={(e) => setEditStoreCode(e.target.value)}
                    />
                  </div>
                  <div className="input-blocks mb-3">
                    <label className="form-label">
                      Password <span className="text-danger">*</span>
                    </label>
                    <div className="pass-group">
                      <input
                        type="password"
                        className="form-control pass-input"
                        defaultValue="********"
                      />
                      <span className="fas toggle-password fa-eye-slash" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={editStoreEmail}
                      onChange={(e) => setEditStoreEmail(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Phone <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStorePhone}
                      onChange={(e) => setEditStorePhone(e.target.value)}
                    />
                  </div>
                  <div className="mb-0">
                    <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                      <span className="status-label ">Status</span>
                      <input
                        type="checkbox"
                        id="user1"
                        className="check"
                        checked={editStoreActive}
                        onChange={(e) => setEditStoreActive(e.target.checked)}
                      />
                      <label htmlFor="user1" className="checktoggle" />
                    </div>
                  </div>
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
                    type="button"
                    data-bs-dismiss="modal"
                    className="btn btn-primary fs-13 fw-medium p-2 px-3"
                    onClick={handleUpdateStore}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Edit Store */}
      </>

      <div className="modal fade" id="delete-modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content p-5 px-3 text-center">
                <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                  <i className="ti ti-trash fs-24 text-danger" />
                </span>
                <h4 className="fs-20 text-gray-9 fw-bold mb-2 mt-1">
                  Delete Store
                </h4>
                <p className="text-gray-6 mb-0 fs-16">
                  Are you sure you want to delete {deleteStoreName || "this store"}?
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
                    className="btn btn-submit fs-13 fw-medium p-2 px-3"
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

    </>

  );
};

 
