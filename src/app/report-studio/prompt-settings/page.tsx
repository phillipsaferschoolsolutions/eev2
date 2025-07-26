"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Shield, Lightbulb, Save, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPromptSettings, savePromptSettings } from "@/services/reportService";

// Define admin roles that can access this page
const ADMIN_ROLES = ["superAdmin", "scopedAdmin", "siteAdmin", "powerUser"];

// Default prompt text to show when no custom prompt exists
const DEFAULT_PROMPT = `You are an expert school safety assessment analyst at Safer School Solutions, Inc. Your task is to generate a comprehensive safety assessment report based on the provided completion data from a school safety inspection.

School Safety Assessment Report Framework
Overview
This system generates standardized safety assessment reports for educational facilities based on structured assessment data. Each report follows a consistent format to ensure comparability and clarity across different sites. Remember that the goal of these reports is to coach and encourage people to improve (not to judge or make people feel bad). The goal is to highlight positive and areas that need improvement while focusing on the items they are most likely able to control (based on their role as a school administrator) but not being a school district administrator or facilities expert. They likely don't manage the budget or timeline for large infrastructure changes so while we may highlight those gaps we will focus on the ones they can make a measurable positive impact with to make students and the site safer.

Report Structure
All safety assessment reports must follow this structure:
- Title page and header information
- Executive Summary (overview of key findings)
- Detailed Assessment by Domain
  - People (staff, training, supervision)
  - Process (procedures, protocols, plans)
  - Technology & Infrastructure (physical security, equipment)
- Next Steps for Site Leadership
- Appendices (methodology and question references)

Domain Framework
Each domain section must include:
- Strengths (bullet points with question references)
- Areas for Improvement (bullet points with question references)
- Site-Specific Observations (detailed contextual findings)
- Recommendations (table with severity, timeline, references)`;

export default function PromptSettingsPage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [promptMode, setPromptMode] = useState<string>("extend");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("custom");
  
  // Check if user has admin permissions
  const isAdmin = !authLoading && userProfile && ADMIN_ROLES.includes(userProfile.role || "");
  
  // Fetch prompt settings when the component mounts
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      fetchPromptSettings();
    }
  }, [userProfile?.account, authLoading]);
  
  // Function to fetch prompt settings
  const fetchPromptSettings = async () => {
    if (!userProfile?.account) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const settings = await getPromptSettings(userProfile.account);
      if (settings) {
        setCustomPrompt(settings.customPrompt || "");
        setPromptMode(settings.promptMode || "extend");
      }
    } catch (error) {
      console.error("Failed to fetch prompt settings:", error);
      setError("Failed to load prompt settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to save prompt settings
  const handleSaveSettings = async () => {
    if (!userProfile?.account) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "User account information is missing." 
      });
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      await savePromptSettings(userProfile.account, {
        customPrompt,
        promptMode
      });
      
      toast({ 
        title: "Settings Saved", 
        description: "AI prompt settings have been saved successfully." 
      });
    } catch (error) {
      console.error("Failed to save prompt settings:", error);
      setError("Failed to save prompt settings. Please try again.");
      toast({ 
        variant: "destructive", 
        title: "Save Failed", 
        description: error instanceof Error ? error.message : "An unknown error occurred." 
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Function to reset to default settings
  const handleResetToDefault = () => {
    setCustomPrompt("");
    setPromptMode("extend");
    toast({ 
      title: "Settings Reset", 
      description: "AI prompt settings have been reset to default values. Click Save to apply changes." 
    });
  };
  
  // If the user is not an admin, show access denied
  if (!authLoading && !isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the necessary permissions to access the AI Prompt Settings.
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
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Prompt Customization</h1>
        <p className="text-lg text-muted-foreground">
          Customize how the AI generates safety assessment reports.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" /> AI Prompt Settings
          </CardTitle>
          <CardDescription>
            Customize the instructions given to the AI when generating reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-10 w-1/3" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="promptMode">Prompt Mode</Label>
                <RadioGroup
                  id="promptMode"
                  value={promptMode}
                  onValueChange={setPromptMode}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="extend" id="extend" />
                    <Label htmlFor="extend" className="font-normal">
                      Extend Base Prompt (Add your instructions to the default prompt)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="font-normal">
                      Replace Base Prompt (Use only your custom instructions)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="custom">Custom Prompt</TabsTrigger>
                  <TabsTrigger value="default">Default Prompt (Reference)</TabsTrigger>
                </TabsList>
                
                <TabsContent value="custom" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="customPrompt">Custom AI Instructions</Label>
                    <Textarea
                      id="customPrompt"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Enter your custom instructions for the AI report generator..."
                      className="min-h-[300px] font-mono text-sm"
                    />
                    <p className="text-sm text-muted-foreground">
                      {promptMode === "extend" 
                        ? "These instructions will be added to the default prompt." 
                        : "These instructions will completely replace the default prompt."}
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="default" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Default AI Instructions (Read-Only)</Label>
                    <div className="border rounded-md p-4 bg-muted/30 min-h-[300px] whitespace-pre-wrap font-mono text-sm overflow-auto">
                      {DEFAULT_PROMPT}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This is the default prompt used by the system. You can reference this when creating your custom prompt.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleResetToDefault}
            disabled={isLoading || isSaving}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={isLoading || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
        <Lightbulb className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-700 dark:text-blue-300">Tips for Effective AI Prompts</AlertTitle>
        <AlertDescription className="text-blue-600 dark:text-blue-400">
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Be specific about the tone, style, and format you want in the reports.</li>
            <li>Include any specific terminology or phrasing that's important for your organization.</li>
            <li>Mention any compliance standards or regulations that should be referenced.</li>
            <li>Specify how to prioritize different types of safety concerns.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}