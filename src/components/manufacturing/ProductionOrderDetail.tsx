"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useOrgFormatting } from "@/hooks/useOrgFormatting";
import { productionOrderService } from "@/services/api";

interface ProductionOrderDetailResponse {
  order: any;
  movements: any[];
}

export default function ProductionOrderDetail() {
  const params = useParams();
  const { formatDate, formatDateTime } = useOrgFormatting();
  const [data, setData] = useState<ProductionOrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params?.id as string | undefined;

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await productionOrderService.getProductionOrder(id);
        setData(response as ProductionOrderDetailResponse);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load production order",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (!id) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p className="text-danger">Production order id is missing in URL.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <h4 className="text-danger mb-2">Unable to load production order</h4>
          <p className="text-muted mb-0">{error || "No data"}</p>
        </div>
      </div>
    );
  }

  const { order, movements } = data;

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="page-title">
            <h4>Production Order Details</h4>
            <h6>Order #{order.id?.slice(-8) || order.id}</h6>
          </div>
        </div>

        <div className="row">
          <div className="col-xl-6">
            <div className="card mb-3">
              <div className="card-header">
                <h5 className="card-title mb-0">Summary</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-6">
                    <p className="mb-1 text-muted">Finished Product</p>
                    <p className="mb-0 fw-semibold">
                      {order.finishedProduct?.name || "-"}
                    </p>
                  </div>
                  <div className="col-6">
                    <p className="mb-1 text-muted">Store</p>
                    <p className="mb-0 fw-semibold">{order.store?.name || "-"}</p>
                  </div>
                  <div className="col-4">
                    <p className="mb-1 text-muted">Planned Qty</p>
                    <p className="mb-0 fw-semibold">{order.quantityPlanned}</p>
                  </div>
                  <div className="col-4">
                    <p className="mb-1 text-muted">Produced Qty</p>
                    <p className="mb-0 fw-semibold">
                      {order.quantityProduced ?? "-"}
                    </p>
                  </div>
                  <div className="col-4">
                    <p className="mb-1 text-muted">Status</p>
                    <span className="badge badge-soft-info badge-xs shadow-none">
                      <i className="ti ti-point-filled me-1" />
                      {order.status}
                    </span>
                  </div>
                  <div className="col-4">
                    <p className="mb-1 text-muted">Created At</p>
                    <p className="mb-0 fw-semibold">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  {order.completedAt && (
                    <div className="col-4">
                      <p className="mb-1 text-muted">Completed At</p>
                      <p className="mb-0 fw-semibold">
                        {formatDateTime(order.completedAt)}
                      </p>
                    </div>
                  )}
                  {order.cancelledAt && (
                    <div className="col-4">
                      <p className="mb-1 text-muted">Cancelled At</p>
                      <p className="mb-0 fw-semibold">
                        {formatDateTime(order.cancelledAt)}
                      </p>
                    </div>
                  )}
                  {order.notes && (
                    <div className="col-12">
                      <p className="mb-1 text-muted">Notes</p>
                      <p className="mb-0">{order.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-6">
            <div className="card mb-3">
              <div className="card-header">
                <h5 className="card-title mb-0">Stock Movements</h5>
              </div>
              <div className="card-body table-responsive">
                {movements?.length ? (
                  <table className="table table-striped mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th>Store</th>
                        <th>Type</th>
                        <th className="text-end">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => (
                        <tr key={m.id}>
                          <td>{formatDate(m.createdAt)}</td>
                          <td>{m.product?.name || "-"}</td>
                          <td>{m.store?.name || "-"}</td>
                          <td>{m.movementType}</td>
                          <td className="text-end">{m.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mb-0 text-muted">No stock movements recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
