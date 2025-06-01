
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { getLocationsForLookup, type Location } from "@/services/locationService";
import { createAssignment, type AssignmentQuestion } from "@/services/assignmentFunctionsService"; // For future use
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building, ListPlus, Save, AlertTriangle } from "lucide-react";

const newAssignmentSchema = z.object({
  assessmentName: z.string().min(3, { message: "Assessment name must be at least 3 characters." }),
  description: z.string().optional(),
  locationId: z.string().min(1, { message: "Please select a location." }),
  // questions: z.array(z.any()).optional(), // Placeholder for future question structure
});

type NewAssignmentFormData = z.infer<typeof newAssignmentSchema>;

export default function NewAssignmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, register, handleSubmit, formState: { errors }, reset } = useForm<NewAssignmentFormData>({
    resolver: zodResolver(newAssignmentSchema),
    defaultValues: {
      assessmentName: "",
      description: "",
      locationId: "",
    },
  });

  useEffect(() => {
    if (!authLoading && !profileLoading && user && userProfile?.account) {
      setIsLoadingLocations(true);
      setLocationsError(null);
      getLocationsForLookup(userProfile.account)
        .then(fetchedLocations => {
          setLocations(fetchedLocations);
        })
        .catch(err => {
          console.error("Failed to fetch locations:", err);
          setLocationsError(err.message || "Could not load locations.");
          toast({ variant: "destructive", title: "Error Loading Locations", description: err.message });
        })
        .finally(() => setIsLoadingLocations(false));
    } else if (!authLoading && !profileLoading && (!user || !userProfile?.account)) {
      setLocationsError("User or account information not available. Cannot load locations.");
      setIsLoadingLocations(false);
    }
  }, [user, userProfile, authLoading, profileLoading, toast]);

  const onSubmit: SubmitHandler<NewAssignmentFormData> = async (data) => {
    setIsSubmitting(true);
    if (!userProfile?.account) {
      toast({ variant: "destructive", title: "Error", description: "User account not found." });
      setIsSubmitting(false);
      return;
    }

    // For now, just log the data.
    // In the future, this will call `createAssignment` from assignmentFunctionsService
    console.log("New Assignment Data:", data);
    
    // Example of calling createAssignment (currently commented out)
    // const payload = {
    //   assessmentName: data.assessmentName,
    //   description: data.description,
    //   accountSubmittedFor: userProfile.account,
    //   // schoolSelectorId: data.locationId, // Assuming locationId maps to schoolSelectorId
    //   content: [], // Placeholder for actual questions
    //   // assignmentType: "default", // Or derive from form
    // };
    // try {
    //   await createAssignment(payload, userProfile.account);
    //   toast({ title: "Success", description: "Assignment created (placeholder)." });
    //   router.push("/assessment-forms");
    // } catch (error: any) {
    //   toast({ variant: "destructive", title: "Failed to create assignment", description: error.message });
    // }


    // Simulating API call for now
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: "Assignment Submitted (Placeholder)",
      description: `Name: ${data.assessmentName}, Location ID: ${data.locationId}`,
    });
    // reset(); // Optionally reset form
    // router.push("/assessment-forms"); // Navigate back after submission
    
    setIsSubmitting(false);
  };

  if (authLoading || profileLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-10 w-1/2 mb-6" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-1/3 ml-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || !userProfile?.account) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription>
          You must be logged in and have an account associated to create an assignment.
          <Button onClick={() => router.push('/auth')} className="mt-2 ml-auto block">Login</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Button variant="outline" onClick={() => router.push('/assessment-forms')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Assignments
      </Button>

      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Create New Assignment</CardTitle>
          <CardDescription>Fill in the details below to create a new assignment for your account: {userProfile.account}.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="assessmentName">Assessment Name</Label>
              <Input id="assessmentName" {...register("assessmentName")} placeholder="e.g., Monthly Safety Walkthrough" />
              {errors.assessmentName && <p className="text-sm text-destructive mt-1">{errors.assessmentName.message}</p>}
            </div>

            <div>
              <Label htmlFor="locationId" className="flex items-center gap-1">
                <Building className="h-4 w-4 text-muted-foreground" /> Site / Location
              </Label>
              {isLoadingLocations ? (
                <Skeleton className="h-10 w-full" />
              ) : locationsError ? (
                <Alert variant="destructive" className="text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{locationsError}</AlertDescription>
                </Alert>
              ) : (
                <Controller
                  name="locationId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="locationId">
                        <SelectValue placeholder="Select a location..." />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.length > 0 ? (
                          locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-sm text-muted-foreground text-center">No locations found.</div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {errors.locationId && <p className="text-sm text-destructive mt-1">{errors.locationId.message}</p>}
            </div>
            
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" {...register("description")} placeholder="Provide a brief description of the assignment..." />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            </div>

            <Card className="mt-6 bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><ListPlus className="h-5 w-5 text-primary"/>Questions</CardTitle>
                <CardDescription>The full question builder will be available here soon.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  For now, questions are not part of this initial form. This section will allow you to add various question types (text, multiple choice, photo uploads, etc.) to your assignment.
                </p>
              </CardContent>
            </Card>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="ml-auto" disabled={isSubmitting} size="lg">
              <Save className="mr-2 h-5 w-5" />
              {isSubmitting ? "Saving..." : "Save Assignment"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
