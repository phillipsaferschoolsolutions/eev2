"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
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
  ArrowLeft, FileText, Plus, Edit, Trash2,
  Search, Loader2, Shield, Info, Save, AlertTriangle
} from "lucide-react";
import {
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,
} from "@/services/templateService";
import type { ReportTemplate } from "@/types/Report";

// Force dynamic rendering to prevent build issues
export const dynamic = 'force-dynamic';

// Define admin roles that can access this page
const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];

// Schema for template form
const templateSchema = z.object({
  name: z.string().min(3, { message: "Template name must be at least 3 characters." }),
  description: z.string().optional(),
  htmlContent: z.string().min(10, { message: "Template content cannot be empty." }),
  isShared: z.boolean().default(false),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export default function TemplateManagementPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading, user } = useAuth();
  const { toast } = useToast();

  // State for templates
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // State for search
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTemplates, setFilteredTemplates] = useState<ReportTemplate[]>([]);

  // State for dialogs
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup
  const { control, register, handleSubmit, formState: { errors }, reset, setValue } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      htmlContent: "",
      isShared: false,
    },
  });

  // Check if user has admin permissions
  const isAdmin = !authLoading && userProfile && ADMIN_ROLES.includes(userProfile.role || "");

  // Function to fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!userProfile?.account) return;

    setIsLoadingTemplates(true);
    setTemplatesError(null);

    try {
      const fetchedTemplates = await getTemplates(userProfile.account);
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setTemplatesError("Failed to load templates. Please try again.");
      toast({
        variant: "destructive",
        title: "Error Loading Templates",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [userProfile?.account, toast]);

  // Fetch templates on mount
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchTemplates();
    }
  }, [authLoading, userProfile?.account, fetchTemplates]);

  // Filter templates based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTemplates(templates);
    } else {
      const filtered = templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTemplates(filtered);
    }
  }, [templates, searchTerm]);

  // Function to handle form submission
  const handleAddTemplate = async (data: TemplateFormData) => {
    if (!userProfile?.account) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User account information is missing.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newTemplate = await createTemplate(
        {
          name: data.name,
          description: data.description || "",
          htmlContent: data.htmlContent,
          isShared: data.isShared,
        },
        userProfile.account,
        userProfile.email || user?.email || "unknown"
      );

      setTemplates(prev => [...prev, newTemplate]);
      setIsAddEditDialogOpen(false);
      reset();
      toast({
        title: "Template Created",
        description: "The template has been successfully created.",
      });
    } catch (error) {
      console.error("Failed to create template:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create template. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTemplate = async (data: TemplateFormData) => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    try {
      await updateTemplate(selectedTemplate.id, {
        name: data.name,
        description: data.description || "",
        htmlContent: data.htmlContent,
        isShared: data.isShared,
      });

      setTemplates(prev =>
        prev.map(template =>
          template.id === selectedTemplate.id
            ? { ...template, ...data }
            : template
        )
      );

      setIsAddEditDialogOpen(false);
      setSelectedTemplate(null);
      reset();
      toast({
        title: "Template Updated",
        description: "The template has been successfully updated.",
      });
    } catch (error) {
      console.error("Failed to update template:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update template. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    try {
      await deleteTemplate(selectedTemplate.id);
      setTemplates(prev => prev.filter(template => template.id !== selectedTemplate.id));
      setIsDeleteDialogOpen(false);
      setSelectedTemplate(null);
      toast({
        title: "Template Deleted",
        description: "The template has been successfully deleted.",
      });
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete template. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to open add/edit dialog
  const openAddEditDialog = (template?: ReportTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setValue("name", template.name);
      setValue("description", template.description || "");
      setValue("htmlContent", template.htmlContent);
      setValue("isShared", template.isShared);
    } else {
      setSelectedTemplate(null);
      reset();
    }
    setIsAddEditDialogOpen(true);
  };

  // Function to open delete dialog
  const openDeleteDialog = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access the Template Management. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Template Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage report templates for consistent formatting
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/report-studio')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Report Studio
          </Button>
          <Button onClick={() => openAddEditDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search templates by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates ({filteredTemplates.length})
          </CardTitle>
          <CardDescription>
            Manage your report templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTemplates ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[160px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : templatesError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{templatesError}</AlertDescription>
            </Alert>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "No templates match your search." : "Create your first template to get started."}
              </p>
              {!searchTerm && (
                <Button onClick={() => openAddEditDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Shared</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.description || "No description"}</TableCell>
                    <TableCell>
                      {template.isShared ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Shared
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          Private
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.createdAt ? new Date(template.createdAt as any).toLocaleDateString() : "Unknown"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddEditDialog(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Template Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Edit Template" : "Create New Template"}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? "Update the template details below."
                : "Create a new report template with custom formatting."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(selectedTemplate ? handleEditTemplate : handleAddTemplate)}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Enter template name"
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Enter template description (optional)"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="htmlContent">Template Content</Label>
                <Textarea
                  id="htmlContent"
                  {...register("htmlContent")}
                  placeholder="Enter HTML template content"
                  rows={10}
                />
                {errors.htmlContent && (
                  <p className="text-sm text-destructive mt-1">{errors.htmlContent.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="isShared"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="isShared"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isShared">Share this template with other users</Label>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddEditDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedTemplate ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {selectedTemplate ? "Update Template" : "Create Template"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 