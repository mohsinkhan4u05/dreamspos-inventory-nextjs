"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"
import { App as AntApp, ConfigProvider } from "antd"
import { OrganizationProvider } from "@/context/OrganizationContext"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ConfigProvider>
        <AntApp>
          <OrganizationProvider>{children}</OrganizationProvider>
        </AntApp>
      </ConfigProvider>
    </SessionProvider>
  )
}
