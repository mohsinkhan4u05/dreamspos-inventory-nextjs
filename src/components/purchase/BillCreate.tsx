"use client";

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
  billService,
} from "@/services/api";
import { formatCurrencyINR } from "@/lib/currency";

interface Option {
  value: string;
  label: string;
}

interface ProductOption extends Option {
  unitCost?: number;
  sku?: string;
}

interface ItemRow {
  id: string;
  productId?: string;
  quantity: string;
  unitCost: string;
  discount: string;
  taxRate: string;
}

function parseNumber(value: string, fallback = 0): number {
  if (!value) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function BillCreate() {
  const router = useRouter();
  const route = all_routes;

  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [stores, setStores] = useState<Option[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [storeId, setStoreId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(new Date());
  const [expectedDate, setExpectedDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<ItemRow[]>([
    {
      id: "row-1",
      productId: undefined,
      quantity: "1",
      unitCost: "0",
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
          ((supplierRes as { data?: Array<{ id: string; displayName?: string | null; name: string }> })
            .data || []).map((s) => ({
            value: s.id,
            label: s.displayName || s.name,
          })),
        );

        const storeOptions = ((storeRes as { data?: Array<{ id: string; name: string }> })
          .data || []).map((s) => ({
          value: s.id,
          label: s.name,
        }));

        setStores(storeOptions);
        if (!storeId && storeOptions.length > 0) {
          setStoreId(storeOptions[0].value);
        }

        const loadedProducts = Array.isArray(productRes)
          ? (productRes as Array<{ id: string; name?: string; productName?: string; costPrice?: number; sellingPrice?: number; price?: number; sku?: string }>)
          : ((productRes as { data?: Array<{ id: string; name?: string; productName?: string; costPrice?: number; sellingPrice?: number; price?: number; sku?: string }>; products?: Array<{ id: string; name?: string; productName?: string; costPrice?: number; sellingPrice?: number; price?: number; sku?: string }> }).data ||
            (productRes as { data?: unknown; products?: Array<{ id: string; name?: string; productName?: string; costPrice?: number; sellingPrice?: number; price?: number; sku?: string }> }).products ||
            []);

        const productOptions: ProductOption[] = (loadedProducts || []).map(
          (p) => ({
            value: p.id,
            label: p.name || p.productName || "Unnamed",
            unitCost:
              typeof p.costPrice === "number"
                ? p.costPrice
                : typeof p.sellingPrice === "number"
                ? p.sellingPrice
                : typeof p.price === "number"
                ? p.price
                : 0,
            sku: p.sku || "",
          }),
        );

        setProducts(productOptions);
      } catch (e: unknown) {
        console.error("Failed to load bill form data", e);
        setError("Failed to load initial data for bill form");
      }
    };

    load();
  }, [storeId]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, row) => {
      const qty = parseNumber(row.quantity);
      const cost = parseNumber(row.unitCost);
      return sum + qty * cost;
    }, 0);

    const lineDiscount = items.reduce(
      (sum, row) => sum + parseNumber(row.discount),
      0,
    );

    const lineTax = items.reduce((sum, row) => {
      const qty = parseNumber(row.quantity);
      const cost = parseNumber(row.unitCost);
      const base = qty * cost - parseNumber(row.discount);
      const tax = base * (parseNumber(row.taxRate) / 100);
      return sum + (Number.isFinite(tax) ? tax : 0);
    }, 0);

    const discount = lineDiscount;
    const taxAmount = lineTax;
    const total = subtotal - discount + taxAmount;

    return { subtotal, discount, taxAmount, total };
  }, [items]);

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
              unitCost:
                option && typeof option.unitCost === "number"
                  ? String(option.unitCost)
                  : row.unitCost,
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
        quantity: "1",
        unitCost: "0",
        discount: "0",
        taxRate: "0",
      },
    ]);
  };

  const removeRow = (id: string) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const buildPayload = () => {
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
      const unitCost = parseNumber(row.unitCost);
      const discount = parseNumber(row.discount);
      const taxRate = parseNumber(row.taxRate);
      const base = quantity * unitCost - discount;
      const taxAmount = base * (taxRate / 100);

      return {
        productId: row.productId as string,
        quantity: String(quantity),
        unitCost: String(unitCost),
        discount,
        taxRate,
        taxAmount,
      };
    });

    const body: Record<string, unknown> = {
      storeId,
      supplierId: supplierId || null,
      discount: totals.discount,
      tax: totals.taxAmount,
      paidAmount: 0,
      expectedDate: expectedDate ? expectedDate.toISOString() : null,
      notes: notes || null,
      paymentStatus: "PENDING",
      items: mappedItems,
    };

    return body;
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const payload = buildPayload();
      await billService.createBill(payload);

      router.push(route.purchaselist || "/purchase-list");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save bill";
      setError(message);
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
              <h4>New Bill</h4>
              <h6>Create a new supplier bill</h6>
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
                    <label className="form-label">Supplier</label>
                    <Select
                      classNamePrefix="react-select"
                      options={suppliers}
                      value={suppliers.find((c) => c.value === supplierId) || null}
                      onChange={(opt) =>
                        setSupplierId(opt ? (opt as Option).value : "")
                      }
                      placeholder="Select Supplier"
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
                    <label className="form-label">Bill Date</label>
                    <div className="input-groupicon calender-input">
                      <DatePicker
                        className="form-control datetimepicker"
                        value={purchaseDate ? dayjs(purchaseDate) : null}
                        onChange={(value: any) =>
                          setPurchaseDate(
                            value ? value.toDate?.() || new Date(value) : null,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="col-lg-4 col-sm-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Expected Payment Date</label>
                    <div className="input-groupicon calender-input">
                      <DatePicker
                        className="form-control datetimepicker"
                        value={expectedDate ? dayjs(expectedDate) : null}
                        onChange={(value: any) =>
                          setExpectedDate(
                            value ? value.toDate?.() || new Date(value) : null,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="table-responsive no-pagination mb-3">
                <table className="table datanew">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 220 }}>Item</th>
                      <th>Quantity</th>
                      <th>Unit Cost</th>
                      <th>Discount</th>
                      <th>Tax %</th>
                      <th>Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => {
                      const qty = parseNumber(row.quantity);
                      const unitCost = parseNumber(row.unitCost);
                      const discount = parseNumber(row.discount);
                      const taxRate = parseNumber(row.taxRate);
                      const base = qty * unitCost - discount;
                      const tax = base * (taxRate / 100);
                      const lineTotal = base + tax;

                      return (
                        <tr key={row.id}>
                          <td>
                            <div className="mb-2">
                              <Select
                                classNamePrefix="react-select"
                                options={products}
                                value={
                                  products.find((p) => p.value === row.productId) || null
                                }
                                onChange={(opt) =>
                                  handleProductChange(row.id, opt as ProductOption | null)
                                }
                                placeholder="Select item"
                              />
                            </div>
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
                              value={row.unitCost}
                              min={0}
                              onChange={(e) =>
                                handleItemChange(row.id, "unitCost", e.target.value)
                              }
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
                        <h5>{formatCurrencyINR(totals.discount)}</h5>
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
                <div className="col-lg-12 col-sm-12">
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
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
                    router.push(route.purchaselist || "/purchase-list")
                  }
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "Saving..." : "Save Bill"}
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
