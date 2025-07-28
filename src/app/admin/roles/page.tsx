"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Shield, Plus, Edit, Trash2, 
  Search, AlertTriangle, Loader2, 
  Info, Copy, Key, LockIcon, UnlockIcon
} from "lucide-react";
import type { Role, PermissionKey } from "@/types/Role";
import { SYSTEM_ROLES } from "@/types/Role";
import Link from "next/link";
import { usePermissions } from "@/hooks/use-permissions";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getRoles, createRole, updateRole, deleteRole } from "@/services/roleService";

// Define admin roles that can access this page
const ADMIN_ROLES = [SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN];

// Schema for role form
const roleSchema = z.object({
  name: z.string().min(2, { message: "Role name must be at least 2 characters." }),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
});

type RoleFormData = z.infer<typeof roleSchema>;

// Group permissions by module for better organization
const PERMISSION_GROUPS = [
  {
    name: "Dashboard",
    permissions: [
      { key: "dashboard.view", label: "View Dashboard" }
    ]
  },
  {
    name: "Assignments",
    permissions: [
      { key: "assignments.create", label: "Create Assignments" },
      { key: "assignments.edit", label: "Edit Assignments" },
      { key: "assignments.delete", label: "Delete Assignments" },
      { key: "assignments.view_all", label: "View All Assignments" },
      { key: "assignments.complete", label: "Complete Assignments" }
    ]
  },
  {
    name: "Admin",
    permissions: [
      { key: "admin.access", label: "Access Admin Panel" },
      { key: "admin.users.manage", label: "Manage Users" },
      { key: "admin.locations.manage", label: "Manage Locations" },
      { key: "admin.roles.manage", label: "Manage Roles & Permissions" },
      { key: "admin.switch_account", label: "Switch Between Accounts" }
    ]
  },
  {
    name: "Messaging",
    permissions: [
      { key: "messaging.send", label: "Send Messages" },
      { key: "messaging.view_all", label: "View All Conversations" }
    ]
  },
  {
    name: "Report Studio",
    permissions: [
      { key: "report_studio.access", label: "Access Report Studio" },
      { key: "report_studio.generate", label: "Generate Reports" },
      { key: "report_studio.templates.manage", label: "Manage Report Templates" }
    ]
  },
  {
    name: "Map",
    permissions: [
      { key: "map.view", label: "View Map" },
      { key: "map.edit", label: "Edit Map (Add POIs, Routes)" }
    ]
  },
  {
    name: "Drill Tracking",
    permissions: [
      { key: "drill_tracking.create", label: "Create Drill Events" },
      { key: "drill_tracking.edit", label: "Edit Drill Events" },
      { key: "drill_tracking.delete", label: "Delete Drill Events" },
      { key: "drill_tracking.view_all", label: "View All Drill Events" }
    ]
  },
  {
    name: "Resources",
    permissions: [
      { key: "resources.upload", label: "Upload Resources" },
      { key: "resources.delete", label: "Delete Resources" },
      { key: "resources.view_all", label: "View All Resources" }
    ]
  },
  {
    name: "Analysis Tools",
    permissions: [
      { key: "photo_analysis.run", label: "Run Photo Analysis" },
      { key: "policy_analysis.run", label: "Run Policy Analysis" }
    ]
  },
  {
    name: "Settings",
    permissions: [
      { key: "settings.view", label: "View Settings" },
      { key: "settings.edit", label: "Edit Settings" }
    ]
  },
  {
    name: "Theming",
    permissions: [
      { key: "theming.change", label: "Change Theme" }
    ]
  }
];

// Flatten all permissions for easier access
const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(group => 
  group.permissions.map(p => ({ ...p, group: group.name }))
);

