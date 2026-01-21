import React from "react";
import AddressCard from "./AddressCard";
import ContactPersonCard from "./ContactPersonCard";
import type { CustomerActivity } from "./CustomerTimeline";
import CustomerTimeline from "./CustomerTimeline";

interface Address {
  id: string;
  type: string;
  attention?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  country?: string | null;
  phone?: string | null;
}

interface ContactPerson {
  id: string;
  salutation?: string | null;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  workPhone?: string | null;
  mobile?: string | null;
  isPrimary?: boolean | null;
}

export interface CustomerDetail {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  language?: string | null;
  type?: "BUSINESS" | "INDIVIDUAL" | null;
  currency?: string | null;
  allowPortal?: boolean | null;
  pan?: string | null;
  addresses: Address[];
  contactPersons: ContactPerson[];
}

interface CustomerOverviewProps {
  customer: CustomerDetail | null;
  activities: CustomerActivity[];
  activitiesLoading?: boolean;
}

const CustomerOverview: React.FC<CustomerOverviewProps> = ({ customer, activities, activitiesLoading }) => {
  if (!customer) {
    return (
      <div className="card">
        <div className="card-body">
          <p className="mb-0 text-muted">Select a customer from the list to view details.</p>
        </div>
      </div>
    );
  }

  const billingAddress = customer.addresses.find((a) => a.type === "BILLING");
  const shippingAddress = customer.addresses.find((a) => a.type === "SHIPPING");

  const displayName = customer.name;

  return (
    <div className="row">
      <div className="col-lg-8 mb-3">
        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h5 className="mb-1 fw-bold">{displayName}</h5>
                <div className="small text-muted">
                  {customer.email && <span className="me-3">{customer.email}</span>}
                  {customer.phone && <span className="me-3">Work: {customer.phone}</span>}
                  {customer.mobile && <span>Mobile: {customer.mobile}</span>}
                </div>
                {customer.language && (
                  <div className="small text-muted mt-1">Language: {customer.language}</div>
                )}
              </div>
              <div className="text-end small text-muted">
                <div>
                  <span className="text-dark">Customer Type: </span>
                  {customer.type || "N/A"}
                </div>
                <div>
                  <span className="text-dark">Default Currency: </span>
                  {customer.currency || "N/A"}
                </div>
                <div>
                  <span className="text-dark">Portal Status: </span>
                  {customer.allowPortal ? "Enabled" : "Disabled"}
                </div>
                <div>
                  <span className="text-dark">PAN: </span>
                  {customer.pan || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <AddressCard title="Billing Address" address={billingAddress} />
          </div>
          <div className="col-md-6">
            <AddressCard title="Shipping Address" address={shippingAddress} />
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-header pb-2 pt-3 border-bottom-0 d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-semibold">Contact Persons</h6>
          </div>
          <div className="card-body pt-2">
            {customer.contactPersons.length === 0 && (
              <p className="text-muted mb-0">No contact persons added.</p>
            )}
            {customer.contactPersons.length > 0 && (
              <div>
                {customer.contactPersons.map((cp) => (
                  <ContactPersonCard key={cp.id} contact={cp} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-4 mb-3">
        <CustomerTimeline activities={activities} loading={activitiesLoading} />
      </div>
    </div>
  );
};

export default CustomerOverview;
