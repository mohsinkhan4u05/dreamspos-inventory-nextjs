"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import CommonFooter from "@/core/common/footer/commonFooter"
import { all_routes } from "@/data/all_routes"

type ItemDetailProps = {
  itemId: string
}

type PhysicalStock = {
  toBeShipped: number
  toBeReceived: number
  toBeInvoiced: number
  toBeBilled: number
}

type StockSummary = {
  productId: string
  openingStock: number | null
  openingStockRate: number | null
  stockOnHand: number
  committedStock: number
  availableForSale: number
  physicalStock: PhysicalStock
}

export default function ItemDetailComponent({ itemId }: ItemDetailProps) {
  const [item, setItem] = useState<any | null>(null)
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "history">("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openingStockInput, setOpeningStockInput] = useState<string>("")
  const [openingRateInput, setOpeningRateInput] = useState<string>("")
  const [savingOpeningStock, setSavingOpeningStock] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<any[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [itemRes, summaryRes] = await Promise.all([
          fetch(`/api/items/${itemId}`),
          fetch(`/api/items/${itemId}/stock-summary`),
        ])

        if (!itemRes.ok) {
          const data = await itemRes.json().catch(() => null)
          throw new Error(data?.error || "Failed to load item")
        }

        if (!summaryRes.ok) {
          const data = await summaryRes.json().catch(() => null)
          throw new Error(data?.error || "Failed to load stock summary")
        }

        const [itemData, summaryData] = await Promise.all([
          itemRes.json(),
          summaryRes.json(),
        ])

        if (!isMounted) return

        setItem(itemData)
        setStockSummary(summaryData)
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : "Failed to load item details")
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [itemId])

  const handleOpenOpeningStockModal = () => {
    if (stockSummary) {
      setOpeningStockInput(
        stockSummary.openingStock !== null && stockSummary.openingStock !== undefined
          ? String(stockSummary.openingStock)
          : "",
      )
      setOpeningRateInput(
        stockSummary.openingStockRate !== null && stockSummary.openingStockRate !== undefined
          ? String(stockSummary.openingStockRate)
          : "",
      )
    }
  }

  const reloadStockSummary = async () => {
    try {
      const res = await fetch(`/api/items/${itemId}/stock-summary`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to refresh stock summary")
      }
      const summary: StockSummary = await res.json()
      setStockSummary(summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh stock summary")
    }
  }

  const handleSubmitOpeningStock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setSavingOpeningStock(true)
      setError(null)

      const body = {
        openingStock: openingStockInput === "" ? null : Number(openingStockInput),
        openingStockRate: openingRateInput === "" ? null : Number(openingRateInput),
      }

      const res = await fetch(`/api/items/${itemId}/opening-stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to update opening stock")
      }

      await reloadStockSummary()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update opening stock")
    } finally {
      setSavingOpeningStock(false)
    }
  }

  useEffect(() => {
    const loadHistory = async () => {
      if (activeTab !== "history" || historyEntries !== null) {
        return
      }

      try {
        setHistoryLoading(true)
        setHistoryError(null)

        const res = await fetch(`/api/items/${itemId}/history`)
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || "Failed to load history")
        }

        const data = await res.json()
        setHistoryEntries(Array.isArray(data?.data) ? data.data : [])
      } catch (err) {
        setHistoryError(err instanceof Error ? err.message : "Failed to load history")
      } finally {
        setHistoryLoading(false)
      }
    }

    loadHistory()
  }, [activeTab, itemId, historyEntries])

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
            <div className="text-center">
              <h5 className="text-danger">Error loading item details</h5>
              <p className="text-muted">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!item || !stockSummary) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
            <div className="text-center">
              <h5 className="text-danger">Item not found</h5>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4>{item.name}</h4>
                <div className="d-flex align-items-center flex-wrap mt-1">
                  {item.sku && <h6 className="mb-0 me-2">{item.sku}</h6>}
                  {item.returnable && (
                    <span className="badge bg-success-light text-success">Returnable Item</span>
                  )}
                </div>
              </div>
            </div>
            <div className="page-btn d-flex align-items-center">
              <Link
                href={`${all_routes.editproduct}/${item.id}`}
                className="btn btn-primary me-2"
              >
                <i className="ti ti-edit me-1" />
                Edit
              </Link>
              <Link
                href={`/item/${item.id}/adjust-stock`}
                className="btn btn-outline-primary"
              >
                <i className="ti ti-arrows-exchange me-1" />
                Adjust Stock
              </Link>
            </div>
          </div>

          <div className="table-tab mb-3">
            <ul className="nav nav-pills">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === "overview" ? "active" : ""}`}
                  onClick={() => setActiveTab("overview")}
                >
                  Overview
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === "transactions" ? "active" : ""}`}
                  onClick={() => setActiveTab("transactions")}
                >
                  Transactions
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === "history" ? "active" : ""}`}
                  onClick={() => setActiveTab("history")}
                >
                  History
                </button>
              </li>
            </ul>
          </div>

          {activeTab === "overview" && (
            <div className="row">
              <div className="col-xl-8 col-lg-7">
                <div className="card mb-3">
                  <div className="card-header">
                    <h4 className="card-title">General</h4>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <p className="mb-1 text-muted">Item Type</p>
                        <p className="mb-0">{item.itemType}</p>
                      </div>
                      <div className="col-md-6 mb-2">
                        <p className="mb-1 text-muted">Unit</p>
                        <p className="mb-0">{item.unit?.name || "-"}</p>
                      </div>
                      <div className="col-md-6 mb-2">
                        <p className="mb-1 text-muted">Inventory Account</p>
                        <p className="mb-0">{item.inventoryAccount || "-"}</p>
                      </div>
                      <div className="col-md-6 mb-2">
                        <p className="mb-1 text-muted">Inventory Valuation Method</p>
                        <p className="mb-0">{item.inventoryValuation}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card mb-3">
                  <div className="card-header">
                    <h4 className="card-title">Purchase Information</h4>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <p className="mb-1 text-muted">Cost Price</p>
                        <p className="mb-0">{item.costPrice}</p>
                      </div>
                      <div className="col-md-6 mb-2">
                        <p className="mb-1 text-muted">Purchase Account</p>
                        <p className="mb-0">{item.purchaseAccount || "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card mb-3">
                  <div className="card-header">
                    <h4 className="card-title">Sales Information</h4>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <p className="mb-1 text-muted">Selling Price</p>
                        <p className="mb-0">{item.sellingPrice}</p>
                      </div>
                      <div className="col-md-6 mb-2">
                        <p className="mb-1 text-muted">Sales Account</p>
                        <p className="mb-0">{item.salesAccount || "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card mb-3">
                  <div className="card-header">
                    <h4 className="card-title">Reporting Tags</h4>
                  </div>
                  <div className="card-body">
                    <p className="mb-0 text-muted">No reporting tags added.</p>
                  </div>
                </div>
              </div>

              <div className="col-xl-4 col-lg-5">
                <div
                  className="d-flex flex-column gap-3"
                  style={{ position: "sticky", top: 96 }}
                >
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h4 className="card-title mb-0">Opening Stock</h4>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        data-bs-toggle="modal"
                        data-bs-target="#edit-opening-stock"
                        onClick={handleOpenOpeningStockModal}
                      >
                        Edit
                      </button>
                    </div>
                    <div className="card-body">
                      <div className="mb-2 d-flex justify-content-between">
                        <span className="text-muted">Opening Stock</span>
                        <span>{stockSummary.openingStock ?? "-"}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Opening Rate</span>
                        <span>{stockSummary.openingStockRate ?? "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h4 className="card-title mb-0">Accounting Stock</h4>
                    </div>
                    <div className="card-body">
                      <div className="mb-2 d-flex justify-content-between">
                        <span className="text-muted">Stock on Hand</span>
                        <span>{stockSummary.stockOnHand}</span>
                      </div>
                      <div className="mb-2 d-flex justify-content-between">
                        <span className="text-muted">Committed Stock</span>
                        <span>{stockSummary.committedStock}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Available for Sale</span>
                        <span>{stockSummary.availableForSale}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h4 className="card-title mb-0">Physical Stock</h4>
                    </div>
                    <div className="card-body">
                      <div className="mb-2 d-flex justify-content-between">
                        <span className="text-muted">To be Shipped</span>
                        <span>{stockSummary.physicalStock.toBeShipped}</span>
                      </div>
                      <div className="mb-2 d-flex justify-content-between">
                        <span className="text-muted">To be Received</span>
                        <span>{stockSummary.physicalStock.toBeReceived}</span>
                      </div>
                      <div className="mb-2 d-flex justify-content-between">
                        <span className="text-muted">To be Invoiced</span>
                        <span>{stockSummary.physicalStock.toBeInvoiced}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">To be Billed</span>
                        <span>{stockSummary.physicalStock.toBeBilled}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="card">
              <div className="card-body">
                <p className="mb-0 text-muted">Transactions will appear here.</p>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="card">
              <div className="card-body">
                {historyLoading && (
                  <p className="mb-0 text-muted">Loading history...</p>
                )}
                {historyError && !historyLoading && (
                  <p className="mb-0 text-danger">{historyError}</p>
                )}
                {!historyLoading && !historyError && (
                  <>
                    {historyEntries && historyEntries.length > 0 ? (
                      <ul className="list-unstyled mb-0">
                        {historyEntries.map((entry) => (
                          <li key={entry.id} className="mb-2">
                            <div className="d-flex flex-column">
                              <span>{entry.message}</span>
                              <span className="text-muted small">
                                {entry.adjustmentDate
                                  ? new Date(entry.adjustmentDate).toLocaleString()
                                  : ""}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-0 text-muted">No history yet for this item.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <CommonFooter />
      </div>

      <div className="modal fade" id="edit-opening-stock">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <div className="page-title">
                <h4>Edit Opening Stock</h4>
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
            <form onSubmit={handleSubmitOpeningStock}>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Opening Stock</label>
                      <input
                        type="number"
                        className="form-control"
                        value={openingStockInput}
                        onChange={(e) => setOpeningStockInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Opening Rate</label>
                      <input
                        type="number"
                        className="form-control"
                        value={openingRateInput}
                        onChange={(e) => setOpeningRateInput(e.target.value)}
                      />
                    </div>
                  </div>
                  {savingOpeningStock && (
                    <div className="col-lg-12">
                      <p className="text-muted mb-0">Saving...</p>
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
                  disabled={savingOpeningStock}
                  data-bs-dismiss={savingOpeningStock ? undefined : "modal" as any}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
