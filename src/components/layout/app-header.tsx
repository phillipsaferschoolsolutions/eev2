
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sun, Moon, Bell, LogIn, LogOut as LogOutIcon, Building, ChevronsUpDown, Check } from "lucide-react"; // Added Building, ChevronsUpDown, Check
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { getDistrictsForSuperAdmin, switchUserAccount } from "@/services/adminActionsService";
import type { District } from "@/types/Admin";
import { Skeleton } from "@/components/ui/skeleton";

const AccountSwitcher: React.FC = () => {
  const { userProfile, updateCurrentAccountInProfile, customClaims } = useAuth();
  const [districts, setDistricts] = useState<District[]>([]);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(true);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const isSuperAdmin = userProfile?.permission === 'superAdmin' || customClaims?.superAdmin === true;

  useEffect(() => {
    if (isSuperAdmin) {
      setIsLoadingDistricts(true);
      getDistrictsForSuperAdmin()
        .then(setDistricts)
        .catch(err => {
          console.error("Failed to fetch districts:", err);
          toast({ variant: "destructive", title: "Error", description: "Could not load districts for account switching." });
        })
        .finally(() => setIsLoadingDistricts(false));
    }
  }, [isSuperAdmin, toast]);

  const handleAccountSwitch = async (newAccountName: string) => {
    if (!userProfile || !newAccountName || newAccountName === userProfile.account) {
      return;
    }
    setIsSwitchingAccount(true);
    try {
      // The backend needs to know which user is making the request (via ID token)
      // and what their current account context is, if it's relevant for the switch logic.
      await switchUserAccount(newAccountName, userProfile.account);
      updateCurrentAccountInProfile(newAccountName); // Update local context
      toast({ title: "Account Switched", description: `Successfully switched to ${newAccountName}. Reloading...` });
      // Reload the page to apply the new account context everywhere
      // Timeout to allow toast to be seen
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Account Switch Failed", description: err.message || "Could not switch accounts." });
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="flex items-center gap-2">
        <Building className="h-4 w-4" />
        Switch Account
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {isLoadingDistricts ? (
        <div className="px-2 py-1.5">
          <Skeleton className="h-6 w-full" />
        </div>
      ) : (
        <DropdownMenuRadioGroup 
          value={userProfile?.account || ""} 
          onValueChange={handleAccountSwitch}
          disabled={isSwitchingAccount}
        >
          {districts.map((district) => (
            <DropdownMenuRadioItem 
              key={district.id || district.name} 
              value={district.name}
              className="cursor-pointer"
              disabled={isSwitchingAccount || district.name === userProfile?.account}
            >
              {district.name}
              {district.name === userProfile?.account && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      )}
      {isSwitchingAccount && <DropdownMenuItem disabled>Switching...</DropdownMenuItem>}
    </DropdownMenuGroup>
  );
};


export function AppHeader() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, userProfile, customClaims, loading: authLoading } = useAuth(); // Added userProfile and customClaims
  const router = useRouter();
  const { toast } = useToast();

  const isDark = mounted && resolvedTheme === "dark";
  const isSuperAdmin = !authLoading && (userProfile?.permission === 'superAdmin' || customClaims?.superAdmin === true);


  useEffect(() => {
    setMounted(true);
  }, []);

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
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-sm">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        {isSuperAdmin && userProfile?.account && (
            <div className="text-sm text-muted-foreground">
                Current Account: <span className="font-semibold text-primary">{userProfile.account}</span>
            </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle Theme"
          onClick={() => {
            if (mounted && resolvedTheme) {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
            }
          }}
        >
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
                {user ? (
                  <AvatarImage src={user.photoURL || `https://placehold.co/40x40.png?text=${user.email?.[0]?.toUpperCase() || 'U'}`} alt="User Avatar" data-ai-hint="user avatar" />
                ) : (
                  <AvatarImage src="https://placehold.co/40x40.png" alt="Guest Avatar" data-ai-hint="guest avatar" />
                )}
                <AvatarFallback>{user ? (userProfile?.displayName?.[0] || user.email?.[0]?.toUpperCase() || 'U') : 'G'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64"> {/* Increased width for account switcher */}
            {user ? (
              <>
                <DropdownMenuLabel>
                  <div>{userProfile?.displayName || user.email}</div>
                  {userProfile?.account && !isSuperAdmin && <div className="text-xs text-muted-foreground font-normal">Account: {userProfile.account}</div>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isSuperAdmin && <AccountSwitcher />} 
                {isSuperAdmin && <DropdownMenuSeparator />} 
                <DropdownMenuItem asChild><Link href="/settings">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuLabel>Guest</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/auth">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login / Sign Up
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
