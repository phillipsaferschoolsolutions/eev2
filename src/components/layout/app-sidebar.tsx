
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar, // Added
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons/logo";
import {
  LayoutDashboard,
  Map,
  ClipboardList,
  Camera,
  FileCheck2,
  FilePieChart,
  Palette,
  Settings,
  LogOut,
  PanelLeftClose, // Added
  PanelLeftOpen,  // Added
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Campus Map", icon: Map },
  { href: "/assessment-forms", label: "Assessment Forms", icon: ClipboardList },
  { href: "/photo-analysis", label: "Photo Analysis", icon: Camera },
  { href: "/policy-analysis", label: "Policy Analysis", icon: FileCheck2 },
  { href: "/reports", label: "Report Studio", icon: FilePieChart },
  { href: "/theming", label: "Theming", icon: Palette },
];

export function AppSidebar() {
  const pathname = usePathname();
  const sidebarContext = useSidebar();

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <Logo />
      </SidebarHeader>
      <SidebarContent className="flex-grow p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <a>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="my-2"/>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem className="hidden md:block"> {/* Desktop only toggle */}
            <SidebarMenuButton
              onClick={sidebarContext.toggleSidebar}
              tooltip={sidebarContext.state === 'expanded' ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarContext.state === 'expanded' ? (
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
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Logout" variant="outline">
              <button onClick={() => alert("Logout clicked")}>
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
