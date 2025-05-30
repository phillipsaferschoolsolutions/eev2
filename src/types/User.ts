// src/types/User.ts
export interface UserProfile {
  id: string; // Document ID, likely user.email or user.uid
  account: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  first?: string;
  last?: string;
  locationName?: string;
  assignedToMe?: Array<{ assignmentId: string; [key: string]: any }>;
  born?: string;
  dailySiteSnapshotId?: string;
  messageToken?: string;
  // Add any other relevant fields from your user documents in Firestore
}
