"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile } from "@/types/User";
import { getUsers } from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/use-permissions";
import { usePersistedState } from "@/hooks/use-persisted-state";
// You will likely need these for the permission change dialog
// import { updateUserPermission } from "@/services/adminService";

export default function UserManagementPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { can } = usePermissions();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { toast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = usePersistedState('admin-users-current-page', 1);
  const [totalPages, setTotalPages] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<number | null>(10);
  
  // --- Permission Change State ---
  const [permissionChange, setPermissionChange] = useState<{ userId: string; newPermission: string; userEmail: string; } | null>(null);

  // Check if user has permission to manage users
  const hasAccess = !authLoading && (
    (userProfile?.role && ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"].includes(userProfile.role)) || 
    can("admin.users.manage")
  );

  useEffect(() => {
    if (hasAccess) {
      setIsLoadingUsers(true);
      setError(null);
      getUsers(currentPage, itemsPerPage)
        .then(data => {
          setUsers(data.users || []);
          setTotalPages(data.totalPages || 0);
        })
        .catch(err => {
          console.error("Failed to fetch users:", err);
          setError(err.message || "Could not load user data.");
        })
        .finally(() => setIsLoadingUsers(false));
    }
  }, [userProfile, currentPage, hasAccess]);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to the first page when changing the limit
  };
  
  // The Download Template and Permission Change handlers would go here as well.
  const handleDownloadTemplate = () => {
    const headers = "email,displayName,permission,account,locationName";
    const exampleRow = "new.user@example.com,New User,user,Test Account,Main Campus";
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${exampleRow}`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "user_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the necessary permissions to manage users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Button variant="outline" asChild>
        <Link href="/admin">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin Panel
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all users in the system.</CardDescription>
            </div>
            <div>
              <Button variant="outline" onClick={handleDownloadTemplate}>Download Template</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers && users.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Error Loading Users</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          defaultValue={user.role}
                           onValueChange={(newPermission) => {
                              setPermissionChange({ 
                                userId: user.uid, 
                                newPermission: newPermission,
                                userEmail: user.email 
                              });
                            }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Set permission" />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="superAdmin">superAdmin</SelectItem>
                            <SelectItem value="scopedAdmin">scopedAdmin</SelectItem>
                            <SelectItem value="accountAdmin">accountAdmin</SelectItem>
                            <SelectItem value="siteAdmin">siteAdmin</SelectItem>
                            <SelectItem value="powerUser">powerUser</SelectItem>
                            <SelectItem value="user">user</SelectItem>
                            <SelectItem value="guest">guest</SelectItem>
                            <SelectItem value="audit">audit</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{user.account || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" disabled>More Actions</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No users found for this account.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Rows per page</span>
                <Select
                    value={`${itemsPerPage}`}
                    onValueChange={handleItemsPerPageChange}
                >
                    <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder={itemsPerPage} />
                    </SelectTrigger>
                    <SelectContent>
                    {[10, 25, 50, 100].map(size => (
                        <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center space-x-2 text-sm">
                <span>Page {currentPage} of {totalPages}</span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                >
                    Next
                </Button>
            </div>
        </CardFooter>
      </Card>

        <AlertDialog open={!!permissionChange} onOpenChange={() => setPermissionChange(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Permission Change</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to change the permission for <strong>{permissionChange?.userEmail}</strong> to <strong>{permissionChange?.newPermission}</strong>. This is a sensitive action. Please type your full name to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="signature">Electronic Signature</Label>
              <Input
                id="signature"
                placeholder="Type your full name"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setPermissionChange(null); setSignature(""); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  alert(`Confirmed change for ${permissionChange?.userEmail} with signature: ${signature}`);
                  setPermissionChange(null);
                  setSignature("");
                }}
                disabled={!signature || signature.trim().length < 3}
              >
                Confirm & Save
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}