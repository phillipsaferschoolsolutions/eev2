"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Copy, 
  Trash2,
  FileText,
  Calendar,
  User,
  Clock,
  Briefcase,
  ServerIcon,
  AlertTriangle,
  ListOrdered,
  FolderKanban
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAssignments, deleteAssignment, renameAssignment, copyAssignment } from "@/services/assignmentService";
import { Assignment } from "@/types/Assignment";
import { format } from "date-fns";
import { usePersistedState } from "@/hooks/use-persisted-state";

export default function AssignmentsPage() {
  const { userProfile, loading: authLoading, profileLoading } = useAuth();
  const router = useRouter();
  
  // State for My Assignments (user's assigned assignments)
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
  const [isLoadingMyAssignments, setIsLoadingMyAssignments] = useState(true);
  const [myAssignmentsError, setMyAssignmentsError] = useState<string | null>(null);
  
  // State for All Account Assignments (admin view)
  const [allAccountAssignments, setAllAccountAssignments] = useState<Assignment[]>([]);
  const [isLoadingAllAccountAssignments, setIsLoadingAllAccountAssignments] = useState(true);
  const [allAccountAssignmentsError, setAllAccountAssignmentsError] = useState<string | null>(null);
  
  // Search states
  const [myAssignmentsSearch, setMyAssignmentsSearch] = useState("");
  const [allAssignmentsSearch, setAllAssignmentsSearch] = useState("");
  
  // Pagination states for My Assignments
  const [myAssignmentsPage, setMyAssignmentsPage] = usePersistedState('assignments-my-assignments-page', 1);
  const [myAssignmentsPerPage, setMyAssignmentsPerPage] = usePersistedState('assignments-my-assignments-per-page', 5);
  
  // Pagination states for All Account Assignments
  const [allAssignmentsPage, setAllAssignmentsPage] = usePersistedState('assignments-all-assignments-page', 1);
  const [allAssignmentsPerPage, setAllAssignmentsPerPage] = usePersistedState('assignments-all-assignments-per-page', 5);

  const isAdmin = !profileLoading && userProfile && (userProfile.role === 'admin' || userProfile.role === 'superAdmin');

  // Fetch assignments on component mount
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoadingMyAssignments(true);
        setIsLoadingAllAccountAssignments(true);
        
        const data = await getAssignments();
        
        // Filter assignments by account
        const accountAssignments = data.filter(assignment => 
          assignment.accountSubmittedFor === userProfile?.account
        );
        
        // Filter assignments for current user (simplified logic - in real app this would be based on user assignments)
        const userAssignments = accountAssignments.filter(assignment => 
          assignment.author === userProfile?.email || 
          assignment.assignmentAdminArray?.some(admin => admin.displayName === userProfile?.displayName)
        );
        
        setMyAssignments(userAssignments);
        setAllAccountAssignments(accountAssignments);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch assignments";
        setMyAssignmentsError(errorMessage);
        setAllAccountAssignmentsError(errorMessage);
      } finally {
        setIsLoadingMyAssignments(false);
        setIsLoadingAllAccountAssignments(false);
      }
    };

    if (userProfile?.account) {
      fetchAssignments();
    }
  }, [userProfile?.account, userProfile?.email]);

  // Filter and paginate My Assignments
  const filteredMyAssignments = useMemo(() => {
    if (!myAssignmentsSearch.trim()) return myAssignments;
    
    return myAssignments.filter(assignment =>
      assignment.assessmentName?.toLowerCase().includes(myAssignmentsSearch.toLowerCase()) ||
      assignment.description?.toLowerCase().includes(myAssignmentsSearch.toLowerCase()) ||
      assignment.author?.toLowerCase().includes(myAssignmentsSearch.toLowerCase()) ||
      assignment.frequency?.toLowerCase().includes(myAssignmentsSearch.toLowerCase())
    );
  }, [myAssignments, myAssignmentsSearch]);

  const paginatedMyAssignments = useMemo(() => {
    const startIndex = (myAssignmentsPage - 1) * myAssignmentsPerPage;
    return filteredMyAssignments.slice(startIndex, startIndex + myAssignmentsPerPage);
  }, [filteredMyAssignments, myAssignmentsPage, myAssignmentsPerPage]);

  // Filter and paginate All Account Assignments
  const filteredAllAccountAssignments = useMemo(() => {
    if (!allAssignmentsSearch.trim()) return allAccountAssignments;
    
    return allAccountAssignments.filter(assignment =>
      assignment.assessmentName?.toLowerCase().includes(allAssignmentsSearch.toLowerCase()) ||
      assignment.description?.toLowerCase().includes(allAssignmentsSearch.toLowerCase()) ||
      assignment.author?.toLowerCase().includes(allAssignmentsSearch.toLowerCase()) ||
      assignment.frequency?.toLowerCase().includes(allAssignmentsSearch.toLowerCase())
    );
  }, [allAccountAssignments, allAssignmentsSearch]);

  const paginatedAllAccountAssignments = useMemo(() => {
    const startIndex = (allAssignmentsPage - 1) * allAssignmentsPerPage;
    return filteredAllAccountAssignments.slice(startIndex, startIndex + allAssignmentsPerPage);
  }, [filteredAllAccountAssignments, allAssignmentsPage, allAssignmentsPerPage]);

  // Handle assignment actions
  const handleViewDetails = (assignmentId: string) => {
    router.push(`/assignments/${assignmentId}/details`);
  };

  const handleRename = (assignmentId: string) => {
    router.push(`/assignments/${assignmentId}/edit`);
  };

  const handleMakeCopy = async (assignment: Assignment) => {
    try {
      const newName = prompt("Enter a name for the copy:", `${assignment.assessmentName} (Copy)`);
      if (newName && newName.trim()) {
        const result = await copyAssignment(assignment.id, newName.trim());
        console.log("Assignment copied successfully:", result);
        // Refresh the assignments list
        const updatedAssignments = await getAssignments();
        // Filter assignments by account
        const accountAssignments = updatedAssignments.filter(assignment => 
          assignment.accountSubmittedFor === userProfile?.account
        );
        
        setMyAssignments(accountAssignments.filter(a => 
          a.author === userProfile?.email || 
          a.assignmentAdminArray?.some(admin => admin.displayName === userProfile?.displayName)
        ));
        setAllAccountAssignments(accountAssignments);
      }
    } catch (error) {
      console.error("Error copying assignment:", error);
      alert("Failed to copy assignment. Please try again.");
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (confirm("Are you sure you want to delete this assignment? This action cannot be undone.")) {
      try {
        await deleteAssignment(assignmentId);
        console.log("Assignment deleted successfully");
        // Remove from local state
        setMyAssignments(prev => prev.filter(a => a.id !== assignmentId));
        setAllAccountAssignments(prev => prev.filter(a => a.id !== assignmentId));
      } catch (error) {
        console.error("Error deleting assignment:", error);
        alert("Failed to delete assignment. Please try again.");
      }
    }
  };

  // Format date helper
  const formatDate = (dateString?: string | any) => {
    if (!dateString) return "N/A";
    
    try {
      let date: Date;
      
      // Handle Firebase Timestamp objects
      if (dateString && typeof dateString === 'object' && dateString.toDate) {
        date = dateString.toDate();
      } else if (dateString && typeof dateString === 'object' && dateString.seconds) {
        // Handle Firestore timestamp with seconds
        date = new Date(dateString.seconds * 1000);
      } else if (typeof dateString === 'string') {
        date = new Date(dateString);
      } else if (dateString instanceof Date) {
        date = dateString;
      } else {
        return "Invalid Date";
      }
      
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      
      return format(date, "MMM dd, yyyy");
    } catch (error) {
      console.error("Date formatting error:", error, "for dateString:", dateString);
      return "Invalid Date";
    }
  };

  // Loading states
  const overallLoadingMyAssignments = authLoading || profileLoading || isLoadingMyAssignments;
  const overallLoadingAllAccountAssignments = authLoading || profileLoading || isLoadingAllAccountAssignments;

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

  if (!userProfile?.account) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription>
          You must be logged in and have an account associated to view assignments.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all assignments for your organization
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/assignments/new">
            <Plus className="mr-2 h-5 w-5" /> Create Assignment
          </Link>
        </Button>
      </div>

      {/* My Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" /> 
            My Assignments ({filteredMyAssignments.length})
          </CardTitle>
          <CardDescription>
            Assignments assigned to you for account: {userProfile?.account || "your current account"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search for My Assignments */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search my assignments..."
                value={myAssignmentsSearch}
                onChange={(e) => setMyAssignmentsSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

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
              <AlertDescription>{myAssignmentsError}</AlertDescription>
            </Alert>
          )}

          {!overallLoadingMyAssignments && !myAssignmentsError && filteredMyAssignments.length === 0 && (
            <div className="border rounded-lg p-6 text-center bg-muted/20">
              <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Assignments Found</h3>
              <p className="text-muted-foreground mb-4">
                {myAssignmentsSearch ? "No assignments match your search criteria." : "You don't have any assignments assigned to you yet."}
              </p>
            </div>
          )}

          {!overallLoadingMyAssignments && !myAssignmentsError && filteredMyAssignments.length > 0 && (
            <>
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium w-1/4">Title</th>
                        <th className="text-left p-4 font-medium w-1/5">Description</th>
                        <th className="text-left p-4 font-medium w-40">Author</th>
                        <th className="text-left p-4 font-medium w-24">Frequency</th>
                        <th className="text-left p-4 font-medium w-28">Last Updated</th>
                        <th className="text-left p-4 font-medium w-24">Type</th>
                        <th className="text-right p-4 font-medium w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMyAssignments.map((assignment) => (
                        <tr key={assignment.id} className="border-b hover:bg-muted/30">
                          <td className="p-4">
                            <div>
                              <div className="font-medium">{assignment.assessmentName}</div>
                              <div className="text-sm text-muted-foreground">
                                Created: {formatDate(assignment.createdDate)}
                              </div>
                              <div className="mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  Active
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-muted-foreground max-w-none break-words">
                              {assignment.description || "No description"}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">
                                {assignment.author || "Unknown"}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-xs">
                              {assignment.frequency || "One-time"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">
                                {formatDate(assignment.updatedAt)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary" className="text-xs">
                              {assignment.assignmentType || "Assignment"}
                            </Badge>
                          </td>

                          <td className="p-4">
                            <div className="flex justify-end">
                              <Button asChild size="sm">
                                <Link href={`/assignments/${assignment.id}/complete`}>
                                  Go
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination for My Assignments */}
              {Math.ceil(filteredMyAssignments.length / myAssignmentsPerPage) > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {((myAssignmentsPage - 1) * myAssignmentsPerPage) + 1} to {Math.min(myAssignmentsPage * myAssignmentsPerPage, filteredMyAssignments.length)} of {filteredMyAssignments.length} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMyAssignmentsPage(myAssignmentsPage - 1)}
                      disabled={myAssignmentsPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {myAssignmentsPage} of {Math.ceil(filteredMyAssignments.length / myAssignmentsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMyAssignmentsPage(myAssignmentsPage + 1)}
                      disabled={myAssignmentsPage === Math.ceil(filteredMyAssignments.length / myAssignmentsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Items per page selector for My Assignments */}
              <div className="flex items-center gap-2 mt-4">
                <span className="text-sm text-muted-foreground">Show:</span>
                <select
                  value={myAssignmentsPerPage}
                  onChange={(e) => {
                    setMyAssignmentsPerPage(parseInt(e.target.value));
                    setMyAssignmentsPage(1);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* All Account Assignments Table (Admin View) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerIcon className="h-6 w-6 text-accent" />
              All Account Assignments (Admin View) ({filteredAllAccountAssignments.length})
            </CardTitle>
            <CardDescription>
              All assignments registered under account: {userProfile?.account || "current account"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search for All Account Assignments */}
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search all assignments..."
                  value={allAssignmentsSearch}
                  onChange={(e) => setAllAssignmentsSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {overallLoadingAllAccountAssignments && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={`admin-skeleton-${i}`} className="flex items-center justify-between p-3 rounded-md border">
                    <div>
                      <Skeleton className="h-5 w-56 mb-1" />
                      <Skeleton className="h-3 w-40" />
                    </div>
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

            {!overallLoadingAllAccountAssignments && !allAccountAssignmentsError && filteredAllAccountAssignments.length === 0 && (
              <div className="border rounded-lg p-6 text-center bg-muted/20">
                <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Assignments Found For Account</h3>
                <p className="text-muted-foreground mb-4">
                  {allAssignmentsSearch ? "No assignments match your search criteria." : `There are no assignments registered for account '${userProfile?.account || "current account"}'.`}
                </p>
              </div>
            )}

            {!overallLoadingAllAccountAssignments && !allAccountAssignmentsError && filteredAllAccountAssignments.length > 0 && (
              <>
                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-4 font-medium w-1/4">Title</th>
                          <th className="text-left p-4 font-medium w-1/5">Description</th>
                          <th className="text-left p-4 font-medium w-40">Author</th>
                          <th className="text-left p-4 font-medium w-24">Frequency</th>
                          <th className="text-left p-4 font-medium w-28">Last Updated</th>
                          <th className="text-left p-4 font-medium w-24">Type</th>
                          <th className="text-right p-4 font-medium w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAllAccountAssignments.map((assignment) => (
                          <tr key={assignment.id} className="border-b hover:bg-muted/30">
                            <td className="p-4">
                              <div>
                                <div className="font-medium">{assignment.assessmentName}</div>
                                <div className="text-sm text-muted-foreground">
                                  Created: {formatDate(assignment.createdDate)}
                                </div>
                                <div className="mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    Active
                                  </Badge>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm text-muted-foreground max-w-none break-words">
                                {assignment.description || "No description"}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">
                                  {assignment.author || "Unknown"}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="text-xs">
                                {assignment.frequency || "One-time"}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(assignment.updatedAt)}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="secondary" className="text-xs">
                                {assignment.assignmentType || "Assignment"}
                              </Badge>
                            </td>

                            <td className="p-4">
                              <div className="flex justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                                                     <DropdownMenuContent align="end">
                                     <DropdownMenuItem asChild>
                                       <Link href={`/assignments/${assignment.id}/complete`}>
                                         <FileText className="mr-2 h-4 w-4" />
                                         Go
                                       </Link>
                                     </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleViewDetails(assignment.id)}>
                                       <Eye className="mr-2 h-4 w-4" />
                                       View Details
                                     </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleRename(assignment.id)}>
                                       <Edit className="mr-2 h-4 w-4" />
                                       Rename
                                     </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleMakeCopy(assignment)}>
                                       <Copy className="mr-2 h-4 w-4" />
                                       Make a Copy
                                     </DropdownMenuItem>
                                     <DropdownMenuSeparator />
                                     <DropdownMenuItem 
                                       onClick={() => handleDelete(assignment.id)}
                                       className="text-destructive focus:text-destructive"
                                     >
                                       <Trash2 className="mr-2 h-4 w-4" />
                                       Delete
                                     </DropdownMenuItem>
                                   </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination for All Account Assignments */}
                {Math.ceil(filteredAllAccountAssignments.length / allAssignmentsPerPage) > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {((allAssignmentsPage - 1) * allAssignmentsPerPage) + 1} to {Math.min(allAssignmentsPage * allAssignmentsPerPage, filteredAllAccountAssignments.length)} of {filteredAllAccountAssignments.length} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAllAssignmentsPage(allAssignmentsPage - 1)}
                        disabled={allAssignmentsPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {allAssignmentsPage} of {Math.ceil(filteredAllAccountAssignments.length / allAssignmentsPerPage)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAllAssignmentsPage(allAssignmentsPage + 1)}
                        disabled={allAssignmentsPage === Math.ceil(filteredAllAccountAssignments.length / allAssignmentsPerPage)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {/* Items per page selector for All Account Assignments */}
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <select
                    value={allAssignmentsPerPage}
                    onChange={(e) => {
                      setAllAssignmentsPerPage(parseInt(e.target.value));
                      setAllAssignmentsPage(1);
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 