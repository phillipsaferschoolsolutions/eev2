
// src/services/userService.ts
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { UserProfile } from '@/types/User';

/**
 * Fetches a user's profile from Firestore.
 * @param userId The ID of the user document (e.g., user's email).
 * @returns The user profile object or null if not found.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) {
    console.warn("getUserProfile called with no userId");
    return null;
  }
  try {
    const userDocRef = doc(firestore, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      // Construct the UserProfile object, ensuring all expected fields are mapped
      const profile: UserProfile = {
        id: userDocSnap.id,
        account: data.account || '', 
        displayName: data.displayName || '',
        email: data.email || '',
        emailVerified: data.emailVerified === true,
        first: data.first,
        last: data.last,
        locationName: data.locationName,
        assignedToMe: data.assignedToMe,
        born: data.born,
        dailySiteSnapshotId: data.dailySiteSnapshotId,
        messageToken: data.messageToken,
        permission: data.permission, // Ensure this line correctly maps the 'permission' field
      };
      return profile;
    } else {
      console.warn(`No user profile document found for userId: ${userId}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw new Error(`Failed to fetch user profile: ${error instanceof Error ? error.message : String(error)}`);
  }
}
