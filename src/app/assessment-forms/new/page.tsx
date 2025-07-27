
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { getLocationsForLookup, type Location } from "@/services/locationService";
import { createAssignment } from "@/services/assignmentFunctionsService";
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
import { ArrowLeft, Building, Save, AlertTriangle, PlusCircle, Trash2, Settings2, Users, Globe, Briefcase } from "lucide-react";
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
  assignedTo: z.object({
    users: z.array(z.string()).optional(),
    sites: z.array(z.string()).optional(),
    jobTitles: z.array(z.string()).optional(),
  }).optional(),
});


const newAssignmentSchema = z.object({
  assessmentName: z.string().min(3, { message: "Assessment name must be at least 3 characters." }),
  description: z.string().optional(),
  locationId: z.string().min(1, { message: "Please select a location." }),
  assignmentType: z.enum(["comprehensiveAssessment", "siteAssessment", "safetyPlan"], {
    errorMap: () => ({ message: "Please select a valid assignment type." }),
  }),
  questions: z.array(questionSchema).min(0, "At least one question is recommended."),
});

type NewAssignmentFormData = z.infer<typeof newAssignmentSchema>;

const assignmentTypes = [
  { value: "comprehensiveAssessment", label: "Comprehensive Assessment" },
  { value: "siteAssessment", label: "Site Assessment" },
  { value: "safetyPlan", label: "Safety Plan" },
];

const componentTypes = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Text Area" },
  { value: "number", label: "Number Input" },
  { value: "email", label: "Email Input" },
  { value: "url", label: "URL Input" },
  { value: "telephone", label: "Phone Input" },
  { value: "date", label: "Date Picker" },
  { value: "time", label: "Time Picker" },
  { value: "datetime", label: "Date & Time Picker" },
  { value: "select", label: "Dropdown Select" },
  { value: "options", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkbox (Options)" }, // For multiple choice from a list
  { value: "singleCheckbox", label: "Checkbox (Single Toggle)"}, // For a single true/false checkbox
  { value: "buttonSelect", label: "Button Select (Single Choice)"},
  { value: "multiButtonSelect", label: "Button Select (Multiple Choice)"},
  { value: "range", label: "Range Slider" },
  { value: "staticContent", label: "Text (Static Content)" },
  { value: "staticImage", label: "Image (Static Content)" },
  { value: "photoUpload", label: "Photo Upload" },
  { value: "schoolSelector", label: "School/Site Selector" },
];

const parseOptionsString = (optionsStr: string | undefined): string[] => {
  if (!optionsStr) return [];
  return optionsStr.split(';').map(opt => opt.trim()).filter(opt => opt);
};

