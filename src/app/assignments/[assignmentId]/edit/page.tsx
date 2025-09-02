
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { getAssignmentById, updateAssignment, type AssignmentWithPermissions, type UpdateAssignmentPayload } from "@/services/assignmentFunctionsService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, PlusCircle, Trash2, Settings2, FileText, Users, Globe, Briefcase } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Schema for a single question
const questionSchema = z.object({
  id: z.string().min(1, "Question ID is required."),
  label: z.string().min(1, "Question label is required."),
  component: z.string().min(1, "Component type is required."),
  section: z.string().optional(),
  subSection: z.string().optional(),
  pageNumber: z.number().optional(), // <-- ADDED
  order: z.number().optional(),      // <-- ADDED
  options: z.string().optional(),
  required: z.boolean().optional(),
  comment: z.boolean().optional(),
  photoUpload: z.boolean().optional(),
  deficiencyLabel: z.string().optional(),
  deficiencyValues: z.array(z.string()).optional(),
  aiDeficiencyCheck: z.boolean().optional(),
  dynamic: z.boolean().optional(),
  conditional: z.object({
    field: z.string(),
    value: z.string(),
  }).optional(),
  assignedTo: z.object({
    users: z.array(z.string()).optional(),
    sites: z.array(z.string()).optional(),
    jobTitles: z.array(z.string()).optional(),
  }).optional(),
});

// Schema for the entire assignment form
const assignmentFormSchema = z.object({
  assessmentName: z.string().min(3, "Assignment name must be at least 3 characters."),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(0, "At least one question is recommended."),
  assignmentType: z.enum(["comprehensiveAssessment", "siteAssessment", "safetyPlan"]).optional(),
});

type AssignmentFormData = z.infer<typeof assignmentFormSchema>;

const componentTypes = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Long Text (Textarea)" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "telephone", label: "Telephone" },
  { value: "url", label: "URL" },
  { value: "radio", label: "Radio (Single Choice)" },
  { value: "select", label: "Select Dropdown" },
  { value: "checkbox", label: "Checkbox (Multiple Choice)" },
  { value: "buttonSelect", label: "Button Select (Single)" },
  { value: "multiSelect", label: "Button Select (Multiple)" },
  { value: "schoolSelector", label: "School Select Dropdown" },
  { value: "range", label: "Range" },
  { value: "date", label: "Date" },
  { value: "completionDate", label: "Date of Completion" },
  { value: "time", label: "Time" },
  { value: "completionTime", label: "Time of Completion" },
  { value: "datetime", label: "Datetime" },
  { value: "photoUpload", label: "Photo Upload" },
];

const assignmentTypes = [
  { value: "comprehensiveAssessment", label: "Comprehensive Assessment" },
  { value: "siteAssessment", label: "Site Assessment" },
  { value: "safetyPlan", label: "Safety Plan" },
];

const parseOptionsString = (optionsStr: string | undefined): string[] => {
  if (!optionsStr) return [];
  return optionsStr.split(';').map(opt => opt.trim()).filter(opt => opt);
};

