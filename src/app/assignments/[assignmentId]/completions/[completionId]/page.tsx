// src/app/assignments/[assignmentId]/completions/[completionId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { getCompletionDetails } from "@/services/assignmentFunctionsService";
import { Separator } from "@/components/ui/separator";

export default function CompletionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();

  const assignmentId = typeof params.assignmentId === 'string' && params.assignmentId !== 'undefined' ? params.assignmentId : '';
  const completionId = typeof params.completionId === 'string' && params.completionId !== 'undefined' ? params.completionId : '';

  const [completionData, setCompletionData] = useState<any>(null); // Use a proper type later
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch until we have the necessary IDs and user account info
    if (!assignmentId || !completionId || authLoading || !userProfile?.account) {
      setIsLoading(false);
      if (!authLoading && !userProfile?.account) {
          setError("User account information is missing.");
      } else if (!assignmentId) {
          setError("Assignment ID is missing or invalid.");
      } else if (!completionId) {
          setError("Completion ID is missing or invalid.");
      }
      return;
    }

    const fetchCompletionDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getCompletionDetails(assignmentId, completionId, userProfile.account);
        if (data) {
          setCompletionData(data);
        } else {
          setError("Completion data not found.");
        }
      } catch (err: any) {
        console.error("Error fetching completion details:", err);
        setError(err.message || "An unknown error occurred while fetching details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompletionDetails();
  }, [assignmentId, completionId, userProfile?.account, authLoading]); // Dependency array


  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-3/4" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Completion Details</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Completions
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Completion Details</CardTitle>
          <CardDescription>
            Viewing submitted data for completion ID: {completionId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completionData && (
            <div className="space-y-6">
              {/* --- Metadata Section --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <p><strong>Completed By:</strong> {completionData.completedBy || 'N/A'}</p>
                <p><strong>Completion Date:</strong> {completionData.submittedTimeServer ? new Date(completionData.submittedTimeServer).toLocaleString() : 'N/A'}</p>
                <p><strong>Location:</strong> {completionData.locationName || 'N/A'}</p>
                <p><strong>Status:</strong> <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">{completionData.status}</span></p>
              </div>

              <Separator />

              {/* --- Answers Section --- */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Submitted Answers</h3>
                <div className="space-y-4">
                  {completionData.questions && completionData.questions.length > 0 ? (
                    completionData.questions.map((question: any, index: number) => {
                      const answer = completionData.content?.[question.id];
                      const comment = completionData.commentsData?.[question.id];
                      const photoUrl = completionData.photoLinks?.[question.id];
                      
                      return (
                        <div key={question.id || index} className="p-3 border rounded-md bg-muted/20">
                          <p className="font-semibold">{index + 1}. {question.label}</p>
                          
                          {/* Display Answer */}
                          <div className="mt-2">
                            <span className="text-sm font-medium text-muted-foreground">Answer: </span>
                            <span className="text-sm">
                              {answer !== null && answer !== undefined && answer !== '' ? 
                                (Array.isArray(answer) ? answer.join(', ') : String(answer)) 
                                : <span className="italic text-muted-foreground/70">No answer provided</span>
                              }
                            </span>
                          </div>

                          {/* Display Comment if it exists */}
                          {comment && (
                            <div className="mt-2 p-2 bg-background rounded-md border">
                                <p className="text-xs font-semibold text-muted-foreground">Comment</p>
                                <p className="text-sm italic">"{comment}"</p>
                            </div>
                          )}

                          {/* Display Photo if it exists */}
                          {photoUrl && (
                            <div className="mt-2">
                                <p className="text-xs font-semibold text-muted-foreground">Attached Photo</p>
                                <a href={photoUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={photoUrl} alt={`Photo for ${question.label}`} className="max-w-xs mt-1 rounded-md shadow-md" />
                                </a>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground">No questions were found for this assignment.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}