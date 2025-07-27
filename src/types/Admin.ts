// src/types/Admin.ts

export interface District {
  id: string; // Unique identifier for the district entry, used for selection
  accountName: string; // The actual name of the account/district
  [key: string]: unknown; // Allow other properties that might come from the API
}
