
"use client";

import React from 'react'; // Ensured React is imported
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { useLayout } from "@/context/layout-context";
import { cn } from "@/lib/utils";

// Define navigation items here so they can be passed to header if needed
export const mainNavItems = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/map", label: "Campus Map", icon: "Map" },
  { href: "/assessment-forms", label: "Assignments", icon: "ClipboardList" },
  { href: "/photo-analysis", label: "Photo Analysis", icon: "Camera" },
  { href: "/policy-analysis", label: "Policy Analysis", icon: "FileCheck2" },
  { href: "/reports", label: "Report Studio", icon: "FilePieChart" },
  { href: "/messaging", label: "Messaging", icon: "MessageSquare" },
  { href: "/theming", label: "Theming", icon: "Palette" },
];


export function PageShell({ children }: { children: React.ReactNode }) {
  const { layoutMode, isMobileViewForLayout } = useLayout();
  const sidebarContext = useSidebar(); // Get sidebar context

  // Effect to manage sidebar state based on layoutMode for desktop
  React.useEffect(() => {
    if (!isMobileViewForLayout) { // Only apply desktop-specific sidebar logic
      if (layoutMode === "minimalIcon") {
        if (sidebarContext.state === "expanded") {
          sidebarContext.toggleSidebar(); // Collapse if expanded
        }
      } else if (layoutMode === "standard") {
        // If you want 'standard' to default to expanded, you could add logic here,
        // but it usually remembers its last state via cookie.
      }
    }
  }, [layoutMode, isMobileViewForLayout, sidebarContext]);
  

  const showSidebar = layoutMode === "standard" || layoutMode === "minimalIcon";

  return (
    <div className="flex flex-1 min-h-screen">
      {showSidebar && <AppSidebar navItems={mainNavItems} />}
      <div className={cn(
        "flex flex-col flex-1",
        layoutMode === "standard" && "md:ml-[var(--sidebar-width)] group-data-[state=collapsed]/sidebar-wrapper:md:ml-[var(--sidebar-width-icon)] transition-[margin-left] duration-200 ease-linear",
        layoutMode === "minimalIcon" && "md:ml-[var(--sidebar-width-icon)] transition-[margin-left] duration-200 ease-linear",
        // topNav takes full width, so no margin-left needed for desktop
      )}>
        <AppHeader navItems={mainNavItems} />
        {/* SidebarInset is used by standard and minimalIcon layouts */}
        {showSidebar ? (
          <SidebarInset className="flex-grow">
            <main className="p-4 sm:p-6 lg:p-8 flex-grow">
              {children}
            </main>
          </SidebarInset>
        ) : (
          // For topNav layout, main content is directly under header
          <main className="p-4 sm:p-6 lg:p-8 flex-grow">
            {children}
          </main>
        )}
      </div>
    </div>
  );
}
