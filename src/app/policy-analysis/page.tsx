"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Brain, SearchCheck, Lightbulb, ClipboardCheck } from "lucide-react";
import { useState } from "react";

export default function PolicyAnalysisPage() {
  const [policyText, setPolicyText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{ gaps: string[], suggestions: string[], summary: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyzePolicy = async () => {
    if (!policyText.trim()) return;
    setIsLoading(true);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2500));
    // This would call the actual AI flow:
    // e.g. const result = await analyzePolicy({ policyText });
    const mockResult = {
        gaps: ["Lack of clear procedure for visitor management.", "Emergency contact list not explicitly mentioned for update frequency.", "No mention of cyber-safety protocols."],
        suggestions: ["Implement a digital visitor sign-in system.", "Specify quarterly updates for emergency contact lists.", "Integrate a section on responsible online behavior and reporting cyber incidents."],
        summary: "The policy covers most standard physical safety aspects but could be strengthened in visitor protocols and digital safety dimensions. Regular review cycles should be explicitly defined."
    };
    setAnalysisResult(mockResult);
    setIsLoading(false);
  };


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">AI Policy Analysis</h1>
      <p className="text-lg text-muted-foreground">
        Upload or paste your school safety policies for AI-driven gap analysis and improvement suggestions.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Analyze Your Safety Policy</CardTitle>
          <CardDescription>Paste the policy text below or upload a document (upload coming soon).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your school safety policy text here..."
            className="min-h-[200px] text-sm"
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
          />
           {/* Placeholder for file upload */}
          <div className="text-sm text-muted-foreground">
            Alternatively, you will be able to upload a .txt, .doc, or .pdf file.
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleAnalyzePolicy} disabled={!policyText.trim() || isLoading} size="lg">
            <Brain className="mr-2 h-5 w-5" />
            {isLoading ? "Analyzing Policy..." : "Analyze Policy"}
          </Button>
        </CardFooter>
      </Card>

      {isLoading && (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <SearchCheck className="h-6 w-6 animate-pulse" /> Analyzing Policy Document...
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Our AI is reviewing the policy against best practices. This may take a moment.</p>
                <div className="w-full bg-muted rounded-full h-2.5 mt-4 overflow-hidden">
                  <div className="bg-primary h-2.5 rounded-full animate-pulse w-1/2" style={{animation: 'progress-indeterminate 1.5s infinite'}}></div>
                </div>
            </CardContent>
        </Card>
      )}

      {analysisResult && !isLoading && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                    <ClipboardCheck className="h-6 w-6" /> Policy Analysis Results
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold text-lg mb-2 flex items-center"><SearchCheck className="mr-2 h-5 w-5 text-destructive" />Identified Gaps:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground bg-destructive/5 p-4 rounded-md border border-destructive/20">
                        {analysisResult.gaps.map((gap, index) => <li key={index}>{gap}</li>)}
                    </ul>
                </div>
                <div>
                    <h3 className="font-semibold text-lg mb-2 flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />Improvement Suggestions:</h3>
                     <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground bg-yellow-500/5 p-4 rounded-md border border-yellow-500/20">
                        {analysisResult.suggestions.map((suggestion, index) => <li key={index}>{suggestion}</li>)}
                    </ul>
                </div>
                 <div>
                    <h3 className="font-semibold text-lg mb-2 flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />Summary:</h3>
                    <p className="text-sm text-muted-foreground bg-primary/5 p-4 rounded-md border border-primary/20">{analysisResult.summary}</p>
                </div>
            </CardContent>
             <CardFooter>
                <Button variant="outline">Download Full Analysis</Button>
            </CardFooter>
        </Card>
      )}
       <style jsx>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%) scaleX(0.5); }
          50% { transform: translateX(0%) scaleX(0.5); }
          100% { transform: translateX(100%) scaleX(0.5); }
        }
      `}</style>
    </div>
  );
}
