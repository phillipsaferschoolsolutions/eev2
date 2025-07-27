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
import { Progress as ShadProgress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getAssignmentById, getAssignmentDraft, submitCompletedAssignment, saveAssignmentDraft, type AssignmentWithPermissions, type AssignmentQuestion } from "@/services/assignmentFunctionsService";
import { getLocationsForLookup, type Location } from "@/services/locationService";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, ArrowRight, Paperclip, MessageSquare, Save, Send, XCircle, CheckCircle2, Building, Mic, CalendarIcon, Clock, Filter, Trash2, Radio, Badge, PlayIcon, PauseIcon, TimerIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";


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
  const [currentPage, setCurrentPage] = useState(1);
  const assignmentId = typeof params.assignmentId === 'string' ? params.assignmentId : '';

  const [assignment, setAssignment] = useState<AssignmentWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [uploadProgress, setUploadProgress] = useState<{ [questionId: string]: number }>({});
  const [uploadedFileDetails, setUploadedFileDetails] = useState<{ [questionId: string]: UploadedFileDetail | null }>({});
  const [uploadErrors, setUploadErrors] = useState<{ [questionId: string]: string | null }>({});
  const [imagePreviewUrls, setImagePreviewUrls] = useState<{ [questionId: string]: string | null }>({});
  const [photoBankFiles, setPhotoBankFiles] = useState<UploadedFileDetail[]>([]);
  const [photoBankUploads, setPhotoBankUploads] = useState<{ [key: string]: { progress: number; error: string | null } }>({});
  const [isPhotoBankModalOpen, setIsPhotoBankModalOpen] = useState(false);
  const [activeQuestionIdForPhotoBank, setActiveQuestionIdForPhotoBank] = useState<string | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const hours12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const amPm = ["AM", "PM"];


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

  // A more robust parseOptions function that handles multiple possible data formats
