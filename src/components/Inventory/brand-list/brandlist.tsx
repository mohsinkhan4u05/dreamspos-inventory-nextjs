"use client";
/* eslint-disable @next/next/no-img-element */

import CommonFooter from "@/core/common/footer/commonFooter";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import { useBrands } from '@/hooks/useBrands'
import { PlusCircle, X } from "react-feather";
import Link from "next/link";
import Table from "@/core/common/pagination/datatable";
import { useState, MouseEvent } from "react";
import { brandService } from "@/services/api";

export default function BrandListComponent() {
  const { brands, loading, error, refetch } = useBrands();

  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandActive, setNewBrandActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editBrandId, setEditBrandId] = useState<string | null>(null);
  const [editBrandName, setEditBrandName] = useState("");
  const [editBrandActive, setEditBrandActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [deleteBrandId, setDeleteBrandId] = useState<string | null>(null);
  const [deleteBrandName, setDeleteBrandName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreateBrand = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!newBrandName.trim()) {
      setCreateError("Brand name is required");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      await brandService.createBrand({
        name: newBrandName.trim(),
        isActive: newBrandActive,
      });

      await refetch();

      setNewBrandName("");
      setNewBrandActive(true);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create brand"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const openEditBrand = (record: any) => {
    setEditBrandId(record.id);
    setEditBrandName(record.brand);
    setEditBrandActive(record.status === "Active");
    setUpdateError(null);
  };

  const handleUpdateBrand = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!editBrandId) return;

    if (!editBrandName.trim()) {
      setUpdateError("Brand name is required");
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      await brandService.updateBrand(editBrandId, {
        name: editBrandName.trim(),
        isActive: editBrandActive,
      });

      await refetch();
    } catch (err) {
      setUpdateError(
        err instanceof Error ? err.message : "Failed to update brand"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeleteBrand = (record: any) => {
    setDeleteBrandId(record.id);
    setDeleteBrandName(record.brand);
    setDeleteError(null);
  };

  const handleDeleteBrand = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!deleteBrandId) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await brandService.deleteBrand(deleteBrandId);
      await refetch();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete brand"
      );
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Transform API data to match the expected format for the table
  const data = brands?.data?.map((brand) => ({
    id: brand.id,
    brand: brand.name,
    logo: brand.image || "/assets/img/icons/default-brand.png",
    createdon: new Date(brand.createdAt).toLocaleDateString(),
    status: brand.isActive ? "Active" : "Inactive",
  })) || [];

  const columns = [
    {
      title: "Brand",
      dataIndex: "brand",
      sorter: (a: any, b: any) => a.brand.length - b.brand.length,
    },

    {
      title: "Image",
      dataIndex: "logo",
      render: (text: any, record: any) => (
        <span className="productimgname">
          <Link href="#" className="product-img stock-img">
            <img alt="" src={record.logo} />
          </Link>
        </span>
      ),
      sorter: (a: any, b: any) => a.logo.length - b.logo.length,
      width: "5%",
    },
    {
      title: "Created Date",
      dataIndex: "createdon",
      sorter: (a: any, b: any) => a.createdon.length - b.createdon.length,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: any) => (
        <span className="badge table-badge bg-success fw-medium fs-10">
          {text}
        </span>
      ),
      sorter: (a: any, b: any) => a.status.length - b.status.length,
    },
    {
      title: "",
      dataIndex: "actions",
      key: "actions",
      render: (_: any, record: any) => (
        <div className="action-table-data">
          <div className="edit-delete-action">
            <Link
              className="me-2 p-2"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#edit-brand"
              onClick={() => openEditBrand(record)}
            >
              <i data-feather="edit" className="feather-edit"></i>
            </Link>
            <Link
              data-bs-toggle="modal"
              data-bs-target="#delete-brand"
              className="p-2"
              href="#"
              onClick={() => openDeleteBrand(record)}
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
              <h5 className="text-danger">Error loading brands</h5>
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
                <h4 className="fw-bold">Brand</h4>
                <h6>Manage your brands</h6>
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
                data-bs-target="#add-brand"
              >
                <i className="ti ti-circle-plus me-1"></i>
                Add Brand
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
                      <Link href="#" className="dropdown-item rounded-1">
                        Recently Added
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Ascending
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Desending
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Last Month
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Last 7 Days
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive brand-table">
                <Table columns={columns} dataSource={data} />
              </div>
            </div>
          </div>
          {/* /product list */}
        </div>
        <CommonFooter />
      </div>
      <>
        {/* Add Brand */}
        <div className="modal fade" id="add-brand">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content">
                  <div className="modal-header">
                    <div className="page-title">
                      <h4>Add Brand</h4>
                    </div>
                    <button
                      type="button"
                      className="close bg-danger text-white fs-16"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                  <div className="modal-body custom-modal-body new-employee-field">
                    <form>
                      <div className="profile-pic-upload mb-3">
                        <div className="profile-pic brand-pic">
                          <span>
                            <PlusCircle className="plus-down-add" /> Add Image
                          </span>
                        </div>
                        <div>
                          <div className="image-upload mb-0">
                            <input type="file" />
                            <div className="image-uploads">
                              <h4>Upload Image</h4>
                            </div>
                          </div>
                          <p className="mt-2">JPEG, PNG up to 2 MB</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">
                          Brand<span className="text-danger ms-1">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={newBrandName}
                          onChange={(e) => setNewBrandName(e.target.value)}
                        />
                      </div>
                      <div className="mb-0">
                        <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                          <span className="status-label">Status</span>
                          <input
                            type="checkbox"
                            id="user2"
                            className="check"
                            checked={newBrandActive}
                            onChange={(e) => setNewBrandActive(e.target.checked)}
                          />
                          <label htmlFor="user2" className="checktoggle" />
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
                      type="button"
                      className="btn btn-primary fs-13 fw-medium p-2 px-3"
                      onClick={handleCreateBrand}
                      disabled={isCreating}
                      data-bs-dismiss={isCreating ? undefined : "modal"}
                    >
                      {isCreating ? "Saving..." : "Add Brand"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /Add Brand */}
        {/* Edit Brand */}
        <div className="modal fade" id="edit-brand">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content">
                  <div className="modal-header">
                    <div className="page-title">
                      <h4>Edit Brand</h4>
                    </div>
                    <button
                      type="button"
                      className="close bg-danger text-white fs-16"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                  <div className="modal-body custom-modal-body new-employee-field">
                    <form>
                      <div className="profile-pic-upload mb-3">
                        <div className="profile-pic brand-pic">
                          <span>
                            <img
                              src="assets/img/brand/brand-icon-02.png"
                              alt="Img"
                            />
                          </span>
                          <Link href="#" className="remove-photo">
                            <X className="x-square-add" />
                          </Link>
                        </div>
                        <div>
                          <div className="image-upload mb-0">
                            <input type="file" />
                            <div className="image-uploads">
                              <h4>Change Image</h4>
                            </div>
                          </div>
                          <p className="mt-2">JPEG, PNG up to 2 MB</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">
                          Brand<span className="text-danger ms-1">*</span>
                        </label>
                        <input type="text" className="form-control" />
                      </div>
                      <div className="mb-0">
                        <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                          <span className="status-label">Status</span>
                          <input
                            type="checkbox"
                            id="user4"
                            className="check"
                            checked={editBrandActive}
                            onChange={(e) => setEditBrandActive(e.target.checked)}
                          />
                          <label htmlFor="user4" className="checktoggle" />
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
                      type="button"
                      className="btn btn-primary fs-13 fw-medium p-2 px-3"
                      onClick={handleUpdateBrand}
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
        {/* Edit Brand */}

        {/* Delete Brand */}
        <div className="modal fade" id="delete-brand">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content p-5 px-3 text-center">
                  <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                    <i className="ti ti-trash fs-24 text-danger" />
                  </span>
                  <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Brand</h4>
                  <p className="mb-0 fs-16">
                    Are you sure you want to delete {deleteBrandName || 'this brand'}?
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
                      onClick={handleDeleteBrand}
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
        {/* /Delete Brand */}
      </>
    </div>
  );
}
