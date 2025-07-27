"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, ScanSearch, CheckCircle, FileText } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function PhotoAnalysisPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null); // Reset previous result
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    // This would call the actual AI flow:
    // e.g. const result = await analyzePhotoForHazards({ photoDataUri: ... });
    const mockHazards = ["Blocked exit (east hallway)", "Overloaded power socket", "Trip hazard (loose cable)"];
    setAnalysisResult(`Identified Hazards: ${mockHazards.join(', ')}.`);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">AI-Powered Photo Analysis</h1>
      <p className="text-lg text-muted-foreground">
        Upload photos to automatically identify potential safety hazards and concerns.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Upload Photo for Analysis</CardTitle>
          <CardDescription>Supported formats: JPG, PNG. Max size: 5MB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="photo-upload" className="sr-only">Upload Photo</Label>
            <Input id="photo-upload" type="file" accept="image/jpeg, image/png" onChange={handleFileChange} />
          </div>
          {previewUrl && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/20">
              <h3 className="font-semibold mb-2">Photo Preview:</h3>
              <Image 
                src={previewUrl} 
                alt="Selected preview" 
                width={400} 
                height={300} 
                className="rounded-md object-contain max-h-[300px] w-auto shadow-md"
                data-ai-hint="safety inspection" 
              />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleAnalyze} disabled={!selectedFile || isLoading} size="lg">
            <ScanSearch className="mr-2 h-5 w-5" /> 
            {isLoading ? "Analyzing..." : "Analyze Photo"}
          </Button>
        </CardFooter>
      </Card>

      {analysisResult && !isLoading && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-6 w-6" /> Analysis Complete
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="font-semibold">Identified Hazards:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                {(analysisResult.replace("Identified Hazards: ", "").split(', ') || []).map((hazard, index) => (
                    <li key={index}>{hazard.trim()}</li>
                ))}
                </ul>
            </CardContent>
            <CardFooter className="gap-2">
                <Button variant="default"><FileText className="mr-2 h-4 w-4" /> Generate Report</Button>
                <Button variant="outline">Assign Tasks</Button>
            </CardFooter>
        </Card>
      )}

      {isLoading && (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UploadCloud className="h-6 w-6 animate-pulse" /> Analyzing Image...
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Our AI is inspecting the image for potential hazards. This might take a few moments.</p>
                <div className="w-full bg-muted rounded-full h-2.5 mt-4 overflow-hidden">
                    <div className="bg-primary h-2.5 rounded-full animate-pulse w-1/2" style={{animation: 'progress-indeterminate 1.5s infinite'}}></div>
                </div>
            </CardContent>
        </Card>
      )}

      <style jsx>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%) scaleX(0.5); }
          50% { transform: translateX(0%) scaleX(0.5); }
          100% { transform: translateX(100%) scaleX(0.5); }
        }
      `}</style>

      <Card className="mt-6">
        <CardHeader>
            <CardTitle>How it Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Upload a clear photo of the area or object you want to assess.</p>
            <p>2. Our AI model, trained on numerous safety scenarios, analyzes the image.</p>
            <p>3. Potential hazards like blocked exits, fire risks, or trip hazards are identified.</p>
            <p>4. Results are used to auto-populate reports and suggest corrective actions.</p>
        </CardContent>
      </Card>
    </div>
  );
}
