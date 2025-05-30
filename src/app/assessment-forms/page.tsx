
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, FilePlus2, ListOrdered, Edit, AlertTriangle } from "lucide-react";
import type { Assignment } from "@/types/Assignment";
import { getAssignments } from "@/services/assignmentService";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const sampleTemplates = [
  { id: "env1", name: "Environmental Safety Checklist", description: "General campus environment assessment.", icon: CheckSquare },
  { id: "fire1", name: "Fire Safety Inspection Form", description: "For routine fire safety checks.", icon: CheckSquare },
  { id: "lab1", name: "Lab Safety Audit", description: "Specific to laboratory environments.", icon: CheckSquare },
];

export default function AssessmentFormsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAssignments() {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedAssignments = await getAssignments();
        setAssignments(fetchedAssignments);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "An unknown error occurred while fetching assignments.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchAssignments();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignment Builder</h1>
          <p className="text-lg text-muted-foreground">
            Create, customize, and deploy assignments with ease.
          </p>
        </div>
        <Button size="lg">
          <FilePlus2 className="mr-2 h-5 w-5" /> Create New Assignment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Assignments</CardTitle>
          <CardDescription>Manage your existing assignments or create new ones from Firestore.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
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
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Assignments</AlertTitle>
              <AlertDescription>
                {error}
                {error && error.toLowerCase().includes("permission") && (
                  <p className="mt-2 text-xs">
                    This error often indicates an issue with Firestore security rules. Please ensure your rules allow read access to the 'assignments' collection for the currently authenticated user.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && assignments.length === 0 && (
            <div className="border rounded-lg p-6 text-center bg-muted/20">
              <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Assignments Yet</h3>
              <p className="text-muted-foreground mb-4">No assignments found in your Firestore 'assignments' collection. This could also be due to Firestore security rules.</p>
            </div>
          )}
          {!isLoading && !error && assignments.length > 0 && (
            <ul className="space-y-3">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors border">
                  <div>
                    <p className="font-medium">{assignment.assessmentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {assignment.description || `Due: ${assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}`}
                    </p>
                  </div>
                  {/* Future actions: View, Edit, Delete */}
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
        Full assignment builder functionality and template integration with Firestore coming soon.
      </p>
    </div>
  );
}
