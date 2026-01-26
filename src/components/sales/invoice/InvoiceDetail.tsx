"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import { all_routes } from "@/data/all_routes";
import { useSaleDetail } from "@/hooks/useSaleDetail";
import { salesService } from "@/services/api";
import { useOrgFormatting } from "@/hooks/useOrgFormatting";

interface Props {
  id: string;
}

const renderPaymentStatusBadge = (status?: string) => {
  const normalized = status?.toUpperCase?.() || "";
  let cls = "badge badge-soft-info badge-xs shadow-none";

  switch (normalized) {
    case "PAID":
      cls = "badge badge-soft-success badge-xs shadow-none";
      break;
    case "PARTIAL":
      cls = "badge badge-soft-warning badge-xs shadow-none";
      break;
    case "PENDING":
    case "FAILED":
      cls = "badge badge-soft-danger badge-xs shadow-none";
      break;
    case "REFUNDED":
      cls = "badge badge-soft-secondary badge-xs shadow-none";
      break;
    default:
      cls = "badge badge-soft-info badge-xs shadow-none";
  }

  return status ? (
    <span className={cls}>
      <i className="ti ti-point-filled me-1" />
      {status}
    </span>
  ) : null;
};

export default function InvoiceDetail({ id }: Props) {
  const router = useRouter();
  const route = all_routes;
  const { sale, loading, error, refetch } = useSaleDetail(id);
  const { formatCurrency, formatDate, formatDateTime } = useOrgFormatting();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  if (!id) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>Invoice id is required.</p>
          <Link href={route.invoice || "/invoice"} className="btn btn-outline-secondary mt-2">
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !sale) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>{loading ? "Loading invoice..." : error || "Invoice not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="page-title">
              <h4>Invoice #{sale.invoiceNumber}</h4>
              <h6>{sale.customer?.name || ""}</h6>
            </div>
            <ul className="table-top-head">
              <TooltipIcons />
              <button
                type="button"
                className="btn btn-link p-0 ms-2"
                onClick={() => refetch()}
              >
                <RefreshIcon />
              </button>
              <CollapesIcon />
            </ul>
            <div className="page-btn d-flex align-items-center gap-2">
              {renderPaymentStatusBadge(sale.paymentStatus)}
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() =>
                  router.push(`${route.invoicedetails}/send-email?id=${sale.id}`)
                }
              >
                Send Invoice
              </button>
              {sale.dueAmount > 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setPaymentError(null);
                    setPaymentAmount(
                      sale.dueAmount > 0 ? sale.dueAmount.toFixed(2) : "",
                    );
                    setPaymentMethod("CASH");
                    setIsPaymentModalOpen(true);
                  }}
                >
                  Record Payment
                </button>
              )}
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body d-flex justify-content-between flex-wrap gap-3">
              <div>
                <p className="mb-1">
                  <strong>Customer:</strong> {sale.customer?.name || "-"}
                </p>
                <p className="mb-1">
                  <strong>Invoice Date:</strong>{" "}
                  {formatDate(sale.saleDate || sale.createdAt)}
                </p>
                <p className="mb-1">
                  <strong>Store:</strong> {sale.store?.name || "-"}
                </p>
              </div>
              <div className="text-end">
                <p className="mb-1">
                  <strong>Total:</strong> {formatCurrency(sale.totalAmount)}
                </p>
                <p className="mb-1">
                  <strong>Paid:</strong> {formatCurrency(sale.paidAmount)}
                </p>
                <p className="mb-1">
                  <strong>Due:</strong> {formatCurrency(sale.dueAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Items</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table datanew">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-end">Qty</th>
                      <th className="text-end">Rate</th>
                      <th className="text-end">Tax</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sale.items || []).map((item) => {
                      const baseName = item.product?.name || item.productId;
                      const variantLabel =
                        item.variant?.name || item.variant?.sku || "";
                      const displayName = variantLabel
                        ? `${baseName} - ${variantLabel}`
                        : baseName;

                      return (
                        <tr key={item.id}>
                          <td>{displayName}</td>
                          <td className="text-end">{item.quantity}</td>
                          <td className="text-end">{formatCurrency(item.unitPrice)}</td>
                          <td className="text-end">{formatCurrency(item.taxAmount)}</td>
                          <td className="text-end">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-6">
              <div className="card mb-3">
                <div className="card-header">
                  <h5 className="mb-0">Payments</h5>
                </div>
                <div className="card-body">
                  {sale.payments && sale.payments.length > 0 ? (
                    <ul className="list-unstyled mb-0">
                      {sale.payments.map((payment) => (
                        <li
                          key={payment.id}
                          className="d-flex justify-content-between mb-1"
                        >
                          <span>
                            {formatDateTime(payment.createdAt)} - {payment.paymentMethod}
                          </span>
                          <span>
                            {formatCurrency(payment.amount)} {renderPaymentStatusBadge(payment.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mb-0 text-muted">No payments recorded.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card mb-3">
                <div className="card-header">
                  <h5 className="mb-0">Totals</h5>
                </div>
                <div className="card-body">
                  <ul className="list-unstyled mb-0">
                    <li className="d-flex justify-content-between mb-1">
                      <span>Subtotal</span>
                      <span>{formatCurrency(sale.subtotal)}</span>
                    </li>
                    <li className="d-flex justify-content-between mb-1">
                      <span>Discount</span>
                      <span>{formatCurrency(sale.discount)}</span>
                    </li>
                    <li className="d-flex justify-content-between mb-1">
                      <span>Tax</span>
                      <span>{formatCurrency(sale.taxAmount)}</span>
                    </li>
                    <li className="d-flex justify-content-between fw-bold mt-2 border-top pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(sale.totalAmount)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <button
              type="button"
              className="btn btn-outline-secondary me-2"
              onClick={() => router.back()}
            >
              Back
            </button>
            <Link href={route.invoice || "/invoice"} className="btn btn-primary">
              Go to Invoice List
            </Link>
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
      {isPaymentModalOpen && (
        <div
          className="modal fade show"
          style={{ display: "block" }}
          aria-modal="true"
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Record Payment</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    if (!paymentLoading) {
                      setIsPaymentModalOpen(false);
                    }
                  }}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                {paymentError && (
                  <p className="text-danger mb-2">{paymentError}</p>
                )}
                <div className="mb-3">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    disabled={paymentLoading}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={paymentLoading}
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="WALLET">Wallet</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    if (!paymentLoading) {
                      setIsPaymentModalOpen(false);
                    }
                  }}
                  disabled={paymentLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={paymentLoading}
                  onClick={async () => {
                    if (!sale) {
                      return;
                    }

                    const parsed = parseFloat(paymentAmount || "0");
                    if (!Number.isFinite(parsed) || parsed <= 0) {
                      setPaymentError("Enter a valid positive amount.");
                      return;
                    }
                    if (parsed - sale.dueAmount > 0.01) {
                      setPaymentError("Amount cannot exceed the due amount.");
                      return;
                    }

                    try {
                      setPaymentLoading(true);
                      setPaymentError(null);
                      await salesService.recordPayment(sale.id, {
                        amount: parsed,
                        paymentMethod,
                      });
                      await refetch();
                      setIsPaymentModalOpen(false);
                    } catch (err) {
                      setPaymentError(
                        err instanceof Error
                          ? err.message
                          : "Failed to record payment",
                      );
                    } finally {
                      setPaymentLoading(false);
                    }
                  }}
                >
                  {paymentLoading ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
