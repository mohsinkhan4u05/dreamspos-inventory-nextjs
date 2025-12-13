"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import CommonFooter from "@/core/common/footer/commonFooter";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import { all_routes } from "@/data/all_routes";
import { customerService, salesService } from "@/services/api";
import type { Sale } from "@/hooks/useSales";
import { formatCurrencyINR } from "@/lib/currency";

interface Customer {
  id: string;
  name: string;
}

function formatDate(value: string | Date | undefined | null): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

export default function RecordPayment() {
  const route = all_routes;
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const [invoices, setInvoices] = useState<Sale[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  const [amountReceived, setAmountReceived] = useState<string>("");
  const [receivedFull, setReceivedFull] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setCustomersLoading(true);
        setCustomersError(null);
        const res = await customerService.getCustomers({ limit: 200, isActive: true });
        const list: Customer[] = (res?.data || []).map((c: any) => ({
          id: c.id,
          name: c.displayName || c.name || "Unnamed",
        }));
        setCustomers(list);
      } catch (err) {
        setCustomersError(
          err instanceof Error ? err.message : "Failed to load customers",
        );
      } finally {
        setCustomersLoading(false);
      }
    };

    loadCustomers();
  }, []);

  useEffect(() => {
    const loadInvoices = async () => {
      if (!selectedCustomerId) {
        setInvoices([]);
        setAllocations({});
        return;
      }

      try {
        setInvoicesLoading(true);
        setInvoicesError(null);
        const res = await salesService.getSales({
          customerId: selectedCustomerId,
          limit: 200,
        });
        const openInvoices: Sale[] = (res?.data || []).filter(
          (s: Sale) => (s.dueAmount ?? 0) > 0.01,
        );
        setInvoices(openInvoices);
        setAllocations({});
        setAmountReceived("");
        setReceivedFull(false);
      } catch (err) {
        setInvoicesError(
          err instanceof Error ? err.message : "Failed to load invoices",
        );
      } finally {
        setInvoicesLoading(false);
      }
    };

    loadInvoices();
  }, [selectedCustomerId]);

  const numericAmountReceived = useMemo(() => {
    const parsed = parseFloat(amountReceived || "0");
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [amountReceived]);

  const usedAmount = useMemo(() => {
    return Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
  }, [allocations]);

  const unusedAmount = useMemo(() => {
    const diff = numericAmountReceived - usedAmount;
    return diff > 0 ? diff : 0;
  }, [numericAmountReceived, usedAmount]);

  const overAllocated = useMemo(() => {
    return usedAmount - numericAmountReceived > 0.01;
  }, [numericAmountReceived, usedAmount]);

  const totalDueForCustomer = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.dueAmount ?? 0), 0);
  }, [invoices]);

  useEffect(() => {
    if (!receivedFull) {
      return;
    }
    if (!invoices.length) {
      return;
    }

    const totalDue = totalDueForCustomer;
    if (totalDue <= 0) {
      return;
    }

    const allocationsMap: Record<string, number> = {};
    let remaining = totalDue;

    const sorted = [...invoices].sort((a, b) => {
      const da = new Date(a.saleDate || a.createdAt).getTime();
      const db = new Date(b.saleDate || b.createdAt).getTime();
      return da - db;
    });

    for (const inv of sorted) {
      if (remaining <= 0) {
        allocationsMap[inv.id] = 0;
        continue;
      }
      const due = inv.dueAmount ?? 0;
      const alloc = Math.min(remaining, due);
      allocationsMap[inv.id] = parseFloat(alloc.toFixed(2));
      remaining -= alloc;
    }

    const used = Object.values(allocationsMap).reduce(
      (sum, v) => sum + (v || 0),
      0,
    );

    setAllocations(allocationsMap);
    setAmountReceived(used.toFixed(2));
  }, [receivedFull, invoices, totalDueForCustomer]);

  const handleAmountChange = (value: string) => {
    setReceivedFull(false);
    setAmountReceived(value);

    const parsed = parseFloat(value || "0");
    if (!Number.isFinite(parsed) || parsed <= 0 || !invoices.length) {
      setAllocations({});
      return;
    }

    const allocationsMap: Record<string, number> = {};
    let remaining = parsed;

    const sorted = [...invoices].sort((a, b) => {
      const da = new Date(a.saleDate || a.createdAt).getTime();
      const db = new Date(b.saleDate || b.createdAt).getTime();
      return da - db;
    });

    for (const inv of sorted) {
      if (remaining <= 0) {
        allocationsMap[inv.id] = 0;
        continue;
      }
      const due = inv.dueAmount ?? 0;
      const alloc = Math.min(remaining, due);
      allocationsMap[inv.id] = parseFloat(alloc.toFixed(2));
      remaining -= alloc;
    }

    setAllocations(allocationsMap);
  };

  const handleRowAmountChange = (saleId: string, raw: string, max: number) => {
    const parsed = parseFloat(raw || "0");
    const safe = !Number.isFinite(parsed) || parsed <= 0 ? 0 : Math.min(parsed, max);
    setAllocations((prev) => ({
      ...prev,
      [saleId]: parseFloat(safe.toFixed(2)),
    }));
  };

  const handlePayInFull = (sale: Sale) => {
    const max = sale.dueAmount ?? 0;
    setAllocations((prev) => ({
      ...prev,
      [sale.id]: parseFloat(max.toFixed(2)),
    }));
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(null);

    if (!selectedCustomerId) {
      setSaveError("Select a customer first.");
      return;
    }

    if (!invoices.length) {
      setSaveError("No open invoices for this customer.");
      return;
    }

    if (numericAmountReceived <= 0) {
      setSaveError("Enter a valid Amount Received.");
      return;
    }

    if (usedAmount <= 0) {
      setSaveError("Allocate payment to at least one invoice.");
      return;
    }

    if (Math.abs(usedAmount - numericAmountReceived) > 0.01) {
      setSaveError("Amount Received must equal total allocated amount.");
      return;
    }

    const rows = invoices.filter((inv) => (allocations[inv.id] ?? 0) > 0.001);
    if (!rows.length) {
      setSaveError("Allocate payment to at least one invoice.");
      return;
    }

    try {
      setSaving(true);

      for (const inv of rows) {
        const amount = allocations[inv.id];
        if (!amount || amount <= 0) continue;

        const combinedNotes = [
          referenceNumber ? `Ref: ${referenceNumber}` : "",
          notes.trim(),
        ]
          .filter(Boolean)
          .join(" | ");

        await salesService.recordPayment(inv.id, {
          amount,
          paymentMethod,
          notes: combinedNotes || undefined,
        });
      }

      setSaveSuccess("Payment recorded successfully.");

      try {
        router.push(route.payments || "/payments");
      } catch {
        // ignore navigation error
      }
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to record payment",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="page-title">
              <h4>Record Payment</h4>
              <h6>Record payment received against customer invoices</h6>
            </div>
            <ul className="table-top-head">
              <TooltipIcons />
              <button
                type="button"
                className="btn btn-link p-0 ms-2"
                onClick={() => {
                  if (selectedCustomerId) {
                    setSelectedCustomerId(selectedCustomerId);
                  }
                }}
              >
                <RefreshIcon />
              </button>
              <CollapesIcon />
            </ul>
            <div className="page-btn d-flex align-items-center gap-2">
              <Link
                href={route.payments || "/payments"}
                className="btn btn-outline-secondary btn-sm"
              >
                Back to Payments
              </Link>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body row g-3">
              <div className="col-md-4">
                <label className="form-label">Customer</label>
                <select
                  className="form-select"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  disabled={customersLoading || saving}
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {customersError && (
                  <p className="text-danger mt-1 small">{customersError}</p>
                )}
              </div>

              <div className="col-md-4">
                <label className="form-label">Amount Received</label>
                <input
                  type="number"
                  className="form-control"
                  min={0}
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  disabled={saving || !selectedCustomerId || !invoices.length}
                />
                <div className="form-check mt-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="received-full"
                    checked={receivedFull}
                    onChange={(e) => setReceivedFull(e.target.checked)}
                    disabled={saving || !selectedCustomerId || !invoices.length}
                  />
                  <label className="form-check-label" htmlFor="received-full">
                    Received full outstanding amount
                  </label>
                </div>
              </div>

              <div className="col-md-4">
                <label className="form-label">Payment Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Payment Mode</label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={saving}
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

              <div className="col-md-4">
                <label className="form-label">Reference Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Notes</label>
                <input
                  type="text"
                  className="form-control"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Unpaid Invoices</h5>
              {selectedCustomerId && (
                <span className="text-muted small">
                  Total Due: {formatCurrencyINR(totalDueForCustomer)}
                </span>
              )}
            </div>
            <div className="card-body">
              {invoicesLoading ? (
                <p>Loading invoices...</p>
              ) : invoicesError ? (
                <p className="text-danger">{invoicesError}</p>
              ) : !selectedCustomerId ? (
                <p className="text-muted mb-0">Select a customer to view invoices.</p>
              ) : !invoices.length ? (
                <p className="text-muted mb-0">
                  No invoices with outstanding balance for this customer.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table datanew">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Invoice #</th>
                        <th className="text-end">Invoice Amount</th>
                        <th className="text-end">Amount Due</th>
                        <th className="text-end">Payment Received On</th>
                        <th className="text-end">Payment</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => {
                        const due = inv.dueAmount ?? 0;
                        const allocated = allocations[inv.id] ?? 0;
                        return (
                          <tr key={inv.id}>
                            <td>{formatDate(inv.saleDate || inv.createdAt)}</td>
                            <td>{inv.invoiceNumber}</td>
                            <td className="text-end">
                              {formatCurrencyINR(inv.totalAmount)}
                            </td>
                            <td className="text-end">{formatCurrencyINR(due)}</td>
                            <td className="text-end">{formatDate(paymentDate)}</td>
                            <td className="text-end" style={{ maxWidth: 130 }}>
                              <input
                                type="number"
                                className="form-control form-control-sm text-end"
                                min={0}
                                step="0.01"
                                value={allocated ? allocated.toString() : ""}
                                onChange={(e) =>
                                  handleRowAmountChange(inv.id, e.target.value, due)
                                }
                                disabled={saving}
                              />
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-link btn-sm"
                                onClick={() => handlePayInFull(inv)}
                                disabled={saving || due <= 0}
                              >
                                Pay in Full
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body d-flex justify-content-between flex-wrap gap-3">
              <div>
                <p className="mb-1">
                  <strong>Amount Received:</strong> {formatCurrencyINR(numericAmountReceived)}
                </p>
                <p className="mb-1">
                  <strong>Used Amount:</strong> {formatCurrencyINR(usedAmount)}
                </p>
                <p className="mb-0">
                  <strong>Unused Amount:</strong> {formatCurrencyINR(unusedAmount)}
                </p>
                {overAllocated && (
                  <p className="mb-0 text-danger small mt-1">
                    Allocated amount is greater than Amount Received.
                  </p>
                )}
              </div>
              <div className="text-end">
                {saveError && (
                  <p className="text-danger mb-2">{saveError}</p>
                )}
                {saveSuccess && (
                  <p className="text-success mb-2">{saveSuccess}</p>
                )}
                <button
                  type="button"
                  className="btn btn-outline-secondary me-2"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={
                    saving ||
                    !selectedCustomerId ||
                    numericAmountReceived <= 0 ||
                    usedAmount <= 0 ||
                    Math.abs(usedAmount - numericAmountReceived) > 0.01
                  }
                  onClick={handleSave}
                >
                  {saving ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
        <CommonFooter />
      </div>

      <CommonDeleteModal />
    </div>
  );
}
