
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import { useAuth } from "@/context/auth-context";
import type { Location } from "@/services/locationService"; 
import { getLocationsForLookup } from "@/services/locationService";
import type { CreateDrillEventPayload } from "@/services/drillTrackingService"; 
import { createDrillEvent } from "@/services/drillTrackingService";
//import { COMMON_DRILL_TYPES, type DrillType } from "@/types/Drill"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, CalendarIcon, AlertTriangle, Building, CheckSquare, Loader2, Info } from "lucide-react";

const requiredDrillSchema = z.object({
  typeId: z.string().min(1, "Drill type is required."),
  quantity: z.number().min(1, "Quantity must be at least 1.").default(1),
});

const newDrillEventSchema = z.object({
  name: z.string().min(3, { message: "Drill name must be at least 3 characters." }),
  description: z.string().optional(),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date({ required_error: "End date is required." }),
  requiredDrills: z.array(requiredDrillSchema).min(1, "At least one required drill must be added."), // Updated to array of requiredDrillSchema
  assignedToSites: z.array(z.string()).min(1, "At least one site must be assigned."), // Added min(1) validation
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

type NewDrillEventFormData = z.infer<typeof newDrillEventSchema>;

const COMMON_DRILL_TYPES = [
  { id: "fire-drill", name: "Fire Drill", description: "Standard fire evacuation procedure." },
  { id: "hurricane", name: "Hurricane", description: "Prepare for extreme weather events." },
  { id: "lockdown", name: "Lockdown", description: "Secure the premises." },
  { id: "shelter-in-place", name: "Shelter in Place", description: "Seek internal shelter." },
  // Add other common drill types here
];


type DrillEventFormData = z.infer<typeof newDrillEventSchema>;

export default function NewDrillEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDrillTypeIdToAdd, setSelectedDrillTypeIdToAdd] = useState<string | null>(null);

  const { control, register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<DrillEventFormData>({
    resolver: zodResolver(newDrillEventSchema),
    defaultValues: {
      description: "",
      startDate: undefined,
      endDate: undefined,
      requiredDrills: [],
      assignedToSites: [],
    },
  });

  const handleAddDrill = () => {
    if (selectedDrillTypeIdToAdd) {
      append({ typeId: selectedDrillTypeIdToAdd, quantity: 1 });
      setSelectedDrillTypeIdToAdd(null); // Reset the select dropdown
    }
  };

  const { fields, append, remove } = useFieldArray({ control, name: "requiredDrills" });

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
          setLocationsError(err.message || "Could not load locations for site assignment.");
          toast({ variant: "destructive", title: "Error Loading Locations", description: err.message });
        })
        .finally(() => setIsLoadingLocations(false));
    } else if (!authLoading && !profileLoading && (!user || !userProfile?.account)) {
      setLocationsError("User or account information not available. Cannot load locations.");
      setIsLoadingLocations(false);
    }
  }, [user, userProfile, authLoading, profileLoading, toast]);

  const onSubmit: SubmitHandler<NewDrillEventFormData> = async (data) => {
    setIsSubmitting(true);
    if (!userProfile?.account) {
      toast({ variant: "destructive", title: "Error", description: "User account not found." });
      setIsSubmitting(false);
      return;
    }

    // Ensure dates are valid before converting to ISO string
    if (!data.startDate || !(data.startDate instanceof Date) || isNaN(data.startDate.getTime())) {
         toast({ variant: "destructive", title: "Validation Error", description: "Invalid start date." });
         setIsSubmitting(false);
         return;
    }
     if (!data.endDate || !(data.endDate instanceof Date) || isNaN(data.endDate.getTime())) {
         toast({ variant: "destructive", title: "Validation Error", description: "Invalid end date." });
         setIsSubmitting(false);
         return;
    }


    const payload: CreateDrillEventPayload = {
      name: data.name,
      description: data.description || "", // Ensure description is a string
      accountId: userProfile.account, // accountId will be set by the service
      startDate: data.startDate.toISOString(), // Convert Date to ISO string
      endDate: data.endDate.toISOString(), // Convert Date to ISO string
      requiredDrills: data.requiredDrills, // Include the array of objects with typeId and quantity
      assignedToSites: data.assignedToSites, // Assuming this is an array of strings
    };

     // Basic validation to ensure requiredDrills and assignedToSites are not empty
     if (!payload.requiredDrills || payload.requiredDrills.length === 0) {
         toast({ variant: "destructive", title: "Validation Error", description: "At least one required drill must be added." });
         setIsSubmitting(false);
         return;
     }
      if (!payload.assignedToSites || payload.assignedToSites.length === 0) {
         toast({ variant: "destructive", title: "Validation Error", description: "At least one site must be assigned." });
         setIsSubmitting(false);
         return;
     }


    try {
      // Pass the payload and accountName to the service function
      await createDrillEvent(payload, userProfile.account);
      toast({
        title: "Success",
        description: `Drill event "${data.name}" created successfully.`
      });
      reset(); // Reset form after successful submission
      router.push("/drill-tracking"); // Navigate back after submission
    } catch (error: any) {
      console.error("Failed to create drill event:", error);
      const errorMessage = error.message || "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Failed to create drill event",
        description: errorMessage
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
        <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!user || !userProfile?.account) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription>
          You must be logged in and have an account associated to create a drill event.
          <Button onClick={() => router.push('/auth')} className="mt-2 ml-auto block">Login</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return(
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Button variant="outline" onClick={() => router.push('/drill-tracking')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Drill Tracking
      </Button>

      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Create New Drill Event Window</CardTitle>
          <CardDescription>Define the parameters for the upcoming drill event.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="name">Event Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g., Q4 Campus Fire Drills" />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" {...register("description")} placeholder="Provide details about this drill event window..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a start date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.startDate && <p className="text-sm text-destructive mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick an end date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.endDate && <p className="text-sm text-destructive mt-1">{errors.endDate.message}</p>}
              </div>
            </div>

            <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2"><CheckSquare className="h-5 w-5 text-primary"/>Required Drills</CardTitle>
                    <CardDescription>Select one or more drills to be completed during this event window and specify the quantity.</CardDescription> {/* Updated description */}
                </CardHeader>
                <CardContent className="space-y-4"> {/* Added space-y for spacing */}
                    {/* Placeholder for rendering added drills */}
                    {fields.length > 0 ? (
                       <div className="space-y-3">
                           {/* TODO: Map over fields and render added drills with quantity input and remove button */}
                           {fields.map((field, index) => {
                            // Find the drill details from COMMON_DRILL_TYPES based on typeId
                            const drillDetails = COMMON_DRILL_TYPES.find(drill => drill.id === field.typeId);
                            return (
                                <div key={field.id} className="flex items-center justify-between p-2 border rounded-md">
                                    <div className="flex items-center gap-2 flex-grow"> {/* Added flex-grow */}
                                        <p className="font-medium">{drillDetails?.name || 'Unknown Drill'}</p> {/* Display drill name */}

                                        {/* Quantity Increment Widget */}
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => {
                                                    // Decrement quantity, ensure it doesn't go below 1
                                                    const currentQuantity = watch(`requiredDrills.${index}.quantity`);
                                                    if (currentQuantity > 1) {
                                                        setValue(`requiredDrills.${index}.quantity`, currentQuantity - 1);
                                                    }
                                                }}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            {/* Use Controller for the quantity input */}
                                            <Controller
                                                name={`requiredDrills.${index}.quantity`}
                                                control={control}
                                                render={({ field: quantityField }) => (
                                                    <Input
                                                        {...quantityField}
                                                        type="number"
                                                        min={1}
                                                        className="w-14 text-center"
                                                        onChange={(e) => {
                                                            const value = parseInt(e.target.value, 10);
                                                            if (!isNaN(value) && value >= 1) {
                                                                quantityField.onChange(value);
                                                            } else if (e.target.value === '') {
                                                                quantityField.onChange(''); // Allow empty input temporarily
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            // On blur, if empty or invalid, set to 1
                                                            const value = parseInt(e.target.value, 10);
                                                            if (isNaN(value) || value < 1) {
                                                                setValue(`requiredDrills.${index}.quantity`, 1);
                                                            } else {
                                                                quantityField.onChange(value); // Ensure number type on blur
                                                            }
                                                        }}
                                                    />
                                                )}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => {
                                                    // Increment quantity
                                                    const currentQuantity = watch(`requiredDrills.${index}.quantity`);
                                                    setValue(`requiredDrills.${index}.quantity`, (currentQuantity || 0) + 1);
                                                }}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>Remove</Button>
                                </div>
                            );
                        })}

                       </div>
                    ) : (
                        <div className="text-center text-muted-foreground">
                           <p>No required drills added yet.</p>
                        </div>
                    )}

                    {/* Add Drill Section with Select */}
                    <div className="flex items-center gap-2"> {/* Flex container for select and button */}
                        <Label htmlFor="select-drill-type" className="sr-only">Select Drill Type</Label> {/*sr-only to hide label visually */}
                        <Select onValueChange={(value) => setSelectedDrillTypeIdToAdd(value)} value={selectedDrillTypeIdToAdd}>
                           <SelectTrigger id="select-drill-type" className="w-[200px]"> {/* Adjust width as needed */}
                               <SelectValue placeholder="Select drill to add..." />
                           </SelectTrigger>
                           <SelectContent>
                               {COMMON_DRILL_TYPES.map((drill) => (
                                   <SelectItem key={drill.id} value={drill.id}>
                                       {drill.name}
                                   </SelectItem>
                               ))}
                           </SelectContent>
                       </Select>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddDrill} // Call a new handler function
                            disabled={!selectedDrillTypeIdToAdd} // Disable if no drill type is selected
                        >
                            <PlusCircle className="mr-1 h-4 w-4" /> Add Drill
                        </Button>
                    </div>

                </CardContent>
            </Card>

            <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2"><Building className="h-5 w-5 text-primary"/>Assign to Sites/Locations</CardTitle>
                    <CardDescription>Select the sites/locations where these drills must be performed.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingLocations ? (
                        <Skeleton className="h-24 w-full" />
                    ) : locationsError ? (
                         <Alert variant="destructive" className="text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{locationsError}</AlertDescription>
                        </Alert>
                    ) : (
                        <Controller
                            name="assignedToSites"
                            control={control}
                            render={({ field }) => (
                                <ScrollArea className="h-40 border rounded-md p-2">
                                <div className="space-y-2">
                                    {locations.length > 0 ? locations.map((loc) => (
                                    <div key={loc.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-background/50">
                                        <Checkbox
                                            id={`site-${loc.id}`}
                                            checked={field.value?.includes(loc.id)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...(field.value || []), loc.id])
                                                : field.onChange(field.value?.filter((value) => value !== loc.id));
                                            }}
                                        />
                                        <Label htmlFor={`site-${loc.id}`} className="font-normal cursor-pointer">{loc.locationName}</Label>
                                    </div>
                                    )) : (
                                        <p className="text-xs text-muted-foreground text-center p-4">No locations found for this account.</p>
                                    )}
                                </div>
                                </ScrollArea>
                            )}
                        />
                    )}
                    {errors.assignedToSites && <p className="text-sm text-destructive mt-2">{errors.assignedToSites.message}</p>}
                  <CardFooter>
                    <Button type="submit" className="ml-auto" disabled={isSubmitting} size="lg">
                      <Save className="mr-2 h-5 w-5" />
                      {isSubmitting ? "Saving Event..." : "Create Drill Event"}
                    </Button>
                  </CardFooter>
                </CardContent>
            </Card>
            
            <Alert variant="default" className="bg-sky-50 border-sky-200 dark:bg-sky-900/30 dark:border-sky-700">
                <Info className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                <AlertTitle className="text-sky-700 dark:text-sky-300">Coming Soon</AlertTitle>
                <AlertDescription className="text-sky-600 dark:text-sky-400">
                    Features like recurrence rules, calendar integration, user-specific assignments, and detailed checklists will be added in future updates.
                </AlertDescription>
            </Alert> 
          </CardContent>         
        </form>
      </Card>
    </div>
  );
}
