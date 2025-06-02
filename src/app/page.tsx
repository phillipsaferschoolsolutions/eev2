
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarDays, CloudSun, Newspaper, ShieldAlert, ListChecks, Edit3, FileText, ExternalLink, Info, Thermometer, Sunrise, Sunset, Activity, TrendingUp, Filter, AlertCircle } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { getWeatherAndLocation, type WeatherLocationData } from "@/services/assignmentFunctionsService";
import { getDashboardWidgetsSandbox, getCommonResponsesForAssignment } from "@/services/analysisService";
import type { WidgetSandboxData, UserActivity, AssignmentCompletionStatus, SchoolsWithQuestionsResponse } from "@/types/Analysis";
import { getAssignmentListMetadata, type AssignmentMetadata, getAssignmentById, type AssignmentWithPermissions } from "@/services/assignmentFunctionsService";
import { fetchPexelsImageURL } from "@/services/pexelsService";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { formatDisplayDateShort } from "@/lib/utils";

const GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search?q=K-12+school+security+OR+school+cybersecurity&hl=en-US&gl=US&ceid=US:en";
const RSS2JSON_API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(GOOGLE_NEWS_RSS_URL)}`;

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
  if (typeof document !== 'undefined') {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
  }
  return htmlString.replace(/<[^>]+>/g, '');
};

const formatTime = (unixTimestamp?: number): string => {
  if (!unixTimestamp) return 'N/A';
  return new Date(unixTimestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
    height: 'auto',
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
  const { userProfile } = useAuth();
  const { resolvedTheme } = useTheme();
  const [weatherData, setWeatherData] = useState<WeatherLocationData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItem | null>(null);

  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroImageLoading, setHeroImageLoading] = useState(false);
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

  const isAdmin = userProfile && (userProfile.permission === 'admin' || userProfile.permission === 'superAdmin');

  useEffect(() => {
    setIsClientMounted(true);
  }, []);


  useEffect(() => {
    const fetchWeatherData = () => {
      if (!isClientMounted || !navigator.geolocation) {
        if (isClientMounted) setWeatherError("Geolocation is not supported by your browser.");
        setWeatherLoading(false);
        return;
      }
      if (userProfile === undefined) return; 

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
  }, [userProfile, isClientMounted]);

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
    if (isClientMounted && resolvedTheme === 'theme-innovation-hub') {
      setHeroImageLoading(true);
      fetchPexelsImageURL("abstract technology future dark blue", "landscape")
        .then(url => {
          setHeroImageUrl(url);
          setHeroImageLoading(false);
        })
        .catch(err => {
          console.error("Failed to load hero image for Innovation Hub:", err);
          setHeroImageLoading(false);
        });
    } else {
      setHeroImageUrl(null); 
    }
  }, [resolvedTheme, isClientMounted]);

  useEffect(() => {
    if (userProfile?.account && isClientMounted) {
      setIsLoadingWidgets(true);
      setWidgetError(null);
      getDashboardWidgetsSandbox(userProfile.account)
        .then(setWidgetData)
        .catch(err => {
          console.error("Error fetching widget data:", err);
          setWidgetError((err as Error).message || "Could not load dashboard widgets.");
        })
        .finally(() => setIsLoadingWidgets(false));
    }
  }, [userProfile?.account, isClientMounted]);

  useEffect(() => {
    if (userProfile?.account && isClientMounted) {
      getAssignmentListMetadata(userProfile.account)
        .then(data => {
          setAssignmentsForCommonResponses(data || []);
          if (data && data.length > 0 && !selectedAssignmentForCommon) {
            setSelectedAssignmentForCommon(data[0].id);
          }
        })
        .catch(err => console.error("Error fetching assignment list for common responses:", err));
    }
  }, [userProfile?.account, isClientMounted, selectedAssignmentForCommon]);

  // Fetch Assignment Details for Common Responses Widget
  useEffect(() => {
    if (userProfile?.account && selectedAssignmentForCommon && isClientMounted) {
      setIsLoadingCommonResponsesAssignmentDetails(true);
      setCommonResponsesAssignmentDetails(null); // Reset previous details
      getAssignmentById(selectedAssignmentForCommon, userProfile.account)
        .then(setCommonResponsesAssignmentDetails)
        .catch(err => {
          console.error("Error fetching assignment details for common responses:", err);
          // Optionally set an error state for assignment details
        })
        .finally(() => setIsLoadingCommonResponsesAssignmentDetails(false));
    }
  }, [userProfile?.account, selectedAssignmentForCommon, isClientMounted]);

  useEffect(() => {
    if (userProfile?.account && selectedAssignmentForCommon && commonResponsesPeriod && isClientMounted) {
      setIsLoadingCommonResponses(true);
      setCommonResponsesError(null);
      setCommonResponsesData(null);
      getCommonResponsesForAssignment(selectedAssignmentForCommon, commonResponsesPeriod, userProfile.account)
        .then(setCommonResponsesData)
        .catch(err => {
          console.error("Error fetching common responses:", err);
          setCommonResponsesError((err as Error).message || "Could not load common response data.");
        })
        .finally(() => setIsLoadingCommonResponses(false));
    }
  }, [userProfile?.account, selectedAssignmentForCommon, commonResponsesPeriod, isClientMounted]);


  const dashboardCards = [
    { id: "tasks", title: "Critical Tasks", description: "High-priority items needing immediate attention.", icon: AlertTriangle, color: "text-destructive", content: <ul className="space-y-3"> <li className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"><span>Inspect broken fence near West Gate</span><Button variant="ghost" size="sm">Details</Button></li> <li className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"><span>Review fire drill report</span><Button variant="ghost" size="sm">Details</Button></li> <li className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"><span>Restock first-aid kit - Gym</span><Button variant="ghost" size="sm">Details</Button></li> </ul>, footer: <Button variant="outline" className="w-full">View All Critical Tasks</Button> },
    { id: "events", title: "Upcoming Events & Drills", description: "Scheduled safety events and drills.", icon: CalendarDays, color: "text-primary", content: <ul className="space-y-3"> <li className="p-2 rounded-md"><strong>Campus Safety Workshop:</strong> Tomorrow, 10 AM</li> <li className="p-2 rounded-md"><strong>Fire Drill (Block B):</strong> Oct 28, 2 PM</li> <li className="p-2 rounded-md"><strong>Security Team Meeting:</strong> Nov 2, 9 AM</li> </ul>, footer: <Button variant="outline" className="w-full">View Calendar</Button> },
    { id: "protocols", title: "Emergency Protocols", description: "Quick actions for emergency situations.", icon: ShieldAlert, color: "text-accent", content: <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1"> <Button variant="destructive" className="w-full justify-start text-base p-3"><ShieldAlert className="mr-2 h-5 w-5" /> Initiate Lockdown</Button> <Button variant="outline" className="w-full justify-start text-base p-3"><FileText className="mr-2 h-5 w-5" /> Report Incident</Button> <Button variant="secondary" className="w-full justify-start text-base p-3"><Newspaper className="mr-2 h-5 w-5" /> Send Alert</Button> </div>, footer: null },
  ];

  const renderLastCompletionsWidget = () => {
    if (!isClientMounted || isLoadingWidgets) return <Skeleton className="h-48 w-full" />;
    if (widgetError) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{widgetError}</AlertDescription></Alert>;
    
    const itemsToDisplay = isAdmin ? widgetData?.accountCompletions : widgetData?.userActivity;
    if (!itemsToDisplay || itemsToDisplay.length === 0) return <p className="text-sm text-muted-foreground p-4 text-center">No recent activity.</p>;

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
    <div className="text-center p-4 flex flex-col items-center justify-center h-full">
      <TrendingUp className="h-16 w-16 text-primary mx-auto mb-2" />
      <p className="text-3xl font-bold">Coming Soon</p>
      <p className="text-sm text-muted-foreground mt-1">Track your assignment completion streak. (Backend support needed)</p>
    </div>
  );

  const renderCommonResponsesWidget = () => {
    if (!isClientMounted) return <Skeleton className="h-64 w-full" />;
    return (
      <div className="space-y-3 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row gap-2">
           <Select value={selectedAssignmentForCommon || ""} onValueChange={setSelectedAssignmentForCommon}>
            <SelectTrigger className="flex-grow"><SelectValue placeholder="Select assignment..." /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Assignments</SelectLabel>
                {assignmentsForCommonResponses.length > 0 ? assignmentsForCommonResponses.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.assessmentName}</SelectItem>
                )) : <SelectItem value="no-assign" disabled>No assignments</SelectItem>}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={commonResponsesPeriod} onValueChange={setCommonResponsesPeriod}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Select period..." /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {(isLoadingCommonResponses || isLoadingCommonResponsesAssignmentDetails) && <Skeleton className="h-40 w-full flex-grow" />}
        {commonResponsesError && <Alert variant="destructive" className="flex-grow"><AlertCircle className="h-4 w-4" /><AlertTitle>Error Loading Responses</AlertTitle><AlertDescription>{commonResponsesError}</AlertDescription></Alert>}
        
        {commonResponsesData && commonResponsesAssignmentDetails && !isLoadingCommonResponses && !isLoadingCommonResponsesAssignmentDetails && !commonResponsesError && (
          <ScrollArea className="h-60 pr-2 flex-grow">
            {Object.keys(commonResponsesData).length > 0 ? (
              Object.entries(commonResponsesData).map(([locationName, questions]) => (
                <div key={locationName} className="mb-3 p-2 border rounded">
                  <h4 className="font-semibold text-xs text-muted-foreground mb-1">{locationName === "undefined" || locationName === "null" ? "Overall / Unspecified" : locationName}</h4>
                  {Object.entries(questions).map(([questionId, answerData]) => {
                    const questionDetail = commonResponsesAssignmentDetails.questions.find(q => q.id === questionId);
                    if (questionDetail && questionDetail.component === 'schoolSelector') {
                      return null; // Skip rendering schoolSelector responses
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
            ) : ( <p className="text-sm text-muted-foreground text-center py-4">No common response data for selection.</p> )}
          </ScrollArea>
        )}
        {!selectedAssignmentForCommon && !isLoadingCommonResponses && !isLoadingCommonResponsesAssignmentDetails && <p className="text-sm text-muted-foreground text-center flex-grow flex items-center justify-center">Select an assignment.</p>}
      </div>
    );
  };


  return (
    <div className="space-y-6">
      {isClientMounted && resolvedTheme === 'theme-innovation-hub' && (
        <motion.div
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8 rounded-xl overflow-hidden shadow-2xl"
        >
          {heroImageLoading ? (
            <Skeleton className="h-64 md:h-80 w-full" />
          ) : heroImageUrl ? (
            <div className="relative h-64 md:h-80 w-full group">
              <Image
                src={heroImageUrl}
                fill
                style={{objectFit:"cover"}} 
                alt="Innovation Hub Hero Background"
                className="transition-transform duration-500 group-hover:scale-105"
                data-ai-hint="technology innovation abstract"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent flex flex-col items-center justify-end text-center p-6 md:p-10">
                <motion.h1
                  variants={heroTextVariants}
                  className="text-3xl md:text-5xl font-bold text-white mb-2 shadow-md"
                >
                  Innovate. Secure. Protect.
                </motion.h1>
                <motion.p
                  variants={heroTextVariants}
                  className="text-lg md:text-xl text-gray-200 mb-4 shadow-sm"
                >
                  Leveraging technology for a safer campus environment.
                </motion.p>
              </div>
            </div>
          ) : (
             <div className="h-64 md:h-80 w-full bg-gradient-to-br from-sky-700 to-indigo-800 flex flex-col items-center justify-center text-center p-6 md:p-10">
                <motion.h1 variants={heroTextVariants} className="text-3xl md:text-5xl font-bold text-white mb-2">Innovation Hub</motion.h1>
                <motion.p variants={heroTextVariants} className="text-lg md:text-xl text-gray-200">Advanced Safety Solutions.</motion.p>
            </div>
          )}
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to EagleEyED<sup>TM</sup></h1>
          <p className="text-muted-foreground">Your central hub for campus safety management.</p>
        </div>
        <div className="flex gap-2">
            <Button><ListChecks className="mr-2 h-4 w-4" /> View All Tasks</Button>
            <Button variant="outline"><Edit3 className="mr-2 h-4 w-4" /> New Assessment</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
            <Card className="h-full flex flex-col">
              <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary"/>Last Completions</CardTitle></CardHeader>
              <CardContent className="flex-grow">{renderLastCompletionsWidget()}</CardContent>
            </Card>
          </motion.div>
          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
            <Card className="h-full flex flex-col">
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500"/>Streak</CardTitle></CardHeader>
              <CardContent className="flex-grow">{renderStreakWidget()}</CardContent>
            </Card>
          </motion.div>
          <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
            <Card className="h-full flex flex-col">
              <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-purple-500"/>Common Responses</CardTitle></CardHeader>
              <CardContent className="flex-grow">{renderCommonResponsesWidget()}</CardContent>
            </Card>
          </motion.div>
      </div>


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dashboardCards.map((card, index) => (
          <motion.div key={card.id} custom={index + 3} variants={cardVariants} initial="hidden" animate="visible" className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                  {card.title}
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {card.content}
              </CardContent>
              {card.footer && <CardFooter>{card.footer}</CardFooter>}
            </Card>
          </motion.div>
        ))}

        <motion.div custom={dashboardCards.length + 3} variants={cardVariants} initial="hidden" animate="visible" className="md:col-span-2 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CloudSun className="h-6 w-6 text-yellow-500" />
                  Local Weather & News
                </CardTitle>
                <CardDescription>Stay informed about local conditions.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-2">Weather: {weatherData?.name || (weatherLoading ? "Loading..." : "Unavailable")}</h3>
                  {weatherLoading && isClientMounted ? (
                    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                        <div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div><Skeleton className="h-7 w-32 mb-1" /><Skeleton className="h-4 w-48" /></div></div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div>
                    </div>
                  ) : weatherError ? (
                    <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Weather Error</AlertTitle><AlertDescription>{weatherError}</AlertDescription></Alert>
                  ) : weatherData && weatherData.current && isClientMounted ? (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4"><CloudSun className="h-12 w-12 text-primary shrink-0" /><div><p className="text-2xl font-bold">{Math.round(weatherData.current.temp ?? 0)}°F, {weatherData.current.weather?.[0]?.description ?? 'N/A'}</p><p className="text-sm text-muted-foreground">Wind: {Math.round(weatherData.current.wind_speed ?? 0)}mph, Humidity: {weatherData.current.humidity ?? 0}%</p></div></div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center gap-1.5"><Thermometer className="h-4 w-4 text-muted-foreground shrink-0" /><span>Feels like: <strong>{Math.round(weatherData.current.feels_like ?? 0)}°F</strong></span></div>
                        <div className="flex items-center gap-1.5"><Info className="h-4 w-4 text-muted-foreground shrink-0" /><span>UV Index: <strong>{weatherData.current.uvi ?? 'N/A'}</strong></span></div>
                        <div className="flex items-center gap-1.5"><Sunrise className="h-4 w-4 text-muted-foreground shrink-0" /><span>Sunrise: <strong>{formatTime(weatherData.current.sunrise)}</strong></span></div>
                        <div className="flex items-center gap-1.5"><Sunset className="h-4 w-4 text-muted-foreground shrink-0" /><span>Sunset: <strong>{formatTime(weatherData.current.sunset)}</strong></span></div>
                      </div>
                    </div>
                  ) : isClientMounted ? ( <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">Weather data not available or incomplete. Ensure location services are enabled and an account is active.</p> 
                  ) : (
                    <Skeleton className="h-48 w-full" /> 
                  )}
                </div>
                <div>
                    <h3 className="font-semibold mb-2">Campus Safety News</h3>
                    {newsLoading ? ( <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                    ) : newsError ? ( <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>News Error</AlertTitle><AlertDescription>{newsError}</AlertDescription></Alert>
                    ) : newsItems.length > 0 ? (
                        <ScrollArea className="h-[200px] pr-3">
                            <ul className="space-y-2 text-sm">
                                {newsItems.map((item) => (
                                    <li key={item.guid} className="hover:bg-muted/50 p-2 rounded-md transition-colors">
                                        <Dialog onOpenChange={(open) => !open && setSelectedNewsItem(null)}>
                                            <DialogTrigger asChild><button className="text-left w-full" onClick={() => setSelectedNewsItem(item)}><span className="font-medium text-primary hover:underline block truncate">{item.title}</span><span className="text-xs text-muted-foreground">{new Date(item.pubDate).toLocaleDateString()}</span></button></DialogTrigger>
                                            {selectedNewsItem?.guid === item.guid && (
                                            <DialogContent className="sm:max-w-[625px]">
                                                <DialogHeader><DialogTitle>{selectedNewsItem.title}</DialogTitle><DialogDescription>Published: {new Date(selectedNewsItem.pubDate).toLocaleString()}</DialogDescription></DialogHeader>
                                                <ScrollArea className="max-h-[50vh] pr-4"><div className="text-sm text-muted-foreground py-4 whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedNewsItem.content || selectedNewsItem.description || "No content available.") }} /></ScrollArea>
                                                <DialogFooter><Button variant="outline" asChild><a href={selectedNewsItem.link} target="_blank" rel="noopener noreferrer">Read Full Article <ExternalLink className="ml-2 h-4 w-4" /></a></Button></DialogFooter>
                                            </DialogContent>
                                            )}
                                        </Dialog>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    ) : ( <p className="text-sm text-muted-foreground">No news articles found.</p> )}
                    <Button variant="link" className="mt-2 px-0" asChild><a href="https://news.google.com/search?q=K-12%20school%20security%20OR%20school%20cybersecurity&hl=en-US&gl=US&ceid=US%3Aen" target="_blank" rel="noopener noreferrer">View all on Google News <ExternalLink className="ml-1 h-3 w-3" /></a></Button>
                </div>
              </CardContent>
            </Card>
        </motion.div>
      </div>
    </div>
  );
}
