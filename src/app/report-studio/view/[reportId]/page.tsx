"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getReportById, exportToPdf, exportToDocx } from "@/services/reportService";
import { ArrowLeft, FileDown, FileType2, Shield, AlertTriangle, Eye, Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Force dynamic rendering to prevent build issues
export const dynamic = 'force-dynamic';

// Define admin roles that can access this page
const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];

// Interface for report data
interface ReportData {
  id: string;
  reportName: string;
  htmlContent: string;
  assignmentName?: string;
  assignmentId?: string;
  completionId?: string;
  createdAt: unknown;
  updatedAt?: unknown;
  createdBy?: string;
  accountId?: string;
}

export default function ViewReportPage() {
  const params = useParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const reportId = typeof params.reportId === 'string' ? params.reportId : '';
  
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("view");
  const [isExporting, setIsExporting] = useState(false);
  
  // Check if user has admin permissions
  const isAdmin = !authLoading && userProfile && ADMIN_ROLES.includes(userProfile.role || "");
  
  useEffect(() => {
    if (!reportId) {
      setError("Report ID is missing.");
      setIsLoading(false);
      return;
    }
    
    if (!authLoading && userProfile?.account) {
      const fetchReport = async () => {
        if (!userProfile?.account) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
          const fetchedReport = await getReportById(reportId, userProfile.account);
          setReport(fetchedReport as ReportData);
        } catch (error) {
          console.error("Failed to fetch report:", error);
          setError("Failed to load report. Please try again.");
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchReport();
    }
  }, [reportId, userProfile?.account, authLoading]);
  
  const handleExportPdf = async () => {
    if (!report?.htmlContent) {
      toast({ variant: "destructive", title: "Export Failed", description: "Report content is missing." });
      return;
    }
    
    setIsExporting(true);
    try {
      await exportToPdf(report.htmlContent, `${report.reportName.replace(/\s/g, '_')}.pdf`);
      toast({ title: "Export Successful", description: "Report exported to PDF successfully." });
    } catch (error) {
      console.error("Failed to export to PDF:", error);
      toast({ variant: "destructive", title: "Export Failed", description: "Failed to export to PDF. Please try again." });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleExportDocx = async () => {
    if (!report?.htmlContent) {
      toast({ variant: "destructive", title: "Export Failed", description: "Report content is missing." });
      return;
    }
    
    setIsExporting(true);
    try {
      await exportToDocx(report.htmlContent, `${report.reportName.replace(/\s/g, '_')}.docx`);
      toast({ title: "Export Successful", description: "Report exported to DOCX successfully." });
    } catch (error) {
      console.error("Failed to export to DOCX:", error);
      toast({ variant: "destructive", title: "Export Failed", description: "Failed to export to DOCX. Please try again." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareReport = () => {
    if (report) {
      const shareUrl = `${window.location.origin}/report-studio/view/${report.id}`;
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link Copied", description: "Report link copied to clipboard." });
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
        <h1 className="text-3xl font-bold tracking-tight">View Report</h1>
        <p className="text-lg text-muted-foreground">
          View and export saved safety assessment reports.
        </p>
      </div>
      
      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[600px] w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : report ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  {report.reportName}
                </CardTitle>
                <CardDescription className="mt-2">
                  Created on {formatDate(report.createdAt)} for assignment: {report.assignmentName || "Unknown Assignment"}
                </CardDescription>
                <div className="flex gap-2 mt-2">
                  {report.createdBy && (
                    <Badge variant="outline">Created by: {report.createdBy}</Badge>
                  )}
                  {report.assignmentId && (
                    <Badge variant="secondary">Assignment ID: {report.assignmentId}</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleShareReport}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" onClick={handleExportDocx} disabled={isExporting}>
                  <FileType2 className="mr-2 h-4 w-4" />
                  Export DOCX
                </Button>
                <Button onClick={handleExportPdf} disabled={isExporting}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="view">Report View</TabsTrigger>
                <TabsTrigger value="source">HTML Source</TabsTrigger>
              </TabsList>
              
              <TabsContent value="view" className="mt-4">
                <div className="border rounded-lg p-6 bg-white shadow-sm">
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: report.htmlContent }} 
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="source" className="mt-4">
                <div className="border rounded-lg p-4 bg-muted/30">
                  <pre className="text-sm overflow-auto max-h-[600px] whitespace-pre-wrap">
                    {report.htmlContent}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              Report ID: {report.id}
            </div>
            <div className="flex gap-2">
              {isExporting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Exporting...
                </div>
              )}
            </div>
          </CardFooter>
        </Card>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Report Not Found</AlertTitle>
          <AlertDescription>The requested report could not be found.</AlertDescription>
        </Alert>
      )}
    </div>
  );
  
  // Format date for display
  function formatDate(timestamp: unknown) {
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
      const date = new Date(timestamp as string | number | Date);
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
  }
} 