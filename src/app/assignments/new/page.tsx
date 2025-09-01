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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Plus, Download, Upload, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAssignment, type CreateAssignmentPayload, type AssignmentQuestion } from "@/services/assignmentFunctionsService";
import { useToast } from "@/hooks/use-toast";
import { createAssignmentNotification } from "@/services/notificationService";

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
      const assignmentPayload: CreateAssignmentPayload = {
        assessmentName: formData.assessmentName,
        description: formData.description,
        assignmentType: formData.assignmentType,
        frequency: formData.frequency,
        dueDate: formData.dueDate,
        questions: questions,
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
      
      // Navigate to the assignment details or assignments list
      router.push(`/assignments/${result.id || result.assessmentName}`);
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
      q.label && (q.component === 'radio' || q.component === 'select' || q.component === 'checkbox')
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
        'question_tired',
        'yes'
      ],
      [
        'Select your department',
        'select',
        'HR;Finance;IT;Operations',
        'true',
        'Work Information',
        '2',
        '',
        '',
        'medium',
        'false',
        'true',
        '',
        ''
      ],
      [
        'Rate your satisfaction',
        'radio',
        'Very Poor;Poor;Fair;Good;Excellent',
        'false',
        'Feedback',
        '3',
        'Very Poor;Poor',
        'Low satisfaction score',
        'high',
        'true',
        'false',
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
          conditional: conditional,
        };
        
        if (question.label) {
          parsedQuestions.push(question);
        }
      }
      
      // Post-process to resolve conditional field references
      const processedQuestions = parsedQuestions.map(question => {
        if (question.conditional?.field && question.conditional.field.startsWith('question_')) {
          // Find the actual question ID that matches this reference
          const referencedQuestion = parsedQuestions.find(q => 
            q.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') === 
            question.conditional!.field.replace('question_', '')
          );
          
          if (referencedQuestion) {
            return {
              ...question,
              conditional: {
                ...question.conditional,
                field: referencedQuestion.id
              }
            };
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6">
      {/* Header */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/assignments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assignments
          </Link>
        </Button>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create Assignment</h1>
          <p className="text-muted-foreground mt-1">
            Create a new assignment for your organization
          </p>
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
        <CardContent>
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">
                <Settings className="mr-2 h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="builder">
                <Plus className="mr-2 h-4 w-4" />
                Question Builder
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
                CSV Upload
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <Card key={question.id} className="p-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                              <Label>Question {index + 1}</Label>
                              <Input
                                value={question.label}
                                onChange={(e) => updateQuestion(index, { label: e.target.value })}
                                placeholder="Enter your question"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                  value={question.component}
                                  onValueChange={(value) => updateQuestion(index, { component: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Text Input</SelectItem>
                                    <SelectItem value="textarea">Long Text (Textarea)</SelectItem>
                                    <SelectItem value="radio">Multiple Choice (Radio)</SelectItem>
                                    <SelectItem value="checkbox">Checkboxes</SelectItem>
                                    <SelectItem value="select">Dropdown Select</SelectItem>
                                    <SelectItem value="buttonSelectSingle">Button Select (Single)</SelectItem>
                                    <SelectItem value="buttonSelectMultiple">Button Select (Multiple)</SelectItem>
                                    <SelectItem value="schoolSelector">School Select Dropdown</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="telephone">Telephone</SelectItem>
                                    <SelectItem value="url">URL</SelectItem>
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

                              <div className="space-y-2">
                                <Label>Section</Label>
                                <Input
                                  value={question.section || ""}
                                  onChange={(e) => updateQuestion(index, { section: e.target.value })}
                                  placeholder="Optional section name"
                                />
                              </div>
                            </div>

                            {(question.component === 'radio' || question.component === 'checkbox' || question.component === 'select' || 
                              question.component === 'buttonSelectSingle' || question.component === 'buttonSelectMultiple') && (
                              <div className="space-y-2">
                                <Label>Options (semicolon separated)</Label>
                                <Input
                                  value={typeof question.options === 'string' ? question.options : (question.options || []).join(';')}
                                  onChange={(e) => updateQuestion(index, { options: e.target.value })}
                                  placeholder="Option 1;Option 2;Option 3"
                                />
                              </div>
                            )}

                            {/* Deficiency Configuration */}
                            <div className="space-y-2">
                              <Label>Deficient Response Value</Label>
                              <Input
                                value={question.deficiencyValues?.join(';') || ''}
                                onChange={(e) => updateQuestion(index, { 
                                  deficiencyValues: e.target.value ? e.target.value.split(';').map(v => v.trim()) : undefined 
                                })}
                                placeholder="What values constitute a deficient response?"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Label for Deficiency in Reporting</Label>
                              <Input
                                value={question.deficiencyLabel || ''}
                                onChange={(e) => updateQuestion(index, { deficiencyLabel: e.target.value })}
                                placeholder="How should the deficiency be labeled in reporting?"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Question Criticality Level</Label>
                              <Select
                                value={question.criticality || 'low'}
                                onValueChange={(value: 'low' | 'medium' | 'high') => updateQuestion(index, { criticality: value })}
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

                            <div className="flex flex-wrap items-center gap-4">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={question.required || false}
                                  onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                                />
                                <span className="text-sm">Required</span>
                              </label>
                              
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={question.photoUpload || false}
                                  onChange={(e) => updateQuestion(index, { photoUpload: e.target.checked })}
                                />
                                <span className="text-sm">Photo Upload</span>
                              </label>

                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={question.comment || false}
                                  onChange={(e) => updateQuestion(index, { comment: e.target.checked })}
                                />
                                <span className="text-sm">Allow Comments</span>
                              </label>

                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={!!question.conditional}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      updateQuestion(index, { 
                                        conditional: { field: '', value: '' }
                                      });
                                    } else {
                                      updateQuestion(index, { conditional: undefined });
                                    }
                                  }}
                                />
                                <span className="text-sm">Question Appears Conditionally</span>
                              </label>
                            </div>

                            {/* Conditional Logic Configuration */}
                            {question.conditional && (
                              <div className="border-l-4 border-blue-200 pl-4 space-y-4 bg-blue-50 p-4 rounded-r">
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
                                        conditional: { ...question.conditional, value: value }
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

                                <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                                  <strong>Note:</strong> This question will only appear when the selected parent question is answered with the specified value.
                                </div>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
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