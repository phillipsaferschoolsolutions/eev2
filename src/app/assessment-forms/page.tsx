
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, FilePlus2, ListOrdered, Edit, AlertTriangle, UserCircle, FolderKanban, ServerIcon } from "lucide-react";
import type { AssignmentMetadata } from "@/services/assignmentFunctionsService";
// Temporarily use getAssignmentListMetadata for My Assigned Tasks for testing
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
  const { user, userProfile, customClaims, loading: authLoading, profileLoading, claimsLoading } = useAuth();
  const [myAssignments, setMyAssignments] = useState<AssignmentMetadata[]>([]);
  const [isLoadingMyAssignments, setIsLoadingMyAssignments] = useState(true);
  const [myAssignmentsError, setMyAssignmentsError] = useState<string | null>(null);

  const [allAccountAssignments, setAllAccountAssignments] = useState<AssignmentMetadata[]>([]);
  const [isLoadingAllAccountAssignments, setIsLoadingAllAccountAssignments] = useState(false);
  const [allAccountAssignmentsError, setAllAccountAssignmentsError] = useState<string | null>(null);

  const isAdmin = !claimsLoading && (customClaims?.admin === true || customClaims?.superAdmin === true);

  useEffect(() => {
    async function fetchMyTasks() {
      console.log("[TEMP DEBUG AssessmentFormsPage] fetchMyTasks CheckPoint 1: Auth/Profile/Claims loading state:", { authLoading, profileLoading, claimsLoading });
      if (!authLoading && !profileLoading && !claimsLoading) {
        console.log("[TEMP DEBUG AssessmentFormsPage] fetchMyTasks CheckPoint 2: Auth/Profile/Claims loaded. User, Profile, Claims data:", { user, userProfileEmail: userProfile?.email, userProfileAccount: userProfile?.account, customClaims });
        
        let specificError = "Cannot fetch your tasks. ";
        if (!user) specificError += "You must be logged in. ";
        else if (!user.email) specificError += "User email is not available. ";
        
        if (!userProfile) specificError += "User profile is not loaded. ";
        else if (!userProfile.account || userProfile.account.trim() === '') {
          specificError += "User account information is not available or is invalid. Please check your user profile settings. ";
        }

        if (!user || !user.email || !userProfile || !userProfile.account || userProfile.account.trim() === '') {
          setMyAssignmentsError(specificError.trim());
          console.log("[TEMP DEBUG AssessmentFormsPage] fetchMyTasks SKIPPING API CALL due to missing user/profile data. Error set to:", specificError.trim());
          setIsLoadingMyAssignments(false);
          setMyAssignments([]);
          return;
        }
        
        console.log("[TEMP DEBUG AssessmentFormsPage] fetchMyTasks PROCEEDING TO API CALL for account:", userProfile.account, "email:", user.email);
        try {
          setIsLoadingMyAssignments(true);
          setMyAssignmentsError(null);
          // TEMPORARY: Use getAssignmentListMetadata for testing API call
          // const fetchedAssignmentsData = await getMyAssignments(userProfile.account, user.email);
          const fetchedAssignmentsData = await getAssignmentListMetadata(userProfile.account);
          console.log("[TEMP DEBUG AssessmentFormsPage] fetchMyTasks API CALL SUCCEEDED (using getAssignmentListMetadata for test). Data:", fetchedAssignmentsData);
          setMyAssignments(fetchedAssignmentsData || []);
        } catch (err) {
          console.error("Error fetching my assignments (or all account assignments for test):", err);
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching your assignments.";
          if (errorMessage.includes("Network Error") || errorMessage.includes("Failed to fetch")) {
              setMyAssignmentsError(`Network Error: Could not retrieve your tasks. Please check your internet connection. If the issue persists, the server might be unavailable or there could be a CORS issue. Contact support if this continues.`);
          } else if (errorMessage.includes("403")) {
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
      } else {
        console.log("[TEMP DEBUG AssessmentFormsPage] fetchMyTasks SKIPPING API CALL because auth/profile/claims is still loading.");
        setIsLoadingMyAssignments(true); // Keep loading true until checks pass
        setMyAssignments([]);
      }
    }

    fetchMyTasks();
  }, [user, userProfile, customClaims, authLoading, profileLoading, claimsLoading]);


  useEffect(() => {
    async function fetchAllAccountTasks() {
      console.log("[TEMP DEBUG AssessmentFormsPage] fetchAllAccountTasks CheckPoint 1: isAdmin, Auth/Profile/Claims loading state:", { isAdmin, authLoading, profileLoading, claimsLoading });
      if (isAdmin && !authLoading && !profileLoading && !claimsLoading) {
        console.log("[TEMP DEBUG AssessmentFormsPage] fetchAllAccountTasks CheckPoint 2: Admin, Auth/Profile/Claims loaded. Profile data:", { userProfileAccount: userProfile?.account, customClaims });
        let specificAdminError = "Admin view: Cannot fetch all account assignments. ";
        if (!userProfile) specificAdminError += "User profile is not loaded. ";
        else if (!userProfile.account || userProfile.account.trim() === '') {
            specificAdminError += "User account information is not available or is invalid. ";
        }

        if (!userProfile || !userProfile.account || userProfile.account.trim() === '') {
           setAllAccountAssignmentsError(specificAdminError.trim());
           console.log("[TEMP DEBUG AssessmentFormsPage] fetchAllAccountTasks SKIPPING ADMIN API CALL due to missing profile data. Error set to:", specificAdminError.trim());
           setIsLoadingAllAccountAssignments(false);
           setAllAccountAssignments([]);
           return;
        }
        console.log("[TEMP DEBUG AssessmentFormsPage] fetchAllAccountTasks PROCEEDING TO ADMIN API CALL for account:", userProfile.account);
        try {
          setIsLoadingAllAccountAssignments(true);
          setAllAccountAssignmentsError(null);
          const fetchedData = await getAssignmentListMetadata(userProfile.account);
           console.log("[TEMP DEBUG AssessmentFormsPage] fetchAllAccountTasks ADMIN API CALL SUCCEEDED. Data:", fetchedData);
          setAllAccountAssignments(fetchedData || []);
        } catch (err) {
          console.error("Error fetching all account assignments:", err);
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching all account assignments.";
          if (errorMessage.includes("Network Error") || errorMessage.includes("Failed to fetch")) {
              setAllAccountAssignmentsError(`Network Error: Could not retrieve all account assignments. Please check your internet connection. If the issue persists, the server might be unavailable or there could be a CORS issue. Contact support if this continues.`);
          } else if (errorMessage.includes("Account name is required and cannot be empty")) {
             setAllAccountAssignmentsError("Admin view: User account information is not available or is invalid. Cannot fetch all account assignments.");
          } else {
              setAllAccountAssignmentsError(errorMessage);
          }
          setAllAccountAssignments([]);
        } finally {
          setIsLoadingAllAccountAssignments(false);
        }
      } else if (isAdmin) { // isAdmin might be true but claims still loading
        console.log("[TEMP DEBUG AssessmentFormsPage] fetchAllAccountTasks SKIPPING ADMIN API CALL because auth/profile/claims is still loading (but isAdmin could be true if claims were loaded).");
        setIsLoadingAllAccountAssignments(true); // Keep loading true
        setAllAccountAssignments([]);
      } else { // Not admin or claims not loaded yet to determine admin status
        console.log("[TEMP DEBUG AssessmentFormsPage] fetchAllAccountTasks SKIPPING ADMIN API CALL because isAdmin is false or claims are loading.");
        setIsLoadingAllAccountAssignments(false);
        setAllAccountAssignments([]);
        setAllAccountAssignmentsError(null); // Clear any previous admin errors if user is not admin
      }
    }
    
    // Only run if not auth/profile/claims loading. Admin check happens inside.
    if (!authLoading && !profileLoading && !claimsLoading) {
      fetchAllAccountTasks();
    } else {
      // Set initial loading states if we haven't started yet
      if (isAdmin) setIsLoadingAllAccountAssignments(true); 
      else setIsLoadingAllAccountAssignments(false);
      setAllAccountAssignments([]);
    }

  }, [isAdmin, userProfile, customClaims, authLoading, profileLoading, claimsLoading]);


  const overallLoadingMyAssignments = authLoading || profileLoading || claimsLoading || isLoadingMyAssignments;
  const overallLoadingAllAccountAssignments = authLoading || profileLoading || claimsLoading || isLoadingAllAccountAssignments;


  const displayableMyAssignments = myAssignments.filter(
    assignment => {
        // For this temporary test, getAssignmentListMetadata returns 'id'
        const uniqueId = assignment.id || assignment.assignmentId;
        return uniqueId && typeof uniqueId === 'string' && uniqueId.trim() !== '';
    }
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
            Create new assignments or complete tasks for account: {userProfile?.account || "Loading account..."}.
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
            My Assigned Tasks (Currently showing all account tasks for testing)
          </CardTitle>
          <CardDescription>
            Tasks specifically assigned to you for account: {userProfile?.account || "your current account"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overallLoadingMyAssignments && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={`my-skeleton-${i}`} className="flex items-center justify-between p-3 rounded-md border">
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
              <h3 className="text-xl font-semibold mb-2">No Tasks Found</h3>
              <p className="text-muted-foreground mb-4">
                No tasks found for account '{userProfile?.account || "current account"}'.
              </p>
            </div>
          )}
          {!overallLoadingMyAssignments && !myAssignmentsError && displayableMyAssignments.length > 0 && (
            <ul className="space-y-3">
              {displayableMyAssignments.map((assignment) => {
                // For this temporary test, getAssignmentListMetadata returns 'id'
                const uniqueId = assignment.id || assignment.assignmentId;
                return (
                  <li key={uniqueId} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors border">
                    <div>
                      <p className="font-medium">{assignment.assessmentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.description || `Due: ${assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}`}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/assignments/${uniqueId}/complete`}>Complete Task</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {!overallLoadingMyAssignments && !myAssignmentsError && myAssignments.length > 0 && displayableMyAssignments.length === 0 && (
             <div className="border rounded-lg p-6 text-center bg-muted/20">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-semibold mb-2">Issue Loading Tasks</h3>
                <p className="text-muted-foreground mb-4">
                  Some tasks could not be displayed due to missing or invalid identifiers. Please contact support if this issue persists.
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
            {overallLoadingAllAccountAssignments && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={`admin-skeleton-${i}`} className="flex items-center justify-between p-3 rounded-md border">
                    <div><Skeleton className="h-5 w-56 mb-1" /><Skeleton className="h-3 w-40" /></div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            )}
            {allAccountAssignmentsError && !overallLoadingAllAccountAssignments && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Fetching All Account Assignments</AlertTitle>
                <AlertDescription>{allAccountAssignmentsError}</AlertDescription>
              </Alert>
            )}
            {!overallLoadingAllAccountAssignments && !allAccountAssignmentsError && allAccountAssignments.length === 0 && (
              <div className="border rounded-lg p-6 text-center bg-muted/20">
                <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Assignments Found For Account</h3>
                <p className="text-muted-foreground mb-4">
                  There are no assignments registered for account '{userProfile?.account || "current account"}'.
                </p>
              </div>
            )}
            {!overallLoadingAllAccountAssignments && !allAccountAssignmentsError && displayableAllAccountAssignments.length > 0 && (
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
            {!overallLoadingAllAccountAssignments && !allAccountAssignmentsError && allAccountAssignments.length > 0 && displayableAllAccountAssignments.length === 0 && (
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

      {/* Pre-loaded Templates Section */}
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
