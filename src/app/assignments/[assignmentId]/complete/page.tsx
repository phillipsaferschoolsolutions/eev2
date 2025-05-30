
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller, type SubmitHandler, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getAssignmentById, submitCompletedAssignment, type AssignmentWithPermissions, type AssignmentQuestion } from "@/services/assignmentFunctionsService";
import { AlertTriangle, FileUp, MessageSquare, Send } from "lucide-react";

// Define a base schema for dynamic form generation
// For now, it's a generic record, but can be refined if common validation rules emerge
const formSchema = z.record(z.any());
type FormData = z.infer<typeof formSchema>;

export default function CompleteAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();

  const assignmentId = typeof params.assignmentId === 'string' ? params.assignmentId : '';

  const [assignment, setAssignment] = useState<AssignmentWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, register, handleSubmit, watch, reset, formState: { errors: formErrors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (!assignmentId) {
      setError("Assignment ID is missing.");
      setIsLoading(false);
      return;
    }

    if (authLoading || profileLoading) {
        setIsLoading(true);
        return;
    }
    
    if (!user) {
      setError("You must be logged in to complete an assignment.");
      toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in."});
      setIsLoading(false);
      // router.push('/auth'); // Optionally redirect
      return;
    }

    async function fetchAssignment() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedAssignment = await getAssignmentById(assignmentId, userProfile?.account);
        if (fetchedAssignment) {
          setAssignment(fetchedAssignment);
          // Initialize form default values based on fetched assignment (if needed for edits, less so for completion)
          const defaultVals: FieldValues = {};
          fetchedAssignment.questions.forEach(q => {
            defaultVals[q.id] = ''; // Default empty answer
            if (q.comment) defaultVals[`${q.id}_comment`] = '';
            // File inputs are uncontrolled by react-hook-form value
          });
          reset(defaultVals);

        } else {
          setError("Assignment not found or you do not have permission to access it.");
          toast({ variant: "destructive", title: "Error", description: "Assignment not found." });
        }
      } catch (err) {
        console.error("Failed to fetch assignment:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Failed to load assignment: ${errorMessage}`);
        toast({ variant: "destructive", title: "Loading Failed", description: errorMessage });
      } finally {
        setIsLoading(false);
      }
    }

    fetchAssignment();
  }, [assignmentId, user, userProfile, authLoading, profileLoading, reset, toast, router]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!assignment || !userProfile?.account) {
        toast({ variant: "destructive", title: "Submission Error", description: "Cannot submit, assignment or user account data missing." });
        return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    
    // Append structured answers, comments, etc.
    // The backend /completed/:id expects specific field names.
    // This part needs to align with how your backend processes completed assignments.
    // For now, let's assume we send a JSON string of answers and individual files.
    
    const answersObject: Record<string, any> = {};

    assignment.questions.forEach(question => {
        answersObject[question.id] = {
            answer: data[question.id]
        };
        if (question.comment && data[`${question.id}_comment`]) {
            answersObject[question.id].comment = data[`${question.id}_comment`];
        }
        // Handle file uploads
        const fileInput = document.getElementById(`${question.id}_file`) as HTMLInputElement;
        if (question.photoUpload && fileInput && fileInput.files && fileInput.files[0]) {
            formData.append(question.id, fileInput.files[0]); // Use question.id or a specific naming convention for files
            // We might also want to store a reference in answersObject, e.g., fileName
            answersObject[question.id].fileName = fileInput.files[0].name;
        }
    });

    formData.append("answers", JSON.stringify(answersObject)); // Example: sending answers as a JSON string
    formData.append("assignmentId", assignment.id);
    formData.append("assessmentName", assignment.assessmentName || "Unnamed Assignment");
    formData.append("accountSubmittedFor", userProfile.account);
    // Add other metadata backend might expect for a completed assignment
    // formData.append("userId", user.uid); 
    // formData.append("userEmail", user.email || "");

    try {
      await submitCompletedAssignment(assignment.id, formData, userProfile.account);
      toast({ title: "Success", description: "Assignment submitted successfully." });
      router.push("/assignments"); // Redirect to assignments list or a thank you page
    } catch (err) {
      console.error("Failed to submit assignment:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast({ variant: "destructive", title: "Submission Failed", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseOptions = (options: string | string[] | undefined): string[] => {
    if (!options) return [];
    if (Array.isArray(options)) return options;
    return options.split(';').map(opt => opt.trim()).filter(opt => opt);
  };


  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-5 w-1/3 mb-4" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-8 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Assignment</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!assignment) {
    return <p className="p-4 text-center">Assignment data is not available.</p>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{assignment.assessmentName || "Assignment"}</CardTitle>
          {assignment.description && <CardDescription className="text-lg">{assignment.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {assignment.questions?.map((question, index) => (
              <Card key={question.id || index} className="p-6 bg-card/50">
                <fieldset className="space-y-3">
                  <Label htmlFor={question.id} className="text-lg font-semibold text-foreground">
                    {index + 1}. {question.label}
                    {question.required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {/* Render input based on question.component */}
                  {['text', 'number', 'email', 'url', 'tel', 'date', 'time', 'datetime-local'].includes(question.component) && (
                    <Input
                      id={question.id}
                      type={question.component === 'tel' ? 'tel' : question.component}
                      {...register(question.id, { required: question.required })}
                      className="bg-background"
                    />
                  )}

                  {question.component === 'textarea' && (
                    <Textarea
                      id={question.id}
                      {...register(question.id, { required: question.required })}
                      className="bg-background"
                    />
                  )}

                  {question.component === 'radio' && (
                    <Controller
                      name={question.id}
                      control={control}
                      rules={{ required: question.required }}
                      render={({ field }) => (
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1 bg-background p-2 rounded-md"
                        >
                          {parseOptions(question.options).map((option) => (
                            <div key={option} className="flex items-center space-x-3">
                              <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                              <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    />
                  )}
                  
                  {question.component === 'select' && (
                     <Controller
                        name={question.id}
                        control={control}
                        rules={{ required: question.required }}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger id={question.id} className="w-full bg-background">
                                    <SelectValue placeholder={`Select an option for "${question.label}"`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {parseOptions(question.options).map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                  )}

                  {question.component === 'checkbox' && !question.options && ( // Single checkbox for boolean
                     <Controller
                        name={question.id}
                        control={control}
                        // rules={{ required: question.required ? "This checkbox is required" : false }}
                        render={({ field }) => (
                            <div className="flex items-center space-x-2 bg-background p-2 rounded-md">
                                <Checkbox
                                    id={question.id}
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                                <Label htmlFor={question.id} className="font-normal">Confirm</Label>
                            </div>
                        )}
                    />
                  )}
                  
                  {/* Placeholder for multi-checkbox group if options are present */}
                  {question.component === 'checkbox' && question.options && (
                    <div className="space-y-2 bg-background p-2 rounded-md">
                        {parseOptions(question.options).map(opt => (
                            <Controller
                                key={opt}
                                name={`${question.id}.${opt}`} // e.g., q1.optionA
                                control={control}
                                render={({ field }) => (
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`${question.id}-${opt}`}
                                            checked={!!field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                        <Label htmlFor={`${question.id}-${opt}`} className="font-normal">{opt}</Label>
                                    </div>
                                )}
                            />
                        ))}
                    </div>
                  )}


                  {formErrors[question.id] && <p className="text-sm text-destructive">{formErrors[question.id]?.message as string}</p>}

                  {/* Comment Field */}
                  {question.comment && (
                    <div className="mt-3">
                      <Label htmlFor={`${question.id}_comment`} className="text-sm text-muted-foreground flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1"/> Optional Comments
                      </Label>
                      <Textarea
                        id={`${question.id}_comment`}
                        {...register(`${question.id}_comment`)}
                        rows={2}
                        className="mt-1 bg-background/80"
                        placeholder="Add any comments..."
                      />
                    </div>
                  )}

                  {/* File Upload Field */}
                  {question.photoUpload && (
                    <div className="mt-3">
                      <Label htmlFor={`${question.id}_file`} className="text-sm text-muted-foreground flex items-center">
                        <FileUp className="h-4 w-4 mr-1"/> Upload File (Optional)
                      </Label>
                      <Input
                        id={`${question.id}_file`}
                        type="file"
                        className="mt-1 bg-background/80"
                        // react-hook-form doesn't control file inputs directly in the same way.
                        // We will access its value via document.getElementById in onSubmit.
                        // onChange={(e) => field.onChange(e.target.files)} // if using Controller
                      />
                    </div>
                  )}
                </fieldset>
              </Card>
            ))}

            <div className="flex justify-end pt-6">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                <Send className="mr-2 h-5 w-5" />
                {isSubmitting ? "Submitting..." : "Submit Assignment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
