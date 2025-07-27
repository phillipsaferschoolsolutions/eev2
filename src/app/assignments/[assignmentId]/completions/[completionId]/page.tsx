// src/app/assignments/[assignmentId]/completions/[completionId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { getCompletionDetails } from "@/services/assignmentFunctionsService";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export default function CompletionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userProfile, loading: authLoading } = useAuth();

  const assignmentId = typeof params.assignmentId === 'string' && params.assignmentId !== 'undefined' ? params.assignmentId : '';
  const completionId = typeof params.completionId === 'string' && params.completionId !== 'undefined' ? params.completionId : '';

  const [completionData, setCompletionData] = useState<Record<string, unknown> | null>(null);
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
        console.log("Fetched completion details:", data);
        if (data) {
          setCompletionData(data);
        } else {
          setError("Completion data not found.");
        }
      } catch (err: unknown) {
        console.error("Error fetching completion details:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred while fetching details.");
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

  // Helper function to determine if a value is a valid answer (not null, undefined, or empty string)
  const hasValidAnswer = (value: unknown) => {
    return value !== null && value !== undefined && value !== '';
  };

  // Helper function to format answer display based on type
  const formatAnswer = (answer: unknown) => {
    if (answer === null || answer === undefined) return <span className="italic text-muted-foreground/70">No answer provided</span>;
    
    if (typeof answer === 'boolean') {
      return answer ? 
        <Badge variant="default" className="bg-green-500"><CheckCircle2 className="mr-1 h-3 w-3" /> Yes</Badge> : 
        <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> No</Badge>;
    }
    
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    
    return String(answer);
  };

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
                
                {/* Check if content exists */}
                {completionData.content && Object.keys(completionData.content).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(completionData.content).map(([questionId, answer], index) => {
                      // Try to find the question label from questions array if available
                      let questionLabel = "Question";
                      if (completionData.questions && Array.isArray(completionData.questions as unknown[])) {
                        const question = (completionData.questions as unknown[]).find((q: unknown) => 
                          typeof q === 'object' && q !== null && 'id' in q && (q as { id: string }).id === questionId
                        );
                        if (question && typeof question === 'object' && 'label' in question) {
                          questionLabel = (question as { label: string }).label;
                        }
                      }
                      
                      // Get comment for this question if it exists
                      const comment = completionData.commentsData && 
                        typeof completionData.commentsData === 'object' && 
                        completionData.commentsData !== null &&
                        (completionData.commentsData as Record<string, unknown>)[questionId];
                      
                      // Get photo URL for this question if it exists
                      const photoUrl = completionData.uploadedPhotos && 
                        typeof completionData.uploadedPhotos === 'object' && 
                        completionData.uploadedPhotos !== null &&
                        (completionData.uploadedPhotos as Record<string, { link?: string }>)[questionId]?.link;
                      
                      return (
                        <div key={questionId} className="p-4 border rounded-md bg-muted/20">
                          <p className="font-semibold">{index + 1}. {questionLabel}</p>
                          
                          {/* Display Answer */}
                          <div className="mt-2">
                            <span className="text-sm font-medium text-muted-foreground">Answer: </span>
                            <span className="text-sm">
                              {hasValidAnswer(answer) ? formatAnswer(answer) : 
                                <span className="italic text-muted-foreground/70">No answer provided</span>
                              }
                            </span>
                          </div>

                          {/* Display Comment if it exists */}
                          {comment && (
                            <div className="mt-2 p-2 bg-background rounded-md border">
                                <p className="text-xs font-semibold text-muted-foreground">Comment</p>
                                <p className="text-sm italic">&quot;{String(comment)}&quot;</p>
                            </div>
                          )}

                          {/* Display Photo if it exists */}
                          {photoUrl && (
                            <div className="mt-2">
                                <p className="text-xs font-semibold text-muted-foreground">Attached Photo</p>
                                <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="block mt-1">
                                    <Image 
                                      src={photoUrl} 
                                      alt={`Photo for ${questionLabel}`} 
                                      width={300} 
                                      height={200} 
                                      className="max-w-xs rounded-md shadow-md object-cover"
                                    />
                                </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Alert>
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>No Content Found</AlertTitle>
                    <AlertDescription>
                      This completion record doesn&apos;t contain any question responses.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              {/* Additional Sections for Photos, Comments, etc. */}
              {completionData.uploadedPhotos && Object.keys(completionData.uploadedPhotos as Record<string, unknown>).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">All Uploaded Photos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(completionData.uploadedPhotos as Record<string, { link?: string; date?: string }>).map(([questionId, photoData]) => {
                      if (!photoData?.link) return null;
                      
                      // Try to find question label
                      let questionLabel = "Unknown Question";
                      if (completionData.questions && Array.isArray(completionData.questions as unknown[])) {
                        const question = (completionData.questions as unknown[]).find((q: unknown) => 
                          typeof q === 'object' && q !== null && 'id' in q && (q as { id: string }).id === questionId
                        );
                        if (question && typeof question === 'object' && 'label' in question) {
                          questionLabel = (question as { label: string }).label;
                        }
                      }
                      
                      return (
                        <Card key={questionId} className="overflow-hidden">
                          <div className="relative h-48">
                            <Image 
                              src={photoData.link} 
                              alt={`Photo for ${questionLabel}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <CardContent className="p-3">
                            <p className="text-xs font-medium truncate">{questionLabel}</p>
                            <p className="text-xs text-muted-foreground">{photoData.date || 'No date'}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}