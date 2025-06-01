
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuGroup,
  DropdownMenuTrigger, 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sun, Moon, Bell, LogIn, LogOut as LogOutIcon, Building, Check } from "lucide-react";
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
    if (isSuperAdmin && userProfile?.account) {
      setIsLoadingDistricts(true);
      getDistrictsForSuperAdmin(userProfile.account)
        .then(fetchedDistricts => {
          // Ensure fetchedDistricts is an array, default to empty if not
          setDistricts(Array.isArray(fetchedDistricts) ? fetchedDistricts : []);
        })
        .catch(err => {
          console.error("Failed to fetch districts:", err);
          toast({ variant: "destructive", title: "Error Loading Districts", description: "Could not load districts for account switching. " + (err.message || '') });
          setDistricts([]); // Set to empty array on error
        })
        .finally(() => setIsLoadingDistricts(false));
    } else if (isSuperAdmin && !userProfile?.account) {
        console.warn("SuperAdmin detected, but userProfile.account is not yet available for fetching districts.");
        setIsLoadingDistricts(false);
        setDistricts([]);
    } else {
        setIsLoadingDistricts(false);
        setDistricts([]);
    }
  }, [isSuperAdmin, userProfile?.account, toast]);

  const handleAccountSwitch = async (selectedDistrictId: string) => {
    if (!userProfile || !userProfile.account || !selectedDistrictId ) {
      return;
    }

    const selectedDistrictObject = districts.find(d => d.id === selectedDistrictId);
    if (!selectedDistrictObject || selectedDistrictObject.accountName === userProfile.account) {
        // If district not found or already selected, do nothing
        return;
    }
    
    const newAccountName = selectedDistrictObject.accountName;

    setIsSwitchingAccount(true);
    try {
      await switchUserAccount(newAccountName, userProfile.account); 
      updateCurrentAccountInProfile(newAccountName); 
      toast({ title: "Account Switched", description: `Successfully switched to ${newAccountName}. Reloading...` });
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

  // Determine the ID of the currently active account for the DropdownMenuRadioGroup's value
  const currentSelectedValue = districts.find(d => d.accountName === userProfile?.account)?.id || "";

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="flex items-center gap-2">
        <Building className="h-4 w-4" />
        Switch Account
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {isLoadingDistricts ? (
        <div className="px-2 py-1.5">
          <Skeleton className="h-6 w-full my-1" />
           <Skeleton className="h-6 w-full my-1" />
        </div>
      ) : districts.length > 0 ? (
        <DropdownMenuRadioGroup 
          value={currentSelectedValue} 
          onValueChange={handleAccountSwitch}
          disabled={isSwitchingAccount}
        >
          {districts.map((district) => (
            <DropdownMenuRadioItem 
              key={district.id} 
              value={district.id} // Value for selection logic is the district ID
              className="cursor-pointer"
              disabled={isSwitchingAccount || district.accountName === userProfile?.account}
            >
              {district.id} {/* Display district.id as per user request */}
              {district.accountName === userProfile?.account && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      ) : (
         <DropdownMenuItem disabled>No other accounts available.</DropdownMenuItem>
      )}
      {isSwitchingAccount && <DropdownMenuItem disabled>Switching...</DropdownMenuItem>}
    </DropdownMenuGroup>
  );
};


export function AppHeader() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, userProfile, customClaims, loading: authLoading } = useAuth();
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
          <DropdownMenuContent align="end" className="w-64">
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
