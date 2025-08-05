"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Edit, Calendar, MapPin, Users, FileText, Clock, CheckCircle } from "lucide-react";
import { getDrillEventById } from "@/services/drillTrackingService";
import { getLocationsForLookup } from "@/services/locationService";
import type { DrillEvent } from "@/types/Drill";
import type { Location } from "@/types/Location";
import { format } from "date-fns";
import Link from "next/link";

export default function ViewDrillEventPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const eventId = params.eventId as string;

  const [drillEvent, setDrillEvent] = useState<DrillEvent | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const getLocationName = (locationId: string): string => {
    const location = locations.find(loc => loc.id === locationId);
    return location?.locationName || locationId; // Fallback to ID if name not found
  };

  const canEditDrill = () => {
    if (!drillEvent || !userProfile) return false;
    
    // Admin and superAdmin can edit any drill
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
            <h1 className="text-3xl font-bold tracking-tight">{drillEvent.title}</h1>
            <p className="text-muted-foreground mt-1">
              Drill Event Details
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {canExecuteDrill() && (
            <Button asChild>
              <Link href={`/drill-tracking/${eventId}/execute`}>
                <Play className="h-4 w-4 mr-2" />
                Execute
              </Link>
            </Button>
          )}
          {canEditDrill() && (
            <Button variant="outline" asChild>
              <Link href={`/drill-tracking/${eventId}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Drill Event Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Title</h4>
              <p className="text-sm text-muted-foreground">{drillEvent.title}</p>
            </div>
            
            {drillEvent.description && (
              <div className="space-y-2">
                <h4 className="font-medium">Description</h4>
                <p className="text-sm text-muted-foreground">{drillEvent.description}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="font-medium">Hazard Type</h4>
              <Badge variant="outline">{drillEvent.hazardType || 'Not specified'}</Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Status</h4>
              <Badge 
                variant={
                  drillEvent.status === 'active' ? 'default' :
                  drillEvent.status === 'paused' ? 'secondary' :
                  drillEvent.status === 'completed' ? 'outline' :
                  drillEvent.status === 'cancelled' ? 'destructive' :
                  'outline'
                }
              >
                {drillEvent.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Schedule & Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule & Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schedule
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Start:</strong> {format(new Date(drillEvent.startDate), 'PPP p')}</p>
                <p><strong>End:</strong> {format(new Date(drillEvent.endDate), 'PPP p')}</p>
              </div>
            </div>
            
            {drillEvent.assignedToSites && drillEvent.assignedToSites.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Assigned Sites
                </h4>
                <div className="flex flex-wrap gap-1">
                  {drillEvent.assignedToSites.map((siteId, index) => (
                    <Badge key={index} variant="secondary" title={siteId}>
                      {getLocationName(siteId)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {drillEvent.assignedToUsers && drillEvent.assignedToUsers.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assigned Users
                </h4>
                <div className="flex flex-wrap gap-1">
                  {drillEvent.assignedToUsers.map((userId, index) => (
                    <Badge key={index} variant="outline">{userId}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      {drillEvent.requiredCompletions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-medium">Required Completions</h4>
              <p className="text-sm text-muted-foreground">
                {drillEvent.requiredCompletions} completion{drillEvent.requiredCompletions !== 1 ? 's' : ''} required
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permissions Notice */}
      {!canExecuteDrill() && (
        <Alert>
          <AlertDescription>
            You don't have permission to execute this drill. Only users assigned to this drill, 
            users from assigned locations, or administrators can execute drills.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 