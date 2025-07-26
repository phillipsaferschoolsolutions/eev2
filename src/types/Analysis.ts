// src/types/Analysis.ts

import type { AssignmentQuestion, AssignmentMetadata } from "./assignmentFunctionsService";

// For /aggregated-completions endpoint
export interface AggregatedCompletionsPayload {
  assignmentIds?: string[]; // Filter by specific assignments
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  locationIds?: string[]; // Filter by specific locations
  dimensions: string[]; // Fields to group by (e.g., 'questionId', 'locationName')
  measures: string[]; // Metrics to calculate (e.g., 'count', 'average')
  filters?: {
    [key: string]: any; // Additional filters
  };
}

export interface AggregatedCompletionsResponse {
  data: {
    [key: string]: any; // Aggregated data in a format suitable for pivot tables
  };
  dimensions: {
    [key: string]: string[]; // Available values for each dimension
  };
  metadata: {
    questionLabels?: { [questionId: string]: string }; // Map of questionIds to their labels
    locationNames?: { [locationId: string]: string }; // Map of locationIds to their names
    assignmentNames?: { [assignmentId: string]: string }; // Map of assignmentIds to their names
  };
}

// For pivot table data
export interface PivotTableData {
  [key: string]: string | number | boolean | null;
}

// For /widgets/sandbox
export interface UserActivity {
  id: string; // Assignment ID
  assessmentName: string;
  status: string; // e.g., "completed", "pending", "overdue"
  completedDate?: string | Date; // ISO string or Date object
  dueDate?: string | Date;
}

export interface AssignmentCompletionStatus {
  id: string; // Assignment ID
  assessmentName: string;
  totalAssigned: number;
  totalCompleted: number;
  lastCompletionDate?: string | Date;
  details?: Array<{ locationName: string; completedCount: number; lastCompletedBy?: string }>;
}

export interface WidgetSandboxData {
  userActivity?: UserActivity[]; // For regular users
  accountCompletions?: AssignmentCompletionStatus[]; // For admin/superAdmin
  // Other potential widget data can be added here
}

// For Streak Widget (Conceptual - might need specific endpoint)
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastContributionDate?: string | Date;
}

// For Trends Response
export interface TrendsResponse {
  weekCompletions?: number;
  monthCompletions?: number;
  yearCompletions?: number;
  currentStreak?: number;
}

// For Last Completions Response
export interface LastCompletionsResponse {
  status: string;
  data: any[];
}

// For Completed Assignment Summary
export interface CompletedAssignmentSummary {
  id: string;
  assessmentName: string;
  totalAssigned: number;
  totalCompleted: number;
  lastCompletionDate?: string | Date;
  details?: Array<{ 
    locationName: string; 
    completedCount: number; 
    lastCompletedBy?: string; 
  }>;
}

// For Common Responses (/schoolswithquestions/:assignmentId/:period)
export interface SchoolQuestionAnswers {
  [answer: string]: number; // e.g., "Yes": 10, "No": 5
  questionLabel: string; // The label of the question
}
export interface SchoolsWithQuestionsResponse {
  // Key is schoolName (or a location identifier)
  [schoolName: string]: {
    // Key is questionId
    [questionId: string]: SchoolQuestionAnswers;
  };
}


// For Raw Responses (/rawresponses/:assignmentId)
export interface RawResponse {
  id: string; // Completion ID
  completedBy: string; // User email or ID
  completionDate: string | Date;
  locationName: string;
  responses: Record<string, any>; // Key is questionId, value is the answer
  [key: string]: any; // Allow other properties
}

export interface RawResponsesPayload {
  assignmentId: string;
  filters: {
    dateRange?: {
      from: string; // YYYY-MM-DD
      to: string; // YYYY-MM-DD
    };
    locations?: string[]; // Array of location names
    users?: string[]; // Array of user emails or IDs
    // Other potential filters
  };
}

// For /reporting endpoint
export interface SavedReportMetadata {
  reportId: string;
  reportName: string;
  generatedDate: string | Date;
  generatedBy: string;
  filtersApplied?: any; // Store the filters used to generate this report
  downloadUrl?: string; // If report is stored and downloadable directly
}

// General filter options for UI
export interface ReportFilterOptions {
  selectedAssignmentId: string | null;
  dateRange: { from?: Date; to?: Date } | undefined;
  selectedLocations: string[];
  // selectedUsers: string[]; // Future: Add user filter
}
