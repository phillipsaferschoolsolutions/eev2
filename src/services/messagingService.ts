// src/services/messagingService.ts
'use client';

import { firestore } from '@/lib/firebase';
import type { ChatMessage, ChatUser } from '@/types/Message';
import type { UserProfile } from '@/types/User';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  limit,
  getDocs,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';

/**
 * Fetches users belonging to a specific account, excluding the current user.
 * Assumes user documents in Firestore 'users' collection have an 'account' and 'uid' field.
 */
export async function getUsersForAccount(accountId: string, currentUserUid: string): Promise<ChatUser[]> {
  if (!accountId) {
    console.error('getUsersForAccount: accountId is required.');
    return [];
  }
  if (!currentUserUid) {
    console.error('getUsersForAccount: currentUserUid is required.');
    return [];
  }

  try {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('account', '==', accountId));
    const querySnapshot = await getDocs(q);

    const users: ChatUser[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserProfile;
      // Ensure the user has a UID and is not the current user
      if (data.uid && data.uid !== currentUserUid) {
        users.push({
          uid: data.uid,
          displayName: data.displayName || data.email || 'Unnamed User',
          email: data.email,
        });
      }
    });
    return users;
  } catch (error) {
    console.error('Error fetching users for account:', error);
    return [];
  }
}

/**
 * Generates a consistent, sorted chat thread ID for two user UIDs.
 */
export function getDirectChatThreadId(uid1: string, uid2: string): string {
  if (!uid1 || !uid2) throw new Error("Both user UIDs are required to create a thread ID.");
  const ids = [uid1, uid2].sort();
  return `dm_${ids[0]}_${ids[1]}`;
}

/**
 * Sends a message to a specific chat thread.
 */
export async function sendMessage(
  threadId: string,
  senderUid: string,
  senderDisplayName: string,
  senderEmail: string,
  text: string
): Promise<void> {
  if (!threadId || !senderUid || !text.trim()) {
    console.error('sendMessage: Missing required parameters (threadId, senderUid, text).');
    return;
  }

  try {
    const messagesRef = collection(firestore, 'chatThreads', threadId, 'messages');
    await addDoc(messagesRef, {
      senderUid,
      senderDisplayName,
      senderEmail,
      text: text.trim(),
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error; // Re-throw to be caught by the UI
  }
}

/**
 * Sets up a real-time listener for messages in a chat thread.
 * @param threadId The ID of the chat thread.
 * @param callback Function to be called with the array of messages.
 * @returns An unsubscribe function to stop listening.
 */
export function getMessages(
  threadId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  if (!threadId) {
    console.error('getMessages: threadId is required.');
    // Return a no-op unsubscribe function
    return () => {};
  }

  const messagesRef = collection(firestore, 'chatThreads', threadId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100)); // Get latest 100, consider pagination

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const messages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          senderUid: data.senderUid,
          senderDisplayName: data.senderDisplayName,
          senderEmail: data.senderEmail,
          text: data.text,
          timestamp: data.timestamp as Timestamp, // Firestore returns Timestamp object
        });
      });
      callback(messages);
    },
    (error) => {
      console.error('Error listening to messages:', error);
      // Potentially call callback with an error or empty array
      callback([]);
    }
  );

  return unsubscribe;
}
