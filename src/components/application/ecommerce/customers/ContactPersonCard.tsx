import React from "react";

interface ContactPerson {
  id?: string;
  salutation?: string | null;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  workPhone?: string | null;
  mobile?: string | null;
  isPrimary?: boolean | null;
}

interface ContactPersonCardProps {
  contact: ContactPerson;
}

const ContactPersonCard: React.FC<ContactPersonCardProps> = ({ contact }) => {
  const fullName = [contact.salutation, contact.firstName, contact.lastName]
    .filter((v) => (v ?? "").toString().trim() !== "")
    .join(" ");

  return (
    <div className="border rounded p-2 mb-2 d-flex justify-content-between align-items-start">
      <div>
        <div className="fw-semibold">
          {fullName || "Contact Person"}
          {contact.isPrimary && <span className="badge bg-primary ms-2">Primary</span>}
        </div>
        {contact.email && (
          <div className="small text-muted">{contact.email}</div>
        )}
        {(contact.workPhone || contact.mobile) && (
          <div className="small text-muted mt-1">
            {contact.workPhone && <span>Work: {contact.workPhone}</span>}
            {contact.workPhone && contact.mobile && <span className="mx-1">|</span>}
            {contact.mobile && <span>Mobile: {contact.mobile}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactPersonCard;
