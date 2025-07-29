"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useForm, Controller, type SubmitHandler, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowLeft, X, Loader2, Eye, Trash2, ImageIcon } from "lucide-react";

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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getAssignmentById, getAssignmentDraft, submitCompletedAssignment, saveAssignmentDraft, type AssignmentWithPermissions, type AssignmentQuestion } from "@/services/assignmentFunctionsService";
import { getLocationsForLookup, type Location } from "@/services/locationService";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const formSchema = z.record(z.any());
type FormDataSchema = z.infer<typeof formSchema>;

interface UploadedFileDetail {
  name: string;
  url: string;
  uploadDate?: string;
  fileSize?: number;
  questionId?: string;
}

const UNASSIGNED_FILTER_VALUE = "n/a";

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

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [uploadedPhotos, setUploadedPhotos] = useState<{ [questionId: string]: UploadedFileDetail }>({});
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedQuestionForPhoto, setSelectedQuestionForPhoto] = useState<string | null>(null);
  const [photoBankPhotos, setPhotoBankPhotos] = useState<Array<{ id: string; url: string; name: string; uploadedAt: string; size: number }>>([]);
  const [photoBankFiles, setPhotoBankFiles] = useState<UploadedFileDetail[]>([]);
  const [isLoadingPhotoBank, setIsLoadingPhotoBank] = useState(false);
  const [selectedQuestionForPhotoBank, setSelectedQuestionForPhotoBank] = useState<string | null>(null);

  const hours12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const amPm = ["AM", "PM"];

  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedSubSection, setSelectedSubSection] = useState<string>("all");
  const [answeredStatusFilter, setAnsweredStatusFilter] = useState<'all' | 'answered' | 'unanswered'>('all');

  const { control, register, handleSubmit, watch, reset, formState: { errors: formErrors }, getValues } = useForm<FormDataSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const allWatchedValues = watch();

  // Handle input change
  const handleInputChange = (questionId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Parse options function
  type OptionInput = string | string[] | { label: string; value?: string }[];
  const parseOptions = (options: OptionInput, question?: AssignmentQuestion): { label: string; value: string }[] => {
    if (question?.component === 'schoolSelector') {
      return locations.map(location => ({
        label: location.locationName || location.name || 'Unknown Location',
        value: location.id
      }));
    }
    
    if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'object' && options[0] !== null && 'label' in options[0]) {
      const objectOptions = options as { label: string; value?: string }[];
      return objectOptions.map(opt => ({ label: String(opt.label), value: String(opt.value ?? opt.label) }));
    }
    
    if (Array.isArray(options)) {
      return options.map(opt => ({ label: String(opt), value: String(opt) }));
    }
    
    if (typeof options === 'string') {
      return options.split(';').map(opt => opt.trim()).filter(Boolean).map(opt => ({ label: opt, value: opt }));
    }

    return [];
  };

  // Check if question should be visible based on conditional logic
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

  // Get conditionally visible questions
  const conditionallyVisibleQuestions = assignment?.questions.filter(q => shouldBeVisible(q.conditional, q.id)) || [];

  // Calculate total pages
  const totalPages = conditionallyVisibleQuestions.length > 0 
    ? Math.max(...conditionallyVisibleQuestions.map(q => q.pageNumber || 1))
    : 1;

  // Check if question is answered
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
  }, [uploadedFileDetails]);

  // Calculate overall progress
  const overallProgress = conditionallyVisibleQuestions.length > 0
    ? (conditionallyVisibleQuestions.filter(q => isQuestionAnswered(q, allWatchedValues)).length / conditionallyVisibleQuestions.length) * 100
    : 0;

  // Get available sections
  const availableSections = Array.from(new Set(
    conditionallyVisibleQuestions.map(q => q.section || UNASSIGNED_FILTER_VALUE)
  )).sort((a, b) => a === UNASSIGNED_FILTER_VALUE ? 1 : b === UNASSIGNED_FILTER_VALUE ? -1 : a.localeCompare(b));

  // Get available sub-sections
  const availableSubSections = Array.from(new Set(
    conditionallyVisibleQuestions
      .filter(q => selectedSection === "all" || (q.section || UNASSIGNED_FILTER_VALUE) === selectedSection)
      .map(q => q.subSection || UNASSIGNED_FILTER_VALUE)
  )).sort((a, b) => a === UNASSIGNED_FILTER_VALUE ? 1 : b === UNASSIGNED_FILTER_VALUE ? -1 : a.localeCompare(b));

  // Get questions to render based on filters
  const questionsToRender = conditionallyVisibleQuestions.filter(q => {
    const pageMatch = (Number(q.pageNumber) || 1) === currentPage;
    if (!pageMatch) return false;

    const sectionMatch = selectedSection === "all" || (q.section || UNASSIGNED_FILTER_VALUE) === selectedSection;
    const subSectionMatch = selectedSubSection === "all" || (q.subSection || UNASSIGNED_FILTER_VALUE) === selectedSubSection;
    if (!sectionMatch || !subSectionMatch) return false;

    if (answeredStatusFilter === 'all') {
      return true;
    }
    const answered = isQuestionAnswered(q, allWatchedValues);
    return answeredStatusFilter === 'answered' ? answered : !answered;
  });

  // Handle file upload
  const handleFileUpload = async (questionId: string, file: File) => {
    if (!user || !assignment) {
      setUploadErrors(prev => ({ ...prev, [questionId]: "User or assignment data missing." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadErrors(prev => ({ ...prev, [questionId]: "File exceeds 5MB limit." }));
      toast({ variant: "destructive", title: "Upload Error", description: "File exceeds 5MB limit." });
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
          setUploadedFileDetails(prev => ({ 
            ...prev, 
            [questionId]: { name: file.name, url: downloadURL }
          }));
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

  // Remove uploaded file
  const removeUploadedFile = (questionId: string) => {
    setUploadedFileDetails(prev => ({ ...prev, [questionId]: null }));
    setUploadProgress(prev => ({ ...prev, [questionId]: 0 }));
    setUploadErrors(prev => ({ ...prev, [questionId]: null }));
    setImagePreviewUrls(prev => ({ ...prev, [questionId]: null }));
    const fileInput = document.getElementById(`${questionId}_file`) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!userProfile?.account || !assignmentId) {
      toast({ variant: "destructive", title: "Cannot Save Draft", description: "User account or assignment ID is missing." });
      return;
    }

    const draftData = getValues();
    
    const dataToSave = {
      formValues: draftData,
      uploadedFileDetails: uploadedFileDetails,
      savedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    toast({ title: "Saving Draft...", description: "Please wait." });

    try {
      await saveAssignmentDraft(assignmentId, dataToSave, userProfile.account);
      toast({
        title: "Draft Saved Successfully",
        description: "Your progress has been saved.",
      });
    } catch (error: unknown) {
      console.error("Error saving draft:", error);
      const errMsg = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Error Saving Draft",
        description: errMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to fetch photo bank files
  const fetchPhotoBankFiles = useCallback(async () => {
    if (!userProfile?.account) return;
    
    setIsLoadingPhotoBank(true);
    try {
      // This would typically fetch from your photo bank API
      // For now, we'll use the photos from the current form state
      const allPhotos: UploadedFileDetail[] = [];
      Object.values(uploadedPhotos).forEach(photoData => {
        if (photoData?.url) {
          allPhotos.push({
            name: photoData.name || 'Uploaded Photo',
            url: photoData.url,
            uploadDate: photoData.uploadDate || new Date().toISOString(),
            fileSize: photoData.fileSize || 0,
            questionId: photoData.questionId
          });
        }
      });
      setPhotoBankFiles(allPhotos);
    } catch (error) {
      console.error("Error fetching photo bank:", error);
    } finally {
      setIsLoadingPhotoBank(false);
    }
  }, [userProfile?.account, uploadedPhotos]);

  // Fetch photo bank when modal opens
  useEffect(() => {
    if (isPhotoModalOpen) {
      fetchPhotoBankFiles();
    }
  }, [isPhotoModalOpen, fetchPhotoBankFiles]);

  // Function to handle photo upload for questions
  const handleQuestionPhotoUpload = async (questionId: string, file: File) => {
    if (!userProfile?.account) return;
    
    setUploadProgress(prev => ({ ...prev, [questionId]: 0 }));
    
    try {
      const storageRef = ref(storage, `assignment_uploads/${userProfile.account}/${assignmentId}/${questionId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({ ...prev, [questionId]: progress }));
        },
        (error) => {
          console.error('Upload failed:', error);
          toast({ variant: "destructive", title: "Upload Failed", description: error.message });
          setUploadProgress(prev => ({ ...prev, [questionId]: undefined }));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const photoData = {
              name: file.name,
              url: downloadURL,
              uploadDate: new Date().toISOString(),
              fileSize: file.size,
              questionId: questionId
            };
            
            setUploadedPhotos(prev => ({
              ...prev,
              [questionId]: photoData
            }));
            
            setUploadProgress(prev => ({ ...prev, [questionId]: undefined }));
            toast({ title: "Photo Uploaded", description: `Photo uploaded successfully for ${questionId}` });
          } catch (error) {
            console.error('Error getting download URL:', error);
            toast({ variant: "destructive", title: "Upload Failed", description: "Failed to get download URL" });
            setUploadProgress(prev => ({ ...prev, [questionId]: undefined }));
          }
        }
      );
    } catch (error) {
      console.error('Error starting upload:', error);
      toast({ variant: "destructive", title: "Upload Failed", description: "Failed to start upload" });
      setUploadProgress(prev => ({ ...prev, [questionId]: undefined }));
    }
  };

  // Function to remove photo from question
  const handleRemovePhoto = (questionId: string) => {
    setUploadedPhotos(prev => {
      const newPhotos = { ...prev };
      delete newPhotos[questionId];
      return newPhotos;
    });
  };

  // Function to open photo bank for a specific question
  const handleOpenPhotoBank = (questionId: string) => {
    setSelectedQuestionForPhoto(questionId);
    setIsPhotoModalOpen(true);
  };

  // Function to select photo from bank
  const handleSelectPhotoFromBank = (photo: UploadedFileDetail) => {
    if (selectedQuestionForPhoto) {
      setUploadedPhotos(prev => ({
        ...prev,
        [selectedQuestionForPhoto]: {
          name: photo.name,
          url: photo.url,
          uploadDate: photo.uploadDate,
          fileSize: photo.fileSize,
          questionId: selectedQuestionForPhoto
        }
      }));
      setIsPhotoModalOpen(false);
      setSelectedQuestionForPhoto(null);
      toast({ title: "Photo Selected", description: "Photo assigned to question successfully" });
    }
  };

  // Function to delete photo from bank
  const handleDeletePhotoFromBank = async (photo: UploadedFileDetail) => {
    try {
      // Remove from photo bank
      setPhotoBankFiles(prev => prev.filter(p => p.url !== photo.url));
      
      // Remove from any questions that might be using this photo
      setUploadedPhotos(prev => {
        const newPhotos = { ...prev };
        Object.keys(newPhotos).forEach(questionId => {
          if (newPhotos[questionId]?.url === photo.url) {
            delete newPhotos[questionId];
          }
        });
        return newPhotos;
      });
      
      toast({ title: "Photo Deleted", description: "Photo removed from bank and all questions" });
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({ variant: "destructive", title: "Delete Failed", description: "Failed to delete photo" });
    }
  };

  // Form submission
  const onSubmit: SubmitHandler<FormDataSchema> = async (data) => {
    if (!assignment || !userProfile?.account || !user || !user.email) {
      toast({ variant: "destructive", title: "Submission Error", description: "Cannot submit, critical assignment or user account data missing." });
      return;
    }
    
    const currentFormData = getValues();
    const formDataToProcess = Object.keys(currentFormData).length > 0 ? currentFormData : data;
    
    setIsSubmitting(true);

    const formDataForSubmission = new FormData();
    const answersObject: Record<string, unknown> = {};
    const commentsObject: Record<string, unknown> = {};

    conditionallyVisibleQuestions.forEach((question) => {
      const rawAnswer = formDataToProcess[question.id];
      let questionAnswer: unknown;

      if (question.component === 'checkbox' && question.options) {
        const selectedOptions = parseOptions(question.options, question)
          .filter(opt => formDataToProcess[`${question.id}.${opt.value}`] === true)
          .map(opt => opt.value);
        questionAnswer = selectedOptions;
      } else if ((question.component === 'multiButtonSelect' || question.component === 'multiSelect') && question.options) {
        const selectedOptions: string[] = [];
        parseOptions(question.options, question).forEach(opt => {
          if (formDataToProcess[`${question.id}.${opt.value}`]) {
            selectedOptions.push(opt.value);
          }
        });
        questionAnswer = selectedOptions;
      } else if (question.component === 'checkbox' && !question.options) {
        questionAnswer = formDataToProcess[question.id] === true;
      } else if ((question.component === 'date' || question.component === 'completionDate') && formDataToProcess[question.id] instanceof Date) {
        questionAnswer = format(formDataToProcess[question.id] as Date, "yyyy-MM-dd");
      } else if (question.component === 'time' || question.component === 'completionTime') {
        const timeValue = formDataToProcess[question.id];
        if (typeof timeValue === 'object' && timeValue !== null && timeValue.hour && timeValue.minute && timeValue.period) {
          questionAnswer = `${timeValue.hour}:${timeValue.minute} ${timeValue.period}`;
        } else {
          questionAnswer = '';
        }
      } else if (question.component === 'photoUpload') {
        const fileDetail = uploadedFileDetails[question.id];
        if (fileDetail) {
          questionAnswer = fileDetail.name;
        } else {
          questionAnswer = '';
        }
      } else {
        questionAnswer = formDataToProcess[question.id] ?? '';
      }

      answersObject[question.id] = questionAnswer;

      const commentKey = `${question.id}_comment`;
      if (question.comment && formDataToProcess[commentKey]) {
        commentsObject[question.id] = formDataToProcess[commentKey];
      }
    });
    
    try {
      formDataForSubmission.append('content', JSON.stringify(answersObject));
      formDataForSubmission.append('commentsData', JSON.stringify(commentsObject));
      formDataForSubmission.append('completedBy', user.email);
      formDataForSubmission.append('account', userProfile.account);
      formDataForSubmission.append('status', 'completed');
      formDataForSubmission.append('date', new Date().toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric', 
        timeZone: 'America/New_York' 
      }));
      
      const schoolSelectorQuestion = assignment.questions.find(q => q.component === 'schoolSelector');
      if (schoolSelectorQuestion && formDataToProcess[schoolSelectorQuestion.id]) {
        const selectedLocationId = formDataToProcess[schoolSelectorQuestion.id];
        const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
        if (selectedLocation) {
          formDataForSubmission.append('locationName', selectedLocation.locationName);
        }
      }

      const result = await submitCompletedAssignment(
        assignment.id, 
        formDataForSubmission, 
        userProfile.account
      );
      
      if (result && (result.success !== false)) {
        toast({ title: "Assignment Submitted Successfully", description: "Your assignment has been submitted." });
        router.push('/assessment-forms');
      } else {
        throw new Error(result?.error || "Submission failed - no success confirmation received");
      }
    } catch (error) {
      console.error("Submission error:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({ variant: "destructive", title: "Submission Failed", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load assignment and draft data
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
      toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in." });
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
        const fetchedAssignment = await getAssignmentById(assignmentId, userProfile!.account);
        if (!fetchedAssignment) {
          setError("Assignment not found or you do not have permission to access it.");
          toast({ variant: "destructive", title: "Error", description: "Assignment not found." });
          setIsLoading(false);
          return;
        }
        setAssignment(fetchedAssignment);

        const draftData = await getAssignmentDraft(assignmentId, userProfile.account);
        
        const defaultVals: FieldValues = {};
        
        if (draftData) {
          toast({ title: "Draft Loaded", description: "Your previous progress has been restored." });
          reset(draftData.formValues || {});
          setUploadedFileDetails((draftData.uploadedFileDetails || {}) as { [questionId: string]: UploadedFileDetail | null });
        } else {
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

  // Load locations for school selector
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

  // Reset sub-section when section changes
  useEffect(() => {
    setSelectedSubSection("all");
  }, [selectedSection]);

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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{assignment.assessmentName}</h1>
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
          <CardDescription>
            Use the filters below to navigate through different sections of the assignment.
          </CardDescription>
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setIsPhotoModalOpen(true)}
              className="flex items-center gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              Photo Bank ({photoBankFiles.length})
            </Button>
          </div>
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
        </CardContent>
      </Card>

      {/* Global Photo Bank Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Photo Management</span>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedQuestionForPhotoBank(null);
                setIsPhotoBankModalOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              Photo Bank ({photoBankPhotos.length})
            </Button>
          </CardTitle>
          <CardDescription>
            Access your photo library and manage uploaded images for this assignment.
          </CardDescription>
        </CardHeader>
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

                {/* Select Question Type */}
                {question.component === 'select' && (
                  <div className="space-y-2">
                    <Label htmlFor={`question-${question.id}`}>
                      {question.label}
                      {question.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Select
                      value={formData[question.id] || ""}
                      onValueChange={(value) => handleInputChange(question.id, value)}
                    >
                      <SelectTrigger id={`question-${question.id}`}>
                        <SelectValue placeholder="Select an option..." />
                      </SelectTrigger>
                      <SelectContent>
                        {parseOptions(question.options).map((option, optIndex) => (
                          <SelectItem key={`${option.value}-${optIndex}`} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Radio Options Question Type */}
                {question.component === 'options' && (
                  <div className="space-y-2">
                    <Label>
                      {question.label}
                      {question.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <RadioGroup
                      value={formData[question.id] || ""}
                      onValueChange={(value) => handleInputChange(question.id, value)}
                    >
                      {parseOptions(question.options).map((option, optIndex) => (
                        <div key={`${option.value}-${optIndex}`} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                          <Label htmlFor={`${question.id}-${option.value}`} className="font-normal">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Checkbox Question Type */}
                {question.component === 'checkbox' && (
                  <div className="space-y-2">
                    <Label>
                      {question.label}
                      {question.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <div className="space-y-2">
                      {parseOptions(question.options).map((option, optIndex) => (
                        <div key={`${option.value}-${optIndex}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${question.id}-${option.value}`}
                            checked={Array.isArray(formData[question.id]) ? 
                              (formData[question.id] as string[]).includes(option.value) : false}
                            onCheckedChange={(checked) => {
                              const currentValues = Array.isArray(formData[question.id]) ? 
                                formData[question.id] as string[] : [];
                              if (checked) {
                                handleInputChange(question.id, [...currentValues, option.value]);
                              } else {
                                handleInputChange(question.id, currentValues.filter(v => v !== option.value));
                              }
                            }}
                          />
                          <Label htmlFor={`${question.id}-${option.value}`} className="font-normal">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Select/Options Questions */}
                {(question.component === 'select' || question.component === 'options') && (
                  <div className="space-y-2">
                    <Label htmlFor={question.id}>{question.label}</Label>
                    <Select
                      value={formData[question.id] || ''}
                      onValueChange={(value) => handleInputChange(question.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option..." />
                      </SelectTrigger>
                      <SelectContent>
                        {parseOptions(question.options).map((option, optIndex) => (
                          <SelectItem key={`${option.value}-${optIndex}`} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Radio Button Questions */}
                {question.component === 'radio' && (
                  <div className="space-y-2">
                    <Label>{question.label}</Label>
                    <RadioGroup
                      value={formData[question.id] || ''}
                      onValueChange={(value) => handleInputChange(question.id, value)}
                    >
                      {parseOptions(question.options).map((option, optIndex) => (
                        <div key={`${option.value}-${optIndex}`} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                          <Label htmlFor={`${question.id}-${option.value}`}>{option.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Checkbox Questions */}
                {question.component === 'checkbox' && (
                  <div className="space-y-2">
                    <Label>{question.label}</Label>
                    <div className="space-y-2">
                      {parseOptions(question.options).map((option, optIndex) => {
                        const currentValues = Array.isArray(formData[question.id]) ? formData[question.id] : [];
                        return (
                          <div key={`${option.value}-${optIndex}`} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${question.id}-${option.value}`}
                              checked={currentValues.includes(option.value)}
                              onCheckedChange={(checked) => {
                                const newValues = checked
                                  ? [...currentValues, option.value]
                                  : currentValues.filter((v: string) => v !== option.value);
                                handleInputChange(question.id, newValues);
                              }}
                            />
                            <Label htmlFor={`${question.id}-${option.value}`}>{option.label}</Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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

                {/* Photo Upload */}
                {question.photoUpload && (
                  <div className="space-y-2">
                    <Label>Photo Upload</Label>
                    <div className="space-y-2">
                      {uploadedPhotos[question.id] ? (
                        <div className="flex items-center space-x-2 p-2 border rounded-md">
                          <Image
                            src={uploadedPhotos[question.id]!.url}
                            alt={uploadedPhotos[question.id]!.name}
                            width={60}
                            height={60}
                            className="rounded object-cover"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{uploadedPhotos[question.id]!.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(uploadedPhotos[question.id]!.uploadDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(uploadedPhotos[question.id]!.url, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemovePhoto(question.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleQuestionPhotoUpload(question.id, file);
                                }
                              }}
                              disabled={uploadProgress[question.id] !== undefined}
                            />
                            {uploadProgress[question.id] !== undefined && (
                              <div className="mt-2">
                                <Progress value={uploadProgress[question.id]} className="w-full" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Uploading... {Math.round(uploadProgress[question.id] || 0)}%
                                </p>
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedQuestionForPhotoBank(question.id);
                              setIsPhotoBankModalOpen(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <ImageIcon className="h-3 w-3" />
                            From Bank
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {question.component === 'photoUpload' && (
                  <div className="space-y-4">
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
                    />

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

        {/* Save Draft and Submit Buttons */}
        <div className="flex justify-center gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="min-w-[150px]"
          >
            Save Draft
          </Button>
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
      <Dialog open={isPhotoModalOpen} onOpenChange={(open) => {
        setIsPhotoModalOpen(open);
        if (!open) {
          setSelectedQuestionForPhoto(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Photo Bank
            </DialogTitle>
            <DialogDescription>
              {selectedQuestionForPhotoBank 
                ? "Select a photo to assign to the current question, or manage your photo library."
                : "Manage your uploaded photos and view your photo library."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {isLoadingPhotos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading photos...</span>
              </div>
            ) : photoBankPhotos.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-semibold">No Photos Yet</p>
                <p className="text-muted-foreground">Upload photos to questions to build your photo library.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {photoBankPhotos.map((photo) => (
                    <TableRow key={photo.id}>
                      <TableCell>
                        <div className="w-16 h-16 relative rounded-md overflow-hidden bg-muted">
                          <Image
                            src={photo.url}
                            alt={photo.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{photo.name}</TableCell>
                      <TableCell>{new Date(photo.uploadedAt).toLocaleDateString()}</TableCell>
                      <TableCell>{(photo.size / 1024).toFixed(1)} KB</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {selectedQuestionForPhotoBank && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                handleQuestionPhotoUpload(selectedQuestionForPhotoBank, photo.url);
                                setIsPhotoBankModalOpen(false);
                                setSelectedQuestionForPhotoBank(null);
                              }}
                            >
                              Select
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(photo.url, '_blank')}
                          >
                            View
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePhotoFromBank(photo.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsPhotoBankModalOpen(false);
              setSelectedQuestionForPhotoBank(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}