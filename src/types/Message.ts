
// src/types/Message.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

// User information relevant for chat display
export interface ChatUser {
  uid: string;
  displayName: string;
  email: string;
  lastSeen?: Timestamp; // When the user was last active
}

// Structure for a chat message
export interface ChatMessage {
  id?: string; // Firestore document ID
  senderUid: string;
  senderDisplayName: string; 
  senderEmail: string; 
  text: string;
  timestamp: Timestamp | FieldValue; 
  imageUrl?: string; // Optional URL for an uploaded image
  imageName?: string; // Optional name for the uploaded image
  read?: boolean; 
}

