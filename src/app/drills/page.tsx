"use client";
import { Button } from "@/components/ui/button"; // Ensure Button is imported
import Link from "next/link"; // Ensure Link is imported
import { FilePlus2 } from "lucide-react"; // Ensure FilePlus2 is imported for the icon
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getUpcomingDrills } from "@/services/drillTrackingService"; // Assuming this function exists
import type { DrillEvent } from "@/types/Drill"; // Assuming a type for DrillEvent

export default function DrillTrackingPage() {
  const { userProfile, loading: authLoading, profileLoading } = useAuth();

  const [upcomingDrills, setUpcomingDrills] = useState<DrillEvent[]>([]);
  const [isLoadingDrills, setIsLoadingDrills] = useState(true);
  const [drillsError, setDrillsError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !profileLoading && userProfile?.account) {
      const fetchDrills = async () => {
        setIsLoadingDrills(true);
        setDrillsError(null);
        try {
          // Assuming getUpcomingDrills fetches drills for the user's account
          const drills = await getUpcomingDrills(userProfile.account);
          setUpcomingDrills(drills || []);
        } catch (err) {
          console.error("Failed to fetch upcoming drills:", err);
          setDrillsError("Failed to load upcoming drills.");
        } finally {
          setIsLoadingDrills(false);
        }
      };
      fetchDrills();
    } else if (!authLoading && !profileLoading && !userProfile?.account) {
        setDrillsError("User account information is not available. Cannot load drills.");
        setIsLoadingDrills(false);
    }
  }, [userProfile?.account, authLoading, profileLoading]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center"> {/* Added a div for layout */}
        <h1 className="text-3xl font-bold tracking-tight">Drill Tracking</h1>
        {/* Added Create Drill Button */}
        <Button asChild size="lg">
          <Link href="/drill-tracking/new">
            <FilePlus2 className="mr-2 h-5 w-5" /> Create Drill Events
          </Link>
        </Button>
      </div>
      {/* Upcoming Drills Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Drills</CardTitle>
          <CardDescription>
            A list of scheduled drills will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Loading, Error, or Data Display will go here */}
          {isLoadingDrills && <Skeleton className="h-32 w-full" />}
          {drillsError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{drillsError}</AlertDescription>
            </Alert>
          )}
          {!isLoadingDrills && !drillsError && upcomingDrills.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg font-semibold">No Upcoming Drills</p>
              <p className="text-sm">
                There are no scheduled drills at this time.
              </p>
            </div>
          )}
          {!isLoadingDrills && !drillsError && upcomingDrills.length > 0 && (
            <ul className="space-y-3">
              {upcomingDrills.map((drill) => (
                <li key={drill.id} className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{drill.name}</p>
                    {/* You might want to add a link or button here to view drill details */}
                    {/* For example: <Link href={`/drill-tracking/${drill.id}`}>View Details</Link> */}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Type: {drill.type || 'N/A'} | Due: {drill.dueDate ? new Date(drill.dueDate).toLocaleDateString() : 'N/A'}
                  </p>
                  {/* Display assigned sites/users if available */}
                   {(drill.assignedToSites && drill.assignedToSites.length > 0) && (
                     <p className="text-xs text-muted-foreground mt-1">Assigned Sites: {drill.assignedToSites.join(', ')}</p>
                   )}
                   {/* You might want to display assigned users similarly */}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Drill Log & History Section (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Drill Log & History</CardTitle>
          <CardDescription>
            Review completed drills and their reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-semibold">Drill Logging Features Under Development</p>
            <p className="text-sm">
              Completed drills and after-action reports will be accessible here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}