"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  getLastCompletions, 
  getWeatherAndLocation, 
  getAssignmentListMetadata,
  type WeatherLocationData,
  type AssignmentMetadata
} from "@/services/assignmentFunctionsService";
import { getDashboardWidgetsSandbox, getWidgetTrends } from "@/services/analysisService";
import { getLocationsForLookup, type Location } from "@/services/locationService";
import type { WidgetSandboxData, TrendsResponse } from "@/types/Analysis";
import { 
  Activity, 
  MapPin, 
  Thermometer, 
  Wind, 
  Droplets, 
  Eye, 
  Calendar, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Target,
  Zap,
  Sun,
  CloudRain,
  Cloud,
  Snowflake,
  Award,
  ListChecks,
  Bell,
  ShieldAlert
} from "lucide-react";
import { formatDisplayDateShort } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

interface CompletionItem {
  id: string;
  data: {
    assignmentId?: string;
    assessmentName?: string;
    completedBy: string;
    completionDate?: string;
    submittedTimeServer?: any;
    locationName?: string;
    status?: string;
    [key: string]: any;
  };
  parentAssignmentId?: string;
  assignmentId?: string; // Some API responses might include this at the top level
}

export default function DashboardPage() {
  const { user, userProfile, customClaims, loading: authLoading, profileLoading, claimsLoading } = useAuth();
  const { toast } = useToast();

  // Weather state
  const [weather, setWeather] = useState<WeatherLocationData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Widget data state
  const [widgetData, setWidgetData] = useState<WidgetSandboxData | null>(null);
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  // Trends data state
  const [trendsData, setTrendsData] = useState<TrendsResponse | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState<string | null>(null);

  // Last completions state
  const [lastCompletions, setLastCompletions] = useState<CompletionItem[]>([]);
  const [completionsLoading, setCompletionsLoading] = useState(false);
  const [completionsError, setCompletionsError] = useState<string | null>(null);

  // Filter states for last completions
  const [selectedAssignment, setSelectedAssignment] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("last30days");
  
  // Assignments and locations for dropdowns
  const [assignments, setAssignments] = useState<AssignmentMetadata[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  // Create a mapping of assignment IDs to names for quick lookup
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string>>({});

  const isAdmin = !profileLoading && userProfile && (userProfile.permission === 'admin' || userProfile.permission === 'superAdmin');

  // Fetch weather data based on user's location
  useEffect(() => {
    if (navigator.geolocation) {
      setWeatherLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const weatherData = await getWeatherAndLocation(latitude, longitude);
            setWeather(weatherData);
          } catch (error) {
            console.error("Error fetching weather:", error);
            setWeatherError("Could not load weather data");
          } finally {
            setWeatherLoading(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setWeatherError("Location access denied");
          setWeatherLoading(false);
        }
      );
    } else {
      setWeatherError("Geolocation not supported");
      setWeatherLoading(false);
    }
  }, []);

  // Fetch widget data
  useEffect(() => {
    if (!authLoading && !profileLoading && userProfile?.account) {
      setWidgetLoading(true);
      getDashboardWidgetsSandbox(userProfile.account)
        .then(data => {
          setWidgetData(data);
          setWidgetError(null);
        })
        .catch(err => {
          console.error("Error fetching widget data:", err);
          setWidgetError("Could not load activity data");
        })
        .finally(() => setWidgetLoading(false));
    }
  }, [userProfile?.account, authLoading, profileLoading]);

  // Fetch trends data
  useEffect(() => {
    if (!authLoading && !profileLoading && userProfile?.account) {
      setTrendsLoading(true);
      getWidgetTrends(userProfile.account)
        .then(data => {
          setTrendsData(data);
          setTrendsError(null);
        })
        .catch(err => {
          console.error("Error fetching trends data:", err);
          setTrendsError("Could not load trends data");
        })
        .finally(() => setTrendsLoading(false));
    }
  }, [userProfile?.account, authLoading, profileLoading]);

  // Fetch assignments for dropdown
  useEffect(() => {
    if (!authLoading && !profileLoading && userProfile?.account) {
      setIsLoadingAssignments(true);
      getAssignmentListMetadata()
        .then(data => {
          console.log("Fetched assignments:", data);
          setAssignments(data);
          
          // Create a mapping of assignment IDs to names for quick lookup
          const mapping: Record<string, string> = {};
          data.forEach(assignment => {
            if (assignment.id && assignment.assessmentName) {
              mapping[assignment.id] = assignment.assessmentName;
            }
          });
          setAssignmentMap(mapping);
          
          setAssignmentsError(null);
        })
        .catch(err => {
          console.error("Error fetching assignments:", err);
          setAssignmentsError("Could not load assignments");
        })
        .finally(() => setIsLoadingAssignments(false));
    }
  }, [userProfile?.account, authLoading, profileLoading]);

  // Fetch locations for dropdown
  useEffect(() => {
    if (!authLoading && !profileLoading && userProfile?.account) {
      setIsLoadingLocations(true);
      getLocationsForLookup(userProfile.account)
        .then(data => {
          console.log("Fetched locations:", data);
          setLocations(data);
          setLocationsError(null);
        })
        .catch(err => {
          console.error("Error fetching locations:", err);
          setLocationsError("Could not load locations");
        })
        .finally(() => setIsLoadingLocations(false));
    }
  }, [userProfile?.account, authLoading, profileLoading]);

  // Fetch last completions
  useEffect(() => {
    if (!authLoading && !profileLoading && userProfile?.account) {
      setCompletionsLoading(true);
      const assignmentFilter = selectedAssignment === "all" ? null : selectedAssignment;
      const schoolFilter = selectedSchool === "all" ? null : selectedSchool;
      
      getLastCompletions(userProfile.account, assignmentFilter, schoolFilter, selectedPeriod)
        .then(data => {
          console.log("Fetched completions:", data);
          
          // Process the data to extract assignment ID from the document path
          const processedData = (data || []).map((item: any) => {
            // Try to get assignmentId from various possible locations
            let parentAssignmentId = item.data?.assignmentId;
            
            if (!parentAssignmentId && item.assignmentId) {
              parentAssignmentId = item.assignmentId;
            }
            
            // If still no assignment ID, try to extract from path or use unknown
            if (!parentAssignmentId) {
              console.warn("No assignment ID found for completion:", item);
              parentAssignmentId = "unknown";
            }

            return {
              ...item,
              parentAssignmentId
            };
          });
          
          setLastCompletions(processedData);
          setCompletionsError(null);
        })
        .catch(err => {
          console.error("Error fetching last completions:", err);
          setCompletionsError("Could not load recent completions");
        })
        .finally(() => setCompletionsLoading(false));
    }
  }, [userProfile?.account, authLoading, profileLoading, selectedAssignment, selectedSchool, selectedPeriod]);

  const getWeatherIcon = (weather: WeatherLocationData) => {
    const condition = weather.current?.weather?.[0]?.description?.toLowerCase() || '';
    if (condition.includes('rain')) return <CloudRain className="h-5 w-5" />;
    if (condition.includes('cloud')) return <Cloud className="h-5 w-5" />;
    if (condition.includes('snow')) return <Snowflake className="h-5 w-5" />;
    return <Sun className="h-5 w-5" />;
  };

  // Function to get assignment name from either completion data or assignments list
  const getAssignmentName = (completion: CompletionItem): string => {
    // First check if assessmentName is directly in the completion data
    if (completion.data.assessmentName) {
      return completion.data.assessmentName;
    }
    
    // Next, check if we can find the name in our assignment map using parentAssignmentId
    if (completion.parentAssignmentId && assignmentMap[completion.parentAssignmentId]) {
      return assignmentMap[completion.parentAssignmentId];
    }
    
    // If not, try to find it in the assignments list using parentAssignmentId
    if (completion.parentAssignmentId && assignments.length > 0) {
      const matchingAssignment = assignments.find(a => a.id === completion.parentAssignmentId);
      if (matchingAssignment && matchingAssignment.assessmentName) {
        return matchingAssignment.assessmentName;
      }
    }
    
    // If still not found, return a default
    return 'Unknown Assignment';
  };

  if (authLoading || profileLoading || claimsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/3 mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription>
          Please log in to view your dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section with Pexels background */}
      <div className="relative rounded-lg overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to EagleEyED™
          </h1>
          <p className="text-white/90 mt-2 max-w-2xl">
            Your central hub for campus safety management.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <Button asChild variant="default" size="lg" className="bg-white text-blue-600 hover:bg-white/90 hover:text-blue-700">
              <Link href="/assessment-forms/new">
                New Assessment
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/40 text-white hover:bg-white/20 hover:text-white">
              <Link href="/map">
                <MapPin className="mr-2 h-4 w-4" /> View Campus Map
              </Link>
            </Button>
          </div>
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-700/80 z-0"></div>
        {/* Background image from Pexels */}
        <div className="absolute inset-0 z-[-1]">
          <Image 
            src="https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg" 
            alt="Campus background" 
            fill 
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Weather Widget */}
      <Card className="overflow-hidden rounded-lg border shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Current Conditions
          </CardTitle>
          {weather && getWeatherIcon(weather)}
        </CardHeader>
        <CardContent className="p-4 bg-gradient-to-b from-sky-50 to-white dark:from-sky-900/30 dark:to-background">
          {weatherLoading && <Skeleton className="h-6 w-32" />}
          {weatherError && <p className="text-sm text-muted-foreground">{weatherError}</p>}
          {weather && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Thermometer className="h-4 w-4 text-rose-500" />
                  <span className="text-2xl font-bold">
                    {Math.round(weather.current?.temp || weather.main?.temp || 0)}°F
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">
                    {Math.round(weather.current?.wind_speed || weather.wind?.speed || 0)} mph
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Droplets className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-muted-foreground">
                    {weather.current?.humidity || weather.main?.humidity || 0}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {weather.name} • {weather.current?.weather?.[0]?.description || 'Clear'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trends Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-lg border shadow-md bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {trendsData?.weekCompletions || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Completions this week
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border shadow-md bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {trendsData?.monthCompletions || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Completions this month
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border shadow-md bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {trendsData?.currentStreak || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Days consecutive
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border shadow-md bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Year</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {trendsData?.yearCompletions || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Total completions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Activity Overview */}
        {isAdmin && widgetData?.accountCompletions && (
          <Card className="lg:col-span-2 rounded-lg border shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Account Activity Overview
              </CardTitle>
              <CardDescription className="text-white/80">
                Assignment completion status across your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {widgetLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </div>
              ) : widgetError ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{widgetError}</AlertDescription>
                </Alert>
              ) : (
                widgetData.accountCompletions.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {item.assessmentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.totalCompleted} of {item.totalAssigned} completed
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(item.totalCompleted / item.totalAssigned) * 100} 
                        className="w-16"
                      />
                      <Badge variant={item.totalCompleted === item.totalAssigned ? "default" : "secondary"}>
                        {Math.round((item.totalCompleted / item.totalAssigned) * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* User Activity (for non-admin users) */}
        {!isAdmin && widgetData?.userActivity && (
          <Card className="lg:col-span-2 rounded-lg border shadow-md">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Recent Activity
              </CardTitle>
              <CardDescription className="text-white/80">
                Your recent assignment completions and pending tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {widgetLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : widgetError ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{widgetError}</AlertDescription>
                </Alert>
              ) : (
                widgetData.userActivity.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {item.assessmentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.status === 'completed' 
                          ? `Completed ${formatDisplayDateShort(item.completedDate)}`
                          : `Due ${formatDisplayDateShort(item.dueDate)}`
                        }
                      </p>
                    </div>
                    <Badge variant={
                      item.status === 'completed' ? 'default' : 
                      item.status === 'overdue' ? 'destructive' : 'secondary'
                    }>
                      {item.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {item.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                      {item.status === 'overdue' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Current Streak Card */}
        <Card className="rounded-lg border shadow-md bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="text-6xl font-bold text-amber-500 mb-2">
              {trendsData?.currentStreak || 0}
            </div>
            <p className="text-center text-muted-foreground">
              {trendsData?.currentStreak ? 'Days consecutive' : 'Let\'s get started... Please fill out your DSS today.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Last Completions Widget */}
      <Card className="rounded-lg border shadow-md">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Last Completions
          </CardTitle>
          <CardDescription className="text-white/80">
            Recent assignment completions across your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
              <SelectTrigger>
                <SelectValue placeholder="All Assignments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignments</SelectItem>
                {isLoadingAssignments ? (
                  <SelectItem value="loading" disabled>Loading assignments...</SelectItem>
                ) : assignmentsError ? (
                  <SelectItem value="error" disabled>Error loading assignments</SelectItem>
                ) : assignments.length > 0 ? (
                  assignments.map(assignment => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.assessmentName || 'Unnamed Assignment'}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No assignments found</SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger>
                <SelectValue placeholder="Select School" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {isLoadingLocations ? (
                  <SelectItem value="loading" disabled>Loading locations...</SelectItem>
                ) : locationsError ? (
                  <SelectItem value="error" disabled>Error loading locations</SelectItem>
                ) : locations.length > 0 ? (
                  locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.locationName}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No locations found</SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Last 30 Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="last90days">Last 90 Days</SelectItem>
                <SelectItem value="alltime">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Completions Table */}
          <div className="space-y-4">
            {completionsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : completionsError ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{completionsError}</AlertDescription>
              </Alert>
            ) : lastCompletions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-semibold">No Recent Completions</p>
                <p className="text-sm">No completions found for the selected filters.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-4 gap-4 p-3 text-sm font-medium text-muted-foreground border-b">
                  <div>Assignment</div>
                  <div>Completed By</div>
                  <div>Date</div>
                  <div className="text-right">Actions</div>
                </div>
                
                {/* Table Rows */}
                {lastCompletions.slice(0, 10).map((completion) => {
                  // Get the assignment name from either the completion data or the assignments list
                  const assignmentName = getAssignmentName(completion);
                  
                  // Determine the parent assignment ID for the View link
                  const viewAssignmentId = completion.parentAssignmentId || completion.assignmentId || completion.data?.assignmentId;
                  
                  return (
                    <div key={completion.id} className="grid grid-cols-4 gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {assignmentName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {completion.data.locationName || 'No location'}
                        </p>
                      </div>
                      <div className="text-sm">
                        {completion.data.completedBy || 'Unknown'}
                      </div>
                      <div className="text-sm">
                        {completion.data.completionDate 
                          ? formatDisplayDateShort(completion.data.completionDate)
                          : completion.data.submittedTimeServer
                          ? formatDisplayDateShort(completion.data.submittedTimeServer)
                          : 'Invalid Date'
                        }
                      </div>
                      <div className="text-right">
                        {viewAssignmentId && viewAssignmentId !== 'unknown' ? (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/assignments/${viewAssignmentId}/completions/${completion.id}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Critical Tasks */}
        <Card className="rounded-lg border shadow-md">
          <CardHeader className="bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical Tasks
            </CardTitle>
            <CardDescription className="text-white/80">
              High-priority items needing immediate attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <ListChecks className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-semibold">No Critical Tasks</p>
              <p className="text-sm text-muted-foreground">
                You're all caught up! No urgent tasks at this time.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="rounded-lg border shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-sky-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events & Drills
            </CardTitle>
            <CardDescription className="text-white/80">
              Scheduled safety events and drills.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-semibold">No Upcoming Events</p>
              <p className="text-sm text-muted-foreground">
                No events scheduled at this time.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/drill-tracking/new">
                  Schedule a Drill
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Protocols */}
        <Card className="rounded-lg border shadow-md">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Emergency Protocols
            </CardTitle>
            <CardDescription className="text-white/80">
              Quick actions for emergency situations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Button variant="destructive" className="w-full justify-start">
                <Bell className="mr-2 h-4 w-4" /> Initiate Emergency Alert
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Eye className="mr-2 h-4 w-4" /> View Emergency Procedures
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" /> Contact Emergency Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}