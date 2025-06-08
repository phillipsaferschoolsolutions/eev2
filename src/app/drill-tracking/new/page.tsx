
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import { useAuth } from "@/context/auth-context";
import type { Location } from "@/services/locationService"; 
import { getLocationsForLookup } from "@/services/locationService";
import type { CreateDrillEventPayload } from "@/services/drillTrackingService"; 
import { createDrillEvent } from "@/services/drillTrackingService";
import { COMMON_DRILL_TYPES, type DrillType } from "@/types/Drill"; 

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

const drillEventSchema = z.object({
  name: z.string().min(3, { message: "Event name must be at least 3 characters." }),
  description: z.string().optional(),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date({ required_error: "End date is required." }),
  requiredDrills: z.array(z.string()).min(1, { message: "Select at least one drill type." }),
  assignedToSites: z.array(z.string()).min(1, { message: "Select at least one site." }),
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

type DrillEventFormData = z.infer<typeof drillEventSchema>;

export default function NewDrillEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, register, handleSubmit, formState: { errors }, reset, watch } = useForm<DrillEventFormData>({
    resolver: zodResolver(drillEventSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: undefined,
      endDate: undefined,
      requiredDrills: [],
      assignedToSites: [],
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
          setLocationsError(err.message || "Could not load locations for site assignment.");
          toast({ variant: "destructive", title: "Error Loading Locations", description: err.message });
        })
        .finally(() => setIsLoadingLocations(false));
    } else if (!authLoading && !profileLoading && (!user || !userProfile?.account)) {
      setLocationsError("User or account information not available. Cannot load locations.");
      setIsLoadingLocations(false);
    }
  }, [user, userProfile, authLoading, profileLoading, toast]);

  const onSubmit: SubmitHandler<DrillEventFormData> = async (data) => {
    setIsSubmitting(true);
    if (!userProfile?.account) {
      toast({ variant: "destructive", title: "Error", description: "User account not found." });
      setIsSubmitting(false);
      return;
    }

    const selectedDrillDetails = COMMON_DRILL_TYPES
        .filter(drill => data.requiredDrills.includes(drill.id))
        .map(drill => ({ typeId: drill.id, typeName: drill.name, instructions: drill.description }));

    const payload: CreateDrillEventPayload = {
      name: data.name,
      description: data.description || "",
      accountId: userProfile.account,
      startDate: format(data.startDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"), // ISO string
      endDate: format(data.endDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),     // ISO string
      requiredDrills: selectedDrillDetails,
      assignedToSites: data.assignedToSites,
    };

    try {
      await createDrillEvent(payload, userProfile.account);
      toast({
        title: "Success",
        description: `Drill Event "${data.name}" created successfully.`
      });
      reset();
      router.push("/drill-tracking");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create drill event",
        description: error.message || "An unknown error occurred."
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

  return (
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
                    <CardDescription>Select one or more drills to be completed during this event window.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Controller
                        name="requiredDrills"
                        control={control}
                        render={({ field }) => (
                            <div className="space-y-2">
                                {COMMON_DRILL_TYPES.map((drill) => (
                                    <div key={drill.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-background/50">
                                        <Checkbox
                                            id={`drill-${drill.id}`}
                                            checked={field.value?.includes(drill.id)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...(field.value || []), drill.id])
                                                : field.onChange(field.value?.filter((value) => value !== drill.id));
                                            }}
                                        />
                                        <Label htmlFor={`drill-${drill.id}`} className="font-normal flex-grow cursor-pointer">
                                            {drill.name}
                                            <p className="text-xs text-muted-foreground">{drill.description}</p>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        )}
                    />
                    {errors.requiredDrills && <p className="text-sm text-destructive mt-2">{errors.requiredDrills.message}</p>}
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
          <CardFooter>
            <Button type="submit" className="ml-auto" disabled={isSubmitting} size="lg">
              <Save className="mr-2 h-5 w-5" />
              {isSubmitting ? "Saving Event..." : "Create Drill Event"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
