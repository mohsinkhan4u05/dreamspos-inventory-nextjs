"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { OrganizationProfile } from "@/types/api";

interface OrganizationContextValue {
  organization: OrganizationProfile | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

async function fetchOrganizationProfile(): Promise<OrganizationProfile | null> {
  const res = await fetch("/api/organization/get", {
    method: "GET",
    credentials: "include",
  });

  if (res.status === 401) {
    // Not authenticated yet (e.g. on signin pages)
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to load organization profile (${res.status})`);
  }

  const json = await res.json();
  return (json?.data as OrganizationProfile | null) ?? null;
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { status } = useSession();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const org = await fetchOrganizationProfile();
      setOrganization(org);
    } catch (err) {
      console.error("OrganizationProvider: failed to load organization", err);
      setError("Failed to load organization profile");
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wait for auth status before deciding what to do
    if (status === "loading") {
      setLoading(true);
      return;
    }

    if (status === "unauthenticated") {
      // No session: no organization, and not loading
      setOrganization(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Authenticated: load organization profile
    void load();
  }, [status, load]);

  const value: OrganizationContextValue = {
    organization,
    loading,
    error,
    reload: load,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return ctx;
}
