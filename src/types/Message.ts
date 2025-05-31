// src/types/Message.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

// User information relevant for chat display
export interface ChatUser {
  uid: string;
  displayName: string;
  email: string;
}

// Structure for a chat message
export interface ChatMessage {
  id?: string; // Firestore document ID
  senderUid: string;
  senderDisplayName: string; // Denormalized for easy display
  senderEmail: string; // Denormalized for easy display
  text: string;
  timestamp: Timestamp | FieldValue; // FieldValue on write, Timestamp on read
  read?: boolean; // Optional: for read receipts
}
