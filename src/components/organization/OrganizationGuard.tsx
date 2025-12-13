"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOrganization } from "@/context/OrganizationContext";
import { all_routes } from "@/data/all_routes";

interface OrganizationGuardProps {
  children: ReactNode;
}

const ORGANIZATION_SETTINGS_PATH = all_routes.companysettings;

export default function OrganizationGuard({ children }: OrganizationGuardProps) {
  const { organization, loading } = useOrganization();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const organizationPath = ORGANIZATION_SETTINGS_PATH;
    const isOnOrganizationSettings = pathname === organizationPath;

    // Allow auth and public routes to bypass the guard
    const isAuthRoute = pathname?.startsWith("/signin") || pathname?.startsWith("/auth");
    const isPublicRoute = pathname === "/";

    if (!organization && !isOnOrganizationSettings && !isAuthRoute && !isPublicRoute) {
      router.replace(organizationPath);
    }
  }, [organization, loading, pathname, router]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center py-5">Loading organization...</div>
        </div>
      </div>
    );
  }

  if (!organization && pathname !== ORGANIZATION_SETTINGS_PATH) {
    // While redirecting, avoid flashing protected content
    return null;
  }

  return <>{children}</>;
}
