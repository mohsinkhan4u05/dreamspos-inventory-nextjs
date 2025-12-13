"use client";

import { useEffect, useState } from "react";
import { Toast } from "react-bootstrap";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { all_routes } from "@/data/all_routes";
import { supplierService } from "@/services/api";

const addressSchema = z.object({
  attention: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipcode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
});

const contactPersonSchema = z.object({
  salutation: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z
    .string()
    .email("Invalid email address")
    .or(z.literal(""))
    .optional(),
  workPhone: z.string().optional(),
  mobile: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const supplierFormSchema = z.object({
  type: z.enum(["BUSINESS", "INDIVIDUAL"]).default("BUSINESS"),
  salutation: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  displayName: z.string().min(1, "Display name is required"),
  email: z
    .string()
    .email("Invalid email address")
    .or(z.literal(""))
    .optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  language: z.string().optional(),
  pan: z.string().optional(),
  gstNumber: z.string().optional(),
  currency: z.string().optional(),
  paymentTerms: z.string().optional(),
  remarks: z.string().optional(),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  contactPersons: z.array(contactPersonSchema).default([]),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

type AddressValue = z.infer<typeof addressSchema>;
type ContactPersonValue = z.infer<typeof contactPersonSchema>;

export default function SupplierForm() {
  const router = useRouter();
  const route = all_routes;

  const methods = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      type: "BUSINESS",
      salutation: "",
      firstName: "",
      lastName: "",
      companyName: "",
      displayName: "",
      email: "",
      phone: "",
      mobile: "",
      language: "",
      pan: "",
      gstNumber: "",
      currency: "INR",
      paymentTerms: "Due on Receipt",
      remarks: "",
      billingAddress: {},
      shippingAddress: {},
      contactPersons: [],
    },
    mode: "onBlur",
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = methods;

  const {
    fields: contactPersonFields,
    append: appendContactPerson,
    remove: removeContactPerson,
  } = useFieldArray({ name: "contactPersons", control });

  const [activeTab, setActiveTab] = useState<string>("otherDetails");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastState, setToastState] = useState<{
    show: boolean;
    variant: "success" | "danger";
    message: string;
  }>({ show: false, variant: "success", message: "" });

  const watchedValues = watch();

  const primarySalutation = (watchedValues.salutation || "").trim();
  const primaryFirstName = (watchedValues.firstName || "").trim();
  const primaryLastName = (watchedValues.lastName || "").trim();

  const displayNameSuggestions = (() => {
    const suggestions: string[] = [];

    if (primaryFirstName || primaryLastName) {
      if (primarySalutation && primaryFirstName) {
        const salWithDot = primarySalutation.endsWith(".")
          ? primarySalutation
          : `${primarySalutation}.`;
        const full = primaryLastName
          ? `${salWithDot} ${primaryFirstName} ${primaryLastName}`
          : `${salWithDot} ${primaryFirstName}`;
        suggestions.push(full.trim());
      }

      if (primaryFirstName && primaryLastName) {
        suggestions.push(`${primaryFirstName} ${primaryLastName}`.trim());
        suggestions.push(`${primaryLastName}, ${primaryFirstName}`.trim());
      } else if (primaryFirstName) {
        suggestions.push(primaryFirstName);
      } else if (primaryLastName) {
        suggestions.push(primaryLastName);
      }
    }

    return Array.from(new Set(suggestions.filter((s) => s.length > 0)));
  })();

  const onSubmit = async (values: SupplierFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const displayName = values.displayName.trim();
      if (!displayName) {
        setSubmitError("Display name is required");
        return;
      }

      const addresses: {
        type: string;
        attention: string | null;
        address1: string | null;
        address2: string | null;
        city: string | null;
        state: string | null;
        zipcode: string | null;
        country: string | null;
        phone: string | null;
      }[] = [];

      const normalizeAddress = (addr: AddressValue, type: string) => {
        const hasValue = Object.values(addr || {}).some((v) => (v ?? "").toString().trim() !== "");
        if (!hasValue) return;
        addresses.push({
          type,
          attention: addr.attention || null,
          address1: addr.address1 || null,
          address2: addr.address2 || null,
          city: addr.city || null,
          state: addr.state || null,
          zipcode: addr.zipcode || null,
          country: addr.country || null,
          phone: addr.phone || null,
        });
      };

      normalizeAddress(values.billingAddress, "BILLING");
      normalizeAddress(values.shippingAddress, "SHIPPING");

      const contactPersons = (values.contactPersons || [])
        .filter((cp: ContactPersonValue) => {
          const hasAny =
            (cp.firstName || "").trim() !== "" ||
            (cp.lastName || "").trim() !== "" ||
            (cp.email || "").trim() !== "" ||
            (cp.workPhone || "").trim() !== "" ||
            (cp.mobile || "").trim() !== "";
          return hasAny;
        })
        .map((cp: ContactPersonValue, index: number) => ({
          salutation: cp.salutation || null,
          firstName: cp.firstName.trim(),
          lastName: cp.lastName || null,
          email: cp.email || null,
          workPhone: cp.workPhone || null,
          mobile: cp.mobile || null,
          isPrimary: cp.isPrimary ?? index === 0,
        }));

      const payload = {
        type: values.type,
        salutation: values.salutation || null,
        firstName: values.firstName || null,
        lastName: values.lastName || null,
        displayName,
        companyName: values.companyName || null,
        email: values.email || null,
        phone: values.phone || null,
        mobile: values.mobile || null,
        language: values.language || null,
        pan: values.pan || null,
        gstNumber: values.gstNumber || null,
        currency: values.currency || null,
        paymentTerms: values.paymentTerms || null,
        remarks: values.remarks || null,
        name: displayName,
        addresses: addresses.length ? addresses : undefined,
        contactPersons: contactPersons.length ? contactPersons : undefined,
      };

      await supplierService.createSupplier(payload as unknown as Record<string, unknown>);

      setToastState({
        show: true,
        variant: "success",
        message: "Supplier created successfully",
      });

      setTimeout(() => {
        router.push(route.suppliers);
      }, 1000);
    } catch (error: any) {
      const message = (error as any)?.response?.data?.error || (error as any)?.message || "Failed to create supplier";
      setSubmitError(message);
      setToastState({
        show: true,
        variant: "danger",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currencyOptions = [
    { value: "INR", label: "INR - Indian Rupee" },
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
  ];

  const paymentTermOptions = [
    "Due on Receipt",
    "Net 15",
    "Net 30",
    "Net 45",
    "Net 60",
  ];

  const languageOptions = [
    "English",
    "Hindi",
    "Spanish",
  ];

  return (
    <div className="page-wrapper">
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        <Toast
          show={toastState.show}
          onClose={() => setToastState((prev) => ({ ...prev, show: false }))}
          bg={toastState.variant === "success" ? "success" : "danger"}
          autohide
          delay={4000}
        >
          <Toast.Header closeButton className="text-default">
            <strong className="me-auto">
              {toastState.variant === "success" ? "Success" : "Error"}
            </strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastState.message}</Toast.Body>
        </Toast>
      </div>
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>New Supplier</h4>
              <h6>Create a new supplier</h6>
            </div>
          </div>
          <div className="page-btn">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={() => router.push(route.suppliers)}
            >
              Back to Suppliers
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              form="add-supplier-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <FormProvider {...methods}>
          <form id="add-supplier-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="card mb-3">
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-lg-6">
                    <label className="form-label">Supplier Type</label>
                    <div className="d-flex align-items-center">
                      <div className="form-check me-3">
                        <input
                          className="form-check-input"
                          type="radio"
                          id="supplier-type-business"
                          value="BUSINESS"
                          checked={watch("type") === "BUSINESS"}
                          onChange={() => setValue("type", "BUSINESS")}
                        />
                        <label className="form-check-label" htmlFor="supplier-type-business">
                          Business
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          id="supplier-type-individual"
                          value="INDIVIDUAL"
                          checked={watch("type") === "INDIVIDUAL"}
                          onChange={() => setValue("type", "INDIVIDUAL")}
                        />
                        <label className="form-check-label" htmlFor="supplier-type-individual">
                          Individual
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-lg-12 mb-2">
                    <label className="form-label">Primary Contact</label>
                  </div>
                  <div className="col-lg-2 mb-3">
                    <label className="form-label">Salutation</label>
                    <select
                      className="form-select"
                      value={watch("salutation") || ""}
                      onChange={(e) => setValue("salutation", e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="Mr">Mr</option>
                      <option value="Ms">Ms</option>
                      <option value="Mrs">Mrs</option>
                    </select>
                  </div>
                  <div className="col-lg-5 mb-3">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={watch("firstName") || ""}
                      onChange={(e) => setValue("firstName", e.target.value)}
                    />
                  </div>
                  <div className="col-lg-5 mb-3">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={watch("lastName") || ""}
                      onChange={(e) => setValue("lastName", e.target.value)}
                    />
                  </div>
                  <div className="col-lg-6 mb-3">
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={watch("companyName") || ""}
                      onChange={(e) => setValue("companyName", e.target.value)}
                    />
                  </div>
                  <div className="col-lg-6 mb-3">
                    <label className="form-label">
                      Display Name <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={watch("displayName") || ""}
                      onChange={(e) =>
                        setValue("displayName", e.target.value, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    >
                      <option value="">Select display name</option>
                      {displayNameSuggestions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {errors.displayName && (
                      <div className="text-danger small mt-1">{errors.displayName.message as string}</div>
                    )}
                  </div>
                  <div className="col-lg-6 mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={watch("email") || ""}
                      onChange={(e) => setValue("email", e.target.value)}
                    />
                  </div>
                  <div className="col-lg-3 mb-3">
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={watch("phone") || ""}
                      onChange={(e) => setValue("phone", e.target.value)}
                    />
                  </div>
                  <div className="col-lg-3 mb-3">
                    <label className="form-label">Mobile</label>
                    <input
                      type="text"
                      className="form-control"
                      value={watch("mobile") || ""}
                      onChange={(e) => setValue("mobile", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-3">
              <div className="card-header">
                <ul className="nav nav-tabs card-header-tabs">
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === "otherDetails" ? "active" : ""}`}
                      onClick={() => setActiveTab("otherDetails")}
                    >
                      Other Details
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === "address" ? "active" : ""}`}
                      onClick={() => setActiveTab("address")}
                    >
                      Address
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === "contacts" ? "active" : ""}`}
                      onClick={() => setActiveTab("contacts")}
                    >
                      Contact Persons
                    </button>
                  </li>
                </ul>
              </div>
              <div className="card-body">
                {activeTab === "otherDetails" && (
                  <div className="row">
                    <div className="col-lg-4 mb-3">
                      <label className="form-label">GST Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={watch("gstNumber") || ""}
                        onChange={(e) => setValue("gstNumber", e.target.value)}
                      />
                    </div>
                    <div className="col-lg-4 mb-3">
                      <label className="form-label">PAN</label>
                      <input
                        type="text"
                        className="form-control"
                        value={watch("pan") || ""}
                        onChange={(e) => setValue("pan", e.target.value)}
                      />
                    </div>
                    <div className="col-lg-4 mb-3">
                      <label className="form-label">Currency</label>
                      <select
                        className="form-select"
                        value={watch("currency") || ""}
                        onChange={(e) => setValue("currency", e.target.value)}
                      >
                        {currencyOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-lg-4 mb-3">
                      <label className="form-label">Payment Terms</label>
                      <select
                        className="form-select"
                        value={watch("paymentTerms") || ""}
                        onChange={(e) => setValue("paymentTerms", e.target.value)}
                      >
                        {paymentTermOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-lg-4 mb-3">
                      <label className="form-label">Language</label>
                      <select
                        className="form-select"
                        value={watch("language") || ""}
                        onChange={(e) => setValue("language", e.target.value)}
                      >
                        <option value="">Select</option>
                        {languageOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-lg-12 mb-3">
                      <label className="form-label">Remarks</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={watch("remarks") || ""}
                        onChange={(e) => setValue("remarks", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {activeTab === "address" && (
                  <div className="row">
                    <div className="col-lg-6 mb-3">
                      <h6 className="fw-semibold mb-2">Billing Address</h6>
                      <div className="mb-2">
                        <label className="form-label">Attention</label>
                        <input
                          type="text"
                          className="form-control"
                          value={watch("billingAddress.attention") || ""}
                          onChange={(e) => setValue("billingAddress.attention", e.target.value)}
                        />
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Address Line 1</label>
                        <input
                          type="text"
                          className="form-control"
                          value={watch("billingAddress.address1") || ""}
                          onChange={(e) => setValue("billingAddress.address1", e.target.value)}
                        />
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Address Line 2</label>
                        <input
                          type="text"
                          className="form-control"
                          value={watch("billingAddress.address2") || ""}
                          onChange={(e) => setValue("billingAddress.address2", e.target.value)}
                        />
                      </div>
                      <div className="row">
                        <div className="col-md-6 mb-2">
                          <label className="form-label">City</label>
                          <input
                            type="text"
                            className="form-control"
                            value={watch("billingAddress.city") || ""}
                            onChange={(e) => setValue("billingAddress.city", e.target.value)}
                          />
                        </div>
                        <div className="col-md-6 mb-2">
                          <label className="form-label">State</label>
                          <input
                            type="text"
                            className="form-control"
                            value={watch("billingAddress.state") || ""}
                            onChange={(e) => setValue("billingAddress.state", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6 mb-2">
                          <label className="form-label">Zip Code</label>
                          <input
                            type="text"
                            className="form-control"
                            value={watch("billingAddress.zipcode") || ""}
                            onChange={(e) => setValue("billingAddress.zipcode", e.target.value)}
                          />
                        </div>
                        <div className="col-md-6 mb-2">
                          <label className="form-label">Country</label>
                          <input
                            type="text"
                            className="form-control"
                            value={watch("billingAddress.country") || ""}
                            onChange={(e) => setValue("billingAddress.country", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Phone</label>
                        <input
                          type="text"
                          className="form-control"
                          value={watch("billingAddress.phone") || ""}
                          onChange={(e) => setValue("billingAddress.phone", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="col-lg-6 mb-3">
                      <h6 className="fw-semibold mb-2">Shipping Address</h6>
                      <div className="mb-2">
                        <label className="form-label">Attention</label>
                        <input
                          type="text"
                          className="form-control"
                          value={watch("shippingAddress.attention") || ""}
                          onChange={(e) => setValue("shippingAddress.attention", e.target.value)}
                        />
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Address Line 1</label>
                        <input
                          type="text"
                          className="form-control"
                          value={watch("shippingAddress.address1") || ""}
                          onChange={(e) => setValue("shippingAddress.address1", e.target.value)}
                        />
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Address Line 2</label>
                        <input
                          type="text"
                          className="form-control"
                          value={watch("shippingAddress.address2") || ""}
                          onChange={(e) => setValue("shippingAddress.address2", e.target.value)}
                        />
                      </div>
                      <div className="row">
                        <div className="col-md-6 mb-2">
                          <label className="form-label">City</label>
                          <input
                            type="text"
                            className="form-control"
                            value={watch("shippingAddress.city") || ""}
                            onChange={(e) => setValue("shippingAddress.city", e.target.value)}
                          />
                        </div>
                        <div className="col-md-6 mb-2">
                          <label className="form-label">State</label>
                          <input
                            type="text"
                            className="form-control"
                            value={watch("shippingAddress.state") || ""}
                            onChange={(e) => setValue("shippingAddress.state", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6 mb-2">
                          <label className="form-label">Zip Code</label>
                          <input
                            type="text"
                            className="form-control"
                            value={watch("shippingAddress.zipcode") || ""}
                            onChange={(e) => setValue("shippingAddress.zipcode", e.target.value)}
                          />
                        </div>
                        <div className="col-md-6 mb-2">
                          <label className="form-label">Country</label>
                          <input
                            type="text"
                            className="form-control"
                            value={watch("shippingAddress.country") || ""}
                            onChange={(e) => setValue("shippingAddress.country", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="form-label">Phone</label>
                        <input
                          type="text"
                          className="form-control"
                          value={watch("shippingAddress.phone") || ""}
                          onChange={(e) => setValue("shippingAddress.phone", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "contacts" && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-semibold mb-0">Contact Persons</h6>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() =>
                          appendContactPerson({
                            salutation: "",
                            firstName: "",
                            lastName: "",
                            email: "",
                            workPhone: "",
                            mobile: "",
                            isPrimary: false,
                          } as any)
                        }
                      >
                        Add Contact
                      </button>
                    </div>
                    {contactPersonFields.length === 0 && (
                      <p className="text-muted mb-0">No contact persons added.</p>
                    )}
                    {contactPersonFields.length > 0 && (
                      <div className="table-responsive">
                        <table className="table table-bordered">
                          <thead>
                            <tr>
                              <th>Salutation</th>
                              <th>First Name</th>
                              <th>Last Name</th>
                              <th>Email</th>
                              <th>Work Phone</th>
                              <th>Mobile</th>
                              <th>Primary</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {contactPersonFields.map((field, index) => (
                              <tr key={field.id}>
                                <td>
                                  <select
                                    className="form-select"
                                    value={watch(`contactPersons.${index}.salutation` as const) || ""}
                                    onChange={(e) =>
                                      setValue(`contactPersons.${index}.salutation` as const, e.target.value)
                                    }
                                  >
                                    <option value="">Select</option>
                                    <option value="Mr">Mr</option>
                                    <option value="Ms">Ms</option>
                                    <option value="Mrs">Mrs</option>
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={watch(`contactPersons.${index}.firstName` as const) || ""}
                                    onChange={(e) =>
                                      setValue(`contactPersons.${index}.firstName` as const, e.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={watch(`contactPersons.${index}.lastName` as const) || ""}
                                    onChange={(e) =>
                                      setValue(`contactPersons.${index}.lastName` as const, e.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="email"
                                    className="form-control"
                                    value={watch(`contactPersons.${index}.email` as const) || ""}
                                    onChange={(e) =>
                                      setValue(`contactPersons.${index}.email` as const, e.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={watch(`contactPersons.${index}.workPhone` as const) || ""}
                                    onChange={(e) =>
                                      setValue(`contactPersons.${index}.workPhone` as const, e.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={watch(`contactPersons.${index}.mobile` as const) || ""}
                                    onChange={(e) =>
                                      setValue(`contactPersons.${index}.mobile` as const, e.target.value)
                                    }
                                  />
                                </td>
                                <td className="text-center">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={!!watch(`contactPersons.${index}.isPrimary` as const)}
                                    onChange={(e) =>
                                      setValue(`contactPersons.${index}.isPrimary` as const, e.target.checked)
                                    }
                                  />
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeContactPerson(index)}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {submitError && (
                  <div className="mt-3 alert alert-danger" role="alert">
                    {submitError}
                  </div>
                )}
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
