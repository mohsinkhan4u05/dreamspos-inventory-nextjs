"use client";
/* eslint-disable @next/next/no-img-element */

import CommonFooter from "@/core/common/footer/commonFooter";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import { useStocks } from "@/hooks/useStocks";
import { useStores } from "@/hooks/useStores";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useProducts } from "@/hooks/useProducts";
import { stockService } from "@/services/api";
import Link from "next/link";
import { useState, FormEvent } from "react";
import Select from "react-select";
import Table from "@/core/common/pagination/datatable";
import {
  Edit,
  MinusCircle,
  PlusCircle,
  Search,
  Trash2,
} from "react-feather";
import { ResponsiblePerson, Shop, WareHouse } from "@/core/common/selectOption/selectOption";

export default function ManageStockComponent() {
  const [filterStoreId, setFilterStoreId] = useState<string>("");
  const [filterWarehouseId, setFilterWarehouseId] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);

  const { stocks, loading, error, refetch } = useStocks({
    page: 1,
    limit: 50,
    storeId: filterStoreId || undefined,
    warehouseId: filterWarehouseId || undefined,
    search: filterSearch || undefined,
    lowStock: filterLowStockOnly,
  });

  const { stores } = useStores({ page: 1, limit: 100, isActive: true });
  const { warehouses } = useWarehouses({ page: 1, limit: 100, isActive: true });
  const { products } = useProducts({ page: 1, limit: 100, isActive: true });

  // Transform API data to match the expected format for the table
  const data =
    stocks?.data?.map((stock) => ({
      id: stock.id,
      Warehouse: stock.warehouse?.name || "N/A",
      Shop: stock.store
        ? `${stock.store.name}${stock.store.code ? ` (${stock.store.code})` : ""}`
        : "N/A",
      Product: {
        Name: stock.product?.name || "N/A",
        Image: stock.product?.image || "/assets/img/products/product-1.jpg",
        SKU: stock.product?.sku || "N/A",
      },
      Date: new Date(stock.createdAt).toLocaleDateString(),
      Quantity: stock.quantity,
      MinStock: stock.minStock,
      MaxStock: stock.maxStock ?? null,
      Status: stock.quantity <= stock.minStock ? "Low Stock" : "In Stock",
    })) || [];

  const storeOptions = [
    { value: "", label: "Choose" },
    ...(stores?.data?.map((storeItem) => ({
      value: storeItem.id,
      label: storeItem.name,
    })) || []),
  ];

  const warehouseOptions = [
    { value: "", label: "Choose" },
    ...(warehouses?.data?.map((warehouseItem) => ({
      value: warehouseItem.id,
      label: warehouseItem.name,
    })) || []),
  ];

  const productOptions = [
    { value: "", label: "Choose" },
    ...(products?.data?.map((productItem) => ({
      value: productItem.id,
      label: `${productItem.name} (${productItem.sku})`,
    })) || []),
  ];

  const columns = [
    {
      title: "Warehouse",
      dataIndex: "Warehouse",
      sorter: (a: any, b: any) =>
        (a.Warehouse || "").localeCompare(b.Warehouse || ""),
    },
    {
      title: "Shop",
      dataIndex: "Shop",
      sorter: (a: any, b: any) => (a.Shop || "").localeCompare(b.Shop || ""),
    },
    {
      title: "Product",
      dataIndex: "Product",
      render: (text: any, record: any) => (
        <span className="userimgname">
          <Link href="#" className="product-img">
            <img alt="img" src={record.Product.Image} />
          </Link>
          <Link href="#">{record.Product.Name}</Link>
        </span>
      ),
      sorter: (a: any, b: any) =>
        (a.Product?.Name || "").localeCompare(b.Product?.Name || ""),
    },

    {
      title: "Date",
      dataIndex: "Date",
      sorter: (a: any, b: any) =>
        new Date(a.Date).getTime() - new Date(b.Date).getTime(),
    },

    {
      title: "Qty",
      dataIndex: "Quantity",
      sorter: (a: any, b: any) => a.Quantity - b.Quantity,
    },

    {
      title: "",
      dataIndex: "action",
      render: (_: any, record: any) => (
        <div className="action-table-data">
          <div className="edit-delete-action">
            <div className="input-block add-lists"></div>

            <Link
              className="me-2 p-2"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#edit-units"
              onClick={() => {
                setStockIdToEdit(record.id);
                setQuantity(record.Quantity || 0);
                setEditMinStock(
                  typeof record.MinStock === "number" ? record.MinStock : null,
                );
                setEditMaxStock(
                  typeof record.MaxStock === "number" ? record.MaxStock : null,
                );
              }}
            >
              <Edit className="feather-edit" />
            </Link>

            <Link
              className="confirm-text p-2"
              data-bs-toggle="modal"
              data-bs-target="#delete-modal"
              href="#"
              onClick={() => setStockIdToDelete(record.id)}
            >
              <Trash2 className="feather-trash-2" />
            </Link>
          </div>
        </div>
      ),
      sorter: () => 0,
    },
  ];

  const [quantity, setQuantity] = useState(4);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [stockQuantity, setStockQuantity] = useState<string>("");
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stockIdToDelete, setStockIdToDelete] = useState<string | null>(null);
  const [stockIdToEdit, setStockIdToEdit] = useState<string | null>(null);
  const [editMinStock, setEditMinStock] = useState<number | null>(null);
  const [editMaxStock, setEditMaxStock] = useState<number | null>(null);

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrement = () => {
    setQuantity(quantity + 1);
  };

  const handleCreateStock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedStoreId || !selectedProductId || !stockQuantity) {
      setSubmitError("Please fill in Store, Product and Quantity.");
      return;
    }

    const qty = Number(stockQuantity);

    if (Number.isNaN(qty)) {
      setSubmitError("Quantity must be a valid number.");
      return;
    }

    try {
      setIsSubmittingStock(true);
      setSubmitError(null);

      await stockService.createStock({
        productId: selectedProductId,
        storeId: selectedStoreId,
        warehouseId: selectedWarehouseId || null,
        quantity: qty,
      });

      await refetch();

      setSelectedWarehouseId("");
      setSelectedStoreId("");
      setSelectedProductId("");
      setStockQuantity("");
    } catch (err) {
      console.error("Failed to add stock", err);
      setSubmitError(
        err instanceof Error ? err.message : "Failed to add stock",
      );
    } finally {
      setIsSubmittingStock(false);
    }
  };

  const handleConfirmDeleteStock = async () => {
    if (!stockIdToDelete) return;

    try {
      await stockService.deleteStock(stockIdToDelete);
      setStockIdToDelete(null);
      await refetch();
    } catch (err) {
      console.error("Failed to delete stock", err);
    }
  };

  const handleUpdateStock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stockIdToEdit) return;

    try {
      const payload: Record<string, unknown> = {
        quantity,
      };

      if (editMinStock !== null) {
        payload.minStock = editMinStock;
      }

      if (editMaxStock !== null) {
        payload.maxStock = editMaxStock;
      }

      await stockService.updateStock(stockIdToEdit, payload);
      await refetch();
    } catch (err) {
      console.error("Failed to update stock", err);
    }
  };

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
              <h5 className="text-danger">Error loading stocks</h5>
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
                <h4>Manage Stock</h4>
                <h6>Manage your stock</h6>
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
                Add New
              </Link>
            </div>
          </div>
          {/* /product list */}
          <div className="card table-list-card  manage-stock">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <div className="search-set"></div>
              <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="dropdown me-2">
                  <Link
                    href="#"
                    className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Warehouse
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link
                        href="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilterWarehouseId("");
                        }}
                      >
                        All Warehouses
                      </Link>
                    </li>
                    {warehouses?.data?.map((warehouse) => (
                      <li key={warehouse.id}>
                        <Link
                          href="#"
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            setFilterWarehouseId(warehouse.id);
                          }}
                        >
                          {warehouse.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="dropdown me-2">
                  <Link
                    href="#"
                    className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Store
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link
                        href="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilterStoreId("");
                        }}
                      >
                        All Stores
                      </Link>
                    </li>
                    {stores?.data?.map((store) => (
                      <li key={store.id}>
                        <Link
                          href="#"
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            setFilterStoreId(store.id);
                          }}
                        >
                          {store.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="dropdown">
                  <Link
                    href="#"
                    className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Product
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link
                        href="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilterSearch("");
                        }}
                      >
                        All Products
                      </Link>
                    </li>
                    {products?.data?.map((product) => (
                      <li key={product.id}>
                        <Link
                          href="#"
                          className="dropdown-item rounded-1"
                          onClick={(e) => {
                            e.preventDefault();
                            setFilterSearch(product.name);
                          }}
                        >
                          {product.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="form-check form-switch ms-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="low-stock-only-toggle"
                    checked={filterLowStockOnly}
                    onChange={(e) => setFilterLowStockOnly(e.target.checked)}
                  />
                  <label
                    className="form-check-label ms-1"
                    htmlFor="low-stock-only-toggle"
                  >
                    Low stock only
                  </label>
                </div>
              </div>
            </div>

            <div className="card-body">
              <div className="custom-datatable-filter table-responsive">
                <Table columns={columns} dataSource={data} />
              </div>
            </div>
          </div>
          {/* /product list */}
        </div>
        <CommonFooter />
      </div>
      <CommonDeleteModal onConfirm={handleConfirmDeleteStock} />

      {/* Add Stock */}
      <div className="modal fade" id="add-units">
        <div className="modal-dialog modal-dialog-centered stock-adjust-modal">
          <div className="modal-content">
            <div className="modal-header">
              <div className="page-title">
                <h4>Add Stock</h4>
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
            <form onSubmit={handleCreateStock}>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Warehouse <span className="text-danger ms-1">*</span>
                      </label>
                      <Select
                        classNamePrefix="react-select"
                        options={warehouseOptions}
                        placeholder="Choose"
                        value={
                          warehouseOptions.find(
                            (option) => option.value === selectedWarehouseId,
                          ) || warehouseOptions[0]
                        }
                        onChange={(option) =>
                          setSelectedWarehouseId(
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
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Store <span className="text-danger ms-1">*</span>
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
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Responsible Person{" "}
                        <span className="text-danger ms-1">*</span>
                      </label>
                      <Select
                        classNamePrefix="react-select"
                        options={ResponsiblePerson}
                        placeholder="Choose"
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="search-form mb-0">
                      <label className="form-label">
                        Product <span className="text-danger ms-1">*</span>
                      </label>
                      <Select
                        classNamePrefix="react-select"
                        options={productOptions}
                        placeholder="Choose"
                        value={
                          productOptions.find(
                            (option) => option.value === selectedProductId,
                          ) || productOptions[0]
                        }
                        onChange={(option) =>
                          setSelectedProductId(
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
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Quantity <span className="text-danger ms-1">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                      />
                    </div>
                  </div>
                  {submitError && (
                    <div className="col-lg-12">
                      <div
                        className="mt-2 alert alert-danger"
                        role="alert"
                      >
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
                  disabled={isSubmittingStock}
                  data-bs-dismiss={isSubmittingStock ? undefined : "modal"}
                >
                  {isSubmittingStock ? "Saving..." : "Add Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Stock */}
      {/* Edit Stock */}
      <div className="modal fade" id="edit-units">
        <div className="modal-dialog modal-dialog-centered stock-adjust-modal">
          <div className="modal-content">
            <div className="modal-header">
              <div className="page-title">
                <h4>Edit Stock</h4>
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
            <form onSubmit={handleUpdateStock}>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Warehouse<span className="text-danger ms-1">*</span>
                      </label>
                      <Select
                        classNamePrefix="react-select"
                        options={WareHouse}
                        placeholder="Choose"
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Shop<span className="text-danger ms-1">*</span>
                      </label>
                      <Select
                        classNamePrefix="react-select"
                        options={Shop}
                        placeholder="Choose"
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Responsible Person
                        <span className="text-danger ms-1">*</span>
                      </label>
                      <Select
                        classNamePrefix="react-select"
                        options={ResponsiblePerson}
                        placeholder="Choose"
                      />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Minimum Stock</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editMinStock ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditMinStock(
                            value === "" ? null : Number(value),
                          );
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Maximum Stock</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editMaxStock ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditMaxStock(
                            value === "" ? null : Number(value),
                          );
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="search-form mb-3">
                      <label className="form-label">
                        Product<span className="text-danger ms-1">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Select Product"
                        defaultValue="Nike Jordan"
                      />
                      <Search className="feather-search" />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="modal-body-table">
                      <div className="table-responsive">
                        <table className="table  datanew">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>SKU</th>
                              <th>Category</th>
                              <th>Qty</th>
                              <th className="no-sort" />
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>
                                <div className="d-flex align-items-center">
                                  <Link href="#" className="avatar avatar-md">
                                    <img
                                      src="assets/img/products/stock-img-02.png"
                                      alt="product"
                                    />
                                  </Link>
                                  <Link href="#">Nike Jordan</Link>
                                </div>
                              </td>
                              <td>PT002</td>
                              <td>Nike</td>
                              <td>
                                <div className="product-quantity bg-gray-transparent border-0">
                                  <span
                                    className="quantity-btn"
                                    onClick={handleDecrement}
                                  >
                                    <MinusCircle />
                                  </span>
                                  <input
                                    type="number"
                                    className="quntity-input bg-transparent"
                                    value={quantity}
                                    onChange={(e) =>
                                      setQuantity(
                                        Number(e.target.value) || 0,
                                      )
                                    }
                                  />
                                  <span
                                    className="quantity-btn"
                                    onClick={handleIncrement}
                                  >
                                    +
                                    <PlusCircle className="plus-circle" />
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex align-items-center justify-content-between edit-delete-action">
                                  <Link
                                    className="d-flex align-items-center border rounded p-2"
                                    href="#"
                                  >
                                    <i
                                      data-feather="trash-2"
                                      className="feather-trash-2"
                                    />
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
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
      {/* /Edit Stock */}
    </>
  );
}
