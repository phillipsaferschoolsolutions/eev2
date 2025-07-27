"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { getAssignmentById, type AssignmentWithPermissions } from "@/services/assignmentFunctionsService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit3, AlertTriangle, ArrowLeft, ListChecks, CheckSquare, MessageSquare, Paperclip, FileText, CalendarDays, User, Tag, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// A more robust parseOptions function that handles multiple possible data formats
const parseOptions = (options: unknown): { label: string; value: string }[] => {
  if (!options) return [];
  
  // Case 1: It's already the correct format (array of objects with label/value)
  if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'object' && options[0] !== null && 'label' in options[0]) {
    return options.map(opt => ({ 
      label: String((opt as { label: unknown }).label), 
      value: String((opt as { value?: unknown; label: unknown }).value || (opt as { label: unknown }).label) 
    }));
  }

  // Case 2: It's a simple array of strings
  if (Array.isArray(options)) {
    return options.map(opt => ({ label: String(opt), value: String(opt) }));
  }
  
  // Case 3: It's a semicolon-separated string
  if (typeof options === 'string') {
    return options.split(';').map(opt => opt.trim()).filter(Boolean).map(opt => ({ label: opt, value: opt }));
  }

  // Fallback if the format is unknown
  return [];
};


const formatDisplayDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch {
    return dateString;
  }
};


