import React from "react";
import AddressCard from "@/components/application/ecommerce/customers/AddressCard";
import ContactPersonCard from "@/components/application/ecommerce/customers/ContactPersonCard";
import SupplierTimeline, { SupplierActivity } from "./SupplierTimeline";

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

export interface SupplierDetail {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  language?: string | null;
  type?: "BUSINESS" | "INDIVIDUAL" | null;
  currency?: string | null;
  gstNumber?: string | null;
  paymentTerms?: string | null;
  remarks?: string | null;
  addresses: Address[];
  contactPersons: ContactPerson[];
}

interface SupplierOverviewProps {
  supplier: SupplierDetail | null;
  activities: SupplierActivity[];
  activitiesLoading?: boolean;
}

const SupplierOverview: React.FC<SupplierOverviewProps> = ({ supplier, activities, activitiesLoading }) => {
  if (!supplier) {
    return (
      <div className="card">
        <div className="card-body">
          <p className="mb-0 text-muted">Select a supplier from the list to view details.</p>
        </div>
      </div>
    );
  }

  const billingAddress = supplier.addresses.find((a) => a.type === "BILLING");
  const shippingAddress = supplier.addresses.find((a) => a.type === "SHIPPING");

  const displayName = supplier.name;

  return (
    <div className="row">
      <div className="col-lg-8 mb-3">
        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h5 className="mb-1 fw-bold">{displayName}</h5>
                <div className="small text-muted">
                  {supplier.email && <span className="me-3">{supplier.email}</span>}
                  {supplier.phone && <span>{supplier.phone}</span>}
                </div>
                {supplier.language && (
                  <div className="small text-muted mt-1">Language: {supplier.language}</div>
                )}
                {supplier.remarks && (
                  <div className="small text-muted mt-1">Remarks: {supplier.remarks}</div>
                )}
              </div>
              <div className="text-end small text-muted">
                <div>
                  <span className="text-dark">Supplier Type: </span>
                  {supplier.type || "N/A"}
                </div>
                <div>
                  <span className="text-dark">Default Currency: </span>
                  {supplier.currency || "N/A"}
                </div>
                <div>
                  <span className="text-dark">GST Number: </span>
                  {supplier.gstNumber || "N/A"}
                </div>
                <div>
                  <span className="text-dark">Payment Terms: </span>
                  {supplier.paymentTerms || "N/A"}
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
            {supplier.contactPersons.length === 0 && (
              <p className="text-muted mb-0">No contact persons added.</p>
            )}
            {supplier.contactPersons.length > 0 && (
              <div>
                {supplier.contactPersons.map((cp) => (
                  <ContactPersonCard key={cp.id} contact={cp} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-4 mb-3">
        <SupplierTimeline activities={activities} loading={activitiesLoading} />
      </div>
    </div>
  );
};

export default SupplierOverview;
