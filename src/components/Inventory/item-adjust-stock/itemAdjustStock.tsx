"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import CommonFooter from "@/core/common/footer/commonFooter"

type ItemAdjustStockProps = {
  itemId: string
}

type ItemSummary = {
  id: string
  name: string
  sku?: string | null
}

const ACCOUNT_OPTIONS = [
  "Inventory Adjustment",
  "Stock Correction",
  "Damage / Shrinkage",
  "Other",
]

const REASON_OPTIONS = [
  "Damage",
  "Expired",
  "Theft",
  "Stock Correction",
  "Count Mismatch",
  "Opening Stock Edit",
  "Other",
]

export default function ItemAdjustStockComponent({ itemId }: ItemAdjustStockProps) {
  const router = useRouter()

  const [item, setItem] = useState<ItemSummary | null>(null)
  const [itemLoading, setItemLoading] = useState(true)
  const [itemError, setItemError] = useState<string | null>(null)

  const [adjustmentType, setAdjustmentType] = useState<"QUANTITY" | "VALUE">("QUANTITY")
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [account, setAccount] = useState<string>(ACCOUNT_OPTIONS[0])
  const [referenceNumber, setReferenceNumber] = useState<string>("")

  const [quantityInput, setQuantityInput] = useState<string>("")
  const [costPriceInput, setCostPriceInput] = useState<string>("")

  const [reason, setReason] = useState<string>("")
  const [description, setDescription] = useState<string>("")

  const [quantityAvailable, setQuantityAvailable] = useState<number>(0)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadItem = async () => {
      try {
        setItemLoading(true)
        setItemError(null)

        const res = await fetch(`/api/items/${itemId}`)
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || "Failed to load item")
        }

        const data = await res.json()
        if (cancelled) return

        setItem({ id: data.id, name: data.name, sku: data.sku })
      } catch (err) {
        if (cancelled) return
        setItemError(err instanceof Error ? err.message : "Failed to load item")
      } finally {
        if (!cancelled) {
          setItemLoading(false)
        }
      }
    }

    loadItem()

    return () => {
      cancelled = true
    }
  }, [itemId])

  useEffect(() => {
    let cancelled = false

    const loadQuantity = async () => {
      try {
        const params = new URLSearchParams({
          productId: itemId,
          limit: "1000",
        })

        const res = await fetch(`/api/inventory/stocks?${params.toString()}`)
        if (!res.ok) {
          throw new Error("Failed to load stock")
        }

        const data = await res.json()
        const rows = Array.isArray(data?.data) ? data.data : []
        const total = rows.reduce(
          (sum: number, row: any) => sum + (typeof row.quantity === "number" ? row.quantity : 0),
          0,
        )

        if (cancelled) return
        setQuantityAvailable(total)
      } catch (_err) {
        if (cancelled) return
        setQuantityAvailable(0)
      }
    }

    loadQuantity()

    return () => {
      cancelled = true
    }
  }, [itemId])

  const parsedQuantity = useMemo(() => {
    const value = quantityInput.trim()
    if (!value) return 0
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }, [quantityInput])

  const newQuantityOnHand = useMemo(
    () => quantityAvailable + parsedQuantity,
    [quantityAvailable, parsedQuantity],
  )

  const handleSubmit = async (status: "DRAFT" | "FINAL", event?: FormEvent) => {
    if (event) {
      event.preventDefault()
    }

    if (!quantityInput.trim()) {
      setSubmitError("Please enter quantity adjusted.")
      return
    }

    const qty = parsedQuantity
    if (!Number.isFinite(qty) || qty === 0) {
      setSubmitError("Quantity adjusted must be a non-zero number.")
      return
    }

    let costPerUnit: number | null = null
    if (costPriceInput.trim() !== "") {
      const n = Number(costPriceInput)
      if (!Number.isFinite(n) || n < 0) {
        setSubmitError("Cost price must be a non-negative number.")
        return
      }
      costPerUnit = n
    }

    if (description.length > 500) {
      setSubmitError("Description must be 500 characters or less.")
      return
    }

    if (adjustmentType === "QUANTITY" && status === "FINAL" && qty > 0 && costPerUnit === null) {
      setSubmitError("Cost price is required when increasing quantity in a final adjustment.")
      return
    }

    try {
      setSubmitting(true)
      setSubmitError(null)

      const body = {
        adjustmentType,
        quantityAdjusted: qty,
        costPerUnit,
        reason: reason || null,
        referenceNumber: referenceNumber || null,
        account: account || null,
        notes: description || null,
        status,
        adjustmentDate: date,
      }

      const res = await fetch(`/api/items/${itemId}/adjust-stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to create adjustment")
      }

      const params = new URLSearchParams({
        productId: itemId,
        limit: "1000",
      })
      const reloadRes = await fetch(`/api/inventory/stocks?${params.toString()}`)
      if (reloadRes.ok) {
        const data = await reloadRes.json()
        const rows = Array.isArray(data?.data) ? data.data : []
        const total = rows.reduce(
          (sum: number, row: any) => sum + (typeof row.quantity === "number" ? row.quantity : 0),
          0,
        )
        setQuantityAvailable(total)
      }

      if (status === "FINAL") {
        router.push(`/item/${itemId}`)
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save adjustment")
    } finally {
      setSubmitting(false)
    }
  }

  if (itemLoading) {
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

  if (itemError || !item) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
            <div className="text-center">
              <h5 className="text-danger">Error loading item</h5>
              <p className="text-muted">{itemError || "Item not found"}</p>
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
                <h4>Adjust Stock  {item.name}</h4>
                <h6 className="mb-0 text-muted">{item.sku || ""}</h6>
              </div>
            </div>
            <div className="page-btn d-flex align-items-center">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => router.push(`/item/${itemId}`)}
              >
                Back to Item
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex align-items-center">
                  <div className="form-check me-4">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="adjust-type-quantity"
                      checked={adjustmentType === "QUANTITY"}
                      onChange={() => setAdjustmentType("QUANTITY")}
                    />
                    <label className="form-check-label" htmlFor="adjust-type-quantity">
                      Quantity Adjustment
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="adjust-type-value"
                      checked={adjustmentType === "VALUE"}
                      onChange={() => setAdjustmentType("VALUE")}
                    />
                    <label className="form-check-label" htmlFor="adjust-type-value">
                      Value Adjustment
                    </label>
                  </div>
                </div>
              </div>

              <form onSubmit={(event) => handleSubmit("FINAL", event)}>
                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Account</label>
                      <select
                        className="form-select"
                        value={account}
                        onChange={(event) => setAccount(event.target.value)}
                      >
                        {ACCOUNT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Reference Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={referenceNumber}
                        onChange={(event) => setReferenceNumber(event.target.value)}
                      />
                    </div>
                    
                  </div>

                  <div className="col-md-4">
                    <div className="mb-3 d-flex justify-content-between">
                      <span className="text-muted">Quantity Available</span>
                      <span>{quantityAvailable}</span>
                    </div>
                    <div className="mb-3 d-flex justify-content-between">
                      <span className="text-muted">New Quantity on Hand</span>
                      <span>{newQuantityOnHand}</span>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Quantity Adjusted</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Eg. +10, -10"
                        value={quantityInput}
                        onChange={(event) => setQuantityInput(event.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Cost Price</label>
                      <input
                        type="number"
                        className="form-control"
                        value={costPriceInput}
                        onChange={(event) => setCostPriceInput(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-md-4"></div>
                </div>

                <div className="row mt-3">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Reason</label>
                      <select
                        className="form-select"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      >
                        <option value="">Select Reason</option>
                        {REASON_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-8">
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={description}
                        maxLength={500}
                        onChange={(event) => setDescription(event.target.value)}
                      />
                      <div className="text-end text-muted small">
                        {description.length}/500
                      </div>
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="alert alert-danger mt-2" role="alert">
                    {submitError}
                  </div>
                )}

                <div className="d-flex justify-content-end mt-3">
                  <button
                    type="button"
                    className="btn btn-outline-primary me-2"
                    onClick={() => handleSubmit("DRAFT")}
                    disabled={submitting}
                  >
                    Save as Draft
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary me-2"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Convert to Adjusted"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => router.push(`/item/${itemId}`)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <CommonFooter />
      </div>
    </>
  )
}
