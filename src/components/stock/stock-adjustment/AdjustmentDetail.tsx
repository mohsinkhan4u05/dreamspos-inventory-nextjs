"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import CommonFooter from '@/core/common/footer/commonFooter'
import { useStockAdjustmentDetail } from '@/hooks/useStockAdjustmentDetail'
import { useOrgFormatting } from '@/hooks/useOrgFormatting'

interface AdjustmentDetailProps {
  id: string
}

export default function AdjustmentDetail({ id }: AdjustmentDetailProps) {
  const router = useRouter()
  const { detail, loading, error } = useStockAdjustmentDetail(id)
  const [showPdfView, setShowPdfView] = useState<boolean>(true)
  const { formatDate } = useOrgFormatting()

  const formattedDate = useMemo(() => {
    if (!detail?.date) return ''
    return formatDate(detail.date as string)
  }, [detail, formatDate])

  const handleDownloadPdf = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
            <div className="text-center">
              <h5 className="text-danger">Error loading adjustment</h5>
              <p className="text-muted">{error || 'Adjustment not found'}</p>
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
          <div className="page-header adjustment-detail-toolbar">
            <div className="page-title">
              <h4>Adjustment Details</h4>
            </div>
            <div className="ms-auto d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm me-2"
                onClick={() => router.push('/stock-adjustment')}
              >
                Back
              </button>
              <div className="dropdown me-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm dropdown-toggle"
                  data-bs-toggle="dropdown"
                >
                  PDF / Print
                </button>
                <div className="dropdown-menu dropdown-menu-end">
                  <button type="button" className="dropdown-item" onClick={handleDownloadPdf}>
                    Download PDF
                  </button>
                  <button type="button" className="dropdown-item" onClick={handleDownloadPdf}>
                    Print
                  </button>
                </div>
              </div>
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="show-pdf-view-toggle"
                  checked={showPdfView}
                  onChange={(e) => setShowPdfView(e.target.checked)}
                />
                <label className="form-check-label ms-2" htmlFor="show-pdf-view-toggle">
                  Show PDF View
                </label>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-center adjustment-detail-sheet-wrapper">
            <div
              className="bg-white position-relative adjustment-detail-sheet"
              style={{
                width: showPdfView ? '100%' : '840px',
                maxWidth: '1000px',
                minHeight: '600px',
                boxShadow: '0 0 20px rgba(0,0,0,0.08)',
                padding: '40px 60px',
              }}
            >
              <div
                className="badge rounded-pill text-uppercase"
                style={{
                  position: 'absolute',
                  top: 24,
                  right: 40,
                  backgroundColor: '#0d6efd',
                  color: '#fff',
                  fontSize: 11,
                  letterSpacing: '1px',
                  padding: '6px 14px',
                }}
              >
                Adjusted
              </div>

              <div className="text-center mb-4">
                <h3
                  className="mb-1"
                  style={{ letterSpacing: '2px', fontWeight: 500 }}
                >
                  INVENTORY ADJUSTMENT
                </h3>
              </div>

              <div className="d-flex justify-content-between mb-4">
                <div />
                <div className="text-end small">
                  <div>
                    <span className="text-muted me-2">Date</span>
                    <span>{formattedDate}</span>
                  </div>
                  <div>
                    <span className="text-muted me-2">Reason</span>
                    <span>{detail.reason || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted me-2">Account</span>
                    <span>{detail.account || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted me-2">Adjustment Type</span>
                    <span>{detail.adjustmentType}</span>
                  </div>
                  <div>
                    <span className="text-muted me-2">Created By</span>
                    <span>{detail.createdBy}</span>
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-bordered mb-0">
                  <thead style={{ backgroundColor: '#f5f5f5' }}>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Item &amp; Description</th>
                      <th className="text-end" style={{ width: '200px' }}>
                        Quantity Adjusted
                      </th>
                      <th className="text-end" style={{ width: '180px' }}>
                        Cost Price
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item, index) => {
                      const qtyClass =
                        item.quantityAdjusted < 0 ? 'text-danger' : 'text-success'
                      const qtyValue = item.quantityAdjusted.toFixed(2)

                      return (
                        <tr key={`${item.itemId}-${index}`}>
                          <td>{index + 1}</td>
                          <td>
                            <div>{item.name}</div>
                            {item.description && (
                              <div className="text-muted small">{item.description}</div>
                            )}
                          </td>
                          <td className="text-end">
                            <div className={qtyClass}>{qtyValue}</div>
                            {item.unit && (
                              <div className="text-muted small">{item.unit}</div>
                            )}
                          </td>
                          <td className="text-end">
                            <div>{item.costPrice.toFixed(2)}</div>
                          </td>
                        </tr>
                      )
                    })}

                    {detail.items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          No items found for this adjustment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="adjustment-detail-footer">
          <CommonFooter />
        </div>
      </div>

      <style jsx global>{`
        @media print {
          /* Hide app chrome when printing adjustment details */
          .adjustment-detail-toolbar,
          .adjustment-detail-footer,
          .header,
          .sidebar,
          .two-column-sidebar,
          .page-header .table-top-head,
          .page-header .page-btn,
          .dropdown-toggle::after {
            display: none !important;
          }

          .adjustment-detail-sheet-wrapper {
            margin: 0 !important;
          }

          .adjustment-detail-sheet {
            box-shadow: none !important;
            width: 100% !important;
            max-width: none !important;
          }

          body {
            background: #ffffff !important;
          }
        }
      `}</style>
    </>
  )
}
