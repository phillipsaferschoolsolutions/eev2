// src/types/Asset.ts
import type { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * Represents a hardware asset in the system
 */
export interface Asset {
  id: string;           // Unique ID for the asset
  name: string;         // Asset name/description
  type: string;         // Type of asset (e.g., "Computer", "Printer", "Security Camera")
  serialNumber?: string; // Serial number of the asset
  model?: string;       // Model information
  manufacturer?: string; // Manufacturer name
  purchaseDate?: string; // Purchase date (ISO string)
  warrantyExpiry?: string; // Warranty expiration date (ISO string)
  condition: 'Good' | 'Needs Repair' | 'Retired' | 'Missing'; // Current condition
  locationId?: string;  // ID of the location where asset is located
  locationName?: string; // Cached name of the location for display
  assignedToId?: string; // ID of the user assigned to this asset
  assignedToName?: string; // Cached name of the assignee for display
  notes?: string;       // Additional notes about the asset
  photoUrl?: string;    // URL to asset photo
  accountId: string;    // Account this asset belongs to
  createdBy: string;    // User email or ID who created the record
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  // Optional fields for future expansion
  purchasePrice?: number;
  currentValue?: number;
  maintenanceSchedule?: string;
  lastMaintenanceDate?: string;
}

/**
 * Payload for creating a new asset
 */
export interface CreateAssetPayload {
  name: string;
  type: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  condition: Asset['condition'];
  locationId?: string;
  assignedToId?: string;
  notes?: string;
  purchasePrice?: number;
}

/**
 * Payload for updating an existing asset
 */
export interface UpdateAssetPayload {
  name?: string;
  type?: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  condition?: Asset['condition'];
  locationId?: string;
  assignedToId?: string;
  notes?: string;
  purchasePrice?: number;
  currentValue?: number;
}