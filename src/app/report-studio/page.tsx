"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Tabs,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TabsContent,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TabsList,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { getSavedReports, deleteReport } from "@/services/reportService";
import { FileText, FilePlus, FileEdit, Lightbulb, AlertTriangle, Eye, Download, Loader2, Trash2, BarChart2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Define admin roles that can access this page
const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];

export default function ReportStudioPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeTab, setActiveTab] = useState("reportViewer");
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [savedReports, setSavedReports] = useState<Record<string, unknown>[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  
  // Check if user has admin permissions
  const isAdmin = !authLoading && userProfile && ADMIN_ROLES.includes(userProfile.role || "");
  
  // Fetch saved reports when the component mounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchSavedReports = useCallback(async () => {
    if (!authLoading && userProfile?.account) {
      setIsLoadingReports(true);
      setReportsError(null);
      
      try {
        const reports = await getSavedReports(userProfile.account);
        setSavedReports(reports);
      } catch (error) {
        console.error("Failed to fetch saved reports:", error);
        setReportsError("Failed to load saved reports. Please try again.");
      } finally {
        setIsLoadingReports(false);
      }
    }
  }, [userProfile?.account, authLoading]);

  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchSavedReports();
    }
  }, [userProfile?.account, authLoading, fetchSavedReports]);
  
  // Function to handle report deletion
  const handleDeleteReport = async (reportId: string) => {
    if (!userProfile?.account) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "User account information is missing." 
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteReport(reportId, userProfile.account);
      
      // Update the local state to remove the deleted report
      setSavedReports(prevReports => prevReports.filter(report => report.id !== reportId));
      
      toast({ 
        title: "Report Deleted", 
        description: "The report has been successfully deleted." 
      });
    } catch (error) {
      console.error("Failed to delete report:", error);
      toast({ 
        variant: "destructive", 
        title: "Delete Failed", 
        description: error instanceof Error ? error.message : "An unknown error occurred." 
      });
    } finally {
      setIsDeleting(false);
      setReportToDelete(null); // Close the confirmation dialog
    }
  };
  
  // Format date for display
  const formatDate = (timestamp: unknown) => {
    console.log("formatDate received:", timestamp, "Type:", typeof timestamp);
    if (!timestamp) return "N/A";
    
    let dateValue;
    if (timestamp && typeof timestamp === 'object') {
      // Prioritize 'seconds' property if it exists (for direct Firestore Timestamp objects)
      if ('seconds' in timestamp && typeof timestamp.seconds === 'number') {
        dateValue = timestamp.seconds * 1000;
      } 
      // Fallback to '_seconds' property (for deserialized Timestamp objects)
      else if ('_seconds' in timestamp && typeof timestamp._seconds === 'number') {
        dateValue = timestamp._seconds * 1000;
      }
    }

    if (dateValue !== undefined) {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) { // Check if the date is valid
        console.error("Invalid date created from timestamp value:", dateValue);
        return "Invalid Date";
      }
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    // Fallback for ISO strings or other date formats that Date constructor can directly parse
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        console.error("Invalid date created from direct timestamp string/object:", timestamp);
        return "Invalid Date";
      }
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      console.error("Error formatting date:", e, timestamp);
      return "Invalid Date";
    }
  };

  // If the user is not an admin, show access denied
  if (!authLoading && !isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the necessary permissions to access the Report Studio.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Report Studio</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Generate, view, and edit comprehensive safety assessment reports.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-primary" /> 
              Generate New Report
            </CardTitle>
            <CardDescription>
              Create a new report from assessment data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Use AI to automatically generate a comprehensive safety assessment report based on completed inspections.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/report-studio/generate')} className="w-full">
              Create New Report
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              Interactive Analysis
            </CardTitle>
            <CardDescription>
              Analyze data with pivot tables and charts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Explore your assessment data with interactive pivot tables and visualizations. Drill down into specific metrics and create custom views.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/report-studio/analysis')} className="w-full">
              Open Data Analysis
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-primary" />
              Manage Templates
            </CardTitle>
            <CardDescription>
              Create and manage reusable report templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Design custom report layouts with placeholders for dynamic content. Ensure consistency across all reports.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/report-studio/templates')} className="w-full">
              Manage Templates
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              AI Prompt Customization
            </CardTitle>
            <CardDescription>
              Customize AI report generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Customize the AI prompts used for report generation. Tailor the AI's focus, tone, and analysis approach.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/report-studio/prompt-settings')} className="w-full">
              Customize AI Prompts
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Report Viewer</CardTitle>
          <CardDescription>
            View and manage your safety assessment reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingReports ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : reportsError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Reports</AlertTitle>
              <AlertDescription>{reportsError}</AlertDescription>
            </Alert>
          ) : savedReports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.reportName}</TableCell>
                    <TableCell>{formatDate(report.createdAt)}</TableCell>
                    <TableCell>{report.assignmentId || "Unknown Assignment"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/report-studio/view/${report.id}`}>
                            <Eye className="mr-1 h-4 w-4" /> View
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="mr-1 h-4 w-4" /> Download
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setReportToDelete(report.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting && reportToDelete === report.id ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-1 h-4 w-4" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Reports Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Generate your first report by selecting an assessment completion and using our AI-powered report generator.
              </p>
              <Button onClick={() => router.push('/report-studio/generate')}>
                Generate Your First Report
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Report Deletion */}
      <AlertDialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The report will be permanently deleted from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reportToDelete && handleDeleteReport(reportToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Report
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}