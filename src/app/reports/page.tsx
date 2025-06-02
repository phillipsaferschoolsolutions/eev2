
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";

import { getDashboardWidgetsSandbox, getRawResponses, getCommonResponsesForAssignment } from "@/services/analysisService";
import type { AssignmentMetadata } from "@/services/assignmentFunctionsService";
import { getAssignmentListMetadata, getAssignmentById } from "@/services/assignmentFunctionsService";
import type { Location } from "@/services/locationService";
import { getLocationsForLookup } from "@/services/locationService";

import type { WidgetSandboxData, UserActivity, AssignmentCompletionStatus, ReportFilterOptions, RawResponse, SchoolsWithQuestionsResponse, SchoolQuestionAnswers } from "@/types/Analysis";
import { Activity, TrendingUp, ListChecks, FileText, Settings2, Download, Filter, CalendarIcon, MapPin, AlertCircle, Loader2, TableIcon, GripVertical, ArrowDownToLine } from "lucide-react";

const PERIOD_OPTIONS = [
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "last90days", label: "Last 90 Days" },
  { value: "alltime", label: "All Time" },
];

const formatDisplayDateShort = (dateString?: string | Date) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) { return String(dateString); }
};


export default function ReportStudioPage() {
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  // --- Dashboard State ---
  const [widgetData, setWidgetData] = useState<WidgetSandboxData | null>(null);
  const [isLoadingWidgets, setIsLoadingWidgets] = useState(true);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  const [assignmentsForCommonResponses, setAssignmentsForCommonResponses] = useState<AssignmentMetadata[]>([]);
  const [selectedAssignmentForCommon, setSelectedAssignmentForCommon] = useState<string | null>(null);
  const [commonResponsesData, setCommonResponsesData] = useState<SchoolsWithQuestionsResponse | null>(null);
  const [isLoadingCommonResponses, setIsLoadingCommonResponses] = useState(false);
  const [commonResponsesError, setCommonResponsesError] = useState<string | null>(null);
  const [commonResponsesPeriod, setCommonResponsesPeriod] = useState("last30days");

  // --- Report Explorer State ---
  const [reportFilters, setReportFilters] = useState<ReportFilterOptions>({
    selectedAssignmentId: null,
    dateRange: undefined,
    selectedLocations: [],
  });
  const [availableAssignments, setAvailableAssignments] = useState<AssignmentMetadata[]>([]);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [rawResponses, setRawResponses] = useState<RawResponse[]>([]);
  const [isLoadingRawResponses, setIsLoadingRawResponses] = useState(false);
  const [rawResponsesError, setRawResponsesError] = useState<string | null>(null);
  const [selectedAssignmentDetails, setSelectedAssignmentDetails] = useState<AssignmentMetadata & { questions?: any[] } | null>(null);
  const [isLoadingAssignmentDetails, setIsLoadingAssignmentDetails] = useState(false);


  const isAdmin = !profileLoading && userProfile && (userProfile.permission === 'admin' || userProfile.permission === 'superAdmin');

  // Fetch data for Dashboard widgets
  useEffect(() => {
    if (userProfile?.account && activeTab === 'dashboard') {
      setIsLoadingWidgets(true);
      setWidgetError(null);
      getDashboardWidgetsSandbox(userProfile.account)
        .then(setWidgetData)
        .catch(err => {
          console.error("Error fetching widget data:", err);
          setWidgetError(err.message || "Could not load dashboard widgets.");
        })
        .finally(() => setIsLoadingWidgets(false));
    }
  }, [userProfile?.account, activeTab]);

  // Fetch assignments for dropdowns (Common Responses widget & Report Explorer filter)
  useEffect(() => {
    if (userProfile?.account) {
      getAssignmentListMetadata(userProfile.account)
        .then(data => {
          setAvailableAssignments(data || []);
          setAssignmentsForCommonResponses(data || []);
          // Auto-select first assignment for common responses if available
          if (data && data.length > 0 && !selectedAssignmentForCommon) {
            setSelectedAssignmentForCommon(data[0].id);
          }
           // Auto-select first assignment for report explorer if available
          if (data && data.length > 0 && !reportFilters.selectedAssignmentId) {
            setReportFilters(prev => ({ ...prev, selectedAssignmentId: data[0].id }));
          }
        })
        .catch(err => console.error("Error fetching assignment list:", err));

      getLocationsForLookup(userProfile.account)
        .then(setAvailableLocations)
        .catch(err => console.error("Error fetching locations:", err));
    }
  }, [userProfile?.account, selectedAssignmentForCommon, reportFilters.selectedAssignmentId]);
  
  // Fetch common responses when selected assignment or period changes
  useEffect(() => {
    if (userProfile?.account && selectedAssignmentForCommon && commonResponsesPeriod && activeTab === 'dashboard') {
      setIsLoadingCommonResponses(true);
      setCommonResponsesError(null);
      setCommonResponsesData(null);
      getCommonResponsesForAssignment(selectedAssignmentForCommon, commonResponsesPeriod, userProfile.account)
        .then(setCommonResponsesData)
        .catch(err => {
          console.error("Error fetching common responses:", err);
          setCommonResponsesError(err.message || "Could not load common response data.");
        })
        .finally(() => setIsLoadingCommonResponses(false));
    }
  }, [userProfile?.account, selectedAssignmentForCommon, commonResponsesPeriod, activeTab]);


  // Fetch assignment details (questions) when selected assignment for raw responses changes
   useEffect(() => {
    if (reportFilters.selectedAssignmentId && userProfile?.account) {
      setIsLoadingAssignmentDetails(true);
      getAssignmentById(reportFilters.selectedAssignmentId, userProfile.account)
        .then(data => {
          setSelectedAssignmentDetails(data as AssignmentMetadata & { questions?: any[] } || null);
        })
        .catch(err => {
          console.error("Error fetching assignment details for raw responses:", err);
          toast({ variant: "destructive", title: "Error", description: "Could not load assignment details for raw responses." });
          setSelectedAssignmentDetails(null);
        })
        .finally(() => setIsLoadingAssignmentDetails(false));
    } else {
      setSelectedAssignmentDetails(null);
    }
  }, [reportFilters.selectedAssignmentId, userProfile?.account, toast]);


  const handleFetchRawResponses = useCallback(async () => {
    if (!isAdmin || !reportFilters.selectedAssignmentId || !userProfile?.account) {
      setRawResponses([]);
      if (isAdmin && !reportFilters.selectedAssignmentId) setRawResponsesError("Please select an assignment to view raw responses.");
      return;
    }
    setIsLoadingRawResponses(true);
    setRawResponsesError(null);
    try {
      const filtersPayload: RawResponse['filters'] = {};
      if (reportFilters.dateRange?.from && reportFilters.dateRange.to) {
        filtersPayload.dateRange = {
          from: format(reportFilters.dateRange.from, "yyyy-MM-dd"),
          to: format(reportFilters.dateRange.to, "yyyy-MM-dd"),
        };
      }
      if (reportFilters.selectedLocations.length > 0) {
        filtersPayload.locations = reportFilters.selectedLocations;
      }
      // TODO: Add user filters if implementing

      const data = await getRawResponses(reportFilters.selectedAssignmentId, filtersPayload, userProfile.account);
      setRawResponses(data);
    } catch (err) {
      console.error("Error fetching raw responses:", err);
      setRawResponsesError(err.message || "Could not load raw responses.");
      setRawResponses([]);
    } finally {
      setIsLoadingRawResponses(false);
    }
  }, [isAdmin, reportFilters, userProfile?.account]);

  // Trigger fetch when filters change for Report Explorer
  useEffect(() => {
    if (activeTab === 'reportExplorer' && isAdmin && reportFilters.selectedAssignmentId) {
      handleFetchRawResponses();
    }
  }, [activeTab, isAdmin, reportFilters, handleFetchRawResponses]);


  const handleLocationFilterChange = (locationId: string, checked: boolean) => {
    setReportFilters(prev => ({
      ...prev,
      selectedLocations: checked
        ? [...prev.selectedLocations, locationId]
        : prev.selectedLocations.filter(id => id !== locationId),
    }));
  };
  
  const convertToCSV = (data: RawResponse[], questions: any[]): string => {
    if (!data.length || !questions.length) return "";

    const questionHeaders = questions.map(q => q.label || q.id);
    const headers = ["Completion ID", "Completed By", "Completion Date", "Location", ...questionHeaders];
    
    const rows = data.map(item => {
      const baseRow = [
        item.id,
        item.completedBy,
        formatDisplayDateShort(item.completionDate),
        item.locationName,
      ];
      const questionResponses = questions.map(q => {
        const responseValue = item.responses?.[q.id];
        if (Array.isArray(responseValue)) return responseValue.join(', ');
        if (typeof responseValue === 'object' && responseValue !== null) return JSON.stringify(responseValue);
        return responseValue ?? "";
      });
      return [...baseRow, ...questionResponses].map(String).map(field => `"${field.replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  const handleExportCSV = () => {
    if (!rawResponses.length || !selectedAssignmentDetails?.questions) {
      toast({ variant: "destructive", title: "Export Error", description: "No data or assignment questions available to export." });
      return;
    }
    const csvData = convertToCSV(rawResponses, selectedAssignmentDetails.questions);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const assignmentName = selectedAssignmentDetails.assessmentName?.replace(/\s+/g, '_') || "report";
    link.setAttribute("download", `${assignmentName}_raw_responses_${format(new Date(), "yyyyMMdd")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Successful", description: "CSV file download initiated." });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <Skeleton className="h-12 w-full mb-6" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      </div>
    );
  }
  
  if (!userProfile?.account) {
      return (
          <Alert variant="destructive" className="m-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Account Information Missing</AlertTitle>
              <AlertDescription>User account details are not available. Cannot load analysis features.</AlertDescription>
          </Alert>
      );
  }

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
      <p className="text-sm text-muted-foreground mt-1">Track your assignment completion streak. (Backend support needed for accurate streak data)</p>
    </div>
  );

  const renderCommonResponsesWidget = () => {
    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
           <Select value={selectedAssignmentForCommon || ""} onValueChange={setSelectedAssignmentForCommon}>
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
          <Select value={commonResponsesPeriod} onValueChange={setCommonResponsesPeriod}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Select period..." /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoadingCommonResponses && <Skeleton className="h-40 w-full" />}
        {commonResponsesError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{commonResponsesError}</AlertDescription></Alert>}
        
        {commonResponsesData && !isLoadingCommonResponses && !commonResponsesError && (
          <ScrollArea className="h-60 pr-2">
            {Object.keys(commonResponsesData).length > 0 ? (
              Object.entries(commonResponsesData).map(([schoolName, questions]) => (
                <div key={schoolName} className="mb-3 p-2 border rounded">
                  <h4 className="font-semibold text-xs text-muted-foreground mb-1">{schoolName === "undefined" || schoolName === "null" ? "Overall / Unspecified Location" : schoolName}</h4>
                  {Object.entries(questions).map(([questionId, answerData]) => (
                    <div key={questionId} className="text-xs mb-1 ml-2">
                      <p className="font-medium truncate italic">{answerData.questionLabel || `Q: ${questionId}`}</p>
                      <ul className="list-disc list-inside ml-3 text-muted-foreground/80">
                        {Object.entries(answerData)
                            .filter(([key]) => key !== 'questionLabel')
                            .sort(([, aVal], [, bVal]) => (bVal as number) - (aVal as number)) // Sort by count desc
                            .slice(0, 3) // Top 3 answers
                            .map(([answer, count]) => (
                              <li key={answer} className="truncate">{answer || "N/A"}: {count}</li>
                         ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))
            ) : ( <p className="text-sm text-muted-foreground text-center py-4">No common response data found for this selection.</p> )}
          </ScrollArea>
        )}
        {!selectedAssignmentForCommon && !isLoadingCommonResponses && <p className="text-sm text-muted-foreground text-center">Select an assignment to view common responses.</p>}
      </div>
    );
  };

  const renderReportExplorer = () => {
    if (!isAdmin) return <Alert variant="default"><AlertCircle className="h-4 w-4" /><AlertTitle>Access Denied</AlertTitle><AlertDescription>This feature is available for administrators only.</AlertDescription></Alert>;

    const questionColumns = selectedAssignmentDetails?.questions || [];

    return (
      <div className="space-y-4">
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5 text-primary"/>Filter Raw Responses</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="filter-assignment">Assignment</Label>
              <Select value={reportFilters.selectedAssignmentId || ""} onValueChange={(val) => setReportFilters(prev => ({...prev, selectedAssignmentId: val, selectedLocations: []}))}>
                <SelectTrigger id="filter-assignment"><SelectValue placeholder="Select an assignment..." /></SelectTrigger>
                <SelectContent>
                  {availableAssignments.map(a => <SelectItem key={a.id} value={a.id}>{a.assessmentName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
                <Label htmlFor="date-range">Date Range</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date-range"
                        variant={"outline"}
                        className={`w-full justify-start text-left font-normal ${!reportFilters.dateRange && "text-muted-foreground"}`}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {reportFilters.dateRange?.from ? (
                        reportFilters.dateRange.to ? (
                            <>{format(reportFilters.dateRange.from, "LLL dd, y")} - {format(reportFilters.dateRange.to, "LLL dd, y")}</>
                        ) : (
                            format(reportFilters.dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date range</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={reportFilters.dateRange?.from || subDays(new Date(), 30)}
                        selected={reportFilters.dateRange}
                        onSelect={(range) => setReportFilters(prev => ({...prev, dateRange: range}))}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
            <div>
              <Label>Locations</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <MapPin className="mr-2 h-4 w-4" />
                            {reportFilters.selectedLocations.length > 0 ? `${reportFilters.selectedLocations.length} selected` : "All locations"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0">
                        <Command>
                           <ScrollArea className="h-48">
                            {availableLocations.length > 0 ? availableLocations.map((loc) => (
                                <div key={loc.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer rounded-md mx-1 my-0.5" onClick={() => handleLocationFilterChange(loc.locationName, !reportFilters.selectedLocations.includes(loc.locationName))}>
                                    <Checkbox
                                        id={`loc-${loc.id}`}
                                        checked={reportFilters.selectedLocations.includes(loc.locationName)}
                                        onCheckedChange={(checked) => handleLocationFilterChange(loc.locationName, !!checked)}
                                    />
                                    <Label htmlFor={`loc-${loc.id}`} className="text-sm font-normal cursor-pointer flex-grow">{loc.locationName}</Label>
                                </div>
                            )) : <p className="p-2 text-xs text-muted-foreground text-center">No locations found.</p>}
                           </ScrollArea>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
          </CardContent>
          <CardFooter>
             <Button onClick={handleFetchRawResponses} disabled={isLoadingRawResponses || !reportFilters.selectedAssignmentId}>
                {isLoadingRawResponses ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Filter className="mr-2 h-4 w-4" />}
                Apply Filters & View Data
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="ml-auto" disabled={isLoadingRawResponses || rawResponses.length === 0 || !selectedAssignmentDetails?.questions}>
                <ArrowDownToLine className="mr-2 h-4 w-4" /> Export to CSV
            </Button>
          </CardFooter>
        </Card>

        {isLoadingRawResponses && (
            <div className="space-y-2 mt-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        )}
        {rawResponsesError && <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{rawResponsesError}</AlertDescription></Alert>}
        
        {!isLoadingRawResponses && !rawResponsesError && reportFilters.selectedAssignmentId && (
          rawResponses.length > 0 && questionColumns.length > 0 ? (
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TableIcon className="h-5 w-5"/>Raw Response Data</CardTitle><CardDescription>Total responses: {rawResponses.length}</CardDescription></CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[60vh] w-full">
                  <Table className="min-w-full">
                    <TableHeader className="sticky top-0 bg-card/80 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="w-[100px] whitespace-nowrap">Completed By</TableHead>
                        <TableHead className="w-[100px] whitespace-nowrap">Date</TableHead>
                        <TableHead className="w-[120px] whitespace-nowrap">Location</TableHead>
                        {questionColumns.map(q => <TableHead key={q.id} className="whitespace-nowrap">{q.label || q.id}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawResponses.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="truncate max-w-[100px]">{item.completedBy}</TableCell>
                          <TableCell>{formatDisplayDateShort(item.completionDate)}</TableCell>
                          <TableCell className="truncate max-w-[120px]">{item.locationName}</TableCell>
                          {questionColumns.map(q => (
                            <TableCell key={q.id} className="truncate max-w-[150px]">
                              {Array.isArray(item.responses?.[q.id]) ? (item.responses[q.id] as any[]).join(', ') : String(item.responses?.[q.id] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : reportFilters.selectedAssignmentId && !isLoadingRawResponses && rawResponses.length === 0 && (
            <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground">No raw responses found for the selected criteria.</CardContent></Card>
          )
        )}
         {!reportFilters.selectedAssignmentId && !isLoadingRawResponses && (
            <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground">Please select an assignment to view raw data.</CardContent></Card>
         )}
      </div>
    );
  };
  
  // Dummy Command component for Popover content
  const Command: React.FC<{children: React.ReactNode}> = ({ children }) => <div className="p-1">{children}</div>;


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analysis & Reports</h1>
          <p className="text-lg text-muted-foreground">
            Dashboard insights and detailed report exploration.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:w-1/2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reportExplorer">Report Explorer</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary"/>Last Completions</CardTitle></CardHeader>
              <CardContent>{renderLastCompletionsWidget()}</CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500"/>Streak</CardTitle></CardHeader>
              <CardContent>{renderStreakWidget()}</CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-purple-500"/>Common Responses</CardTitle></CardHeader>
              <CardContent>{renderCommonResponsesWidget()}</CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reportExplorer" className="mt-6">
          {renderReportExplorer()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
