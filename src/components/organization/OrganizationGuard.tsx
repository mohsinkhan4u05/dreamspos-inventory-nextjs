"use client";

import { ReactNode } from "react";
import { useOrganization } from "@/context/OrganizationContext";

interface OrganizationGuardProps {
  children: ReactNode;
}

export default function OrganizationGuard({ children }: OrganizationGuardProps) {
  const { loading } = useOrganization();

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center py-5">Loading organization...</div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
