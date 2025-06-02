
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CalendarDays,
  CloudSun,
  Newspaper,
  ShieldAlert,
  ListChecks,
  Edit3,
  FileText,
  ExternalLink,
  Info,
  Thermometer,
  Sunrise,
  Sunset,
  Activity,
  TrendingUp,
  Filter,
  AlertCircle,
  Loader2, 
} from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import {
  getWeatherAndLocation,
  type WeatherLocationData,
  getAssignmentListMetadata,
  getAssignmentById, 
  type AssignmentMetadata,
  type AssignmentWithPermissions,
} from "@/services/assignmentFunctionsService";
import {
  getDashboardWidgetsSandbox,
  getCommonResponsesForAssignment,
} from "@/services/analysisService";
import type {
  WidgetSandboxData,
  SchoolsWithQuestionsResponse,
  UserActivity, 
  AssignmentCompletionStatus, 
} from "@/types/Analysis";
import { fetchPexelsImageURL } from "@/services/pexelsService";
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
  // DialogTrigger, // Removed as per user request
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
import { useTheme } from "next-themes";
import { formatDisplayDateShort } from "@/lib/utils";

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

const sanitizeHTML = (htmlString: string): string => {
  if (typeof document !== "undefined") {
    const doc = new DOMParser().parseFromString(htmlString, "text/html");
    return doc.body.textContent || "";
  }
  return htmlString.replace(/<[^>]+>/g, "");
};

const formatTime = (unixTimestamp?: number): string => {
  if (!unixTimestamp) return "N/A";
  try {
    const date = new Date(unixTimestamp * 1000);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (e) {
    return "N/A";
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeInOut",
    },
  }),
};

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

