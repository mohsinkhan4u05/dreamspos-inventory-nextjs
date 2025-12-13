"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Header from "@/core/common/header/header";
import Sidebar from "@/core/common/sidebar/sidebar";
import HorizontalSidebar from "@/core/common/sidebar/horizontalSidebar";
import TwoColumnSidebar from "@/core/common/sidebar/two-column";

export default function LayoutClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const htmlElement = document.documentElement;

    document.body.classList.remove(
      "menu-horizontal",
      "layout-box-mode",
      "mini-sidebar"
    );

    switch (pathname) {
      case "/layout-horizontal":
        htmlElement.setAttribute("data-layout", "horizontal");
        document.body.classList.add("menu-horizontal");
        break;

      case "/layout-box":
        htmlElement.setAttribute("data-layout", "box");
        document.body.classList.add("layout-box-mode");
        break;

      case "/layout-detached":
        htmlElement.setAttribute("data-layout", "detached");
        break;

      case "/layout-two-column":
        htmlElement.setAttribute("data-layout", "twocolumn");
        break;

      case "/layout-hovered":
        htmlElement.setAttribute("data-layout", "layout-hovered");
        document.body.classList.add("mini-sidebar");
        break;

      default:
        htmlElement.setAttribute("data-layout", "default");
        break;
    }
  }, [pathname]);

  return (
    <div className="main-wrapper">
      <Header />
      <HorizontalSidebar />
      <TwoColumnSidebar />
      <Sidebar />
      {children}
    </div>
  );
}
