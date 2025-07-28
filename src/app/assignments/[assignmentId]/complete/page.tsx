"use client";

import { useEffect, useState, ChangeEvent, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useForm, Controller, type SubmitHandler, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

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


  const { control, register, handleSubmit, watch, reset, formState: { errors: formErrors }, getValues } = useForm<FormDataSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const allWatchedValues = watch();

  // A more robust parseOptions function that handles multiple possible data formats
  type OptionInput = string | string[] | { label: string; value?: string }[];
  const parseOptions = (options: OptionInput, question?: AssignmentQuestion): { label: string; value: string }[] => {
    // Special handling for schoolSelector - use locations instead of question.options
    if (question?.component === 'schoolSelector') {
      const mapped = locations.map(location => {
        console.log('Location data:', location); // Debug log
        return {
          label: location.locationName || location.name || 'Unknown Location',
          value: location.id
        };
      });
      return mapped as { label: string; value: string }[];
    }
    
    // Case 1: It's already an array of objects with label/value properties
    if (
      Array.isArray(options) && 
      options.length > 0 && 
      typeof options[0] === 'object' && 
      options[0] !== null && 
      'label' in options[0]
    ) {
        const objectOptions = options as { label: string; value?: string }[];
        return objectOptions.map(opt => ({ label: String(opt.label), value: String(opt.value ?? opt.label) }));
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
        const options = parseOptions(triggerQuestion.options, triggerQuestion);
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
  }, [assignment?.questions, allWatchedValues, shouldBeVisible]);

  // Add this useMemo hook near your other useMemo hooks
  const totalPages = useMemo(() => {
    if (!conditionallyVisibleQuestions || conditionallyVisibleQuestions.length === 0) {
      return 1;
    }
    // Find the maximum page number from the visible questions
    const maxPage = Math.max(...conditionallyVisibleQuestions.map(q => q.pageNumber || 1));
    return maxPage;
  }, [conditionallyVisibleQuestions]);

  const isQuestionAnswered = useCallback((question: AssignmentQuestion, formData: FieldValues): boolean => {
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
          const options = parseOptions(question.options, question);
          return options.some(opt => formData[`${question.id}.${opt.value}`] === true);
        } else {
          return value === true;
        }
      case 'multiButtonSelect':
      case 'multiSelect':
        if (question.options) {
          const options = parseOptions(question.options, question);
          return options.some(opt => formData[`${question.id}.${opt.value}`] === true);
        }
        return false;
      case 'photoUpload':
        return !!uploadedFileDetails[question.id];
      default:
        return false;
    }
  }, [uploadedFileDetails, locations]);

  const overallProgress = useMemo(() => {
    const totalQuestions = conditionallyVisibleQuestions.length;
    if (totalQuestions === 0) {
      return 0;
    }
    const answeredCount = conditionallyVisibleQuestions.filter(q => isQuestionAnswered(q, allWatchedValues)).length;
    return (answeredCount / totalQuestions) * 100;
  }, [conditionallyVisibleQuestions, allWatchedValues, isQuestionAnswered]);

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
  }, [conditionallyVisibleQuestions, allWatchedValues, isQuestionAnswered]);

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
  }, [conditionallyVisibleQuestions, selectedSection, selectedSubSection, answeredStatusFilter, allWatchedValues, currentPage, isQuestionAnswered]);

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
          setUploadedFileDetails(
            (draftData.uploadedFileDetails || {}) as { [questionId: string]: UploadedFileDetail | null }
          );
          setAudioNotes(
            (draftData.audioNotes || {}) as { [questionId: string]: AudioNoteDetail | null }
          );

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
              parseOptions(q.options, q).forEach(opt => {
                defaultVals[`${q.id}.${opt.value}`] = false;
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
      console.log("There is a schoolSelector Item")
      setIsLoadingLocations(true);
      setLocationsError(null);
      getLocationsForLookup(userProfile.account)
        .then(fetchedLocations => {
          console.log("These are the fetched locations: ", fetchedLocations);
          setLocations(fetchedLocations);
        })
        .catch(err => {
          console.error("Failed to fetch locations for schoolSelector:", err);
          setLocationsError(err.message || "Could not load locations.");
          toast({ variant: "destructive", title: "Error Loading Locations", description: err.message });
        })
        .finally(() => setIsLoadingLocations(false));
    }
  }, [assignment, userProfile?.account, toast, isLoading, userProfile]);

  useEffect(() => {
    setSelectedSubSection("all");
  }, [selectedSection]);


  useEffect(() => {
    const audioRefsSnapshot = audioRefs.current;
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (maxRecordingTimerRef.current) {
        clearTimeout(maxRecordingTimerRef.current);
      }
      Object.values(audioRefsSnapshot).forEach(audioEl => {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    } catch (error: unknown) {
      console.error(`[togglePlayPause] Error for ${questionId}: ${(error as Error).name} - ${(error as Error).message}`);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ variant: "destructive", title: "Playback Error", description: errorMessage });
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
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
          setUploadErrors(prev => ({ ...prev, [questionId]: errorMessage }));
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
    } catch (error: unknown) {
      console.error("Error saving draft:");
      const errMsg = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Error Saving Draft",
        description: errMsg,
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
    // Enhanced logging for debugging submission issues
    console.log("=== ASSIGNMENT SUBMISSION DEBUG START ===");
    console.log("1. Current formResponses:", formResponses);
    console.log("2. Current photoBank:", photoBank);
    console.log("3. Current comments:", comments);
    console.log("4. Assignment ID:", assignmentId);
    console.log("5. User Profile Account:", userProfile?.account);
    
    console.log("[DEBUG] Starting assignment submission...");
    console.log("[DEBUG] Form responses:", formResponses);
    console.log("[DEBUG] Photo bank:", photoBank);
    console.log("[DEBUG] Comments:", comments);
    
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
                      finalAudioNotesForSubmission[questionId] = { name: audioFileName, url: url };
                      resolve();
                  } catch (getUrlError) {
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
    const answersObject: Record<string, string> = {};
    const photoLinksForSync: Record<string, string> = {};
    const commentsObject: Record<string, string> = {};

    console.log("--- Processing questions for submission ---");
    conditionallyVisibleQuestions.forEach((question, idx) => {
        console.log(`Processing question ${idx + 1} (ID: ${question.id}, Label: ${question.label})`);
        let questionAnswer: unknown;

        // Check if the component is a multi-option checkbox
        // Clean, single‐pass checkbox handler:
        if (question.component === 'checkbox' && question.options) {
          const selectedOptions = parseOptions(question.options, question)
            .filter(opt => data[`${question.id}.${opt.value}`] === true)
            .map(opt => opt.value);

          // Always send an array (even if empty)
          questionAnswer = selectedOptions;
        } else if ((question.component === 'multiButtonSelect' || question.component === 'multiSelect') && question.options && Array.isArray(parseOptions(question.options, question))) {
             const selectedOptions: string[] = [];
             parseOptions(question.options, question).forEach(opt => {
               if (data[`${question.id}.${opt.value}`]) {
                   selectedOptions.push(opt.value);
                }
            });
            questionAnswer = selectedOptions;//.join(',');
        } else if (question.component === 'checkbox' && !question.options) {
      const contentToSubmit = { ...formResponses };
      console.log("[DEBUG] Content being submitted:", contentToSubmit);
      formData.append('content', JSON.stringify(contentToSubmit));
        } else if ((question.component === 'date' || question.component === 'completionDate') && data[question.id] instanceof Date) {
            questionAnswer = format(data[question.id] as Date, "yyyy-MM-dd");
      const commentsToSubmit = { ...comments };
      console.log("[DEBUG] Comments being submitted:", commentsToSubmit);
      formData.append('commentsData', JSON.stringify(commentsToSubmit));
            const timeValue = data[question.id];
            if (typeof timeValue === 'object' && timeValue !== null && timeValue.hour && timeValue.minute && timeValue.period) {
                questionAnswer = `${timeValue.hour}:${timeValue.minute} ${timeValue.period}`;
            } else {
                questionAnswer = '';
            }
        } else if (question.component === 'photoUpload') {
            const fileDetail = uploadedFileDetails[question.id];
            if (fileDetail) {
                photoLinksForSync[question.id] = fileDetail.url;
                questionAnswer = fileDetail.name;
            } else {
                questionAnswer = '';
            }
        } else {
      console.log("[DEBUG] Photo links being submitted:", syncPhotoLinks);
            questionAnswer = data[question.id] ?? '';
        }

        answersObject[question.id] = questionAnswer as string;

          console.log("[DEBUG] Adding file upload for question:", questionId, "File:", file.name);
        if (question.comment && data[`${question.id}_comment`]) {
      // Question responses - CRITICAL: Stringify the object
      const contentJson = JSON.stringify(formResponses);
      console.log("6. Stringified content being sent:", contentJson);
      formData.append('content', contentJson);
      
      // Log all FormData entries for debugging
      console.log("[DEBUG] FormData entries:");
      for (const [key, value] of formData.entries()) {
      // Comments - CRITICAL: Stringify the object
      const commentsJson = JSON.stringify(comments);
      console.log("7. Stringified comments being sent:", commentsJson);
      formData.append('commentsData', commentsJson);
        } else {
      // Photo bank data - CRITICAL: Stringify the object
      const photoBankJson = JSON.stringify(photoBank);
      console.log("8. Stringified photoBank being sent:", photoBankJson);
      formData.append('syncPhotoLinks', photoBankJson);
      }
    });
    formDataForSubmission.append('assignmentId', assignment.id);
      console.log("[DEBUG] Submission result:", result);
          console.log(`9. Adding file for question ${questionId}:`, file.name);
    formDataForSubmission.append('answers', JSON.stringify(answersObject));
    formDataForSubmission.append('comments', JSON.stringify(commentsObject));
    formDataForSubmission.append('photoLinks', JSON.stringify(photoLinksForSync));
    formDataForSubmission.append('audioNotes', JSON.stringify(finalAudioNotesForSubmission));
      // Log all FormData entries for debugging
      console.log("10. All FormData entries:");
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
      
    formDataForSubmission.append('userEmail', user.email);
      console.log("11. Submission result:", result);
    formDataForSubmission.append('account', userProfile.account);

    try {
        const result = await submitCompletedAssignment(
          assignment.id, 
          formDataForSubmission, 
          userProfile.account
        );
        if (result.success) {
            toast({ title: "Assignment Submitted Successfully", description: "Your assignment has been submitted." });
            router.push('/assignments');
        } else {
      console.log("[DEBUG] Full error object:", error);
      console.log("12. Full error object:", error);
            throw new Error(result.error || "Submission failed");
        }
    } catch (error) {
        console.error("Submission error:", error);
        description: `Submission failed: ${error instanceof Error ? error.message : 'An unknown error occurred'}. Check console for details.`
        toast({ variant: "destructive", title: "Submission Failed", description: errorMessage });
    } finally {
        setIsSubmitting(false);
      console.log("=== ASSIGNMENT SUBMISSION DEBUG END ===");
    }
  };

  if (authLoading || profileLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTitle>Assignment Not Found</AlertTitle>
          <AlertDescription>The requested assignment could not be loaded.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{assignment.title}</h1>
            <p className="text-muted-foreground mt-1">{assignment.description}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/assessment-forms')} className="self-start">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assignments
          </Button>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <ShadProgress value={overallProgress} className="w-full" />
        </div>
      </div>

      {/* Filters and Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Navigation & Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Page Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Section Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {availableSections.map(section => (
                    <SelectItem key={section} value={section}>
                      {section === UNASSIGNED_FILTER_VALUE ? "Unassigned" : section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sub-Section</Label>
              <Select value={selectedSubSection} onValueChange={setSelectedSubSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-Sections</SelectItem>
                  {availableSubSections.map(subSection => (
                    <SelectItem key={subSection} value={subSection}>
                      {subSection === UNASSIGNED_FILTER_VALUE ? "Unassigned" : subSection}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={answeredStatusFilter} onValueChange={(value: 'all' | 'answered' | 'unanswered') => setAnsweredStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Questions</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="unanswered">Unanswered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section Progress */}
          {Object.keys(sectionProgress).length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Section Progress</h4>
              {Object.entries(sectionProgress).map(([sectionName, subSections]) => (
                <div key={sectionName} className="space-y-2">
                  <h5 className="text-sm font-medium">
                    {sectionName === 'Uncategorized' ? 'Unassigned' : sectionName}
                  </h5>
                  {Object.entries(subSections).map(([subSectionName, progress]) => (
                    <div key={`${sectionName}-${subSectionName}`} className="ml-4 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{subSectionName === 'General' ? 'Unassigned' : subSectionName}</span>
                        <span>{progress.answered}/{progress.total} ({Math.round(progress.progress)}%)</span>
                      </div>
                      <ShadProgress value={progress.progress} className="h-2" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Bank */}
      <Card>
        <CardHeader>
          <CardTitle>Photo Bank</CardTitle>
          <CardDescription>
            Upload photos here to reuse across multiple questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoBankUpload}
              className="mb-4"
            />
          </div>

          {/* Upload Progress */}
          {Object.keys(photoBankUploads).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Uploading...</h4>
              {Object.entries(photoBankUploads).map(([fileName, upload]) => (
                <div key={fileName} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{fileName}</span>
                    <span>{Math.round(upload.progress)}%</span>
                  </div>
                  <ShadProgress value={upload.progress} />
                  {upload.error && (
                    <p className="text-sm text-destructive">{upload.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Uploaded Photos */}
          {photoBankFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Available Photos ({photoBankFiles.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {photoBankFiles.map((photo, index) => (
                  <div key={index} className="relative group">
                    <Image
                      src={photo.url}
                      alt={photo.name}
                      width={100}
                      height={100}
                      className="w-full h-24 object-cover rounded border"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                      <span className="text-white text-xs text-center p-1">
                        {photo.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {questionsToRender.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                No questions match the current filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          questionsToRender.map((question) => (
            <Card key={question.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="text-lg">
                      {question.label}
                      {question.required && <span className="text-destructive ml-1">*</span>}
                    </CardTitle>
                    
                    {/* Section/Sub-section Pills */}
                    <div className="flex flex-wrap gap-2">
                      {question.section && (
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          getGradientClassForText(question.section)
                        )}>
                          {question.section}
                        </span>
                      )}
                      {question.subSection && (
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          getGradientClassForText(question.subSection)
                        )}>
                          {question.subSection}
                        </span>
                      )}
                    </div>

                    {question.description && (
                      <CardDescription>{question.description}</CardDescription>
                    )}
                  </div>

                  {/* Answer Status Indicator */}
                  <div className={cn(
                    "w-3 h-3 rounded-full ml-4 mt-1 flex-shrink-0",
                    isQuestionAnswered(question, allWatchedValues) 
                      ? "bg-green-500" 
                      : "bg-gray-300"
                  )} />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Question Input Based on Component Type */}
                {question.component === 'text' && (
                  <Input
                    {...register(question.id)}
                    placeholder={question.placeholder}
                    className={formErrors[question.id] ? "border-destructive" : ""}
                  />
                )}

                {question.component === 'textarea' && (
                  <Textarea
                    {...register(question.id)}
                    placeholder={question.placeholder}
                    rows={4}
                    className={formErrors[question.id] ? "border-destructive" : ""}
                  />
                )}

                {question.component === 'email' && (
                  <Input
                    type="email"
                    {...register(question.id)}
                    placeholder={question.placeholder}
                    className={formErrors[question.id] ? "border-destructive" : ""}
                  />
                )}

                {question.component === 'url' && (
                  <Input
                    type="url"
                    {...register(question.id)}
                    placeholder={question.placeholder}
                    className={formErrors[question.id] ? "border-destructive" : ""}
                  />
                )}

                {question.component === 'telephone' && (
                  <Input
                    type="tel"
                    {...register(question.id)}
                    placeholder={question.placeholder}
                    className={formErrors[question.id] ? "border-destructive" : ""}
                  />
                )}

                {question.component === 'number' && (
                  <Input
                    type="number"
                    {...register(question.id)}
                    placeholder={question.placeholder}
                    className={formErrors[question.id] ? "border-destructive" : ""}
                  />
                )}

                {question.component === 'select' && (
                  <Controller
                    name={question.id}
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={formErrors[question.id] ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {parseOptions(question.options, question).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}

                {question.component === 'options' && (
                  <Controller
                    name={question.id}
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-2"
                      >
                        {parseOptions(question.options, question).map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                            <Label htmlFor={`${question.id}-${option.value}`}>{option.label}</Label>
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
                    render={({ field }) => (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {parseOptions(question.options, question).map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            variant={field.value === option.value ? "default" : "outline"}
                            onClick={() => field.onChange(option.value)}
                            className="justify-start"
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  />
                )}

                {question.component === 'multiButtonSelect' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {parseOptions(question.options, question).map((option) => (
                      <Controller
                        key={option.value}
                        name={`${question.id}.${option.value}`}
                        control={control}
                        render={({ field }) => (
                          <Button
                            type="button"
                            variant={field.value ? "default" : "outline"}
                            onClick={() => field.onChange(!field.value)}
                            className="justify-start"
                          >
                            {option.label}
                          </Button>
                        )}
                      />
                    ))}
                  </div>
                )}

                {question.component === 'multiSelect' && (
                  <div className="space-y-2">
                    {parseOptions(question.options, question).map((option) => (
                      <Controller
                        key={option.value}
                        name={`${question.id}.${option.value}`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${question.id}-${option.value}`}
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                            <Label htmlFor={`${question.id}-${option.value}`}>{option.label}</Label>
                          </div>
                        )}
                      />
                    ))}
                  </div>
                )}

                {question.component === 'checkbox' && question.options && (
                  <div className="space-y-2">
                    {parseOptions(question.options, question).map((option) => (
                      <Controller
                        key={option.value}
                        name={`${question.id}.${option.value}`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${question.id}-${option.value}`}
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                            <Label htmlFor={`${question.id}-${option.value}`}>{option.label}</Label>
                          </div>
                        )}
                      />
                    ))}
                  </div>
                )}

                {question.component === 'checkbox' && !question.options && (
                  <Controller
                    name={question.id}
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={question.id}
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor={question.id}>{question.label}</Label>
                      </div>
                    )}
                  />
                )}

                {question.component === 'range' && (
                  <Controller
                    name={question.id}
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Slider
                          value={[field.value || 0]}
                          onValueChange={(value) => field.onChange(value[0])}
                          max={question.max || 100}
                          min={question.min || 0}
                          step={question.step || 1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{question.min || 0}</span>
                          <span>Current: {field.value || 0}</span>
                          <span>{question.max || 100}</span>
                        </div>
                      </div>
                    )}
                  />
                )}

                {(question.component === 'date' || question.component === 'completionDate') && (
                  <Controller
                    name={question.id}
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                              formErrors[question.id] && "border-destructive"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
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
                  <div className="grid grid-cols-3 gap-2">
                    <Controller
                      name={`${question.id}.hour`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {hours12.map((hour) => (
                              <SelectItem key={hour} value={hour}>
                                {hour}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Controller
                      name={`${question.id}.minute`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            {minutes.map((minute) => (
                              <SelectItem key={minute} value={minute}>
                                {minute}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Controller
                      name={`${question.id}.period`}
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="AM/PM" />
                          </SelectTrigger>
                          <SelectContent>
                            {amPm.map((period) => (
                              <SelectItem key={period} value={period}>
                                {period}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}

                {question.component === 'schoolSelector' && (
                  <Controller
                    name={question.id}
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingLocations}>
                        <SelectTrigger className={formErrors[question.id] ? "border-destructive" : ""}>
                          <SelectValue placeholder={isLoadingLocations ? "Loading locations..." : "Select a school"} />
                        </SelectTrigger>
                        <SelectContent>
                          {locationsError ? (
                            <SelectItem value="" disabled>
                              Error loading locations
                            </SelectItem>
                          ) : (
                            locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.locationName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}

                {question.component === 'photoUpload' && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        id={`${question.id}_file`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(question.id, file);
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenPhotoBank(question.id)}
                        disabled={photoBankFiles.length === 0}
                      >
                        Photo Bank
                      </Button>
                    </div>

                    {/* Upload Progress */}
                    {uploadProgress[question.id] > 0 && uploadProgress[question.id] < 100 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{Math.round(uploadProgress[question.id])}%</span>
                        </div>
                        <ShadProgress value={uploadProgress[question.id]} />
                      </div>
                    )}

                    {/* Upload Error */}
                    {uploadErrors[question.id] && (
                      <Alert variant="destructive">
                        <AlertDescription>{uploadErrors[question.id]}</AlertDescription>
                      </Alert>
                    )}

                    {/* Image Preview */}
                    {imagePreviewUrls[question.id] && (
                      <div className="relative">
                        <Image
                          src={imagePreviewUrls[question.id]!}
                          alt="Preview"
                          width={200}
                          height={200}
                          className="rounded border object-cover"
                        />
                      </div>
                    )}

                    {/* Uploaded File */}
                    {uploadedFileDetails[question.id] && (
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Image
                            src={uploadedFileDetails[question.id]!.url}
                            alt={uploadedFileDetails[question.id]!.name}
                            width={50}
                            height={50}
                            className="rounded object-cover"
                          />
                          <span className="text-sm">{uploadedFileDetails[question.id]!.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeUploadedFile(question.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio Note Section */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Audio Note (Optional)</Label>
                    {hasMicPermission === false && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={requestMicPermission}
                      >
                        Enable Microphone
                      </Button>
                    )}
                  </div>

                  {micPermissionError && (
                    <Alert variant="destructive">
                      <AlertDescription>{micPermissionError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center gap-2">
                    {!audioNotes[question.id] && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartRecording(question.id)}
                        disabled={isRecordingQuestionId !== null || hasMicPermission === false}
                      >
                        {isRecordingQuestionId === question.id ? "Recording..." : "Start Recording"}
                      </Button>
                    )}

                    {isRecordingQuestionId === question.id && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleStopRecording(question.id)}
                      >
                        Stop Recording
                      </Button>
                    )}

                    {audioNotes[question.id] && (
                      <div className="flex items-center gap-2 flex-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => togglePlayPause(question.id)}
                          disabled={audioNotes[question.id]?.isUploading}
                        >
                          {audioPlayerStates[question.id]?.isPlaying ? "Pause" : "Play"}
                        </Button>
                        
                        <div className="flex-1 text-sm">
                          <div className="flex justify-between">
                            <span>{audioNotes[question.id]?.name}</span>
                            <span>
                              {formatAudioTime(audioPlayerStates[question.id]?.currentTime || 0)} / 
                              {formatAudioTime(audioPlayerStates[question.id]?.duration || 0)}
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAudioNote(question.id)}
                          disabled={audioNotes[question.id]?.isUploading}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Audio Upload Progress */}
                  {audioNotes[question.id]?.isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading audio...</span>
                        <span>{Math.round(audioNotes[question.id]?.uploadProgress || 0)}%</span>
                      </div>
                      <ShadProgress value={audioNotes[question.id]?.uploadProgress || 0} />
                    </div>
                  )}

                  {/* Audio Upload Error */}
                  {audioNotes[question.id]?.uploadError && (
                    <Alert variant="destructive">
                      <AlertDescription>{audioNotes[question.id]?.uploadError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Hidden Audio Element */}
                  {audioNotes[question.id]?.url && (
                    <audio
                      ref={(el) => {
                        audioRefs.current[question.id] = el;
                      }}
                      onTimeUpdate={(e) => handleAudioTimeUpdate(e, question.id)}
                      onLoadedMetadata={(e) => handleAudioLoadedMetadata(e, question.id)}
                      onPlay={() => setAudioPlayerStates(prev => ({ ...prev, [question.id]: { ...prev[question.id]!, isPlaying: true } }))}
                      onPause={() => setAudioPlayerStates(prev => ({ ...prev, [question.id]: { ...prev[question.id]!, isPlaying: false } }))}
                      onEnded={() => handleAudioEnded(question.id)}
                      style={{ display: 'none' }}
                    />
                  )}
                </div>

                {/* Comment Section */}
                {question.comment && (
                  <div className="space-y-2 border-t pt-4">
                    <Label htmlFor={`${question.id}_comment`} className="text-sm font-medium">
                      Additional Comments
                    </Label>
                    <Textarea
                      id={`${question.id}_comment`}
                      {...register(`${question.id}_comment`)}
                      placeholder="Add any additional comments or notes..."
                      rows={3}
                    />
                  </div>
                )}

                {/* Form Validation Error */}
                {formErrors[question.id] && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      This field is required.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))
        )}

        {/* Submit Button */}
        <div className="flex justify-center pt-6">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="min-w-[200px]"
          >
            {isSubmitting ? "Submitting..." : "Submit Assignment"}
          </Button>
        </div>
      </form>

      {/* Photo Bank Modal */}
      <Dialog open={isPhotoBankModalOpen} onOpenChange={setIsPhotoBankModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Photo from Bank</DialogTitle>
            <DialogDescription>
              Choose a photo from your uploaded collection
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {photoBankFiles.map((photo, index) => (
                <div
                  key={index}
                  className="relative cursor-pointer group"
                  onClick={() => handleSelectPhotoFromBank(photo)}
                >
                  <Image
                    src={photo.url}
                    alt={photo.name}
                    width={200}
                    height={200}
                    className="w-full h-32 object-cover rounded border hover:border-primary transition-colors"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                    <span className="text-white text-sm text-center p-2">
                      {photo.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}