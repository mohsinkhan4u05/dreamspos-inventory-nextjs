"use client";

import { useEffect, useState } from "react";
import { Toast } from "react-bootstrap";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { all_routes } from "@/data/all_routes";
import { customerService } from "@/services/api";

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

const customFieldSchema = z.object({
  label: z.string().min(1),
  value: z.string().optional(),
});

const customerFormSchema = z.object({
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
  currency: z.string().optional(),
  paymentTerms: z.string().optional(),
  allowPortal: z.boolean().default(false),
  remarks: z.string().optional(),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  contactPersons: z.array(contactPersonSchema).default([]),
  customFields: z.array(customFieldSchema).default([]),
  reportingTags: z.array(z.string()).default([]),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

type AddressValue = z.infer<typeof addressSchema>;
type ContactPersonValue = z.infer<typeof contactPersonSchema>;

type CustomerFormMode = "create" | "edit";

interface CustomerFormProps {
  mode?: CustomerFormMode;
  customerId?: string;
  initialValues?: Partial<CustomerFormValues>;
}

export default function CustomerForm({ mode = "create", customerId, initialValues }: CustomerFormProps) {
  const router = useRouter();
  const route = all_routes;

  const methods = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      type: initialValues?.type ?? "BUSINESS",
      salutation: initialValues?.salutation ?? "",
      firstName: initialValues?.firstName ?? "",
      lastName: initialValues?.lastName ?? "",
      companyName: initialValues?.companyName ?? "",
      displayName: initialValues?.displayName ?? "",
      email: initialValues?.email ?? "",
      phone: initialValues?.phone ?? "",
      mobile: initialValues?.mobile ?? "",
      language: initialValues?.language ?? "",
      pan: initialValues?.pan ?? "",
      currency: initialValues?.currency ?? "INR",
      paymentTerms: initialValues?.paymentTerms ?? "Due on Receipt",
      allowPortal: initialValues?.allowPortal ?? false,
      remarks: initialValues?.remarks ?? "",
      billingAddress: (initialValues?.billingAddress as AddressValue) ?? ({} as AddressValue),
      shippingAddress: (initialValues?.shippingAddress as AddressValue) ?? ({} as AddressValue),
      contactPersons: initialValues?.contactPersons ?? [],
      customFields: initialValues?.customFields ?? [],
      reportingTags: initialValues?.reportingTags ?? [],
    },
    mode: "onBlur",
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = methods;

  const {
    fields: contactPersonFields,
    append: appendContactPerson,
    remove: removeContactPerson,
  } = useFieldArray({ name: "contactPersons", control });

  const {
    fields: customFieldFields,
    append: appendCustomField,
    remove: removeCustomField,
  } = useFieldArray({ name: "customFields", control });

  const [activeTab, setActiveTab] = useState<string>("otherDetails");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastState, setToastState] = useState<{
    show: boolean;
    variant: "success" | "danger";
    message: string;
  }>({ show: false, variant: "success", message: "" });

  const primaryFirstName = watch("firstName");
  const primaryLastName = watch("lastName");
  const companyName = watch("companyName");
  const customerType = watch("type");
  const displayNameValue = watch("displayName");

  useEffect(() => {
    const contactName = `${primaryFirstName || ""} ${primaryLastName || ""}`.trim();
    const autoName =
      customerType === "BUSINESS"
        ? (companyName || contactName)
        : contactName;

    if (!autoName) return;

    if (!displayNameValue) {
      setValue("displayName", autoName, { shouldDirty: true });
    }
  }, [primaryFirstName, primaryLastName, companyName, customerType, displayNameValue, setValue]);

  const onSubmit = async (values: CustomerFormValues) => {
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
        currency: values.currency || null,
        paymentTerms: values.paymentTerms || null,
        allowPortal: values.allowPortal,
        remarks: values.remarks || null,
        name: displayName,
        addresses: addresses.length ? addresses : undefined,
        contactPersons: contactPersons.length ? contactPersons : undefined,
      };
      if (mode === "edit" && customerId) {
        await customerService.updateCustomer(customerId, payload as unknown as Record<string, unknown>);

        setToastState({
          show: true,
          variant: "success",
          message: "Customer updated successfully",
        });

        setTimeout(() => {
          router.push(`${route.customer}/${customerId}`);
        }, 1000);
      } else {
        await customerService.createCustomer(payload as unknown as Record<string, unknown>);

        setToastState({
          show: true,
          variant: "success",
          message: "Customer created successfully",
        });

        setTimeout(() => {
          router.push(route.customer);
        }, 1000);
      }
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Failed to create customer";
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
              <h4>{mode === "edit" ? "Edit Customer" : "New Customer"}</h4>
              <h6>{mode === "edit" ? "Update customer information" : "Create a new customer"}</h6>
            </div>
          </div>
          <div className="page-btn">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={() => router.push(route.customer)}
            >
              Back to Customers
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              form="add-customer-form"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? mode === "edit"
                  ? "Updating..."
                  : "Saving..."
                : mode === "edit"
                  ? "Update"
                  : "Save"}
            </button>
          </div>
        </div>

        <FormProvider {...methods}>
          <form id="add-customer-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="card mb-3">
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-lg-6">
                    <label className="form-label">Customer Type</label>
                    <div className="d-flex align-items-center">
                      <div className="form-check me-3">
                        <input
                          className="form-check-input"
                          type="radio"
                          id="customer-type-business"
                          value="BUSINESS"
                          checked={watch("type") === "BUSINESS"}
                          onChange={() => setValue("type", "BUSINESS")}
                        />
                        <label className="form-check-label" htmlFor="customer-type-business">
                          Business
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          id="customer-type-individual"
                          value="INDIVIDUAL"
                          checked={watch("type") === "INDIVIDUAL"}
                          onChange={() => setValue("type", "INDIVIDUAL")}
                        />
                        <label className="form-check-label" htmlFor="customer-type-individual">
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
                  <div className="col-lg-3 mb-3">
                    <select
                      className="form-select"
                      {...methods.register("salutation")}
                    >
                      <option value="">Salutation</option>
                      <option value="Mr">Mr.</option>
                      <option value="Ms">Ms.</option>
                      <option value="Mrs">Mrs.</option>
                      <option value="Dr">Dr.</option>
                    </select>
                  </div>
                  <div className="col-lg-4 mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="First Name"
                      {...methods.register("firstName")}
                    />
                  </div>
                  <div className="col-lg-4 mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Last Name"
                      {...methods.register("lastName")}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-lg-6 mb-3">
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      className="form-control"
                      {...methods.register("companyName")}
                    />
                  </div>
                  <div className="col-lg-6 mb-3">
                    <label className="form-label">
                      Display Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      autoComplete="off"
                      {...methods.register("displayName")}
                    />
                    {errors.displayName && (
                      <div className="text-danger small mt-1">
                        {errors.displayName.message as string}
                      </div>
                    )}
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-lg-6 mb-3">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      {...methods.register("email")}
                    />
                    {errors.email && (
                      <div className="text-danger small mt-1">
                        {errors.email.message as string}
                      </div>
                    )}
                  </div>
                  <div className="col-lg-3 mb-3">
                    <label className="form-label">Work Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      {...methods.register("phone")}
                    />
                  </div>
                  <div className="col-lg-3 mb-3">
                    <label className="form-label">Mobile</label>
                    <input
                      type="text"
                      className="form-control"
                      {...methods.register("mobile")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <ul className="nav nav-tabs nav-tabs-bottom mb-3">
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
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === "customFields" ? "active" : ""}`}
                  onClick={() => setActiveTab("customFields")}
                >
                  Custom Fields
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === "reportingTags" ? "active" : ""}`}
                  onClick={() => setActiveTab("reportingTags")}
                >
                  Reporting Tags
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === "remarks" ? "active" : ""}`}
                  onClick={() => setActiveTab("remarks")}
                >
                  Remarks
                </button>
              </li>
            </ul>

            <div className="card">
              <div className="card-body">
                {activeTab === "otherDetails" && (
                  <div className="row">
                    <div className="col-lg-4 mb-3">
                      <label className="form-label">PAN</label>
                      <input
                        type="text"
                        className="form-control"
                        {...methods.register("pan")}
                      />
                    </div>
                    <div className="col-lg-4 mb-3">
                      <label className="form-label">Currency</label>
                      <select
                        className="form-select"
                        {...methods.register("currency")}
                      >
                        {currencyOptions.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-lg-4 mb-3">
                      <label className="form-label">Payment Terms</label>
                      <select
                        className="form-select"
                        {...methods.register("paymentTerms")}
                      >
                        {paymentTermOptions.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-lg-6 mb-3">
                      <div className="form-check mt-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="allow-portal"
                          checked={watch("allowPortal")}
                          onChange={(e) => setValue("allowPortal", e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="allow-portal">
                          Allow portal access for this customer
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "address" && (
                  <div className="row">
                    <div className="col-lg-6 border-end">
                      <h6 className="mb-3">Billing Address</h6>
                      <div className="mb-3">
                        <label className="form-label">Attention</label>
                        <input
                          type="text"
                          className="form-control"
                          {...methods.register("billingAddress.attention")}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Address</label>
                        <input
                          type="text"
                          className="form-control mb-2"
                          {...methods.register("billingAddress.address1")}
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Address line 2"
                          {...methods.register("billingAddress.address2")}
                        />
                      </div>
                      <div className="row">
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">City</label>
                          <input
                            type="text"
                            className="form-control"
                            {...methods.register("billingAddress.city")}
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">State</label>
                          <input
                            type="text"
                            className="form-control"
                            {...methods.register("billingAddress.state")}
                          />
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">Zip Code</label>
                          <input
                            type="text"
                            className="form-control"
                            {...methods.register("billingAddress.zipcode")}
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">Country</label>
                          <input
                            type="text"
                            className="form-control"
                            {...methods.register("billingAddress.country")}
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Phone</label>
                        <input
                          type="text"
                          className="form-control"
                          {...methods.register("billingAddress.phone")}
                        />
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <h6 className="mb-3">Shipping Address</h6>
                      <div className="mb-3">
                        <label className="form-label">Attention</label>
                        <input
                          type="text"
                          className="form-control"
                          {...methods.register("shippingAddress.attention")}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Address</label>
                        <input
                          type="text"
                          className="form-control mb-2"
                          {...methods.register("shippingAddress.address1")}
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Address line 2"
                          {...methods.register("shippingAddress.address2")}
                        />
                      </div>
                      <div className="row">
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">City</label>
                          <input
                            type="text"
                            className="form-control"
                            {...methods.register("shippingAddress.city")}
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">State</label>
                          <input
                            type="text"
                            className="form-control"
                            {...methods.register("shippingAddress.state")}
                          />
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">Zip Code</label>
                          <input
                            type="text"
                            className="form-control"
                            {...methods.register("shippingAddress.zipcode")}
                          />
                        </div>
                        <div className="col-lg-6 mb-3">
                          <label className="form-label">Country</label>
                          <input
                            type="text"
                            className="form-control"
                            {...methods.register("shippingAddress.country")}
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Phone</label>
                        <input
                          type="text"
                          className="form-control"
                          {...methods.register("shippingAddress.phone")}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "contacts" && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Contact Persons</h6>
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
                          })
                        }
                      >
                        Add Contact
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-bordered align-middle">
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
                          {contactPersonFields.length === 0 && (
                            <tr>
                              <td colSpan={8} className="text-center text-muted">
                                No contact persons added.
                              </td>
                            </tr>
                          )}
                          {contactPersonFields.map((field, index) => (
                            <tr key={field.id}>
                              <td>
                                <select
                                  className="form-select form-select-sm"
                                  {...methods.register(`contactPersons.${index}.salutation` as const)}
                                >
                                  <option value="">-</option>
                                  <option value="Mr">Mr.</option>
                                  <option value="Ms">Ms.</option>
                                  <option value="Mrs">Mrs.</option>
                                  <option value="Dr">Dr.</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  {...methods.register(`contactPersons.${index}.firstName` as const)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  {...methods.register(`contactPersons.${index}.lastName` as const)}
                                />
                              </td>
                              <td>
                                <input
                                  type="email"
                                  className="form-control form-control-sm"
                                  {...methods.register(`contactPersons.${index}.email` as const)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  {...methods.register(`contactPersons.${index}.workPhone` as const)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  {...methods.register(`contactPersons.${index}.mobile` as const)}
                                />
                              </td>
                              <td className="text-center">
                                <input
                                  className="form-check-input"
                                  type="radio"
                                  name="primary-contact"
                                  checked={watch("contactPersons")[index]?.isPrimary ?? false}
                                  onChange={() => {
                                    const current = watch("contactPersons") || [];
                                    current.forEach((cp, cpIndex) => {
                                      setValue(
                                        `contactPersons.${cpIndex}.isPrimary` as const,
                                        cpIndex === index,
                                      );
                                    });
                                  }}
                                />
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className="btn btn-link text-danger btn-sm"
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
                  </div>
                )}

                {activeTab === "customFields" && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Custom Fields</h6>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => appendCustomField({ label: "", value: "" })}
                      >
                        Add Field
                      </button>
                    </div>
                    {customFieldFields.length === 0 && (
                      <p className="text-muted mb-0">No custom fields added.</p>
                    )}
                    {customFieldFields.map((field, index) => (
                      <div className="row mb-3" key={field.id}>
                        <div className="col-lg-4 mb-2">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Field Label"
                            {...methods.register(`customFields.${index}.label` as const)}
                          />
                        </div>
                        <div className="col-lg-6 mb-2">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Value"
                            {...methods.register(`customFields.${index}.value` as const)}
                          />
                        </div>
                        <div className="col-lg-2 mb-2 d-flex align-items-center">
                          <button
                            type="button"
                            className="btn btn-link text-danger"
                            onClick={() => removeCustomField(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "reportingTags" && (
                  <div>
                    <p className="text-muted mb-2">
                      Use reporting tags to group and filter this customer in reports.
                    </p>
                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder="Comma separated tags (e.g. Retail, Priority)"
                      value={(watch("reportingTags") || []).join(", ")}
                      onChange={(e) => {
                        const value = e.target.value;
                        const tags = value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter((tag) => tag.length > 0);
                        setValue("reportingTags", tags, { shouldDirty: true });
                      }}
                    />
                  </div>
                )}

                {activeTab === "remarks" && (
                  <div className="mb-3">
                    <label className="form-label">Remarks</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      {...methods.register("remarks")}
                    />
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
