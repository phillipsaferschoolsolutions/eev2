
// src/types/Drill.ts

import type { Timestamp } from 'firebase/firestore';

export interface DrillType {
  id: string; // e.g., "fire", "tornado", "lockdown"
  name: string; // e.g., "Fire Drill", "Tornado Drill"
  description?: string;
}

export interface DrillEvent {
  id: string; // Unique ID for the drill event window
  name: string; // Name of the drill event, e.g., "Q4 Campus Fire Drill Window"
  description?: string;
  accountId: string; // Account this drill event belongs to

  startDate: string; // ISO Date string for the start of the window
  endDate: string;   // ISO Date string for the end of the window

  // Specific drills required within this event window
  requiredDrills: Array<{
    typeId: string; // Corresponds to DrillType.id
    typeName: string; // e.g., "Fire Drill"
    instructions?: string;
    // Specific checklist or evaluation criteria for this drill type might go here eventually
  }>;

  assignedToSites?: string[]; // Array of site IDs (location IDs)
  assignedToUsers?: string[]; // Array of user IDs or emails for individual assignment

  recurrenceRule?: string; // For future use (e.g., "monthly", "quarterly", iCal RRULE string)
  // calendarIntegrationIds?: { googleCal?: string; outlookCal?: string }; // For future use

  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUserId?: string;
}

export interface DrillCompletion {
  id: string; // Unique ID for this specific completion record
  drillEventId: string; // Links back to the DrillEvent
  requiredDrillTypeId: string; // Which specific drill from the event was completed (e.g., "fire")
  accountId: string;

  completedByUserId: string;
  completedByDisplayName?: string;
  completedAt: Timestamp; // When the drill was performed and documented

  siteId?: string; // Site where the drill was performed
  siteName?: string;

  // Performance Metrics & Documentation
  timeToEvacuateSeconds?: number;
  participantsCount?: number;
  evaluationChecklist?: Record<string, boolean | string | number>; // Flexible checklist, e.g., {"Doors closed": true, "Alarm sounded": "Yes"}
  summaryNotes?: string;
  strengths?: string;
  weaknesses?: string;
  mediaAttachments?: Array<{
    name: string;
    url: string; // Storage URL
    type: string; // e.g., 'image/jpeg', 'video/mp4', 'application/pdf'
    uploadedAt?: Timestamp;
  }>;

  // After-Action Reporting fields (can be expanded)
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

// Represents the basic types of drills available for selection
export const COMMON_DRILL_TYPES: DrillType[] = [
  { id: "fire", name: "Fire Drill", description: "Practice evacuation procedures for a fire emergency." },
  { id: "tornado", name: "Tornado Drill", description: "Practice procedures for taking shelter during a tornado." },
  { id: "lockdown", name: "Lockdown Drill", description: "Practice securing in place during an internal or external threat." },
  { id: "activeShooter", name: "Active Assailant Drill", description: "Practice response to an active assailant situation (e.g., Run, Hide, Fight)." },
  { id: "medicalEmergency", name: "Medical Emergency Drill", description: "Practice response to common medical emergencies." },
  { id: "earthquake", name: "Earthquake Drill", description: "Practice Drop, Cover, and Hold On procedures." },
  { id: "hazmat", name: "Hazardous Material Drill", description: "Practice response to a hazardous material spill or release." },
  // Add more common types as needed
];
