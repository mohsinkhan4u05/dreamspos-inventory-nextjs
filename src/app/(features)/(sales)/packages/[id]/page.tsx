"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { all_routes } from "@/data/all_routes";
import { usePackage } from "@/hooks/usePackage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function PackageDetailPage({ params }: PageProps) {
  const resolvedParams = params as unknown as { id: string };
  const { id } = resolvedParams;
  const { pkg, loading, error } = usePackage<any>(id);
  const route = all_routes;
  const searchParams = useSearchParams();

  if (loading || !pkg) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <p>{loading ? "Loading package..." : error || "Package not found"}</p>
        </div>
      </div>
    );
  }

  const order = pkg.salesOrder;

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="page-title">
            <h4>Package #{pkg.packageNumber}</h4>
            {order && <h6>Sales Order #{order.orderNumber}</h6>}
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body d-flex justify-content-between flex-wrap gap-3">
            <div>
              <p className="mb-1">
                <strong>Package Date:</strong>{" "}
                {pkg.packageDate ? new Date(pkg.packageDate).toLocaleDateString() : "-"}
              </p>
              <p className="mb-1">
                <strong>Status:</strong> {pkg.status}
              </p>
            </div>
            {order && (
              <div className="text-end">
                <p className="mb-1">
                  <strong>Sales Order:</strong>{" "}
                  <Link href={`/sales-orders/${order.id}`}>#{order.orderNumber}</Link>
                </p>
                <p className="mb-1">
                  <strong>Customer:</strong> {order.customer?.name || "-"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Items</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table datanew mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-end">Package Qty</th>
                    <th className="text-end">Shipped</th>
                    <th className="text-end">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {pkg.items?.map((item: any) => {
                    const soItem = item.salesOrderItem;
                    const remaining = item.quantity - item.shippedQuantity;
                    return (
                      <tr key={item.id}>
                        <td>{soItem?.product?.name || soItem?.productId}</td>
                        <td className="text-end">{item.quantity}</td>
                        <td className="text-end">{item.shippedQuantity}</td>
                        <td className="text-end">{remaining}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Shipments</h5>
          </div>
          <div className="card-body">
            {(!pkg.shipments || pkg.shipments.length === 0) && (
              <p className="mb-0 text-muted">No shipments created for this package yet.</p>
            )}
            {pkg.shipments && pkg.shipments.length > 0 && (
              <div className="table-responsive">
                <table className="table datanew mb-0">
                  <thead>
                    <tr>
                      <th>Shipment #</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Delivered</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkg.shipments.map((shipment: any) => (
                      <tr key={shipment.id}>
                        <td>{shipment.shipmentNumber}</td>
                        <td>
                          {shipment.shipmentDate
                            ? new Date(shipment.shipmentDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>{shipment.status}</td>
                        <td>{shipment.delivered ? "Yes" : "No"}</td>
                        <td className="text-end">
                          <Link
                            href={`/shipments/${shipment.id}`}
                            className="btn btn-link btn-sm p-0"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3">
          <Link href={route.salesorders || "/sales-orders"} className="btn btn-outline-secondary">
            Back to Sales Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
