"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProducts } from "@/hooks/useProducts";
import { unitService, storeService, productionOrderService } from "@/services/api";
import { useBom } from "@/hooks/useBom";
import { bomService } from "@/services/api";
import { all_routes } from "@/data/all_routes";

interface UnitOption {
  id: string;
  name: string;
  code: string;
}

interface StoreOption {
  id: string;
  name: string;
  code: string;
}

interface BomRow {
  id?: string;
  rawMaterialId: string;
  unitId: string;
  quantityRequired: number;
}

export default function BomEditor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const finishedProductId = searchParams.get("productId") || "";

  const { products } = useProducts();
  const { bom, loading: bomLoading, error: bomError, refetch } = useBom(
    finishedProductId || undefined,
  );

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [rows, setRows] = useState<BomRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [createOrderLoading, setCreateOrderLoading] = useState(false);
  const [createOrderError, setCreateOrderError] = useState<string | null>(null);
  const [createOrderSuccess, setCreateOrderSuccess] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [plannedQty, setPlannedQty] = useState<number>(1);
  const [orderNotes, setOrderNotes] = useState("");
  const [selectedFinishedProductId, setSelectedFinishedProductId] = useState("");

  const finishedProduct = useMemo(
    () =>
      products?.data?.find((p: any) => p.id === finishedProductId) || null,
    [finishedProductId, products?.data],
  );

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const res = await unitService.getUnits();
        setUnits(res?.data || res?.units || []);
      } catch (e) {
        console.error("Failed to load units", e);
      }

      try {
        const storeRes = await storeService.getStores();
        setStores(storeRes?.data || storeRes?.stores || []);
      } catch (e) {
        console.error("Failed to load stores", e);
      }
    };

    loadMetadata();
  }, []);

  useEffect(() => {
    if (bom?.items?.length) {
      setRows(
        bom.items.map((item) => ({
          id: item.id,
          rawMaterialId: item.rawMaterialId,
          unitId: item.unitId,
          quantityRequired: item.quantityRequired,
        })),
      );
    } else {
      setRows([]);
    }
  }, [bom]);

  const handleRowChange = (index: number, changes: Partial<BomRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...changes } as BomRow;
      return next;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      { rawMaterialId: "", unitId: "", quantityRequired: 1 },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = useCallback(async () => {
    if (!finishedProductId) return;

    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      const payload = rows
        .filter((row) => row.rawMaterialId && row.unitId && row.quantityRequired > 0)
        .map((row) => ({
          rawMaterialId: row.rawMaterialId,
          unitId: row.unitId,
          quantityRequired: row.quantityRequired,
        }));

      await bomService.saveBom(finishedProductId, payload);
      setSaveSuccess("Bill of Materials saved successfully.");
      await refetch();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save Bill of Materials",
      );
    } finally {
      setSaving(false);
    }
  }, [finishedProductId, rows, refetch]);

  const handleCreateOrder = useCallback(async () => {
    if (!finishedProductId) return;

    if (!selectedStoreId || !Number.isFinite(plannedQty) || plannedQty <= 0) {
      setCreateOrderError(
        "Select a store and enter a positive planned quantity to create a production order.",
      );
      return;
    }

    try {
      setCreateOrderLoading(true);
      setCreateOrderError(null);
      setCreateOrderSuccess(null);

      const order = await productionOrderService.createProductionOrder({
        finishedProductId,
        storeId: selectedStoreId,
        quantityPlanned: plannedQty,
        notes: orderNotes || undefined,
      });

      setCreateOrderSuccess("Production order created successfully.");
      if (order?.id) {
        router.push(`${all_routes.manufacturingProductionOrders}/${order.id}`);
      }
    } catch (err) {
      setCreateOrderError(
        err instanceof Error
          ? err.message
          : "Failed to create production order",
      );
    } finally {
      setCreateOrderLoading(false);
    }
  }, [
    finishedProductId,
    selectedStoreId,
    plannedQty,
    orderNotes,
    router,
  ]);

  const rawMaterialOptions = useMemo(
    () =>
      (products?.data || []).filter((p: any) => p.id !== finishedProductId),
    [products?.data, finishedProductId],
  );

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="page-title">
            <h4>Bill of Materials</h4>
            <h6>
              Define raw materials for finished item{" "}
              {finishedProduct?.name ? `“${finishedProduct.name}”` : ""}
            </h6>
          </div>
          <div className="page-btn">
            <button
              type="button"
              className="btn btn-primary me-2"
              disabled={saving || !finishedProductId}
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save BOM"}
            </button>
            <Link href="/product-list" className="btn btn-outline-secondary">
              Back to Items
            </Link>
          </div>
        </div>

        {!finishedProductId && (
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Select Finished Item</h5>
            </div>
            <div className="card-body">
              <p className="mb-3">
                Select an item to configure its Bill of Materials and create production
                orders.
              </p>
              <div className="row g-3 align-items-end">
                <div className="col-md-6">
                  <label className="form-label">Finished Item</label>
                  <select
                    className="form-select"
                    value={selectedFinishedProductId}
                    onChange={(e) => setSelectedFinishedProductId(e.target.value)}
                  >
                    <option value="">Select item</option>
                    {(products?.data || []).map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <button
                    type="button"
                    className="btn btn-primary mt-2 mt-md-0"
                    disabled={!selectedFinishedProductId}
                    onClick={() => {
                      if (!selectedFinishedProductId) return;
                      router.push(
                        `${all_routes.manufacturingBOM}?productId=${selectedFinishedProductId}`,
                      );
                    }}
                  >
                    Edit BOM
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {bomLoading && (
          <div className="d-flex justify-content-center align-items-center" style={{ height: "200px" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {bomError && (
          <div className="alert alert-danger">{bomError}</div>
        )}

        {saveError && <div className="alert alert-danger">{saveError}</div>}
        {saveSuccess && <div className="alert alert-success">{saveSuccess}</div>}
        {createOrderError && (
          <div className="alert alert-danger">{createOrderError}</div>
        )}
        {createOrderSuccess && (
          <div className="alert alert-success">{createOrderSuccess}</div>
        )}

        {finishedProductId && (
          <>
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Raw Materials</h5>
              </div>
              <div className="card-body table-responsive">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: "40%" }}>Raw Material</th>
                      <th style={{ width: "20%" }}>Unit</th>
                      <th style={{ width: "20%" }} className="text-end">
                        Quantity Required
                      </th>
                      <th style={{ width: "10%" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            className="form-select"
                            value={row.rawMaterialId}
                            onChange={(e) =>
                              handleRowChange(index, {
                                rawMaterialId: e.target.value,
                              })
                            }
                          >
                            <option value="">Select raw material</option>
                            {rawMaterialOptions.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-select"
                            value={row.unitId}
                            onChange={(e) =>
                              handleRowChange(index, { unitId: e.target.value })
                            }
                          >
                            <option value="">Select unit</option>
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.code})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control text-end"
                            min={0}
                            step={0.01}
                            value={row.quantityRequired}
                            onChange={(e) =>
                              handleRowChange(index, {
                                quantityRequired: Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleRemoveRow(index)}
                          >
                            <i className="ti ti-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4}>
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={handleAddRow}
                        >
                          <i className="ti ti-plus me-1" /> Add Raw Material
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card mt-4">
              <div className="card-header">
                <h5 className="card-title mb-0">Create Production Order</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Store</label>
                    <select
                      className="form-select"
                      value={selectedStoreId}
                      onChange={(e) => setSelectedStoreId(e.target.value)}
                    >
                      <option value="">Select store</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Planned Quantity</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="form-control"
                      value={plannedQty}
                      onChange={(e) => setPlannedQty(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Notes (optional)</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={createOrderLoading || !finishedProductId}
                    onClick={handleCreateOrder}
                  >
                    {createOrderLoading
                      ? "Creating..."
                      : "Create Production Order"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