export default function RoleManagementPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { can } = usePermissions();
  
  // State for roles
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  
  // State for search
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  
  // State for dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for permissions
  const [permissionsMap, setPermissionsMap] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("details");
  
  // Form setup
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  // Check if user has admin permissions
  const hasAccess = !authLoading && userProfile && 
    (ADMIN_ROLES.includes(userProfile.role || "") || can("admin.roles.manage"));
  
  // Fetch roles when the component mounts
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchRoles();
    }
  }, [userProfile?.account, authLoading]);
  
  // Filter roles when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredRoles(roles);
    } else {
      const filtered = roles.filter(role => 
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRoles(filtered);
    }
  }, [searchTerm, roles]);
  
  // Function to fetch roles
  const fetchRoles = async () => {
    if (!userProfile?.account) return;
    
    setIsLoadingRoles(true);
    setRolesError(null);
    
    try {
      const fetchedRoles = await getRoles(userProfile.account);
      setRoles(fetchedRoles);
      setFilteredRoles(fetchedRoles);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      setRolesError("Failed to load roles. Please try again.");
      toast({ variant: "destructive", title: "Error Loading Roles", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsLoadingRoles(false);
    }
  };
  
  // Function to handle adding a new role
  const handleAddRole = async (data: RoleFormData) => {
    if (!userProfile?.account) {
      toast({ variant: "destructive", title: "Error", description: "User account information is missing." });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const newRole: Omit<Role, 'id'> = {
        name: data.name,
        description: data.description,
        permissions: permissionsMap,
        account: userProfile.account,
        isSystem: false,
      };
      
      await createRole(newRole);
      toast({ title: "Success", description: `Role "${data.name}" created successfully.` });
      fetchRoles();
      setIsAddDialogOpen(false);
      reset();
      setPermissionsMap({});
    } catch (error) {
      console.error("Failed to create role:", error);
      toast({ variant: "destructive", title: "Creation Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to handle editing a role
  const handleEditRole = async (data: RoleFormData) => {
    if (!userProfile?.account || !selectedRole) {
      toast({ variant: "destructive", title: "Error", description: "User account or role information is missing." });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updatedRole: Partial<Role> = {
        name: data.name,
        description: data.description,
        permissions: permissionsMap,
      };
      
      await updateRole(selectedRole.id, updatedRole);
      toast({ title: "Success", description: `Role "${data.name}" updated successfully.` });
      fetchRoles();
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      setPermissionsMap({});
    } catch (error) {
      console.error("Failed to update role:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to handle deleting a role
  const handleDeleteRole = async () => {
    if (!userProfile?.account || !selectedRole) {
      toast({ variant: "destructive", title: "Error", description: "User account or role information is missing." });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await deleteRole(selectedRole.id);
      toast({ title: "Success", description: `Role "${selectedRole.name}" deleted successfully.` });
      fetchRoles();
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
    } catch (error) {
      console.error("Failed to delete role:", error);
      toast({ variant: "destructive", title: "Deletion Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to open edit dialog and populate form
  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setValue("name", role.name);
    setValue("description", role.description);
    setPermissionsMap(role.permissions || {});
    setIsEditDialogOpen(true);
    setActiveTab("details");
  };
  
  // Function to open delete dialog
  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };
  
  // Function to duplicate a role
  const duplicateRole = (role: Role) => {
    setPermissionsMap(role.permissions || {});
    setValue("name", `${role.name} (Copy)`);
    setValue("description", role.description);
    setIsAddDialogOpen(true);
    setActiveTab("details");
  };
  
  // Function to toggle a permission
  const togglePermission = (key: PermissionKey) => {
    setPermissionsMap(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // If the user doesn't have access, show access denied
  if (!authLoading && !hasAccess) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the necessary permissions to manage roles.
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
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-lg text-muted-foreground">
            Manage roles and permissions for account: {userProfile?.account || "Loading account..."}
          </p>
        </div>
        <Button onClick={() => {
          reset();
          setPermissionsMap({});
          setIsAddDialogOpen(true);
          setActiveTab("details");
        }}>
          <Plus className="mr-2 h-4 w-4" /> Add Role
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" /> Roles
            </CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search roles..."
                className="pl-8 w-full sm:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <CardDescription>
            View and manage all roles in your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRoles ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rolesError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Roles</AlertTitle>
              <AlertDescription>{rolesError}</AlertDescription>
            </Alert>
          ) : filteredRoles.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <p className="text-lg font-semibold">No Roles Found</p>
              <p className="text-muted-foreground">
                {searchTerm ? "No roles match your search criteria." : "No roles have been added yet."}
              </p>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-4">
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => {
                    const permissionCount = role.permissions ? Object.values(role.permissions).filter(Boolean).length : 0;
                    const totalPermissions = ALL_PERMISSIONS.length;
                    
                    return (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{role.description}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {role.isSystem ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              <LockIcon className="w-3 h-3 mr-1" /> System
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              <UnlockIcon className="w-3 h-3 mr-1" /> Custom
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${(permissionCount / totalPermissions) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {permissionCount}/{totalPermissions}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(role)}
                              disabled={role.isSystem}
                              title={role.isSystem ? "System roles cannot be edited" : "Edit role"}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only sm:not-sr-only sm:ml-2">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => duplicateRole(role)}
                              title="Duplicate role"
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only sm:not-sr-only sm:ml-2">Duplicate</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(role)}
                              disabled={role.isSystem}
                              title={role.isSystem ? "System roles cannot be deleted" : "Delete role"}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only sm:not-sr-only sm:ml-2">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add/Edit Role Dialog */}
      <Dialog 
        open={isAddDialogOpen || isEditDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedRole(null);
            reset();
            setPermissionsMap({});
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{isAddDialogOpen ? "Add New Role" : "Edit Role"}</DialogTitle>
            <DialogDescription>
              {isAddDialogOpen 
                ? "Create a new role with custom permissions." 
                : "Modify the role details and permissions."}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Role Details</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleSubmit(isAddDialogOpen ? handleAddRole : handleEditRole)} className="flex-1 overflow-hidden flex flex-col">
              <TabsContent value="details" className="flex-1 overflow-auto">
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Role Name <span className="text-destructive">*</span></Label>
                    <Input id="name" {...register("name")} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                    <Textarea 
                      id="description" 
                      {...register("description")} 
                      placeholder="Describe the purpose and scope of this role..."
                      rows={4}
                    />
                    {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="permissions" className="flex-1 overflow-hidden flex flex-col">
                <div className="space-y-4 py-4 flex-1 overflow-hidden">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Permission Management</AlertTitle>
                    <AlertDescription>
                      Toggle permissions to control what users with this role can do. Changes will apply to all users assigned this role.
                    </AlertDescription>
                  </Alert>
                  
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6">
                      {PERMISSION_GROUPS.map((group) => (
                        <div key={group.name} className="space-y-2">
                          <h3 className="text-lg font-semibold">{group.name}</h3>
                          <Separator />
                          <div className="space-y-2">
                            {group.permissions.map((permission) => (
                              <div key={permission.key} className="flex items-center justify-between py-2">
                                <Label htmlFor={permission.key} className="flex-1 cursor-pointer">
                                  {permission.label}
                                </Label>
                                <Switch
                                  id={permission.key}
                                  checked={!!permissionsMap[permission.key]}
                                  onCheckedChange={() => togglePermission(permission.key)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
              
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setSelectedRole(null);
                  reset();
                  setPermissionsMap({});
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isAddDialogOpen ? "Adding..." : "Updating..."}
                    </>
                  ) : (
                    <>
                      {isAddDialogOpen ? (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Role
                        </>
                      ) : (
                        <>
                          <Edit className="mr-2 h-4 w-4" />
                          Update Role
                        </>
                      )}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Delete Role Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role
              <strong> {selectedRole?.name}</strong> and may affect users who are currently assigned this role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
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
                  Delete Role
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}