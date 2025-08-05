"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, CheckCircle, Clock, Users } from "lucide-react";
import { getDrillEventById } from "@/services/drillTrackingService";
import { getLocationsForLookup } from "@/services/locationService";
import type { DrillEvent } from "@/types/Drill";
import type { Location } from "@/types/Location";

export default function ExecuteDrillEventPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const eventId = params.eventId as string;

  const [drillEvent, setDrillEvent] = useState<DrillEvent | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

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

  const canExecuteDrill = () => {
    if (!drillEvent || !userProfile) return false;
    
    // Check if user is admin or superAdmin
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'superAdmin';
    if (isAdmin) return true;
    
    // Check if user is directly assigned to this drill
    const isDirectlyAssigned = drillEvent.assignedToUsers?.includes(userProfile.id);
    if (isDirectlyAssigned) return true;
    
    // Check if user's location is assigned to this drill
    const userLocation = userProfile.location;
    const isLocationAssigned = drillEvent.assignedToSites?.includes(userLocation);
    if (isLocationAssigned) return true;
    
    return false;
  };

  const handleExecuteDrill = async () => {
    if (!drillEvent) return;

    // Check permissions before executing
    if (!canExecuteDrill()) {
      setError("You don't have permission to execute this drill");
      return;
    }

    setIsExecuting(true);
    try {
      // TODO: Implement drill execution logic
      // This would typically involve:
      // 1. Starting the drill timer
      // 2. Recording participant check-ins
      // 3. Tracking evacuation times
      // 4. Collecting evaluation responses
      
      console.log("Executing drill:", drillEvent.title);
      
      // For now, just redirect to a completion page
      router.push(`/drill-tracking/${eventId}/complete`);
    } catch (err) {
      console.error("Failed to execute drill:", err);
      setError("Failed to execute drill");
    } finally {
      setIsExecuting(false);
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

  if (!drillEvent) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/drill-tracking')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription>Drill event not found</AlertDescription>
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
            <h1 className="text-3xl font-bold tracking-tight">Execute Drill</h1>
            <p className="text-muted-foreground mt-1">
              Execute the emergency preparedness drill
            </p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Drill Event Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            {drillEvent.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schedule
              </h4>
              <p className="text-sm text-muted-foreground">
                {new Date(drillEvent.startDate).toLocaleDateString()} - {new Date(drillEvent.endDate).toLocaleDateString()}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assigned Sites
              </h4>
              <p className="text-sm text-muted-foreground">
                {drillEvent.assignedToSites?.length || 0} site{(drillEvent.assignedToSites?.length || 0) !== 1 ? 's' : ''} assigned
                {drillEvent.assignedToSites && drillEvent.assignedToSites.length > 0 && (
                  <span>: {drillEvent.assignedToSites.slice(0, 2).map(siteId => getLocationName(siteId)).join(', ')}{drillEvent.assignedToSites.length > 2 ? '...' : ''}</span>
                )}
              </p>
            </div>
          </div>

          {drillEvent.description && (
            <div className="space-y-2">
              <h4 className="font-medium">Description</h4>
              <p className="text-sm text-muted-foreground">{drillEvent.description}</p>
            </div>
          )}

          <div className="pt-4 border-t">
            {canExecuteDrill() ? (
              <Button 
                onClick={handleExecuteDrill}
                disabled={isExecuting}
                size="lg"
                className="w-full"
              >
                {isExecuting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Starting Drill...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Drill Execution
                  </>
                )}
              </Button>
            ) : (
              <Alert>
                <AlertDescription>
                  You don't have permission to execute this drill. Only users assigned to this drill, 
                  users from assigned locations, or administrators can execute drills.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 