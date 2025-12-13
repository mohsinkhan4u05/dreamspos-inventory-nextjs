"use client";
/* eslint-disable @next/next/no-img-element */


import React, { useState } from "react";
import Select from "react-select";
import { DatePicker } from "antd";
import Link from "next/link";
import { Calendar, PlusCircle } from "react-feather";
import { salesReturnService, salesService } from "@/services/api";
import type { Sale, SaleItem } from "@/hooks/useSales";

type AddSalesReturnsProps = {
  onCreated?: () => void
}

const AddSalesReturns = ({ onCreated }: AddSalesReturnsProps) => {
  const customers = [
    { value: "Choose Customer", label: "Choose Customer" },
    { value: "Thomas", label: "Thomas" },
    { value: "Benjamin", label: "Benjamin" },
    { value: "Bruklin", label: "Bruklin" },
  ];
  const status = [
    { value: "Status", label: "Status" },
    { value: "Pending", label: "Pending" },
    { value: "Received", label: "Received" },
  ];

  type ReturnRow = {
    id: string
    saleItemId: string
    productId: string
    productLabel: string
    variantId?: string | null
    soldQuantity: number
    quantityToReturn: string
    unitPrice: number
    discount: number
    taxRate: number
  }

  const [saleId, setSaleId] = useState("")
  const [returnRows, setReturnRows] = useState<ReturnRow[]>([])
  const [loadingSale, setLoadingSale] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLoadSale = async () => {
    if (!saleId) {
      setError("Sale ID is required")
      return
    }

    try {
      setLoadingSale(true)
      setError(null)

      const response = await salesService.getSales({ saleId, limit: 1 })
      const sale = response?.data?.[0] as Sale | undefined

      if (!sale || !sale.items || sale.items.length === 0) {
        setReturnRows([])
        setError("Sale not found or has no items")
        return
      }

      const rows: ReturnRow[] = sale.items.map((item: SaleItem, index: number) => ({
        id: `row-${index + 1}`,
        saleItemId: item.id,
        productId: item.productId,
        productLabel: item.product?.name
          ? `${item.product.name} (${item.product.sku ?? ""})`
          : item.productId,
        variantId: item.variantId ?? null,
        soldQuantity: item.quantity,
        quantityToReturn: String(item.quantity),
        unitPrice: item.unitPrice,
        discount: item.discount ?? 0,
        taxRate: item.taxRate ?? 0,
      }))

      setReturnRows(rows)
    } catch (e) {
      setReturnRows([])
      setError(
        e instanceof Error ? e.message : "Failed to load sale for return",
      )
    } finally {
      setLoadingSale(false)
    }
  }

  const handleRowChange = (
    id: string,
    field: keyof Pick<ReturnRow, "quantityToReturn">,
    value: string,
  ) => {
    setReturnRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    )
  }

  const parsedRows = returnRows.map((row) => {
    const quantityReturn = parseFloat(row.quantityToReturn || "0")
    const baseSubtotal = quantityReturn * row.unitPrice
    const perUnitDiscount = row.soldQuantity > 0
      ? row.discount / row.soldQuantity
      : 0
    const discountAmount = perUnitDiscount * quantityReturn
    const taxableBase = baseSubtotal - discountAmount
    const taxAmount = taxableBase * (row.taxRate / 100)
    const lineTotal = taxableBase + taxAmount

    return {
      ...row,
      quantityReturn,
      discountAmount,
      taxAmount,
      lineTotal,
    }
  })

  const validRows = parsedRows.filter(
    (row) =>
      row.quantityReturn > 0 &&
      row.quantityReturn <= row.soldQuantity &&
      Number.isFinite(row.lineTotal),
  )

  const subtotal = parsedRows.reduce(
    (sum, row) => sum + row.quantityReturn * row.unitPrice,
    0,
  )
  const totalDiscount = parsedRows.reduce(
    (sum, row) => sum + (row.discountAmount || 0),
    0,
  )
  const totalTax = parsedRows.reduce(
    (sum, row) => sum + (row.taxAmount || 0),
    0,
  )
  const grandTotal = subtotal - totalDiscount + totalTax

  const handleSubmit = async () => {
    if (!saleId) {
      setError("Sale ID is required")
      return
    }

    if (validRows.length === 0) {
      setError("Add at least one item with a valid return quantity")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      await salesReturnService.createSalesReturn({
        saleId,
        items: validRows.map((row) => ({
          productId: row.productId,
          variantId: row.variantId ?? null,
          quantity: row.quantityReturn,
          unitPrice: row.unitPrice,
          discount: row.discountAmount,
          taxRate: row.taxRate,
          taxAmount: row.taxAmount,
        })),
      })

      if (onCreated) {
        onCreated()
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to create sales return",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <>
        {/* add popup */}
        <div className="modal fade" id="add-sales-new">
          <div className="modal-dialog add-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title">
                  <h4> Add Sales Return</h4>
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
              <form>
                <div className="card border-0">
                  <div className="card-body pb-0">
                    <div className="row">
                      <div className="col-lg-4 col-sm-6 col-12">
                        <div className="mb-3">
                          <label className="form-label">
                            Customer Name<span className="text-danger ms-1">*</span>
                          </label>
                          <div className="row">
                            <div className="col-lg-10 col-sm-10 col-10">
                              <Select
                                classNamePrefix="react-select"
                                options={customers}
                                placeholder="Choose"
                              />
                            </div>
                            <div className="col-lg-2 col-sm-2 col-2 ps-0">
                              <div className="add-icon">
                                <Link
                                  href="#"
                                  className="bg-dark text-white p-2 rounded"
                                >
                                  <PlusCircle />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-4 col-sm-6 col-12">
                        <div className="mb-3">
                          <label className="form-label">
                            Date<span className="text-danger ms-1">*</span>
                          </label>
                          <div className="input-groupicon calender-input">
                            <DatePicker
                              className="form-control datetimepicker"
                              placeholder="dd/mm/yyyy"
                            />
                            <Calendar className="info-img" />
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-4 col-sm-6 col-12">
                        <div className="mb-3">
                          <label className="form-label">
                            Sale ID<span className="text-danger ms-1">*</span>
                          </label>
                          <div className="d-flex">
                            <input
                              type="text"
                              className="form-control me-2"
                              value={saleId}
                              onChange={(e) => setSaleId(e.target.value)}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={handleLoadSale}
                              disabled={loadingSale}
                            >
                              {loadingSale ? "Loading" : "Load"}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-12 col-sm-6 col-12">
                        <div className="mb-3">
                          <label className="form-label">
                            Product<span className="text-danger ms-1">*</span>
                          </label>
                          <div className="input-groupicon select-code">
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Please type product code and select"
                            />
                            <div className="addonset">
                              <img src="assets/img/icons/qrcode-scan.svg" alt="img" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="table-responsive no-pagination mb-3">
                      <table className="table  datanew">
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th>Net Unit Price($)</th>
                            <th>Sold QTY</th>
                            <th>Return QTY</th>
                            <th>Discount($)</th>
                            <th>Tax %</th>
                            <th>Subtotal ($)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {returnRows.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center">
                                {saleId
                                  ? "Click Load to fetch sale items for return"
                                  : "Enter a Sale ID and click Load to begin"}
                              </td>
                            </tr>
                          ) : (
                            parsedRows.map((row) => (
                              <tr key={row.id}>
                                <td style={{ minWidth: 220 }}>
                                  <Select
                                    classNamePrefix="react-select"
                                    isDisabled
                                    value={{
                                      value: row.saleItemId,
                                      label: row.productLabel,
                                    }}
                                    options={returnRows.map((r) => ({
                                      value: r.saleItemId,
                                      label: r.productLabel,
                                    }))}
                                  />
                                </td>
                                <td>{row.unitPrice.toFixed(2)}</td>
                                <td>{row.soldQuantity}</td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    min={0}
                                    max={row.soldQuantity}
                                    value={row.quantityToReturn}
                                    onChange={(e) =>
                                      handleRowChange(
                                        row.id,
                                        "quantityToReturn",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td>{row.discountAmount.toFixed(2)}</td>
                                <td>{row.taxRate.toFixed(2)}</td>
                                <td>{row.lineTotal.toFixed(2)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="row">
                      <div className="col-lg-6 ms-auto">
                        <div className="total-order w-100 max-widthauto m-auto mb-4">
                          <ul className="rounded-1 border-1">
                            <li className="border-0 border-bottom">
                              <h4 className="border-end">Order Tax</h4>
                              <h5>$ {totalTax.toFixed(2)}</h5>
                            </li>
                            <li className="border-0 border-bottom">
                              <h4 className="border-end">Discount</h4>
                              <h5>$ {totalDiscount.toFixed(2)}</h5>
                            </li>
                            <li className="border-0 border-bottom">
                              <h4 className="border-end">Shipping</h4>
                              <h5>$ 0.00</h5>
                            </li>
                            <li className="border-0 border-bottom">
                              <h4 className="border-end">Grand Total</h4>
                              <h5>$ {grandTotal.toFixed(2)}</h5>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-lg-3 col-sm-6 col-12">
                        <div className="mb-3">
                          <label className="form-label">
                            Order Tax<span className="text-danger ms-1">*</span>
                          </label>
                          <div className="input-groupicon select-code">
                            <input
                              type="text"
                              value={totalTax.toFixed(2)}
                              readOnly
                              className="form-control p-2"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-3 col-sm-6 col-12">
                        <div className="mb-3">
                          <label className="form-label">
                            Discount<span className="text-danger ms-1">*</span>
                          </label>
                          <div className="input-groupicon select-code">
                            <input
                              type="text"
                              defaultValue={0}
                              className="form-control p-2"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-3 col-sm-6 col-12">
                        <div className="mb-3">
                          <label className="form-label">
                            Shipping<span className="text-danger ms-1">*</span>
                          </label>
                          <div className="input-groupicon select-code">
                            <input
                              type="text"
                              defaultValue={0}
                              className="form-control p-2"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-3 col-sm-6 col-12">
                        <div className="mb-3 mb-5">
                          <label className="form-label">
                            Status<span className="text-danger ms-1">*</span>
                          </label>
                          <Select
                            classNamePrefix="react-select"
                            options={status}
                            placeholder="Choose"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary add-cancel me-3"
                    data-bs-dismiss="modal"
                  >
                    Cancel
                  </button>
                  {error && <p className="text-danger me-3 mb-0">{error}</p>}
                  <button
                    type="button"
                    className="btn btn-primary add-sale"
                    data-bs-dismiss="modal"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /add popup */}
      </>

    </div>
  );
};

export default AddSalesReturns;
