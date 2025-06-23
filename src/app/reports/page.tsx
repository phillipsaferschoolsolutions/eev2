
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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { DateRange } from "react-day-picker";

import { getDashboardWidgetsSandbox, getRawResponses, getCommonResponsesForAssignment } from "@/services/analysisService";
import type { AssignmentMetadata } from "@/services/assignmentFunctionsService";
import { getAssignmentListMetadata, getAssignmentById } from "@/services/assignmentFunctionsService";
import type { Location } from "@/services/locationService";
import { getLocationsForLookup } from "@/services/locationService";

import type { WidgetSandboxData, UserActivity, AssignmentCompletionStatus, ReportFilterOptions, RawResponse, SchoolsWithQuestionsResponse, SchoolQuestionAnswers } from "@/types/Analysis";
import { 
  Activity, BarChartHorizontal, ChevronLeft, ChevronRight, 
  TrendingUp, ListChecks, FileText, Settings2, Download, 
  ShieldCheck, Users, MessageSquare,
  Filter, CalendarIcon, MapPin, AlertCircle, Loader2, 
  TableIcon, GripVertical, ArrowDownToLine 
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";



const PERIOD_OPTIONS = [
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "last90days", label: "Last 90 Days" },
  { value: "alltime", label: "All Time" },
];

const ItemTypes = {
  QUESTION: 'question',
  SUMMARY: 'summary',
};


const formatDisplayDateShort = (dateString?: string | Date) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) { return String(dateString); }
};

