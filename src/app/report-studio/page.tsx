"use client";

import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportStudioPage() {
  const [activeTab, setActiveTab] = useState("reportViewer");

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Report Studio</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="reportViewer">Report Viewer</TabsTrigger>
        </TabsList>
        <TabsContent value="reportViewer">
          <Card>
            <CardHeader>
              <CardTitle>Report Viewer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Add your Report Viewer component or content here */}
              <p>This is the Report Viewer content.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}