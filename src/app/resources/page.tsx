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
import { UploadCloud, FileText, Search, Filter, Info, Mic, PlayIcon, PauseIcon, Trash2, FileText as FileTextIcon, Loader2, Radio, Eye as EyeIcon, X, MoreHorizontal, Download, Share2, Copy, Edit, Trash } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ResourceDocument } from "@/types/Resource";
import { 
  uploadResourceDocument, 
  getResourceDocuments, 
  addAudioNoteToResource, 
  generateResourceSummary,
  renameResourceDocument,
  deleteResourceDocument,
  cloneResourceDocument,
  shareResourceDocument,
  updateResourceMetadata
} from "@/services/resourceService";
import { auth } from "@/lib/firebase";

// IMPORTANT: Replace this with your actual Cloud Functions base URL for resources
const RESOURCES_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/resources'; 
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
  
  // Document viewer modal
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ResourceDocument | null>(null);
  
  // Action modals
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editMetadataModalOpen, setEditMetadataModalOpen] = useState(false);
  const [actionDocument, setActionDocument] = useState<ResourceDocument | null>(null);
  
  // Form states
  const [newFileName, setNewFileName] = useState("");
  const [shareForm, setShareForm] = useState({
    email: "",
    name: "",
    title: "",
    location: "",
    message: ""
  });
  const [editMetadataForm, setEditMetadataForm] = useState({
    tags: "",
    fileType: ""
  });
  const { toast } = useToast();
  const [documents, setDocuments] = useState<ResourceDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Audio state
  const [audioNotes, setAudioNotes] = useState<Record<string, { blob?: Blob; url?: string; name?: string; isUploading?: boolean; downloadURL?: string; error?: string }>>({});
  const [isRecordingResourceId, setIsRecordingResourceId] = useState<string | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [processingStop, setProcessingStop] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const maxRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [audioPlayerStates, setAudioPlayerStates] = useState<Record<string, AudioPlayerState>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceFormSchema),
  });

  // Initialize audio player states for documents with existing audio notes
  useEffect(() => {
    const newAudioPlayerStates: Record<string, AudioPlayerState> = {};
    const newAudioNotes: Record<string, { blob?: Blob; url?: string; name?: string; isUploading?: boolean; downloadURL?: string; error?: string }> = {};
    
    documents.forEach(doc => {
      // Initialize audio player state for documents with existing audio notes
      if (doc.audioNotes && doc.audioNotes.length > 0) {
        console.log('Initializing audio state for document:', doc.id, 'with audio notes:', doc.audioNotes);
        newAudioPlayerStates[doc.id] = { isPlaying: false, currentTime: 0, duration: 0 };
        
        // Initialize audio note state for existing audio notes
        const existingAudioNote = doc.audioNotes[0];
        if (existingAudioNote) {
          // Handle both old format (storagePath) and new format (url)
          const audioUrl = existingAudioNote.url || existingAudioNote.storagePath;
          newAudioNotes[doc.id] = {
            url: audioUrl,
            name: `audio_note_${doc.id}`,
            isUploading: false,
            downloadURL: audioUrl
          };
          console.log('Set audio note state for', doc.id, ':', newAudioNotes[doc.id]);
        }
      }
    });
    
    setAudioPlayerStates(prev => ({ ...prev, ...newAudioPlayerStates }));
    setAudioNotes(prev => ({ ...prev, ...newAudioNotes }));
  }, [documents]);

  // Cleanup audio resources on unmount
  useEffect(() => {
    return () => {
      // Cleanup blob URLs
      Object.values(audioNotes).forEach(note => {
        if (note?.url && note.url.startsWith('blob:')) {
          URL.revokeObjectURL(note.url);
        }
      });
      
      // Stop any ongoing recording
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      
      // Clear timers
      if (maxRecordingTimerRef.current) {
        clearTimeout(maxRecordingTimerRef.current);
      }
    };
  }, [audioNotes]);

  const fetchDocuments = useCallback(async (page: number = 1) => {
    if (!userProfile?.account) {
      setDocumentsError("Account information is not available.");
      setIsLoadingDocuments(false);
      return;
    }
    setIsLoadingDocuments(true);
    setDocumentsError(null);
    try {
      const result = await getResourceDocuments(userProfile.account, page, 5);
      setDocuments(result.resources.map(doc => ({ ...doc, summaryGenerating: false })));
      setCurrentPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
      setTotalCount(result.pagination.totalCount);
      setHasNextPage(result.pagination.hasNextPage);
      setHasPrevPage(result.pagination.hasPrevPage);
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

  const handleViewDocument = (doc: ResourceDocument) => {
    setSelectedDocument(doc);
    setDocumentModalOpen(true);
  };

  const handleRename = (doc: ResourceDocument) => {
    setActionDocument(doc);
    setNewFileName(doc.name);
    setRenameModalOpen(true);
  };

  const handleDelete = (doc: ResourceDocument) => {
    setActionDocument(doc);
    setDeleteModalOpen(true);
  };

  const handleClone = (doc: ResourceDocument) => {
    setActionDocument(doc);
    setCloneModalOpen(true);
  };

  const handleShare = (doc: ResourceDocument) => {
    setActionDocument(doc);
    setShareForm({
      email: "",
      name: "",
      title: "",
      location: "",
      message: ""
    });
    setShareModalOpen(true);
  };

  const handleEditMetadata = (doc: ResourceDocument) => {
    setActionDocument(doc);
    setEditMetadataForm({
      tags: doc.tags?.join(', ') || "",
      fileType: doc.fileType || ""
    });
    setEditMetadataModalOpen(true);
  };

  const handleDownload = (doc: ResourceDocument) => {
    if (doc.downloadURL) {
      const link = document.createElement('a');
      link.href = doc.downloadURL;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
    try {
      // Prevent starting if already recording this resource
      if (isRecordingResourceId === resourceId) {
        console.log('Already recording this resource:', resourceId);
        return;
      }
      
      // Stop any existing recording first
      if (isRecordingResourceId && isRecordingResourceId !== resourceId) {
        handleStopRecording(isRecordingResourceId, false);
      }

      // Set recording state immediately for responsive UI
      setIsRecordingResourceId(resourceId);
      setMicPermissionError(null);
      audioChunksRef.current = [];
      
      const permissionGranted = await requestMicPermission();
      if (!permissionGranted) {
        // Reset state if permission denied
        setIsRecordingResourceId(null);
        return;
      }
      
      // Initialize audio note state for this resource
      setAudioNotes(prev => ({ 
        ...prev, 
        [resourceId]: { 
          blob: undefined, 
          url: undefined, 
          name: undefined, 
          isUploading: false,
          error: undefined 
        } 
      }));
      
      // Initialize audio player state
      setAudioPlayerStates(prev => ({ 
        ...prev, 
        [resourceId]: { isPlaying: false, currentTime: 0, duration: 0 } 
      }));

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      // Ensure we're still recording this resource (user might have clicked stop while we were setting up)
      if (isRecordingResourceId !== resourceId) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        try {
          // Prevent multiple onstop executions
          if (processingStop === resourceId) {
            console.log('onstop already processing for resource:', resourceId);
            return;
          }
          
          setProcessingStop(resourceId);
          
          // Cleanup old blob URL
          const oldNote = audioNotes[resourceId];
          if (oldNote?.url && oldNote.url.startsWith('blob:')) {
            URL.revokeObjectURL(oldNote.url);
          }

          if (audioChunksRef.current.length === 0) {
            console.warn('No audio data recorded');
            setIsRecordingResourceId(null);
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const audioName = `audio_note_${resourceId}_${Date.now()}.webm`;
          
          setAudioNotes(prev => ({ 
            ...prev, 
            [resourceId]: { 
              blob: audioBlob, 
              url: audioUrl, 
              name: audioName, 
              isUploading: false 
            } 
          }));
          
          playChime('stop');
          
          // Stop recording state
          if (isRecordingResourceId === resourceId) {
            setIsRecordingResourceId(null);
          }
          
          // Cleanup stream
          stream.getTracks().forEach(track => track.stop());
          
          // Clear timer
          if (maxRecordingTimerRef.current) {
            clearTimeout(maxRecordingTimerRef.current);
            maxRecordingTimerRef.current = null;
          }

          // Upload to server - prevent multiple simultaneous uploads
          if (userProfile?.account && audioBlob) {
            // Check if already uploading to prevent double uploads
            const currentNote = audioNotes[resourceId];
            if (currentNote?.isUploading) {
              console.log('Upload already in progress, skipping...');
              return;
            }
            
            // Use a single state update to prevent race conditions
            setAudioNotes(prev => ({ 
              ...prev, 
              [resourceId]: { 
                ...prev[resourceId]!, 
                isUploading: true,
                error: undefined // Clear any previous errors
              } 
            }));
            
            try {
              const downloadURL = await addAudioNoteToResource(resourceId, audioBlob, userProfile.account);
              
              // Single state update after successful upload
              setAudioNotes(prev => ({ 
                ...prev, 
                [resourceId]: { 
                  blob: audioBlob,
                  url: downloadURL,
                  name: audioName,
                  downloadURL, 
                  isUploading: false,
                  error: undefined
                } 
              })); 
              
              toast({ title: "Audio Note Saved", description: "Audio note saved successfully." });
            } catch (uploadError) {
              console.error("Audio upload error:", uploadError);
              
              // Single state update on error
              setAudioNotes(prev => ({ 
                ...prev, 
                [resourceId]: { 
                  ...prev[resourceId]!, 
                  isUploading: false, 
                  error: (uploadError as Error).message 
                } 
              }));
              
              toast({ 
                variant: "destructive", 
                title: "Audio Save Failed", 
                description: (uploadError as Error).message 
              });
            }
          }
        } catch (error) {
          console.error('Error in onstop handler:', error);
          setIsRecordingResourceId(null);
          stream.getTracks().forEach(track => track.stop());
        } finally {
          setProcessingStop(null);
        }
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setMicPermissionError('Recording error occurred.');
        setIsRecordingResourceId(null);
        stream.getTracks().forEach(track => track.stop());
      };
      
      playChime('start');
      mediaRecorderRef.current.start();
      
      // Set recording timeout
      maxRecordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording" && isRecordingResourceId === resourceId) {
          handleStopRecording(resourceId, true);
          toast({ 
            title: "Recording Limit Reached", 
            description: `Recording stopped after ${MAX_AUDIO_RECORDING_MS / 1000} seconds.` 
          });
        }
      }, MAX_AUDIO_RECORDING_MS);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setMicPermissionError('Failed to start recording.');
      setIsRecordingResourceId(null);
      
      // Cleanup any partial setup
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current = null;
      }
    }
  };

  const handleStopRecording = (resourceId: string, playTheStopChime: boolean = true) => {
    try {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      } else if (isRecordingResourceId === resourceId) {
        setIsRecordingResourceId(null);
      }
      
      if (maxRecordingTimerRef.current) {
        clearTimeout(maxRecordingTimerRef.current);
        maxRecordingTimerRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecordingResourceId(null);
    }
  };
  
  const removeAudioNote = async (resourceId: string) => { 
    try {
      const note = audioNotes[resourceId];
      if (note?.url && note.url.startsWith('blob:')) {
        URL.revokeObjectURL(note.url);
      }
      
      // Stop any playing audio
      if (audioRefs.current[resourceId]) {
        audioRefs.current[resourceId]!.pause();
        audioRefs.current[resourceId]!.removeAttribute('src');
        audioRefs.current[resourceId]!.load();
      }
      
      // Clear states immediately for responsive UI
      setAudioNotes(prev => {
        const newState = { ...prev };
        delete newState[resourceId];
        return newState;
      });
      
      setAudioPlayerStates(prev => ({ 
        ...prev, 
        [resourceId]: { isPlaying: false, currentTime: 0, duration: 0 } 
      }));
      
      // Update documents state to reflect the deletion in UI
      setDocuments(prev => prev.map(doc => 
        doc.id === resourceId 
          ? { ...doc, audioNotes: [] } // Clear audio notes array
          : doc
      ));
      
      // Clear any recording state
      if (isRecordingResourceId === resourceId) {
        setIsRecordingResourceId(null);
      }

      // Update backend to remove audio note from document
      if (userProfile?.account) {
        try {
          // Call backend to remove audio note
          await fetch(`${RESOURCES_BASE_URL}/${resourceId}/audio`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
              'account': userProfile.account
            }
          });
        } catch (error) {
          console.error('Error removing audio note from backend:', error);
          // Don't revert UI state on backend error - user can retry
        }
      }
    } catch (error) {
      console.error('Error removing audio note:', error);
    }
  };

  const togglePlayPause = async (resourceId: string) => {
    const audio = audioRefs.current[resourceId];

    if (!audio) {
      console.warn('Audio element not found for resource:', resourceId);
      return;
    }

    try {
      if (audio.paused) {
        // Check if audio is ready to play
        if (audio.readyState < 2) { // HAVE_CURRENT_DATA
          console.warn('Audio not ready to play for resource:', resourceId);
          return;
        }
        
        await audio.play();
        setAudioPlayerStates(prev => ({ 
          ...prev, 
          [resourceId]: { 
            ...prev[resourceId]!, 
            isPlaying: true 
          } 
        }));
      } else {
        audio.pause();
        setAudioPlayerStates(prev => ({ 
          ...prev, 
          [resourceId]: { 
            ...prev[resourceId]!, 
            isPlaying: false 
          } 
        }));
      }
    } catch (error) { 
      console.error("Playback error:", error);
      // Reset playing state on error
      setAudioPlayerStates(prev => ({ 
        ...prev, 
        [resourceId]: { 
          ...prev[resourceId]!, 
          isPlaying: false 
        } 
      }));
    }
  };

  const handleAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement, Event>, resourceId: string) => {
    const audio = e.currentTarget;
    // Only update if the difference is significant to avoid excessive re-renders
    const currentState = audioPlayerStates[resourceId];
    if (!currentState || Math.abs(currentState.currentTime - audio.currentTime) > 0.1) {
      setAudioPlayerStates(prev => ({ 
        ...prev, 
        [resourceId]: { 
          ...prev[resourceId]!, 
          currentTime: audio.currentTime 
        } 
      }));
    }
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
                ) : (searchTerm ? filteredDocuments : documents).length > 0 ? (
                  (searchTerm ? filteredDocuments : documents).map((doc) => {
                    let parsedDate: Date | null = null;
                    
                    // Handle different types of updatedAt values
                    if (doc.updatedAt) {
                      try {
                        if (typeof doc.updatedAt === 'object' && doc.updatedAt !== null) {
                          if ('toDate' in doc.updatedAt && typeof doc.updatedAt.toDate === 'function') {
                            // Firestore Timestamp
                            parsedDate = doc.updatedAt.toDate();
                          } else if ('seconds' in doc.updatedAt && typeof doc.updatedAt.seconds === 'number') {
                            // Firestore Timestamp with seconds
                            parsedDate = new Date(doc.updatedAt.seconds * 1000);
                          } else if ('_seconds' in doc.updatedAt && typeof doc.updatedAt._seconds === 'number') {
                            // Firestore Timestamp with _seconds
                            parsedDate = new Date(doc.updatedAt._seconds * 1000);
                          }
                        } else if (typeof doc.updatedAt === 'string') {
                          // String date
                          parsedDate = new Date(doc.updatedAt);
                        } else if (typeof doc.updatedAt === 'number') {
                          // Unix timestamp (check if it's seconds or milliseconds)
                          if (doc.updatedAt > 1000000000000) {
                            // Likely milliseconds
                            parsedDate = new Date(doc.updatedAt);
                          } else {
                            // Likely seconds
                            parsedDate = new Date(doc.updatedAt * 1000);
                          }
                        } else if (doc.updatedAt instanceof Date) {
                          // Already a Date object
                          parsedDate = doc.updatedAt;
                        }
                      } catch (error) {
                        console.warn('Error parsing date for document:', doc.id, doc.updatedAt, error);
                      }
                    }
                    
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
                            <Button variant="outline" size="sm" onClick={() => handleGenerateSummary(doc.id, doc.name)} disabled={doc.summaryGenerating} className="text-xs px-1.5 py-0.5 h-auto">
                              <FileTextIcon className="mr-1 h-3 w-3" /> Gen
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                        {/* Audio Note UI */}
                        {micPermissionError && isRecordingResourceId === doc.id && <Alert variant="destructive" className="text-xs p-1"><AlertDescription>{micPermissionError}</AlertDescription></Alert>}
                        {audioNotes[doc.id]?.url || doc.audioNotes?.[0]?.url || doc.audioNotes?.[0]?.storagePath ? ( // Check existing persisted notes or new local recording
                            <div className="flex items-center gap-1">
                            <audio
                                ref={(el) => {audioRefs.current[doc.id] = el}}
                                onLoadedMetadata={(e) => handleAudioLoadedMetadata(e, doc.id)}
                                onTimeUpdate={(e) => handleAudioTimeUpdate(e, doc.id)}
                                onEnded={() => handleAudioEnded(doc.id)}
                                className="hidden"
                                src={audioNotes[doc.id]?.downloadURL || audioNotes[doc.id]?.url || doc.audioNotes?.[0]?.url || doc.audioNotes?.[0]?.storagePath}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => togglePlayPause(doc.id)} className="h-7 w-7" disabled={audioNotes[doc.id]?.isUploading}>
                                {audioPlayerStates[doc.id]?.isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                            </Button>
                            <Slider 
                                value={[audioPlayerStates[doc.id]?.currentTime || 0]} 
                                max={audioPlayerStates[doc.id]?.duration || 1} 
                                step={0.1} 
                                className="w-16 h-1" 
                                disabled={audioNotes[doc.id]?.isUploading}
                                onValueChange={(value) => {
                                    const audio = audioRefs.current[doc.id];
                                    if (audio && value[0] !== undefined) {
                                        audio.currentTime = value[0];
                                        setAudioPlayerStates(prev => ({ 
                                            ...prev, 
                                            [doc.id]: { 
                                                ...prev[doc.id]!, 
                                                currentTime: value[0] 
                                            } 
                                        }));
                                    }
                                }}
                            />
                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeAudioNote(doc.id)} disabled={audioNotes[doc.id]?.isUploading}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            </div>
                        ) : (
                            <Button
                            type="button"
                            variant={isRecordingResourceId === doc.id ? "destructive" : "outline"}
                            size="xs"
                            onClick={() => {
                              if (isRecordingResourceId === doc.id) {
                                handleStopRecording(doc.id);
                              } else {
                                handleStartRecording(doc.id);
                              }
                            }}
                            disabled={!!isRecordingResourceId && isRecordingResourceId !== doc.id || audioNotes[doc.id]?.isUploading}
                            className="text-xs px-1.5 py-0.5 h-auto"
                            >
                            {isRecordingResourceId === doc.id ? <Radio className="mr-1 h-3 w-3 animate-pulse"/> : <Mic className="mr-1 h-3 w-3" />}
                            {isRecordingResourceId === doc.id ? 'Stop' : 'Note'}
                            </Button>
                        )}
                        {audioNotes[doc.id]?.isUploading && <Loader2 className="h-3 w-3 animate-spin" />}
                        {audioNotes[doc.id]?.error && <span className="text-xs text-destructive">Error</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {doc.downloadURL ? (
                            <Button variant="outline" size="sm" className="text-xs px-1.5 py-0.5 h-auto" onClick={() => handleViewDocument(doc)}>
                              <EyeIcon className="mr-1 h-3 w-3" /> View
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled className="text-xs px-1.5 py-0.5 h-auto">
                             <EyeIcon className="mr-1 h-3 w-3" /> View
                            </Button>
                          )}
                        </TableCell>
                         <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-xs px-1.5 py-0.5 h-auto">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleRename(doc)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditMetadata(doc)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Edit Tags & Type
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleClone(doc)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Clone
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShare(doc)}>
                                  <Share2 className="mr-2 h-4 w-4" />
                                  Share
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-destructive">
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {searchTerm ? "No documents found matching your search." : "No documents found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          <CardFooter className="pt-4 dark:bg-transparent">
            <p className="text-xs text-muted-foreground dark:text-slate-300">
              {searchTerm 
                ? `Showing ${filteredDocuments.length} of ${totalCount} documents matching "${searchTerm}".`
                : `Showing ${documents.length} of ${totalCount} documents.`
              }
            </p>
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

      {/* Document Viewer Modal */}
      <Dialog open={documentModalOpen} onOpenChange={setDocumentModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5" />
              {selectedDocument?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedDocument?.downloadURL ? (
              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <iframe 
                    src={selectedDocument.downloadURL} 
                    className="w-full h-full rounded-lg"
                    title={selectedDocument.name}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    <p>Type: {selectedDocument.fileType || 'Unknown'}</p>
                    <p>Size: {selectedDocument.fileSize ? `${(selectedDocument.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}</p>
                  </div>
                  <Button onClick={() => handleDownload(selectedDocument!)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Document not available for viewing.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newFileName">New Name</Label>
              <Input
                id="newFileName"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Enter new file name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!actionDocument || !userProfile?.account) return;
              
              try {
                await renameResourceDocument(actionDocument.id, newFileName, userProfile.account);
                setDocuments(prevDocs => prevDocs.map(d => 
                  d.id === actionDocument.id ? { ...d, name: newFileName } : d
                ));
                toast({ title: "Success", description: "Document renamed successfully." });
                setRenameModalOpen(false);
              } catch (error) {
                toast({ variant: "destructive", title: "Error", description: (error as Error).message });
              }
            }}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete "{actionDocument?.name}"? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={async () => {
              if (!actionDocument || !userProfile?.account) return;
              
              try {
                await deleteResourceDocument(actionDocument.id, userProfile.account);
                setDocuments(prevDocs => prevDocs.filter(d => d.id !== actionDocument.id));
                toast({ title: "Success", description: "Document deleted successfully." });
                setDeleteModalOpen(false);
              } catch (error) {
                toast({ variant: "destructive", title: "Error", description: (error as Error).message });
              }
            }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Modal */}
      <Dialog open={cloneModalOpen} onOpenChange={setCloneModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Create a copy of "{actionDocument?.name}"?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!actionDocument || !userProfile?.account) return;
              
              try {
                const clonedDoc = await cloneResourceDocument(actionDocument.id, userProfile.account);
                setDocuments(prevDocs => [...prevDocs, clonedDoc]);
                toast({ title: "Success", description: "Document cloned successfully." });
                setCloneModalOpen(false);
              } catch (error) {
                toast({ variant: "destructive", title: "Error", description: (error as Error).message });
              }
            }}>
              Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="shareEmail">Email</Label>
              <Input
                id="shareEmail"
                type="email"
                value={shareForm.email}
                onChange={(e) => setShareForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="shareName">Name</Label>
              <Input
                id="shareName"
                value={shareForm.name}
                onChange={(e) => setShareForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter recipient name"
              />
            </div>
            <div>
              <Label htmlFor="shareTitle">Title</Label>
              <Input
                id="shareTitle"
                value={shareForm.title}
                onChange={(e) => setShareForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter recipient title"
              />
            </div>
            <div>
              <Label htmlFor="shareLocation">Location</Label>
              <Select value={shareForm.location} onValueChange={(value) => setShareForm(prev => ({ ...prev, location: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main-office">Main Office</SelectItem>
                  <SelectItem value="north-campus">North Campus</SelectItem>
                  <SelectItem value="south-campus">South Campus</SelectItem>
                  <SelectItem value="east-wing">East Wing</SelectItem>
                  <SelectItem value="west-wing">West Wing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="shareMessage">Message (Optional)</Label>
              <Textarea
                id="shareMessage"
                value={shareForm.message}
                onChange={(e) => setShareForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Add a personal message"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!actionDocument || !userProfile?.account) return;
              
              try {
                await shareResourceDocument(actionDocument.id, shareForm, userProfile.account);
                toast({ title: "Success", description: "Document shared successfully." });
                setShareModalOpen(false);
              } catch (error) {
                toast({ variant: "destructive", title: "Error", description: (error as Error).message });
              }
            }}>
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Metadata Modal */}
      <Dialog open={editMetadataModalOpen} onOpenChange={setEditMetadataModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document Metadata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTags">Tags (comma-separated)</Label>
              <Input
                id="editTags"
                value={editMetadataForm.tags}
                onChange={(e) => setEditMetadataForm(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Enter tags separated by commas"
              />
            </div>
            <div>
              <Label htmlFor="editFileType">File Type</Label>
              <Input
                id="editFileType"
                value={editMetadataForm.fileType}
                onChange={(e) => setEditMetadataForm(prev => ({ ...prev, fileType: e.target.value }))}
                placeholder="Enter file type (e.g., PDF, DOC, XLS)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMetadataModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!actionDocument || !userProfile?.account) return;
              
              try {
                const tags = editMetadataForm.tags.split(',').map(tag => tag.trim()).filter(Boolean);
                await updateResourceMetadata(actionDocument.id, {
                  tags,
                  fileType: editMetadataForm.fileType
                }, userProfile.account);
                
                setDocuments(prevDocs => prevDocs.map(d => 
                  d.id === actionDocument.id ? { 
                    ...d, 
                    tags,
                    fileType: editMetadataForm.fileType
                  } : d
                ));
                toast({ title: "Success", description: "Document metadata updated successfully." });
                setEditMetadataModalOpen(false);
              } catch (error) {
                toast({ variant: "destructive", title: "Error", description: (error as Error).message });
              }
            }}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination Controls */}
      {totalPages > 1 && !searchTerm && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * 5) + 1} to {Math.min(currentPage * 5, totalCount)} of {totalCount} documents
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDocuments(currentPage - 1)}
              disabled={!hasPrevPage}
            >
              Previous
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDocuments(currentPage + 1)}
              disabled={!hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}