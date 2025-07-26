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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  ArrowLeft, FileText, Plus, Edit, Trash2,
  Search, Loader2, Shield, Lightbulb, Info, Save
} from "lucide-react";
import {
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,
} from "@/services/templateService";
import type { ReportTemplate } from "@/types/Report";
import Link from "next/link";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const isAdmin = !authLoading && userProfile && ADMIN_ROLES.includes(userProfile.permission);

  // Fetch templates when the component mounts
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchTemplates();
    }
  }, [userProfile?.account, authLoading]);

  // Filter templates when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTemplates(templates);
    } else {
      const filtered = templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredTemplates(filtered);
    }
  }, [searchTerm, templates]);

  // Function to fetch templates
  const fetchTemplates = async () => {
    if (!userProfile?.account) return;

    setIsLoadingTemplates(true);
    setTemplatesError(null);

    try {
      const fetchedTemplates = await getTemplates(userProfile.account);
      setTemplates(fetchedTemplates);
      setFilteredTemplates(fetchedTemplates);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setTemplatesError("Failed to load templates. Please try again.");
      toast({ variant: "destructive", title: "Error Loading Templates", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Function to handle adding a new template
  const handleAddTemplate = async (data: TemplateFormData) => {
    if (!userProfile?.account || !user?.email) {
      toast({ variant: "destructive", title: "Error", description: "User account or email information is missing." });
      return;
    }

    setIsSubmitting(true);

    try {
      const newTemplate: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
        name: data.name,
        description: data.description,
        htmlContent: data.htmlContent,
        accountId: userProfile.account,
        createdBy: user.email,
        isShared: data.isShared,
      };

      await createTemplate(newTemplate, userProfile.account, user.email);
      toast({ title: "Success", description: `Template "${data.name}" created successfully.` });
      fetchTemplates();
      setIsAddEditDialogOpen(false);
      reset();
    } catch (error) {
      console.error("Failed to create template:", error);
      toast({ variant: "destructive", title: "Creation Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle editing a template
  const handleEditTemplate = async (data: TemplateFormData) => {
    if (!userProfile?.account || !selectedTemplate) {
      toast({ variant: "destructive", title: "Error", description: "User account or template information is missing." });
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedTemplate: Partial<ReportTemplate> = {
        name: data.name,
        description: data.description,
        htmlContent: data.htmlContent,
        isShared: data.isShared,
      };

      await updateTemplate(selectedTemplate.id, updatedTemplate);
      toast({ title: "Success", description: `Template "${data.name}" updated successfully.` });
      fetchTemplates();
      setIsAddEditDialogOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Failed to update template:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle deleting a template
  const handleDeleteTemplate = async () => {
    if (!userProfile?.account || !selectedTemplate) {
      toast({ variant: "destructive", title: "Error", description: "User account or template information is missing." });
      return;
    }

    setIsSubmitting(true);

    try {
      await deleteTemplate(selectedTemplate.id);
      toast({ title: "Success", description: `Template "${selectedTemplate.name}" deleted successfully.` });
      fetchTemplates();
      setIsDeleteDialogOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast({ variant: "destructive", title: "Deletion Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to open add/edit dialog and populate form
  const openAddEditDialog = (template?: ReportTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setValue("name", template.name);
      setValue("description", template.description || "");
      setValue("htmlContent", template.htmlContent);
      setValue("isShared", template.isShared || false);
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

  // If the user doesn't have access, show access denied
  if (!authLoading && !isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the necessary permissions to manage report templates.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/report-studio">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Report Studio
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report Template Management</h1>
          <p className="text-lg text-muted-foreground">
            Create and manage reusable report templates for account: {userProfile?.account || "Loading account..."}
          </p>
        </div>
        <Button onClick={() => openAddEditDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add New Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Templates
            </CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search templates..."
                className="pl-8 w-full sm:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <CardDescription>
            View and manage all report templates in your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTemplates ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : templatesError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Templates</AlertTitle>
              <AlertDescription>{templatesError}</AlertDescription>
            </Alert>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <p className="text-lg font-semibold">No Templates Found</p>
              <p className="text-muted-foreground">
                {searchTerm ? "No templates match your search criteria." : "No templates have been added yet."}
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
                    <TableHead>Template Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden md:table-cell">Shared</TableHead>
                    <TableHead className="hidden md:table-cell">Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{template.description || "No description"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {template.isShared ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            No
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{template.createdBy}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAddEditDialog(template)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only sm:not-sr-only sm:ml-2">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(template)}
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
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Template Dialog */}
      <Dialog
        open={isAddEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddEditDialogOpen(false);
            setSelectedTemplate(null);
            reset();
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? "Edit Template" : "Add New Template"}</DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? "Modify the template details and content."
                : "Create a new reusable report template."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(selectedTemplate ? handleEditTemplate : handleAddTemplate)} className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Briefly describe the purpose of this template..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="htmlContent">Template Content (HTML with Placeholders)</Label>
                  <Controller
                    name="htmlContent"
                    control={control}
                    render={({ field }) => (
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Enter your template content here. Use placeholders like {{assessmentName}}."
                        className="min-h-[400px]"
                      />
                    )}
                  />
                  {errors.htmlContent && <p className="text-sm text-destructive mt-1">{errors.htmlContent.message}</p>}
                  <Alert className="mt-2">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Available Placeholders</AlertTitle>
                    <AlertDescription>{"Use placeholders like {{assessmentName}}, {{completedBy}}, {{locationName}}, {{reportGeneratedDate}}, etc."}</AlertDescription>
                  </Alert>
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
                  <Label htmlFor="isShared" className="font-normal">Share with entire organization</Label>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedTemplate ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {selectedTemplate ? "Update Template" : "Add Template"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Template Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template
              <strong> {selectedTemplate?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
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
                  Delete Template
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}