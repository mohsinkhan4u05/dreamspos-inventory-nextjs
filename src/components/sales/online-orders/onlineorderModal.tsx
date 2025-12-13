"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from "react";
import Select from "react-select";
import {
  CustomerName,
  OrderStatus,
  PaymentType,
  Supplier,
} from "../../../core/common/selectOption/selectOption";
import { DatePicker, notification } from "antd";
import DefaultEditor from "react-simple-wysiwyg";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Minus,
  PlusCircle,
} from "react-feather";
import { salesService, stockService } from "@/services/api";
import { useStores } from "@/hooks/useStores";
import { useProducts } from "@/hooks/useProducts";

interface BootstrapModalInstance {
  hide: () => void;
}

interface BootstrapModalStatic {
  getInstance: (element: Element) => BootstrapModalInstance | null;
  new (element: Element): BootstrapModalInstance;
}

declare global {
  interface Window {
    bootstrap?: {
      Modal: BootstrapModalStatic;
    };
  }
}

const OnlineorderModal = () => {
  const [api, contextHolder] = notification.useNotification();

  type SaleItemRow = {
    id: string;
    productId: string;
    quantity: string;
    unitPrice: string;
    discount: string;
    taxRate: string;
  };

  const [values, setValue] = useState<string>("");

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    setValue(e.target.value);
  }

  const { stores } = useStores({ limit: 100 });
  const { products } = useProducts({ limit: 100 });

  const [storeId, setStoreId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [items, setItems] = useState<SaleItemRow[]>([
    {
      id: "row-1",
      productId: "",
      quantity: "1",
      unitPrice: "0",
      discount: "0",
      taxRate: "0",
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [insufficientStockDetails, setInsufficientStockDetails] = useState<
    Record<string, { required: number; available: number }>
  >({});

  useEffect(() => {
    if (!storeId && stores?.data?.length) {
      setStoreId(stores.data[0].id);
    }
  }, [stores, storeId]);

  const storeOptions = (stores?.data ?? []).map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const productOptions = (products?.data ?? []).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.sku})`,
  }));

  const parsedItems = items.map((item) => {
    const quantityNum = parseFloat(item.quantity || "0");
    const unitPriceNum = parseFloat(item.unitPrice || "0");
    const discountNum = parseFloat(item.discount || "0");
    const taxRateNum = parseFloat(item.taxRate || "0");

    const lineSubtotal = quantityNum * unitPriceNum;
    const taxAmount = lineSubtotal * (taxRateNum / 100);
    const lineTotal = lineSubtotal - discountNum + taxAmount;

    return {
      ...item,
      quantityNum,
      unitPriceNum,
      discountNum,
      taxRateNum,
      lineSubtotal,
      taxAmount,
      lineTotal,
    };
  });

  const validItems = parsedItems.filter(
    (item) => item.productId && item.quantityNum > 0 && item.unitPriceNum >= 0
  );

  const subtotal = parsedItems.reduce((sum, item) => sum + item.lineSubtotal, 0);
  const orderDiscount = parsedItems.reduce((sum, item) => sum + item.discountNum, 0);
  const orderTax = parsedItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal - orderDiscount + orderTax;

  useEffect(() => {
    if (!storeId || validItems.length === 0) {
      setInsufficientStockDetails({});
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      const productQuantities = new Map<string, number>();
      validItems.forEach((item) => {
        const current = productQuantities.get(item.productId) ?? 0;
        productQuantities.set(item.productId, current + item.quantityNum);
      });

      const liveInsufficient: Record<string, { required: number; available: number }> = {};

      try {
        await Promise.all(
          Array.from(productQuantities.entries()).map(async ([productId, requiredQty]) => {
            const stockResponse = await stockService.getStocks({
              storeId,
              productId,
              limit: 100,
            });

            const stockData = stockResponse as { data?: { productId: string; quantity?: number }[] };
            const available = (stockData.data ?? []).reduce(
              (sum, stock) => sum + (stock.quantity ?? 0),
              0
            );

            if (available < requiredQty) {
              liveInsufficient[productId] = { required: requiredQty, available };
            }
          })
        );

        if (!cancelled) {
          setInsufficientStockDetails(liveInsufficient);
        }
      } catch {
        if (!cancelled) {
          setInsufficientStockDetails({});
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [storeId, items]);

  const hasStockIssues = Object.keys(insufficientStockDetails).length > 0;

  const canSubmit = !!storeId && validItems.length > 0 && !hasStockIssues && !submitting;

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row-${prev.length + 1}`,
        productId: "",
        quantity: "1",
        unitPrice: "0",
        discount: "0",
        taxRate: "0",
      },
    ]);
  };

  const handleItemChange = (
    id: string,
    field: keyof Omit<SaleItemRow, "id">,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleCreateSale = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!storeId) {
      api.warning({
        message: "Sale validation error",
        description: "Store is required",
        placement: "topRight",
      });
      return;
    }

    if (validItems.length === 0) {
      api.warning({
        message: "Sale validation error",
        description: "At least one product is required",
        placement: "topRight",
      });
      return;
    }

    // Pre-check stock
    const productQuantities = new Map<string, number>();
    validItems.forEach((item) => {
      const current = productQuantities.get(item.productId) ?? 0;
      productQuantities.set(item.productId, current + item.quantityNum);
    });

    const insufficientDetails: Record<string, { required: number; available: number }> = {};

    try {
      await Promise.all(
        Array.from(productQuantities.entries()).map(async ([productId, requiredQty]) => {
          const stockResponse = await stockService.getStocks({
            storeId,
            productId,
            limit: 100,
          });

          const stockData = stockResponse as { data?: { quantity?: number }[] };
          const available = (stockData.data ?? []).reduce(
            (sum, stock) => sum + (stock.quantity ?? 0),
            0
          );

          if (available < requiredQty) {
            insufficientDetails[productId] = { required: requiredQty, available };
          }
        })
      );
    } catch {}

    if (Object.keys(insufficientDetails).length > 0) {
      setInsufficientStockDetails(insufficientDetails);

      api.warning({
        message: "Insufficient stock",
        description: "Please adjust quantities",
        placement: "topRight",
      });
      return;
    }

    setInsufficientStockDetails({});

    const paidAmount = grandTotal;

    try {
      setSubmitting(true);

      await salesService.createSale({
        storeId,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        items: validItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantityNum,
          unitPrice: item.unitPriceNum,
          discount: item.discountNum,
          taxRate: item.taxRateNum,
          taxAmount: item.taxAmount,
        })),
        discount: orderDiscount,
        tax: orderTax,
        paidAmount,
      });

      api.success({
        message: "Sale created",
        description: "The sale was created successfully.",
        placement: "topRight",
      });

      if (typeof window !== "undefined") {
        const modalElement = document.getElementById("add-sales-new");
        if (modalElement && window.bootstrap?.Modal) {
          const existingModal = window.bootstrap.Modal.getInstance(modalElement);
          const modalInstance = existingModal ?? new window.bootstrap.Modal(modalElement);
          modalInstance.hide();
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create sale";

      api.error({
        message: "Sale creation failed",
        description: errorMessage,
        placement: "topRight",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}

      <div
        className="modal fade"
        id="add-sales-new"
        tabIndex={-1}
        aria-labelledby="add-sales-new-label"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title" id="add-sales-new-label">
                Add Sales
              </h4>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              />
            </div>
            <div className="modal-body">
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label">
                    Store<span className="text-danger ms-1">*</span>
                  </label>
                  <Select
                    classNamePrefix="react-select"
                    options={storeOptions}
                    value={storeOptions.find((s) => s.value === storeId) || null}
                    onChange={(opt) => setStoreId(opt?.value || "")}
                    placeholder="Select store"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Customer Name</label>
                  <Select
                    classNamePrefix="react-select"
                    options={CustomerName}
                    onChange={(opt) => setCustomerName(opt?.label || "")}
                    placeholder="Walk-in Customer"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Customer Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Customer Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="table-responsive mb-3">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 220 }}>Product</th>
                      <th style={{ width: 100 }}>Qty</th>
                      <th style={{ width: 140 }}>Unit Price</th>
                      <th style={{ width: 120 }}>Discount</th>
                      <th style={{ width: 120 }}>Tax %</th>
                      <th style={{ width: 140 }}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const parsed = parsedItems.find((p) => p.id === item.id);
                      return (
                        <tr key={item.id}>
                          <td>
                            <Select
                              classNamePrefix="react-select"
                              options={productOptions}
                              value={
                                productOptions.find((p) => p.value === item.productId) || null
                              }
                              onChange={(opt) =>
                                handleItemChange(item.id, "productId", opt?.value || "")
                              }
                              placeholder="Select product"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-control"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(item.id, "quantity", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-control"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleItemChange(item.id, "unitPrice", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-control"
                              value={item.discount}
                              onChange={(e) =>
                                handleItemChange(item.id, "discount", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-control"
                              value={item.taxRate}
                              onChange={(e) =>
                                handleItemChange(item.id, "taxRate", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <span>
                              {parsed ? parsed.lineTotal.toFixed(2) : "0.00"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-3">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={handleAddItemRow}
                >
                  <PlusCircle className="me-1" size={16} /> Add Item
                </button>

                <div className="text-end">
                  <div>Subtotal: ${subtotal.toFixed(2)}</div>
                  <div>Discount: ${orderDiscount.toFixed(2)}</div>
                  <div>Tax: ${orderTax.toFixed(2)}</div>
                  <div className="fw-bold">Grand Total: ${grandTotal.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateSale}
                disabled={!canSubmit}
              >
                {submitting ? "Saving..." : "Save Sale"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OnlineorderModal;
