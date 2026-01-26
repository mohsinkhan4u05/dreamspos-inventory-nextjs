"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useState, MouseEvent } from "react";
import { useSession } from "next-auth/react";
import { Tooltip } from "antd";
import Table from "@/core/common/pagination/datatable";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import { useProducts } from "@/hooks/useProducts";
import Brand from "@/core/modals/inventory/brand";
import { all_routes } from "@/data/all_routes";
import { Download, Edit, Eye, Trash2, GitMerge } from "react-feather";
import Link from "next/link";
import { productService } from "@/services/api";
import { formatCurrencyINR } from "@/lib/currency";

export default function ProductListComponent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { products, loading, error, refetch } = useProducts({
    page,
    limit: pageSize,
    isActive: true,
  });
  const { data: session } = useSession();

  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteProductName, setDeleteProductName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [variantModalProductId, setVariantModalProductId] = useState<string | null>(null);
  const [variantModalProductName, setVariantModalProductName] = useState<string | null>(null);
  const [variantRows, setVariantRows] = useState<
    { id?: string; name: string; sku?: string | null; costPrice: string; sellingPrice: string; quantity: string }[]
  >([]);
  const [variantModalLoading, setVariantModalLoading] = useState(false);
  const [variantModalError, setVariantModalError] = useState<string | null>(null);
  const [variantModalSaving, setVariantModalSaving] = useState(false);

  const route = all_routes;
  
  // Transform API data to match the expected format for the table
  const dataSource = products?.data?.map((product: any) => {
    const totalQuantity = Array.isArray(product.stocks)
      ? product.stocks.reduce(
          (sum: number, stock: any) =>
            sum + (typeof stock.quantity === "number" ? stock.quantity : 0),
          0,
        )
      : 0;

    const creatorName =
      product.createdBy?.username ||
      product.createdBy?.name ||
      product.createdBy?.email ||
      "User";

    const creatorImage =
      (product.createdBy as any | undefined)?.image ||
      "/assets/img/users/default-user.png";

    return {
      id: product.id,
      product: product.name,
      productImage: product.image || "assets/img/products/stock-img-01.png",
      sku: product.sku,
      category: product.category?.name || "N/A",
      brand: product.brand?.name || "N/A",
      unit: "Pc", // Default unit, could be enhanced with unit data
      qty: totalQuantity.toString(),
      createdby: creatorName,
      img: creatorImage,
    };
  }) || [];

  const creatorOptions = Array.from(
    new Set((dataSource || []).map((item: any) => item.createdby).filter(Boolean))
  ) as string[];

  const paginationConfig = {
    current: products?.page ?? page,
    pageSize: products?.limit ?? pageSize,
    total: products?.total ?? dataSource.length,
    showSizeChanger: true,
    pageSizeOptions: ["10", "20", "30"],
    locale: { items_per_page: "" },
    nextIcon: (
      <span>
        <i className="fa fa-angle-right" />
      </span>
    ),
    prevIcon: (
      <span>
        <i className="fa fa-angle-left" />
      </span>
    ),
  };

  const openVariantModal = async (record: any) => {
    setVariantModalProductId(record.id);
    setVariantModalProductName(record.product);
    setVariantModalError(null);
    setVariantRows([]);
    setVariantModalLoading(true);

    try {
      const fullProduct = await productService.getProduct(record.id);
      const variants = Array.isArray(fullProduct?.variants) ? fullProduct.variants : [];

      const rows = variants.map((v: any) => {
        const qty = Array.isArray(v.stocks)
          ? v.stocks.reduce(
              (sum: number, s: any) =>
                sum + (typeof s.quantity === "number" ? s.quantity : 0),
              0,
            )
          : 0;

        return {
          id: v.id as string,
          name: String(v.name ?? ""),
          sku: v.sku ?? null,
          costPrice: v.costPrice != null ? String(v.costPrice) : "",
          sellingPrice: v.sellingPrice != null ? String(v.sellingPrice) : "",
          quantity: String(qty),
        };
      });

      setVariantRows(rows);
    } catch (err) {
      setVariantModalError(
        err instanceof Error ? err.message : "Failed to load variant details",
      );
    } finally {
      setVariantModalLoading(false);
    }
  };

  const closeVariantModal = () => {
    setVariantModalProductId(null);
    setVariantModalProductName(null);
    setVariantRows([]);
    setVariantModalError(null);
    setVariantModalLoading(false);
    setVariantModalSaving(false);
  };

  const handleVariantRowChange = (
    index: number,
    field: "name" | "costPrice" | "sellingPrice" | "quantity",
    value: string,
  ) => {
    setVariantRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddVariantRow = () => {
    setVariantRows((prev) => [
      ...prev,
      { id: undefined, name: "", sku: null, costPrice: "", sellingPrice: "", quantity: "" },
    ]);
  };

  const handleSaveVariants = async () => {
    if (!variantModalProductId) return;

    try {
      setVariantModalSaving(true);
      setVariantModalError(null);

      const variantUpdates = variantRows
        .map((row) => {
          const name = row.name.trim();
          const cost = row.costPrice.trim() === "" ? undefined : Number(row.costPrice);
          const sell = row.sellingPrice.trim() === "" ? undefined : Number(row.sellingPrice);
          const qty = row.quantity.trim() === "" ? undefined : Number(row.quantity);

          if (!row.id && !name) {
            return null;
          }

          return {
            id: row.id,
            name: name || undefined,
            costPrice: Number.isFinite(cost as number) ? (cost as number) : undefined,
            sellingPrice: Number.isFinite(sell as number) ? (sell as number) : undefined,
            quantity: Number.isFinite(qty as number) ? (qty as number) : undefined,
          };
        })
        .filter((v) => v !== null) as {
        id?: string;
        name?: string;
        costPrice?: number;
        sellingPrice?: number;
        quantity?: number;
      }[];

      await productService.updateProduct(variantModalProductId, {
        variantUpdates,
      });

      await refetch();
      closeVariantModal();
    } catch (err) {
      setVariantModalError(
        err instanceof Error ? err.message : "Failed to save variant changes",
      );
    } finally {
      setVariantModalSaving(false);
    }
  };

  const handleOpenDelete = (record: any) => {
    setDeleteProductId(record.id);
    setDeleteProductName(record.product);
    setDeleteError(null);
  };

  const handleConfirmDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!deleteProductId) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);

      await productService.deleteProduct(deleteProductId);
      await refetch();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete Item"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      title: "SKU",
      dataIndex: "sku",
      priority: "optional",
      sorter: (a: any, b: any) =>
        String(a.sku ?? "").length - String(b.sku ?? "").length,
    },
    {
      title: "Name",
      dataIndex: "product",
      priority: "always",
      render: (text: any, record: any) => (
        <div className="d-flex align-items-center">
          <button
            type="button"
            className="avatar avatar-md me-2 btn btn-link p-0 border-0"
            onClick={() => openVariantModal(record)}
          >
            <img alt="" src={record.productImage} />
          </button>
          <button
            type="button"
            className="btn btn-link p-0 text-start"
            onClick={() => openVariantModal(record)}
          >
            {text}
          </button>
        </div>
      ),
      sorter: (a: any, b: any) =>
        String(a.product ?? "").length - String(b.product ?? "").length,
    },
    {
      title: "Stock On Hand",
      dataIndex: "qty",
      priority: "always",
      sorter: (a: any, b: any) =>
        String(a.qty ?? "").length - String(b.qty ?? "").length,
    },

    {
      title: "Created By",
      dataIndex: "createdby",
      priority: "desktop",
      render: (text: any, record: any) => (
        <span className="userimgname">
          <Link href="/profile" className="product-img">
            <img alt="" src={record.img} />
          </Link>
          <Link href="/profile">{text}</Link>
        </span>
      ),
      sorter: (a: any, b: any) =>
        String(a.createdby ?? "").length - String(b.createdby ?? "").length,
    },
    {
      title: "Action",
      dataIndex: "action",
      priority: "optional",
      mobileHidden: true,
      render: (_: unknown, record: any) => (
        <div className="action-table-data">
          <div className="edit-delete-action">
            <Tooltip title="View Item">
              <Link className="me-2 p-2" href={`/item/${record.id}`}>
                <Eye className="feather-view" />
              </Link>
            </Tooltip>
            <Tooltip title="View Bill of Materials">
              <Link
                className="me-2 p-2"
                href={`${route.manufacturingBOM}?productId=${record.id}`}
              >
                <GitMerge className="feather-edit" />
              </Link>
            </Tooltip>
            <Tooltip title="Edit Item">
              <Link className="me-2 p-2" href={`${route.editproduct}/${record.id}`}>
                <Edit className="feather-edit" />
              </Link>
            </Tooltip>
            <Tooltip title="Delete Item">
              <Link
                className="confirm-text p-2"
                href="#"
                data-bs-toggle="modal"
                data-bs-target="#delete-modal"
                onClick={() => handleOpenDelete(record)}
              >
                <Trash2 className="feather-trash-2" />
              </Link>
            </Tooltip>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) =>
        String(a.createdby ?? "").length - String(b.createdby ?? "").length,
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
              <h5 className="text-danger">Error loading items</h5>
              <p className="text-muted">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* MAIN PAGE */}
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4>Item List</h4>
                <h6>Manage your items</h6>
              </div>
            </div>

            <ul className="table-top-head">
              <TooltipIcons />
              <RefreshIcon />
              <CollapesIcon />
            </ul>

            <div className="page-btn">
              <Link href={route.addproduct} className="btn btn-primary">
                <i className="ti ti-circle-plus me-1"></i>
                Add New Item
              </Link>
            </div>
          </div>

          <div className="card table-list-card">
            <div className="card-body">
              <div className="table-responsive">
                <Table
                  columns={columns}
                  dataSource={dataSource}
                  pagination={paginationConfig}
                  onChange={(pagination: any) => {
                    const nextPage = pagination?.current || 1;
                    const nextPageSize = pagination?.pageSize || pageSize;
                    setPage(nextPage);
                    setPageSize(nextPageSize);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VARIANT MODAL */}
      <div
        className={`modal fade${variantModalProductId ? " show d-block" : ""}`}
        id="variant-modal"
        aria-hidden={variantModalProductId ? "false" : "true"}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <div className="page-title">
                <h4>Variants for {variantModalProductName || "Item"}</h4>
              </div>
              <button
                type="button"
                className="close"
                aria-label="Close"
                onClick={closeVariantModal}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="modal-body">
              {variantModalLoading && (
                <p className="mb-0 text-muted">Loading variants...</p>
              )}
              {variantModalError && !variantModalLoading && (
                <p className="mb-2 text-danger">{variantModalError}</p>
              )}
              {!variantModalLoading && !variantModalError && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="mb-0">Variant Breakdown</h5>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={handleAddVariantRow}
                    >
                      Add Variant
                    </button>
                  </div>
                  {variantRows.length === 0 ? (
                    <p className="mb-0 text-muted">
                      No variants yet. Use "Add Variant" to create one.
                    </p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered mb-0">
                        <thead>
                          <tr>
                            <th>Variant</th>
                            <th>Cost Price</th>
                            <th>Selling Price</th>
                            <th>Available Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variantRows.map((row, index) => (
                            <tr key={row.id || `new-${index}`}>
                              <td>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={row.name}
                                  onChange={(e) =>
                                    handleVariantRowChange(
                                      index,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Variant name"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={row.costPrice}
                                  onChange={(e) =>
                                    handleVariantRowChange(
                                      index,
                                      "costPrice",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0.00"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={row.sellingPrice}
                                  onChange={(e) =>
                                    handleVariantRowChange(
                                      index,
                                      "sellingPrice",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0.00"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={row.quantity}
                                  onChange={(e) =>
                                    handleVariantRowChange(
                                      index,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeVariantModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveVariants}
                disabled={variantModalSaving}
              >
                {variantModalSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {variantModalProductId && <div className="modal-backdrop fade show" />}

      {/* DELETE MODAL */}
      <div className="modal fade" id="delete-modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="page-wrapper-new p-4 text-center">
              <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                <i className="ti ti-trash fs-24 text-danger" />
              </span>

              <h4 className="fs-20 fw-bold">Delete Item</h4>
              <p>
                Are you sure you want to delete{" "}
                <strong>{deleteProductName}</strong>?
              </p>

              <div className="d-flex justify-content-center gap-2 mt-3">
                <button
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>

                <button
                  className="btn btn-danger"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  data-bs-dismiss="modal"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
