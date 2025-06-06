
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from 'react';
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLayout } from "@/context/layout-context";
import { getDistrictsForSuperAdmin, switchUserAccount } from "@/services/adminActionsService";
import type { District } from "@/types/Admin";
import { getWeatherAndLocation, type WeatherLocationData } from "@/services/assignmentFunctionsService";
import { 
  Sun, Moon, Bell, LogIn, LogOut as LogOutIcon, Building, Check, Menu,
  LayoutDashboard, Map as MapIcon, ClipboardList, Camera, FileCheck2, FilePieChart, Palette, MessageSquare as MessageSquareIcon, Settings, FolderKanban, FileText,
  Thermometer, AlertCircle, MapPin as LocationIcon 
} from "lucide-react";


// Icon mapping (consistent with PageShell for navItems)
const iconMap: { [key: string]: React.ElementType } = {
  LayoutDashboard, Map: MapIcon, ClipboardList, Camera, FileCheck2, FilePieChart, Palette, MessageSquare: MessageSquareIcon, Settings, FolderKanban, FileText,
  Default: LayoutDashboard,
};

interface NavItem {
  href: string;
  label: string;
  icon: string; // Icon name as string
}

const AccountSwitcher: React.FC = () => {
  const { userProfile, updateCurrentAccountInProfile, customClaims } = useAuth();
  const [districts, setDistricts] = useState<District[]>([]);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(true);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const { toast } = useToast();

  const isSuperAdmin = userProfile?.permission === 'superAdmin' || customClaims?.superAdmin === true;

  useEffect(() => {
    if (isSuperAdmin && userProfile?.account) {
      setIsLoadingDistricts(true);
      getDistrictsForSuperAdmin(userProfile.account) 
        .then(fetchedDistricts => {
          setDistricts(Array.isArray(fetchedDistricts) ? fetchedDistricts : []);
        })
        .catch(err => {
          console.error("Failed to fetch districts:", err);
          toast({ variant: "destructive", title: "Error Loading Districts", description: "Could not load districts. " + (err.message || '') });
          setDistricts([]);
        })
        .finally(() => setIsLoadingDistricts(false));
    } else {
        setIsLoadingDistricts(false);
        setDistricts([]);
    }
  }, [isSuperAdmin, userProfile?.account, toast]);

  const handleAccountSwitch = async (selectedDistrictId: string) => {
    if (!userProfile || !userProfile.account) {
      toast({ variant: "destructive", title: "Switch Error", description: "User profile or current account missing." });
      return;
    }
    if (!selectedDistrictId || selectedDistrictId.trim() === "") {
        toast({ variant: "destructive", title: "Switch Error", description: "No district ID selected." });
        return;
    }
    if (selectedDistrictId === userProfile.account) return; 

    setIsSwitchingAccount(true);
    try {
      await switchUserAccount(selectedDistrictId, userProfile.account); 
      updateCurrentAccountInProfile(selectedDistrictId); 
      toast({ title: "Account Switched", description: `Successfully switched to account ID: ${selectedDistrictId}. Reloading...` });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Account Switch Failed", description: err.message || "Could not switch accounts." });
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  if (!isSuperAdmin) return null;

  const currentSelectedValue = userProfile?.account || "";

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="flex items-center gap-2">
        <Building className="h-4 w-4" /> Switch Account (ID)
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {isLoadingDistricts ? (
        <div className="px-2 py-1.5 space-y-1"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div>
      ) : districts.length > 0 ? (
        <DropdownMenuRadioGroup value={currentSelectedValue} onValueChange={handleAccountSwitch} disabled={isSwitchingAccount}>
          {districts.map((district) => (
            <DropdownMenuRadioItem 
              key={district.id} 
              value={district.id} 
              className="cursor-pointer" 
              disabled={isSwitchingAccount || district.id === userProfile?.account}
            >
              {district.id} 
              {district.id === userProfile?.account && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      ) : ( <DropdownMenuItem disabled>No other accounts available.</DropdownMenuItem> )}
      {isSwitchingAccount && <DropdownMenuItem disabled>Switching...</DropdownMenuItem>}
       <DropdownMenuSeparator />
    </DropdownMenuGroup>
  );
};

const WeatherDisplay: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherLocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    if (!userProfile?.account) {
      if (isMounted) {
        setError("Account info unavailable");
        setLoading(false);
      }
      return;
    }

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!isMounted) return;
          const { latitude, longitude } = position.coords;
          try {
            const data = await getWeatherAndLocation(latitude, longitude, userProfile.account);
            if (isMounted) {
              if (data && data.name && data.current) { // Check for essential data
                setWeatherData(data);
              } else {
                setError("Weather data incomplete"); // More specific error if API returns partial/no data
              }
            }
          } catch (apiError: any) {
            if (isMounted) {
              console.error("Failed to fetch weather data:", apiError);
              setError(apiError.message || "Weather API error");
            }
          } finally {
            if (isMounted) setLoading(false);
          }
        },
        (geoError) => {
          if (!isMounted) return;
          console.error("Geolocation error:", geoError);
          let geoErrorMessage = "Location unavailable";
          if (geoError.code === geoError.PERMISSION_DENIED) {
            geoErrorMessage = "Location access denied";
          }
          setError(geoErrorMessage);
          setLoading(false);
        },
        { timeout: 10000 }
      );
    } else {
      if (isMounted) {
        setError("Geolocation not supported");
        setLoading(false);
      }
    }
    return () => { isMounted = false; };
  }, [userProfile?.account]); // Effect runs when account info changes

  if (loading) {
    return (
      <div className="flex items-center justify-center text-xs min-w-[120px] sm:min-w-[150px] h-8 px-2 rounded" title="Loading weather...">
        <Skeleton className="h-5 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="weather-widget-error" // For easier inspection
        className="flex items-center justify-center text-xs min-w-[120px] sm:min-w-[150px] h-auto p-2 rounded bg-destructive/20 text-destructive border border-destructive/50" // More prominent error styling
        title={`Weather Error: ${error || "Unknown weather error"}`}
      >
        <AlertCircle className="h-4 w-4 mr-1.5 shrink-0" />
        {/* Ensure error message is always visible, even if long initially */}
        <span className="whitespace-normal break-words text-center">{error || "Unknown weather error"}</span>
      </div>
    );
  }

  if (weatherData && weatherData.current && weatherData.name) {
    return (
      <div
        className="flex items-center justify-center text-xs min-w-[120px] sm:min-w-[150px] h-8 px-2 rounded text-muted-foreground overflow-hidden"
        title={`${weatherData.current?.weather?.[0]?.description ? `${weatherData.current.weather[0].description} in ` : ''}${weatherData.name}`}
      >
        <div className="flex items-center gap-1.5 w-full truncate">
          <Thermometer className="h-4 w-4 text-primary shrink-0" aria-label="Temperature" />
          <span className="font-medium text-foreground">{Math.round(weatherData.current.temp)}°C</span>
          <span className="flex items-center gap-0.5 truncate">
             <LocationIcon className="h-4 w-4 text-primary shrink-0" aria-label="Location" />
             <span className="truncate text-foreground">{weatherData.name}</span>
          </span>
        </div>
      </div>
    );
  }

  // Fallback if no error, not loading, but no valid weather data
  return (
    <div
      className="flex items-center justify-center text-xs min-w-[120px] sm:min-w-[150px] h-8 px-2 rounded text-muted-foreground bg-yellow-500/10 border border-yellow-500/50"
      title="Weather data is currently not available."
    >
       <AlertCircle className="h-4 w-4 mr-1.5 text-yellow-600 shrink-0" />
       <span className="whitespace-nowrap overflow-hidden text-ellipsis">Weather: N/A</span>
    </div>
  );
};

