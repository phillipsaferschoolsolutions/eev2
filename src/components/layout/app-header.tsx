
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
    console.log("[WeatherDisplay] Effect triggered. isMounted:", isMounted, "Account:", userProfile?.account);

    const fetchWeather = async () => {
      if (!isMounted) {
        console.log("[WeatherDisplay] fetchWeather: Unmounted, bailing.");
        return;
      }
      
      console.log("[WeatherDisplay] fetchWeather: Starting. Setting loading=true, error=null.");
      setLoading(true);
      setError(null);

      if (!userProfile?.account) {
        if (isMounted) {
          console.error("[WeatherDisplay] fetchWeather: Error - Account info unavailable for weather.");
          setError("Account info unavailable for weather");
          setLoading(false);
        }
        return;
      }

      if (typeof window !== 'undefined' && navigator.geolocation) {
        console.log("[WeatherDisplay] fetchWeather: Attempting geolocation.");
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            if (!isMounted) {
              console.log("[WeatherDisplay] fetchWeather (geolocation success): Unmounted, bailing.");
              return;
            }
            const { latitude, longitude } = position.coords;
            console.log("[WeatherDisplay] fetchWeather: Geolocation success. Lat:", latitude, "Lng:", longitude);
            try {
              const data = await getWeatherAndLocation(latitude, longitude, userProfile.account);
              if (isMounted) {
                if (data && data.name && data.current) {
                  setWeatherData(data);
                  console.log("[WeatherDisplay] fetchWeather: API success. WeatherData set:", data);
                } else {
                  setError("Weather data incomplete from API");
                  console.warn("[WeatherDisplay] fetchWeather: API returned incomplete data or null.");
                }
                setLoading(false);
              }
            } catch (apiError: any) {
              if (isMounted) {
                console.error("[WeatherDisplay] fetchWeather: API call failed:", apiError);
                setError(apiError.message || "Weather API unavailable");
                setLoading(false);
              }
            }
          },
          (geoError) => {
            if (!isMounted) {
              console.log("[WeatherDisplay] fetchWeather (geolocation error): Unmounted, bailing.");
              return;
            }
            console.error("[WeatherDisplay] fetchWeather: Geolocation error:", geoError);
            let geoErrorMessage = "Location error";
            if (geoError.code === geoError.PERMISSION_DENIED) {
              geoErrorMessage = "Location access denied";
            }
            setError(geoErrorMessage);
            setLoading(false);
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      } else {
        if (isMounted) {
          console.warn("[WeatherDisplay] fetchWeather: Geolocation not supported by browser.");
          setError("Geolocation not supported");
          setLoading(false);
        }
      }
    };

    fetchWeather();

    return () => {
      console.log("[WeatherDisplay] Effect cleanup. Setting isMounted to false.");
      isMounted = false;
    };
  }, [userProfile?.account]); // userProfile.account is the key dependency

  console.log("[WeatherDisplay] Render: loading=", loading, "error=", error, "weatherData=", !!weatherData);

  if (loading) {
    console.log("[WeatherDisplay] Render: Displaying Skeleton.");
    return (
      <div className="flex items-center justify-center text-xs min-w-[100px] sm:min-w-[120px] h-8 px-2 rounded" title="Loading weather...">
        <Skeleton className="h-5 w-full" />
      </div>
    );
  }

  if (error) {
    console.log("[WeatherDisplay] Render: Displaying Error -", error);
    return (
      <div
        data-testid="weather-widget-error"
        className="flex items-center justify-center text-xs min-w-[120px] sm:min-w-[150px] h-auto p-2 rounded bg-destructive/20 text-destructive border border-destructive/50"
        title={`Weather Error: ${error}`}
      >
        <AlertCircle className="h-4 w-4 mr-1.5 shrink-0" />
        <span className="whitespace-normal break-words text-center">{error}</span>
      </div>
    );
  }

  if (weatherData && weatherData.current && weatherData.name) {
    console.log("[WeatherDisplay] Render: Displaying Weather Data.");
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
  
  console.log("[WeatherDisplay] Render: Displaying Fallback N/A state (e.g. API returned empty but no error).");
  return (
    <div
      className="flex items-center justify-center text-xs min-w-[120px] sm:min-w-[150px] h-8 px-2 rounded text-yellow-700 bg-yellow-500/10 border border-yellow-500/50"
      title="Weather data is currently unavailable."
    >
       <AlertCircle className="h-4 w-4 mr-1.5 shrink-0" />
       <span className="whitespace-nowrap overflow-hidden text-ellipsis">Weather: Fetch N/A</span>
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
    