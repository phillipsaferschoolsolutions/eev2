"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Plus, Download, Upload, Settings, GripVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAssignment, type CreateAssignmentPayload, type AssignmentQuestion } from "@/services/assignmentFunctionsService";
import { useToast } from "@/hooks/use-toast";
import { createAssignmentNotification } from "@/services/notificationService";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Question Item Component
function SortableQuestionItem({ 
  question, 
  index, 
  updateQuestion, 
  removeQuestion, 
  getAvailableParentQuestions, 
  getParentQuestionOptions 
}: {
  question: AssignmentQuestion;
  index: number;
  updateQuestion: (index: number, updates: Partial<AssignmentQuestion>) => void;
  removeQuestion: (index: number) => void;
  getAvailableParentQuestions: (currentIndex: number) => AssignmentQuestion[];
  getParentQuestionOptions: (parentQuestionId: string) => string[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 space-y-4 bg-card ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 font-medium">Question {index + 1}</div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => removeQuestion(index)}
          className="text-destructive hover:text-destructive"
        >
          Remove
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Question Text</Label>
          <Input
            value={question.label}
            onChange={(e) => updateQuestion(index, { label: e.target.value })}
            placeholder="Enter your question..."
          />
        </div>

        <div className="space-y-2">
          <Label>Question Type</Label>
          <Select
            value={question.component}
            onValueChange={(value) => updateQuestion(index, { component: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select question type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text Input</SelectItem>
              <SelectItem value="textarea">Long Text (Textarea)</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="telephone">Telephone</SelectItem>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="radio">Radio (Single Choice)</SelectItem>
              <SelectItem value="select">Select Dropdown</SelectItem>
              <SelectItem value="checkbox">Checkbox (Multiple Choice)</SelectItem>
              <SelectItem value="buttonSelect">Button Select (Single)</SelectItem>
              <SelectItem value="multiSelect">Button Select (Multiple)</SelectItem>
              <SelectItem value="schoolSelector">School Select Dropdown</SelectItem>
              <SelectItem value="range">Range</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="completionDate">Date of Completion</SelectItem>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="completionTime">Time of Completion</SelectItem>
              <SelectItem value="datetime">Datetime</SelectItem>
              <SelectItem value="photoUpload">Photo Upload</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(question.component === 'radio' || question.component === 'select' || question.component === 'checkbox' || question.component === 'buttonSelect' || question.component === 'multiSelect' || question.component === 'dynamic') && (
        <div className="space-y-2">
          <Label>Options (separate with semicolons)</Label>
          <Input
            value={question.options || ''}
            onChange={(e) => updateQuestion(index, { options: e.target.value })}
            placeholder="Option 1;Option 2;Option 3"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Section</Label>
          <Input
            value={question.section || ''}
            onChange={(e) => updateQuestion(index, { section: e.target.value })}
            placeholder="Section name (optional)"
          />
        </div>

        <div className="space-y-2">
          <Label>Criticality Level</Label>
          <Select
            value={question.criticality || 'low'}
            onValueChange={(value) => updateQuestion(index, { criticality: value as 'low' | 'medium' | 'high' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`required-${index}`}
              checked={question.required || false}
              onCheckedChange={(checked) => updateQuestion(index, { required: !!checked })}
            />
            <Label htmlFor={`required-${index}`}>Required</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`photo-${index}`}
              checked={question.photoUpload || false}
              onCheckedChange={(checked) => updateQuestion(index, { photoUpload: !!checked })}
            />
            <Label htmlFor={`photo-${index}`}>Photo Upload</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`comment-${index}`}
              checked={question.comment || false}
              onCheckedChange={(checked) => updateQuestion(index, { comment: !!checked })}
            />
            <Label htmlFor={`comment-${index}`}>Allow Comments</Label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 pt-2 border-t border-border">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`conditional-${index}`}
              checked={!!question.conditional}
              onCheckedChange={(checked) => {
                if (checked) {
                  updateQuestion(index, { conditional: { field: '', value: '' } });
                } else {
                  updateQuestion(index, { conditional: undefined });
                }
              }}
            />
            <Label htmlFor={`conditional-${index}`} className="font-medium text-blue-700">Question Appears Conditionally</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`dynamic-${index}`}
              checked={question.dynamic || false}
              onCheckedChange={(checked) => updateQuestion(index, { dynamic: !!checked })}
            />
            <Label htmlFor={`dynamic-${index}`} className="font-medium text-green-700">🔄 Dynamic Mode (Allow Multiple Instances)</Label>
          </div>
        </div>
      </div>

      {question.conditional && (
        <div className="bg-blue-50 p-4 rounded-lg space-y-4">
          <h4 className="font-medium text-blue-900">Conditional Question Settings</h4>
          
          <div className="space-y-2">
            <Label>Select the question that triggers this conditional item</Label>
            <Select
              value={question.conditional.field || ''}
              onValueChange={(value) => updateQuestion(index, { 
                conditional: { ...question.conditional, field: value, value: '' }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent question..." />
              </SelectTrigger>
              <SelectContent>
                {getAvailableParentQuestions(index).map((parentQ, idx) => (
                  <SelectItem key={parentQ.id} value={parentQ.id}>
                    {idx + 1}) {parentQ.label || 'Untitled Question'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getAvailableParentQuestions(index).length === 0 && (
              <p className="text-sm text-amber-600">
                No questions with options available. Add radio, select, or checkbox questions above this one.
              </p>
            )}
          </div>

          {question.conditional.field && (
            <div className="space-y-2">
              <Label>Select the answer that triggers this conditional item</Label>
              <Select
                value={Array.isArray(question.conditional.value) ? question.conditional.value[0] : question.conditional.value}
                onValueChange={(value) => updateQuestion(index, { 
                  conditional: { ...question.conditional!, field: question.conditional!.field, value: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger value..." />
                </SelectTrigger>
                <SelectContent>
                  {getParentQuestionOptions(question.conditional.field).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
            <strong>Note:</strong> This question will only appear when the selected parent question is answered with the specified value.
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateAssignmentPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    assessmentName: "",
    description: "",
    assignmentType: "assignment",
    frequency: "onetime",
    dueDate: "",
  });

  const [questions, setQuestions] = useState<AssignmentQuestion[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!userProfile?.account) {
      setError("Account information is required");
      setLoading(false);
      return;
    }

    // Validation
    if (!formData.assessmentName.trim()) {
      setError("Assignment name is required");
      setLoading(false);
      return;
    }

    if (questions.length === 0) {
      setError("At least one question is required");
      setLoading(false);
      return;
    }

    try {
      // Transform questions to match backend expectations
      const backendQuestions = questions.map(question => ({
        ...question,
        _uid: question.id, // Backend expects _uid instead of id
        conditionalQuestionId: question.conditional?.field,
        conditionalQuestionValue: question.conditional?.value,
        // Remove frontend-specific fields
        id: undefined,
        conditional: undefined
      }));

      const assignmentPayload: CreateAssignmentPayload = {
        assessmentName: formData.assessmentName,
        description: formData.description,
        assignmentType: formData.assignmentType,
        frequency: formData.frequency,
        dueDate: formData.dueDate,
        content: backendQuestions, // Backend expects 'content'
        accountSubmittedFor: userProfile.account,
      };

      console.log("Creating assignment:", assignmentPayload);
      
      const result = await createAssignment(assignmentPayload, userProfile.account);
      
      // Send initial assignment notification to creator
      try {
        await createAssignmentNotification(
          userProfile.account,
          userProfile.email || '',
          formData.assessmentName,
          'assignment_assigned',
          result.id || result.assessmentName || '',
          'medium'
        );
      } catch (notificationError) {
        console.warn('Failed to send assignment creation notification:', notificationError);
        // Don't fail the assignment creation if notification fails
      }
      
      toast({
        title: "Assignment created successfully",
        description: `Assignment "${formData.assessmentName}" has been created. ${
          formData.frequency !== 'onetime' ? 
          `Reminders will be sent based on the ${formData.frequency} frequency.` : 
          ''
        }`,
      });
      
      // Navigate back to the assignments list
      router.push('/assignments');
    } catch (err) {
      console.error("Error creating assignment:", err);
      setError(err instanceof Error ? err.message : "Failed to create assignment");
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create assignment",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addQuestion = () => {
    const newQuestion: AssignmentQuestion = {
      id: `question_${Date.now()}`,
      label: "",
      component: "text",
      required: false,
      pageNumber: 1,
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<AssignmentQuestion>) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const getAvailableParentQuestions = (currentIndex: number) => {
    // Only return questions that appear before the current question and have options
    return questions.slice(0, currentIndex).filter(q => 
      q.label && (q.component === 'radio' || q.component === 'select' || q.component === 'checkbox') && q.options
    );
  };

  const getParentQuestionOptions = (parentQuestionId: string) => {
    const parentQuestion = questions.find(q => q.id === parentQuestionId);
    if (!parentQuestion || !parentQuestion.options) return [];
    
    if (typeof parentQuestion.options === 'string') {
      return parentQuestion.options.split(';').filter(opt => opt.trim());
    }
    return Array.isArray(parentQuestion.options) ? parentQuestion.options : [];
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const downloadSampleSpreadsheet = () => {
    const headers = [
      'questionLabel',
      'component',
      'options',
      'required',
      'section',
      'pageNumber',
      'deficiencyValues',
      'deficiencyLabel',
      'criticality',
      'photoUpload',
      'comment',
      'dynamic',
      'conditionalField',
      'conditionalValue'
    ];
    
    const sampleData = [
      [
        'What is your name?',
        'text',
        '',
        'true',
        'Personal Information',
        '1',
        '',
        '',
        'low',
        'false',
        'false',
        'false',
        '',
        ''
      ],
      [
        'Are you tired?',
        'radio',
        'yes;no',
        'true',
        'Health Check',
        '1',
        'yes',
        'Fatigue detected',
        'medium',
        'false',
        'false',
        'false',
        '',
        ''
      ],
      [
        'How many hours did you sleep?',
        'number',
        '',
        'true',
        'Health Check',
        '1',
        '',
        '',
        'medium',
        'false',
        'false',
        'false',
        'Are you tired?',
        'yes'
      ],
      [
        'Do you have safety equipment?',
        'radio',
        'yes;no',
        'true',
        'Safety Check',
        '2',
        'no',
        'Missing safety equipment',
        'high',
        'false',
        'false',
        'false',
        '',
        ''
      ],
      [
        'What safety equipment is missing?',
        'checkbox',
        'Helmet;Vest;Gloves;Boots;Goggles',
        'true',
        'Safety Check',
        '2',
        '',
        '',
        'high',
        'false',
        'true',
        'false',
        'Do you have safety equipment?',
        'no'
      ],
      [
        'Select your department',
        'select',
        'HR;Finance;IT;Operations',
        'true',
        'Work Information',
        '3',
        '',
        '',
        'medium',
        'false',
        'true',
        'false',
        '',
        ''
      ],
      [
        'What color is the animal you see?',
        'select',
        'Red;Blue;Green;Brown;Black;White;Gray;Yellow',
        'false',
        'Wildlife Observation',
        '4',
        '',
        '',
        'low',
        'false',
        'false',
        'true',
        '',
        ''
      ]
    ];

    const csvContent = [headers, ...sampleData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'assignment_questions_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setUploadedFile(file);
      parseCSVFile(file);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload a CSV file.",
      });
    }
  };

  const parseCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      const parsedQuestions: AssignmentQuestion[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        
        // Parse deficiency values
        const deficiencyValues = values[headers.indexOf('deficiencyValues')];
        const deficiencyValuesArray = deficiencyValues ? deficiencyValues.split(';').map(v => v.trim()).filter(v => v) : undefined;
        
        // Parse conditional logic
        const conditionalField = values[headers.indexOf('conditionalField')];
        const conditionalValue = values[headers.indexOf('conditionalValue')];
        const conditional = (conditionalField && conditionalValue) ? {
          field: conditionalField,
          value: conditionalValue
        } : undefined;
        
        // Parse dynamic mode
        const dynamicValue = values[headers.indexOf('dynamic')];
        const dynamic = dynamicValue === 'true';
        
        const question: AssignmentQuestion = {
          id: `csv_question_${i}`,
          label: values[headers.indexOf('questionLabel')] || '',
          component: values[headers.indexOf('component')] || 'text',
          options: values[headers.indexOf('options')] || undefined,
          required: values[headers.indexOf('required')] === 'true',
          section: values[headers.indexOf('section')] || undefined,
          pageNumber: parseInt(values[headers.indexOf('pageNumber')]) || 1,
          deficiencyValues: deficiencyValuesArray,
          deficiencyLabel: values[headers.indexOf('deficiencyLabel')] || undefined,
          criticality: (values[headers.indexOf('criticality')] as 'low' | 'medium' | 'high') || 'low',
          photoUpload: values[headers.indexOf('photoUpload')] === 'true',
          comment: values[headers.indexOf('comment')] === 'true',
          dynamic,
          conditional: conditional,
        };
        
        if (question.label) {
          parsedQuestions.push(question);
        }
      }
      
      // Post-process to resolve conditional field references
      const processedQuestions = parsedQuestions.map(question => {
        if (question.conditional?.field) {
          // Find the actual question ID that matches the label exactly
          const referencedQuestion = parsedQuestions.find(q => 
            q.label === question.conditional!.field
          );
          
          if (referencedQuestion) {
            return {
              ...question,
              conditional: {
                ...question.conditional,
                field: referencedQuestion.id
              }
            };
          } else {
            console.warn(`Conditional reference not found: "${question.conditional.field}" for question "${question.label}"`);
            // Keep the conditional but mark it as unresolved
            return question;
          }
        }
        return question;
      });
      
      setQuestions(processedQuestions);
      toast({
        title: "CSV uploaded successfully",
        description: `${processedQuestions.length} questions imported with ${processedQuestions.filter(q => q.conditional).length} conditional questions.`,
      });
    };
    reader.readAsText(file);
  };

  if (authLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-10 w-1/2 mb-6" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!userProfile?.account) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription>
          You must be logged in and have an account associated to create assignments.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-2 sm:p-4 md:p-6 sm:items-center sm:justify-center">
      {/* Header */}
      <div className="w-full max-w-4xl mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" asChild className="self-start">
          <Link href="/assignments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assignments
          </Link>
        </Button>
          <div className="text-center flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create Assignment</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Create a new assignment for your organization
          </p>
          </div>
          <div className="hidden sm:block sm:w-[140px]"></div> {/* Spacer for symmetry on desktop */}
        </div>
      </div>

      {/* Form */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Assignment Details</CardTitle>
          <CardDescription>
            Create a new assignment with questions using our builder or CSV upload
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <Tabs defaultValue="details" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="details" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-4">
                <Settings className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Details</span>
              </TabsTrigger>
              <TabsTrigger value="builder" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-4">
                <Plus className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Builder</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-4">
                <Upload className="h-4 w-4" />
                <span className="text-xs sm:text-sm">CSV</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="assessmentName">Assignment Name *</Label>
              <Input
                id="assessmentName"
                value={formData.assessmentName}
                onChange={(e) => handleInputChange("assessmentName", e.target.value)}
                placeholder="Enter assignment name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Enter assignment description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignmentType">Assignment Type</Label>
                <Select
                  value={formData.assignmentType}
                  onValueChange={(value) => handleInputChange("assignmentType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="safetyPlan">Safety Plan</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => handleInputChange("frequency", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onetime">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange("dueDate", e.target.value)}
              />
            </div>
            </TabsContent>

            <TabsContent value="builder" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Questions ({questions.length})</h3>
                <Button onClick={addQuestion} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </div>

              {questions.length === 0 ? (
                <Alert>
                  <AlertTitle>No questions added yet</AlertTitle>
                  <AlertDescription>
                    Click "Add Question" to start building your assignment.
                  </AlertDescription>
                </Alert>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {questions.map((question, index) => (
                        <SortableQuestionItem
                          key={question.id}
                          question={question}
                          index={index}
                          updateQuestion={updateQuestion}
                          removeQuestion={removeQuestion}
                          getAvailableParentQuestions={getAvailableParentQuestions}
                          getParentQuestionOptions={getParentQuestionOptions}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </TabsContent>

            <TabsContent value="upload" className="space-y-6">
              <div className="space-y-4">
                <div className="text-center space-y-4">
                  <Button onClick={downloadSampleSpreadsheet} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Sample Template
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Download our template to see the correct format for uploading questions
                  </p>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center space-y-4">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div>
                      <Label htmlFor="csvFile" className="cursor-pointer">
                        <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                          Upload a CSV file
                        </span>
                        <input
                          id="csvFile"
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        or drag and drop your CSV file here
                      </p>
                    </div>
                  </div>
                </div>

                {uploadedFile && (
                  <Alert>
                    <AlertTitle>File uploaded: {uploadedFile.name}</AlertTitle>
                    <AlertDescription>
                      {questions.length} questions imported from CSV
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <div className="flex gap-4 pt-6 border-t">
              <Button onClick={handleSubmit} disabled={loading || !formData.assessmentName || questions.length === 0}>
                {loading ? (
                  <>
                    <Skeleton className="h-4 w-4 mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Assignment
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/assignments">Cancel</Link>
              </Button>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 