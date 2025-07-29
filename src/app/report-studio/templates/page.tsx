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
  Search, Loader2, Shield, Info, Save, AlertTriangle, Copy, Eye
} from "lucide-react";
import {
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,
} from "@/services/templateService";
import type { ReportTemplate } from "@/types/Report";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  isDefault: z.boolean().default(false),
});

type TemplateFormData = z.infer<typeof templateSchema>;

// Available template variables
const TEMPLATE_VARIABLES = [
  { name: "assessmentName", description: "Name of the assessment" },
  { name: "locationName", description: "Name of the location/school" },
  { name: "completedBy", description: "Name of person who completed the assessment" },
  { name: "completionDate", description: "Date when assessment was completed" },
  { name: "reportGeneratedDate", description: "Date when report was generated" },
  { name: "accountName", description: "Account/organization name" },
  { name: "totalQuestions", description: "Total number of questions in assessment" },
  { name: "completedQuestions", description: "Number of completed questions" },
  { name: "completionPercentage", description: "Percentage of assessment completed" },
  { name: "strengths", description: "List of strengths found" },
  { name: "areasForImprovement", description: "List of areas needing improvement" },
  { name: "recommendations", description: "List of recommendations" },
  { name: "criticalIssues", description: "Critical safety issues found" },
  { name: "moderateIssues", description: "Moderate safety issues found" },
  { name: "minorIssues", description: "Minor safety issues found" },
];

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
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  // Form setup
  const { control, register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      htmlContent: "",
      isShared: false,
      isDefault: false,
    },
  });

  const watchedHtmlContent = watch("htmlContent");

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
      setFilteredTemplates(fetchedTemplates);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setTemplatesError("Failed to load templates. Please try again.");
      toast({ variant: "destructive", title: "Error Loading Templates", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [userProfile?.account, toast]);

  // Fetch templates when the component mounts
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchTemplates();
    }
  }, [userProfile?.account, authLoading, fetchTemplates]);

  // Filter templates when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTemplates(templates);
    } else {
      const filtered = templates.filter((template: ReportTemplate) =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredTemplates(filtered);
    }
  }, [searchTerm, templates]);

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
        isDefault: data.isDefault,
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
        isDefault: data.isDefault,
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

  // Function to copy template variable to clipboard
  const copyVariableToClipboard = (variableName: string) => {
    const variableText = `{{${variableName}}}`;
    navigator.clipboard.writeText(variableText);
    toast({ title: "Copied", description: `Variable ${variableText} copied to clipboard.` });
  };

  // Function to generate preview HTML
  const generatePreview = () => {
    const sampleData = {
      assessmentName: "Fire Safety Assessment",
      locationName: "Central High School",
      completedBy: "John Smith",
      completionDate: "2024-01-15",
      reportGeneratedDate: new Date().toLocaleDateString(),
      accountName: "Sample School District",
      totalQuestions: 50,
      completedQuestions: 48,
      completionPercentage: "96%",
      strengths: "Emergency exits clearly marked, Fire extinguishers properly maintained",
      areasForImprovement: "Some emergency lighting needs replacement, Fire drill procedures need updating",
      recommendations: "Replace emergency lighting in gymnasium, Update fire drill procedures",
      criticalIssues: "None found",
      moderateIssues: "2 issues found",
      minorIssues: "5 issues found",
    };

    let previewContent = watchedHtmlContent;
    Object.entries(sampleData).forEach(([key, value]) => {
      previewContent = previewContent.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });

    setPreviewHtml(previewContent);
    setIsPreviewDialogOpen(true);
  };

  // Function to open add/edit dialog and populate form
  const openAddEditDialog = (template?: ReportTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setValue("name", template.name);
      setValue("description", template.description || "");
      setValue("htmlContent", template.htmlContent);
      setValue("isShared", template.isShared || false);
      setValue("isDefault", template.isDefault || false);
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
      <Button variant="outline" onClick={() => router.push('/report-studio')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Report Studio
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
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
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template: ReportTemplate) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{template.description || "No description"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex gap-1">
                          {template.isDefault && (
                            <Badge variant="default" className="text-xs">Default</Badge>
                          )}
                          {template.isShared && (
                            <Badge variant="secondary" className="text-xs">Shared</Badge>
                          )}
                        </div>
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
                            onClick={() => openDeleteDialog(template)}
                            className="text-destructive hover:text-destructive"
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
        onOpenChange={(open: boolean) => {
          if (!open) {
            setIsAddEditDialogOpen(false);
            setSelectedTemplate(null);
            reset();
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? "Edit Template" : "Add New Template"}</DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? "Modify the template details and content."
                : "Create a new reusable report template."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(selectedTemplate ? handleEditTemplate : handleAddTemplate)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="editor" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="editor">Template Editor</TabsTrigger>
                <TabsTrigger value="variables">Available Variables</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="editor" className="flex-1 overflow-hidden flex flex-col mt-4">
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
                        render={({ field }: any) => (
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
                        <AlertTitle>Template Variables</AlertTitle>
                                                 <AlertDescription>
                           Use double curly braces for variables: {"{{variableName}}"}. Check the "Available Variables" tab for a complete list.
                         </AlertDescription>
                      </Alert>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Controller
                        name="isShared"
                        control={control}
                        render={({ field }: any) => (
                          <Switch
                            id="isShared"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="isShared" className="font-normal">Share with entire organization</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Controller
                        name="isDefault"
                        control={control}
                        render={({ field }: any) => (
                          <Switch
                            id="isDefault"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="isDefault" className="font-normal">Set as default template</Label>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="variables" className="flex-1 overflow-hidden flex flex-col mt-4">
                <ScrollArea className="flex-1">
                  <div className="space-y-4 py-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Template Variables</AlertTitle>
                      <AlertDescription>
                        Click on any variable to copy it to your clipboard. Use these variables in your template content.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {TEMPLATE_VARIABLES.map((variable) => (
                        <div
                          key={variable.name}
                          className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => copyVariableToClipboard(variable.name)}
                        >
                          <div className="flex items-center justify-between">
                                                         <div>
                               <p className="font-mono text-sm font-medium">{`{{${variable.name}}}`}</p>
                               <p className="text-sm text-muted-foreground">{variable.description}</p>
                             </div>
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-hidden flex flex-col mt-4">
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label>Template Preview</Label>
                    <Button type="button" variant="outline" onClick={generatePreview}>
                      <Eye className="mr-2 h-4 w-4" />
                      Generate Preview
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-muted/30 min-h-[400px] overflow-auto">
                    {previewHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Click "Generate Preview" to see how your template will look with sample data.
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

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