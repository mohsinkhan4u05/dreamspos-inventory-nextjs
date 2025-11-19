"use client";
/* eslint-disable @next/next/no-img-element */

import CommonFooter from "@/core/common/footer/commonFooter";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import Link from "next/link";
import Table from "@/core/common/pagination/datatable";
import { useUnits } from "@/hooks/useUnits";
import { useState, MouseEvent } from "react";
import { unitService } from "@/services/api";

interface UnitRow {
  id: string;
  unit: string;
  shortname: string;
  noofproducts: number;
  createdon: string;
  status: string;
}

export default function UnitsComponent() {
  const { units, loading, error, refetch } = useUnits();

  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitCode, setNewUnitCode] = useState("");
  const [newUnitActive, setNewUnitActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editUnitId, setEditUnitId] = useState<string | null>(null);
  const [editUnitName, setEditUnitName] = useState("");
  const [editUnitCode, setEditUnitCode] = useState("");
  const [editUnitActive, setEditUnitActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [deleteUnitName, setDeleteUnitName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreateUnit = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!newUnitName.trim() || !newUnitCode.trim()) {
      setCreateError("Unit name and short name are required");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      await unitService.createUnit({
        name: newUnitName.trim(),
        code: newUnitCode.trim(),
        isActive: newUnitActive,
      });

      await refetch();

      setNewUnitName("");
      setNewUnitCode("");
      setNewUnitActive(true);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create unit"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const openEditUnit = (record: UnitRow) => {
    setEditUnitId(record.id);
    setEditUnitName(record.unit);
    setEditUnitCode(record.shortname);
    setEditUnitActive(record.status === "Active");
    setUpdateError(null);
  };

  const handleUpdateUnit = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!editUnitId) return;

    if (!editUnitName.trim() || !editUnitCode.trim()) {
      setUpdateError("Unit name and short name are required");
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      await unitService.updateUnit(editUnitId, {
        name: editUnitName.trim(),
        code: editUnitCode.trim(),
        isActive: editUnitActive,
      });

      await refetch();
    } catch (err) {
      setUpdateError(
        err instanceof Error ? err.message : "Failed to update unit"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeleteUnit = (record: UnitRow) => {
    setDeleteUnitId(record.id);
    setDeleteUnitName(record.unit);
    setDeleteError(null);
  };

  const handleDeleteUnit = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!deleteUnitId) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await unitService.deleteUnit(deleteUnitId);
      await refetch();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete unit"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const data: UnitRow[] =
    units?.data?.map((unit) => ({
      id: unit.id,
      unit: unit.name,
      shortname: unit.code,
      noofproducts: unit._count?.products ?? 0,
      createdon: new Date(unit.createdAt).toLocaleDateString(),
      status: unit.isActive ? "Active" : "Inactive",
    })) || [];

  const columns = [
    {
      title: "Unit",
      dataIndex: "unit",
      sorter: (a: any, b: any) => a.unit.length - b.unit.length,
    },
    {
      title: "Short Name",
      dataIndex: "shortname",
      sorter: (a: any, b: any) => a.shortname.length - b.shortname.length,
    },

    {
      title: "No of Products",
      dataIndex: "noofproducts",
      sorter: (a: UnitRow, b: UnitRow) => a.noofproducts - b.noofproducts,
    },
    {
      title: "Created Date",
      dataIndex: "createdon",
      sorter: (a: UnitRow, b: UnitRow) => a.createdon.localeCompare(b.createdon),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string) => (
        <span className="badge table-badge bg-success fw-medium fs-10">
          {text}
        </span>
      ),
      sorter: (a: UnitRow, b: UnitRow) => a.status.length - b.status.length,
    },

    {
      title: "",
      dataIndex: "actions",
      key: "actions",
      render: (_: unknown, record: UnitRow) => (
        <div className="action-table-data">
          <div className="edit-delete-action">
            <Link
              className="me-2 p-2"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#edit-units"
              onClick={() => openEditUnit(record)}
            >
              <i data-feather="edit" className="feather-edit"></i>
            </Link>
            <Link
              data-bs-toggle="modal"
              data-bs-target="#delete-unit"
              className="p-2"
              href="#"
              onClick={() => openDeleteUnit(record)}
            >
              <i data-feather="trash-2" className="feather-trash-2"></i>
            </Link>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4 className="fw-bold">Units</h4>
                <h6>Manage your units</h6>
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
                <i className="ti ti-circle-plus me-1"></i> Add Unit
              </Link>
            </div>
          </div>
          {/* /product list */}
          {loading ? (
            <div className="card table-list-card">
              <div className="card-body d-flex justify-content-center align-items-center" style={{ height: "300px" }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="card table-list-card">
              <div className="card-body d-flex justify-content-center align-items-center" style={{ height: "300px" }}>
                <div className="text-center">
                  <h5 className="text-danger">Error loading units</h5>
                  <p className="text-muted">{error}</p>
                </div>
              </div>
            </div>
          ) : (
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
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Shoe
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="dropdown-item rounded-1">
                        Electronics
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
              <div className="table-responsive">
                <Table columns={columns} dataSource={data} />
              </div>
            </div>
          </div>
          )}
          {/* /product list */}
        </div>
        <CommonFooter />
      </div>

      {/* Add Unit */}
      <div className="modal fade" id="add-units">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content">
                <div className="modal-header">
                  <div className="page-title">
                    <h4>Add Unit</h4>
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
                <div className="modal-body">
                  <form>
                    <div className="mb-3">
                      <label className="form-label">
                        Unit<span className="text-danger ms-1">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">
                        Short Name<span className="text-danger ms-1">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={newUnitCode}
                        onChange={(e) => setNewUnitCode(e.target.value)}
                      />
                    </div>
                    <div className="mb-0">
                      <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                        <span className="status-label">Status</span>
                        <input
                          type="checkbox"
                          id="user2"
                          className="check"
                          checked={newUnitActive}
                          onChange={(e) => setNewUnitActive(e.target.checked)}
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
                    onClick={handleCreateUnit}
                    disabled={isCreating}
                    data-bs-dismiss={isCreating ? undefined : "modal"}
                  >
                    {isCreating ? "Saving..." : "Add Unit"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Add Unit */}
      {/* Edit Unit */}
      <div className="modal fade" id="edit-units">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content">
                <div className="modal-header">
                  <div className="page-title">
                    <h4>Edit Unit</h4>
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
                <div className="modal-body">
                  <form>
                    <div className="mb-3">
                      <label className="form-label">
                        Unit<span className="text-danger ms-1">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editUnitName}
                        onChange={(e) => setEditUnitName(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">
                        Short Name<span className="text-danger ms-1">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editUnitCode}
                        onChange={(e) => setEditUnitCode(e.target.value)}
                      />
                    </div>
                    <div className="mb-0">
                      <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                        <span className="status-label">Status</span>
                        <input
                          type="checkbox"
                          id="user3"
                          className="check"
                          checked={editUnitActive}
                          onChange={(e) => setEditUnitActive(e.target.checked)}
                        />
                        <label htmlFor="user3" className="checktoggle" />
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
                    onClick={handleUpdateUnit}
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
      {/* /Edit Unit */}

      {/* Delete Unit */}
      <div className="modal fade" id="delete-unit">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-0">
              <div className="content p-5 px-3 text-center">
                <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                  <i className="ti ti-trash fs-24 text-danger" />
                </span>
                <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Unit</h4>
                <p className="mb-0 fs-16">
                  Are you sure you want to delete {deleteUnitName || "this unit"}?
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
                    onClick={handleDeleteUnit}
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
      {/* /Delete Unit */}
    </>
  );
}
