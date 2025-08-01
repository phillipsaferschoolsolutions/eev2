"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { UploadCloud, FileText, Search, Filter, Info, Mic, PlayIcon, PauseIcon, Trash2, FileText as FileTextIcon, Loader2, Radio, Eye as EyeIcon, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ResourceDocument } from "@/types/Resource";
import { 
  uploadResourceDocument, 
  getResourceDocuments, 
  addAudioNoteToResource, 
  generateResourceSummary
} from "@/services/resourceService"; 
import Link from "next/link";

const MAX_AUDIO_RECORDING_MS = 30000; // 30 seconds

const resourceFormSchema = z.object({
  documentName: z.string().min(3, "Document name must be at least 3 characters."),
  description: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  file: z.custom<FileList>((val) => val instanceof FileList && val.length > 0, "Please select a file."),
});

type ResourceFormData = z.infer<typeof resourceFormSchema>;

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export default function ResourcesPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<{ title: string; content: string } | null>(null);
  const { toast } = useToast();
  const [documents, setDocuments] = useState<ResourceDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Audio state
  const [audioNotes, setAudioNotes] = useState<Record<string, { blob?: Blob; url?: string; name?: string; isUploading?: boolean; downloadURL?: string; error?: string }>>({});
  const [isRecordingResourceId, setIsRecordingResourceId] = useState<string | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const maxRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [audioPlayerStates, setAudioPlayerStates] = useState<Record<string, AudioPlayerState>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceFormSchema),
  });

  const fetchDocuments = useCallback(async () => {
    if (!userProfile?.account) {
      setDocumentsError("Account information is not available.");
      setIsLoadingDocuments(false);
      return;
    }
    setIsLoadingDocuments(true);
    setDocumentsError(null);
    try {
      const fetchedDocs = await getResourceDocuments(userProfile.account);
      setDocuments(fetchedDocs.map(doc => ({ ...doc, summaryGenerating: false })));
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setDocumentsError((err as Error).message || "Could not load documents.");
      toast({ variant: "destructive", title: "Error Loading Documents", description: (err as Error).message });
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [userProfile?.account, toast]);

  useEffect(() => {
    if (userProfile?.account) { // Only proceed if userProfile.account is truthy
      fetchDocuments();
    }
  }, [userProfile?.account, authLoading, profileLoading, fetchDocuments]);

  const onSubmit: SubmitHandler<ResourceFormData> = async (data) => {
    if (!userProfile?.account || !data.file?.[0]) {
      toast({ variant: "destructive", title: "Upload Error", description: "Account information or file missing." });
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", data.file[0]);
    formData.append("documentName", data.documentName);
    formData.append("description", data.description || "");
    formData.append("tags", data.tags || "");
    // Add other metadata as needed, e.g., uploadedByEmail: user.email

    try {
      await uploadResourceDocument(formData, userProfile.account);
      toast({ title: "Success", description: `Document "${data.documentName}" uploaded.` });
      reset();
      fetchDocuments(); // Refresh the list
    } catch (err) {
      toast({ variant: "destructive", title: "Upload Failed", description: (err as Error).message });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleGenerateSummary = async (docId: string, docName: string) => {
    if (!userProfile?.account) return;

    setDocuments(prevDocs => prevDocs.map(d => d.id === docId ? { ...d, summaryGenerating: true } : d));

    try {
      const response = await generateResourceSummary(docId, userProfile.account); 

      setDocuments(prevDocs => prevDocs.map(d => d.id === docId ? { 
        ...d, 
        summary: response.summary, 
        summaryGeneratedAt: new Date().toISOString(),
        summaryGenerating: false 
      } : d));
      toast({ title: "Summary Generated", description: `Summary for "${docName}" is ready.` });
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({ variant: "destructive", title: "Summary Generation Failed", description: (error as Error).message });
      setDocuments(prevDocs => prevDocs.map(d => d.id === docId ? { ...d, summaryGenerating: false } : d));
    }
  };

  const handleViewSummary = (docName: string, summary: string) => {
    setSelectedSummary({ title: docName, content: summary });
    setSummaryModalOpen(true);
  };


  const requestMicPermission = async () => { 
    if (hasMicPermission) return true;
    setMicPermissionError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      const permErrorMsg = 'Microphone permission denied. Please enable it in your browser settings.';
      setMicPermissionError(permErrorMsg);
      setHasMicPermission(false);
      toast({ variant: 'destructive', title: 'Microphone Access Denied', description: permErrorMsg });
      return false;
    }
  };
  const playChime = (type: 'start' | 'stop') => { 
     try {
        const audioFile = type === 'start' ? '/audio/start-chime.mp3' : '/audio/stop-chime.mp3';
        const chime = new Audio(audioFile);
        chime.play().catch(e => console.warn(`Chime play error: ${(e as Error).message}`));
    } catch (e) {
        console.warn(`Could not play chime: ${e}`);
    }
  };

  const handleStartRecording = async (resourceId: string) => {
    const permissionGranted = await requestMicPermission();
    if (!permissionGranted) return;
    if (isRecordingResourceId) handleStopRecording(isRecordingResourceId, false);

    setIsRecordingResourceId(resourceId);
    audioChunksRef.current = [];
    setAudioNotes(prev => ({ ...prev, [resourceId]: { blob: undefined, url: undefined, name: undefined, isUploading: false } }));
    setAudioPlayerStates(prev => ({ ...prev, [resourceId]: { isPlaying: false, currentTime: 0, duration: 0 } }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      playChime('start');
      mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = async () => {
        const oldNote = audioNotes[resourceId];
        if (oldNote?.url && oldNote.url.startsWith('blob:')) URL.revokeObjectURL(oldNote.url);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioName = `audio_note_${resourceId}_${Date.now()}.webm`;
        
        setAudioNotes(prev => ({ ...prev, [resourceId]: { blob: audioBlob, url: audioUrl, name: audioName, isUploading: false } }));
        playChime('stop');
        if (isRecordingResourceId === resourceId) setIsRecordingResourceId(null);
        stream.getTracks().forEach(track => track.stop());
        if (maxRecordingTimerRef.current) clearTimeout(maxRecordingTimerRef.current);

        if (userProfile?.account && audioBlob) {
            setAudioNotes(prev => ({ ...prev, [resourceId]: { ...prev[resourceId]!, isUploading: true } }));
            try {
                const downloadURL = await addAudioNoteToResource(resourceId, audioBlob, userProfile.account);
                setAudioNotes(prev => ({ ...prev, [resourceId]: { ...prev[resourceId]!, downloadURL, isUploading: false, url: downloadURL } })); 
                toast({ title: "Audio Note Saved", description: `Note for document ID ${resourceId} saved.`});
            } catch (uploadError) {
                console.error("Audio upload error:", uploadError);
                setAudioNotes(prev => ({ ...prev, [resourceId]: { ...prev[resourceId]!, isUploading: false, error: (uploadError as Error).message } }));
                toast({ variant: "destructive", title: "Audio Save Failed", description: (uploadError as Error).message });
            }
        }

      };
      mediaRecorderRef.current.start();
      maxRecordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording" && isRecordingResourceId === resourceId) {
          handleStopRecording(resourceId, true);
          toast({ title: "Recording Limit Reached", description: `Recording stopped after ${MAX_AUDIO_RECORDING_MS / 1000} seconds.`});
        }
      }, MAX_AUDIO_RECORDING_MS);
    } catch (error) {
      console.error('Error starting recording:', error);
      setMicPermissionError('Failed to start recording.');
      if (isRecordingResourceId === resourceId) setIsRecordingResourceId(null);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleStopRecording = (resourceId: string, playTheStopChime: boolean = true) => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    else if(isRecordingResourceId === resourceId) setIsRecordingResourceId(null);
    if (maxRecordingTimerRef.current) clearTimeout(maxRecordingTimerRef.current);
  };
  
  const removeAudioNote = (resourceId: string) => { 
    const note = audioNotes[resourceId];
    if (note?.url && note.url.startsWith('blob:')) URL.revokeObjectURL(note.url);
    setAudioNotes(prev => ({ ...prev, [resourceId]: undefined }));
    setAudioPlayerStates(prev => ({ ...prev, [resourceId]: { isPlaying: false, currentTime: 0, duration: 0 } }));
    if (audioRefs.current[resourceId]) {
        audioRefs.current[resourceId]!.pause();
        audioRefs.current[resourceId]!.removeAttribute('src');
        audioRefs.current[resourceId]!.load();
    }
  };

  const togglePlayPause = async (resourceId: string) => {
    const audio = audioRefs.current[resourceId];
    const noteUrl = audioNotes[resourceId]?.downloadURL || audioNotes[resourceId]?.url;

    if (!audio || !noteUrl) return;
    try {
      if (audio.paused) {
        if (audio.currentSrc !== noteUrl) audio.src = noteUrl;
        await audio.play();
        setAudioPlayerStates(prev => ({ ...prev, [resourceId]: { ...prev[resourceId]!, isPlaying: true } }));
      } else {
        audio.pause();
        setAudioPlayerStates(prev => ({ ...prev, [resourceId]: { ...prev[resourceId]!, isPlaying: false } }));
      }
    } catch (error) { console.error("Playback error:", error); }
  };

  const handleAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement, Event>, resourceId: string) => {
    const audio = e.currentTarget;
    setAudioPlayerStates(prev => ({ ...prev, [resourceId]: { ...prev[resourceId]!, currentTime: audio.currentTime } }));
  };
  const handleAudioLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement, Event>, resourceId: string) => {
    const audio = e.currentTarget;
    setAudioPlayerStates(prev => ({ ...prev, [resourceId]: { ...prev[resourceId]!, duration: audio.duration } }));
  };
  const handleAudioEnded = (resourceId: string) => {
    setAudioPlayerStates(prev => ({ ...prev, [resourceId]: { ...prev[resourceId]!, isPlaying: false, currentTime: 0 } }));
  };


  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading || profileLoading) {
    return <div className="p-4"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!userProfile?.account) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Account Information Missing</AlertTitle>
        <AlertDescription>User account details are not available. Cannot load resources.</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resources & Documentation</h1>
        <p className="text-lg text-muted-foreground">
          Manage procedures, training materials, site maps, and other critical documents.
        </p>
      </div>

      <Alert variant="default" className="bg-primary/5 border-primary/20">
        <Info className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary">Module Under Development</AlertTitle>
        <AlertDescription>
          This Resources module is foundational. Features like versioning, advanced permissions, and AI-powered search are planned.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-primary" /> Upload New Document</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="documentName">Document Name</Label>
              <Input id="documentName" {...register("documentName")} placeholder="e.g., Emergency Evacuation Plan" />
              {errors.documentName && <p className="text-sm text-destructive mt-1">{errors.documentName.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" {...register("description")} placeholder="Briefly describe the document..." />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" {...register("tags")} placeholder="e.g., emergency, training, site-A" />
            </div>
            <div>
              <Label htmlFor="file-upload">File</Label>
              <Input id="file-upload" type="file" {...register("file")} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpeg,.jpg,.png,.txt" />
              {errors.file && <p className="text-sm text-destructive mt-1">{errors.file.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isUploading ? "Uploading..." : "Upload Document"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Stored Documents</CardTitle>
          <CardDescription>Browse, manage, and analyze uploaded resources for account: {userProfile.account}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search by name or tag..." className="pl-8 w-full dark:bg-slate-800 dark:text-white dark:border-blue-900/30" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="outline" disabled><Filter className="mr-2 h-4 w-4" /> Filters (Soon)</Button>
          </div>
          <ScrollArea className="h-[400px] border rounded-md dark:border-blue-900/30 dark:bg-transparent">
            <Table className="dark:bg-transparent">
              <TableHeader className="dark:bg-slate-900/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Modified</TableHead>
                  <TableHead className="hidden lg:table-cell">Tags</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Audio Note</TableHead>
                  <TableHead className="text-right dark:text-slate-300">View</TableHead>
                  <TableHead className="text-right dark:text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingDocuments ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-12 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : documentsError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-destructive">
                      {documentsError}
                    </TableCell>
                  </TableRow>
                ) : filteredDocuments.length > 0 ? (
                  filteredDocuments.map((doc) => {
                    const parsedDate = typeof doc.updatedAt?.toDate === "function"
                      ? doc.updatedAt.toDate()
                      : new Date(doc.updatedAt as string); // Added 'as string' to satisfy TS if updatedAt might not be a Timestamp-like object
                    const isValidDate = parsedDate instanceof Date && !isNaN(parsedDate.getTime());

                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium truncate max-w-[150px] dark:text-white">{doc.name}</TableCell>
                        <TableCell className="hidden sm:table-cell dark:text-white">{doc.fileType || "N/A"}</TableCell>
                        <TableCell className="hidden md:table-cell dark:text-white">
                          {isValidDate ? format(parsedDate, "PP") : "Invalid date"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell truncate max-w-[100px] dark:text-white">
                          {doc.tags?.join(', ') || "None"}
                        </TableCell>
                        <TableCell>
                          {doc.summaryGenerating ? (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Generating...
                            </div>
                          ) : doc.summary ? (
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleViewSummary(doc.name, doc.summary!)}>
                              View
                            </Button>
                          ) : (
                            <Button variant="outline" size="xs" onClick={() => handleGenerateSummary(doc.id, doc.name)} disabled={doc.summaryGenerating}>
                              <FileTextIcon className="mr-1 h-3 w-3" /> Gen
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                        {/* Audio Note UI */}
                        {micPermissionError && isRecordingResourceId === doc.id && <Alert variant="destructive" className="text-xs p-1"><AlertDescription>{micPermissionError}</AlertDescription></Alert>}
                        {audioNotes[doc.id]?.url || doc.audioNotes?.[0]?.storagePath ? ( // Check existing persisted notes or new local recording
                            <div className="flex items-center gap-1">
                            <audio
                                ref={(el) => {audioRefs.current[doc.id] = el}}
                                onLoadedMetadata={(e) => handleAudioLoadedMetadata(e, doc.id)}
                                onTimeUpdate={(e) => handleAudioTimeUpdate(e, doc.id)}
                                onEnded={() => handleAudioEnded(doc.id)}
                                className="hidden"
                                src={audioNotes[doc.id]?.downloadURL || audioNotes[doc.id]?.url || doc.audioNotes?.[0]?.storagePath}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => togglePlayPause(doc.id)} className="h-7 w-7" disabled={audioNotes[doc.id]?.isUploading}>
                                {audioPlayerStates[doc.id]?.isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                            </Button>
                            <Slider value={[audioPlayerStates[doc.id]?.currentTime || 0]} max={audioPlayerStates[doc.id]?.duration || 1} step={0.1} className="w-16 h-1" disabled={audioNotes[doc.id]?.isUploading}/>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeAudioNote(doc.id)} disabled={audioNotes[doc.id]?.isUploading}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            </div>
                        ) : (
                            <Button
                            type="button"
                            variant={isRecordingResourceId === doc.id ? "destructive" : "outline"}
                            size="xs"
                            onMouseDown={() => handleStartRecording(doc.id)}
                            onMouseUp={() => handleStopRecording(doc.id)}
                            onTouchStart={(e) => { e.preventDefault(); handleStartRecording(doc.id);}}
                            onTouchEnd={(e) => { e.preventDefault(); handleStopRecording(doc.id);}}
                            disabled={!!isRecordingResourceId && isRecordingResourceId !== doc.id || audioNotes[doc.id]?.isUploading}
                            className="text-xs px-1.5 py-0.5 h-auto"
                            >
                            {isRecordingResourceId === doc.id ? <Radio className="mr-1 h-3 w-3 animate-pulse"/> : <Mic className="mr-1 h-3 w-3" />}
                            {isRecordingResourceId === doc.id ? 'Rec...' : 'Note'}
                            </Button>
                        )}
                        {audioNotes[doc.id]?.isUploading && <Loader2 className="h-3 w-3 animate-spin" />}
                        {audioNotes[doc.id]?.error && <span className="text-xs text-destructive">Error</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {doc.downloadURL ? (
                            <Button asChild variant="outline" size="xs" className="text-xs px-1.5 py-0.5 h-auto">
                              <Link href={doc.downloadURL} target="_blank" rel="noopener noreferrer">
                                <EyeIcon className="mr-1 h-3 w-3" /> View
                              </Link>
                            </Button>
                          ) : (
                            <Button variant="outline" size="xs" disabled className="text-xs px-1.5 py-0.5 h-auto">
                             <EyeIcon className="mr-1 h-3 w-3" /> View
                            </Button>
                          )}
                        </TableCell>
                         <TableCell className="text-right">
                            <Button variant="ghost" size="xs" disabled className="text-xs px-1.5 py-0.5 h-auto">Manage</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No documents found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          <CardFooter className="pt-4 dark:bg-transparent">
            <p className="text-xs text-muted-foreground dark:text-slate-300">Showing {filteredDocuments.length} of {documents.length} documents.</p>
          </CardFooter>
        </CardContent>
      </Card>

      {/* Summary Modal */}
      <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5" />
              Document Summary: {selectedSummary?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {selectedSummary?.content}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}