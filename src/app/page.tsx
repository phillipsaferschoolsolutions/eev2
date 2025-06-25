"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  type WeatherLocationData 
} from "@/services/assignmentFunctionsService";
import { getDashboardWidgetsSandbox, getWidgetTrends } from "@/services/analysisService";
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
  Snowflake
} from "lucide-react";
import { formatDisplayDateShort } from "@/lib/utils";
import Link from "next/link";

interface CompletionItem {
  id: string;
  data: {
    assignmentId?: string; // This might not be present
    completedBy: string;
    completionDate?: string;
    submittedTimeServer?: any;
    locationName?: string;
    status?: string;
    [key: string]: any;
  };
  // Add the assignment ID from the document path
  parentAssignmentId?: string;
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

  // Fetch last completions
  useEffect(() => {
    if (!authLoading && !profileLoading && userProfile?.account) {
      setCompletionsLoading(true);
      const assignmentFilter = selectedAssignment === "all" ? null : selectedAssignment;
      const schoolFilter = selectedSchool === "all" ? null : selectedSchool;
      
      getLastCompletions(userProfile.account, assignmentFilter, schoolFilter, selectedPeriod)
        .then(data => {
          // Process the data to extract assignment ID from the document path
          const processedData = (data || []).map((item: any) => {
            // The item structure from the API includes the document path information
            // We need to extract the assignment ID from the document reference path
            let parentAssignmentId = item.data?.assignmentId;
            
            // If assignmentId is not in the data, try to extract it from the document path
            // The API should ideally provide this, but we can work around it
            if (!parentAssignmentId && item.assignmentId) {
              parentAssignmentId = item.assignmentId;
            }
            
            // If still no assignment ID, we'll need to handle this case
            if (!parentAssignmentId) {
              console.warn("No assignment ID found for completion:", item);
              // You might want to extract this from the document path if available
              // For now, we'll use a placeholder to prevent the undefined error
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {userProfile?.displayName || user.email}
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your safety management today.
        </p>
      </div>

      {/* Weather Widget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Current Conditions
          </CardTitle>
          {weather && getWeatherIcon(weather)}
        </CardHeader>
        <CardContent>
          {weatherLoading && <Skeleton className="h-6 w-32" />}
          {weatherError && <p className="text-sm text-muted-foreground">{weatherError}</p>}
          {weather && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">
                    {Math.round(weather.current?.temp || weather.main?.temp || 0)}°F
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {Math.round(weather.current?.wind_speed || weather.wind?.speed || 0)} mph
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Droplets className="h-4 w-4 text-muted-foreground" />
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Year</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
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

      {/* Activity Overview */}
      {isAdmin && widgetData?.accountCompletions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Account Activity Overview
            </CardTitle>
            <CardDescription>
              Assignment completion status across your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Recent Activity
            </CardTitle>
            <CardDescription>
              Your recent assignment completions and pending tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

      {/* Last Completions Widget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Last Completions
          </CardTitle>
          <CardDescription>
            Recent assignment completions across your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
              <SelectTrigger>
                <SelectValue placeholder="All Assignments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignments</SelectItem>
                {/* Add specific assignments here if needed */}
              </SelectContent>
            </Select>

            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger>
                <SelectValue placeholder="Select School" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {/* Add specific schools here if needed */}
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
                  <div key={i} className="flex items-center justify-between p-3 border rounded">
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
                {lastCompletions.slice(0, 10).map((completion) => (
                  <div key={completion.id} className="grid grid-cols-4 gap-4 p-3 border rounded hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {completion.data.assessmentName || 'Unknown Assignment'}
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
                      {completion.parentAssignmentId && completion.parentAssignmentId !== 'unknown' ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/assignments/${completion.parentAssignmentId}/completions/${completion.id}`}>
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
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}