interface AppHeaderProps {
  navItems: NavItem[];
}

export function AppHeader({ navItems }: AppHeaderProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, userProfile, customClaims, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { layoutMode, isMobileViewForLayout } = useLayout();
  const { toggleSidebar: toggleMobileSidebar } = useSidebar(); 
  const pathname = usePathname();

  const isDark = mounted && resolvedTheme === "dark";
  const isSuperAdmin = !authLoading && (userProfile?.permission === 'superAdmin' || customClaims?.superAdmin === true);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out" });
      router.push('/auth');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
  };

  const renderTopNavItems = () => (
    <nav className="hidden md:flex items-center space-x-1">
      {navItems.map(item => {
        const IconComponent = iconMap[item.icon] || iconMap.Default;
        return (
          <Button key={item.href} variant={pathname === item.href ? "secondary" : "ghost"} size="sm" asChild>
            <Link href={item.href} className="flex items-center gap-2 px-3 py-2">
              <IconComponent className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 sm:px-6 backdrop-blur-sm shrink-0">
      {isMobileViewForLayout && (
         <Button variant="ghost" size="icon" onClick={toggleMobileSidebar} aria-label="Open menu">
           <Menu className="h-5 w-5" />
         </Button>
      )}
      {layoutMode === "standard" && !isMobileViewForLayout && <SidebarTrigger className="hidden md:flex" />}

      <div className="flex-1">
        {isSuperAdmin && userProfile?.account && (
          <div className="text-xs sm:text-sm text-muted-foreground">
            Account: <span className="font-semibold text-primary">{userProfile.account}</span>
          </div>
        )}
        {layoutMode === "topNav" && !isMobileViewForLayout && renderTopNavItems()}
      </div>

      <div className="flex items-center gap-2">
        <WeatherDisplay />
        <Button variant="ghost" size="icon" aria-label="Toggle Theme" onClick={() => setTheme(isDark ? "light" : "dark")}>
          <Sun className={cn("h-5 w-5 transition-all", isDark ? "-rotate-90 scale-0" : "rotate-0 scale-100")} />
          <Moon className={cn("absolute h-5 w-5 transition-all", isDark ? "rotate-0 scale-100" : "rotate-90 scale-0")} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL || `https://placehold.co/40x40.png?text=${user?.email?.[0]?.toUpperCase() || 'U'}`} alt="User Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>{user ? (userProfile?.displayName?.[0] || user.email?.[0]?.toUpperCase() || 'U') : 'G'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-[70vh] overflow-y-auto">
            {user ? (
              <>
                <DropdownMenuLabel>
                  <div>{userProfile?.displayName || user.email}</div>
                  {userProfile?.account && !isSuperAdmin && <div className="text-xs text-muted-foreground font-normal">Account: {userProfile.account}</div>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isSuperAdmin && <AccountSwitcher />}
                <DropdownMenuItem asChild><Link href="/settings" className="flex items-center w-full"><Settings className="mr-2 h-4 w-4" />Profile & Settings</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOutIcon className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuLabel>Guest</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/auth"><LogIn className="mr-2 h-4 w-4" /> Login / Sign Up</Link></DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
    
