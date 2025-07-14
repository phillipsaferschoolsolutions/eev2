"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox"; 
import { getAssignmentListMetadata, type AssignmentMetadata } from "@/services/assignmentFunctionsService";
import { getAggregatedCompletions } from "@/services/analysisService";
import { getLocationsForLookup, type Location } from "@/services/locationService";
import { ArrowLeft, BarChart2, PieChart, LineChart, Table as TableIcon, Download, RefreshCw, Filter, Shield, Loader2, X, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PivotTableComponent from "@/components/analysis/PivotTableComponent";
import VisualizationComponent from "@/components/analysis/VisualizationComponent";
import type { AggregatedCompletionsPayload, AggregatedCompletionsResponse, PivotTableData } from "@/types/Analysis";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

// Define admin roles that can access this page
const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];

export default function DataAnalysisPage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // State for assignments and locations
  const [assignments, setAssignments] = useState<AssignmentMetadata[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  
  // State for selected filters
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined); 
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [yearView, setYearView] = useState<boolean>(false);
  
  // State for pivot table configuration
  const [rowDimensions, setRowDimensions] = useState<string[]>(['questionId']);
  const [colDimensions, setColDimensions] = useState<string[]>(['locationName']);
  const [measures, setMeasures] = useState<string[]>(['count']);
  
  // State for data loading
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [aggregatedData, setAggregatedData] = useState<AggregatedCompletionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // State for "Select All" functionality
  const [selectAllAssignments, setSelectAllAssignments] = useState<boolean>(false);
  const [selectAllLocations, setSelectAllLocations] = useState<boolean>(false);
  
  // State for visualization
  const [activeTab, setActiveTab] = useState("pivot");
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  
  // Check if user has admin permissions
  const isAdmin = !authLoading && userProfile && ADMIN_ROLES.includes(userProfile.permission);
  
  // Fetch assignments and locations when the component mounts
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      // Fetch assignments
      setIsLoadingAssignments(true);
      getAssignmentListMetadata()
        .then(data => {
          setAssignments(data);
          setIsLoadingAssignments(false);
        })
        .catch(err => {
          console.error("Failed to fetch assignments:", err);
          toast({ variant: "destructive", title: "Error Loading Assignments", description: err.message });
          setIsLoadingAssignments(false);
        });
      
      // Fetch locations
      setIsLoadingLocations(true);
      getLocationsForLookup(userProfile.account)
        .then(data => {
          setLocations(data);
          setIsLoadingLocations(false);
        })
        .catch(err => {
          console.error("Failed to fetch locations:", err);
          toast({ variant: "destructive", title: "Error Loading Locations", description: err.message });
          setIsLoadingLocations(false);
        });
    }
  }, [userProfile?.account, authLoading, toast]);
  
  // Handle "Select All Assignments" toggle
  useEffect(() => {
    if (selectAllAssignments) {
      const allAssignmentIds = assignments.map(assignment => assignment.id);
      setSelectedAssignmentIds(allAssignmentIds);
    } else if (selectedAssignmentIds.length === assignments.length) {
      // If all are selected but the toggle is turned off, deselect all
      setSelectedAssignmentIds([]);
    }
  }, [selectAllAssignments, assignments]);
  
  // Handle "Select All Locations" toggle
  useEffect(() => {
    if (selectAllLocations) {
      const allLocationIds = locations.map(location => location.id);
      setSelectedLocationIds(allLocationIds);
    } else if (selectedLocationIds.length === locations.length) {
      // If all are selected but the toggle is turned off, deselect all
      setSelectedLocationIds([]);
    }
  }, [selectAllLocations, locations]);
  
  // Prepare data for the pivot table
  const pivotData = useMemo(() => {
    if (!aggregatedData) return [];
    
    // Convert the aggregated data to an array of objects for the pivot table
    const data: PivotTableData[] = [];
    
    // Process the data based on the structure returned by the API
    // This is a simplified example - adjust based on your actual API response structure
    if (aggregatedData.data) {
      Object.entries(aggregatedData.data).forEach(([key, value]) => {
        // Parse the composite key if needed
        const keyParts = key.split('|');
        const row: PivotTableData = {};
        
        // Add dimension values
        if (aggregatedData.metadata?.questionLabels && keyParts[0]) {
          row.questionId = keyParts[0];
          row.questionLabel = aggregatedData.metadata.questionLabels[keyParts[0]] || keyParts[0];
        }
        
        if (keyParts[1]) {
          row.locationName = keyParts[1];
        }
        
        // Add measures
        if (typeof value === 'object') {
          Object.entries(value).forEach(([measureKey, measureValue]) => {
            row[measureKey] = measureValue;
          });
        } else {
          row.value = value;
        }
        
        data.push(row);
      });
    }
    
    return data;
  }, [aggregatedData]);
  
  // Handle fetching aggregated data
  const fetchAggregatedData = async () => {
    if (!userProfile?.account) {
      toast({ variant: "destructive", title: "Error", description: "User account information is missing." });
      return;
    }
    
    setIsLoadingData(true);
    setError(null);
    
    try {
      const payload: AggregatedCompletionsPayload = {
        assignmentIds: selectedAssignmentIds.length > 0 ? selectedAssignmentIds : undefined,
        locationIds: selectedLocationIds.length > 0 ? selectedLocationIds : undefined,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        dimensions: [...rowDimensions, ...colDimensions],
        measures: measures,
      };
      
      const result = await getAggregatedCompletions(payload, userProfile.account);
      setAggregatedData(result);
    } catch (error) {
      console.error("Failed to fetch aggregated data:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred.");
      toast({ variant: "destructive", title: "Data Fetch Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsLoadingData(false);
    }
  };
  
  // Handle dimension selection
  const handleDimensionChange = (dimension: string, type: 'row' | 'col', checked: boolean) => {
    if (type === 'row') {
      if (checked) {
        setRowDimensions(prev => [...prev, dimension]);
      } else {
        setRowDimensions(prev => prev.filter(d => d !== dimension));
      }
    } else {
      if (checked) {
        setColDimensions(prev => [...prev, dimension]);
      } else {
        setColDimensions(prev => prev.filter(d => d !== dimension));
      }
    }
  };
  
  // Handle measure selection
  const handleMeasureChange = (measure: string, checked: boolean) => {
    if (checked) {
      setMeasures(prev => [...prev, measure]);
    } else {
      setMeasures(prev => prev.filter(m => m !== measure));
    }
  };
  
  // Export data as CSV
  const exportCSV = () => {
    if (!pivotData.length) {
      toast({ variant: "destructive", title: "No Data", description: "There is no data to export." });
      return;
    }
    
    // Get all unique keys from the data
    const allKeys = new Set<string>();
    pivotData.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    
    // Create CSV header
    const headers = Array.from(allKeys);
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    pivotData.forEach(row => {
      const csvRow = headers.map(header => {
        const value = row[header];
        // Handle different value types
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return value;
      }).join(',');
      csv += csvRow + '\n';
    });
    
    // Create and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `data-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // If the user is not an admin, show access denied
  if (!authLoading && !isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the necessary permissions to access the Data Analysis tools.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Button variant="outline" onClick={() => router.push('/report-studio')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Report Studio
      </Button>
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Interactive Data Analysis</h1>
        <p className="text-lg text-muted-foreground">
          Explore your assessment data with pivot tables and visualizations.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Data Filters</CardTitle>
          <CardDescription>
            Select the data you want to analyze.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assignment Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Assignments</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="select-all-assignments"
                    checked={selectAllAssignments || (assignments.length > 0 && selectedAssignmentIds.length === assignments.length)}
                    onCheckedChange={(checked) => setSelectAllAssignments(!!checked)}
                  />
                  <Label htmlFor="select-all-assignments" className="text-xs font-normal">Select All</Label>
                </div>
              </div>
              {isLoadingAssignments ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                  {assignments.length > 0 ? (
                    assignments.map(assignment => (
                      <div key={assignment.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`assignment-${assignment.id}`}
                          checked={selectedAssignmentIds.includes(assignment.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAssignmentIds(prev => [...prev, assignment.id]);
                            } else {
                              setSelectedAssignmentIds(prev => prev.filter(id => id !== assignment.id));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`assignment-${assignment.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {assignment.assessmentName || "Unnamed Assignment"}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No assignments found.</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Location Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Locations</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="select-all-locations"
                    checked={selectAllLocations || (locations.length > 0 && selectedLocationIds.length === locations.length)}
                    onCheckedChange={(checked) => setSelectAllLocations(!!checked)}
                  />
                  <Label htmlFor="select-all-locations" className="text-xs font-normal">Select All</Label>
                </div>
              </div>
              {isLoadingLocations ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                  {locations.length > 0 ? (
                    locations.map(location => (
                      <div key={location.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`location-${location.id}`}
                          checked={selectedLocationIds.includes(location.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedLocationIds(prev => [...prev, location.id]);
                            } else {
                              setSelectedLocationIds(prev => prev.filter(id => id !== location.id));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`location-${location.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {location.locationName}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No locations found.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <div className="relative">
                <Button
                  id="start-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => {
                    setShowDatePicker(showDatePicker === 'start' ? null : 'start');
                    setYearView(false);
                  }}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                </Button>
                {showDatePicker === 'start' && (
                  <div className="absolute z-50 mt-2 p-2 bg-popover border rounded-md shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setYearView(!yearView)}
                      >
                        {yearView ? "Month View" : "Year View"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setShowDatePicker(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (!yearView) setShowDatePicker(null);
                      }}
                      initialFocus
                      captionLayout={yearView ? "dropdown-buttons" : "buttons"}
                      fromYear={2020}
                      toYear={2030}
                      view={yearView ? "year" : "month"}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <div className="relative">
                <Button
                  id="end-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => {
                    setShowDatePicker(showDatePicker === 'end' ? null : 'end');
                    setYearView(false);
                  }}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                </Button>
                {showDatePicker === 'end' && (
                  <div className="absolute z-50 mt-2 p-2 bg-popover border rounded-md shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setYearView(!yearView)}
                      >
                        {yearView ? "Month View" : "Year View"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setShowDatePicker(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        if (!yearView) setShowDatePicker(null);
                      }}
                      initialFocus
                      captionLayout={yearView ? "dropdown-buttons" : "buttons"}
                      fromYear={2020}
                      toYear={2030}
                      view={yearView ? "year" : "month"}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Dimensions and Measures */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Row Dimensions */}
            <div className="space-y-2">
              <Label>Row Dimensions</Label>
              <div className="space-y-2 border rounded-md p-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="row-questionId"
                    checked={rowDimensions.includes('questionId')}
                    onCheckedChange={(checked) => handleDimensionChange('questionId', 'row', !!checked)}
                  />
                  <Label htmlFor="row-questionId" className="text-sm font-normal cursor-pointer">
                    Question
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="row-locationName"
                    checked={rowDimensions.includes('locationName')}
                    onCheckedChange={(checked) => handleDimensionChange('locationName', 'row', !!checked)}
                  />
                  <Label htmlFor="row-locationName" className="text-sm font-normal cursor-pointer">
                    Location
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="row-completedBy"
                    checked={rowDimensions.includes('completedBy')}
                    onCheckedChange={(checked) => handleDimensionChange('completedBy', 'row', !!checked)}
                  />
                  <Label htmlFor="row-completedBy" className="text-sm font-normal cursor-pointer">
                    Completed By
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="row-completionDate"
                    checked={rowDimensions.includes('completionDate')}
                    onCheckedChange={(checked) => handleDimensionChange('completionDate', 'row', !!checked)}
                  />
                  <Label htmlFor="row-completionDate" className="text-sm font-normal cursor-pointer">
                    Completion Date
                  </Label>
                </div>
              </div>
            </div>
            
            {/* Column Dimensions */}
            <div className="space-y-2">
              <Label>Column Dimensions</Label>
              <div className="space-y-2 border rounded-md p-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-questionId"
                    checked={colDimensions.includes('questionId')}
                    onCheckedChange={(checked) => handleDimensionChange('questionId', 'col', !!checked)}
                  />
                  <Label htmlFor="col-questionId" className="text-sm font-normal cursor-pointer">
                    Question
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-locationName"
                    checked={colDimensions.includes('locationName')}
                    onCheckedChange={(checked) => handleDimensionChange('locationName', 'col', !!checked)}
                  />
                  <Label htmlFor="col-locationName" className="text-sm font-normal cursor-pointer">
                    Location
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-completedBy"
                    checked={colDimensions.includes('completedBy')}
                    onCheckedChange={(checked) => handleDimensionChange('completedBy', 'col', !!checked)}
                  />
                  <Label htmlFor="col-completedBy" className="text-sm font-normal cursor-pointer">
                    Completed By
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="col-completionDate"
                    checked={colDimensions.includes('completionDate')}
                    onCheckedChange={(checked) => handleDimensionChange('completionDate', 'col', !!checked)}
                  />
                  <Label htmlFor="col-completionDate" className="text-sm font-normal cursor-pointer">
                    Completion Date
                  </Label>
                </div>
              </div>
            </div>
            
            {/* Measures */}
            <div className="space-y-2">
              <Label>Measures</Label>
              <div className="space-y-2 border rounded-md p-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="measure-count"
                    checked={measures.includes('count')}
                    onCheckedChange={(checked) => handleMeasureChange('count', !!checked)}
                  />
                  <Label htmlFor="measure-count" className="text-sm font-normal cursor-pointer">
                    Count
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="measure-deficiencyCount"
                    checked={measures.includes('deficiencyCount')}
                    onCheckedChange={(checked) => handleMeasureChange('deficiencyCount', !!checked)}
                  />
                  <Label htmlFor="measure-deficiencyCount" className="text-sm font-normal cursor-pointer">
                    Deficiency Count
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="measure-deficiencyRate"
                    checked={measures.includes('deficiencyRate')}
                    onCheckedChange={(checked) => handleMeasureChange('deficiencyRate', !!checked)}
                  />
                  <Label htmlFor="measure-deficiencyRate" className="text-sm font-normal cursor-pointer">
                    Deficiency Rate (%)
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push('/report-studio')}>
            Cancel
          </Button>
          <Button onClick={fetchAggregatedData} disabled={isLoadingData}>
            {isLoadingData ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Data...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Fetch Data
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {aggregatedData && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Data Analysis</CardTitle>
              <Button variant="outline" onClick={exportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
            <CardDescription>
              Analyze your data using the pivot table and visualizations below.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pivot" className="flex items-center gap-2">
                    <TableIcon className="h-4 w-4" /> Pivot Table
                  </TabsTrigger>
                  <TabsTrigger value="chart" className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" /> Visualization
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="pivot" className="p-6 pt-4">
                <div className="border rounded-md overflow-auto">
                  <PivotTableComponent data={pivotData} />
                </div>
              </TabsContent>
              
              <TabsContent value="chart" className="p-6 pt-4">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button
                    variant={chartType === "bar" ? "default" : "outline"}
                    onClick={() => setChartType("bar")}
                    className="flex items-center gap-2"
                  >
                    <BarChart2 className="h-4 w-4" /> Bar Chart
                  </Button>
                  <Button
                    variant={chartType === "line" ? "default" : "outline"}
                    onClick={() => setChartType("line")}
                    className="flex items-center gap-2"
                  >
                    <LineChart className="h-4 w-4" /> Line Chart
                  </Button>
                  <Button
                    variant={chartType === "pie" ? "default" : "outline"}
                    onClick={() => setChartType("pie")}
                    className="flex items-center gap-2"
                  >
                    <PieChart className="h-4 w-4" /> Pie Chart
                  </Button>
                </div>
                
                <div className="border rounded-md p-4 h-[500px]">
                  <VisualizationComponent
                    data={pivotData}
                    type={chartType}
                    dimensions={rowDimensions}
                    measures={measures}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}