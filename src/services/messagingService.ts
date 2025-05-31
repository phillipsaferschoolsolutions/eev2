
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
  type FieldValue,
} from 'firebase/firestore';

/**
 * Fetches users belonging to a specific account.
 * Includes the current user in the list.
 */
export async function getUsersForAccount(accountId: string, currentUserUid: string, currentUserEmail: string): Promise<ChatUser[]> {
  if (!accountId) {
    console.error('getUsersForAccount: accountId is required.');
    return [];
  }

  try {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('account', '==', accountId));
    const querySnapshot = await getDocs(q);

    const users: ChatUser[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserProfile;
      // Ensure uid and email exist, as they are critical
      if (data.uid && data.email) {
        users.push({
          uid: data.uid, // This should be the Firebase Auth UID from the Firestore doc
          displayName: data.displayName || data.email || 'Unnamed User',
          email: data.email,
          lastSeen: data.lastSeen as Timestamp | undefined,
        });
      } else {
        console.warn(`User document ${doc.id} is missing uid or email, skipping for chat list.`);
      }
    });

    // Sort users client-side: current user first, then by displayName.
    users.sort((a, b) => {
      const aIsCurrentUser = (a.uid === currentUserUid) || (a.email === currentUserEmail);
      const bIsCurrentUser = (b.uid === currentUserUid) || (b.email === currentUserEmail);

      if (aIsCurrentUser && !bIsCurrentUser) return -1;
      if (!aIsCurrentUser && bIsCurrentUser) return 1;
      return (a.displayName || '').localeCompare(b.displayName || '');
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
  // It's crucial that uid1 and uid2 are the actual Firebase Auth UIDs here for consistency
  const ids = [uid1, uid2].sort();
  return `dm_${ids[0]}_${ids[1]}`;
}

/**
 * Sends a message to a specific chat thread.
 */
export async function sendMessage(
  threadId: string,
  senderUid: string, // Should be Firebase Auth UID
  senderDisplayName: string,
  senderEmail: string,
  text: string,
  imageUrl?: string | null,
  imageName?: string | null
): Promise<void> {
  if (!threadId || !senderUid || (!text.trim() && !imageUrl)) {
    console.error('sendMessage: Missing required parameters (threadId, senderUid, text/imageUrl).');
    return;
  }

  try {
    const messagesRef = collection(firestore, 'chatThreads', threadId, 'messages');
    const messageData: {
        senderUid: string;
        senderDisplayName: string;
        senderEmail: string;
        text: string;
        timestamp: FieldValue;
        imageUrl?: string;
        imageName?: string;
    } = {
      senderUid,
      senderDisplayName,
      senderEmail,
      text: text.trim(),
      timestamp: serverTimestamp(),
    };

    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }
    if (imageName) {
      messageData.imageName = imageName;
    }

    await addDoc(messagesRef, messageData);
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Sets up a real-time listener for messages in a chat thread.
 */
export function getMessages(
  threadId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  if (!threadId) {
    console.error('getMessages: threadId is required.');
    return () => {};
  }

  const messagesRef = collection(firestore, 'chatThreads', threadId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

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
          timestamp: data.timestamp as Timestamp,
          imageUrl: data.imageUrl,
          imageName: data.imageName,
        });
      });
      callback(messages);
    },
    (error) => {
      console.error('Error listening to messages:', error);
      callback([]);
    }
  );

  return unsubscribe;
}
