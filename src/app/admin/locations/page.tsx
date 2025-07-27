"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Building, MapPin, Plus, Edit, Trash2, 
  Search, ChevronLeft, ChevronRight, AlertTriangle, Loader2, Shield 
} from "lucide-react";
import { getLocationsForLookup, createLocation, updateLocation, deleteLocation } from "@/services/locationService";
import type { Location } from "@/types/Location";
import Link from "next/link";
import { usePermissions } from '@/hooks/use-permissions';
import { usePersistedState } from "@/hooks/use-persisted-state";

// Define admin roles that can access this page
const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];

// Schema for location form
const locationSchema = z.object({
  locationName: z.string().min(2, { message: "Location name must be at least 2 characters." }),
  locationType: z.string().min(1, { message: "Location type is required." }),
  schoolCity: z.string().optional(),
  schoolState: z.string().optional(),
  schoolAddress: z.string().optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

// Location types for dropdown
const locationTypes = [
  { value: "Pre-K Site", label: "Pre-K Site" },
  { value: "Elementary School", label: "Elementary School" },
  { value: "Middle School", label: "Middle School" },
  { value: "High School", label: "High School" },
  { value: "K-8 School", label: "K-8 School" },
  { value: "K-12 School", label: "K-12 School" },
  { value: "District Office", label: "District Office" },
  { value: "Administrative Building", label: "Administrative Building" },
  { value: "Other", label: "Other" },
];

// US States for dropdown
const usStates = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

export default function LocationManagementPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  
  // State for locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  
  // State for pagination
  const [currentPage, setCurrentPage] = usePersistedState('admin-locations-current-page', 1);
  const [itemsPerPage] = usePersistedState('admin-locations-items-per-page', 10);
  
  // State for search
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  
  // State for dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form setup
  const { control, register, handleSubmit, formState: { errors }, reset, setValue } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      locationName: "",
      locationType: "",
      schoolCity: "",
      schoolState: "",
      schoolAddress: "",
    },
  });
  
  // Check if user has admin permissions
  const hasAccess = !authLoading && (
    (userProfile?.role && ADMIN_ROLES.includes(userProfile.role)) || 
    can("admin.locations.manage")
  );
  
  // Fetch locations when the component mounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchLocations();
    }
  }, [userProfile?.account, authLoading]);
  
  // Filter locations when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredLocations(locations);
    } else {
      const filtered = locations.filter(location => 
        location.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (location.locationType && location.locationType.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (location.schoolCity && location.schoolCity.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (location.schoolState && location.schoolState.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredLocations(filtered);
    }
  }, [searchTerm, locations]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);
  const paginatedLocations = filteredLocations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Function to fetch locations
  const fetchLocations = async () => {
    if (!userProfile?.account) return;
    
    setIsLoadingLocations(true);
    setLocationsError(null);
    
    try {
      const fetchedLocations = await getLocationsForLookup(userProfile.account);
      setLocations(fetchedLocations);
      setFilteredLocations(fetchedLocations);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      setLocationsError("Failed to load locations. Please try again.");
      toast({ variant: "destructive", title: "Error Loading Locations", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsLoadingLocations(false);
    }
  };
  
  // Function to handle adding a new location
  const handleAddLocation = async (data: LocationFormData) => {
    if (!userProfile?.account) {
      toast({ variant: "destructive", title: "Error", description: "User account information is missing." });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const newLocation: Omit<Location, 'id'> = {
        ...data,
        account: userProfile.account,
      };
      
      await createLocation(newLocation, userProfile.account);
      toast({ title: "Success", description: `Location "${data.locationName}" created successfully.` });
      fetchLocations();
      setIsAddDialogOpen(false);
      reset();
    } catch (error) {
      console.error("Failed to create location:", error);
      toast({ variant: "destructive", title: "Creation Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to handle editing a location
  const handleEditLocation = async (data: LocationFormData) => {
    if (!userProfile?.account || !selectedLocation) {
      toast({ variant: "destructive", title: "Error", description: "User account or location information is missing." });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updatedLocation: Location = {
        ...selectedLocation,
        ...data,
      };
      
      await updateLocation(selectedLocation.id, updatedLocation, userProfile.account);
      toast({ title: "Success", description: `Location "${data.locationName}" updated successfully.` });
      fetchLocations();
      setIsEditDialogOpen(false);
      setSelectedLocation(null);
    } catch (error) {
      console.error("Failed to update location:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to handle deleting a location
  const handleDeleteLocation = async () => {
    if (!userProfile?.account || !selectedLocation) {
      toast({ variant: "destructive", title: "Error", description: "User account or location information is missing." });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await deleteLocation(selectedLocation.id, userProfile.account);
      toast({ title: "Success", description: `Location "${selectedLocation.locationName}" deleted successfully.` });
      fetchLocations();
      setIsDeleteDialogOpen(false);
      setSelectedLocation(null);
    } catch (error) {
      console.error("Failed to delete location:", error);
      toast({ variant: "destructive", title: "Deletion Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to open edit dialog and populate form
  const openEditDialog = (location: Location) => {
    setSelectedLocation(location);
    setValue("locationName", location.locationName);
    setValue("locationType", location.locationType || "");
    setValue("schoolCity", location.schoolCity || "");
    setValue("schoolState", location.schoolState || "");
    setValue("schoolAddress", location.schoolAddress || "");
    setIsEditDialogOpen(true);
  };
  
  // Function to open delete dialog
  const openDeleteDialog = (location: Location) => {
    setSelectedLocation(location);
    setIsDeleteDialogOpen(true);
  };
  
  // If the user is not an admin, show access denied
  if (!authLoading && !hasAccess) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the necessary permissions to manage locations.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Panel
        </Link>
      </Button>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Location Management</h1>
          <p className="text-lg text-muted-foreground">
            Manage locations for account: {userProfile?.account || "Loading account..."}
          </p>
        </div>
        <Button onClick={() => {
          reset();
          setIsAddDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Add Location
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" /> Locations
            </CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search locations..."
                className="pl-8 w-full sm:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <CardDescription>
            View and manage all locations in your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLocations ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : locationsError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Locations</AlertTitle>
              <AlertDescription>{locationsError}</AlertDescription>
            </Alert>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <p className="text-lg font-semibold">No Locations Found</p>
              <p className="text-muted-foreground">
                {searchTerm ? "No locations match your search criteria." : "No locations have been added yet."}
              </p>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-4">
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">City</TableHead>
                      <TableHead className="hidden md:table-cell">State</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLocations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">{location.locationName}</TableCell>
                        <TableCell>{location.locationType || "N/A"}</TableCell>
                        <TableCell className="hidden md:table-cell">{location.schoolCity || "N/A"}</TableCell>
                        <TableCell className="hidden md:table-cell">{location.schoolState || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(location)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only sm:not-sr-only sm:ml-2">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(location)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only sm:not-sr-only sm:ml-2">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {filteredLocations.length > itemsPerPage && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredLocations.length)} to {Math.min(currentPage * itemsPerPage, filteredLocations.length)} of {filteredLocations.length} locations
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous Page</span>
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {totalPages || 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next Page</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Add Location Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Enter the details for the new location.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleAddLocation)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="locationName">Location Name <span className="text-destructive">*</span></Label>
                <Input id="locationName" {...register("locationName")} />
                {errors.locationName && <p className="text-sm text-destructive">{errors.locationName.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="locationType">Location Type <span className="text-destructive">*</span></Label>
                <Controller
                  name="locationType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="locationType">
                        <SelectValue placeholder="Select location type" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.locationType && <p className="text-sm text-destructive">{errors.locationType.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="schoolAddress">Address</Label>
                <Input id="schoolAddress" {...register("schoolAddress")} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolCity">City</Label>
                  <Input id="schoolCity" {...register("schoolCity")} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="schoolState">State</Label>
                  <Controller
                    name="schoolState"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="schoolState">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {usStates.map(state => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Location
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Location Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update the details for this location.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEditLocation)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="locationName">Location Name <span className="text-destructive">*</span></Label>
                <Input id="locationName" {...register("locationName")} />
                {errors.locationName && <p className="text-sm text-destructive">{errors.locationName.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="locationType">Location Type <span className="text-destructive">*</span></Label>
                <Controller
                  name="locationType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="locationType">
                        <SelectValue placeholder="Select location type" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.locationType && <p className="text-sm text-destructive">{errors.locationType.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="schoolAddress">Address</Label>
                <Input id="schoolAddress" {...register("schoolAddress")} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolCity">City</Label>
                  <Input id="schoolCity" {...register("schoolCity")} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="schoolState">State</Label>
                  <Controller
                    name="schoolState"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="schoolState">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {usStates.map(state => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Update Location
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Location Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this location?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the location
              <strong> {selectedLocation?.locationName}</strong> and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Location
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}