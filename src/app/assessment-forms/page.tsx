
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, FilePlus2, ListOrdered, Edit, AlertTriangle, UserCircle, FolderKanban, ServerIcon } from "lucide-react";
import type { AssignmentMetadata as FetchedAssignment, AssignmentMetadata } from "@/services/assignmentFunctionsService";
import { getMyAssignments, getAssignmentListMetadata } from "@/services/assignmentFunctionsService";
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
  const [myAssignments, setMyAssignments] = useState<FetchedAssignment[]>([]);
  const [isLoadingMyAssignments, setIsLoadingMyAssignments] = useState(true);
  const [myAssignmentsError, setMyAssignmentsError] = useState<string | null>(null);

  const [allAccountAssignments, setAllAccountAssignments] = useState<AssignmentMetadata[]>([]);
  const [isLoadingAllAccountAssignments, setIsLoadingAllAccountAssignments] = useState(false);
  const [allAccountAssignmentsError, setAllAccountAssignmentsError] = useState<string | null>(null);

  // Placeholder for admin check - replace with actual role logic from userProfile
  const isAdmin = userProfile?.email === 'admin@example.com'; // TODO: Replace with actual role check

  useEffect(() => {
    async function fetchMyTasks() {
      if (!user || !user.email || !userProfile || !userProfile.account || userProfile.account.trim() === '') {
        if (!authLoading && !profileLoading) {
          let specificError = "Cannot fetch your tasks. ";
          if (!user) specificError += "You must be logged in.";
          else if (!user.email) specificError += "User email is not available.";
          else if (!userProfile?.account || userProfile.account.trim() === '') specificError += "User account information is not available or is invalid. Please check your user profile settings.";
          setMyAssignmentsError(specificError);
          setIsLoadingMyAssignments(false);
          setMyAssignments([]);
        }
        return;
      }

      try {
        setIsLoadingMyAssignments(true);
        setMyAssignmentsError(null);
        const fetchedAssignmentsData = await getMyAssignments(userProfile.account, user.email);
        setMyAssignments(fetchedAssignmentsData || []); // Ensure it's an array
      } catch (err) {
        console.error("Error fetching my assignments:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching your assignments.";
        if (errorMessage.includes("403")) {
          setMyAssignmentsError(`API Error: 403 Forbidden. The Cloud Function denied access for your tasks. This could be due to CORS settings, incorrect 'account' or 'Authorization' headers, or the function's internal authorization logic. Please check your Cloud Function logs and configuration.`);
        } else if (errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("unauthorized")) {
          setMyAssignmentsError(errorMessage + " This might be due to Firestore security rules or the Cloud Function requiring specific permissions for your tasks.");
        } else if (errorMessage.includes("Account name is required and cannot be empty") || errorMessage.includes("User email is required")) {
           setMyAssignmentsError("User account or email information is not available or is invalid. Cannot fetch your tasks. Please check your user profile settings.");
        } else {
          setMyAssignmentsError(errorMessage);
        }
        setMyAssignments([]);
      } finally {
        setIsLoadingMyAssignments(false);
      }
    }

    if (!authLoading && !profileLoading) {
      fetchMyTasks();
    } else {
      setIsLoadingMyAssignments(true);
      setMyAssignments([]);
    }
  }, [user, userProfile, authLoading, profileLoading]);


  useEffect(() => {
    async function fetchAllAccountTasks() {
      if (!isAdmin || !userProfile || !userProfile.account || userProfile.account.trim() === '') {
        if (isAdmin && (!userProfile?.account || userProfile.account.trim() === '')) {
             setAllAccountAssignmentsError("Admin view: User account information is not available or is invalid. Cannot fetch all account assignments.");
        }
        setIsLoadingAllAccountAssignments(false);
        setAllAccountAssignments([]);
        return;
      }

      try {
        setIsLoadingAllAccountAssignments(true);
        setAllAccountAssignmentsError(null);
        const fetchedData = await getAssignmentListMetadata(userProfile.account);
        setAllAccountAssignments(fetchedData || []); // Ensure it's an array
      } catch (err) {
        console.error("Error fetching all account assignments:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching all account assignments.";
        setAllAccountAssignmentsError(errorMessage);
        setAllAccountAssignments([]);
      } finally {
        setIsLoadingAllAccountAssignments(false);
      }
    }

    if (isAdmin && !authLoading && !profileLoading) {
      fetchAllAccountTasks();
    } else if (isAdmin) {
      setIsLoadingAllAccountAssignments(true);
      setAllAccountAssignments([]);
    }
  }, [isAdmin, userProfile, authLoading, profileLoading]);


  const overallLoadingMyAssignments = authLoading || profileLoading || isLoadingMyAssignments;

  const displayableMyAssignments = myAssignments.filter(
    assignment => assignment && typeof assignment.id === 'string' && assignment.id.trim() !== ''
  );

  const displayableAllAccountAssignments = allAccountAssignments.filter(
    assignment => assignment && typeof assignment.id === 'string' && assignment.id.trim() !== ''
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignment Builder & Tasks</h1>
          <p className="text-lg text-muted-foreground">
            Create new assignments or complete tasks assigned to you for account: {userProfile?.account || "Loading account..."}.
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/assessment-forms/new">
            <FilePlus2 className="mr-2 h-5 w-5" /> Create New Assignment
          </Link>
        </Button>
      </div>

      {/* My Assigned Tasks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" />
            My Assigned Tasks
          </CardTitle>
          <CardDescription>
            Tasks specifically assigned to you for account: {userProfile?.account || "your current account"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overallLoadingMyAssignments && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <Skeleton className="h-5 w-48 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          )}
          {myAssignmentsError && !overallLoadingMyAssignments && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Your Assigned Tasks</AlertTitle>
              <AlertDescription>
                {myAssignmentsError}
                {!user && (
                   <Button asChild className="mt-2">
                    <Link href="/auth">Login</Link>
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          {!overallLoadingMyAssignments && !myAssignmentsError && myAssignments.length === 0 && (
            <div className="border rounded-lg p-6 text-center bg-muted/20">
              <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Tasks Assigned To You</h3>
              <p className="text-muted-foreground mb-4">
                You currently have no tasks assigned to you for account '{userProfile?.account || "current account"}'.
              </p>
            </div>
          )}
          {!overallLoadingMyAssignments && !myAssignmentsError && displayableMyAssignments.length > 0 && (
            <ul className="space-y-3">
              {displayableMyAssignments.map((assignment) => (
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
          {!overallLoadingMyAssignments && !myAssignmentsError && myAssignments.length > 0 && displayableMyAssignments.length === 0 && (
             <div className="border rounded-lg p-6 text-center bg-muted/20">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-semibold mb-2">Issue Loading Your Tasks</h3>
                <p className="text-muted-foreground mb-4">
                  Some of your assigned tasks could not be displayed due to missing or invalid identifiers. Please contact support if this issue persists.
                </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Account Assignments Section (Admin Only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerIcon className="h-6 w-6 text-accent" />
              All Account Assignments (Admin View)
            </CardTitle>
            <CardDescription>
              All assignments registered under account: {userProfile?.account || "current account"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(authLoading || profileLoading || isLoadingAllAccountAssignments) && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={`admin-skeleton-${i}`} className="flex items-center justify-between p-3 rounded-md border">
                    <div><Skeleton className="h-5 w-56 mb-1" /><Skeleton className="h-3 w-40" /></div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            )}
            {allAccountAssignmentsError && !(authLoading || profileLoading || isLoadingAllAccountAssignments) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Fetching All Account Assignments</AlertTitle>
                <AlertDescription>{allAccountAssignmentsError}</AlertDescription>
              </Alert>
            )}
            {!(authLoading || profileLoading || isLoadingAllAccountAssignments) && !allAccountAssignmentsError && allAccountAssignments.length === 0 && (
              <div className="border rounded-lg p-6 text-center bg-muted/20">
                <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Assignments Found</h3>
                <p className="text-muted-foreground mb-4">
                  There are no assignments registered for account '{userProfile?.account || "current account"}'.
                </p>
              </div>
            )}
            {!(authLoading || profileLoading || isLoadingAllAccountAssignments) && !allAccountAssignmentsError && displayableAllAccountAssignments.length > 0 && (
              <ul className="space-y-3">
                {displayableAllAccountAssignments.map((assignment) => (
                  <li key={`admin-${assignment.id}`} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors border">
                    <div>
                      <p className="font-medium">{assignment.assessmentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.description || `ID: ${assignment.id}`}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" disabled>View Details</Button> {/* Placeholder action */}
                  </li>
                ))}
              </ul>
            )}
            {!(authLoading || profileLoading || isLoadingAllAccountAssignments) && !allAccountAssignmentsError && allAccountAssignments.length > 0 && displayableAllAccountAssignments.length === 0 && (
               <div className="border rounded-lg p-6 text-center bg-muted/20">
                  <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Issue Loading Account Assignments</h3>
                  <p className="text-muted-foreground mb-4">
                    Some account assignments could not be displayed due to missing or invalid identifiers.
                  </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pre-loaded Templates Section (remains unchanged) */}
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
                <Button variant="outline" className="w-full" disabled>
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

    