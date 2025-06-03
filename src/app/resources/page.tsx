"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadCloud, FileText, Search, Filter, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Placeholder type for a document - this will be expanded later
interface ResourceDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  lastModified: string;
  tags?: string[];
  version?: string;
}

const placeholderDocuments: ResourceDocument[] = [
  { id: "1", name: "Emergency Evacuation Plan.pdf", type: "PDF", size: "1.2MB", lastModified: "2023-10-15" },
  { id: "2", name: "Staff Training Manual_v2.docx", type: "Word", size: "3.5MB", lastModified: "2023-11-01" },
  { id: "3", name: "Site Map - Main Campus.jpg", type: "JPEG", size: "2.1MB", lastModified: "2023-09-01" },
];

export default function ResourcesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // In a real app, documents would be fetched from a service
  const [documents, setDocuments] = useState<ResourceDocument[]>(placeholderDocuments); 

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      alert("Please select a file to upload.");
      return;
    }
    // Placeholder for actual upload logic
    alert(`Placeholder: Uploading ${selectedFile.name}`);
    // After successful upload, you would clear selectedFile, refresh document list, etc.
    setSelectedFile(null); 
    // Example of adding to list (replace with actual fetch)
    // const newDoc = { id: Date.now().toString(), name: selectedFile.name, type: selectedFile.type.split('/')[1]?.toUpperCase() || "File", size: `${(selectedFile.size / (1024*1024)).toFixed(1)}MB`, lastModified: new Date().toISOString().split('T')[0]};
    // setDocuments(prev => [newDoc, ...prev]);
  };

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resources & Documentation</h1>
        <p className="text-lg text-muted-foreground">
          Manage emergency procedures, training materials, site maps, and other critical documents.
        </p>
      </div>

      <Alert variant="default" className="bg-primary/5 border-primary/20">
        <Info className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary">Under Development</AlertTitle>
        <AlertDescription>
          This Resources module is currently in its foundational stage. Features like version control, advanced tagging, granular permissions, and robust search are planned for future updates.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" /> Upload New Document
          </CardTitle>
          <CardDescription>
            Select a file to upload (PDF, DOCX, XLSX, JPG supported). Max size: 10MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="document-upload" className="sr-only">Choose document</Label>
            <Input id="document-upload" type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpeg,.jpg,.png" />
          </div>
          {selectedFile && (
            <p className="text-sm text-muted-foreground">
              Selected: {selectedFile.name} ({(selectedFile.size / (1024*1024)).toFixed(2)} MB)
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpload} disabled={!selectedFile}>
            <UploadCloud className="mr-2 h-4 w-4" /> Upload Document
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Stored Documents
          </CardTitle>
          <CardDescription>
            Browse and manage uploaded resources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search documents..." 
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            <Button variant="outline" disabled>
              <Filter className="mr-2 h-4 w-4" /> Filters (Coming Soon)
            </Button>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Size</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length > 0 ? (
                  filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium truncate max-w-xs">{doc.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{doc.type}</TableCell>
                      <TableCell className="hidden md:table-cell">{doc.size}</TableCell>
                      <TableCell className="hidden lg:table-cell">{doc.lastModified}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" disabled>View</Button>
                        <Button variant="ghost" size="sm" disabled className="text-destructive hover:text-destructive/80">Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No documents found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                Showing {filteredDocuments.length} of {documents.length} documents. More robust filtering and pagination will be added.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
