
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CalendarDays,
  Newspaper,
  ShieldAlert,
  ListChecks,
  Edit3,
  FileText,
  ExternalLink,
  Info,
  Activity,
  TrendingUp,
  Filter,
  Cloud, Sun, CloudRain, 
  CloudSnow, CloudLightning, CloudFog, 
  Thermometer, Droplets, Wind, Sunrise, Sunset, SunMoon,
  AlertCircle,
  Loader2,
  ListOrdered,
  Radiation,
  MessageSquare,
  Zap,
  Award,
  Flame, 
} from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import {
  getAssignmentListMetadata,
  getAssignmentById,
  getLastCompletions,  
  type AssignmentMetadata, WeatherLocationData,
  type AssignmentWithPermissions,
} from "@/services/assignmentFunctionsService";
import {
  getDashboardWidgetsSandbox,
  getCommonResponsesForAssignment,
  getWidgetTrends,
} from "@/services/analysisService";
import type {
  SchoolsWithQuestionsResponse,
  AssignmentCompletionStatus,
  UserActivity,
  TrendsResponse,
} from "@/types/Analysis";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { formatDisplayDateShort } from "@/lib/utils";
import Link from "next/link";
import { useTheme } from "next-themes";
import { fetchPexelsImageURL } from '@/services/pexelsService';
import { fetchWeather } from '@/services/weatherService'; // Assuming a service for fetching weather
import { Badge } from "@/components/ui/badge";
import { getLocationsForLookup, type Location } from "@/services/locationService";

const getWeatherIcon = (id) => {
  if (id >= 200 && id < 300) return <CloudLightning className="text-yellow-500 h-10 w-10" />;
  if (id >= 300 && id < 600) return <CloudRain className="text-blue-500 h-10 w-10" />;
  if (id >= 600 && id < 700) return <CloudSnow className="text-cyan-400 h-10 w-10" />;
  if (id >= 700 && id < 800) return <CloudFog className="text-gray-400 h-10 w-10" />;
  if (id === 800) return <Sun className="text-yellow-400 h-10 w-10" />;
  if (id > 800) return <Cloud className="text-sky-400 h-10 w-10" />;
  return <SunMoon className="text-yellow-300 h-10 w-10" />;
};

const GOOGLE_NEWS_RSS_URL =
  "https://news.google.com/rss/search?q=K-12+school+security+OR+school+cybersecurity&hl=en-US&gl=US&ceid=US:en";
