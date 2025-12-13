"use client";
/* eslint-disable @next/next/no-img-element */

import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import {
  Edit,
  FileText,
  MinusCircle,
  PlusCircle,
  Search,
  Trash2,
} from "react-feather";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import Table from "@/core/common/pagination/datatable";
import CommonFooter from "@/core/common/footer/commonFooter";
import Select from "react-select";
import { useStockAdjustments } from "@/hooks/useStockAdjustments";
import { useStores } from "@/hooks/useStores";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import { stockAdjustmentService } from "@/services/api";

type MovementTypeOption = "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";

interface StockAdjustmentRow {
  id: string;
  ProductId: string | null;
  Date: string;
  Reason: string;
  Description: string;
  Status: string;
  Reference: string;
  Type: string;
  CreatedBy: string;
  CreatedTime: string;
  LastModifiedBy: string;
  LastModifiedTime: string;
}

export default function StockAdjustmentComponent() {
  const router = useRouter();
  const [filterStoreId, setFilterStoreId] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState<string>("");

  const { adjustments, loading, error, refetch } = useStockAdjustments({
    page: 1,
    limit: 50,
    storeId: filterStoreId || undefined,
    search: filterSearch || undefined,
  });

  const { stores } = useStores({ page: 1, limit: 100 });

  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [selectedProductSearch, setSelectedProductSearch] = useState<string>("");
  const [movementType, setMovementType] = useState<MovementTypeOption>("ADJUSTMENT_IN");
  const [quantity, setQuantity] = useState<number>(1);
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [viewNotes, setViewNotes] = useState<string | null>(null);
  const [editAdjustmentId, setEditAdjustmentId] = useState<string | null>(null);
  const [editReference, setEditReference] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [deleteAdjustmentId, setDeleteAdjustmentId] = useState<string | null>(null);

  const data: StockAdjustmentRow[] = useMemo(
    () =>
      adjustments?.data?.map((adj) => ({
        id: adj.id,
        ProductId: adj.product?.id || null,
        Date: new Date(adj.createdAt).toLocaleDateString(),
        Reason: adj.description || "",
        Description: adj.description || "",
        Status: "ADJUSTED",
        Reference: adj.reference || "",
        Type:
          adj.movementType === "ADJUSTMENT_IN"
            ? "Quantity Increase"
            : adj.movementType === "ADJUSTMENT_OUT"
            ? "Quantity Decrease"
            : adj.movementType,
        CreatedBy: "System",
        CreatedTime: new Date(adj.createdAt).toLocaleTimeString(),
        LastModifiedBy: "System",
        LastModifiedTime: new Date(adj.createdAt).toLocaleTimeString(),
      })) || [],
    [adjustments],
  );

  const columns = [
    {
      title: "Date",
      dataIndex: "Date",
      sorter: (a: StockAdjustmentRow, b: StockAdjustmentRow) =>
        new Date(a.Date).getTime() - new Date(b.Date).getTime(),
    },

    {
      title: "Reason",
      dataIndex: "Reason",
      sorter: (a: StockAdjustmentRow, b: StockAdjustmentRow) =>
        (a.Reason || "").localeCompare(b.Reason || ""),
    },

    {
      title: "Description",
      dataIndex: "Description",
      sorter: (a: StockAdjustmentRow, b: StockAdjustmentRow) =>
        (a.Description || "").localeCompare(b.Description || ""),
    },

    {
      title: "Status",
      dataIndex: "Status",
      sorter: (a: StockAdjustmentRow, b: StockAdjustmentRow) =>
        (a.Status || "").localeCompare(b.Status || ""),
    },

    {
      title: "Reference Number",
      dataIndex: "Reference",
      sorter: (a: StockAdjustmentRow, b: StockAdjustmentRow) =>
        (a.Reference || "").localeCompare(b.Reference || ""),
    },

    {
      title: "Type",
      dataIndex: "Type",
      sorter: (a: StockAdjustmentRow, b: StockAdjustmentRow) =>
        (a.Type || "").localeCompare(b.Type || ""),
    },

    {
      title: "Created By",
      dataIndex: "CreatedBy",
      sorter: (a: StockAdjustmentRow, b: StockAdjustmentRow) =>
        (a.CreatedBy || "").localeCompare(b.CreatedBy || ""),
    },

    {
      title: "Created Time",
      dataIndex: "CreatedTime",
      sorter: (a: StockAdjustmentRow, b: StockAdjustmentRow) =>
        (a.CreatedTime || "").localeCompare(b.CreatedTime || ""),
    },

    {
      title: "Last Modified By",
      dataIndex: "LastModifiedBy",
      sorter: (a: StockAdjustmentRow, b: StockAdjustmentRow) =>
        (a.LastModifiedBy || "").localeCompare(b.LastModifiedBy || ""),
    },

    {
      title: "Last Modified Time",
      dataIndex: "LastModifiedTime",
      sorter: (a: StockAdjustmentRow, b: StockAdjustmentRow) =>
        (a.LastModifiedTime || "").localeCompare(b.LastModifiedTime || ""),
    },

    {
      title: "Action",
      dataIndex: "action",
      render: (_: unknown, record: StockAdjustmentRow) => (
        <div className="action-table-data">
          <div className="edit-delete-action">
            <Link
              className="me-2 p-2"
              href={`/adjustment-details/${record.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <FileText className="feather-file-text" />
            </Link>
          </div>
        </div>
      ),
      sorter: () => 0,
    },
  ];

  const storeOptions = [
    { value: "", label: "Choose" },
    ...(stores?.data?.map((storeItem) => ({
      value: storeItem.id,
      label: storeItem.name,
    })) || []),
  ];

  const movementTypeOptions = [
    { value: "ADJUSTMENT_IN", label: "Adjustment In" },
    { value: "ADJUSTMENT_OUT", label: "Adjustment Out" },
  ];

  const handleCreateAdjustment = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selectedStoreId || !selectedProductSearch || !quantity) {
      setSubmitError("Please fill in Store, Product and Quantity.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await stockAdjustmentService.createStockAdjustment({
        productId: selectedProductSearch,
        storeId: selectedStoreId,
        quantity,
        movementType,
        reference: reference || null,
        description: notes || null,
      });

      await refetch();

      setSelectedStoreId("");
      setSelectedProductSearch("");
      setQuantity(1);
      setMovementType("ADJUSTMENT_IN");
      setReference("");
      setNotes("");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create adjustment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAdjustment = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!editAdjustmentId) return;

    try {
      await stockAdjustmentService.updateStockAdjustment(editAdjustmentId, {
        reference: editReference || null,
        description: editNotes || null,
      });

      await refetch();
    } catch (err) {
      console.error("Failed to update adjustment", err);
    }
  };

  const handleConfirmDeleteAdjustment = async () => {
    if (!deleteAdjustmentId) return;

    try {
      await stockAdjustmentService.deleteStockAdjustment(deleteAdjustmentId);

      setDeleteAdjustmentId(null);
      await refetch();
    } catch (err) {
      console.error("Failed to delete adjustment", err);
    }
  };

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
              <h5 className="text-danger">Error loading stock adjustments</h5>
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
                <h4>Stock Adjustment</h4>
                <h6>Manage your stock adjustment</h6>
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
                <i className="ti ti-circle-plus me-1"></i>
                Add Adjustment
              </Link>
            </div>
          </div>
          {/* /product list */}
          <div className="card table-list-card manage-stock">
            <div className="card-body">
              <div className="custom-datatable-filter table-responsive">
                <Table
                  columns={columns}
                  dataSource={data}
                  disableSelection
                  onRow={(record: StockAdjustmentRow) => ({
                    onClick: () => {
                      if (record.ProductId) {
                        router.push(`/item/${record.ProductId}/adjust-stock`);
                      }
                    },
                  })}
                />
              </div>
            </div>
          </div>
          {/* /product list */}
        </div>
        <CommonFooter />
      </div>

      <CommonDeleteModal onConfirm={handleConfirmDeleteAdjustment} />

      {/* Add Adjustment */}
      <div className="modal fade" id="add-units">
        <div className="modal-dialog modal-dialog-centered stock-adjust-modal">
          <div className="modal-content">
            <div className="modal-header">
              <div className="page-title">
                <h4>Add Adjustment</h4>
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
            <form onSubmit={handleCreateAdjustment}>
              <div className="modal-body">
                <div className="search-form mb-3">
                  <label className="form-label">
                    Product ID<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Product ID for now"
                    value={selectedProductSearch}
                    onChange={(e) => setSelectedProductSearch(e.target.value)}
                  />
                  <Search className="feather-search" />
                </div>
                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Store<span className="text-danger ms-1">*</span>
                      </label>
                      <Select
                        classNamePrefix="react-select"
                        options={storeOptions}
                        placeholder="Choose"
                        value={
                          storeOptions.find(
                            (option) => option.value === selectedStoreId,
                          ) || storeOptions[0]
                        }
                        onChange={(option) =>
                          setSelectedStoreId(
                            (
                              option as
                                | { value: string; label: string }
                                | null
                            )?.value || "",
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Movement Type
                        <span className="text-danger ms-1">*</span>
                      </label>
                      <Select
                        classNamePrefix="react-select"
                        options={movementTypeOptions}
                        placeholder="Choose"
                        value={movementTypeOptions.find(
                          (option) => option.value === movementType,
                        )}
                        onChange={(option) =>
                          setMovementType(
                            (
                              option as
                                | { value: MovementTypeOption; label: string }
                                | null
                            )?.value || "ADJUSTMENT_IN",
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Quantity<span className="text-danger ms-1">*</span>
                      </label>
                      <div className="product-quantity border-0 bg-gray-transparent">
                        <span
                          className="quantity-btn"
                          onClick={() => {
                            if (quantity > 1) {
                              setQuantity(quantity - 1);
                            }
                          }}
                        >
                          <MinusCircle />
                        </span>
                        <input
                          type="number"
                          className="quntity-input bg-transparent"
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(Number(e.target.value) || 1)
                          }
                        />
                        <span
                          className="quantity-btn"
                          onClick={() => setQuantity(quantity + 1)}
                        >
                          +
                          <PlusCircle className="plus-circle" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="summer-description-box">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  {submitError && (
                    <div className="col-lg-12">
                      <div className="mt-2 alert alert-danger" role="alert">
                        {submitError}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  data-bs-dismiss={isSubmitting ? undefined : "modal"}
                >
                  {isSubmitting ? "Saving..." : "Create Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Adjustment */}

      {/* Edit Adjustment (reference & notes only) */}
      <div className="modal fade" id="edit-units">
        <div className="modal-dialog modal-dialog-centered stock-adjust-modal">
          <div className="modal-content">
            <div className="modal-header">
              <div className="page-title">
                <h4>Edit Adjustment</h4>
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
            <form onSubmit={handleUpdateAdjustment}>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Reference Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editReference}
                        onChange={(e) => setEditReference(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3 summer-description-box">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary me-2"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  data-bs-dismiss="modal"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Adjustment */}

      {/* View Notes */}
      <div className="modal fade" id="view-notes">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <div className="page-title">
                <h4>Notes</h4>
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
              <p>{viewNotes || "No notes available for this adjustment."}</p>
            </div>
          </div>
        </div>
      </div>
      {/* /View Notes */}
      <style jsx global>{`
        .manage-stock .table-search-set {
          position: static !important;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          margin-bottom: 12px;
          margin-left : 5px;
          padding: 0;
        }

        .manage-stock .table-search-set .btn-searchset {
          display: none;
        }

        .manage-stock .table-search-set .search-input {
          max-width: 260px;
          width: 100%;
        }

        .manage-stock .custom-datatable-filter {
          margin-top: 4px;
        }
      `}</style>
    </>
  );
}
