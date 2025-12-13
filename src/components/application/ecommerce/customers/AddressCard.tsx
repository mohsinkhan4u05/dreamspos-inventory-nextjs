import React from "react";

interface Address {
  attention?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  country?: string | null;
  phone?: string | null;
}

interface AddressCardProps {
  title: string;
  address?: Address | null;
}

const AddressCard: React.FC<AddressCardProps> = ({ title, address }) => {
  const hasAddress = address && Object.values(address).some((v) => (v ?? "").toString().trim() !== "");

  return (
    <div className="card mb-3">
      <div className="card-header pb-2 pt-3 border-bottom-0">
        <h6 className="mb-0 fw-semibold">{title}</h6>
      </div>
      <div className="card-body pt-2">
        {!hasAddress && <p className="text-muted mb-0">No address specified.</p>}
        {hasAddress && (
          <div className="small text-muted">
            {address?.attention && <div className="fw-semibold text-dark mb-1">{address.attention}</div>}
            {address?.address1 && <div>{address.address1}</div>}
            {address?.address2 && <div>{address.address2}</div>}
            {(address?.city || address?.state || address?.zipcode) && (
              <div>
                {[address.city, address.state, address.zipcode].filter(Boolean).join(", ")}
              </div>
            )}
            {address?.country && <div>{address.country}</div>}
            {address?.phone && (
              <div className="mt-1">
                <span className="text-dark">Phone: </span>
                {address.phone}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressCard;
