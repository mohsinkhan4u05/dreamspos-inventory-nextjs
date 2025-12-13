"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Select from "react-select";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import { all_routes } from "@/data/all_routes";
import {
  supplierService,
  productService,
  storeService,
  purchaseOrderService,
} from "@/services/api";
import { formatCurrencyINR } from "@/lib/currency";

interface Option {
  value: string;
  label: string;
}

interface ProductOption extends Option {
  unitPrice?: number;
  sku?: string;
  stockOnHand?: number;
  image?: string;
}

interface ItemRow {
  id: string;
  productId?: string;
  description?: string;
  quantity: string;
  rate: string;
  discount: string;
  taxRate: string;
}

interface SupplierDetails {
  id: string;
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
}

function parseNumber(value: string, fallback = 0): number {
  if (!value) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function PurchaseOrderAddPos() {
  const router = useRouter();
  const route = all_routes;

  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [stores, setStores] = useState<Option[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [supplierDetailsById, setSupplierDetailsById] = useState<
    Record<string, SupplierDetails>
  >({});

  const [storeId, setStoreId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [orderDate, setOrderDate] = useState<Date | null>(new Date());
  const [expectedReceiptDate, setExpectedReceiptDate] = useState<Date | null>(
    null,
  );
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [buyer, setBuyer] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [emailRecipients, setEmailRecipients] = useState("");

  const [orderDiscount, setOrderDiscount] = useState("0");
  const [orderAdjustment, setOrderAdjustment] = useState("0");

  const [items, setItems] = useState<ItemRow[]>([]);

  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [createSupplierLoading, setCreateSupplierLoading] = useState(false);
  const [createSupplierError, setCreateSupplierError] = useState<string | null>(
    null,
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [supplierRes, storeRes, productRes] = await Promise.all([
          supplierService.getSuppliers({ limit: 100 }),
          storeService.getStores({ limit: 100 }),
          productService.getProducts({ limit: 100, isActive: true }),
        ]);

        const supplierData = supplierRes.data || [];

        setSuppliers(
          supplierData.map((s: any) => ({
            value: s.id,
            label: s.displayName || s.name,
          })),
        );

        const supplierMap: Record<string, SupplierDetails> = {};
        supplierData.forEach((s: any) => {
          supplierMap[s.id] = {
            id: s.id,
            name: s.name ?? null,
            displayName: s.displayName ?? null,
            email: s.email ?? null,
            phone: s.phone ?? null,
            mobile: s.mobile ?? null,
          };
        });
        setSupplierDetailsById(supplierMap);

        const storeOptions = (storeRes.data || []).map((s: any) => ({
          value: s.id,
          label: s.name,
        }));

        setStores(storeOptions);

        if (!storeId && storeOptions.length > 0) {
          setStoreId(storeOptions[0].value);
        }

        const loadedProducts = Array.isArray(productRes)
          ? productRes
          : (productRes as any).data || (productRes as any).products || [];

        setRawProducts(loadedProducts || []);
      } catch (e) {
        console.error("Failed to load purchase order form data", e);
        setError("Failed to load initial data for purchase order form");
      }
    };

    load();
  }, [storeId]);

  useEffect(() => {
    if (!rawProducts || rawProducts.length === 0) {
      setProducts([]);
      return;
    }

    const mapped: ProductOption[] = (rawProducts || []).map((p: any) => {
      const unitPrice =
        typeof p.costPrice === "number"
          ? p.costPrice
          : typeof p.sellingPrice === "number"
          ? p.sellingPrice
          : typeof p.price === "number"
          ? p.price
          : 0;

      const stocks = Array.isArray(p.stocks) ? p.stocks : [];
      const stockForStore = storeId
        ? stocks.filter((s: any) => s.storeId === storeId)
        : stocks;
      const stockOnHand = stockForStore.reduce(
        (sum: number, s: any) =>
          sum + (typeof s.quantity === "number" ? s.quantity : 0),
        0,
      );

      return {
        value: p.id,
        label: p.name || p.productName || "Unnamed",
        unitPrice,
        sku: p.sku || "",
        stockOnHand,
        image: p.image || null,
      };
    });

    setProducts(mapped);
  }, [rawProducts, storeId]);

  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) {
      return [];
    }

    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return products;
    }

    return products.filter((p) => {
      const name = (p.label || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      return name.includes(term) || sku.includes(term);
    });
  }, [products, searchTerm]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, row) => {
      const qty = parseNumber(row.quantity);
      const rate = parseNumber(row.rate);
      return sum + qty * rate;
    }, 0);

    const lineDiscount = items.reduce(
      (sum, row) => sum + parseNumber(row.discount),
      0,
    );
    const lineTax = items.reduce((sum, row) => {
      const qty = parseNumber(row.quantity);
      const rate = parseNumber(row.rate);
      const base = qty * rate - parseNumber(row.discount);
      const tax = base * (parseNumber(row.taxRate) / 100);
      return sum + (Number.isFinite(tax) ? tax : 0);
    }, 0);

    const discount = parseNumber(orderDiscount) + lineDiscount;
    const taxAmount = lineTax;
    const adjustment = parseNumber(orderAdjustment);
    const total = subtotal - discount + taxAmount + adjustment;

    return { subtotal, discount, taxAmount, adjustment, total };
  }, [items, orderDiscount, orderAdjustment]);

  const selectedSupplierDetails = useMemo(() => {
    if (!supplierId) return null;
    return supplierDetailsById[supplierId] || null;
  }, [supplierId, supplierDetailsById]);

  const handleItemChange = (id: string, field: keyof ItemRow, value: string) => {
    setItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const handleProductChange = (id: string, option: ProductOption | null) => {
    setItems((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              productId: option?.value,
              rate:
                option && typeof option.unitPrice === "number"
                  ? String(option.unitPrice)
                  : row.rate,
            }
          : row,
      ),
    );
  };

  const addProductToOrder = (product: ProductOption) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (row) => row.productId === product.value,
      );

      if (existingIndex !== -1) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        const currentQty = parseNumber(existing.quantity, 0);
        const nextQty = currentQty + 1;

        updated[existingIndex] = {
          ...existing,
          quantity: String(nextQty),
          rate:
            existing.rate && existing.rate !== "0"
              ? existing.rate
              : typeof product.unitPrice === "number"
              ? String(product.unitPrice)
              : existing.rate,
        };

        return updated;
      }

      const initialRate =
        typeof product.unitPrice === "number"
          ? String(product.unitPrice)
          : "0";

      return [
        ...prev,
        {
          id: `row-${prev.length + 1}`,
          productId: product.value,
          description: product.label,
          quantity: "1",
          rate: initialRate,
          discount: "0",
          taxRate: "0",
        },
      ];
    });
  };

  const decrementProductInOrder = (product: ProductOption) => {
    setItems((prev) => {
      const index = prev.findIndex((row) => row.productId === product.value);
      if (index === -1) {
        return prev;
      }

      const updated = [...prev];
      const existing = updated[index];
      const currentQty = parseNumber(existing.quantity, 0);

      if (currentQty <= 1) {
        return updated.filter((_, i) => i !== index);
      }

      updated[index] = {
        ...existing,
        quantity: String(currentQty - 1),
      };

      return updated;
    });
  };

  const clearAllItems = () => {
    setItems([]);
  };

  const removeItemByProductId = (productId: string) => {
    setItems((prev) => prev.filter((row) => row.productId !== productId));
  };

  const handleCreateSupplier = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!newSupplierName.trim()) {
      setCreateSupplierError("Vendor name is required");
      return;
    }

    try {
      setCreateSupplierLoading(true);
      setCreateSupplierError(null);

      const payload = {
        name: newSupplierName.trim(),
        displayName: newSupplierName.trim(),
        email: newSupplierEmail || null,
        phone: newSupplierPhone || null,
        address: newSupplierAddress || null,
      };

      const created: any = await supplierService.createSupplier(payload);

      const option: Option = {
        value: created.id,
        label: created.displayName || created.name || newSupplierName.trim(),
      };

      setSuppliers((prev) => [...prev, option]);
      setSupplierId(option.value);

      setSupplierDetailsById((prev) => ({
        ...prev,
        [created.id]: {
          id: created.id,
          name: created.name ?? null,
          displayName: created.displayName ?? null,
          email: created.email ?? null,
          phone: created.phone ?? null,
          mobile: created.mobile ?? null,
        },
      }));

      setNewSupplierName("");
      setNewSupplierEmail("");
      setNewSupplierPhone("");
      setNewSupplierAddress("");

      if (typeof window !== "undefined") {
        const modalElement = document.getElementById("add-vendor-pos");
        const anyWindow = window as any;
        if (modalElement && anyWindow?.bootstrap?.Modal) {
          const existingInstance = anyWindow.bootstrap.Modal.getInstance(
            modalElement,
          );
          const modalInstance =
            existingInstance || new anyWindow.bootstrap.Modal(modalElement);
          modalInstance.hide();
        }
      }
    } catch (err: any) {
      setCreateSupplierError(
        err?.message || "Failed to create vendor. Please try again.",
      );
    } finally {
      setCreateSupplierLoading(false);
    }
  };

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row-${prev.length + 1}`,
        productId: undefined,
        description: "",
        quantity: "1",
        rate: "0",
        discount: "0",
        taxRate: "0",
      },
    ]);
  };

  const removeRow = (id: string) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
  };

  const buildPayload = (status: "DRAFT" | "OPEN") => {
    const validItems = items.filter(
      (row) => row.productId && parseNumber(row.quantity) > 0,
    );
    if (validItems.length === 0) {
      throw new Error("At least one item with quantity is required");
    }

    if (!storeId) {
      throw new Error("No store is configured. Please create a store in settings.");
    }

    const mappedItems = validItems.map((row) => {
      const quantity = parseNumber(row.quantity);
      const rate = parseNumber(row.rate);
      const discount = parseNumber(row.discount);
      const taxRate = parseNumber(row.taxRate);
      const base = quantity * rate - discount;
      const taxAmount = base * (taxRate / 100);

      return {
        productId: row.productId as string,
        variantId: null,
        description: row.description || null,
        quantity,
        rate,
        discount,
        taxRate,
        taxAmount,
      };
    });

    const body: Record<string, unknown> = {
      storeId,
      supplierId: supplierId || null,
      referenceNumber: referenceNumber || null,
      orderDate: orderDate ? orderDate.toISOString() : new Date().toISOString(),
      expectedReceiptDate: expectedReceiptDate
        ? expectedReceiptDate.toISOString()
        : null,
      paymentTerms: paymentTerms || null,
      deliveryMethod: deliveryMethod || null,
      buyer: buyer || null,
      discount: totals.discount,
      taxAmount: totals.taxAmount,
      adjustment: totals.adjustment,
      status,
      notes: notes || null,
      terms: terms || null,
      emailRecipients: emailRecipients || null,
      items: mappedItems,
    };

    return body;
  };

  const handleSubmit = async (status: "DRAFT" | "OPEN") => {
    try {
      setSubmitting(true);
      setError(null);

      const payload = buildPayload(status);
      await purchaseOrderService.createPurchaseOrder(payload);

      router.push(route.purchaseorderreport || "/purchase-order-report");
    } catch (e: any) {
      setError(e?.message || "Failed to save purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndSend = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const payload = buildPayload("DRAFT");
      const created = await purchaseOrderService.createPurchaseOrder(payload);

      const createdId = (created as any)?.id as string | undefined;

      if (createdId) {
        router.push(`/purchase-orders/${createdId}/send-email`);
      } else {
        router.push(route.purchaseorderreport || "/purchase-order-report");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to save and send purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-wrapper">
        <div className="content pos-design p-3">
          <div className="row pos-wrapper">
            {/* Left: products and basic fields */}
            <div className="col-md-12 col-lg-8 col-xl-8 d-flex">
              <div className="flex-fill">
                <div className="page-header border-0 pb-0 mb-3 d-flex align-items-center justify-content-between">
                  <div className="page-title">
                    <h4>New Purchase Order (POS Style)</h4>
                    <h6>Create a new purchase order</h6>
                  </div>
                  <ul className="table-top-head">
                    <TooltipIcons />
                    <button
                      type="button"
                      className="btn btn-link p-0 ms-2"
                      onClick={() => window.location.reload()}
                    >
                      <RefreshIcon />
                    </button>
                    <CollapesIcon />
                  </ul>
                </div>

                <div className="pos-categories tabs_wrapper p-0 mb-3">
                  <div className="content-wrap">
                    <div className="tab-wrap">
                      <ul className="tabs owl-carousel pos-category5">
                        <li
                          id="all"
                          className={activeTab === "all" ? "active" : ""}
                          onClick={() => setActiveTab("all")}
                        >
                          <a className="d-block">
                            <img
                              src="/assets/img/categories/category-01.svg"
                              alt="Categories"
                            />
                          </a>
                          <h6>
                            <span>All</span>
                          </h6>
                        </li>
                      </ul>
                    </div>
                    <div className="tab-content-wrap">
                      <div className="d-flex align-items-center justify-content-between flex-wrap mb-2">
                        <div className="mb-3">
                          <h5 className="mb-1">Browse Products</h5>
                          <p>Select items to add into this purchase order</p>
                        </div>
                        <div className="d-flex align-items-center flex-wrap mb-2">
                          <div className="input-icon-start search-pos position-relative mb-2 me-3">
                            <span className="input-icon-addon">
                              <i className="ti ti-search" />
                            </span>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Search Product"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="pos-products">
                        <div className="tabs_container">
                          <div className="row g-3">
                            {filteredProducts.map((product, index) => {
                              const productImages = [
                                "/assets/img/products/pos-product-01.png",
                                "/assets/img/products/pos-product-02.png",
                                "/assets/img/products/pos-product-03.png",
                                "/assets/img/products/pos-product-04.png",
                                "/assets/img/products/pos-product-05.png",
                                "/assets/img/products/pos-product-06.png",
                                "/assets/img/products/pos-product-07.png",
                                "/assets/img/products/pos-product-08.png",
                                "/assets/img/products/pos-product-09.png",
                                "/assets/img/products/pos-product-10.png",
                                "/assets/img/products/pos-product-11.png",
                                "/assets/img/products/pos-product-12.png",
                              ];

                              const imgSrc =
                                product.image && product.image.trim().length > 0
                                  ? product.image
                                  : productImages[index % productImages.length];

                              const price =
                                typeof product.unitPrice === "number"
                                  ? formatCurrencyINR(product.unitPrice)
                                  : "";

                              const existingRow = items.find(
                                (row) => row.productId === product.value,
                              );
                              const currentQty = parseNumber(
                                existingRow?.quantity || "0",
                                0,
                              );

                              const stockOnHand =
                                typeof product.stockOnHand === "number"
                                  ? product.stockOnHand
                                  : 0;

                              return (
                                <div
                                  className="col-sm-6 col-md-6 col-lg-6 col-xl-4 col-xxl-3"
                                  key={product.value}
                                >
                                  <div
                                    className="product-info card mb-0"
                                    onClick={() => {
                                      addProductToOrder(product);
                                    }}
                                    tabIndex={0}
                                  >
                                    <div className="pro-img">
                                      <img src={imgSrc} alt={product.label} />
                                      <span>
                                        <i className="ti ti-circle-check-filled" />
                                      </span>
                                    </div>
                                    <h6 className="product-name">
                                      <span>{product.label}</span>
                                    </h6>
                                    <div className="d-flex align-items-center justify-content-between price">
                                      <div>
                                        <p className="text-gray-9 mb-0">
                                          {price || "-"}
                                        </p>
                                        <p className="mb-0 small text-muted">
                                          {`Current Stock: ${stockOnHand}`}
                                        </p>
                                      </div>
                                      <div className="qty-item m-0 d-flex align-items-center">
                                        <a
                                          href="#"
                                          className="dec d-flex justify-content-center align-items-center"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            decrementProductInOrder(product);
                                          }}
                                        >
                                          <i className="ti ti-minus" />
                                        </a>
                                        <input
                                          type="text"
                                          className="form-control text-center mx-1"
                                          readOnly
                                          value={String(currentQty)}
                                        />
                                        <a
                                          href="#"
                                          className="inc d-flex justify-content-center align-items-center"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            addProductToOrder(product);
                                          }}
                                        >
                                          <i className="ti ti-plus" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {filteredProducts.length === 0 && (
                              <div className="col-12">
                                <p className="text-muted mb-0">No products found.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right: vendor info, order summary, notes, actions */}
            <div className="col-md-12 col-lg-5 col-xl-4 ps-0 theiaStickySidebar d-lg-flex">
              <aside className="product-order-list bg-secondary-transparent flex-fill">
                <div className="card">
                  <div className="card-body">
                    <div className="order-head d-flex align-items-center justify-content-between w-100">
                      <div>
                        <h3>Order List</h3>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge badge-dark fs-10 fw-medium badge-xs">
                          #PO123
                        </span>
                        <Link className="link-danger fs-16" href="#">
                          <i className="ti ti-trash-x-filled" />
                        </Link>
                      </div>
                    </div>

                    <div className="customer-info block-section">
                      <h5 className="mb-2">Vendor Information</h5>
                      <div className="d-flex align-items-center gap-2">
                        <div className="flex-grow-1">
                          <Select
                            options={suppliers}
                            classNamePrefix="react-select select"
                            placeholder="Choose a Vendor"
                            value={
                              suppliers.find((s) => s.value === supplierId) || null
                            }
                            onChange={(opt) =>
                              setSupplierId(opt ? (opt as Option).value : "")
                            }
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-teal btn-icon fs-20"
                          data-bs-toggle="modal"
                          data-bs-target="#add-vendor-pos"
                        >
                          <i className="ti ti-user-plus" />
                        </button>
                      </div>
                      {selectedSupplierDetails && (
                        <div className="customer-item border border-orange bg-orange-100 d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
                          <div>
                            <h6 className="fs-16 fw-bold mb-1">
                              {selectedSupplierDetails.displayName ||
                                selectedSupplierDetails.name ||
                                "-"}
                            </h6>
                            <div className="d-inline-flex align-items-center gap-2 customer-bonus">
                              <p className="fs-13 d-inline-flex align-items-center gap-1 mb-0">
                                Email :
                                <span className="badge bg-cyan fs-13 fw-bold p-1">
                                  {selectedSupplierDetails.email || "-"}
                                </span>
                              </p>
                              <p className="fs-13 d-inline-flex align-items-center gap-1 mb-0">
                                Mobile :
                                <span className="badge bg-teal fs-13 fw-bold p-1">
                                  {selectedSupplierDetails.mobile ||
                                    selectedSupplierDetails.phone ||
                                    "-"}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="customer-info block-section">
                      <h5 className="mb-2">Order Information</h5>
                      <div className="row">
                        <div className="col-lg-6 col-sm-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">Reference#</label>
                            <input
                              type="text"
                              className="form-control"
                              value={referenceNumber}
                              onChange={(e) => setReferenceNumber(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-lg-6 col-sm-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">Order Date</label>
                            <div className="input-groupicon calender-input">
                              <DatePicker
                                className="form-control datetimepicker"
                                value={orderDate ? dayjs(orderDate) : null}
                                onChange={(value: any) =>
                                  setOrderDate(
                                    value
                                      ? value.toDate?.() || new Date(value)
                                      : null,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="col-lg-6 col-sm-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">Expected Receipt Date</label>
                            <div className="input-groupicon calender-input">
                              <DatePicker
                                className="form-control datetimepicker"
                                value={
                                  expectedReceiptDate
                                    ? dayjs(expectedReceiptDate)
                                    : null
                                }
                                onChange={(value: any) =>
                                  setExpectedReceiptDate(
                                    value
                                      ? value.toDate?.() || new Date(value)
                                      : null,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="product-added block-section">
                      <div className="head-text d-flex align-items-center justify-content-between mb-3">
                        <div className="d-flex align-items-center">
                          <h5 className="me-2">Order Details</h5>
                          <div className="badge bg-light text-gray-9 fs-12 fw-semibold py-2 border rounded">
                            Items :
                            <span className="text-teal ms-1">
                              {items.filter((row) => row.productId).length}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-link d-flex align-items-center clear-icon fs-10 fw-medium p-0"
                          onClick={clearAllItems}
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="product-wrap">
                        {items.filter((row) => row.productId).length === 0 ? (
                          <div className="empty-cart">
                            <div className="fs-24 mb-1">
                              <i className="ti ti-shopping-cart" />
                            </div>
                            <p className="fw-bold">No Products Selected</p>
                          </div>
                        ) : (
                          <div className="product-list border-0 p-0">
                            <div className="table-responsive">
                              <table className="table table-borderless">
                                <thead>
                                  <tr>
                                    <th className="fw-bold bg-light">Item</th>
                                    <th className="fw-bold bg-light">QTY</th>
                                    <th className="fw-bold bg-light text-end">Cost</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items
                                    .filter((row) => row.productId)
                                    .map((row) => {
                                      const product = products.find(
                                        (p) => p.value === row.productId,
                                      );
                                      if (!product) {
                                        return null;
                                      }

                                      const qty = parseNumber(row.quantity);
                                      const rate = parseNumber(row.rate);
                                      const discount = parseNumber(row.discount);
                                      const taxRate = parseNumber(row.taxRate);
                                      const base = qty * rate - discount;
                                      const tax = base * (taxRate / 100);
                                      const lineTotal = base + tax;

                                      return (
                                        <tr key={row.id}>
                                          <td>
                                            <div className="d-flex align-items-center">
                                              <button
                                                type="button"
                                                className="delete-icon btn btn-link p-0 me-2"
                                                onClick={() =>
                                                  removeItemByProductId(
                                                    row.productId as string,
                                                  )
                                                }
                                              >
                                                <i className="ti ti-trash-x-filled" />
                                              </button>
                                              <h6 className="fs-13 fw-normal mb-0">
                                                <span className="link-default">
                                                  {product.label}
                                                </span>
                                              </h6>
                                            </div>
                                          </td>
                                          <td>
                                            <div className="qty-item m-0 d-flex align-items-center">
                                              <a
                                                href="#"
                                                className="dec d-flex justify-content-center align-items-center"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  const option =
                                                    product as ProductOption;
                                                  decrementProductInOrder(option);
                                                }}
                                              >
                                                <i className="ti ti-minus" />
                                              </a>
                                              <input
                                                type="text"
                                                className="form-control text-center mx-1"
                                                readOnly
                                                value={String(qty)}
                                              />
                                              <a
                                                href="#"
                                                className="inc d-flex justify-content-center align-items-center"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  const option =
                                                    product as ProductOption;
                                                  addProductToOrder(option);
                                                }}
                                              >
                                                <i className="ti ti-plus" />
                                              </a>
                                            </div>
                                          </td>
                                          <td className="fs-13 fw-semibold text-gray-9 text-end">
                                            {formatCurrencyINR(lineTotal)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="order-total bg-total bg-white p-0 mt-3">
                        <h5 className="mb-3">Payment Summary</h5>
                        <table className="table table-responsive table-borderless mb-0">
                          <tbody>
                            <tr>
                              <td>Sub Total</td>
                              <td className="text-gray-9 text-end">
                                {formatCurrencyINR(totals.subtotal)}
                              </td>
                            </tr>
                            <tr>
                              <td>Discount</td>
                              <td className="text-end">
                                <input
                                  type="number"
                                  className="form-control text-end"
                                  value={orderDiscount}
                                  onChange={(e) =>
                                    setOrderDiscount(e.target.value)
                                  }
                                />
                              </td>
                            </tr>
                            <tr>
                              <td>Adjustment</td>
                              <td className="text-end">
                                <input
                                  type="number"
                                  className="form-control text-end"
                                  value={orderAdjustment}
                                  onChange={(e) =>
                                    setOrderAdjustment(e.target.value)
                                  }
                                />
                              </td>
                            </tr>
                            <tr>
                              <td>Tax</td>
                              <td className="text-gray-9 text-end">
                                {formatCurrencyINR(totals.taxAmount)}
                              </td>
                            </tr>
                            <tr>
                              <td className="fw-bold border-top border-dashed">
                                Total (Rs.)
                              </td>
                              <td className="text-gray-9 fw-bold text-end border-top border-dashed">
                                {formatCurrencyINR(totals.total)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-0 mb-3">
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label">Vendor Notes</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Terms &amp; Conditions</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Email Recipients</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Comma separated emails"
                        value={emailRecipients}
                        onChange={(e) => setEmailRecipients(e.target.value)}
                      />
                    </div>

                    {error && <p className="text-danger mb-2">{error}</p>}

                    <div className="d-flex justify-content-end flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          router.push(
                            route.purchaseorderreport || "/purchase-order-report",
                          )
                        }
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={submitting}
                        onClick={() => handleSubmit("DRAFT")}
                      >
                        Save as Draft
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={submitting}
                        onClick={handleSaveAndSend}
                      >
                        Save and Send
                      </button>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
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

      <CommonDeleteModal />

      <div
        className="modal fade"
        id="add-vendor-pos"
        tabIndex={-1}
        aria-labelledby="add-vendor-pos-label"
        aria-hidden="true"
      >
        <div
          className="modal-dialog modal-lg modal-dialog-centered"
          role="document"
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="add-vendor-pos-label">
                Add Vendor
              </h5>
              <button
                type="button"
                className="close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <form onSubmit={handleCreateSupplier}>
              <div className="modal-body pb-1">
                <div className="row">
                  <div className="col-lg-6 col-sm-12 col-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Vendor Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={newSupplierName}
                        onChange={(e) => setNewSupplierName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-lg-6 col-sm-12 col-12">
                    <div className="mb-3">
                      <label className="form-label">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newSupplierPhone}
                        onChange={(e) => setNewSupplierPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-lg-6 col-sm-12 col-12">
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={newSupplierEmail}
                        onChange={(e) => setNewSupplierEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-lg-6 col-sm-12 col-12">
                    <div className="mb-3">
                      <label className="form-label">Address</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newSupplierAddress}
                        onChange={(e) => setNewSupplierAddress(e.target.value)}
                      />
                    </div>
                  </div>
                  {createSupplierError && (
                    <div className="col-12">
                      <p className="text-danger mb-0">{createSupplierError}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer d-flex justify-content-end gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-md btn-secondary"
                  data-bs-dismiss="modal"
                  disabled={createSupplierLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-md btn-primary"
                  disabled={createSupplierLoading}
                >
                  {createSupplierLoading ? "Saving..." : "Save Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
