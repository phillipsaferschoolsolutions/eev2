"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { getAssignmentListMetadata, getLastCompletions, type AssignmentMetadata } from "@/services/assignmentFunctionsService";
import { generateReportForCompletion, reportToHtml, exportToPdf, exportToDocx } from "@/services/reportService";
import { ArrowLeft, FileText, Download, Loader2, FilePlus, AlertTriangle, FileDown, FileType2, Shield } from "lucide-react";

// Define the type for completion items
interface CompletionItem {
  id: string;
  parentAssignmentId?: string;
  data: {
    assessmentName?: string;
    locationName?: string;
    completedBy?: string;
    completionDate?: string;
    [key: string]: any;
  };
}

// Define admin roles that can access this page
const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];

export default function GenerateReportPage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  
  // State for assignments and completions
  const [assignments, setAssignments] = useState<AssignmentMetadata[]>([]);
  const [completions, setCompletions] = useState<CompletionItem[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [selectedCompletionId, setSelectedCompletionId] = useState<string>("");
  
  // State for loading indicators
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingCompletions, setIsLoadingCompletions] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // State for errors
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [completionsError, setCompletionsError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  
  // State for the report
  const [reportHtml, setReportHtml] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("select");
  
  // Check if user has admin permissions
  const isAdmin = !authLoading && userProfile && ADMIN_ROLES.includes(userProfile.permission);
  
  // Fetch assignments when the component mounts
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchAssignments();
    }
  }, [userProfile?.account, authLoading]);
  
  // Fetch completions when an assignment is selected
  useEffect(() => {
    if (selectedAssignmentId && userProfile?.account) {
      fetchCompletions(selectedAssignmentId);
    } else {
      setCompletions([]);
      setSelectedCompletionId("");
    }
  }, [selectedAssignmentId, userProfile?.account]);
  
  // Function to fetch assignments
  const fetchAssignments = async () => {
    if (!userProfile?.account) return;
    
    setIsLoadingAssignments(true);
    setAssignmentsError(null);
    
    try {
      const fetchedAssignments = await getAssignmentListMetadata();
      setAssignments(fetchedAssignments);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      setAssignmentsError("Failed to load assignments. Please try again.");
    } finally {
      setIsLoadingAssignments(false);
    }
  };
  
  // Function to fetch completions for a selected assignment
  const fetchCompletions = async (assignmentId: string) => {
    if (!userProfile?.account) return;
    
    setIsLoadingCompletions(true);
    setCompletionsError(null);
    
    try {
      const fetchedCompletions = await getLastCompletions(
        userProfile.account,
        assignmentId,
        null, // No school filter
        "alltime" // Get all completions
      );
      setCompletions(fetchedCompletions);
    } catch (error) {
      console.error("Failed to fetch completions:", error);
      setCompletionsError("Failed to load completions. Please try again.");
    } finally {
      setIsLoadingCompletions(false);
    }
  };
  
  // Function to generate a report
  const handleGenerateReport = async () => {
    if (!selectedAssignmentId || !selectedCompletionId || !userProfile?.account) {
      setReportError("Please select both an assignment and a completion.");
      return;
    }
    
    setIsGeneratingReport(true);
    setReportError(null);
    
    try {
      const report = await generateReportForCompletion(
        selectedAssignmentId,
        selectedCompletionId,
        userProfile.account
      );
      
      // Convert the structured report data to HTML
      const html = reportToHtml(report);
      setReportHtml(html);
      
      // Switch to the editor tab
      setActiveTab("editor");
    } catch (error) {
      console.error("Failed to generate report:", error);
      setReportError("Failed to generate report. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  // Function to handle PDF export
  const handleExportPdf = async () => {
    try {
      // Create a temporary div to hold the report content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = reportHtml;
      tempDiv.className = 'report-for-export';
      document.body.appendChild(tempDiv);
      
      // Add some basic styling for the PDF
      const style = document.createElement('style');
      style.textContent = `
        .report-for-export {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.5;
          max-width: 800px;
          margin: 0 auto;
        }
        .report-for-export h1 { font-size: 24px; margin-bottom: 16px; }
        .report-for-export h2 { font-size: 20px; margin-top: 24px; margin-bottom: 12px; }
        .report-for-export h3 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; }
        .report-for-export h4 { font-size: 16px; margin-top: 16px; margin-bottom: 8px; }
        .report-for-export p { margin-bottom: 12px; }
        .report-for-export ul, .report-for-export ol { margin-bottom: 12px; padding-left: 24px; }
        .report-for-export table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .report-for-export th, .report-for-export td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .report-for-export th { background-color: #f2f2f2; }
        .report-header { text-align: center; margin-bottom: 24px; }
        .report-company { font-weight: bold; }
        .report-footer { margin-top: 32px; text-align: center; font-size: 12px; color: #666; }
      `;
      document.head.appendChild(style);
      
      // Export to PDF
      await exportToPdf(tempDiv.outerHTML, 'safety-assessment-report.pdf');
      
      // Clean up
      document.body.removeChild(tempDiv);
      document.head.removeChild(style);
    } catch (error) {
      console.error("Failed to export to PDF:", error);
      setReportError("Failed to export to PDF. Please try again.");
    }
  };
  
  // Function to handle DOCX export
  const handleExportDocx = async () => {
    try {
      await exportToDocx(reportHtml, 'safety-assessment-report.docx');
    } catch (error) {
      console.error("Failed to export to DOCX:", error);
      setReportError("Failed to export to DOCX. Please try again.");
    }
  };
  
  // If the user is not an admin, show access denied
  if (!authLoading && !isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the necessary permissions to access the Report Studio.
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
        <h1 className="text-3xl font-bold tracking-tight">Generate Safety Assessment Report</h1>
        <p className="text-lg text-muted-foreground">
          Create comprehensive reports from completed assessments using AI.
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="select">1. Select Data</TabsTrigger>
          <TabsTrigger value="editor" disabled={!reportHtml}>2. Edit & Export</TabsTrigger>
        </TabsList>
        
        <TabsContent value="select" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Assessment and Completion</CardTitle>
              <CardDescription>
                Choose the assessment and specific completion to generate a report from.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Assignment Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Assessment</label>
                {isLoadingAssignments ? (
                  <Skeleton className="h-10 w-full" />
                ) : assignmentsError ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{assignmentsError}</AlertDescription>
                  </Alert>
                ) : (
                  <Select
                    value={selectedAssignmentId}
                    onValueChange={setSelectedAssignmentId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an assessment" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignments.length > 0 ? (
                        assignments.map((assignment) => (
                          <SelectItem key={assignment.id} value={assignment.id}>
                            {assignment.assessmentName || "Unnamed Assignment"}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No assessments found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              {/* Completion Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Completion</label>
                {isLoadingCompletions ? (
                  <Skeleton className="h-10 w-full" />
                ) : completionsError ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{completionsError}</AlertDescription>
                  </Alert>
                ) : !selectedAssignmentId ? (
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an assessment first" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>
                        Select an assessment first
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={selectedCompletionId}
                    onValueChange={setSelectedCompletionId}
                    disabled={completions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={completions.length > 0 ? "Select a completion" : "No completions found"} />
                    </SelectTrigger>
                    <SelectContent>
                      {completions.length > 0 ? (
                        completions.map((completion) => (
                          <SelectItem key={completion.id} value={completion.id}>
                            {completion.data.locationName || "Unknown Location"} - {completion.data.completedBy || "Unknown User"} - {new Date(completion.data.completionDate || completion.data.submittedTimeServer).toLocaleDateString()}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No completions found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleGenerateReport} 
                disabled={!selectedAssignmentId || !selectedCompletionId || isGeneratingReport}
                className="ml-auto"
              >
                {isGeneratingReport ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FilePlus className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {reportError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{reportError}</AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="editor" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Edit Report</CardTitle>
              <CardDescription>
                Review and customize the AI-generated report before exporting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RichTextEditor 
                value={reportHtml} 
                onChange={setReportHtml} 
                className="min-h-[600px]"
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("select")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Selection
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportDocx}>
                  <FileType2 className="mr-2 h-4 w-4" />
                  Export to DOCX
                </Button>
                <Button onClick={handleExportPdf}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export to PDF
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}