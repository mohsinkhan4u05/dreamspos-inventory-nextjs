"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import CountUp from "react-countup";
import { useEffect, useMemo, useState } from "react";
import { User, UserCheck, ArrowRight, File } from "react-feather";
import { all_routes } from "@/data/all_routes";
import SalesStatisticsChart from "../charts/salesstatisticschart";
import {
  productService,
  customerService,
  supplierService,
  salesService,
  purchaseService,
} from "@/services/api";
import { useOrgFormatting } from "@/hooks/useOrgFormatting";

interface DashboardTotals {
  totalPurchaseDue: number;
  totalSalesDue: number;
  totalSalesAmount: number;
  totalExpenseAmount: number;
}

interface DashboardCounts {
  customers: number;
  suppliers: number;
  purchaseInvoices: number;
  salesInvoices: number;
}

export default function Admindashboard() {
  const route = all_routes;
  const currentYear = new Date().getFullYear();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<DashboardTotals | null>(null);
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [purchaseData, setPurchaseData] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [expiredProducts, setExpiredProducts] = useState<any[]>([]);

  const { baseCurrency, formatCurrency } = useOrgFormatting();

  const currencyPrefix = useMemo(() => {
    const map: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return map[baseCurrency] || `${baseCurrency} `;
  }, [baseCurrency]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [salesRes, purchasesRes, productsRes, customersRes, suppliersRes] =
          await Promise.all([
            salesService.getSales({ limit: 100 }),
            purchaseService.getPurchases({ limit: 100 }),
            productService.getProducts({ page: 1, limit: 10, isActive: true }),
            customerService.getCustomers({ limit: 1 }),
            supplierService.getSuppliers({ limit: 1 }),
          ]);

        if (cancelled) return;

        const sales = (salesRes as any)?.data || [];
        const purchases = (purchasesRes as any)?.data || [];
        const productsArray = Array.isArray(productsRes)
          ? productsRes
          : (productsRes as any)?.products || (productsRes as any)?.data || [];

        setSalesData(sales);
        setPurchaseData(purchases);

        const totalSalesAmount = sales.reduce(
          (sum: number, s: any) => sum + (Number(s.totalAmount) || 0),
          0,
        );
        const totalSalesDue = sales.reduce(
          (sum: number, s: any) => {
            const total = Number(s.totalAmount) || 0;
            const paid = Number(s.paidAmount) || 0;
            return sum + Math.max(total - paid, 0);
          },
          0,
        );

        const totalPurchaseAmount = purchases.reduce(
          (sum: number, p: any) => sum + (Number(p.totalAmount) || 0),
          0,
        );
        const totalPurchasePaid = purchases.reduce(
          (sum: number, p: any) => sum + (Number(p.paidAmount) || 0),
          0,
        );
        const totalPurchaseDue = Math.max(
          totalPurchaseAmount - totalPurchasePaid,
          0,
        );

        const totalExpenseAmount = 0; // No dedicated expense API yet

        const customerTotal = (customersRes as any)?.pagination?.total ?? 0;
        const supplierTotal = (suppliersRes as any)?.pagination?.total ?? 0;

        const purchaseInvoices = (purchasesRes as any)?.pagination?.total ?? 0;
        const salesInvoices = (salesRes as any)?.pagination?.total ?? 0;

        setTotals({
          totalPurchaseDue,
          totalSalesDue,
          totalSalesAmount,
          totalExpenseAmount,
        });

        setCounts({
          customers: customerTotal,
          suppliers: supplierTotal,
          purchaseInvoices,
          salesInvoices,
        });

        const recent = (productsArray || []).slice(0, 4);
        setRecentProducts(recent);

        const expired = (productsArray || []).filter((p: any) => {
          const expiry = (p as any).expiryDate;
          if (!expiry) return false;
          const d = new Date(expiry);
          return Number.isFinite(d.getTime()) && d.getTime() < Date.now();
        });
        setExpiredProducts(expired.slice(0, 5));
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Failed to load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const safeTotals = totals || {
    totalPurchaseDue: 0,
    totalSalesDue: 0,
    totalSalesAmount: 0,
    totalExpenseAmount: 0,
  };

  const safeCounts = counts || {
    customers: 0,
    suppliers: 0,
    purchaseInvoices: 0,
    salesInvoices: 0,
  };

  const chartData = useMemo(
    () => {
      const categories = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const salesByMonth = new Array(12).fill(0);
      const purchaseByMonth = new Array(12).fill(0);

      salesData.forEach((s: any) => {
        const createdAt = s?.createdAt;
        if (!createdAt) return;
        const date = new Date(createdAt);
        if (Number.isNaN(date.getTime())) return;
        if (date.getFullYear() !== selectedYear) return;
        const month = date.getMonth();
        const total = Number(s.totalAmount) || 0;
        if (month >= 0 && month < 12) {
          salesByMonth[month] += total;
        }
      });

      purchaseData.forEach((p: any) => {
        const createdAt = p?.createdAt;
        if (!createdAt) return;
        const date = new Date(createdAt);
        if (Number.isNaN(date.getTime())) return;
        if (date.getFullYear() !== selectedYear) return;
        const month = date.getMonth();
        const total = Number(p.totalAmount) || 0;
        if (month >= 0 && month < 12) {
          purchaseByMonth[month] += total;
        }
      });

      return {
        categories,
        sales: salesByMonth,
        purchase: purchaseByMonth,
      };
    },
    [salesData, purchaseData, selectedYear],
  );

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          {loading && (
            <div className="alert alert-info py-2 mb-3">Loading dashboard data...</div>
          )}

          {error && (
            <div className="alert alert-danger py-2 mb-3">{error}</div>
          )}

          {/* ---------- Widgets Row ---------- */}
          <div className="row">
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card dash-widget dash1 w-100">
                <div className="card-body d-flex align-items-center">
                  <div className="dash-widgetimg">
                    <span>
                      <img src="assets/img/icons/dash2.svg" alt="img" />
                    </span>
                  </div>
                  <div className="dash-widgetcontent">
                    <h5>
                      <span className="counters custome-heading">
                        <CountUp
                          start={0}
                          end={safeTotals.totalSalesDue}
                          duration={2}
                          prefix={currencyPrefix}
                        />
                      </span>
                    </h5>
                    <p className="mb-0">Total Sales Due</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card dash-widget dash2 w-100">
                <div className="card-body d-flex align-items-center">
                  <div className="dash-widgetimg">
                    <span>
                      <img src="assets/img/icons/dash3.svg" alt="img" />
                    </span>
                  </div>
                  <div className="dash-widgetcontent">
                    <h5>
                      <span className="counters custome-heading">
                        <CountUp
                          start={0}
                          end={safeTotals.totalSalesAmount}
                          duration={2}
                          prefix={currencyPrefix}
                        />
                      </span>
                    </h5>
                    <p className="mb-0">Total Sale Amount</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card dash-widget dash3 w-100">
                <div className="card-body d-flex align-items-center">
                  <div className="dash-widgetimg">
                    <span>
                      <img src="assets/img/icons/dash4.svg" alt="img" />
                    </span>
                  </div>
                  <div className="dash-widgetcontent">
                    <h5>
                      <span className="counters custome-heading">
                        <CountUp
                          start={0}
                          end={safeTotals.totalExpenseAmount}
                          duration={2}
                          prefix={currencyPrefix}
                        />
                      </span>
                    </h5>
                    <p className="mb-0">Total Expense Amount</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="dash-count">
                <div className="dash-counts">
                  <h4 className="custome-heading">{safeCounts.customers}</h4>
                  <h5>Customers</h5>
                </div>
                <div className="dash-imgs">
                  <User />
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-sm-6 col-12 d-flex mt-3 mt-sm-0">
              <div className="dash-count das1">
                <div className="dash-counts">
                  <h4 className="custome-heading">{safeCounts.suppliers}</h4>
                  <h5>Suppliers</h5>
                </div>
                <div className="dash-imgs">
                  <UserCheck />
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-sm-6 col-12 d-flex mt-3 mt-sm-0">
              <div className="dash-count das2 bg-dark">
                <div className="dash-counts">
                  <h4 className="custome-heading">{safeCounts.purchaseInvoices}</h4>
                  <h5>Purchase Invoice</h5>
                </div>
                <div className="dash-imgs">
                  <img src="assets/img/icons/file-text-icon-01.svg" className="img-fluid" alt="icon" />
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-sm-6 col-12 d-flex mt-3 mt-sm-0">
              <div className="dash-count das3">
                <div className="dash-counts">
                  <h4 className="custome-heading">{safeCounts.salesInvoices}</h4>
                  <h5>Sales Invoice</h5>
                </div>
                <div className="dash-imgs">
                  <File />
                </div>
              </div>
            </div>
          </div>
          {/* ---------- End Widgets Row ---------- */}

          {/* Purchase & Sales chart + Recent Products */}
          <div className="row mt-4">
            <div className="col-xl-7 col-sm-12 col-12 d-flex">
              <div className="card flex-fill">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Purchase &amp; Sales</h5>
                  <div className="graph-sets">
                    <ul className="mb-0">
                      <li>
                        <span>Sales</span>
                      </li>
                      <li>
                        <span>Purchase</span>
                      </li>
                    </ul>
                    <div className="dropdown dropdown-wraper">
                      <button
                        className="btn btn-light btn-sm dropdown-toggle"
                        type="button"
                        id="dropdownMenuButton"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        {selectedYear}
                      </button>
                      <ul
                        className="dropdown-menu"
                        aria-labelledby="dropdownMenuButton"
                      >
                        {[selectedYear, selectedYear - 1, selectedYear - 2]
                          .filter((year, index, arr) => arr.indexOf(year) === index)
                          .map((year) => (
                            <li key={year}>
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => setSelectedYear(year)}
                              >
                                {year}
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <div id="sales_charts" />
                  <SalesStatisticsChart
                    categories={chartData.categories}
                    salesSeries={chartData.sales}
                    purchaseSeries={chartData.purchase}
                  />
                </div>
              </div>
            </div>

            <div className="col-xl-5 col-sm-12 col-12 d-flex">
              <div className="card flex-fill default-cover mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h4 className="card-title mb-0">Recent Products</h4>
                  <div className="view-all-link">
                    <Link href="#" className="view-all d-flex align-items-center">
                      View All
                      <span className="ps-2 d-flex align-items-center">
                        <ArrowRight className="feather-16" />
                      </span>
                    </Link>
                  </div>
                </div>

                <div className="card-body">
                  <div className="table-responsive dataview">
                    <table className="table dashboard-recent-products">
                      <thead className="thead-light">
                        <tr>
                          <th>#</th>
                          <th>Products</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentProducts.length === 0 && (
                          <tr>
                            <td colSpan={3} className="text-center text-muted">
                              No recent products
                            </td>
                          </tr>
                        )}
                        {recentProducts.map((p: any, index: number) => (
                          <tr key={p.id ?? index}>
                            <td>{index + 1}</td>
                            <td className="d-flex align-items-center">
                              <Link href={route.productlist} className="avatar avatar-lg me-2">
                                <img
                                  src={p.image || "assets/img/products/stock-img-01.png"}
                                  alt={p.name || "product"}
                                />
                              </Link>
                              <Link href={route.productlist} className="fw-bold">
                                {p.name || p.productName || "Unnamed"}
                              </Link>
                            </td>
                            <td>
                              {typeof p.sellingPrice === "number"
                                ? formatCurrency(p.sellingPrice)
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expired Products */}
          <div className="row mt-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h4 className="card-title">Expired Products</h4>
                </div>
                <div className="card-body">
                  <div className="table-responsive dataview">
                    <table className="table dashboard-expired-products">
                      <thead className="thead-light">
                        <tr>
                          <th className="no-sort">
                            <label className="checkboxs">
                              <input type="checkbox" id="select-all" />
                              <span className="checkmarks" />
                            </label>
                          </th>
                          <th>Product</th>
                          <th>SKU</th>
                          <th>Manufactured Date</th>
                          <th>Expired Date</th>
                          <th className="no-sort">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expiredProducts.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center text-muted">
                              No expired products
                            </td>
                          </tr>
                        )}
                        {expiredProducts.map((p: any, index: number) => (
                          <tr key={p.id ?? index}>
                            <td>
                              <label className="checkboxs">
                                <input type="checkbox" />
                                <span className="checkmarks" />
                              </label>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <Link href={route.productlist} className="avatar avatar-lg me-2">
                                  <img
                                    src={p.image || "assets/img/products/stock-img-01.png"}
                                    alt={p.name || "product"}
                                  />
                                </Link>
                                <Link href={route.productlist} className="fw-bold">
                                  {p.name || p.productName || "Unnamed"}
                                </Link>
                              </div>
                            </td>
                            <td>{p.sku || "-"}</td>
                            <td>-</td>
                            <td>{(p as any).expiryDate || "-"}</td>
                            <td className="action-table-data">
                              <div className="edit-delete-action">
                                <Link className="me-2 p-2" href={route.productlist}>
                                  <i data-feather="edit" className="feather-edit" />
                                </Link>
                                <Link className="confirm-text p-2" href={route.productlist}>
                                  <i data-feather="trash-2" className="feather-trash-2" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div> {/* end content */}
      </div> {/* end page-wrapper */}
    </div>
  );
}
