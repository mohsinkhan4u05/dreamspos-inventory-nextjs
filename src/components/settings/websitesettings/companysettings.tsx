"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useState } from "react";
import Select from "react-select";
import RefreshIcon from "@/core/common/tooltip-content/refresh";
import CollapesIcon from "@/core/common/tooltip-content/collapes";
import CommonFooter from "@/core/common/footer/commonFooter";
import { useOrganization } from "@/context/OrganizationContext";
import { useSession } from "next-auth/react";

interface SelectOption {
  label: string;
  value: string;
}

const INDIA_COUNTRY_OPTION: SelectOption = { label: "India", value: "IN" };

const INDIA_STATES: SelectOption[] = [
  // States (28)
  { label: "Andhra Pradesh", value: "AP" },
  { label: "Arunachal Pradesh", value: "AR" },
  { label: "Assam", value: "AS" },
  { label: "Bihar", value: "BR" },
  { label: "Chhattisgarh", value: "CG" },
  { label: "Goa", value: "GA" },
  { label: "Gujarat", value: "GJ" },
  { label: "Haryana", value: "HR" },
  { label: "Himachal Pradesh", value: "HP" },
  { label: "Jharkhand", value: "JH" },
  { label: "Karnataka", value: "KA" },
  { label: "Kerala", value: "KL" },
  { label: "Madhya Pradesh", value: "MP" },
  { label: "Maharashtra", value: "MH" },
  { label: "Manipur", value: "MN" },
  { label: "Meghalaya", value: "ML" },
  { label: "Mizoram", value: "MZ" },
  { label: "Nagaland", value: "NL" },
  { label: "Odisha", value: "OD" },
  { label: "Punjab", value: "PB" },
  { label: "Rajasthan", value: "RJ" },
  { label: "Sikkim", value: "SK" },
  { label: "Tamil Nadu", value: "TN" },
  { label: "Telangana", value: "TG" },
  { label: "Tripura", value: "TR" },
  { label: "Uttar Pradesh", value: "UP" },
  { label: "Uttarakhand", value: "UK" },
  { label: "West Bengal", value: "WB" },

  // Union Territories (8)
  { label: "Andaman and Nicobar Islands", value: "AN" },
  { label: "Chandigarh", value: "CH" },
  { label: "Dadra and Nagar Haveli and Daman and Diu", value: "DN" },
  { label: "Delhi", value: "DL" }, // NCT of Delhi
  { label: "Jammu and Kashmir", value: "JK" },
  { label: "Ladakh", value: "LA" },
  { label: "Lakshadweep", value: "LD" },
  { label: "Puducherry", value: "PY" },
];


