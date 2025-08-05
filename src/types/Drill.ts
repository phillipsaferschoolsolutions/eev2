
// src/types/Drill.ts

import type { Timestamp } from 'firebase/firestore';

export interface DrillType {
  id: string; // e.g., "fire", "tornado", "lockdown"
  name: string; // e.g., "Fire Drill", "Tornado Drill"
  description?: string;
  hazardType: 'fire' | 'tornado' | 'lockdown' | 'hurricane' | 'activeShooter' | 'medicalEmergency' | 'earthquake' | 'hazmat' | 'other';
}

export interface RecurrenceRule {
  frequency: 'one-time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'custom';
  interval?: number; // e.g., every 2 weeks
  daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
  dayOfMonth?: number; // 1-31
  customRule?: string; // e.g., "first Tuesday of every quarter"
  endDate?: string; // ISO string for recurring drills
  maxOccurrences?: number;
}

export interface DrillEvent {
  id: string; // Unique ID for the drill event window
  title: string; // Name of the drill event, e.g., "Q4 Campus Fire Drill Window"
  description?: string;
  accountId: string; // Account this drill event belongs to

  // Hazard and scheduling
  hazardType: string; // e.g., "fire", "tornado", "lockdown"
  startDate: string; // ISO Date string for the start of the window
  endDate: string;   // ISO Date string for the end of the window

  // Recurrence
  recurrenceRule?: RecurrenceRule;
  requiredCompletions?: number; // Number of completions required per period

  // Assignments
  assignedToSites?: string[]; // Array of site IDs (location IDs)
  assignedToUsers?: string[]; // Array of user IDs or emails for individual assignment

  // Calendar integration
  calendarIntegrationIds?: {
    googleCal?: string;
    outlookCal?: string;
  };

