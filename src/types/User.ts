
// src/types/User.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

import type { Role } from './Role';

export interface UserProfile {
  id: string; // Document ID, likely user.email or user.uid (if email is used as doc ID, uid should be a field)
  uid: string; // Firebase Authentication User ID - ensuring this is always present
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
  role?: string; // The role ID (e.g., "admin", "user") - replaces permission
  permissions?: Record<string, boolean>; // Cached permissions map from the role
  lastSeen?: Timestamp | FieldValue; // For Firestore serverTimestamp on write, Timestamp on read
  // Add any other relevant fields from your user documents in Firestore
}

/**
 * Extended user profile with role details
 * This is used internally by the auth context
 */
export interface UserProfileWithRole extends UserProfile {
  roleDetails?: Role; // The full role object with permissions
}
