"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssignmentMetadata } from "@/services/assignmentFunctionsService";
import { getMyAssignments, getAssignmentListMetadata } from "@/services/assignmentFunctionsService";
import { Skeleton } from "@/components/ui/skeleton"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePersistedState } from "@/hooks/use-persisted-state";
import {
  AlertTriangle,
  CheckSquare,
  Briefcase,
  ServerIcon,
  FolderKanban,
  ListOrdered,
  FilePlus2,
  Edit
} from "lucide-react";

const sampleTemplates = [
  { id: "env1", name: "Environmental Safety Checklist", description: "General campus environment assessment.", icon: CheckSquare },
  { id: "fire1", name: "Fire Safety Inspection Form", description: "For routine fire safety checks.", icon: CheckSquare },
  { id: "lab1", name: "Lab Safety Audit", description: "Specific to laboratory environments.", icon: CheckSquare },
];

export default function AssessmentFormsPage() {
  const { user, userProfile, customClaims, loading: authLoading, profileLoading, claimsLoading } = useAuth();
  const router = useRouter();
  
  // Redirect to the new assignments page
  useEffect(() => {
    if (!authLoading && !profileLoading) {
      router.replace('/assignments');
    }
  }, [authLoading, profileLoading, router]);
  
  // Show loading while redirecting
  if (authLoading || profileLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-10 w-1/2 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  const [myAssignments, setMyAssignments] = useState<AssignmentMetadata[]>([]);
  const [isLoadingMyAssignments, setIsLoadingMyAssignments] = useState(true);
  const [myAssignmentsError, setMyAssignmentsError] = useState<string | null>(null);

  const [allAccountAssignments, setAllAccountAssignments] = useState<AssignmentMetadata[]>([]);
  const [isLoadingAllAccountAssignments, setIsLoadingAllAccountAssignments] = useState(true);
  const [allAccountAssignmentsError, setAllAccountAssignmentsError] = useState<string | null>(null);
  
  // Pagination states for My Assignments
  const [myAssignmentsPage, setMyAssignmentsPage] = usePersistedState('assessment-forms-my-assignments-page', 1);
  const [myAssignmentsPerPage, setMyAssignmentsPerPage] = usePersistedState('assessment-forms-my-assignments-per-page', 5);
  
  // Pagination states for All Account Assignments
  const [allAssignmentsPage, setAllAssignmentsPage] = usePersistedState('assessment-forms-all-assignments-page', 1);
  const [allAssignmentsPerPage, setAllAssignmentsPerPage] = usePersistedState('assessment-forms-all-assignments-per-page', 5);

  const pathname = usePathname(); 

  const isAdmin = !profileLoading && userProfile && (userProfile.role === 'admin' || userProfile.role === 'superAdmin');
  
  // Calculate paginated assignments
  const paginatedMyAssignments = useMemo(() => {
    const startIndex = (myAssignmentsPage - 1) * myAssignmentsPerPage;
    return myAssignments.slice(startIndex, startIndex + myAssignmentsPerPage);
  }, [myAssignments, myAssignmentsPage, myAssignmentsPerPage]);
  
  const displayableAllAccountAssignments = allAccountAssignments.filter(
    assignment => assignment && typeof assignment.id === 'string' && assignment.id.trim() !== ''
  );
  
  const paginatedAllAccountAssignments = useMemo(() => {
    const startIndex = (allAssignmentsPage - 1) * allAssignmentsPerPage;
    return displayableAllAccountAssignments.slice(startIndex, startIndex + allAssignmentsPerPage);
  }, [displayableAllAccountAssignments, allAssignmentsPage, allAssignmentsPerPage]);
  
  // Calculate total pages
  const totalMyAssignmentsPages = Math.ceil(myAssignments.length / myAssignmentsPerPage);
  const totalAllAssignmentsPages = Math.ceil(displayableAllAccountAssignments.length / allAssignmentsPerPage);

  useEffect(() => {
    async function fetchMyTasks() {
      console.log("[TEMP DEBUG AssessmentFormsPage] fetchMyTasks CheckPoint 1: Auth/Profile/Claims loading state:", { authLoading, profileLoading, claimsLoading });
      if (!authLoading && !profileLoading && !claimsLoading) {
        console.log("[TEMP DEBUG AssessmentFormsPage] fetchMyTasks CheckPoint 2: Auth/Profile/Claims loaded. User, Profile, Claims data:", { user, userProfileEmail: userProfile?.email, userProfileAccount: userProfile?.account, userProfileRole: userProfile?.role, customClaims });

        let specificError = "Cannot fetch your assignments. ";
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

        console.log("[TEMP DEBUG AssessmentFormsPage] fetchMyTasks PROCEEDING TO API CALL for /tome endpoint. Account:", userProfile.account, "Email:", user.email);
        try {
          setIsLoadingMyAssignments(true);
          setMyAssignmentsError(null);

          const tomeAssignmentsData = await getMyAssignments(userProfile.account, user.email!);
          console.log("SUCCESSFULLY FETCHED FROM /tome endpoint. Raw data:", JSON.stringify(tomeAssignmentsData, null, 2));
          setMyAssignments(tomeAssignmentsData || []);
          if (tomeAssignmentsData && tomeAssignmentsData.length > 0) {
            console.log("[TEMP DEBUG AssessmentFormsPage] First item in myAssignments (if any):", tomeAssignmentsData[0]);
          }

        } catch (err) {
          console.error("ERROR FETCHING FROM /tome endpoint:", err);
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching your assignments from /tome.";
          if (errorMessage.includes("Network Error") || errorMessage.includes("Failed to fetch")) {
              setMyAssignmentsError(`Network Error: Could not retrieve your assignments from /tome. Please check your internet connection. If the issue persists, the server might be unavailable or there could be a CORS issue. Contact support if this continues.`);
          } else if (errorMessage.includes("403")) {
            setMyAssignmentsError(`API Error (from /tome): 403 Forbidden. The Cloud Function denied access for your assignments. This could be due to CORS settings, incorrect 'account' or 'Authorization' headers, or the function's internal authorization logic. Please check your Cloud Function logs and configuration.`);
          } else if (errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("unauthorized")) {
            setMyAssignmentsError(errorMessage + " This might be due to Firestore security rules or the Cloud Function requiring specific permissions for your assignments from /tome.");
          } else if (errorMessage.includes("Account name is required and cannot be empty") || errorMessage.includes("User email is required")) {
             setMyAssignmentsError("User account or email information is not available or is invalid. Cannot fetch your assignments from /tome. Please check your user profile settings.");
          } else {
            setMyAssignmentsError(`Error from /tome: ${errorMessage}`);
          }
          setMyAssignments([]);
        } finally {
          setIsLoadingMyAssignments(false);
        }
      } else {
        console.log("[TEMP DEBUG AssessmentFormsPage] fetchMyTasks SKIPPING API CALL because auth/profile/claims is still loading.");
        setIsLoadingMyAssignments(true);
      }
    }

    fetchMyTasks();
  }, [user, userProfile, customClaims, authLoading, profileLoading, claimsLoading]);


  useEffect(() => {
    async function fetchAllAccountTasks() {
      console.log("[TEMP DEBUG AssessmentFormsPage] fetchAllAccountTasks CheckPoint 1: isAdmin, Auth/Profile/Claims loading state:", { isAdmin, authLoading, profileLoading, claimsLoading });
      if (isAdmin && !authLoading && !profileLoading && !claimsLoading) {
        console.log("[TEMP DEBUG AssessmentFormsPage] fetchAllAccountTasks CheckPoint 2: Admin, Auth/Profile/Claims loaded. Profile data:", { userProfileAccount: userProfile?.account, userProfileRole: userProfile?.role, customClaims });
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
          const fetchedData = await getAssignmentListMetadata();
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
      } else if (!authLoading && !profileLoading && !claimsLoading && !isAdmin) {
        console.log("[TEMP DEBUG AssessmentFormsPage] fetchAllAccountTasks SKIPPING ADMIN API CALL because isAdmin is false (profile/claims loaded).");
        setIsLoadingAllAccountAssignments(false);
        setAllAccountAssignments([]);
        setAllAccountAssignmentsError(null);
      } else {
        console.log("[TEMP DEBUG AssessmentFormsPage] fetchAllAccountTasks SKIPPING ADMIN API CALL because auth/profile/claims is still loading.");
        setIsLoadingAllAccountAssignments(true);
        setAllAccountAssignments([]);
      }
    }

    fetchAllAccountTasks();
  }, [isAdmin, userProfile, customClaims, authLoading, profileLoading, claimsLoading]);

  // Reset page when changing items per page
  useEffect(() => {
    setMyAssignmentsPage(1);
  }, [myAssignmentsPerPage, setMyAssignmentsPage]);
  
  useEffect(() => {
    setAllAssignmentsPage(1);
  }, [allAssignmentsPerPage, setAllAssignmentsPage]);

  const overallLoadingMyAssignments = authLoading || profileLoading || claimsLoading || isLoadingMyAssignments;
  const overallLoadingAllAccountAssignments = authLoading || profileLoading || claimsLoading || isLoadingAllAccountAssignments;

  console.log("[TEMP DEBUG AssessmentFormsPage] RENDERING with isAdmin:", isAdmin, "profileLoading:", profileLoading, "userProfile loaded:", !!userProfile, "role:", userProfile?.role, "customClaims:", customClaims);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignment Builder & Tasks</h1>
          <p className="text-lg text-muted-foreground">
            Create new assignments or complete tasks for account: {userProfile?.account || "Loading account..."}.
          </p>
        </div>
        <Button 
          size="lg" 
          asChild 
          className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
        >
                          <Link href="/assignments/new">
            <FilePlus2 className="mr-2 h-5 w-5" /> Create New Assignment
          </Link>
        </Button>
      </div>
      {/* My Assignments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" /> 
            My Assignments
          </CardTitle>
          <CardDescription>
            Assignments assigned to you for account: {userProfile?.account || "your current account"}.
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
              <AlertTitle>Error Fetching Your Assignments</AlertTitle>
              <AlertDescription>
                {myAssignmentsError}
                {!user && (
                   <Button asChild className="mt-2">
                    <Link href={`/auth?redirect=${encodeURIComponent(pathname)}`}>Login</Link>
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          {!overallLoadingMyAssignments && !myAssignmentsError && myAssignments.length === 0 && (
            <div className="border rounded-lg p-6 text-center bg-muted/20">
              <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Assignments Displayed</h3>
              <p className="text-muted-foreground mb-4">
                Let&apos;s get started... Please fill out your DSS today.
              </p>
            </div>
          )}
          {!overallLoadingMyAssignments && !myAssignmentsError && myAssignments.length > 0 && (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment Name</TableHead>
                      <TableHead>Description/Due Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMyAssignments.map((assignment, index) => {
                      let uniqueIdForLink: string | null = null;
                      if (assignment.assignmentId && typeof assignment.assignmentId === 'string' && assignment.assignmentId.trim() !== '') {
                        uniqueIdForLink = assignment.assignmentId;
                      } else if (assignment.id && typeof assignment.id === 'string' && assignment.id.trim() !== '') {
                        uniqueIdForLink = assignment.id;
                      } else if (assignment.assessmentName && typeof assignment.assessmentName === 'string' && assignment.assessmentName.trim() !== '') {
                        uniqueIdForLink = assignment.assessmentName;
                      }

                      return (
                        <TableRow key={uniqueIdForLink || `my-assignment-${index}`}>
                          <TableCell className="font-medium">
                            {assignment.assessmentName || 'Unnamed Assignment'}
                            {!uniqueIdForLink && <span className="ml-2 text-destructive">(ID missing)</span>}
                          </TableCell>
                          <TableCell>
                            {assignment.description || `Due: ${assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}`}
                          </TableCell>
                          <TableCell className="text-right">
                            {uniqueIdForLink ? (
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/assignments/${encodeURIComponent(uniqueIdForLink)}/complete`}>
                                  Go
                                </Link>
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" disabled>
                                Go
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Rows per page</span>
                  <Select
                    value={myAssignmentsPerPage.toString()}
                    onValueChange={(value) => setMyAssignmentsPerPage(Number(value))}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue placeholder={myAssignmentsPerPage} />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5, 10, 20, 50].map(size => (
                        <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    Page {myAssignmentsPage} of {totalMyAssignmentsPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                   onClick={() => setMyAssignmentsPage(Math.max(myAssignmentsPage - 1, 1))}
                    disabled={myAssignmentsPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                   onClick={() => setMyAssignmentsPage(Math.min(myAssignmentsPage + 1, totalMyAssignmentsPages))}
                    disabled={myAssignmentsPage === totalMyAssignmentsPages || totalMyAssignmentsPages === 0}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
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
            {!overallLoadingAllAccountAssignments && !allAccountAssignmentsError && displayableAllAccountAssignments.length === 0 && (
              <div className="border rounded-lg p-6 text-center bg-muted/20">
                <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Assignments Found For Account</h3>
                <p className="text-muted-foreground mb-4">
                  There are no assignments registered for account &apos;{userProfile?.account || "current account"}&apos;.
                </p>
              </div>
            )}
           {!overallLoadingAllAccountAssignments && !allAccountAssignmentsError && displayableAllAccountAssignments.length > 0 && (
             <>
               <div className="rounded-md border overflow-hidden">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Assignment Name</TableHead>
                       <TableHead>Description</TableHead>
                       <TableHead className="text-right">Action</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {paginatedAllAccountAssignments.map((assignment) => (
                       <TableRow key={`admin-${assignment.id}`}>
                         <TableCell className="font-medium">{assignment.assessmentName}</TableCell>
                         <TableCell>{assignment.description || `ID: ${assignment.id}`}</TableCell>
                         <TableCell className="text-right">
                           <Button asChild variant="outline" size="sm">
                             <Link href={`/assignments/${assignment.id}/details`}>View Details</Link>
                           </Button>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
               
               {/* Pagination Controls */}
               <div className="flex items-center justify-between mt-4">
                 <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                   <span>Rows per page</span>
                   <Select
                     value={allAssignmentsPerPage.toString()}
                     onValueChange={(value) => setAllAssignmentsPerPage(Number(value))}
                   >
                     <SelectTrigger className="w-[70px] h-8">
                       <SelectValue placeholder={allAssignmentsPerPage} />
                     </SelectTrigger>
                     <SelectContent>
                       {[3, 5, 10, 20, 50].map(size => (
                         <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 
                 <div className="flex items-center space-x-2">
                   <span className="text-sm text-muted-foreground">
                     Page {allAssignmentsPage} of {totalAllAssignmentsPages || 1}
                   </span>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setAllAssignmentsPage(Math.max(allAssignmentsPage - 1, 1))}
                     disabled={allAssignmentsPage === 1}
                   >
                     Previous
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setAllAssignmentsPage(Math.min(allAssignmentsPage + 1, totalAllAssignmentsPages))}
                     disabled={allAssignmentsPage === totalAllAssignmentsPages || totalAllAssignmentsPages === 0}
                   >
                     Next
                   </Button>
                 </div>
               </div>
             </>
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