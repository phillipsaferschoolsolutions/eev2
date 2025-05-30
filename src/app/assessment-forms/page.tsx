
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, FilePlus2, ListOrdered, Edit, AlertTriangle, UserCircle } from "lucide-react";
import type { FullAssignment as FetchedAssignment } from "@/services/assignmentFunctionsService"; // Renamed to avoid conflict
import { getAllAssignmentsWithContent } from "@/services/assignmentFunctionsService";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context"; // Import useAuth
import Link from "next/link";

const sampleTemplates = [
  { id: "env1", name: "Environmental Safety Checklist", description: "General campus environment assessment.", icon: CheckSquare },
  { id: "fire1", name: "Fire Safety Inspection Form", description: "For routine fire safety checks.", icon: CheckSquare },
  { id: "lab1", name: "Lab Safety Audit", description: "Specific to laboratory environments.", icon: CheckSquare },
];

export default function AssessmentFormsPage() {
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth(); // Get user, profile and loading states
  const [assignments, setAssignments] = useState<FetchedAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true); // Separate loading for assignments
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAssignments() {
      if (!user || !userProfile || !userProfile.account) {
        if (!authLoading && !profileLoading) { 
          if(!user){
            setError("You must be logged in to view assignments.");
          } else if (!userProfile?.account) {
            setError("User account information is not available. Cannot fetch assignments.");
          }
          setIsLoadingAssignments(false);
        }
        return;
      }

      try {
        setIsLoadingAssignments(true);
        setError(null);
        const fetchedAssignmentsData = await getAllAssignmentsWithContent(userProfile.account);
        setAssignments(fetchedAssignmentsData);
      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching assignments.";
        if (errorMessage.includes("403")) {
          setError(`API Error: 403 Forbidden. The Cloud Function denied access. This could be due to CORS settings, incorrect account header expectations, or the function's internal authorization logic. Please check your Cloud Function logs and configuration.`);
        } else if (errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("unauthorized")) {
          setError(errorMessage + " This might be due to Firestore security rules or the Cloud Function requiring specific permissions.");
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoadingAssignments(false);
      }
    }

    if (!authLoading && !profileLoading) {
      fetchAssignments();
    } else {
      setIsLoadingAssignments(true); 
    }
  }, [user, userProfile, authLoading, profileLoading]);

  const overallLoading = authLoading || profileLoading || isLoadingAssignments;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignment Builder</h1>
          <p className="text-lg text-muted-foreground">
            Create, customize, and deploy assignments for your account: {userProfile?.account || "Loading account..."}.
          </p>
        </div>
        <Button size="lg">
          <FilePlus2 className="mr-2 h-5 w-5" /> Create New Assignment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Assignments</CardTitle>
          <CardDescription>
            {userProfile?.account 
              ? `Assignments for account: ${userProfile.account}.`
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
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          )}
          {error && !overallLoading && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Assignments</AlertTitle>
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
              <h3 className="text-xl font-semibold mb-2">No Assignments Yet</h3>
              <p className="text-muted-foreground mb-4">
                No assignments found for account '{userProfile?.account || "current account"}'. This could also be due to backend filtering or permissions.
              </p>
            </div>
          )}
          {!overallLoading && !error && assignments.length > 0 && (
            <ul className="space-y-3">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors border">
                  <div>
                    <p className="font-medium">{assignment.assessmentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {assignment.description || `Due: ${assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}`}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">View</Button> 
                </li>
              ))}
            </ul>
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
                <Button variant="outline" className="w-full">
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

