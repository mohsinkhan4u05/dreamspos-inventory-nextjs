"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useState } from "react";
import SettingsSideBar from "../settingssidebar";
import Select from "react-select";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import Link from "next/link";
import { City, Country, State } from "@/core/common/selectOption/selectOption";
import CommonFooter from "@/core/common/footer/commonFooter";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { useOrganization } from "@/context/OrganizationContext";
import type { OrganizationCustomField } from "@/types/api";
import { useSession } from "next-auth/react";

interface SelectOption {
  label: string;
  value: string;
}

export default function CompanySettingsComponent() {
  const { organization, reload } = useOrganization();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [primaryContactEmail, setPrimaryContactEmail] = useState("");
  const [primaryContactPhone, setPrimaryContactPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [country, setCountryValue] = useState<SelectOption | null>(null);
  const [stateValue, setStateValue] = useState<SelectOption | null>(null);
  const [cityValue, setCityValue] = useState<SelectOption | null>(null);
  const [zipCode, setZipCode] = useState("");

  const [baseCurrency, setBaseCurrency] = useState("INR");
  const [fiscalYear, setFiscalYear] = useState("APR_MAR");
  const [language, setLanguage] = useState("en");
  const [communicationLang, setCommunicationLang] = useState("en");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [dateFormat, setDateFormat] = useState("DD-MMM-YYYY");
  const [companyId, setCompanyId] = useState("");

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const [customFields, setCustomFields] = useState<OrganizationCustomField[]>([]);

  useEffect(() => {
    if (initialized) return;
    if (!organization) return;

    setName(organization.name || "");
    setPrimaryContactEmail(organization.primaryContactEmail || "");
    setPrimaryContactPhone(organization.primaryContactPhone || "");
    setWebsiteUrl(organization.websiteUrl || "");
    setAddressLine1(organization.addressLine1 || "");
    setZipCode(organization.zipCode || "");

    setBaseCurrency(organization.baseCurrency || "INR");
    setFiscalYear(organization.fiscalYear || "APR_MAR");
    setLanguage(organization.language || "en");
    setCommunicationLang(organization.communicationLang || "en");
    setTimezone(organization.timezone || "Asia/Kolkata");
    setDateFormat(organization.dateFormat || "DD-MMM-YYYY");
    setCompanyId(organization.companyId || "");
    setLogoUrl(organization.logoUrl || null);
    setCustomFields(organization.customFields || []);

    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization, initialized]);

  const handleAddCustomField = () => {
    setCustomFields((prev) => [...prev, { label: "", value: "" }]);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCustomFieldChange = (
    index: number,
    key: keyof OrganizationCustomField,
    value: string,
  ) => {
    setCustomFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (!name.trim()) {
        setError("Organization name is required");
        setSaving(false);
        return;
      }
      if (!primaryContactEmail.trim()) {
        setError("Primary contact email is required");
        setSaving(false);
        return;
      }

      const payload: Record<string, unknown> = {
        name: name.trim(),
        location: country?.label || "",
        addressLine1: addressLine1.trim(),
        addressLine2: null,
        city: cityValue?.label || "",
        state: stateValue?.label || "",
        zipCode: zipCode.trim(),
        websiteUrl: websiteUrl.trim() || null,
        primaryContactName: name.trim(),
        primaryContactEmail: primaryContactEmail.trim(),
        primaryContactPhone: primaryContactPhone.trim() || null,
        baseCurrency,
        fiscalYear,
        language,
        communicationLang,
        timezone,
        dateFormat,
        companyId: companyId.trim() || null,
        logoUrl,
        customFields: customFields
          .filter((field) => field.label.trim() || field.value.trim())
          .map((field) => ({
            label: field.label.trim(),
            value: field.value.trim(),
          })),
      };

      const hasOrganization = !!organization;
      const url = hasOrganization ? "/api/organization/update" : "/api/organization/create";
      const method = hasOrganization ? "PUT" : "POST";

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          setError(json?.error || "Failed to save organization profile");
          setSaving(false);
          return;
        }

        setSuccess("Organization profile saved successfully");
        await reload();
      } catch (err) {
        console.error("Error saving organization profile", err);
        setError("Failed to save organization profile");
      } finally {
        setSaving(false);
      }
    },
    [
      name,
      primaryContactEmail,
      primaryContactPhone,
      country,
      addressLine1,
      cityValue,
      stateValue,
      zipCode,
      websiteUrl,
      baseCurrency,
      fiscalYear,
      language,
      communicationLang,
      timezone,
      dateFormat,
      companyId,
      logoUrl,
      customFields,
      organization,
      reload,
    ],
  );

  const handleLogoUploadComplete = async (res: Array<{ url: string }>) => {
    const file = res?.[0];
    if (!file?.url) {
      setLogoUploading(false);
      return;
    }
    const nextUrl = file.url;
    setLogoUrl(nextUrl);
    setLogoError(null);

    if (!organization) {
      setLogoUploading(false);
      return;
    }

    try {
      const response = await fetch("/api/organization/upload-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: nextUrl }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        setLogoError(json?.error || "Failed to update logo");
      } else {
        setSuccess("Organization logo updated successfully");
        await reload();
      }
    } catch (err) {
      console.error("Error updating organization logo", err);
      setLogoError("Failed to update logo");
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <div>
      <div className="page-wrapper">
        <div className="content settings-content">
          <div className="page-header settings-pg-header">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4>Settings</h4>
                <h6>Manage your settings on portal</h6>
              </div>
            </div>
            <ul className="table-top-head">
              <RefreshIcon />
              <CollapesIcon />
            </ul>
          </div>

          <div className="row">
            <div className="col-xl-12">
              <div className="settings-wrapper d-flex">
                <SettingsSideBar />
                <div className="card flex-fill mb-0">
                  <div className="card-header">
                    <h4 className="fs-18 fw-bold">Organization Profile</h4>
                  </div>

                  <div className="card-body">
                    {error && (
                      <div className="alert alert-danger" role="alert">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="alert alert-success" role="alert">
                        {success}
                      </div>
                    )}

                    <form onSubmit={handleSubmit}>
                      <fieldset disabled={!isAdmin}>
                        <div className="border-bottom mb-3">
                          <div className="card-title-head">
                            <h6 className="fs-16 fw-bold mb-2">
                              <span className="fs-16 me-2">
                                <i className="ti ti-building" />
                              </span>
                              Company Information
                            </h6>
                          </div>

                          <div className="row">
                            <div className="col-xl-4 col-lg-6 col-md-4">
                              <div className="mb-3">
                                <label className="form-label">
                                  Organization Name <span className="text-danger">*</span>
                                </label>
                                <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
                              </div>
                            </div>

                            <div className="col-xl-4 col-lg-6 col-md-4">
                              <div className="mb-3">
                                <label className="form-label">
                                  Primary Email Address <span className="text-danger">*</span>
                                </label>
                                <input type="email" className="form-control" value={primaryContactEmail} onChange={(e) => setPrimaryContactEmail(e.target.value)} />
                              </div>
                            </div>

                            <div className="col-md-4">
                              <div className="mb-3">
                                <label className="form-label">
                                  Phone Number <span className="text-danger">*</span>
                                </label>
                                <input type="text" className="form-control" value={primaryContactPhone} onChange={(e) => setPrimaryContactPhone(e.target.value)} />
                              </div>
                            </div>

                            <div className="col-md-4">
                              <div className="mb-3">
                                <label className="form-label">Fax</label>
                                <input type="text" className="form-control" />
                              </div>
                            </div>

                            <div className="col-md-4">
                              <div className="mb-3">
                                <label className="form-label">Website</label>
                                <input type="text" className="form-control" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border-bottom mb-3 pb-3">
                          <div className="card-title-head">
                            <h6 className="fs-16 fw-bold mb-2">
                              <span className="fs-16 me-2">
                                <i className="ti ti-photo" />
                              </span>
                              Company Images
                            </h6>
                          </div>

                          <div className="row align-items-center gy-3">
                            <div className="col-xl-9">
                              <div className="row gy-3 align-items-center">
                                <div className="col-lg-4">
                                  <div className="logo-info">
                                    <h6 className="fw-medium">Company Icon</h6>
                                    <p>Upload Icon of your Company</p>
                                  </div>
                                </div>

                                <div className="col-lg-8">
                                  <div className="profile-pic-upload mb-0 justify-content-lg-end">
                                    <div className="new-employee-field">
                                      <div className="mb-0">
                                        <div className="image-upload mb-0">
                                          {/* UploadButton generic usage kept as-is */}
                                          <UploadButton<OurFileRouter, "organizationLogo">
                                            endpoint="organizationLogo"
                                            onUploadBegin={() => {
                                              setLogoUploading(true);
                                              setLogoError(null);
                                            }}
                                            onClientUploadComplete={handleLogoUploadComplete}
                                            onUploadError={(error) => {
                                              setLogoUploading(false);
                                              setLogoError(error.message);
                                            }}
                                          />
                                        </div>

                                        {logoError && (
                                          <span className="mt-1 text-danger d-block">{logoError}</span>
                                        )}

                                        <span className="mt-1 d-block">Recommended size is 450px x 450px. Max size 5mb.</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="col-xl-3">
                              <div className="new-logo ms-xl-auto">
                                <Link href="#">
                                  <img src="assets/img/logo-small.png" alt="Logo" />
                                  <span>
                                    <i className="ti ti-x" />
                                  </span>
                                </Link>
                              </div>
                            </div>

                            {/* Favicon */}
                            <div className="col-xl-9">
                              <div className="row gy-3 align-items-center">
                                <div className="col-lg-4">
                                  <div className="logo-info">
                                    <h6 className="fw-medium">Favicon</h6>
                                    <p>Upload Favicon of your Company</p>
                                  </div>
                                </div>
                                <div className="col-lg-8">
                                  <div className="profile-pic-upload mb-0 justify-content-lg-end">
                                    <div className="new-employee-field">
                                      <div className="mb-0">
                                        <div className="image-upload mb-0">
                                          <input type="file" />
                                          <div className="image-uploads">
                                            <h4>
                                              <i className="ti ti-upload me-1" />
                                              Upload Image
                                            </h4>
                                          </div>
                                        </div>
                                        <span className="mt-1">Recommended size is 450px x 450px. Max size 5mb.</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="col-xl-3">
                              <div className="new-logo ms-xl-auto">
                                <Link href="#">
                                  <img src="assets/img/logo-small.png" alt="Logo" />
                                  <span>
                                    <i className="ti ti-x" />
                                  </span>
                                </Link>
                              </div>
                            </div>

                            {/* Company Logo */}
                            <div className="col-xl-9">
                              <div className="row gy-3 align-items-center">
                                <div className="col-lg-4">
                                  <div className="logo-info">
                                    <h6 className="fw-medium">Company Logo</h6>
                                    <p>Upload Logo of your Company</p>
                                  </div>
                                </div>
                                <div className="col-lg-8">
                                  <div className="profile-pic-upload mb-0 justify-content-lg-end">
                                    <div className="new-employee-field">
                                      <div className="mb-0">
                                        <div className="image-upload mb-0">
                                          <input type="file" />
                                          <div className="image-uploads">
                                            <h4>
                                              <i className="ti ti-upload me-1" />
                                              Upload Image
                                            </h4>
                                          </div>
                                        </div>
                                        <span className="mt-1">Recommended size is 450px x 450px. Max size 5mb.</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="col-xl-3">
                              <div className="new-logo ms-xl-auto">
                                <Link href="#">
                                  <img src={logoUrl || "assets/img/products/company-logo.svg"} alt="Logo" />
                                  <span>
                                    <i className="ti ti-x" />
                                  </span>
                                </Link>
                              </div>
                            </div>

                            {/* Company Dark Logo */}
                            <div className="col-xl-9">
                              <div className="row gy-3 align-items-center">
                                <div className="col-lg-4">
                                  <div className="logo-info">
                                    <h6 className="fw-medium">Company Dark Logo</h6>
                                    <p>Upload Logo of your Company</p>
                                  </div>
                                </div>
                                <div className="col-lg-8">
                                  <div className="profile-pic-upload mb-0 justify-content-lg-end">
                                    <div className="new-employee-field">
                                      <div className="mb-0">
                                        <div className="image-upload mb-0">
                                          <input type="file" />
                                          <div className="image-uploads">
                                            <h4>
                                              <i className="ti ti-upload me-1" />
                                              Upload Image
                                            </h4>
                                          </div>
                                        </div>
                                        <span className="mt-1">Recommended size is 450px x 450px. Max size 5mb.</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="col-xl-3">
                              <div className="new-logo ms-xl-auto">
                                <Link href="#" className="bg-secondary">
                                  <img src="assets/img/products/white-logo.svg" alt="Logo" />
                                  <span>
                                    <i className="ti ti-x" />
                                  </span>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Address */}
                        <div className="company-address">
                          <div className="card-title-head">
                            <h6 className="fs-16 fw-bold mb-2">
                              <span className="fs-16 me-2">
                                <i className="ti ti-map-pin" />
                              </span>
                              Address Information
                            </h6>
                          </div>

                          <div className="row">
                            <div className="col-md-12">
                              <div className="mb-3">
                                <label className="form-label">
                                  Address Line 1 <span className="text-danger">*</span>
                                </label>
                                <input type="text" className="form-control" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
                              </div>
                            </div>

                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Country <span className="text-danger">*</span>
                                </label>
                                <Select classNamePrefix="react-select" options={Country} placeholder="Choose" value={country} onChange={(option) => setCountryValue(option)} />
                              </div>
                            </div>

                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  State <span className="text-danger">*</span>
                                </label>
                                <Select classNamePrefix="react-select" options={State} placeholder="Choose" value={stateValue} onChange={(option) => setStateValue(option)} />
                              </div>
                            </div>

                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  City <span className="text-danger">*</span>
                                </label>
                                <Select classNamePrefix="react-select" options={City} placeholder="Choose" value={cityValue} onChange={(option) => setCityValue(option)} />
                              </div>
                            </div>

                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Postal Code <span className="text-danger">*</span>
                                </label>
                                <input type="text" className="form-control" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Regional & Financial */}
                        <div className="company-address mt-4">
                          <div className="card-title-head">
                            <h6 className="fs-16 fw-bold mb-2">
                              <span className="fs-16 me-2">
                                <i className="ti ti-world" />
                              </span>
                              Regional &amp; Financial Settings
                            </h6>
                          </div>

                          <div className="row">
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Base Currency <span className="text-danger">*</span>
                                </label>
                                <select className="form-control form-select" value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)}>
                                  <option value="INR">INR - Indian Rupee</option>
                                  <option value="USD">USD - US Dollar</option>
                                  <option value="EUR">EUR - Euro</option>
                                  <option value="GBP">GBP - British Pound</option>
                                </select>
                              </div>
                            </div>

                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Fiscal Year</label>
                                <select className="form-control form-select" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}>
                                  <option value="APR_MAR">April - March</option>
                                  <option value="JAN_DEC">January - December</option>
                                </select>
                              </div>
                            </div>

                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Organization Language</label>
                                <select className="form-control form-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                                  <option value="en">English</option>
                                </select>
                              </div>
                            </div>

                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Communication Language</label>
                                <select className="form-control form-select" value={communicationLang} onChange={(e) => setCommunicationLang(e.target.value)}>
                                  <option value="en">English</option>
                                </select>
                              </div>
                            </div>

                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Timezone</label>
                                <select className="form-control form-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                  <option value="UTC">UTC</option>
                                </select>
                              </div>
                            </div>

                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Date Format</label>
                                <select className="form-control form-select" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                                  <option value="DD-MMM-YYYY">DD-MMM-YYYY</option>
                                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                </select>
                              </div>
                            </div>

                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Company ID / GST / PAN</label>
                                <input type="text" className="form-control" value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Custom Fields */}
                        <div className="company-address mt-4">
                          <div className="card-title-head">
                            <h6 className="fs-16 fw-bold mb-2">
                              <span className="fs-16 me-2">
                                <i className="ti ti-list" />
                              </span>
                              Custom Fields
                            </h6>
                          </div>

                          <div className="row">
                            {customFields.map((field, index) => (
                              <div className="col-md-12" key={index}>
                                <div className="row align-items-center mb-2">
                                  <div className="col-md-4">
                                    <input type="text" className="form-control mb-2 mb-md-0" placeholder="Label" value={field.label} onChange={(e) => handleCustomFieldChange(index, "label", e.target.value)} />
                                  </div>
                                  <div className="col-md-6">
                                    <input type="text" className="form-control mb-2 mb-md-0" placeholder="Value" value={field.value} onChange={(e) => handleCustomFieldChange(index, "value", e.target.value)} />
                                  </div>
                                  <div className="col-md-2 text-md-end">
                                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleRemoveCustomField(index)}>
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}

                            <div className="col-md-12">
                              <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleAddCustomField}>
                                Add Custom Field
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Buttons */}
                        <div className="text-end settings-bottom-btn mt-0">
                          <button type="button" className="btn btn-secondary me-2">
                            Cancel
                          </button>
                          <button type="submit" className="btn btn-primary" disabled={saving || !isAdmin}>
                            {saving ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </fieldset>

                      {!isAdmin && (
                        <p className="text-muted mt-2 small">
                          You do not have permission to edit the organization profile. Please contact an administrator.
                        </p>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CommonFooter />
      </div>
    </div>
  );
}
