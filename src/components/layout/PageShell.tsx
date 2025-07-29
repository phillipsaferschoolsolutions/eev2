"use client";

import React from 'react';
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { useLayout } from "@/context/layout-context";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
import { AnimatedBackground } from "@/components/ui/animated-background";

// Define navigation items here so they can be passed to header if needed
export const baseNavItems = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/map", label: "Campus Map", icon: "Map" },
  { href: "/assessment-forms", label: "Assignments", icon: "ClipboardList" },
  { href: "/drill-tracking", label: "Drill Tracking", icon: "Zap" },
  { href: "/tasks", label: "Tasks", icon: "ListTodo" },
  { href: "/assets", label: "Assets", icon: "HardDrive" },
  { href: "/resources", label: "Resources", icon: "FolderKanban" },
  { href: "/photo-bank", label: "Photo Bank", icon: "Image" },
  { href: "/photo-analysis", label: "Photo Analysis", icon: "Camera" },
  { href: "/policy-analysis", label: "Policy Analysis", icon: "FileCheck2" },
  { href: "/report-studio", label: "Report Studio", icon: "FilePieChart" },
  { href: "/delaware-report", label: "Delaware Report", icon: "FileText" },
  { href: "/messaging", label: "Messaging", icon: "MessageSquare" },
  { href: "/theming", label: "Theming", icon: "Palette" },
];

const pageVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeInOut" } },
  exit: { opacity: 0, x: 10, transition: { duration: 0.3, ease: "easeInOut" } }
};

export function PageShell({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuth(); // Get user profile
  const { layoutMode, isMobileViewForLayout } = useLayout();
  const sidebarContext = useSidebar();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  // Dynamically create the nav items based on the user's role
  const mainNavItems = React.useMemo(() => {
    // Define the roles that can see the admin link
    const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];
    
    const navItems = [...baseNavItems];
    if (userProfile && ADMIN_ROLES.includes(userProfile.permission)) {
      // Add the Admin link if the user has an admin role
      navItems.push({ href: "/admin", label: "Admin", icon: "Shield" });
    }
    // You can add other role-based links here as well
    return navItems;
  }, [userProfile]);

  // Determine if we should show animated backgrounds based on theme
  const showAnimatedBackground = React.useMemo(() => {
    if (!resolvedTheme) return false;
    
    // Check if the theme is one of our enhanced themes
    return resolvedTheme.includes('theme-coastal-breeze') || 
           resolvedTheme.includes('theme-urban-pulse') ||
           resolvedTheme.includes('theme-forest-whisper') ||
           resolvedTheme.includes('theme-desert-mirage') ||
           resolvedTheme.includes('theme-mountain-majesty') ||
           resolvedTheme.includes('theme-tech-horizon') ||
           resolvedTheme.includes('theme-tropical-paradise') ||
           resolvedTheme.includes('theme-aurora-borealis');
  }, [resolvedTheme]);

  // Determine animation type based on theme
  const getAnimationType = React.useCallback(() => {
    if (!resolvedTheme) return 'particles';
    
    if (resolvedTheme.includes('coastal')) return 'waves';
    if (resolvedTheme.includes('forest')) return 'leaves';
    if (resolvedTheme.includes('urban')) return 'cityLights';
    if (resolvedTheme.includes('desert')) return 'desert';
    if (resolvedTheme.includes('mountain')) return 'stars';
    if (resolvedTheme.includes('aurora')) return 'aurora';
    if (resolvedTheme.includes('tech')) return 'tech';
    if (resolvedTheme.includes('tropical')) return 'particles';
    
    return 'particles';
  }, [resolvedTheme]);

  React.useEffect(() => {
    if (!isMobileViewForLayout) { 
      if (layoutMode === "minimalIcon") {
        if (sidebarContext.state === "expanded") {
          sidebarContext.toggleSidebar(); 
        }
      }
    }
  }, [layoutMode, isMobileViewForLayout, sidebarContext]);
  
  const showSidebar = layoutMode === "standard" || layoutMode === "minimalIcon";

  return (
    <div className="flex flex-1 min-h-screen">
      {showSidebar && <AppSidebar navItems={mainNavItems} />}
      <div className={cn(
        "flex flex-col flex-1"
      )}>
        <AppHeader navItems={mainNavItems} />
        {showSidebar ? (
          <SidebarInset className="flex-grow flex flex-col overflow-hidden"> {/* Added flex flex-col overflow-hidden */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.main
                key={pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="p-4 sm:p-6 lg:p-8 flex-grow relative"
              >
                {showAnimatedBackground && (
                  <AnimatedBackground 
                    type={getAnimationType()} 
                    className="absolute inset-0 pointer-events-none z-0"
                  />
                )}
                <div className="relative z-10">
                  {children}
                </div>
              </motion.main>
            </AnimatePresence>
          </SidebarInset>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="p-4 sm:p-6 lg:p-8 flex-grow relative"
            >
              {showAnimatedBackground && (
                <AnimatedBackground 
                  type={getAnimationType()} 
                  className="absolute inset-0 pointer-events-none z-0"
                />
              )}
              <div className="relative z-10">
                {children}
              </div>
            </motion.main>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}