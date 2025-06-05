
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { summarizeDocument, type SummarizeDocumentInput, type SummarizeDocumentOutput } from "@/ai/flows/summarize-document-flow";
import { Brain, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DocumentSummaryPage() {
  const [documentText, setDocumentText] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSummarize = async () => {
    if (!documentText.trim()) {
      setError("Please enter some text to summarize.");
      toast({
        variant: "destructive",
        title: "Input Required",
        description: "Please enter some text to summarize.",
      });
      return;
    }
    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const input: SummarizeDocumentInput = { textContent: documentText };
      const result: SummarizeDocumentOutput = await summarizeDocument(input);
      setSummary(result.summary);
      toast({
        title: "Summary Generated",
        description: "The document summary has been successfully created.",
      });
    } catch (err: any) {
      console.error("Error generating summary:", err);
      const errorMessage = err.message || "An unknown error occurred while generating the summary.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Summarization Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">AI Document Summarizer</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Paste your document text below to get a concise AI-generated summary.
        </p>
      </div>

      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" /> Input Document Text
          </CardTitle>
          <CardDescription>
            Provide the text content you want to summarize. Longer texts might take more time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full gap-1.5">
            <Label htmlFor="document-text" className="sr-only">Document Text</Label>
            <Textarea
              id="document-text"
              placeholder="Paste your document text here..."
              className="min-h-[200px] text-sm"
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {documentText.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSummarize} disabled={isLoading || !documentText.trim()} size="lg">
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Brain className="mr-2 h-5 w-5" />
            )}
            {isLoading ? "Generating Summary..." : "Generate Summary"}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive" className="max-w-3xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && !summary && (
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      )}

      {summary && !isLoading && (
        <Card className="max-w-3xl mx-auto bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
                 <Brain className="h-5 w-5 text-primary"/> AI-Generated Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {summary}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