// Initialize Firebase Functions (ensure Firebase app is initialized elsewhere)
// const functions = getFunctions(); // Uncomment and initialize correctly if needed here, or import already initialized instance
const functions = getFunctions(); // Assuming default Firebase app initialization

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

  // --- Report Studio State ---
  const [reportStudioData, setReportStudioData] = useState<RawResponse[]>([]);
  const [isLoadingReportStudioData, setIsLoadingReportStudioData] = useState(false);
  const [reportStudioError, setReportStudioError] = useState<string | null>(null);
  const [reportSummary, setReportSummary] = useState<string | null>(null);
  const [isLoadingReportSummary, setIsLoadingReportSummary] = useState(false);


  const isAdmin = !profileLoading && userProfile && (userProfile.permission === 'admin' || userProfile.permission === 'superAdmin');


  interface DraggableItemProps {
    type: string;
    id: string;
    label: string;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ type, id, label }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: type,
        item: { id, type, label },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    return (
        <div
            ref={drag}
            className={`p-2 border rounded-md bg-white text-sm mb-1 cursor-move ${isDragging ? 'opacity-50' : ''}`}
            style={{ opacity: isDragging ? 0.5 : 1 }}
        >
            {label}
        </div>
    );
};

  // Fetch data for Dashboard widgets
  useEffect(() => {
    if (userProfile?.account && activeTab === 'dashboard' && !authLoading && !profileLoading) {
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
  }, [userProfile?.account, activeTab, authLoading, profileLoading]);

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
  }, [userProfile?.account, selectedAssignmentForCommon, commonResponsesPeriod, activeTab, authLoading, profileLoading]);


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
  }, [reportFilters.selectedAssignmentId, userProfile?.account, authLoading, profileLoading, toast]);


  const DropArea: React.FC = () => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: [ItemTypes.QUESTION, ItemTypes.SUMMARY],
        drop: (item, monitor) => {
            console.log('Dropped item:', item); // Log dropped item for now
            // Here you would handle adding the item to your report layout state
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    }));

    return (
        <div
            ref={drop}
            className={`w-full h-64 border-2 border-dashed rounded-md flex items-center justify-center ${isOver ? 'bg-blue-100 border-blue-500' : 'border-gray-300 bg-gray-50'}`}
        >
            {isOver ? 'Drop here!' : 'Drag items here to build your report'}
        </div>
    );
  };

  const handleFetchReportStudioData = useCallback(async () => {
    if (!isAdmin || !reportFilters.selectedAssignmentId || !userProfile?.account) {
      setReportStudioData([]);
      if (isAdmin && !reportFilters.selectedAssignmentId) {
        toast({ variant: "warning", title: "Action Needed", description: "Please select an assignment to load data." });
      }
      return;
    }
  
    setIsLoadingReportStudioData(true);
    setReportStudioError(null);
  
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
  
      const data = await getRawResponses(reportFilters.selectedAssignmentId, filtersPayload, userProfile.account);
      setReportStudioData(data);
    } catch (err: any) {
      console.error("Error loading report studio data:", err);
      setReportStudioError(err.message || "Failed to load report studio data.");
      setReportStudioData([]);
    } finally {
      setIsLoadingReportStudioData(false);
    }
  }, [isAdmin, reportFilters, userProfile?.account]);


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

    return [headers.join(','), ...rows].join('');
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

  const handleGenerateSummary = useCallback(async () => {
    if (!isAdmin || !reportFilters.selectedAssignmentId || !userProfile?.account || reportStudioData.length === 0) {
        if (isAdmin && !reportFilters.selectedAssignmentId) {
             toast({ variant: "warning", title: "Action Needed", description: "Please select an assignment and load data before generating a summary." });
        } else if (reportStudioData.length === 0) {
             toast({ variant: "warning", title: "Action Needed", description: "No data loaded to summarize. Please apply filters and load data." });
        }
        return;
    }

    setIsLoadingReportSummary(true);
    setReportSummary(null); // Clear previous summary
    setReportStudioError(null); // Clear previous errors

    const summarizeCompletedAssignmentsCallable = httpsCallable(functions, 'summarizeCompletedAssignments'); // Replace 'summarizeCompletedAssignments' with your actual function name if different

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

      const result = await summarizeCompletedAssignmentsCallable({
        accountId: userProfile.account,
        assignmentId: reportFilters.selectedAssignmentId,
        filters: filtersPayload,
      });    // Added semicolon here
        const summaryData = result.data as { status: string; summary?: string; message?: string };
        if (summaryData.status === 'success') { // Added the check here
          setReportSummary(summaryData.summary);
          toast({ title: "Summary Generated", description: "AI summary has been generated." });
        } else {
          setReportStudioError(summaryData.message || 'Could not generate report summary.');
          toast({ variant: "destructive", title: "Summary Error", description: summaryData.message || "Failed to generate AI summary." });
        }

    } catch (err: any) {
        console.error("Error generating report summary:", err);
        setReportStudioError(err.message || "Could not generate report summary due to an internal error.");
         toast({ variant: "destructive", title: "Summary Error", description: err.message || "An unexpected error occurred during summarization." });
    } finally {
        setIsLoadingReportSummary(false);
    }
  }, [isAdmin, reportFilters, userProfile?.account, reportStudioData.length, toast]); // Added toast to dependencies


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
      <ScrollArea className="h-60 pt-0">
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

  const renderReportStudio = () => {
    if (!isAdmin) return <Alert variant="default"><AlertCircle className="h-4 w-4" /><AlertTitle>Access Denied</AlertTitle><AlertDescription>This feature is available for administrators only.</AlertDescription></Alert>;

    const questionColumns = selectedAssignmentDetails?.questions || [];

    return (
        <div className="space-y-4">
            <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/>Report Studio</CardTitle>
                    <CardDescription>Generate custom reports and summaries.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Filtering Options (Similar to Report Explorer) */}
                    <div>
                        <Label htmlFor="studio-filter-assignment">Assignment</Label>
                        <Select value={reportFilters.selectedAssignmentId || ""} onValueChange={(val) => setReportFilters(prev => ({...prev, selectedAssignmentId: val, selectedLocations: []}))}>
                            <SelectTrigger id="studio-filter-assignment"><SelectValue placeholder="Select an assignment..." /></SelectTrigger>
                            <SelectContent>
                                {availableAssignments.map(a => <SelectItem key={a.id} value={a.id}>{a.assessmentName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="studio-date-range">Date Range</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="studio-date-range"
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
                                                    id={`studio-loc-${loc.id}`}
                                                    checked={reportFilters.selectedLocations.includes(loc.locationName)}
                                                    onCheckedChange={(checked) => handleLocationFilterChange(loc.locationName, !!checked)}
                                                />
                                                <Label htmlFor={`studio-loc-${loc.id}`} className="text-sm font-normal cursor-pointer flex-grow">{loc.locationName}</Label>
                                            </div>
                                        )) : <p className="p-2 text-xs text-muted-foreground text-center">No locations found.</p>}
                                    </ScrollArea>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    {/* Available Fields / Draggable Items */}
                    <div className="space-y-2">
                        <h4 className="text-md font-semibold mb-2">Available Items</h4>
                        <ScrollArea className="h-48 border rounded-md p-2">
                            {/* Draggable Questions */}
                            {selectedAssignmentDetails?.questions?.map(q => (
                                <DraggableItem key={q.id} type={ItemTypes.QUESTION} id={q.id} label={q.label || q.id} />
                            ))}
                            {/* Draggable Summary */}
                            {reportSummary && <DraggableItem type={ItemTypes.SUMMARY} id="summary" label="AI Summary" />}
                            {!selectedAssignmentDetails?.questions?.length && !reportSummary && (
                                <p className="text-sm text-muted-foreground text-center">Load data to see available items.</p>
                            )}
                        </ScrollArea>
                    </div>
                    {/* Drop Area (Report Canvas) - Placeholder */}
                    <div className="space-y-2">
                        <h4 className="text-md font-semibold mb-2">Report Layout (Drag items here)</h4>
                        <DropArea /> {/* Use the DropArea component */}
                    </div>
                </CardContent>
                 <CardFooter className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleFetchReportStudioData} disabled={isLoadingReportStudioData || !reportFilters.selectedAssignmentId}>
                        {isLoadingReportStudioData ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Filter className="mr-2 h-4 w-4" />}
                        Apply Filters & Load Data
                    </Button>
                     {/* Button to trigger AI Summarization */}
                    <Button
                      onClick={handleGenerateSummary} // Use the new function
                      disabled={isLoadingReportStudioData || isLoadingReportSummary || reportStudioData.length === 0 || !reportFilters.selectedAssignmentId} // Ensure disabled when no data or no assignment selected
                      variant="secondary"
                    >
                      {isLoadingReportSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileText className="mr-2 h-4 w-4" />}
                      Generate AI Summary
                    </Button>

                </CardFooter>
            </Card>

            {isLoadingReportStudioData && (
                 <div className="space-y-2 mt-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            )}
             {reportStudioError && <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{reportStudioError}</AlertDescription></Alert>}


            {!isLoadingReportStudioData && !reportStudioError && reportFilters.selectedAssignmentId && (
                reportStudioData.length > 0 && questionColumns.length > 0 ? (
                    <Card className="mt-4">
                       <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TableIcon className="h-5 w-5"/>Loaded Data</CardTitle><CardDescription>Total records: {reportStudioData.length}</CardDescription></CardHeader>
                       <CardContent>
                         {/* Display Raw Data */}
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
                                        {reportStudioData.map(item => (
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
                ) : reportFilters.selectedAssignmentId && !isLoadingReportStudioData && reportStudioData.length === 0 && (
                    <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground">No data found for the selected criteria.</CardContent></Card>
                )
            )}
             {!reportFilters.selectedAssignmentId && !isLoadingReportStudioData && (
                <Card className="mt-4"><CardContent className="pt-6 text-center text-muted-foreground">Please select an assignment and apply filters to load data.</CardContent></Card>
             )}

            {/* AI Summary Section */}
             {isLoadingReportSummary && (
                 <div className="space-y-2 mt-4">
                    <Skeleton className="h-8 w-1/2" />
                     <Skeleton className="h-20 w-full" />
                </div>
             )}
            {reportSummary && !isLoadingReportSummary && (
                <Card className="mt-4">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-purple-500"/>AI Summary</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reportSummary}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
  };

  
  // Dummy Command component for Popover content
  const Command: React.FC<{children: React.ReactNode}> = ({ children }) => <div className="p-1">{children}</div>;


  return (
    <DndProvider backend={HTML5Backend}> {/* Wrap with DndProvider */}
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
            <TabsTrigger value="reportStudio">Report Studio</TabsTrigger> {/* New Trigger */}
          </TabsList>

          <TabsContent value="dashboard" className="mt-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary"/>Last Completions</CardTitle></CardHeader>
                <CardContent className="p-0 pt-0">{renderLastCompletionsWidget()}</CardContent>
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
            {/* ADD THIS LINE to render your new widget */}
            <SafetyPlansWidget />

          </TabsContent>

          <TabsContent value="reportExplorer" className="mt-6">
            {renderReportExplorer()}
          </TabsContent>

          <TabsContent value="reportStudio" className="mt-6">
            {renderReportStudio()} {/* Call the new render function */}
          </TabsContent>

        </Tabs>
      </div>
    </DndProvider> // Close DndProvider
  );
}







// ---------------- START: SafetyPlansWidget Component Code ----------------

// First, we need to add a few more imports to the top of your page.tsx file
// I will list these in the next step, but they include things like:
// import { ShieldCheck, TrendingUp, Users, BarChartHorizontal, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
// import { Progress } from "@/components/ui/progress";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const SafetyPlansWidget = () => {
  // --- Hardcoded Mock Data ---
  const safetyPlanStats = {
    percentageCompleted: 78,
    currentProgress: 62,
  };

  const accountsNotStarted = [
    { id: 'acc_01', name: 'Sunnyvale Unified School District', lastActivity: 'Never' },
    { id: 'acc_02', name: 'Maplewood County Schools', lastActivity: 'Never' },
    { id: 'acc_03', name: 'Oceanview Preparatory Academy', lastActivity: 'Never' },
    { id: 'acc_04', name: 'Ironwood Charter Group', lastActivity: 'Never' },
    { id: 'acc_05', name: 'Crestline Public Schools', lastActivity: 'Never' },
    { id: 'acc_06', name: 'Riverbend District', lastActivity: 'Never' },
  ];

  const deficienciesBySection = [
    { section: "Emergency Protocols", count: 28 },
    { section: "Access Control", count: 19 },
    { section: "Communication Systems", count: 15 },
    { section: "Incident Response", count: 12 },
    { section: "Physical Security", count: 9 },
    { section: "Cybersecurity", count: 5 },
  ];

  // --- Pagination State & Logic ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  const totalPages = Math.ceil(accountsNotStarted.length / itemsPerPage);
  const paginatedAccounts = accountsNotStarted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card className="w-full col-span-1 md:col-span-2 xl:col-span-3 bg-card/50 border-2 border-dashed">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          Safety Plan Status Overview
        </CardTitle>
        <CardDescription>
          A high-level summary of safety plan completion and identified deficiencies across all accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Top Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Completion Rate</CardTitle>
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{safetyPlanStats.percentageCompleted}%</div>
              <p className="text-xs text-muted-foreground">of all required safety plans are complete.</p>
              <Progress value={safetyPlanStats.percentageCompleted} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Active Plan Progress</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{safetyPlanStats.currentProgress}%</div>
              <p className="text-xs text-muted-foreground">average progress for plans currently in-flight.</p>
              <Progress value={safetyPlanStats.currentProgress} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Bottom Details Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Accounts Not Started Table */}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Users className="h-5 w-5" />
              Accounts That Have Not Yet Started
            </h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School District</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAccounts.map(account => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                    <Select onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }} defaultValue={String(itemsPerPage)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Rows per page" />
                        </SelectTrigger>
                        <SelectContent>
                            {[1, 3, 5, 10].map(size => (
                                <SelectItem key={size} value={String(size)}>{size} rows</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
          </div>

          {/* Deficiencies Chart */}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <BarChartHorizontal className="h-5 w-5" />
              Deficiencies by Section
            </h3>
            <div className="w-full h-[300px] p-2 border rounded-lg">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deficienciesBySection} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="section" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'rgba(230, 230, 230, 0.4)' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------------- END: SafetyPlansWidget Component Code ----------------