  // Notifications
  notificationSettings?: {
    onCreation: boolean;
    oneWeekBefore: boolean;
    oneDayBefore: boolean;
    oneHourBefore: boolean;
    methods: ('email' | 'in-app' | 'sms')[];
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUserId?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

export interface CheckIn {
  id: string;
  userId: string;
  userDisplayName?: string;
  userRole?: string;
  method: 'manual' | 'qr' | 'nfc';
  timestamp: Timestamp;
  location?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
}

export interface EvaluationItem {
  id: string;
  type: 'yes-no' | 'rating' | 'free-text' | 'multiple-choice';
  prompt: string;
  options?: string[]; // For multiple choice
  required: boolean;
  order: number;
}

export interface EvaluationTemplate {
  id: string;
  title: string;
  description?: string;
  items: EvaluationItem[];
  hazardType?: string; // Optional: specific to hazard type
  accountId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUserId?: string;
}

export interface PerformanceMetrics {
  timeToEvacuateSeconds?: number;
  timeToAllClearSeconds?: number;
  participantsCount: number;
  expectedParticipantsCount?: number;
  attendancePercentage?: number;
  checklistCompletionPercentage?: number;
}

export interface MediaAttachment {
  id: string;
  name: string;
  url: string; // Storage URL
  type: string; // e.g., 'image/jpeg', 'video/mp4', 'application/pdf'
  size?: number; // File size in bytes
  uploadedAt: Timestamp;
  uploadedByUserId: string;
  description?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userDisplayName?: string;
  text: string;
  timestamp: Timestamp;
  isEdited?: boolean;
  editedAt?: Timestamp;
  replies?: Comment[];
}

export interface DrillSubmission {
  id: string; // Unique ID for this specific completion record
  drillEventId: string; // Links back to the DrillEvent
  accountId: string;

  // Submission details
  submittedByUserId: string;
  submittedByDisplayName?: string;
  submittedAt: Timestamp;
  siteId?: string; // Site where the drill was performed
  siteName?: string;

  // Check-in and attendance
  checkIns: CheckIn[];
  attendanceLog: {
    present: number;
    absent: number;
    total: number;
    percentage: number;
  };

  // Performance metrics
  performanceMetrics: PerformanceMetrics;

  // Evaluation responses
  evaluationResponses: Record<string, boolean | string | number | string[]>; // itemId -> response

  // Documentation
  summaryNotes?: string;
  strengths?: string;
  weaknesses?: string;
  recommendations?: string;
  mediaAttachments: MediaAttachment[];

  // Comments and discussion
  comments: Comment[];

  // Approval workflow
  status: 'draft' | 'submitted' | 'in-review' | 'approved' | 'rejected' | 'needs-revision';
  submittedAt: Timestamp;
  reviewedByUserId?: string;
  reviewedByDisplayName?: string;
  reviewedAt?: Timestamp;
  reviewNotes?: string;

  // Automated scoring
  automatedScore?: number; // 0-100
  scoreBreakdown?: {
    attendance: number;
    timing: number;
    checklist: number;
    documentation: number;
  };

  // Version control
  version: number;
  isLatestVersion: boolean;
}

// Represents the basic types of drills available for selection
export const COMMON_DRILL_TYPES: DrillType[] = [
  { 
    id: "fire", 
    name: "Fire Drill", 
    description: "Practice evacuation procedures for a fire emergency.",
    hazardType: "fire"
  },
  { 
    id: "tornado", 
    name: "Tornado Drill", 
    description: "Practice procedures for taking shelter during a tornado.",
    hazardType: "tornado"
  },
  { 
    id: "lockdown", 
    name: "Lockdown Drill", 
    description: "Practice securing in place during an internal or external threat.",
    hazardType: "lockdown"
  },
  { 
    id: "activeShooter", 
    name: "Active Assailant Drill", 
    description: "Practice response to an active assailant situation (e.g., Run, Hide, Fight).",
    hazardType: "activeShooter"
  },
  { 
    id: "medicalEmergency", 
    name: "Medical Emergency Drill", 
    description: "Practice response to common medical emergencies.",
    hazardType: "medicalEmergency"
  },
  { 
    id: "earthquake", 
    name: "Earthquake Drill", 
    description: "Practice Drop, Cover, and Hold On procedures.",
    hazardType: "earthquake"
  },
  { 
    id: "hurricane", 
    name: "Hurricane Drill", 
    description: "Practice procedures for extreme weather events.",
    hazardType: "hurricane"
  },
  { 
    id: "hazmat", 
    name: "Hazardous Material Drill", 
    description: "Practice response to a hazardous material spill or release.",
    hazardType: "hazmat"
  },
];

// Default evaluation templates for common drill types
export const DEFAULT_EVALUATION_TEMPLATES: Omit<EvaluationTemplate, 'id' | 'accountId' | 'createdAt' | 'updatedAt' | 'createdByUserId'>[] = [
  {
    title: "Fire Drill Evaluation",
    description: "Standard evaluation checklist for fire drills",
    hazardType: "fire",
    items: [
      {
        id: "fire-alarm-functioned",
        type: "yes-no",
        prompt: "Did the fire alarm function properly?",
        required: true,
        order: 1
      },
      {
        id: "evacuation-time",
        type: "rating",
        prompt: "Rate the evacuation time (1-5, 5 being excellent)",
        required: true,
        order: 2
      },
      {
        id: "rally-point-organization",
        type: "yes-no",
        prompt: "Were rally points properly organized?",
        required: true,
        order: 3
      },
      {
        id: "communication",
        type: "free-text",
        prompt: "Describe any communication issues during the drill",
        required: false,
        order: 4
      }
    ]
  },
  {
    title: "Lockdown Drill Evaluation",
    description: "Standard evaluation checklist for lockdown drills",
    hazardType: "lockdown",
    items: [
      {
        id: "doors-locked",
        type: "yes-no",
        prompt: "Were all doors properly locked?",
        required: true,
        order: 1
      },
      {
        id: "lights-off",
        type: "yes-no",
        prompt: "Were lights turned off in classrooms?",
        required: true,
        order: 2
      },
      {
        id: "students-hidden",
        type: "yes-no",
        prompt: "Were students properly hidden from view?",
        required: true,
        order: 3
      },
      {
        id: "silence-maintained",
        type: "yes-no",
        prompt: "Was silence maintained throughout the drill?",
        required: true,
        order: 4
      }
    ]
  }
];

// Legacy interface for backward compatibility
export interface DrillCompletion {
  id: string;
  drillEventId: string;
  requiredDrillTypeId: string;
  accountId: string;
  completedByUserId: string;
  completedByDisplayName?: string;
  completedAt: Timestamp;
  siteId?: string;
  siteName?: string;
  timeToEvacuateSeconds?: number;
  participantsCount?: number;
  evaluationChecklist?: Record<string, boolean | string | number>;
  summaryNotes?: string;
  strengths?: string;
  weaknesses?: string;
  mediaAttachments?: Array<{
    name: string;
    url: string;
    type: string;
    uploadedAt?: Timestamp;
  }>;
  automatedScore?: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedByUserId?: string;
  approvedAt?: Timestamp;
  comments?: Array<{
    userId: string;
    displayName?: string;
    text: string;
    timestamp: Timestamp;
  }>;
}