export default function DashboardPage() {
  const { userProfile, loading: authLoading, profileLoading } = useAuth(); 
  const { resolvedTheme } = useTheme();
  const [weatherData, setWeatherData] = useState<WeatherLocationData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItem | null>(null);

  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);

  const [widgetData, setWidgetData] = useState<WidgetSandboxData | null>(null);
  const [isLoadingWidgets, setIsLoadingWidgets] = useState(true);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  const [assignmentsForCommonResponses, setAssignmentsForCommonResponses] = useState<AssignmentMetadata[]>([]);
  const [selectedAssignmentForCommon, setSelectedAssignmentForCommon] = useState<string | null>(null);
  const [commonResponsesAssignmentDetails, setCommonResponsesAssignmentDetails] = useState<AssignmentWithPermissions | null>(null);
  const [isLoadingCommonResponsesAssignmentDetails, setIsLoadingCommonResponsesAssignmentDetails] = useState(false);
  const [commonResponsesData, setCommonResponsesData] = useState<SchoolsWithQuestionsResponse | null>(null);
  const [isLoadingCommonResponses, setIsLoadingCommonResponses] = useState(false);
  const [commonResponsesError, setCommonResponsesError] = useState<string | null>(null);
  const [commonResponsesPeriod, setCommonResponsesPeriod] = useState("last30days");

  const isAdmin = !profileLoading && userProfile && (userProfile.permission === 'admin' || userProfile.permission === 'superAdmin');


  useEffect(() => {
    setIsClientMounted(true);
    if (process.env.NEXT_PUBLIC_PEXEL_API_KEY) {
      fetchPexelsImageURL("modern campus security technology", "landscape")
        .then(setHeroImageUrl)
    }
  }, []);

  useEffect(() => {
    const fetchWeatherData = () => {
      if (!isClientMounted || !navigator.geolocation) {
        if (isClientMounted) setWeatherError("Geolocation is not supported by your browser.");
        setWeatherLoading(false);
        return;
      }
      if (userProfile === undefined || authLoading || profileLoading) return;
      if (!userProfile?.account) {
        if (userProfile !== null) {
          setWeatherError("User account information not available for weather data.");
        }
        setWeatherLoading(false);
        return;
      }
      setWeatherLoading(true);
      setWeatherError(null);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const data = await getWeatherAndLocation(
              position.coords.latitude,
              position.coords.longitude,
              userProfile.account
            );
            setWeatherData(data);
          } catch (err) {
            setWeatherError(err instanceof Error ? err.message : "Failed to fetch weather data.");
          } finally {
            setWeatherLoading(false);
          }
        },
        (error) => {
          setWeatherError(`Geolocation error: ${error.message}. Please enable location services.`);
          setWeatherLoading(false);
        }
      );
    };
    if (isClientMounted) {
      fetchWeatherData();
    }
  }, [userProfile, isClientMounted, authLoading, profileLoading]);

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
    if (userProfile?.account && isClientMounted && !authLoading && !profileLoading) {
      setIsLoadingWidgets(true);
      setWidgetError(null);
      getDashboardWidgetsSandbox(userProfile.account)
        .then(setWidgetData)
        .catch((err) => {
          console.error("Error fetching widget data:", err);
          setWidgetError((err as Error).message || "Could not load dashboard widgets.");
        })
        .finally(() => setIsLoadingWidgets(false));
    }
  }, [userProfile?.account, isClientMounted, authLoading, profileLoading]);

  useEffect(() => {
    if (userProfile?.account && isClientMounted && !authLoading && !profileLoading) {
      getAssignmentListMetadata(userProfile.account)
        .then((data) => {
          setAssignmentsForCommonResponses(data || []);
          if (data && data.length > 0 && !selectedAssignmentForCommon) {
            setSelectedAssignmentForCommon(data[0].id);
          }
        })
        .catch((err) => console.error("Error fetching assignment list:", err));
    }
  }, [userProfile?.account, isClientMounted, authLoading, profileLoading, selectedAssignmentForCommon]);

   useEffect(() => {
    if (userProfile?.account && selectedAssignmentForCommon && isClientMounted && !authLoading && !profileLoading) {
      setIsLoadingCommonResponsesAssignmentDetails(true);
      setCommonResponsesAssignmentDetails(null); 
      getAssignmentById(selectedAssignmentForCommon, userProfile.account)
        .then(setCommonResponsesAssignmentDetails)
        .catch((err) => {
          console.error("Error fetching assignment details for common responses:", err);
        })
        .finally(() => setIsLoadingCommonResponsesAssignmentDetails(false));
    }
  }, [userProfile?.account, selectedAssignmentForCommon, isClientMounted, authLoading, profileLoading]);


  useEffect(() => {
    if (
      userProfile?.account &&
      selectedAssignmentForCommon &&
      commonResponsesPeriod &&
      isClientMounted && !authLoading && !profileLoading
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
    authLoading, profileLoading
  ]);

  const renderLastCompletionsWidget = () => {
    if (isLoadingWidgets) return <Skeleton className="h-48 w-full" />;
    if (widgetError) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{widgetError}</AlertDescription></Alert>;
    
    const itemsToDisplay = isAdmin ? widgetData?.accountCompletions : widgetData?.userActivity;
    if (!itemsToDisplay || itemsToDisplay.length === 0) return <p className="text-sm text-muted-foreground">No recent activity.</p>;

    return (
      <ScrollArea className="h-60">
        <ul className="space-y-2 pr-3">
          {itemsToDisplay.map((item: UserActivity | AssignmentCompletionStatus) => (
            <li key={item.id} className="p-3 border rounded-md hover:bg-muted/50">
              <p className="font-medium text-sm truncate">{item.assessmentName}</p>
              {isAdmin && 'totalCompleted' in item ? (
                <p className="text-xs text-muted-foreground">
                  {item.totalCompleted}/{item.totalAssigned} completed. Last: {formatDisplayDateShort(item.lastCompletionDate)}
                </p>
              ) : ('status' in item &&
                <p className="text-xs text-muted-foreground">
                  Status: <span className={`font-semibold ${item.status === 'completed' ? 'text-green-600' : item.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>{item.status}</span>. 
                  {item.completedDate ? ` Completed: ${formatDisplayDateShort(item.completedDate)}` : ` Due: ${formatDisplayDateShort(item.dueDate)}`}
                </p>
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>
    );
  };

  const renderStreakWidget = () => (
    <div className="text-center">
      <TrendingUp className="h-16 w-16 text-primary mx-auto mb-2" />
      <p className="text-3xl font-bold">Coming Soon</p>
      <p className="text-sm text-muted-foreground mt-1">Track your assignment completion streak. (Backend support needed)</p>
    </div>
  );

  const renderCommonResponsesWidget = () => {
    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
           <Select value={selectedAssignmentForCommon || ""} onValueChange={setSelectedAssignmentForCommon} disabled={assignmentsForCommonResponses.length === 0 || isLoadingCommonResponses || isLoadingCommonResponsesAssignmentDetails}>
            <SelectTrigger className="flex-grow"><SelectValue placeholder="Select an assignment..." /></SelectTrigger>
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

        {(isLoadingCommonResponses || isLoadingCommonResponsesAssignmentDetails) && <Skeleton className="h-40 w-full" />}
        {commonResponsesError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{commonResponsesError}</AlertDescription></Alert>}
        
        {commonResponsesData && commonResponsesAssignmentDetails && !isLoadingCommonResponses && !isLoadingCommonResponsesAssignmentDetails && !commonResponsesError && (
          <ScrollArea className="h-60 pr-2">
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
        {(!selectedAssignmentForCommon || (!commonResponsesData && !isLoadingCommonResponses && !isLoadingCommonResponsesAssignmentDetails)) && <p className="text-sm text-muted-foreground text-center">{isLoadingCommonResponsesAssignmentDetails || isLoadingCommonResponses ? "Loading data..." : "Select an assignment to view common responses."}</p>}
      </div>
    );
  };


  return (
    <div className="space-y-6">
      <motion.div
        variants={heroContainerVariants}
        initial="hidden"
        animate={isClientMounted ? "visible" : "hidden"}
        className="w-full rounded-2xl overflow-hidden relative min-h-[150px] bg-gradient-to-br from-primary/70 to-accent/70"
        style={{ 
          backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
        data-ai-hint="campus security technology"
      >
        <div className={`relative z-10 p-6 sm:p-8 md:p-10 rounded-2xl text-white ${!heroImageUrl ? '' : 'bg-black/50 backdrop-blur-sm'}`}>
          <motion.h1
            variants={heroTextVariants}
            className="text-3xl sm:text-4xl font-bold tracking-tight"
          >
            Welcome back, {userProfile?.displayName || userProfile?.name || "User"}!
          </motion.h1>
          <motion.p variants={heroTextVariants} className="text-base sm:text-lg mt-2 max-w-2xl">
            Here’s your campus safety overview and actionable insights for today.
          </motion.p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={0}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CloudSun className="h-5 w-5 text-primary" /> Local Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weatherLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : weatherError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Weather Error</AlertTitle>
                  <AlertDescription>{weatherError}</AlertDescription>
                </Alert>
              ) : weatherData ? (
                <div className="space-y-1">
                  <div className="text-lg font-semibold">
                    {weatherData.name || "Location unavailable"}
                  </div>
                  <div className="text-3xl">
                    {weatherData.current?.temp !== undefined ? `${Math.round(weatherData.current.temp)}°F` : "N/A"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {weatherData.current?.feels_like !== undefined ? `Feels like ${Math.round(weatherData.current.feels_like)}°F` : ""}
                    {weatherData.current?.feels_like !== undefined && weatherData.current?.weather?.[0]?.description ? " — " : ""}
                    {weatherData.current?.weather?.[0]?.description || (weatherData.current?.feels_like === undefined && weatherData.current?.temp === undefined ? "Weather conditions unavailable" : "")}
                  </div>
                  <div className="flex gap-2 text-xs mt-2 items-center">
                    <Sunrise size={14} /> <span>{formatTime(weatherData.current?.sunrise)}</span>
                    <Sunset size={14} /> <span>{formatTime(weatherData.current?.sunset)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Weather data unavailable.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={1}>
          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Newspaper className="h-5 w-5 text-primary" /> School Security News
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              {newsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : newsError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>News Error</AlertTitle>
                  <AlertDescription>{newsError}</AlertDescription>
                </Alert>
              ) : newsItems.length > 0 ? (
                <ScrollArea className="h-48">
                  <ul className="space-y-2 pr-3">
                    {newsItems.map((item) => (
                      <li key={item.guid} className="p-2 border-b border-border/50 last:border-b-0">
                        <button
                          onClick={() => setSelectedNewsItem(item)}
                          className="text-left hover:text-primary transition-colors w-full"
                        >
                          <h3 className="font-medium text-sm line-clamp-2">{item.title}</h3>
                          <p className="text-xs text-muted-foreground">{new Date(item.pubDate).toLocaleDateString()}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">No news articles found.</p>
              )}
            </CardContent>
            {newsItems.length > 0 && (
                 <CardFooter className="mt-auto">
                    <a href="https://news.google.com/search?q=K-12+school+security" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        View more on Google News <ExternalLink className="inline h-3 w-3 ml-1"/>
                    </a>
                </CardFooter>
            )}
          </Card>
        </motion.div>
        
        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={2}>
          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldAlert className="h-5 w-5 text-primary" /> Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground">No critical alerts at this time.</p>
            </CardContent>
             <CardFooter>
                <Button variant="outline" size="sm">View Alert History</Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={3}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Activity className="h-5 w-5 text-primary"/>Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>{renderLastCompletionsWidget()}</CardContent>
            </Card>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={4}>
            <Card className="flex flex-col justify-center items-center min-h-[200px] h-full"> 
                <CardHeader className="pb-2 pt-4">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <TrendingUp className="h-5 w-5 text-primary"/>Completion Streak
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                    {renderStreakWidget()}
                </CardContent>
            </Card>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate={isClientMounted ? "visible" : "hidden"} custom={5}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <ListChecks className="h-5 w-5 text-primary"/>Common Responses
                    </CardTitle>
                </CardHeader>
                <CardContent>{renderCommonResponsesWidget()}</CardContent>
            </Card>
        </motion.div>

      </div>

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
        </DialogContent>
      </Dialog>

    </div>
  );
}

