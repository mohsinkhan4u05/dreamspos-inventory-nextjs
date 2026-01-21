"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CustomerForm, { CustomerFormValues } from "@/components/application/ecommerce/customers/CustomerForm";
import { customerService } from "@/services/api";

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const customerId = (params?.id as string) || "";

  const [initialValues, setInitialValues] = useState<CustomerFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        if (!customerId) {
          setError("Invalid customer ID");
          return;
        }
        setLoading(true);
        setError(null);
        const res: any = await customerService.getCustomer(customerId);

        const addresses = Array.isArray(res.addresses) ? res.addresses : [];
        const billing = addresses.find((a: any) => a.type === "BILLING");
        const shipping = addresses.find((a: any) => a.type === "SHIPPING");

        const mapAddress = (addr: any | undefined): CustomerFormValues["billingAddress"] => ({
          attention: addr?.attention ?? "",
          address1: addr?.address1 ?? "",
          address2: addr?.address2 ?? "",
          city: addr?.city ?? "",
          state: addr?.state ?? "",
          zipcode: addr?.zipcode ?? "",
          country: addr?.country ?? "",
          phone: addr?.phone ?? "",
        });

        const formValues: CustomerFormValues = {
          type: res.type || "BUSINESS",
          salutation: res.salutation ?? "",
          firstName: res.firstName ?? "",
          lastName: res.lastName ?? "",
          companyName: res.companyName ?? "",
          displayName: res.displayName || res.name || "",
          email: res.email ?? "",
          phone: res.phone ?? "",
          mobile: res.mobile ?? "",
          language: res.language ?? "",
          pan: res.pan ?? "",
          currency: res.currency ?? "INR",
          paymentTerms: res.paymentTerms ?? "Due on Receipt",
          allowPortal: res.allowPortal ?? false,
          remarks: res.remarks ?? "",
          billingAddress: mapAddress(billing),
          shippingAddress: mapAddress(shipping),
          contactPersons: (Array.isArray(res.contactPersons) ? res.contactPersons : []).map(
            (cp: any, index: number) => ({
              salutation: cp.salutation ?? "",
              firstName: cp.firstName ?? "",
              lastName: cp.lastName ?? "",
              email: cp.email ?? "",
              workPhone: cp.workPhone ?? "",
              mobile: cp.mobile ?? "",
              isPrimary: typeof cp.isPrimary === "boolean" ? cp.isPrimary : index === 0,
            }),
          ),
          customFields: [],
          reportingTags: [],
        };

        setInitialValues(formValues);
      } catch (e: any) {
        setError(e?.message || "Failed to load customer for editing");
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [customerId]);

  if (!customerId) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger" role="alert">
            Invalid customer.
          </div>
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

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!initialValues) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger" role="alert">
            Failed to prepare customer data for editing.
          </div>
        </div>
      </div>
    );
  }

  return <CustomerForm mode="edit" customerId={customerId} initialValues={initialValues} />;
}
