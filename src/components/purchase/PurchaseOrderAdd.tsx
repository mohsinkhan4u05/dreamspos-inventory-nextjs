"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Select from "react-select";
import type { StylesConfig } from "react-select";
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

const productSelectStyles: StylesConfig<ProductOption, false> = {
  control: (base) => ({
    ...base,
    minHeight: 44,
    borderColor: "#dee2e6",
    boxShadow: "none",
    "&:hover": {
      borderColor: "#ced4da",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    paddingTop: 4,
    paddingBottom: 4,
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 13,
    whiteSpace: "normal",
    backgroundColor: state.isSelected
      ? "#0d6efd"
      : state.isFocused
      ? "#f5f5f5"
      : base.backgroundColor,
    color: state.isSelected ? "#fff" : base.color,
  }),
};

function parseNumber(value: string, fallback = 0): number {
  if (!value) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function PurchaseOrderAdd() {
  const router = useRouter();
  const route = all_routes;

  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [stores, setStores] = useState<Option[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);

  const [storeId, setStoreId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [orderDate, setOrderDate] = useState<Date | null>(new Date());
  const [expectedReceiptDate, setExpectedReceiptDate] = useState<Date | null>(null);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [buyer, setBuyer] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [emailRecipients, setEmailRecipients] = useState("");

  const [orderDiscount, setOrderDiscount] = useState("0");
  const [orderAdjustment, setOrderAdjustment] = useState("0");

  const [items, setItems] = useState<ItemRow[]>([
    {
      id: "row-1",
      productId: undefined,
      description: "",
      quantity: "1",
      rate: "0",
      discount: "0",
      taxRate: "0",
    },
  ]);

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

        setSuppliers(
          (supplierRes.data || []).map((s: any) => ({
            value: s.id,
            label: s.displayName || s.name,
          })),
        );

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
  }, []);

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
        (sum: number, s: any) => sum + (typeof s.quantity === "number" ? s.quantity : 0),
        0,
      );

      return {
        value: p.id,
        label: p.name || p.productName || "Unnamed",
        unitPrice,
        sku: p.sku || "",
        stockOnHand,
      };
    });

    setProducts(mapped);
  }, [rawProducts, storeId]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, row) => {
      const qty = parseNumber(row.quantity);
      const rate = parseNumber(row.rate);
      return sum + qty * rate;
    }, 0);

    const lineDiscount = items.reduce((sum, row) => sum + parseNumber(row.discount), 0);
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
    const validItems = items.filter((row) => row.productId && parseNumber(row.quantity) > 0);
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
        <div className="content">
          <div className="page-header">
            <div className="page-title">
              <h4>New Purchase Order</h4>
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

          <div className="card border-0">
            <div className="card-body pb-0">
              <div className="row">
                <div className="col-lg-4 col-sm-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Vendor Name</label>
                    <Select
                      classNamePrefix="react-select"
                      options={suppliers}
                      value={suppliers.find((c) => c.value === supplierId) || null}
                      onChange={(opt) => setSupplierId(opt ? (opt as Option).value : "")}
                      placeholder="Select Vendor"
                    />
                  </div>
                </div>
                <div className="col-lg-4 col-sm-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Store</label>
                    <Select
                      classNamePrefix="react-select"
                      options={stores}
                      value={stores.find((s) => s.value === storeId) || null}
                      onChange={(opt) => setStoreId(opt ? (opt as Option).value : "")}
                      placeholder="Select Store"
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-lg-4 col-sm-6 col-12">
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
                <div className="col-lg-4 col-sm-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Order Date</label>
                    <div className="input-groupicon calender-input">
                      <DatePicker
                        className="form-control datetimepicker"
                        value={orderDate ? dayjs(orderDate) : null}
                        onChange={(value: any) =>
                          setOrderDate(value ? value.toDate?.() || new Date(value) : null)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="col-lg-4 col-sm-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Expected Receipt Date</label>
                    <div className="input-groupicon calender-input">
                      <DatePicker
                        className="form-control datetimepicker"
                        value={expectedReceiptDate ? dayjs(expectedReceiptDate) : null}
                        onChange={(value: any) =>
                          setExpectedReceiptDate(
                            value ? value.toDate?.() || new Date(value) : null,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-lg-4 col-sm-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Payment Terms</label>
                    <input
                      type="text"
                      className="form-control"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-lg-4 col-sm-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Delivery Method</label>
                    <input
                      type="text"
                      className="form-control"
                      value={deliveryMethod}
                      onChange={(e) => setDeliveryMethod(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-lg-4 col-sm-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Buyer</label>
                    <input
                      type="text"
                      className="form-control"
                      value={buyer}
                      onChange={(e) => setBuyer(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="table-responsive no-pagination mb-3">
                <table className="table datanew">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 260 }}>Item Details</th>
                      <th>Quantity</th>
                      <th>Rate</th>
                      <th>Discount</th>
                      <th>Tax %</th>
                      <th>Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => {
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
                            <div className="mb-2">
                              <Select
                                classNamePrefix="react-select"
                                options={products}
                                value={products.find((p) => p.value === row.productId) || null}
                                onChange={(opt) =>
                                  handleProductChange(row.id, opt as ProductOption | null)
                                }
                                styles={productSelectStyles}
                                menuPosition="fixed"
                                formatOptionLabel={(option) => {
                                  const o = option as ProductOption;
                                  const details: string[] = [];
                                  if (o.sku) {
                                    details.push(`SKU: ${o.sku}`);
                                  }
                                  if (typeof o.unitPrice === "number") {
                                    details.push(`Cost: ${formatCurrencyINR(o.unitPrice)}`);
                                  }
                                  if (typeof o.stockOnHand === "number") {
                                    details.push(`Stock on hand: ${o.stockOnHand}`);
                                  }
                                  return (
                                    <div className="d-flex flex-column">
                                      <span>{o.label}</span>
                                      {details.length > 0 && (
                                        <small className="text-muted">{details.join(" • ")}</small>
                                      )}
                                    </div>
                                  );
                                }}
                                placeholder="Select item"
                              />
                            </div>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Add a description to your item"
                              value={row.description || ""}
                              onChange={(e) =>
                                handleItemChange(row.id, "description", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              value={row.quantity}
                              min={0}
                              onChange={(e) =>
                                handleItemChange(row.id, "quantity", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              value={row.rate}
                              min={0}
                              onChange={(e) => handleItemChange(row.id, "rate", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              value={row.discount}
                              min={0}
                              onChange={(e) =>
                                handleItemChange(row.id, "discount", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control"
                              value={row.taxRate}
                              min={0}
                              onChange={(e) =>
                                handleItemChange(row.id, "taxRate", e.target.value)
                              }
                            />
                          </td>
                          <td>{formatCurrencyINR(lineTotal)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-link text-danger p-0"
                              onClick={() => removeRow(row.id)}
                            >
                              <span className="ti ti-x" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mb-3">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={addRow}
                >
                  Add New Row
                </button>
              </div>

              <div className="row">
                <div className="col-lg-6 ms-auto">
                  <div className="total-order w-100 max-widthauto m-auto mb-4">
                    <ul className="rounded-1 border-1">
                      <li className="border-0 border-bottom">
                        <h4 className="border-end">Sub Total</h4>
                        <h5>{formatCurrencyINR(totals.subtotal)}</h5>
                      </li>
                      <li className="border-0 border-bottom">
                        <h4 className="border-end">Discount</h4>
                        <div className="d-flex align-items-center">
                          <input
                            type="number"
                            className="form-control me-2"
                            value={orderDiscount}
                            onChange={(e) => setOrderDiscount(e.target.value)}
                          />
                        </div>
                      </li>
                      <li className="border-0 border-bottom">
                        <h4 className="border-end">Adjustment</h4>
                        <input
                          type="number"
                          className="form-control me-2"
                          value={orderAdjustment}
                          onChange={(e) => setOrderAdjustment(e.target.value)}
                        />
                      </li>
                      <li className="border-0 border-bottom">
                        <h4 className="border-end">Tax</h4>
                        <h5>{formatCurrencyINR(totals.taxAmount)}</h5>
                      </li>
                      <li className="border-0 border-bottom">
                        <h4 className="border-end">Total (Rs.)</h4>
                        <h5>{formatCurrencyINR(totals.total)}</h5>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-lg-6 col-sm-12">
                  <div className="mb-3">
                    <label className="form-label">Vendor Notes</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-lg-6 col-sm-12">
                  <div className="mb-3">
                    <label className="form-label">Terms &amp; Conditions</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-lg-6 col-sm-12">
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
                </div>
              </div>

              {error && <p className="text-danger">{error}</p>}

              <div className="text-end">
                <button
                  type="button"
                  className="btn btn-secondary me-2"
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
                  className="btn btn-outline-primary me-2"
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
    </div>
  );
}
