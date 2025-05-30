
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function AppHeader() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // isDark is only true if mounted and theme is dark
  const isDark = mounted && resolvedTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-sm">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        {/* Can add breadcrumbs or page title here */}
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle Theme"
          onClick={() => {
            // Ensure mounted and resolvedTheme are available before setting
            if (mounted && resolvedTheme) {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
            }
          }}
          // suppressHydrationWarning prop moved to individual icons
        >
          {mounted ? (
            <>
              {/* Dynamic icons based on resolved theme after mount */}
              <Sun
                className={cn(
                  "h-5 w-5 transition-all",
                  isDark ? "-rotate-90 scale-0" : "rotate-0 scale-100"
                )}
                suppressHydrationWarning={true}
              />
              <Moon
                className={cn(
                  "absolute h-5 w-5 transition-all",
                  isDark ? "rotate-0 scale-100" : "rotate-90 scale-0"
                )}
                suppressHydrationWarning={true}
              />
            </>
          ) : (
            <>
              {/* Static render for SSR and initial client render. Theme is assumed light here. */}
              {/* Server output might have dark: classes if html has class="dark" due to cookie. */}
              {/* Client initial render will have these exact classes. */}
              {/* suppressHydrationWarning handles the className mismatch. */}
              <Sun className="h-5 w-5 transition-all rotate-0 scale-100" suppressHydrationWarning={true}/>
              <Moon className="absolute h-5 w-5 transition-all rotate-90 scale-0" suppressHydrationWarning={true}/>
            </>
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/settings">Profile</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => alert("Logout clicked")}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
