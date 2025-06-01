
"use client";

import { useEffect, useState, ChangeEvent, useMemo, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useForm, Controller, type SubmitHandler, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import Image from "next/image";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress as ShadProgress } from "@/components/ui/progress"; // Renamed to avoid conflict
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getAssignmentById, submitCompletedAssignment, type AssignmentWithPermissions, type AssignmentQuestion } from "@/services/assignmentFunctionsService";
import { getLocationsForLookup, type Location } from "@/services/locationService";
import { cn } from "@/lib/utils";
import { AlertTriangle, Paperclip, MessageSquare, Send, XCircle, CheckCircle2, Building, Mic, CalendarIcon, Clock, Filter, Trash2, Radio, Badge, PlayIcon, PauseIcon, TimerIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";


const formSchema = z.record(z.any());
type FormDataSchema = z.infer<typeof formSchema>;

interface UploadedFileDetail {
  name: string;
  url: string;
}

interface AudioNoteDetail {
  blob?: Blob;
  url?: string;
  name?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadError?: string | null;
  downloadURL?: string;
}

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}


const UNASSIGNED_FILTER_VALUE = "n/a";
const MAX_AUDIO_RECORDING_MS = 20000;

const pillGradientClasses = [
  "bg-gradient-to-r from-primary to-accent text-primary-foreground",
  "bg-gradient-to-r from-sky-500 to-indigo-600 text-white",
  "bg-gradient-to-r from-emerald-500 to-teal-600 text-white",
  "bg-gradient-to-r from-rose-500 to-pink-600 text-white",
  "bg-gradient-to-r from-violet-500 to-purple-600 text-white",
  "bg-gradient-to-r from-cyan-500 to-blue-600 text-white",
  "bg-gradient-to-r from-lime-500 to-green-600 text-white",
  "bg-gradient-to-r from-amber-500 to-yellow-600 text-black",
];

