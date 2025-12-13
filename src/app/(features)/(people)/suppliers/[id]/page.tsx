"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supplierService } from "@/services/api";
import SupplierOverview, { SupplierDetail } from "@/components/people/SupplierOverview";
import type { SupplierActivity } from "@/components/people/SupplierTimeline";
import { all_routes } from "@/data/all_routes";

interface SupplierListItem {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

const TABS = ["overview", "comments", "transactions", "mails", "statement"] as const;
type TabKey = (typeof TABS)[number];

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [activities, setActivities] = useState<SupplierActivity[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentId = params?.id as string | undefined;

  useEffect(() => {
    if (currentId) {
      setSelectedId(currentId);
    }
  }, [currentId]);

  const loadSuppliers = useCallback(
    async (term: string) => {
      try {
        setListLoading(true);
        const res: any = await supplierService.getSuppliers({ page: 1, limit: 100, search: term });
        const rows: SupplierListItem[] = (res?.data || []).map((s: any) => ({
          id: s.id,
          name: s.displayName || s.name,
          email: s.email ?? null,
          phone: s.phone ?? null,
        }));
        setSuppliers(rows);
      } catch (e: any) {
        setError(e?.message || "Failed to load suppliers");
      } finally {
        setListLoading(false);
      }
    },
    [],
  );

  const loadSupplierDetail = useCallback(async (id: string) => {
    try {
      setDetailLoading(true);
      const res: any = await supplierService.getSupplier(id);
      setSupplier({
        id: res.id,
        name: res.displayName || res.name,
        email: res.email ?? null,
        phone: res.phone ?? null,
        language: res.language ?? null,
        type: res.type ?? null,
        currency: res.currency ?? null,
        gstNumber: res.gstNumber ?? null,
        paymentTerms: res.paymentTerms ?? null,
        remarks: res.remarks ?? null,
        addresses: res.addresses || [],
        contactPersons: res.contactPersons || [],
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load supplier details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadActivities = useCallback(async (id: string) => {
    try {
      setActivitiesLoading(true);
      const res: any = await supplierService.getSupplierActivities(id, { limit: 100 });
      setActivities(res?.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load supplier activities");
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers("");
  }, [loadSuppliers]);

  useEffect(() => {
    if (selectedId) {
      loadSupplierDetail(selectedId);
      loadActivities(selectedId);
    }
  }, [selectedId, loadSupplierDetail, loadActivities]);

  const handleRowClick = (id: string) => {
    setSelectedId(id);
    router.push(`${all_routes.suppliers}/${id}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSuppliers(search);
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
              <h5 className="fw-bold mb-2">Suppliers</h5>
              <form onSubmit={handleSearchSubmit} className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search suppliers"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="btn btn-primary" type="submit">
                  <i className="ti ti-search" />
                </button>
              </form>
            </div>
            {listLoading && <p className="text-muted">Loading suppliers...</p>}
            {!listLoading && suppliers.length === 0 && (
              <p className="text-muted">No suppliers found.</p>
            )}
            {!listLoading && suppliers.length > 0 && (
              <ul className="list-group mb-3">
                {suppliers.map((s) => (
                  <li
                    key={s.id}
                    className={`list-group-item list-group-item-action d-flex flex-column ${
                      selectedId === s.id ? "active" : ""
                    }`}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleRowClick(s.id)}
                  >
                    <span className="fw-semibold">{s.name}</span>
                    <span className="small text-muted">
                      {s.email || s.phone || "No contact info"}
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
                <h4 className="fw-bold mb-0">Supplier Details</h4>
                {supplier && (
                  <div className="small text-muted">
                    {supplier.email && <span className="me-3">{supplier.email}</span>}
                    {supplier.phone && <span>{supplier.phone}</span>}
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-secondary me-2"
                  onClick={() => router.push(all_routes.suppliers)}
                >
                  Back to List
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
                      <p className="text-muted mb-0">Loading supplier details...</p>
                    )}
                    {!detailLoading && (
                      <SupplierOverview
                        supplier={supplier}
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
                  <p className="text-muted mb-0">Transactions view coming soon.</p>
                )}
                {activeTab === "mails" && (
                  <p className="text-muted mb-0">Mails view coming soon.</p>
                )}
                {activeTab === "statement" && (
                  <p className="text-muted mb-0">Supplier statement view coming soon.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
