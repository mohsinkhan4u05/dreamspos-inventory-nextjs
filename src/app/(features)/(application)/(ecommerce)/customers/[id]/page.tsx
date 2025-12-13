"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { customerService, salesService } from "@/services/api";
import CustomerOverview, { CustomerDetail } from "@/components/application/ecommerce/customers/CustomerOverview";
import type { CustomerActivity } from "@/components/application/ecommerce/customers/CustomerTimeline";
import { all_routes } from "@/data/all_routes";

interface CustomerListItem {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface CustomerInvoiceRow {
  id: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  status: string;
}

const TABS = ["overview", "comments", "transactions", "mails", "statement"] as const;
type TabKey = (typeof TABS)[number];

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<CustomerInvoiceRow[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const currentId = params?.id as string | undefined;

  useEffect(() => {
    if (currentId) {
      setSelectedId(currentId);
    }
  }, [currentId]);

  const loadCustomers = useCallback(
    async (term: string) => {
      try {
        setListLoading(true);
        const res: any = await customerService.getCustomers({ page: 1, limit: 100, search: term });
        const rows: CustomerListItem[] = (res?.data || []).map((c: any) => ({
          id: c.id,
          name: c.displayName || c.name,
          email: c.email ?? null,
          phone: c.phone ?? null,
        }));
        setCustomers(rows);
      } catch (e: any) {
        setError(e?.message || "Failed to load customers");
      } finally {
        setListLoading(false);
      }
    },
    [],
  );

  const loadCustomerDetail = useCallback(async (id: string) => {
    try {
      setDetailLoading(true);
      const res: any = await customerService.getCustomer(id);
      setCustomer({
        id: res.id,
        name: res.displayName || res.name,
        email: res.email ?? null,
        phone: res.phone ?? null,
        language: res.language ?? null,
        type: res.type ?? null,
        currency: res.currency ?? null,
        allowPortal: res.allowPortal ?? false,
        addresses: res.addresses || [],
        contactPersons: res.contactPersons || [],
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load customer details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadActivities = useCallback(async (id: string) => {
    try {
      setActivitiesLoading(true);
      const res: any = await customerService.getCustomerActivities(id, { limit: 100 });
      setActivities(res?.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load customer activities");
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async (id: string) => {
    try {
      setInvoicesLoading(true);
      const res: any = await salesService.getSales({ page: 1, limit: 50, customerId: id });
      const rows: CustomerInvoiceRow[] = (res?.data || []).map((sale: any) => ({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        date: sale.createdAt,
        totalAmount: Number(sale.totalAmount ?? 0),
        paidAmount: Number(sale.paidAmount ?? 0),
        dueAmount: Number(sale.dueAmount ?? 0),
        paymentStatus: sale.paymentStatus,
        status: sale.status,
      }));
      setInvoices(rows);
    } catch (e: any) {
      setError(e?.message || "Failed to load transactions");
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers("");
  }, [loadCustomers]);

  useEffect(() => {
    if (selectedId) {
      loadCustomerDetail(selectedId);
      loadActivities(selectedId);
      loadTransactions(selectedId);
    }
  }, [selectedId, loadCustomerDetail, loadActivities, loadTransactions]);

  const handleRowClick = (id: string) => {
    setSelectedId(id);
    router.push(`${all_routes.customer}/${id}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers(search);
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="row">
          <div
            className="col-lg-3 col-md-4 border-end"
            style={{ maxHeight: "calc(100vh - 80px)", overflowY: "auto" }}
          >
            <div className="mb-3">
              <h5 className="fw-bold mb-2">Customers</h5>
              <form onSubmit={handleSearchSubmit} className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search customers"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="btn btn-primary" type="submit">
                  <i className="ti ti-search" />
                </button>
              </form>
            </div>
            {listLoading && <p className="text-muted">Loading customers...</p>}
            {!listLoading && customers.length === 0 && (
              <p className="text-muted">No customers found.</p>
            )}
            {!listLoading && customers.length > 0 && (
              <ul className="list-group mb-3">
                {customers.map((c) => (
                  <li
                    key={c.id}
                    className={`list-group-item list-group-item-action d-flex flex-column ${
                      selectedId === c.id ? "active" : ""
                    }`}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleRowClick(c.id)}
                  >
                    <span className="fw-semibold">{c.name}</span>
                    <span className="small text-muted">
                      {c.email || c.phone || "No contact info"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="col-lg-9 col-md-8">
            <div
              className="d-flex justify-content-between align-items-center mb-3 bg-white"
              style={{ position: "sticky", top: 0, zIndex: 10, paddingTop: 8, paddingBottom: 8 }}
            >
              <div>
                <h4 className="fw-bold mb-0">Customer Details</h4>
                {customer && (
                  <div className="small text-muted">
                    {customer.email && <span className="me-3">{customer.email}</span>}
                    {customer.phone && <span>{customer.phone}</span>}
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-outline-primary me-2"
                  onClick={() => {
                    if (selectedId) {
                      router.push(all_routes.addcustomer);
                    }
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    router.push(all_routes.pos);
                  }}
                >
                  New Transaction
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <ul className="nav nav-tabs nav-tabs-bottom mb-3">
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
                  className={`nav-link ${activeTab === "comments" ? "active" : ""}`}
                  onClick={() => setActiveTab("comments")}
                >
                  Comments
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
                  className={`nav-link ${activeTab === "mails" ? "active" : ""}`}
                  onClick={() => setActiveTab("mails")}
                >
                  Mails
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === "statement" ? "active" : ""}`}
                  onClick={() => setActiveTab("statement")}
                >
                  Statement
                </button>
              </li>
            </ul>

            <div className="card">
              <div className="card-body">
                {activeTab === "overview" && (
                  <>
                    {detailLoading && (
                      <p className="text-muted mb-0">Loading customer details...</p>
                    )}
                    {!detailLoading && (
                      <CustomerOverview
                        customer={customer}
                        activities={activities}
                        activitiesLoading={activitiesLoading}
                      />
                    )}
                  </>
                )}
                {activeTab === "comments" && (
                  <p className="text-muted mb-0">Comments feature coming soon.</p>
                )}
                {activeTab === "transactions" && (
                  <>
                    {invoicesLoading && (
                      <p className="text-muted mb-0">Loading transactions...</p>
                    )}
                    {!invoicesLoading && invoices.length === 0 && (
                      <p className="text-muted mb-0">No transactions found for this customer.</p>
                    )}
                    {!invoicesLoading && invoices.length > 0 && (
                      <div className="table-responsive">
                        <table className="table table-striped mb-0">
                          <thead>
                            <tr>
                              <th>Invoice #</th>
                              <th>Date</th>
                              <th>Status</th>
                              <th>Payment Status</th>
                              <th className="text-end">Total</th>
                              <th className="text-end">Paid</th>
                              <th className="text-end">Due</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoices.map((inv) => (
                              <tr key={inv.id}>
                                <td>{inv.invoiceNumber}</td>
                                <td>{new Date(inv.date).toLocaleDateString()}</td>
                                <td>{inv.status}</td>
                                <td>{inv.paymentStatus}</td>
                                <td className="text-end">{inv.totalAmount.toFixed(2)}</td>
                                <td className="text-end">{inv.paidAmount.toFixed(2)}</td>
                                <td className="text-end">{inv.dueAmount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
                {activeTab === "mails" && (
                  <p className="text-muted mb-0">Mails view coming soon.</p>
                )}
                {activeTab === "statement" && (
                  <p className="text-muted mb-0">Customer statement view coming soon.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