export default function AssignmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();
  const { toast } = useToast();

  const assignmentId = typeof params.assignmentId === 'string' ? params.assignmentId : '';

  const [assignment, setAssignment] = useState<AssignmentWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = !profileLoading && userProfile && (userProfile.role === 'admin' || userProfile.role === 'superAdmin');

  useEffect(() => {
    if (!assignmentId) {
      setError("Assignment ID is missing.");
      setIsLoading(false);
      return;
    }

    if (authLoading || profileLoading) {
      setIsLoading(true);
      return;
    }
     // Check if user is logged in first
    if (!user) {
      setError("You must be logged in to view assignment details.");
      toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in to view details."});
      setIsLoading(false);
      router.push('/auth');
      return;
    }


    if (!userProfile?.account) {
      setError("User account information is missing. Cannot load assignment details.");
      setIsLoading(false);
      return;
    }

    if (!isAdmin) {
        setError("You do not have permission to view these details.");
        setIsLoading(false);
        // Optionally, redirect non-admins or show a more permanent unauthorized message
        // router.push('/'); // Example: redirect to dashboard
        return;
    }

    async function fetchAssignmentDetails() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedAssignment = await getAssignmentById(assignmentId, userProfile!.account);
        // ADD THIS LOG to see exactly what the server returns
        console.log("Fetched Assignment Data from Server:", fetchedAssignment);
        if (fetchedAssignment) {
          setAssignment(fetchedAssignment);
        } else {
          setError("Assignment not found or you do not have permission to access it.");
        }
      } catch (err) {
        console.error("Failed to fetch assignment details:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Failed to load assignment details: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAssignmentDetails();
  }, [assignmentId, user, userProfile, authLoading, profileLoading, isAdmin, router, toast]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={`q-skel-${i}`} className="h-16 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && (!user || !isAdmin)) { // Only show error if redirect/auth logic hasn't kicked in or if it's an access error
    return (
      <div className="container mx-auto py-8 px-4">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied or Error</AlertTitle>
          <AlertDescription>{error} {(!user || !isAdmin) && "Redirecting..."}</AlertDescription>
        </Alert>
      </div>
    );
  }
   if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Assignment Details</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }


  if (!assignment) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
         <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p>Assignment data is not available.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <Button variant="outline" /* onClick={() => router.back()} */ asChild className="mb-4">
          <Link href="/assessment-forms">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Assignments
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{assignment.assessmentName || "Assignment Details"}</h1>
          <Button asChild size="lg">
            <Link href={`/assignments/${assignment.id}/edit`}>
              <Edit3 className="mr-2 h-5 w-5" /> Edit Assignment
            </Link>
          </Button>
        </div>
        {assignment.description && <p className="text-lg text-muted-foreground mt-1">{assignment.description}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div className="flex items-center">
            <strong className="w-32 shrink-0">Assignment ID:</strong>
            <span className="text-muted-foreground truncate">{assignment.id}</span>
          </div>
          {assignment.assignmentId && assignment.assignmentId !== assignment.id && (
            <div className="flex items-center">
              <strong className="w-32 shrink-0">Business ID:</strong>
              <span className="text-muted-foreground truncate">{assignment.assignmentId}</span>
            </div>
          )}
          <div className="flex items-center">
            <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
            <strong className="w-28 shrink-0">Type:</strong>
            <Badge variant="secondary">{assignment.assignmentType || "N/A"}</Badge>
          </div>
          <div className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
            <strong className="w-28 shrink-0">Due Date:</strong>
            <span>{formatDisplayDate(assignment.dueDate)}</span>
          </div>
           <div className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
            <strong className="w-28 shrink-0">Created:</strong>
            <span>{formatDisplayDate(assignment.createdDate)}</span>
          </div>
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4 text-muted-foreground" />
            <strong className="w-28 shrink-0">Author:</strong>
            <span>{assignment.author || "N/A"}</span>
          </div>
          <div className="flex items-center">
            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
            <strong className="w-28 shrink-0">Status:</strong>
            <Badge variant={assignment.status === 'completed' ? 'default' : 'outline'}>
              {assignment.status || "N/A"}
            </Badge>
          </div>
           <div className="flex items-center">
            <strong className="w-32 shrink-0">Account:</strong>
            <span className="text-muted-foreground truncate">{assignment.accountSubmittedFor || "N/A"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary"/>Questions ({assignment.questions?.length || 0})</CardTitle>
          <CardDescription>Detailed list of questions in this assignment.</CardDescription>
        </CardHeader>
        <CardContent>
          {assignment.questions && assignment.questions.length > 0 ? (
            <ul className="space-y-4">
              {assignment.questions.map((question, index) => (
                <li key={`${question.id}-${index}`} className="p-4 border rounded-lg bg-card/60 shadow-sm">
                  <p className="font-semibold text-md mb-2">
                    {index + 1}. {question.label}
                    {question.required && <span className="text-destructive ml-1">*</span>}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <div><strong>Type:</strong> <Badge variant="outline" className="text-xs">{question.component}</Badge></div>
                    {question.options && (parseOptions(question.options).length > 0) && (
                      <div className="sm:col-span-2">
                        <strong>Options:</strong>
                        <ul className="list-disc list-inside ml-4 mt-1">
                        {parseOptions(question.options).map((opt, index) => (
                          <li key={`${opt.value}-${index}`}>{opt.label}</li>
                        ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                        <CheckSquare className="h-3 w-3"/>
                        <strong>Required:</strong> {question.required ? "Yes" : "No"}
                    </div>
                    <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3"/>
                        <strong>Comments:</strong> {question.comment ? "Enabled" : "Disabled"}
                    </div>
                     <div className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3"/>
                        <strong>Photo Upload:</strong> {question.photoUpload ? "Enabled" : "Disabled"}
                    </div>
                    {question.pageNumber && <div><strong>Page:</strong> {question.pageNumber}</div>}
                    {question.criticality && <div><strong>Criticality:</strong> <Badge variant={question.criticality === 'high' ? 'destructive' : 'secondary'}>{question.criticality}</Badge></div>}
                  </div>
                  {question.conditional && (
                     <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs">
                        <div className="font-medium">Conditional Logic:</div>
                        <div>
                           Show if question ID <Badge variant="outline">{question.conditional.field}</Badge> has value(s): <Badge variant="outline">{Array.isArray(question.conditional.value) ? question.conditional.value.join(', ') : question.conditional.value}</Badge>
                        </div>
                     </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">No questions found for this assignment.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}