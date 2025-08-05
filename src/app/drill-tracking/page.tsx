"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FilePlus2, Calendar, BarChart3, Users, Clock, CheckCircle, AlertTriangle, Play, Eye, Download, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  getAllDrillEvents, 
  getAllDrillSubmissions
} from "@/services/drillTrackingService";
import { getLocationsForLookup } from "@/services/locationService";
import type { DrillEvent, DrillSubmission } from "@/types/Drill";
import type { Location } from "@/types/Location";
import { format } from "date-fns";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function DrillTrackingPage() {
  const { userProfile, loading: authLoading, profileLoading, user } = useAuth();
  const router = useRouter();

  const [drillEvents, setDrillEvents] = useState<DrillEvent[]>([]);
  const [drillSubmissions, setDrillSubmissions] = useState<DrillSubmission[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hazardTypeFilter, setHazardTypeFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading || profileLoading) {
      return;
    }

    // If no user is authenticated, redirect to auth page
    if (!user || !auth?.currentUser) {
      router.push('/auth');
      return;
    }

    // If no user profile or account, show error
    if (!userProfile?.account) {
      setError("User account information is not available. Please contact your administrator.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      // Verify authentication before making API calls
      if (!auth?.currentUser) {
        setError("Authentication required. Please log in.");
        setIsLoading(false);
        return;
      }

      try {
        // Get fresh token to ensure it's valid
        const token = await auth.currentUser.getIdToken(true);
        
        if (!token) {
          setError("Authentication token not available. Please log in again.");
          setIsLoading(false);
          return;
        }

        // Fetch all data in parallel
        const [events, submissions, locationsData] = await Promise.all([
          getAllDrillEvents(userProfile.account),
          getAllDrillSubmissions(userProfile.account),
          getLocationsForLookup(userProfile.account)
        ]);
        
        setDrillEvents(events || []);
        setDrillSubmissions(submissions || []);
        setLocations(locationsData || []);
        
        // Debug logging
        console.log('Data loaded:', {
          eventsCount: events?.length || 0,
          submissionsCount: submissions?.length || 0,
          events: events?.slice(0, 2), // Log first 2 events for debugging
          account: userProfile?.account,
          user: user?.email
        });

        // Reports are now calculated from live data, no need for API calls
      } catch (err) {
        console.error("Failed to fetch drill data:", err);
        console.error("Error details:", {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          account: userProfile?.account,
          user: user?.email
        });
        setError("Failed to load drill tracking data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userProfile?.account, authLoading, profileLoading, user, router]);

  // Filter upcoming drills (within next 30 days)
  const upcomingDrills = useMemo(() => {
    // Temporarily show all drills for debugging
    console.log('All drill events:', drillEvents);
    
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const filtered = drillEvents.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      
      // Debug logging for all drills
      console.log('Checking drill:', {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status,
        eventStart: eventStart.toISOString(),
        eventEnd: eventEnd.toISOString(),
        now: now.toISOString(),
        thirtyDaysFromNow: thirtyDaysFromNow.toISOString(),
        isStartAfterNow: eventStart >= now,
        isStartBeforeThirtyDays: eventStart <= thirtyDaysFromNow,
        isStartInPast: eventStart < now,
        isEndInFuture: eventEnd >= now,
        isNotCompleted: event.status !== 'completed',
        isNotCancelled: event.status !== 'cancelled'
      });
      
      // Check if the drill event is upcoming or currently active
      // A drill is "upcoming" if:
      // 1. It starts within the next 30 days, OR
      // 2. It's currently active (started in the past but hasn't ended yet)
      const isUpcoming = (
        // Future drills: starts within next 30 days
        (eventStart >= now && eventStart <= thirtyDaysFromNow) ||
        // Active drills: started in the past but hasn't ended yet
        (eventStart < now && eventEnd >= now)
      ) && event.status !== 'completed' && event.status !== 'cancelled';
      
      // Debug logging for upcoming drills
      if (isUpcoming) {
        console.log('✅ Upcoming drill found:', {
          id: event.id,
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          status: event.status
        });
      } else {
        console.log('❌ Drill filtered out:', {
          id: event.id,
          title: event.title,
          reason: event.status === 'completed' ? 'completed' :
                  event.status === 'cancelled' ? 'cancelled' :
                  !(eventStart >= now && eventStart <= thirtyDaysFromNow) && !(eventStart < now && eventEnd >= now) ? 'not upcoming or active' :
                  'unknown'
        });
      }
      
      return isUpcoming;
    });
    
    console.log('Total upcoming drills:', filtered.length);
    return filtered;
  }, [drillEvents]);

  // Show all submissions for now (we can add date filtering later)
  const recentSubmissions = drillSubmissions.slice(0, 5); // Show first 5 submissions

  // Calculate compliance metrics - improved calculation
  const totalEvents = drillEvents.length;
  const completedEvents = drillSubmissions.length;
  
  // Calculate compliance rate based on completed vs required drills
  const calculateComplianceRate = () => {
    if (drillEvents.length === 0) return 0;
    
    // Count drills that have submissions (completed)
    const completedDrills = drillEvents.filter(event => {
      const hasSubmissions = drillSubmissions.some(submission => 
        submission.drillEventId === event.id
      );
      return hasSubmissions && event.status !== 'completed' && event.status !== 'cancelled';
    }).length;
    
    // Count total required drills (all non-completed/cancelled drills)
    const requiredDrills = drillEvents.filter(event => 
      event.status !== 'completed' && event.status !== 'cancelled'
    ).length;
    
    return requiredDrills > 0 ? (completedDrills / requiredDrills) * 100 : 0;
  };

  const complianceRate = calculateComplianceRate();

  // Calculate performance metrics - improved calculation
  const calculateAverageScore = () => {
    const validSubmissions = drillSubmissions.filter(submission => 
      submission.automatedScore !== null && 
      submission.automatedScore !== undefined && 
      submission.automatedScore >= 0
    );
    
    if (validSubmissions.length === 0) return 0;
    
    const totalScore = validSubmissions.reduce((sum, submission) => 
      sum + (submission.automatedScore || 0), 0
    );
    
    return totalScore / validSubmissions.length;
  };

  const getLocationName = (locationId: string): string => {
    const location = locations.find(loc => loc.id === locationId);
    return location?.locationName || locationId; // Fallback to ID if name not found
  };

  // Filtered and paginated drills (filter from all drills for the "All Upcoming Drills" table)
  const filteredDrills = useMemo(() => {
    const filtered = drillEvents.filter(drill => {
      // Search query filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === "" || 
        drill.title?.toLowerCase().includes(searchLower) ||
        drill.description?.toLowerCase().includes(searchLower) ||
        drill.hazardType?.toLowerCase().includes(searchLower) ||
        drill.assignedToSites?.some(siteId => getLocationName(siteId).toLowerCase().includes(searchLower));

      // Status filter
      const matchesStatus = statusFilter === "all" || drill.status === statusFilter;

      // Hazard type filter
      let matchesHazardType = true;
      if (hazardTypeFilter.length > 0) {
        if (drill.hazardType) {
          matchesHazardType = hazardTypeFilter.includes(drill.hazardType);
        } else {
          // If drill has no hazard type, it should match "not-specified" or be excluded
          matchesHazardType = hazardTypeFilter.includes("not-specified");
        }
      }

      // Location filter
      const matchesLocation = locationFilter.length === 0 || 
        drill.assignedToSites?.some(siteId => locationFilter.includes(getLocationName(siteId)));



      return matchesSearch && matchesStatus && matchesHazardType && matchesLocation;
    });



    return filtered;
  }, [drillEvents, searchQuery, statusFilter, hazardTypeFilter, locationFilter, locations]);

  // Pagination
  const totalPages = Math.ceil(filteredDrills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDrills = filteredDrills.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, hazardTypeFilter.length, locationFilter.length]);

  // Reset to first page when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const averageScore = calculateAverageScore();

  if (authLoading || profileLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-10 w-1/2 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!userProfile?.account) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription>
          You must be logged in and have an account associated to view drill tracking.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drill Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Manage emergency preparedness drills and compliance tracking
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/drill-tracking/new">
            <FilePlus2 className="mr-2 h-5 w-5" /> Create Drill Event
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalEvents}</div>
            )}
            <p className="text-xs text-muted-foreground">
              All time drill events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{complianceRate.toFixed(1)}%</div>
            )}
            {!isLoading && <Progress value={complianceRate} className="mt-2" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Out of 100 points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{upcomingDrills.length}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Upcoming & active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Drills</TabsTrigger>
          <TabsTrigger value="history">Drill History</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Drills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Upcoming Drills
                </CardTitle>
                <CardDescription>
                  Upcoming and currently active drills
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : upcomingDrills.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-semibold">No Upcoming Drills</p>
                    <p className="text-sm">
                      No upcoming or active drills found.
                    </p>
                    <Button asChild className="mt-4">
                      <Link href="/drill-tracking/new">
                        <FilePlus2 className="mr-2 h-4 w-4" />
                        Schedule a Drill
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingDrills.slice(0, 5).map((drill: DrillEvent) => (
                      <div key={drill.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{drill.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {drill.hazardType}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(drill.startDate), 'MMM dd, yyyy')} - {format(new Date(drill.endDate), 'MMM dd, yyyy')}
                          </p>
                          {drill.assignedToSites && drill.assignedToSites.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs text-muted-foreground cursor-help">
                                    {drill.assignedToSites.length} site{drill.assignedToSites.length !== 1 ? 's' : ''} assigned
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="max-w-xs">
                                    {drill.assignedToSites.map((siteId, index) => (
                                      <div key={index}>{getLocationName(siteId)}</div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/drill-tracking/${drill.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/drill-tracking/${drill.id}/execute`}>
                              <Play className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {upcomingDrills.length > 5 && (
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/drill-tracking?tab=upcoming">
                          View All {upcomingDrills.length} Upcoming Drills
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Submissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Recent Submissions
                </CardTitle>
                <CardDescription>
                  Recently completed drill reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : recentSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-semibold">No Recent Submissions</p>
                    <p className="text-sm">
                      No drill reports have been submitted recently.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentSubmissions.slice(0, 5).map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {submission.submittedByDisplayName || 'Unknown User'}
                            </h4>
                            <Badge 
                              variant={
                                submission.status === 'approved' ? 'default' :
                                submission.status === 'rejected' ? 'destructive' :
                                submission.status === 'in-review' ? 'secondary' :
                                'outline'
                              }
                              className="text-xs"
                            >
                              {submission.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(submission.submittedAt.toDate(), 'MMM dd, yyyy HH:mm')}
                          </p>
                          {submission.automatedScore !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              Score: {submission.automatedScore}/100
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/drill-tracking/submissions/${submission.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                    {recentSubmissions.length > 5 && (
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/drill-tracking?tab=history">
                          View All {recentSubmissions.length} Recent Submissions
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Upcoming Drills</CardTitle>
              <CardDescription>
                Complete list of scheduled drills with filtering and search
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : drillEvents.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4" />
                  <p className="text-lg font-semibold">No Drill Events</p>
                  <p className="text-sm">
                    No drill events have been created yet.
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/drill-tracking/new">
                      <FilePlus2 className="mr-2 h-4 w-4" />
                      Create First Drill Event
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search drills..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start">
                          <Filter className="mr-2 h-4 w-4" />
                          {hazardTypeFilter.length === 0 ? "All Types" : `${hazardTypeFilter.length} selected`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <h4 className="font-medium leading-none">Drill Types</h4>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center space-x-2 border-b pb-2 mb-2">
                              <Checkbox
                                id="select-all-types"
                                checked={hazardTypeFilter.length === 15}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setHazardTypeFilter([
                                      "fire", "tornado", "earthquake", "lockdown", "evacuation", 
                                      "shelter-in-place", "medical-emergency", "severe-weather", 
                                      "active-shooter", "bomb-threat", "chemical-spill", 
                                      "gas-leak", "power-outage", "other", "not-specified"
                                    ]);
                                  } else {
                                    setHazardTypeFilter([]);
                                  }
                                }}
                              />
                              <label
                                htmlFor="select-all-types"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Select All
                              </label>
                            </div>
                            {[
                              { value: "fire", label: "Fire" },
                              { value: "tornado", label: "Tornado" },
                              { value: "earthquake", label: "Earthquake" },
                              { value: "lockdown", label: "Lockdown" },
                              { value: "evacuation", label: "Evacuation" },
                              { value: "shelter-in-place", label: "Shelter in Place" },
                              { value: "medical-emergency", label: "Medical Emergency" },
                              { value: "severe-weather", label: "Severe Weather" },
                              { value: "active-shooter", label: "Active Shooter" },
                              { value: "bomb-threat", label: "Bomb Threat" },
                              { value: "chemical-spill", label: "Chemical Spill" },
                              { value: "gas-leak", label: "Gas Leak" },
                              { value: "power-outage", label: "Power Outage" },
                              { value: "other", label: "Other" },
                              { value: "not-specified", label: "Not Specified" }
                            ].map((type) => (
                              <div key={type.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`type-${type.value}`}
                                  checked={hazardTypeFilter.includes(type.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setHazardTypeFilter([...hazardTypeFilter, type.value]);
                                    } else {
                                      setHazardTypeFilter(hazardTypeFilter.filter(t => t !== type.value));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`type-${type.value}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {type.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start">
                          <Filter className="mr-2 h-4 w-4" />
                          {locationFilter.length === 0 ? "All Locations" : `${locationFilter.length} selected`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <h4 className="font-medium leading-none">Locations</h4>
                          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                            <div className="flex items-center space-x-2 border-b pb-2 mb-2">
                              <Checkbox
                                id="select-all-locations"
                                checked={locationFilter.length === locations.length}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setLocationFilter(locations.map(loc => loc.locationName));
                                  } else {
                                    setLocationFilter([]);
                                  }
                                }}
                              />
                              <label
                                htmlFor="select-all-locations"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Select All
                              </label>
                            </div>
                            {locations.map((location) => (
                              <div key={location.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`location-${location.id}`}
                                  checked={locationFilter.includes(location.locationName)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setLocationFilter([...locationFilter, location.locationName]);
                                    } else {
                                      setLocationFilter(locationFilter.filter(l => l !== location.locationName));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`location-${location.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {location.locationName}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setHazardTypeFilter([]);
                        setLocationFilter([]);
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>

                  {/* Results count */}
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredDrills.length} of {drillEvents.length} drills
                    </p>
                    <Button asChild>
                      <Link href="/drill-tracking/new">
                        <FilePlus2 className="mr-2 h-4 w-4" />
                        Create New Drill
                      </Link>
                    </Button>
                  </div>

                  {/* Drill Table */}
                  <div className="border rounded-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-4 font-medium">Title</th>
                            <th className="text-left p-4 font-medium">Type</th>
                            <th className="text-left p-4 font-medium">Status</th>
                            <th className="text-left p-4 font-medium">Schedule</th>
                            <th className="text-left p-4 font-medium">Sites</th>
                            <th className="text-right p-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedDrills.map((drill) => (
                            <tr key={drill.id} className="border-b hover:bg-muted/30">
                              <td className="p-4">
                                <div>
                                  <div className="font-medium">{drill.title}</div>
                                  {drill.description && (
                                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                                      {drill.description}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge variant="outline">{drill.hazardType || 'Not specified'}</Badge>
                              </td>
                              <td className="p-4">
                                <Badge 
                                  variant={
                                    drill.status === 'active' ? 'default' :
                                    drill.status === 'paused' ? 'secondary' :
                                    drill.status === 'completed' ? 'outline' :
                                    'destructive'
                                  }
                                >
                                  {drill.status}
                                </Badge>
                              </td>
                              <td className="p-4 text-sm">
                                <div>Start: {format(new Date(drill.startDate), 'MMM dd, yyyy')}</div>
                                <div>End: {format(new Date(drill.endDate), 'MMM dd, yyyy')}</div>
                              </td>
                              <td className="p-4">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-sm">
                                        {drill.assignedToSites?.length || 0} site{(drill.assignedToSites?.length || 0) !== 1 ? 's' : ''}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="max-w-xs">
                                        {drill.assignedToSites && drill.assignedToSites.length > 0 ? (
                                          <div>
                                            {drill.assignedToSites.map((siteId, index) => (
                                              <div key={index}>{getLocationName(siteId)}</div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div>No sites assigned</div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </td>
                              <td className="p-4">
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" asChild>
                                    <Link href={`/drill-tracking/${drill.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  <Button variant="outline" size="sm" asChild>
                                    <Link href={`/drill-tracking/${drill.id}/edit`}>
                                      Edit
                                    </Link>
                                  </Button>
                                  <Button variant="outline" size="sm" asChild>
                                    <Link href={`/drill-tracking/${drill.id}/execute`}>
                                      <Play className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Records per page selector (always show) */}
                  <div className="flex items-center justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show:</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">per page</span>
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredDrills.length)} of {filteredDrills.length} results
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Drill History & Submissions</CardTitle>
              <CardDescription>
                Review completed drills and their reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : drillSubmissions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 mb-4" />
                  <p className="text-lg font-semibold">No Drill Submissions</p>
                  <p className="text-sm">
                    No drill reports have been submitted yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {drillSubmissions.map((submission) => (
                    <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">
                            {submission.submittedByDisplayName || 'Unknown User'}
                          </h3>
                          <Badge 
                            variant={
                              submission.status === 'approved' ? 'default' :
                              submission.status === 'rejected' ? 'destructive' :
                              submission.status === 'in-review' ? 'secondary' :
                              'outline'
                            }
                          >
                            {submission.status}
                          </Badge>
                          {submission.automatedScore !== undefined && (
                            <Badge variant="outline">
                              {submission.automatedScore}/100
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Submitted: {format(submission.submittedAt.toDate(), 'MMM dd, yyyy HH:mm')}
                        </p>
                        {submission.siteName && (
                          <p className="text-sm text-muted-foreground">
                            Site: {submission.siteName}
                          </p>
                        )}
                        {submission.performanceMetrics && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                            <span>{submission.performanceMetrics.participantsCount} participants</span>
                            {submission.performanceMetrics.timeToEvacuateSeconds && (
                              <span>{submission.performanceMetrics.timeToEvacuateSeconds}s evacuation</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/drill-tracking/submissions/${submission.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {submission.status === 'submitted' && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/drill-tracking/submissions/${submission.id}/review`}>
                              Review
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Compliance Report
                </CardTitle>
                <CardDescription>
                  Live compliance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-2xl font-bold">{complianceRate.toFixed(1)}%</div>
                  <Progress value={complianceRate} />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Events</p>
                      <p className="font-semibold">{totalEvents}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-semibold">{completedEvents}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Active</p>
                      <p className="font-semibold">{drillEvents.filter(e => e.status === 'active').length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Upcoming</p>
                      <p className="font-semibold">{upcomingDrills.length}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Performance Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Performance Report
                </CardTitle>
                <CardDescription>
                  Live performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-2xl font-bold">{averageScore.toFixed(1)}/100</div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Submissions</span>
                      <span>{drillSubmissions.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Approved</span>
                      <span>{drillSubmissions.filter(s => s.status === 'approved').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>In Review</span>
                      <span>{drillSubmissions.filter(s => s.status === 'in-review').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Rejected</span>
                      <span>{drillSubmissions.filter(s => s.status === 'rejected').length}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
