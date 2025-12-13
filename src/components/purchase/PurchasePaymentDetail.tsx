"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import TooltipIcons from "@/core/common/tooltip-content/tooltipIcons";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import CommonDeleteModal from "@/core/common/modal/commonDeleteModal";
import { all_routes } from "@/data/all_routes";
import { usePurchasePayments } from "@/hooks/usePurchasePayments";
import { usePurchasePaymentDetail } from "@/hooks/usePurchasePaymentDetail";
import { useOrgFormatting } from "@/hooks/useOrgFormatting";
import { useOrganization } from "@/context/OrganizationContext";

interface Props {
  id: string;
  initialStatus?: string;
  initialSupplierId?: string;
  initialStartDate?: string;
  initialEndDate?: string;
}

const renderStatusBadge = (status?: string) => {
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

function amountToWords(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  const integerPart = Math.floor(amount);
  const fractionalPart = Math.round((amount - integerPart) * 100);

  const smallNumbers = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const toWordsBelowThousand = (n: number): string => {
    let words = "";
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;

    if (hundreds > 0) {
      words += smallNumbers[hundreds] + " Hundred";
      if (rest > 0) words += " ";
    }

    if (rest > 0) {
      if (rest < 20) {
        words += smallNumbers[rest];
      } else {
        const t = Math.floor(rest / 10);
        const u = rest % 10;
        words += tens[t];
        if (u > 0) words += " " + smallNumbers[u];
      }
    }

    return words || smallNumbers[0];
  };

  if (integerPart === 0 && fractionalPart === 0) {
    return "Zero";
  }

  let result = "";
  const crores = Math.floor(integerPart / 10000000);
  const lakhs = Math.floor((integerPart % 10000000) / 100000);
  const thousands = Math.floor((integerPart % 100000) / 1000);
  const hundreds = integerPart % 1000;

  if (crores) {
    result += toWordsBelowThousand(crores) + " Crore";
  }
  if (lakhs) {
    if (result) result += " ";
    result += toWordsBelowThousand(lakhs) + " Lakh";
  }
  if (thousands) {
    if (result) result += " ";
    result += toWordsBelowThousand(thousands) + " Thousand";
  }
  if (hundreds) {
    if (result) result += " ";
    result += toWordsBelowThousand(hundreds);
  }

  if (fractionalPart > 0) {
    result += ` and ${fractionalPart.toString().padStart(2, "0")} Paise`;
  }

  return result;
}

export default function PurchasePaymentDetail({
  id,
  initialStatus,
  initialSupplierId,
  initialStartDate,
  initialEndDate,
}: Props) {
  const router = useRouter();
  const route = all_routes;
  const { formatCurrency, formatDate } = useOrgFormatting();
  const { organization } = useOrganization();
  const {
    payment,
    loading: detailLoading,
    error: detailError,
    refetch,
  } = usePurchasePaymentDetail(id);
  const {
    payments,
    loading: listLoading,
    error: listError,
  } = usePurchasePayments({
    limit: 100,
    status: initialStatus || undefined,
    supplierId: initialSupplierId || undefined,
    startDate: initialStartDate || undefined,
    endDate: initialEndDate || undefined,
  });

  if (!id) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>Payment id is required.</p>
          <Link
            href={route.purchasepayments || "/purchase-payments"}
            className="btn btn-outline-secondary mt-2"
          >
            Back to Payments
          </Link>
        </div>
      </div>
    );
  }

  if (detailLoading || !payment) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>
            {detailLoading
              ? "Loading payment..."
              : detailError || "Payment not found"}
          </p>
        </div>
      </div>
    );
  }

  const supplierName = payment.purchase?.supplier?.name || "-";
  const supplierId = payment.purchase?.supplier?.id;
  const billNumber = payment.purchase?.orderNumber || "-";
  const billDate = payment.purchase?.createdAt;
  const billTotal =
    typeof payment.purchase?.totalAmount === "number"
      ? payment.purchase.totalAmount
      : payment.amount;
  const amountWords = amountToWords(payment.amount);
  const businessName = payment.purchase?.store?.name || "Your Company Name";
  const businessCode = payment.purchase?.store?.code || "";
  const normalizedStatus = payment.status?.toUpperCase?.() || "";

  const orgName = organization?.name || null;
  const orgCompanyId = organization?.companyId || null;
  const orgLogoUrl = organization?.logoUrl || null;
  const orgEmail = organization?.primaryContactEmail || null;
  const orgPhone = organization?.primaryContactPhone || null;
  const orgAddress = [
    organization?.addressLine1,
    organization?.addressLine2,
    organization?.city,
    organization?.state,
    organization?.zipCode,
    organization?.location,
  ]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(", ");

  const paymentRows = (payments?.data || []).filter((p) => !!p.purchase?.id);

  return (
    <div className="payment-detail-page">
      <div className="page-wrapper">
        <div className="content">
          <div className="row">
            <div className="col-lg-3 col-md-4 border-end payment-sidebar">
              <div className="mb-3 d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="fw-bold mb-0">Payments Made</h5>
                  <div className="small text-muted">Against supplier bills</div>
                </div>
                <button
                  type="button"
                  className="btn btn-link p-0 ms-2"
                  onClick={() => {
                    if (!listLoading) {
                      window.location.reload();
                    }
                  }}
                >
                  <RefreshIcon />
                </button>
              </div>
              <div
                style={{
                  maxHeight: "calc(100vh - 180px)",
                  overflowY: "auto",
                }}
              >
                {listLoading && (
                  <p className="text-muted mb-0">Loading payments...</p>
                )}
                {!listLoading && listError && (
                  <p className="text-danger mb-0">{listError}</p>
                )}
                {!listLoading && !listError && paymentRows.length === 0 && (
                  <p className="text-muted mb-0">No payments found.</p>
                )}
                {!listLoading && !listError && paymentRows.length > 0 && (
                  <ul className="list-group mb-3">
                    {paymentRows.map((p) => {
                      const rowSupplier = p.purchase?.supplier?.name || "-";
                      const isActive = p.id === payment.id;
                      return (
                        <li
                          key={p.id}
                          className={`list-group-item list-group-item-action mb-2 ${
                            isActive ? "active" : ""
                          }`}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            if (!isActive) {
                              const query =
                                `?id=${p.id}` +
                                `${initialStatus ? `&status=${encodeURIComponent(initialStatus)}` : ""}` +
                                `${initialSupplierId ? `&supplierId=${encodeURIComponent(initialSupplierId)}` : ""}` +
                                `${initialStartDate ? `&startDate=${encodeURIComponent(initialStartDate)}` : ""}` +
                                `${initialEndDate ? `&endDate=${encodeURIComponent(initialEndDate)}` : ""}`;
                              router.push(
                                `${route.purchasepaymentdetails || "/purchase-payment-details"}${query}`,
                              );
                            }
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <div className="fw-semibold">{p.id.slice(0, 8)}</div>
                              <div className="small">
                                {formatDate(p.createdAt)}
                              </div>
                              <div className="small text-truncate">{rowSupplier}</div>
                            </div>
                            <div className="text-end">
                              <div className="fw-semibold">
                                {formatCurrency(p.amount)}
                              </div>
                              <div className="small text-uppercase">
                                {p.paymentMethod}
                              </div>
                              <div className="small mt-1">
                                {renderStatusBadge(p.status)}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="col-lg-9 col-md-8">
              <div className="page-header d-flex justify-content-between align-items-center mb-3">
                <div className="page-title">
                  <div className="d-flex align-items-center gap-2">
                    <h4 className="mb-1">
                      Payment Made #{payment.id.slice(0, 8)}
                    </h4>
                    <div className="header-status-badge">
                      {renderStatusBadge(payment.status)}
                    </div>
                  </div>
                  <h6 className="mb-0">{supplierName}</h6>
                </div>
                <div className="d-flex align-items-center">
                  <ul className="table-top-head me-3 mb-0">
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
                  <div className="page-btn d-flex align-items-center gap-2 payment-actions">
                    <button
                      type="button"
                      className="btn btn-white btn-sm d-flex align-items-center"
                    >
                      <i className="ti ti-printer me-1" /> PDF / Print
                    </button>
                  </div>
                </div>
              </div>

              <div className="card mb-3 payment-receipt-card">
                <div className="card-body position-relative">
                  <div className="d-flex justify-content-between mb-4">
                    <div>
                      {orgLogoUrl && (
                        <div
                          className="mb-2"
                          style={{
                            height: 40,
                            width: 160,
                            backgroundImage: `url(${orgLogoUrl})`,
                            backgroundSize: "contain",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "left center",
                          }}
                        />
                      )}
                      <h5 className="mb-1">{orgName || businessName}</h5>
                      {orgCompanyId && (
                        <div className="small text-muted">Company ID: {orgCompanyId}</div>
                      )}
                      {orgAddress && (
                        <div className="small text-muted">{orgAddress}</div>
                      )}
                      {(orgEmail || orgPhone) && (
                        <div className="small text-muted">
                          {orgEmail && <span>{orgEmail}</span>}
                          {orgEmail && orgPhone && <span> · </span>}
                          {orgPhone && <span>{orgPhone}</span>}
                        </div>
                      )}
                      {businessCode && (
                        <div className="small text-muted">Store Code: {businessCode}</div>
                      )}
                    </div>
                    <div className="text-end">
                      <h2 className="mb-1 text-uppercase">Payment Made</h2>
                      <div className="small text-muted">
                        #{payment.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>

                  <div className="row mb-4">
                    <div className="col-md-7">
                      <table className="table table-sm mb-0 payment-info-table">
                        <tbody>
                          <tr>
                            <td className="fw-semibold">Payment Date</td>
                            <td>
                              {formatDate(payment.createdAt)}
                            </td>
                          </tr>
                          <tr>
                            <td className="fw-semibold">Reference Number</td>
                            <td>{payment.reference || "-"}</td>
                          </tr>
                          <tr>
                            <td className="fw-semibold">Payment Mode</td>
                            <td>{payment.paymentMethod}</td>
                          </tr>
                          <tr>
                            <td className="fw-semibold">
                              Amount Paid (in words)
                            </td>
                            <td>{amountWords}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="mt-4">
                        <div className="fw-semibold mb-1">Paid To</div>
                        {supplierId ? (
                          <Link
                            href={`${route.suppliers || "/suppliers"}/${supplierId}`}
                            className="text-primary"
                          >
                            {supplierName}
                          </Link>
                        ) : (
                          <span>{supplierName}</span>
                        )}
                      </div>
                    </div>
                    <div className="col-md-5 d-flex align-items-stretch mt-3 mt-md-0">
                      <div
                        className={`payment-amount-box w-100 ${
                          normalizedStatus === "PARTIAL"
                            ? "payment-amount-box-partial"
                            : ""
                        }`}
                      >
                        <div className="text-uppercase small text-white-50 mb-1">
                          Amount Paid
                        </div>
                        <div className="h3 mb-0 text-white">
                          {formatCurrency(payment.amount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="fw-semibold mb-2">Payment For</div>
                    <div className="table-responsive">
                      <table className="table table-sm mb-0 payment-for-table">
                        <thead>
                          <tr>
                            <th>Bill #</th>
                            <th>Bill Date</th>
                            <th className="text-end">Bill Amount</th>
                            <th className="text-end">Payment Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payment.purchase ? (
                            <tr>
                              <td>
                                <Link
                                  href={`${route.billdetails || "/bill-details"}?id=${payment.purchase.id}`}
                                  className="text-primary"
                                >
                                  {billNumber}
                                </Link>
                              </td>
                              <td>
                                {billDate
                                  ? formatDate(billDate)
                                  : "-"}
                              </td>
                              <td className="text-end">
                                {formatCurrency(billTotal)}
                              </td>
                              <td className="text-end">
                                {formatCurrency(payment.amount)}
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan={4} className="text-center text-muted">
                                No linked bill information.
                              </td>
                            </tr>
                          )}
                          <tr className="fw-semibold border-top">
                            <td colSpan={3} className="text-end">
                              Total
                            </td>
                            <td className="text-end">
                              {formatCurrency(payment.amount)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-end mt-4">
                    <div className="small text-muted">
                      PDF Template: Standard (static preview)
                    </div>
                    <div className="text-end">
                      <div className="payment-signature-line" />
                      <div className="small text-muted mt-1">
                        Authorized Signature
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => router.back()}
                >
                  Back
                </button>
                <Link
                  href={route.purchasepayments || "/purchase-payments"}
                  className="btn btn-primary"
                >
                  Go to Payments Made List
                </Link>
              </div>
            </div>
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

      <style jsx>{`
        .payment-detail-page {
          background-color: #f5f7fb;
        }

        .payment-sidebar .list-group-item.active {
          background-color: #0ab39c;
          border-color: #0ab39c;
          color: #fff;
        }

        .payment-receipt-card {
          box-shadow: 0 4px 12px rgba(15, 34, 58, 0.12);
          border-radius: 8px;
        }

        .payment-receipt-card .card-body {
          padding: 20px 24px 24px;
        }

        .payment-amount-box {
          background: linear-gradient(135deg, #0ab39c, #0a8f9c);
          border-radius: 8px;
          padding: 12px 18px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .payment-amount-box .h3 {
          font-size: 28px;
          font-weight: 600;
        }

        .payment-amount-box-partial {
          background: linear-gradient(135deg, #f6a623, #f37b1d);
        }

        .header-status-badge .badge {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 999px;
        }

        .payment-info-table td:first-of-type {
          width: 38%;
        }

        .payment-info-table td {
          border: 0;
          padding: 4px 0;
          font-size: 13px;
        }

        .payment-info-table tr + tr td {
          padding-top: 8px;
        }

        .payment-for-table thead tr {
          background-color: #f5f6f8;
        }

        .payment-for-table thead th {
          font-size: 13px;
          font-weight: 600;
          border-bottom: 0;
        }

        .payment-for-table tbody td {
          font-size: 13px;
        }

        .payment-for-table th,
        .payment-for-table td {
          vertical-align: middle;
        }

        .payment-signature-line {
          border-top: 1px solid #ced4da;
          width: 180px;
          margin-left: auto;
        }

        @media print {
          .payment-sidebar,
          .payment-actions,
          .table-top-head,
          .footer,
          .btn,
          .mt-3.d-flex {
            display: none !important;
          }

          .page-wrapper {
            box-shadow: none;
            margin: 0;
          }

          .payment-receipt-card {
            box-shadow: none;
            border: 0;
          }

          body {
            background: #fff;
          }
        }
      `}</style>
    </div>
  );
}
