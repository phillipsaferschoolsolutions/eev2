import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Settings2, Download, BarChart3, ListChecks } from "lucide-react";
import Image from "next/image";

export default function ReportStudioPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Report Studio</h1>
            <p className="text-lg text-muted-foreground">
                Compile, customize, and export comprehensive safety reports.
            </p>
        </div>
        <Button size="lg">
          <FileText className="mr-2 h-5 w-5" /> Create New Report
        </Button>
      </div>
      

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Quick access to your latest generated reports.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  {name: "Q3 Campus Safety Audit - Oct 2023", date: "Oct 15, 2023"},
                  {name: "Fire Drill Evaluation - Main Hall", date: "Oct 10, 2023"},
                  {name: "Lab Inspection Report - Chem Dept", date: "Sep 28, 2023"},
                ].map(report => (
                  <li key={report.name} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors border">
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-xs text-muted-foreground">Generated: {report.date}</p>
                    </div>
                    <Button variant="outline" size="sm">View</Button>
                  </li>
                ))}
                 <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground">No recent reports found for this period.</p>
                </div>
              </ul>
            </CardContent>
          </Card>

           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary"/> Data Sources</CardTitle>
                <CardDescription>Select data to include in your new report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="items-top flex space-x-2">
                    <Checkbox id="assessmentData" defaultChecked/>
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="assessmentData" className="font-medium">Assessment Findings</Label>
                        <p className="text-xs text-muted-foreground">Include data from completed assessment forms.</p>
                    </div>
                </div>
                <div className="items-top flex space-x-2">
                    <Checkbox id="photoData" />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="photoData" className="font-medium">Photo Analysis Results</Label>
                        <p className="text-xs text-muted-foreground">Add identified hazards from photo uploads.</p>
                    </div>
                </div>
                <div className="items-top flex space-x-2">
                    <Checkbox id="incidentData" />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="incidentData" className="font-medium">Incident Logs</Label>
                        <p className="text-xs text-muted-foreground">Incorporate logged incidents and resolutions.</p>
                    </div>
                </div>
            </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-accent"/> Report Customization</CardTitle>
              <CardDescription>Tailor the report to your needs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="report-name">Report Name</Label>
                <Input id="report-name" placeholder="e.g., Monthly Safety Summary" />
              </div>
              <div>
                <Label htmlFor="report-format">Export Format</Label>
                <Select defaultValue="pdf">
                  <SelectTrigger id="report-format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                    <SelectItem value="csv">CSV (Raw Data)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="items-top flex space-x-2">
                <Checkbox id="include-summary" defaultChecked />
                <Label htmlFor="include-summary">Include Executive Summary</Label>
              </div>
              <div className="items-top flex space-x-2">
                <Checkbox id="include-charts" />
                <Label htmlFor="include-charts">Include Charts & Visualizations</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" /> Generate & Download
              </Button>
            </CardFooter>
          </Card>
          <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary"/> Report Preview</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden shadow-inner flex items-center justify-center p-4">
                    <Image 
                        src="https://placehold.co/300x400.png" 
                        alt="Report Preview Placeholder" 
                        width={300} 
                        height={400}
                        className="object-contain w-full h-full"
                        data-ai-hint="document report" 
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">Preview will update based on selections.</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <p className="text-center text-muted-foreground text-sm pt-4">
        Full reporting and customization features coming soon.
      </p>
    </div>
  );
}