const parseOptions = (options: any): { label: string; value: string }[] => {
  if (!options) return [];
  
  // Case 1: It's already the correct format (array of objects with label/value)
  if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'object' && options[0] !== null && 'label' in options[0]) {
    return options.map(opt => ({ label: String(opt.label), value: String(opt.value || opt.label) }));
  }

  // Case 2: It's a simple array of strings
  if (Array.isArray(options)) {
    return options.map(opt => ({ label: String(opt), value: String(opt) }));
  }
  
  // Case 3: It's a semicolon-separated string
  if (typeof options === 'string') {
    return options.split(';').map(opt => opt.trim()).filter(Boolean).map(opt => ({ label: opt, value: opt }));
  }

  // Fallback if the format is unknown
  return [];
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
          conditionValues.includes(opt.value) && allWatchedValues[`${triggerFieldId}.${opt.value}`] === true
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

  // Add this useMemo hook near your other useMemo hooks
  const totalPages = useMemo(() => {
    if (!conditionallyVisibleQuestions || conditionallyVisibleQuestions.length === 0) {
      return 1;
    }
    // Find the maximum page number from the visible questions
    const maxPage = Math.max(...conditionallyVisibleQuestions.map(q => q.pageNumber || 1));
    return maxPage;
  }, [conditionallyVisibleQuestions]);

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
        if (typeof value === 'object' && value !== null && value.hour && value.minute && value.period) {
             return true;
        }
        return false;
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

  const overallProgress = useMemo(() => {
    const totalQuestions = conditionallyVisibleQuestions.length;
    if (totalQuestions === 0) {
      return 0;
    }
    const answeredCount = conditionallyVisibleQuestions.filter(q => isQuestionAnswered(q, allWatchedValues)).length;
    return (answeredCount / totalQuestions) * 100;
  }, [conditionallyVisibleQuestions, allWatchedValues]);

  // Add this near your other useMemo hooks
  const sectionProgress = useMemo(() => {
    const progressData: Record<string, Record<string, { total: number; answered: number; progress: number }>> = {};

    conditionallyVisibleQuestions.forEach(q => {
      const sectionName = q.section || 'Uncategorized';
      const subSectionName = q.subSection || 'General';

      // Initialize section if it doesn't exist
      if (!progressData[sectionName]) {
        progressData[sectionName] = {};
      }
      // Initialize sub-section if it doesn't exist
      if (!progressData[sectionName][subSectionName]) {
        progressData[sectionName][subSectionName] = { total: 0, answered: 0, progress: 0 };
      }

      progressData[sectionName][subSectionName].total++;
      if (isQuestionAnswered(q, allWatchedValues)) {
        progressData[sectionName][subSectionName].answered++;
      }
    });

    // Calculate progress percentage for each sub-section
    for (const section in progressData) {
      for (const subSection in progressData[section]) {
        const { total, answered } = progressData[section][subSection];
        progressData[section][subSection].progress = total > 0 ? (answered / total) * 100 : 0;
      }
    }

    return progressData;
  }, [conditionallyVisibleQuestions, allWatchedValues]);

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
      // THE FIX: Convert q.pageNumber to a number before comparing.
      const pageMatch = (Number(q.pageNumber) || 1) === currentPage;
      if (!pageMatch) return false;

      // Existing filters (no changes needed here)
      const sectionMatch = selectedSection === "all" || (q.section || UNASSIGNED_FILTER_VALUE) === selectedSection;
      const subSectionMatch = selectedSubSection === "all" || (q.subSection || UNASSIGNED_FILTER_VALUE) === selectedSubSection;
      if (!sectionMatch || !subSectionMatch) return false;

      if (answeredStatusFilter === 'all') {
        return true;
      }
      const answered = isQuestionAnswered(q, allWatchedValues);
      return answeredStatusFilter === 'answered' ? answered : !answered;
    });
  }, [conditionallyVisibleQuestions, selectedSection, selectedSubSection, answeredStatusFilter, allWatchedValues, currentPage]);

  const handlePhotoBankUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !assignment) {
      if (!user || !assignment) {
          toast({ variant: "destructive", title: "Upload Error", description: "Cannot upload files without user and assignment context." });
      }
      return;
    }

    const newUploads: { [key: string]: { progress: number; error: string | null } } = {};
    
    Array.from(files).forEach(file => {
      // Basic validation for each file
      if (file.size > 5 * 1024 * 1024) {
        newUploads[file.name] = { progress: 0, error: "File exceeds 5MB limit." };
        return; // Skip this file
      }

      newUploads[file.name] = { progress: 0, error: null };

      const storagePath = `photo_bank/${assignment.id}/${user.uid}/${Date.now()}_${file.name}`;
      const storageRefInstance = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRefInstance, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setPhotoBankUploads(prev => ({
            ...prev,
            [file.name]: { ...prev[file.name], progress, error: null }
          }));
        },
        (error) => {
          console.error(`Upload failed for ${file.name}:`, error);
          setPhotoBankUploads(prev => ({
            ...prev,
            [file.name]: { ...prev[file.name], progress: 0, error: error.message }
          }));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            // Add the successfully uploaded file to the photoBankFiles state
            setPhotoBankFiles(prev => [...prev, { name: file.name, url: downloadURL }]);
            // Update the progress state to show completion and remove from "in-progress" view
            setPhotoBankUploads(prev => {
                const newProgress = { ...prev };
                newProgress[file.name] = { ...newProgress[file.name], progress: 100, error: null };
                // Optionally remove from progress tracker after a delay
                setTimeout(() => {
                    setPhotoBankUploads(p => {
                        const finalProgress = {...p};
                        delete finalProgress[file.name];
                        return finalProgress;
                    });
                }, 2000);

                return newProgress;
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error getting URL.";
            setPhotoBankUploads(prev => ({
              ...prev,
              [file.name]: { ...prev[file.name], progress: 0, error: "Failed to get file URL: " + errorMessage }
            }));
          }
        }
      );
    });

    setPhotoBankUploads(prev => ({ ...prev, ...newUploads }));
    e.target.value = ''; // Clear the input
  };


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

    async function fetchAssignmentAndDraft() {
      setIsLoading(true);
      setError(null);
      try {
        // Step 1: Fetch the main assignment structure
        const fetchedAssignment = await getAssignmentById(assignmentId, userProfile!.account);
        if (!fetchedAssignment) {
          setError("Assignment not found or you do not have permission to access it.");
          toast({ variant: "destructive", title: "Error", description: "Assignment not found." });
          setIsLoading(false);
          return;
        }
        setAssignment(fetchedAssignment);

        // Step 2: Try to fetch the user's draft for this assignment
        const draftData = userProfile?.account ? await getAssignmentDraft(assignmentId, userProfile.account) : null;
        
        const defaultVals: FieldValues = {};
        
        if (draftData) {
          // If a draft exists, use its data to populate the form
          toast({ title: "Draft Loaded", description: "Your previous progress has been restored." });
          
          // Populate form fields from the draft
          reset(draftData.formValues || {});

          // Restore uploaded file details and audio notes from the draft
          setUploadedFileDetails(draftData.uploadedFileDetails || {});
          setAudioNotes(draftData.audioNotes || {});

        } else {
          // If no draft exists, set up the form with default values
          const now = new Date();
          fetchedAssignment.questions.forEach(q => {
            if (q.component === 'date' || q.component === 'completionDate') {
              defaultVals[q.id] = new Date(); 
            } else if (q.component === 'time' || q.component === 'completionTime') {
                let currentHour12 = now.getHours();
                const currentPeriod = currentHour12 >= 12 ? "PM" : "AM";
                currentHour12 = currentHour12 % 12;
                currentHour12 = currentHour12 ? currentHour12 : 12; 

                defaultVals[q.id] = {
                    hour: String(currentHour12),
                    minute: String(now.getMinutes()).padStart(2, '0'),
                    period: currentPeriod
                };
            } else if (q.component === 'checkbox' && q.options) {
              parseOptions(q.options).forEach(opt => {
                defaultVals[`${q.id}.${opt}`] = false;
              });
            } else {
              defaultVals[q.id] = '';
            }
            if (q.comment) defaultVals[`${q.id}_comment`] = '';
          });
          reset(defaultVals);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Failed to load assignment data: ${errorMessage}`);
        toast({ variant: "destructive", title: "Loading Failed", description: errorMessage });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAssignmentAndDraft();
  }, [assignmentId, user, userProfile?.account, authLoading, profileLoading, reset, toast, router, pathname]);

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
      Object.values(audioRefs.current).forEach(audioEl => {
        if (audioEl) {
          audioEl.pause();
          audioEl.removeAttribute('src');
          audioEl.load();
        }
      });
      Object.values(audioNotes).forEach(note => {
        if (note?.url && note.url.startsWith('blob:')) {
          URL.revokeObjectURL(note.url);
        }
      });
    };
  }, []);

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

  const playChime = (type: 'start' | 'stop') => {
    try {
        const audioFile = type === 'start' ? '/audio/start-chime.mp3' : '/audio/stop-chime.mp3';
        const chime = new Audio(audioFile);
        chime.play().catch(e => console.warn(`Chime play error: ${(e as Error).message}`));
    } catch (e) {
        console.warn(`Could not play chime: ${e}`);
    }
  };

  const handleStartRecording = async (questionId: string) => {
    const permissionGranted = await requestMicPermission();
    if (!permissionGranted) return;

    if (isRecordingQuestionId) {
      handleStopRecording(isRecordingQuestionId, false);
    }

    setIsRecordingQuestionId(questionId);
    audioChunksRef.current = [];
     setAudioNotes(prev => ({
      ...prev,
      [questionId]: {
        blob: undefined, url: undefined, name: undefined,
        isUploading: false, uploadProgress: 0, uploadError: null, downloadURL: undefined
      }
    }));
    setAudioPlayerStates(prev => ({ ...prev, [questionId]: { isPlaying: false, currentTime: 0, duration: 0 } }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      playChime('start');

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const oldNote = audioNotes[questionId];
        if (oldNote?.url && oldNote.url.startsWith('blob:')) {
          URL.revokeObjectURL(oldNote.url);
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioName = `audio_note_${questionId}_${Date.now()}.webm`;

        setAudioNotes(prev => ({
          ...prev,
          [questionId]: {
            blob: audioBlob, url: audioUrl, name: audioName,
            isUploading: false, uploadProgress: 0, uploadError: null, downloadURL: undefined
          }
        }));
        playChime('stop');
        
        // Ensure UI reflects recording stopped state reliably here
        if (isRecordingQuestionId === questionId) {
           setIsRecordingQuestionId(null);
        }

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
        if (isRecordingQuestionId === questionId) setIsRecordingQuestionId(null);
        if (maxRecordingTimerRef.current) clearTimeout(maxRecordingTimerRef.current);
      };

      mediaRecorderRef.current.start();
      maxRecordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording" && isRecordingQuestionId === questionId) {
          handleStopRecording(questionId, true);
          toast({ title: "Recording Limit Reached", description: `Recording stopped after ${MAX_AUDIO_RECORDING_MS / 1000} seconds.`});
        }
      }, MAX_AUDIO_RECORDING_MS);

    } catch (error) {
      console.error('Error starting recording:', error);
      setMicPermissionError('Failed to start recording.');
      if (isRecordingQuestionId === questionId) setIsRecordingQuestionId(null);
      if (maxRecordingTimerRef.current) clearTimeout(maxRecordingTimerRef.current);
    }
  };

  const handleStopRecording = (questionId: string, playTheStopChime: boolean = true) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop(); // This will trigger 'onstop' where isRecordingQuestionId is set to null
    } else if(isRecordingQuestionId === questionId) {
      // If recorder isn't "recording" but UI thinks it is for this question, reset UI
      setIsRecordingQuestionId(null);
    }

    if (maxRecordingTimerRef.current) {
        clearTimeout(maxRecordingTimerRef.current);
        maxRecordingTimerRef.current = null;
    }
  };

  const removeAudioNote = (questionId: string) => {
    const note = audioNotes[questionId];
    if (note?.url && note.url.startsWith('blob:')) {
      URL.revokeObjectURL(note.url);
    }
    setAudioNotes(prev => ({ ...prev, [questionId]: null }));
    setAudioPlayerStates(prev => ({ ...prev, [questionId]: { isPlaying: false, currentTime: 0, duration: 0 } }));
    const audioEl = audioRefs.current[questionId];
    if (audioEl) {
        audioEl.pause();
        audioEl.removeAttribute('src');
        audioEl.load();
    }
  };

 const togglePlayPause = async (questionId: string) => {
    const audio = audioRefs.current[questionId];
    const note = audioNotes[questionId];
    const noteUrl = note?.url;

    if (!audio || !noteUrl) {
      console.error("Audio element or note URL missing for playback:", questionId, noteUrl);
      toast({variant: "destructive", title: "Playback Error", description: "Audio source missing."});
      return;
    }

    try {
      if (audio.paused) {
        if (!audio.currentSrc || audio.currentSrc !== noteUrl) {
          audio.src = noteUrl;
          audio.load(); 

          await new Promise<void>((resolve, reject) => {
            const canPlayHandler = () => {
              audio.removeEventListener('canplay', canPlayHandler);
              audio.removeEventListener('error', errorHandler);
              resolve();
            };
            const errorHandler = (e: Event) => {
              audio.removeEventListener('canplay', canPlayHandler);
              audio.removeEventListener('error', errorHandler);
              const mediaError = (e.target as HTMLAudioElement).error;
              reject(new Error(`Error loading audio: ${mediaError?.message || 'Unknown error'}`));
            };
            audio.addEventListener('canplay', canPlayHandler, { once: true });
            audio.addEventListener('error', errorHandler, { once: true });
          });
        }
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error: any) {
      console.error(`[togglePlayPause] Error for ${questionId}: ${error.name} - ${error.message}`);
      toast({ variant: "destructive", title: "Playback Error", description: error.message });
      if (audio.paused && audioPlayerStates[questionId]?.isPlaying) {
        setAudioPlayerStates(prev => ({
          ...prev,
          [questionId]: { ...prev[questionId]!, isPlaying: false }
        }));
      }
    }
  };

  const handleAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement, Event>, questionId: string) => {
    const audio = e.currentTarget;
    const currentDuration = audioPlayerStates[questionId]?.duration || 0;
    setAudioPlayerStates(prev => ({ 
        ...prev, 
        [questionId]: { 
            ...prev[questionId]!, 
            currentTime: Math.min(audio.currentTime, currentDuration), // Cap currentTime at duration
            duration: currentDuration 
        } 
    }));
  };

  const handleAudioLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement, Event>, questionId: string) => {
    const audio = e.currentTarget;
    let newDuration = audio.duration;
    if (isNaN(newDuration) || !isFinite(newDuration) || newDuration <= 0) {
        newDuration = 0; // Default to 0 if duration is invalid
    }
    setAudioPlayerStates(prev => ({ 
        ...prev, 
        [questionId]: { 
            ...prev[questionId]!, 
            duration: newDuration, 
            currentTime: 0 // Reset currentTime when metadata loads
        } 
    }));
  };
  
  const handleAudioEnded = (questionId: string) => {
     setAudioPlayerStates(prev => ({ 
        ...prev, 
        [questionId]: { 
            ...prev[questionId]!, 
            isPlaying: false, 
            currentTime: 0 // Reset currentTime on end
        } 
    }));
      if (audioRefs.current[questionId]) {
        audioRefs.current[questionId]!.currentTime = 0;
      }
  };

  const formatAudioTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds) || timeInSeconds < 0) {
        return "0:00";
    }
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleOpenPhotoBank = (questionId: string) => {
    if (photoBankFiles.length === 0) {
      toast({
        variant: "default",
        title: "Photo Bank is Empty",
        description: "Please upload photos to the Photo Bank first.",
      });
      return;
    }
    setActiveQuestionIdForPhotoBank(questionId);
    setIsPhotoBankModalOpen(true);
  };

  const handleSelectPhotoFromBank = (photo: UploadedFileDetail) => {
    if (!activeQuestionIdForPhotoBank) return;

    // Associate the selected photo with the active question
    setUploadedFileDetails(prev => ({
      ...prev,
      [activeQuestionIdForPhotoBank]: photo
    }));

    // Reset and close the modal
    setIsPhotoBankModalOpen(false);
    setActiveQuestionIdForPhotoBank(null);
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
    const fileInput = document.getElementById(`${questionId}_file`) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSaveDraft = async () => {
    if (!userProfile?.account || !assignmentId) {
        toast({ variant: "destructive", title: "Cannot Save Draft", description: "User account or assignment ID is missing." });
        return;
    }

    // Use getValues() to get the current form state without triggering validation
    const draftData = getValues();
    
    const dataToSave = {
      formValues: draftData,
      uploadedFileDetails: uploadedFileDetails,
      audioNotes: audioNotes,
      savedAt: new Date().toISOString(),
    };

    setIsSubmitting(true); // Disable buttons while saving
    toast({ title: "Saving Draft...", description: "Please wait." });

    try {
      // Call the new service function
      await saveAssignmentDraft(assignmentId, dataToSave, userProfile.account);
      
      toast({
        title: "Draft Saved Successfully",
        description: "Your progress has been saved.",
      });
    } catch (error: any) {
      console.error("Failed to save draft:", error);
      toast({
        variant: "destructive",
        title: "Error Saving Draft",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsSubmitting(false); // Re-enable buttons
    }
  };




  const onSubmit: SubmitHandler<FormDataSchema> = async (data) => {
    if (!assignment || !userProfile?.account || !user || !user.email) {
        toast({ variant: "destructive", title: "Submission Error", description: "Cannot submit, critical assignment or user account data missing." });
        return;
    }
    setIsSubmitting(true);

    const finalAudioNotesForSubmission: Record<string, { name?: string; url?: string }> = {};
    const audioUploadPromises: Promise<void>[] = [];

    Object.keys(audioNotes).forEach(questionId => {
        const note = audioNotes[questionId];
        if (note?.blob && !note.downloadURL && !note.isUploading) {
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
                      // Ensure this is populated correctly for submission
                      finalAudioNotesForSubmission[questionId] = { name: audioFileName, url: url };
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
        } else if (note?.downloadURL) { 
            finalAudioNotesForSubmission[questionId] = { name: note.name, url: note.downloadURL };
        }
    });

    try {
        await Promise.all(audioUploadPromises);
    } catch (error) {
      toast({ variant: "destructive", title: "Audio Upload Failed", description: `One or more audio notes could not be uploaded. Please review any errors and try again.` });
      setIsSubmitting(false);
      return;
    }

    const formDataForSubmission = new FormData();
    const answersObject: Record<string, any> = {};
    const photoLinksForSync: Record<string, string> = {};
    const commentsObject: Record<string, string> = {};

    console.log("--- Processing questions for submission ---");
    conditionallyVisibleQuestions.forEach((question, idx) => {
        console.log(`Processing question ${idx + 1} (ID: ${question.id}, Label: ${question.label})`);
        let questionAnswer: any;

        // Check if the component is a multi-option checkbox
        // Clean, single‐pass checkbox handler:
        if (question.component === 'checkbox' && question.options) {
          const selectedOptions = parseOptions(question.options)
            .filter(opt => data[`${question.id}.${opt.value}`] === true)
            .map(opt => opt.value);

          // Always send an array (even if empty)
          questionAnswer = selectedOptions;
        } else if ((question.component === 'multiButtonSelect' || question.component === 'multiSelect') && question.options && Array.isArray(parseOptions(question.options))) {
             const selectedOptions: string[] = [];
             parseOptions(question.options).forEach(opt => {
               if (data[`${question.id}.${opt.value}`]) {
                   selectedOptions.push(opt.value);
                }
            });
            questionAnswer = selectedOptions;//.join(',');
        } else if (question.component === 'checkbox' && !question.options) {
             questionAnswer = data[question.id] ?? false;
        } else if ((question.component === 'date' || question.component === 'completionDate') && data[question.id] instanceof Date) {
            questionAnswer = format(data[question.id] as Date, "yyyy-MM-dd");
        } else if ((question.component === 'time' || question.component === 'completionTime')) {
            const timeValue = data[question.id] as { hour: string, minute: string, period: "AM" | "PM" };
            if (typeof timeValue === 'object' && timeValue !== null && timeValue.hour && timeValue.minute && timeValue.period) {
                let hour = parseInt(timeValue.hour, 10);
                if (timeValue.period === 'PM' && hour !== 12) hour += 12;
                if (timeValue.period === 'AM' && hour === 12) hour = 0; 
                questionAnswer = `${String(hour).padStart(2, '0')}:${String(timeValue.minute).padStart(2, '0')}`;
            } else {
                questionAnswer = "00:00"; 
            }
        } else if (question.component === 'range') { 
             questionAnswer = data[question.id] ?? 0;
        } else { 
            questionAnswer = data[question.id] ?? ""; 
        }
        answersObject[question.id] = questionAnswer;
        console.log(`  -> Answer for ${question.id}:`, questionAnswer);

        const commentText = data[`${question.id}_comment`];
        if (question.comment && typeof commentText === 'string' && commentText.trim() !== '') {
            commentsObject[question.id] = commentText.trim();
            console.log(`  -> Comment for ${question.id}: "${commentText.trim()}"`);
        } else if (question.comment) {
            console.log(`  -> Comment for ${question.id}: (empty or not a string)`);
        }


        if (question.photoUpload && uploadedFileDetails[question.id]?.url) {
            photoLinksForSync[question.id] = uploadedFileDetails[question.id]!.url;
        }
    });

    console.log("Final Comments Object for submission:", commentsObject);
    console.log("Final Answers Object for submission:", answersObject);
    console.log("Final Audio Notes for submission:", finalAudioNotesForSubmission);

    formDataForSubmission.append("content", JSON.stringify(answersObject));

    if (Object.keys(photoLinksForSync).length > 0) {
      formDataForSubmission.append("syncPhotoLinks", JSON.stringify(photoLinksForSync));
    }
    formDataForSubmission.append("commentsData", JSON.stringify(commentsObject));
    formDataForSubmission.append("audioNotesData", Object.keys(finalAudioNotesForSubmission).length > 0 ? JSON.stringify(finalAudioNotesForSubmission) : "{}");

    formDataForSubmission.append("assessmentName", assignment.assessmentName || "Unnamed Assignment");
    formDataForSubmission.append("account", userProfile.account);
    formDataForSubmission.append("completedBy", user.email);
    formDataForSubmission.append("completedTime", new Date().toISOString()); 
    formDataForSubmission.append("status", "completed");
    formDataForSubmission.append("submittedOnPlatform", "web");
    formDataForSubmission.append("locationName", userProfile?.locationName || "Location Missing");


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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start p-4 md:p-6">
      {/* Main Content Column */}
      <div className="space-y-6 lg:col-span-3">
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
                <div className="mb-4">
                  <Label className="text-sm font-medium">Overall Progress</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <ShadProgress value={overallProgress} className="w-full h-2.5" />
                    <span className="text-sm font-semibold">{Math.round(overallProgress)}%</span>
                  </div>
                </div>
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
                  <Select value={selectedSubSection} onValueChange={setSelectedSubSection}>
                    <SelectTrigger id="filter-subsection" disabled={selectedSection === "all" && availableSubSections.length <= 1 && availableSubSections.every(s => s === UNASSIGNED_FILTER_VALUE)}><SelectValue placeholder="Filter by sub-section..." /></SelectTrigger>
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

            {/* Photo Bank Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Photo Bank</CardTitle>
                <CardDescription>
                  Upload all your photos for this assignment here. You can then associate them with specific questions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Replace the placeholder div with this file input component */}
                <div className="mt-4">
                  <Label 
                    htmlFor="photo-bank-upload" 
                    className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Paperclip className="w-8 h-8 mb-4 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">SVG, PNG, JPG or GIF (MAX. 5MB per file)</p>
                    </div>
                    <Input 
                      id="photo-bank-upload" 
                      type="file" 
                      multiple 
                      className="sr-only" 
                      onChange={handlePhotoBankUpload} // We will create this function next
                      accept="image/*"
                    />
                  </Label> 
                </div> 

                {/* Display upload progress for Photo Bank */}
                {Object.keys(photoBankUploads).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Uploads in Progress</p>
                    {Object.entries(photoBankUploads).map(([fileName, status]) => (
                      <div key={fileName}>
                        <div className="flex justify-between items-center text-sm">
                          <p className="truncate max-w-xs">{fileName}</p>
                          {status.progress < 100 && !status.error && <p>{Math.round(status.progress)}%</p>}
                          {status.progress === 100 && !status.error && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {status.error && <XCircle className="h-4 w-4 text-destructive" />}
                        </div>
                        {status.error ? (
                          <p className="text-xs text-destructive">{status.error}</p>
                        ) : (
                          <ShadProgress value={status.progress} className="h-1" />
                        )}
                      </div>
                    ))}
                  </div>
                )}


                {/* Display uploaded photos */}
                {photoBankFiles.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {photoBankFiles.map((file, index) => (
                      <div key={index} className="relative">
                        <Image
                          src={file.url}
                          alt={file.name}
                          width={150}
                          height={150}
                          className="object-cover rounded-md"
                          data-ai-hint="photo bank image"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {questionsToRender.map((question, index) => {
                const questionLabelContent = typeof question.label === 'string'
                  ? question.label
                  : (typeof question.label === 'object' && question.label !== null && 'label' in question.label && typeof (question.label as any).label === 'string')
                    ? (question.label as any).label
                    : `Question ${index + 1}`; // Fallback if label is malformed

                return (
                <Card key={question.id || index} className="p-6 bg-card/50">
                  <fieldset className="space-y-3">
                    <Label htmlFor={question.id} className="text-lg font-semibold text-foreground">
                      {questionsToRender.length > 0 ? `${questionsToRender.indexOf(question) + 1}` : index + 1}. {questionLabelContent}
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

                      {/* Added rendering for staticContent */}
                      {question.component === "staticContent" && (
                        <div className="prose dark:prose-invert max-w-none"> {/* Using prose for basic styling */}
                          {/* Assuming static content is stored in question.options as a string */}
                          <p>{question.options as string}</p>
                        </div>
                      )}


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
                              const timeValue = field.value as { hour: string, minute: string, period: "AM" | "PM" } || { hour: '12', minute: '00', period: 'PM' };
                              return (
                                  <div className="flex items-center gap-2 bg-background p-2 rounded-md border">
                                  <Clock className="h-5 w-5 text-muted-foreground mr-1" />
                                  <Select
                                      value={timeValue.hour}
                                      onValueChange={(hour) => field.onChange({ ...timeValue, hour })}
                                  >
                                      <SelectTrigger className="w-[80px]"><SelectValue placeholder="HH" /></SelectTrigger>
                                      <SelectContent>{hours12.map(h => <SelectItem key={`h-${h}`} value={h}>{h}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <span className="font-semibold">:</span>
                                  <Select
                                      value={timeValue.minute}
                                      onValueChange={(minute) => field.onChange({ ...timeValue, minute })}
                                  >
                                      <SelectTrigger className="w-[80px]"><SelectValue placeholder="MM" /></SelectTrigger>
                                      <SelectContent>{minutes.map(m => <SelectItem key={`m-${m}`} value={m}>{m}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select
                                      value={timeValue.period}
                                       onValueChange={(period: string) => field.onChange({ ...timeValue, period: period as "AM" | "PM" })}
                                  >
                                      <SelectTrigger className="w-[90px]"><SelectValue placeholder="AM/PM" /></SelectTrigger>
                                      <SelectContent>{amPm.map(p => <SelectItem key={`p-${p}`} value={p}>{p}</SelectItem>)}</SelectContent>
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
                            {parseOptions(question.options).map(opt => (
                              <div key={opt.value} className="flex items-center space-x-3">
                                <RadioGroupItem value={opt.value} id={`${question.id}-${opt.value}`} />
                                <Label htmlFor={`${question.id}-${opt.value}`}>{opt.label}</Label>
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
                            {parseOptions(question.options).map(opt => (
                                <div key={opt.value} className="flex items-center">
                                    <RadioGroupItem value={opt.value} id={`${question.id}-${opt.value}`} className="sr-only peer" />
                                    <Label htmlFor={`${question.id}-${opt.value}`}
                                        className="px-3 py-2 border rounded-md cursor-pointer peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground hover:bg-muted/50">
                                        {opt.label}
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
                                      <SelectValue placeholder={`Select an option for "${questionLabelContent}"`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {parseOptions(question.options).map(opt => (
                                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                                    id={`${question.id}-checkbox`}
                                    checked={field.value || false}
                                    onCheckedChange={(checked) => field.onChange(checked === true)}
                                  />
                                  <Label htmlFor={`${question.id}-checkbox`} className="cursor-pointer">
                                  </Label>
                              </div>
                          )}
                      />
                    )}

                    {question.component === 'checkbox' && question.options && (
                      <div className="space-y-2 bg-background p-2 rounded-md">
                          {parseOptions(question.options).map(opt => (
                            <Controller
                                key={opt.value}
                                name={`${question.id}.${opt.value}`}
                                control={control}
                                defaultValue={false}
                                render={({ field }) => (
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`${question.id}-${opt.value}`}
                                          checked={field.value || false}
                                          onCheckedChange={(checked) => field.onChange(checked === true)}
                                        />
                                        <Label htmlFor={`${question.id}-${opt.value}`} className="font-normal">{opt.label}</Label>
                                    </div>
                                )}
                              />
                          ))}
                      </div>
                    )}

                    {(question.component === 'multiButtonSelect' || question.component === 'multiSelect') && question.options && (
                      <div className="space-y-2 bg-background p-2 rounded-md">
                          <Label className="text-sm text-muted-foreground block mb-1">Select one or more:</Label>
                          {/* The .map() function now includes 'index' */}
                          {parseOptions(question.options).map((opt, index) => (
                              <Controller
                                  // THE FIX: The key now uses the index to ensure it is always unique.
                                  key={`${opt.value}-${index}`}
                                  name={`${question.id}.${opt.value}`}
                                  control={control}
                                  defaultValue={false}
                                  render={({ field }) => (
                                      <div className="flex items-center space-x-2">
                                          <Checkbox 
                                            id={`${question.id}-${opt.value}`}
                                            checked={field.value || false}
                                            onCheckedChange={(checked) => field.onChange(checked === true)} 
                                            />
                                          <Label htmlFor={`${question.id}-${opt.value}-${index}`} className="font-normal">{opt.label}</Label>
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
                      <div className="mt-4 space-y-3">
                        {/* Display for the selected/uploaded photo (no change here) */}
                        {uploadedFileDetails[question.id] && (
                          <div className="flex items-center justify-between p-2 border rounded-md bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                              <CheckCircle2 className="h-4 w-4"/>
                              <Image
                                  src={uploadedFileDetails[question.id]!.url}
                                  alt={uploadedFileDetails[question.id]!.name}
                                  width={32}
                                  height={32}
                                  className="object-cover rounded h-8 w-8"
                                  data-ai-hint="file thumbnail"
                              />
                              <a href={uploadedFileDetails[question.id]?.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px] sm:max-w-xs md:max-w-sm">
                                {uploadedFileDetails[question.id]?.name}
                              </a>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeUploadedFile(question.id)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {/* If no photo is associated, show both upload options */}
                        {!uploadedFileDetails[question.id] && (
                          <div className="p-3 border rounded-lg bg-muted/20">
                            
                            {/* Option 1: Direct Upload */}
                            <div className="space-y-2">
                              <Label htmlFor={`${question.id}_file`} className="text-sm font-medium">
                                Option 1: Upload a file directly
                              </Label>
                              <Input
                                id={`${question.id}_file`}
                                type="file"
                                accept="image/*"
                                className="bg-background"
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileUpload(question.id, e.target.files[0]);
                                  }
                                }}
                                disabled={!!uploadProgress[question.id] && uploadProgress[question.id] > 0 && uploadProgress[question.id] < 100}
                              />
                            </div>

                            {/* Progress and Preview for Direct Upload */}
                            {uploadProgress[question.id] > 0 && (
                              <div className="mt-2 space-y-1">
                                <ShadProgress value={uploadProgress[question.id]} className="w-full h-1.5" />
                                {uploadProgress[question.id] < 100 && <p className="text-xs text-muted-foreground text-center">Uploading...</p>}
                              </div>
                            )}
                            {imagePreviewUrls[question.id] && !uploadErrors[question.id] && (
                              <div className="mt-2 w-fit">
                                <Image
                                    src={imagePreviewUrls[question.id]!}
                                    alt="Upload preview"
                                    width={100}
                                    height={100}
                                    className="object-contain rounded-md border"
                                    data-ai-hint="upload preview"
                                />
                              </div>
                            )}
                            {uploadErrors[question.id] && (
                              <Alert variant="destructive" className="text-xs p-2 mt-2">
                                <XCircle className="h-4 w-4" />
                                <AlertDescription>{uploadErrors[question.id]}</AlertDescription>
                              </Alert>
                            )}

                            {/* Separator */}
                            <div className="relative flex items-center my-4">
                              <div className="flex-grow border-t border-muted-foreground/30"></div>
                              <span className="flex-shrink mx-4 text-muted-foreground text-xs font-semibold">OR</span>
                              <div className="flex-grow border-t border-muted-foreground/30"></div>
                            </div>

                            {/* Option 2: Select from Photo Bank */}
                            <div>
                              <Label className="text-sm font-medium">
                                Option 2: Select from Photo Bank
                              </Label>
                              <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full mt-1 bg-background"
                                onClick={() => handleOpenPhotoBank(question.id)}
                              >
                                <Paperclip className="h-4 w-4 mr-2"/>
                                Select Photo
                              </Button>
                            </div>

                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4 border-t pt-3 space-y-2">
                      <Label className="text-xs text-muted-foreground block mb-1">Audio Note (Optional, Max {MAX_AUDIO_RECORDING_MS / 1000}s)</Label>
                        {micPermissionError && <Alert variant="destructive" className="text-xs p-2"><XCircle className="h-4 w-4" /><AlertDescription>{micPermissionError}</AlertDescription></Alert>}

                        {audioNotes[question.id]?.url && (
                          <audio
                              ref={(el) => {audioRefs.current[question.id] = el;}}
                              onLoadedMetadata={(e) => handleAudioLoadedMetadata(e, question.id)}
                              onTimeUpdate={(e) => handleAudioTimeUpdate(e, question.id)}
                              onEnded={() => handleAudioEnded(question.id)}
                              onPlay={() => setAudioPlayerStates(prev => ({...prev, [question.id]: {...(prev[question.id] || {currentTime:0, duration:0, isPlaying: false}), isPlaying: true}}))}
                              onPause={() => setAudioPlayerStates(prev => ({...prev, [question.id]: {...(prev[question.id] || {currentTime:0, duration:0, isPlaying: true}), isPlaying: false}}))}
                              className="hidden"
                          />
                        )}

                        {audioNotes[question.id]?.url && !audioNotes[question.id]?.isUploading && !audioNotes[question.id]?.uploadError && (
                          <div className="p-3 border rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                                  <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => togglePlayPause(question.id)}
                                      className="h-10 w-10 shrink-0 rounded-full"
                                      disabled={!audioNotes[question.id]?.url || audioNotes[question.id]?.isUploading}
                                  >
                                      {audioPlayerStates[question.id]?.isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                                  </Button>
                                  <div className="flex-grow space-y-1">
                                      <Slider
                                          value={[audioPlayerStates[question.id]?.currentTime || 0]}
                                          max={audioPlayerStates[question.id]?.duration || 1}
                                          step={0.1}
                                          className="w-full h-2 [&>span]:h-2 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border"
                                          disabled={!audioNotes[question.id]?.url || audioNotes[question.id]?.isUploading}
                                      />
                                      <div className="flex justify-between text-xs text-muted-foreground">
                                          <span>{formatAudioTime(audioPlayerStates[question.id]?.currentTime || 0)}</span>
                                          <span>{formatAudioTime(audioPlayerStates[question.id]?.duration || 0)}</span>
                                      </div>
                                  </div>
                                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 shrink-0 h-8 w-8" onClick={() => removeAudioNote(question.id)}  disabled={audioNotes[question.id]?.isUploading}>
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                          </div>
                        )}
                        {audioNotes[question.id]?.isUploading && (
                          <div className="space-y-1 p-2 border rounded-md bg-muted/30">
                              <ShadProgress value={audioNotes[question.id]?.uploadProgress || 0} className="w-full h-2" />
                              <p className="text-xs text-muted-foreground text-center">Uploading Audio: {Math.round(audioNotes[question.id]?.uploadProgress || 0)}%</p>
                          </div>
                        )}
                        {audioNotes[question.id]?.uploadError && (
                          <Alert variant="destructive" className="text-xs p-2">
                              <XCircle className="h-4 w-4" />
                              <AlertDescription>{audioNotes[question.id]?.uploadError}</AlertDescription>
                              <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => removeAudioNote(question.id)}>Clear & Retry</Button>
                          </Alert>
                        )}
                        {!audioNotes[question.id]?.url && !audioNotes[question.id]?.isUploading && !audioNotes[question.id]?.uploadError && (
                          <Button
                            type="button"
                            variant={isRecordingQuestionId === question.id ? "destructive" : "outline"}
                            size="sm"
                            onMouseDown={() => handleStartRecording(question.id)}
                            onMouseUp={() => handleStopRecording(question.id, true)}
                            onTouchStart={(e) => { e.preventDefault(); handleStartRecording(question.id);}}
                            onTouchEnd={(e) => { e.preventDefault(); handleStopRecording(question.id, true);}}
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
                );
              })}

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

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous Page
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                >
                  Next Page
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="flex justify-end pt-6">
                {/* Add this Button for saving drafts, next to the submit button */}
                  <Button
                    type="button" // Use type="button" to prevent form submission
                    variant="outline" // Use a different style to distinguish from the main submit button
                    size="lg"
                    onClick={handleSaveDraft} // We will create this function next
                    disabled={isSubmitting} // Disable when a submission is in progress
                    className="mr-2" // <-- ADD THIS CLASS
                  >
                    <Save className="mr-2 h-5 w-5" /> {/* Using a Save icon */}
                    Save Draft
                  </Button>

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
        <Dialog open={isPhotoBankModalOpen} onOpenChange={setIsPhotoBankModalOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Select a Photo from the Bank</DialogTitle>
              <DialogDescription>
                Click on a photo to associate it with the question.
              </DialogDescription>
            </DialogHeader>
            {photoBankFiles.length > 0 ? (
              <ScrollArea className="max-h-[60vh]">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                  {photoBankFiles.map((photo, index) => (
                    <div 
                      key={index} 
                      className="relative aspect-square cursor-pointer group"
                      onClick={() => handleSelectPhotoFromBank(photo)}
                    >
                      <Image
                        src={photo.url}
                        alt={photo.name}
                        fill
                        className="object-cover rounded-md"
                        data-ai-hint="select photo"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <CheckCircle2 className="h-8 w-8 text-white"/>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="py-8 text-center text-muted-foreground">The Photo Bank is empty. Please upload photos first.</p>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Sidebar Column */}
      <div className="space-y-6 lg:col-span-1">
        {/* Progress Card */}
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-lg">Section Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(sectionProgress).length > 0 ? (
              Object.entries(sectionProgress).map(([sectionName, subSections]) => (
                <div key={sectionName} className="space-y-3">
                  <h4 className="font-semibold">{sectionName}</h4>
                  {Object.entries(subSections).map(([subSectionName, data]) => (
                    <div key={subSectionName} className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span>{subSectionName}</span>
                        <span className="font-medium">{Math.round(data.progress)}%</span>
                      </div>
                      <ShadProgress value={data.progress} className="h-1.5" />
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center">No sections with questions found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}