function getGradientClassForText(text?: string): string {
  const inputText = text || "default";
  if (!inputText) return pillGradientClasses[0];
  let hash = 0;
  for (let i = 0; i < inputText.length; i++) {
    const char = inputText.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const index = Math.abs(hash) % pillGradientClasses.length;
  return pillGradientClasses[index];
}


export default function CompleteAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();

  const assignmentId = typeof params.assignmentId === 'string' ? params.assignmentId : '';

  const [assignment, setAssignment] = useState<AssignmentWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [uploadProgress, setUploadProgress] = useState<{ [questionId: string]: number }>({});
  const [uploadedFileDetails, setUploadedFileDetails] = useState<{ [questionId: string]: UploadedFileDetail | null }>({});
  const [uploadErrors, setUploadErrors] = useState<{ [questionId: string]: string | null }>({});
  const [imagePreviewUrls, setImagePreviewUrls] = useState<{ [questionId: string]: string | null }>({});

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedSubSection, setSelectedSubSection] = useState<string>("all");
  const [answeredStatusFilter, setAnsweredStatusFilter] = useState<'all' | 'answered' | 'unanswered'>('all');


  const [audioNotes, setAudioNotes] = useState<{ [questionId: string]: AudioNoteDetail | null }>({});
  const [isRecordingQuestionId, setIsRecordingQuestionId] = useState<string | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const maxRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [audioPlayerStates, setAudioPlayerStates] = useState<Record<string, AudioPlayerState>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});


  const { control, register, handleSubmit, watch, reset, formState: { errors: formErrors }, setValue, getValues } = useForm<FormDataSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const allWatchedValues = watch();

  const parseOptions = (options: string | string[] | undefined): string[] => {
    if (!options) return [];
    if (Array.isArray(options)) return options;
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed;
      }
    } catch (e) {  }
    return options.split(';').map(opt => opt.trim()).filter(opt => opt);
  };

  const shouldBeVisible = (conditionalConfig: AssignmentQuestion['conditional'] | undefined, currentQuestionId: string): boolean => {
    if (!conditionalConfig) {
      return true;
    }

    const triggerFieldId = conditionalConfig.field;
    const conditionValues = Array.isArray(conditionalConfig.value) ? conditionalConfig.value.map(String) : [String(conditionalConfig.value)];

    if (triggerFieldId === currentQuestionId) {
      console.warn(`Conditional logic loop detected for question ${currentQuestionId}`);
      return false;
    }

    const triggerQuestion = assignment?.questions.find(q => q.id === triggerFieldId);
    if (!triggerQuestion) {
      console.warn(`Conditional logic trigger field ${triggerFieldId} not found for question ${currentQuestionId}`);
      return false;
    }

    const watchedValue = allWatchedValues[triggerFieldId];

    if (triggerQuestion.component === 'checkbox') {
      if (triggerQuestion.options) {
        const options = parseOptions(triggerQuestion.options);
        return options.some(opt =>
          conditionValues.includes(opt) && allWatchedValues[`${triggerFieldId}.${opt}`] === true
        );
      } else {
        return conditionValues.some(cv => cv.toLowerCase() === String(watchedValue).toLowerCase());
      }
    } else {
      if (watchedValue === undefined || watchedValue === null || String(watchedValue).trim() === "") {
        return false;
      }
      return conditionValues.includes(String(watchedValue));
    }
  };

  const conditionallyVisibleQuestions = useMemo(() => {
    if (!assignment?.questions) return [];
    return assignment.questions.filter(q => shouldBeVisible(q.conditional, q.id));
  }, [assignment?.questions, allWatchedValues]);


  const isQuestionAnswered = (question: AssignmentQuestion, formData: FieldValues): boolean => {
    const value = formData[question.id];
    switch (question.component) {
      case 'text':
      case 'textarea':
      case 'email':
      case 'url':
      case 'telephone':
      case 'number':
      case 'datetime':
        return value !== undefined && value !== null && String(value).trim() !== '';
      case 'select':
      case 'options':
      case 'buttonSelect':
      case 'schoolSelector':
        return value !== undefined && value !== null && String(value) !== '';
      case 'range':
        return value !== undefined && value !== null;
      case 'date':
      case 'completionDate':
        return value instanceof Date;
      case 'time':
      case 'completionTime':
        return typeof value === 'string' && value.includes(':') && value !== "00:00";
      case 'checkbox':
        if (question.options) {
          const options = parseOptions(question.options);
          return options.some(opt => formData[`${question.id}.${opt}`] === true);
        } else {
          return value === true;
        }
      case 'multiButtonSelect':
      case 'multiSelect':
        if (question.options) {
          const options = parseOptions(question.options);
          return options.some(opt => formData[`${question.id}.${opt}`] === true);
        }
        return false;
      case 'photoUpload':
        return !!uploadedFileDetails[question.id];
      default:
        return false;
    }
  };

  const availableSections = useMemo(() => {
    const sections = new Set<string>();
    conditionallyVisibleQuestions.forEach(q => {
      sections.add(q.section || UNASSIGNED_FILTER_VALUE);
    });
    return Array.from(sections).sort((a,b) => a === UNASSIGNED_FILTER_VALUE ? 1 : b === UNASSIGNED_FILTER_VALUE ? -1 : a.localeCompare(b));
  }, [conditionallyVisibleQuestions]);

  const availableSubSections = useMemo(() => {
    const subSections = new Set<string>();
    conditionallyVisibleQuestions.forEach(q => {
      const questionSection = q.section || UNASSIGNED_FILTER_VALUE;
      if (selectedSection === "all" || questionSection === selectedSection) {
        subSections.add(q.subSection || UNASSIGNED_FILTER_VALUE);
      }
    });
    return Array.from(subSections).sort((a,b) => a === UNASSIGNED_FILTER_VALUE ? 1 : b === UNASSIGNED_FILTER_VALUE ? -1 : a.localeCompare(b));
  }, [conditionallyVisibleQuestions, selectedSection]);

  const questionsToRender = useMemo(() => {
    return conditionallyVisibleQuestions.filter(q => {
      const sectionMatch = selectedSection === "all" || (q.section || UNASSIGNED_FILTER_VALUE) === selectedSection;
      const subSectionMatch = selectedSubSection === "all" || (q.subSection || UNASSIGNED_FILTER_VALUE) === selectedSubSection;

      if (!sectionMatch || !subSectionMatch) return false;

      if (answeredStatusFilter === 'all') {
        return true;
      }
      const answered = isQuestionAnswered(q, allWatchedValues);
      return answeredStatusFilter === 'answered' ? answered : !answered;
    });
  }, [conditionallyVisibleQuestions, selectedSection, selectedSubSection, answeredStatusFilter, allWatchedValues]);


  useEffect(() => {
    if (!assignmentId) {
      setError("Assignment ID is missing.");
      setIsLoading(false);
      return;
    }

    if (authLoading || profileLoading) {
        setIsLoading(true);
        return;
    }

    if (!user) {
      setError("You must be logged in to complete an assignment.");
      toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in."});
      setIsLoading(false);
      router.push(`/auth?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!userProfile?.account) {
      setError("User account information is missing. Cannot load assignment.");
      setIsLoading(false);
      return;
    }

    async function fetchAssignment() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedAssignment = await getAssignmentById(assignmentId, userProfile.account);
        if (fetchedAssignment) {
          setAssignment(fetchedAssignment);
          const defaultVals: FieldValues = {};
          const initialAudioPlayerStates: Record<string, AudioPlayerState> = {};
          fetchedAssignment.questions.forEach(q => {
            if (q.component === 'checkbox' && q.options && Array.isArray(parseOptions(q.options))) {
              parseOptions(q.options).forEach(opt => {
                defaultVals[`${q.id}.${opt}`] = false;
              });
            } else if (q.component === 'range') {
                let defaultRangeVal = 50;
                if (typeof q.options === 'string') {
                    const defaultOpt = q.options.split(';').find(opt => opt.startsWith('default='));
                    if (defaultOpt) {
                        const val = parseInt(defaultOpt.split('=')[1]);
                        if (!isNaN(val)) defaultRangeVal = val;
                    } else {
                         const minOpt = q.options.split(';').find(opt => opt.startsWith('min='));
                         if (minOpt) {
                            const val = parseInt(minOpt.split('=')[1]);
                            if (!isNaN(val)) defaultRangeVal = val;
                         }
                    }
                }
                defaultVals[q.id] = defaultRangeVal;
            } else if (q.component === 'checkbox' && !q.options) {
                defaultVals[q.id] = false;
            } else if (q.component === 'time' || q.component === 'completionTime') {
                defaultVals[q.id] = "00:00";
            }
            else {
              defaultVals[q.id] = (q.component === 'date' || q.component === 'completionDate') ? undefined : '';
            }
            if (q.comment) defaultVals[`${q.id}_comment`] = '';
            initialAudioPlayerStates[q.id] = { isPlaying: false, currentTime: 0, duration: 0 };
          });
          reset(defaultVals);
          setAudioPlayerStates(initialAudioPlayerStates);
        } else {
          setError("Assignment not found or you do not have permission to access it.");
          toast({ variant: "destructive", title: "Error", description: "Assignment not found." });
        }
      } catch (err) {
        console.error("Failed to fetch assignment:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Failed to load assignment: ${errorMessage}`);
        toast({ variant: "destructive", title: "Loading Failed", description: errorMessage });
      } finally {
        setIsLoading(false);
      }
    }

    fetchAssignment();
  }, [assignmentId, user, userProfile, authLoading, profileLoading, reset, toast, router, pathname]);

  useEffect(() => {
    const hasSchoolSelector = assignment?.questions.some(q => q.component === 'schoolSelector');
    if (hasSchoolSelector && userProfile?.account && !isLoading) {
      setIsLoadingLocations(true);
      setLocationsError(null);
      getLocationsForLookup(userProfile.account)
        .then(fetchedLocations => {
          setLocations(fetchedLocations);
        })
        .catch(err => {
          console.error("Failed to fetch locations for schoolSelector:", err);
          setLocationsError(err.message || "Could not load locations.");
          toast({ variant: "destructive", title: "Error Loading Locations", description: err.message });
        })
        .finally(() => setIsLoadingLocations(false));
    }
  }, [assignment, userProfile?.account, toast, isLoading]);

  useEffect(() => {
    setSelectedSubSection("all");
  }, [selectedSection]);


  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (maxRecordingTimerRef.current) {
        clearTimeout(maxRecordingTimerRef.current);
      }
      // Cleanup audio object URLs
      Object.values(audioNotes).forEach(note => {
        if (note?.url && note.url.startsWith('blob:')) {
          URL.revokeObjectURL(note.url);
        }
      });
      // Stop any playing audio
      Object.values(audioRefs.current).forEach(audioEl => {
        if (audioEl) {
          audioEl.pause();
        }
      });
    };
  }, [audioNotes]);

  const requestMicPermission = async () => {
    if (hasMicPermission) return true;
    setMicPermissionError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);
      toast({ title: "Microphone Access Granted" });
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


  const handleStartRecording = async (questionId: string) => {
    const permissionGranted = await requestMicPermission();
    if (!permissionGranted) return;

    setIsRecordingQuestionId(questionId);
    audioChunksRef.current = [];
    setAudioNotes(prev => ({
      ...prev,
      [questionId]: { 
        ...prev[questionId], 
        blob: undefined, 
        url: undefined, 
        name: undefined, 
        isUploading: false, 
        uploadProgress: undefined, 
        uploadError: null,
        downloadURL: undefined 
      }
    }));
    setAudioPlayerStates(prev => ({ ...prev, [questionId]: { isPlaying: false, currentTime: 0, duration: 0 } }));


    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioName = `audio_note_${questionId}_${Date.now()}.webm`;

        setAudioNotes(prev => ({
          ...prev,
          [questionId]: { ...prev[questionId], blob: audioBlob, url: audioUrl, name: audioName, isUploading: false, uploadProgress: undefined, uploadError: null, downloadURL: undefined }
        }));
        setIsRecordingQuestionId(null);
        stream.getTracks().forEach(track => track.stop());
        if (maxRecordingTimerRef.current) {
          clearTimeout(maxRecordingTimerRef.current);
          maxRecordingTimerRef.current = null;
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setMicPermissionError("An error occurred during recording.");
        toast({ variant: "destructive", title: "Recording Error", description: "An unexpected error occurred." });
        setIsRecordingQuestionId(null);
        if (maxRecordingTimerRef.current) {
          clearTimeout(maxRecordingTimerRef.current);
          maxRecordingTimerRef.current = null;
        }
      };

      mediaRecorderRef.current.start();
      maxRecordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
          toast({ title: "Recording Limit Reached", description: "Recording stopped after 20 seconds."});
        }
      }, MAX_AUDIO_RECORDING_MS);

    } catch (error) {
      console.error('Error starting recording:', error);
      setMicPermissionError('Failed to start recording.');
      setIsRecordingQuestionId(null);
       if (maxRecordingTimerRef.current) {
          clearTimeout(maxRecordingTimerRef.current);
          maxRecordingTimerRef.current = null;
        }
    }
  };

  const handleStopRecording = (questionId: string) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const removeAudioNote = (questionId: string) => {
    const note = audioNotes[questionId];
    if (note?.url && note.url.startsWith('blob:')) {
      URL.revokeObjectURL(note.url);
    }
    setAudioNotes(prev => ({
      ...prev,
      [questionId]: null
    }));
     setAudioPlayerStates(prev => ({ ...prev, [questionId]: { isPlaying: false, currentTime: 0, duration: 0 } }));
    if (audioRefs.current[questionId]) {
        audioRefs.current[questionId] = null; // Clear ref if needed, though mostly for state reset
    }
  };

  const togglePlayPause = (questionId: string) => {
    const audio = audioRefs.current[questionId];
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(e => console.error("Error playing audio:", e));
      setAudioPlayerStates(prev => ({ ...prev, [questionId]: { ...prev[questionId]!, isPlaying: true } }));
    } else {
      audio.pause();
      setAudioPlayerStates(prev => ({ ...prev, [questionId]: { ...prev[questionId]!, isPlaying: false } }));
    }
  };

  const handleAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement, Event>, questionId: string) => {
    const audio = e.currentTarget;
    setAudioPlayerStates(prev => ({ ...prev, [questionId]: { ...prev[questionId]!, currentTime: audio.currentTime } }));
  };

  const handleAudioLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement, Event>, questionId: string) => {
    const audio = e.currentTarget;
    setAudioPlayerStates(prev => ({ ...prev, [questionId]: { ...prev[questionId]!, duration: audio.duration } }));
  };

  const handleAudioEnded = (questionId: string) => {
     setAudioPlayerStates(prev => ({ ...prev, [questionId]: { ...prev[questionId]!, isPlaying: false, currentTime: 0 } }));
      if (audioRefs.current[questionId]) {
        audioRefs.current[questionId]!.currentTime = 0; // Reset time on end
      }
  };

  const formatAudioTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };


  const handleFileUpload = async (questionId: string, file: File) => {
    if (!user || !assignment) {
      setUploadErrors(prev => ({ ...prev, [questionId]: "User or assignment data missing." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
        setUploadErrors(prev => ({ ...prev, [questionId]: "File exceeds 5MB limit." }));
        toast({ variant: "destructive", title: "Upload Error", description: "File exceeds 5MB limit."});
        return;
    }

    setUploadProgress(prev => ({ ...prev, [questionId]: 0 }));
    setUploadErrors(prev => ({ ...prev, [questionId]: null }));
    setUploadedFileDetails(prev => ({ ...prev, [questionId]: null }));
    setImagePreviewUrls(prev => ({ ...prev, [questionId]: null }));

    if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreviewUrls(prev => ({ ...prev, [questionId]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }

    const storagePath = `assignment_uploads/${assignment.id}/${user.uid}/${questionId}/${Date.now()}_${file.name}`;
    const storageRefInstance = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRefInstance, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(prev => ({ ...prev, [questionId]: progress }));
      },
      (error) => {
        console.error("Upload failed for question " + questionId + ":", error);
        setUploadErrors(prev => ({ ...prev, [questionId]: error.message }));
        toast({ variant: "destructive", title: "Upload Failed", description: `Could not upload ${file.name}: ${error.message}` });
        setUploadProgress(prev => ({ ...prev, [questionId]: 0 }));
        setImagePreviewUrls(prev => ({ ...prev, [questionId]: null }));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setUploadedFileDetails(prev => ({ ...prev, [questionId]: { name: file.name, url: downloadURL } }));
          toast({ title: "Upload Successful", description: `${file.name} uploaded.` });
          setUploadProgress(prev => ({ ...prev, [questionId]: 100 }));
        } catch (err) {
            console.error("Failed to get download URL for " + questionId + ":", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error getting URL.";
            setUploadErrors(prev => ({ ...prev, [questionId]: "Failed to get file URL: " + errorMessage }));
            setImagePreviewUrls(prev => ({ ...prev, [questionId]: null }));
        }
      }
    );
  };

  const removeUploadedFile = (questionId: string) => {
    setUploadedFileDetails(prev => ({ ...prev, [questionId]: null }));
    setUploadProgress(prev => ({ ...prev, [questionId]: 0 }));
    setUploadErrors(prev => ({ ...prev, [questionId]: null }));
    setImagePreviewUrls(prev => ({ ...prev, [questionId]: null }));
    const fileInput = document.getElementById(`${question.id}_file`) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };


  const onSubmit: SubmitHandler<FormDataSchema> = async (data) => {
    if (!assignment || !userProfile?.account || !user || !user.email) {
        toast({ variant: "destructive", title: "Submission Error", description: "Cannot submit, critical assignment or user account data missing." });
        return;
    }
    setIsSubmitting(true);

    const finalAudioNotesForSubmission: Record<string, { name?: string; url?: string }> = {};
    const audioUploadPromises: Promise<void>[] = [];

    for (const questionId in audioNotes) {
      const note = audioNotes[questionId];
      if (note && note.blob && !note.downloadURL && !note.isUploading) {
        setAudioNotes(prev => ({
          ...prev,
          [questionId]: { ...note, isUploading: true, uploadProgress: 0, uploadError: null }
        }));
        const audioFileName = note.name || `audio_note_${questionId}_${Date.now()}.webm`;
        const audioStoragePath = `assignment_audio_notes/${assignment.id}/${user.uid}/${questionId}/${audioFileName}`;
        const audioStorageRef = ref(storage, audioStoragePath);
        const audioUploadTask = uploadBytesResumable(audioStorageRef, note.blob);

        const promise = new Promise<void>((resolve, reject) => {
          audioUploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setAudioNotes(prev => ({ ...prev, [questionId]: { ...prev[questionId]!, uploadProgress: progress }}));
            },
            (error) => {
              console.error(`Audio upload failed for ${questionId}:`, error);
              setAudioNotes(prev => ({ ...prev, [questionId]: { ...prev[questionId]!, uploadError: error.message, isUploading: false }}));
              reject(error);
            },
            async () => {
              try {
                const url = await getDownloadURL(audioUploadTask.snapshot.ref);
                setAudioNotes(prev => ({ ...prev, [questionId]: { ...prev[questionId]!, downloadURL: url, name: audioFileName, isUploading: false, uploadProgress: 100 }}));
                resolve();
              } catch (getUrlError){
                console.error(`Failed to get audio download URL for ${questionId}:`, getUrlError);
                setAudioNotes(prev => ({ ...prev, [questionId]: { ...prev[questionId]!, uploadError: (getUrlError as Error).message, isUploading: false }}));
                reject(getUrlError);
              }
            }
          );
        });
        audioUploadPromises.push(promise);
      } else if (note && note.downloadURL) {
        // This was already uploaded, or is being re-submitted without re-recording
        finalAudioNotesForSubmission[questionId] = { name: note.name, url: note.downloadURL };
      }
    }

    try {
      await Promise.all(audioUploadPromises);
      for (const qId in audioNotes) {
        const note = audioNotes[qId];
        if (note && note.downloadURL && !finalAudioNotesForSubmission[qId]) {
            finalAudioNotesForSubmission[qId] = { name: note.name, url: note.downloadURL };
        }
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Audio Upload Failed", description: `One or more audio notes could not be uploaded. Please review any errors and try again.` });
      setIsSubmitting(false);
      return;
    }
    
    const formDataForSubmission = new FormData();
    const answersObject: Record<string, any> = {};
    const photoLinksForSync: Record<string, string> = {};
    const commentsForSubmission: Record<string, string> = {};

    conditionallyVisibleQuestions.forEach(question => {
        let questionAnswer: any;
        if (question.component === 'checkbox' && question.options && Array.isArray(parseOptions(question.options))) {
            const selectedOptions: string[] = [];
            parseOptions(question.options).forEach(opt => {
                if (data[`${question.id}.${opt}`]) {
                    selectedOptions.push(opt);
                }
            });
            questionAnswer = selectedOptions;
        } else if (question.component === 'checkbox' && !question.options) {
            questionAnswer = data[question.id] || false;
        } else if ((question.component === 'date' || question.component === 'completionDate') && data[question.id] instanceof Date) {
            questionAnswer = format(data[question.id] as Date, "yyyy-MM-dd");
        } else if ((question.component === 'time' || question.component === 'completionTime') && typeof data[question.id] === 'string' && data[question.id].includes(':')) {
            questionAnswer = data[question.id];
        } else if (question.component === 'range') {
             questionAnswer = data[question.id] ?? 0;
        } else {
            questionAnswer = data[question.id] ?? "";
        }
        answersObject[question.id] = questionAnswer;

        if (question.comment && typeof data[`${question.id}_comment`] === 'string' && data[`${question.id}_comment`].trim() !== '') {
            commentsForSubmission[question.id] = data[`${question.id}_comment`].trim();
        }

        if (question.photoUpload && uploadedFileDetails[question.id]?.url) {
            photoLinksForSync[question.id] = uploadedFileDetails[question.id]!.url;
        }
    });

    formDataForSubmission.append("content", JSON.stringify(answersObject));
    
    if (Object.keys(photoLinksForSync).length > 0) {
      formDataForSubmission.append("syncPhotoLinks", JSON.stringify(photoLinksForSync));
    }
    formDataForSubmission.append("commentsData", Object.keys(commentsForSubmission).length > 0 ? JSON.stringify(commentsForSubmission) : JSON.stringify({}));
    formDataForSubmission.append("audioNotesData", Object.keys(finalAudioNotesForSubmission).length > 0 ? JSON.stringify(finalAudioNotesForSubmission) : JSON.stringify({}));
    
    formDataForSubmission.append("assessmentName", assignment.assessmentName || "Unnamed Assignment");
    formDataForSubmission.append("account", userProfile.account);
    formDataForSubmission.append("completedBy", user.email);
    formDataForSubmission.append("completedTime", new Date().toISOString());
    formDataForSubmission.append("status", "completed");
    formDataForSubmission.append("submittedOnPlatform", "web");

    try {
      await submitCompletedAssignment(assignment.id, formDataForSubmission, userProfile.account);
      toast({ title: "Success", description: "Assignment submitted successfully." });
      router.push("/assessment-forms");
    } catch (err) {
      console.error("Failed to submit assignment:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast({ variant: "destructive", title: "Submission Failed", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };


  const getComponentType = (componentName: string | undefined): string => {
    switch (componentName?.toLowerCase()) {
      case 'telephone': return 'tel';
      case 'datetime': return 'datetime-local';
      case 'text': return 'text';
      case 'number': return 'number';
      case 'email': return 'email';
      case 'url': return 'url';
      default: return componentName || 'text';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-5 w-1/3 mb-4" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-8 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (error && !user) {
    return (
       <div className="p-4 text-center">
         <Alert variant="destructive" className="m-4">
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle>Authentication Required</AlertTitle>
           <AlertDescription>{error} Redirecting to login...</AlertDescription>
         </Alert>
       </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Assignment</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }


  if (!assignment) {
    return <p className="p-4 text-center">Assignment data is not available.</p>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{assignment.assessmentName || "Assignment"}</CardTitle>
          {assignment.description && <CardDescription className="text-lg">{assignment.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <Card className="mb-6 p-4 bg-muted/30">
            <CardHeader className="p-2 pb-3">
             <CardTitle className="text-xl flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary shrink-0"/>
                <span className="min-w-0">Filter Questions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
              <div>
                <Label htmlFor="filter-section">Section</Label>
                <Select value={selectedSection} onValueChange={(value) => { setSelectedSection(value); setSelectedSubSection("all"); }}>
                  <SelectTrigger id="filter-section"><SelectValue placeholder="Filter by section..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {availableSections.map(sec => (
                      <SelectItem key={sec} value={sec}>{sec === UNASSIGNED_FILTER_VALUE ? "N/A" : sec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-subsection">Sub-Section</Label>
                <Select value={selectedSubSection} onValueChange={setSelectedSubSection} disabled={selectedSection === "all" && availableSubSections.length <= 1 && availableSubSections.every(s => s === UNASSIGNED_FILTER_VALUE) }>
                  <SelectTrigger id="filter-subsection"><SelectValue placeholder="Filter by sub-section..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sub-Sections</SelectItem>
                    {availableSubSections.map(sub => (
                      <SelectItem key={sub} value={sub}>{sub === UNASSIGNED_FILTER_VALUE ? "N/A" : sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <RadioGroup
                  value={answeredStatusFilter}
                  onValueChange={(value: 'all' | 'answered' | 'unanswered') => setAnsweredStatusFilter(value)}
                  className="flex flex-wrap gap-x-4 gap-y-2 pt-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="all" id="filter-all" />
                    <Label htmlFor="filter-all" className="font-normal">All</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="answered" id="filter-answered" />
                    <Label htmlFor="filter-answered" className="font-normal">Answered</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="unanswered" id="filter-unanswered" />
                    <Label htmlFor="filter-unanswered" className="font-normal">Unanswered</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
          <Separator className="my-6"/>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {questionsToRender.map((question, index) => (
              <Card key={question.id || index} className="p-6 bg-card/50">
                <fieldset className="space-y-3">
                  <Label htmlFor={question.id} className="text-lg font-semibold text-foreground">
                    {questionsToRender.length > 0 ? `${questionsToRender.indexOf(question) + 1}` : index + 1}. {question.label}
                    {question.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                   <div className="text-xs text-muted-foreground space-y-1 mb-2">
                      <div className="flex items-center">
                        <span className="font-medium mr-1.5">Section:</span>
                        <span className={`inline-block px-2 py-0.5 border-transparent rounded-full text-xs ${getGradientClassForText(question.section)}`}>
                          {String(question.section || "N/A")}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium mr-1.5">Sub-Section:</span>
                        <span className={`inline-block px-2 py-0.5 border-transparent rounded-full text-xs ${getGradientClassForText(question.subSection)}`}>
                          {String(question.subSection || "N/A")}
                        </span>
                      </div>
                    </div>


                  {['text', 'number', 'email', 'url', 'telephone', 'datetime'].includes(question.component) ? (
                    <Input
                      id={question.id}
                      type={getComponentType(question.component)}
                      {...register(question.id, { required: question.required })}
                      className="bg-background"
                    />
                  ) : null}

                  {(question.component === 'date' || question.component === 'completionDate') && (
                    <Controller
                      name={question.id}
                      control={control}
                      rules={{ required: question.required }}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal bg-background",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  )}

                  {(question.component === 'time' || question.component === 'completionTime') && (
                    <Controller
                      name={question.id}
                      control={control}
                      rules={{ required: question.required }}
                      render={({ field }) => {
                        const [currentHour = "00", currentMinute = "00"] = (field.value || "00:00").split(':');
                        return (
                          <div className="flex items-center gap-2 bg-background p-2 rounded-md border">
                            <Clock className="h-5 w-5 text-muted-foreground mr-1" />
                            <Select
                              value={currentHour}
                              onValueChange={(hour) => {
                                field.onChange(`${hour}:${currentMinute}`);
                              }}
                            >
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="HH" />
                              </SelectTrigger>
                              <SelectContent>
                                {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <span className="font-semibold">:</span>
                            <Select
                              value={currentMinute}
                              onValueChange={(minute) => {
                                field.onChange(`${currentHour}:${minute}`);
                              }}
                            >
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="MM" />
                              </SelectTrigger>
                              <SelectContent>
                                {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }}
                    />
                  )}


                  {question.component === 'textarea' && (
                    <Textarea
                      id={question.id}
                      {...register(question.id, { required: question.required })}
                      className="bg-background"
                    />
                  )}

                  {question.component === 'options' && (
                    <Controller
                      name={question.id}
                      control={control}
                      rules={{ required: question.required }}
                      render={({ field }) => (
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1 bg-background p-2 rounded-md"
                        >
                          {parseOptions(question.options).map((option) => (
                            <div key={option} className="flex items-center space-x-3">
                              <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                              <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    />
                  )}

                  {question.component === 'buttonSelect' && (
                    <Controller
                      name={question.id}
                      control={control}
                      rules={{ required: question.required }}
                      render={({ field }) => (
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-2 bg-background p-2 rounded-md">
                           {parseOptions(question.options).map(option => (
                                <div key={option} className="flex items-center">
                                    <RadioGroupItem value={option} id={`${question.id}-${option}`} className="sr-only peer" />
                                    <Label htmlFor={`${question.id}-${option}`}
                                        className="px-3 py-2 border rounded-md cursor-pointer peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground hover:bg-muted/50">
                                        {option}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                      )}
                    />
                  )}

                  {question.component === 'select' && (
                     <Controller
                        name={question.id}
                        control={control}
                        rules={{ required: question.required }}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""}>
                                <SelectTrigger id={question.id} className="w-full bg-background">
                                    <SelectValue placeholder={`Select an option for "${question.label}"`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {parseOptions(question.options).map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                  )}

                  {question.component === 'schoolSelector' && (
                    <Controller
                        name={question.id}
                        control={control}
                        rules={{ required: question.required }}
                        render={({ field }) => (
                            <div className="space-y-1">
                                {isLoadingLocations && <Skeleton className="h-10 w-full" />}
                                {locationsError && <Alert variant="destructive"><AlertDescription>{locationsError}</AlertDescription></Alert>}
                                {!isLoadingLocations && !locationsError && (
                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                        <SelectTrigger id={question.id} className="w-full bg-background">
                                            <SelectValue placeholder="Select a school/site..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {locations.length > 0 ? (
                                                locations.map(loc => (
                                                    <SelectItem key={loc.id} value={loc.locationName}>{loc.locationName}</SelectItem>
                                                ))
                                            ) : (
                                                <div className="p-2 text-sm text-muted-foreground text-center">No locations found.</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        )}
                    />
                  )}

                  {question.component === 'checkbox' && !question.options && (
                     <Controller
                        name={question.id}
                        control={control}
                        defaultValue={false}
                        render={({ field }) => (
                            <div className="flex items-center space-x-2 bg-background p-2 rounded-md">
                                <Checkbox
                                    id={question.id}
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                />
                                <Label htmlFor={question.id} className="font-normal">Confirm</Label>
                            </div>
                        )}
                    />
                  )}

                  {question.component === 'checkbox' && question.options && (
                    <div className="space-y-2 bg-background p-2 rounded-md">
                        {parseOptions(question.options).map(opt => (
                            <Controller
                                key={opt}
                                name={`${question.id}.${opt}`}
                                control={control}
                                defaultValue={false}
                                render={({ field }) => (
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`${question.id}-${opt}`}
                                            checked={!!field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                        <Label htmlFor={`${question.id}-${opt}`} className="font-normal">{opt}</Label>
                                    </div>
                                )}
                            />
                        ))}
                    </div>
                  )}

                  {(question.component === 'multiButtonSelect' || question.component === 'multiSelect') && question.options && (
                    <div className="space-y-2 bg-background p-2 rounded-md">
                        <Label className="text-sm text-muted-foreground block mb-1">Select one or more:</Label>
                        {parseOptions(question.options).map(opt => (
                            <Controller
                                key={opt}
                                name={`${question.id}.${opt}`}
                                control={control}
                                defaultValue={false}
                                render={({ field }) => (
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id={`${question.id}-${opt}`} checked={!!field.value} onCheckedChange={field.onChange} />
                                        <Label htmlFor={`${question.id}-${opt}`} className="font-normal">{opt}</Label>
                                    </div>
                                )}
                            />
                        ))}
                    </div>
                  )}

                  {question.component === 'range' && (
                    <Controller
                      name={question.id}
                      control={control}
                      rules={{ required: question.required }}
                      render={({ field: { onChange, value } }) => {
                        let min = 0, max = 100, step = 1, currentVal = value;
                        if (typeof question.options === 'string') {
                            question.options.split(';').forEach(optStr => {
                                const [key, valStr] = optStr.split('=');
                                const valNum = parseInt(valStr);
                                if (!isNaN(valNum)) {
                                    if (key === 'min') min = valNum;
                                    else if (key === 'max') max = valNum;
                                    else if (key === 'step') step = valNum;
                                }
                            });
                        }
                        if (typeof currentVal !== 'number' || isNaN(currentVal)) {
                           currentVal = (value as number) ?? min;
                        }
                        currentVal = Math.max(min, Math.min(max, currentVal));

                        return (
                          <div className="space-y-2 bg-background p-3 rounded-md">
                            <Slider
                              id={question.id}
                              min={min}
                              max={max}
                              step={step}
                              value={[currentVal]}
                              onValueChange={(vals) => onChange(vals[0])}
                              className="w-[95%] mx-auto pt-2"
                            />
                            <p className="text-sm text-center text-muted-foreground pt-1">Value: {currentVal}</p>
                          </div>
                        );
                      }}
                    />
                  )}

                  {question.component === 'dynamicQuestion' && (
                    <Alert variant="default" className="bg-blue-50 border-blue-200">
                        <Building className="h-4 w-4 text-blue-600"/>
                        <AlertTitle className="text-blue-700">Dynamic Content</AlertTitle>
                        <AlertDescription className="text-blue-600">This section may render additional questions based on logic. (Full support coming soon)</AlertDescription>
                    </Alert>
                  )}

                  {formErrors[question.id] && <p className="text-sm text-destructive">{formErrors[question.id]?.message as string}</p>}

                  {question.comment && (
                    <div className="mt-3">
                      <Label htmlFor={`${question.id}_comment`} className="text-sm text-muted-foreground flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1"/> Optional Comments
                      </Label>
                      <Textarea
                        id={`${question.id}_comment`}
                        {...register(`${question.id}_comment`)}
                        rows={2}
                        className="mt-1 bg-background/80"
                        placeholder="Add any comments..."
                      />
                    </div>
                  )}

                  {question.photoUpload && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor={`${question.id}_file`} className="text-sm text-muted-foreground flex items-center">
                        <Paperclip className="h-4 w-4 mr-1"/> Upload File (Optional, Max 5MB)
                      </Label>
                      {!uploadedFileDetails[question.id] && !uploadProgress[question.id] && (
                        <Input
                          id={`${question.id}_file`}
                          type="file"
                          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                          className="mt-1 bg-background/80"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(question.id, e.target.files[0]);
                            }
                          }}
                          disabled={!!uploadProgress[question.id] && uploadProgress[question.id] > 0 && uploadProgress[question.id] < 100}
                        />
                      )}
                      {uploadProgress[question.id] > 0 && uploadProgress[question.id] < 100 && (
                        <div className="space-y-1">
                           <ShadProgress value={uploadProgress[question.id]} className="w-full h-2" />
                           <p className="text-xs text-muted-foreground text-center">Uploading: {Math.round(uploadProgress[question.id] || 0)}%</p>
                        </div>
                      )}
                       {imagePreviewUrls[question.id] && !uploadErrors[question.id] && !uploadedFileDetails[question.id] && (
                        <div className="mt-2 border rounded-md p-2 bg-muted/20 w-fit shadow">
                            <Image
                                src={imagePreviewUrls[question.id]!}
                                alt="Upload preview"
                                width={150}
                                height={150}
                                className="object-contain rounded max-h-[150px]"
                                data-ai-hint="upload preview"
                            />
                        </div>
                      )}
                      {uploadErrors[question.id] && (
                        <Alert variant="destructive" className="text-xs p-2">
                           <XCircle className="h-4 w-4" />
                          <AlertDescription>{uploadErrors[question.id]}</AlertDescription>
                           <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs mt-1"
                                onClick={() => {
                                    const fileInput = document.getElementById(`${question.id}_file`) as HTMLInputElement;
                                    if (fileInput && fileInput.files && fileInput.files[0]) {
                                        handleFileUpload(question.id, fileInput.files[0]);
                                    } else {
                                        toast({variant: "destructive", title:"Retry Failed", description: "No file selected to retry."})
                                    }
                                }}>Retry</Button>
                        </Alert>
                      )}
                      {uploadedFileDetails[question.id] && (
                        <div className="flex items-center justify-between p-2 border rounded-md bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                            <CheckCircle2 className="h-4 w-4"/>
                            {imagePreviewUrls[question.id] ? (
                                <Image
                                    src={uploadedFileDetails[question.id]!.url}
                                    alt={uploadedFileDetails[question.id]!.name}
                                    width={32}
                                    height={32}
                                    className="object-cover rounded h-8 w-8"
                                    data-ai-hint="file thumbnail"
                                />
                            ): <Paperclip className="h-4 w-4" /> }
                            <a href={uploadedFileDetails[question.id]?.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px] sm:max-w-xs md:max-w-sm">
                              {uploadedFileDetails[question.id]?.name}
                            </a>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeUploadedFile(question.id)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 border-t pt-3 space-y-2">
                     <Label className="text-xs text-muted-foreground block mb-1">Audio Note (Optional, Max 20s)</Label>
                      {micPermissionError && <Alert variant="destructive" className="text-xs p-2"><XCircle className="h-4 w-4" /><AlertDescription>{micPermissionError}</AlertDescription></Alert>}

                      {audioNotes[question.id]?.url && !audioNotes[question.id]?.isUploading && !audioNotes[question.id]?.uploadError ? (
                        <div className="p-3 border rounded-lg bg-muted/50">
                            <audio
                                ref={(el) => (audioRefs.current[question.id] = el)}
                                src={audioNotes[question.id]?.url}
                                onLoadedMetadata={(e) => handleAudioLoadedMetadata(e, question.id)}
                                onTimeUpdate={(e) => handleAudioTimeUpdate(e, question.id)}
                                onEnded={() => handleAudioEnded(question.id)}
                                onPlay={() => setAudioPlayerStates(prev => ({...prev, [question.id]: {...prev[question.id]!, isPlaying: true}}))}
                                onPause={() => setAudioPlayerStates(prev => ({...prev, [question.id]: {...prev[question.id]!, isPlaying: false}}))}
                                className="hidden" // Hide default controls
                            />
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => togglePlayPause(question.id)}
                                    className="h-10 w-10 shrink-0"
                                >
                                    {audioPlayerStates[question.id]?.isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                                </Button>
                                <div className="flex-grow space-y-1">
                                    <progress
                                        value={audioPlayerStates[question.id]?.currentTime || 0}
                                        max={audioPlayerStates[question.id]?.duration || 1} // Use 1 to prevent division by zero if duration is 0
                                        className="w-full h-2 rounded-full overflow-hidden appearance-none [&::-webkit-progress-bar]:bg-slate-300 [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
                                    ></progress>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{formatAudioTime(audioPlayerStates[question.id]?.currentTime || 0)}</span>
                                        <span>{formatAudioTime(audioPlayerStates[question.id]?.duration || 0)}</span>
                                    </div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 shrink-0" onClick={() => removeAudioNote(question.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                      ) : audioNotes[question.id]?.isUploading ? (
                        <div className="space-y-1 p-2 border rounded-md bg-muted/30">
                            <ShadProgress value={audioNotes[question.id]?.uploadProgress || 0} className="w-full h-2" />
                            <p className="text-xs text-muted-foreground text-center">Uploading Audio: {Math.round(audioNotes[question.id]?.uploadProgress || 0)}%</p>
                        </div>
                      ) : audioNotes[question.id]?.uploadError ? (
                         <Alert variant="destructive" className="text-xs p-2">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>{audioNotes[question.id]?.uploadError}</AlertDescription>
                            <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => removeAudioNote(question.id)}>Clear & Retry</Button>
                        </Alert>
                      ) : (
                        <Button
                          type="button"
                          variant={isRecordingQuestionId === question.id ? "destructive" : "outline"}
                          size="sm"
                          onMouseDown={() => handleStartRecording(question.id)}
                          onMouseUp={() => handleStopRecording(question.id)}
                          onTouchStart={() => handleStartRecording(question.id)}
                          onTouchEnd={() => handleStopRecording(question.id)}
                          disabled={isSubmitting || (!!isRecordingQuestionId && isRecordingQuestionId !== question.id)}
                          className="w-full"
                        >
                          {isRecordingQuestionId === question.id ? (
                            <>
                              <Radio className="h-4 w-4 mr-2 animate-pulse text-red-300" /> Recording... (Release to stop)
                            </>
                          ) : (
                            <>
                              <Mic className="h-4 w-4 mr-2" /> Hold to Record Audio
                            </>
                          )}
                        </Button>
                      )}
                  </div>

                </fieldset>
              </Card>
            ))}

            {questionsToRender.length === 0 && conditionallyVisibleQuestions.length > 0 && !isLoading && (
                 <div className="text-center py-10">
                    <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground">No questions match your current filters.</p>
                    <p className="text-sm text-muted-foreground">Try adjusting the section, sub-section, or status filters.</p>
                </div>
            )}

            {conditionallyVisibleQuestions.length === 0 && !isLoading && (
                 <div className="text-center py-10">
                    <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground">No questions are currently visible for this assignment.</p>
                    <p className="text-sm text-muted-foreground">This might be due to conditional logic or an empty assignment. Try changing previous answers or adjusting filters if applicable.</p>
                </div>
            )}


            <div className="flex justify-end pt-6">
              <Button
                type="submit"
                size="lg"
                disabled={
                    isSubmitting ||
                    Object.values(uploadProgress).some(p => p > 0 && p < 100) ||
                    Object.values(audioNotes).some(note => note?.isUploading) ||
                    questionsToRender.length === 0
                }
              >
                <Send className="mr-2 h-5 w-5" />
                {isSubmitting ? "Submitting..." : "Submit Assignment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

