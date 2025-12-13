"use client";

import { useOrganization } from "@/context/OrganizationContext";

export type DateInput = string | number | Date | null | undefined;

function toDate(input: DateInput): Date | null {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function useOrgFormatting() {
  const { organization } = useOrganization();

  const baseCurrency = organization?.baseCurrency || "INR";
  const timezone = organization?.timezone || "Asia/Kolkata";
  const dateFormat = organization?.dateFormat || "DD-MMM-YYYY";

  const formatCurrency = (value: number | null | undefined): string => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "0.00";
    }

    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: baseCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      // Fallback to INR-style formatting if currency code is invalid
      const formatted = new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
      return formatted;
    }
  };

  const formatDate = (input: DateInput): string => {
    const date = toDate(input);
    if (!date) return "-";

    // Map a few common patterns to Intl options
    if (dateFormat === "DD/MM/YYYY") {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: timezone,
      }).format(date);
    }

    if (dateFormat === "MM/DD/YYYY") {
      return new Intl.DateTimeFormat("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        timeZone: timezone,
      }).format(date);
    }

    // Default: DD-MMM-YYYY (e.g. 01-Jan-2025)
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: timezone,
    }).format(date);
  };

  const formatDateTime = (input: DateInput): string => {
    const date = toDate(input);
    if (!date) return "-";

    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: undefined,
      hour12: true,
      timeZone: timezone,
    }).format(date);
  };

  return {
    baseCurrency,
    timezone,
    dateFormat,
    formatCurrency,
    formatDate,
    formatDateTime,
  };
}
