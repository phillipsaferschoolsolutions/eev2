// src/types/Task.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * Represents a type or category of issue/task.
 */
export interface IssueType {
  id: string;           // Unique ID for the issue type (e.g., "electrical", "hvac")
  name: string;         // Display name (e.g., "Electrical Issue")
  description?: string; // Description of the issue type
  accountId: string;    // Account this issue type belongs to
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

/**
 * Represents a single task or helpdesk ticket.
 */
export interface Task {
  id: string;           // Unique ID for the task
  title: string;        // Short summary of the task
  description: string;  // Detailed description of the issue
  priority: 'Low' | 'Medium' | 'High' | 'Critical'; // Task priority
  status: 'Open' | 'In Progress' | 'Blocked' | 'Resolved' | 'Closed'; // Current status of the task
  issueTypeId: string;  // ID of the associated IssueType
  issueTypeName?: string; // Cached name of the issue type for display
  linkedAssignmentId?: string; // Optional: ID of the assignment that created this task
  locationId?: string;  // ID of the associated Location
  locationName?: string; // Cached name of the location for display
  assigneeId?: string;  // ID of the user assigned to this task (Agent)
  assigneeName?: string; // Cached name of the assignee for display
  createdBy: string;    // User email or ID who created the task
  accountId: string;    // Account this task belongs to
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  // Optional fields for future expansion
  assetId?: string;     // Link to an asset in the Inventory module
  dueDate?: Timestamp | FieldValue;
  resolutionNotes?: string;
}