const RSS2JSON_API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
  GOOGLE_NEWS_RSS_URL
)}`;

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  description: string;
  guid: string;
  thumbnail?: string;
}

interface RssResponse {
  status: string;
  feed: object;
  items: NewsItem[];
}

const PERIOD_OPTIONS = [
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "last90days", label: "Last 90 Days" },
  { value: "alltime", label: "All Time" },
];

const COMPLETION_PERIOD_OPTIONS = [
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "last90days", label: "Last 90 Days" },
  { value: "alltime", label: "All Time" },
];
const ALL_ASSIGNMENTS_FILTER_KEY = "__all-assignments__";

const heroContainerVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      duration: 0.7,
      ease: "easeInOut",
      when: "beforeChildren",
      staggerChildren: 0.2,
    },
  },
};

const heroTextVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const PHOTO_HEAVY_THEME_PREFIX = "theme-";

// --- Placeholder Card Components ---
const CriticalTasksCard: React.FC = () => (
  <Card className="h-full flex flex-col">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-xl">
        <AlertTriangle className="h-5 w-5 text-destructive" /> Critical Tasks
      </CardTitle>
      <CardDescription>High-priority items needing immediate attention.</CardDescription>
    </CardHeader>
    <CardContent className="flex-grow">
      <ul className="space-y-3 text-sm">
        <li className="flex justify-between items-center"><span>Inspect broken fence near West Gate</span> <Button variant="link" size="sm" className="p-0 h-auto">Details</Button></li>
        <li className="flex justify-between items-center"><span>Review fire drill report</span> <Button variant="link" size="sm" className="p-0 h-auto">Details</Button></li>
        <li className="flex justify-between items-center"><span>Restock first-aid kit - Gym</span> <Button variant="link" size="sm" className="p-0 h-auto">Details</Button></li>
      </ul>
    </CardContent>
  </Card>
);

const UpcomingEventsCard: React.FC = () => (
  <Card className="h-full flex flex-col">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-xl">
        <CalendarDays className="h-5 w-5 text-primary" /> Upcoming Events & Drills
      </CardTitle>
      <CardDescription>Scheduled safety events and drills.</CardDescription>
    </CardHeader>
    <CardContent className="flex-grow">
      <ul className="space-y-2 text-sm">
        <li><strong>Campus Safety Workshop:</strong> Tomorrow, 10 AM</li>
        <li><strong>Fire Drill (Block B):</strong> Oct 28, 2 PM</li>
        <li><strong>Security Team Meeting:</strong> Nov 2, 9 AM</li>
      </ul>
    </CardContent>
  </Card>
);

const EmergencyProtocolsCard: React.FC = () => (
  <Card className="h-full flex flex-col">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-xl">
        <ShieldAlert className="h-5 w-5 text-primary" /> Emergency Protocols
      </CardTitle>
      <CardDescription>Quick actions for emergency situations.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3 flex-grow flex flex-col justify-center">
      <Button className="w-full bg-destructive hover:bg-destructive/90">
        <Radiation className="mr-2 h-4 w-4" /> Initiate Lockdown
      </Button>
      <Button variant="outline" className="w-full">
        <FileText className="mr-2 h-4 w-4" /> Report Incident
      </Button>
      <Button variant="outline" className="w-full">
        <MessageSquare className="mr-2 h-4 w-4" /> Send Alert
      </Button>
    </CardContent>
  </Card>
);


export default function DashboardPage() {
  const { userProfile, loading: authLoading, profileLoading } = useAuth();
  const { resolvedTheme } = useTheme();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItem | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);

  const [assignmentsForCommonResponses, setAssignmentsForCommonResponses] = useState<AssignmentMetadata[]>([]);
  const [selectedAssignmentForCommon, setSelectedAssignmentForCommon] = useState<string | null>(null);
  const [commonResponsesAssignmentDetails, setCommonResponsesAssignmentDetails] = useState<AssignmentWithPermissions | null>(null);
  const [isLoadingCommonResponsesAssignmentDetails, setIsLoadingCommonResponsesAssignmentDetails] = useState(false);
  const [commonResponsesData, setCommonResponsesData] = useState<SchoolsWithQuestionsResponse | null>(null);
  const [isLoadingCommonResponses, setIsLoadingCommonResponses] = useState(false);
  const [commonResponsesError, setCommonResponsesError] = useState<string | null>(null);
  const [commonResponsesPeriod, setCommonResponsesPeriod] = useState("last30days");

  const [streakData, setStreakData] = useState<TrendsResponse | null>(null);
  const [isLoadingStreak, setIsLoadingStreak] = useState(true);
  const [streakError, setStreakError] = useState<string | null>(null);

  const [lastCompletionsAssignments, setLastCompletionsAssignments] = useState<AssignmentMetadata[]>([]);
  const [selectedAssignmentForCompletions, setSelectedAssignmentForCompletions] = useState<string | null>(null);
  const [lastCompletionsPeriod, setLastCompletionsPeriod] = useState("last30days");
  const [selectedSchoolForCompletions, setSelectedSchoolForCompletions] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [lastCompletionsData, setLastCompletionsData] = useState<AssignmentCompletionStatus[] | null>(null);
  const [isLoadingLastCompletions, setIsLoadingLastCompletions] = useState(true);
  const [lastCompletionsError, setLastCompletionsError] = useState<string | null>(null);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  const [weatherData, setWeatherData] = useState<WeatherLocationData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);


  const isAdmin = !profileLoading && userProfile && (userProfile.permission === 'admin' || userProfile.permission === 'superAdmin');
  
  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  const isPhotoHeavyTheme = isClientMounted && resolvedTheme && resolvedTheme.startsWith(PHOTO_HEAVY_THEME_PREFIX);

  const cardVariants = {
    hidden: ({ theme }: { theme?: string }) => {
      let yOffset = 25;
      let scale = 0.95;
      let opacity = 0;
      if (theme?.includes('matrix') || theme?.includes('cyber') || theme?.includes('digital') || theme?.includes('citadel') || theme?.includes('slate') || theme?.includes('guardian') || theme?.includes('fortress')) {
        yOffset = 10;
        scale = 0.98;
        opacity = 0.3;
      } else if (theme?.includes('nature') || theme?.includes('spring') || theme?.includes('forest') || theme?.includes('serenity') || theme?.includes('meadow') || theme?.includes('reef') || theme?.includes('library')) {
        yOffset = 45;
        scale = 0.90;
        opacity = 0;
      }
      return { opacity, y: yOffset, scale };
    },
    visible: ({ index, theme }: { index: number; theme?: string }) => {
      let duration = 0.5;
      let ease: any = [0.42, 0, 0.58, 1]; // Default easeInOut
      let delayFactor = 0.09;

      if (theme?.includes('matrix') || theme?.includes('cyber') || theme?.includes('digital') || theme?.includes('citadel') || theme?.includes('slate') || theme?.includes('guardian') || theme?.includes('fortress')) {
        duration = 0.35;
        ease = "easeOut";
        delayFactor = 0.06;
      } else if (theme?.includes('nature') || theme?.includes('spring') || theme?.includes('forest') || theme?.includes('serenity') || theme?.includes('meadow') || theme?.includes('reef') || theme?.includes('library') || theme?.includes('ocean') || theme?.includes('vintage')) {
        duration = 0.7;
        ease = "circOut"; 
        delayFactor = 0.12;
      } else if (theme?.includes('solar') || theme?.includes('volcanic') || theme?.includes('funk') || theme?.includes('innovation')) {
        duration = 0.6;
        ease = [0.68, -0.6, 0.27, 1.65]; // "backOut" with more oomph
        delayFactor = 0.07;
      }
      return {
        opacity: 1,
        y: 0,
        scale: 1, // Assuming a base scale of 1
        transition: {
          delay: index * delayFactor,
          duration: duration,
          ease: ease,
        },
      };
    },
  };


  useEffect(() => {
    if (isClientMounted && resolvedTheme) {
      if (isPhotoHeavyTheme) {
        let pexelsQuery = "modern university campus"; 
        if (resolvedTheme.includes("nature") || resolvedTheme.includes("forest") || resolvedTheme.includes("meadow")) pexelsQuery = "lush forest canopy peaceful";
        else if (resolvedTheme.includes("guardian") || resolvedTheme.includes("fortress") || resolvedTheme.includes("citadel")) pexelsQuery = "abstract security shield metallic architecture";
        else if (resolvedTheme.includes("library") || resolvedTheme.includes("vintage")) pexelsQuery = "quiet library bookshelf calm study";
        else if (resolvedTheme.includes("innovation") || resolvedTheme.includes("cyber") || resolvedTheme.includes("digital")) pexelsQuery = "futuristic city technology bright sky";
        else if (resolvedTheme.includes("serenity") || resolvedTheme.includes("arctic") || resolvedTheme.includes("crystal")) pexelsQuery = "calm serene landscape clear sky";
        
        fetchPexelsImageURL(pexelsQuery, "landscape")
          .then(url => setHeroImageUrl(url))
          .catch(err => {
            console.error("Failed to fetch Pexels hero image:", err); // Log error
            setHeroImageUrl(null); 
          });
      } else {
        setHeroImageUrl(null); 
      }
    }
  }, [isClientMounted, resolvedTheme, isPhotoHeavyTheme]);

  useEffect(() => {
    const fetchNewsData = async () => {
      setNewsLoading(true);
      setNewsError(null);
      try {
        const response = await fetch(RSS2JSON_API_URL);
        if (!response.ok) throw new Error(`Failed to fetch news: ${response.statusText}`);
        const data: RssResponse = await response.json();
        if (data.status === "ok") setNewsItems(data.items.slice(0, 5));
        else throw new Error("News feed API returned an error.");
      } catch (err) {
        setNewsError(err instanceof Error ? err.message : "Failed to fetch news.");
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNewsData();
  }, []);

  useEffect(() => {
    if (userProfile?.account) {
      setIsLoadingStreak(true);
      setStreakError(null);
      getWidgetTrends(userProfile.account)
        .then(setStreakData)
        .catch((err) => {
            console.error("Error fetching streak data:", err);
            setStreakError((err as Error).message || "Could not load streak data.");
        })
        .finally(() => setIsLoadingStreak(false));
    } else { 
        setStreakData(null);
    }
  }, [userProfile?.account]);

  useEffect(() => {
    if (userProfile?.account) {
        getAssignmentListMetadata(userProfile.account) 
        .then((data) => {
          setLastCompletionsAssignments(data || []); // Ensure it's an array
        })
        .catch((err) => console.error("Error fetching assignment list for last completions:", err));
    }

    if (userProfile?.account && isClientMounted && !authLoading && !profileLoading) {
      getAssignmentListMetadata(userProfile.account)
        .then((data) => {
          setAssignmentsForCommonResponses(data || []);
          if (data && data.length > 0 && !selectedAssignmentForCommon) {
            setSelectedAssignmentForCommon(data[0].id);
          }
        })
        .catch((err) => console.error("Error fetching assignment list:", err));
    } else {
        setLastCompletionsAssignments([]);
        setAssignmentsForCommonResponses([]);
    }
  }, [userProfile?.account, selectedAssignmentForCommon, isClientMounted, authLoading, profileLoading]);

  useEffect(() => {
    // Fetches locations once the user's account is known
    if (userProfile?.account) {
      getLocationsForLookup(userProfile.account)
        .then(data => {
          setLocations(data || []);
        })
        .catch(err => {
          console.error("Failed to fetch locations for widget:", err);
          // You could set an error state here if needed
        });
    }
  }, [userProfile?.account]);

  useEffect(() => {
    if (userProfile?.account && selectedAssignmentForCommon) {
      setIsLoadingCommonResponsesAssignmentDetails(true);
      setCommonResponsesAssignmentDetails(null);
      getAssignmentById(selectedAssignmentForCommon, userProfile.account)
        .then(setCommonResponsesAssignmentDetails)
        .catch((err) => {
          console.error("Error fetching assignment details for common responses:", err);
          setCommonResponsesAssignmentDetails(null);
        })
        .finally(() => setIsLoadingCommonResponsesAssignmentDetails(false));
    } 
  }, [userProfile?.account, selectedAssignmentForCommon, isClientMounted, authLoading, profileLoading]);


  useEffect(() => {
    if (
      userProfile?.account &&
      selectedAssignmentForCommon &&
      commonResponsesPeriod &&
      isClientMounted
    ) {
      setIsLoadingCommonResponses(true);
      setCommonResponsesError(null);
      setCommonResponsesData(null);
      getCommonResponsesForAssignment(
        selectedAssignmentForCommon,
        commonResponsesPeriod,
        userProfile.account
      )
        .then(setCommonResponsesData)
        .catch((err) => {
          console.error("Error fetching common responses:", err);
          setCommonResponsesError((err as Error).message || "Could not load common response data.");
        })
        .finally(() => setIsLoadingCommonResponses(false));
    }
  }, [
    userProfile?.account,
    selectedAssignmentForCommon,
    commonResponsesPeriod,
    isClientMounted,
  ]);

  useEffect(() => {
    // Only run if all required filters are selected
    if (userProfile?.account && lastCompletionsPeriod && selectedAssignmentForCompletions && selectedSchoolForCompletions) {
      setIsLoadingLastCompletions(true);
      setLastCompletionsError(null);

      getLastCompletions(
        userProfile.account,
        selectedAssignmentForCompletions,
        selectedSchoolForCompletions // Pass the selected school
      )
      .then(data => {
        console.log("Last Completions Data Received:", data); // Log the data to the console
        setLastCompletionsData(data);
      })
      .catch((err) => {
        console.error("Error fetching last completions:", err);
        setLastCompletionsError((err as Error).message || "Could not load last completions data.");
      })
      .finally(() => setIsLoadingLastCompletions(false));
    } else {
      // If any filter is missing, clear the existing data
      setLastCompletionsData([]);
      setIsLoadingLastCompletions(false);
    }
  }, [userProfile?.account, selectedAssignmentForCompletions, lastCompletionsPeriod, selectedSchoolForCompletions]); // Updated dependency array

  // 1) On mount, try to load saved coords:
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('weatherCoords');
    if (stored) {
      try {
        const { lat, lng } = JSON.parse(stored);
        setUserLat(lat);
        setUserLng(lng);
      } catch {
        localStorage.removeItem('weatherCoords');
      }
    }
  }, []);

  // 2) Your existing requestLocation, but now also persist:
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setWeatherError("Geolocation not supported by your browser.");
      return;
    }
    setIsLoadingWeather(true);
    setWeatherError(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLat(coords.latitude);
        setUserLng(coords.longitude);
        // **persist** so next load picks it up:
        localStorage.setItem(
          'weatherCoords',
          JSON.stringify({ lat: coords.latitude, lng: coords.longitude })
        );
      },
      (geoErr) => {
        console.error("Geolocation error:", geoErr);
        setWeatherError("Could not determine your location.");
        setIsLoadingWeather(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // 3) Fetch weather whenever coords change (unchanged):
  useEffect(() => {
    if (userLat == null || userLng == null) return;
    const load = async () => {
      setIsLoadingWeather(true);
      setWeatherError(null);
      try {
        const data = await fetchWeather(userLat, userLng);
        setWeatherData(data);
      } catch (err) {
        console.error("Weather fetch error:", err);
        setWeatherError("Could not fetch weather data.");
      } finally {
        setIsLoadingWeather(false);
      }
    };
    load();
  }, [userLat, userLng]);


  const renderLastCompletionsWidget = () => {
    
    // We will add pagination state and logic here in a future step
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 1;

    const itemsToDisplay = lastCompletionsData || [];
    
    // Pagination Logic
    const totalPages = Math.ceil(itemsToDisplay.length / itemsPerPage);
    const paginatedItems = itemsToDisplay.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    const handleNextPage = () => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    };

    const handlePrevPage = () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    };


    return (
      <>
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <Select
            value={selectedAssignmentForCompletions ?? ALL_ASSIGNMENTS_FILTER_KEY}
            onValueChange={(value) => {
              setSelectedAssignmentForCompletions(value === ALL_ASSIGNMENTS_FILTER_KEY ? null : value);
              setCurrentPage(1); // Reset to first page on filter change
            }}
            disabled={isLoadingLastCompletions}
          >
            <SelectTrigger className="flex-grow min-w-[150px]">
              <SelectValue placeholder="Select Assignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Assignments</SelectLabel>
                <SelectItem value={ALL_ASSIGNMENTS_FILTER_KEY}>All Assignments</SelectItem>
                {lastCompletionsAssignments.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.assessmentName}</SelectItem>
                ))}
                {lastCompletionsAssignments.length === 0 && !isLoadingLastCompletions && (
                  <SelectItem value="no-specific-assignments-available" disabled>
                    No specific assignments available
                  </SelectItem>
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={selectedSchoolForCompletions || ''}
            onValueChange={(value) => {
              setSelectedSchoolForCompletions(value);
              setCurrentPage(1); // Reset page on new selection
            }}
            disabled={isLoadingLastCompletions || locations.length === 0}
          >
            <SelectTrigger className="flex-grow min-w-[150px]">
              <SelectValue placeholder="Select School" />
            </SelectTrigger>
            <SelectContent>
              {locations.length > 0 ? (
                locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.locationName}>
                    {loc.locationName}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-locations" disabled>
                  No locations available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={lastCompletionsPeriod} onValueChange={(value) => { setLastCompletionsPeriod(value); setCurrentPage(1); }} disabled={isLoadingLastCompletions}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Select period..." /></SelectTrigger>
            <SelectContent>
              {COMPLETION_PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoadingLastCompletions && (
          <div className="space-y-2 mt-2">
            {[...Array(itemsPerPage)].map((_, i) => (
              <div key={`lc-skeleton-${i}`} className="flex items-center justify-between p-2 rounded-md">
                <div className="flex-grow space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        )}
        {lastCompletionsError && !isLoadingLastCompletions && (
            <Alert variant="destructive" className="flex-grow mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{lastCompletionsError}</AlertDescription>
            </Alert>
        )}
        {!isLoadingLastCompletions && !lastCompletionsError && itemsToDisplay.length === 0 && (
          <div className="flex-grow flex items-center justify-center h-48 xl:h-56">
            <p className="text-sm text-muted-foreground text-center">No completions found for this selection.</p>
          </div>
        )}
        {!isLoadingLastCompletions && !lastCompletionsError && itemsToDisplay.length > 0 && (
          <>
            <div className="mt-2 border rounded-md min-h-[210px]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Assignment</TableHead>
                            <TableHead>Completed By</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedItems.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium truncate max-w-[150px]">{item.assignmentId}</TableCell>
                                <TableCell className="truncate max-w-[120px]">{item.completedBy}</TableCell>
                                <TableCell>
                                  {item.submittedTimeServer && item.submittedTimeServer.toDate 
                                    ? formatDisplayDateShort(item.submittedTimeServer.toDate()) 
                                    : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/assignments/${item.assignmentId}/completions/${item.id}`}>View</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
             <div className="flex items-center justify-end space-x-2 py-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                >
                    Next
                </Button>
            </div>
           </>
        )}
      </>
    );
  };

 const renderStreakWidget = () => {
    if (isLoadingStreak) {
      return (
        <div className="space-y-3 p-4 text-center flex flex-col items-center justify-center h-full">
          <Skeleton className="h-6 w-3/4 mx-auto mb-3" />
          <div className="grid grid-cols-3 gap-2 mb-4 w-full max-w-xs">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center"><Skeleton className="h-4 w-10 mx-auto mb-1" /><Skeleton className="h-8 w-8 mx-auto" /></div>
            ))}
          </div>
          <Skeleton className="h-10 w-10 mx-auto mb-2" />
          <Skeleton className="h-4 w-20 mx-auto mb-1" />
          <Skeleton className="h-6 w-32 mx-auto" />
        </div>
      );
    }
    if (streakError) {
      return <Alert variant="destructive" className="m-2"><AlertCircle className="h-4 w-4" /><AlertTitle>Streak Error</AlertTitle><AlertDescription>{streakError}</AlertDescription></Alert>;
    }
    if (!streakData) {
      return <p className="text-sm text-muted-foreground text-center p-4">Streak data unavailable.</p>;
    }

    const { week, month, year, streak, streakMessage } = streakData;

    return (
      <div className="text-center p-2 flex flex-col h-full">
        <div> 
          <CardTitle className="text-xl font-semibold mb-3 text-foreground/90">Completion Trends</CardTitle>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">WEEK</p>
              <p className="text-2xl font-bold text-primary">{week || 0}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">MONTH</p>
              <p className="text-2xl font-bold text-primary">{month || 0}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">YEAR</p>
              <p className="text-2xl font-bold text-primary">{year || 0}</p>
            </div>
          </div>
        </div>
        <div className="flex-grow flex flex-col items-center justify-center"> 
          <Award className="h-10 w-10 text-amber-500 mb-1" />
          <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 flex items-center">
            {streak || 0}
            {(streak || 0) > 0 && <Flame className="inline-block h-7 w-7 ml-1 text-orange-500" />}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 italic h-6 flex items-center justify-center">
            {streakMessage || ((streak || 0) > 0 ? "Keep up the great work!" : "Let's get a streak going!")}
          </p>
        </div>
      </div>
    );
  };


  const renderCommonResponsesWidget = () => {
    return (
      <div className="space-y-3 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
           <Select value={selectedAssignmentForCommon || ""} onValueChange={setSelectedAssignmentForCommon} disabled={assignmentsForCommonResponses.length === 0 || isLoadingCommonResponses || isLoadingCommonResponsesAssignmentDetails}>
            <SelectTrigger className="flex-grow min-w-[150px]"><SelectValue placeholder="Select an assignment..." /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Assignments</SelectLabel>
                {assignmentsForCommonResponses.length > 0 ? assignmentsForCommonResponses.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.assessmentName}</SelectItem>
                )) : <SelectItem value="no-assign" disabled>No assignments found</SelectItem>}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={commonResponsesPeriod} onValueChange={setCommonResponsesPeriod} disabled={!selectedAssignmentForCommon || isLoadingCommonResponses || isLoadingCommonResponsesAssignmentDetails}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Select period..." /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {(isLoadingCommonResponses || isLoadingCommonResponsesAssignmentDetails) && <Skeleton className="h-40 w-full flex-grow" />}
        {commonResponsesError && <Alert variant="destructive" className="flex-grow"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{commonResponsesError}</AlertDescription></Alert>}

        {commonResponsesData && commonResponsesAssignmentDetails && !isLoadingCommonResponses && !isLoadingCommonResponsesAssignmentDetails && !commonResponsesError && (
          <ScrollArea className="h-48 xl:h-56 pr-2 flex-grow">
            {Object.keys(commonResponsesData).length > 0 ? (
              Object.entries(commonResponsesData).map(([locationName, questions]) => (
                <div key={locationName} className="mb-3 p-2 border rounded">
                  <h4 className="font-semibold text-xs text-muted-foreground mb-1">{locationName === "undefined" || locationName === "null" ? "Overall / Unspecified Location" : locationName}</h4>
                  {Object.entries(questions).map(([questionId, answerData]) => {
                    const questionDetail = commonResponsesAssignmentDetails.questions.find(q => q.id === questionId);
                    if (questionDetail && questionDetail.component === 'schoolSelector') {
                        return null;
                    }
                    return (
                      <div key={questionId} className="text-xs mb-1 ml-2">
                        <p className="font-medium truncate italic">{answerData.questionLabel || `Q: ${questionId}`}</p>
                        <ul className="list-disc list-inside ml-3 text-muted-foreground/80">
                          {Object.entries(answerData)
                              .filter(([key]) => key !== 'questionLabel')
                              .sort(([, aVal], [, bVal]) => (bVal as number) - (aVal as number))
                              .slice(0, 3)
                              .map(([answer, count]) => (
                                <li key={answer} className="truncate">{answer || "N/A"}: {count}</li>
                           ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ))
            ) : ( <p className="text-sm text-muted-foreground text-center py-4">No common response data found for this selection.</p> )}
          </ScrollArea>
        )}
        {(!selectedAssignmentForCommon || (!commonResponsesData && !isLoadingCommonResponses && !isLoadingCommonResponsesAssignmentDetails && !commonResponsesAssignmentDetails)) && !commonResponsesError && (
            <div className="flex-grow flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">{isLoadingCommonResponsesAssignmentDetails || isLoadingCommonResponses ? "Loading data..." : "Select an assignment to view common responses."}</p>
            </div>
        )}
      </div>
    );
  };

 // --- New Weather Widget Card ---
 const renderWeatherWidget = () => {
  if (!userLat || !userLng) {
    return (
      <Card className="h-full flex flex-col justify-center items-center p-4 text-center">
        {weatherError ? (
          <>
            <Alert variant="warning">
              <Info className="h-4 w-4" />
              <AlertTitle>Location Needed</AlertTitle>
              <AlertDescription>{weatherError}</AlertDescription>
            </Alert>
            <Button onClick={requestLocation} className="mt-4">Enable Location</Button>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <CardDescription>Please enable location services to fetch weather.</CardDescription>
            <Button onClick={requestLocation} className="mt-4">Enable Location</Button>
          </>
        )}
      </Card>
    );
  }

  if (isLoadingWeather && (!weatherData && !weatherError)) {
    return <Card className="h-full flex flex-col justify-center items-center p-4"><Skeleton className="h-32 w-full"/></Card>;
  }

  if (weatherError && !isLoadingWeather) {
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Weather Error</AlertTitle><AlertDescription>{weatherError}</AlertDescription></Alert>;
  }

  if (!weatherData?.current) {
    return <p className="text-sm text-muted-foreground text-center p-4">Weather data unavailable.</p>;
  }

  const current = weatherData.current;
  const weather = current.weather?.[0];
  const sunrise = new Date(current.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sunset = new Date(current.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Card className="h-full flex flex-col justify-between p-4">
      <div className="flex items-center gap-4 mb-2">
        {weather ? getWeatherIcon(weather.id) : <Cloud className="h-10 w-10 text-blue-400" />}
        <div>
          <CardTitle className="text-3xl">{Math.round(current.temp)}°F</CardTitle>
          <CardDescription className="capitalize">{weather?.description || 'N/A'}</CardDescription>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
        <div className="flex items-center gap-1"><Thermometer className="h-4 w-4" /> Feels like: {Math.round(current.feels_like)}°F</div>
        <div className="flex items-center gap-1"><Droplets className="h-4 w-4" /> Humidity: {current.humidity}%</div>
        <div className="flex items-center gap-1"><Wind className="h-4 w-4" /> Wind: {Math.round(current.wind_speed)} mph</div>
        <div className="flex items-center gap-1"><Sun className="h-4 w-4" /> UV Index: {current.uvi}</div>
        <div className="flex items-center gap-1"><Sunrise className="h-4 w-4" /> Sunrise: {sunrise}</div>
        <div className="flex items-center gap-1"><Sunset className="h-4 w-4" /> Sunset: {sunset}</div>
      </div>

      {weatherData?.daily?.length >= 5 && (
        <div className="border-t pt-3">
          <h5 className="text-xs font-semibold mb-2">5-Day Forecast</h5>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {weatherData.daily.slice(1, 6).map((day, index) => (
              <div key={index} className="flex flex-col items-center">
                <p>{new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                {day.weather?.[0] && getWeatherIcon(day.weather[0].id)}
                <p>{Math.round(day.temp.day)}°</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};




  return (
    <div className="space-y-6">
      {isClientMounted ? (
        <motion.div
          className="mb-6 p-8 rounded-lg shadow-xl text-center relative overflow-hidden bg-card"
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ 
              backgroundImage: isPhotoHeavyTheme && heroImageUrl ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${heroImageUrl})` : undefined,
              backgroundColor: !isPhotoHeavyTheme ? 'hsl(var(--card))' : undefined,
            }}
            whileHover={isPhotoHeavyTheme && heroImageUrl ? { scale: 1.03, transition: { duration: 0.4, ease: "circOut" } } : {}}
          />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-center text-left sm:text-left">
                <div className="flex-1 mb-4 sm:mb-0">
                    <motion.h1
                    variants={heroTextVariants}
                    className={`text-4xl sm:text-5xl font-bold tracking-tight ${isPhotoHeavyTheme && heroImageUrl ? 'text-white drop-shadow-md' : 'text-foreground'}`}
                    >
                    Welcome to EagleEyED™
                    </motion.h1>
                    <motion.p variants={heroTextVariants} className={`text-lg sm:text-xl mt-2 max-w-3xl ${isPhotoHeavyTheme && heroImageUrl ? 'text-gray-200 drop-shadow-sm' : 'text-muted-foreground'}`}>
                    Your central hub for campus safety management.
                    </motion.p>
                </div>
                <div className="flex gap-2 sm:ml-6 shrink-0 mt-4 sm:mt-0">
                    <Button variant={(isPhotoHeavyTheme && heroImageUrl) ? "secondary" : "outline"} asChild size="lg">
                        <Link href="/assessment-forms">
                            <ListOrdered className="mr-2 h-5 w-5" /> View Tasks
                        </Link>
                    </Button>
                    <Button variant={(isPhotoHeavyTheme && heroImageUrl) ? "default" : "default"} asChild size="lg">
                        <Link href="/assessment-forms/new">
                            <Edit3 className="mr-2 h-5 w-5" /> New Assessment
                        </Link>
                    </Button>
                </div>
            </div>
          </div>
        </motion.div>
      ) : (
         <div className="mb-6 p-8 rounded-lg shadow-xl bg-card">
            <Skeleton className="h-36 w-full" />
         </div>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={{index: 0, theme: resolvedTheme}}>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="h-5 w-5 text-primary"/>Last Completions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col space-y-3">
                {renderLastCompletionsWidget()}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={{index: 1, theme: resolvedTheme}}>
            <Card className="h-full flex flex-col">
                 <CardContent className="flex-grow flex items-center justify-center p-3 sm:p-4">
                    {renderStreakWidget()}
                </CardContent>
            </Card>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={{index: 2, theme: resolvedTheme}}>
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Filter className="h-5 w-5 text-primary"/>Common Responses
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">{renderCommonResponsesWidget()}</CardContent>
            </Card>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={{index: 3, theme: resolvedTheme}}>
            <CriticalTasksCard />
        </motion.div>
         <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={{index: 4, theme: resolvedTheme}}>
            <UpcomingEventsCard />
        </motion.div>
         <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={{index: 5, theme: resolvedTheme}}>
            <EmergencyProtocolsCard />
        </motion.div>
      </div>
      
      {/* New Weather Widget Card */}
      <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={{index: 6, theme: resolvedTheme}}>
          <Card className="h-full flex flex-col">
              {renderWeatherWidget()}
          </Card>
      </motion.div>


      <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={{index: 6, theme: resolvedTheme}}>
        <Card className="col-span-1 xl:col-span-3">
            <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
                <Newspaper className="h-5 w-5 text-primary" /> School Security News
            </CardTitle>
            <CardDescription>Latest updates relevant to K-12 school security and cybersecurity.</CardDescription>
            </CardHeader>
            <CardContent>
            {newsLoading && (
                <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start space-x-3 p-2 rounded-md">
                    <Skeleton className="h-16 w-24 rounded" />
                    <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-1/4" />
                    </div>
                    </div>
                ))}
                </div>
            )}
            {newsError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>News Error</AlertTitle><AlertDescription>{newsError}</AlertDescription></Alert>}
            {!newsLoading && !newsError && newsItems.length > 0 && (
                <ul className="space-y-3">
                {newsItems.map((item) => (
                    <li key={item.guid} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <h3 className="font-semibold mb-1 text-sm leading-tight">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: item.description.replace(/<img[^>]*>/g,"") }}/>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">{formatDisplayDateShort(item.pubDate)}</span>
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => setSelectedNewsItem(item)}>
                                Read More
                            </Button>
                        </div>
                    </li>
                ))}
                </ul>
            )}
            </CardContent>
        </Card>
      </motion.div>


      <Dialog open={!!selectedNewsItem} onOpenChange={(open) => !open && setSelectedNewsItem(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl line-clamp-2">{selectedNewsItem?.title}</DialogTitle>
            <DialogDescription>
              {selectedNewsItem?.pubDate && new Date(selectedNewsItem.pubDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: selectedNewsItem?.content || selectedNewsItem?.description || "" }}
            />
          </ScrollArea>
           <CardFooter className="mt-4">
            <Button variant="outline" asChild>
              <a href={selectedNewsItem?.link} target="_blank" rel="noopener noreferrer">
                Read Full Article <ExternalLink className="ml-2 h-4 w-4"/>
              </a>
            </Button>
          </CardFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

