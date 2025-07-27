// src/app/admin/page.tsx
"use client";

import { useAuth } from "@/context/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, MapPin, LockIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";

// Define the roles that are allowed to see the Admin Panel
const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];

export default function AdminPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { can } = usePermissions();

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
  if (!userProfile || (!ADMIN_ROLES.includes(userProfile.role || "") && !can("admin.access"))) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the necessary permissions to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If the user is an admin, show the admin panel
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, locations, and system settings.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="text-primary"/> User Management</CardTitle>
            <CardDescription>View, edit, and manage user accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* This button is now enabled and links to the new page */}
            <Button asChild disabled={!can("admin.users.manage")}>
              <Link href="/admin/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Location Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="text-primary"/> Location Management</CardTitle>
            <CardDescription>Add, edit, or remove sites and locations.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button asChild>
               <Link href="/admin/locations">Manage Locations</Link>
             </Button>
          </CardContent>
        </Card>
        
        {/* Permissions / Roles Card */}
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LockIcon className="text-primary"/> Roles & Permissions</CardTitle>
            <CardDescription>Define and manage roles and their access permissions.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button asChild>
               <Link href="/admin/roles" className={!can("admin.roles.manage") ? "pointer-events-none opacity-50" : ""}>Manage Roles</Link>
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
