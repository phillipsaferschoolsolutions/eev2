
// src/types/Admin.ts

export interface District {
  id: string; // Typically the unique identifier for the district/account
  name: string; // The display name of the district/account
  [key: string]: any; // Allow other properties that might come from the API
}
