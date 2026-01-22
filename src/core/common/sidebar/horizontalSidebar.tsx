"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarData } from "@/core/json/siderbar_data";

const HorizontalSidebar = () => {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const handleClickOutside = (event: MouseEvent) => {
    if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
      setOpenSection(null);
      setOpenSubmenu(null);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleSection = (label: string) => {
    setOpenSection((prev) => (prev === label ? null : label));
    setOpenSubmenu(null);
  };

  const toggleSubmenu = (label: string) => {
    setOpenSubmenu((prev) => (prev === label ? null : label));
  };

  const isItemActive = (link?: string) => {
    if (!link || !pathname) return false;
    return pathname === link;
  };

  return (
    <div className="sidebar sidebar-horizontal" id="horizontal-menu" ref={sidebarRef}>
      <div className="sidebar-menu" id="sidebar-menu-3">
        <div className="main-menu">
          <ul className="nav">
            {SidebarData.map((section, index) => {
              const sectionLabel = section.label || section.submenuHdr || `section-${index}`;

              return (
                <li className="submenu" key={sectionLabel}>
                  <a
                    className={openSection === sectionLabel ? "active" : ""}
                    onClick={() => toggleSection(sectionLabel)}
                  >
                    <span>{section.submenuHdr || section.label}</span>
                    <span className="menu-arrow"></span>
                  </a>
                  <ul
                    className={`submenus-two ${
                      openSection === sectionLabel ? "d-block" : "d-none"
                    }`}
                  >
                    {section.submenuItems?.map((item: any) => {
                      if (!item.submenu) {
                        return (
                          <li key={item.label}>
                            <Link
                              href={item.link || "#"}
                              className={isItemActive(item.link) ? "active" : ""}
                            >
                              {item.icon && (
                                <i className={`ti ti-${item.icon} me-2`}></i>
                              )}
                              <span>{item.label}</span>
                            </Link>
                          </li>
                        );
                      }

                      // Item with nested submenuItems
                      const isSubmenuOpen = openSubmenu === item.label;

                      return (
                        <li className="submenu" key={item.label}>
                          <a
                            className={isSubmenuOpen ? "active" : ""}
                            onClick={() => toggleSubmenu(item.label)}
                          >
                            {item.icon && (
                              <i className={`ti ti-${item.icon} me-2`}></i>
                            )}
                            <span>{item.label}</span>
                            <span className="menu-arrow"></span>
                          </a>
                          <ul
                            className={`submenus-two ${
                              isSubmenuOpen ? "d-block" : "d-none"
                            }`}
                          >
                            {item.submenuItems?.map((subItem: any) => (
                              <li key={subItem.label}>
                                <Link
                                  href={subItem.link || "#"}
                                  className={isItemActive(subItem.link) ? "active" : ""}
                                >
                                  <span>{subItem.label}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HorizontalSidebar;