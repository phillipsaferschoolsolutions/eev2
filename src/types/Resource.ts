
// src/types/Resource.ts

export interface AccessControl {
  viewRoles?: string[]; // e.g., ['teacher', 'admin']
  editRoles?: string[];
  viewUsers?: string[]; // User emails or IDs
  editUsers?: string[];
  viewSites?: string[]; // Site/Organizational Unit IDs or names
  editSites?: string[];
}

export interface AudioNote {
    id: string;
    storagePath: string;
    recordedAt: string; // ISO Date string
    recordedByEmail: string;
    durationSeconds?: number;
}

export interface ResourceDocument {
  id: string; // Firestore document ID
  name: string;
  description?: string;
  tags?: string[];
  
  storagePath: string; // Path in Firebase Storage
  downloadURL?: string; // Direct URL to view/download the file
  fileName: string; // Original file name
  fileType: string; // MIME type or simple type like 'PDF', 'Word'
  fileSize: number; // In bytes

  uploadedByEmail: string;
  uploadedAt: string; // ISO Date string
  updatedAt?: string; // ISO Date string

  accountId: string; // Account this resource belongs to
  
  version?: string; // e.g., "1.0", "1.1"
  accessControl?: AccessControl;
  audioNotes?: AudioNote[];

  summary?: string;
  summaryGeneratedAt?: string; // ISO Date string
  summaryGenerating?: boolean; // UI state flag
}

export interface AccessControlPayload {
  // Same structure as AccessControl, but all fields optional for updates
  viewRoles?: string[];
  editRoles?: string[];
  viewUsers?: string[];
  editUsers?: string[];
  viewSites?: string[];
  editSites?: string[];
}

    
