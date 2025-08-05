"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { getDrillEventById, updateDrillEvent, deleteDrillEvent } from "@/services/drillTrackingService";
import { getLocationsForLookup } from "@/services/locationService";
import { COMMON_DRILL_TYPES } from "@/types/Drill";
import type { DrillEvent } from "@/types/Drill";
import type { Location } from "@/types/Location";

export default function EditDrillEventPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const eventId = params.eventId as string;

  const [drillEvent, setDrillEvent] = useState<DrillEvent | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    hazardType: "",
    startDate: "",
    endDate: "",
    status: "active"
  });

  useEffect(() => {
    if (!userProfile?.account || !eventId) return;

    const fetchData = async () => {
      try {
        // Fetch drill event and locations in parallel
        const [event, locationsData] = await Promise.all([
          getDrillEventById(eventId, userProfile.account),
          getLocationsForLookup(userProfile.account)
        ]);

        if (event) {
          setDrillEvent(event);
          setFormData({
            title: event.title || "",
            description: event.description || "",
            hazardType: event.hazardType || "",
            startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : "",
            endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : "",
            status: event.status || "active"
          });
        } else {
          setError("Drill event not found");
        }

        setLocations(locationsData || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load drill event");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [eventId, userProfile?.account]);

  const getLocationName = (locationId: string): string => {
    const location = locations.find(loc => loc.id === locationId);
    return location?.locationName || locationId; // Fallback to ID if name not found
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!userProfile?.account) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedEvent = await updateDrillEvent(eventId, {
        title: formData.title,
        description: formData.description,
        hazardType: formData.hazardType,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        status: formData.status as "active" | "inactive" | "completed"
      }, userProfile.account);

      setDrillEvent(updatedEvent);
      setSuccess("Drill event updated successfully!");
      
      // Redirect back to drill tracking after a short delay
      setTimeout(() => {
        router.push('/drill-tracking');
      }, 1500);
    } catch (err) {
      console.error("Failed to update drill event:", err);
      setError("Failed to update drill event");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userProfile?.account || !confirm("Are you sure you want to delete this drill event?")) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteDrillEvent(eventId, userProfile.account);
      router.push('/drill-tracking');
    } catch (err) {
      console.error("Failed to delete drill event:", err);
      setError("Failed to delete drill event");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !drillEvent) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/drill-tracking')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/drill-tracking')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Drill Event</h1>
            <p className="text-muted-foreground mt-1">
              Modify the details of this emergency preparedness drill
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Drill Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter drill title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hazardType">Hazard Type *</Label>
              <Select value={formData.hazardType} onValueChange={(value) => handleInputChange("hazardType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hazard type" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_DRILL_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.hazardType}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter drill description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigned Sites (Read-only) */}
          {drillEvent?.assignedToSites && drillEvent.assignedToSites.length > 0 && (
            <div className="space-y-2">
              <Label>Assigned Sites</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/50">
                {drillEvent.assignedToSites.map((siteId, index) => (
                  <span key={index} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm">
                    {getLocationName(siteId)}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Site assignments are managed through the drill creation process and cannot be modified here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 