"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons/logo";
import {
  LayoutDashboard, Map, ClipboardList, Camera, FileCheck2, FilePieChart, Palette, Settings, MessageSquare,
  LogOut as LogOutIcon, PanelLeftClose, PanelLeftOpen, Home, Users, BarChart2, Briefcase, Shield, BookOpen, FolderKanban, FileText, Zap, ListTodo, HardDrive // Added Zap, ListTodo, HardDrive
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useLayout } from "@/context/layout-context";
import { cn } from "@/lib/utils";

// Icon mapping
const iconMap: { [key: string]: React.ElementType } = {
  LayoutDashboard, Map, ClipboardList, Camera, FileCheck2, FilePieChart, Palette, Settings, MessageSquare, FolderKanban, FileText, Zap, ListTodo, HardDrive, // Added Zap, ListTodo, HardDrive
  Home, Users, BarChart2, Briefcase, Shield, BookOpen,
  Default: LayoutDashboard, // Fallback icon
};

interface NavItem {
  href: string;
  label: string;
  icon: string; // Icon name as string
}

interface AppSidebarProps {
  navItems: NavItem[];
}

export function AppSidebar({ navItems }: AppSidebarProps) {
  const pathname = usePathname();
  const sidebarContext = useSidebar();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { layoutMode, isMobileViewForLayout } = useLayout();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
  };

  if (pathname === '/auth') {
    return null;
  }

  // For TopNav layout on desktop, sidebar is not rendered persistently.
  // Mobile sidebar (sheet) for TopNav is handled by AppHeader.
  if (layoutMode === "topNav" && !isMobileViewForLayout) {
    return null;
  }
  
  const isMinimalIconModeDesktop = layoutMode === "minimalIcon" && !isMobileViewForLayout;
  // In minimalIcon mode on desktop, it should always be icon-only.
  // In standard mode, it can be expanded/collapsed.
  // The `collapsible="icon"` prop allows it to go to icon mode.
  // The `initialSidebarState` helps determine what the toggle button shows.
  const effectiveCollapsible = isMinimalIconModeDesktop ? "icon" : "icon"; 
  const initialSidebarState = sidebarContext.state;


  return (
    <Sidebar 
      side="left" 
      variant="sidebar" // This variant provides the standard sidebar styling
      collapsible={effectiveCollapsible} // Allows collapsing to icon mode
      className={cn(
        // If it's mobile, the Sidebar component itself will be rendered within a Sheet by PageShell/AppHeader,
        // so this class is mostly for desktop behavior.
        layoutMode === "topNav" && "md:hidden" // Hide on desktop for topNav, though already handled by outer conditional.
      )}
    >
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2.5">
        <Logo />
      </SidebarHeader>
      <SidebarContent className="flex-grow p-2">
        <SidebarMenu>
          {navItems.map((item) => {
            const IconComponent = iconMap[item.icon] || iconMap.Default;
            return (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <a>
                      <IconComponent className="h-5 w-5" />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="my-2"/>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          {/* Desktop only toggle, and hide if in minimalIcon mode on desktop */}
          {/* Also hide if it's mobile, as mobile toggle is in header */}
          {layoutMode !== "minimalIcon" && !isMobileViewForLayout && (
            <SidebarMenuItem className="hidden md:block">
              <SidebarMenuButton
                onClick={sidebarContext.toggleSidebar}
                tooltip={initialSidebarState === 'expanded' ? "Collapse sidebar" : "Expand sidebar"}
              >
                {initialSidebarState === 'expanded' ? (
                  <>
                    <PanelLeftClose className="h-5 w-5" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <PanelLeftOpen className="h-5 w-5" />
                    <span>Expand</span>
                  </>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {user && ( 
            <SidebarMenuItem>
              <Link href="/settings" passHref legacyBehavior>
                  <SidebarMenuButton asChild tooltip="Settings">
                    <a>
                      <Settings className="h-5 w-5" />
                      <span>Settings</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
          )}
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Logout" onClick={handleLogout}>
                <button>
                  <LogOutIcon className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}