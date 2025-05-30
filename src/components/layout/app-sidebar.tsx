
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  LayoutDashboard,
  Map,
  ClipboardList,
  Camera,
  FileCheck2,
  FilePieChart,
  Palette,
  Settings,
  LogOut as LogOutIcon,
  PanelLeftClose, 
  PanelLeftOpen,  
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Campus Map", icon: Map },
  { href: "/assessment-forms", label: "Assignments", icon: ClipboardList },
  { href: "/photo-analysis", label: "Photo Analysis", icon: Camera },
  { href: "/policy-analysis", label: "Policy Analysis", icon: FileCheck2 },
  { href: "/reports", label: "Report Studio", icon: FilePieChart },
  { href: "/theming", label: "Theming", icon: Palette },
];

export function AppSidebar() {
  const pathname = usePathname();
  const sidebarContext = useSidebar();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/auth');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
  };

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2.5">
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
