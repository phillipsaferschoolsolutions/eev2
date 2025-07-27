
// Defines the structure for an assignment based on Firestore data
// Note: Fields that are not always present should be optional (e.g., string | undefined or string?)

export interface AssignmentAdmin {
  displayName: string;
  // Potentially other fields like userId, email, etc.
}

export interface ShareWithLocationValue {
  // Define specific properties if known, e.g.
  // locationName: string;
  // status: string;
  [key: string]: unknown; // Allows for arbitrary properties until structure is fully known
}
export interface ShareWith {
  assignToLocations?: Record<string, ShareWithLocationValue>;
  // other sharing options can be added here
}


export interface Assignment {
  id: string; // Firestore document ID
  accountSubmittedFor?: string;
  assessmentName: string; // This seems to be the main name/title
  assignmentAdminArray?: AssignmentAdmin[];
  assignmentType?: string;
  author?: string;
  communityShare?: boolean;
  createdDate?: string; // e.g., "10-10-2024". Consider converting to Date object or using Firestore Timestamps.
  description?: string;
  dueDate?: string; // ISO date string e.g., "2024-01-25T05:00:00.000Z"
  frequency?: string;
  schoolSelectorId?: string;
  shareWith?: ShareWith;
  // Include any other top-level fields observed in your Firestore documents
  // status?: string; // Example if there's a status field at the top level
}
