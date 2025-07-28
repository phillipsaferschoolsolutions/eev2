"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/hooks/use-permissions";

// Define the roles that are allowed to see the Admin Panel
const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];

export default function LocationManagementPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { can } = usePermissions();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { toast } = useToast();

  // State for locations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [locations, setLocations] = useState([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [locationsError, setLocationsError] = useState<string | null>(null);

  // Show a loading state while user profile is being fetched
  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Show an access denied message if the user is not an admin
  if (!userProfile || (!ADMIN_ROLES.includes(userProfile.role || "") && !can("admin.locations.manage"))) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the necessary permissions to manage locations.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If the user is an admin, show the location management panel
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Panel
        </Link>
      </Button>
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Location Management</h1>
        <p className="text-muted-foreground">Manage locations and sites for your account.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="text-primary"/> Location Management
          </CardTitle>
          <CardDescription>Add, edit, or remove sites and locations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <p className="text-lg font-semibold">Location Management Coming Soon</p>
            <p className="text-muted-foreground">
              Full location management functionality will be available in a future update.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}