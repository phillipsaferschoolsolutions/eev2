"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getReportById, exportToPdf, exportToDocx } from "@/services/reportService";
import { ArrowLeft, FileDown, FileType2, Shield, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define admin roles that can access this page
const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];

export default function ViewReportPage() {
  const params = useParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const reportId = typeof params.reportId === 'string' ? params.reportId : '';
  
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
          setReport(fetchedReport);
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
    
    try {
      await exportToPdf(report.htmlContent, `${report.reportName.replace(/\s/g, '_')}.pdf`);
    } catch (error) {
      console.error("Failed to export to PDF:", error);
      toast({ variant: "destructive", title: "Export Failed", description: "Failed to export to PDF. Please try again." });
    }
  };
  
  const handleExportDocx = async () => {
    if (!report?.htmlContent) {
      toast({ variant: "destructive", title: "Export Failed", description: "Report content is missing." });
      return;
    }
    
    try {
      await exportToDocx(report.htmlContent, `${report.reportName.replace(/\s/g, '_')}.docx`);
    } catch (error) {
      console.error("Failed to export to DOCX:", error);
      toast({ variant: "destructive", title: "Export Failed", description: "Failed to export to DOCX. Please try again." });
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
            <CardTitle>{report.reportName}</CardTitle>
            <CardDescription>
              Created on {formatDate(report.createdAt)} for assignment: {report.assignmentName || "Unknown Assignment"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-white">
              <div dangerouslySetInnerHTML={{ __html: report.htmlContent }} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleExportDocx}>
              <FileType2 className="mr-2 h-4 w-4" />
              Export to DOCX
            </Button>
            <Button onClick={handleExportPdf}>
              <FileDown className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
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
  }
}