export default function NewAssignmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, register, handleSubmit, formState: { errors }, reset, watch } = useForm<NewAssignmentFormData>({
    resolver: zodResolver(newAssignmentSchema),
    defaultValues: {
      assessmentName: "",
      description: "",
      locationId: "",
      assignmentType: undefined,
      questions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "questions",
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
          setLocationsError((err as Error).message || "Could not load locations.");
          toast({ variant: "destructive", title: "Error Loading Locations", description: (err as Error).message });
        })
        .finally(() => setIsLoadingLocations(false));
    } else if (!authLoading && !profileLoading && (!user || !userProfile?.account)) {
      setLocationsError("User or account information not available. Cannot load locations.");
      setIsLoadingLocations(false);
    }
  }, [user, userProfile, authLoading, profileLoading, toast]);

  const addNewQuestion = () => {
    // Get the current number of questions to determine the next page number
    const nextPageIndex = fields.length;
    // Page numbers are typically 1-based, so we add 1
    const nextPageNumber = nextPageIndex + 1;

    append({
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: "",
      component: "text",
      section: "", // Default empty section
      subSection: "", // Default empty sub-section
      pageNumber: nextPageNumber, // Automatically set the page number
      order: 1, // Default order to 1, as it's the only question on the new page
      options: "",
      required: false,
      comment: false,
      photoUpload: false,
      deficiencyLabel: "",
      deficiencyValues: [],
      aiDeficiencyCheck: false,
      assignedTo: {},
    });
  };

  const onSubmit: SubmitHandler<NewAssignmentFormData> = async (data) => {
    setIsSubmitting(true);
    if (!userProfile?.account) {
      toast({ variant: "destructive", title: "Error", description: "User account not found." });
      setIsSubmitting(false);
      return;
    }

    const payload = {
      assessmentName: data.assessmentName,
      description: data.description || "",
      accountSubmittedFor: userProfile.account,
      schoolSelectorId: data.locationId, // Assuming locationId corresponds to schoolSelectorId
      assignmentType: data.assignmentType,
      questions: data.questions.map(q => ({ // Use 'questions' key as per backend
        id: q.id, // Ensure an ID is present
        label: q.label,
        component: q.component,
        options: (q.component === 'select' || q.component === 'options' || q.component === 'checkbox' || q.component === 'buttonSelect' || q.component === 'multiButtonSelect')
                   ? parseOptionsString(q.options) // Backend might expect array for these types
                   : q.options,
        required: q.required,
        comment: q.comment,
        photoUpload: q.photoUpload,
        deficiencyLabel: q.deficiencyLabel,
        deficiencyValues: q.deficiencyValues,
        aiDeficiencyCheck: q.aiDeficiencyCheck,
        // assignedTo is not explicitly mapped to backend's top-level shareWith, handle separately if needed
      })),
    };

    try {
      // The createAssignment function in services might need adjustment if it expects a different payload key (e.g., 'content' vs 'questions')
      // For now, assuming the backend expects 'questions' based on common patterns.
      await createAssignment(payload, userProfile.account);
      toast({
        title: "Success",
        description: `Assignment "${data.assessmentName}" created successfully.`
      });
      reset();
      router.push("/assessment-forms");
   } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Failed to create assignment",
       description: error instanceof Error ? error.message : "An unknown error occurred."
      });
    } finally {
      setIsSubmitting(false);
    }
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
                       {assignmentTypes.map(type => (
                         <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assignmentType && <p className="text-sm text-destructive mt-1">{errors.assignmentType.message}</p>}
            </div>
            <div>
              <Label htmlFor="assessmentName">Assessment Name</Label>
              <Input id="assessmentName" {...register("assessmentName")} placeholder="e.g., Monthly Safety Walkthrough" />
              {errors.assessmentName && <p className="text-sm text-destructive mt-1">{errors.assessmentName.message}</p>}
            </div>

            <div>
              <Label htmlFor="locationId" className="flex items-center gap-1">
                <Building className="h-4 w-4 text-muted-foreground" /> Site / Location (Primary)
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
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger id="locationId">
                        <SelectValue placeholder="Select a location..." />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.length > 0 ? (
                          locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.locationName}
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

            <Card className="mt-6 shadow-inner border">
              <CardHeader>
                <CardTitle>Questions ({fields.length})</CardTitle>
                <CardDescription>Manage the questions for this assignment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {fields.map((item, index) => {
                  const questionType = watch(`questions.${index}.component`);
                  const questionOptionsString = watch(`questions.${index}.options`);
                  const currentQuestionOptions = parseOptionsString(questionOptionsString);

                  return (
                    <Card key={item.id} className="p-4 bg-muted/30 border relative">
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
                          <Input id={`questions.${index}.label`} {...register(`questions.${index}.label` as const)} placeholder="e.g., Is the fire exit clear?"/>
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

                        
                        <Separator />
                        <Label className="font-medium">Question Type</Label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`questions.${index}.component`}>Question Type</Label>
                            <Controller
                              name={`questions.${index}.component` as const}
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

                          {(questionType === 'select' || questionType === 'options' || questionType === 'checkbox' || questionType === 'buttonSelect' || questionType === 'multiButtonSelect' || questionType === 'staticContent') && (
                            <div>
                              <Label htmlFor={`questions.${index}.options`}>
                                {questionType === 'staticContent' ? "Static Text Content" : "Options (semicolon-separated)"}
                              </Label>
                              <Textarea id={`questions.${index}.options`} {...register(`questions.${index}.options` as const)} placeholder={questionType === 'staticContent' ? 'Enter static text' : 'Option A; Option B; Option C'}/>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                            <div className="flex items-center space-x-2">
                                <Controller name={`questions.${index}.required` as const} control={control} render={({ field: controllerField }) => (
                                    <Checkbox id={`questions.${index}.required`} checked={controllerField.value} onCheckedChange={controllerField.onChange} />
                                )} />
                                <Label htmlFor={`questions.${index}.required`} className="font-normal">Required</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Controller name={`questions.${index}.comment` as const} control={control} render={({ field: controllerField }) => (
                                    <Checkbox id={`questions.${index}.comment`} checked={controllerField.value} onCheckedChange={controllerField.onChange} />
                                )} />
                                <Label htmlFor={`questions.${index}.comment`} className="font-normal">Enable Comments</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Controller name={`questions.${index}.photoUpload` as const} control={control} render={({ field: controllerField }) => (
                                    <Checkbox id={`questions.${index}.photoUpload`} checked={controllerField.value} onCheckedChange={controllerField.onChange} />
                                )} />
                                <Label htmlFor={`questions.${index}.photoUpload`} className="font-normal">Enable Photo Upload</Label>
                            </div>
                        </div>

                        <Separator />
                        <Label className="font-medium">Deficiency Settings (Optional)</Label>
                        <div>
                            <Label htmlFor={`questions.${index}.deficiencyLabel`}>Deficiency Description/Label</Label>
                            <Input id={`questions.${index}.deficiencyLabel`} {...register(`questions.${index}.deficiencyLabel` as const)} placeholder="e.g., 'Blocked exit' or 'Not clean'"/>
                        </div>

                        {(questionType === 'select' || questionType === 'options' || questionType === 'checkbox') && currentQuestionOptions.length > 0 && (
                          <div>
                            <Label>Mark options as deficient:</Label>
                            <div className="space-y-2 mt-1 p-2 border rounded-md max-h-40 overflow-y-auto">
                              {currentQuestionOptions.map(opt => (
                                <div key={opt} className="flex items-center space-x-2">
                                  <Controller
                                    name={`questions.${index}.deficiencyValues` as const}
                                    control={control}
                                    render={({ field: controllerField }) => (
                                      <Checkbox
                                        id={`questions.${index}.deficiencyValues.${opt}`}
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
                                  <Label htmlFor={`questions.${index}.deficiencyValues.${opt}`} className="font-normal">{opt}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(questionType === 'text' || questionType === 'textarea') && (
                           <div className="flex items-center space-x-2">
                                <Controller name={`questions.${index}.aiDeficiencyCheck` as const} control={control} render={({ field: controllerField }) => (
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