const CITY_OPTIONS_BY_STATE: Record<string, SelectOption[]> = {
  AP: [
    { label: "Visakhapatnam", value: "Visakhapatnam" },
    { label: "Vijayawada", value: "Vijayawada" },
    { label: "Guntur", value: "Guntur" },
    { label: "Tirupati", value: "Tirupati" },
  ],

  AR: [
    { label: "Itanagar", value: "Itanagar" },
    { label: "Naharlagun", value: "Naharlagun" },
  ],

  AS: [
    { label: "Guwahati", value: "Guwahati" },
    { label: "Dibrugarh", value: "Dibrugarh" },
    { label: "Silchar", value: "Silchar" },
  ],

  BR: [
    { label: "Patna", value: "Patna" },
    { label: "Gaya", value: "Gaya" },
    { label: "Bhagalpur", value: "Bhagalpur" },
  ],

  CG: [
    { label: "Raipur", value: "Raipur" },
    { label: "Bhilai", value: "Bhilai" },
    { label: "Bilaspur", value: "Bilaspur" },
  ],

  GA: [
    { label: "Panaji", value: "Panaji" },
    { label: "Margao", value: "Margao" },
    { label: "Vasco da Gama", value: "Vasco da Gama" },
  ],

  GJ: [
    { label: "Ahmedabad", value: "Ahmedabad" },
    { label: "Surat", value: "Surat" },
    { label: "Vadodara", value: "Vadodara" },
    { label: "Rajkot", value: "Rajkot" },
  ],

  HR: [
    { label: "Gurugram", value: "Gurugram" },
    { label: "Faridabad", value: "Faridabad" },
    { label: "Panipat", value: "Panipat" },
  ],

  HP: [
    { label: "Shimla", value: "Shimla" },
    { label: "Solan", value: "Solan" },
    { label: "Dharamshala", value: "Dharamshala" },
  ],

  JH: [
    { label: "Ranchi", value: "Ranchi" },
    { label: "Jamshedpur", value: "Jamshedpur" },
    { label: "Dhanbad", value: "Dhanbad" },
  ],

  KA: [
    { label: "Bengaluru", value: "Bengaluru" },
    { label: "Mysuru", value: "Mysuru" },
    { label: "Mangaluru", value: "Mangaluru" },
    { label: "Hubballi", value: "Hubballi" },
  ],

  KL: [
    { label: "Kochi", value: "Kochi" },
    { label: "Thiruvananthapuram", value: "Thiruvananthapuram" },
    { label: "Kozhikode", value: "Kozhikode" },
  ],

  MP: [
    { label: "Bhopal", value: "Bhopal" },
    { label: "Indore", value: "Indore" },
    { label: "Gwalior", value: "Gwalior" },
  ],

  MH: [
    { label: "Mumbai", value: "Mumbai" },
    { label: "Pune", value: "Pune" },
    { label: "Nagpur", value: "Nagpur" },
    { label: "Nashik", value: "Nashik" },
    { label: "Thane", value: "Thane" },
  ],

  MN: [
    { label: "Imphal", value: "Imphal" },
  ],

  ML: [
    { label: "Shillong", value: "Shillong" },
  ],

  MZ: [
    { label: "Aizawl", value: "Aizawl" },
  ],

  NL: [
    { label: "Kohima", value: "Kohima" },
    { label: "Dimapur", value: "Dimapur" },
  ],

  OD: [
    { label: "Bhubaneswar", value: "Bhubaneswar" },
    { label: "Cuttack", value: "Cuttack" },
    { label: "Rourkela", value: "Rourkela" },
  ],

  PB: [
    { label: "Ludhiana", value: "Ludhiana" },
    { label: "Amritsar", value: "Amritsar" },
    { label: "Jalandhar", value: "Jalandhar" },
  ],

  RJ: [
    { label: "Jaipur", value: "Jaipur" },
    { label: "Udaipur", value: "Udaipur" },
    { label: "Jodhpur", value: "Jodhpur" },
  ],

  SK: [
    { label: "Gangtok", value: "Gangtok" },
  ],

  TN: [
    { label: "Chennai", value: "Chennai" },
    { label: "Coimbatore", value: "Coimbatore" },
    { label: "Madurai", value: "Madurai" },
    { label: "Tiruchirappalli", value: "Tiruchirappalli" },
  ],

  TG: [
    { label: "Hyderabad", value: "Hyderabad" },
    { label: "Warangal", value: "Warangal" },
    { label: "Nizamabad", value: "Nizamabad" },
  ],

  TR: [
    { label: "Agartala", value: "Agartala" },
  ],

  UP: [
    { label: "Lucknow", value: "Lucknow" },
    { label: "Kanpur", value: "Kanpur" },
    { label: "Noida", value: "Noida" },
    { label: "Varanasi", value: "Varanasi" },
  ],

  UK: [
    { label: "Dehradun", value: "Dehradun" },
    { label: "Haridwar", value: "Haridwar" },
  ],

  WB: [
    { label: "Kolkata", value: "Kolkata" },
    { label: "Howrah", value: "Howrah" },
    { label: "Siliguri", value: "Siliguri" },
  ],

  // Union Territories
  DL: [{ label: "New Delhi", value: "New Delhi" }],

  CH: [{ label: "Chandigarh", value: "Chandigarh" }],

  AN: [{ label: "Port Blair", value: "Port Blair" }],

  DN: [{ label: "Daman", value: "Daman" }],

  JK: [
    { label: "Srinagar", value: "Srinagar" },
    { label: "Jammu", value: "Jammu" },
  ],

  LA: [{ label: "Leh", value: "Leh" }],

  LD: [{ label: "Kavaratti", value: "Kavaratti" }],

  PY: [
    { label: "Puducherry", value: "Puducherry" },
    { label: "Karaikal", value: "Karaikal" },
  ],
};


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

    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization, initialized]);

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
      organization,
      reload,
    ],
  );

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="page-title">
            <h4>Organization Profile</h4>
            <h6>Manage your company details</h6>
          </div>
          <ul className="table-top-head">
            <RefreshIcon />
            <CollapesIcon />
          </ul>
        </div>

        <div className="card">
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
                        <input
                          type="text"
                          className="form-control"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="col-xl-4 col-lg-6 col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Primary Email Address <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          value={primaryContactEmail}
                          onChange={(e) => setPrimaryContactEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Phone Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={primaryContactPhone}
                          onChange={(e) => setPrimaryContactPhone(e.target.value)}
                        />
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
                        <input
                          type="text"
                          className="form-control"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                        />
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
                        <input
                          type="text"
                          className="form-control"
                          value={addressLine1}
                          onChange={(e) => setAddressLine1(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Country <span className="text-danger">*</span>
                        </label>
                        <Select
                          classNamePrefix="react-select"
                          options={[INDIA_COUNTRY_OPTION]}
                          placeholder="India"
                          value={country || INDIA_COUNTRY_OPTION}
                          onChange={(option) => {
                            setCountryValue(option || INDIA_COUNTRY_OPTION);
                            setStateValue(null);
                            setCityValue(null);
                          }}
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          State <span className="text-danger">*</span>
                        </label>
                        <Select
                          classNamePrefix="react-select"
                          options={INDIA_STATES}
                          placeholder="Choose State"
                          value={stateValue}
                          onChange={(option) => {
                            setStateValue(option);
                            setCityValue(null);
                          }}
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          City <span className="text-danger">*</span>
                        </label>
                        <Select
                          classNamePrefix="react-select"
                          options={
                            stateValue
                              ? CITY_OPTIONS_BY_STATE[stateValue.value] || []
                              : []
                          }
                          placeholder={
                            stateValue ? "Choose City" : "Select state first"
                          }
                          value={cityValue}
                          onChange={(option) => setCityValue(option)}
                          isDisabled={!stateValue}
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Postal Code <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="text-end settings-bottom-btn mt-0">
                  <button type="button" className="btn btn-secondary me-2">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || !isAdmin}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </fieldset>

              {!isAdmin && (
                <p className="text-muted mt-2 small">
                  You do not have permission to edit the organization profile.
                  Please contact an administrator.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
      <CommonFooter />
    </div>
  );
}