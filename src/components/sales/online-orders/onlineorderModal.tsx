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
import { batchService, salesService, stockService } from "@/services/api";
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
    variantId?: string;
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

  type BatchAllocation = {
    id: string;
    batchId: string;
    quantity: string;
  };

  type BatchOption = {
    value: string;
    label: string;
    raw: {
      id: string;
      productId: string;
      batchNumber: string;
      manufacturingDate: string | null;
      expiryDate: string | null;
      availableQuantity: number;
      reservedQuantity: number;
    };
  };

  const [batchAllocations, setBatchAllocations] = useState<
    Record<string, BatchAllocation[]>
  >({});
  const [productBatches, setProductBatches] = useState<
    Record<string, BatchOption[]>
  >({});
  const [batchErrors, setBatchErrors] = useState<Record<string, string | null>>(
    {},
  );

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
    (item) => item.productId && item.quantityNum > 0 && item.unitPriceNum >= 0,
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
              0,
            );

            if (available < requiredQty) {
              liveInsufficient[productId] = { required: requiredQty, available };
            }
          }),
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
  const hasBatchErrors = Object.values(batchErrors).some((v) => !!v);

  const canSubmit =
    !!storeId &&
    validItems.length > 0 &&
    !hasStockIssues &&
    !hasBatchErrors &&
    !submitting;

  const loadBatchesForProduct = async (productId: string) => {
    if (!storeId || !productId) return;
    if (productBatches[productId]) return;

    try {
      const response = (await batchService.getBatches({
        storeId,
        productId,
      })) as { data?: any[] };

      const options: BatchOption[] = (response.data ?? [])
        .map((b) => {
          const available = (b.availableQuantity ?? 0) - (b.reservedQuantity ?? 0);
          if (available <= 0) return null;

          const expiryLabel = b.expiryDate
            ? new Date(b.expiryDate).toLocaleDateString()
            : "No expiry";

          return {
            value: b.id as string,
            label: `${b.batchNumber} • ${available.toFixed(2)} avail • exp ${expiryLabel}`,
            raw: {
              id: b.id as string,
              productId: b.productId as string,
              batchNumber: b.batchNumber as string,
              manufacturingDate: b.manufacturingDate ?? null,
              expiryDate: b.expiryDate ?? null,
              availableQuantity: Number(b.availableQuantity ?? 0),
              reservedQuantity: Number(b.reservedQuantity ?? 0),
            },
          };
        })
        .filter(Boolean) as BatchOption[];

      setProductBatches((prev) => ({
        ...prev,
        [productId]: options,
      }));
    } catch {
      // fail silently for now; fallback is no batch selector options
    }
  };

  const validateBatchAllocationsForItem = (itemId: string) => {
    const item = parsedItems.find((p) => p.id === itemId);
    if (!item) return;

    const quantity = item.quantityNum;
    const allocations = batchAllocations[itemId] ?? [];

    let total = 0;
    for (const alloc of allocations) {
      const q = parseFloat(alloc.quantity || "0");
      if (!Number.isFinite(q) || q < 0) continue;
      total += q;
    }

    if (total > quantity + 1e-6) {
      setBatchErrors((prev) => ({
        ...prev,
        [itemId]: `Allocated batch quantity (${total}) exceeds line quantity (${quantity}).`,
      }));
      return;
    }

    const currentProductId = items.find((i) => i.id === itemId)?.productId;
    if (currentProductId && productBatches[currentProductId]) {
      for (const alloc of allocations) {
        if (!alloc.batchId) continue;
        const batchOpt = productBatches[currentProductId].find(
          (opt) => opt.value === alloc.batchId,
        );
        if (!batchOpt) continue;
        const available =
          (batchOpt.raw.availableQuantity ?? 0) -
          (batchOpt.raw.reservedQuantity ?? 0);
        const q = parseFloat(alloc.quantity || "0");
        if (q > available + 1e-6) {
          setBatchErrors((prev) => ({
            ...prev,
            [itemId]: `Batch ${batchOpt.raw.batchNumber} only has ${available} available.`,
          }));
          return;
        }
      }
    }

    setBatchErrors((prev) => ({
      ...prev,
      [itemId]: null,
    }));
  };

  const handleAddBatchAllocationRow = (itemId: string) => {
    setBatchAllocations((prev) => {
      const existing = prev[itemId] ?? [];
      const next: BatchAllocation = {
        id: `${itemId}-batch-${existing.length + 1}`,
        batchId: "",
        quantity: "",
      };
      return {
        ...prev,
        [itemId]: [...existing, next],
      };
    });
  };

  const handleBatchAllocationChange = (
    itemId: string,
    allocationId: string,
    field: keyof Omit<BatchAllocation, "id">,
    value: string,
  ) => {
    setBatchAllocations((prev) => {
      const existing = prev[itemId] ?? [];
      const updated = existing.map((row) =>
        row.id === allocationId ? { ...row, [field]: value } : row,
      );
      return {
        ...prev,
        [itemId]: updated,
      };
    });
    validateBatchAllocationsForItem(itemId);
  };

  const handleRemoveBatchAllocationRow = (itemId: string, allocationId: string) => {
    setBatchAllocations((prev) => {
      const existing = prev[itemId] ?? [];
      const updated = existing.filter((row) => row.id !== allocationId);
      if (updated.length === 0) {
        const { [itemId]: _removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [itemId]: updated,
      };
    });
    validateBatchAllocationsForItem(itemId);
  };

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
    value: string,
  ) => {
    let next = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item,
    );

    if (field === "productId") {
      const productId = value;
      if (productId) {
        const product = (products?.data ?? []).find((p: any) => p.id === productId);
        const variants = Array.isArray(product?.variants)
          ? product.variants
          : [];
        const activeVariants = variants.filter(
          (v: any) => v && v.isActive !== false,
        );

        // Reset variantId by default when product changes
        next = next.map((item) =>
          item.id === id ? { ...item, variantId: undefined } : item,
        );

        if (activeVariants.length === 1 && typeof activeVariants[0].id === "string") {
          const singleVariantId = activeVariants[0].id as string;
          next = next.map((item) =>
            item.id === id ? { ...item, variantId: singleVariantId } : item,
          );
        }

        loadBatchesForProduct(productId);
      }

      setBatchAllocations((prev) => ({
        ...prev,
        [id]: [],
      }));
      setBatchErrors((prev) => ({
        ...prev,
        [id]: null,
      }));
    }

    if (field === "quantity") {
      validateBatchAllocationsForItem(id);
    }

    setItems(next);
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
            0,
          );

          if (available < requiredQty) {
            insufficientDetails[productId] = { required: requiredQty, available };
          }
        }),
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

      const batchOverridesPayload = items
        .map((row, index) => {
          const allocations = (batchAllocations[row.id] ?? []).filter(
            (alloc) => alloc.batchId && parseFloat(alloc.quantity || "0") > 0,
          );

          if (allocations.length === 0) {
            return null;
          }

          return {
            itemIndex: index,
            allocations: allocations.map((alloc) => ({
              batchId: alloc.batchId,
              quantity: parseFloat(alloc.quantity || "0"),
            })),
          };
        })
        .filter(Boolean) as {
        itemIndex: number;
        allocations: {
          batchId: string;
          quantity: number;
        }[];
      }[];

      await salesService.createSale({
        storeId,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        items: validItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantityNum,
          unitPrice: item.unitPriceNum,
          discount: item.discountNum,
          taxRate: item.taxRateNum,
          taxAmount: item.taxAmount,
        })),
        discount: orderDiscount,
        tax: orderTax,
        paidAmount,
        batchOverrides:
          batchOverridesPayload.length > 0 ? batchOverridesPayload : undefined,
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
                      <th style={{ minWidth: 220 }}>Batches (optional)</th>
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
                            {(() => {
                              const product = (products?.data ?? []).find(
                                (p: any) => p.id === item.productId,
                              );
                              const variants = Array.isArray(product?.variants)
                                ? product.variants
                                : [];
                              const activeVariants = variants.filter(
                                (v: any) => v && v.isActive !== false,
                              );

                              if (!product || activeVariants.length === 0) {
                                return null;
                              }

                              const variantOptions = activeVariants.map((v: any) => ({
                                value: v.id as string,
                                label: v.name || v.sku || "Variant",
                              }));

                              return (
                                <div className="mt-2">
                                  <Select
                                    classNamePrefix="react-select"
                                    options={variantOptions}
                                    value={
                                      variantOptions.find(
                                        (opt) => opt.value === item.variantId,
                                      ) || null
                                    }
                                    onChange={(opt) =>
                                      handleItemChange(
                                        item.id,
                                        "variantId",
                                        (opt as any)?.value || "",
                                      )
                                    }
                                    placeholder="Select variant"
                                  />
                                </div>
                              );
                            })()}
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
                          <td>
                            {(batchAllocations[item.id] ?? []).map((alloc) => (
                              <div
                                key={alloc.id}
                                className="d-flex align-items-center mb-1 gap-1"
                              >
                                <Select
                                  classNamePrefix="react-select"
                                  options={
                                    item.productId
                                      ? productBatches[item.productId] || []
                                      : []
                                  }
                                  value={
                                    item.productId
                                      ? (productBatches[item.productId] || []).find(
                                          (opt) => opt.value === alloc.batchId,
                                        ) || null
                                      : null
                                  }
                                  isDisabled={!item.productId}
                                  onChange={(opt) =>
                                    handleBatchAllocationChange(
                                      item.id,
                                      alloc.id,
                                      "batchId",
                                      opt?.value || "",
                                    )
                                  }
                                  placeholder={
                                    item.productId
                                      ? "Select batch"
                                      : "Select product first"
                                  }
                                />
                                <input
                                  type="number"
                                  min={0}
                                  className="form-control form-control-sm"
                                  style={{ maxWidth: 80 }}
                                  placeholder="Qty"
                                  value={alloc.quantity}
                                  onChange={(e) =>
                                    handleBatchAllocationChange(
                                      item.id,
                                      alloc.id,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                />
                                <button
                                  type="button"
                                  className="btn btn-link text-danger p-0 ms-1"
                                  onClick={() =>
                                    handleRemoveBatchAllocationRow(item.id, alloc.id)
                                  }
                                >
                                  <Minus size={14} />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm mt-1"
                              onClick={() => handleAddBatchAllocationRow(item.id)}
                            >
                              <PlusCircle size={14} className="me-1" /> Add Batch
                            </button>
                            <div className="form-text">
                              Leave empty to use default FIFO batches.
                            </div>
                            {batchErrors[item.id] && (
                              <div className="text-danger small mt-1">
                                {batchErrors[item.id]}
                              </div>
                            )}
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
