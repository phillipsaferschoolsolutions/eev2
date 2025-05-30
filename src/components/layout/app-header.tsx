
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

export function AppHeader() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      {/* Gradient Accent Line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-teal-300 to-cyan-600"></div>

      {/* Original Header Content with Padding */}
      <div className="flex h-16 items-center gap-4 px-6">
        <SidebarTrigger className="md:hidden" />
        <div className="flex-1">
          {/* Can add breadcrumbs or page title here */}
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            aria-label="Toggle Theme" 
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alert("Logout clicked")}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
