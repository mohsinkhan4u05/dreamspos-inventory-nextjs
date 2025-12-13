import React from "react";

export interface CustomerActivity {
  id: string;
  type: string;
  title?: string | null;
  description?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
}

interface CustomerTimelineProps {
  activities: CustomerActivity[];
  loading?: boolean;
}

const typeLabels: Record<string, string> = {
  CUSTOMER_CREATED: "Customer created",
  INVOICE_CREATED: "Invoice created",
  PAYMENT_RECEIVED: "Payment received",
};

const CustomerTimeline: React.FC<CustomerTimelineProps> = ({ activities, loading }) => {
  return (
    <div className="card h-100">
      <div className="card-header pb-2 pt-3 border-bottom-0">
        <h6 className="mb-0 fw-semibold">Customer Timeline</h6>
      </div>
      <div className="card-body pt-2" style={{ maxHeight: 400, overflowY: "auto" }}>
        {loading && (
          <p className="text-muted mb-0">Loading activities...</p>
        )}
        {!loading && activities.length === 0 && (
          <p className="text-muted mb-0">No activities recorded yet.</p>
        )}
        {!loading && activities.length > 0 && (
          <ul className="list-unstyled mb-0">
            {activities.map((activity) => {
              const label = typeLabels[activity.type] || activity.title || activity.type;
              const timestamp = new Date(activity.createdAt).toLocaleString();

              return (
                <li key={activity.id} className="d-flex mb-3">
                  <div className="me-2 mt-1">
                    <span className="rounded-circle bg-primary-light d-inline-flex align-items-center justify-content-center" style={{ width: 24, height: 24 }}>
                      <span className="ti ti-clock fs-14 text-primary" />
                    </span>
                  </div>
                  <div>
                    <div className="fw-semibold small">{label}</div>
                    {activity.description && (
                      <div className="small text-muted">{activity.description}</div>
                    )}
                    <div className="small text-muted mt-1">{timestamp}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CustomerTimeline;
