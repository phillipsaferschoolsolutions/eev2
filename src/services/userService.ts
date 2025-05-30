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
    // Assuming user documents are stored in a 'users' collection
    // and the document ID is the user's email (as per the screenshot context)
    const userDocRef = doc(firestore, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      // Construct the UserProfile object, ensuring all expected fields are mapped
      return {
        id: userDocSnap.id,
        account: data.account || '', // Ensure account is always a string
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
      } as UserProfile;
    } else {
      console.warn(`No user profile document found for userId: ${userId}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // It's often better to let the caller handle the error or rethrow a custom error
    throw new Error(`Failed to fetch user profile: ${error instanceof Error ? error.message : String(error)}`);
  }
}
