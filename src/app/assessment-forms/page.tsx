
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, FilePlus2, ListOrdered, Edit, AlertTriangle, UserCircle, FolderKanban } from "lucide-react";
import type { AssignmentMetadata as FetchedAssignment } from "@/services/assignmentFunctionsService"; 
import { getMyAssignments } from "@/services/assignmentFunctionsService"; 
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context"; 
import Link from "next/link";

const sampleTemplates = [
  { id: "env1", name: "Environmental Safety Checklist", description: "General campus environment assessment.", icon: CheckSquare },
  { id: "fire1", name: "Fire Safety Inspection Form", description: "For routine fire safety checks.", icon: CheckSquare },
  { id: "lab1", name: "Lab Safety Audit", description: "Specific to laboratory environments.", icon: CheckSquare },
];

export default function AssessmentFormsPage() {
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth(); 
  const [assignments, setAssignments] = useState<FetchedAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAssignments() {
      if (!user || !user.email || !userProfile || !userProfile.account || userProfile.account.trim() === '') {
        if (!authLoading && !profileLoading) { 
          if(!user){
            setError("You must be logged in to view assignments.");
          } else if (!user.email) {
            setError("User email is not available. Cannot fetch assignments.");
          } else if (!userProfile?.account || userProfile.account.trim() === '') {
            setError("User account information is not available or is invalid. Cannot fetch assignments. Please check your user profile settings.");
          }
          setIsLoadingAssignments(false);
          setAssignments([]); 
        }
        return;
      }

      try {
        setIsLoadingAssignments(true);
        setError(null);
        // Call getMyAssignments to fetch tasks specifically for the logged-in user
        const fetchedAssignmentsData = await getMyAssignments(userProfile.account, user.email); 
        setAssignments(fetchedAssignmentsData); 
      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching assignments.";
        
        if (errorMessage.includes("403")) {
          setError(`API Error: 403 Forbidden. The Cloud Function denied access. This could be due to CORS settings, incorrect 'account' or 'Authorization' headers, or the function's internal authorization logic. Please check your Cloud Function logs and configuration.`);
        } else if (errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("unauthorized")) {
          setError(errorMessage + " This might be due to Firestore security rules or the Cloud Function requiring specific permissions.");
        } else if (errorMessage.includes("Account name is required and cannot be empty") || errorMessage.includes("User email is required")) {
           setError("User account or email information is not available or is invalid. Cannot fetch assignments. Please check your user profile settings.");
        }
        else {
          setError(errorMessage);
        }
        setAssignments([]); 
      } finally {
        setIsLoadingAssignments(false);
      }
    }

    if (!authLoading && !profileLoading) {
      fetchAssignments();
    } else {
      setIsLoadingAssignments(true); 
      setAssignments([]); 
    }
  }, [user, userProfile, authLoading, profileLoading]);

  const overallLoading = authLoading || profileLoading || isLoadingAssignments;

  // Filter assignments to ensure they have a valid 'id' for the key prop
  const displayableAssignments = assignments.filter(
    assignment => assignment && typeof assignment.id === 'string' && assignment.id.trim() !== ''
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignment Builder & Tasks</h1>
          <p className="text-lg text-muted-foreground">
            Create new assignments or complete tasks assigned to you for account: {userProfile?.account || "Loading account..."}.
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/assessment-forms/new"> {/* Assuming a route for creating new assignments */}
            <FilePlus2 className="mr-2 h-5 w-5" /> Create New Assignment
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" />
            My Assigned Tasks
          </CardTitle>
          <CardDescription>
            {userProfile?.account 
              ? `Tasks assigned to you for account: ${userProfile.account}. Select a task to complete it.`
              : "Manage your existing assignments or create new ones."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overallLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <Skeleton className="h-5 w-48 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          )}
          {error && !overallLoading && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Assigned Tasks</AlertTitle>
              <AlertDescription>
                {error}
                {!user && (
                   <Button asChild className="mt-2">
                    <Link href="/auth">Login</Link>
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          {!overallLoading && !error && assignments.length === 0 && (
            <div className="border rounded-lg p-6 text-center bg-muted/20">
              <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Tasks Assigned to You</h3>
              <p className="text-muted-foreground mb-4">
                You currently have no tasks assigned to you for account '{userProfile?.account || "current account"}'.
              </p>
            </div>
          )}
          {!overallLoading && !error && displayableAssignments.length > 0 && (
            <ul className="space-y-3">
              {displayableAssignments.map((assignment) => (
                <li key={assignment.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors border">
                  <div>
                    <p className="font-medium">{assignment.assessmentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {assignment.description || `Due: ${assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}`}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/assignments/${assignment.id}/complete`}>Complete Task</Link>
                  </Button> 
                </li>
              ))}
            </ul>
          )}
          {/* This condition shows if the original assignments list was not empty, but all items were filtered out due to invalid IDs */}
          {!overallLoading && !error && assignments.length > 0 && displayableAssignments.length === 0 && (
             <div className="border rounded-lg p-6 text-center bg-muted/20">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-semibold mb-2">Issue Loading Tasks</h3>
                <p className="text-muted-foreground mb-4">
                  Some assigned tasks could not be displayed due to missing or invalid identifiers. Please contact support if this issue persists.
                </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pre-loaded Templates</CardTitle>
          <CardDescription>Get started quickly with our ready-to-use assessment templates.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sampleTemplates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <template.icon className="h-5 w-5 text-primary" />
                  {template.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" disabled> {/* Assuming template usage is future */}
                  <Edit className="mr-2 h-4 w-4" /> Use Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </CardContent>
      </Card>
       <p className="text-center text-muted-foreground text-sm pt-4">
        Full assignment builder functionality and template integration coming soon.
      </p>
    </div>
  );
}