export default function EditAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();

  const assignmentId = typeof params.assignmentId === 'string' ? params.assignmentId : '';

  const [assignment, setAssignment] = useState<AssignmentWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { control, register, handleSubmit, formState: { errors }, reset, watch } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      assessmentName: "",
      assignmentType: undefined,
      description: "",
      questions: [],
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fields, append, remove } = useFieldArray({
    control,
    name: "questions",
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!assignmentId) {
      setError("Assignment ID is missing.");
      setIsLoading(false);
      return;
    }
    if (authLoading || profileLoading || !userProfile?.account) {
      setIsLoading(true);
      return;
    }

    async function fetchAssignment() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedAssignment = await getAssignmentById(assignmentId, userProfile!.account);
        if (fetchedAssignment) {
          setAssignment(fetchedAssignment);
          
          // CORRECTED: Transform the data before populating the form
          reset({
            assessmentName: fetchedAssignment.assessmentName || "",
            description: fetchedAssignment.description || "",
            assignmentType: fetchedAssignment.assignmentType,
            questions: fetchedAssignment.questions.map(q => ({
              ...q,
              // Convert the array of option objects back to a semicolon-separated string
              options: Array.isArray(q.options) 
                ? q.options.map(opt => typeof opt === 'object' ? opt.label : opt).join(';') 
                : "",
              // Ensure dynamic and conditional fields are properly set
              dynamic: q.dynamic || false,
              conditional: q.conditional || undefined,
              // Ensure deficiencyValues is an array of strings
              deficiencyValues: q.deficiencyValues || [], 
            })) || [],
          });

        } else {
          setError("Assignment not found or you do not have permission to access it.");
          toast({ variant: "destructive", title: "Error", description: "Assignment not found." });
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Failed to load assignment: ${errorMessage}`);
        toast({ variant: "destructive", title: "Loading Failed", description: errorMessage });
      } finally {
        setIsLoading(false);
      }
    }
    fetchAssignment();
  }, [assignmentId, userProfile?.account, authLoading, profileLoading, reset, toast, userProfile]);
  
  const onSubmit: SubmitHandler<AssignmentFormData> = async (data) => {
    if (!assignment || !userProfile?.account) {
      toast({ variant: "destructive", title: "Error", description: "Cannot save, critical data missing." });
      return;
    }
    setIsSubmitting(true);

    const payload: UpdateAssignmentPayload = {
      id: assignment.id, // ensure ID is part of the payload if needed by backend for specific doc update
      assessmentName: data.assessmentName,
      description: data.description,
      questions: data.questions.map(q => ({
        ...q,
        // Convert options string back to array if your backend expects/stores it that way for certain types
        // This might need more sophisticated logic based on question.component type
        options: (q.component === 'select' || q.component === 'options' || q.component === 'checkbox') ? parseOptionsString(q.options) : q.options,
      })),
      accountSubmittedFor: userProfile.account, // Include account for context/auth on backend
      assignmentType: data.assignmentType, // Include assignmentType in payload
    };

    try {
      await updateAssignment(assignment.id, payload, userProfile.account);
      toast({ title: "Success", description: "Assignment updated successfully." });
      router.push(`/assignments/${assignment.id}/details`);
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Update Failed", description: err instanceof Error ? err.message : "An unknown error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addNewQuestion = () => {
    append({
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary unique ID for new questions
      label: "",
      component: "text",
      options: "",
      required: false,
      comment: false,
      photoUpload: false,
      deficiencyLabel: "",
      deficiencyValues: [],
      aiDeficiencyCheck: false,
      dynamic: false,
      conditional: undefined,
      assignedTo: {},
    });
  };

  if (isLoading || authLoading || profileLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-10 w-1/2 mb-6" />
        <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-10 w-1/4" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <FileText className="h-4 w-4" />
        <AlertTitle>Error Loading Assignment</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!assignment) {
    return <p className="p-4 text-center">Assignment data is not available.</p>;
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Button variant="outline" onClick={() => router.push(`/assignments/${assignmentId}/details`)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Details
      </Button>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Edit Assignment: {assignment.assessmentName}</CardTitle>
            <CardDescription>Modify the assignment details and questions below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="assignmentType">Assignment Type</Label>
              <Controller
                name="assignmentType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="assignmentType">
                      <SelectValue placeholder="Select assignment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignmentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assignmentType && <p className="text-sm text-destructive mt-1">{errors.assignmentType.message}</p>}
            </div>
            <div>
              <Label htmlFor="assessmentName">Assignment Name</Label>
              <Input id="assessmentName" {...register("assessmentName")} />
              {errors.assessmentName && <p className="text-sm text-destructive mt-1">{errors.assessmentName.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" {...register("description")} />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle>Questions ({fields.length})</CardTitle>
            <CardDescription>Manage the questions for this assignment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => {
              const questionType = watch(`questions.${index}.component`);
              const questionOptionsString = watch(`questions.${index}.options`);
              const currentQuestionOptions = parseOptionsString(questionOptionsString);
              const questionIndex = index; // Create a stable reference for the question index

              return (
                <Card key={field.id} className="p-4 bg-muted/30 border relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                    onClick={() => remove(index)}
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="space-y-4">
                    <h4 className="font-medium text-lg">Question {index + 1}</h4>
                    <div>
                      <Label htmlFor={`questions.${index}.label`}>Question Label</Label>
                      <Input id={`questions.${index}.label`} {...register(`questions.${index}.label`)} placeholder="e.g., Is the fire exit clear?"/>
                      {errors.questions?.[index]?.label && <p className="text-sm text-destructive mt-1">{errors.questions[index]?.label?.message}</p>}
                    </div>
                    
                    {/* Add Section and Sub-Section Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`questions.${index}.section`}>Section</Label>
                        <Input 
                          id={`questions.${index}.section`} 
                          {...register(`questions.${index}.section`)} 
                          placeholder="e.g., Building Exterior"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`questions.${index}.subSection`}>Sub-Section (Optional)</Label>
                        <Input 
                          id={`questions.${index}.subSection`} 
                          {...register(`questions.${index}.subSection`)} 
                          placeholder="e.g., Main Entrance"
                        />
                      </div>
                    </div>

                    {/* Page Number and Order Inputs - CORRECTED VERSION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`questions.${index}.pageNumber`}>Page Number</Label>
                        <Controller
                          name={`questions.${index}.pageNumber`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              id={`questions.${index}.pageNumber`}
                              type="number"
                              placeholder="e.g., 1"
                              {...field}
                              // This onChange ensures we pass a number or undefined to the form state
                              onChange={event => field.onChange(event.target.value === '' ? undefined : Number(event.target.value))}
                              value={field.value ?? ''} // Handles undefined values gracefully
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`questions.${index}.order`}>Question Order</Label>
                        <Controller
                          name={`questions.${index}.order`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              id={`questions.${index}.order`}
                              type="number"
                              placeholder="Order on page, e.g., 1"
                              {...field}
                              onChange={event => field.onChange(event.target.value === '' ? undefined : Number(event.target.value))}
                              value={field.value ?? ''}
                            />
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`questions.${index}.component`}>Question Type</Label>
                        <Controller
                          name={`questions.${index}.component`}
                          control={control}
                          render={({ field: controllerField }) => (
                            <Select onValueChange={controllerField.onChange} value={controllerField.value}>
                              <SelectTrigger id={`questions.${index}.component`}><SelectValue placeholder="Select type..." /></SelectTrigger>
                              <SelectContent>
                                {componentTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.questions?.[index]?.component && <p className="text-sm text-destructive mt-1">{errors.questions[index]?.component?.message}</p>}
                      </div>

                      {(questionType === 'select' || questionType === 'options' || questionType === 'checkbox' || questionType === 'radio' || questionType === 'buttonSelect' || questionType === 'multiButtonSelect' || questionType === 'multiSelect') && (
                        <div>
                          <Label htmlFor={`questions.${index}.options`}>Options (semicolon-separated)</Label>
                          <Textarea id={`questions.${index}.options`} {...register(`questions.${index}.options`)} placeholder="Option A; Option B; Option C"/>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="flex items-center space-x-2">
                            <Controller name={`questions.${index}.required`} control={control} render={({ field: controllerField }) => (
                                <Checkbox id={`questions.${index}.required`} checked={controllerField.value} onCheckedChange={controllerField.onChange} />
                            )} />
                            <Label htmlFor={`questions.${index}.required`} className="font-normal">Required</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Controller name={`questions.${index}.comment`} control={control} render={({ field: controllerField }) => (
                                <Checkbox id={`questions.${index}.comment`} checked={controllerField.value} onCheckedChange={controllerField.onChange} />
                            )} />
                            <Label htmlFor={`questions.${index}.comment`} className="font-normal">Enable Comments</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Controller name={`questions.${index}.photoUpload`} control={control} render={({ field: controllerField }) => (
                                <Checkbox id={`questions.${index}.photoUpload`} checked={controllerField.value} onCheckedChange={controllerField.onChange} />
                            )} />
                            <Label htmlFor={`questions.${index}.photoUpload`} className="font-normal">Enable Photo Upload</Label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 pt-2 border-t border-border">
                        <div className="flex items-center space-x-2">
                            <Controller name={`questions.${index}.conditional`} control={control} render={({ field: controllerField }) => (
                                <Checkbox 
                                  id={`questions.${index}.conditional`} 
                                  checked={!!controllerField.value} 
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      controllerField.onChange({ field: '', value: '' });
                                    } else {
                                      controllerField.onChange(undefined);
                                    }
                                  }} 
                                />
                            )} />
                            <Label htmlFor={`questions.${index}.conditional`} className="font-medium text-blue-700">Question Appears Conditionally</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Controller name={`questions.${index}.dynamic`} control={control} render={({ field: controllerField }) => (
                                <Checkbox id={`questions.${index}.dynamic`} checked={!!controllerField.value} onCheckedChange={controllerField.onChange} />
                            )} />
                            <Label htmlFor={`questions.${index}.dynamic`} className="font-medium text-green-700">🔄 Dynamic Mode (Allow Multiple Instances)</Label>
                        </div>
                      </div>
                    </div>

                    {/* Conditional Question Settings */}
                    {watch(`questions.${index}.conditional`) && (
                      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                        <h4 className="font-medium text-blue-900">Conditional Question Settings</h4>
                        
                        <div className="space-y-2">
                          <Label>Select the question that triggers this conditional item</Label>
                          <Controller
                            name={`questions.${index}.conditional.field`}
                            control={control}
                            render={({ field: controllerField }) => (
                              <Select onValueChange={controllerField.onChange} value={controllerField.value || ''}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select parent question..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {fields.slice(0, index).filter(q => 
                                    q.label && (q.component === 'radio' || q.component === 'select' || q.component === 'checkbox') && q.options
                                  ).map((parentQ, idx) => (
                                    <SelectItem key={parentQ.id} value={parentQ.id}>
                                      {idx + 1}) {parentQ.label || 'Untitled Question'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {fields.slice(0, index).filter(q => 
                            q.label && (q.component === 'radio' || q.component === 'select' || q.component === 'checkbox') && q.options
                          ).length === 0 && (
                            <p className="text-sm text-amber-600">
                              No questions with options available. Add radio, select, or checkbox questions above this one.
                            </p>
                          )}
                        </div>

                        {watch(`questions.${index}.conditional.field`) && (
                          <div className="space-y-2">
                            <Label>Select the answer that triggers this conditional item</Label>
                            <Controller
                              name={`questions.${index}.conditional.value`}
                              control={control}
                              render={({ field: controllerField }) => {
                                const parentQuestionId = watch(`questions.${index}.conditional.field`);
                                const parentQuestion = fields.find(q => q.id === parentQuestionId);
                                const parentOptions = parentQuestion?.options ? 
                                  (typeof parentQuestion.options === 'string' ? 
                                    parentQuestion.options.split(';').map(opt => opt.trim()).filter(opt => opt) : 
                                    parentQuestion.options) : [];
                                
                                return (
                                  <Select onValueChange={controllerField.onChange} value={controllerField.value || ''}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select trigger value..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {parentOptions.map((option, optIdx) => (
                                        <SelectItem key={optIdx} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                );
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <Separator />
                    <Label className="font-medium">Deficiency Settings</Label>
                    <div>
                        <Label htmlFor={`questions.${index}.deficiencyLabel`}>Deficiency Description/Label</Label>
                        <Input id={`questions.${index}.deficiencyLabel`} {...register(`questions.${index}.deficiencyLabel`)} placeholder="e.g., 'Blocked exit' or 'Not clean'"/>
                    </div>

                    {(questionType === 'select' || questionType === 'options' || questionType === 'checkbox') && currentQuestionOptions.length > 0 && (
                      <div>
                        <Label>Mark options as deficient:</Label>
                        <div className="space-y-2 mt-1 p-2 border rounded-md max-h-40 overflow-y-auto">
                       {currentQuestionOptions.map((opt) => (
                          // CORRECTED: Use the option string and its index for a unique key
                         <div key={`${opt}-${questionIndex}`} className="flex items-center space-x-2">
                            <Controller
                              name={`questions.${questionIndex}.deficiencyValues`}
                              control={control}
                              render={({ field: controllerField }) => (
                                <Checkbox
                                  id={`questions.${questionIndex}.deficiencyValues.${opt}`}
                                  checked={controllerField.value?.includes(opt)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = controllerField.value || [];
                                    if (checked) {
                                      controllerField.onChange([...currentValues, opt]);
                                    } else {
                                      controllerField.onChange(currentValues.filter(val => val !== opt));
                                    }
                                  }}
                                />
                              )}
                            />
                            <Label htmlFor={`questions.${questionIndex}.deficiencyValues.${opt}`} className="font-normal">{opt}</Label>
                          </div>
                        ))}
                        </div>
                      </div>
                    )}

                    {(questionType === 'text' || questionType === 'textarea') && (
                       <div className="flex items-center space-x-2">
                            <Controller name={`questions.${index}.aiDeficiencyCheck`} control={control} render={({ field: controllerField }) => (
                                <Checkbox id={`questions.${index}.aiDeficiencyCheck`} checked={controllerField.value} onCheckedChange={controllerField.onChange} />
                            )} />
                            <Label htmlFor={`questions.${index}.aiDeficiencyCheck`} className="font-normal">Use AI to detect deficiency in open-ended response</Label>
                        </div>
                    )}
                    <Separator />
                    <Card className="bg-card/50">
                        <CardHeader className="p-3">
                            <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4 text-muted-foreground"/>Advanced Assignment (Coming Soon)</CardTitle>
                            <CardDescription className="text-xs">Assign this question to specific users, sites, or roles.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 text-sm text-muted-foreground space-y-2">
                            <div className="flex items-center gap-1"><Users className="h-4 w-4"/><span>Assign to specific users...</span></div>
                            <div className="flex items-center gap-1"><Globe className="h-4 w-4"/><span>Assign to specific sites...</span></div>
                            <div className="flex items-center gap-1"><Briefcase className="h-4 w-4"/><span>Assign to specific job titles...</span></div>
                        </CardContent>
                    </Card>
                  </div>
                </Card>
              );
            })}
            <Button type="button" variant="outline" onClick={addNewQuestion} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Question
            </Button>
          </CardContent>
        </Card>

        <CardFooter className="mt-6 justify-end">
          <Button type="submit" disabled={isSubmitting} size="lg">
            <Save className="mr-2 h-5 w-5" />
            {isSubmitting ? "Saving..." : "Update Assignment"}
          </Button>
        </CardFooter>
      </form>
    </div>
  );
}

