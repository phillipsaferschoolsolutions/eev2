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
import { generateReportForCompletion, reportToHtml, exportToPdf, exportToDocx, saveReport, getPromptSettings } from "@/services/reportService";
import { getTemplates, replacePlaceholders } from "@/services/templateService";
import type { ReportTemplate } from "@/types/Report";
import { ArrowLeft, FileText, Download, Loader2, FilePlus, AlertTriangle, FileDown, FileType2, Shield, Save, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
  const { toast } = useToast();
  
  // State for assignments and completions
  const [assignments, setAssignments] = useState<AssignmentMetadata[]>([]);
  const [completions, setCompletions] = useState<CompletionItem[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [selectedCompletionId, setSelectedCompletionId] = useState<string>("");
  
  // State for templates
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [reportGenerationMode, setReportGenerationMode] = useState<"ai" | "template">("ai");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  
  // State for loading indicators
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingCompletions, setIsLoadingCompletions] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  
  // State for errors
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [completionsError, setCompletionsError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  
  // State for the report
  const [reportHtml, setReportHtml] = useState<string>("");
  const [reportName, setReportName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("select");
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  
  // State for AI prompt customization
  const [useCustomPrompt, setUseCustomPrompt] = useState<boolean>(false);
  const [promptSettings, setPromptSettings] = useState<{customPrompt: string, promptMode: string} | null>(null);
  const [isLoadingPromptSettings, setIsLoadingPromptSettings] = useState(false);
  
  // Check if user has admin permissions
  const isAdmin = !authLoading && userProfile && ADMIN_ROLES.includes(userProfile.role || "");
  
  // Fetch assignments when the component mounts
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchAssignments();
      fetchPromptSettings();
      fetchTemplates();
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
  
  // Function to fetch prompt settings
  const fetchPromptSettings = async () => {
    if (!userProfile?.account) return;
    
    setIsLoadingPromptSettings(true);
    
    try {
      const settings = await getPromptSettings(userProfile.account);
      setPromptSettings(settings || { customPrompt: '', promptMode: 'extend' });
    } catch (error) {
      console.error("Failed to fetch prompt settings:", error);
      // Set default empty settings if fetch fails
      setPromptSettings({ customPrompt: '', promptMode: 'extend' });
    } finally {
      setIsLoadingPromptSettings(false);
    }
  };
  
  // Function to fetch templates
  const fetchTemplates = async () => {
    if (!userProfile?.account) return;
    
    setIsLoadingTemplates(true);
    
    try {
      const fetchedTemplates = await getTemplates(userProfile.account);
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      // Don't set an error state here, as templates are optional
    } finally {
      setIsLoadingTemplates(false);
    }
  };
  
  // Function to generate a report
  const handleGenerateReport = async () => {
    if (!selectedAssignmentId || !selectedCompletionId || !userProfile?.account) {
      setReportError("Please select both an assignment and a completion.");
      return;
    }
    
    if (reportGenerationMode === "template" && !selectedTemplateId) {
      setReportError("Please select a template for template-based report generation.");
      return;
    }
    
    setIsGeneratingReport(true);
    setReportError(null);
    setSavedReportId(null); // Reset saved status on new generation
    
    try {
      // Fetch completion and assignment data at the beginning
      const { getCompletionDetails, getAssignmentById } = await import("@/services/assignmentFunctionsService");
      const fetchedCompletionData = await getCompletionDetails(selectedAssignmentId, selectedCompletionId, userProfile.account);
      const fetchedAssignmentData = await getAssignmentById(selectedAssignmentId, userProfile.account);
      
      if (reportGenerationMode === "ai") {
        // AI-generated report
        const useCustomSettings = useCustomPrompt && promptSettings && promptSettings.customPrompt.trim() !== "";
        
        const report = await generateReportForCompletion(
          selectedAssignmentId,
          selectedCompletionId,
          userProfile.account,
          useCustomSettings ? {
            customPrompt: promptSettings.customPrompt,
            promptMode: promptSettings.promptMode
          } : undefined
        );
        
        // Convert the structured report data to HTML
        const html = reportToHtml(
          report, 
          userProfile.account, 
          userProfile.email || user?.email || "Unknown User",
          fetchedCompletionData,
          fetchedAssignmentData
        );
        setReportHtml(html);
        setReportName(report.reportName || report.title || "Untitled Report");
      } else {
        // Template-based report
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        if (!selectedTemplate) {
          throw new Error("Selected template not found.");
        }
        
        // Replace placeholders in the template
        const html = replacePlaceholders(
          selectedTemplate.htmlContent,
          fetchedCompletionData,
          fetchedAssignmentData,
          userProfile.account,
          userProfile.email || "Unknown User"
        );
        
        setReportHtml(html);
        setReportName(`${selectedTemplate.name} - ${fetchedAssignmentData?.assessmentName || "Report"}`);
      }
      
      // Switch to the editor tab
      setActiveTab("editor");
    } catch (error) {
      console.error("Failed to generate report:", error);
      setReportError("Failed to generate report. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Function to save the report
  const handleSaveReport = async () => {
    if (!reportName || !reportHtml || !selectedAssignmentId || !selectedCompletionId || !userProfile?.account) {
      toast({ variant: "destructive", title: "Save Failed", description: "Missing report data to save." });
      return;
    }

    setIsSavingReport(true);
    try {
      const result = await saveReport(
        reportName,
        reportHtml,
        selectedAssignmentId,
        selectedCompletionId,
        userProfile.account
      );
      setSavedReportId(result.id);
      toast({ title: "Report Saved", description: `Report "${reportName}" saved successfully!` });
    } catch (error) {
      console.error("Error saving report:", error);
      toast({ variant: "destructive", title: "Save Failed", description: (error as Error).message || "An unknown error occurred while saving the report." });
    } finally {
      setIsSavingReport(false);
    }
  };
  
  // Function to handle PDF export
  const handleExportPdf = async () => {
    try {
      await exportToPdf(reportHtml, `${reportName.replace(/\s/g, '_')}.pdf`);
    } catch (error) {
      console.error("Failed to export to PDF:", error);
      setReportError("Failed to export to PDF. Please try again.");
    }
  };
  
  // Function to handle DOCX export
  const handleExportDocx = async () => {
    try {
      await exportToDocx(reportHtml, `${reportName.replace(/\s/g, '_')}.docx`);
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
              
              {/* AI Prompt Customization Toggle */}
              {isAdmin && promptSettings && (
                <div className="mt-6 p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      <h3 className="font-medium">AI Prompt Customization</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="useCustomPrompt" 
                        checked={useCustomPrompt} 
                        onCheckedChange={setUseCustomPrompt}
                        disabled={!promptSettings || !promptSettings.customPrompt}
                      />
                      <Label htmlFor="useCustomPrompt">
                        {useCustomPrompt ? "Using Custom Prompt" : "Using Default Prompt"}
                      </Label>
                    </div>
                  </div>
                  
                  {isLoadingPromptSettings ? (
                    <Skeleton className="h-10 w-full" />
                  ) : promptSettings && promptSettings.customPrompt ? (
                    <div className="text-sm text-muted-foreground">
                      <p>
                        {useCustomPrompt 
                          ? `Using your custom AI instructions (${promptSettings.promptMode === "extend" ? "extending" : "replacing"} the default prompt).` 
                          : "Custom prompt is available but not enabled. Toggle the switch to use it."}
                      </p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto text-xs"
                        onClick={() => router.push('/report-studio/prompt-settings')}
                      >
                        View or edit your custom prompt
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      <p>No custom prompt has been set up yet.</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto text-xs"
                        onClick={() => router.push('/report-studio/prompt-settings')}
                      >
                        Create a custom prompt
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleGenerateReport} 
                disabled={
                  !selectedAssignmentId || 
                  !selectedCompletionId || 
                  isGeneratingReport ||
                  (reportGenerationMode === "template" && !selectedTemplateId)
                }
                className="ml-auto"
              >
                {isGeneratingReport ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {reportGenerationMode === "ai" ? "Generating AI Report..." : "Generating Template Report..."}
                  </>
                ) : (
                  <>
                    <FilePlus className="mr-2 h-4 w-4" />
                    {reportGenerationMode === "ai" ? "Generate AI Report" : "Generate from Template"}
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
              <CardTitle>Edit Report: {reportName}</CardTitle>
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
                <Button 
                  onClick={handleSaveReport} 
                  disabled={isSavingReport || savedReportId !== null}
                >
                  {isSavingReport ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : savedReportId ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Report
                    </>
                  )}
                </Button>
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