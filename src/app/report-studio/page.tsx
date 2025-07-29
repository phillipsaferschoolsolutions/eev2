"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { getSavedReports, deleteReport } from "@/services/reportService";
import { FileText, FilePlus, FileEdit, Lightbulb, AlertTriangle, Eye, Download, Loader2, Trash2, BarChart2, ArrowLeft } from "lucide-react";
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

// Force dynamic rendering to prevent build issues
export const dynamic = 'force-dynamic';

// Define admin roles that can access this page
const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];

export default function ReportStudioPage() {
  const [activeTab, setActiveTab] = useState("reportViewer");
  const router = useRouter();
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
        title: "Error", 
        description: "Failed to delete the report. Please try again." 
      });
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
    }
  };

  // Function to format date
  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return "Unknown";
    try {
      const date = new Date(timestamp as string);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch {
      return "Invalid Date";
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
            You don't have permission to access the Report Studio. Please contact your administrator.
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Report Studio</h1>
          <p className="text-muted-foreground mt-1">
            Generate, manage, and analyze reports for your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/assessment-forms')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assignments
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reportViewer">Report Viewer</TabsTrigger>
          <TabsTrigger value="reportGenerator">Report Generator</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="reportViewer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Saved Reports
              </CardTitle>
              <CardDescription>
                View and manage your previously generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[160px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reportsError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{reportsError}</AlertDescription>
                </Alert>
              ) : savedReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No reports found</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate your first report to get started
                  </p>
                  <Button onClick={() => setActiveTab("reportGenerator")}>
                    <FilePlus className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedReports.map((report: any) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.name || "Untitled Report"}</TableCell>
                        <TableCell>{formatDate(report.createdAt)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Complete
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setReportToDelete(report.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reportGenerator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FilePlus className="h-5 w-5" />
                Generate New Report
              </CardTitle>
              <CardDescription>
                Create a new report based on your assignment data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Report Generator</h3>
                <p className="text-muted-foreground mb-4">
                  This feature is coming soon. You'll be able to generate comprehensive reports from your assignment data.
                </p>
                <Button disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5" />
                Report Templates
              </CardTitle>
              <CardDescription>
                Manage report templates for consistent formatting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileEdit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Template Management</h3>
                <p className="text-muted-foreground mb-4">
                  This feature is coming soon. You'll be able to create and manage report templates.
                </p>
                <Button disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reportToDelete && handleDeleteReport(reportToDelete)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 