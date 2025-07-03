"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, FilePlus, FileEdit, FileSearch } from "lucide-react";

export default function ReportStudioPage() {
  const [activeTab, setActiveTab] = useState("reportViewer");
  const router = useRouter();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Report Studio</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Generate, view, and edit comprehensive safety assessment reports.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-primary" />
              Generate New Report
            </CardTitle>
            <CardDescription>
              Create a new report from assessment data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Use AI to automatically generate a comprehensive safety assessment report based on completed inspections.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/report-studio/generate')} className="w-full">
              Create New Report
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-primary" />
              Edit Reports
            </CardTitle>
            <CardDescription>
              Modify existing reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Edit previously generated reports with our WYSIWYG editor. Add custom content, format text, and more.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-primary" />
              View Reports
            </CardTitle>
            <CardDescription>
              Browse and download reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View all generated reports. Download in PDF or DOCX format for sharing with stakeholders.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Report Viewer</CardTitle>
          <CardDescription>
            View and manage your safety assessment reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Reports Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Generate your first report by selecting an assessment completion and using our AI-powered report generator.
            </p>
            <Button onClick={() => router.push('/report-studio/generate')}>
              Generate Your First Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}