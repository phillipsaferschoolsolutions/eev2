
"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller, type SubmitHandler, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; 
import { storage } from "@/lib/firebase"; 
import Image from "next/image";

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
import { Progress } from "@/components/ui/progress"; 
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getAssignmentById, submitCompletedAssignment, type AssignmentWithPermissions, type AssignmentQuestion } from "@/services/assignmentFunctionsService";
import { AlertTriangle, Paperclip, MessageSquare, Send, XCircle, CheckCircle2 } from "lucide-react";

const formSchema = z.record(z.any());
type FormDataSchema = z.infer<typeof formSchema>;

interface UploadedFileDetail {
  name: string;
  url: string;
}

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

  const [uploadProgress, setUploadProgress] = useState<{ [questionId: string]: number }>({});
  const [uploadedFileDetails, setUploadedFileDetails] = useState<{ [questionId: string]: UploadedFileDetail | null }>({});
  const [uploadErrors, setUploadErrors] = useState<{ [questionId: string]: string | null }>({});
  const [imagePreviewUrls, setImagePreviewUrls] = useState<{ [questionId: string]: string | null }>({});


  const { control, register, handleSubmit, watch, reset, formState: { errors: formErrors }, setValue } = useForm<FormDataSchema>({
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
      return;
    }
    if (!userProfile?.account) {
      setError("User account information is missing. Cannot load assignment.");
      setIsLoading(false);
      return;
    }

    async function fetchAssignment() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedAssignment = await getAssignmentById(assignmentId, userProfile.account);
        if (fetchedAssignment) {
          setAssignment(fetchedAssignment);
          const defaultVals: FieldValues = {};
          fetchedAssignment.questions.forEach(q => {
            // TODO: Handle pre-filled values if editing a draft in the future
            if (q.component === 'checkbox' && q.options && Array.isArray(parseOptions(q.options))) {
              parseOptions(q.options).forEach(opt => {
                defaultVals[`${q.id}.${opt}`] = false; 
              });
            } else if (q.component === 'range') {
                let defaultRangeVal = 50; // Default fallback for range
                if (typeof q.options === 'string') {
                    const defaultOpt = q.options.split(';').find(opt => opt.startsWith('default='));
                    if (defaultOpt) {
                        const val = parseInt(defaultOpt.split('=')[1]);
                        if (!isNaN(val)) defaultRangeVal = val;
                    } else {
                         const minOpt = q.options.split(';').find(opt => opt.startsWith('min='));
                         if (minOpt) {
                            const val = parseInt(minOpt.split('=')[1]);
                            if (!isNaN(val)) defaultRangeVal = val; // Default to min if no explicit default
                         }
                    }
                }
                defaultVals[q.id] = defaultRangeVal;
            } else if (q.component === 'checkbox' && !q.options) { // Single checkbox
                defaultVals[q.id] = false;
            }
            else {
              defaultVals[q.id] = ''; 
            }
            if (q.comment) defaultVals[`${q.id}_comment`] = '';
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

  const handleFileUpload = async (questionId: string, file: File) => {
    if (!user || !assignment) {
      setUploadErrors(prev => ({ ...prev, [questionId]: "User or assignment data missing." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) { 
        setUploadErrors(prev => ({ ...prev, [questionId]: "File exceeds 5MB limit." }));
        toast({ variant: "destructive", title: "Upload Error", description: "File exceeds 5MB limit."});
        return;
    }

    setUploadProgress(prev => ({ ...prev, [questionId]: 0 }));
    setUploadErrors(prev => ({ ...prev, [questionId]: null }));
    setUploadedFileDetails(prev => ({ ...prev, [questionId]: null }));
    setImagePreviewUrls(prev => ({ ...prev, [questionId]: null }));

    if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreviewUrls(prev => ({ ...prev, [questionId]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }

    const storagePath = `assignment_uploads/${assignment.id}/${user.uid}/${questionId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(prev => ({ ...prev, [questionId]: progress }));
      },
      (error) => {
        console.error("Upload failed for question " + questionId + ":", error);
        setUploadErrors(prev => ({ ...prev, [questionId]: error.message }));
        toast({ variant: "destructive", title: "Upload Failed", description: `Could not upload ${file.name}: ${error.message}` });
        setUploadProgress(prev => ({ ...prev, [questionId]: 0 }));
        setImagePreviewUrls(prev => ({ ...prev, [questionId]: null })); // Clear preview on error
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setUploadedFileDetails(prev => ({ ...prev, [questionId]: { name: file.name, url: downloadURL } }));
          toast({ title: "Upload Successful", description: `${file.name} uploaded.` });
          setUploadProgress(prev => ({ ...prev, [questionId]: 100 })); 
        } catch (err) {
            console.error("Failed to get download URL for " + questionId + ":", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error getting URL.";
            setUploadErrors(prev => ({ ...prev, [questionId]: "Failed to get file URL: " + errorMessage }));
            setImagePreviewUrls(prev => ({ ...prev, [questionId]: null })); // Clear preview on error
        }
      }
    );
  };
  
  const removeUploadedFile = (questionId: string) => {
    setUploadedFileDetails(prev => ({ ...prev, [questionId]: null }));
    setUploadProgress(prev => ({ ...prev, [questionId]: 0 }));
    setUploadErrors(prev => ({ ...prev, [questionId]: null }));
    setImagePreviewUrls(prev => ({ ...prev, [questionId]: null }));
    const fileInput = document.getElementById(`${questionId}_file`) as HTMLInputElement;
    if (fileInput) fileInput.value = ""; 
  };


  const onSubmit: SubmitHandler<FormDataSchema> = async (data) => {
    if (!assignment || !userProfile?.account || !user) {
        toast({ variant: "destructive", title: "Submission Error", description: "Cannot submit, assignment or user account data missing." });
        return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    const answersObject: Record<string, any> = {};

    assignment.questions.forEach(question => {
        let questionAnswer: any;
        if (question.component === 'checkbox' && question.options && Array.isArray(parseOptions(question.options))) {
            const selectedOptions: string[] = [];
            parseOptions(question.options).forEach(opt => {
                if (data[`${question.id}.${opt}`]) {
                    selectedOptions.push(opt);
                }
            });
            questionAnswer = selectedOptions;
        } else {
            questionAnswer = data[question.id] ?? ""; 
        }

        answersObject[question.id] = {
            answer: questionAnswer
        };

        if (question.comment && data[`${question.id}_comment`]) {
            answersObject[question.id].comment = data[`${question.id}_comment`];
        }
        
        if (question.photoUpload && uploadedFileDetails[question.id]) {
            answersObject[question.id].file = {
                name: uploadedFileDetails[question.id]!.name,
                url: uploadedFileDetails[question.id]!.url,
            };
        }
    });

    formData.append("answers", JSON.stringify(answersObject));
    formData.append("assignmentId", assignment.id);
    formData.append("assessmentName", assignment.assessmentName || "Unnamed Assignment");
    formData.append("accountSubmittedFor", userProfile.account);
    formData.append("userId", user.uid);
    formData.append("userEmail", user.email || "");


    try {
      await submitCompletedAssignment(assignment.id, formData, userProfile.account);
      toast({ title: "Success", description: "Assignment submitted successfully." });
      router.push("/assessment-forms"); 
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
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed;
      }
    } catch (e) {
      // If not JSON, fall back to semicolon split
    }
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

                  {question.component === 'checkbox' && !question.options && ( 
                     <Controller
                        name={question.id}
                        control={control}
                        defaultValue={false} // Explicitly set default for single checkbox
                        render={({ field }) => (
                            <div className="flex items-center space-x-2 bg-background p-2 rounded-md">
                                <Checkbox
                                    id={question.id}
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                />
                                <Label htmlFor={question.id} className="font-normal">Confirm</Label>
                            </div>
                        )}
                    />
                  )}
                  
                  {question.component === 'checkbox' && question.options && (
                    <div className="space-y-2 bg-background p-2 rounded-md">
                        {parseOptions(question.options).map(opt => (
                            <Controller
                                key={opt}
                                name={`${question.id}.${opt}`} 
                                control={control}
                                defaultValue={false} // Default for each option in a group
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

                  {question.component === 'range' && (
                    <Controller
                      name={question.id}
                      control={control}
                      rules={{ required: question.required }}
                      render={({ field: { onChange, value } }) => {
                        let min = 0, max = 100, step = 1, currentVal = value;
                        if (typeof question.options === 'string') {
                            question.options.split(';').forEach(optStr => {
                                const [key, valStr] = optStr.split('=');
                                const valNum = parseInt(valStr);
                                if (!isNaN(valNum)) {
                                    if (key === 'min') min = valNum;
                                    else if (key === 'max') max = valNum;
                                    else if (key === 'step') step = valNum;
                                }
                            });
                        }
                        if (typeof currentVal !== 'number' || isNaN(currentVal)) {
                           currentVal = value || min; // Use RHF value if number, else min
                        }
                        currentVal = Math.max(min, Math.min(max, currentVal)); // Ensure within bounds


                        return (
                          <div className="space-y-2 bg-background p-3 rounded-md">
                            <Slider
                              id={question.id}
                              min={min}
                              max={max}
                              step={step}
                              value={[currentVal]} 
                              onValueChange={(vals) => onChange(vals[0])} 
                              className="w-[95%] mx-auto pt-2"
                            />
                            <p className="text-sm text-center text-muted-foreground pt-1">Value: {currentVal}</p>
                          </div>
                        );
                      }}
                    />
                  )}


                  {formErrors[question.id] && <p className="text-sm text-destructive">{formErrors[question.id]?.message as string}</p>}

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

                  {question.photoUpload && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor={`${question.id}_file`} className="text-sm text-muted-foreground flex items-center">
                        <Paperclip className="h-4 w-4 mr-1"/> Upload File (Optional, Max 5MB)
                      </Label>
                      {!uploadedFileDetails[question.id] && !uploadProgress[question.id] && (
                        <Input
                          id={`${question.id}_file`}
                          type="file"
                          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                          className="mt-1 bg-background/80"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(question.id, e.target.files[0]);
                            }
                          }}
                          disabled={!!uploadProgress[question.id] && uploadProgress[question.id] > 0 && uploadProgress[question.id] < 100}
                        />
                      )}
                      {uploadProgress[question.id] > 0 && uploadProgress[question.id] < 100 && (
                        <div className="space-y-1">
                           <Progress value={uploadProgress[question.id]} className="w-full h-2" />
                           <p className="text-xs text-muted-foreground text-center">Uploading: {Math.round(uploadProgress[question.id] || 0)}%</p>
                        </div>
                      )}
                       {imagePreviewUrls[question.id] && !uploadErrors[question.id] && !uploadedFileDetails[question.id] && (
                        <div className="mt-2 border rounded-md p-2 bg-muted/20 w-fit shadow">
                            <Image
                                src={imagePreviewUrls[question.id]!}
                                alt="Upload preview"
                                width={150}
                                height={150}
                                className="object-contain rounded max-h-[150px]"
                                data-ai-hint="upload preview"
                            />
                        </div>
                      )}
                      {uploadErrors[question.id] && (
                        <Alert variant="destructive" className="text-xs p-2">
                           <XCircle className="h-4 w-4" />
                          <AlertDescription>{uploadErrors[question.id]}</AlertDescription>
                           <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs mt-1" 
                                onClick={() => {
                                    const fileInput = document.getElementById(`${question.id}_file`) as HTMLInputElement;
                                    if (fileInput && fileInput.files && fileInput.files[0]) {
                                        handleFileUpload(question.id, fileInput.files[0]);
                                    } else {
                                        toast({variant: "destructive", title:"Retry Failed", description: "No file selected to retry."})
                                    }
                                }}>Retry</Button>
                        </Alert>
                      )}
                      {uploadedFileDetails[question.id] && (
                        <div className="flex items-center justify-between p-2 border rounded-md bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                            <CheckCircle2 className="h-4 w-4"/>
                            {imagePreviewUrls[question.id] ? (
                                <Image
                                    src={uploadedFileDetails[question.id]!.url} 
                                    alt={uploadedFileDetails[question.id]!.name}
                                    width={32}
                                    height={32}
                                    className="object-cover rounded h-8 w-8"
                                    data-ai-hint="file thumbnail"
                                />
                            ): <Paperclip className="h-4 w-4" /> }
                            <a href={uploadedFileDetails[question.id]?.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px] sm:max-w-xs md:max-w-sm">
                              {uploadedFileDetails[question.id]?.name}
                            </a>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeUploadedFile(question.id)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </fieldset>
              </Card>
            ))}

            <div className="flex justify-end pt-6">
              <Button type="submit" size="lg" disabled={isSubmitting || Object.values(uploadProgress).some(p => p > 0 && p < 100)}>
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

