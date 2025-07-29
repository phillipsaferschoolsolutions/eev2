"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Download, Save, Loader2, AlertTriangle, Settings2 } from "lucide-react";
import { getAssignmentListMetadata, type AssignmentMetadata } from "@/services/assignmentFunctionsService";
import { generateReportForCompletion, saveReport, exportToPdf, exportToDocx } from "@/services/reportService";
import { getTemplates, type ReportTemplate } from "@/services/templateService";

// Force dynamic rendering to prevent build issues
export const dynamic = 'force-dynamic';

// Define admin roles that can access this page
const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];

// Schema for report generation form
const reportGenerationSchema = z.object({
  assignmentId: z.string().min(1, "Please select an assignment."),
  completionId: z.string().min(1, "Please select a completion."),
  reportName: z.string().min(3, "Report name must be at least 3 characters."),
  customPrompt: z.string().optional(),
  templateId: z.string().optional(),
});

type ReportGenerationData = z.infer<typeof reportGenerationSchema>;

export default function ReportGenerationPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // State for assignments and completions
  const [assignments, setAssignments] = useState<AssignmentMetadata[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // State for report generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Form setup
  const { control, register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ReportGenerationData>({
    resolver: zodResolver(reportGenerationSchema),
    defaultValues: {
      assignmentId: "",
      completionId: "",
      reportName: "",
      customPrompt: "",
      templateId: "",
    },
  });

  const watchedAssignmentId = watch("assignmentId");

  // Check if user has admin permissions
  const isAdmin = !authLoading && userProfile && ADMIN_ROLES.includes(userProfile.role || "");

  // Fetch assignments
  const fetchAssignments = useCallback(async () => {
    if (!userProfile?.account) return;

    setIsLoadingAssignments(true);
    try {
      const fetchedAssignments = await getAssignmentListMetadata();
      setAssignments(fetchedAssignments);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      toast({
        variant: "destructive",
        title: "Error Loading Assignments",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoadingAssignments(false);
    }
  }, [userProfile?.account, toast]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!userProfile?.account) return;

    setIsLoadingTemplates(true);
    try {
      const fetchedTemplates = await getTemplates(userProfile.account);
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      // Don't show error toast for templates as they're optional
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [userProfile?.account]);

  // Fetch data on mount
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchAssignments();
      fetchTemplates();
    }
  }, [authLoading, userProfile?.account, fetchAssignments, fetchTemplates]);

  // Handle assignment selection
  useEffect(() => {
    if (watchedAssignmentId) {
      // In a real implementation, you would fetch completions for the selected assignment
      // For now, we'll use mock data
      setCompletions([
        { id: "completion1", name: "Completion 1", date: "2024-01-15" },
        { id: "completion2", name: "Completion 2", date: "2024-01-20" },
      ]);
    } else {
      setCompletions([]);
    }
  }, [watchedAssignmentId]);

  // Handle report generation
  const handleGenerateReport = async (data: ReportGenerationData) => {
    if (!userProfile?.account) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User account information is missing.",
      });
      return;
    }

    setIsGenerating(true);
    setReportError(null);
    setGeneratedReport(null);

    try {
      const report = await generateReportForCompletion(
        data.assignmentId,
        data.completionId,
        userProfile.account,
        {
          customPrompt: data.customPrompt,
        }
      );

      setGeneratedReport(report.htmlContent);
      toast({
        title: "Report Generated",
        description: "Your report has been successfully generated.",
      });
    } catch (error) {
      console.error("Failed to generate report:", error);
      setReportError(error instanceof Error ? error.message : "Failed to generate report");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate report. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle saving report
  const handleSaveReport = async () => {
    if (!generatedReport || !userProfile?.account) return;

    const formData = watch();
    try {
      await saveReport(
        formData.reportName,
        generatedReport,
        formData.assignmentId,
        formData.completionId,
        userProfile.account
      );

      toast({
        title: "Report Saved",
        description: "Your report has been successfully saved.",
      });
    } catch (error) {
      console.error("Failed to save report:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save report. Please try again.",
      });
    }
  };

  // Handle export to PDF
  const handleExportPdf = async () => {
    if (!generatedReport) return;

    const formData = watch();
    try {
      await exportToPdf(generatedReport, `${formData.reportName}.pdf`);
      toast({
        title: "PDF Exported",
        description: "Your report has been exported as PDF.",
      });
    } catch (error) {
      console.error("Failed to export PDF:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export PDF. Please try again.",
      });
    }
  };

  // Handle export to DOCX
  const handleExportDocx = async () => {
    if (!generatedReport) return;

    const formData = watch();
    try {
      await exportToDocx(generatedReport, `${formData.reportName}.docx`);
      toast({
        title: "DOCX Exported",
        description: "Your report has been exported as DOCX.",
      });
    } catch (error) {
      console.error("Failed to export DOCX:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export DOCX. Please try again.",
      });
    }
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access the Report Generator. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Report Generator</h1>
          <p className="text-muted-foreground mt-1">
            Generate comprehensive reports from your assignment data
          </p>
        </div>
        <Button onClick={() => router.push('/report-studio')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Report Studio
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Report
            </CardTitle>
            <CardDescription>
              Select assignment data and generate a comprehensive report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleGenerateReport)} className="space-y-4">
              <div>
                <Label htmlFor="assignmentId">Assignment</Label>
                <Controller
                  name="assignmentId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingAssignments ? (
                          <SelectItem value="" disabled>
                            Loading assignments...
                          </SelectItem>
                        ) : assignments.length === 0 ? (
                          <SelectItem value="" disabled>
                            No assignments found
                          </SelectItem>
                        ) : (
                          assignments.map((assignment) => (
                            <SelectItem key={assignment.id} value={assignment.id}>
                              {assignment.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.assignmentId && (
                  <p className="text-sm text-destructive mt-1">{errors.assignmentId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="completionId">Completion</Label>
                <Controller
                  name="completionId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchedAssignmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a completion" />
                      </SelectTrigger>
                      <SelectContent>
                        {completions.length === 0 ? (
                          <SelectItem value="" disabled>
                            {watchedAssignmentId ? "No completions found" : "Select an assignment first"}
                          </SelectItem>
                        ) : (
                          completions.map((completion) => (
                            <SelectItem key={completion.id} value={completion.id}>
                              {completion.name} - {completion.date}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.completionId && (
                  <p className="text-sm text-destructive mt-1">{errors.completionId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="reportName">Report Name</Label>
                <Input
                  id="reportName"
                  {...register("reportName")}
                  placeholder="Enter report name"
                />
                {errors.reportName && (
                  <p className="text-sm text-destructive mt-1">{errors.reportName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customPrompt">Custom Prompt (Optional)</Label>
                <Textarea
                  id="customPrompt"
                  {...register("customPrompt")}
                  placeholder="Enter custom instructions for report generation..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="templateId">Template (Optional)</Label>
                <Controller
                  name="templateId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No template</SelectItem>
                        {isLoadingTemplates ? (
                          <SelectItem value="" disabled>
                            Loading templates...
                          </SelectItem>
                        ) : (
                          templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <Button type="submit" disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Generated Report Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generated Report
            </CardTitle>
            <CardDescription>
              Preview and manage your generated report
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Generation Error</AlertTitle>
                <AlertDescription>{reportError}</AlertDescription>
              </Alert>
            ) : generatedReport ? (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: generatedReport }} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveReport} variant="outline">
                    <Save className="mr-2 h-4 w-4" />
                    Save Report
                  </Button>
                  <Button onClick={handleExportPdf} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button onClick={handleExportDocx} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export DOCX
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Report Generated</h3>
                <p className="text-muted-foreground">
                  Fill out the form and click "Generate Report" to create your first report.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 