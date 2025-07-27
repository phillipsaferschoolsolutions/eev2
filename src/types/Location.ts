
// src/types/Location.ts

export interface Location {
  id: string; // Unique identifier for the location, good for React keys
  locationName: string; // Display name of the location and the value to be captured
  address?: string; // Optional address
  account?: string; // Account this location belongs to
  locationType?: string;
  schoolCity?: string;
  schoolState?: string;
  schoolAddress?: string;
  lat?: string;
  lng?: string;
  photoReference?: string;
  photoURL?: string;
  lastAction?: string;
  timestamp?: unknown; // Firestore timestamp
  updatedAt?: string;
  searchableIndex?: Record<string, boolean>;
  // Add any other relevant fields that your API might return
  [key: string]: unknown; // Allow other properties
}
